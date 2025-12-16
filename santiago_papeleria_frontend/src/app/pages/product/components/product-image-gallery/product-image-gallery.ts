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

    // Lightbox State
    isLightboxOpen = false;
    lightboxIndex = 0;

    selectImage(index: number): void {
        this.imageSelect.emit(index);
    }

    openLightbox(index: number): void {
        this.lightboxIndex = index;
        this.isLightboxOpen = true;
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }

    closeLightbox(): void {
        this.isLightboxOpen = false;
        document.body.style.overflow = ''; // Restore scrolling
    }

    next(): void {
        if (this.lightboxIndex < this.images.length - 1) {
            this.lightboxIndex++;
        } else {
            this.lightboxIndex = 0; // Loop
        }
    }

    prev(): void {
        if (this.lightboxIndex > 0) {
            this.lightboxIndex--;
        } else {
            this.lightboxIndex = this.images.length - 1; // Loop
        }
    }
}
