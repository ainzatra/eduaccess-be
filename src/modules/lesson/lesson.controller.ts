import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    UseGuards,
    Req,
} from '@nestjs/common';
import { LessonService } from './lesson.service';
import { AuthGuard } from '../auth/guard/auth.guard';
import { ClsService } from 'nestjs-cls';
import type { SchoolYearRequest } from '../school-year/school-year.middleware';

@UseGuards(AuthGuard)
@Controller('lesson')
export class LessonController {
    constructor(
        private readonly service: LessonService,
        private readonly cls: ClsService,
    ) {}

    @Post('subject/:id')
    createLesson(
        @Param('id') subjectId: string,
        @Body() body: { title: string; materialIds: string[] },
        @Req() req: SchoolYearRequest,
    ) {
        const userId = this.cls.get('auth')?.id;
        return this.service.createLesson(userId, { ...body, subjectId }, req);
    }

    @Get(':id')
    fetchLesson(@Param('id') id: string, @Req() req: SchoolYearRequest) {
        return this.service.findLesson(id, req);
    }

    @Put(':id/materials')
    updateLessonMaterials(
        @Param('id') id: string,
        @Body() body: { materialIds: string[] },
    ) {
        const userId = this.cls.get('auth')?.id;
        return this.service.updateLessonMaterials(id, userId, body.materialIds);
    }

    @Delete(':id')
    deleteLesson(@Param('id') id: string) {
        const userId = this.cls.get('auth')?.id;
        return this.service.deleteLesson(id, userId);
    }
}
