// src/domains/chatbot/nlp/adapters/nlpjs.adapter.ts

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ILlmAdapter, LlmResponse } from '../interfaces/llm-adapter.interface';
import { ChatIntent, VALID_INTENTS } from '../../enums/chat-intent.enum';

// Import NLP.js
const { NlpManager } = require('node-nlp');

/**
 * NLP.js Adapter - Fast, local NLU for intent classification.
 * 
 * Advantages over keyword matching:
 * - Understands variations ("buscar/buscando/busqué" → same intent)
 * - Automatic entity extraction
 * - Spanish language support with stemming
 * - <10ms response time
 * - No external API calls
 */
@Injectable()
export class NlpJsAdapter implements ILlmAdapter, OnModuleInit {
    private readonly logger = new Logger(NlpJsAdapter.name);
    private manager: any;
    private isReady = false;

    getName(): string {
        return 'nlpjs';
    }

    async onModuleInit() {
        await this.initializeAndTrain();
    }

    /**
     * Initialize NLP manager and train with examples
     */
    private async initializeAndTrain(): Promise<void> {
        this.logger.log('Initializing NLP.js manager...');

        this.manager = new NlpManager({
            languages: ['es'],
            forceNER: true,
            nlu: { log: false },
            autoSave: false,
            autoLoad: false,
        });

        // Add training data
        this.addTrainingData();

        // Train the model
        this.logger.log('Training NLP.js model...');
        const startTime = Date.now();
        await this.manager.train();
        this.logger.log(`NLP.js model trained in ${Date.now() - startTime}ms`);

        this.isReady = true;
    }

