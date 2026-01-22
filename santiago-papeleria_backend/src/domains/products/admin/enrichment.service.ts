import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Producto, ProductoDocument } from '../schemas/producto.schema';
import { ProductERP, ProductERPDocument } from '../schemas/product-erp.schema';
import { ProductMergerService } from '../shared/product-merger.service';
import { ResolvedProduct, PaginatedResponse } from '../shared/interfaces';
import { ErpSyncService } from '../../erp/sync/erp-sync.service';
import { ProductFilterDto } from '../catalog/dto/product-filter.dto';

/**
 * EnrichmentService
 * 
 * Handles admin-facing product operations:
 * - Admin product listing with merged data
 * - Product enrichment (updating web content, visibility, etc.)
 * 
 * Single Responsibility: Admin write operations and merged views
 */
@Injectable()
export class EnrichmentService {
    constructor(
        @InjectModel(Producto.name) private productoModel: Model<ProductoDocument>,
        @InjectModel(ProductERP.name) private productErpModel: Model<ProductERPDocument>,
        private readonly mergerService: ProductMergerService,
        @Inject(forwardRef(() => ErpSyncService))
        private readonly erpSyncService: ErpSyncService,
    ) { }

    /**
     * Gets merged product list for admin panel.
     * Shows both ERP and enrichment status.
     */
    async getAdminProductList(filterDto: ProductFilterDto): Promise<PaginatedResponse<any>> {
        const {
            searchTerm, status, category, brand,
            minPrice, maxPrice, inStock, sortBy,
            page = 1, limit = 50, excludeId
        } = filterDto;

        const erpQuery: any = { activo: true };

        if (searchTerm) {
            // Normalize accents: lápiz → lapiz, café → cafe
            const normalizedTerm = searchTerm.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            erpQuery.$or = [
                { codigo: { $regex: normalizedTerm, $options: 'i' } },
                { nombre: { $regex: normalizedTerm, $options: 'i' } },
            ];
        }

        if (excludeId) {
            erpQuery.codigo = { $ne: excludeId };
        }

        if (brand) erpQuery.marca = brand;

        if (category) {
            const catRegex = { $regex: category, $options: 'i' };
            const catFilter = {
                $or: [
                    { categoria_g2: catRegex },
                    { categoria_g3: catRegex },
                    { categoria_g1: catRegex },
                ],
            };

            if (erpQuery.$or) {
                erpQuery.$and = [{ $or: erpQuery.$or }, catFilter];
                delete erpQuery.$or;
            } else {
                erpQuery.$or = catFilter.$or;
            }
        }

        if (minPrice || maxPrice) {
            erpQuery.precio_pvp = {};
            if (minPrice) erpQuery.precio_pvp.$gte = Number(minPrice);
            if (maxPrice) erpQuery.precio_pvp.$lte = Number(maxPrice);
        }

        if (inStock === 'true') {
            erpQuery.stock = { $gt: 0 };
        }

        if (filterDto.ids && filterDto.ids.length > 0) {
            erpQuery.codigo = { $in: filterDto.ids };
        }

        const skip = (Number(page) - 1) * Number(limit);
        const sortOptions = this.buildSortOptions(sortBy);

        const [erpProducts, total] = await Promise.all([
            this.productErpModel
                .find(erpQuery)
                .sort(sortOptions)
                .skip(skip)
                .limit(Number(limit))
                .lean()
                .exec(),
            this.productErpModel.countDocuments(erpQuery),
        ]);

        // Merge with enriched data
        let mergedProducts = await this.mergeWithEnrichedData(erpProducts);

        // Post-merge filters (enrichment status, visibility, stock status)
        mergedProducts = this.applyPostMergeFilters(mergedProducts, filterDto);

        // Map to admin response
        const mappedData = mergedProducts.map(p => this.mergerService.toAdminResponse(p));

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
     * Updates product enrichment data.
     * Also syncs restricted fields (nombre, descripcion) back to ERP.
     */
    async updateProductEnrichment(id: string, updateData: any): Promise<any> {
        let filter: any = {};
        let sku = '';

        if (Types.ObjectId.isValid(id)) {
            filter = { _id: id };
            const doc = await this.productoModel.findOne(filter).select('codigo_interno').lean().exec();
            if (doc) sku = doc.codigo_interno;
        } else {
            filter = { codigo_interno: id };
            sku = id;
        }

        // Mark as enriched
        updateData.enriquecido = true;
        updateData.enrichment_status = 'complete';

        // Audit entry
        const auditEntry = {
            date: new Date(),
            admin: 'admin@santiagopapeleria.com',
            action: 'Actualización de producto',
        };

        if (!updateData.codigo_interno && typeof id === 'string' && !Types.ObjectId.isValid(id)) {
            updateData.codigo_interno = id;
        }

        // Sync back to ERP if restricted fields changed
        if (sku && (updateData.nombre_web || updateData.descripcion_extendida)) {
            try {
                await this.erpSyncService.updateProductInErp(sku, {
                    nombre: updateData.nombre_web,
                    descripcion: updateData.descripcion_extendida,
                });
            } catch (error) {
                console.error(`⚠️ Failed to sync back to ERP for ${sku}:`, error.message);
            }
        }

        const updatedDoc = await this.productoModel.findOneAndUpdate(
            filter,
            {
                $set: updateData,
                $push: { 'auditoria.historial_cambios': auditEntry },
            },
            { new: true, upsert: true },
        ).lean().exec();

        return this.findProductByTerm(updatedDoc.codigo_interno);
    }

    /**
     * Finds a single product for admin editing.
     */
    async findProductByTerm(term: string): Promise<any | null> {
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
     * Get random product recommendations for chatbot fallback
     */
    async getRecommendations(limit = 3): Promise<any[]> {
        const query = { stock: { $gt: 5 }, activo: true };
        const count = await this.productErpModel.countDocuments(query);
        const randomSkip = Math.floor(Math.random() * Math.max(1, count - limit));

        const erpProducts = await this.productErpModel
            .find(query)
            .skip(Math.max(0, randomSkip))
            .limit(limit)
            .lean()
            .exec();

        const merged = await this.mergeWithEnrichedData(erpProducts);
        return merged.map(p => this.mergerService.toAdminResponse(p));
    }

    /**
     * Get products by SuperCategory name for semantic fallback
     * Maps SuperCategory names to categoria_g1 values
     */
    async getProductsBySuperCategory(superCategoryName: string, limit = 4): Promise<any[]> {
        // Map SuperCategory to actual G2 category values from Dobranet
        const categoryMap: Record<string, string[]> = {
            'Escolar & Oficina': ['ESCOLAR', 'OFICINA', 'BOLSOS'],
            'Arte & Diseño': ['PAPELERIA ARTISTICA'],
            'Tecnología': ['ELECTRONICA Y TECNOLOGIA'],
            'Hogar & Decoración': ['DECORACION', 'ASEO'],
            'Regalos & Variedades': ['JUGUETES', 'FIESTAS Y CUMPLEAÑOS', 'COMIDA', 'BISUTERIA', 'ACCESORIOS DE MODA', 'ACCESORIOS DE CABELLO'],
        };

        const g1Patterns = categoryMap[superCategoryName] || ['ESCOLAR'];

        // Build regex pattern to match any of these G1 values (exact match)
        const regexPattern = g1Patterns.map(p => `^${p}$`).join('|');

        const query = {
            activo: true,
            stock: { $gt: 0 },
            categoria_g1: { $regex: regexPattern, $options: 'i' },
        };

        const erpProducts = await this.productErpModel
            .find(query)
            .limit(limit)
            .lean()
            .exec();

        const merged = await this.mergeWithEnrichedData(erpProducts);
        return merged.map(p => this.mergerService.toAdminResponse(p));
    }

    // --- Private helpers ---

    private buildSortOptions(sortBy?: string): any {
        const sortOptions: any = {};
        if (sortBy === 'price') sortOptions.precio_pvp = 1;
        else if (sortBy === '-price') sortOptions.precio_pvp = -1;
        else if (sortBy === 'stock') sortOptions.stock = -1;
        else sortOptions.nombre = 1;
        return sortOptions;
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

    private applyPostMergeFilters(
        products: ResolvedProduct[],
        filterDto: ProductFilterDto,
    ): ResolvedProduct[] {
        let result = products;

        // Filter by enrichment status
        if (filterDto.status && filterDto.status !== 'all') {
            result = result.filter(p => p.enrichmentStatus === filterDto.status);
        }

        // Filter by stock status
        if (filterDto.stockStatus && filterDto.stockStatus !== 'all') {
            const threshold = 5;
            switch (filterDto.stockStatus) {
                case 'out_of_stock':
                    result = result.filter(p => p.stock === 0);
                    break;
                case 'low':
                    result = result.filter(p => p.stock > 0 && p.stock <= threshold);
                    break;
                case 'normal':
                    result = result.filter(p => p.stock > threshold);
                    break;
            }
        }

        // Filter by visibility
        if (filterDto.isVisible) {
            const isVisibleBool = filterDto.isVisible === 'true';
            result = result.filter(p => p.isVisible === isVisibleBool);
        }

        return result;
    }
}
