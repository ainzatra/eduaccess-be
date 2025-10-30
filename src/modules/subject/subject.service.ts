import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { Subject, Condition } from '@prisma/client';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { S3Service } from '../s3.service';
import { ClsService } from 'nestjs-cls';
import { SchoolYearRequest } from '../school-year/school-year.middleware';

@Injectable()
export class SubjectService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly s3: S3Service,
        private readonly cls: ClsService,
    ) {}

    async findAll(req?: SchoolYearRequest) {
        const { role, condition } = this.cls.get('auth');
        const schoolYear = req?.schoolYear || '2025-2026';

        // If user is teacher or admin, show all subjects
        if (role === 'teacher' || role === 'admin') {
            return this.prisma.subject.findMany({
                where: { school_year: schoolYear },
                orderBy: { title: 'asc' },
            });
        }

        // If user is student, only show subjects matching their condition
        if (role === 'student') {
            return this.prisma.subject.findMany({
                where: {
                    category: condition as Condition,
                    school_year: schoolYear,
                },
                orderBy: { title: 'asc' },
            });
        }

        // Default case - return empty array for unknown roles
        return [];
    }

    async create(
        data: CreateSubjectDto,
        file?: any,
        req?: SchoolYearRequest,
    ): Promise<Subject> {
        let imageUrl: string | undefined = data.image;
        const schoolYear = req?.schoolYear || '2025-2026';

        if (file) {
            const key = `subjects/${Date.now()}-${randomUUID()}-${(file.originalname || 'upload').replace(/\s+/g, '_')}`;
            imageUrl = await this.s3.upload(file, key);
        }

        if (imageUrl) {
            data.image = imageUrl;
        } else {
            data.image = '';
        }

        return this.prisma.subject.create({
            data: {
                ...data,
                school_year: schoolYear,
            },
        });
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
