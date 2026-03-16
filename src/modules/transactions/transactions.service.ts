import { Injectable } from '@nestjs/common';
import { Transaction } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TransactionType } from '../../common/enums/transaction-type.enum';

export interface CreateTransactionData {
  userId: string;
  categoryId: string;
  type: TransactionType;
  amountMinor: number;
  note?: string;
  occurredAt?: Date;
}

export interface BalanceSummary {
  totalIncome: bigint;
  totalExpense: bigint;
  net: bigint;
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  isSystem: boolean;
  total: bigint;
  notes: string[];
}

export interface PeriodSummary {
  totalIncome: bigint;
  totalExpense: bigint;
  net: bigint;
  incomeByCategory: CategoryBreakdown[];
  expenseByCategory: CategoryBreakdown[];
  transactions?: any[];
}

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTransactionData): Promise<Transaction> {
    return this.prisma.transaction.create({
      data: {
        userId: data.userId,
        categoryId: data.categoryId,
        type: data.type,
        amountMinor: BigInt(data.amountMinor),
        note: data.note ?? null,
        occurredAt: data.occurredAt ?? new Date(),
        source: 'manual',
      },
    });
  }

  async getLastTransactions(userId: string, limit: number = 10) {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { occurredAt: 'desc' },
      take: limit,
      include: { category: true },
    });
  }

  async deleteTransaction(txId: string, userId: string) {
    return this.prisma.transaction.deleteMany({
      where: { id: txId, userId },
    });
  }

  async deleteAllTransactions(userId: string) {
    return this.prisma.transaction.deleteMany({
      where: { userId },
    });
  }

  async getTransactionById(txId: string, userId: string) {
    return this.prisma.transaction.findFirst({
      where: { id: txId, userId },
      include: { category: true },
    });
  }

  async getAllTimeBalance(userId: string): Promise<BalanceSummary> {
    const result = await this.prisma.transaction.groupBy({
      by: ['type'],
      where: { userId },
      _sum: { amountMinor: true },
    });

    let totalIncome = BigInt(0);
    let totalExpense = BigInt(0);

    for (const row of result) {
      const sum = row._sum.amountMinor ?? BigInt(0);
      if (row.type === TransactionType.INCOME) totalIncome = sum;
      else if (row.type === TransactionType.EXPENSE) totalExpense = sum;
    }

    return { totalIncome, totalExpense, net: totalIncome - totalExpense };
  }

  async getSummaryForPeriod(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<PeriodSummary> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        occurredAt: { gte: from, lte: to },
      },
      include: { category: true },
      orderBy: { occurredAt: 'desc' },
    });

    let totalIncome = BigInt(0);
    let totalExpense = BigInt(0);

    const incomeMap = new Map<string, { name: string; isSystem: boolean; total: bigint; notes: Set<string> }>();
    const expenseMap = new Map<string, { name: string; isSystem: boolean; total: bigint; notes: Set<string> }>();

    for (const tx of transactions) {
      const amount = tx.amountMinor;
      if (tx.type === TransactionType.INCOME) {
        totalIncome += amount;
        const existing = incomeMap.get(tx.categoryId) ?? {
          name: tx.category.name,
          isSystem: tx.category.isSystem,
          total: BigInt(0),
          notes: new Set<string>(),
        };
        existing.total += amount;
        if (tx.note) existing.notes.add(tx.note);
        incomeMap.set(tx.categoryId, existing);
      } else {
        totalExpense += amount;
        const existing = expenseMap.get(tx.categoryId) ?? {
          name: tx.category.name,
          isSystem: tx.category.isSystem,
          total: BigInt(0),
          notes: new Set<string>(),
        };
        existing.total += amount;
        if (tx.note) existing.notes.add(tx.note);
        expenseMap.set(tx.categoryId, existing);
      }
    }

    const toBreakdown = (
      map: Map<string, { name: string; isSystem: boolean; total: bigint; notes: Set<string> }>,
    ) =>
      Array.from(map.entries())
        .map(([categoryId, v]) => ({
          categoryId,
          categoryName: v.name,
          isSystem: v.isSystem,
          total: v.total,
          notes: Array.from(v.notes),
        }))
        .sort((a, b) => (a.total > b.total ? -1 : 1));

    return {
      totalIncome,
      totalExpense,
      net: totalIncome - totalExpense,
      incomeByCategory: toBreakdown(incomeMap),
      expenseByCategory: toBreakdown(expenseMap),
      transactions,
    };
  }
}
