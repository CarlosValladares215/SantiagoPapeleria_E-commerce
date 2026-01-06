
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
    constructor(
        @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    ) { }

    async create(createDto: CreateNotificationDto): Promise<Notification> {
        const createdNotification = new this.notificationModel({
            ...createDto,
            usuario_id: new Types.ObjectId(createDto.usuario_id)
        });
        return createdNotification.save();
    }

    async findByUser(userId: string): Promise<Notification[]> {
        return this.notificationModel
            .find({ usuario_id: new Types.ObjectId(userId) })
            .sort({ createdAt: -1 })
            .limit(20) // Limit to last 20 notifications
            .exec();
    }

    async markAsRead(id: string): Promise<Notification | null> {
        return this.notificationModel
            .findByIdAndUpdate(id, { leido: true }, { new: true })
            .exec();
    }

    async markAllAsRead(userId: string): Promise<any> {
        return this.notificationModel.updateMany(
            { usuario_id: new Types.ObjectId(userId), leido: false },
            { leido: true }
        ).exec();
    }
}
