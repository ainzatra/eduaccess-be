import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAnnouncement {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsOptional()
    description: string;

    @IsString()
    @IsNotEmpty()
    section_id: string;
}