    /**
     * Add all training examples for each intent
     */
    private addTrainingData(): void {
        // ============== PRODUCT_SEARCH ==============
        const productSearchExamples = [
            'buscar productos',
            'buscar mochilas',
            'busca cuadernos',
            'quiero comprar lápices',
            'necesito carpetas',
            'tienen calculadoras',
            'me muestras las agendas',
            'busco material escolar',
            'quisiera ver los marcadores',
            'hay tijeras disponibles',
            'mostrar reglas',
            'ver productos',
            'catálogo de productos',
            'dame opciones de borradores',
            'qué cuadernos tienen',
            'buscando temperas',
            'quiero una mochila',
            'necesito comprar útiles',
            'artículos de papelería',
            'productos escolares',
            // New complex phrases
            'quisiera que me ayudes buscando huevos kinder',
            'puedes buscarme cuadernos',
            'necesito que busques algo para mi',
            'ayudame a encontrar una mochila',
            'estoy buscando algo especifico',
            'quisiera saber si venden cartulina',
            'buscame por favor unos lapiceros',
            'me ayudas a buscar tijeras',
            'podrías buscarme una regla',
            // Consultando variations
            'puedes ayudarme consultando mochilas',
            'ayudame consultando cuadernos',
            'consultando productos',
            'quiero consultar el catalogo',
            'tienes en tu catalogo mochilas',
            'en tu catalogo hay cuadernos',
            'que productos tienes',
            'muestrame tu catalogo',
            // Product availability questions (full phrases)
            'poseen anillos',
            'poseen anillos en su tienda',
            'tienen mochilas',
            'tienen mochilas en stock',
            'venden cuadernos',
            'venden cuadernos universitarios',
            'venden chocolates',
            'venden golosinas',
            'venden dulces',
            'hay lapices',
            'hay lapices de colores',
            'manejan carpetas',
            'manejan cartulinas',
            'cuentan con borradores',
            'trabajan con reglas',
            'disponen de tijeras',
            'venden temperas en la tienda',
            'tienen acuarelas',
            'tienen pegamento',
            'venden marcadores',
        ];
        productSearchExamples.forEach(ex => {
            this.manager.addDocument('es', ex, ChatIntent.PRODUCT_SEARCH);

            // Extract product name for availability-style questions
            // Match patterns like "poseen X", "tienen X", "venden X", "hay X", etc.
            const availabilityPatterns = [
                /(?:poseen|tienen|venden|hay|manejan|cuentan con|trabajan con|disponen de)\s+([a-záéíóúñ\s]+?)(?:\s+en\s+|\s*$)/i,
            ];

            for (const pattern of availabilityPatterns) {
                const match = ex.match(pattern);
                if (match && match[1]) {
                    const productName = match[1].trim();
                    this.manager.addNamedEntityText('searchTerm', productName, ['es'], [productName]);
                    break;
                }
            }
        });

        // ============== ORDER_STATUS ==============
        // Focused on "Status" (Pending, Paid, etc) not "Location/Tracking"
        const orderStatusExamples = [
            'estado de mi pedido',
            // 'donde está mi orden', // moved to tracking
            // 'rastrear mi envío',   // moved to tracking
            'cuando llega mi compra',
            // 'seguimiento de pedido', // moved to tracking
            // 'mi paquete',          // moved to tracking
            'ya enviaron mi orden',
            // 'tracking de mi pedido', // moved to tracking
            'consultar pedido',
            'ver mis pedidos',
            'número de seguimiento',
            'mi orden está en camino',
        ];
        orderStatusExamples.forEach(ex =>
            this.manager.addDocument('es', ex, ChatIntent.ORDER_STATUS)
        );

        // ============== PRICING_INFO ==============
        const pricingExamples = [
            'precios mayoristas',
            'cuánto cuesta',
            'precio de productos',
            'descuentos por volumen',
            'pvp pvm',
            'lista de precios',
            'cuánto vale',
            'precio al por mayor',
            'cómo funcionan los precios',
            'descuento por cantidad',
            'precio unitario',
            'compra mayorista',
            'cómo funcionan los descuentos',
            'como aplican los descuentos',
            'politica de descuentos',
        ];
        pricingExamples.forEach(ex =>
            this.manager.addDocument('es', ex, ChatIntent.PRICING_INFO)
        );

        // ============== HUMAN_ESCALATION ==============
        const humanExamples = [
            'hablar con una persona',
            'quiero un agente humano',
            'necesito soporte real',
            'comunicarme con alguien',
            'atención al cliente',
            'hablar con un asesor',
            'transferir a humano',
            'contactar soporte',
            'quiero hablar con alguien real',
            'agente de servicio',
            'representante',
        ];
        humanExamples.forEach(ex =>
            this.manager.addDocument('es', ex, ChatIntent.HUMAN_ESCALATION)
        );

        // ============== GENERAL_HELP ==============
        const helpExamples = [
            'ayuda',
            'qué puedes hacer',
            'cómo funciona',
            'opciones disponibles',
            'qué servicios ofrecen',
            'necesito orientación',
            'menú de opciones',
            'ayúdame',
            'qué haces',
            'para qué sirves',
            'cómo te uso',
            'descubrir más funcionalidades',
            'volver al menú',
            'ir al menú',
            'menú principal',
            'ver opciones',
            'inicio',
            'otra consulta',
            'tengo otra duda',
            'quiero preguntar algo mas',
            'otra pregunta',
            'algo mas',
            'volver al inicio',
            // Company info questions
            'que es Santiago Papeleria',
            'quien es Santiago Papeleria',
            'cuentame sobre la empresa',
            'informacion de la empresa',
            'donde quedan',
            'que venden',
            'a que se dedican',
        ];
        helpExamples.forEach(ex =>
            this.manager.addDocument('es', ex, ChatIntent.GENERAL_HELP)
        );

        // ============== VIEW_OFFERS ==============
        const offersExamples = [
            'ver ofertas',
            'mostrar ofertas',
            'tienen descuentos',
            'promociones vigentes',
            'hay rebajas',
            'productos en oferta',
            'ofertas del mes',
            'quiero ver promociones',
            'enséñame los descuentos',
            'explorar ofertas',
            'ver catálogo de ofertas',
            'qué está en descuento',
        ];
        offersExamples.forEach(ex =>
            this.manager.addDocument('es', ex, ChatIntent.VIEW_OFFERS)
        );

        // ============== GREETING ==============
        const greetingExamples = [
            'hola',
            'buenos días',
            'buenas tardes',
            'buenas noches',
            'hey',
            'qué tal',
            'saludos',
            'hola qué tal',
            'buenas',
        ];
        greetingExamples.forEach(ex =>
            this.manager.addDocument('es', ex, ChatIntent.GREETING)
        );

        // ============== GRATITUDE ==============
        const gratitudeExamples = [
            'gracias',
            'muchas gracias',
            'te agradezco',
            'ok gracias',
            'mil gracias',
            'vale gracias',
            'gracias por la ayuda',
            'muy amable',
            'ok',
            'listo gracias',
            'perfecto gracias',
            'bueno gracias',
            'no gracias',
            'esta bien gracias',
            'genial gracias',
        ];
        gratitudeExamples.forEach(ex =>
            this.manager.addDocument('es', ex, ChatIntent.GRATITUDE)
        );

        // ============== OUT_OF_SCOPE ==============
        const outOfScopeExamples = [
            'cuál es la capital de francia',
            'qué hora es',
            'cómo está el clima',
            'cuéntame un chiste',
            'quién es el presidente',
            'noticias del día',
            'resultados de fútbol',
            'receta de cocina',
            'cómo hago ejercicio',
        ];
        outOfScopeExamples.forEach(ex =>
            this.manager.addDocument('es', ex, ChatIntent.OUT_OF_SCOPE)
        );

        // ============== NAVIGATION_HELP ==============
        // Profile related
        const navigationExamples = [
            // Profile
            { text: 'como veo mi perfil', destination: 'profile' },
            { text: 'quiero editar mis datos', destination: 'profile' },
            { text: 'donde cambio mi contraseña', destination: 'password' },
            { text: 'mi información personal', destination: 'profile' },
            { text: 'ver mi cuenta', destination: 'profile' },
            { text: 'configurar mi perfil', destination: 'profile' },

            // Addresses
            { text: 'como agrego una direccion', destination: 'addresses' },
            { text: 'quiero agregar direccion de envio', destination: 'addresses' },
            { text: 'cambiar mi direccion', destination: 'addresses' },
            { text: 'editar mis direcciones', destination: 'addresses' },
            { text: 'agregar nueva direccion', destination: 'addresses' },
            { text: 'gestionar mis direcciones', destination: 'addresses' },
            { text: 'donde pongo mi direccion', destination: 'addresses' },
            { text: 'añadir direccion', destination: 'addresses' },
            { text: 'donde cambio mi direccion', destination: 'addresses' },
            { text: 'mis direcciones', destination: 'addresses' },
            { text: 'nueva direccion', destination: 'addresses' },
            { text: 'gestion de direcciones', destination: 'addresses' },

            // Cart
            { text: 'donde esta mi carrito', destination: 'cart' },
            { text: 'ver mi carrito', destination: 'cart' },
            { text: 'quiero pagar', destination: 'cart' },
            { text: 'finalizar compra', destination: 'cart' },
            { text: 'ir al carrito', destination: 'cart' },
            { text: 'checkout', destination: 'cart' },

            // Orders
            { text: 'ver mis pedidos', destination: 'orders' },
            { text: 'historial de compras', destination: 'orders' },
            { text: 'mis compras anteriores', destination: 'orders' },
            { text: 'pedidos realizados', destination: 'orders' },

            // Tracking - REMOVED to avoid conflict with ORDER_TRACKING intent
            // Calls like "rastrear pedido" should go to ORDER_TRACKING handler which handles navigation smartly

            // Favorites
            { text: 'ver mis favoritos', destination: 'favorites' },
            { text: 'productos guardados', destination: 'favorites' },
            { text: 'mi lista de deseos', destination: 'favorites' },

            // Offers
            { text: 'donde estan las ofertas', destination: 'offers' },
            { text: 'ver promociones', destination: 'offers' },
            { text: 'productos en descuento', destination: 'offers' },

            // Products
            { text: 'ver el catalogo', destination: 'products' },
            { text: 'explorar productos', destination: 'products' },
            { text: 'ir al catalogo', destination: 'products' },

            // Contact
            { text: 'como los contacto', destination: 'contact' },
            { text: 'numero de telefono', destination: 'contact' },
            { text: 'pagina de contacto', destination: 'contact' },
            { text: 'donde los encuentro', destination: 'contact' },

            // Login
            { text: 'iniciar sesión', destination: 'login' },
            { text: 'como entro a mi cuenta', destination: 'login' },
            { text: 'login', destination: 'login' },
            { text: 'entrar a mi cuenta', destination: 'login' },

            // Register
            { text: 'crear cuenta', destination: 'register' },
            { text: 'registrarme', destination: 'register' },
            { text: 'soy nuevo', destination: 'register' },
            { text: 'como me registro', destination: 'register' },
            { text: 'abrir cuenta', destination: 'register' },

            // Forgot password
            { text: 'olvide mi contraseña', destination: 'forgot_password' },
            { text: 'recuperar acceso', destination: 'forgot_password' },
            { text: 'no puedo entrar a mi cuenta', destination: 'forgot_password' },
            { text: 'resetear contraseña', destination: 'forgot_password' },

            // Branches
            { text: 'ver sucursales', destination: 'branches' },
            { text: 'donde quedan las sucursales', destination: 'branches' },
            { text: 'ubicacion de sucursales', destination: 'branches' },
            { text: 'mapa de sucursales', destination: 'branches' },
            { text: 'que sucursales tienen', destination: 'branches' },
            { text: 'que sucursales maneja Santiago Papeleria', destination: 'branches' },
        ];

        navigationExamples.forEach(ex => {
            this.manager.addDocument('es', ex.text, ChatIntent.NAVIGATION_HELP);

            // Extract keywords for entity mapping
            // Map "sucursales" -> "branches", "direccion" -> "addresses", etc.
            const keywords = this.extractKeywords(ex.text);
            if (keywords.length > 0) {
                this.manager.addNamedEntityText('destination', ex.destination, ['es'], keywords);
            } else {
                // Fallback: use the destination itself if no logical keyword found (fallback for exact matches)
                this.manager.addNamedEntityText('destination', ex.destination, ['es'], [ex.destination]);
            }
        });

        // ============== RETURNS ==============
        // ============== RETURNS (Action) ==============
        const returnsExamples = [
            'quiero devolver un producto',
            'devolver mi compra',
            'quiero un reembolso',
            'me equivoque de producto',
            'el producto llego dañado',
            'necesito hacer un cambio',
            'cambio de producto',
            'como solicito devolucion', // Can be action
            'reembolso de compra',
            'iniciar devolucion',
            'solicitar cambio',
            'tramitar devolucion',
            'empezar proceso de devolucion',
            'devolver',
            'quiero devolver',
            'hacer devolucion',
            'devolución',
        ];
        returnsExamples.forEach(ex =>
            this.manager.addDocument('es', ex, ChatIntent.RETURNS)
        );

        // ============== RETURN_POLICY (Info) ==============
        const returnPolicyExamples = [
            'politica de devoluciones',
            'como funcionan las devoluciones',
            'cuanto tiempo tengo para devolver',
            'requisitos de devolucion',
            'condiciones de cambio',
            'devoluciones y cambios',
            'proceso de devolucion',
            'informacion sobre devoluciones',
            'reglas de devolucion',
            'cuales son los plazos de devolucion',
            'normas de reembolso',
            'se puede devolver si esta abierto',
            'aceptan devoluciones',
            'política de reembolso',
            'quiero saber sobre devoluciones',
        ];
        returnPolicyExamples.forEach(ex =>
            this.manager.addDocument('es', ex, ChatIntent.RETURN_POLICY)
        );

        // ============== ORDER_TRACKING ==============
        const trackingExamples = [
            'cual es mi codigo de envio',
            'como rastreo mi pedido',
            'numero de seguimiento',
            'guia de envio',
            'como uso el tracking',
            'donde veo mi envio',
            'no se como rastrear',
            'como funciona el rastreo',
            'quiero rastrear mi paquete',
            'donde pongo el codigo de rastreo',
            'mi guia de transporte',
            // Specific variations causing issues
            'donde esta mi pedido',
            'donde esta mi orden',
            'donde esta mi paquete',
            'donde esta mi envio',
            'ubicación de mi pedido',
            'saber donde viene mi pedido',
            'codigo de guia',
            'dame mi tracking',
        ];
        trackingExamples.forEach(ex =>
            this.manager.addDocument('es', ex, ChatIntent.ORDER_TRACKING)
        );

        // ============== ORDER_PROCESS ==============
        const processExamples = [
            'como es el proceso de compra',
            'que pasa despues de comprar',
            'me notifican del pedido',
            'como se cuando llega',
            'me avisan del envio',
            'recibo notificaciones',
            'como funciona el envio',
            'que pasa despues de pagar',
            'me llegan correos del pedido',
            'como me entero del estado',
            'proceso de despacho',
        ];
        processExamples.forEach(ex =>
            this.manager.addDocument('es', ex, ChatIntent.ORDER_PROCESS)
        );

        // ============== Named Entity Recognition (NER) ==============
        // Product types
        const productEntities = [
            'mochila', 'mochilas', 'cuaderno', 'cuadernos', 'lápiz', 'lápices',
            'lapiz', 'lapices', 'carpeta', 'carpetas', 'calculadora', 'calculadoras',
            'regla', 'reglas', 'borrador', 'borradores', 'tijera', 'tijeras',
            'pegamento', 'marcador', 'marcadores', 'agenda', 'agendas',
            'estuche', 'estuches', 'pluma', 'plumas', 'tempera', 'temperas',
            'crayola', 'crayolas', 'plastilina', 'colores', 'acuarela',
            'papel', 'hojas', 'folder', 'folders', 'goma', 'sacapuntas',
        ];

        productEntities.forEach(product => {
            this.manager.addNamedEntityText('product', product, ['es'], [product]);
        });

        this.logger.debug(`Added training data: ${productSearchExamples.length + orderStatusExamples.length + pricingExamples.length + humanExamples.length + helpExamples.length + greetingExamples.length + outOfScopeExamples.length + navigationExamples.length} examples`);
    }

