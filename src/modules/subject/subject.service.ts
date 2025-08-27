import { Injectable } from '@nestjs/common';
import { Subject } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';

@Injectable()
export class SubjectService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll() {
        return this.prisma.subject.findMany({
            orderBy: { title: 'asc' }
        })
    }

    async create(data: CreateSubjectDto): Promise<Subject> {
        return this.prisma.subject.create({ data })
    }

    async delete(ids: string[]) {
        return this.prisma.subject.deleteMany({
            where: { id: { in: ids } }
        })
    }
}
