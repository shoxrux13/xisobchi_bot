import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

interface TelegramFrom {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByTelegramId(telegramUserId: bigint): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { telegramUserId },
    });
  }

  async findOrCreate(
    from: TelegramFrom,
    chatId?: number,
  ): Promise<{ user: User; isNew: boolean }> {
    const telegramUserId = BigInt(from.id);

    const existing = await this.prisma.user.findUnique({
      where: { telegramUserId },
    });

    if (existing) {
      const updated = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          firstName: from.first_name,
          lastName: from.last_name ?? null,
          username: from.username ?? null,
          telegramChatId: chatId ? BigInt(chatId) : existing.telegramChatId,
          lastSeenAt: new Date(),
        },
      });
      return { user: updated, isNew: false };
    }

    const created = await this.prisma.user.create({
      data: {
        telegramUserId,
        telegramChatId: chatId ? BigInt(chatId) : null,
        firstName: from.first_name,
        lastName: from.last_name ?? null,
        username: from.username ?? null,
        registeredAt: new Date(),
        lastSeenAt: new Date(),
      },
    });

    return { user: created, isNew: true };
  }
}
