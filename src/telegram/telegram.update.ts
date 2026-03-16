import {
  Update,
  Start,
  Help,
  Command,
  Ctx,
  On,
  Action,
} from 'nestjs-telegraf';
import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { Context, Scenes } from 'telegraf';
import { OnboardingService } from '../modules/onboarding/onboarding.service';
import { CategoriesService } from '../modules/categories/categories.service';
import { TransactionsService } from '../modules/transactions/transactions.service';
import { ReportsService } from '../modules/reports/reports.service';
import { TransactionType } from '../common/enums/transaction-type.enum';
import { formatAmount } from '../common/utils/amount.util';
import { buildReportMessage, generatePDFReport, generateExcelReport } from './scenes/report-month.scene';
import { currentYearMonth, formatDateTime } from '../common/utils/date.util';
import { LANGUAGE_LABELS } from '../common/enums/language.enum';
import { mainMenuKeyboard, reportPeriodKeyboard } from './keyboards/inline.keyboard';

type BotCtx = Context & { scene: Scenes.SceneContextScene<Scenes.SceneContext> };

@Injectable()
@Update()
export class TelegramUpdate {
  constructor(
    private readonly i18n: I18nService,
    private readonly onboardingService: OnboardingService,
    private readonly categoriesService: CategoriesService,
    private readonly transactionsService: TransactionsService,
    private readonly reportsService: ReportsService,
  ) {}

  private t(lang: string, key: string, args?: Record<string, unknown>): string {
    return this.i18n.translate(`common.${key}`, { lang, args }) as string;
  }

  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  // /start в†’ onboarding scene (til tanlash yoki welcome_back)
  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  @Start()
  async onStart(@Ctx() ctx: BotCtx): Promise<void> {
    if (!this.isPrivate(ctx)) return;
    await ctx.scene.enter('onboarding');
  }

  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  // /help
  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  @Help()
  async onHelp(@Ctx() ctx: BotCtx): Promise<void> {
    if (!this.isPrivate(ctx)) return;
    const lang = await this.getUserLang(ctx);
    await ctx.reply(this.t(lang, 'help'), { parse_mode: 'HTML', reply_markup: mainMenuKeyboard(lang, this.i18n) });
  }

  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  // /income в†’ enter scene
  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  @Command('income')
  async onIncome(@Ctx() ctx: BotCtx): Promise<void> {
    if (!this.isPrivate(ctx)) return;
    await ctx.scene.enter('income');
  }

  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  // /expense в†’ enter scene
  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  @Command('expense')
  async onExpense(@Ctx() ctx: BotCtx): Promise<void> {
    if (!this.isPrivate(ctx)) return;
    await ctx.scene.enter('expense');
  }

  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  // /balance
  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  @Command('balance')
  async onBalance(@Ctx() ctx: BotCtx): Promise<void> {
    if (!this.isPrivate(ctx)) return;
    const { user, settings } = await this.onboardingService.ensureUser(
      ctx.from!,
      ctx.chat?.id,
    );
    const lang = settings.languageCode;
    const currency = settings.currencyCode;
    const { totalIncome, totalExpense, net } =
      await this.transactionsService.getAllTimeBalance(user.id);

    if (totalIncome === BigInt(0) && totalExpense === BigInt(0)) {
      await ctx.reply(this.t(lang, 'balance.no_data'), { parse_mode: 'HTML' });
      return;
    }

    let msg = this.t(lang, 'balance.title');
    msg += this.t(lang, 'balance.income_label', {
      amount: formatAmount(totalIncome),
      currency,
    });
    msg += this.t(lang, 'balance.expense_label', {
      amount: formatAmount(totalExpense),
      currency,
    });
    msg += this.t(lang, 'balance.net_label', {
      amount: formatAmount(net),
      currency,
    });
    await ctx.reply(msg, { parse_mode: 'HTML', reply_markup: mainMenuKeyboard(lang, this.i18n) });
  }

  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  // /report вЂ” choose period
  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  @Command('report')
  async onReportBtn(@Ctx() ctx: BotCtx): Promise<void> {
    if (!this.isPrivate(ctx)) return;
    const lang = await this.getUserLang(ctx);
    await ctx.reply(this.t(lang, 'report.title', { period: '...' }), {
      parse_mode: 'HTML',
      reply_markup: reportPeriodKeyboard(lang, this.i18n),
    });
  }

