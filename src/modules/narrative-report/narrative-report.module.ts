import { Module } from '@nestjs/common';
import { NarrativeReportController } from './narrative-report.controller';
import { NarrativeReportService } from './narrative-report.service';

@Module({
    controllers: [NarrativeReportController],
    providers: [NarrativeReportService],
})
export class NarrativeReportModule {}
