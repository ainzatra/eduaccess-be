import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Section } from '@prisma/client';
import { ENHANCED_PRISMA } from '@zenstackhq/server/nestjs';
import { PrismaService } from 'src/prisma.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { AddStudentDto } from './dto/add-student.dto';

@Injectable()
export class SectionService {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateSectionDto): Promise<Section> {
        return this.prisma.section.create({ data });
    }

    async findAllTable(): Promise<Section[]> {
        return this.prisma.section.findMany({
            include: {
                teacher: true,
                _count: {
                    select: { students: true, subjects: true },
                },
            },
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string) {
        return this.prisma.section.findUnique({
            where: { id },
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
}
