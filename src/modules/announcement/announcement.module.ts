import { Module } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { AnnouncementController } from './announcement.controller';
import { EmailService } from '../email/email.service';

@Module({
    providers: [AnnouncementService, EmailService],
    controllers: [AnnouncementController],
})
export class AnnouncementModule {}
