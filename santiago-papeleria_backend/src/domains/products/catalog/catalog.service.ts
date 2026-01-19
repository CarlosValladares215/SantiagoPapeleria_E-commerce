import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Producto, ProductoDocument } from '../schemas/producto.schema';
import { ProductERP, ProductERPDocument } from '../schemas/product-erp.schema';
import { Categoria, CategoriaDocument } from '../schemas/categoria.schema';
import { Pedido } from '../../orders/schemas/pedido.schema';
import { ProductMergerService } from '../shared/product-merger.service';
import { ResolvedProduct, PaginatedResponse } from '../shared/interfaces';
import { ProductFilterDto } from './dto/product-filter.dto';

/**
 * CatalogService
 * 
 * Handles public-facing product catalog operations:
 * - Product listing with filters (findProducts)
 * - Product detail lookup (findByTerm)
 * 
 * Single Responsibility: Read operations for customer-facing catalog
 */
@Injectable()
export class CatalogService {


    // Featured SKUs for homepage priority (business requirement)
    private readonly featuredSkus = [
        '003734', '001281', '012166', '006171', '010552',
        '002918', '012139', '025620', '010416', '026996',
    ];

    constructor(
        @InjectModel(Producto.name) private productoModel: Model<ProductoDocument>,
        @InjectModel(ProductERP.name) private productErpModel: Model<ProductERPDocument>,
        @InjectModel(Categoria.name) private categoriaModel: Model<CategoriaDocument>,
        @InjectModel(Pedido.name) private pedidoModel: Model<Pedido>,
        private readonly mergerService: ProductMergerService,
    ) { }

