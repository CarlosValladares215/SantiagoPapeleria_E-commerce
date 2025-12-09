import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-products-pagination',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './products-pagination.html',
    styleUrls: ['./products-pagination.scss']
})
export class ProductsPagination {
    @Input() currentPage: number = 1;
    @Input() totalPages: number = 1;

    @Output() pageChange = new EventEmitter<number>();

    getPageNumbers(): number[] {
        const pages: number[] = [];
        const maxVisible = 5;

        if (this.totalPages <= maxVisible) {
            for (let i = 1; i <= this.totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(1);

            // Calculate range around current page
            let start = Math.max(2, this.currentPage - 1);
            let end = Math.min(this.totalPages - 1, this.currentPage + 1);

            // Add ellipsis if needed
            if (start > 2) {
                pages.push(-1); // -1 represents ellipsis
            }

            // Add pages around current
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            // Add ellipsis if needed
            if (end < this.totalPages - 1) {
                pages.push(-1);
            }

            // Always show last page
            pages.push(this.totalPages);
        }

        return pages;
    }

    onPageClick(page: number): void {
        if (page > 0 && page <= this.totalPages && page !== this.currentPage) {
            this.pageChange.emit(page);
        }
    }

    onPrevious(): void {
        if (this.currentPage > 1) {
            this.pageChange.emit(this.currentPage - 1);
        }
    }

    onNext(): void {
        if (this.currentPage < this.totalPages) {
            this.pageChange.emit(this.currentPage + 1);
        }
    }
}
