import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { Subject } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { S3Service } from '../s3.service';

@Injectable()
export class SubjectService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly s3: S3Service,
    ) {}

    async findAll() {
        return this.prisma.subject.findMany({
            orderBy: { title: 'asc' },
        });
    }

    async create(data: CreateSubjectDto, file?: any): Promise<Subject> {
        let imageUrl: string | undefined = data.image;

        if (file) {
            const key = `subjects/${Date.now()}-${randomUUID()}-${(file.originalname || 'upload').replace(/\s+/g, '_')}`;
            imageUrl = await this.s3.upload(file, key);
        }

        if (imageUrl) {
            data.image = imageUrl;
        } else {
            data.image = '';
        }

        return this.prisma.subject.create({ data });
    }

    async update(
        id: string,
        data: CreateSubjectDto,
        file?: any,
    ): Promise<Subject> {
        let imageUrl: string | undefined = data.image;

        if (file) {
            const key = `subjects/${Date.now()}-${randomUUID()}-${(file.originalname || 'upload').replace(/\s+/g, '_')}`;
            imageUrl = await this.s3.upload(file, key);
        }
        const payload: any = { ...data };
        if (imageUrl) {
            payload.image = imageUrl;
        } else {
            delete payload.image;
        }

        return this.prisma.subject.update({
            where: {
                id,
            },
            data: payload,
        });
    }

    async delete(ids: string[]) {
        if (!ids) throw new BadRequestException('No subjects to delete');

        return this.prisma.subject.deleteMany({
            where: { id: { in: ids } },
        });
    }

    async fetchSubjectLessons(id: string) {
        const subject = await this.prisma.subject.findUnique({
            where: {
                id,
            },
        });

        if (!subject) throw new NotFoundException();

        return this.prisma.lesson.findMany({
            where: {
                subject_id: id,
            },
        });
    }
}
