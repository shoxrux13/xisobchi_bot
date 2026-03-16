import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { session } from 'telegraf';
import { TelegramUpdate } from './telegram.update';
import { OnboardingScene } from './scenes/onboarding.scene';
import { IncomeScene } from './scenes/income.scene';
import { ExpenseScene } from './scenes/expense.scene';
import { ReportMonthScene } from './scenes/report-month.scene';
import { SettingsScene } from './scenes/settings.scene';
import { OnboardingModule } from '../modules/onboarding/onboarding.module';
import { CategoriesModule } from '../modules/categories/categories.module';
import { TransactionsModule } from '../modules/transactions/transactions.module';
import { ReportsModule } from '../modules/reports/reports.module';
import { UserSettingsModule } from '../modules/user-settings/user-settings.module';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        token: config.getOrThrow<string>('BOT_TOKEN'),
        middlewares: [session()],
      }),
    }),
    OnboardingModule,
    CategoriesModule,
    TransactionsModule,
    ReportsModule,
    UserSettingsModule,
  ],
  providers: [
    TelegramUpdate,
    OnboardingScene,
    IncomeScene,
    ExpenseScene,
    ReportMonthScene,
    SettingsScene,
  ],
})
export class TelegramModule {}
