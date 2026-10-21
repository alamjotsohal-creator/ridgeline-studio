import { chromium } from 'playwright';
import fs from 'fs';
const BASE = 'https://alamjotsohal-creator.github.io/ridgeline-studio/';
const out = 'out'; fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const report = [];
const cases = (process.env.ADDRS || '8 Burlwood Road, Brampton, ON|55 Burlwood Road, Brampton, ON').split('|');
for (const [i, addr] of cases.entries()) {
  const slug = 'a' + i;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const log = { addr, console: [], net: {} };
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) log.console.push(m.text().slice(0, 300)); });
  page.on('pageerror', e => log.console.push('pageerror ' + e.message));
  page.on('response', r => { const u = r.url(); const k = new URL(u).host + ' ' + r.status(); log.net[k] = (log.net[k] || 0) + 1; if (u.includes('World_Imagery') && !log.tileCors) log.tileCors = r.headers()['access-control-allow-origin'] || 'none'; if (u.includes('geocode.arcgis') || u.includes('nominatim') || u.includes('overpass')) r.text().then(t => { (log.bodies = log.bodies || {})[new URL(u).host] = t.slice(0, 1500); }).catch(() => {}); });
  page.on('requestfailed', r => { const k = 'FAILED ' + new URL(r.url()).host + ' ' + (r.failure() || {}).errorText; log.net[k] = (log.net[k] || 0) + 1; });
  const t0 = Date.now();
  await page.goto(BASE + '?a=' + encodeURIComponent(addr) + '&v=' + Date.now(), { timeout: 120000 });
  try {
    await page.waitForFunction(() => { const t = document.getElementById('toast'); return window.__ridgeline && (window.__ridgeline.S.label || (!t.hidden && /No match|respond/.test(t.textContent))); }, null, { timeout: 180000 });
  } catch (e) { log.timeout = true; }
  log.secs = Math.round((Date.now() - t0) / 1000);
  await page.waitForTimeout(5000);
  Object.assign(log, await page.evaluate(() => { const S = window.__ridgeline.S; return { label: S.label, src: S.geoSrc, fp: S.fp, fpSrc: S.fpSrc, hiRes: S.hiRes, ground: S.ground, toast: document.getElementById('toast').textContent, area: document.getElementById('qArea').textContent, wings: S.wings.map(w => ({ n: w.name, l: +w.l.toFixed(1), w: +w.w.toFixed(1), h: w.h, style: w.style, rot: Math.round(w.rot * 180 / Math.PI), cx: +w.cx.toFixed(1), cz: +w.cz.toFixed(1) })) }; }));
  const stage = page.locator('#stage');
  await stage.screenshot({ path: `${out}/${slug}-3d.jpg`, type: 'jpeg', quality: 80 });
  await page.click('[data-view="top"]'); await page.waitForTimeout(3000);
  await stage.screenshot({ path: `${out}/${slug}-top.jpg`, type: 'jpeg', quality: 80 });
  if (await page.locator('#beforeBtn').isVisible()) { await page.click('#beforeBtn'); await page.waitForTimeout(3000); await stage.screenshot({ path: `${out}/${slug}-current.jpg`, type: 'jpeg', quality: 80 }); }
  report.push(log); fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
  await ctx.close();
}
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const mp = await m.newPage();
await mp.goto(BASE + '?a=' + encodeURIComponent(cases[0]), { timeout: 120000 });
try { await mp.waitForFunction(() => window.__ridgeline && window.__ridgeline.S.label, null, { timeout: 180000 }); } catch (e) {}
await mp.waitForTimeout(5000);
await mp.screenshot({ path: `${out}/mobile.jpg`, type: 'jpeg', quality: 75 });
await browser.close();
