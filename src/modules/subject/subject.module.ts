import { Module } from '@nestjs/common';
import { SubjectService } from './subject.service';
import { SubjectController } from './subject.controller';
import { PrismaService } from 'src/prisma.service';
import { S3Service } from '../s3.service';

@Module({
  providers: [SubjectService, PrismaService, S3Service],
  controllers: [SubjectController]
})
export class SubjectModule {}
