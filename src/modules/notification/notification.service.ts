import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class NotificationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly email: EmailService,
    ) {}

    async createNotification(
        userId: string,
        title: string,
        description?: string,
    ) {
        return await this.prisma.notification.create({
            data: {
                user_id: userId,
                title,
                description,
            },
        });
    }
}
