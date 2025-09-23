import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { S3Service } from '../s3.service';

@Module({
    providers: [ActivityService, PrismaService, S3Service],
    controllers: [ActivityController],
})
export class ActivityModule {}
