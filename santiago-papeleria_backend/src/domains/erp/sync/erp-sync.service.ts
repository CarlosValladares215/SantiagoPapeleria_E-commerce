import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CategoryClassifierService } from '../classification/category-classifier.service';
import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import { ProductERP } from '../../products/schemas/product-erp.schema';
import { Producto } from '../../products/schemas/producto.schema';
import { SyncLog } from './schemas/sync-log.schema';
import { ErpConfig } from './schemas/erp-config.schema';
import { EmailService } from '../../users/services/email.service';
import { MovimientosService } from '../../products/inventory/movimientos.service';
import { Categoria, CategoriaDocument } from '../../products/schemas/categoria.schema';

@Injectable()
export class ErpSyncService {
    private readonly logger = new Logger(ErpSyncService.name);
    // Default to localhost, will be overridden by env in module or constructor (simplified here)
    private erpUrl = process.env.ERP_URL || 'http://localhost:4000/matrix/ports/acme/af58yz';

    constructor(
        @InjectModel(ProductERP.name) private productERPModel: Model<ProductERP>,
        @InjectModel(Producto.name) private productoModel: Model<Producto>,
        @InjectModel(SyncLog.name) private syncLogModel: Model<SyncLog>,
        @InjectModel(ErpConfig.name) private erpConfigModel: Model<ErpConfig>,
        @InjectModel(Categoria.name) private categoriaModel: Model<CategoriaDocument>,
        private readonly httpService: HttpService,
        @Inject(forwardRef(() => EmailService))
        private emailService: EmailService,
        private movimientosService: MovimientosService,
        private readonly classifierService: CategoryClassifierService
    ) { }

    // ... existing code ...

    /**
     * Test connection to ERP
     */
    async testConnection(): Promise<any> {
        try {
            const url = `${this.erpUrl}?CMD=STO_MTX_CAT_PRO&TOP=5`;
            this.logger.debug(`Testing connection to: ${url}`);
            const response = await firstValueFrom(
                this.httpService.get(url)
            );

            return {
                status: 'connected',
                message: 'Conexión exitosa con DobraNet',
                productos: response.data.length,
                timestamp: new Date(),
            };
        } catch (error) {
            this.logger.error('Error testing ERP connection:', error.message);
            return {
                status: 'disconnected',
                message: error.message,
                timestamp: new Date(),
            };
        }
    }

    /**
     * Main synchronization method
     */
    async syncProducts(triggeredBy = 'manual'): Promise<any> {
        const startTime = new Date();
        this.logger.log('🔄 Iniciando sincronización con DobraNet...');

        const logEntry = new this.syncLogModel({
            status: 'partial',
            startTime,
            triggeredBy,
            productsProcessed: 0,
            productsCreated: 0,
            productsUpdated: 0,
            errors: []
        });
        await logEntry.save();

        try {
            // STEP 1: Fetch products from ERP
            const response = await firstValueFrom(
                this.httpService.get(`${this.erpUrl}?CMD=STO_MTX_CAT_PRO`)
            );

            const erpProducts = response.data;
            this.logger.log(`📥 Recibidos ${erpProducts.length} productos del ERP`);

            logEntry.productsProcessed = erpProducts.length;

            // STEP 2: Sync to productos_erp collection (raw ERP data)
            await this.syncToERPCollection(erpProducts);

            // STEP 3: Sync to productos collection (enriched data)
            const enrichedResult = await this.syncToEnrichedCollection();

            const endTime = new Date();
            const durationMs = endTime.getTime() - startTime.getTime();
            const durationSec = (durationMs / 1000).toFixed(2);

            // Update success log
            logEntry.status = 'success';
            logEntry.endTime = endTime;
            logEntry.duration = `${durationSec}s`;
            logEntry.productsCreated = enrichedResult.created;
            logEntry.productsUpdated = enrichedResult.updated;

            await logEntry.save();

            const result = {
                status: 'success',
                ...enrichedResult,
                duration: `${durationSec}s`,
                timestamp: endTime,
            };

            this.logger.log(`✅ Sincronización completada en ${durationSec}s`);

            // Send email notification based on config
            await this.sendSyncNotification(result, triggeredBy);

            return result;

        } catch (error) {
            this.logger.error('❌ Error en sincronización:', error.message);

            // Update error log
            logEntry.status = 'error';
            logEntry.endTime = new Date();
            logEntry.errors.push(error.message);
            await logEntry.save();

            // Send error notification
            await this.sendSyncNotification(
                { status: 'error', errorMessage: error.message, errorDetails: error.stack },
                triggeredBy
            );

            throw error;
        }
    }

