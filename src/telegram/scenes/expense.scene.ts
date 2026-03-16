import { Ctx, On, Scene, SceneEnter, Command } from 'nestjs-telegraf';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { Scenes } from 'telegraf';
import { TelegramUpdate } from '../telegram.update';
import { ALL_MENU_KEYS } from '../../common/constants/menu.constants';
import { OnboardingService } from '../../modules/onboarding/onboarding.service';
import { CategoriesService } from '../../modules/categories/categories.service';
import { TransactionsService } from '../../modules/transactions/transactions.service';
import { TransactionType } from '../../common/enums/transaction-type.enum';
import { parseAmount, formatAmount } from '../../common/utils/amount.util';
import { categoryKeyboard, mainMenuKeyboard, quickAmountKeyboard } from '../keyboards/inline.keyboard';

interface ExpenseState {
  step: 'amount' | 'category' | 'note';
  userId?: string;
  lang?: string;
  currency?: string;
  amount?: number;
  categoryId?: string;
  categoryName?: string;
}

@Injectable()
@Scene('expense')
export class ExpenseScene {
  constructor(
    private readonly i18n: I18nService,
    private readonly onboardingService: OnboardingService,
    private readonly categoriesService: CategoriesService,
    private readonly transactionsService: TransactionsService,
    @Inject(forwardRef(() => TelegramUpdate)) private readonly telegramUpdate: TelegramUpdate,
  ) {}

  private t(lang: string, key: string, args?: Record<string, unknown>): string {
    return this.i18n.translate(`common.${key}`, { lang, args }) as string;
  }

  @SceneEnter()
  async onEnter(@Ctx() ctx: Scenes.SceneContext & { scene: { state: ExpenseState } }): Promise<void> {
    const { user, settings } = await this.onboardingService.ensureUser(
      ctx.from!,
      ctx.chat?.id,
    );
    ctx.scene.state.userId = user.id;
    ctx.scene.state.lang = settings.languageCode;
    ctx.scene.state.currency = settings.currencyCode;
    ctx.scene.state.step = 'amount';
    await ctx.reply(
      this.t(settings.languageCode, 'expense.ask_amount'),
      {
        parse_mode: 'HTML',
        reply_markup: quickAmountKeyboard(this.t(settings.languageCode, 'buttons.cancel')),
      },
    );
  }

  @On('text')
  async onText(@Ctx() ctx: Scenes.SceneContext & { scene: { state: ExpenseState }; message: { text: string } }): Promise<void> {
    const state = ctx.scene.state;
    const lang = state.lang ?? 'uz';
    const text = ctx.message.text.trim();

    // Commands or Menu Buttons Interceptor
    const isCommand = text.startsWith('/') && text !== '/skip';
    const tBtn = (key: string) => this.i18n.translate(`common.buttons.${key}`, { lang }) as string;
    const isMenuButton = ALL_MENU_KEYS.map(tBtn).some(b => b.trim() === text);

    // Cancel check — handles both /cancel command and reply keyboard cancel button
    if (text === '/cancel' || text === tBtn('cancel').trim()) {
      await ctx.scene.leave();
      await ctx.reply(this.t(lang, 'cancel_success'), { parse_mode: 'HTML', reply_markup: mainMenuKeyboard(lang, this.i18n) });
      return;
    }

    if (isCommand || isMenuButton) {
      if (isMenuButton) {
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

    if (text === '/skip' && state.step === 'note') {
      await this.saveTransaction(ctx, state, null);
      return;
    }

    if (state.step === 'amount') {
      const amount = parseAmount(text);
      if (!amount) {
        await ctx.reply(this.t(lang, 'expense.invalid_amount'), { parse_mode: 'HTML' });
        return;
      }
      state.amount = amount;
      state.step = 'category';

      const categories = await this.categoriesService.findByUserAndType(
        state.userId!,
        TransactionType.EXPENSE,
      );
      await ctx.reply(
        this.t(lang, 'expense.ask_category'),
        {
          parse_mode: 'HTML',
          reply_markup: categoryKeyboard(
            categories,
            lang,
            this.i18n,
            this.t(lang, 'buttons.cancel'),
          ),
        },
      );
      return;
    }

    if (state.step === 'note') {
      await this.saveTransaction(ctx, state, text);
    }
  }

  @On('callback_query')
  async onCallback(@Ctx() ctx: Scenes.SceneContext & { scene: { state: ExpenseState }; callbackQuery: { data?: string } }): Promise<void> {
    const state = ctx.scene.state;
    const lang = state.lang ?? 'uz';
    const data = ctx.callbackQuery.data ?? '';

    await ctx.answerCbQuery();

    if (data === 'cancel') {
      await ctx.scene.leave();
      await ctx.reply(this.t(lang, 'cancel_success'), { parse_mode: 'HTML', reply_markup: mainMenuKeyboard(lang, this.i18n) });
      return;
    }

    if (state.step === 'category' && data.startsWith('cat:')) {
      const parts = data.split(':');
      state.categoryId = parts[1];
      state.categoryName = parts.slice(2).join(':');
      state.step = 'note';
      await ctx.reply(
        this.t(lang, 'expense.ask_note'),
        { parse_mode: 'HTML' },
      );
    }
  }

  private async saveTransaction(
    ctx: Scenes.SceneContext & { scene: { state: ExpenseState } },
    state: ExpenseState,
    note: string | null,
  ): Promise<void> {
    const lang = state.lang ?? 'uz';
    await this.transactionsService.create({
      userId: state.userId!,
      categoryId: state.categoryId!,
      type: TransactionType.EXPENSE,
      amountMinor: state.amount!,
      note: note ?? undefined,
    });

    const balance = await this.transactionsService.getAllTimeBalance(state.userId!);
    const noteText = note
      ? (this.t(lang, 'note_text', { note }) as string)
      : '';

    await ctx.reply(
      this.t(lang, 'expense.saved', {
        amount: formatAmount(state.amount!),
        currency: state.currency,
        category: state.categoryName,
        note: noteText,
        balance: formatAmount(balance.net),
      }),
      { parse_mode: 'HTML', reply_markup: mainMenuKeyboard(lang, this.i18n) },
    );
    await ctx.scene.leave();
  }

  @Command('cancel')
  async onCancel(@Ctx() ctx: Scenes.SceneContext & { scene: { state: ExpenseState } }): Promise<void> {
    const lang = ctx.scene.state.lang ?? 'uz';
    await ctx.scene.leave();
    await ctx.reply(this.t(lang, 'cancel_success'), { parse_mode: 'HTML', reply_markup: mainMenuKeyboard(lang, this.i18n) });
  }
}
