import {
  Controller,
  Get,
  Header,
  MessageEvent,
  Post,
  Sse,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import * as fs from 'fs';
import * as path from 'path';
import { SystemService } from './system.service';
import { MetricsInterceptor } from '../../common/interceptors/metrics.interceptors';

@ApiTags('System & Health Status')
@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('status')
  @ApiOperation({
    summary: 'Get live system memory, CPU, uptime, and DB metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'Live system status metrics returned successfully',
  })
  getSystemStatus() {
    return this.systemService.getSystemMetrics();
  }

  @Post('cache/clear')
  @ApiOperation({ summary: 'Manually invalidate system Redis caches' })
  clearCache() {
    return this.systemService.clearSystemCache('ALL');
  }

  @Post('queue/retry')
  @ApiOperation({ summary: 'Retry failed BullMQ queue jobs' })
  retryQueue() {
    return this.systemService.retryFailedQueueJobs();
  }

  @Get('dashboard')
  @Header('Content-Type', 'text/html')
  @ApiOperation({
    summary: 'View Live System Status & API Performance Dashboard UI',
  })
  getDashboardUi(): string {
    return this.readFile('dashboard.html');
  }

  @Sse('events')
  @ApiOperation({
    summary:
      'Stream live real-time metrics updates via Server-Sent Events (SSE)',
  })
  streamMetrics(): Observable<MessageEvent> {
    return MetricsInterceptor.getMetricsObservable().pipe(
      map((data) => ({ data: JSON.stringify(data) })),
    );
  }

  @Get('dashboard.css')
  @Header('Content-Type', 'text/css')
  getDashboardCss(): string {
    return this.readFile('dashboard.css');
  }

  @Get('dashboard.js')
  @Header('Content-Type', 'application/javascript')
  getDashboardJs(): string {
    return this.readFile('dashboard.js');
  }

  private readFile(fileName: string): string {
    const srcPath = path.join(
      process.cwd(),
      'src',
      'modules',
      'system',
      'dashboard_ui',
      fileName,
    );
    const distPath = path.join(__dirname, 'dashboard_ui', fileName);

    const filePath = fs.existsSync(srcPath) ? srcPath : distPath;
    return fs.readFileSync(filePath, 'utf8');
  }
}
