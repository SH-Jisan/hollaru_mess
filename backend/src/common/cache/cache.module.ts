import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppCacheService } from './app-cache.service';
import { CacheInvalidationListener } from './cache-invalidation.listener';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),
  ],
  providers: [AppCacheService, CacheInvalidationListener],
  exports: [AppCacheService, EventEmitterModule],
})
export class AppCacheModule {}
