// src/promociones/promociones.service.ts

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Promociones, PromocionDocument } from './schemas/promocion.schema';

@Injectable()
export class PromocionesService {
  constructor(
    @InjectModel(Promociones.name)
    private promocionModel: Model<PromocionDocument>,
  ) {}

  // Consulta para obtener todas las promociones activas y vigentes
  async findActiveAndValid(): Promise<PromocionDocument[]> {
    const today = new Date();

    // Busca promociones que estén ACTIVA, y cuya fecha de inicio sea menor
    // o igual a hoy, y cuya fecha de fin sea mayor o igual a hoy.
    return this.promocionModel
      .find({
        estado: 'ACTIVA',
        'fechas_vigencia.fecha_inicio': { $lte: today },
        'fechas_vigencia.fecha_fin': { $gte: today },
      })
      .sort({ prioridad: 1 }) // Ordena por prioridad para facilitar la aplicación
      .exec();
  }

  // Consulta para obtener una promoción por su código
  async findByCode(codigo: string): Promise<PromocionDocument | null> {
    const today = new Date();

    return this.promocionModel
      .findOne({
        codigo: codigo,
        estado: 'ACTIVA',
        'fechas_vigencia.fecha_inicio': { $lte: today },
        'fechas_vigencia.fecha_fin': { $gte: today },
      })
      .exec();
  }
}
