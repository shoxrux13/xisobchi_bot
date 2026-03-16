import { Ctx, On, Scene, SceneEnter, Command } from 'nestjs-telegraf';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { Scenes } from 'telegraf';
import { TelegramUpdate } from '../telegram.update';
import { ALL_MENU_KEYS } from '../../common/constants/menu.constants';
import { OnboardingService } from '../../modules/onboarding/onboarding.service';
import { ReportsService } from '../../modules/reports/reports.service';
import { formatAmount } from '../../common/utils/amount.util';
import dayjs from 'dayjs';
import PDFDocument from 'pdfkit-table';
import { join } from 'path';

interface ReportMonthState {
  userId?: string;
  lang?: string;
  currency?: string;
  timezone?: string;
}

@Injectable()
@Scene('report_month')
export class ReportMonthScene {
  constructor(
    private readonly i18n: I18nService,
    private readonly onboardingService: OnboardingService,
    private readonly reportsService: ReportsService,
    @Inject(forwardRef(() => TelegramUpdate)) private readonly telegramUpdate: TelegramUpdate,
  ) {}

  private t(lang: string, key: string, args?: Record<string, unknown>): string {
    return this.i18n.translate(`common.${key}`, { lang, args }) as string;
  }

  @SceneEnter()
  async onEnter(@Ctx() ctx: Scenes.SceneContext & { scene: { state: ReportMonthState } }): Promise<void> {
    const { user, settings } = await this.onboardingService.ensureUser(
      ctx.from!,
      ctx.chat?.id,
    );
    ctx.scene.state.userId = user.id;
    ctx.scene.state.lang = settings.languageCode;
    ctx.scene.state.currency = settings.currencyCode;
    ctx.scene.state.timezone = settings.timezone;
    (ctx.scene.state as any).reportFormat = settings.reportFormat;
    await ctx.reply(
      this.t(settings.languageCode, 'report.ask_month'),
      { parse_mode: 'HTML' },
    );
  }

  @On('text')
  async onText(@Ctx() ctx: Scenes.SceneContext & { scene: { state: ReportMonthState }; message: { text: string } }): Promise<void> {
    const state = ctx.scene.state;
    const lang = state.lang ?? 'uz';
    const text = ctx.message.text.trim();

    // Commands or Menu Buttons Interceptor
    const isCommand = text.startsWith('/');
    const tBtn = (key: string) => this.i18n.translate(`common.buttons.${key}`, { lang }) as string;
    const isMenuButton = ALL_MENU_KEYS.map(tBtn).some(b => b.trim() === text);

    if (isCommand || isMenuButton) {
      if (text === '/cancel' || text === tBtn('cancel').trim()) {
        await ctx.scene.leave();
        await ctx.reply(this.t(lang, 'cancel_success'), { parse_mode: 'HTML' });
      } else if (isMenuButton) {
        await ctx.scene.leave();
        await this.telegramUpdate.onText(ctx as any);
      } else {
        if (text === '/income') { await ctx.scene.enter('income'); return; }
        if (text === '/expense') { await ctx.scene.enter('expense'); return; }
        if (text === '/report_month') { await ctx.scene.enter('report_month'); return; }
        if (text === '/settings') { await ctx.scene.enter('settings'); return; }
        await ctx.scene.leave();
      }
      return;
    }

    const match = /^(\d{4})-(\d{2})$/.exec(text);
    if (!match) {
      await ctx.reply(this.t(lang, 'report.invalid_month'), { parse_mode: 'HTML' });
      return;
    }

    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    if (month < 1 || month > 12) {
      await ctx.reply(this.t(lang, 'report.invalid_month'), { parse_mode: 'HTML' });
      return;
    }

    const report = await this.reportsService.getMonthReport(
      state.userId!,
      year,
      month,
      state.timezone!,
      state.currency!,
      lang,
    );

          await ctx.scene.leave();
      await ctx.reply(
        buildReportMessage(report, lang, this.i18n),
        { parse_mode: 'HTML' },
      );

      const format = (state as any).reportFormat || 'pdf';
      let fileBuffer: Buffer | null = null;
      let filename = '';

      if (format === 'excel') {
        fileBuffer = await generateExcelReport(report, lang, this.i18n);
        filename = `Hisobot_${year}_${month}.xlsx`;
      } else {
        fileBuffer = await generatePDFReport(report, lang, this.i18n);
        filename = `Hisobot_${year}_${month}.pdf`;
      }

      if (fileBuffer) {
        await ctx.replyWithDocument({
          source: fileBuffer,
          filename
        });
      }
  }

  @Command('cancel')
  async onCancel(@Ctx() ctx: Scenes.SceneContext & { scene: { state: ReportMonthState } }): Promise<void> {
    const lang = ctx.scene.state.lang ?? 'uz';
    await ctx.scene.leave();
    await ctx.reply(this.t(lang, 'cancel_success'), { parse_mode: 'HTML' });
  }
}

