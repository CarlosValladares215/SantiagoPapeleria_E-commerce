
import { Controller, Get, Post, Body, Param, Put, Patch } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Post()
    create(@Body() createDto: CreateNotificationDto) {
        return this.notificationsService.create(createDto);
    }

    @Get('user/:userId')
    findByUser(@Param('userId') userId: string) {
        return this.notificationsService.findByUser(userId);
    }

    @Patch(':id/read')
    markAsRead(@Param('id') id: string) {
        return this.notificationsService.markAsRead(id);
    }

    @Patch('user/:userId/read-all')
    markAllAsRead(@Param('userId') userId: string) {
        return this.notificationsService.markAllAsRead(userId);
    }
}
