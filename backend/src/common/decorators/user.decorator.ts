import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // Passport যা req.user-এ ইনজেক্ট করেছে, সেটি রিটার্ন করবে
  },
);
