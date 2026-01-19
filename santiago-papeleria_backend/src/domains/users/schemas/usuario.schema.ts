// src/usuarios/schemas/usuario.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UsuarioDocument = Usuario & Document;

// --- Sub-Documentos ---

class DatosFiscales {
  @Prop({ required: true })
  tipo_identificacion: string;

  @Prop({ required: true, unique: true })
  identificacion: string;

  @Prop({ required: true })
  razon_social: string;

  @Prop()
  direccion_matriz: string;
}

class Geo {
  @Prop()
  lat: number;

  @Prop()
  lng: number;
}

class DireccionEntrega {
  @Prop({ required: true })
  alias: string;

  @Prop({ required: true })
  calle_principal: string;

  @Prop({ required: true })
  ciudad: string;

  @Prop()
  provincia: string;

  @Prop()
  codigo_postal: string;

  @Prop()
  referencia: string;

  @Prop({ type: Geo })
  location: Geo;
}

class Preferencias {
  @Prop({ default: true })
  acepta_boletin: boolean;
}

class DatosNegocio {
  @Prop()
  nombre_negocio: string;

  @Prop()
  ruc: string;

  @Prop()
  direccion_negocio: string;

  @Prop()
  ciudad: string;

  @Prop()
  telefono_negocio: string;
}

class CartItem {
  @Prop({ required: true })
  id: string;

  @Prop({ type: Types.ObjectId, ref: 'Producto' })
  product: Types.ObjectId;

  @Prop({ required: true })
  quantity: number;

  @Prop()
  sku: string;

  @Prop()
  name: string;

  @Prop()
  price: number;

  @Prop()
  image: string;

  @Prop({ type: Object })
  options: any;

  @Prop()
  weight_kg: number;

  @Prop({ type: Object })
  dimensions: any;
}


// --- Esquema Principal ---

@Schema()
export class Usuario {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, default: 'customer' })
  role: string; // admin, customer, warehouse

  @Prop({ required: true })
  password_hash: string; // Almacenará el hash de la contraseña

  @Prop({ required: true })
  nombres: string;

  @Prop()
  cedula: string;

  @Prop()
  telefono: string;

  @Prop({ required: true, default: 'MINORISTA' })
  tipo_cliente: string; // MAYORISTA, MINORISTA

  @Prop({ default: 'ACTIVO' })
  estado: string; // ACTIVO, INACTIVO

  @Prop({ type: DatosNegocio })
  datos_negocio: DatosNegocio;

  @Prop({ type: DatosFiscales })
  datos_fiscales: DatosFiscales;

  @Prop({ type: [DireccionEntrega] })
  direcciones_entrega: DireccionEntrega[];

  @Prop({ type: Preferencias })
  preferencias: Preferencias;

  @Prop({ default: Date.now })
  fecha_creacion: Date;

  @Prop({ default: false })
  email_verified: boolean;

  @Prop()
  verification_token: string;

  @Prop()
  verification_token_expiration: Date;

  @Prop({ default: null })
  reset_password_token: string;

  @Prop({ default: null })
  reset_password_expires: Date;

  @Prop({ default: 0 })
  failed_attempts: number;

  @Prop({ default: null })
  blocked_until: Date;

  @Prop({ type: [CartItem], default: [] })
  carrito: CartItem[];

  @Prop({ type: [String], default: [] })
  favorites: string[]; // Generic Array of Product IDs
}

export const UsuarioSchema = SchemaFactory.createForClass(Usuario);
