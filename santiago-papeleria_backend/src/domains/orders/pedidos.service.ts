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
import { StockService } from '../products/inventory/stock.service';
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
    private stockService: StockService
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
    // MAPPING INICIAL DE ESTADOS
    let estadoPago = 'NO_PAGADO';
    let estadoPedido = 'PENDIENTE';

    // Si viene del frontend como PENDIENTE_PAGO (Transferencia), es PENDIENTE_CONFIRMACION
    if (createPedidoDto.estado_pedido === 'PENDIENTE_PAGO' || createPedidoDto.estado_pago === 'PENDIENTE_CONFIRMACION') {
      estadoPago = 'PENDIENTE_CONFIRMACION';
    }
    // Si viene PENDIENTE normal (Efectivo/Contraentrega), es NO_PAGADO por defecto hasta que pague
    else if (createPedidoDto.estado_pedido === 'PENDIENTE') {
      estadoPago = 'NO_PAGADO';
    }
    // Si ya viene PAGADO (Pasarela futura)
    else if (createPedidoDto.estado_pedido === 'PAGADO' || createPedidoDto.estado_pago === 'PAGADO') {
      estadoPago = 'PAGADO';
    }


    const createdPedido = new this.pedidoModel({
      ...createPedidoDto,
      usuario_id: new Types.ObjectId(createPedidoDto.usuario_id),
      numero_pedido_web: siguienteNumero,

      // ESTADOS SEPARADOS
      estado_pedido: estadoPedido,
      estado_pago: estadoPago,
      estado_devolucion: 'NINGUNA',

      datos_envio: {
        ...createPedidoDto.datos_envio,
        guia_tracking: guiaTracking
      },
      fecha_compra: new Date(),
    });

    // 3. Guardar en la base de datos
    const savedPedido = await createdPedido.save();

    // 3.1 Descontar Stock Localmente (RN-STOCK-001)
    for (const item of savedPedido.items) {
      if (item.codigo_dobranet) {
        await this.stockService.updateStock(
          item.codigo_dobranet,
          -item.cantidad,
          `PEDIDO-${savedPedido.numero_pedido_web}`,
          'VENTA',
          savedPedido.usuario_id.toString()
        );
      }
    }

    // 4. Enviar correo de confirmación (SOLO CONFIRMACIÓN, NO FACTURA)
    // El frontend espera confirmación inmediata de recepcion
    this.sendConfirmationEmail(createPedidoDto.usuario_id, savedPedido);

    // 5. Enviar pedido al ERP DobraNet
    this.sendOrderToErpWithRetry(savedPedido);

    return savedPedido;
  }

  // --- NUEVOS MÉTODOS DE GESTIÓN DE ESTADOS ---

  // Gestión Financiera (Admin)
  async updatePaymentStatus(id: string, status: string, userId?: string): Promise<PedidoDocument> {
    const pedido = await this.pedidoModel.findById(id);
    if (!pedido) throw new Error('Pedido no encontrado');

    const previousStatus = pedido.estado_pago;
    pedido.estado_pago = status;

    // Si se marca como PAGADO, enviar Factura y permitir flujo logístico
    if (status === 'PAGADO' && previousStatus !== 'PAGADO') {
      // Enviar Factura con nuevo template
      this.sendPaymentEmail(pedido.usuario_id.toString(), pedido);
      this.logger.log(`💰 Pedido #${pedido.numero_pedido_web} marcado como PAGADO. Factura enviada.`);
    }

    // Si se marca como RECHAZADO (Admin rechaza pago)
    if (status === 'RECHAZADO' && previousStatus !== 'RECHAZADO') {
      // Only restore if not already cancelled (Double safety)
      if (pedido.estado_pedido !== 'CANCELADO') {
        await this.restoreStock(pedido, 'PAGO_RECHAZADO');
        pedido.estado_pedido = 'CANCELADO'; // Auto-cancel order
      }
    }

    return await pedido.save();
  }

  // Gestión Logística (Bodega)
  async updateLogisticStatus(id: string, status: string): Promise<PedidoDocument> {
    const pedido = await this.pedidoModel.findById(id);
    if (!pedido) throw new Error('Pedido no encontrado');

    // REGLA DE NEGOCIO: 
    // - No se puede 'PREPARADO' o 'ENVIADO' si no está 'PAGADO'.
    // - 'CANCELADO' SÍ se permite en cualquier momento (para cancelar pedidos no pagados).
    if (['PREPARADO', 'ENVIADO'].includes(status) && pedido.estado_pago !== 'PAGADO') {
      throw new Error('No se puede procesar logísticamente un pedido NO PAGADO.');
    }

    const previousStatus = pedido.estado_pedido;
    pedido.estado_pedido = status;

    // Si se cancela logísticamente (Bodega/Admin)
    if (status === 'CANCELADO' && previousStatus !== 'CANCELADO') {
      // Check if payment was already rejected (which already restored stock)
      // If payment is NOT rejected, then this is a fresh cancellation -> restore
      if (pedido.estado_pago !== 'RECHAZADO') {
        await this.restoreStock(pedido, 'CANCELACION_LOGISTICA');
      }
    }

    const saved = await pedido.save();

    // Enviar email según el nuevo estado logístico
    this.sendLogisticEmail(pedido.usuario_id.toString(), saved, status);

    return saved;
  }


  // Método Legacy para compatibilidad (Redirige según el estado)
  async updateStatus(id: string, status: string): Promise<PedidoDocument> {
    // Si intentan usar el endpoint viejo para pagar
    if (['PAGADO', 'RECHAZADO', 'NO_PAGADO'].includes(status)) {
      return this.updatePaymentStatus(id, status);
    }
    return this.updateLogisticStatus(id, status);
  }


  // Método auxiliar para manejar el envío de correo sin bloquear
  private async sendConfirmationEmail(userId: string, order: PedidoDocument) {
    try {
      const email = await this.getUserEmailFromOrder(order);
      if (email) {
        await this.emailService.sendOrderReceived(email, order);
      }
    } catch (error) {
      this.logger.error('Error enviando correo de confirmación de pedido:', error);
    }
  }

  // Nuevo: Enviar Factura (Solo al Pagar)
  private async sendPaymentEmail(userId: string, order: PedidoDocument) {
    try {
      const email = await this.getUserEmailFromOrder(order);
      if (email) {
        await this.emailService.sendPaymentConfirmed(email, order);
      }
    } catch (error) {
      this.logger.error('Error enviando email de pago confirmado:', error);
    }
  }

  // Enviar emails de estado logístico (PREPARADO, ENVIADO, ENTREGADO)
  private async sendLogisticEmail(userId: string, order: PedidoDocument, status: string) {
    try {
      const email = await this.getUserEmailFromOrder(order);
      if (!email) return;

      switch (status) {
        case 'PREPARADO':
          await this.emailService.sendOrderPreparing(email, order);
          break;
        case 'ENVIADO':
          await this.emailService.sendOrderShipped(email, order);
          break;
        case 'ENTREGADO':
          await this.emailService.sendOrderDelivered(email, order);
          break;
      }
    } catch (error) {
      this.logger.error(`Error enviando email de estado ${status}:`, error);
    }
  }

  // Helper: Extract user email from order (handles populated or unpopulated usuario_id)
  private async getUserEmailFromOrder(order: PedidoDocument): Promise<string | null> {
    try {
      // If usuario_id is populated (is an object with email)
      if (order.usuario_id && typeof order.usuario_id === 'object' && (order.usuario_id as any).email) {
        return (order.usuario_id as any).email;
      }
      // If usuario_id is just an ObjectId string
      const userId = order.usuario_id?._id?.toString() || order.usuario_id?.toString();
      if (userId) {
        const user = await this.usuariosService.findById(userId);
        return user?.email || null;
      }
      return null;
    } catch (error) {
      this.logger.error('Error extrayendo email del usuario:', error);
      return null;
    }
  }

  // Enviar email de solicitud de devolución recibida
  private async sendReturnRequestEmail(userId: string, order: PedidoDocument) {
    try {
      const email = await this.getUserEmailFromOrder(order);
      if (email) {
        await this.emailService.sendReturnRequested(email, order);
      }
    } catch (error) {
      this.logger.error('Error enviando email de solicitud de devolución:', error);
    }
  }

  // Enviar email de devolución recibida en bodega
  private async sendReturnReceivedEmail(userId: string, order: PedidoDocument) {
    try {
      const email = await this.getUserEmailFromOrder(order);
      if (email) {
        await this.emailService.sendReturnReceived(email, order);
      }
    } catch (error) {
      this.logger.error('Error enviando email de devolución recibida:', error);
    }
  }

  // Enviar email de reembolso procesado
  private async sendRefundEmail(userId: string, order: PedidoDocument) {
    try {
      const email = await this.getUserEmailFromOrder(order);
      if (email) {
        await this.emailService.sendRefundProcessed(email, order);
      }
    } catch (error) {
      this.logger.error('Error enviando email de reembolso:', error);
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

          // Stop retrying if product is not found (Deterministic Error)
          if (lastError.includes('NO ENCONTRADO') || lastError.includes('NOT FOUND')) {
            this.logger.warn('⛔ No se reintentará sincronización por error determinístico.');
            break;
          }
        }
      } catch (error) {
        lastError = error.message || 'Error de conexión';
        this.logger.error(`❌ Error enviando pedido al ERP (intento ${attempts}): ${lastError}`);
      }

      // Backoff mechanism for both logical and connection errors
      if (!success && attempts < maxRetries) {
        const waitTime = Math.pow(2, attempts) * 1000; // 2s, 4s, 8s
        await new Promise(resolve => setTimeout(resolve, waitTime));
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



  // Solicitar devolución de un pedido


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

    // 2. Verify Status is ENTREGADO (Logistic Rule)
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

    // 4. Update Return Status ONLY (Decoupled Logic)
    pedido.estado_devolucion = 'PENDIENTE'; // Top-level Return State

    pedido.datos_devolucion = {
      motivo: returnData.motivo,
      fecha_solicitud: new Date(),
      items: returnData.items,
      estado: 'PENDIENTE',
      observaciones_bodega: ''
    };

    const saved = await pedido.save();

    // Notify Admin (Log for now)
    this.logger.log(`↩️ Solicitud de devolución creada para pedido #${pedido.numero_pedido_web}`);

    // Send email to customer confirming return request received
    this.sendReturnRequestEmail(pedido.usuario_id.toString(), saved);

    return saved;
  }

  // Validar devolución (Bodega)
  async validateReturn(id: string, decision: 'APPROVE' | 'REJECT', observations: string): Promise<PedidoDocument> {
    const pedido = await this.findOne(id);
    if (!pedido) {
      throw new Error('Pedido no encontrado');
    }

    // Check Return Status, NOT Logistic Status
    if (pedido.estado_devolucion !== 'PENDIENTE') {
      throw new Error('El pedido no tiene una devolución pendiente de revisión');
    }

    // Log status change attempt
    this.logger.log(`🔍 [ValidateReturn] Order ${id} - Decision: ${decision}`);
    this.logger.log(`🔍 [ValidateReturn] Current Return Status: ${pedido.estado_devolucion}`);

    // Map decision to Return Status
    const returnStatus = decision === 'APPROVE' ? 'APROBADA' : 'RECHAZADA';

    // Update Return Status Only
    pedido.estado_devolucion = returnStatus;
    this.logger.log(`🔍 [ValidateReturn] New Return Status Set: ${returnStatus}`);

    // Update datos_devolucion (ensure it exists)
    if (!pedido.datos_devolucion) {
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
    this.logger.log(`✅ [ValidateReturn] Saved Return Status: ${saved.estado_devolucion}`);

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
        // Use new templates based on decision
        if (decision === 'APPROVE') {
          await this.emailService.sendReturnApproved(userEmail, pedido);
        } else {
          await this.emailService.sendReturnRejected(userEmail, pedido, observations);
        }
      } else {
        this.logger.warn(`Could not send return email for Order ${id}: User email not found`);
      }
    } catch (emailErr) {
      this.logger.error(`Error sending return email for Order ${id}`, emailErr);
    }

    return saved;
  }

  // Paso 3: Bodega recibe el producto (Físico)
  async receiveReturn(id: string, observations: string): Promise<PedidoDocument> {
    const pedido = await this.findOne(id);
    if (!pedido) throw new Error('Pedido no encontrado');

    // Strict Rule: Can only receive if previously APPROVED
    if (pedido.estado_devolucion !== 'APROBADA') {
      throw new Error('Solo se pueden recibir devoluciones previamente aprobadas por administración.');
    }

    // Update Status
    pedido.estado_devolucion = 'RECIBIDA';

    if (pedido.datos_devolucion) {
      pedido.datos_devolucion.estado = 'RECIBIDA';
      if (observations) {
        // Append entry observation
        const prevObs = (pedido.datos_devolucion as any).observaciones_bodega || '';
        (pedido.datos_devolucion as any).observaciones_bodega = prevObs + ` | [Recepción]: ${observations}`;
      }
    }

    const saved = await pedido.save();
    this.logger.log(`📦 [Bodega] Devolución recibida para pedido #${pedido.numero_pedido_web}`);

    // Send email notifying customer product was received
    this.sendReturnReceivedEmail(pedido.usuario_id.toString(), saved);

    return saved;
  }

  // Paso 4: Admin finaliza/reembolsa (Cierre Financiero)
  async finalizeReturn(id: string): Promise<PedidoDocument> {
    const pedido = await this.findOne(id);
    if (!pedido) throw new Error('Pedido no encontrado');

    // Strict Rule: Can only finalize if RECEIVED (Physically in warehouse)
    if (pedido.estado_devolucion !== 'RECIBIDA') {
      throw new Error('No se puede finalizar el reembolso si el producto no ha sido recibido en bodega.');
    }

    // 1. Update Return Status (Closed)
    pedido.estado_devolucion = 'REEMBOLSADA';
    if (pedido.datos_devolucion) pedido.datos_devolucion.estado = 'REEMBOLSADA';

    // 2. Update Payment Status (Money back)
    pedido.estado_pago = 'REEMBOLSADO';

    // TODO: Trigger Credit Note or Stripe Refund here

    const saved = await pedido.save();
    this.logger.log(`💰 [Finanzas] Reembolso procesado para pedido #${pedido.numero_pedido_web}`);

    // Send refund completed email
    this.sendRefundEmail(pedido.usuario_id.toString(), saved);

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
    if (pedido.usuario_id.toString() !== userId && (pedido.usuario_id as any)._id?.toString() !== userId) {
      throw new Error('No autorizado para cancelar este pedido');
    }

    // 2. Verify Status
    const currentStatus = pedido.estado_pedido.toUpperCase().trim();
    if (currentStatus !== 'PENDIENTE' && currentStatus !== 'PENDIENTE_PAGO') {
      throw new Error(`No es posible cancelar el pedido en estado: ${pedido.estado_pedido}`);
    }

    // 3. Cancel
    pedido.estado_pedido = 'CANCELADO';

    // 4. Restore Stock (User Cancellation)
    await this.restoreStock(pedido, 'CANCELACION_USUARIO');

    const saved = await pedido.save();

    console.log(`✅ [Backend] Pedido ${pedido.numero_pedido_web} cancelado por el usuario ${userId}`);
    return saved;
  }

  /**
   * Restaura el stock de los items del pedido.
   * Se debe llamar al cancelar o rechazar un pedido.
   */
  private async restoreStock(pedido: PedidoDocument, reason: string) {
    this.logger.log(`🔄 Restaurando stock para pedido #${pedido.numero_pedido_web}. Motivo: ${reason}`);

    for (const item of pedido.items) {
      if (item.codigo_dobranet) {
        try {
          // Restore exact quantity
          await this.stockService.updateStock(
            item.codigo_dobranet,
            item.cantidad, // Positive value to add back
            `RESTORE-${pedido.numero_pedido_web}`,
            'DEVOLUCION', // Using DEVOLUCION as generic term for 'Giving back to stock'
            pedido.usuario_id.toString()
          );
        } catch (error) {
          this.logger.error(`❌ Error restaurando stock para item ${item.codigo_dobranet}:`, error);
        }
      }
    }
  }
}
