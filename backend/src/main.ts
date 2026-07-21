import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/exceptions/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // ১. CORS সচল করা (যাতে মোবাইল অ্যাপ এপিআই কল করতে পারে)
  app.enableCors();

  // ২. গ্লোবাল ডাটা ভ্যালিডেশন পাইপ যুক্ত করা (class-validator সচল করার জন্য)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // ৩. গ্লোবাল ইন্টারসেপ্টর এবং ফিল্টার যুক্ত করা
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // ৪. Swagger API Documentation সেটআপ করা
  const config = new DocumentBuilder()
    .setTitle('Meal Book API')
    .setDescription('The Meal Book Mess and Dining Manager API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // ৫. এনভায়রনমেন্ট কনফিগারেশনের পোর্ট রিড করা
  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation is available at: http://localhost:${port}/api/docs`);
}
bootstrap();
