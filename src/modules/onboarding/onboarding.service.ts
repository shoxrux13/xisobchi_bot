import { Injectable } from '@nestjs/common';
import { User, UserSettings } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { UserSettingsService } from '../user-settings/user-settings.service';
import { CategoriesService } from '../categories/categories.service';

interface TelegramFrom {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface UserContext {
  user: User;
  settings: UserSettings;
  isNew: boolean;
}

export interface UserCheckResult {
  user: User;
  settings: UserSettings | null;
  isNew: boolean;
}

@Injectable()
export class OnboardingService {
  constructor(
    private readonly usersService: UsersService,
    private readonly userSettingsService: UserSettingsService,
    private readonly categoriesService: CategoriesService,
  ) {}

  /**
   * Creates or finds the Telegram user. Does NOT create settings.
   * Used in /start to check whether language selection is needed.
   */
  async findOrCreateUser(
    from: TelegramFrom,
    chatId?: number,
  ): Promise<UserCheckResult> {
    const { user, isNew } = await this.usersService.findOrCreate(from, chatId);
    const settings = await this.userSettingsService.findByUserId(user.id);
    return { user, settings, isNew };
  }

  /**
   * Creates settings + default categories for a user with the chosen language.
   * Called after the user selects their language in the onboarding scene.
   */
  async setupUser(userId: string, languageCode: string): Promise<UserSettings> {
    const settings = await this.userSettingsService.createDefault(
      userId,
      languageCode,
    );
    await this.categoriesService.createDefaults(userId);
    return settings;
  }

  /**
   * Ensures user + settings exist. If settings are missing, creates them
   * with the default language (uz). Used by all scenes except /start.
   */
  async ensureUser(from: TelegramFrom, chatId?: number): Promise<UserContext> {
    const { user, settings: existingSettings, isNew } =
      await this.findOrCreateUser(from, chatId);

    const settings =
      existingSettings ?? (await this.setupUser(user.id, 'uz'));

    return { user, settings, isNew };
  }
}
