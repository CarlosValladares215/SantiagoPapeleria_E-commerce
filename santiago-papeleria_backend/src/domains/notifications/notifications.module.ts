
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Notification, NotificationSchema } from './schemas/notification.schema';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }])
    ],
    controllers: [NotificationsController],
    providers: [NotificationsService],
    exports: [NotificationsService] // Export service so it can be used in PedidosModule
})
export class NotificationsModule { }
