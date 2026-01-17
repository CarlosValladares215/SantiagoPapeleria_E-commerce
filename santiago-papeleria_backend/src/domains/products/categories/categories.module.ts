import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { SharedProductsModule } from '../shared';
import { Categoria, CategoriaSchema } from '../schemas/categoria.schema';

/**
 * CategoriesModule
 * 
 * Provides category and brand functionality.
 * Has its own Categoria schema registration.
 */
@Module({
    imports: [
        SharedProductsModule,
        MongooseModule.forFeature([
            { name: Categoria.name, schema: CategoriaSchema },
        ]),
    ],
    controllers: [CategoriesController],
    providers: [CategoriesService],
    exports: [CategoriesService],
})
export class CategoriesModule { }
