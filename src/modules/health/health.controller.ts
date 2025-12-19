import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  @Get()
  async healthCheck() {
    return this.healthService.checkDatabase();
  }
}
