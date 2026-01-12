import { Module } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ChatbotController } from './chatbot.controller';
import { ProductosModule } from '../products/productos.module';
import { PedidosModule } from '../orders/pedidos.module';
import { UsuariosModule } from '../users/usuarios.module';
import { EmailService } from '../users/services/email.service';

@Module({
    imports: [
        ProductosModule,
        PedidosModule,
        UsuariosModule
    ],
    controllers: [ChatbotController],
    providers: [ChatbotService]
})
export class ChatbotModule { }
