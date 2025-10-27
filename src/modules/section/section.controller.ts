import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    UseGuards,
    Put,
} from '@nestjs/common';
import { SectionService } from './section.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { AuthGuard } from '../auth/guard/auth.guard';
import { AddStudentDto } from './dto/add-student.dto';

@UseGuards(AuthGuard)
@Controller('section')
export class SectionController {
    constructor(private readonly service: SectionService) {}

    @Get()
    findAll() {
        return this.service.findAllTable();
    }

    @Post()
    create(@Body() data: CreateSectionDto) {
        return this.service.create(data);
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
    findOne(@Param('id') id: string) {
        if (id === 'all') {
            return this.service.findAllWithDetails();
        }
        return this.service.findOne(id);
    }
}
