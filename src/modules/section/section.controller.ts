import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    UseGuards,
    Put,
    Req,
} from '@nestjs/common';
import { SectionService } from './section.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { AuthGuard } from '../auth/guard/auth.guard';
import { AddStudentDto } from './dto/add-student.dto';
import type { SchoolYearRequest } from '../school-year/school-year.middleware';

@UseGuards(AuthGuard)
@Controller('section')
export class SectionController {
    constructor(private readonly service: SectionService) {}

    @Get()
    findAll(@Req() req: SchoolYearRequest) {
        return this.service.findAllTable(req);
    }

    @Post()
    create(@Body() data: CreateSectionDto, @Req() req: SchoolYearRequest) {
        return this.service.create(data, req);
    }

    @Put('/update-teacher/:id')
    updateTeacher(@Body() data: { teacher: string }, @Param('id') id: string) {
        return this.service.updateTeacher(data.teacher, id);
    }

    @Post('/add-subjects/:id')
    addSubjects(@Body() data, @Param('id') id: string) {
        return this.service.addSubjects(data, id);
    }

    @Post('/add-students/:id')
    addStudents(@Body() data, @Param('id') id: string) {
        return this.service.addStudents(data, id);
    }

    @Get('/available-subjects/:id')
    findAvailableSubjects(@Param('id') id: string) {
        return this.service.findAvailableSubjects(id);
    }

    @Delete('/remove-subject/:id')
    deleteSubject(@Param('id') id: string, @Body() body: { subject: string }) {
        return this.service.deleteSubject(id, body.subject);
    }

    @Delete('/remove-student/:id')
    deleteStudent(@Param('id') id: string, @Body() body: { student: string }) {
        return this.service.deleteStudent(id, body.student);
    }

    @Delete('remove-teacher/:id')
    removeTeacher(@Param('id') id: string) {
        return this.service.removeTeacher(id);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Req() req: SchoolYearRequest) {
        if (id === 'all') {
            return this.service.findAllWithDetails(req);
        }
        return this.service.findOne(id, req);
    }
}
