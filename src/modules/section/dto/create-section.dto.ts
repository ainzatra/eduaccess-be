import { IsNotEmpty, IsString } from "class-validator"

export class CreateSectionDto {
    @IsString()
    @IsNotEmpty()
    name: string

    @IsString()
    @IsNotEmpty()
    teacher_id: string
    
    // @IsString()
    // @IsNotEmpty()
    // school_year: string
}