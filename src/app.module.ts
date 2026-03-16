import { Module, Injectable, ExecutionContext } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { I18nModule, I18nResolver } from 'nestjs-i18n';
import { join } from 'path';
import { PrismaModule } from './database/prisma.module';
import { TelegramModule } from './telegram/telegram.module';

@Injectable()
export class TelegrafI18nResolver implements I18nResolver {
  resolve(context: ExecutionContext) {
    return undefined;
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'uz',
      loaderOptions: {
        path: join(__dirname, 'i18n'),
        watch: false,
      },
      resolvers: [TelegrafI18nResolver],
    }),
    PrismaModule,
    TelegramModule,
  ],
})
export class AppModule {}
