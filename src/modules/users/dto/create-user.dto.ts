import { Condition } from '@prisma/client';
import {
    IsBoolean,
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';
export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    full_name: string;

    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsNotEmpty()
    password: string;

    @IsString()
    @IsNotEmpty()
    confirm_password: string;

    @IsString()
    @IsNotEmpty()
    role: string;

    @IsEnum(Condition)
    @IsOptional()
    condition?: Condition;
}
