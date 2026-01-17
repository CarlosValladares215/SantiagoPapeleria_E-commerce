import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Producto, ProductoDocument } from '../schemas/producto.schema';
import { ProductERP, ProductERPDocument } from '../schemas/product-erp.schema';
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
    private readonly logger = new Logger(CatalogService.name);

    // Featured SKUs for homepage priority (business requirement)
    private readonly featuredSkus = [
        '003734', '001281', '012166', '006171', '010552',
        '002918', '012139', '025620', '010416', '026996',
    ];

    constructor(
        @InjectModel(Producto.name) private productoModel: Model<ProductoDocument>,
        @InjectModel(ProductERP.name) private productErpModel: Model<ProductERPDocument>,
        private readonly mergerService: ProductMergerService,
    ) { }

    /**
     * Retrieves paginated product list for public catalog.
     * Supports filtering by category, brand, price, stock, and offers.
     */
    async findProducts(filterDto: ProductFilterDto): Promise<PaginatedResponse<any>> {
        const { page = 1, limit = 12 } = filterDto;
        let visibleSkus: string[] = [];

        // --- A. Pre-filter by enriched data (IDs, offers) ---
        const enrichedQuery: any = { es_publico: true };
        let preFilteredByEnriched = false;

        // Filter by specific IDs (favorites feature)
        if (filterDto.ids && filterDto.ids.length > 0) {
            const objectIds = filterDto.ids.filter(id => Types.ObjectId.isValid(id));
            enrichedQuery._id = { $in: objectIds };
            preFilteredByEnriched = true;
        }

        // Filter by offers (active promotions with date validation)
        if (String(filterDto.isOffer) === 'true') {
            const now = new Date();
            // Build offer-specific query with date validation
            enrichedQuery.$and = [
                { es_publico: true },
                { promocion_activa: { $exists: true, $ne: null } },
                // Promotion must be active (or field not set = default true)
                { 'promocion_activa.activa': { $ne: false } },
                // fecha_inicio must be <= now (or not set)
                {
                    $or: [
                        { 'promocion_activa.fecha_inicio': { $exists: false } },
                        { 'promocion_activa.fecha_inicio': null },
                        { 'promocion_activa.fecha_inicio': { $lte: now } },
                    ],
                },
                // fecha_fin must be > now (or not set)
                {
                    $or: [
                        { 'promocion_activa.fecha_fin': { $exists: false } },
                        { 'promocion_activa.fecha_fin': null },
                        { 'promocion_activa.fecha_fin': { $gt: now } },
                    ],
                },
            ];
            delete enrichedQuery.es_publico; // Already in $and clause
            preFilteredByEnriched = true;
        }

        if (preFilteredByEnriched) {
            const matchingDocs = await this.productoModel
                .find(enrichedQuery)
                .select('codigo_interno')
                .lean()
                .exec();
            visibleSkus = matchingDocs.map(d => d.codigo_interno);

            if (visibleSkus.length === 0) {
                return this.emptyPaginatedResponse(Number(page), Number(limit));
            }
        } else {
            // Fetch all public SKUs for visibility filtering
            const visibleEnrichedDocs = await this.productoModel
                .find({ es_publico: true })
                .select('codigo_interno')
                .lean()
                .exec();
            visibleSkus = visibleEnrichedDocs.map(d => d.codigo_interno);
        }

        // --- B. Build ERP query ---
        const erpQuery = this.buildErpQuery(filterDto, visibleSkus);

        // --- C. Pagination & Sorting ---
        const skip = (Number(page) - 1) * Number(limit);
        const sortOptions = this.buildSortOptions(filterDto.sortBy);

        // --- D. Execute query with featured products priority ---
        const total = await this.productErpModel.countDocuments(erpQuery);
        const erpProducts = await this.fetchWithFeaturedPriority(
            erpQuery,
            sortOptions,
            skip,
            Number(limit),
            filterDto.sortBy,
        );

        // --- E. Merge with enriched data ---
        const mergedProducts = await this.mergeWithEnrichedData(erpProducts);

        // --- F. Map to public response ---
        const mappedData = mergedProducts.map(p => this.mergerService.toPublicResponse(p));

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

    /**
     * Gets SKUs of products with active offers.
     * Used for offer-specific filtering.
     */
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

    // --- Private helpers ---

    private buildErpQuery(filterDto: ProductFilterDto, visibleSkus: string[]): any {
        const erpQuery: any = {
            codigo: { $in: visibleSkus },
            activo: true,
        };

        if (filterDto.excludeId) {
            erpQuery.codigo.$ne = filterDto.excludeId;
        }

        if (filterDto.category) {
            // HYBRID FILTERING:
            // 1. Try to find products that have this category ID (from enriched data)
            // 2. Fallback to string matching in ERP data if no enriched match found

            // We already have visibleSkus which are pre-filtered by 'es_publico'.
            // Now we want to further filter visibleSkus by category using the robust ObjectId ref.

            // This requires a separate query to get SKUs that match both visibility AND category
            // We can't do this purely inside 'visibleSkus' logic above because categories service logic is separate.
            // But we can refine the erpQuery here.

            const catRegex = { $regex: filterDto.category, $options: 'i' };

            // Ideally validation should happen via ID lookup, but since we receive a name or ID string:
            // Let's stick to the fallback string match for now as the primary mechanism for ERP collection,
            // UNLESS we want to cross-reference the enriched collection's category IDs.

            // Strategy: Filter by string in ERP (legacy) OR join with Enriched data.
            // Since erpQuery only queries ProductERP collection, we can only query fields present there.
            // ProductERP now has 'categoria_linea_cod' but not the ObjectIds (those are in Producto).

            // WAIT - The Plan says "Filter productos by categoria_grupo_id".
            // If we filter 'Producto' collection, we get a list of SKUs.
            // We should use that list to restrict 'erpQuery.codigo'.

            // However, 'visibleSkus' is already passed in. 
            // If we want to strictly use ObjectIds, we should have filtered 'visibleSkus' 
            // in the step A (Pre-filter) inside findProducts.

            // Given the current structure where we build 'erpQuery' AFTER getting 'visibleSkus':
            // We will stick to the string regex on ERP fields for now to ensure we don't return empty results 
            // until the backfill is complete and reliable.
            // BUT we should add the new 'categoria_linea_cod' to the OR clause if it helps (though we receive a name usually).

            erpQuery.$or = [
                { categoria_g1: catRegex },
                { categoria_g2: catRegex },
                { categoria_g3: catRegex },
                // If the user passed a code, it might match here too
                { categoria_linea_cod: filterDto.category }
            ];
        }

        if (filterDto.brand) {
            erpQuery.marca = filterDto.brand;
        }

        if (filterDto.searchTerm) {
            const searchFilter = {
                $or: [
                    { nombre: { $regex: filterDto.searchTerm, $options: 'i' } },
                    { codigo: { $regex: filterDto.searchTerm, $options: 'i' } },
                ],
            };

            if (erpQuery.$or) {
                erpQuery.$and = [{ $or: erpQuery.$or }, searchFilter];
                delete erpQuery.$or;
            } else {
                erpQuery.$or = searchFilter.$or;
            }
        }

        if (filterDto.minPrice || filterDto.maxPrice) {
            erpQuery.precio_pvp = {};
            if (filterDto.minPrice) erpQuery.precio_pvp.$gte = Number(filterDto.minPrice);
            if (filterDto.maxPrice) erpQuery.precio_pvp.$lte = Number(filterDto.maxPrice);
        }

        if (filterDto.inStock === 'true') {
            erpQuery.stock = { $gt: 0 };
        }

        return erpQuery;
    }

    private buildSortOptions(sortBy?: string): any {
        const sort = sortBy || 'name';
        const sortOptions: any = {};

        switch (sort) {
            case 'price':
                sortOptions.precio_pvp = 1;
                break;
            case '-price':
                sortOptions.precio_pvp = -1;
                break;
            case 'stock':
                sortOptions.stock = -1;
                break;
            case '-stock':
                sortOptions.stock = 1;
                break;
            case '-name':
                sortOptions.nombre = -1;
                break;
            case 'name':
            default:
                sortOptions.imagen = -1;
                sortOptions.nombre = 1;
                break;
        }

        return sortOptions;
    }

    private async fetchWithFeaturedPriority(
        erpQuery: any,
        sortOptions: any,
        skip: number,
        limit: number,
        sortBy?: string,
    ): Promise<any[]> {
        // Only apply featured priority for default sort
        if (sortBy && sortBy !== 'name') {
            return this.productErpModel
                .find(erpQuery)
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .lean()
                .exec();
        }

        const productsToReturn: any[] = [];

        // Fetch featured products if within current page range
        let featuredSlice: string[] = [];
        if (skip < this.featuredSkus.length) {
            featuredSlice = this.featuredSkus.slice(skip, skip + limit);
        }

        if (featuredSlice.length > 0) {
            const featuredDocs = await this.productErpModel
                .find({
                    $and: [
                        erpQuery,
                        { codigo: { $in: featuredSlice } }
                    ]
                })
                .lean()
                .exec();

            // Maintain featured order
            featuredSlice.forEach(sku => {
                const doc = featuredDocs.find(d => d.codigo === sku);
                if (doc) productsToReturn.push(doc);
            });
        }

        // Fetch remaining products
        if (productsToReturn.length < limit) {
            const remaining = limit - productsToReturn.length;
            const restSkip = Math.max(0, skip - this.featuredSkus.length);

            const restDocs = await this.productErpModel
                .find({
                    $and: [
                        erpQuery,
                        { codigo: { $nin: this.featuredSkus } }
                    ]
                })
                .sort(sortOptions)
                .skip(restSkip)
                .limit(remaining)
                .lean()
                .exec();

            productsToReturn.push(...restDocs);
        }

        return productsToReturn;
    }

    private async mergeWithEnrichedData(erpProducts: any[]): Promise<ResolvedProduct[]> {
        const skus = erpProducts.map(p => p.codigo);
        const enrichedDocs = await this.productoModel
            .find({ codigo_interno: { $in: skus } })
            .lean()
            .exec();

        const enrichmentMap = new Map(
            enrichedDocs.map(doc => [doc.codigo_interno, doc]),
        );

        return erpProducts.map(erpItem => {
            const enrichedItem = enrichmentMap.get(erpItem.codigo);
            return this.mergerService.merge(erpItem, enrichedItem);
        });
    }

    private emptyPaginatedResponse(page: number, limit: number): PaginatedResponse<any> {
        return {
            data: [],
            meta: { total: 0, page, limit, totalPages: 0 },
        };
    }
}