    /**
     * Send email notification based on sync result and config
     */
    private async sendSyncNotification(result: any, triggeredBy: string): Promise<void> {
        try {
            const config = await this.getConfig();

            // Check if notifications are enabled
            const isSuccess = result.status === 'success';
            const isError = result.status === 'error';
            const hasWarnings = (result.stockBajo > 0 || result.stockAgotado > 0);

            // Determine if we should send based on config
            const shouldSendSuccess = isSuccess && !hasWarnings && config.notifySuccess;
            const shouldSendWarning = isSuccess && hasWarnings && (config.notifySuccess || config.notifyErrors);
            const shouldSendError = isError && config.notifyErrors;

            if (!shouldSendSuccess && !shouldSendWarning && !shouldSendError) {
                this.logger.debug('Email notification skipped based on config');
                return;
            }

            const alertEmail = config.alertEmail;
            if (!alertEmail) {
                this.logger.warn('alertEmail not configured, skipping notification');
                return;
            }

            // Determine type
            let type: 'success' | 'warning' | 'error' = 'success';
            if (isError) type = 'error';
            else if (hasWarnings) type = 'warning';

            // Add triggeredBy to result for email template
            const emailResult = { ...result, triggeredBy };

            await this.emailService.sendErpSyncNotification(alertEmail, emailResult, type);
            this.logger.log(`📧 Email de sincronización (${type}) enviado a ${alertEmail}`);
        } catch (error) {
            this.logger.error('Error sending sync notification email:', error.message);
            // Don't throw - email failure shouldn't break sync
        }
    }

