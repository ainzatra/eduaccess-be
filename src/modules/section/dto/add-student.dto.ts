import { IsArray, IsNotEmpty } from "class-validator";

export class AddStudentDto {
    @IsArray()
    @IsNotEmpty()
    ids: string[]
}