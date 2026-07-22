import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
}
