import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { S3Service } from '../s3.service';

@Injectable()
export class LessonService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly s3: S3Service,
    ) {}

    async createLesson(id: string, files, body) {
        const video = files.video?.[0] ?? null;
        const subtitle = files.subtitle?.[0] ?? null;
        const images = files.images ?? [];

        // Validate that either video or images are present
        if (!video && images.length === 0) {
            throw new BadRequestException(
                'Either video or at least one image must be provided',
            );
        }

        // Validate video if present
        if (video && video.mimetype !== 'video/mp4') {
            throw new BadRequestException('Video must be .mp4');
        }

        // Validate subtitle if present
        if (subtitle && subtitle.mimetype !== 'text/vtt') {
            throw new BadRequestException('Subtitle must be .vtt');
        }

        // Validate images if present
        const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        for (const image of images) {
            if (!allowedImageTypes.includes(image.mimetype)) {
                throw new BadRequestException(
                    `Invalid image type: ${image.mimetype}. Allowed types: ${allowedImageTypes.join(', ')}`,
                );
            }
        }

        const { title, subjectId } = body;
        console.log({ title, subjectId });
        const subject = await this.prisma.subject.findUnique({
            where: { id: subjectId },
        });

        if (!subject) throw new NotFoundException();

        // Create Lesson first to get ID
        const lesson = await this.prisma.lesson.create({
            data: {
                title,
                subject_id: subjectId,
                created_by: id,
            },
        });

        // Upload video if present
        let video_url = '';
        if (video) {
            const videoKey = `lessons/${lesson.id}/${video.originalname}`;
            console.log({ videoKey });
            video_url = await this.s3.upload(video, videoKey);
        }

        // Upload subtitle if present
        let subtitle_url = '';
        if (subtitle) {
            const subtitleKey = `lessons/${lesson.id}/${subtitle.originalname}`;
            console.log({ subtitleKey });
            subtitle_url = await this.s3.upload(subtitle, subtitleKey);
        }

        // Upload images if present
        const imageUrls: string[] = [];
        for (const [index, image] of images.entries()) {
            const imageKey = `lessons/${lesson.id}/images/${image.originalname}`;
            console.log({ imageKey });
            const url = await this.s3.upload(image, imageKey);
            imageUrls.push(url);
        }

        // Update lesson with video and subtitle URLs
        await this.prisma.lesson.update({
            where: { id: lesson.id },
            data: {
                video_url,
                subtitle_url,
            },
        });

        // Create image records if images were uploaded
        if (imageUrls.length > 0) {
            const imageData = imageUrls.map((url) => ({
                url,
                lesson_id: lesson.id,
            }));

            await this.prisma.lessonImage.createMany({
                data: imageData,
            });
        }

        return 'Lesson created successfully';
    }

    async findLesson(id: string) {
        return this.prisma.lesson.findUnique({
            where: { id },
            include: {
                subject: {
                    select: {
                        id: true,
                    },
                },
                images: {
                    select: {
                        id: true,
                        url: true,
                        created_at: true,
                    },
                    orderBy: {
                        created_at: 'asc',
                    },
                },
            },
        });
    }

    async deleteLesson(id: string) {
        return this.prisma.lesson.delete({
            where: { id },
        });
    }
}
