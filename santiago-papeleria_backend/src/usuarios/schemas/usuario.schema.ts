// src/usuarios/schemas/usuario.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

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
  referencia: string;

  @Prop({ type: Geo })
  geo: Geo;
}

class Preferencias {
  @Prop({ default: true })
  acepta_boletin: boolean;
}

// --- Esquema Principal ---

@Schema()
export class Usuario {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password_hash: string; // Almacenará el hash de la contraseña

  @Prop({ required: true })
  nombres: string;

  @Prop()
  telefono: string;

  @Prop({ required: true, default: 'FINAL' })
  tipo_cliente: string; // MAYORISTA, FINAL

  @Prop({ default: 'ACTIVO' })
  estado: string; // ACTIVO, INACTIVO

  @Prop({ type: DatosFiscales })
  datos_fiscales: DatosFiscales;

  @Prop({ type: [DireccionEntrega] })
  direcciones_entrega: DireccionEntrega[];

  @Prop({ type: Preferencias })
  preferencias: Preferencias;

  @Prop({ default: Date.now })
  fecha_creacion: Date;
}

export const UsuarioSchema = SchemaFactory.createForClass(Usuario);
