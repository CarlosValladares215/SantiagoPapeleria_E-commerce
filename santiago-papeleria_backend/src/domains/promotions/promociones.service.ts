import { Injectable, Logger, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Promocion, PromocionDocument } from './schemas/promocion.schema';
import { PromocionHistorial, PromocionHistorialDocument } from './schemas/promocion-historial.schema';
import { Producto, ProductoDocument } from '../products/schemas/producto.schema';
import { CreatePromocionDto } from './dto/create-promocion.dto';
import { UpdatePromocionDto } from './dto/update-promocion.dto';

@Injectable()
export class PromocionesService {
  private readonly logger = new Logger(PromocionesService.name);

  constructor(
    @InjectModel(Promocion.name) private promocionModel: Model<PromocionDocument>,
    @InjectModel(PromocionHistorial.name) private historialModel: Model<PromocionHistorialDocument>,
    @InjectModel(Producto.name) private productoModel: Model<ProductoDocument>,
  ) { }

  async create(createDto: CreatePromocionDto): Promise<Promocion> {
    const existing = await this.promocionModel.findOne({ nombre: createDto.nombre });
    if (existing) {
      throw new ConflictException('Ya existe una promoción con este nombre');
    }

    // Validación de fechas
    if (new Date(createDto.fecha_inicio) < new Date(new Date().setHours(0, 0, 0, 0))) {
      // throw new BadRequestException('La fecha de inicio no puede ser pasada'); 
    }
    if (new Date(createDto.fecha_fin) <= new Date(createDto.fecha_inicio)) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la de inicio');
    }

    const created = new this.promocionModel({
      ...createDto,
      created_by: new Types.ObjectId(), // Placeholder
      updated_by: new Types.ObjectId(), // Placeholder
    });
    const saved = await created.save();

    await this.logHistory(saved._id as Types.ObjectId, 'creada', null, null);

    // Sync products (non-blocking - don't fail create if sync fails)
    if (saved.activa) {
      try {
        await this.syncProducts([saved]);
      } catch (syncError) {
        this.logger.error('Error syncing products for new promotion:', syncError);
      }
    }

