import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { S3Service } from '../s3.service';
import { smartUnion } from '@zenstackhq/runtime/zod-utils';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notification/notification.service';
import { ClsService } from 'nestjs-cls';
import { Condition } from '@prisma/client';
import { SchoolYearRequest } from '../school-year/school-year.middleware';
import { ProgressLevelService } from '../progress-level/progress-level.service';
import { StudentProgressService } from '../student-progress/student-progress.service';

@Injectable()
export class ActivityService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly s3: S3Service,
        private readonly email: EmailService,
        private readonly notification: NotificationService,
        private readonly cls: ClsService,
        private readonly progressLevelService: ProgressLevelService,
        private readonly studentProgressService: StudentProgressService,
    ) {}

    async createActivity(data, files, req?: SchoolYearRequest) {
        const { teacher_id, schema } = data;
        const schoolYear = req?.schoolYear || '2025-2026';

        const section = await this.prisma.section.findFirst({
            where: {
                teacher_id,
                school_year: schoolYear,
            },
        });

        if (!section)
            throw new NotFoundException('Teacher has no assigned section');

        const parsedSchema = JSON.parse(schema);

        console.log({ parsedSchema });

        // Upload audio files to s3 first then return the url then paste the url in their respective audio places
        const updatedSchema =
            files.audios || files.images
                ? await this.uploadActivityFiles(parsedSchema, files)
                : parsedSchema;

        const {
            subject: subject_id,
            title,
            titleAudio,
            instructions,
            instructionsAudio,
            level,
            graded,
            questions,
            category,
        } = updatedSchema;

        console.log('Question type before saving:', typeof questions);
        // Save the schema with s3 urls to db
        const createdActivity = await this.prisma.activity.create({
            data: {
                title,
                titleAudio,
                instructions,
                instructionsAudio,
                level,
                graded,
                subject_id,
                section_id: section.id,
                teacher_id,
                questions: JSON.stringify(questions),
                category,
                school_year: schoolYear,
            },
        });

        // Notify all students in the section
        const students = await this.prisma.user.findMany({
            where: {
                assigned_section: {
                    some: {
                        id: section.id,
                    },
                },
            },
            select: {
                id: true,
                full_name: true,
                guardian: {
                    select: {
                        email: true,
                    },
                },
            },
        });

        const subject = await this.prisma.subject.findUnique({
            where: { id: subject_id },
        });

        for (const student of students) {
            await this.notification.createNotification({
                user_id: student.id,
                title: 'New Activity Created',
                description: `A new activity "${createdActivity.title}" has been created by your teacher.`,
                subject_id: createdActivity.subject_id,
                activity_id: createdActivity.id,
                type: 'new_activity',
            });

            // Send email to guardian if exists
            if (student.guardian) {
                const message = `
                    <p>Dear Guardian,</p>
                    <p>A new activity has been created for your student <strong>${student.full_name}</strong>.</p>
                    <p><strong>Activity Title:</strong> ${createdActivity.title}</p>
                    <p><strong>Subject:</strong> ${subject?.title}</p>
                    <p>Please encourage your student to complete the activity.</p>
                    <p>Thank you!</p>
                `;
                if (student.guardian.email) {
                    await this.email.sendNotificationEmail(
                        student.guardian.email,
                        'New Activity Assigned to Student',
                        message,
                    );
                }
            }
        }

        return createdActivity;
    }

    private async uploadActivityFiles(schema, files) {
        // const schema = JSON.parse(data);

        if (files.audios && files.audios.length > 0) {
            for (const file of files.audios) {
                const id = file.originalname.split('.')[0];
                console.log('file id', id);
                const key = `activity/audio/${Date.now()}-${(file.originalname || 'upload').replace(/\s+/g, '_')}`;
                const url = await this.s3.upload(file, key);
                if (schema.titleAudio === id) {
                    schema.titleAudio = url;
                } else if (schema.instructionsAudio === id) {
                    schema.instructionsAudio = url;
                } else {
                    // for (const index in schema.questions) {
                    //     if (schema.questions[index] === id) {
                    //         schema.questions[index] = url;
                    //     }
                    // }

                    this.updateMedia(schema, id, url, 'audio');
                }
            }
        }
        if (files.images && files.images.length > 0) {
            for (const file of files.images) {
                const id = file.originalname.split('.')[0];
                console.log('file id', id);
                const key = `activity/images/${Date.now()}-${(file.originalname || 'upload').replace(/\s+/g, '_')}`;
                const url = await this.s3.upload(file, key);

                this.updateMedia(schema, id, url, 'image');
            }
        }

        console.log(JSON.stringify(schema, null, 2));
        return schema;
    }

    private updateMedia = (
        obj: any,
        id: string,
        url: string,
        type: 'audio' | 'image',
    ) => {
        if (!obj || typeof obj !== 'object') return;
        console.log('Checking', obj);
        // If this node has matching id
        if (obj.value === id || obj.audio === id) {
            if (type === 'image' && obj.kind === 'image') {
                console.log(
                    'Found match id replacing value with image url',
                    url,
                );
                obj.value = url;
            }
            if (type === 'audio') {
                console.log(
                    'Found match id replacing value with audio url',
                    url,
                );
                obj.audio = url;
            }
        }

        // Recurse into children
        for (const key of Object.keys(obj)) {
            const child = obj[key];
            if (Array.isArray(child)) {
                child.forEach((c) => this.updateMedia(c, id, url, type));
            } else if (typeof child === 'object') {
                this.updateMedia(child, id, url, type);
            }
        }
    };

    private computeScore(answers: any[], questions: any[]): number {
        let score = 0;
        for (const answer of answers) {
            const question = questions.find(
                (q: any) => q.id === answer.questionId,
            );
            if (!question) continue;
            if (question.type === 'multiple_choice') {
                if (question.correctChoiceId === answer.selectedChoiceId) {
                    score += question.points;
                }
            } else if (question.type === 'matching') {
                let correctMatches = 0;
                const totalPairs = question.pairs.length;
                for (const subPair of answer.pairs) {
                    const correctPair = question.pairs.find(
                        (p: any) => p.left.id === subPair.leftId,
                    );
                    if (
                        correctPair &&
                        correctPair.right.id === subPair.rightId
                    ) {
                        correctMatches++;
                    }
                }
                score += (correctMatches / totalPairs) * question.points;
            }

            console.log({ points: question.points, score });
        }
        return score;
    }

    async fetchSubjectActivities(
        id: string,
        subject: string,
        req?: SchoolYearRequest,
    ) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });
        const schoolYear = req?.schoolYear || '2025-2026';

        if (!user) throw new NotFoundException('User not found');

        let where;

        if (user.role === 'teacher') {
            where = {
                teacher_id: user.id,
                school_year: schoolYear,
            };
        } else if (user.role === 'student') {
            where = {
                students: {
                    some: {
                        id: user.id,
                    },
                },
                school_year: schoolYear,
            };
        } else {
            throw new BadRequestException('Not a student or teacher');
        }
        const section = await this.prisma.section.findFirst({
            where,
        });

        if (!section) throw new NotFoundException();

        // Build the base query
        let activityWhere: any = {
            section_id: section.id,
            subject_id: subject,
            school_year: schoolYear,
        };

        // Add category filtering for students
        if (user.role === 'student') {
            activityWhere.category = user.condition as Condition;

            // Add level filtering for students - only show activities at or below their current level
            const studentProgress =
                await this.studentProgressService.getStudentProgressBySubject(
                    user.id,
                    subject,
                    { schoolYear } as any,
                );

            if (studentProgress) {
                const levelHierarchy = {
                    beginner: 1,
                    intermediate: 2,
                    advance: 3,
                };

                const studentLevelValue =
                    levelHierarchy[studentProgress.currentLevel];

                activityWhere.level = {
                    in: ['beginner', 'intermediate', 'advance'].filter(
                        (level) => levelHierarchy[level] <= studentLevelValue,
                    ),
                };
            }
        }

        return this.prisma.activity.findMany({
            where: activityWhere,
            include: {
                submissions: {
                    where: {
                        student_id: user.role == 'student' ? user.id : '',
                        is_latest: true,
                    },
                },
                retake_permissions: {
                    where: {
                        student_id: user.role == 'student' ? user.id : '',
                    },
                },
            },
        });
    }

    async fetchActivityById(id: string) {
        const activity = await this.prisma.activity.findUnique({
            where: { id },
        });

        if (!activity) throw new NotFoundException('Activity not found');
        console.log(activity);
        return activity;
    }

    async deleteActivity(id: string) {
        return this.prisma.activity.delete({
            where: { id },
        });
    }

    async submitActivity(
        studentId: string,
        body,
        audioFiles?: { [key: string]: Express.Multer.File },
    ) {
        const activity = await this.prisma.activity.findUnique({
            where: { id: body.activityId },
            include: {
                teacher: {
                    select: {
                        email: true,
                    },
                },
            },
        });

        if (!activity) throw new NotFoundException('Activity not found');

        // Get student information to check condition
        const student = await this.prisma.user.findUnique({
            where: { id: studentId },
        });

        if (!student) throw new NotFoundException('Student not found');

        // Parse answers from body
        let answers =
            typeof body.answers === 'string'
                ? JSON.parse(body.answers)
                : body.answers;

        // Process audio files if provided
        if (audioFiles && Object.keys(audioFiles).length > 0) {
            answers = await this.processAudioFiles(
                answers,
                audioFiles,
                studentId,
                body.activityId,
            );
        }

        // Validate audio requirements for speech delay students
        if (student.condition === 'speech_delay') {
            await this.validateAudioRequirements(
                answers,
                JSON.parse(activity.questions),
            );
        }

        if (activity.graded) {
            body.score = this.computeScore(
                answers,
                JSON.parse(activity.questions),
            );
        }

        const prevSubmission = await this.prisma.activitySubmission.findMany({
            where: {
                student_id: studentId,
                activity_id: body.activityId,
            },
            orderBy: {
                version: 'desc',
            },
        });

        // Check if student has already submitted and doesn't have retake permission
        if (prevSubmission && prevSubmission.length > 0) {
            const retakePermission =
                await this.prisma.activityRetakePermission.findUnique({
                    where: {
                        activity_id_student_id: {
                            activity_id: body.activityId,
                            student_id: studentId,
                        },
                    },
                });

            if (!retakePermission) {
                throw new BadRequestException(
                    'You have already submitted this activity. Please contact your teacher for retake permission.',
                );
            }
        }

        // Calculate progress points for this submission
        let progressPoints = 0;
        let previousProgressPoints = 0;

        if (activity.graded && body.score !== undefined) {
            const questions = JSON.parse(activity.questions);
            let maxPoints = 0;
            for (const q of questions) {
                maxPoints += q.points;
            }

            progressPoints =
                await this.progressLevelService.calculateProgressPoints(
                    body.score,
                    maxPoints,
                    activity.level,
                    { schoolYear: activity.school_year } as any,
                );

            // If this is a retake, get previous progress points to replace
            if (prevSubmission.length > 0 && prevSubmission[0].progressPoints) {
                previousProgressPoints = prevSubmission[0].progressPoints;
            }
        }

        // Calculate version number for this submission
        const version =
            prevSubmission.length > 0 ? prevSubmission[0].version + 1 : 1;

        // If this is a retake, update the previous submission to not be latest
        if (prevSubmission.length > 0) {
            await this.prisma.activitySubmission.update({
                where: {
                    id: prevSubmission[0].id,
                },
                data: {
                    is_latest: false,
                },
            });
        }

        const submission = await this.prisma.activitySubmission.create({
            data: {
                activity_id: body.activityId,
                student_id: studentId,
                score: activity.graded ? body.score : 0,
                schema: JSON.stringify(answers), // Use processed answers with audio URLs
                status: activity.graded ? 'graded' : 'pending',
                version: version,
                is_latest: true,
                previous_submission_id:
                    prevSubmission.length > 0 ? prevSubmission[0].id : null,
                progressPoints,
                previousProgressPoints,
            },
        });

        // Update student progress with new points
        if (progressPoints > 0) {
            const netPoints = progressPoints - previousProgressPoints;
            await this.studentProgressService.updateStudentProgress(
                studentId,
                activity.subject_id,
                netPoints,
                { schoolYear: activity.school_year } as any,
            );
        }

        // If this was a retake, remove the retake permission after submission
        if (prevSubmission.length > 0) {
            await this.prisma.activityRetakePermission.delete({
                where: {
                    activity_id_student_id: {
                        activity_id: body.activityId,
                        student_id: studentId,
                    },
                },
            });
        }

        const message = `
            <p>Dear Teacher,</p>
            <p>A new activity submission has been received from student <strong>${student?.full_name}</strong>.</p>
            <p><strong>Activity Title:</strong> ${activity.title}</p>
            <p>Please log in to your EduAccess dashboard to review and grade the submission if applicable.</p>
            <p>Thank you for your dedication to student learning!</p>
        `;

        if (!activity.graded) {
            if (activity.teacher.email) {
                await this.email.sendNotificationEmail(
                    activity.teacher.email,
                    'New Activity Submission',
                    message,
                );
            }

            await this.notification.createNotification({
                user_id: activity.teacher_id,
                title: 'New Activity Submission',
                description: `A new activity submission has been received from student ${student?.full_name}. Activity: ${activity.title}`,
                subject_id: activity.subject_id,
                activity_id: activity.id,
                type: 'new_submission',
            });
        }

        return activity.graded
            ? { score: body.score }
            : 'Activity has been submitted';
    }

    async fetchActivitySubmissions(activityId: string) {
        const submissions = await this.prisma.activitySubmission.findMany({
            where: { activity_id: activityId, is_latest: true },
            include: {
                student: {
                    select: {
                        id: true,
                        avatar: true,
                        full_name: true,
                        studentProgress: {
                            where: {
                                subject: {
                                    activities: {
                                        some: { id: activityId },
                                    },
                                },
                            },
                            select: {
                                currentLevel: true,
                            },
                        },
                    },
                },
                activity: {
                    select: {
                        title: true,
                    },
                },
            },
        });

        return submissions;
    }

    async fetchActivitySubmission(submissionId: string) {
        const submission = await this.prisma.activitySubmission.findUnique({
            where: { id: submissionId },
            include: {
                student: {
                    select: {
                        id: true,
                        avatar: true,
                        full_name: true,
                    },
                },
                activity: {
                    select: {
                        title: true,
                    },
                },
            },
        });

        return submission;
    }

    async setSubmissionGrade(submissionId: string, score: number) {
        const submission = await this.prisma.activitySubmission.findUnique({
            where: { id: submissionId },
        });

        if (!submission) throw new NotFoundException('Submission not found');

        const activity = await this.prisma.activity.findUnique({
            where: {
                id: submission.activity_id,
            },
        });

        if (!activity) throw new NotFoundException('Activity not found');

        let maxPoints = 0;
        const questions = JSON.parse(activity.questions);

        for (const q of questions) {
            maxPoints += q.points;
        }

        if (score > maxPoints)
            throw new BadRequestException('Score exceeds max points');

        // Find previous submission to check for retakes
        const previousSubmission =
            await this.prisma.activitySubmission.findFirst({
                where: {
                    student_id: submission.student_id,
                    activity_id: submission.activity_id,
                    is_latest: false,
                },
                orderBy: {
                    version: 'desc',
                },
            });

        // Calculate progress points for this graded submission
        let progressPoints = 0;
        let previousProgressPoints = 0;

        progressPoints =
            await this.progressLevelService.calculateProgressPoints(
                score,
                maxPoints,
                activity.level,
                { schoolYear: activity.school_year } as any,
            );
        // Get previous progress points from previous submission if it exists
        if (previousSubmission && previousSubmission.progressPoints) {
            previousProgressPoints = previousSubmission.progressPoints;
        }

        console.log({
            progressPoints,
            previousProgressPoints,
            score,
            maxPoints,
            activityLevel: activity.level,
        });
        const updatedSubmission = await this.prisma.activitySubmission.update({
            where: {
                id: submissionId,
            },
            data: {
                score,
                status: 'graded',
                progressPoints,
                previousProgressPoints,
            },
        });

        // Update student progress with new points
        if (progressPoints >= 0) {
            const netPoints = progressPoints - previousProgressPoints;
            console.log({ netPoints });
            await this.studentProgressService.updateStudentProgress(
                submission.student_id,
                activity.subject_id,
                netPoints,
                { schoolYear: activity.school_year } as any,
            );
        }

        const student = await this.prisma.user.findUnique({
            where: { id: submission.student_id },
            include: {
                guardian: true,
            },
        });

        if (!student) throw new NotFoundException('Student not found');

        // Send notification to student
        await this.notification.createNotification({
            user_id: submission.student_id,
            title: 'Submission Graded',
            description: `Your submission for "${activity.title}" has been graded with a score of ${score}.`,
            subject_id: activity.subject_id,
            activity_id: activity.id,
            type: 'activity_graded',
        });

        // Send email to guardian if exists
        if (student.guardian) {
            const message = `
                <p>Dear Guardian,</p>
                <p>Your student <strong>${student.full_name}</strong> has received a grade for their activity submission.</p>
                <p><strong>Activity Title:</strong> ${activity.title}</p>
                <p><strong>Score:</strong> ${score}</p>
                <p>Please log in to your EduAccess dashboard to view more details.</p>
                <p>Thank you!</p>
            `;
            if (student.guardian.email) {
                await this.email.sendNotificationEmail(
                    student.guardian.email,
                    'Student Activity Graded',
                    message,
                );
            }
        }

        return updatedSubmission;
    }

    async allowRetake(
        activityId: string,
        studentId: string,
        teacherId: string,
        reason?: string,
    ) {
        // Verify the teacher owns this activity
        const activity = await this.prisma.activity.findUnique({
            where: { id: activityId },
        });

        if (!activity) throw new NotFoundException('Activity not found');

        const section = await this.prisma.section.findUnique({
            where: { id: activity?.section_id },
        });

        if (section?.teacher_id !== teacherId) {
            throw new BadRequestException(
                'You are not authorized to grant retake permission for this activity',
            );
        }

        // Check if student has submitted this activity before
        const existingSubmission =
            await this.prisma.activitySubmission.findFirst({
                where: {
                    activity_id: activityId,
                    student_id: studentId,
                },
            });

        if (!existingSubmission) {
            throw new BadRequestException(
                'Student has not submitted this activity yet',
            );
        }

        // Create or update retake permission
        const retakePermission =
            await this.prisma.activityRetakePermission.upsert({
                where: {
                    activity_id_student_id: {
                        activity_id: activityId,
                        student_id: studentId,
                    },
                },
                update: {
                    reason: reason,
                },
                create: {
                    activity_id: activityId,
                    student_id: studentId,
                    reason: reason,
                },
            });

        // Notify the student about the retake permission
        const student = await this.prisma.user.findUnique({
            where: { id: studentId },
            include: { guardian: true },
        });

        if (student) {
            await this.notification.createNotification({
                user_id: studentId,
                title: 'Activity Retake Allowed',
                description: `Your teacher has allowed you to retake the activity "${activity.title}".${reason ? ` Reason: ${reason}` : ''}`,
                subject_id: activity.subject_id,
                activity_id: activity.id,
                type: 'new_activity',
            });
            if (student.guardian?.email) {
                await this.email.sendNotificationEmail(
                    student.guardian.email,
                    'Activity Retake Permission Granted',
                    `
                    <p>Dear ${student.full_name},</p>
                    <p>Your teacher has granted you permission to retake the activity titled "<strong>${activity.title}</strong>".</p>
                    ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
                    <p>Please log in to your EduAccess dashboard to retake the activity at your earliest convenience.</p>
                    <p>Best regards,<br/>EduAccess Team</p>
                    `,
                );
            }
        }

        return retakePermission;
    }

    async fetchStudentSubmissionHistory(activityId: string, studentId: string) {
        const submissions = await this.prisma.activitySubmission.findMany({
            where: {
                activity_id: activityId,
                student_id: studentId,
                is_latest: false,
            },
            include: {
                student: {
                    select: {
                        id: true,
                        avatar: true,
                        full_name: true,
                    },
                },
                activity: {
                    select: {
                        title: true,
                    },
                },
            },
            orderBy: {
                version: 'asc',
            },
        });

        return submissions;
    }

    /**
     * Process audio files and upload them to S3
     * Updates the answers array to include audio URLs
     */
    private async processAudioFiles(
        answers: any[],
        audioFiles: { [key: string]: Express.Multer.File },
        studentId: string,
        activityId: string,
    ): Promise<any[]> {
        const processedAnswers = [...answers];

        for (const answer of processedAnswers) {
            const questionId = answer.questionId;

            // Check if there's an audio file for this question
            if (audioFiles[questionId]) {
                const audioFile = audioFiles[questionId];

                // Create unique key for S3
                const timestamp = Date.now();
                const fileExtension = audioFile.originalname.split('.').pop();
                const key = `activity-submissions/audio/${studentId}/${activityId}/${questionId}_${timestamp}.${fileExtension}`;

                // Upload to S3
                const audioUrl = await this.s3.upload(audioFile, key);

                // Add audio URL to the answer
                answer.audioUrl = audioUrl;

                console.log(
                    `Uploaded audio for question ${questionId}: ${audioUrl}`,
                );
            }
        }

        return processedAnswers;
    }

    /**
     * Validate that speech delay students provide audio recordings for all questions
     */
    private async validateAudioRequirements(
        answers: any[],
        questions: any[],
    ): Promise<void> {
        const missingAudioQuestions: string[] = [];

        for (const question of questions) {
            const questionId = question.id;

            // Check if there's an answer for this question
            const answer = answers.find((a) => a.questionId === questionId);
            if (!answer) {
                continue; // Skip if no answer provided
            }

            // Check if audio URL is present in the processed answer
            if (!answer.audioUrl) {
                missingAudioQuestions.push(questionId);
            }
        }

        if (missingAudioQuestions.length > 0) {
            throw new BadRequestException(
                `Audio recordings are required for speech delay students. Missing audio for questions: ${missingAudioQuestions.join(', ')}`,
            );
        }
    }
}
