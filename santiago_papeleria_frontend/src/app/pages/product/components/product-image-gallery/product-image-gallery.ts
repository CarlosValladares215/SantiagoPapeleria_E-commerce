import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-product-image-gallery',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './product-image-gallery.html',
    styleUrls: ['./product-image-gallery.scss']
})
export class ProductImageGallery {
    @Input() images: string[] = [];
    @Input() selectedIndex: number = 0;
    @Input() productName: string = '';

    @Output() imageSelect = new EventEmitter<number>();

    selectImage(index: number): void {
        this.imageSelect.emit(index);
    }
}
