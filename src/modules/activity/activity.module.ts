import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { PrismaService } from 'src/prisma.service';
import { S3Service } from '../s3.service';
import { NotificationModule } from '../notification/notification.module';
import { EmailModule } from '../email/email.module';

@Module({
    imports: [NotificationModule, EmailModule],
    providers: [ActivityService, PrismaService, S3Service],
    controllers: [ActivityController],
})
export class ActivityModule {}
