import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CategoriaDocument = Categoria & Document;

@Schema()
export class Categoria {
    @Prop({ required: true, unique: true })
    id_erp: number;

    @Prop({ required: true })
    codigo: string;

    @Prop({ required: true })
    nombre: string;

    @Prop({ type: Number, default: 1 })
    nivel: number;

    @Prop({ type: Types.ObjectId, ref: 'Categoria', default: null })
    padre: Types.ObjectId;

    @Prop({ type: [{ type: Types.ObjectId, ref: 'Categoria' }], default: [] })
    hijos: Types.ObjectId[];

    @Prop({ default: true })
    activo: boolean;

    @Prop()
    slug: string;

    @Prop()
    icono: string; // Optional: for the mega menu icons
}

export const CategoriaSchema = SchemaFactory.createForClass(Categoria);
