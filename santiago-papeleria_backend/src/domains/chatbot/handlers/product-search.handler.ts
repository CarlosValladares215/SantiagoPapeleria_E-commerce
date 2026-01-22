// src/domains/chatbot/handlers/product-search.handler.ts

import { Injectable, Logger } from '@nestjs/common';
import { BaseHandler } from './base.handler';
import { ChatIntent } from '../enums/chat-intent.enum';
import { ChatResponseDto } from '../dto/chat-response.dto';
import { EnrichmentService } from '../../products/admin/enrichment.service';
import { ProductFilterDto } from '../../products/dto/product-filter.dto';
import { NlpService } from '../nlp/nlp.service';

@Injectable()
export class ProductSearchHandler extends BaseHandler {
    private readonly logger = new Logger(ProductSearchHandler.name);
    readonly intent = ChatIntent.PRODUCT_SEARCH;

    constructor(
        private readonly enrichmentService: EnrichmentService,
        private readonly nlpService: NlpService,
    ) {
        super();
    }

    async execute(entities: Record<string, any>, userId?: string): Promise<ChatResponseDto> {
        const { searchTerm, category, brand, minPrice, maxPrice } = entities;

        // GUARD: If no real search criteria, ask for clarification
        if (!searchTerm && !category && !brand) {
            this.logger.debug('No search criteria provided, asking for clarification');
            return ChatResponseDto.options(
                '🔍 ¿Qué producto te gustaría buscar?\n\n' +
                'Escribe el nombre del producto, por ejemplo:\n' +
                '• "mochilas"\n' +
                '• "cuadernos universitarios"\n' +
                '• "lápices de colores"',
                ['Mochilas', 'Cuadernos', 'Lápices', 'Carpetas']
            );
        }

        // Build base filter
        const filter: ProductFilterDto = { limit: '4' };

        if (category) filter.category = category;
        if (brand) filter.brand = brand;
        if (minPrice !== undefined) filter.minPrice = String(minPrice);
        if (maxPrice !== undefined) filter.maxPrice = String(maxPrice);

        // Try exact search first
        if (searchTerm) filter.searchTerm = searchTerm;

        this.logger.debug(`Searching products with filter: ${JSON.stringify(filter)}`);

        try {
            let results = await this.enrichmentService.getAdminProductList(filter);

            // FALLBACK 1: Smart Singularization
            if ((!results?.data || results.data.length === 0) && searchTerm) {
                let singularTerm = '';

                if (searchTerm.endsWith('ces')) {
                    singularTerm = searchTerm.slice(0, -3) + 'z'; // lápices -> lápiz
                } else if (searchTerm.endsWith('es')) {
                    singularTerm = searchTerm.slice(0, -2); // borradores -> borrador
                } else if (searchTerm.endsWith('s')) {
                    singularTerm = searchTerm.slice(0, -1); // mochilas -> mochila
                }

                if (singularTerm && singularTerm !== searchTerm) {
                    this.logger.debug(`No results for "${searchTerm}", trying singular "${singularTerm}"`);
                    filter.searchTerm = singularTerm;
                    results = await this.enrichmentService.getAdminProductList(filter);
                }
            }

            if (results?.data?.length > 0) {
                const query = searchTerm || category || brand;
                return ChatResponseDto.products(
                    `He encontrado estos productos relacionados con "${query}":`,
                    results.data
                );
            }

            // FALLBACK 2: Semantic Category Search
            this.logger.warn(`No products found for "${searchTerm}". Trying semantic category match...`);

            // Classify the search term semantically into a SuperCategory
            const classification = await this.nlpService.classifyCategory(searchTerm);

            if (classification && classification.score > 0.3) {
                this.logger.debug(`Semantic match: "${searchTerm}" → ${classification.name} (${(classification.score * 100).toFixed(1)}%)`);

                // Search products in that category
                const categoryProducts = await this.enrichmentService.getProductsBySuperCategory(classification.name, 4);

                if (categoryProducts.length > 0) {
                    return ChatResponseDto.products(
                        `No encontré "${searchTerm}" exactamente, pero estos productos de **${classification.name}** podrían interesarte:`,
                        categoryProducts
                    );
                }
            }

            // FALLBACK 3: Ultimate fallback - static polite response (NO Ollama = NO timeouts)
            this.logger.warn(`Semantic search also failed. Using static fallback.`);

            // Static response - no Ollama dependency = instant response
            const staticMessage = `Lo siento, no encontré "${searchTerm || 'ese producto'}" en nuestro catálogo. ` +
                `¿Te gustaría ver nuestras ofertas actuales o buscar otro producto?`;

            return ChatResponseDto.options(
                staticMessage,
                ['Ver ofertas', 'Buscar otra cosa', 'Hablar con un agente']
            );

        } catch (error) {
            this.logger.error(`Product search error: ${error.message}`);
            return ChatResponseDto.text(
                'Hubo un problema al buscar productos. Por favor intenta de nuevo en un momento.'
            );
        }
    }
}