    /**
     * Sync raw ERP data to productos_erp collection
     */
    private async syncToERPCollection(erpProducts: any[]): Promise<void> {
        if (erpProducts.length === 0) return;

        this.logger.log(`💾 Syncing ${erpProducts.length} products to Local ERP Collection...`);

        // We use bulkWrite but we also want to log changes. 
        // To do this efficiently, we might need to fetch existing stocks first.
        // Or we can iterate one by one if performance permits (for < 2000 products it's okay).
        // Let's iterate for better control over logging.
        // Let's iterate for better control over logging.
        const operations: any[] = [];

        for (const product of erpProducts) {
            const productCode = product.COD;
            const newStock = Number(product.STK) || 0;

            if (operations.length < 3) {
                console.log('[ErpSync] Raw Product Sample:', JSON.stringify(product));
            }

            // Fetch previous to compare stock
            const previous = await this.productERPModel.findOne({ codigo: productCode }).select('stock').lean();

            if (previous && previous.stock !== newStock) {
                // Log Movement
                await this.movimientosService.registrarMovimiento({
                    producto_id: previous._id as any,
                    sku: productCode,
                    tipo: 'SYNC_ERP',
                    cantidad: newStock - previous.stock,
                    stock_anterior: previous.stock,
                    stock_nuevo: newStock,
                    referencia: 'SYNC_AUTO'
                });
            }

            operations.push({
                updateOne: {
                    filter: { codigo: productCode },
                    update: {
                        $set: {
                            nombre: product.NOM,
                            descripcion: product.NOT || '',
                            imagen: product.FOT || '',
                            linea_codigo: product.LIN || '',
                            row_id: product.ROW || 0,
                            marca: product.MRK || '',
                            categoria_g1: product.G1 || '',
                            categoria_g2: product.G2 || '',
                            categoria_g3: product.G3 || '',
                            categoria_linea_cod: product.LIN || '000',
                            precio_pvp: product.PVP || 0,
                            precio_pvm: product.PVM || 0,
                            stock: newStock,
                            iva: product.IVA === 15 || product.IVA === true,
                            codigo_barras: product.BAR || '',
                            ultima_sync: new Date(),
                            activo: true,
                            peso_erp: product.PES || 0,
                            dimensiones_erp: product.DIM || { L: 0, A: 0, H: 0 },
                            specs_erp: product.SPC || [],
                        },
                    },
                    upsert: true,
                },
            });
        }

        if (operations.length > 0) {
            console.log(`[ErpSync] Executing bulkWrite with ${operations.length} operations...`);
            const result = await this.productERPModel.bulkWrite(operations as any[]);
            console.log(`[ErpSync] BulkWrite Result: upserted=${result.upsertedCount}, modified=${result.modifiedCount}`);
            this.logger.log(`📦 ERP Collection: ${result.upsertedCount} nuevos, ${result.modifiedCount} actualizados`);
        } else {
            console.log(`[ErpSync] No operations to execute!`);
        }
    }
    /**
     * Sync from productos_erp to productos (enriched)
     */
    private async syncToEnrichedCollection(): Promise<any> {
        // Only fetch active ERP products
        const erpProducts = await this.productERPModel.find({ activo: true });

        let created = 0;
        let updated = 0;
        let skipped = 0;
        let stockBajo = 0; // HU78: Contador de productos con stock bajo
        let stockAgotado = 0; // HU78: Contador de productos agotados

        for (const erpProduct of erpProducts) {
            const existingProduct = await this.productoModel.findOne({
                codigo_interno: erpProduct.codigo,
            });

            const imageUrl = erpProduct.imagen?.startsWith('http')
                ? erpProduct.imagen
                : (erpProduct.imagen ? `http://localhost:4000/data/photos/${erpProduct.imagen}` : '');

            if (!existingProduct) {
                // CREATE new enriched product
                try {
                    // Resolve category ObjectIds for robust references
                    const categoryIds = await this.resolveCategoryIds(erpProduct);

                    await this.productoModel.create({
                        codigo_interno: erpProduct.codigo,
                        sku_barras: erpProduct.codigo_barras || 'S/N',
                        nombre: erpProduct.nombre,
                        slug: this.generateSlug(erpProduct.nombre) + '-' + erpProduct.codigo,
                        activo: true,
                        es_publico: true, // Requisito: Visibilidad Automática
                        palabras_clave: [],

                        clasificacion: {
                            linea: erpProduct.categoria_g1 || 'SIN_LINEA',
                            grupo: erpProduct.categoria_g2 || 'SIN_GRUPO',
                            marca: erpProduct.marca || 'GENERICO',
                        },

                        // Category ObjectId references (robust)
                        categoria_linea_id: categoryIds.linea_id,
                        categoria_grupo_id: categoryIds.grupo_id,
                        categoria_sub_id: categoryIds.sub_id,

                        precios: {
                            pvp: erpProduct.precio_pvp,
                            pvm: erpProduct.precio_pvm,
                            moneda: 'USD',
                            incluye_iva: erpProduct.iva,
                        },

                        stock: {
                            total_disponible: erpProduct.stock,
                            controlar_stock: true,
                            bodegas: [],
                            estado_stock: this.calculateStockStatus(erpProduct.stock, 5),
                            umbral_stock_alerta: 5,
                        },

                        multimedia: {
                            principal: imageUrl,
                            galeria: [],
                        },

                        auditoria: {
                            fecha_creacion: new Date(),
                            ultima_sincronizacion_dobranet: new Date(),
                        },


                        priceTiers: this.generatePriceTiers(erpProduct.precio_pvp, erpProduct.precio_pvm),
                        peso_kg: (erpProduct as any).peso_erp || 0,
                        dimensiones: {
                            largo: (erpProduct as any).dimensiones_erp?.L || 0,
                            ancho: (erpProduct as any).dimensiones_erp?.A || 0,
                            alto: (erpProduct as any).dimensiones_erp?.H || 0,
                        },
                        descripcion_extendida: erpProduct.descripcion || '',
                        specs: (erpProduct as any).specs_erp || [],
                    });
                    created++;
                } catch (err) {
                    this.logger.error(`Error creating enriched product ${erpProduct.codigo}: ${err.message}`);
                }
            } else {
                // Get current threshold or use default
                const umbral = existingProduct.stock?.umbral_stock_alerta || 5;
                const nuevoEstadoStock = this.calculateStockStatus(erpProduct.stock, umbral);

                // HU78: Detectar cambios de estado de stock para alertas
                const estadoAnterior = existingProduct.stock?.estado_stock || 'normal';
                if (nuevoEstadoStock !== estadoAnterior) {
                    if (nuevoEstadoStock === 'bajo') {
                        stockBajo++;
                        this.logger.warn(`⚠️ Stock bajo detectado: ${erpProduct.codigo} - ${erpProduct.nombre} (${erpProduct.stock} unidades)`);
                    } else if (nuevoEstadoStock === 'agotado') {
                        stockAgotado++;
                        this.logger.warn(`🚨 Producto agotado: ${erpProduct.codigo} - ${erpProduct.nombre}`);
                    }
                }

                // UPDATE
                // Resolve category ObjectIds for robust references during update
                const categoryIds = await this.resolveCategoryIds(erpProduct);

                const updateDoc = {
                    'nombre': erpProduct.nombre,
                    'descripcion_extendida': erpProduct.descripcion || '',
                    'multimedia.principal': imageUrl,

                    // Category ObjectId references (robust)
                    'categoria_linea_id': categoryIds.linea_id,
                    'categoria_grupo_id': categoryIds.grupo_id,
                    'categoria_sub_id': categoryIds.sub_id,

                    'precios.pvp': erpProduct.precio_pvp,
                    'precios.pvm': erpProduct.precio_pvm,
                    'precios.incluye_iva': erpProduct.iva,
                    'priceTiers': this.generatePriceTiers(erpProduct.precio_pvp, erpProduct.precio_pvm),
                    'stock.total_disponible': erpProduct.stock,
                    'stock.estado_stock': nuevoEstadoStock, // HU78
                    'clasificacion.marca': erpProduct.marca,
                    'clasificacion.grupo': erpProduct.categoria_g2,
                    'clasificacion.linea': erpProduct.categoria_g1,
                    'auditoria.ultima_sincronizacion_dobranet': new Date(),
                    'specs': (erpProduct as any).specs_erp || [],
                    'peso_kg': (erpProduct as any).peso_erp || 0,
                    'dimensiones.largo': (erpProduct as any).dimensiones_erp?.L || 0,
                    'dimensiones.ancho': (erpProduct as any).dimensiones_erp?.A || 0,
                    'dimensiones.alto': (erpProduct as any).dimensiones_erp?.H || 0,
                };

                await this.productoModel.updateOne(
                    { codigo_interno: erpProduct.codigo },
                    { $set: updateDoc }
                );
                updated++;
            }
        }

        this.logger.log(`📝 Productos Enriquecidos: ${created} creados, ${updated} actualizados`);

        // HU78: Log de alertas de stock
        if (stockBajo > 0 || stockAgotado > 0) {
            this.logger.warn(`📦 Alertas de Stock: ${stockBajo} bajo stock, ${stockAgotado} agotados`);
        }

        return { created, updated, total: erpProducts.length, stockBajo, stockAgotado };
    }

