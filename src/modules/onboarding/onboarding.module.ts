import { Module } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { UsersModule } from '../users/users.module';
import { UserSettingsModule } from '../user-settings/user-settings.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [UsersModule, UserSettingsModule, CategoriesModule],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
