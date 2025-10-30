import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { SchoolYearService } from './school-year.service';
import { AuthGuard } from '../auth/guard/auth.guard';
import { IsString, IsNotEmpty } from 'class-validator';
import { SchoolYearTransitionService } from './school-year-transition.service';

class CreateSchoolYearDto {
    @IsString()
    @IsNotEmpty()
    year: string;
}

@UseGuards(AuthGuard)
@Controller('school-year')
export class SchoolYearController {
    constructor(
        private readonly schoolYearService: SchoolYearService,
        private readonly transitionService: SchoolYearTransitionService,
    ) {}

    @Get()
    async getAllSchoolYears() {
        return this.schoolYearService.getAllSchoolYears();
    }

    @Get('active')
    async getActiveSchoolYear() {
        return this.schoolYearService.getActiveSchoolYear();
    }

    @Get(':id')
    async getSchoolYearById(@Param('id') id: string) {
        return this.schoolYearService.getSchoolYearById(id);
    }

    @Post()
    async createSchoolYear(@Body() createSchoolYearDto: CreateSchoolYearDto) {
        return this.schoolYearService.createSchoolYear(
            createSchoolYearDto.year,
        );
    }

    @Put(':id/activate')
    @HttpCode(HttpStatus.OK)
    async activateSchoolYear(@Param('id') id: string) {
        return this.schoolYearService.activateSchoolYear(id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteSchoolYear(@Param('id') id: string) {
        await this.schoolYearService.deleteSchoolYear(id);
    }

    // Transition management endpoints
    @Get('summary/current')
    async getCurrentSchoolYearSummary() {
        return this.transitionService.getCurrentSchoolYearSummary();
    }

    @Get('summary/all')
    async getAllSchoolYearsSummaries() {
        return this.transitionService.getAllSchoolYearsSummaries();
    }

    @Get('unassigned-students')
    async getUnassignedStudents() {
        return this.transitionService.getUnassignedStudents();
    }

    @Get('migration/:from/:to')
    async getMigrationStatus(
        @Param('from') fromSchoolYear: string,
        @Param('to') toSchoolYear: string,
    ) {
        return this.transitionService.getMigrationStatus(
            fromSchoolYear,
            toSchoolYear,
        );
    }

    @Put(':id/validate-activation')
    @HttpCode(HttpStatus.OK)
    async validateSchoolYearActivation(@Param('id') id: string) {
        await this.transitionService.validateSchoolYearActivation(id);
        return { message: 'School year can be safely activated' };
    }
}
