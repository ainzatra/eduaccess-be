import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { EmailService } from '../email/email.service';
import { NotificationController } from './notification.controller';

@Module({
    providers: [NotificationService, EmailService],
    exports: [NotificationService],
    controllers: [NotificationController],
})
export class NotificationModule {}
