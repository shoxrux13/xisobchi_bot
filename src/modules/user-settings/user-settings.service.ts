import { Injectable } from '@nestjs/common';
import { UserSettings } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { Language } from '../../common/enums/language.enum';

const SUPPORTED_CURRENCIES = ['UZS', 'USD', 'EUR', 'RUB'];

@Injectable()
export class UserSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<UserSettings | null> {
    return this.prisma.userSettings.findUnique({ where: { userId } });
  }

  async createDefault(
    userId: string,
    languageCode: string = Language.UZ,
  ): Promise<UserSettings> {
    return this.prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        languageCode,
        currencyCode: 'UZS',
        timezone: 'Asia/Tashkent',
        defaultReportType: 'month',
      },
      update: {
        languageCode,
      },
    });
  }

  async updateLanguage(
    userId: string,
    languageCode: string,
  ): Promise<UserSettings> {
    const valid = Object.values(Language).includes(languageCode as Language);
    if (!valid) throw new Error('Unsupported language');
    return this.prisma.userSettings.update({
      where: { userId },
      data: { languageCode },
    });
  }

  async updateCurrency(
    userId: string,
    currencyCode: string,
  ): Promise<UserSettings> {
    if (!SUPPORTED_CURRENCIES.includes(currencyCode.toUpperCase())) {
      throw new Error('Unsupported currency');
    }
    return this.prisma.userSettings.update({
      where: { userId },
      data: { currencyCode: currencyCode.toUpperCase() },
    });
  }

  async updateTimezone(
    userId: string,
    timezone: string,
  ): Promise<UserSettings> {
    return this.prisma.userSettings.update({
      where: { userId },
      data: { timezone },
    });
  }

  async updateFormat(
    userId: string,
    reportFormat: string,
  ): Promise<UserSettings> {
    return this.prisma.userSettings.update({
      where: { userId },
      data: { reportFormat },
    });
  }
}
