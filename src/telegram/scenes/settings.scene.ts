import { Ctx, On, Scene, SceneEnter, Action, Command } from 'nestjs-telegraf';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { Scenes } from 'telegraf';
import { TelegramUpdate } from '../telegram.update';
import { ALL_MENU_KEYS } from '../../common/constants/menu.constants';
import { OnboardingService } from '../../modules/onboarding/onboarding.service';
import { UserSettingsService } from '../../modules/user-settings/user-settings.service';
import { LANGUAGE_LABELS } from '../../common/enums/language.enum';
import { isValidTimezone } from '../../common/utils/date.util';
import {
  settingsKeyboard,
  languageKeyboard,
  currencyKeyboard,
  formatKeyboard,
  mainMenuKeyboard,
} from '../keyboards/inline.keyboard';

interface SettingsState {
  step: 'menu' | 'timezone';
  userId?: string;
  lang?: string;
  currency?: string;
  timezone?: string;
}

@Injectable()
@Scene('settings')
export class SettingsScene {
  constructor(
    private readonly i18n: I18nService,
    private readonly onboardingService: OnboardingService,
    private readonly userSettingsService: UserSettingsService,
    @Inject(forwardRef(() => TelegramUpdate)) private readonly telegramUpdate: TelegramUpdate,
  ) {}

  private t(lang: string, key: string, args?: Record<string, unknown>): string {
    return this.i18n.translate(`common.${key}`, { lang, args }) as string;
  }

  @SceneEnter()
  async onEnter(@Ctx() ctx: Scenes.SceneContext & { scene: { state: SettingsState } }): Promise<void> {
    const { user, settings } = await this.onboardingService.ensureUser(
      ctx.from!,
      ctx.chat?.id,
    );
    ctx.scene.state.userId = user.id;
    ctx.scene.state.lang = settings.languageCode;
    ctx.scene.state.currency = settings.currencyCode;
    ctx.scene.state.timezone = settings.timezone;
    ctx.scene.state.step = 'menu';

    const lang = settings.languageCode;
    await ctx.reply(
      this.t(lang, 'settings.title', {
        language: LANGUAGE_LABELS[lang as keyof typeof LANGUAGE_LABELS] ?? lang,
        currency: settings.currencyCode,
        timezone: settings.timezone,
      }),
      {
        parse_mode: 'HTML',
        reply_markup: settingsKeyboard(lang, this.i18n),
      },
    );
  }

  @On('callback_query')
  async onCallback(@Ctx() ctx: Scenes.SceneContext & { scene: { state: SettingsState }; callbackQuery: { data?: string } }): Promise<void> {
    const state = ctx.scene.state;
    const lang = state.lang ?? 'uz';
    const data = ctx.callbackQuery.data ?? '';

    await ctx.answerCbQuery();

    if (data === 'settings:language') {
      await ctx.reply(
        this.t(lang, 'settings.language.ask'),
        { reply_markup: languageKeyboard() },
      );
      return;
    }

    if (data === 'settings:currency') {
      await ctx.reply(
        this.t(lang, 'settings.currency.ask'),
        { reply_markup: currencyKeyboard() },
      );
      return;
    }

    if (data === 'settings:timezone') {
      state.step = 'timezone';
      await ctx.reply(
        this.t(lang, 'settings.timezone.ask'),
        { parse_mode: 'HTML' },
      );
      return;
    }

    if (data === 'settings:format') {
      await ctx.reply(
        this.t(lang, 'settings.format.ask'),
        { reply_markup: formatKeyboard() },
      );
      return;
    }

    if (data.startsWith('lang:')) {
      const code = data.slice(5);
      await this.userSettingsService.updateLanguage(state.userId!, code);
      state.lang = code;
      // Re-import mainMenuKeyboard on top, then use it here to refresh main keyboard
      await ctx.reply(
        this.t(code, `settings.language.changed`),
        { parse_mode: 'HTML', reply_markup: mainMenuKeyboard(code, this.i18n) },
      );
      await ctx.scene.leave();
      return;
    }

    if (data.startsWith('curr:')) {
      const code = data.slice(5);
      await this.userSettingsService.updateCurrency(state.userId!, code);
      state.currency = code;
      await ctx.reply(
        this.t(lang, 'settings.currency.changed', { currency: code }),
        { parse_mode: 'HTML' },
      );
      await ctx.scene.leave();
      return;
    }

    if (data.startsWith('format:')) {
      const fmt = data.slice(7);
      await this.userSettingsService.updateFormat(state.userId!, fmt);
      await ctx.reply(
        this.t(lang, 'settings.format.updated'),
        { parse_mode: 'HTML' },
      );
      await ctx.scene.leave();
      return;
    }
  }

  @On('text')
  async onText(@Ctx() ctx: Scenes.SceneContext & { scene: { state: SettingsState }; message: { text: string } }): Promise<void> {
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

    if (state.step === 'timezone') {
      if (!isValidTimezone(text)) {
        await ctx.reply(
          this.t(lang, 'settings.timezone.invalid'),
          { parse_mode: 'HTML' },
        );
        return;
      }
      await this.userSettingsService.updateTimezone(state.userId!, text);
      await ctx.reply(
        this.t(lang, 'settings.timezone.changed', { timezone: text }),
        { parse_mode: 'HTML' },
      );
      await ctx.scene.leave();
    }
  }

  @Command('cancel')
  async onCancel(@Ctx() ctx: Scenes.SceneContext & { scene: { state: SettingsState } }): Promise<void> {
    const lang = ctx.scene.state.lang ?? 'uz';
    await ctx.scene.leave();
    await ctx.reply(this.t(lang, 'cancel_success'), { parse_mode: 'HTML' });
  }
}
