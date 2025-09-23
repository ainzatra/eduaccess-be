import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { S3Service } from '../s3.service';
import { smartUnion } from '@zenstackhq/runtime/zod-utils';

@Injectable()
export class ActivityService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly s3: S3Service,
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

        // Upload audio files to s3 first then return the url then paste the url in their respective audio places
        const updatedSchema =
            files.audios || files.images
                ? await this.uploadActivityFiles(parsedSchema, files)
                : {
                      ...parsedSchema,
                      questions: JSON.parse(parsedSchema.questions),
                  };

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
        return await this.prisma.activity.create({
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
                if (
                    question.correctChoiceIds.includes(answer.selectedChoiceId)
                ) {
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
        });

        if (prevSubmission && prevSubmission.length > 0)
            throw new BadRequestException(
                'You have already submitted this activity',
            );

        const submission = await this.prisma.activitySubmission.create({
            data: {
                activity_id: body.activityId,
                student_id: studentId,
                score: activity.graded ? body.score : 0,
                schema: JSON.stringify(body.answers),
                status: activity.graded ? 'graded' : 'pending',
            },
        });

        return activity.graded
            ? { score: body.score }
            : 'Activity has been submitted';
    }

    async fetchActivitySubmissions(activityId: string) {
        const submissions = await this.prisma.activitySubmission.findMany({
            where: { activity_id: activityId },
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

        return this.prisma.activitySubmission.update({
            where: {
                id: submissionId,
            },
            data: {
                score,
                status: 'graded',
            },
        });
    }
}
