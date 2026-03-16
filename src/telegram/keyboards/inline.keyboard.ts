import { Category } from '@prisma/client';
import { I18nService } from 'nestjs-i18n';
import { LANGUAGE_LABELS, Language } from '../../common/enums/language.enum';

type InlineButton = { text: string; callback_data: string };
type InlineKeyboard = { inline_keyboard: InlineButton[][] };

export function categoryKeyboard(
  categories: Category[],
  lang: string,
  i18n: I18nService,
  cancelLabel: string,
): InlineKeyboard {
  const rows: InlineButton[][] = [];

  // 2 buttons per row
  for (let i = 0; i < categories.length; i += 2) {
    const row: InlineButton[] = [];
    for (let j = i; j < Math.min(i + 2, categories.length); j++) {
      const cat = categories[j];
      const label = cat.isSystem
        ? (i18n.translate(`common.categories.names.${cat.name}`, { lang }) as string)
        : cat.name;
      row.push({ text: label, callback_data: `cat:${cat.id}:${label}` });
    }
    rows.push(row);
  }

  rows.push([{ text: cancelLabel, callback_data: 'cancel' }]);
  return { inline_keyboard: rows };
}

export function settingsKeyboard(lang: string, i18n: I18nService): InlineKeyboard {
  return {
    inline_keyboard: [
      [
        {
          text: i18n.translate('common.buttons.change_language', { lang }) as string,
          callback_data: 'settings:language',
        },
        {
          text: i18n.translate('common.buttons.change_currency', { lang }) as string,
          callback_data: 'settings:currency',
        },
      ],
      [
        {
          text: i18n.translate('common.buttons.change_timezone', { lang }) as string,
          callback_data: 'settings:timezone',
        },
        {
          text: i18n.translate('common.buttons.change_format', { lang }) as string,
          callback_data: 'settings:format',
        },
      ],
    ],
  };
}

export function languageKeyboard(): InlineKeyboard {
  return {
    inline_keyboard: [
      Object.entries(LANGUAGE_LABELS).map(([code, label]) => ({
        text: label,
        callback_data: `lang:${code}`,
      })),
    ],
  };
}

export function currencyKeyboard(): InlineKeyboard {
  const currencies = ['UZS', 'USD', 'EUR', 'RUB'];
  return {
    inline_keyboard: [
      currencies.map((c) => ({ text: c, callback_data: `curr:${c}` })),
    ],
  };
}

export function formatKeyboard(): InlineKeyboard {
  return {
    inline_keyboard: [
      [
        { text: '📄 PDF', callback_data: 'format:pdf' },
        { text: '📊 Excel', callback_data: 'format:excel' },
      ],
    ],
  };
}

type ReplyKeyboard = {
  keyboard: { text: string }[][];
  resize_keyboard: true;
  one_time_keyboard: false;
};

/** Quick-pick amount keyboard shown when entering income/expense. */
export function quickAmountKeyboard(cancelLabel: string): {
  keyboard: { text: string }[][];
  resize_keyboard: true;
  one_time_keyboard: true;
} {
  const amounts = [
    ['10 000', '50 000'],
    ['100 000', '200 000'],
    ['500 000', '1 000 000'],
    ['2 000 000', '5 000 000'],
    [cancelLabel],
  ];
  return {
    keyboard: amounts.map((row) => row.map((text) => ({ text }))),
    resize_keyboard: true,
    one_time_keyboard: true,
  };
}

/** Persistent bottom keyboard shown after every completed action. */
export function mainMenuKeyboard(lang: string, i18n: I18nService): ReplyKeyboard {
  const t = (key: string) => i18n.translate(`common.buttons.${key}`, { lang }) as string;
  return {
    keyboard: [
      [{ text: t('menu_income') }, { text: t('menu_expense') }],
      [{ text: t('menu_balance') }, { text: t('menu_report_short') }],
      [{ text: t('menu_categories') }, { text: t('menu_settings') }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

export function reportPeriodKeyboard(lang: string, i18n: I18nService): InlineKeyboard {
  const t = (key: string) => i18n.translate(`common.buttons.${key}`, { lang }) as string;
  return {
    inline_keyboard: [
      [
        { text: t('report_today'), callback_data: 'report:today' },
        { text: t('report_yesterday'), callback_data: 'report:yesterday' }
      ],
      [
        { text: t('report_week'), callback_data: 'report:week' },
        { text: t('report_month'), callback_data: 'report:month' }
      ],
      [
        { text: t('report_custom_month'), callback_data: 'report:custom_month' }
      ]
    ]
  };
}