  @Action(/^report:(.+)$/)
  async onReportAction(@Ctx() ctx: BotCtx & { match: RegExpExecArray }): Promise<void> {
    const period = ctx.match[1];
    await ctx.answerCbQuery().catch(() => {});
    const { user, settings } = await this.onboardingService.ensureUser(ctx.from!, ctx.chat?.id);
    const lang = settings.languageCode;
    const { year, month } = currentYearMonth(settings.timezone);

    if (period === 'custom_month') {
      await ctx.scene.enter('report_month');
      return;
    }

        let report: any;

    if (period === 'today') {
      report = await this.reportsService.getDailyReport(user.id, settings.timezone, settings.currencyCode, lang, false);
    } else if (period === 'yesterday') {
      report = await this.reportsService.getDailyReport(user.id, settings.timezone, settings.currencyCode, lang, true);
    } else if (period === 'week') {
      report = await this.reportsService.getWeeklyReport(user.id, settings.timezone, settings.currencyCode, lang);
    } else {
      report = await this.reportsService.getCurrentMonthReport(user.id, settings.timezone, settings.currencyCode, lang);
    }

    let fileBuffer: Buffer | null = null;
      let filename = '';

      const format = settings.reportFormat || 'pdf';
      if (format === 'excel') {
        fileBuffer = await generateExcelReport(report, lang, this.i18n);
        filename = `Hisobot_${period}.xlsx`;
      } else {
        fileBuffer = await generatePDFReport(report, lang, this.i18n);
        filename = `Hisobot_${period}.pdf`;
      }

      await ctx.editMessageText(buildReportMessage(report, lang, this.i18n), { parse_mode: 'HTML' });

      if (fileBuffer) {
        await (ctx as any).replyWithDocument({
          source: fileBuffer,
          filename,
        });
      }
    }

  // /report_month в†’ enter scene
  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  @Command('report_month')
  async onReportMonth(@Ctx() ctx: BotCtx): Promise<void> {
    if (!this.isPrivate(ctx)) return;
    await ctx.scene.enter('report_month');
  }

  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  // /categories
  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  @Command('categories')
  async onCategories(@Ctx() ctx: BotCtx): Promise<void> {
    if (!this.isPrivate(ctx)) return;
    const { user, settings } = await this.onboardingService.ensureUser(
      ctx.from!,
      ctx.chat?.id,
    );
    const lang = settings.languageCode;

    const income = await this.categoriesService.findByUserAndType(
      user.id,
      TransactionType.INCOME,
    );
    const expense = await this.categoriesService.findByUserAndType(
      user.id,
      TransactionType.EXPENSE,
    );

    const formatList = (cats: typeof income) =>
      cats
        .map((c) => {
          const name =
            c.isSystem
              ? (this.i18n.translate(`common.categories.names.${c.name}`, {
                  lang,
                }) as string)
              : c.name;
          return `  • ${name}`;
        })
        .join('\n');

    let msg = this.t(lang, 'categories.income_title');
    msg += income.length ? formatList(income) : this.t(lang, 'categories.empty');
    msg += '\n\n';
    msg += this.t(lang, 'categories.expense_title');
    msg += expense.length
      ? formatList(expense)
      : this.t(lang, 'categories.empty');

    await ctx.reply(msg, { parse_mode: 'HTML', reply_markup: mainMenuKeyboard(lang, this.i18n) });
  }

  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  // /settings в†’ enter scene
  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  @Command('settings')
  async onSettings(@Ctx() ctx: BotCtx): Promise<void> {
    if (!this.isPrivate(ctx)) return;
    await ctx.scene.enter('settings');
  }

  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  // Reply keyboard button handler
  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  @On('text')
  async onText(@Ctx() ctx: BotCtx): Promise<void> {
    if (!this.isPrivate(ctx)) return;
    const msg = ctx.message as { text?: string };
    const text = msg?.text?.trim();
    if (!text || text.startsWith('/')) return;

    const lang = await this.getUserLang(ctx);
    const t = (key: string) => this.i18n.translate(`common.buttons.${key}`, { lang }) as string;

    if (text === t('menu_income')) {
      await ctx.scene.enter('income');
    } else if (text === t('menu_expense')) {
      await ctx.scene.enter('expense');
    } else if (text === t('menu_balance')) {
      await this.onBalance(ctx);
    } else if (text === t('menu_report_short')) {
      await this.onReportBtn(ctx);
    } else if (text === t('menu_report_month')) {
      await ctx.scene.enter('report_month');
    } else if (text === t('menu_categories')) {
      await this.onCategories(ctx);
    } else if (text === t('menu_settings')) {
      await ctx.scene.enter('settings');
    } else if (text === t('menu_help')) {
      await this.onHelp(ctx);
    }
  }