    return saved;
  }

  async update(id: string, updateDto: UpdatePromocionDto): Promise<Promocion> {
    const original = await this.promocionModel.findById(id).lean();
    if (!original) throw new NotFoundException('Promoción no encontrada');

    const updated = await this.promocionModel.findByIdAndUpdate(id, updateDto, { new: true });
    if (!updated) throw new NotFoundException('Promoción no encontrada');

    await this.logHistory(new Types.ObjectId(id), 'editada', original, updateDto);

    // @ts-ignore
    await this.recalculateForPromo(original, updated);

    return updated;
  }

  // Recalculates best active promotion for products affected by a promo change
  private async recalculateForPromo(oldPromo: PromocionDocument | Promocion | null, newPromo: PromocionDocument | Promocion | null) {
    if (!oldPromo && !newPromo) return;

    // 1. Find products that matched OLD filter
    let oldProductIds: string[] = [];
    if (oldPromo) {
      const oldQuery = this.buildProductQuery(oldPromo);
      oldProductIds = (await this.productoModel.find(oldQuery).select('_id')).map(p => p._id.toString());
    }

    // 2. Find products that match NEW filter
    let newProductIds: string[] = [];
    if (newPromo) {
      const newQuery = this.buildProductQuery(newPromo);
      newProductIds = (await this.productoModel.find(newQuery).select('_id')).map(p => p._id.toString());
    }

    // 3. Union
    const allAffectedIds = [...new Set([...oldProductIds, ...newProductIds])];

    this.logger.log(`Recalculating promotions for ${allAffectedIds.length} products...`);

    // 4. Update each
    const chunkSize = 50;
    for (let i = 0; i < allAffectedIds.length; i += chunkSize) {
      const chunk = allAffectedIds.slice(i, i + chunkSize);
      await Promise.all(chunk.map(id => this.updateProductBestPromotion(id)));
    }
  }

  // Single Product Recalculation
  async updateProductBestPromotion(productId: string | Types.ObjectId) {
    const product = await this.productoModel.findById(productId);
    if (!product) return;

    // Find ALL active promotions that apply to this product
    const today = new Date();
    // Fetch all active promos (cached or indexed hopefully)
    const allActivePromos = await this.promocionModel.find({
      activa: true,
      fecha_inicio: { $lte: today },
      fecha_fin: { $gt: today },
    });

    let bestPromo: PromocionDocument | null = null;
    let bestDiscountValue = 0;

    for (const promo of allActivePromos) {
      if (this.doesPromoApplyToProduct(promo, product)) {
        const discountAmount = this.calculateDiscountAmount(promo, product.precios.pvp);
        if (discountAmount > bestDiscountValue) {
          bestDiscountValue = discountAmount;
          bestPromo = promo;
        }
      }
    }

    // Update Product
    if (bestPromo) {
      const pvp = product.precios.pvp;
      product.promocion_activa = {
        promocion_id: bestPromo._id as Types.ObjectId,
        precio_original: pvp,
        precio_descuento: Math.max(0.01, pvp - bestDiscountValue), // Safety
        tipo_descuento: bestPromo.tipo,
        valor_descuento: bestPromo.valor,
        calculado_at: new Date()
      } as any;
    } else {
      product.promocion_activa = undefined as any;
    }
    await product.save();
  }

  private doesPromoApplyToProduct(promo: PromocionDocument | Promocion, product: Producto): boolean {
    if (promo.ambito === 'global') return true;

    const filtro = promo.filtro;
    let matchesCategory = false;
    let matchesBrand = false;
    let matchesProduct = false;

    // Check if ANY selected category matches
    if (filtro?.categorias && filtro.categorias.length > 0) {
      const productCategoryPath = `${product.clasificacion.linea} > ${product.clasificacion.grupo}`;
      matchesCategory = filtro.categorias.some(cat => {
        // Category can be partial (e.g., "MERCADERIAS > BOLSOS") or full path
        return productCategoryPath.startsWith(cat) || cat === product.clasificacion.grupo;
      });
    }

    // Check if ANY selected brand matches
    if (filtro?.marcas && filtro.marcas.length > 0) {
      matchesBrand = filtro.marcas.includes(product.clasificacion.marca);
    }

    // Check if product SKU is in the list
    if (filtro?.codigos_productos && filtro.codigos_productos.length > 0) {
      matchesProduct = filtro.codigos_productos.includes(product.codigo_interno);
    }

    // For 'mixto' or specific ambitos, apply OR logic (any match = applies)
    if (promo.ambito === 'mixto') {
      return matchesCategory || matchesBrand || matchesProduct;
    }
    if (promo.ambito === 'categoria') return matchesCategory;
    if (promo.ambito === 'marca') return matchesBrand;
    if (promo.ambito === 'productos') return matchesProduct;

    return false;
  }

  private calculateDiscountAmount(promo: Promocion, price: number): number {
    if (promo.tipo === 'porcentaje') {
      return price * (promo.valor / 100);
    } else {
      return promo.valor;
    }
  }

  private buildProductQuery(promo: PromocionDocument | Promocion | null): any {
    if (!promo || (promo as any).activa === false) return { _id: null };
    const p = promo as Promocion;

    if (p.ambito === 'global') return {};

    const orConditions: any[] = [];

    // Category matching: match if product's grupo is in any of the selected categorias
    if (p.filtro?.categorias && p.filtro.categorias.length > 0) {
      // Each categoria entry is the grupo name (e.g., "BOLSOS")
      orConditions.push({ 'clasificacion.grupo': { $in: p.filtro.categorias } });
    }

    // Brand matching
    if (p.filtro?.marcas && p.filtro.marcas.length > 0) {
      orConditions.push({ 'clasificacion.marca': { $in: p.filtro.marcas } });
    }

    // Product SKU matching
    if (p.filtro?.codigos_productos && p.filtro.codigos_productos.length > 0) {
      orConditions.push({ 'codigo_interno': { $in: p.filtro.codigos_productos } });
    }

    // If no conditions, return empty (shouldn't match anything for non-global)
    if (orConditions.length === 0) return { _id: null };

    // For 'mixto' use OR logic, for specific ambito use the relevant condition
    if (p.ambito === 'mixto' || orConditions.length > 1) {
      return { $or: orConditions };
    }

    // Single condition - return it directly
    return orConditions[0];
  }

  private async syncProducts(promos: Promocion[]) {
    for (const promo of promos) {
      // @ts-ignore
      await this.recalculateForPromo(promo, promo);
    }
  }

  private async logHistory(promoId: Types.ObjectId, accion: string, oldVal: any, changes: any) {
    await this.historialModel.create({
      promocion_id: promoId,
      accion,
      datos_anteriores: oldVal,
      cambios: changes ? Object.keys(changes).map(k => ({ campo: k, valor_nuevo: changes[k] })) : [],
      usuario_id: new Types.ObjectId(), // Placeholder
    });
  }

  // --- STANDARD CRUD ---
  async findAll(query: any): Promise<Promocion[]> {
    return this.promocionModel.find(query).sort({ created_at: -1 }).exec();
  }

  async findOne(id: string): Promise<Promocion> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('ID inválido');
    const promo = await this.promocionModel.findById(id);
    if (!promo) throw new NotFoundException('Promoción no encontrada');
    return promo;
  }

  async remove(id: string): Promise<void> {
    const promo = await this.findOne(id);

    // Validar si hay pedidos (PENDIENTE: conectar con OrdersService)

    await this.promocionModel.deleteOne({ _id: id });
    await this.logHistory(new Types.ObjectId(id), 'eliminada', promo, null);

    // Simulate deactivation to remove from products
    const deactivatedPromo = { ...(promo as unknown as PromocionDocument).toObject(), activa: false } as unknown as PromocionDocument;
    await this.recalculateForPromo(promo as unknown as PromocionDocument, deactivatedPromo);
  }
}
