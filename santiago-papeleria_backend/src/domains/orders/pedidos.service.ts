// src/pedidos/pedidos.service.ts

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Pedido, PedidoDocument } from './schemas/pedido.schema';
import { CreatePedidoDto } from './dto/create-pedido.dto'; // Tendrás que crear este DTO
import { ContadoresService } from '../../core/counters/contadores.service';

@Injectable()
export class PedidosService {
  constructor(
    @InjectModel(Pedido.name) private pedidoModel: Model<PedidoDocument>,
    // Inyectar el servicio de contadores
    private contadoresService: ContadoresService,
  ) { }

  // Crea un nuevo pedido (usado en el POST)
  async create(createPedidoDto: CreatePedidoDto): Promise<PedidoDocument> {
    // 1. Obtener el siguiente número de secuencia de forma segura
    const siguienteNumero =
      await this.contadoresService.getNextSequenceValue('pedido_web');

    // 2. Crear el documento del pedido
    const createdPedido = new this.pedidoModel({
      ...createPedidoDto,
      numero_pedido_web: siguienteNumero, // Asignar el número único
      fecha_compra: new Date(),
    });

    // 3. Guardar en la base de datos
    return createdPedido.save();
  }

  // Busca todos los pedidos
  async findAll(): Promise<PedidoDocument[]> {
    return this.pedidoModel.find().exec();
  }

  // Busca un pedido por ID
  async findOne(id: string): Promise<PedidoDocument | null> {
    return this.pedidoModel.findById(id).exec();
  }
}
