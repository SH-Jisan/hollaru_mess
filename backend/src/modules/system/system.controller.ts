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
    return this.readFile('dashboard.html');
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
    const distPath = path.join(__dirname, 'dashborad_ui', fileName);
    const srcPath = path.join(process.cwd(), 'src', 'modules', 'system', 'dashborad_ui', fileName);

    const filePath = fs.existsSync(distPath) ? distPath : srcPath;
    return fs.readFileSync(filePath, 'utf8');
  }
}
