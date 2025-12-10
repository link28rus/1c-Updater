import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.setGlobalPrefix('api');

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/auth/login (POST)', () => {
    it('должен вернуть 401 для неверных учетных данных', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('должен вернуть 400 для отсутствующих полей', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          username: 'test',
        })
        .expect(400);
    });
  });

  describe('/api/auth/validate (POST)', () => {
    it('должен вернуть 401 без токена', () => {
      return request(app.getHttpServer())
        .post('/api/auth/validate')
        .expect(401);
    });
  });
});

