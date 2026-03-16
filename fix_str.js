const fs = require('fs');
let C = fs.readFileSync('src/telegram/scenes/report-month.scene.ts', 'utf8');
C = C.replace(/let notesStr = [^;]+;/g, "let notesStr = cat.notes && cat.notes.length > 0 ? ' (' + cat.notes.join(', ') + ')' : '';");
fs.writeFileSync('src/telegram/scenes/report-month.scene.ts', C);
