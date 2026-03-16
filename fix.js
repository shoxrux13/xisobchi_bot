const fs = require('fs');
const files = ['src/telegram/scenes/income.scene.ts', 'src/telegram/scenes/expense.scene.ts', 'src/telegram/scenes/report-month.scene.ts'];
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/import \{ Injectable \} from '@nestjs\/common';/, 'import { Injectable, Inject, forwardRef } from \'@nestjs/common\';\nimport { TelegramUpdate } from \'../telegram.update\';\nimport { ALL_MENU_KEYS } from \'../../common/constants/menu.constants\';');
  
  if (!content.includes('telegramUpdate: TelegramUpdate')) {
    content = content.replace(/\) \{\}/, ', @Inject(forwardRef(() => TelegramUpdate)) private readonly telegramUpdate: TelegramUpdate) {}');
  }
  
  const regex = /\/\/ Commands:[\s\S]*?return;\s*\}/;
  content = content.replace(regex, '// Commands or Menu Buttons Interceptor\n    const isCommand = text.startsWith(\\'/\\');\n    const tBtn = (key: string) => this.i18n.translate(common.buttons., { lang }) as string;\n    const isMenuButton = ALL_MENU_KEYS.map(tBtn).includes(text);\n\n    if (isCommand || isMenuButton) {\n      if (text === \\'/cancel\\' || text === tBtn(\\'cancel\\')) {\n        await ctx.scene.leave();\n        await ctx.reply(this.t(lang, \\'cancel_success\\'), { parse_mode: \\'HTML\\' });\n      } else if (isMenuButton) {\n        await ctx.scene.leave();\n        await this.telegramUpdate.onText(ctx as any);\n      } else {\n        if (text === \\'/income\\') { await ctx.scene.enter(\\'income\\'); return; }\n        if (text === \\'/expense\\') { await ctx.scene.enter(\\'expense\\'); return; }\n        if (text === \\'/report_month\\') { await ctx.scene.enter(\\'report_month\\'); return; }\n        if (text === \\'/settings\\') { await ctx.scene.enter(\\'settings\\'); return; }\n        await ctx.scene.leave();\n      }\n      return;\n    }');
  fs.writeFileSync(file, content);
  console.log('Fixed ' + file);
}
