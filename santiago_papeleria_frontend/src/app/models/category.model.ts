export interface Category {
    nombre: string;
    slug: string;
    hijos?: Category[];
    icono?: string;
    id_erp?: number;
}

export interface SuperCategoryGroup {
    name: string;
    categories: Category[];
}
