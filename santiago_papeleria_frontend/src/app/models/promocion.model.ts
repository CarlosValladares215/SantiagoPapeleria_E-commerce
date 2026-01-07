export interface Promocion {
    _id?: string;
    nombre: string;
    descripcion?: string;
    tipo: 'porcentaje' | 'valor_fijo';
    valor: number;
    ambito: 'global' | 'categoria' | 'marca' | 'productos' | 'mixto';
    filtro?: {
        categorias?: string[];
        marcas?: string[];
        codigos_productos?: string[];
    };
    fecha_inicio: Date | string;
    fecha_fin: Date | string;
    activa: boolean;
    version?: number;
    created_at?: Date;
}