export async function generatePDFReport(
  report: any,
  lang: string,
  i18n: I18nService,
): Promise<Buffer | null> {
  const { summary, period, currency } = report as { summary: any; period: string; currency: string };
  const pt = (key: string, args?: Record<string, unknown>) =>
    i18n.translate(`common.pdf.${key}`, { lang, args }) as string;

  if (summary.totalIncome === BigInt(0) && summary.totalExpense === BigInt(0)) {
    return null;
  }

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const fontRegular = join(__dirname, '..', '..', 'assets', 'fonts', 'arial.ttf');
      const fontBold = join(__dirname, '..', '..', 'assets', 'fonts', 'arialbd.ttf');

      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      doc.registerFont('Regular', fontRegular);
      doc.registerFont('Bold', fontBold);
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const contentWidth = doc.page.width - 80;
      const catW = Math.floor(contentWidth * 0.48);
      const dateW = Math.floor(contentWidth * 0.25);
      const amtW = contentWidth - catW - dateW;

      const getCatLabel = (name: string, isSystem: boolean, notes: string[]) => {
        const base = isSystem
          ? (i18n.translate(`common.categories.names.${name}`, { lang }) as string)
          : name;
        return notes.length > 0 ? `${base} (${notes.join(', ')})` : base;
      };

      const tableOpts = {
        prepareHeader: () => (doc as any).fontSize(10).font('Bold'),
        prepareRow: () => (doc as any).fontSize(10).font('Regular'),
        headerColor: '#dddddd',
      };

      const allTransactions: any[] = summary.transactions || [];
      const expenseTxs = allTransactions
        .filter((t: any) => t.type === 'expense' || t.type === 'EXPENSE')
        .sort((a: any, b: any) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
      const incomeTxs = allTransactions
        .filter((t: any) => t.type === 'income' || t.type === 'INCOME')
        .sort((a: any, b: any) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

      // Group transactions by date and build flat rows with date headers + daily subtotal
      const buildGroupedRows = (txs: any[]) => {
        const groups = new Map<string, any[]>();
        for (const t of txs) {
          const dateKey = dayjs(t.occurredAt).format('DD.MM.YYYY');
          if (!groups.has(dateKey)) groups.set(dateKey, []);
          groups.get(dateKey)!.push(t);
        }
        const rows: any[] = [];
        for (const [date, items] of groups.entries()) {
          const dayTotal = items.reduce((sum: bigint, t: any) => sum + BigInt(t.amountMinor), BigInt(0));
          // Date header row — bold, grey background
          rows.push({
            k: date,
            d: '',
            v: formatAmount(dayTotal),
            options: { fontSize: 10, fontFamily: 'Bold', backgroundColor: '#0068a8' },
          });
          // Transaction rows — indented, date+time in column
          for (const t of items) {
            rows.push({
              k: '   ' + getCatLabel(t.category.name, t.category.isSystem, t.note ? [t.note] : []),
              d: dayjs(t.occurredAt).format('DD.MM.YYYY HH:mm'),
              v: formatAmount(t.amountMinor),
              options: { fontSize: 9, fontFamily: 'Regular' },
            });
          }
        }
        return rows;
      };

      const finalize = () => {
        doc.moveDown(1.5);
        const nowStr = dayjs().format('YYYY-MM-DD HH:mm');
        doc.fontSize(10).font('Regular').fillColor('#888888')
          .text(pt('date_label', { date: nowStr }));
        doc.end();
      };

      const renderIncome = () => {
        if (incomeTxs.length > 0) {
          doc.moveDown(0.8);
          doc.fontSize(13).font('Bold').fillColor('#000000').text(pt('income_section'));
          doc.moveDown(0.3);
          (doc as any).table(
            {
              headers: [
                { label: pt('col_income_cat'), property: 'k', width: catW },
                { label: pt('col_time'), property: 'd', width: dateW },
                { label: pt('col_amount', { currency }), property: 'v', width: amtW, align: 'right' },
              ],
              datas: buildGroupedRows(incomeTxs),
            },
            tableOpts,
            finalize,
          );
        } else {
          finalize();
        }
      };

      // в”Ђв”Ђ Title в”Ђв”Ђ
      doc.fontSize(18).font('Bold').fillColor('#000000')
        .text(pt('title', { period }), { align: 'center' });
      doc.moveDown(1);

      // в”Ђв”Ђ Section 1: Umumiy ko'rsatkichlar в”Ђв”Ђ
      doc.fontSize(13).font('Bold').text(pt('general_section'));
      doc.moveDown(0.3);
      (doc as any).table(
        {
          headers: [
            { label: pt('col_indicator'), property: 'k', width: catW + dateW },
            { label: pt('col_amount', { currency }), property: 'v', width: amtW, align: 'right' },
          ],
          datas: [
            { k: pt('row_income'), v: formatAmount(summary.totalIncome) },
            { k: pt('row_expense'), v: formatAmount(summary.totalExpense) },
            { k: pt('row_balance'), v: formatAmount(summary.net) },
          ],
        },
        tableOpts,
        () => {
          // в”Ђв”Ђ Section 2: Xarajatlar в”Ђв”Ђ
          if (expenseTxs.length > 0) {
            doc.moveDown(0.8);
            doc.fontSize(13).font('Bold').fillColor('#000000').text(pt('expense_section'));
            doc.moveDown(0.3);
            (doc as any).table(
              {
                headers: [
                  { label: pt('col_expense_cat'), property: 'k', width: catW },
                  { label: pt('col_time'), property: 'd', width: dateW },
                  { label: pt('col_amount', { currency }), property: 'v', width: amtW, align: 'right' },
                ],
                datas: buildGroupedRows(expenseTxs),
              },
              tableOpts,
              renderIncome,
            );
          } else {
            renderIncome();
          }
        },
      );
    } catch (e) {
      reject(e);
    }
  });
}

