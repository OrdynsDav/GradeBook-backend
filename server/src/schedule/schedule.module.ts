import { Module } from '@nestjs/common';
import { ScheduleController } from './schedule.controller';
import { ScheduleImportService } from './schedule-import.service';
import { ScheduleService } from './schedule.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ScheduleController],
  providers: [ScheduleService, ScheduleImportService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
