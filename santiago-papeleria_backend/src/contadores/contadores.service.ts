// src/contadores/contadores.service.ts

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Contadores, ContadorDocument } from './schemas/contador.schema';

@Injectable()
export class ContadoresService {
  constructor(
    @InjectModel(Contadores.name)
    private contadorModel: Model<ContadorDocument>,
  ) {}

  /**
   * Obtiene e incrementa el valor de una secuencia de contador de forma atómica.
   * Si el contador no existe, lo inicializa y retorna el valor inicial.
   * @param nombreContador El nombre del contador a usar (ej: 'pedido_web').
   * @returns El siguiente número de secuencia.
   */
  async getNextSequenceValue(nombreContador: string): Promise<number> {
    const sequenceDocument = await this.contadorModel
      .findOneAndUpdate(
        { _id: nombreContador }, // Filtro: busca el documento por su nombre (_id)
        { $inc: { secuencia_actual: 1 } }, // Operación: incrementa 'secuencia_actual' en 1
        {
          new: true, // Retorna el documento después de la actualización (el valor ya incrementado)
          upsert: true, // Si no lo encuentra, lo crea e incrementa (inicializa a 1)
        },
      )
      .exec();

    return sequenceDocument.secuencia_actual;
  }
}
