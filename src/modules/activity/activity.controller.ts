import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Query,
    UploadedFiles,
    UseInterceptors,
} from '@nestjs/common';
import {
    AnyFilesInterceptor,
    FileFieldsInterceptor,
} from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ActivityService } from './activity.service';
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
                    fileSize: 10 * 1024 * 1024, // 10MB per file
                },
            },
        ),
    )
    createActivity(
        @Body() body,
        @UploadedFiles()
        files: {
            audio?: Express.Multer.File[];
            images?: Express.Multer.File[];
        },
    ) {
        console.log('Create activity body', body);
        const schema = JSON.parse(body.schema);
        console.log(schema);
        console.log('Questions:', schema.questions);

        console.log('Audio files:', files.audio);
        console.log('Image files:', files.images);

        return this.service.createActivity(body, files);
    }

    @Get('/user/:userId')
    fetchSubjectActivities(
        @Param('userId') id: string,
        @Query('subject') subject: string,
    ) {
        return this.service.fetchSubjectActivities(id, subject);
    }

    @Post('submit/:id')
    submitActivity(@Param('id') id: string, @Body() body) {
        console.log('submit activity', id, body);
    }

    @Get(':id')
    fetchActivityById(@Param('id') id: string) {
        return this.service.fetchActivityById(id);
    }

    @Delete(':id')
    deleteActivity(@Param('id') id: string) {
        return this.service.deleteActivity(id);
    }
}
