const fs = require('fs');
let content = fs.readFileSync('src/telegram/scenes/report-month.scene.ts', 'utf8');

const searchStr1 = \  if (summary.expenseByCategory.length > 0) {
    msg += t('report.by_expense_category');
    for (const cat of summary.expenseByCategory) {
      const name = cat.isSystem
        ? (i18n.translate(\\\common.categories.names.\\\\\\, { lang }) as string)
        : cat.categoryName;
      msg += t('report.category_row', {
        name,
        amount: formatAmount(cat.total),
        currency,
      });
    }
  }\;

const replaceStr1 = \  if (summary.expenseByCategory.length > 0) {
    msg += t('report.by_expense_category');
    for (const cat of summary.expenseByCategory) {
      const name = cat.isSystem
        ? (i18n.translate(\\\common.categories.names.\\\\\\, { lang }) as string)
        : cat.categoryName;
      let notesStr = cat.notes && cat.notes.length > 0 ? \\\ (\\\)\\\ : '';
      msg += t('report.category_row', {
        name: name + notesStr,
        amount: formatAmount(cat.total),
        currency,
      });
    }
  }\;

const searchStr2 = \  if (summary.incomeByCategory.length > 0) {
    msg += t('report.by_income_category');
    for (const cat of summary.incomeByCategory) {
      const name = cat.isSystem
        ? (i18n.translate(\\\common.categories.names.\\\\\\, { lang }) as string)
        : cat.categoryName;
      msg += t('report.category_row', {
        name,
        amount: formatAmount(cat.total),
        currency,
      });
    }
  }\;

const replaceStr2 = \  if (summary.incomeByCategory.length > 0) {
    msg += t('report.by_income_category');
    for (const cat of summary.incomeByCategory) {
      const name = cat.isSystem
        ? (i18n.translate(\\\common.categories.names.\\\\\\, { lang }) as string)
        : cat.categoryName;
      let notesStr = cat.notes && cat.notes.length > 0 ? \\\ (\\\)\\\ : '';
      msg += t('report.category_row', {
        name: name + notesStr,
        amount: formatAmount(cat.total),
        currency,
      });
    }
  }\;

content = content.replace(searchStr1, replaceStr1);
content = content.replace(searchStr2, replaceStr2);

fs.writeFileSync('src/telegram/scenes/report-month.scene.ts', content);
console.log('OK');
