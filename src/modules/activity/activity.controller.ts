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
} from '@nestjs/common';
import {
    AnyFilesInterceptor,
    FileFieldsInterceptor,
} from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ActivityService } from './activity.service';
import { AuthGuard } from '../auth/guard/auth.guard';
import { Condition } from '@prisma/client';

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
    ) {
        console.log('Create activity body', body);
        const schema = JSON.parse(body.schema);
        console.log(schema);
        console.log('Questions:', schema.questions);

        console.log('Audio files:', files.audios);
        console.log('Image files:', files.images);
        console.log('Category:', schema.category);

        return this.service.createActivity(body, files);
    }

    @Get('/user/:userId')
    fetchSubjectActivities(
        @Param('userId') id: string,
        @Query('subject') subject: string,
    ) {
        return this.service.fetchSubjectActivities(id, subject);
    }

    @Post('submit/:studentId')
    submitActivity(@Param('studentId') studentId: string, @Body() body) {
        console.log('submit activity', studentId, body);
        return this.service.submitActivity(studentId, body);
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
