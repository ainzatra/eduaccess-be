import {
    Injectable,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SchoolYearService } from './school-year.service';

@Injectable()
export class SchoolYearTransitionService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly schoolYearService: SchoolYearService,
    ) {}

    /**
     * Get data summary for current school year
     */
    async getCurrentSchoolYearSummary() {
        const activeSchoolYear =
            await this.schoolYearService.getActiveSchoolYear();

        const [
            sectionsCount,
            subjectsCount,
            activitiesCount,
            lessonsCount,
            studentsCount,
        ] = await Promise.all([
            this.prisma.section.count({
                where: { school_year: activeSchoolYear.year },
            }),
            this.prisma.subject.count({
                where: { school_year: activeSchoolYear.year },
            }),
            this.prisma.activity.count({
                where: { school_year: activeSchoolYear.year },
            }),
            this.prisma.lesson.count({
                where: { school_year: activeSchoolYear.year },
            }),
            this.prisma.user.count({
                where: {
                    role: 'student',
                    assigned_section: {
                        some: {
                            school_year: activeSchoolYear.year,
                        },
                    },
                },
            }),
        ]);

        return {
            schoolYear: activeSchoolYear,
            summary: {
                sections: sectionsCount,
                subjects: subjectsCount,
                activities: activitiesCount,
                lessons: lessonsCount,
                students: studentsCount,
            },
        };
    }

    /**
     * Get all school years with their data summaries
     */
    async getAllSchoolYearsSummaries() {
        const schoolYears = await this.schoolYearService.getAllSchoolYears();

        const summaries = await Promise.all(
            schoolYears.map(async (schoolYear) => {
                const [
                    sectionsCount,
                    subjectsCount,
                    activitiesCount,
                    lessonsCount,
                    studentsCount,
                ] = await Promise.all([
                    this.prisma.section.count({
                        where: { school_year: schoolYear.year },
                    }),
                    this.prisma.subject.count({
                        where: { school_year: schoolYear.year },
                    }),
                    this.prisma.activity.count({
                        where: { school_year: schoolYear.year },
                    }),
                    this.prisma.lesson.count({
                        where: { school_year: schoolYear.year },
                    }),
                    this.prisma.user.count({
                        where: {
                            role: 'student',
                            assigned_section: {
                                some: {
                                    school_year: schoolYear.year,
                                },
                            },
                        },
                    }),
                ]);

                return {
                    ...schoolYear,
                    summary: {
                        sections: sectionsCount,
                        subjects: subjectsCount,
                        activities: activitiesCount,
                        lessons: lessonsCount,
                        students: studentsCount,
                    },
                };
            }),
        );

        return summaries;
    }

    /**
     * Validate that a school year can be safely activated
     */
    async validateSchoolYearActivation(schoolYearId: string) {
        const schoolYear =
            await this.schoolYearService.getSchoolYearById(schoolYearId);

        if (!schoolYear.isActive) {
            // Check if there's any data in this school year
            const dataCount = await this.prisma.section.count({
                where: { school_year: schoolYear.year },
            });

            if (dataCount === 0) {
                throw new BadRequestException(
                    'Cannot activate a school year with no data. Please create sections, subjects, and activities first.',
                );
            }
        }

        return true;
    }

    /**
     * Get students not assigned to any section in the current school year
     */
    async getUnassignedStudents() {
        const activeSchoolYear =
            await this.schoolYearService.getActiveSchoolYear();

        const unassignedStudents = await this.prisma.user.findMany({
            where: {
                role: 'student',
                assigned_section: {
                    none: {
                        school_year: activeSchoolYear.year,
                    },
                },
            },
            select: {
                id: true,
                full_name: true,
                username: true,
                age: true,
                condition: true,
                avatar: true,
            },
            orderBy: {
                full_name: 'asc',
            },
        });

        return {
            schoolYear: activeSchoolYear,
            unassignedStudents,
        };
    }

    /**
     * Get data migration status between school years
     */
    async getMigrationStatus(fromSchoolYear: string, toSchoolYear: string) {
        const [fromData, toData] = await Promise.all([
            this.getSchoolYearDataSummary(fromSchoolYear),
            this.getSchoolYearDataSummary(toSchoolYear),
        ]);

        return {
            from: fromData,
            to: toData,
            migrationNeeded: {
                sections: fromData.sections > toData.sections,
                subjects: fromData.subjects > toData.subjects,
                activities: fromData.activities > toData.activities,
                lessons: fromData.lessons > toData.lessons,
                students: fromData.students > toData.students,
            },
        };
    }

    private async getSchoolYearDataSummary(schoolYear: string) {
        const [sections, subjects, activities, lessons, students] =
            await Promise.all([
                this.prisma.section.count({
                    where: { school_year: schoolYear },
                }),
                this.prisma.subject.count({
                    where: { school_year: schoolYear },
                }),
                this.prisma.activity.count({
                    where: { school_year: schoolYear },
                }),
                this.prisma.lesson.count({
                    where: { school_year: schoolYear },
                }),
                this.prisma.user.count({
                    where: {
                        role: 'student',
                        assigned_section: {
                            some: {
                                school_year: schoolYear,
                            },
                        },
                    },
                }),
            ]);

        return { sections, subjects, activities, lessons, students };
    }
}