    /**
     * HU78: Calcula el estado del stock basado en cantidad y umbral
     */
    private calculateStockStatus(cantidad: number, umbral: number): string {
        if (cantidad <= 0) return 'agotado';
        if (cantidad <= umbral) return 'bajo';
        return 'normal';
    }

    /**
     * Resolves category ObjectIds by matching names from ERP data against categorias collection.
     * This creates robust references that won't break if category names change slightly.
     */
    private async resolveCategoryIds(erpProduct: any): Promise<{
        linea_id?: Types.ObjectId;
        grupo_id?: Types.ObjectId;
        sub_id?: Types.ObjectId;
    }> {
        const result: any = {};

        try {
            // Resolve nivel 1 (linea) - top level category
            if (erpProduct.categoria_g1) {
                const cat = await this.categoriaModel.findOne({
                    nombre: { $regex: `^${this.escapeRegex(erpProduct.categoria_g1)}$`, $options: 'i' },
                    nivel: 1
                }).select('_id').lean();
                if (cat) result.linea_id = cat._id;
            }

            // Resolve nivel 2 (grupo) - subcategory
            if (erpProduct.categoria_g2) {
                const cat = await this.categoriaModel.findOne({
                    nombre: { $regex: `^${this.escapeRegex(erpProduct.categoria_g2)}$`, $options: 'i' }
                }).select('_id').lean();
                if (cat) result.grupo_id = cat._id;
            }

            // Resolve nivel 3 (sub) if different from grupo
            if (erpProduct.categoria_g3 && erpProduct.categoria_g3 !== erpProduct.categoria_g2) {
                const cat = await this.categoriaModel.findOne({
                    nombre: { $regex: `^${this.escapeRegex(erpProduct.categoria_g3)}$`, $options: 'i' }
                }).select('_id').lean();
                if (cat) result.sub_id = cat._id;
            }
        } catch (err) {
            this.logger.warn(`Error resolving category IDs for ${erpProduct.codigo}: ${err.message}`);
        }

        return result;
    }

