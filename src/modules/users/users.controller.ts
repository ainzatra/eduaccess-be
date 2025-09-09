import { Body, Controller, Get, Param, Post, Put, UploadedFile, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/guard/auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
// @UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
    constructor(private readonly service: UsersService) {}

    @Post()
    create(@Body() body: CreateUserDto){
        return this.service.create(body)
    }

    @Get()
    findAll(){
        return this.service.findAll()
    }
    @Get('/studentteacher')
    fetchStudentTeacher(){
        return this.service.fetchStudentTeacher()
    }

    @Get('/studentteacher/count')
    countStudentTeacher(){
        return this.service.countStudentTeacher()
    }
    
    @Get('/teachers')
    findTeachers(){
        return this.service.findTeachers()
    }

    @Get('/available-students')
    findAvailableStudents(){
        return this.service.findAvailableStudents()
    }

    @Get(':id/settings')
    fetchUserSettings(@Param('id') id: string) {
        return this.service.fetchUserSettings(id)
    }
    
    @Put(':id/avatar')
    @UseInterceptors(FileInterceptor('avatar', { storage: memoryStorage() }))
    async updateAvatar(@UploadedFile() file: any, @Param('id') id: string, @Body() body) {
        console.log('Update avatar', file)
        return this.service.updateAvatar(id, file)
    }
    
    @Put(':id/me')
    async updateMe(@Param('id') id: string, @Body() body) {
        return this.service.updateUser(id, body)
    }
    
    @Put(':id/password')
    async updatePassword(@Param('id') id: string, @Body() body) {
        return this.service.updatePassword(id, body)
    }

    @Get(':id')
    findOne(@Param('id') id: string){
        return this.service.findOne(id)
    }

}
