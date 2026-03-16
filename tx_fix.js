const fs = require('fs');
let content = fs.readFileSync('src/modules/transactions/transactions.service.ts', 'utf8');
const searchStr = \    const incomeMap = new Map<string, { name: string; isSystem: boolean; total: bigint }>();
    const expenseMap = new Map<string, { name: string; isSystem: boolean; total: bigint }>();

    for (const tx of transactions) {
      const amount = tx.amountMinor;
      if (tx.type === TransactionType.INCOME) {
        totalIncome += amount;
        const existing = incomeMap.get(tx.categoryId);
        incomeMap.set(tx.categoryId, {
          name: tx.category.name,
          isSystem: tx.category.isSystem,
          total: (existing?.total ?? BigInt(0)) + amount,
        });
      } else {
        totalExpense += amount;
        const existing = expenseMap.get(tx.categoryId);
        expenseMap.set(tx.categoryId, {
          name: tx.category.name,
          isSystem: tx.category.isSystem,
          total: (existing?.total ?? BigInt(0)) + amount,
        });
      }
    }

    const toBreakdown = (
      map: Map<string, { name: string; isSystem: boolean; total: bigint }>,
    ) =>
      Array.from(map.entries())
        .map(([categoryId, v]) => ({
          categoryId,
          categoryName: v.name,
          isSystem: v.isSystem,
          total: v.total,
        }))
        .sort((a, b) => (a.total > b.total ? -1 : 1));\;

const replaceStr = \    const incomeMap = new Map<string, { name: string; isSystem: boolean; total: bigint; notes: Set<string> }>();
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
        .sort((a, b) => (a.total > b.total ? -1 : 1));\;

if(content.includes('const incomeMap = new Map')) {
    content = content.replace(searchStr, replaceStr);
    fs.writeFileSync('src/modules/transactions/transactions.service.ts', content);
    console.log('OK');
} else {
    console.log('NOT FOUND');
}
