import {
    Body,
    Controller,
    Delete,
    Get,
    Post,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Put,
    Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { SubjectService } from './subject.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { AuthGuard } from '../auth/guard/auth.guard';

@UseGuards(AuthGuard)
@Controller('subject')
export class SubjectController {
    constructor(private readonly service: SubjectService) {}

    @Get()
    findAll() {
        return this.service.findAll();
    }

    @Get(':id/lessons')
    fetchSubjectLessons(@Param('id') id: string) {
        return this.service.fetchSubjectLessons(id);
    }
    // Accept multipart/form-data with an optional "image" file (stored in memory so service can upload buffer to S3)
    @Post()
    @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
    create(@UploadedFile() file: any, @Body() data: CreateSubjectDto) {
        return this.service.create(data, file);
    }

    @Delete()
    delete(@Body() ids: string[]) {
        return this.service.delete(ids);
    }

    @Put(':id')
    @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
    update(
        @Param('id') id: string,
        @Body() body: CreateSubjectDto,
        @UploadedFile() file: any,
    ) {
        return this.service.update(id, body, file);
    }
}
