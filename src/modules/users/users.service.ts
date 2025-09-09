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
import { PrismaService } from 'src/prisma.service';
import bcrypt from 'bcrypt';
import { ClsService } from 'nestjs-cls';
import { S3Service } from '../s3.service';
import { randomUUID } from 'crypto';

@Injectable()
export class UsersService {
    constructor(
        private readonly cls: ClsService,
        private readonly prisma: PrismaService,
        private readonly s3: S3Service,
    ) {}

    async create(body): Promise<User> {
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

        return this.prisma.user.create({ data });
    }

    async findAll(): Promise<User[]> {
        return this.prisma.user.findMany();
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

    async findTeachers(): Promise<User[]> {
        const teachers = this.prisma.user.findMany({
            where: { role: 'teacher' },
            orderBy: { full_name: 'asc' },
        });
        console.log(teachers);
        return teachers;
    }

    async findAvailableStudents(): Promise<User[]> {
        const students = this.prisma.user.findMany({
            where: {
                role: 'student',
                assigned_section: { none: {} },
            },
            orderBy: { full_name: 'asc' },
        });
        console.log(students);
        return students;
    }

    async countStudentTeacher() {
        const studentCount = this.prisma.user.count({
            where: {
                role: 'student',
            },
        });
        const teacherCount = this.prisma.user.count({
            where: {
                role: 'teacher',
            },
        });

        return { student: studentCount, teacher: teacherCount };
    }

    async updateUser(id: string, data) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!user) throw new NotFoundException();
        let updatedUser = {};
        if (data.user) {
            console.log('Update user', data.user);
            updatedUser = await this.prisma.user.update({
                where: { id },
                data: data.user,
                select: {
                    id: true,
                    full_name: true,
                    role: true,
                },
            });
        }

        if (data.guardian) {
            console.log('Update guardian', data.guardian);
            await this.prisma.guardian.upsert({
                where: { student_id: id },
                create: {
                    ...data.guardian,
                    student_id: id,
                },
                update: data.guardian,
            });
        }

        if (data.teacher || data.admin) {
            console.log('Update teacher/admin', data.teacher || data.admin);
            await this.prisma.user.update({
                where: { id },
                data: data.teacher || data.admin,
            });
        }
        return updatedUser;
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
}
