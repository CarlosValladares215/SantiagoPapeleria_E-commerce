import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Producto, ProductoDocument } from './schemas/producto.schema';
import { ProductERP, ProductERPDocument } from './schemas/product-erp.schema';
import { ProductFilterDto } from './dto/product-filter.dto';
import { ErpSyncService } from '../erp/sync/erp-sync.service';
import { MovimientosService } from './movimientos.service';

// Definition of the Resolved Product (merged in memory)
export interface ResolvedProduct {
  sku: string;
  erpName: string;
  webName: string;
  brand: string;
  category: string;
  price: number;
  wholesalePrice: number;
  stock: number;
  isVisible: boolean;
  enrichmentStatus: string;
  description: string;
  images: string[];
  weight_kg: number;
  dimensions: any;
  allows_custom_message: boolean;
  attributes: any[];
  _erpData?: any;
  _enrichedData?: any;
}

@Injectable()
export class ProductosService {
  constructor(
    @InjectModel(Producto.name) private productoModel: Model<ProductoDocument>,
    @InjectModel(ProductERP.name) private productErpModel: Model<ProductERPDocument>,
    @Inject(forwardRef(() => ErpSyncService)) private readonly erpSyncService: ErpSyncService,
    private movimientosService: MovimientosService
  ) { }

  // --- CORE: HELPER DE FUSIÓN (PURE LOGIC) ---
  private mergeProducts(erp: any, enriched: any): ResolvedProduct {
    const enrichmentStatus = enriched?.enrichment_status || 'pending';
    // Default to TRUE as per user requirement: "Automático (aparece al sincronizar)"
    const isVisible = enriched?.es_publico !== undefined ? enriched.es_publico : true;

    return {
      sku: erp.codigo,
      erpName: erp.nombre,
      webName: enriched?.nombre_web || '',
      brand: erp.marca || 'Genérico',
      category: erp.categoria_g2 || 'General',
      price: erp.precio_pvp || 0,
      wholesalePrice: erp.precio_pvm || 0,
      stock: erp.stock || 0,
      isVisible: isVisible,
      enrichmentStatus: enrichmentStatus,
      description: enriched?.descripcion_extendida || erp.descripcion || erp.nombre, // Prefer enriched, then ERP enriched, then name
      images: enriched?.multimedia?.principal
        ? [enriched.multimedia.principal, ...(enriched.multimedia.galeria || [])]
        : (erp.imagen ? [`http://localhost:4000/data/photos/${erp.imagen}`] : []),
      weight_kg: enriched?.peso_kg || 0,
      dimensions: enriched?.dimensiones || {},
      allows_custom_message: enriched?.permite_mensaje_personalizado || false,
      attributes: enriched?.attributes || [],
      _erpData: erp,
      _enrichedData: enriched
    };
  }

