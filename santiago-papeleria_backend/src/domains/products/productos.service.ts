import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Producto, ProductoDocument } from './schemas/producto.schema';
import { ProductERP, ProductERPDocument } from './schemas/product-erp.schema'; // Import ERP Schema
import { ProductFilterDto } from './dto/product-filter.dto';

// Definition of the Resolved Product (merged in memory)
// This structure must match what the FrontEnd expects
export interface ResolvedProduct {
  sku: string;
  erpName: string;
  webName: string; // From enriched
  brand: string;
  category: string;

  price: number;
  wholesalePrice: number;

  stock: number;

  isVisible: boolean;
  enrichmentStatus: string; // 'pending' | 'draft' | 'complete'

  description: string;
  images: string[];

  // Advanced fields
  weight_kg: number;
  dimensions: any;
  allows_custom_message: boolean;
  attributes: any[];

  // Full raw access (optional but useful for mappers)
  _erpData?: any;
  _enrichedData?: any;
}

@Injectable()
export class ProductosService {
  constructor(
    @InjectModel(Producto.name) private productoModel: Model<ProductoDocument>,    // ENRICHED (products_enriched)
    @InjectModel(ProductERP.name) private productErpModel: Model<ProductERPDocument> // ERP (products_erp)
  ) { }

  // --- CORE: HELPER DE FUSIÓN (PURE LOGIC) ---
  private mergeProducts(erp: any, enriched: any): ResolvedProduct {
    // 1. Base: ERP Data (Source of Truth)
    // If enriched doesn't exist, we use defaults.

    // Status Logic:
    // If enriched doc exists, use its status/visibility.
    // If NOT exists, it's 'pending' and NOT visible.
    const enrichmentStatus = enriched?.enrichment_status || 'pending';
    const isVisible = enriched?.es_publico || false;

    // Name Logic:
    // Web Name overrides ERP Name if present
    const finalName = enriched?.nombre_web || erp.nombre;

    return {
      sku: erp.codigo,
      erpName: erp.nombre,
      webName: enriched?.nombre_web || '', // Explicit enriched name
      brand: erp.marca || 'Genérico',
      category: erp.categoria_g2 || 'General',

      price: erp.precio_pvp || 0,
      wholesalePrice: erp.precio_pvm || 0,

      // Stock is ALWAYS from ERP
      stock: erp.stock || 0,

      isVisible: isVisible,
      enrichmentStatus: enrichmentStatus,

      // Enriched Content
      description: enriched?.descripcion_extendida || erp.nombre, // Fallback to name
      // Images: Priority to enriched.multimedia, fallback to nothing (or placeholder)
      images: enriched?.multimedia?.principal
        ? [enriched.multimedia.principal, ...(enriched.multimedia.galeria || [])]
        : [],

      // Config
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

    // A. Construir Query para ERP (Mongo)
    // El ERP es la fuente principal. Si no está en ERP, no existe.
    const erpQuery: any = { activo: true }; // Only active ERP products

    if (searchTerm) {
      // Basic text search on ERP fields first
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
    if (category) erpQuery.categoria_g2 = category; // Mapping G2 as main category for now

    // Price Filters (ERP Source)
    if (minPrice || maxPrice) {
      erpQuery.precio_pvp = {};
      if (minPrice) erpQuery.precio_pvp.$gte = Number(minPrice);
      if (maxPrice) erpQuery.precio_pvp.$lte = Number(maxPrice);
    }

    // Stock Filter (ERP Source)
    if (inStock === 'true') {
      erpQuery.stock = { $gt: 0 };
    }

    // B. Ejecutar Query ERP con Paginación
    const skip = (Number(page) - 1) * Number(limit);

    // Sort logic mapping
    let sortOptions: any = {};
    if (sortBy === 'price') sortOptions.precio_pvp = 1;
    else if (sortBy === '-price') sortOptions.precio_pvp = -1;
    else if (sortBy === 'stock') sortOptions.stock = -1;
    else sortOptions.nombre = 1; // Default

    const [erpProducts, total] = await Promise.all([
      this.productErpModel.find(erpQuery)
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean()
        .exec(),
      this.productErpModel.countDocuments(erpQuery)
    ]);

    // C. Obtener Datos Enriquecidos (Solo para los SKUs encontrados)
    const skus = erpProducts.map(p => p.codigo);
    const enrichedDocs = await this.productoModel.find({
      codigo_interno: { $in: skus }
    }).lean().exec();

    const enrichmentMap = new Map(enrichedDocs.map(doc => [doc.codigo_interno, doc]));
    console.log('--- DEBUG ENRICHMENT MAP ---');
    console.log('Enriched Docs Found:', enrichedDocs.length);
    console.log('Sample Keys:', Array.from(enrichmentMap.keys()));
    console.log('----------------------------');

    // D. Fusionar en Memoria
    let mergedProducts = erpProducts.map(erpItem => {
      const enrichedItem = enrichmentMap.get(erpItem.codigo);
      // console.log(`Merging ${erpItem.codigo} with`, enrichedItem ? 'Enriched Data' : 'NULL');
      return this.mergeProducts(erpItem, enrichedItem);
    });

    // E. Filtros Post-Fusión (Solo necesarios para campos Enriched)
    // Si filtramos por "Status" o "Visibilidad", esto complica la paginación porque son campos de Mongo, no de ERP.
    // ESTRATEGIA: Por ahora, aplicamos filtro post-fetch. *Esto puede causar páginas con menos ítems de lo esperado*,
    // pero garantiza corrección sin duplicar datos en DB.

    if (status && status !== 'all') {
      mergedProducts = mergedProducts.filter(p => p.enrichmentStatus === status);
    }

    if (filterDto.isVisible) {
      const isVisibleBool = filterDto.isVisible === 'true';
      mergedProducts = mergedProducts.filter(p => p.isVisible === isVisibleBool);
    }

    // Si también buscamos por "Nombre Web" (que está en Enriched), deberíamos filtrar aquí también si el search term no hizo match en ERP.
    // (Omitido por simplicidad, asumimos búsqueda principal por ERP Name/SKU)

    return {
      data: mergedProducts,
      meta: {
        total, // Total de ERP matches (antes de filtros de estado/visibilidad post-fetch)
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    };
  }

  // --- 2. Public Catalog Access ---
  async findAll(filterDto: ProductFilterDto): Promise<any[]> {
    // Reutilizamos la lógica de merged, pero forzamos ciertos flags
    // Nota: Para catálogo público, usualmente queremos ver SOLO productos visibles.
    // El método getMergedProducts pagina sobre ERP. Si filtramos vibilidad después, la paginación se rompe.
    // SOLUCIÓN CORRECTA: 
    // 1. Buscar SKUs "visibles" en Mongo (Enriched) primero.
    // 2. Usar esos SKUs para filtrar ERP.
    // Esto invierte la dependencia para el caso "Publico".

    // Paso 1: Obtener SKUs habilitados desde Enriched
    const visibleEnrichedDocs = await this.productoModel.find({ es_publico: true }).select('codigo_interno').lean().exec();
    const visibleSkus = visibleEnrichedDocs.map(d => d.codigo_interno);

    if (visibleSkus.length === 0) return []; // Nada público

    // Paso 2: Consultar ERP filtrando por esos SKUs + Stock > 0 (opcional)
    const erpQuery: any = {
      codigo: { $in: visibleSkus },
      activo: true,
      // stock: { $gt: 0 } // Descomentar si solo queremos productos con stock
    };

    if (filterDto.excludeId) {
      erpQuery.codigo = { $ne: filterDto.excludeId };
    }

    // Aplicar filtros de categoria/marca al ERP
    if (filterDto.category) erpQuery.categoria_g2 = filterDto.category;
    if (filterDto.brand) erpQuery.marca = filterDto.brand;

    const limit = filterDto.limit ? Number(filterDto.limit) : 1000;
    const erpProducts = await this.productErpModel.find(erpQuery).limit(limit).lean().exec();

    // Paso 3: Traer los documentos completos enriched (ahora sí con todos los campos)
    // Optimización: Ya tenemos los SKUs visibles, pero necesitamos el doc completo para fusionar (fotos, etc)
    const finalSkus = erpProducts.map(p => p.codigo);
    const enrichedFullDocs = await this.productoModel.find({ codigo_interno: { $in: finalSkus } }).lean().exec();
    const enrichmentMap = new Map(enrichedFullDocs.map(doc => [doc.codigo_interno, doc]));

    // Paso 4: Fusionar
    const mergedList = erpProducts.map(erpItem => {
      const enrichedItem = enrichmentMap.get(erpItem.codigo);
      return this.mergeProducts(erpItem, enrichedItem);
    });

    // Paso 5: Mapear a DTO Frontend (Legacy support)
    return mergedList.map(p => ({
      _id: p._enrichedData?._id || null, // ID técnico
      codigo_interno: p.sku,
      nombre: p.webName || p.erpName, // Preferencia a nombre web
      slug: p._enrichedData?.slug || p.sku, // Slug o SKU
      activo: true,
      clasificacion: {
        marca: p.brand,
        grupo: p.category,
        linea: ''
      },
      precios: {
        pvp: p.price,
        pvm: p.wholesalePrice,
        incluye_iva: true // Asumo True por defecto según esquema ERP
      },
      stock: {
        total_disponible: p.stock
      },
      multimedia: {
        principal: p.images[0] || '',
        galeria: p.images.slice(1)
      },
      // Enriched specific fields
      // TODO: Update Frontend DTO to accept these if needed
      es_publico: true,
      enriquecido: true
    }));
  }

  // --- 3. Find One (Detail Page & Admin Edit) ---
  async findOne(term: string): Promise<any> {
    const { Types } = require('mongoose');

    // Estrategia: "term" puede ser SKU o _id (Mongo).
    // Necesitamos el SKU para query ERP.

    let sku = term;
    let enrichedDoc: any = null;

    // A. Intentar buscar en Enriched primero para resolver SKU si pasaron ID
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

    // B. Buscar en ERP (Obligatorio)
    const erpDoc = await this.productErpModel.findOne({ codigo: sku }).lean().exec();

    if (!erpDoc) {
      // Edge case: Existe config en Mongo pero el producto desapareció del ERP?
      // Retornamos null porque "No existe en ERP" = "No existe producto vendible".
      return null;
    }

    // C. Fusionar
    // Si no teniamos enrichedDoc aún (ej: buscamos por SKU directo y no estaba en mongo), buscamos ahora?
    // Ya lo buscamos en el paso A (busqueda por codigo_interno). 

    // Mapear al formato esperado (Resolve and Map)
    // Para simplificar, retornamos el objeto merged "plano" que contiene _enrichedData y _erpData
    // El controller se encargará de serializar o el frontend de consumir.
    // PERO: El controller existente espera cierta estructura `ProductResponseDto`. 
    // Vamos a retornar una estructura hibrida compatible.

    const resolve = this.mergeProducts(erpDoc, enrichedDoc);

    // Compatibilidad DTO existente
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
      precios: { pvp: resolve.price, pvm: resolve.wholesalePrice, incluye_iva: true }
    };
  }

  // --- 4. Enrich Product (Write Config) ---
  async enrichProduct(id: string, updateData: any): Promise<any> {
    const { Types } = require('mongoose');
    let filter = {};

    // ID puede ser ObjectId o SKU
    if (Types.ObjectId.isValid(id)) {
      filter = { _id: id };
    } else {
      filter = { codigo_interno: id };
    }

    // Forzar status y flag
    updateData.enriquecido = true;
    updateData.enrichment_status = 'complete';

    // Audit
    const auditEntry = {
      date: new Date(),
      admin: 'admin@santiagopapeleria.com',
      action: 'Actualización de producto'
    };

    // Asegurar codigo_interno si es un upsert por SKU
    if (!updateData.codigo_interno && typeof id === 'string' && !Types.ObjectId.isValid(id)) {
      updateData.codigo_interno = id;
    }

    console.log('--- DEBUG ENRICH PRODUCT (WRITE) ---');
    console.log('ID/Filter:', filter);
    console.log('Update Data:', JSON.stringify(updateData));

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

    // Retornamos la versión fusionada para que el Admin vea el resultado final inmediato
    return this.findOne(updatedDoc.codigo_interno);
  }

  async getCategoryCounts(): Promise<{ name: string; count: number }[]> {
    // Contamos sobre ERP porque es el inventario real
    return this.productErpModel.aggregate([
      { $match: { activo: true } },
      { $group: { _id: "$categoria_g2", count: { $sum: 1 } } },
      { $project: { _id: 0, name: "$_id", count: 1 } }
    ]).exec();
  }
}
