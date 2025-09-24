import { Controller, Get, Param } from '@nestjs/common';
import { StudentService } from './student.service';

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
}
