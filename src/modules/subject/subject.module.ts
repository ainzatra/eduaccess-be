import { Module } from '@nestjs/common';
import { SubjectService } from './subject.service';
import { SubjectController } from './subject.controller';
import { S3Service } from '../s3.service';

@Module({
    providers: [SubjectService, S3Service],
    controllers: [SubjectController],
})
export class SubjectModule {}
