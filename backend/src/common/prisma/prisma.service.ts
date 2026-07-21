import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private static pool: Pool;

  constructor() {
    // ১. সুপাবেসের কানেকশন স্ট্রিং দিয়ে pg Pool তৈরি করা
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // ২. প্রিজমার জন্য PostgreSQL অ্যাডাপ্টার তৈরি করা
    const adapter = new PrismaPg(pool);
    
    // ৩. সুপার ক্লাসের (PrismaClient) কনস্ট্রাক্টরে অ্যাডাপ্টারটি পাস করা
    super({ adapter });
    
    PrismaService.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    // ৪. অ্যাপ বন্ধ হওয়ার সময় কানেকশন পুলটি ক্লোজ করা
    await PrismaService.pool.end();
  }
}
