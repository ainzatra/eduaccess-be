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

@Injectable()
export class ActivityService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly s3: S3Service,
        private readonly email: EmailService,
        private readonly notification: NotificationService,
    ) {}

    async createActivity(data, files) {
        const { teacher_id, schema } = data;

        const section = await this.prisma.section.findFirst({
            where: {
                teacher_id,
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

                await this.email.sendNotificationEmail(
                    student.guardian.email,
                    'New Activity Assigned to Student',
                    message,
                );
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

    async fetchSubjectActivities(id: string, subject: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!user) throw new NotFoundException('User not found');

        let where;

        if (user.role === 'teacher') {
            where = {
                teacher_id: user.id,
            };
        } else if (user.role === 'student') {
            where = {
                students: {
                    some: {
                        id: user.id,
                    },
                },
            };
        } else {
            throw new BadRequestException('Not a student or teacher');
        }
        const section = await this.prisma.section.findFirst({
            where,
        });

        if (!section) throw new NotFoundException();

        return this.prisma.activity.findMany({
            where: {
                section_id: section.id,
                subject_id: subject,
            },
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

    async submitActivity(studentId: string, body) {
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

        if (activity.graded) {
            body.score = this.computeScore(
                body.answers,
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
                schema: JSON.stringify(body.answers),
                status: activity.graded ? 'graded' : 'pending',
                version: version,
                is_latest: true,
                previous_submission_id:
                    prevSubmission.length > 0 ? prevSubmission[0].id : null,
            },
        });

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

        const student = await this.prisma.user.findUnique({
            where: {
                id: studentId,
            },
        });

        const message = `
            <p>Dear Teacher,</p>
            <p>A new activity submission has been received from student <strong>${student?.full_name}</strong>.</p>
            <p><strong>Activity Title:</strong> ${activity.title}</p>
            <p>Please log in to your EduAccess dashboard to review and grade the submission if applicable.</p>
            <p>Thank you for your dedication to student learning!</p>
        `;

        if (!activity.graded) {
            await this.email.sendNotificationEmail(
                activity.teacher.email ?? '',
                'New Activity Submission',
                message,
            );

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

        const updatedSubmission = await this.prisma.activitySubmission.update({
            where: {
                id: submissionId,
            },
            data: {
                score,
                status: 'graded',
            },
        });

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

            await this.email.sendNotificationEmail(
                student.guardian.email,
                'Student Activity Graded',
                message,
            );
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

            await this.email.sendNotificationEmail(
                student.guardian?.email ?? '',
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
}
