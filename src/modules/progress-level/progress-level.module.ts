import { Module } from '@nestjs/common';
import { ProgressLevelService } from './progress-level.service';
import { ProgressLevelController } from './progress-level.controller';

@Module({
    controllers: [ProgressLevelController],
    providers: [ProgressLevelService],
    exports: [ProgressLevelService],
})
export class ProgressLevelModule {}
