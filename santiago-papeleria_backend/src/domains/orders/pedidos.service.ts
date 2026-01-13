// src/pedidos/pedidos.service.ts

import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Pedido, PedidoDocument } from './schemas/pedido.schema';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { ContadoresService } from '../../core/counters/contadores.service';
import { UsuariosService } from '../users/usuarios.service';
import { EmailService } from '../users/services/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProductosService } from '../products/productos.service';
import { ErpSyncService } from '../erp/sync/erp-sync.service';

@Injectable()
export class PedidosService {
  private readonly logger = new Logger(PedidosService.name);

  constructor(
    @InjectModel(Pedido.name) private pedidoModel: Model<PedidoDocument>,
    private contadoresService: ContadoresService,
    private usuariosService: UsuariosService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => ErpSyncService))
    private erpSyncService: ErpSyncService,
    private productosService: ProductosService
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

    // 3.1 Descontar Stock Localmente (RN-STOCK-001)
    // Esto asegura que el stock baje inmediatamente antes de la sync con ERP
    for (const item of savedPedido.items) {
      if (item.codigo_dobranet) {
        await this.productosService.updateStock(
          item.codigo_dobranet,
          -item.cantidad,
          `PEDIDO-${savedPedido.numero_pedido_web}`,
          'VENTA',
          savedPedido.usuario_id.toString()
        );
      }
    }

    // 4. Enviar correo de confirmación (Asíncrono)
    this.sendConfirmationEmail(createPedidoDto.usuario_id, savedPedido);

    // 5. Enviar pedido al ERP DobraNet (Asíncrono con reintentos)
    this.sendOrderToErpWithRetry(savedPedido);

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
      this.logger.error('Error enviando correo de confirmación de pedido:', error);
    }
  }

  /**
   * Envía el pedido al ERP DobraNet con reintentos (max 3)
   * HU79: Integración automática de pedidos con sistema externo
   */
  private async sendOrderToErpWithRetry(pedido: PedidoDocument, maxRetries = 3): Promise<void> {
    const erpPayload = {
      WEB_ID: pedido.numero_pedido_web,
      ITEMS: pedido.items.map(item => ({
        COD: item.codigo_dobranet,
        UND: item.cantidad,
        PRE: item.precio_unitario_aplicado,
      })),
      TOTAL: pedido.resumen_financiero.total_pagado,
      CLI: pedido.usuario_id.toString(),
    };

    let attempts = 0;
    let success = false;
    let lastError = '';
    let erpOrderNumber = '';

    while (attempts < maxRetries && !success) {
      attempts++;
      try {
        this.logger.log(`📤 Intentando enviar pedido #${pedido.numero_pedido_web} al ERP (intento ${attempts}/${maxRetries})...`);

        const erpResponse = await this.erpSyncService.sendOrderToERP(erpPayload);

        if (erpResponse.STA === 'OK') {
          success = true;
          erpOrderNumber = erpResponse['ORDVEN-NUM'] || '';
          this.logger.log(`✅ Pedido #${pedido.numero_pedido_web} sincronizado con ERP: ${erpOrderNumber}`);
        } else {
          lastError = erpResponse.MSG || 'Error desconocido del ERP';
          this.logger.warn(`⚠️ ERP rechazó pedido: ${lastError}`);
        }
      } catch (error) {
        lastError = error.message || 'Error de conexión';
        this.logger.error(`❌ Error enviando pedido al ERP (intento ${attempts}): ${lastError}`);

        // Esperar antes de reintentar (backoff exponencial)
        if (attempts < maxRetries) {
          const waitTime = Math.pow(2, attempts) * 1000; // 2s, 4s, 8s
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // Actualizar el estado de integración en el pedido
    await this.pedidoModel.updateOne(
      { _id: pedido._id },
      {
        $set: {
          'integracion_dobranet.sincronizado': success,
          'integracion_dobranet.intentos': attempts,
          'integracion_dobranet.fecha_sincronizacion': success ? new Date() : null,
          'integracion_dobranet.orden_erp': erpOrderNumber,
          'integracion_dobranet.ultimo_error': success ? null : lastError,
        }
      }
    );

    if (!success) {
      this.logger.error(`❌ Pedido #${pedido.numero_pedido_web} NO pudo sincronizarse con ERP después de ${maxRetries} intentos`);
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

    // Set fecha_entrega if status is ENTREGADO
    if (status.toUpperCase() === 'ENTREGADO') {
      pedido.fecha_entrega = new Date();
    }

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

  // Solicitar devolución de un pedido
  async requestReturn(id: string, userId: string, returnData: any): Promise<PedidoDocument> {
    const pedido = await this.findOne(id);
    if (!pedido) {
      throw new Error('Pedido no encontrado');
    }

    // 1. Verify Ownership
    if (pedido.usuario_id.toString() !== userId && (pedido.usuario_id as any)._id?.toString() !== userId) {
      throw new Error('No autorizado para solicitar devolución de este pedido');
    }

    // 2. Verify Status is ENTREGADO
    if (pedido.estado_pedido.toUpperCase() !== 'ENTREGADO') {
      throw new Error('Solo se pueden devolver pedidos entregados');
    }

    // 3. Verify Date Eligibility (5 days)
    const deliveryDate = pedido.fecha_entrega || pedido.fecha_compra; // Fallback to purchase date if delivery date missing
    const diffTime = Math.abs(new Date().getTime() - new Date(deliveryDate).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 5) {
      throw new Error(`El plazo de devolución (5 días) ha expirado. Han pasado ${diffDays} días.`);
    }

    // 4. Update Status and Save Data
    pedido.estado_pedido = 'PENDIENTE_REVISION';
    pedido.datos_devolucion = {
      motivo: returnData.motivo,
      fecha_solicitud: new Date(),
      items: returnData.items,
      estado: 'PENDIENTE_REVISION',
      observaciones_bodega: ''
    };

    const saved = await pedido.save();

    // Notify Admin (Log for now)
    this.logger.log(`↩️ Solicitud de devolución creada para pedido #${pedido.numero_pedido_web}`);

    return saved;
  }



  // Validar devolución (Bodega)
  async validateReturn(id: string, decision: 'APPROVE' | 'REJECT', observations: string): Promise<PedidoDocument> {
    const pedido = await this.findOne(id);
    if (!pedido) {
      throw new Error('Pedido no encontrado');
    }

    if (pedido.estado_pedido !== 'PENDIENTE_REVISION') {
      throw new Error('El pedido no está en revisión de devolución');
    }

    // Log status change attempt
    this.logger.log(`🔍 [ValidateReturn] Order ${id} - Decision: ${decision}`);
    this.logger.log(`🔍 [ValidateReturn] Current Status: ${pedido.estado_pedido}`);

    const newStatus = decision === 'APPROVE' ? 'DEVOLUCION_APROBADA' : 'DEVOLUCION_RECHAZADA';
    const returnStatus = decision === 'APPROVE' ? 'APROBADA' : 'RECHAZADA';

    pedido.estado_pedido = newStatus;
    this.logger.log(`🔍 [ValidateReturn] New Status Set: ${newStatus}`);

    // Update datos_devolucion (ensure it exists)
    if (!pedido.datos_devolucion) {
      // Fallback if data missing, though it should exist
      pedido.datos_devolucion = {
        motivo: 'N/A',
        fecha_solicitud: new Date(),
        items: [],
        estado: returnStatus,
        observaciones_bodega: ''
      };
    } else {
      pedido.datos_devolucion.estado = returnStatus;
      if (observations) {
        (pedido.datos_devolucion as any).observaciones_bodega = observations;
      }
    }

    const saved = await pedido.save();
    this.logger.log(`✅ [ValidateReturn] Saved Status: ${saved.estado_pedido}`);

    // Create Notification
    const notiTitle = decision === 'APPROVE' ? 'Devolución Aprobada' : 'Devolución Rechazada';
    const notiMsg = decision === 'APPROVE'
      ? `Tu solicitud de devolución para el pedido #${pedido.numero_pedido_web} ha sido APROBADA.`
      : `Tu solicitud de devolución para el pedido #${pedido.numero_pedido_web} ha sido RECHAZADA. Observaciones: ${observations}`;

    // Extract User ID safely (handle populated field)
    let userIdStr = '';
    if (pedido.usuario_id && (pedido.usuario_id as any)._id) {
      userIdStr = (pedido.usuario_id as any)._id.toString();
    } else {
      userIdStr = pedido.usuario_id.toString();
    }

    this.notificationsService.create({
      usuario_id: userIdStr,
      titulo: notiTitle,
      mensaje: notiMsg,
      tipo: 'return_status',
      metadata: { orderId: id, decision }
    });

    // Send Email Notification (HU048)
    try {
      // Assuming populate('usuario_id') includes email. If simple string ID, we need to fetch user.
      // But findOne() populates usuario_id. Let's force check or fetch.
      let userEmail = '';
      if (typeof pedido.usuario_id === 'object' && (pedido.usuario_id as any).email) {
        userEmail = (pedido.usuario_id as any).email;
      } else {
        // Fetch user if email not present (safety fallback)
        const user = await this.usuariosService.findById(pedido.usuario_id.toString());
        if (user) userEmail = user.email;
      }

      if (userEmail) {
        await this.emailService.sendReturnDecision(userEmail, pedido, decision, observations);
      } else {
        this.logger.warn(`Could not send return email for Order ${id}: User email not found`);
      }
    } catch (emailErr) {
      this.logger.error(`Error sending return email for Order ${id}`, emailErr);
    }

    return saved;
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