    /**
     * Process a message and return intent classification
     */
    async complete(prompt: string): Promise<LlmResponse> {
        if (!this.isReady) {
            await this.initializeAndTrain();
        }

        const startTime = Date.now();

        // Extract user message from prompt if formatted
        const userMessageMatch = prompt.match(/MENSAJE DEL USUARIO:\s*(.+)$/s);
        const userMessage = userMessageMatch ? userMessageMatch[1].trim() : prompt.trim();

        // Process with NLP.js
        const result = await this.manager.process('es', userMessage);

        const latencyMs = Date.now() - startTime;

        // Map NLP.js result to our format
        let intent: ChatIntent = ChatIntent.UNCLEAR;
        let confidence = result.score || 0;

        // NLP.js returns 'None' when no intent is detected
        const rawIntent = result.intent as string;

        // If valid intent detected with good confidence
        if (rawIntent && rawIntent !== 'None' && confidence >= 0.5) {
            if (VALID_INTENTS.includes(rawIntent as ChatIntent)) {
                intent = rawIntent as ChatIntent;
            }
        }

        // Extract entities
        const entities: Record<string, any> = {};

        // Get product entities
        if (result.entities && result.entities.length > 0) {
            const productEntity = result.entities.find((e: any) => e.entity === 'product');
            if (productEntity) {
                entities.searchTerm = productEntity.option || productEntity.sourceText;
            }
        }

        // For product search, try to extract search term from the message
        if (intent === ChatIntent.PRODUCT_SEARCH && !entities.searchTerm) {
            entities.searchTerm = this.extractSearchTermFallback(userMessage);
        }

        this.logger.debug(
            `NLP.js: "${userMessage.substring(0, 30)}..." → ${intent} (${(confidence * 100).toFixed(1)}%) in ${latencyMs}ms`
        );

        return {
            raw: JSON.stringify(result),
            parsed: {
                intent,
                confidence,
                entities,
                originalText: userMessage,
            },
            latencyMs,
        };
    }

