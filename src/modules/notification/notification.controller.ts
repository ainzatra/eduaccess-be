import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { AuthGuard } from '../auth/guard/auth.guard';

@UseGuards(AuthGuard)
@Controller('notification')
export class NotificationController {
    constructor(private readonly service: NotificationService) {}

    @Patch(':notificationId/read')
    markAsRead(@Param('notificationId') notificationId: string) {
        return this.service.markAsRead(notificationId);
    }

    @Patch('user/:userId/read-all')
    markAllAsRead(@Param('userId') userId: string) {
        return this.service.markAllAsRead(userId);
    }

    @Get(':id')
    fetchNotifications(@Param('id') id: string) {
        return this.service.getNotifications(id);
    }
}
