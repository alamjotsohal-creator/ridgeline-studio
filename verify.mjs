import { chromium } from 'playwright';
import fs from 'fs';
const BASE = 'https://alamjotsohal-creator.github.io/ridgeline-studio/';
const out = 'out'; fs.mkdirSync(out, { recursive: true });
const scrub = x => String(x).replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '<token>').replace(/(key|access_token|session)=[^&"'\s]+/g, '$1=<redacted>');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const report = [];
const cases = (process.env.ADDRS || '8 Burlwood Road, Brampton, ON|55 Burlwood Road, Brampton, ON').split('|');
const shot = (page, name) => page.locator('#stage').screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 82 });
const wait = (page, ms) => page.waitForTimeout(ms);
const maskImg = () => { const S = window.__ridgeline.S, d = S.dbg; if (!d) return null; const { N, cell, x0, z1, g0, M, comp, H } = d, z0 = z1 - N * cell, K = 3;
  const c = document.createElement('canvas'); c.width = c.height = N * K; const g = c.getContext('2d'); const t = document.createElement('canvas'); t.width = t.height = N; const tg = t.getContext('2d'), im = tg.createImageData(N, N);
  for (let i = 0; i < N * N; i++) { const col = i % N, r = (i / N) | 0, j = ((N - 1 - r) * N + col) * 4, h = H[i], v = h === h ? Math.max(0, Math.min(255, (h - g0) * 22)) : 30; im.data[j] = v; im.data[j + 1] = v; im.data[j + 2] = v; im.data[j + 3] = 255; if (M[i]) im.data[j + 2] = Math.min(255, v + 120); if (comp[i]) { im.data[j] = 255; im.data[j + 1] = v * .6; } }
  tg.putImageData(im, 0, 0); g.imageSmoothingEnabled = false; g.drawImage(t, 0, 0, N * K, N * K);
  const P = (x, z) => [(x - x0) / cell * K, (z - z0) / cell * K];
  if (S.fpPts) { g.strokeStyle = '#00ff66'; g.lineWidth = 2; g.beginPath(); S.fpPts.forEach((p, k) => { const q = P(p[0], p[1]); k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.closePath(); g.stroke(); }
  g.strokeStyle = '#ffd400'; g.lineWidth = 2; for (const w of S.wings) { const c2 = Math.cos(w.rot), s2 = Math.sin(w.rot); g.beginPath(); [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b], k) => { const lx = a * w.l / 2, lz = b * w.w / 2, q = P(w.cx + lx * c2 + lz * s2, w.cz - lx * s2 + lz * c2); k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.closePath(); g.stroke(); }
  return c.toDataURL('image/png'); };
for (const [i, addr] of cases.entries()) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const log = { addr, console: [], net: {} };
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) log.console.push(scrub(m.text()).slice(0, 300)); });
  page.on('pageerror', e => log.console.push('pageerror ' + scrub(e.message)));
  page.on('response', r => { const k = new URL(r.url()).host + ' ' + r.status(); log.net[k] = (log.net[k] || 0) + 1; });
  page.on('requestfailed', r => { const k = 'FAILED ' + new URL(r.url()).host + ' ' + (r.failure() || {}).errorText; log.net[k] = (log.net[k] || 0) + 1; });
  const t0 = Date.now();
  await page.goto(BASE + '?a=' + encodeURIComponent(addr) + '&debug=1&v=' + Date.now(), { timeout: 120000 });
  try { await page.waitForFunction(() => { const t = document.getElementById('toast'); return window.__ridgeline && /Loaded|satellite view|No building|No match|respond/.test(t.textContent); }, null, { timeout: 400000 }); } catch (e) { log.timeout = true; }
  log.secs = Math.round((Date.now() - t0) / 1000);
  await wait(page, 9000);
  Object.assign(log, await page.evaluate(() => { const R = window.__ridgeline, S = R.S; return { builtin: R.hasBuiltin, rc: R.rcOn(), roofMode: S.roofMode, scan: S.scan && { area: Math.round(S.scan.area), pitch: S.scan.pitch, perim: Math.round(S.scan.perim), avgL: +S.scan.avgL.toFixed(3), minY: +S.scan.minY.toFixed(2), maxY: +S.scan.maxY.toFixed(2), ang: Math.round(S.scan.ang * 180 / Math.PI) }, mode: S.mode, scanned: S.scanned, scanArea: S.scanArea, fitted: S.fitted, clip: R.clip(), label: S.label, fp: S.fp, ground: S.ground, toast: document.getElementById('toast').textContent, attrib: document.getElementById('attrib').textContent, area: document.getElementById('qArea').textContent, wings: S.wings.map(w => ({ n: w.name, l: +w.l.toFixed(1), w: +w.w.toFixed(1), h: +w.h.toFixed(2), pitch: w.pitch, style: w.style, rot: Math.round(w.rot * 180 / Math.PI), cx: +w.cx.toFixed(1), cz: +w.cz.toFixed(1) })) }; }));
  const p = 'a' + i;
  await shot(page, p + '-new-3d');
  const du = await page.evaluate(maskImg); if (du) fs.writeFileSync(`${out}/${p}-mask.png`, Buffer.from(du.split(',')[1], 'base64'));
  if (log.mode === 'g3d') {
    await page.evaluate(() => document.getElementById('beforeBtn').click()); await wait(page, 1500);
    await page.evaluate(() => window.__ridgeline.fitView('orbit')); await wait(page, 9000); await shot(page, p + '-current-3d');
    await page.evaluate(() => window.__ridgeline.fitView('top')); await wait(page, 8000); await shot(page, p + '-current-top');
    await page.evaluate(() => document.getElementById('beforeBtn').click()); await wait(page, 1500);
    await page.evaluate(() => window.__ridgeline.fitView('top')); await wait(page, 5000); await shot(page, p + '-new-top');
    await page.evaluate(() => window.__ridgeline.fitView('front')); await wait(page, 9000); await shot(page, p + '-new-front');
  }
  report.push(log); fs.writeFileSync(`${out}/report.json`, scrub(JSON.stringify(report, null, 1)));
  await ctx.close();
}
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const mp = await m.newPage();
await mp.goto(BASE + '?a=' + encodeURIComponent(cases[0]) + '&v=' + Date.now(), { timeout: 120000 });
try { await mp.waitForFunction(() => window.__ridgeline && /Loaded|satellite view|No building/.test(document.getElementById('toast').textContent), null, { timeout: 400000 }); } catch (e) {}
await mp.waitForTimeout(9000);
await mp.screenshot({ path: `${out}/mobile.jpg`, type: 'jpeg', quality: 75 });
await browser.close();
