import { Module } from '@nestjs/common';
import { LessonController } from './lesson.controller';
import { LessonService } from './lesson.service';
import { PrismaService } from 'src/prisma.service';
import { S3Service } from '../s3.service';

@Module({
    controllers: [LessonController],
    providers: [LessonService, PrismaService, S3Service],
})
export class LessonModule {}
