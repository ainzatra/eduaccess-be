import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { EmailService } from '../email/email.service';

@Module({
    providers: [NotificationService, EmailService],
    exports: [NotificationService],
})
export class NotificationModule {}
