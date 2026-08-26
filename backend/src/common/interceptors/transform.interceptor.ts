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
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map(data => {
        const url = request.url || '';
        const contentType = response.getHeader('content-type') || '';

        // 🟢 যদি সিস্টেম ড্যাশবোর্ড স্ট্যাটিক ফাইল (HTML, CSS, JS) বা SSE স্ট্রিম হয়, তবে র-ডাটা রিটার্ন করবে
        if (
          url.startsWith('/system/dashboard') ||
          url.startsWith('/system/events') ||
          (typeof contentType === 'string' &&
            contentType.length > 0 &&
            !contentType.includes('application/json'))
        ) {
          return data;
        }

        // সাধারণ এপিআই রেসপন্সের জন্য Standard JSON Format
        return { success: true, data };
      }),
    );
  }
}
