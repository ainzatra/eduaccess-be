import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { SchoolYearRequest } from '../school-year/school-year.middleware';

@Injectable()
export class LessonService {
    constructor(private readonly prisma: PrismaService) {}

    async createLesson(
        userId: string,
        body: { title: string; subjectId: string; materialIds: string[] },
        req?: SchoolYearRequest,
    ) {
        const { title, subjectId, materialIds } = body;
        const schoolYear = req?.schoolYear || '2025-2026';

        // Validate subject exists
        const subject = await this.prisma.subject.findUnique({
            where: { id: subjectId, school_year: schoolYear },
        });

        if (!subject) throw new NotFoundException('Subject not found');

        // Validate materials exist and get their types
        const materials = await this.prisma.learningMaterial.findMany({
            where: { id: { in: materialIds }, school_year: schoolYear },
        });

        if (materials.length !== materialIds.length) {
            throw new BadRequestException('One or more materials not found');
        }

        // Validate material constraints (1 video, 1 subtitle, multiple images)
        const videoCount = materials.filter((m) => m.type === 'video').length;
        const subtitleCount = materials.filter(
            (m) => m.type === 'subtitle',
        ).length;

        if (videoCount > 1) {
            throw new BadRequestException('Only one video allowed per lesson');
        }
        if (subtitleCount > 1) {
            throw new BadRequestException(
                'Only one subtitle allowed per lesson',
            );
        }

        // Create lesson
        const lesson = await this.prisma.lesson.create({
            data: {
                title,
                subject_id: subjectId,
                created_by: userId,
                school_year: schoolYear,
            },
        });

        // Associate materials with lesson
        const lessonMaterials = materialIds.map((materialId) => ({
            lesson_id: lesson.id,
            material_id: materialId,
        }));

        await this.prisma.lessonMaterial.createMany({
            data: lessonMaterials,
        });

        return this.findLesson(lesson.id, req);
    }

    async findLesson(id: string, req?: SchoolYearRequest) {
        const schoolYear = req?.schoolYear || '2025-2026';
        const lesson = await this.prisma.lesson.findFirst({
            where: { id, school_year: schoolYear },
            include: {
                subject: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                materials: {
                    include: {
                        material: {
                            select: {
                                id: true,
                                title: true,
                                type: true,
                                url: true,
                                created_at: true,
                            },
                        },
                    },
                    orderBy: {
                        created_at: 'asc',
                    },
                },
            },
        });

        if (!lesson) {
            throw new NotFoundException('Lesson not found');
        }

        // Group materials by type for easier frontend consumption
        const groupedMaterials: {
            video: any | null;
            subtitle: any | null;
            images: any[];
        } = {
            video: null,
            subtitle: null,
            images: [],
        };

        lesson.materials.forEach((lm) => {
            const material = lm.material;
            if (material.type === 'video') {
                groupedMaterials.video = material;
            } else if (material.type === 'subtitle') {
                groupedMaterials.subtitle = material;
            } else if (material.type === 'image') {
                groupedMaterials.images.push(material);
            }
        });

        return {
            ...lesson,
            materials: groupedMaterials,
        };
    }

    async updateLessonMaterials(
        lessonId: string,
        userId: string,
        materialIds: string[],
    ) {
        // Verify lesson ownership
        const lesson = await this.prisma.lesson.findUnique({
            where: { id: lessonId },
        });

        if (!lesson) {
            throw new NotFoundException('Lesson not found');
        }

        if (lesson.created_by !== userId) {
            throw new BadRequestException(
                'You can only update your own lessons',
            );
        }

        // Validate materials
        const materials = await this.prisma.learningMaterial.findMany({
            where: { id: { in: materialIds } },
        });

        if (materials.length !== materialIds.length) {
            throw new BadRequestException('One or more materials not found');
        }

        // Validate material constraints
        const videoCount = materials.filter((m) => m.type === 'video').length;
        const subtitleCount = materials.filter(
            (m) => m.type === 'subtitle',
        ).length;

        if (videoCount > 1) {
            throw new BadRequestException('Only one video allowed per lesson');
        }
        if (subtitleCount > 1) {
            throw new BadRequestException(
                'Only one subtitle allowed per lesson',
            );
        }

        // Remove existing material associations
        await this.prisma.lessonMaterial.deleteMany({
            where: { lesson_id: lessonId },
        });

        // Create new associations
        const lessonMaterials = materialIds.map((materialId) => ({
            lesson_id: lessonId,
            material_id: materialId,
        }));

        await this.prisma.lessonMaterial.createMany({
            data: lessonMaterials,
        });

        return this.findLesson(lessonId);
    }

    async deleteLesson(id: string, userId: string) {
        const lesson = await this.prisma.lesson.findUnique({
            where: { id },
        });

        if (!lesson) {
            throw new NotFoundException('Lesson not found');
        }

        if (lesson.created_by !== userId) {
            throw new BadRequestException(
                'You can only delete your own lessons',
            );
        }

        return this.prisma.lesson.delete({
            where: { id },
        });
    }
}
