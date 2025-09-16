import {
    HttpException,
    HttpStatus,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { LoginAuthDto } from './dto/login-auth.dto';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ClsService } from 'nestjs-cls';

type TokenPayload = {
    token: string;
    id: string;
    username: string;
    role: string;
    avatar: string | null;
    full_name: string;
};

@Injectable()
export class AuthService {
    constructor(
        private readonly cls: ClsService,
        private readonly service: UsersService,
        private readonly jwtService: JwtService,
    ) {}

    async login(data: LoginAuthDto) {
        const user = await this.service.findByUsername(data.username);

        if (!user) {
            throw new UnauthorizedException('Invalid username or password');
        }
        const isPasswordValid = await bcrypt.compare(
            data.password,
            user.password_hash,
        );

        if (!isPasswordValid)
            throw new UnauthorizedException('Invalid username or password');

        const payload = await this.generateJWT(user);
        console.log('login', payload);
        return { message: 'Login success', ...payload };
    }

    async generateJWT(user: User): Promise<TokenPayload> {
        const tokenPayload = {
            sub: user.id,
            username: user.username,
            name: user.full_name,
            role: user.role,
            avatar: user.avatar,
            full_name: user.full_name,
        };

        const token = await this.jwtService.signAsync(tokenPayload);

        return {
            token,
            id: user.id,
            username: user.username,
            role: user.role,
            avatar: user.avatar,
            full_name: user.full_name,
        };
    }

    async verifyJwtToken(token: string): Promise<TokenPayload> {
        const result = await this.jwtService.decode(token);
        const user = await this.service.findOne(result.sub);
        // create new token to update new user info
        const tokenPayload = {
            sub: user.id,
            username: user.username,
            name: user.full_name,
            role: user.role,
            avatar: user.avatar,
            full_name: user.full_name,
        };
        const newToken = await this.jwtService.signAsync(tokenPayload);
        return {
            token: newToken,
            id: user.id,
            username: user.username,
            role: user.role,
            avatar: user.avatar,
            full_name: user.full_name,
        };
    }

    async refresh(): Promise<TokenPayload> {
        const auth = this.cls.get('auth');
        const result = await this.verifyJwtToken(auth.token);

        if (!result) {
            throw new UnauthorizedException('Invalid Token');
        }

        return result;
    }
}
