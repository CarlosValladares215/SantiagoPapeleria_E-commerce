import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Producto, ProductoDocument } from '../schemas/producto.schema';
import { ProductERP, ProductERPDocument } from '../schemas/product-erp.schema';
import { Pedido } from '../../orders/schemas/pedido.schema';

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
        @InjectModel(Pedido.name) private pedidoModel: Model<Pedido>,
    ) { }

    /**
     * Adds a review to a product.
     * Creates enriched product document if not exists.
     */
    async addReview(
        productId: string,
        userId: string,
        review: { user_name: string; rating: number; comment: string },
    ): Promise<any> {
        // 1. Verify Purchase Eligibility
        const canReview = await this.canUserReviewProduct(userId, productId);
        if (!canReview) {
            throw new ForbiddenException('Solo los usuarios que han comprado este producto pueden dejar una reseña.');
        }

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

    /**
     * Checks if a user has purchased a product at least once.
     * Logic: Look for orders containing the product SKU where the order belongs to the user.
     */
    async canUserReviewProduct(userId: string, productId: string): Promise<boolean> {
        // 1. Resolve SKU if productId is an ObjectId
        let sku = productId;
        if (Types.ObjectId.isValid(productId)) {
            const product = await this.productoModel.findById(productId).select('codigo_interno').lean().exec();
            if (!product) return false;
            sku = product.codigo_interno;
        }

        // 2. Search for any order by this user that contains this SKU
        const order = await this.pedidoModel.findOne({
            usuario_id: new Types.ObjectId(userId),
            'items.codigo_dobranet': sku
        }).lean().exec();

        return !!order;
    }
}
