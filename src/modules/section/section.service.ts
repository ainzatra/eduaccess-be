import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Section } from '@prisma/client';
import { ENHANCED_PRISMA } from '@zenstackhq/server/nestjs';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { AddStudentDto } from './dto/add-student.dto';
import { Request } from 'express';
import { SchoolYearRequest } from '../school-year/school-year.middleware';

@Injectable()
export class SectionService {
    constructor(private readonly prisma: PrismaService) {}

    async create(
        data: CreateSectionDto,
        req?: SchoolYearRequest,
    ): Promise<Section> {
        const schoolYear = req?.schoolYear || '2025-2026';
        return this.prisma.section.create({
            data: {
                ...data,
                school_year: schoolYear,
            },
        });
    }

    async findAllTable(req?: SchoolYearRequest): Promise<Section[]> {
        const schoolYear = req?.schoolYear || '2025-2026';
        return this.prisma.section.findMany({
            where: { school_year: schoolYear },
            include: {
                teacher: true,
                _count: {
                    select: { students: true, subjects: true },
                },
            },
            orderBy: { name: 'asc' },
        });
    }

    async findAllWithDetails(req?: SchoolYearRequest) {
        const schoolYear = req?.schoolYear || '2025-2026';
        const students = await this.prisma.user.findMany({
            where: { role: 'student' },
            include: {
                assigned_section: {
                    where: { school_year: schoolYear },
                },
            },
        });

        return { students };
    }

    async findOne(id: string, req?: SchoolYearRequest) {
        const schoolYear = req?.schoolYear || '2025-2026';
        return this.prisma.section.findFirst({
            where: {
                id,
                school_year: schoolYear,
            },
            include: {
                teacher: true,
                students: true,
                subjects: true,
                _count: {
                    select: { students: true, subjects: true },
                },
            },
        });
    }

    async addStudents(data, id: string) {
        return this.prisma.section.update({
            where: { id },
            data: {
                students: {
                    connect: data.map((studentId) => ({ id: studentId })),
                },
            },
            include: { students: true },
        });
    }

    async addSubjects(data, id: string) {
        console.log('add subject', data);
        return this.prisma.section.update({
            where: { id },
            data: {
                subjects: {
                    connect: data.map((subjectId) => ({ id: subjectId })),
                },
            },
            include: { subjects: true },
        });
    }

    async updateTeacher(teacher_id, id: string) {
        return this.prisma.section.update({
            where: { id },
            data: {
                teacher_id: teacher_id,
            },
            include: { teacher: true },
        });
    }

    async findAvailableSubjects(id: string) {
        const section = await this.prisma.section.findUnique({
            where: { id },
            include: { subjects: true },
        });

        if (!section) {
            throw new Error('Section not found');
        }

        const assignedSubjectIds = section.subjects.map(
            (subject) => subject.id,
        );

        return this.prisma.subject.findMany({
            where: {
                NOT: {
                    id: { in: assignedSubjectIds },
                },
                school_year: section.school_year!,
            },
            orderBy: { title: 'asc' },
        });
    }

    async deleteSubject(id: string, subject_id: string) {
        return this.prisma.section.update({
            where: { id },
            data: {
                subjects: { disconnect: { id: subject_id } },
            },
            include: { subjects: true },
        });
    }

    async deleteStudent(id: string, student_id: string) {
        return this.prisma.section.update({
            where: { id },
            data: {
                students: { disconnect: { id: student_id } },
            },
            include: { students: true },
        });
    }

    async removeTeacher(id: string) {
        return this.prisma.section.update({
            where: { id },
            data: {
                teacher_id: null,
            },
        });
    }
}
