import { Module } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { AnnouncementController } from './announcement.controller';
import { PrismaService } from 'src/prisma.service';
import { EmailService } from '../email/email.service';

@Module({
    providers: [AnnouncementService, PrismaService, EmailService],
    controllers: [AnnouncementController],
})
export class AnnouncementModule {}
