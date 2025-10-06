import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';

@Injectable()
export class TeacherService {
    constructor(private readonly prisma: PrismaService) {}

    async fetchMySection(id: string) {
        console.log('Fetching teacher section');
        const section = await this.prisma.section.findFirst({
            where: {
                teacher_id: id,
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

    async fetchMyActivities(id: string) {
        const section = await this.prisma.section.findFirst({
            where: {
                teacher_id: id,
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

    async fetchMyTodos(id: string) {
        const section = await this.prisma.section.findFirst({
            where: {
                teacher_id: id,
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

    async fetchTeacherDetails(id: string) {
        const teacher = await this.prisma.user.findUnique({
            where: { id, role: 'teacher' },
            include: {
                sections_taught: {
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
                },
            },
        });

        return { teacher, subjects, activities };
    }
}
