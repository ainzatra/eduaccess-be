import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';

@Injectable()
export class StudentService {
    constructor(private readonly prisma: PrismaService) {}

    async fetchMySection(id: string) {
        const section = await this.prisma.section.findFirst({
            where: {
                students: { some: { id } },
            },
            include: {
                subjects: {
                    orderBy: {
                        title: 'asc',
                    },
                },
                teacher: true,
                _count: {
                    select: {
                        students: true,
                    },
                },
            },
        });

        if (!section) throw new NotFoundException('Student not enrolled yet');
        return section;
    }

    async fetchMyActivities(id: string) {
        const section = await this.prisma.section.findFirst({
            where: {
                students: {
                    some: {
                        id,
                    },
                },
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

    async fetchStudentDetails(id: string) {
        const student = await this.prisma.user.findUnique({
            where: { id, role: 'student' },
            include: {
                assigned_section: {
                    select: {
                        name: true,
                        id: true,
                    },
                },
            },
        });

        if (!student) throw new NotFoundException('Student not found');

        const guardian = await this.prisma.guardian.findUnique({
            where: { student_id: id },
        });

        const submissions = await this.prisma.activitySubmission.findMany({
            where: {
                student_id: id,
            },
            include: {
                activity: { select: { title: true, level: true, id: true } },
            },
            orderBy: {
                submitted_at: 'desc',
            },
        });

        const subjects = await this.prisma.subject.findMany({
            where: {
                assigned_sections: {
                    some: {
                        students: {
                            some: {
                                id,
                            },
                        },
                    },
                },
            },
            orderBy: {
                title: 'asc',
            },
        });

        return { student, guardian, submissions, subjects };
    }
}
