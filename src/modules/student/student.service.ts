import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { ClsService } from 'nestjs-cls';
import { Condition } from '@prisma/client';
import { SchoolYearRequest } from '../school-year/school-year.middleware';

@Injectable()
export class StudentService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cls: ClsService,
    ) {}

    async fetchMySection(id: string, req?: SchoolYearRequest) {
        // Get student's condition for filtering
        const student = await this.prisma.user.findUnique({
            where: { id },
            select: { condition: true },
        });

        if (!student) throw new NotFoundException('Student not found');
        console.log({ schoolYear: req?.schoolYear });
        const schoolYear = req?.schoolYear || '2025-2026';
        const section = await this.prisma.section.findFirst({
            where: {
                students: { some: { id } },
                school_year: schoolYear,
            },
            include: {
                subjects: {
                    where: {
                        category: student.condition as Condition,
                    },
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
        console.log('student section', section);

        if (!section) throw new NotFoundException('Student not enrolled yet');
        return section;
    }

    async fetchMyActivities(id: string, req?: SchoolYearRequest) {
        // Get student's condition for filtering
        const student = await this.prisma.user.findUnique({
            where: { id },
            select: { condition: true },
        });

        if (!student) throw new NotFoundException('Student not found');

        const schoolYear = req?.schoolYear || '2025-2026';
        const section = await this.prisma.section.findFirst({
            where: {
                students: {
                    some: {
                        id,
                    },
                },
                school_year: schoolYear,
            },
        });

        if (!section) throw new NotFoundException('No section assigned');

        const activities = await this.prisma.activity.findMany({
            where: {
                section_id: section.id,
                category: student.condition as Condition,
            },
        });

        return activities;
    }

    async fetchStudentDetails(id: string, req?: SchoolYearRequest) {
        const schoolYear = req?.schoolYear || '2025-2026';
        const student = await this.prisma.user.findUnique({
            where: { id, role: 'student' },
            include: {
                assigned_section: {
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

        if (!student) throw new NotFoundException('Student not found');

        const guardian = await this.prisma.guardian.findUnique({
            where: { student_id: id },
        });

        const submissions = await this.prisma.activitySubmission.findMany({
            where: {
                student_id: id,
                activity: {
                    school_year: schoolYear,
                },
            },
            include: {
                activity: { select: { title: true, level: true, id: true } },
            },
            orderBy: {
                submitted_at: 'desc',
            },
        });

        // Get student's condition for filtering
        const studentCondition = await this.prisma.user.findUnique({
            where: { id },
            select: { condition: true },
        });

        if (!studentCondition) throw new NotFoundException('Student not found');

        const subjects = await this.prisma.subject.findMany({
            where: {
                assigned_sections: {
                    some: {
                        students: {
                            some: {
                                id,
                            },
                        },
                        school_year: schoolYear,
                    },
                },
                category: studentCondition.condition as Condition,
            },
            orderBy: {
                title: 'asc',
            },
        });

        return { student, guardian, submissions, subjects };
    }
}
