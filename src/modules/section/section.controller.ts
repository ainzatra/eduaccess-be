import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
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
        return this.service.findAllTable()
    }

    @Post()
    create(@Body() data: CreateSectionDto) {
        return this.service.create(data)
    }

    @Post('/update-teacher/:id')
    updateTeacher(@Body() data: { teacher_id: string }, @Param('id') id: string) {
        return this.service.updateTeacher( data.teacher_id, id)
    }

    @Post('/add-subjects/:id')
    addSubjects(@Body() data, @Param('id') id: string) {
        return this.service.addSubjects(data, id)
    }

    @Post('/add-students/:id')
    addStudents(@Body() data: AddStudentDto, @Param('id') id: string) {
        return this.service.addStudents(data, id)
    }

    @Get('/available-subjects/:id')
    findAvailableSubjects(@Param('id') id: string) {
        return this.service.findAvailableSubjects(id)
    }

    @Delete('/remove-subject/:id')
    deleteSubject(@Param('id') id: string, @Body() body: { subjectId: string }) {
        return this.service.deleteSubject(id, body.subjectId)
    }

    @Delete('/remove-student/:id')
    deleteStudent(@Param('id') id: string, @Body() body: { studentId: string }) {
        return this.service.deleteStudent(id, body.studentId)
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.service.findOne(id)
    }
    
}
