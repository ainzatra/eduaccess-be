import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    UploadedFiles,
    UseInterceptors,
} from '@nestjs/common';
import { LessonService } from './lesson.service';
import {
    FileFieldsInterceptor,
    FilesInterceptor,
} from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Controller('lesson')
export class LessonController {
    constructor(private readonly service: LessonService) {}

    @Post('subject/:id')
    @UseInterceptors(
        FileFieldsInterceptor(
            [
                { name: 'video', maxCount: 1 },
                { name: 'subtitle', maxCount: 1 },
                { name: 'images', maxCount: 10 },
            ],
            { storage: memoryStorage() },
        ),
    )
    createLesson(
        @Param('id') id: string,
        @UploadedFiles() files,
        @Body() body,
    ) {
        console.log({ id, body });
        return this.service.createLesson(id, files, body);
    }

    @Get(':id')
    fetchLesson(@Param('id') id: string) {
        return this.service.findLesson(id);
    }

    @Delete(':id')
    deleteLesson(@Param('id') id: string) {
        return this.service.deleteLesson(id);
    }
}
