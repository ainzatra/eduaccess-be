import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { createNotification } from './dto/create-notif.dto';

@Injectable()
export class NotificationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly email: EmailService,
    ) {}

    async createNotification(data: createNotification) {
        return await this.prisma.notification.create({
            data,
        });
    }

    async getNotifications(userId: string) {
        return await this.prisma.notification.findMany({
            where: { user_id: userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async markAsRead(notificationId: string) {
        return await this.prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true },
        });
    }

    async markAllAsRead(userId: string) {
        return await this.prisma.notification.updateMany({
            where: { user_id: userId, isRead: false },
            data: { isRead: true },
        });
    }
}
