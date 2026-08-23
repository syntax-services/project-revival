import fs from 'fs';
import path from 'path';

const srcDir = path.resolve(__dirname, '../../src');
const reportLines: string[] = [];

function scanFile(filePath: string) {
  const ext = path.extname(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  const relative = path.relative(srcDir, filePath);

  // 1. Hardcoded pixel values
  const pxRegex = /\b\d+px\b/g;
  const pxMatches = content.match(pxRegex);
  if (pxMatches) {
    reportLines.push(`📏 ${relative}: Hardcoded pixel values → ${pxMatches.join(', ')}`);
  }

  // 2. Inline style objects with numeric dimensions (e.g., { width: 100 })
  const styleObjRegex = /style={{[^}]*\b(width|height)\s*:\s*\d+[^}]*}}/g;
  const styleMatches = content.match(styleObjRegex);
  if (styleMatches) {
    reportLines.push(` ${relative}: Inline style with numeric dimensions → ${styleMatches.length} occurrences`);
  }

  // 3. Images without alt attribute (only for .tsx files)
  if (ext === '.tsx') {
    const imgAltRegex = /<img\s+[^>]*>/g;
    const imgTags = content.match(imgAltRegex) || [];
    imgTags.forEach(tag => {
      if (!/alt=/.test(tag)) {
        reportLines.push(`🖼️ ${relative}: <img> missing alt attribute → ${tag}`);
      }
    });
  }

  // 4. Buttons or links without accessible name/aria-label
  const interactiveRegex = /<(button|a)(\s+[^>]*?)?>/g;
  const interactiveMatches = [...content.matchAll(interactiveRegex)];
  interactiveMatches.forEach(match => {
    const fullTag = match[0];
    if (!/aria-label=/.test(fullTag) && !/>\s*\w+\s*</.test(fullTag)) {
      reportLines.push(`🔧 ${relative}: <${match[1]}> missing accessible name or aria-label → ${fullTag}`);
    }
  });

  // 5. window.innerWidth/innerHeight usage without guard
  const sizeUsageRegex = /window\.inner(Width|Height)/g;
  const sizeMatches = content.match(sizeUsageRegex);
  if (sizeMatches) {
    reportLines.push(`📐 ${relative}: Direct window.inner${sizeMatches[0].endsWith('Width') ? 'Width' : 'Height'} usage → consider responsive guards`);
  }
}

function walk(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      walk(fullPath);
    } else if (['.tsx', '.ts', '.js', '.jsx', '.css'].includes(path.extname(entry.name))) {
      scanFile(fullPath);
    }
  }
}

walk(srcDir);

const reportPath = path.resolve(__dirname, '../../audit-report.md');
fs.writeFileSync(reportPath, `# UI/UX Audit Report\n\n${reportLines.join('\n') || ' No issues found.'}\n`);
console.log('Audit completed. Report written to audit-report.md');
