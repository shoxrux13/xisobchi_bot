import { Ctx, On, Scene, SceneEnter } from 'nestjs-telegraf';
import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { Scenes } from 'telegraf';
import { OnboardingService } from '../../modules/onboarding/onboarding.service';
import { languageKeyboard, mainMenuKeyboard } from '../keyboards/inline.keyboard';

interface OnboardingState {
  userId?: string;
  firstName?: string;
  isNew?: boolean;
}

// Hardcoded because we don't know the language yet
const LANG_SELECT_MESSAGES: Record<string, string> = {
  uz: "🌐 Tilni tanlang / Выберите язык / Choose language:",
};

@Injectable()
@Scene('onboarding')
export class OnboardingScene {
  constructor(
    private readonly i18n: I18nService,
    private readonly onboardingService: OnboardingService,
  ) {}

  private t(lang: string, key: string, args?: Record<string, unknown>): string {
    return this.i18n.translate(`common.${key}`, { lang, args }) as string;
  }

  @SceneEnter()
  async onEnter(
    @Ctx()
    ctx: Scenes.SceneContext & { scene: { state: OnboardingState } },
  ): Promise<void> {
    const { user, settings, isNew } =
      await this.onboardingService.findOrCreateUser(
        ctx.from!,
        ctx.chat?.id,
      );

    ctx.scene.state.userId = user.id;
    ctx.scene.state.firstName = user.firstName;
    ctx.scene.state.isNew = isNew || !settings;

    // Always show language selection on /start
    await ctx.reply(LANG_SELECT_MESSAGES.uz, {
      reply_markup: languageKeyboard(),
    });
  }

  @On('callback_query')
  async onCallback(
    @Ctx()
    ctx: Scenes.SceneContext & {
      scene: { state: OnboardingState };
      callbackQuery: { data?: string };
    },
  ): Promise<void> {
    const data = ctx.callbackQuery.data ?? '';
    await ctx.answerCbQuery();

    if (!data.startsWith('lang:')) return;

    const lang = data.split(':')[1];
    const validLangs = ['uz', 'ru', 'en'];
    const chosenLang = validLangs.includes(lang) ? lang : 'uz';

    // Resolve userId reliably: prefer state, fall back to DB lookup by telegram id
    let userId = ctx.scene.state.userId;
    if (!userId) {
      const { user } = await this.onboardingService.findOrCreateUser(
        ctx.from!,
        ctx.chat?.id,
      );
      userId = user.id;
    }

    const settings = await this.onboardingService.setupUser(userId, chosenLang);

    // Save state values before leaving (scene.leave() clears state)
    const isNew = ctx.scene.state.isNew;
    const firstName = ctx.from?.first_name ?? ctx.scene.state.firstName;

    // Edit the language selection message to remove the keyboard
    try {
      await ctx.editMessageReplyMarkup(undefined);
    } catch {
      // ignore if message can't be edited
    }

    await ctx.scene.leave();

    const msgKey = isNew ? 'welcome' : 'welcome_back';
    await ctx.reply(
      this.t(settings.languageCode, msgKey, { name: firstName }),
      { parse_mode: 'HTML' },
    );
    await ctx.reply(
      this.t(settings.languageCode, 'help'),
      { parse_mode: 'HTML', reply_markup: mainMenuKeyboard(settings.languageCode, this.i18n) },
    );
  }
}
