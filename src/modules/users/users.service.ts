import {
    Injectable,
    Inject,
    HttpException,
    HttpStatus,
    UnauthorizedException,
    NotFoundException,
    BadRequestException,
    InternalServerErrorException,
} from '@nestjs/common';
import { ENHANCED_PRISMA } from '@zenstackhq/server/nestjs';
import { User } from '@prisma/client';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import bcrypt from 'bcrypt';
import { ClsService } from 'nestjs-cls';
import { S3Service } from '../s3.service';
import { randomUUID } from 'crypto';
import { SchoolYearRequest } from '../school-year/school-year.middleware';

@Injectable()
export class UsersService {
    constructor(
        private readonly cls: ClsService,
        private readonly prisma: PrismaService,
        private readonly s3: S3Service,
    ) {}

    async create(body): Promise<User> {
        const user = await this.prisma.user.findUnique({
            where: { username: body.username },
        });

        if (user) throw new BadRequestException('Username already used');
        if (
            body.password &&
            body.confirm_password &&
            body.password !== body.confirm_password
        ) {
            throw new HttpException(
                'Passwords do not match',
                HttpStatus.BAD_REQUEST,
            );
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(body.password, saltRounds);
        const data = {
            full_name: body.full_name,
            username: body.username,
            role: body.role,
            password_hash: hashedPassword,
        };

        if (data.role === 'student') {
            data['condition'] = body.condition;
        }

        return this.prisma.user.create({ data });
    }

    async findAll(): Promise<User[]> {
        return this.prisma.user.findMany({
            where: { archived: false },
        });
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findFirst({
            where: {
                email: email,
            },
        });
    }

    async findByUsername(username: string): Promise<User | null> {
        return this.prisma.user.findFirst({
            where: {
                username: username,
            },
        });
    }

    async fetchStudentTeacher(): Promise<User[] | null> {
        const { role } = this.cls.get('auth');

        if (role !== 'admin') {
            throw new UnauthorizedException();
        }

        const students = await this.prisma.user.findMany({
            where: {
                role: 'student',
            },
            orderBy: { full_name: 'asc' },
        });

        const teachers = await this.prisma.user.findMany({
            where: {
                role: 'teacher',
            },
            orderBy: { full_name: 'asc' },
        });
        const users = [...students, ...teachers];

        return users;
    }

    async findOne(id: string) {
        const user = await this.prisma.user.findFirst({
            where: { id },
            include: {
                assigned_section: true,
                sections_taught: true,
            },
        });

        if (!user) {
            throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }

        return user;
    }

    async findTeachers(req?: SchoolYearRequest): Promise<User[]> {
        const schoolYear = req?.schoolYear || '2025-2026';
        const teachers = await this.prisma.user.findMany({
            where: {
                role: 'teacher',
                sections_taught: {
                    none: {
                        school_year: schoolYear,
                    },
                },
                archived: false,
            },
            orderBy: { full_name: 'asc' },
        });
        console.log('available teachers:', teachers.length);
        return teachers;
    }

    async findAvailableStudents(req?: SchoolYearRequest): Promise<User[]> {
        const schoolYear = req?.schoolYear || '2025-2026';
        const students = await this.prisma.user.findMany({
            where: {
                role: 'student',
                assigned_section: {
                    none: {
                        school_year: schoolYear,
                    },
                },
                archived: false,
            },
            orderBy: { full_name: 'asc' },
        });
        console.log('available students:', students.length);
        return students;
    }

    async countStudentTeacher() {
        const studentCount = await this.prisma.user.count({
            where: {
                role: 'student',
                archived: false,
            },
        });
        const teacherCount = await this.prisma.user.count({
            where: {
                role: 'teacher',
                archived: false,
            },
        });

        return { student: studentCount, teacher: teacherCount };
    }

    async updateUser(id: string, data) {
        const existingUser = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!existingUser) throw new NotFoundException();

        await this.prisma.$transaction(async (tx) => {
            // Email uniqueness checks using tx for isolation
            if (data.guardian) {
                // Check user and guardian tables for email
                const existingEmailInUser = await tx.user.findUnique({
                    where: { email: data.guardian.email },
                });
                const existingEmailInGuardian = await tx.guardian.findUnique({
                    where: {
                        email: data.guardian.email,
                        NOT: {
                            student_id: id,
                        },
                    },
                });
                if (
                    (existingEmailInUser || existingEmailInGuardian) &&
                    data.guardian.email !== ''
                ) {
                    throw new BadRequestException('Email already used');
                }

                await tx.guardian.upsert({
                    where: { student_id: id },
                    create: {
                        ...data.guardian,
                        student_id: id,
                    },
                    update: data.guardian,
                });
            }

            if (data.teacher || data.admin) {
                const teacherData = data.teacher || data.admin;
                // Check user and guardian tables for email (exclude current user)
                const existingEmailInUser = await tx.user.findUnique({
                    where: {
                        email: teacherData.email,
                        NOT: { id },
                    },
                });
                const existingEmailInGuardian = await tx.guardian.findUnique({
                    where: { email: teacherData.email },
                });
                if (
                    (existingEmailInUser || existingEmailInGuardian) &&
                    teacherData.email !== ''
                ) {
                    throw new BadRequestException('Email already used');
                }

                // Convert birthday to ISO-8601 DateTime if present
                if (
                    teacherData.birthday &&
                    typeof teacherData.birthday === 'string'
                ) {
                    // Check if birthday is in YYYY-MM-DD format
                    if (/^\d{4}-\d{2}-\d{2}$/.test(teacherData.birthday)) {
                        teacherData.birthday = new Date(
                            teacherData.birthday,
                        ).toISOString();
                    }
                }

                // Update user, preserving existing fields
                await tx.user.update({
                    where: { id },
                    data: {
                        ...existingUser, // Preserve non-updated fields
                        ...teacherData,
                    },
                });
            }

            if (data.user) {
                // Convert birthday to ISO-8601 DateTime if present
                if (
                    data.user.birthday &&
                    typeof data.user.birthday === 'string'
                ) {
                    // Check if birthday is in YYYY-MM-DD format
                    if (/^\d{4}-\d{2}-\d{2}$/.test(data.user.birthday)) {
                        data.user.birthday = new Date(
                            data.user.birthday,
                        ).toISOString();
                    }
                }

                // Update user fields (after teacher/admin to avoid conflicts)
                await tx.user.update({
                    where: { id },
                    data: data.user,
                });
            }
        });

        // Fetch and return the fully updated user
        const updatedUser = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                full_name: true,
                role: true,
                email: true, // Include if relevant
            },
        });

        return updatedUser || {};
    }

    async updatePassword(id: string, data) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!user) throw new NotFoundException();

        const isValidPassword = await bcrypt.compare(
            data.old_password,
            user.password_hash,
        );

        if (!isValidPassword)
            throw new UnauthorizedException('Invalid password');

        if (data.password !== data.confirm)
            throw new BadRequestException('Password do not match');

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(data.password, saltRounds);

        const result = await this.prisma.user.update({
            where: { id },
            data: {
                password_hash: hashedPassword,
            },
        });

        return result ? 'Success' : 'Failed';
    }

    async updateAvatar(id, file) {
        let imageUrl = '';
        const user = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!user) throw new NotFoundException();

        if (!file) throw new BadRequestException('File not found');
        console.log('Uploading avatar to S3...');
        const key = `avatars/${user.id}/${Date.now()}-${randomUUID()}-${(file.originalname || 'upload').replace(/\s+/g, '_')}`;
        imageUrl = await this.s3.upload(file, key);

        if (!imageUrl)
            throw new InternalServerErrorException('Error uploading avatar');

        console.log('Updating avatar URL...');
        await this.prisma.user.update({
            where: { id },
            data: {
                avatar: imageUrl,
            },
        });

        console.log('Updated URL:', imageUrl);

        return { avatar: imageUrl };
    }

    async fetchUserSettings(id: string) {
        return this.prisma.user.findUnique({
            where: {
                id,
            },
            omit: {
                password_hash: true,
            },
            include: {
                guardian: true,
            },
        });
    }

    async archiveUser(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!user) throw new NotFoundException();

        await this.prisma.$transaction(async (tx) => {
            // Archive user by setting archived field to true
            await tx.user.update({
                where: { id },
                data: { archived: true },
            });

            if (user.role === 'teacher') {
                // Unassign sections
                await tx.section.updateMany({
                    where: { teacher_id: id },
                    data: { teacher_id: null },
                });
            }
            if (user.role === 'student') {
                // Unassign section
                await tx.user.update({
                    where: { id },
                    data: { assigned_section: { set: [] } },
                });
            }
        });
    }

    async unarchiveUser(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!user) throw new NotFoundException();

        // Unarchive user by setting archived field to false
        await this.prisma.user.update({
            where: { id },
            data: { archived: false },
        });
    }
}
