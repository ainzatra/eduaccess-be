import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SectionService } from './section.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { AuthGuard } from '../auth/guard/auth.guard';

// @UseGuards(AuthGuard)
@Controller('section')
export class SectionController {
    constructor(private readonly service: SectionService) {}

    @Get()
    findAll() {
        return this.service.findAll()
    }

    @Post()
    create(@Body() data: CreateSectionDto) {
        return this.service.create(data)
    }
}
