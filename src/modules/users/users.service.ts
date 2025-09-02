import { Injectable, Inject, HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { ENHANCED_PRISMA } from '@zenstackhq/server/nestjs';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import bcrypt from 'bcrypt'
import { ClsService } from 'nestjs-cls';

@Injectable()
export class UsersService {
  constructor(
      private readonly cls: ClsService,
      private readonly prisma: PrismaService) {}

  async create(body): Promise<User> {
    if (body.password && body.confirm_password && body.password !== body.confirm_password) {
      throw new HttpException('Passwords do not match', HttpStatus.BAD_REQUEST)
    }

    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(body.password, saltRounds)
    const data = {
      full_name: body.full_name,
      username: body.username,
      role: body.role,
      password_hash: hashedPassword
    }
    
    return this.prisma.user.create({ data });
  }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany()
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
    const { role } = this.cls.get('auth')

    if (role !== 'admin') {
      throw new UnauthorizedException()
    }

    const students = await this.prisma.user.findMany({
      where: {
        role: 'student' 
      },
      orderBy: { full_name: 'asc' },

    })

    const teachers = await this.prisma.user.findMany({
      where: {
        role: 'teacher' 
      },
      orderBy: { full_name: 'asc' },

    })
    const users = [...students, ...teachers]

    return users
  }


  async findOne(id: string){
    const user = await this.prisma.user.findFirst({
      where: { id },
      include: {
        assigned_section: true,
        sections_taught: true
      }
    })
    
    if(!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND)
    }

    return user
  }

  async findTeachers(): Promise<User[]> {
    const teachers = this.prisma.user.findMany({
      where: { role: 'teacher' },
      orderBy: { full_name: 'asc' }
    })
    console.log(teachers)
    return teachers
  }

  async findAvailableStudents(): Promise<User[]> {
    const students = this.prisma.user.findMany({
      where: { 
        role: 'student', 
        assigned_section:  {none: {} }
      },
      orderBy: { full_name: 'asc' }
    })
    console.log(students)
    return students
  }

  async countStudentTeacher() {
    const studentCount = this.prisma.user.count({
      where: {
        role: 'student'
      }
    })
    const teacherCount = this.prisma.user.count({
      where: {
        role: 'teacher'
      }
    })

    return { student: studentCount, teacher: teacherCount }
  }
}