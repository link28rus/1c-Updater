import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: 1,
    username: 'testuser',
    password: 'hashedPassword',
    isAdmin: false,
    isBlocked: false,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockUsersService = {
      findByUsername: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('должен успешно валидировать пользователя с правильным паролем', async () => {
      usersService.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('testuser', 'password123');

      expect(result).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        isAdmin: mockUser.isAdmin,
        isBlocked: mockUser.isBlocked,
        createdAt: mockUser.createdAt,
      });
      expect(usersService.findByUsername).toHaveBeenCalledWith('testuser');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
    });

    it('должен выбросить UnauthorizedException для несуществующего пользователя', async () => {
      usersService.findByUsername.mockResolvedValue(null);

      await expect(service.validateUser('nonexistent', 'password')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(usersService.findByUsername).toHaveBeenCalledWith('nonexistent');
    });

    it('должен выбросить UnauthorizedException для заблокированного пользователя', async () => {
      const blockedUser = { ...mockUser, isBlocked: true };
      usersService.findByUsername.mockResolvedValue(blockedUser);

      await expect(service.validateUser('testuser', 'password')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('должен выбросить UnauthorizedException для неверного пароля', async () => {
      usersService.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.validateUser('testuser', 'wrongpassword')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashedPassword');
    });
  });

  describe('login', () => {
    it('должен успешно создать токен и вернуть пользователя', () => {
      const mockToken = 'mock-jwt-token';
      jwtService.sign.mockReturnValue(mockToken);

      const result = service.login(mockUser);

      expect(result).toEqual({
        access_token: mockToken,
        user: {
          id: mockUser.id,
          username: mockUser.username,
          isAdmin: mockUser.isAdmin,
        },
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        username: mockUser.username,
        sub: mockUser.id,
      });
    });

    it('должен выбросить ошибку для невалидного объекта пользователя', () => {
      expect(() => service.login(null)).toThrow('Invalid user object');
      expect(() => service.login({})).toThrow('Invalid user object');
      expect(() => service.login({ username: 'test' })).toThrow('Invalid user object');
    });
  });
});