    /**
     * Fallback search term extraction for product searches
     */
    private extractSearchTermFallback(text: string): string {
        const lowerText = text.toLowerCase();

        // Known product keywords
        const products = [
            'mochila', 'mochilas', 'cuaderno', 'cuadernos', 'lápiz', 'lápices',
            'lapiz', 'lapices', 'carpeta', 'carpetas', 'calculadora', 'calculadoras',
            'regla', 'reglas', 'borrador', 'marcador', 'agenda', 'estuche',
            'pluma', 'tempera', 'crayola', 'plastilina', 'colores', 'papel', 'folder',
        ];

        for (const product of products) {
            if (lowerText.includes(product)) {
                return product;
            }
        }

        // Remove common words and return the rest
        const stopWords = [
            'buscar', 'busca', 'busco', 'buscame', 'búscame', 'buscando',
            'quiero', 'quisiera', 'queria', 'querría', 'necesito', 'necesitaria',
            'dame', 'deme', 'tienes', 'tienen', 'venden', 'venderan', 'venderán', 'vendan', 'vendés', 'vendes',
            'hay', 'existe', 'tewndran', 'tendran', 'tendrán',
            'ver', 'mostrar', 'muéstrame', 'muestrame', 'encontrar', 'podrias', 'podrías', 'puedo', 'puedes',
            'productos', 'producto', 'artículos', 'articulos', 'cosas', 'algo',
            'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del',
            'para', 'con', 'por', 'favor', 'me', 'te', 'yo', 'que', 'ayudes', 'ayudar', 'saber', 'conocer',
            'tambien', 'también', 'entonces', 'luego', 'pero', 'y', 'o', 'si', 'no', 'pregunto', 'preguntar',
            // Extended - common filler words
            'en', 'tu', 'su', 'mi', 'catalogo', 'catálogo', 'tienda', 'aquí', 'aqui', 'aca',
            'bueno', 'bien', 'claro', 'seguro', 'pues', 'como', 'cómo', 'donde', 'dónde',
        ];

        let cleaned = lowerText;

        // Remove stop words (whole words only)
        stopWords.forEach(word => {
            cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
        });

        // Remove punctuation and extra spaces
        cleaned = cleaned.replace(/[¿?¡!,.;:()]/g, '').replace(/\s+/g, ' ').trim();

        return cleaned;
    }

    private extractKeywords(text: string): string[] {
        const keywords: string[] = [];
        if (text.includes('sucursales') || text.includes('sucursal')) keywords.push('sucursales', 'sucursal', 'tienda', 'local');
        if (text.includes('direccion') || text.includes('direcciones')) keywords.push('direccion', 'direcciones', 'domicilio', 'envio');
        if (text.includes('oferta') || text.includes('promocion')) keywords.push('ofertas', 'oferta', 'promociones', 'descuento');
        if (text.includes('catalogo') || text.includes('producto')) keywords.push('catalogo', 'productos', 'tienda virtual');
        if (text.includes('pedido') || text.includes('orden')) keywords.push('pedido', 'orden', 'mis pedidos', 'historial');
        if (text.includes('perfil') || text.includes('cuenta')) keywords.push('perfil', 'mi cuenta', 'usuario');
        if (text.includes('favoritos') || text.includes('lista')) keywords.push('favoritos', 'lista de deseos');
        if (text.includes('contraseña') || text.includes('clave')) keywords.push('contraseña', 'clave', 'recuperar');
        return keywords;
    }

    async healthCheck(): Promise<boolean> {
        return this.isReady;
    }
}