  // ----------------------------------------------------------------------
  // /history
  // ----------------------------------------------------------------------
  @Command('history')
  async onHistory(@Ctx() ctx: BotCtx): Promise<void> {
    if (!this.isPrivate(ctx)) return;
    const { user, settings } = await this.onboardingService.ensureUser(ctx.from!, ctx.chat?.id);
    const lang = settings.languageCode;
    const currency = settings.currencyCode;

    const txs = await this.transactionsService.getLastTransactions(user.id, 10);
    
    if (txs.length === 0) {
      await ctx.reply(this.t(lang, 'history.empty', { defaultValue: 'You have no transactions.' }), { parse_mode: 'HTML' });
      return;
    }

    let msg = this.t(lang, 'history.title', { defaultValue: '<b>Last 10 transactions:</b>' }) + '\n\n';
    const inlineKeyboard: any[][] = [];
    let buttonsRow: any[] = [];

    txs.forEach((tx, index) => {
      const isIncome = tx.type === TransactionType.INCOME;
      const amountStr = formatAmount(tx.amountMinor);
      const sign = isIncome ? '+' : '-';
      const catName = tx.category.isSystem 
        ? this.i18n.translate(`common.categories.names.${tx.category.name}`, { lang }) 
        : tx.category.name;
        
      const dateStr = formatDateTime(tx.occurredAt, settings.timezone);
      
      msg += `<b>${index + 1}.</b> ${dateStr} - <i>${catName}</i>\n`;
      msg += `${sign}${amountStr} ${currency}\n`;
      if (tx.note) {
        msg += `Izoh: ${tx.note}\n`;
      }
      msg += '\n';

      buttonsRow.push({
        text: '❌ ' + (index + 1),
        callback_data: 'del_tx:' + tx.id
      });

      if (buttonsRow.length === 5) {
        inlineKeyboard.push(buttonsRow);
        buttonsRow = [];
      }
    });

    if (buttonsRow.length > 0) {
      inlineKeyboard.push(buttonsRow);
    }

    inlineKeyboard.push([{
      text: this.t(lang, 'history.clear_all', { defaultValue: '🗑 Barchasini o\'chirish' }),
      callback_data: 'del_tx_all'
    }]);

    await ctx.reply(msg, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: inlineKeyboard
      }
    });
  }

  @Action(/^del_tx:(.+)$/)
  async onDeleteTxAction(@Ctx() ctx: BotCtx & { match: RegExpExecArray }): Promise<void> {
    const txId = ctx.match[1];
    await ctx.answerCbQuery().catch(() => {});
    
    const { user, settings } = await this.onboardingService.ensureUser(ctx.from!, ctx.chat?.id);
    const tx = await this.transactionsService.getTransactionById(txId, user.id);
    
    if (!tx || tx.userId !== user.id) {
      await ctx.reply(this.t(settings.languageCode, 'history.not_found', { defaultValue: 'Transaction not found or already deleted.' }));
      return;
    }

    await this.transactionsService.deleteTransaction(txId, user.id);
    await ctx.reply(this.t(settings.languageCode, 'history.deleted', { defaultValue: 'Transaction deleted.' }));

    // Re-trigger history so it updates
    await this.onHistory(ctx);
  }

  @Action('del_tx_all')
  async onDeleteAllTxAction(@Ctx() ctx: BotCtx): Promise<void> {
    await ctx.answerCbQuery().catch(() => {});
    
    // Add confirmation keyboard
    const { settings } = await this.onboardingService.ensureUser(ctx.from!, ctx.chat?.id);
    const lang = settings.languageCode;
    
    await ctx.reply(this.t(lang, 'history.confirm_clear_all', { defaultValue: 'Rostdan ham barcha tranzaksiyalarni o\'chirmoqchimisiz? Bu amalni bekor qilib bo\'lmaydi.' }), {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '⚠️ ' + this.t(lang, 'buttons.yes_clear_all', { defaultValue: 'Ha, hammasini o\'chirish' }), callback_data: 'confirm_del_all' },
            { text: '❌ ' + this.t(lang, 'buttons.cancel', { defaultValue: 'Bekor qilish' }), callback_data: 'cancel_del_all' }
          ]
        ]
      }
    });
  }

  @Action('confirm_del_all')
  async onConfirmDeleteAllAction(@Ctx() ctx: BotCtx): Promise<void> {
    await ctx.answerCbQuery().catch(() => {});
    const { user, settings } = await this.onboardingService.ensureUser(ctx.from!, ctx.chat?.id);
    const lang = settings.languageCode;
    
    await this.transactionsService.deleteAllTransactions(user.id);
    await ctx.editMessageText(this.t(lang, 'history.all_deleted', { defaultValue: 'Barcha tranzaksiyalar muvaffaqiyatli o\'chirildi.' }));
    await this.onHistory(ctx);
  }

  @Action('cancel_del_all')
  async onCancelDeleteAllAction(@Ctx() ctx: BotCtx): Promise<void> {
    await ctx.answerCbQuery().catch(() => {});
    const { settings } = await this.onboardingService.ensureUser(ctx.from!, ctx.chat?.id);
    await ctx.editMessageText(this.t(settings.languageCode, 'cancel_success', { defaultValue: 'Amal bekor qilindi.' }));
  }

  // ----------------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------------
  private isPrivate(ctx: BotCtx): boolean {
    return ctx.chat?.type === 'private';
  }

  private async getUserLang(ctx: BotCtx): Promise<string> {
    const { settings } = await this.onboardingService.ensureUser(
      ctx.from!,
      ctx.chat?.id,
    );
    return settings.languageCode;
  }
}
