import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLevel } from '@prisma/client';
import { SchoolYearRequest } from '../school-year/school-year.middleware';

@Injectable()
export class ProgressLevelService {
    constructor(private readonly prisma: PrismaService) {}

    async getProgressLevels(req?: SchoolYearRequest) {
        const schoolYear = req?.schoolYear || '2025-2026';

        return this.prisma.progressLevel.findMany({
            where: {
                schoolYear,
            },
            orderBy: {
                minPoints: 'asc',
            },
        });
    }

    async getProgressLevelById(id: string) {
        const progressLevel = await this.prisma.progressLevel.findUnique({
            where: { id },
        });

        if (!progressLevel) {
            throw new NotFoundException('Progress level not found');
        }

        return progressLevel;
    }

    async createProgressLevel(
        data: {
            level: ActivityLevel;
            minPoints: number;
            maxPoints: number;
            pointValue: number;
        },
        req?: SchoolYearRequest,
    ) {
        const schoolYear = req?.schoolYear || '2025-2026';

        // Validate point ranges
        await this.validatePointRanges(
            data.level,
            data.minPoints,
            data.maxPoints,
            schoolYear,
        );

        return this.prisma.progressLevel.create({
            data: {
                ...data,
                schoolYear,
            },
        });
    }

    async updateProgressLevel(
        id: string,
        data: {
            level?: ActivityLevel;
            minPoints?: number;
            maxPoints?: number;
            pointValue?: number;
        },
    ) {
        const existingLevel = await this.prisma.progressLevel.findUnique({
            where: { id },
        });

        if (!existingLevel) {
            throw new NotFoundException('Progress level not found');
        }

        // Validate point ranges if they're being updated
        if (data.minPoints !== undefined || data.maxPoints !== undefined) {
            const minPoints = data.minPoints ?? existingLevel.minPoints;
            const maxPoints = data.maxPoints ?? existingLevel.maxPoints;
            const level = data.level ?? existingLevel.level;

            await this.validatePointRanges(
                level,
                minPoints,
                maxPoints,
                existingLevel.schoolYear,
            );
        }

        return this.prisma.progressLevel.update({
            where: { id },
            data,
        });
    }

    async deleteProgressLevel(id: string) {
        const existingLevel = await this.prisma.progressLevel.findUnique({
            where: { id },
        });

        if (!existingLevel) {
            throw new NotFoundException('Progress level not found');
        }

        // Check if there are any students at this level
        const studentsAtLevel = await this.prisma.studentProgress.count({
            where: {
                currentLevel: existingLevel.level,
                schoolYear: existingLevel.schoolYear,
            },
        });

        if (studentsAtLevel > 0) {
            throw new BadRequestException(
                'Cannot delete progress level while students are at this level',
            );
        }

        return this.prisma.progressLevel.delete({
            where: { id },
        });
    }

    async getProgressLevelByLevel(
        level: ActivityLevel,
        req?: SchoolYearRequest,
    ) {
        const schoolYear = req?.schoolYear || '2025-2026';

        const progressLevel = await this.prisma.progressLevel.findUnique({
            where: {
                level_schoolYear: {
                    level,
                    schoolYear,
                },
            },
        });

        if (!progressLevel) {
            throw new NotFoundException(
                `Progress level '${level}' not found for school year ${schoolYear}`,
            );
        }

        return progressLevel;
    }

    async seedDefaultProgressLevels(req?: SchoolYearRequest) {
        const schoolYear = req?.schoolYear || '2025-2026';

        const defaultLevels = [
            {
                level: 'beginner' as ActivityLevel,
                minPoints: 0,
                maxPoints: 100,
                pointValue: 10,
            },
            {
                level: 'intermediate' as ActivityLevel,
                minPoints: 101,
                maxPoints: 300,
                pointValue: 20,
            },
            {
                level: 'advance' as ActivityLevel,
                minPoints: 301,
                maxPoints: 999999,
                pointValue: 30,
            },
        ];

        const results: any[] = [];

        for (const levelData of defaultLevels) {
            const existing = await this.prisma.progressLevel.findUnique({
                where: {
                    level_schoolYear: {
                        level: levelData.level,
                        schoolYear,
                    },
                },
            });

            if (!existing) {
                const created = await this.prisma.progressLevel.create({
                    data: {
                        ...levelData,
                        schoolYear,
                    },
                });
                results.push(created);
            } else {
                results.push(existing);
            }
        }

        return results;
    }

    private async validatePointRanges(
        level: ActivityLevel,
        minPoints: number,
        maxPoints: number,
        schoolYear: string,
    ) {
        // Basic validation
        if (minPoints < 0) {
            throw new BadRequestException('Minimum points cannot be negative');
        }

        if (maxPoints <= minPoints) {
            throw new BadRequestException(
                'Maximum points must be greater than minimum points',
            );
        }

        // Check for overlapping ranges with existing levels (excluding current level if updating)
        const existingLevels = await this.prisma.progressLevel.findMany({
            where: {
                schoolYear,
                level: {
                    not: level,
                },
            },
        });

        for (const existingLevel of existingLevels) {
            if (
                (minPoints >= existingLevel.minPoints &&
                    minPoints < existingLevel.maxPoints) ||
                (maxPoints > existingLevel.minPoints &&
                    maxPoints <= existingLevel.maxPoints) ||
                (minPoints <= existingLevel.minPoints &&
                    maxPoints >= existingLevel.maxPoints)
            ) {
                throw new BadRequestException(
                    `Point range overlaps with existing level '${existingLevel.level}' (${existingLevel.minPoints}-${existingLevel.maxPoints})`,
                );
            }
        }
    }

    async calculateProgressPoints(
        activityScore: number,
        activityMaxPoints: number,
        activityLevel: ActivityLevel,
        req?: SchoolYearRequest,
    ): Promise<number> {
        const schoolYear = req?.schoolYear || '2025-2026';

        const progressLevel = await this.getProgressLevelByLevel(
            activityLevel,
            req,
        );

        if (activityMaxPoints <= 0) {
            throw new BadRequestException(
                'Activity max points must be greater than 0',
            );
        }

        if (activityScore < 0) {
            throw new BadRequestException('Activity score cannot be negative');
        }

        const progressPoints = Math.round(
            (activityScore / activityMaxPoints) * progressLevel.pointValue,
        );

        return Math.max(0, progressPoints); // Ensure non-negative
    }
}
