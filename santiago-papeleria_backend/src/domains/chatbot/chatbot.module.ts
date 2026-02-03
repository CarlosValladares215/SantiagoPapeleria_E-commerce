// src/domains/chatbot/chatbot.module.ts

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

// Controller
import { ChatbotController } from './chatbot.controller';

// Core Services
import { ChatbotOrchestrator } from './orchestrator/chatbot-orchestrator.service';
import { SemanticOrchestrator } from './orchestrator/semantic-orchestrator.service';
import { NlpService } from './nlp/nlp.service';

// NLP Adapters
import { NlpJsAdapter } from './nlp/adapters/nlpjs.adapter';
import { OllamaAdapter } from './nlp/adapters/ollama.adapter';
import { MockLlmAdapter } from './nlp/adapters/mock-llm.adapter';

// Memory
import { MEMORY_STORE_TOKEN } from './memory/interfaces/memory-store.interface';
import { InMemoryStore } from './memory/stores/in-memory.store';
import { ChatMemoryService } from './memory/chat-memory.service';

// Handlers
import { ProductSearchHandler } from './handlers/product-search.handler';
import { OrderStatusHandler } from './handlers/order-status.handler';
import { PricingInfoHandler } from './handlers/pricing-info.handler';
import { HumanEscalationHandler } from './handlers/human-escalation.handler';
import { GeneralHelpHandler } from './handlers/general-help.handler';
import { GreetingHandler } from './handlers/greeting.handler';
import { OutOfScopeHandler } from './handlers/out-of-scope.handler';
import { UnclearHandler } from './handlers/unclear.handler';
import { GratitudeHandler } from './handlers/gratitude.handler';
import { ViewOffersHandler } from './handlers/view-offers.handler';
import { NavigationHelpHandler } from './handlers/navigation-help.handler';
import { ReturnsHandler } from './handlers/returns.handler';
import { OrderTrackingHandler } from './handlers/order-tracking.handler';
import { OrderProcessHandler } from './handlers/order-process.handler';
import { ReturnPolicyHandler } from './handlers/return-policy.handler';

// External Modules
import { ProductosModule } from '../products/productos.module';
import { PedidosModule } from '../orders/pedidos.module';
import { ClassificationModule } from '../erp/classification/classification.module';

@Module({
    imports: [
        HttpModule,
        ConfigModule,
        ProductosModule,
        PedidosModule,
        ClassificationModule, // For semantic category fallback
    ],
    controllers: [ChatbotController],
    providers: [
        // Memory Store
        {
            provide: MEMORY_STORE_TOKEN,
            useClass: InMemoryStore,
        },

        // NLP Adapters (injected into NlpService)
        NlpJsAdapter,      // Primary: Fast, local
        OllamaAdapter,     // Fallback: Complex queries
        MockLlmAdapter,    // Testing

        // NLP Orchestrator Service
        NlpService,

        // Brain
        SemanticOrchestrator,

        // Memory Service
        ChatMemoryService,

        // Orchestrator
        ChatbotOrchestrator,

        // Handlers
        ProductSearchHandler,
        OrderStatusHandler,
        PricingInfoHandler,
        HumanEscalationHandler,
        GeneralHelpHandler,
        GreetingHandler,
        OutOfScopeHandler,
        UnclearHandler,
        GratitudeHandler,
        ViewOffersHandler,
        NavigationHelpHandler,
        ReturnsHandler,
        OrderTrackingHandler,
        OrderProcessHandler,
        ReturnPolicyHandler,
    ],
    exports: [ChatbotOrchestrator],
})
export class ChatbotModule { }
