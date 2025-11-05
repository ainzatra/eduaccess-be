import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { S3Service } from '../s3.service';
import { NotificationModule } from '../notification/notification.module';
import { EmailModule } from '../email/email.module';
import { ProgressLevelModule } from '../progress-level/progress-level.module';
import { StudentProgressModule } from '../student-progress/student-progress.module';

@Module({
    imports: [
        NotificationModule,
        EmailModule,
        ProgressLevelModule,
        StudentProgressModule,
    ],
    providers: [ActivityService, S3Service],
    controllers: [ActivityController],
})
export class ActivityModule {}
