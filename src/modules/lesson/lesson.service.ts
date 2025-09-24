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
        if (!files.video) throw new BadRequestException();
        const video = files.video[0];
        const subtitle = files.subtitle?.[0] ?? null;

        if (video.mimetype !== 'video/mp4')
            throw new BadRequestException('Video must be .mp4');
        if (subtitle && subtitle.mimetype !== 'text/vtt')
            throw new BadRequestException('Subtitle must be .vtt');

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

        console.log({ video, subtitle });
        const videoKey = `lessons/${lesson.id}/${video.originalname}`;
        const subtitleKey = subtitle
            ? `lessons/${lesson.id}/${subtitle.originalname}`
            : '';
        console.log({ videoKey, subtitleKey });

        const video_url = await this.s3.upload(video, videoKey);
        const updateData: { video_url: string; subtitle_url?: string } = {
            video_url,
        };
        if (subtitle) {
            const subtitle_url = await this.s3.upload(subtitle, subtitleKey);
            updateData.subtitle_url = subtitle_url;
        }

        await this.prisma.lesson.update({
            where: { id: lesson.id },
            data: updateData,
        });

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
            },
        });
    }

    async deleteLesson(id: string) {
        return this.prisma.lesson.delete({
            where: { id },
        });
    }
}
