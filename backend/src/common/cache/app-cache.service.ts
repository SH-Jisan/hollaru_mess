import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class AppCacheService {
  private readonly logger = new Logger(AppCacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * 🛡️ Enterprise Cache-Aside Pattern with Circuit Breaker & Truthiness Safety
   * Bypasses false-positive empty arrays [] and handles Redis limits gracefully.
   */
  async remember<T>(
    key: string,
    ttlSeconds: number,
    fetcherFn: () => Promise<T>,
  ): Promise<T> {
    const safeTtlMs = Math.max(10, ttlSeconds) * 1000;

    // ১. প্রথমে রডিস থেকে ডাটা পড়ার চেষ্টা করা
    try {
      const cached = await this.cacheManager.get<T>(key);
      if (cached !== null && cached !== undefined) {
        if (Array.isArray(cached) && cached.length === 0) {
          // খালি অ্যারে [] ক্যাশে থাকলে ডাটাবেজে রি-কুয়েরি করবে (খালি ডাটা দেখাবে না)
        } else {
          return cached;
        }
      }
    } catch (err: any) {
      // 🛡️ রডিস ডাউন বা Upstash লিমিট ওভার হলেও অ্যাপ ক্র্যাশ করবে না
      this.logger.warn(`Redis Cache Get Error [${key}]: ${err.message || err}. Degrading gracefully to DB.`);
    }

    // ২. ক্যাশে ডাটা না থাকলে ডাটাবেজ থেকে ডাটা আনা
    const freshData = await fetcherFn();

    // ৩. ডাটা সত্য হলে রডিসে নির্দিষ্ট মিলিমেকেন্ডের জন্য সেভ করা
    if (freshData !== null && freshData !== undefined) {
      try {
        await this.cacheManager.set(key, freshData, safeTtlMs);
      } catch (err: any) {
        this.logger.warn(`Redis Cache Set Error [${key}]: ${err.message || err}.`);
      }
    }

    return freshData;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      return (await this.cacheManager.get<T>(key)) || null;
    } catch (err: any) {
      this.logger.warn(`Redis Get Fail [${key}]: ${err.message}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      const ttlMs = Math.max(1, ttlSeconds) * 1000;
      await this.cacheManager.set(key, value, ttlMs);
    } catch (err: any) {
      this.logger.warn(`Redis Set Fail [${key}]: ${err.message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (err: any) {
      this.logger.warn(`Redis Del Fail [${key}]: ${err.message}`);
    }
  }

  async delMany(keys: string[]): Promise<void> {
    if (!keys || keys.length === 0) return;
    try {
      await Promise.all(keys.map((k) => this.cacheManager.del(k)));
    } catch (err: any) {
      this.logger.warn(`Redis DelMany Fail: ${err.message}`);
    }
  }
}
