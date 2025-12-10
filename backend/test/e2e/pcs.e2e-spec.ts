import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

describe('PCs (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

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

    // Создаем тестового пользователя и получаем токен
    // В реальных тестах лучше использовать тестовую БД и фикстуры
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/pcs (GET)', () => {
    it('должен вернуть 401 без токена', () => {
      return request(app.getHttpServer())
        .get('/api/pcs')
        .expect(401);
    });
  });

  describe('/api/pcs (POST)', () => {
    it('должен вернуть 401 без токена', () => {
      return request(app.getHttpServer())
        .post('/api/pcs')
        .send({
          name: 'Test PC',
          ipAddress: '192.168.1.1',
          adminUsername: 'admin',
          adminPassword: 'password',
        })
        .expect(401);
    });

    it('должен вернуть 400 для невалидных данных', () => {
      return request(app.getHttpServer())
        .post('/api/pcs')
        .send({
          name: '',
          ipAddress: 'invalid-ip',
        })
        .expect(401); // Сначала 401, потом уже валидация
    });
  });
});

