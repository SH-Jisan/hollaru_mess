import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map(data => {
        // 🟢 যদি রেসপন্সটি HTML হয়, তবে এটিকে JSON-এ না মুড়ে সরাসরি র-HTML রিটার্ন করবে
        const contentType = response.getHeader('content-type') || '';
        if (typeof contentType === 'string' && contentType.includes('text/html')) {
          return data;
        }

        // সাধারণ API রেসপন্সের জন্য Standard JSON Format
        return { success: true, data };
      }),
    );
  }
}
