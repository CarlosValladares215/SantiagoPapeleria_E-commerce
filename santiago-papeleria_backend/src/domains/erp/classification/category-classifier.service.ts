import { Injectable, OnModuleInit, Logger } from '@nestjs/common';

// Dynamically import to avoid issues with some environments if not used, 
// but here we know we installed it. Use consistent import.
// Using 'require' or dynamic import() is often safer for ESM-only packages in NestJS context
// if strict/TS settings vary, but @xenova/transformers works well.

@Injectable()
export class CategoryClassifierService implements OnModuleInit {
    private logger = new Logger(CategoryClassifierService.name);
    private pipeline: any;
    private extractor: any;

    // Define our 5 Super Categories with descriptive "anchors" for semantic matching
    private superCategories = [
        {
            id: 'escolar_oficina',
            name: 'Escolar & Oficina',
            description: 'cuadernos lapices boligrafos carpetas archivadores escritorio papel bond resmas utiles escolares oficina',
            embedding: null as any
        },
        {
            id: 'arte_diseno',
            name: 'Arte & Diseño',
            description: 'pinturas oleos lienzos pinceles bastidores arquitectura dibujo tecnico manualidades arte creatividad',
            embedding: null
        },
        {
            id: 'tecnologia',
            name: 'Tecnología',
            description: 'calculadoras impresoras tintas toners computacion mouse teclados cables electronica pilas baterias',
            embedding: null
        },
        {
            id: 'regalos_variedades',
            name: 'Regalos & Variedades',
            description: 'juguetes fiestas cumpleaños globos peluches tarjetas regalo navidad san valentin snacks dulces comida',
            embedding: null
        },
        {
            id: 'hogar_decoracion',
            name: 'Hogar & Decoración',
            description: 'cocina limpieza organizacion hogar decoracion baño aseo personal cosmeticos belleza muebles silla',
            embedding: null
        },
        {
            id: 'regalos_variedades',
            name: 'Regalos & Variedades',
            description: 'juguetes fiestas cumpleaños globos peluches tarjetas regalo navidad san valentin snacks dulces comida',
            embedding: null
        }
    ];

    async onModuleInit() {
        await this.loadModel();
    }

    private async loadModel() {
        this.logger.log('🔄 Loading Semantic Model (Xenova/all-MiniLM-L6-v2)...');
        try {
            // Dynamic import to handle ESM module
            const { pipeline } = await import('@xenova/transformers');

            // Feature extraction pipeline
            this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

            this.logger.log('✅ Model Loaded. Pre-computing Super Category Embeddings...');

            // Pre-compute embeddings for super categories
            for (const cat of this.superCategories) {
                // We combine name + description for better context
                const text = `${cat.name} ${cat.description}`;
                cat.embedding = await this.getEmbedding(text);
            }

            this.logger.log('✅ Super Category Embeddings Ready.');
        } catch (error) {
            this.logger.error('❌ Failed to load model:', error);
        }
    }

    private async getEmbedding(text: string): Promise<number[]> {
        if (!this.extractor) return [];
        // run inference
        const output = await this.extractor(text, { pooling: 'mean', normalize: true });
        // output is a Tensor, we want the array
        const embedding = Array.from(output.data) as number[];
        return embedding;
    }

    private cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) return 0;
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    async classify(categoryName: string): Promise<{ id: string, name: string, score: number }> {
        if (!this.extractor) {
            // Fallback if model failed to load
            return { id: 'regalos_variedades', name: 'Regalos & Variedades', score: 0 };
        }

        const embedding = await this.getEmbedding(categoryName);

        let bestMatch = this.superCategories[0];
        let maxScore = -1;

        for (const superCat of this.superCategories) {
            if (!superCat.embedding) continue;
            const score = this.cosineSimilarity(embedding, superCat.embedding);

            // Bonus for literal matches for safety
            let finalScore = score;
            const normName = categoryName.toLowerCase();
            if (superCat.description.includes(normName)) finalScore += 0.1;

            if (finalScore > maxScore) {
                maxScore = finalScore;
                bestMatch = superCat;
            }
        }

        return { id: bestMatch.id, name: bestMatch.name, score: maxScore };
    }
}
