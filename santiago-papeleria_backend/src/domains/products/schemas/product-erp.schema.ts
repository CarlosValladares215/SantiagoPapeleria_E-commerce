import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductERPDocument = ProductERP & Document;

@Schema({
    collection: 'productos_erp',
    timestamps: true
})
export class ProductERP extends Document {
    @Prop({ required: true, unique: true, index: true })
    codigo: string;  // SKU from ERP

    @Prop({ required: true })
    nombre: string;

    @Prop()
    marca: string;

    @Prop()
    categoria_g1: string;

    @Prop()
    categoria_g2: string;

    @Prop()
    categoria_g3: string;

    @Prop({ type: Number, default: 0 })
    precio_pvp: number;

    @Prop({ type: Number, default: 0 })
    precio_pvm: number;

    @Prop({ type: Number, default: 0 })
    stock: number;

    @Prop({ type: Boolean, default: true })
    iva: boolean;

    @Prop()
    codigo_barras: string;

    @Prop()
    ultima_sync: Date;

    @Prop()
    descripcion: string; // From NOT

    @Prop()
    imagen: string; // From FOT

    @Prop()
    linea_codigo: string; // From LIN

    @Prop()
    row_id: number; // From ROW

    @Prop({ default: true })
    activo: boolean;
}

export const ProductERPSchema = SchemaFactory.createForClass(ProductERP);

