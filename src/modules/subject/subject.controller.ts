import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { SubjectService } from './subject.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { AuthGuard } from '../auth/guard/auth.guard';

@UseGuards(AuthGuard)
@Controller('subject')
export class SubjectController {
    constructor(private readonly service: SubjectService) {}

    @Get()
    findAll() {
        return this.service.findAll()
    }

    @Post()
    create(@Body() data: CreateSubjectDto) {
        return this.service.create(data)
    }

    @Delete()
    delete(@Body() ids: string[]) {
        return this.service.delete(ids)
    }
}
