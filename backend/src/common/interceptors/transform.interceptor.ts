import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // Не оборачиваем ответы, которые уже имеют структуру (auth/login, файлы и т.д.)
        if (data && typeof data === 'object') {
          // Если есть access_token - это ответ от auth/login
          if ('access_token' in data) {
            return data;
          }
          // Если есть success - уже обернуто
          if ('success' in data) {
            return data;
          }
        }
        // Для остальных ответов возвращаем как есть (NestJS сам оборачивает)
        return data;
      }),
    );
  }
}

