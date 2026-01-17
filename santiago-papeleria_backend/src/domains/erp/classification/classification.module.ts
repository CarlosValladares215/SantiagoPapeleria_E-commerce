import { Module } from '@nestjs/common';
import { CategoryClassifierService } from './category-classifier.service';

/**
 * ClassificationModule
 * 
 * Provides ML-based category classification using semantic embeddings.
 * Separated from products domain as it's a cross-cutting AI concern.
 */
@Module({
    providers: [CategoryClassifierService],
    exports: [CategoryClassifierService],
})
export class ClassificationModule { }
