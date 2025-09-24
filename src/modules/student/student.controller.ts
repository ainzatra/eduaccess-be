import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { StudentService } from './student.service';
import { AuthGuard } from '../auth/guard/auth.guard';

@UseGuards(AuthGuard)
@Controller('student')
export class StudentController {
    constructor(private readonly service: StudentService) {}

    @Get('my-section/:id')
    fetchMySection(@Param('id') id: string) {
        return this.service.fetchMySection(id);
    }

    @Get('activities/:id')
    fetchMyActivities(@Param('id') id: string) {
        return this.service.fetchMyActivities(id);
    }

    @Get(':id')
    fetchStudentDetails(@Param('id') id: string) {
        return this.service.fetchStudentDetails(id);
    }
}
