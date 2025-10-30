import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SchoolYear } from '@prisma/client';

@Injectable()
export class SchoolYearService {
    constructor(private readonly prisma: PrismaService) {}

    async createSchoolYear(year: string): Promise<SchoolYear> {
        // Check if school year already exists
        const existingYear = await this.prisma.schoolYear.findUnique({
            where: { year },
        });

        if (existingYear) {
            throw new BadRequestException(`School year ${year} already exists`);
        }

        // Deactivate all existing school years
        await this.prisma.schoolYear.updateMany({
            where: { isActive: true },
            data: { isActive: false },
        });

        // Create new school year and activate it
        return this.prisma.schoolYear.create({
            data: {
                year,
                isActive: true,
            },
        });
    }

    async getActiveSchoolYear(): Promise<SchoolYear> {
        const activeYear = await this.prisma.schoolYear.findFirst({
            where: { isActive: true },
        });

        if (!activeYear) {
            throw new NotFoundException('No active school year found');
        }

        return activeYear;
    }

    async getAllSchoolYears(): Promise<SchoolYear[]> {
        return this.prisma.schoolYear.findMany({
            orderBy: { year: 'desc' },
        });
    }

    async activateSchoolYear(id: string): Promise<SchoolYear> {
        // Check if school year exists
        const schoolYear = await this.prisma.schoolYear.findUnique({
            where: { id },
        });

        if (!schoolYear) {
            throw new NotFoundException('School year not found');
        }

        // Deactivate all existing school years
        await this.prisma.schoolYear.updateMany({
            where: { isActive: true },
            data: { isActive: false },
        });

        // Activate the selected school year
        return this.prisma.schoolYear.update({
            where: { id },
            data: { isActive: true },
        });
    }

    async getSchoolYearById(id: string): Promise<SchoolYear> {
        const schoolYear = await this.prisma.schoolYear.findUnique({
            where: { id },
        });

        if (!schoolYear) {
            throw new NotFoundException('School year not found');
        }

        return schoolYear;
    }

    async deleteSchoolYear(id: string): Promise<void> {
        const schoolYear = await this.prisma.schoolYear.findUnique({
            where: { id },
        });

        if (!schoolYear) {
            throw new NotFoundException('School year not found');
        }

        if (schoolYear.isActive) {
            throw new BadRequestException('Cannot delete active school year');
        }

        await this.prisma.schoolYear.delete({
            where: { id },
        });
    }
}
