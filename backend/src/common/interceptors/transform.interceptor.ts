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
        const contentType = response.getHeader('content-type') || '';

        // 🟢 যদি Content-Type জেসন (JSON) না হয়ে স্ট্যাটিক ফাইল (HTML, CSS, JS) হয়, তবে ডাটা সরাসরি র-পাঠাবে
        if (
          typeof contentType === 'string' &&
          contentType.length > 0 &&
          !contentType.includes('application/json')
        ) {
          return data;
        }

        // সাধারণ এপিআই রেসপন্সের জন্য Standard JSON Format
        return { success: true, data };
      }),
    );
  }
}
