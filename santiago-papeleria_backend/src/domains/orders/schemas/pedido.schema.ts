// src/pedidos/schemas/pedido.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ProductoDocument } from '../../products/schemas/producto.schema'; // Importamos ProductoDocument para la referencia

// Definición de Tipos
export type PedidoDocument = Pedido & Document;

// 1. Items (Productos comprados)
class Item {
  @Prop({ required: true })
  codigo_dobranet: string;

  @Prop({ required: true })
  nombre: string;

  @Prop({ required: true })
  cantidad: number;

  @Prop({ required: true })
  precio_unitario_aplicado: number;

  @Prop({ required: true })
  subtotal: number;

  @Prop({ required: true })
  impuesto_iva: number;
}

// 2. Resumen Financiero
class ResumenFinanciero {
  @Prop({ required: true })
  subtotal_sin_impuestos: number;

  @Prop({ required: true })
  total_impuestos: number;

  @Prop({ required: true })
  costo_envio: number;

  @Prop({ required: true })
  total_pagado: number;

  @Prop({ required: true })
  metodo_pago: string; // Ejemplo: 'TRANSFERENCIA'

  @Prop({ required: false, default: null })
  comprobante_pago: string; // URL del archivo subido (Solo para transferencias)
}

// 3. Dirección de Destino (Parte de Datos Envío)
class DireccionDestino {
  @Prop({ required: false })
  calle: string;

  @Prop({ required: false })
  ciudad: string;

  @Prop({ required: false })
  provincia: string;

  @Prop({ required: false })
  codigo_postal: string;

  @Prop({ required: false })
  referencia: string;
}

// 4. Datos de Envío
class DatosEnvio {
  @Prop({ required: false, default: null })
  courier: string;

  @Prop({ required: false, default: null })
  guia_tracking: string;

  @Prop({ type: DireccionDestino, required: false, default: null })
  direccion_destino: DireccionDestino;
}

// 5. Integración Dobranet
class IntegracionDobranet {
  @Prop({ default: false })
  sincronizado: boolean;

  @Prop({ default: 0 })
  intentos: number;

  @Prop({ type: Date, default: null })
  fecha_sincronizacion: Date;

  @Prop({ default: null })
  orden_erp: string; // Número de orden retornado por DobraNet (ORDVEN-NUM)

  @Prop({ default: null })
  ultimo_error: string; // Último error de sincronización
}

// Definición principal del Schema
@Schema({ collection: 'pedidos' })
export class Pedido {
  @Prop({ required: true, unique: true })
  numero_pedido_web: number; // Corresponde a "numero_pedido_web"

  // Aquí usamos Types.ObjectId para referenciar un usuario de la colección 'usuarios'
  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true })
  usuario_id: Types.ObjectId; // Corresponde a "usuario_id"

  @Prop({ required: true })
  estado_pedido: string; // Ejemplo: 'PAGADO', 'PENDIENTE', 'ENVIADO'

  @Prop({ type: [Item], required: true })
  items: Item[]; // Corresponde a "items"

  @Prop({ type: ResumenFinanciero, required: true })
  resumen_financiero: ResumenFinanciero; // Corresponde a "resumen_financiero"

  @Prop({ type: DatosEnvio, required: true })
  datos_envio: DatosEnvio; // Corresponde a "datos_envio"

  @Prop({ type: IntegracionDobranet })
  integracion_dobranet: IntegracionDobranet; // Corresponde a "integracion_dobranet"

  @Prop({ type: Date, required: true })
  fecha_compra: Date; // Corresponde a "fecha_compra"
}

export type PedidoStatus = 'PAGADO' | 'PENDIENTE' | 'ENVIADO' | 'ENTREGADO' | 'CANCELADO';

export const PedidoSchema = SchemaFactory.createForClass(Pedido);
