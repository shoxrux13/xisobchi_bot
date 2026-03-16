import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [TransactionsModule],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
