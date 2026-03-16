import { Injectable, OnModuleInit } from '@nestjs/common';
import { Category } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TransactionType } from '../../common/enums/transaction-type.enum';

interface DefaultCategory {
    name: string;
    type: TransactionType;
    sortOrder: number;
}

const DEFAULT_INCOME_CATEGORIES: DefaultCategory[] = [
    { name: 'salary', type: TransactionType.INCOME, sortOrder: 1 },
    { name: 'bonus', type: TransactionType.INCOME, sortOrder: 2 },
    { name: 'gift', type: TransactionType.INCOME, sortOrder: 3 },
    { name: 'other_income', type: TransactionType.INCOME, sortOrder: 4 },
];

const DEFAULT_EXPENSE_CATEGORIES: DefaultCategory[] = [
    { name: 'food', type: TransactionType.EXPENSE, sortOrder: 1 },
    { name: 'transport', type: TransactionType.EXPENSE, sortOrder: 2 },
    { name: 'home', type: TransactionType.EXPENSE, sortOrder: 3 },
    { name: 'health', type: TransactionType.EXPENSE, sortOrder: 4 },
    { name: 'education', type: TransactionType.EXPENSE, sortOrder: 5 },
    { name: 'entertainment', type: TransactionType.EXPENSE, sortOrder: 6 },
    { name: 'credit', type: TransactionType.EXPENSE, sortOrder: 7 },
    { name: 'other_expense', type: TransactionType.EXPENSE, sortOrder: 8 },
];

@Injectable()
export class CategoriesService implements OnModuleInit {
    constructor(private readonly prisma: PrismaService) { }

    async onModuleInit() {
        // Sync defaults for all existing users when app starts
        const users = await this.prisma.user.findMany({ select: { id: true } });
        for (const user of users) {
            await this.createDefaults(user.id);
        }
    }

    async createDefaults(userId: string): Promise<void> {
        const allDefaults = [
            ...DEFAULT_INCOME_CATEGORIES,
            ...DEFAULT_EXPENSE_CATEGORIES,
        ];

        await this.prisma.category.createMany({
            data: allDefaults.map((c) => ({
                userId,
                name: c.name,
                type: c.type,
                isSystem: true,
                isActive: true,
                sortOrder: c.sortOrder,
            })),
            skipDuplicates: true,
        });
    }

    async findByUserAndType(
        userId: string,
        type: TransactionType,
    ): Promise<Category[]> {
        return this.prisma.category.findMany({
            where: { userId, type, isActive: true },
            orderBy: { sortOrder: 'asc' },
        });
    }

    async findById(id: string, userId: string): Promise<Category | null> {
        return this.prisma.category.findFirst({
            where: { id, userId, isActive: true },
        });
    }
}
