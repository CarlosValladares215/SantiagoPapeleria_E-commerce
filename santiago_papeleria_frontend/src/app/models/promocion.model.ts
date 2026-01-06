export interface Promocion {
    _id?: string;
    nombre: string;
    descripcion?: string;
    tipo: 'porcentaje' | 'valor_fijo';
    valor: number;
    ambito: 'global' | 'categoria' | 'marca' | 'productos';
    filtro?: {
        categoria_g1?: string;
        categoria_g2?: string;
        categoria_g3?: string;
        marca?: string;
        codigos_productos?: string[];
    };
    fecha_inicio: Date | string;
    fecha_fin: Date | string;
    activa: boolean;
    version?: number;
    created_at?: Date;
}
