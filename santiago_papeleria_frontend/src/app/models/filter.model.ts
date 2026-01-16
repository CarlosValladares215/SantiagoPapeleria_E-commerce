export interface FilterState {
    category: string;
    brand: string;
    priceRange: [number, number];
    inStock: boolean;
    sortBy: string;
    searchTerm: string;
    ids?: string[];
    isOffer?: boolean;
    page?: number;
    limit?: number;
}

export interface SortOption {
    value: string;
    label: string;
    icon: string;
}

export interface CategoryCount {
    name: string;
    count: number;
}
