const fs = require('fs');
const path = require('path');

const files = [
  'src/components/CardPicker/CardPickerFilters.tsx',
  'src/components/CardPicker/SearchableListPicker.tsx',
  'src/components/BinderEdit/CardSlot.tsx',
  'src/components/BinderEdit/InsertButton.tsx',
  'src/components/BinderEdit/CardPlaceholder.tsx',
  'src/components/BinderEdit/SelectedCardBar.tsx',
];

const replacements = [
  [/fontWeight: typography\.bold/g, 'fontFamily: fonts.bold'],
  [/fontWeight: typography\.semibold/g, 'fontFamily: fonts.semibold'],
  [/fontWeight: typography\.medium/g, 'fontFamily: fonts.medium'],
  [/fontWeight: typography\.regular/g, 'fontFamily: fonts.regular'],
  [/fontWeight: '700'/g, 'fontFamily: fonts.bold'],
  [/fontWeight: '600'/g, 'fontFamily: fonts.semibold'],
  [/fontWeight: '500'/g, 'fontFamily: fonts.medium'],
  [/fontWeight: 'bold'/g, 'fontFamily: fonts.bold'],
  [/fontWeight: 'bold' as const/g, 'fontFamily: fonts.bold'],
];

const themeImportRegex = /from '\.\.\/\.\.\/constants\/theme'/;
const addFontsToImport = (line) => {
  if (line.includes("from '../../constants/theme'") && !line.includes('fonts')) {
    return line.replace(
      /(\{ [^}]+ )\}/,
      (m) => m.includes('fonts') ? m : m.replace('}', ', fonts }')
    );
  }
  return line;
};

const root = path.join(__dirname, '..');
files.forEach((file) => {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) {
    console.log('Skip (not found):', file);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add fonts to theme import if missing
  if (content.includes("from '../../constants/theme'") && !content.includes('fonts')) {
    content = content.replace(
      /(\{ [^}]+ )\}/,
      (m) => {
        if (m.includes('fonts')) return m;
        return m.replace('}', ', fonts }');
      }
    );
  }
  
  replacements.forEach(([regex, replacement]) => {
    content = content.replace(regex, replacement);
  });
  
  fs.writeFileSync(filePath, content);
  console.log('Updated:', file);
});