export function buildReportMessage(
  report: Awaited<ReturnType<ReportsService['getMonthReport']>>,
  lang: string,
  i18n: I18nService,
): string {
  const t = (key: string, args?: Record<string, unknown>) =>
    i18n.translate(`common.${key}`, { lang, args }) as string;

  const { summary, period, currency } = report;

  if (
    summary.totalIncome === BigInt(0) &&
    summary.totalExpense === BigInt(0)
  ) {
    return t('report.no_transactions');
  }

  let msg = t('report.title', { period });
  msg += t('report.income_line', {
    amount: formatAmount(summary.totalIncome),
    currency,
  });
  msg += t('report.expense_line', {
    amount: formatAmount(summary.totalExpense),
    currency,
  });
  msg += t('report.balance_line', {
    amount: formatAmount(summary.net),
    currency,
  });

  if (summary.expenseByCategory.length > 0) {
    msg += t('report.by_expense_category');
    for (const cat of summary.expenseByCategory) {
      const name = cat.isSystem
        ? (i18n.translate(`common.categories.names.${cat.categoryName}`, { lang }) as string)
        : cat.categoryName;
      let notesStr = cat.notes && cat.notes.length > 0 ? ' (' + cat.notes.join(', ') + ')' : '';
      msg += t('report.category_row', {
        name: name + notesStr,
        amount: formatAmount(cat.total),
        currency,
      });
    }
  }

  if (summary.incomeByCategory.length > 0) {
    msg += t('report.by_income_category');
    for (const cat of summary.incomeByCategory) {
      const name = cat.isSystem
        ? (i18n.translate(`common.categories.names.${cat.categoryName}`, { lang }) as string)
        : cat.categoryName;
      let notesStr = cat.notes && cat.notes.length > 0 ? ' (' + cat.notes.join(', ') + ')' : '';
      msg += t('report.category_row', {
        name: name + notesStr,
        amount: formatAmount(cat.total),
        currency,
      });
    }
  }

  return msg;
}

export async function generateExcelReport(report: any, lang: string, i18n: any): Promise<Buffer | null> {
  const { summary, period, currency } = report;
  if (summary.totalIncome === BigInt(0) && summary.totalExpense === BigInt(0)) return null;
  const xlsx = require('xlsx');
  const wb = xlsx.utils.book_new();
  const summaryData = [
    [i18n.translate('common.pdf.title', { lang, args: { period } })],
    [],
    [i18n.translate('common.pdf.date_label', { lang }), period],
    [i18n.translate('common.pdf.col_indicator', { lang }), currency],
    [],
    [i18n.translate('common.pdf.row_income', { lang }), formatAmount(summary.totalIncome)],
    [i18n.translate('common.pdf.row_expense', { lang }), formatAmount(summary.totalExpense)],
    [i18n.translate('common.pdf.row_balance', { lang }), formatAmount(summary.net)]
  ];

  if (summary.expenseByCategory.length > 0) {
    summaryData.push([], [i18n.translate('common.pdf.expense_section', { lang })]);
    summaryData.push([i18n.translate('common.pdf.col_indicator', { lang }), i18n.translate('common.pdf.col_amount', { lang, args: { currency } }), i18n.translate('common.pdf.col_note', { lang })]);
    for (const cat of summary.expenseByCategory) {
      const name = cat.isSystem ? i18n.translate(`common.categories.names.${cat.categoryName}`, { lang }) : cat.categoryName;
      const notesStr = cat.notes && cat.notes.length > 0 ? cat.notes.join(', ') : '';
      summaryData.push([name, formatAmount(cat.total), notesStr]);
    }
  }

  if (summary.incomeByCategory.length > 0) {
    summaryData.push([], [i18n.translate('common.pdf.income_section', { lang })]);
    summaryData.push([i18n.translate('common.pdf.col_indicator', { lang }), i18n.translate('common.pdf.col_amount', { lang, args: { currency } }), i18n.translate('common.pdf.col_note', { lang })]);
    for (const cat of summary.incomeByCategory) {
      const name = cat.isSystem ? i18n.translate(`common.categories.names.${cat.categoryName}`, { lang }) : cat.categoryName;
      const notesStr = cat.notes && cat.notes.length > 0 ? cat.notes.join(', ') : '';
      summaryData.push([name, formatAmount(cat.total), notesStr]);
    }
  }

  const ws = xlsx.utils.aoa_to_sheet(summaryData);
  xlsx.utils.book_append_sheet(wb, ws, 'Report');
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
