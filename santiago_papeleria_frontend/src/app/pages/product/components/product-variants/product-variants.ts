import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductColor, ProductSize } from '../../../../models/product.model';

@Component({
    selector: 'app-product-variants',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './product-variants.html',
    styleUrls: ['./product-variants.scss']
})
export class ProductVariants {
    @Input() colors: ProductColor[] = [];
    @Input() sizes: ProductSize[] = [];
    @Input() selectedColor: string = '';
    @Input() selectedSize: string = '';

    @Output() colorSelect = new EventEmitter<string>();
    @Output() sizeSelect = new EventEmitter<string>();

    selectColor(colorName: string): void {
        this.colorSelect.emit(colorName);
    }

    selectSize(sizeName: string): void {
        this.sizeSelect.emit(sizeName);
    }

    getSelectedColorLabel(): string {
        return this.colors.find(c => c.name === this.selectedColor)?.label || '';
    }
}
