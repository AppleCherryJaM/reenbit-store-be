import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async checkDatabase() {
    try {
      const result = await this.connection.query<Array<{ time: string; version: string }>>(
        'SELECT NOW() as time, version() as version',
      );

      return {
        status: '200',
        api: 'working',
        database: 'Connected',
        version: result[0].version,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new HttpException(
          {
            status: 'ERROR',
            database: 'Connection failed',
            error: error.message,
            timestamp: new Date().toISOString(),
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      throw new HttpException(
        {
          status: 'ERROR',
          database: 'Connection failed',
          error: 'Unknown error occurred',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async performHealthChecks() {
    const databaseCheck = await this.checkDatabase();

    return {
      database: databaseCheck,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
  }
}
