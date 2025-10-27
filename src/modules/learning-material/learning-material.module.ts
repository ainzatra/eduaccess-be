import { Module } from '@nestjs/common';
import { LearningMaterialController } from './learning-material.controller';
import { LearningMaterialService } from './learning-material.service';
import { S3Service } from '../s3.service';

@Module({
    controllers: [LearningMaterialController],
    providers: [LearningMaterialService, S3Service],
    exports: [LearningMaterialService],
})
export class LearningMaterialModule {}
