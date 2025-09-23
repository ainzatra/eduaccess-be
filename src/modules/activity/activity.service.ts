import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { S3Service } from '../s3.service';

@Injectable()
export class ActivityService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly s3: S3Service,
    ) {}

    async createActivity(data, files) {
        const { teacher_id } = data;

        const section = await this.prisma.section.findFirst({
            where: {
                teacher_id,
            },
        });

        if (!section)
            throw new NotFoundException('Teacher has no assigned section');

        // Upload audio files to s3 first then return the url then paste the url in their respective audio places
        const updatedSchema =
            files.audios || files.images
                ? await this.uploadActivityFiles(data.schema, files)
                : JSON.parse(data.schema);

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

    private async uploadActivityFiles(data, files) {
        const schema = JSON.parse(data);

        if (files.audios.length > 0) {
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
        if (files.images.length > 0) {
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
}
