import { Injectable } from '@nestjs/common';
import { TransactionsService, PeriodSummary, BalanceSummary } from '../transactions/transactions.service';
import { getMonthBounds, currentYearMonth, formatMonthLabel, getDayBounds, getYesterdayBounds, getWeekBounds } from '../../common/utils/date.util';

export interface ReportResult {
  period: string;
  summary: PeriodSummary;
  currency: string;
}

export interface BalanceResult {
  summary: BalanceSummary;
  currency: string;
}

@Injectable()
export class ReportsService {
  constructor(private readonly transactionsService: TransactionsService) {}

  async getDailyReport(
    userId: string,
    timezone: string,
    currency: string,
    lang: string,
    isYesterday = false,
  ): Promise<ReportResult> {
    const { from, to } = isYesterday ? getYesterdayBounds(timezone) : getDayBounds(timezone);
    const summary = await this.transactionsService.getSummaryForPeriod(userId, from, to);
    // You could localize these terms better, but for now:
    const period = isYesterday ? 'Kecha' : 'Bugun'; 
    return { period, summary, currency };
  }

  async getWeeklyReport(
    userId: string,
    timezone: string,
    currency: string,
    lang: string,
  ): Promise<ReportResult> {
    const { from, to } = getWeekBounds(timezone);
    const summary = await this.transactionsService.getSummaryForPeriod(userId, from, to);
    const period = 'Ushbu hafta';
    return { period, summary, currency };
  }

  async getCurrentMonthReport(
    userId: string,
    timezone: string,
    currency: string,
    lang: string,
  ): Promise<ReportResult> {
    const { year, month } = currentYearMonth(timezone);
    return this.getMonthReport(userId, year, month, timezone, currency, lang);
  }

  async getMonthReport(
    userId: string,
    year: number,
    month: number,
    timezone: string,
    currency: string,
    lang: string,
  ): Promise<ReportResult> {
    const { from, to } = getMonthBounds(year, month, timezone);
    const summary = await this.transactionsService.getSummaryForPeriod(
      userId,
      from,
      to,
    );
    const period = formatMonthLabel(year, month, lang);
    return { period, summary, currency };
  }

  async getAllTimeBalance(
    userId: string,
    currency: string,
  ): Promise<BalanceResult> {
    const summary = await this.transactionsService.getAllTimeBalance(userId);
    return { summary, currency };
  }
}
