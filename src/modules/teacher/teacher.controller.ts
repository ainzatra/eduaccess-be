import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { AuthGuard } from '../auth/guard/auth.guard';

@UseGuards(AuthGuard)
@Controller('teacher')
export class TeacherController {
    constructor(private readonly service: TeacherService) {}

    @Get('my-section/:id')
    fetchMySection(@Param('id') id: string) {
        return this.service.fetchMySection(id);
    }

    @Get('activities/:id')
    fetchMyActivities(@Param('id') id: string) {
        return this.service.fetchMyActivities(id);
    }

    @Get('todos/:id')
    fetchMyTodos(@Param('id') id: string) {
        return this.service.fetchMyTodos(id);
    }

    @Get(':id')
    fetchTeacherDetails(@Param('id') id: string) {
        return this.service.fetchTeacherDetails(id);
    }
}
