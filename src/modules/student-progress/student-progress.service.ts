import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLevel } from '@prisma/client';
import { SchoolYearRequest } from '../school-year/school-year.middleware';
import { ProgressLevelService } from '../progress-level/progress-level.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class StudentProgressService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly progressLevelService: ProgressLevelService,
        private readonly notificationService: NotificationService,
    ) {}

    async getStudentProgress(studentId: string, req?: SchoolYearRequest) {
        const schoolYear = req?.schoolYear || '2025-2026';

        return this.prisma.studentProgress.findMany({
            where: {
                studentId,
                schoolYear,
            },
            include: {
                student: {
                    select: {
                        id: true,
                        full_name: true,
                        avatar: true,
                    },
                },
                subject: {
                    select: {
                        id: true,
                        title: true,
                        image: true,
                    },
                },
            },
        });
    }

    async getStudentProgressBySubject(
        studentId: string,
        subjectId: string,
        req?: SchoolYearRequest,
    ) {
        const schoolYear = req?.schoolYear || '2025-2026';

        const progress = await this.prisma.studentProgress.findUnique({
            where: {
                studentId_subjectId_schoolYear: {
                    studentId,
                    subjectId,
                    schoolYear,
                },
            },
            include: {
                student: {
                    select: {
                        id: true,
                        full_name: true,
                        avatar: true,
                    },
                },
                subject: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });

        if (!progress) {
            // Create initial progress record if it doesn't exist
            return this.createStudentProgress(studentId, subjectId, req);
        }

        return progress;
    }

    async createStudentProgress(
        studentId: string,
        subjectId: string,
        req?: SchoolYearRequest,
    ) {
        const schoolYear = req?.schoolYear || '2025-2026';

        // Check if student and subject exist
        const student = await this.prisma.user.findUnique({
            where: { id: studentId, role: 'student' },
        });

        if (!student) {
            throw new NotFoundException('Student not found');
        }

        const subject = await this.prisma.subject.findUnique({
            where: { id: subjectId },
        });

        if (!subject) {
            throw new NotFoundException('Subject not found');
        }

        return this.prisma.studentProgress.create({
            data: {
                studentId,
                subjectId,
                currentLevel: 'beginner',
                totalPoints: 0,
                schoolYear,
            },
            include: {
                student: {
                    select: {
                        id: true,
                        full_name: true,
                        avatar: true,
                    },
                },
                subject: {
                    select: {
                        id: true,
                        title: true,
                        image: true,
                    },
                },
            },
        });
    }

    async updateStudentProgress(
        studentId: string,
        subjectId: string,
        pointsToAdd: number,
        req?: SchoolYearRequest,
    ) {
        const schoolYear = req?.schoolYear || '2025-2026';

        // Get or create student progress
        let progress = await this.prisma.studentProgress.findUnique({
            where: {
                studentId_subjectId_schoolYear: {
                    studentId,
                    subjectId,
                    schoolYear,
                },
            },
        });

        if (!progress) {
            progress = await this.createStudentProgress(
                studentId,
                subjectId,
                req,
            );
        }

        // Update total points
        const newTotalPoints = Math.max(0, progress.totalPoints + pointsToAdd);

        const updatedProgress = await this.prisma.studentProgress.update({
            where: {
                id: progress.id,
            },
            data: {
                totalPoints: newTotalPoints,
            },
        });

        // Check for level progression
        await this.checkAndUpdateLevel(updatedProgress, req);

        return updatedProgress;
    }

    async getAvailableActivities(
        studentId: string,
        subjectId: string,
        req?: SchoolYearRequest,
    ) {
        const schoolYear = req?.schoolYear || '2025-2026';

        // Get student's current level for this subject
        const studentProgress = await this.getStudentProgressBySubject(
            studentId,
            subjectId,
            req,
        );

        // Get student's section to filter activities
        const student = await this.prisma.user.findUnique({
            where: { id: studentId },
            include: {
                assigned_section: {
                    where: { school_year: schoolYear },
                    select: { id: true },
                },
            },
        });

        if (!student || !student.assigned_section[0]) {
            throw new NotFoundException(
                'Student is not assigned to any section',
            );
        }

        const sectionId = student.assigned_section[0].id;

        // Get activities at or below student's current level
        const levelHierarchy = {
            beginner: 1,
            intermediate: 2,
            advance: 3,
        };

        const studentLevelValue = levelHierarchy[studentProgress.currentLevel];

        return this.prisma.activity.findMany({
            where: {
                section_id: sectionId,
                subject_id: subjectId,
                school_year: schoolYear,
                level: {
                    in: (
                        [
                            'beginner',
                            'intermediate',
                            'advance',
                        ] as ActivityLevel[]
                    ).filter(
                        (level) => levelHierarchy[level] <= studentLevelValue,
                    ),
                },
            },
            include: {
                submissions: {
                    where: {
                        student_id: studentId,
                        is_latest: true,
                    },
                },
            },
            orderBy: {
                created_at: 'desc',
            },
        });
    }

    async canAccessActivity(
        studentId: string,
        activityId: string,
        req?: SchoolYearRequest,
    ): Promise<boolean> {
        const schoolYear = req?.schoolYear || '2025-2026';

        // Get activity details
        const activity = await this.prisma.activity.findUnique({
            where: { id: activityId },
        });

        if (!activity) {
            throw new NotFoundException('Activity not found');
        }

        // Get student's current level for this subject
        const studentProgress = await this.getStudentProgressBySubject(
            studentId,
            activity.subject_id,
            req,
        );

        const levelHierarchy = {
            beginner: 1,
            intermediate: 2,
            advance: 3,
        };

        return (
            levelHierarchy[studentProgress.currentLevel] >=
            levelHierarchy[activity.level]
        );
    }

    async getProgressWithDetails(
        studentId: string,
        subjectId: string,
        req?: SchoolYearRequest,
    ) {
        const progress = await this.getStudentProgressBySubject(
            studentId,
            subjectId,
            req,
        );

        const progressLevels =
            await this.progressLevelService.getProgressLevels(req);

        // Find current level and next level
        const currentLevelConfig = progressLevels.find(
            (level) => level.level === progress.currentLevel,
        );

        const nextLevelConfig = progressLevels.find(
            (level) => level.minPoints > progress.totalPoints,
        );

        const pointsToNextLevel = nextLevelConfig
            ? nextLevelConfig.minPoints - progress.totalPoints
            : 0;

        const currentLevelMax = currentLevelConfig
            ? currentLevelConfig.maxPoints - currentLevelConfig.minPoints
            : 0;
        const pointsInCurrentLevel = currentLevelConfig
            ? progress.totalPoints - currentLevelConfig.minPoints
            : 0;
        const progressPercentage = currentLevelMax
            ? Math.round((pointsInCurrentLevel / currentLevelMax) * 100)
            : 0;

        console.log('progress details', {
            pointsToNextLevel,
            progressPercentage,
            currentLevelConfig,
            nextLevelConfig,
        });
        console.log('progress', progress);

        return {
            ...progress,
            pointsToNextLevel,
            progressPercentage,
            currentLevelConfig,
            nextLevelConfig,
        };
    }

    async getAllStudentProgressWithDetails(
        studentId: string,
        req?: SchoolYearRequest,
    ) {
        const schoolYear = req?.schoolYear || '2025-2026';
        const student = await this.prisma.user.findUnique({
            where: { id: studentId, role: 'student' },
        });

        if (!student) throw new NotFoundException('Student not found');

        // Get all student progress records for the school year
        const allProgress = await this.prisma.studentProgress.findMany({
            where: {
                schoolYear,
                studentId,
                subject: {
                    category: student.condition,
                },
            },
            include: {
                student: {
                    select: {
                        id: true,
                        full_name: true,
                        avatar: true,
                        email: true,
                    },
                },
                subject: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });

        // Get all progress levels for the school year
        const progressLevels =
            await this.progressLevelService.getProgressLevels(req);

        // Enrich each progress record with detailed information
        const enrichedProgress = await Promise.all(
            allProgress.map(async (progress) => {
                // Find current level and next level
                const currentLevelConfig = progressLevels.find(
                    (level) => level.level === progress.currentLevel,
                );

                const nextLevelConfig = progressLevels.find(
                    (level) => level.minPoints > progress.totalPoints,
                );

                const pointsToNextLevel = nextLevelConfig
                    ? nextLevelConfig.minPoints - progress.totalPoints
                    : 0;

                const currentLevelMax = currentLevelConfig
                    ? currentLevelConfig.maxPoints -
                      currentLevelConfig.minPoints
                    : 0;
                const pointsInCurrentLevel = currentLevelConfig
                    ? progress.totalPoints - currentLevelConfig.minPoints
                    : 0;
                const progressPercentage = currentLevelMax
                    ? Math.round((pointsInCurrentLevel / currentLevelMax) * 100)
                    : 0;

                // Get recent activity submissions for this student in this subject
                const recentSubmissions =
                    await this.prisma.activitySubmission.findMany({
                        where: {
                            student_id: progress.studentId,
                            activity: {
                                subject_id: progress.subjectId,
                                school_year: schoolYear,
                            },
                            is_latest: true,
                        },
                        include: {
                            activity: {
                                select: {
                                    id: true,
                                    title: true,
                                    level: true,
                                },
                            },
                        },
                        orderBy: {
                            submitted_at: 'desc',
                        },
                        take: 5, // Get last 5 submissions
                    });

                // Calculate completion statistics
                const totalActivities = await this.prisma.activity.count({
                    where: {
                        subject_id: progress.subjectId,
                        school_year: schoolYear,
                    },
                });

                const completedActivities =
                    await this.prisma.activitySubmission.count({
                        where: {
                            student_id: progress.studentId,
                            activity: {
                                subject_id: progress.subjectId,
                                school_year: schoolYear,
                            },
                            is_latest: true,
                        },
                    });

                const completionRate =
                    totalActivities > 0
                        ? Math.round(
                              (completedActivities / totalActivities) * 100,
                          )
                        : 0;

                return {
                    ...progress,
                    pointsToNextLevel,
                    progressPercentage,
                    currentLevelConfig,
                    nextLevelConfig,
                    recentSubmissions,
                    statistics: {
                        totalActivities,
                        completedActivities,
                        completionRate,
                    },
                };
            }),
        );

        return enrichedProgress;
    }

    private async checkAndUpdateLevel(progress: any, req?: SchoolYearRequest) {
        const progressLevels =
            await this.progressLevelService.getProgressLevels(req);

        // Find the appropriate level based on total points
        // For the highest level (advance), maxPoints might be a very large number
        // So we need to handle the upper boundary specially
        const newLevel = progressLevels.find(
            (level) =>
                progress.totalPoints >= level.minPoints &&
                progress.totalPoints <= level.maxPoints,
        );

        if (newLevel && newLevel.level !== progress.currentLevel) {
            // Level up!
            await this.prisma.studentProgress.update({
                where: { id: progress.id },
                data: { currentLevel: newLevel.level },
            });

            // Send level up notification
            await this.sendLevelUpNotification(
                progress.studentId,
                progress.subjectId,
                newLevel.level,
            );
        }
    }

    private async sendLevelUpNotification(
        studentId: string,
        subjectId: string,
        newLevel: ActivityLevel,
    ) {
        // Get student and subject details
        const student = await this.prisma.user.findUnique({
            where: { id: studentId },
            include: { guardian: true },
        });

        const subject = await this.prisma.subject.findUnique({
            where: { id: subjectId },
        });

        if (!student || !subject) return;

        // Create in-app notification
        await this.notificationService.createNotification({
            user_id: studentId,
            title: 'Level Up!',
            description: `Congratulations! You've advanced to ${newLevel} level in ${subject.title}.`,
            subject_id: subjectId,
            activity_id: '', // No specific activity for level up
            type: 'activity_graded', // Reuse existing notification type
        });

        // TODO: Send email to guardian if needed
        // This would require an email service integration
    }

    async getSectionProgressBySubject(
        sectionId: string,
        subjectId: string,
        req?: SchoolYearRequest,
    ) {
        const schoolYear = req?.schoolYear || '2025-2026';
        const subject = await this.prisma.subject.findUnique({
            where: { id: subjectId },
        });

        if (!subject) throw new NotFoundException('Subject not found');

        const students = await this.prisma.user.findMany({
            where: {
                assigned_section: {
                    some: {
                        id: sectionId,
                    },
                },
                condition: subject.category,
            },
            include: {
                studentProgress: {
                    where: {
                        subjectId,
                        schoolYear,
                    },
                },
            },
        });

        let progress = await this.prisma.studentProgress.findMany({
            where: {
                subjectId,
                schoolYear,
                student: {
                    assigned_section: {
                        some: {
                            id: sectionId,
                        },
                    },
                },
            },
            include: {
                subject: {
                    select: {
                        id: true,
                        title: true,
                        image: true,
                    },
                },
                student: {
                    select: {
                        id: true,
                        full_name: true,
                        username: true,
                        avatar: true,
                    },
                },
            },
        });

        if (students.length > progress.length) {
            console.log('Found students with no student progress yet');
            for (const student of students) {
                if (student.studentProgress.length === 0) {
                    console.log(
                        `Student ${student.full_name} - ${student.id} has no progress yet`,
                    );
                    await this.createStudentProgress(
                        student.id,
                        subjectId,
                        req,
                    );
                }
            }

            progress = await this.prisma.studentProgress.findMany({
                where: {
                    subjectId,
                    schoolYear,
                    student: {
                        assigned_section: {
                            some: {
                                id: sectionId,
                            },
                        },
                    },
                },
                include: {
                    subject: {
                        select: {
                            id: true,
                            title: true,
                            image: true,
                        },
                    },
                    student: {
                        select: {
                            id: true,
                            full_name: true,
                            username: true,
                            avatar: true,
                        },
                    },
                },
            });
        }

        console.log({ sectionProgress: progress });
        return progress;
    }
}
