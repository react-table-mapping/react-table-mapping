import { chromium } from 'playwright';

const BASE = process.env.DOCS_URL ?? 'http://localhost:3100/react-table-mapping';
const DOCS = ['getting-started', 'guide/state', 'guide/mappings', 'guide/rows', 'guide/keyboard', 'guide/styling',
  'guide/headless', 'api/table-mapping', 'api/ref', 'api/headless', 'api/types', 'changelog'];
const paths = ['/', ...DOCS.map((d) => `/docs/${d}`)].flatMap((p) => [p, p === '/' ? '/ko/' : `/ko${p}`]);

const browser = await chromium.launch();
let failed = 0;
for (const path of paths) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const res = await page.goto(BASE + path, { waitUntil: 'networkidle' });
  const demos = await page.locator('.rtm-demo').count();
  if (demos) {
    await page.waitForFunction((n) => document.querySelectorAll('.rtm-demo[data-demo-ready]').length === n, demos, { timeout: 10000 })
      .catch(() => errors.push('demo did not mount'));
  }
  const ok = res?.ok() && errors.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${path} demos=${demos}${errors.length ? ' ' + errors.join(' | ') : ''}`);
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
