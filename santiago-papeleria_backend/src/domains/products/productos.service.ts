import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Producto, ProductoDocument } from './schemas/producto.schema';
import { ProductERP, ProductERPDocument } from './schemas/product-erp.schema';
import { Categoria, CategoriaDocument } from './schemas/categoria.schema';
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
    @InjectModel(Categoria.name) private categoriaModel: Model<CategoriaDocument>,
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
    if (category) {
      // Use regex for flexible matching (case insensitive)
      const catRegex = { $regex: category, $options: 'i' };
      const catFilter = {
        $or: [
          { categoria_g2: catRegex },
          { categoria_g3: catRegex },
          { categoria_g1: catRegex }
        ]
      };

      if (erpQuery.$or) {
        erpQuery.$and = [
          { $or: erpQuery.$or },
          catFilter
        ];
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

  // --- 2. Public Catalog Access (PAGINATED) ---
  async findAll(filterDto: ProductFilterDto): Promise<any> {
    const { page = 1, limit = 12, isOffer } = filterDto;
    let visibleSkus: string[] = [];

    // --- A. FILTERING BY IDs or IS_OFFER (Enriched Data) ---
    const enrichedQuery: any = { es_publico: true };
    let preFilteredByEnriched = false;

    // 1. Filter by specific IDs (Favorites)
    if (filterDto.ids && filterDto.ids.length > 0) {
      const { Types } = require('mongoose');
      const objectIds = filterDto.ids.filter(id => Types.ObjectId.isValid(id));
      enrichedQuery._id = { $in: objectIds };
      preFilteredByEnriched = true;
    }

    // 2. Filter by Offers (PromocionActiva or PriceTiers)
    const isOfferValue = String(filterDto.isOffer);

    if (isOfferValue === 'true') {
      enrichedQuery.promocion_activa = { $exists: true, $ne: null };
      preFilteredByEnriched = true;
      console.log('Filtrando solo ofertas...'); // Agrega este log para debuggear
    }

    // If we need to filter by enriched data first (IDs or Offers)
    if (preFilteredByEnriched) {
      const matchingDocs = await this.productoModel.find(enrichedQuery)
        .select('codigo_interno')
        .lean()
        .exec();
      visibleSkus = matchingDocs.map(d => d.codigo_interno);

      // If filtering by offers/ids yielded 0 results, return empty immediately
      if (visibleSkus.length === 0) {
        return {
          data: [],
          meta: { total: 0, page: Number(page), limit: Number(limit), totalPages: 0 }
        };
      }
    } else {
      // If no enriched-specific filter, we don't restrict SKUs yet (except finding all public ones potentially?)
      // Optimization: Instead of fetching ALL public SKUs, we rely on ERP Active flag and merge on demand.
      // BUT we need to ensure we only show 'es_publico: true'.
      // Strategy: Fetch paginated ERP products, then check 'es_publico'. However, this breaks pagination accuracy.
      // Better Strategy: Fetch ALL public SKUs from enriched DB (lightweight index scan) to restrict ERP query.
      const visibleEnrichedDocs = await this.productoModel.find({ es_publico: true })
        .select('codigo_interno')
        .lean()
        .exec();
      visibleSkus = visibleEnrichedDocs.map(d => d.codigo_interno);
    }

    // --- B. PREPARE ERP QUERY ---
    const erpQuery: any = {
      codigo: { $in: visibleSkus },
      activo: true,
    };

    if (filterDto.excludeId) {
      erpQuery.codigo = { $ne: filterDto.excludeId };
    }

    if (filterDto.category) {
      const catRegex = { $regex: filterDto.category, $options: 'i' };
      const catFilter = {
        $or: [
          { categoria_g1: catRegex },
          { categoria_g2: catRegex },
          { categoria_g3: catRegex }
        ]
      };
      if (erpQuery.$or) {
        erpQuery.$and = erpQuery.$and || [];
        erpQuery.$and.push({ $or: erpQuery.$or });
        erpQuery.$and.push(catFilter);
        delete erpQuery.$or;
      } else {
        erpQuery.$or = catFilter.$or;
      }
    }

    if (filterDto.brand) erpQuery.marca = filterDto.brand;

    if (filterDto.searchTerm) {
      const searchFilter = {
        $or: [
          { nombre: { $regex: filterDto.searchTerm, $options: 'i' } },
          { codigo: { $regex: filterDto.searchTerm, $options: 'i' } }
        ]
      };

      if (erpQuery.$or || erpQuery.$and) {
        erpQuery.$and = erpQuery.$and || [];
        if (erpQuery.$or) {
          erpQuery.$and.push({ $or: erpQuery.$or });
          delete erpQuery.$or;
        }
        erpQuery.$and.push(searchFilter);
      } else {
        erpQuery.$or = searchFilter.$or;
      }
    }

    // Price Filter (ERP Price)
    if (filterDto.minPrice || filterDto.maxPrice) {
      erpQuery.precio_pvp = {};
      if (filterDto.minPrice) erpQuery.precio_pvp.$gte = Number(filterDto.minPrice);
      if (filterDto.maxPrice) erpQuery.precio_pvp.$lte = Number(filterDto.maxPrice);
    }

    if (filterDto.inStock === 'true') {
      erpQuery.stock = { $gt: 0 };
    }

    // --- C. PAGINATION & SORTING ---
    const skip = (Number(page) - 1) * Number(limit);

    let sortOptions: any = {};
    const sortBy = filterDto.sortBy || 'name';
    if (sortBy === 'price') sortOptions.precio_pvp = 1;
    else if (sortBy === '-price') sortOptions.precio_pvp = -1;
    else if (sortBy === 'stock') sortOptions.stock = -1;
    else if (sortBy === '-stock') sortOptions.stock = 1;
    else if (sortBy === 'name') {
      // Prioritize items with images (non-empty 'imagen')
      // We use imagen: -1 because strings > empty/null in desc sort usually (depending on collation, but typically 'path' > '')
      sortOptions.imagen = -1;
      sortOptions.nombre = 1;
    }
    else if (sortBy === '-name') sortOptions.nombre = -1;

    // --- D. EXECUTE QUERY ---
    // Featured SKUs from enrichment.json
    const featuredSkus = [
      "003734", "001281", "012166", "006171", "010552",
      "002918", "012139", "025620", "010416", "026996"
    ];

    let erpProducts: any[] = [];
    const total = await this.productErpModel.countDocuments(erpQuery);

    if (sortBy === 'name' || sortBy === 'name') { // Default sort
      const productsToReturn: any[] = [];

      // 1. Fetch Featured (if inside range)
      // Adjust logic: We treat "Featured" as a prefix list.
      let featuredSlice: string[] = [];
      if (skip < featuredSkus.length) {
        featuredSlice = featuredSkus.slice(skip, skip + Number(limit));
      }

      if (featuredSlice.length > 0) {
        const featuredDocs = await this.productErpModel.find({
          ...erpQuery,
          codigo: { $in: featuredSlice }
        }).lean().exec();

        // Maintain order
        featuredSlice.forEach(sku => {
          const doc = featuredDocs.find(d => d.codigo === sku);
          if (doc) productsToReturn.push(doc);
        });
      }

      // 2. Fetch Rest
      if (productsToReturn.length < Number(limit)) {
        const remaining = Number(limit) - productsToReturn.length;
        const restSkip = Math.max(0, skip - featuredSkus.length);

        const restDocs = await this.productErpModel.find({
          ...erpQuery,
          codigo: { $nin: featuredSkus } // Exclude featured
        })
          .sort(sortOptions)
          .skip(restSkip)
          .limit(remaining)
          .lean()
          .exec();

        productsToReturn.push(...restDocs);
      }

      erpProducts = productsToReturn;
    } else {
      // Standard Sort
      erpProducts = await this.productErpModel.find(erpQuery)
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean()
        .exec();
    }

    // --- E. MERGE DATA ---
    const finalSkus = erpProducts.map(p => p.codigo);
    const enrichedFullDocs = await this.productoModel.find({ codigo_interno: { $in: finalSkus } }).lean().exec();
    const enrichmentMap = new Map(enrichedFullDocs.map(doc => [doc.codigo_interno, doc]));

    const mergedList = erpProducts.map(erpItem => {
      const enrichedItem = enrichmentMap.get(erpItem.codigo);
      return this.mergeProducts(erpItem, enrichedItem);
    });

    // Note: Featured sorting cannot be strictly applied with server-side pagination unless it's the primary sort key.
    // We will omit manual featured sorting here as basic pagination overrides it.

    // --- F. MAP TO RESPONSE ---
    const mappedData = mergedList.map(p => ({
      _id: p._enrichedData?._id || null,
      internal_id: p.sku, // Consistent with DTO
      codigo_interno: p.sku,
      name: p.webName || p.erpName, // Consistent with DTO
      nombre: p.webName || p.erpName,
      slug: p._enrichedData?.slug || p.sku,
      activo: true,
      category: p.category, // Flattened
      brand: p.brand, // Flattened
      clasificacion: { // Keep for backward compatibility if needed
        marca: p.brand,
        grupo: p.category,
        linea: ''
      },
      precios: {
        pvp: p.price,
        pvm: p.wholesalePrice,
        incluye_iva: true
      },
      price: p.price, // Flattened
      wholesalePrice: p.wholesalePrice, // Flattened
      vat_included: true, // Flattened
      stock: p.stock, // Flattened (number) OR object if needed? Service returns number in 'stock'.
      // DTO expects number or object.

      multimedia: {
        principal: p.images[0] || '',
        galeria: p.images.slice(1)
      },
      images: p.images, // Flattened

      es_publico: true,
      enriquecido: true,
      isOffer: !!(p._enrichedData?.promocion_activa || (p._enrichedData?.priceTiers?.length > 0)),
      isNew: true, // Default

      peso_kg: p.weight_kg || 0,
      dimensiones: p.dimensions || {},
      promocion_activa: p._enrichedData?.promocion_activa,
      priceTiers: p._enrichedData?.priceTiers || [],
      specs: p._enrichedData?.specs || [],
      reviews: p._enrichedData?.reviews || []
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

  async getCategoryCounts(isOffer?: boolean): Promise<{ name: string; count: number }[]> {
    const filter: any = { activo: true };

    if (isOffer) {
      const offerSkus = await this.getOfferSkus();
      filter.codigo = { $in: offerSkus };
    }

    return this.productErpModel.aggregate([
      { $match: filter },
      { $group: { _id: "$categoria_g2", count: { $sum: 1 } } },
      { $project: { _id: 0, name: "$_id", count: 1 } }
    ]).exec();
  }

  private async getOfferSkus(): Promise<string[]> {
    const offerDocs = await this.productoModel.find({
      es_publico: true,
      'promocion_activa': { $exists: true, $ne: null }
    }).select('codigo_interno').lean().exec();

    return offerDocs.map(d => d.codigo_interno);
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

  async getCategoriesTree(): Promise<any[]> {
    const categories = await this.categoriaModel.find({ nivel: 1, activo: true })
      .populate({
        path: 'hijos',
        match: { activo: true },
        populate: {
          path: 'hijos',
          match: { activo: true }
        }
      })
      .lean()
      .exec();

    // Group by super_categoria
    const groups: { [key: string]: any[] } = {};
    const superCatOrder = [
      'Escolar & Oficina',
      'Arte & Diseño',
      'Tecnología',
      'Hogar & Decoración',
      'Regalos & Variedades'
    ];

    categories.forEach(cat => {
      const superCat = cat.super_categoria || 'Regalos & Variedades'; // Fallback
      if (!groups[superCat]) groups[superCat] = [];
      groups[superCat].push(cat);
    });

    // Transform to array respecting order
    const result = superCatOrder.map(name => ({
      name: name,
      categories: groups[name] || [] // Ensure all 5 defined groups exist even if empty
    }));

    // Add any others if we missed some (shouldn't happen with fixed enums but good for safety)
    Object.keys(groups).forEach(key => {
      if (!superCatOrder.includes(key)) {
        // Maybe append to Regalos or create a new group? 
        // Let's append to Regalos & Variedades as "Others" bucket
        const giftGroup = result.find(g => g.name === 'Regalos & Variedades');
        if (giftGroup) {
          giftGroup.categories.push(...groups[key]);
        }
      }
    });

    return result;
  }

  async getBrands(isOffer?: boolean): Promise<string[]> {
    const filter: any = { activo: true };

    if (isOffer) {
      const offerSkus = await this.getOfferSkus();
      filter.codigo = { $in: offerSkus };
    }

    return this.productErpModel.distinct('marca', filter).exec();
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
  async addReview(productId: string, review: { user_name: string; rating: number; comment: string }): Promise<any> {
    const { Types } = require('mongoose');
    let filter: any;
    let sku = productId;

    if (Types.ObjectId.isValid(productId)) {
      filter = { _id: productId };
    } else {
      filter = { codigo_interno: productId };
    }

    // Attempt to find existing enriched product
    const existing = await this.productoModel.findOne(filter).exec();

    const reviewWithDate = {
      ...review,
      date: new Date()
    };

    if (existing) {
      existing.reviews.push(reviewWithDate as any);
      await existing.save();
      return this.findOne(existing.codigo_interno);
    } else {
      // If not enriched yet, verify in ERP
      const erp = await this.productErpModel.findOne({ codigo: sku }).exec();
      if (!erp) {
        throw new NotFoundException('Producto no encontrado');
      }

      // Create new enriched doc with the review
      const newDoc = new this.productoModel({
        codigo_interno: erp.codigo,
        nombre: erp.nombre,
        reviews: [reviewWithDate]
      });
      await newDoc.save();
      return this.findOne(erp.codigo);
    }
  }
}
