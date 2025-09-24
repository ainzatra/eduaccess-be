import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { PrismaService } from 'src/prisma.service';
import { EmailService } from '../email/email.service';

@Module({
    providers: [NotificationService, PrismaService, EmailService],
    exports: [NotificationService],
})
export class NotificationModule {}
