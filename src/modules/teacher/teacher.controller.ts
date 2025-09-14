import { Controller, Get, Param } from '@nestjs/common';
import { TeacherService } from './teacher.service';

@Controller('teacher')
export class TeacherController {
    constructor(private readonly service: TeacherService) {}

    @Get('my-section/:id')
    fetchMySection(@Param('id') id: string) {
        return this.service.fetchMySection(id);
    }
}
