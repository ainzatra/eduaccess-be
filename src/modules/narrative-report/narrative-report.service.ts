import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { CreateNarrativeReportDto } from './dto/create-narrative-report.dto';
import { UpdateNarrativeReportDto } from './dto/update-narrative-report.dto';

@Injectable()
export class NarrativeReportService {
    constructor(private readonly prisma: PrismaService) {}

    async createReport(createReportDto: CreateNarrativeReportDto) {
        const { student_id, ...reportData } = createReportDto;

        // Verify student exists
        const student = await this.prisma.user.findUnique({
            where: { id: student_id },
            include: { assigned_section: true },
        });

        if (!student) {
            throw new NotFoundException('Student not found');
        }

        if (
            !student.assigned_section ||
            student.assigned_section.length === 0
        ) {
            throw new BadRequestException(
                'Student is not assigned to any section',
            );
        }

        const section = student.assigned_section[0];
        const schoolYear = section.school_year || '2025-2026';

        // Check if report already exists for this student, section, and school year
        const existingReport = await this.prisma.narrativeReport.findUnique({
            where: {
                student_id_section_id_schoolYear: {
                    student_id,
                    section_id: section.id,
                    schoolYear,
                },
            },
        });

        if (existingReport) {
            throw new BadRequestException(
                'Narrative report already exists for this student in the current school year',
            );
        }

        // Create the narrative report
        const report = await this.prisma.narrativeReport.create({
            data: {
                student_id,
                section_id: section.id,
                schoolYear,
                behavior: reportData.behavior,
                speechAndLanguage: reportData.speechAndLanguage,
                fineMotor: reportData.fineMotor,
                grossMotor: reportData.grossMotor,
                activitiesForDailyLivingSkills:
                    reportData.activitiesForDailyLivingSkills,
                cognitive: reportData.cognitive,
                areasForDevelopment: reportData.areasForDevelopment,
                strategies: reportData.strategies,
                recommendations: reportData.recommendations,
                conclusion: reportData.conclusion,
            },
            select: { id: true },
        });

        return report;
    }

    async getReportByStudent(studentId: string) {
        const student = await this.prisma.user.findUnique({
            where: { id: studentId },
            include: { assigned_section: true },
        });

        if (!student) {
            throw new NotFoundException('Student not found');
        }

        const reports = await this.prisma.narrativeReport.findMany({
            where: {
                student_id: studentId,
            },
            include: {
                student: {
                    select: {
                        id: true,
                        full_name: true,
                        birthday: true,
                        age: true,
                    },
                },
                section: {
                    select: {
                        id: true,
                        name: true,
                        school_year: true,
                        teacher: {
                            select: {
                                full_name: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!reports) {
            throw new NotFoundException(
                'Narrative report not found for this student',
            );
        }

        const { principal } = await this.getReportSettings();

        const formattedReports = reports.map((report) => ({
            ...report,
            principal,
        }));

        return formattedReports;
    }

    async getReportById(reportId: string) {
        const report = await this.prisma.narrativeReport.findUnique({
            where: { id: reportId },
            include: {
                student: {
                    select: {
                        id: true,
                        full_name: true,
                        birthday: true,
                        age: true,
                        condition: true,
                    },
                },
                section: {
                    select: {
                        id: true,
                        name: true,
                        school_year: true,
                        teacher: {
                            select: {
                                full_name: true,
                            },
                        },
                    },
                },
            },
        });

        if (!report) {
            throw new NotFoundException('Narrative report not found');
        }

        const { principal } = await this.getReportSettings();

        return { ...report, principal };
    }

    async updateReport(
        reportId: string,
        updateReportDto: UpdateNarrativeReportDto,
    ) {
        // Check if report exists
        const existingReport = await this.prisma.narrativeReport.findUnique({
            where: { id: reportId },
        });

        if (!existingReport) {
            throw new NotFoundException('Narrative report not found');
        }

        const updatedReport = await this.prisma.narrativeReport.update({
            where: { id: reportId },
            data: {
                behavior: updateReportDto.behavior,
                speechAndLanguage: updateReportDto.speechAndLanguage,
                fineMotor: updateReportDto.fineMotor,
                grossMotor: updateReportDto.grossMotor,
                activitiesForDailyLivingSkills:
                    updateReportDto.activitiesForDailyLivingSkills,
                cognitive: updateReportDto.cognitive,
                areasForDevelopment: updateReportDto.areasForDevelopment,
                strategies: updateReportDto.strategies,
                recommendations: updateReportDto.recommendations,
                conclusion: updateReportDto.conclusion,
            },
            select: {
                id: true,
            },
        });

        return updatedReport;
    }

    async getReportsBySection(sectionId: string) {
        const reports = await this.prisma.narrativeReport.findMany({
            where: { section_id: sectionId },
            include: {
                student: {
                    select: {
                        id: true,
                        full_name: true,
                        birthday: true,
                        nickname: true,
                    },
                },
                section: {
                    select: {
                        id: true,
                        name: true,
                        school_year: true,
                        teacher: {
                            select: {
                                full_name: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return reports;
    }

    async getReportSettings() {
        let settings = await this.prisma.narrativeReportSettings.findFirst();

        if (!settings) {
            // Create default settings if none exist
            settings = await this.prisma.narrativeReportSettings.create({
                data: {
                    principal: 'MARILYN P. SAMSON',
                },
            });
        }

        return settings;
    }

    async updateReportSettings(principal: string) {
        let settings = await this.prisma.narrativeReportSettings.findFirst();

        if (!settings) {
            settings = await this.prisma.narrativeReportSettings.create({
                data: { principal },
            });
        } else {
            settings = await this.prisma.narrativeReportSettings.update({
                where: { id: settings.id },
                data: { principal },
            });
        }

        return settings;
    }

    async getStudentInfo(studentId: string) {
        const student = await this.prisma.user.findUnique({
            where: { id: studentId },
            select: {
                id: true,
                full_name: true,
                birthday: true,
                age: true,
                condition: true,
                assigned_section: {
                    select: {
                        id: true,
                        name: true,
                        school_year: true,
                    },
                },
            },
        });

        if (!student) {
            throw new NotFoundException('Student not found');
        }

        return student;
    }
}