    /**
     * Retrieves paginated product list for public catalog.
     * Supports filtering by category, brand, price, stock, and offers.
     */
    async findProducts(filterDto: ProductFilterDto): Promise<PaginatedResponse<any>> {
        const { page = 1, limit = 12 } = filterDto;
        const skip = (Number(page) - 1) * Number(limit);

        // 1. Build Query for 'Producto' Collection
        const query: any = { es_publico: true };

        // Search Term (Name, SKU, Slug)
        if (filterDto.searchTerm) {
            const regex = { $regex: filterDto.searchTerm, $options: 'i' };
            query.$or = [
                { nombre: regex },
                { 'clasificacion.marca': regex },
                { 'clasificacion.grupo': regex },
                { codigo_interno: regex },
                { slug: regex }
            ];
        }

        // Specific IDs (Favorites)
        if (filterDto.ids && filterDto.ids.length > 0) {
            const validIds = filterDto.ids.filter(id => Types.ObjectId.isValid(id));
            if (validIds.length > 0) {
                query._id = { $in: validIds };
            }
        }

        // Category (Regex on embedded fields or ID)
        if (filterDto.category) {
            const isId = Types.ObjectId.isValid(filterDto.category);

            if (isId) {
                // Exact Match via Reference IDs (Level 1, 2, or 3)
                query.$or = [
                    { categoria_linea_id: new Types.ObjectId(filterDto.category) },
                    { categoria_grupo_id: new Types.ObjectId(filterDto.category) },
                    { categoria_sub_id: new Types.ObjectId(filterDto.category) }
                ];
            } else {
                // Try to Resolve Slug/Name to ID first
                const categoryDoc = await this.categoriaModel
                    .findOne({
                        $or: [
                            { slug: filterDto.category },
                            { nombre: { $regex: new RegExp(`^${filterDto.category}$`, 'i') } }
                        ]
                    })
                    .select('_id')
                    .lean()
                    .exec();

                if (categoryDoc) {
                    // It is a valid Category, use its ID for strict filtering
                    query.$or = [
                        { categoria_linea_id: categoryDoc._id },
                        { categoria_grupo_id: categoryDoc._id },
                        { categoria_sub_id: categoryDoc._id }
                    ];
                } else {
                    // Fallback to fuzzy Match via Names for pure text search (legacy)
                    const catRegex = { $regex: filterDto.category, $options: 'i' };
                    query.$or = [
                        { 'clasificacion.grupo': catRegex },
                        { 'clasificacion.linea': catRegex },
                        { 'clasificacion.marca': catRegex }
                    ];
                }
            }
        }

        // Brand
        if (filterDto.brand) {
            query['clasificacion.marca'] = { $regex: filterDto.brand, $options: 'i' };
        }

        // Price Range
        if (filterDto.minPrice || filterDto.maxPrice) {
            query['precios.pvp'] = {};
            if (filterDto.minPrice) query['precios.pvp'].$gte = Number(filterDto.minPrice);
            if (filterDto.maxPrice) query['precios.pvp'].$lte = Number(filterDto.maxPrice);
        }

        // Stock Status
        if (filterDto.inStock === 'true') {
            query['stock.total_disponible'] = { $gt: 0 };
        }

        // Offers Only
        if (String(filterDto.isOffer) === 'true') {
            const now = new Date();
            query.promocion_activa = { $exists: true, $ne: null };
            query['promocion_activa.activa'] = { $ne: false };
            query['promocion_activa.fecha_fin'] = { $gt: now }; // Simple active check
        }

        // Exclude ID (Related products)
        if (filterDto.excludeId) {
            query.codigo_interno = { $ne: filterDto.excludeId };
        }

        // 2. Build Sort Options
        const sortOptions: any = {};
        const sortParam = filterDto.sortBy || 'name';

        switch (sortParam) {
            case 'price': sortOptions['precios.pvp'] = 1; break;
            case '-price': sortOptions['precios.pvp'] = -1; break;
            case 'stock': sortOptions['stock.total_disponible'] = -1; break;
            case '-stock': sortOptions['stock.total_disponible'] = 1; break;
            case '-name': sortOptions['nombre'] = -1; break;
            case 'name':
            default:
                sortOptions['nombre'] = 1;
                // Add secondary sort for stability
                sortOptions['_id'] = 1;
                break;
        }

        // 3. Execution (Parallel Count & Fetch)
        const [total, docs] = await Promise.all([
            this.productoModel.countDocuments(query),
            this.productoModel.find(query)
                .sort(sortOptions)
                .skip(skip)
                .limit(Number(limit))
                .lean()
                .exec()
        ]);

        // 4. Transform to Public Response
        // We simulate a ResolvedProduct because we are now trusting 'Producto' as the single source
        const mappedData = docs.map((doc: any) => {
            // Adapt 'Producto' doc to 'ResolvedProduct' interface expected by public mapper
            const resolved: ResolvedProduct = {
                sku: doc.codigo_interno,
                erpName: doc.nombre,
                webName: doc.nombre_web || doc.nombre,
                brand: doc.clasificacion?.marca || 'Genérico',
                category: doc.clasificacion?.grupo || 'General',
                price: doc.precios?.pvp || 0,
                wholesalePrice: doc.precios?.pvm || 0,
                stock: doc.stock?.total_disponible || 0,
                isVisible: doc.es_publico,
                enrichmentStatus: doc.enrichment_status || 'complete',
                description: doc.descripcion_extendida || doc.nombre,
                // Resolve images locally since we have the full object
                images: doc.multimedia?.principal
                    ? [doc.multimedia.principal, ...(doc.multimedia.galeria || [])]
                    : [],
                weight_kg: doc.peso_kg || 0,
                dimensions: doc.dimensiones,
                allows_custom_message: doc.permite_mensaje_personalizado,
                attributes: doc.attributes || [],
                _enrichedData: doc,
                _erpData: null // Not available in this optimized query, but not needed for public read
            };
            return this.mergerService.toPublicResponse(resolved);
        });

        return {
            data: mappedData,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            },
        };
    }

    /**
     * Finds a single product by ID, SKU, or slug.
     * Returns null if not found or not visible.
     */
    async findByTerm(term: string): Promise<any | null> {
        let sku = term;
        let enrichedDoc: any = null;

        const isObjectId = Types.ObjectId.isValid(term);
        enrichedDoc = await this.productoModel
            .findOne({
                $or: [
                    { _id: isObjectId ? term : null },
                    { codigo_interno: term },
                    { slug: term },
                ],
            })
            .lean()
            .exec();

        if (enrichedDoc) {
            sku = enrichedDoc.codigo_interno;
        }

        const erpDoc = await this.productErpModel
            .findOne({ codigo: sku })
            .lean()
            .exec();

        if (!erpDoc) {
            return null;
        }

        const resolved = this.mergerService.merge(erpDoc, enrichedDoc);
        return this.mergerService.toDetailResponse(resolved);
    }

    async getOfferSkus(): Promise<string[]> {
        const now = new Date();
        const offerDocs = await this.productoModel
            .find({
                es_publico: true,
                promocion_activa: { $exists: true, $ne: null },
                'promocion_activa.activa': { $ne: false },
                $or: [
                    { 'promocion_activa.fecha_fin': { $exists: false } },
                    { 'promocion_activa.fecha_fin': null },
                    { 'promocion_activa.fecha_fin': { $gt: now } },
                ],
            })
            .select('codigo_interno')
            .lean()
            .exec();
        return offerDocs.map(d => d.codigo_interno);
    }

    /**
     * Retrieves featured products (Best Sellers) via Real-Time Aggregation.
     * Sorts products by total units sold (highest to lowest).
     */
    async getFeaturedProducts(limit: number = 6): Promise<any[]> {
        // Filter: Last 60 Days (Trends) + Paid Status
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - 60);

        // 1. Aggregate Sales by NAME (Since ID is null and SKU is Generic)
        const topSellingNames = await this.pedidoModel.aggregate([
            {
                $match: {
                    estado_pedido: { $in: ['PAGADO', 'Pagado', 'ENTREGADO', 'Entregado', 'ENVIADO', 'Enviado'] }
                }
            },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.nombre', // Group by Exact Name
                    totalSold: { $sum: '$items.cantidad' }
                }
            },
            { $sort: { totalSold: -1 } }, // Descending order
            { $limit: limit },
            {
                $project: {
                    _id: 1 // _id is the name string
                }
            }
        ]);

        console.log('DEBUG: TopSellingNames:', topSellingNames);

        if (!topSellingNames.length) {
            console.log('DEBUG: No sales found (Name based), using fallback.');
            const docs = await this.productoModel.find({
                codigo_interno: { $in: this.featuredSkus },
                es_publico: true
            }).limit(limit).lean().exec();

            return this.transformDocs(docs);
        }

        const names = topSellingNames.map(t => t._id).filter(n => n);

        // 2. Fetch Product Details by NAME
        const docs = await this.productoModel.find({
            nombre: { $in: names },
            es_publico: true
        }).lean().exec();

        console.log('DEBUG: Found Public Docs (by Name):', docs.map(d => d.nombre));

        // 3. Re-sort to match sales ranking
        const docsMap = new Map(docs.map(d => [d.nombre, d]));

        const sortedDocs = topSellingNames
            .map(t => docsMap.get(t._id))
            .filter(d => !!d);

        console.log('DEBUG: Final Sorted Docs (Name):', sortedDocs.length);

        if (sortedDocs.length === 0) {
            console.log('DEBUG: Sales found but no matching public products by name. Using fallback.');
            const fallbackDocs = await this.productoModel.find({
                codigo_interno: { $in: this.featuredSkus },
                es_publico: true
            }).limit(limit).lean().exec();
            return this.transformDocs(fallbackDocs);
        }

        return this.transformDocs(sortedDocs);
    }

    private transformDocs(docs: any[]): any[] {
        return docs.map((doc: any) => {
            const resolved: ResolvedProduct = {
                sku: doc.codigo_interno,
                erpName: doc.nombre,
                webName: doc.nombre_web || doc.nombre,
                brand: doc.clasificacion?.marca || 'Genérico',
                category: doc.clasificacion?.grupo || 'General',
                price: doc.precios?.pvp || 0,
                wholesalePrice: doc.precios?.pvm || 0,
                stock: doc.stock?.total_disponible || 0,
                isVisible: doc.es_publico,
                enrichmentStatus: doc.enrichment_status || 'complete',
                description: doc.descripcion_extendida || doc.nombre,
                images: doc.multimedia?.principal
                    ? [doc.multimedia.principal, ...(doc.multimedia.galeria || [])]
                    : [],
                weight_kg: doc.peso_kg || 0,
                dimensions: doc.dimensiones,
                allows_custom_message: doc.permite_mensaje_personalizado,
                attributes: doc.attributes || [],
                _enrichedData: doc,
                _erpData: null
            };
            return this.mergerService.toPublicResponse(resolved);
        });
    }
}
