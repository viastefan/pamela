// Erzeugt je Seite ein Vorschaubild (1200 x 630) für Google, WhatsApp, LinkedIn und KI-Suche.
// Läuft lokal (braucht Playwright), die Bilder liegen danach in public/img/og und werden eingecheckt.
// Aufruf: node scripts/og.mjs   (vorher einmal: node build.mjs)
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUB = join(ROOT, 'public')
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const pages = []
const walk = d => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f === 'index.html') pages.push(p) } }
walk(PUB)

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const font = n => pathToFileURL(join(PUB, 'fonts', n)).href
const img = n => pathToFileURL(join(PUB, 'img', n)).href

const html = (title, kind) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:'GS';src:url('${font('GeistSerif-VF.woff2')}')}
@font-face{font-family:'G';src:url('${font('Geist-VF-latin.woff2')}');font-weight:100 900}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:#F8F6F2;font-family:'G',sans-serif;color:#33352B;position:relative;overflow:hidden}
.photo{position:absolute;right:0;top:0;width:470px;height:630px;background:url('${img('hero-1366.jpg')}') 83% 30%/auto 128% no-repeat}
.photo::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#F8F6F2 0,rgba(248,246,242,0) 22%)}
.l{position:absolute;left:70px;top:64px;display:flex;align-items:center;gap:16px;font-size:26px;font-weight:500;color:#B4500D}
.l img{width:54px;height:54px}
h1{position:absolute;left:70px;top:190px;width:640px;font-family:'GS',serif;font-weight:400;font-size:${title.length > 34 ? 62 : 74}px;line-height:1.06;letter-spacing:-.02em;color:#2B2E24}
.k{position:absolute;left:70px;bottom:62px;font-size:25px;color:#56574B}
.k b{display:inline-block;margin-right:14px;padding:9px 18px;border-radius:10px;background:#EE8640;color:#2A1708;font-weight:500;font-size:22px}
</style></head><body><div class="photo"></div>
<div class="l"><img src="${img('logo-192.webp')}">Pamela Zurbuchen</div>
<h1>${esc(title)}</h1>
<div class="k"><b>Erstgespräch kostenfrei</b>Landsberg am Lech · online · im Gehen</div>
</body></html>`

const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
mkdirSync(join(PUB, 'img', 'og'), { recursive: true })
let n = 0
for (const f of pages) {
  const s = readFileSync(f, 'utf8')
  if (/name="robots" content="noindex/.test(s)) continue
  const rel = f.slice(PUB.length + 1).replace(/\/?index\.html$/, '')
  const slug = rel === '' ? 'start' : rel.replace(/\//g, '-')
  const t = (s.match(/<title>(.*?)<\/title>/) || [])[1]
  if (!t) continue
  const title = (rel === '' ? 'Systemische Therapie in Landsberg am Lech' : t.split(' | ')[0]).replace(/&amp;/g, '&').replace(/&shy;/g, '')
  const tmp = join(PUB, '_og.html')
  writeFileSync(tmp, html(title))
  await p.goto(pathToFileURL(tmp).href, { waitUntil: 'load' })
  await p.evaluate(() => document.fonts.ready)
  await p.waitForTimeout(120)
  await p.screenshot({ path: join(PUB, 'img', 'og', slug + '.jpg'), type: 'jpeg', quality: 84 })
  n++
}
await b.close()
try { (await import('node:fs')).unlinkSync(join(PUB, '_og.html')) } catch (e) {}
console.log(n + ' Vorschaubilder in public/img/og')
