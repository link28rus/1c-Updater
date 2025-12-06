import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Request() req, @Body() loginDto: LoginDto) {
    try {
      if (!req.user) {
        console.error('Login error: req.user is undefined');
        throw new Error('Authentication failed: user not found');
      }
      return this.authService.login(req.user);
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      throw error;
    }
  }

  @Post('validate')
  async validate(@Request() req) {
    return { valid: true, user: req.user };
  }
}

