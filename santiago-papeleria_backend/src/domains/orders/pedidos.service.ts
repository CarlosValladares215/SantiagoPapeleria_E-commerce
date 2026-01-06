// src/pedidos/pedidos.service.ts

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Pedido, PedidoDocument } from './schemas/pedido.schema';
import { CreatePedidoDto } from './dto/create-pedido.dto'; // Tendrás que crear este DTO
import { ContadoresService } from '../../core/counters/contadores.service';
import { UsuariosService } from '../users/usuarios.service';
import { EmailService } from '../users/services/email.service';

import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PedidosService {
  constructor(
    @InjectModel(Pedido.name) private pedidoModel: Model<PedidoDocument>,
    private contadoresService: ContadoresService,
    private usuariosService: UsuariosService,
    private emailService: EmailService,
    private notificationsService: NotificationsService, // Inject it
  ) { }

  // Crea un nuevo pedido (usado en el POST)
  async create(createPedidoDto: CreatePedidoDto): Promise<PedidoDocument> {
    // 1. Obtener el siguiente número de secuencia de forma segura
    const siguienteNumero =
      await this.contadoresService.getNextSequenceValue('pedido_web');

    // 1.1 Generar guia_tracking automática (Ej: GUIA-20240104-1015)
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const guiaTracking = `GUIA-${dateStr}-${siguienteNumero}`;

    // 2. Crear el documento del pedido
    const createdPedido = new this.pedidoModel({
      ...createPedidoDto,
      usuario_id: new Types.ObjectId(createPedidoDto.usuario_id), // Asegurar ObjectId
      numero_pedido_web: siguienteNumero, // Asignar el número único
      datos_envio: {
        ...createPedidoDto.datos_envio,
        guia_tracking: guiaTracking
      },
      fecha_compra: new Date(),
    });

    // 3. Guardar en la base de datos
    const savedPedido = await createdPedido.save();

    // 4. Enviar correo de confirmación (Asíncrono)
    this.sendConfirmationEmail(createPedidoDto.usuario_id, savedPedido);

    return savedPedido;
  }

  // Método auxiliar para manejar el envío de correo sin bloquear
  private async sendConfirmationEmail(userId: string, order: PedidoDocument) {
    try {
      const user = await this.usuariosService.findById(userId);
      if (user && user.email) {
        // Pasamos el nombre del usuario al servicio de email si es necesario modificar sendOrderConfirmation
        // Por ahora el servicio usa 'Cliente' como default o lo que le pasemos en el futuro.
        // Para mejorar, podríamos modificar EmailService para aceptar userName, pero por ahora seguimos el plan.
        await this.emailService.sendOrderConfirmation(user.email, order);
      }
    } catch (error) {
      console.error('Error enviando correo de confirmación de pedido:', error);
    }
  }

  // Busca todos los pedidos y popula los datos del usuario
  async findAll(): Promise<PedidoDocument[]> {
    return this.pedidoModel.find().populate('usuario_id').sort({ fecha_compra: -1 }).exec();
  }

  // Busca un pedido por ID o por Numero de Pedido Web
  async findOne(term: string): Promise<PedidoDocument | null> {
    // Si es un ObjectId válido, busca por _id
    if (Types.ObjectId.isValid(term)) {
      const order = await this.pedidoModel.findById(term).populate('usuario_id').exec();
      if (order) return order;
    }

    // Si es un número, busca por numero_pedido_web
    const orderNumber = Number(term);
    if (!isNaN(orderNumber)) {
      return this.pedidoModel.findOne({ numero_pedido_web: orderNumber }).populate('usuario_id').exec();
    }

    return null;
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
    console.log(`🔄 [Backend] updateStatus llamado para Pedido ID: ${id}, Nuevo Estado: ${status}`);

    const pedido = await this.pedidoModel.findById(id);
    if (!pedido) {
      console.error(`❌ [Backend] Pedido no encontrado: ${id}`);
      throw new Error('Pedido no encontrado');
    }

    const oldStatus = pedido.estado_pedido;
    console.log(`ℹ️ [Backend] Estado anterior: ${oldStatus}`);

    pedido.estado_pedido = status;
    const saveResult = await pedido.save();

    // Create Notification if status changed
    if (oldStatus !== status) {
      console.log(`🔔 [Backend] Cambio de estado detectado. Creando notificación...`);
      let message = `El estado de tu pedido #${pedido.numero_pedido_web} ha cambiado a: ${status.toUpperCase()}`;

      try {
        const noti = await this.notificationsService.create({
          usuario_id: pedido.usuario_id.toString(),
          titulo: 'Actualización de Pedido',
          mensaje: message,
          tipo: 'order_status',
          metadata: { orderId: id, status: status }
        });
        console.log(`✅ [Backend] Notificación creada para Usuario: ${pedido.usuario_id}`);

        // Send Email if status is ENTREGADO
        if (status.toUpperCase() === 'ENTREGADO') {
          const user = await this.usuariosService.findById(pedido.usuario_id.toString());
          if (user && user.email) {
            // Assuming sendOrderConfirmation logic is generic enough or create a new one
            // For now, logging intention. Ideally, we need specific email template.
            console.log(`📧 [Backend] Mock Enviando email de entrega a ${user.email}`);
            // await this.emailService.sendOrderDelivered(user.email, pedido);
          }
        }

      } catch (error) {
        console.error(`❌ [Backend] Error creando notificación/email:`, error);
      }
    } else {
      console.log(`⚠️ [Backend] El estado no ha cambiado, no se crea notificación.`);
    }

    return saveResult;
  }

  // Request cancellation by User
  async requestCancellation(id: string, userId: string): Promise<PedidoDocument> {
    const pedido = await this.findOne(id);
    if (!pedido) {
      throw new Error('Pedido no encontrado');
    }

    // 1. Verify Ownership
    // Check both objectId and string for safety
    if (pedido.usuario_id.toString() !== userId) {
      throw new Error('No autorizado para cancelar este pedido');
    }

    // 2. Verify Status
    const currentStatus = pedido.estado_pedido.toUpperCase().trim();
    if (currentStatus !== 'PENDIENTE' && currentStatus !== 'PENDIENTE_PAGO') {
      throw new Error(`No es posible cancelar el pedido en estado: ${pedido.estado_pedido}`);
    }

    // 3. Cancel
    pedido.estado_pedido = 'Cancelado';
    const saved = await pedido.save();

    console.log(`✅ [Backend] Pedido ${pedido.numero_pedido_web} cancelado por el usuario ${userId}`);
    return saved;
  }
}
