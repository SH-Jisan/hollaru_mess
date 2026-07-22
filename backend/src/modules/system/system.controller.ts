import { Controller, Get, Header } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { SystemService } from './system.service';

@ApiTags('System & Health Status')
@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get live system memory, CPU, uptime, and DB metrics' })
  @ApiResponse({ status: 200, description: 'Live system status metrics returned successfully' })
  getSystemStatus() {
    return this.systemService.getSystemMetrics();
  }

  @Get('dashboard')
  @Header('Content-Type', 'text/html')
  @ApiOperation({ summary: 'View Live System Status & API Performance Dashboard UI' })
  getDashboardUi(): string {
    const distPath = path.join(__dirname, 'dashboard.html');
    const srcPath = path.join(process.cwd(), 'src', 'modules', 'system', 'dashboard.html');

    const filePath = fs.existsSync(distPath) ? distPath : srcPath;
    return fs.readFileSync(filePath, 'utf8');
  }
}
