/**
 * suggest-selectors.ts
 *
 * AI Workflow Script: Scan test files for fragile selectors (CSS classes, XPath,
 * IDs) and output an advisory Markdown report with suggested Playwright
 * accessibility-first alternatives.
 *
 * Usage:
 *   npx ts-node ai-workflows/scripts/suggest-selectors.ts
 *   npx ts-node ai-workflows/scripts/suggest-selectors.ts --dir tests/ui
 *
 * GUARDRAIL: This script never modifies files. Output is advisory only.
 */

import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.resolve('./ai-workflows/output');

interface FragileSelector {
  file: string;
  line: number;
  selector: string;
  type: 'css-class' | 'id' | 'xpath' | 'nth-child' | 'data-test';
}

// Patterns that indicate fragile selectors
const FRAGILE_PATTERNS: Array<{ regex: RegExp; type: FragileSelector['type'] }> = [
  { regex: /locator\(['"`]\.[a-zA-Z][\w-]*['"`]\)/g, type: 'css-class' },
  { regex: /locator\(['"`]#[a-zA-Z][\w-]*['"`]\)/g, type: 'id' },
  { regex: /locator\(['"`]\/\/[^'"`]+['"`]\)/g, type: 'xpath' },
  { regex: /locator\(['"`][^'"`]*:nth-child[^'"`]*['"`]\)/g, type: 'nth-child' },
  { regex: /\$\('["`]\.[a-zA-Z][\w-]*["`]\)/g, type: 'css-class' },
];

function scanFile(filePath: string): FragileSelector[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const found: FragileSelector[] = [];

  lines.forEach((line, idx) => {
    for (const { regex, type } of FRAGILE_PATTERNS) {
      regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(line)) !== null) {
        found.push({
          file: filePath,
          line: idx + 1,
          selector: match[0],
          type,
        });
      }
    }
  });

  return found;
}

function scanDirectory(dir: string): FragileSelector[] {
  const results: FragileSelector[] = [];

  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanDirectory(fullPath));
    } else if (entry.isFile() && /\.(ts|js)$/.test(entry.name)) {
      results.push(...scanFile(fullPath));
    }
  }

  return results;
}

function buildReport(selectors: FragileSelector[]): string {
  if (selectors.length === 0) {
    return '# Selector Review\n\nNo fragile selectors found. Great job using accessibility-first locators!\n';
  }

  const lines: string[] = [
    '# Selector Improvement Report',
    `Generated: ${new Date().toISOString()}`,
    `Found ${selectors.length} potentially fragile selector(s).`,
    '',
    '> **GUARDRAIL**: This report is advisory. Apply suggestions manually after review.',
    '',
    '## Selectors to Review',
    '',
    '| File | Line | Type | Selector | Suggested Replacement |',
    '|------|------|------|----------|-----------------------|',
  ];

  const suggestions: Record<FragileSelector['type'], string> = {
    'css-class': '`page.getByRole(...)` or `page.getByLabel(...)`',
    'id': '`page.getByLabel(...)` or `page.getByRole(...)`',
    'xpath': '`page.getByRole(...)` — inspect ARIA tree for semantic equivalent',
    'nth-child': '`page.getByRole(...).nth(n)` or filter by visible text',
    'data-test': '`page.getByTestId(...)` — acceptable if data-testid is stable',
  };

  for (const s of selectors) {
    const relFile = path.relative(process.cwd(), s.file);
    lines.push(`| \`${relFile}\` | ${s.line} | ${s.type} | \`${s.selector}\` | ${suggestions[s.type]} |`);
  }

  lines.push('');
  lines.push('## Selector Priority Guide');
  lines.push('');
  lines.push('1. `getByRole` — ARIA role + accessible name (most resilient)');
  lines.push('2. `getByLabel` — form input ↔ label association');
  lines.push('3. `getByText` — static visible text');
  lines.push('4. `getByPlaceholder` — input placeholder (fallback for unlabelled inputs)');
  lines.push('5. `getByTestId` — explicit test hook (requires `data-testid` attribute)');
  lines.push('6. `locator(css)` — last resort; avoid class/ID selectors');

  return lines.join('\n');
}

function run(scanDir: string): void {
  console.log(`[suggest-selectors] Scanning: ${scanDir}`);
  const selectors = scanDirectory(scanDir);

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const report = buildReport(selectors);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.join(OUTPUT_DIR, `selector-report-${timestamp}.md`);
  fs.writeFileSync(outPath, report, 'utf-8');

  console.log(`[suggest-selectors] Found ${selectors.length} fragile selector(s).`);
  console.log(`[suggest-selectors] Report written to: ${outPath}`);
}

const args = process.argv.slice(2);
const dirArg = args.find(a => a.startsWith('--dir='))?.split('=')[1]
  ?? args[args.indexOf('--dir') + 1]
  ?? './tests';

run(dirArg);
