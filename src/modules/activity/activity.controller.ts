import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
    Req,
} from '@nestjs/common';
import {
    AnyFilesInterceptor,
    FileFieldsInterceptor,
} from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ActivityService } from './activity.service';
import { AuthGuard } from '../auth/guard/auth.guard';
import { Condition } from '@prisma/client';
import type { SchoolYearRequest } from '../school-year/school-year.middleware';

@UseGuards(AuthGuard)
@Controller('activity')
export class ActivityController {
    constructor(private readonly service: ActivityService) {}

    @Post()
    @UseInterceptors(
        FileFieldsInterceptor(
            [
                { name: 'audios', maxCount: 50 }, // field for audio files
                { name: 'images', maxCount: 20 }, // field for image files
            ],
            {
                storage: memoryStorage(),
                fileFilter: (req, file, cb) => {
                    if (file.fieldname === 'audios') {
                        if (file.mimetype.startsWith('audio/')) {
                            cb(null, true);
                        } else {
                            cb(
                                new BadRequestException(
                                    'Only audio files allowed',
                                ),
                                false,
                            );
                        }
                    } else if (file.fieldname === 'images') {
                        if (file.mimetype.startsWith('image/')) {
                            cb(null, true);
                        } else {
                            cb(
                                new BadRequestException(
                                    'Only image files allowed',
                                ),
                                false,
                            );
                        }
                    } else {
                        cb(new BadRequestException('Unexpected field'), false);
                    }
                },
                limits: {
                    fileSize: 100 * 1024 * 1024, // 10MB per file
                },
            },
        ),
    )
    createActivity(
        @Body() body,
        @UploadedFiles()
        files: {
            audios?: Express.Multer.File[];
            images?: Express.Multer.File[];
        },
        @Req() req: SchoolYearRequest,
    ) {
        console.log('Create activity body', body);
        const schema = JSON.parse(body.schema);
        console.log(schema);
        console.log('Questions:', schema.questions);

        console.log('Audio files:', files.audios);
        console.log('Image files:', files.images);
        console.log('Category:', schema.category);

        return this.service.createActivity(body, files, req);
    }

    @Get('/user/:userId')
    fetchSubjectActivities(
        @Param('userId') id: string,
        @Query('subject') subject: string,
        @Req() req: SchoolYearRequest,
    ) {
        return this.service.fetchSubjectActivities(id, subject, req);
    }

    @Post('submit/:studentId')
    @UseInterceptors(
        AnyFilesInterceptor({
            storage: memoryStorage(),
            fileFilter: (req, file, cb) => {
                // Check if the file is an audio file
                const allowedMimeTypes = [
                    'audio/mpeg', // mp3
                    'audio/wav', // wav
                    'audio/webm', // webm
                    'audio/mp3', // mp3 (alternative mime type)
                    'audio/x-wav', // wav (alternative mime type)
                ];

                if (allowedMimeTypes.includes(file.mimetype)) {
                    cb(null, true);
                } else {
                    cb(
                        new BadRequestException(
                            `Invalid audio format. Supported formats: mp3, wav, webm`,
                        ),
                        false,
                    );
                }
            },
            limits: {
                fileSize: 20 * 1024 * 1024, // 20MB per file
                files: 50, // Maximum 50 audio files
            },
        }),
    )
    async submitActivity(
        @Param('studentId') studentId: string,
        @Body() body: any,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        console.log('submit activity', studentId, body);
        console.log('Audio files received:', files?.length || 0);

        // Extract audio files from the request
        const audioFiles: { [key: string]: Express.Multer.File } = {};

        if (files && files.length > 0) {
            files.forEach((file) => {
                // Extract question ID from fieldname (e.g., "audio_q1" -> "q1")
                const match = file.fieldname.match(/^audio_(.+)$/);
                if (match) {
                    const questionId = match[1];
                    audioFiles[questionId] = file;
                }
            });
        }

        return this.service.submitActivity(studentId, body, audioFiles);
    }

    @Get('submissions/:activityId')
    fetchActivitySubmissions(@Param('activityId') activityId: string) {
        return this.service.fetchActivitySubmissions(activityId);
    }

    @Get('submission/:submissionId')
    fetchActivitySubmission(@Param('submissionId') submissionId: string) {
        return this.service.fetchActivitySubmission(submissionId);
    }

    @Patch('/submission/:submissionId/grade')
    setSubmissionGrade(
        @Param('submissionId') submissionId: string,
        @Body() body: { score: number },
    ) {
        return this.service.setSubmissionGrade(submissionId, body.score);
    }

    @Get(':id')
    fetchActivityById(@Param('id') id: string) {
        return this.service.fetchActivityById(id);
    }

    @Delete(':id')
    deleteActivity(@Param('id') id: string) {
        return this.service.deleteActivity(id);
    }

    @Post('allow-retake/:activityId/:studentId')
    allowRetake(
        @Param('activityId') activityId: string,
        @Param('studentId') studentId: string,
        @Body() body: { teacherId: string; reason?: string },
    ) {
        return this.service.allowRetake(
            activityId,
            studentId,
            body.teacherId,
            body.reason,
        );
    }

    @Get('submissions/:activityId/:studentId/history')
    fetchStudentSubmissionHistory(
        @Param('activityId') activityId: string,
        @Param('studentId') studentId: string,
    ) {
        return this.service.fetchStudentSubmissionHistory(
            activityId,
            studentId,
        );
    }
}
