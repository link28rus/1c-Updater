import { Controller, Get, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  async getDashboardStats() {
    return this.reportsService.getDashboardStats();
  }

  @Get('tasks')
  async getTaskStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.reportsService.getTaskStatistics(start, end);
  }

  @Get('pcs')
  async getPcStatistics() {
    return this.reportsService.getPcStatistics();
  }

  @Get('tasks/history')
  async getTaskHistory(@Query('limit', new ParseIntPipe({ optional: true })) limit?: number) {
    return this.reportsService.getTaskHistory(limit || 50);
  }

  @Get('distributions')
  async getDistributionStatistics() {
    return this.reportsService.getDistributionStatistics();
  }
}

