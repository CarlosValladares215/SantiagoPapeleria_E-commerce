// src/pedidos/pedidos.service.ts

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
      usuario_id: new Types.ObjectId(createPedidoDto.usuario_id), // Asegurar ObjectId
      numero_pedido_web: siguienteNumero, // Asignar el número único
      fecha_compra: new Date(),
    });

    // 3. Guardar en la base de datos
    return createdPedido.save();
  }

  // Busca todos los pedidos y popula los datos del usuario
  async findAll(): Promise<PedidoDocument[]> {
    return this.pedidoModel.find().populate('usuario_id').sort({ fecha_compra: -1 }).exec();
  }

  // Busca un pedido por ID
  async findOne(id: string): Promise<PedidoDocument | null> {
    return this.pedidoModel.findById(id).exec();
  }

  // Busca pedidos por ID de usuario
  async findByUser(userId: string): Promise<PedidoDocument[]> {
    console.log('🔍 [Backend] Buscar pedidos para UserID:', userId);

    // Busca por ObjectId (nuevos) O por String (antiguos) para asegurar compatibilidad
    const pedidos = await this.pedidoModel.find({
      $or: [
        { usuario_id: new Types.ObjectId(userId) },
        { usuario_id: userId }
      ]
    }).sort({ fecha_compra: -1 }).exec();

    console.log(`✅ [Backend] Pedidos encontrados: ${pedidos.length}`);
    return pedidos;
  }
  // Actualizar estado del pedido (Sin historial)
  async updateStatus(id: string, status: string): Promise<PedidoDocument> {
    const pedido = await this.pedidoModel.findById(id);
    if (!pedido) {
      throw new Error('Pedido no encontrado');
    }

    pedido.estado_pedido = status;

    return pedido.save();
  }
}
