import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductERP, ProductERPDocument } from '../schemas/product-erp.schema';
import { Producto, ProductoDocument } from '../schemas/producto.schema';
import { Categoria, CategoriaDocument } from '../schemas/categoria.schema';

/**
 * CategoriesService
 * 
 * Handles all category and brand-related operations:
 * - Category counts for sidebar filters
 * - Category tree structure for navigation
 * - Brand listing
 * 
 * Single Responsibility: Category/Brand read operations
 */
@Injectable()
export class CategoriesService {
    constructor(
        @InjectModel(ProductERP.name) private productErpModel: Model<ProductERPDocument>,
        @InjectModel(Producto.name) private productoModel: Model<ProductoDocument>,
        @InjectModel(Categoria.name) private categoriaModel: Model<CategoriaDocument>,
    ) { }

    /**
     * Gets category counts for sidebar filters.
     * Optionally filters by offer products only.
     */
    async getCategoryCounts(isOffer?: boolean): Promise<{ name: string; count: number }[]> {
        const filter: any = { activo: true };

        if (isOffer) {
            const offerSkus = await this.getOfferSkus();
            filter.codigo = { $in: offerSkus };
        }

        return this.productErpModel.aggregate([
            { $match: filter },
            { $group: { _id: '$categoria_g2', count: { $sum: 1 } } },
            { $project: { _id: 0, name: '$_id', count: 1 } },
        ]).exec();
    }

    /**
     * Gets hierarchical category structure from ERP data.
     */
    async getCategoriesStructure(): Promise<any[]> {
        return this.productErpModel.aggregate([
            { $match: { activo: true } },
            {
                $group: {
                    _id: { g1: '$categoria_g1', g2: '$categoria_g2' },
                    subgrupos: { $addToSet: '$categoria_g3' },
                },
            },
            {
                $group: {
                    _id: '$_id.g1',
                    grupos: {
                        $push: {
                            nombre: '$_id.g2',
                            subgrupos: '$subgrupos',
                        },
                    },
                },
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    linea: '$_id',
                    grupos: 1,
                },
            },
        ]).exec();
    }

    /**
     * Gets full category tree with super-category grouping.
     * Filters to only show categories with active products.
     */
    async getCategoriesTree(): Promise<any[]> {
        const categories = await this.categoriaModel
            .find({ nivel: 1, activo: true })
            .populate({
                path: 'hijos',
                match: { activo: true },
                populate: {
                    path: 'hijos',
                    match: { activo: true },
                },
            })
            .lean()
            .exec();

        const usedCategories = await this.getActiveCategoryNames();

        // Recursive filter to keep only used categories
        const filterCategory = (cat: any): boolean => {
            const isUsed = usedCategories.has(cat.nombre.toUpperCase().trim());

            let hasUsedChildren = false;
            if (cat.hijos && cat.hijos.length > 0) {
                cat.hijos = cat.hijos.filter((child: any) => filterCategory(child));
                if (cat.hijos.length > 0) hasUsedChildren = true;
            }

            return isUsed || hasUsedChildren;
        };

        const filteredCategories = categories.filter(cat => filterCategory(cat));

        console.log('CategoriesService: Used Categories Set Size:', usedCategories.size);
        console.log('CategoriesService: Sample Used:', [...usedCategories].slice(0, 5));

        filteredCategories.forEach((c: any) => {
            if (c.nombre.includes('Accesorios')) {
                console.log('CategoriesService: Debug "Accesorios"', c);
                if (c.hijos) c.hijos.forEach((h: any) => console.log(' -> Child:', h.nombre, 'Hijos:', h.hijos?.length));
            }
        });

        // Group by super_categoria
        return this.groupBySupercategory(filteredCategories);
    }

    /**
     * Gets all unique brands, optionally filtered by offers.
     */
    async getBrands(isOffer?: boolean): Promise<string[]> {
        const filter: any = { activo: true };

        if (isOffer) {
            const offerSkus = await this.getOfferSkus();
            filter.codigo = { $in: offerSkus };
        }

        return this.productErpModel.distinct('marca', filter).exec();
    }

    // --- Private helpers ---

    private async getOfferSkus(): Promise<string[]> {
        const offerDocs = await this.productoModel
            .find({
                es_publico: true,
                promocion_activa: { $exists: true, $ne: null },
            })
            .select('codigo_interno')
            .lean()
            .exec();

        return offerDocs.map(d => d.codigo_interno);
    }

    private async getActiveCategoryNames(): Promise<Set<string>> {
        // Use the new ObjectId references for more reliable matching
        // distinct() is fast and efficient for this
        // distinct() is fast and efficient for this
        const [usedGroupIds, usedSubIds] = await Promise.all([
            this.productoModel.distinct('categoria_grupo_id', { es_publico: true }).exec(),
            this.productoModel.distinct('categoria_sub_id', { es_publico: true }).exec()
        ]);

        const usedCategoryIds = [...new Set([...usedGroupIds, ...usedSubIds])];

        // Get names for these IDs
        const usedCategories = await this.categoriaModel
            .find({ _id: { $in: usedCategoryIds } })
            .select('nombre')
            .lean()
            .exec();

        // Fallback: If no enriched products have category IDs (e.g. before backfill),
        // we might get empty list. In that case, should we fall back to ERP strings?
        if (usedCategories.length === 0) {
            // Fallback to legacy string matching
            const products = await this.productErpModel
                .find({ activo: true })
                .select('categoria_g1 categoria_g2 categoria_g3')
                .lean()
                .exec();

            const fallbackSet = new Set<string>();
            products.forEach(p => {
                if (p.categoria_g1) fallbackSet.add(p.categoria_g1.toUpperCase().trim());
                if (p.categoria_g2) fallbackSet.add(p.categoria_g2.toUpperCase().trim());
                if (p.categoria_g3) fallbackSet.add(p.categoria_g3.toUpperCase().trim());
            });
            return fallbackSet;
        }

        return new Set(usedCategories.map(c => c.nombre.toUpperCase().trim()));
    }

    private groupBySupercategory(categories: any[]): any[] {
        const superCatOrder = [
            'Escolar & Oficina',
            'Arte & Diseño',
            'Tecnología',
            'Hogar & Decoración',
            'Regalos & Variedades',
        ];

        const groups: { [key: string]: any[] } = {};

        categories.forEach(cat => {
            const superCat = cat.super_categoria || 'Regalos & Variedades';
            if (!groups[superCat]) groups[superCat] = [];
            groups[superCat].push(cat);
        });

        const result = superCatOrder.map(name => ({
            name,
            categories: groups[name] || [],
        }));

        // Add any unmapped categories to fallback group
        Object.keys(groups).forEach(key => {
            if (!superCatOrder.includes(key)) {
                const giftGroup = result.find(g => g.name === 'Regalos & Variedades');
                if (giftGroup) {
                    giftGroup.categories.push(...groups[key]);
                }
            }
        });

        return result;
    }
}
