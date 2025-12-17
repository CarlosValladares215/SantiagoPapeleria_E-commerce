export interface DatosFiscales {
    tipo_identificacion: string;
    identificacion: string;
    razon_social: string;
    direccion_matriz: string;
}

export interface DireccionEntrega {
    _id?: string;
    alias: string;
    calle_principal: string;
    ciudad: string;
    provincia?: string;
    referencia?: string;
    location?: {
        lat: number;
        lng: number;
    };
}

export interface Preferencias {
    acepta_boletin: boolean;
}

export interface Usuario {
    _id?: string;
    email: string;
    password?: string; // Optional because it's not returned on GET, only sent on POST
    nombres: string;
    cedula?: string;
    telefono?: string;
    tipo_cliente: 'MINORISTA' | 'MAYORISTA';
    role?: 'admin' | 'customer' | 'warehouse';
    estado?: 'ACTIVO' | 'INACTIVO';
    datos_fiscales?: DatosFiscales;
    direcciones_entrega?: DireccionEntrega[];
    preferencias?: Preferencias;
    fecha_creacion?: Date | string;
    token?: string; // JWT token
}
