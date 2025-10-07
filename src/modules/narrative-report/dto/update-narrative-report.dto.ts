import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class UpdateNarrativeReportDto {
    @IsArray()
    @IsString({ each: true })
    behavior: string[];

    @IsArray()
    @IsString({ each: true })
    speechAndLanguage: string[];

    @IsArray()
    @IsString({ each: true })
    fineMotor: string[];

    @IsArray()
    @IsString({ each: true })
    grossMotor: string[];

    @IsArray()
    @IsString({ each: true })
    activitiesForDailyLivingSkills: string[];

    @IsArray()
    @IsString({ each: true })
    cognitive: string[];

    @IsArray()
    @IsString({ each: true })
    areasForDevelopment: string[];

    @IsArray()
    @IsString({ each: true })
    strategies: string[];

    @IsArray()
    @IsString({ each: true })
    recommendations: string[];

    @IsString()
    conclusion: string;
}
