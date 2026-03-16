const fs = require('fs');
const files = ['src/telegram/scenes/income.scene.ts', 'src/telegram/scenes/expense.scene.ts', 'src/telegram/scenes/report-month.scene.ts', 'src/telegram/scenes/settings.scene.ts'];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/const isMenuButton = ALL_MENU_KEYS\.map\(tBtn\)\.includes\(text\);/g, "const isMenuButton = ALL_MENU_KEYS.map(tBtn).some(b => b.trim() === text);");
  content = content.replace(/if \(text === '\/cancel' \|\| text === tBtn\('cancel'\)\)/g, "if (text === '/cancel' || text === tBtn('cancel').trim())");
  fs.writeFileSync(file, content);
}
console.log('Fixed scenes');
