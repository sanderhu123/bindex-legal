const fs = require('fs');
const path = require('path');

const root = __dirname;
const files = [
  'src/components/CardPicker/CardPickerFilters.tsx',
  'src/components/CardPicker/SearchableListPicker.tsx',
  'src/components/BinderEdit/CardSlot.tsx',
  'src/components/BinderEdit/InsertButton.tsx',
  'src/components/BinderEdit/CardPlaceholder.tsx',
  'src/components/BinderEdit/SelectedCardBar.tsx',
];

files.forEach((relPath) => {
  const filePath = path.join(root, relPath);
  if (!fs.existsSync(filePath)) return;
  let c = fs.readFileSync(filePath, 'utf8');
  
  if (c.includes("from '../../constants/theme'") && !c.includes('fonts')) {
    c = c.replace(
      /\{ colors, spacing, typography, borderRadius \}/,
      '{ colors, spacing, typography, borderRadius, fonts }'
    );
    c = c.replace(
      /\{ colors, spacing, typography, borderRadius, shadows \}/,
      '{ colors, spacing, typography, borderRadius, shadows, fonts }'
    );
  }
  
  c = c.replace(/fontWeight: typography\.bold/g, 'fontFamily: fonts.bold');
  c = c.replace(/fontWeight: typography\.semibold/g, 'fontFamily: fonts.semibold');
  c = c.replace(/fontWeight: typography\.medium/g, 'fontFamily: fonts.medium');
  c = c.replace(/fontWeight: typography\.regular/g, 'fontFamily: fonts.regular');
  c = c.replace(/fontWeight: '700'/g, 'fontFamily: fonts.bold');
  c = c.replace(/fontWeight: '600'/g, 'fontFamily: fonts.semibold');
  c = c.replace(/fontWeight: '500'/g, 'fontFamily: fonts.medium');
  c = c.replace(/fontWeight: 'bold' as const/g, 'fontFamily: fonts.bold');
  c = c.replace(/fontWeight: 'bold'/g, 'fontFamily: fonts.bold');
  
  fs.writeFileSync(filePath, c);
  console.log('Updated:', relPath);
});
