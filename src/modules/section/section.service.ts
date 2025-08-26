import { Inject, Injectable } from '@nestjs/common';
import { Section } from '@prisma/client';
import { ENHANCED_PRISMA } from '@zenstackhq/server/nestjs';
import { PrismaService } from 'src/prisma.service';
import { CreateSectionDto } from './dto/create-section.dto';

@Injectable()
export class SectionService {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateSectionDto): Promise<Section> {
        return this.prisma.section.create({ data })
    }

    async findAll(): Promise<Section[]> {
        return this.prisma.section.findMany()
    }
}
