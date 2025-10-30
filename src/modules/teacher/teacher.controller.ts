import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { AuthGuard } from '../auth/guard/auth.guard';
import type { SchoolYearRequest } from '../school-year/school-year.middleware';

@UseGuards(AuthGuard)
@Controller('teacher')
export class TeacherController {
    constructor(private readonly service: TeacherService) {}

    @Get('my-section/:id')
    fetchMySection(@Param('id') id: string, @Req() req: SchoolYearRequest) {
        return this.service.fetchMySection(id, req);
    }

    @Get('activities/:id')
    fetchMyActivities(@Param('id') id: string, @Req() req: SchoolYearRequest) {
        return this.service.fetchMyActivities(id, req);
    }

    @Get('todos/:id')
    fetchMyTodos(@Param('id') id: string, @Req() req: SchoolYearRequest) {
        return this.service.fetchMyTodos(id, req);
    }

    @Get(':id')
    fetchTeacherDetails(
        @Param('id') id: string,
        @Req() req: SchoolYearRequest,
    ) {
        return this.service.fetchTeacherDetails(id, req);
    }
}
