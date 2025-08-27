import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateSubjectDto {
    @IsString()
    @IsNotEmpty()
    title: string

    @IsString()
    @IsOptional()
    description: string

    @IsString()
    @IsOptional()
    image: string
}