import { IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';
import { Condition } from '@prisma/client';

export class CreateSubjectDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsOptional()
    description: string;

    @IsString()
    @IsOptional()
    image: string;

    @IsEnum(Condition)
    category: Condition;
}
