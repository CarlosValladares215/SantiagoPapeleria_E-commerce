import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ResolvedProduct } from './interfaces/resolved-product.interface';

/**
 * ProductMergerService
 * 
 * Pure logic service responsible for merging ERP data with enriched data.
 * This is the single source of truth for product data fusion logic.
 * 
 * Design Decisions:
 * - Stateless: No database access, receives data as parameters
 * - Deterministic: Same inputs always produce same outputs
 * - Testable: Easy to unit test with mock data
 */
@Injectable()
export class ProductMergerService {

    constructor(private configService: ConfigService) { }

    /**
     * Merges ERP product data with enriched product data.
     * 
     * Priority Rules:
     * - Enriched data takes precedence when available
     * - ERP data serves as fallback
     * - isVisible defaults to TRUE (auto-appear on sync)
     */
    merge(erpData: any, enrichedData: any): ResolvedProduct {
        const enrichmentStatus = enrichedData?.enrichment_status || 'pending';
        // Default to TRUE: "Automático (aparece al sincronizar)"
        const isVisible = enrichedData?.es_publico !== undefined
            ? enrichedData.es_publico
            : true;

        return {
            sku: erpData.codigo,
            erpName: erpData.nombre,
            webName: enrichedData?.nombre_web || '',
            brand: erpData.marca || 'Genérico',
            category: erpData.categoria_g2 || 'General',
            price: erpData.precio_pvp || 0,
            wholesalePrice: erpData.precio_pvm || 0,
            stock: erpData.stock || 0,
            isVisible,
            enrichmentStatus,
            description: enrichedData?.descripcion_extendida || erpData.descripcion || erpData.nombre,
            images: this.resolveImages(erpData, enrichedData),
            weight_kg: enrichedData?.peso_kg || erpData.peso_erp || 0,
            dimensions: enrichedData?.dimensiones || null,
            allows_custom_message: enrichedData?.permite_mensaje_personalizado || false,
            attributes: enrichedData?.attributes || [],
            _erpData: erpData,
            _enrichedData: enrichedData,
        };
    }

    /**
     * Resolves product images with priority: enriched > ERP
     */
    private resolveImages(erpData: any, enrichedData: any): string[] {
        let images: string[] = [];

        // 1. Try Structured Multimedia (Schema Standard)
        if (enrichedData?.multimedia?.principal) {
            images.push(enrichedData.multimedia.principal);
        }
        if (enrichedData?.multimedia?.galeria && Array.isArray(enrichedData.multimedia.galeria)) {
            images.push(...enrichedData.multimedia.galeria);
        }

        // 2. Try Raw Enrichment Fields (Legacy/Simulator JSON keys: FOT, GAL)
        // Only if we haven't found images yet, or to augment them?
        // Usually these are mutually exclusive depending on data stage.
        if (images.length === 0) {
            if (enrichedData?.FOT) {
                images.push(enrichedData.FOT);
            }
            if (enrichedData?.GAL && Array.isArray(enrichedData.GAL)) {
                images.push(...enrichedData.GAL);
            }
        }

        // 3. Fallback to ERP Image
        if (images.length === 0 && erpData?.imagen) {
            images.push(erpData.imagen);
        }

        // 4. Fallback to ERP Gallery
        if (erpData?.galeria_erp && Array.isArray(erpData.galeria_erp)) {
            images.push(...erpData.galeria_erp);
        }

        // Deduplicate strings just in case
        const uniqueImages = Array.from(new Set(images));

        // Resolve relative paths
        const erpHost = this.configService.get<string>('ERP_HOST') || 'http://localhost:4000';
        return uniqueImages.map(img => {
            if (img.startsWith('http')) {
                return img;
            }
            return `${erpHost}/data/photos/${img}`;
        });
    }

    /**
     * Maps ResolvedProduct to public catalog response format.
     * Used by CatalogService for customer-facing endpoints.
     */
    toPublicResponse(product: ResolvedProduct): any {
        return {
            _id: product._enrichedData?._id ? String(product._enrichedData._id) : null,
            internal_id: product.sku,
            codigo_interno: product.sku,
            name: product.webName || product.erpName,
            nombre: product.webName || product.erpName,
            slug: product._enrichedData?.slug || product.sku,
            activo: true,
            category: product.category,
            brand: product.brand,
            clasificacion: {
                marca: product.brand,
                grupo: product.category,
                linea: '',
            },
            precios: {
                pvp: product.price,
                pvm: product.wholesalePrice,
                incluye_iva: true,
            },
            price: product.price,
            wholesalePrice: product.wholesalePrice,
            vat_included: true,
            stock: product.stock,
            multimedia: {
                principal: product.images[0] || '',
                galeria: product.images.slice(1),
            },
            images: product.images,
            es_publico: true,
            enriquecido: true,
            isOffer: !!(product._enrichedData?.promocion_activa ||
                (product._enrichedData?.priceTiers?.length > 0)),
            isNew: true,
            peso_kg: product.weight_kg || 0,
            dimensiones: product.dimensions || {},
            promocion_activa: product._enrichedData?.promocion_activa,
            priceTiers: product._enrichedData?.priceTiers || [],
            specs: product._enrichedData?.specs || [],
            reviews: product._enrichedData?.reviews || [],
        };
    }

    /**
     * Maps ResolvedProduct to admin list response format.
     * Used by AdminService for back-office endpoints.
     */
    toAdminResponse(product: ResolvedProduct): any {
        return {
            _id: product._enrichedData?._id || product._erpData?._id,
            sku: product.sku,
            erpName: product.erpName,
            webName: product.webName,
            nombre: product.webName || product.erpName,
            stock: product.stock,
            price: product.price,
            brand: product.brand,
            multimedia: {
                principal: product.images[0] || '',
            },
            isVisible: product.isVisible,
            enrichmentStatus: product.enrichmentStatus,
            promocion_activa: product._enrichedData?.promocion_activa,
        };
    }

    /**
     * Maps ResolvedProduct to detailed view response format.
     * Used for product detail pages.
     */
    toDetailResponse(product: ResolvedProduct): any {
        return {
            ...product,
            _id: product._enrichedData?._id ? String(product._enrichedData._id) : null,
            codigo_interno: product.sku,
            slug: product._enrichedData?.slug || product.sku,
            descripcion_extendida: product._enrichedData?.descripcion_extendida,
            nombre: product.webName || product.erpName,
            name: product.webName || product.erpName,
            multimedia: {
                principal: product.images[0] || '',
                galeria: product.images.slice(1),
            },
            es_publico: product.isVisible,
            stock: { total_disponible: product.stock },
            precios: {
                pvp: product.price,
                pvm: product.wholesalePrice,
                incluye_iva: true
            },
            specs: product._enrichedData?.specs || [],
            peso_kg: product.weight_kg || 0,
            weight_kg: product.weight_kg || 0,

            dimensiones: product._enrichedData?.dimensiones || null,
            dimensions: product._enrichedData?.dimensiones || null,
            promocion_activa: product._enrichedData?.promocion_activa,
        };
    }
}