    /**
     * Escapes special regex characters in a string
     */
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }


    /**
     * Generate URL-friendly slug from product name
     */
    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .normalize('NFD') // Decompose combined characters
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
            .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphen
            .replace(/^-+|-+$/g, ''); // Trim hyphens
    }

    /**
     * Cron job - daily at 2 AM
     * Uses CronExpression or string pattern
     */
    @Cron('0 2 * * *', {
        name: 'erp-sync',
        timeZone: 'America/Guayaquil',
    })
    async handleCron() {
        this.logger.log('⏰ Ejecutando sincronización automática programada...');
        await this.syncProducts('cron');
    }

    /**
     * Get dashboard metrics
     */
    async getDashboardMetrics(): Promise<any> {
        const totalProducts = await this.productoModel.countDocuments();
        const lastSync = await this.syncLogModel.findOne().sort({ startTime: -1 });

        // Calculate success rate (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const totalLogs = await this.syncLogModel.countDocuments({ startTime: { $gte: thirtyDaysAgo } });
        const successLogs = await this.syncLogModel.countDocuments({
            startTime: { $gte: thirtyDaysAgo },
            status: 'success'
        });

        const successRate = totalLogs > 0 ? Math.round((successLogs / totalLogs) * 100) : 100;

        // Calculate today's new products
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayNewProducts = await this.productoModel.countDocuments({
            'auditoria.fecha_creacion': { $gte: todayStart }
        });

        // Calculate pending errors from recent syncs
        const recentErrorLogs = await this.syncLogModel.find({
            startTime: { $gte: thirtyDaysAgo },
            'errors.0': { $exists: true } // Has at least one error
        });
        const pendingErrors = recentErrorLogs.reduce((acc, log) => acc + (log.errors?.length || 0), 0);

        return {
            totalProducts,
            lastSync: lastSync ? {
                date: lastSync.startTime,
                status: lastSync.status,
                duration: lastSync.duration
            } : null,
            successRate, // Now a number, not a string with %
            todayNewProducts,
            pendingErrors,
            nextSync: this.getNextCronTime()
        };
    }

    /**
     * Get sync logs
     */
    async getSyncLogs(limit = 50): Promise<any[]> {
        return this.syncLogModel.find().sort({ startTime: -1 }).limit(limit).exec();
    }

    private getNextCronTime(): Date {
        // Simple calculation for "tomorrow at 2 AM"
        const now = new Date();
        const next = new Date();
        next.setHours(2, 0, 0, 0);
        if (now > next) {
            next.setDate(next.getDate() + 1);
        }
        return next;
    }

    /**
     * Get product from ERP by code
     */
    async getProductFromERP(codigo: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.erpUrl}?CMD=STO_MTX_FIC_PRO&COD=${codigo}`)
            );
            return response.data;
        } catch (error) {
            this.logger.error(`Error fetching product ${codigo}:`, error.message);
            throw error;
        }
    }

    /**
     * Send order to ERP
     */
    async sendOrderToERP(orderData: any): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.post(`${this.erpUrl}?CMD=STO_MTX_ORD_VEN`, orderData)
            );

            if (response.data.STA === 'OK') {
                this.logger.log(`✅ Orden enviada: ${response.data['ORDVEN-NUM']}`);
            }

            return response.data;
        } catch (error) {
            this.logger.error('Error sending order:', error.message);
            throw error;
        }
    }

    /**
     * Send product update (restriction: NOM and NOT only) to ERP
     */
    async updateProductInErp(codigo: string, data: { nombre?: string; descripcion?: string }): Promise<any> {
        try {
            const payload = {
                COD: codigo,
                ...(data.nombre && { NOM: data.nombre }),
                ...(data.descripcion && { NOT: data.descripcion })
            };

            this.logger.log(`📤 Enviando actualización al ERP para ${codigo}...`);
            const response = await firstValueFrom(
                this.httpService.post(`${this.erpUrl}?CMD=STO_MTX_UPD_PRO`, payload)
            );

            if (response.data.STA === 'OK') {
                this.logger.log(`✅ Producto ${codigo} actualizado en ERP`);
            } else {
                this.logger.warn(`⚠️ ERP rechazó actualización: ${response.data.MSG}`);
            }

            return response.data;
        } catch (error) {
            this.logger.error(`Error updating product ${codigo} in ERP:`, error.message);
            throw error;
        }
    }

    /**
     * Simulate Admin enrichment
     */
    async simulateEnrichment(codigo: string): Promise<any> {
        const update = {
            'multimedia.principal': 'https://example.com/demo-image.jpg',
            'multimedia.galeria': ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
            'priceTiers': [
                { min: 10, max: 50, discount: 5, label: 'Mayorista', badge: '5% OFF' }
            ]
        };

        const result = await this.productoModel.updateOne(
            { codigo_interno: codigo },
            { $set: update }
        );

        return {
            status: 'enriched',
            codigo,
            modified: result.modifiedCount,
            data: update
        };
    }

    async getEnrichedProduct(codigo: string): Promise<any> {
        // Use lean() for plain object
        return this.productoModel.findOne({ codigo_interno: codigo }).lean().exec();
    }

    /**
     * Helper: Convert ERP weight (often in grams) to Kg
     * Rules:
     * 1. If > 1000, assume grams and divide by 1000.
     * 2. Round to 2 decimal places.
     * 3. If < 0.01, return 0 (flag for invalid/missing).
     */
    private calculateWeightInKg(rawWeight: any): number {
        if (rawWeight === null || rawWeight === undefined) return 0;

        let weight = Number(rawWeight);
        if (isNaN(weight)) return 0;

        // Heuristic: If weight is large (> 1000), assume grams
        if (weight > 1000) {
            weight = weight / 1000;
        }

        // Round to 2 decimals
        weight = Math.round(weight * 100) / 100;

        // Edge Case: Minimum valid weight
        if (weight < 0.01) {
            return 0; // Return 0 to indicate "invalid" or "needs enrichment"
        }

        return weight;
    }

    /**
     * Get raw ERP data for frontend simulation/manual sync
     */
    async fetchRawErpData(): Promise<any[]> {
        const url = `${this.erpUrl}?CMD=STO_MTX_CAT_PRO`;
        try {
            const response = await firstValueFrom(this.httpService.get(url));
            return response.data;
        } catch (error) {
            this.logger.error(`Error fetching raw ERP data: ${error.message}`);
            throw error;
        }
    }

    // --- Configuration Methods ---

    async getConfig(): Promise<any> {
        // Ensure one config doc exists
        let config = await this.erpConfigModel.findOne().exec();
        if (!config) {
            config = await this.erpConfigModel.create({});
        }
        return config;
    }

    async syncCategories(): Promise<any> {
        this.logger.log('🔄 Sincronizando árbol de categorías...');
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.erpUrl}?CMD=STO_MTX_CAT_LIN`)
            );
            console.log('[ErpSyncService] Raw Response type:', typeof response.data);
            console.log('[ErpSyncService] Raw Response keys:', Object.keys(response.data));

            // The simulator returns { root: { ... } } or just the root object
            const root = response.data.root || response.data;

            if (!root || !root.DAT) {
                throw new Error('Formato de categorías no válido');
            }

            // We skip Level 1 (MERCADERIA) and start with Level 2 (DAT of root)
            const level2Categories = root.DAT;
            console.log(`[ErpSyncService] Processing ${level2Categories.length} Level 2 categories`);

            // Clear current categories or do a smart sync? 
            // For categories, a clean sync is often easier if the structure is small.
            // But let's do an upsert for safety.

            let processed = 0;
            for (const cat2 of level2Categories) {
                try {
                    console.log(`[ErpSyncService] Processing category: ${cat2.NOM} (ID: ${cat2.ID})`);
                    await this.processCategoryBranch(cat2, null, 1);
                    processed++;
                } catch (catErr) {
                    console.error(`[ErpSyncService] Error processing category ${cat2.NOM}:`, catErr);
                    throw catErr; // Re-throw to see in final response
                }
            }

            this.logger.log(`✅ Sincronización de categorías completada: ${processed} grupos procesados`);
            return { status: 'success', processed };
        } catch (error) {
            this.logger.error('❌ Error sincronizando categorías:', error.message);
            throw error;
        }
    }

    private async processCategoryBranch(erpCat: any, padreId: Types.ObjectId | null, nivel: number): Promise<Types.ObjectId> {
        const slug = this.generateSlug(erpCat.NOM);
        let currentId: Types.ObjectId;

        if (nivel === 1) {
            // Classify top level categories (which are Level 2 in ERP)
            const classification = await this.classifierService.classify(erpCat.NOM);
            console.log(`[ErpSyncService] Classified '${erpCat.NOM}' -> '${classification.name}' (Score: ${classification.score.toFixed(2)})`);

            // Upsert Categoria
            const updateDoc: any = {
                id_erp: erpCat.ID,
                codigo: erpCat.COD || `CAT-${erpCat.ID}`,
                nombre: erpCat.NOM,
                nivel: nivel,
                padre: padreId,
                activo: true,
                slug: this.generateSlug(erpCat.NOM),
                super_categoria: classification.name // Save the Super Category
            };

            const doc = await this.categoriaModel.findOneAndUpdate(
                { id_erp: erpCat.ID },
                updateDoc,
                { upsert: true, new: true }
            );
            currentId = doc._id as Types.ObjectId;
        } else {
            // Subcategories inherit super_categoria of parent? Or we ignore it as we group by top level.
            // Usually we group by Top Level, so subcategories are just nested.
            const updateDoc: any = {
                id_erp: erpCat.ID,
                codigo: erpCat.COD || `CAT-${erpCat.ID}`,
                nombre: erpCat.NOM,
                nivel: nivel,
                padre: padreId,
                activo: true,
                slug: this.generateSlug(erpCat.NOM)
            };

            const doc = await this.categoriaModel.findOneAndUpdate(
                { id_erp: erpCat.ID },
                updateDoc,
                { upsert: true, new: true }
            );
            currentId = doc._id as Types.ObjectId;
        }

        // Process children
        const hijosIds: Types.ObjectId[] = [];
        if (erpCat.DAT && Array.isArray(erpCat.DAT)) {
            for (const hijo of erpCat.DAT) {
                const hijoId = await this.processCategoryBranch(hijo, currentId, nivel + 1);
                hijosIds.push(hijoId);
            }
        }

        // Update hijos reference
        await this.categoriaModel.updateOne({ _id: currentId }, { $set: { hijos: hijosIds } });

        return currentId;
    }

    async updateConfig(configData: any): Promise<any> {
        // Update the singleton config
        // upsert: true ensures it creates if it doesn't exist
        return this.erpConfigModel.findOneAndUpdate({}, configData, { new: true, upsert: true }).exec();
    }

    /**
     * Helper to generate price tiers automatically if Wholesale Price < Public Price
     */
    private generatePriceTiers(pvp: number, pvm: number): any[] {
        if (pvm > 0 && pvm < pvp) {
            return [{
                min: 12,
                max: 999999,
                price: pvm,
                label: 'Mayorista (12+)',
                discount: 1 - (pvm / pvp),
                badge: 'PRECIO MAYORISTA'
            }];
        }
        return [];
    }
}


