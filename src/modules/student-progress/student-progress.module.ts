import { Module } from '@nestjs/common';
import { StudentProgressService } from './student-progress.service';
import { StudentProgressController } from './student-progress.controller';
import { ProgressLevelModule } from '../progress-level/progress-level.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
    imports: [ProgressLevelModule, NotificationModule],
    controllers: [StudentProgressController],
    providers: [StudentProgressService],
    exports: [StudentProgressService],
})
export class StudentProgressModule {}
