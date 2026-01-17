import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Producto, ProductoDocument } from '../schemas/producto.schema';
import { ProductERP, ProductERPDocument } from '../schemas/product-erp.schema';

/**
 * ReviewsService
 * 
 * Handles product review operations:
 * - Adding reviews to products
 * - Future: Fetching, moderating reviews
 * 
 * Single Responsibility: Product reviews management
 */
@Injectable()
export class ReviewsService {
    constructor(
        @InjectModel(Producto.name) private productoModel: Model<ProductoDocument>,
        @InjectModel(ProductERP.name) private productErpModel: Model<ProductERPDocument>,
    ) { }

    /**
     * Adds a review to a product.
     * Creates enriched product document if not exists.
     */
    async addReview(
        productId: string,
        review: { user_name: string; rating: number; comment: string },
    ): Promise<any> {
        let filter: any;
        let sku = productId;

        if (Types.ObjectId.isValid(productId)) {
            filter = { _id: productId };
        } else {
            filter = { codigo_interno: productId };
        }

        const existing = await this.productoModel.findOne(filter).exec();

        const reviewWithDate = {
            ...review,
            date: new Date(),
        };

        if (existing) {
            existing.reviews.push(reviewWithDate as any);
            await existing.save();
            return this.getProductWithReviews(existing.codigo_interno);
        }

        // Product not enriched yet - verify in ERP and create enriched doc
        const erp = await this.productErpModel.findOne({ codigo: sku }).exec();
        if (!erp) {
            throw new NotFoundException('Producto no encontrado');
        }

        const newDoc = new this.productoModel({
            codigo_interno: erp.codigo,
            nombre: erp.nombre,
            reviews: [reviewWithDate],
        });
        await newDoc.save();

        return this.getProductWithReviews(erp.codigo);
    }

    /**
     * Gets product with reviews for response.
     */
    private async getProductWithReviews(sku: string): Promise<any> {
        const enriched = await this.productoModel
            .findOne({ codigo_interno: sku })
            .lean()
            .exec();

        const erp = await this.productErpModel
            .findOne({ codigo: sku })
            .lean()
            .exec();

        if (!erp) {
            throw new NotFoundException('Producto no encontrado');
        }

        return {
            _id: enriched?._id || null,
            sku,
            name: enriched?.nombre_web || erp.nombre,
            reviews: enriched?.reviews || [],
            averageRating: this.calculateAverageRating(enriched?.reviews || []),
        };
    }

    private calculateAverageRating(reviews: any[]): number {
        if (reviews.length === 0) return 0;
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        return Math.round((sum / reviews.length) * 10) / 10;
    }
}
