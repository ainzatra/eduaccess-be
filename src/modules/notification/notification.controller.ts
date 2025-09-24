import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { AuthGuard } from '../auth/guard/auth.guard';

@UseGuards(AuthGuard)
@Controller('notification')
export class NotificationController {
    constructor(private readonly service: NotificationService) {}

    @Get(':id')
    fetchNotifications(@Param('id') id: string) {
        return this.service.getNotifications(id);
    }
}