  // --- 1. Get Merged Products (Admin List & Catalog Base) ---
  async getMergedProducts(filterDto: ProductFilterDto): Promise<any> {
    const { searchTerm, status, category, brand, minPrice, maxPrice, inStock, sortBy, page = 1, limit = 50, excludeId } = filterDto;

    const erpQuery: any = { activo: true };

    if (searchTerm) {
      erpQuery.$or = [
        { codigo: { $regex: searchTerm, $options: 'i' } },
        { nombre: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    if (excludeId) {
      // Excluir por código o ID (si es SKU)
      erpQuery.codigo = { $ne: excludeId };
    }

    if (brand) erpQuery.marca = brand;
    if (category) erpQuery.categoria_g2 = category;

    if (minPrice || maxPrice) {
      erpQuery.precio_pvp = {};
      if (minPrice) erpQuery.precio_pvp.$gte = Number(minPrice);
      if (maxPrice) erpQuery.precio_pvp.$lte = Number(maxPrice);
    }

    if (inStock === 'true') {
      erpQuery.stock = { $gt: 0 };
    }

    // Filter by specific IDs/SKUs
    if (filterDto.ids && filterDto.ids.length > 0) {
      if (!erpQuery.$or) erpQuery.$or = [];
      // Support finding by ERP Code (SKU)
      erpQuery.codigo = { $in: filterDto.ids };
    }

    const skip = (Number(page) - 1) * Number(limit);
    let sortOptions: any = {};
    if (sortBy === 'price') sortOptions.precio_pvp = 1;
    else if (sortBy === '-price') sortOptions.precio_pvp = -1;
    else if (sortBy === 'stock') sortOptions.stock = -1;
    else sortOptions.nombre = 1;

    const [erpProducts, total] = await Promise.all([
      this.productErpModel.find(erpQuery)
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean()
        .exec(),
      this.productErpModel.countDocuments(erpQuery)
    ]);

    const skus = erpProducts.map(p => p.codigo);
    const enrichedDocs = await this.productoModel.find({
      codigo_interno: { $in: skus }
    }).lean().exec();

    const enrichmentMap = new Map(enrichedDocs.map(doc => [doc.codigo_interno, doc]));

    let mergedProducts = erpProducts.map(erpItem => {
      const enrichedItem = enrichmentMap.get(erpItem.codigo);
      return this.mergeProducts(erpItem, enrichedItem);
    });

    if (status && status !== 'all') {
      mergedProducts = mergedProducts.filter(p => p.enrichmentStatus === status);
    }

    if (filterDto.stockStatus && filterDto.stockStatus !== 'all') {
      const umbral = 5; // Configurable ideally, but fixed per requirements for now
      if (filterDto.stockStatus === 'out_of_stock') {
        mergedProducts = mergedProducts.filter(p => p.stock === 0);
      } else if (filterDto.stockStatus === 'low') {
        mergedProducts = mergedProducts.filter(p => p.stock > 0 && p.stock <= umbral);
      } else if (filterDto.stockStatus === 'normal') {
        mergedProducts = mergedProducts.filter(p => p.stock > umbral);
      }
    }

    if (filterDto.isVisible) {
      const isVisibleBool = filterDto.isVisible === 'true';
      mergedProducts = mergedProducts.filter(p => p.isVisible === isVisibleBool);
    }

    // Map to frontend friendly structure (MATCHING Frontend MergedProduct Interface)
    const mappedData = mergedProducts.map(p => ({
      _id: p._enrichedData?._id || p._erpData?._id,
      sku: p.sku, // Frontend uses 'sku'
      erpName: p.erpName, // Frontend uses 'erpName'
      webName: p.webName, // Frontend uses 'webName'
      nombre: p.webName || p.erpName, // Fallback/Display name
      stock: p.stock,
      price: p.price, // Frontend uses 'price' (not precio)
      brand: p.brand, // Frontend uses 'brand'
      multimedia: {
        principal: p.images[0] || ''
      },
      isVisible: p.isVisible, // Frontend uses 'isVisible'
      enrichmentStatus: p.enrichmentStatus, // Frontend uses 'enrichmentStatus' for badges
      promocion_activa: p._enrichedData?.promocion_activa
    }));

    return {
      data: mappedData,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    };
  }

  // --- 2. Public Catalog Access ---
  async findAll(filterDto: ProductFilterDto): Promise<any[]> {
    const visibleEnrichedDocs = await this.productoModel.find({ es_publico: true }).select('codigo_interno').lean().exec();
    const visibleSkus = visibleEnrichedDocs.map(d => d.codigo_interno);

    if (visibleSkus.length === 0) return [];

    const erpQuery: any = {
      codigo: { $in: visibleSkus },
      activo: true,
    };

    if (filterDto.excludeId) {
      erpQuery.codigo = { $ne: filterDto.excludeId };
    }

    // Aplicar filtros de categoria/marca al ERP
    if (filterDto.category) erpQuery.categoria_g2 = filterDto.category;
    if (filterDto.brand) erpQuery.marca = filterDto.brand;

    const limit = filterDto.limit ? Number(filterDto.limit) : 1000;
    const erpProducts = await this.productErpModel.find(erpQuery).limit(limit).lean().exec();

    const finalSkus = erpProducts.map(p => p.codigo);
    const enrichedFullDocs = await this.productoModel.find({ codigo_interno: { $in: finalSkus } }).lean().exec();
    const enrichmentMap = new Map(enrichedFullDocs.map(doc => [doc.codigo_interno, doc]));

    const mergedList = erpProducts.map(erpItem => {
      const enrichedItem = enrichmentMap.get(erpItem.codigo);
      return this.mergeProducts(erpItem, enrichedItem);
    });

    // --- FEATURED PRODUCTS SORTING ---
    const featuredSkus = [
      "003734", "001281", "012166", "006171", "010552",
      "002918", "012139", "025620", "010416", "026996"
    ];

    mergedList.sort((a, b) => {
      const indexA = featuredSkus.indexOf(a.sku);
      const indexB = featuredSkus.indexOf(b.sku);

      // Both featured: sort by order in list
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      // Only A featured: comes first
      if (indexA !== -1) return -1;
      // Only B featured: comes first
      if (indexB !== -1) return 1;
      // Neither featured: keep original order (or sort by name/etc)
      return 0;
    });
    // ---------------------------------

    return mergedList.map(p => ({
      _id: p._enrichedData?._id || null,
      codigo_interno: p.sku,
      nombre: p.webName || p.erpName,
      slug: p._enrichedData?.slug || p.sku,
      activo: true,
      clasificacion: {
        marca: p.brand,
        grupo: p.category,
        linea: ''
      },
      precios: {
        pvp: p.price,
        pvm: p.wholesalePrice,
        incluye_iva: true
      },
      stock: {
        total_disponible: p.stock
      },
      multimedia: {
        principal: p.images[0] || '',
        galeria: p.images.slice(1)
      },
      es_publico: true,
      enriquecido: true,
      peso_kg: p.weight_kg || 0,
      dimensiones: p.dimensions || {},
      promocion_activa: p._enrichedData?.promocion_activa
    }));
  }

  // --- 3. Find One (Detail Page & Admin Edit) ---
  async findOne(term: string): Promise<any> {
    const { Types } = require('mongoose');
    let sku = term;
    let enrichedDoc: any = null;

    const isObjectId = Types.ObjectId.isValid(term);
    enrichedDoc = await this.productoModel.findOne({
      $or: [
        { _id: isObjectId ? term : null },
        { codigo_interno: term },
        { slug: term }
      ]
    }).lean().exec();

    if (enrichedDoc) {
      sku = enrichedDoc.codigo_interno;
    }

    const erpDoc = await this.productErpModel.findOne({ codigo: sku }).lean().exec();

    if (!erpDoc) {
      return null;
    }

    const resolve = this.mergeProducts(erpDoc, enrichedDoc);

    return {
      ...resolve,
      _id: resolve._enrichedData?._id || null,
      codigo_interno: resolve.sku,
      slug: resolve._enrichedData?.slug || resolve.sku,
      descripcion_extendida: resolve._enrichedData?.descripcion_extendida,
      description: resolve.description,
      nombre: resolve.webName || resolve.erpName,
      multimedia: {
        principal: resolve.images[0] || '',
        galeria: resolve.images.slice(1)
      },
      es_publico: resolve.isVisible,
      stock: { total_disponible: resolve.stock },
      precios: { pvp: resolve.price, pvm: resolve.wholesalePrice, incluye_iva: true },
      specs: resolve._enrichedData?.specs || [],
      peso_kg: resolve._enrichedData?.peso_kg || 0,
      weight_kg: resolve._enrichedData?.peso_kg || 0,
      dimensiones: resolve._enrichedData?.dimensiones || null,
      dimensions: resolve._enrichedData?.dimensiones || null,
      promocion_activa: resolve._enrichedData?.promocion_activa
    };
  }

  // --- 4. Enrich Product (Write Config & Sync Back) ---
  async enrichProduct(id: string, updateData: any): Promise<any> {
    const { Types } = require('mongoose');
    let filter = {};
    let sku = '';

    if (Types.ObjectId.isValid(id)) {
      filter = { _id: id };
      const doc = await this.productoModel.findOne(filter).select('codigo_interno').lean().exec();
      if (doc) sku = doc.codigo_interno;
    } else {
      filter = { codigo_interno: id };
      sku = id;
    }

    updateData.enriquecido = true;
    updateData.enrichment_status = 'complete';

    const auditEntry = {
      date: new Date(),
      admin: 'admin@santiagopapeleria.com',
      action: 'Actualización de producto'
    };

    if (!updateData.codigo_interno && typeof id === 'string' && !Types.ObjectId.isValid(id)) {
      updateData.codigo_interno = id;
    }

    console.log('--- DEBUG ENRICH PRODUCT (WRITE) ---');
    console.log('ID/Filter:', filter);
    console.log('Update Data:', JSON.stringify(updateData));

    // --- SYNC BACK LOGIC ---
    // Si estamos editando campos restringidos (Nombre, Descripción), enviamos al ERP
    if (sku && (updateData.nombre_web || updateData.descripcion_extendida)) {
      try {
        await this.erpSyncService.updateProductInErp(sku, {
          nombre: updateData.nombre_web,
          descripcion: updateData.descripcion_extendida
        });
      } catch (error) {
        console.error(`⚠️ Failed to sync back to ERP for ${sku}`, error.message);
      }
    }
    // -----------------------

    const updatedDoc = await this.productoModel.findOneAndUpdate(
      filter,
      {
        $set: updateData,
        $push: { 'auditoria.historial_cambios': auditEntry }
      },
      { new: true, upsert: true }
    ).lean().exec();

    console.log('Updated Doc Result:', updatedDoc);
    console.log('------------------------------------');

    return this.findOne(updatedDoc.codigo_interno);
  }

  async getCategoryCounts(): Promise<{ name: string; count: number }[]> {
    return this.productErpModel.aggregate([
      { $match: { activo: true } },
      { $group: { _id: "$categoria_g2", count: { $sum: 1 } } },
      { $project: { _id: 0, name: "$_id", count: 1 } }
    ]).exec();
  }

  async getCategoriesStructure(): Promise<any[]> {
    return this.productErpModel.aggregate([
      { $match: { activo: true } },
      {
        $group: {
          _id: { g1: "$categoria_g1", g2: "$categoria_g2" },
          subgrupos: { $addToSet: "$categoria_g3" }
        }
      },
      {
        $group: {
          _id: "$_id.g1",
          grupos: {
            $push: {
              nombre: "$_id.g2",
              subgrupos: "$subgrupos"
            }
          }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          linea: "$_id",
          grupos: 1
        }
      }
    ]).exec();
  }

  async getBrands(): Promise<string[]> {
    return this.productErpModel.distinct('marca', { activo: true }).exec();
  }

  async getInventoryStats(): Promise<any> {
    const totalProducts = await this.productErpModel.countDocuments({ activo: true });

    // We can't query 'stock' directly on ERP model easily for ranges if it's string, 
    // but assuming it's number because of Schema.
    // Stock > 0 && <= 5
    const lowStock = await this.productErpModel.countDocuments({
      activo: true,
      stock: { $gt: 0, $lte: 5 }
    });

    const outOfStock = await this.productErpModel.countDocuments({
      activo: true,
      stock: 0
    });

    const normalStock = await this.productErpModel.countDocuments({
      activo: true,
      stock: { $gt: 5 }
    });

    return {
      total: totalProducts,
      lowStock,
      outOfStock,
      normalStock,
      timestamp: new Date()
    };
  }

  async getProductHistory(sku: string): Promise<any[]> {
    return this.movimientosService.getHistorial(sku);
  }

  async getLastMovements(limit: number = 20): Promise<any[]> {
    return this.movimientosService.getUltimosMovimientos(limit);
  }

  /**
   * Updates stock locally...

   * Used by PedidosService when an order is placed.
   * @param sku Product SKU
   * @param delta Change in stock (negative for reduction)
   * @param reference Order ID or reference
   * @param type Movement type
   * @param userId User causing the change
   */


  async updateStock(sku: string, delta: number, reference: string, type: 'VENTA' | 'DEVOLUCION' | 'AJUSTE_MANUAL', userId?: string): Promise<void> {
    // 1. Update ProductERP (Source) - Find by COD
    const erpProduct = await this.productErpModel.findOne({ codigo: sku });
    if (!erpProduct) {
      // Can happen if product is not in ERP collection yet?
      // Fallback to finding by enriched code if sync logic differs
      console.warn(`[Stock] Product SKU ${sku} not found in ERP Collection`);
      return;
    }

    const oldStock = Number(erpProduct.stock) || 0;
    const newStock = oldStock + delta; // delta is usually negative for sales

    // Only update if changed
    if (oldStock !== newStock) {
      erpProduct.stock = newStock;
      await erpProduct.save();

      // 2. Update Enriched Product (Cache/View)
      // We update specifically total_disponible and recalculate status
      const enriched = await this.productoModel.findOne({ codigo_interno: sku });
      if (enriched) {
        enriched.stock.total_disponible = newStock;
        enriched.stock.estado_stock = newStock <= 0 ? 'agotado' : (newStock <= (enriched.stock.umbral_stock_alerta || 5) ? 'bajo' : 'normal');
        await enriched.save();
      }

      // 3. Log Movement
      try {
        await this.movimientosService.registrarMovimiento({
          producto_id: (enriched?._id || erpProduct._id) as any,
          sku: sku,
          tipo: type,
          cantidad: delta,
          stock_anterior: oldStock,
          stock_nuevo: newStock,
          referencia: reference,
          usuario_id: userId
        });
      } catch (logErr) {
        console.error(`[Stock] Error logging movement for ${sku}:`, logErr);
        // Don't fail the transaction just because log failed (?)
      }
    }
  }
}
