import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { StudentService } from './student.service';
import { AuthGuard } from '../auth/guard/auth.guard';
import type { SchoolYearRequest } from '../school-year/school-year.middleware';

@UseGuards(AuthGuard)
@Controller('student')
export class StudentController {
    constructor(private readonly service: StudentService) {}

    @Get('my-section/:id')
    fetchMySection(@Param('id') id: string, @Req() req: SchoolYearRequest) {
        return this.service.fetchMySection(id, req);
    }

    @Get('activities/:id')
    fetchMyActivities(@Param('id') id: string, @Req() req: SchoolYearRequest) {
        return this.service.fetchMyActivities(id, req);
    }

    @Get(':id')
    fetchStudentDetails(
        @Param('id') id: string,
        @Req() req: SchoolYearRequest,
    ) {
        return this.service.fetchStudentDetails(id, req);
    }
}
