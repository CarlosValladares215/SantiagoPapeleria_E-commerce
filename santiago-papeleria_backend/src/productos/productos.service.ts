import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Producto, ProductoDocument } from './schemas/producto.schema';
import { ProductFilterDto } from './dto/product-filter.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ProductosService {
  constructor(
    @InjectModel(Producto.name) private productoModel: Model<ProductoDocument>,
    private readonly httpService: HttpService
  ) { }

  // --- Método de Filtrado y Fusión (External Source of Truth) ---
  async getMergedProducts(filterDto: ProductFilterDto): Promise<any> {
    const { searchTerm, status, category, brand, minPrice, maxPrice, inStock, sortBy, page = 1, limit = 50 } = filterDto;

    // 1. Obtener datos RAW del ERP Simulator (Source of Truth)
    const erpUrl = 'http://localhost:4000/matrix/ports/acme/af58yz?CMD=STO_MTX_CAT_PRO';
    try {
      const response = await firstValueFrom(this.httpService.get(erpUrl));
      var products: any[] = response.data;
    } catch (error) {
      console.error("Error fetching ERP data", error);
      products = [];
    }

    // 2. Obtener TODOS los documentos de enriquecimiento de Mongo
    const enrichedDocs = await this.productoModel.find().lean().exec();

    // 3. Crear Hash Map para O(1) lookup
    // Clave: codigo_interno (SKU), Valor: Documento Mongo
    const enrichmentMap = new Map(enrichedDocs.map(doc => [doc.codigo_interno, doc]));

    // 4. Fusionar datos (Iteración única O(N))
    let mergedProducts = products.map(erpItem => {
      // Normalizar SKU para evitar nulos
      const sku = erpItem.COD || 'UNKNOWN';
      const enrichedData: any = enrichmentMap.get(sku);

      // ESTADO: Si existe en mongo, usar su estado, si no, 'pending'
      const enrichmentStatus = enrichedData?.enrichment_status || 'pending';
      const isVisible = enrichedData?.es_publico || false;

      // Combinar
      return {
        // Datos Base ERP (Read-only source)
        sku: sku,
        erpName: erpItem.NOM,
        brand: erpItem.MRK,
        price: erpItem.PVP,
        wholesalePrice: erpItem.PVM,
        stock: erpItem.STK,

        // Datos Enriquecidos (Mongo Overlay)
        webName: enrichedData?.nombre_web || '', // Default empty
        enrichmentStatus: enrichmentStatus,
        isVisible: isVisible,

        // Metadatos para filtrado facil
        category: erpItem.G2,

        // Mantener acceso a todo si se necesita
        _enrichedData: enrichedData
      };
    });

    // 5. Aplicar Filtros en Memoria

    // Filtro por Texto (Search)
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      mergedProducts = mergedProducts.filter(p =>
        p.sku.toLowerCase().includes(lowerTerm) ||
        p.erpName.toLowerCase().includes(lowerTerm) ||
        (p.webName && p.webName.toLowerCase().includes(lowerTerm))
      );
    }

    // Filtro por Estado de Enriquecimiento
    if (status && status !== 'all') {
      mergedProducts = mergedProducts.filter(p => p.enrichmentStatus === status);
    }

    // Filtro por Visibilidad
    if (filterDto.isVisible) {
      const isVisibleBool = filterDto.isVisible === 'true';
      mergedProducts = mergedProducts.filter(p => p.isVisible === isVisibleBool);
    }

    // Filtro por Stock
    if (inStock === 'true') {
      mergedProducts = mergedProducts.filter(p => p.stock > 0);
    }

    // Filtros de Precio
    if (minPrice) {
      mergedProducts = mergedProducts.filter(p => p.price >= parseFloat(minPrice));
    }
    if (maxPrice) {
      mergedProducts = mergedProducts.filter(p => p.price <= parseFloat(maxPrice));
    }

    // Filtros de Categoria/Marca
    if (category) {
      mergedProducts = mergedProducts.filter(p => p.category === category);
    }
    if (brand) {
      mergedProducts = mergedProducts.filter(p => p.brand === brand);
    }

    // 6. Ordenación
    if (sortBy) {
      mergedProducts.sort((a, b) => {
        if (sortBy === 'price') return a.price - b.price;
        if (sortBy === '-price') return b.price - a.price;
        if (sortBy === 'stock') return a.stock - b.stock;
        // Default name
        return a.erpName.localeCompare(b.erpName);
      });
    }

    // 7. Paginación
    const total = mergedProducts.length;
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedProducts = mergedProducts.slice(startIndex, endIndex);

    return {
      data: paginatedProducts,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    };
  }

  // --- Método Publico para Catalogo (Usa Fusión pero retorna estructura compatible) ---
  async findAll(filterDto: ProductFilterDto): Promise<any[]> {
    // 1. Obtener fusionados (Forzamos stock > 0 si se requiere, etc)
    const mergedResult = await this.getMergedProducts({
      ...filterDto,
      // inStock: 'true', // Opcional, dependiendo de logica de negocio
      status: 'all',
      limit: '1000' // Traer suficientes para catalogo
    });

    const mergedProducts = mergedResult.data;

    // 2. Filtrar solo visibles
    const visibleProducts = mergedProducts.filter(p => p.isVisible);

    // 3. Mapear a estructura Producto (para que el DTO existente funcione)
    return visibleProducts.map(p => ({
      _id: p._enrichedData?._id || null,
      codigo_interno: p.sku,
      nombre: p.webName || p.erpName, // Preferir nombre web
      slug: p._enrichedData?.slug || p.sku,
      activo: true,
      clasificacion: {
        marca: p.brand,
        grupo: p.category,
        linea: ''
      },
      precios: {
        pvp: p.price,
        pvm: p.price,
        incluye_iva: p._enrichedData?.precios?.incluye_iva || false
      },
      stock: {
        total_disponible: p.stock
      },
      multimedia: p._enrichedData?.multimedia || { principal: '', galeria: [] },
      priceTiers: p._enrichedData?.priceTiers || [], // Importante para Tiered Pricing

      // Flags
      es_publico: true,
      enriquecido: p.enrichmentStatus === 'complete'
    }));
  }

  // 2. Método para buscar un producto por ID o Código Interno
  async findOne(term: string): Promise<Producto | null> {
    const { Types } = require('mongoose');

    // Si es un ObjectId válido, busca por _id
    if (Types.ObjectId.isValid(term)) {
      const product = await this.productoModel.findById(term).lean().exec();
      if (product) return product;
    }

    // Si no es ObjectId o no se encontró, busca por codigo_interno
    return this.productoModel.findOne({ codigo_interno: term }).lean().exec();
  }

  // --- Método para CategoryCount (Estadísticas) ---
  async getCategoryCounts(): Promise<{ name: string; count: number }[]> {
    // Nota: Esto solo cuenta en Mongo. Si queremos contar ERP, necesitariamos iterar ERP.
    // Asumimos que para filtros iniciales Mongo esta bien, o idealmente deberiamos hacer count sobre mergedProducts.
    // Por rendimiento, mantenemos Mongo count por ahora.
    return this.productoModel
      .aggregate([
        {
          $group: {
            _id: '$clasificacion.grupo',
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            name: '$_id',
            count: 1,
          },
        },
      ])
      .exec();
  }

  // --- Métodos de Enriquecimiento (ADMIN) ---

  async searchAdmin(term: string): Promise<Producto[]> {
    // Deprecado por getMergedProducts, pero mantenido por compatibilidad si es necesario
    const regex = new RegExp(term, 'i');
    return this.productoModel.find({ nombre: regex }).lean().exec();
  }

  async enrichProduct(id: string, updateData: any): Promise<Producto> {
    const { Types } = require('mongoose');
    let filter = {};

    if (Types.ObjectId.isValid(id)) {
      filter = { _id: id };
    } else {
      filter = { codigo_interno: id };
    }

    // Asegurarse de que enriched sea true si se está actualizando
    updateData.enriquecido = true;
    updateData.enrichment_status = 'complete'; // Default to complete on manual enrich save

    // Agregar entrada al historial de cambios
    const auditEntry = {
      date: new Date(),
      admin: 'admin@santiagopapeleria.com',
      action: 'Actualización de producto'
    };

    // Upsert logic: Si no existe, crea. 
    // Mongoose findOneAndUpdate con upsert: true maneja esto? 
    // Necesitamos asegurarnos de que codigo_interno este en updateData si es nuevo.
    if (!updateData.codigo_interno && typeof id === 'string' && !Types.ObjectId.isValid(id)) {
      updateData.codigo_interno = id;
    }

    return this.productoModel.findOneAndUpdate(
      filter,
      {
        $set: updateData,
        $push: { 'auditoria.historial_cambios': auditEntry }
      },
      { new: true, upsert: true } // UPSERT TRUE IMPORTANTE
    ).lean().exec() as unknown as Producto;
  }
}
