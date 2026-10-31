// Vérifie que tous les fichiers .js/.jsx se compilent (syntaxe JSX incluse). Usage : npm run check:syntax
const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

function walk(dir, files = []) {
  for (const f of fs.readdirSync(dir)) {
    if (f === 'node_modules' || f.startsWith('.')) continue;
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full, files);
    else if (/\.(js|jsx)$/.test(f)) files.push(full);
  }
  return files;
}

let erreurs = 0;
for (const file of walk('.')) {
  try {
    babel.transformFileSync(file, { presets: ['babel-preset-expo'], configFile: false, babelrc: false });
  } catch (e) {
    erreurs += 1;
    console.error(`✗ ${file}\n  ${e.message.split('\n')[0]}`);
  }
}
if (erreurs > 0) { console.error(`\n${erreurs} fichier(s) en erreur.`); process.exit(1); }
console.log('Syntaxe OK');
