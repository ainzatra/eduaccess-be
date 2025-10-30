import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { SchoolYearRequest } from '../school-year/school-year.middleware';

@Injectable()
export class TeacherService {
    constructor(private readonly prisma: PrismaService) {}

    async fetchMySection(id: string, req?: SchoolYearRequest) {
        console.log('Fetching teacher section');
        const schoolYear = req?.schoolYear || '2025-2026';
        const section = await this.prisma.section.findFirst({
            where: {
                teacher_id: id,
                school_year: schoolYear,
            },
            include: {
                subjects: {
                    orderBy: {
                        title: 'asc',
                    },
                },
                students: true,
            },
        });

        if (!section)
            throw new NotFoundException(
                'Teacher is not assigned to any section yet',
            );
        return section;
    }

    async fetchMyActivities(id: string, req?: SchoolYearRequest) {
        const schoolYear = req?.schoolYear || '2025-2026';
        const section = await this.prisma.section.findFirst({
            where: {
                teacher_id: id,
                school_year: schoolYear,
            },
        });

        if (!section) throw new NotFoundException('No section assigned');

        const activities = await this.prisma.activity.findMany({
            where: {
                section_id: section.id,
            },
        });

        return activities;
    }

    async fetchMyTodos(id: string, req?: SchoolYearRequest) {
        const schoolYear = req?.schoolYear || '2025-2026';
        const section = await this.prisma.section.findFirst({
            where: {
                teacher_id: id,
                school_year: schoolYear,
            },
        });

        if (!section) throw new NotFoundException('No section assigned');

        const todos = await this.prisma.activity.findMany({
            where: {
                section_id: section.id,
                graded: false,
                submissions: {
                    some: {
                        status: 'pending',
                        is_latest: true,
                    },
                },
            },
            select: {
                id: true,
                title: true,
                subject: { select: { title: true, id: true } },
                _count: {
                    select: {
                        submissions: {
                            where: {
                                status: 'pending',
                                is_latest: true,
                            },
                        },
                    },
                },
            },
        });

        console.log({ todos });

        return todos;
    }

    async fetchTeacherDetails(id: string, req?: SchoolYearRequest) {
        const schoolYear = req?.schoolYear || '2025-2026';
        const teacher = await this.prisma.user.findUnique({
            where: { id, role: 'teacher' },
            include: {
                sections_taught: {
                    where: {
                        school_year: schoolYear,
                    },
                    select: {
                        name: true,
                        id: true,
                    },
                },
            },
        });

        if (!teacher) throw new NotFoundException('Teacher not found');

        const subjects = await this.prisma.subject.findMany({
            where: {
                assigned_sections: {
                    some: {
                        teacher_id: id,
                        school_year: schoolYear,
                    },
                },
            },
            orderBy: {
                title: 'asc',
            },
        });

        const activities = await this.prisma.activity.findMany({
            where: {
                section: {
                    teacher_id: id,
                    school_year: schoolYear,
                },
            },
        });

        return { teacher, subjects, activities };
    }
}
