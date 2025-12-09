// src/productos/productos.service.ts (ACTUALIZADO)

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Producto, ProductoDocument } from './schemas/producto.schema';
import { ProductFilterDto } from './dto/product-filter.dto'; // <-- Importar el DTO

@Injectable()
export class ProductosService {
  constructor(
    @InjectModel(Producto.name) private productoModel: Model<ProductoDocument>,
  ) {}

  // --- Método de Filtrado y Ordenación ---
  async findAll(filterDto: ProductFilterDto): Promise<Producto[]> {
    const { searchTerm, category, brand, minPrice, maxPrice, inStock, sortBy } =
      filterDto;

    // 1. Crear el objeto de filtro (query) de MongoDB
    const query: any = {};

    // Filtrar por activos (casi siempre necesario en un catálogo)
    query.activo = true;

    // Búsqueda por término (searchTerm)
    if (searchTerm) {
      // Búsqueda case-insensitive en nombre y palabras clave
      const regex = new RegExp(searchTerm, 'i');
      query.$or = [{ nombre: regex }, { palabras_clave: regex }];
    }

    // Filtrar por Categoría (grupo) y Marca
    if (category) {
      query['clasificacion.grupo'] = category;
    }
    if (brand) {
      query['clasificacion.marca'] = brand;
    }

    // Filtrar por Rango de Precio (priceRange)
    if (minPrice || maxPrice) {
      query['precios.pvp'] = {};
      if (minPrice) {
        query['precios.pvp'].$gte = parseFloat(minPrice);
      }
      if (maxPrice) {
        query['precios.pvp'].$lte = parseFloat(maxPrice);
      }
    }

    // Filtrar por Stock (inStock)
    if (inStock === 'true') {
      query['stock.total_disponible'] = { $gt: 0 };
    }

    // 2. Definir opciones de ordenación (sort)
    let sortOptions: any = {};
    if (sortBy) {
      // Mapeo de campos de Angular a campos de MongoDB
      const [field, direction] = sortBy.startsWith('-')
        ? [sortBy.substring(1), -1]
        : [sortBy, 1];

      if (field === 'price') {
        sortOptions['precios.pvp'] = direction;
      } else if (field === 'stock') {
        sortOptions['stock.total_disponible'] = direction;
      } else {
        sortOptions[field] = direction; // Para 'name'
      }
    } else {
      // Ordenación por defecto
      sortOptions = { nombre: 1 };
    }

    // 3. Ejecutar la consulta
    // USAMOS .lean() PARA RETORNAR POJOS Y QUE CLASS-TRANSFORMER FUNCIONE CORRECTAMENTE
    return this.productoModel.find(query).sort(sortOptions).lean().exec();
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
    return this.productoModel
      .aggregate([
        // 1. Agrupar por el campo de la categoría
        {
          $group: {
            _id: '$clasificacion.grupo',
            count: { $sum: 1 }, // Contar documentos en cada grupo
          },
        },
        // 2. Proyectar el resultado para que coincida con CategoryCount {name, count}
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
}
