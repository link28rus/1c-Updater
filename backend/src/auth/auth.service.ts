import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    try {
      const user = await this.usersService.findByUsername(username);
      if (!user) {
        throw new UnauthorizedException('Неверное имя пользователя или пароль');
      }

      if (user.isBlocked) {
        throw new UnauthorizedException('Пользователь заблокирован');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Неверное имя пользователя или пароль');
      }

      const { password: _, ...result } = user;
      return result;
    } catch (error) {
      console.error('AuthService validateUser error:', error);
      throw error;
    }
  }

  async login(user: any) {
    try {
      if (!user || !user.id || !user.username) {
        console.error('Login error: Invalid user object', user);
        throw new Error('Invalid user object');
      }
      const payload = { username: user.username, sub: user.id };
      const access_token = this.jwtService.sign(payload);
      return {
        access_token,
        user: {
          id: user.id,
          username: user.username,
          isAdmin: user.isAdmin || false,
        },
      };
    } catch (error) {
      console.error('AuthService login error:', error);
      throw error;
    }
  }
}


