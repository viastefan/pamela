// Baut die statische Seite nach ./public — `node build.mjs`. Keine Abhängigkeiten.
// Texte: von www.zurbuchen-therapie.de (Stand 18.11.2026) und aus Pamela Zurbuchens Entwurf. Fließtexte liegen in ./content/*.md.
// Nichts erfunden: keine Zahlen, Stimmen oder Bilder, die nicht vorlagen.
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const OUT = join(ROOT, 'public')
const ORIGIN = 'https://www.zurbuchen-therapie.de'

const P = {
  name: 'Pamela Zurbuchen',
  practice: 'ZeitRaum',
  street: 'Weilheimer Str. 9',
  zip: '86899',
  city: 'Landsberg am Lech',
  phone: '0176-43 45 22 86',
  tel: '+4917643452286',
  mail: 'zurbuchen-therapie@gmx.de',
  areas: ['Landsberg am Lech', 'Kaufering', 'Buchloe', 'Dießen am Ammersee', 'Weilheim', 'Bad Wörishofen', 'Türkheim', 'Mindelheim'],
}
const ADDRESS = `${P.practice}, ${P.street}, ${P.zip} ${P.city}`
const GMAPS = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(`${P.practice}, ${P.street}, ${P.zip} ${P.city}`)
// Standort-Karte: lädt erst nach einem Klick, vorher geht keine Anfrage an Google.
const MAPS_Q = encodeURIComponent(`${P.practice} ${P.name}, ${P.street}, ${P.zip} ${P.city}`)
const MAPS_ROUTE = 'https://www.google.com/maps/dir/?api=1&destination=' + MAPS_Q
const MAPS_EMBED = 'https://www.google.com/maps?q=' + MAPS_Q + '&hl=de&z=16&output=embed'
const PIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.500s7-6 7-11.500a7 7 0 0 0-14 0c0 5.500 7 11.500 7 11.500z"/><circle cx="12" cy="10" r="2.600"/></svg>'
const MAPS = 'https://www.openstreetmap.org/search?query=' + encodeURIComponent(`${P.street}, ${P.zip} ${P.city}`)
const NAV = [['/angebot/', 'Angebot'], ['/ueber-mich/', 'Über mich'], ['/kurse/', 'Kurse'], ['/preise/', 'Preise'], ['/blog/', 'Blog'], ['/kontakt/', 'Kontakt']]


// ── Kleine Auszeichnung für ./content: Absätze, ## und ###, Listen mit "- ", Zitat mit "> ", **fett**, *kursiv*, [Text](Ziel)
const glass = t => t.split(' ').map((w, i) => `<span class="gw" style="--i:${i}">${w}</span>`).join(' ')
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
const inline = s => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/\*(.+?)\*/g, '<em>$1</em>')
  .replace(/\[(.+?)\]\((.+?)\)/g, '<a class="link" href="$2">$1</a>')
const anchor = t => t.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const toc = (text, extra = '') => `<aside class="toc rv"><nav aria-label="Auf dieser Seite"><ul>${[...text.matchAll(/^## (.+)$/gm)].map(m => `<li><a href="#${anchor(m[1])}">${inline(m[1])}</a></li>`).join('')}</ul></nav>${extra}</aside>`
const minutes = text => Math.max(1, Math.round(text.split(/\s+/).length / 200))
const md = text => text.trim().split(/\n{2,}/).map(block => {
  const lines = block.split('\n')
  if (block.startsWith('### ')) return `<h3 class="rv">${inline(block.slice(4))}</h3>`
  if (block.startsWith('## ')) return `<h2 class="rv" id="${anchor(block.slice(3))}">${inline(block.slice(3))}</h2>`
  if (block.startsWith('> ')) return `<blockquote class="quote rv">${inline(block.slice(2))}</blockquote>`
  if (lines.every(l => l.startsWith('- '))) {
    return `<ul class="list rv">${lines.map(l => `<li>${inline(l.slice(2))}</li>`).join('')}</ul>`
  }
  return `<p class="rv">${lines.map(inline).join('<br>')}</p>`
}).join('\n')

const docs = readdirSync(join(ROOT, 'content')).filter(f => f.endsWith('.md')).map(f => {
  const [, head, body] = readFileSync(join(ROOT, 'content', f), 'utf8').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  const d = Object.fromEntries(head.split('\n').map(l => [l.slice(0, l.indexOf(':')), l.slice(l.indexOf(':') + 1).trim()]))
  return { ...d, body }
})
const SERVICE_ORDER = ['/einzeltherapie/', '/paartherapie/', '/jugendcoaching/', '/erziehungsberatung/', '/kommunikationstraining/', '/vortraege-und-schulungen/', '/walk-and-talk/']
const services = SERVICE_ORDER.map(p => docs.find(d => d.path === p))
const posts = docs.filter(d => d.type === 'post').sort((a, b) => b.path.localeCompare(a.path))
const slug = p => p.replace(/\//g, '')

// ── Bausteine
const ld = o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`
const picture = (name, [big, small], alt, w, h, attrs = 'loading="lazy" decoding="async"') =>
  `<picture><source type="image/webp" srcset="/img/${name}-${small}.webp ${small}w, /img/${name}-${big}.webp ${big}w" sizes="(max-width: 960px) 74vw, 440px"><img src="/img/${name}-${big}.jpg" srcset="/img/${name}-${small}.jpg ${small}w, /img/${name}-${big}.jpg ${big}w" sizes="(max-width: 960px) 74vw, 440px" width="${w}" height="${h}" alt="${esc(alt)}" ${attrs}></picture>`
const portrait = (name, sizes, alt, w, h, caption = '') => `<figure class="portrait rv"><div class="tilt"><div class="frame">${picture(name, sizes, alt, w, h, 'fetchpriority="high" decoding="async"')}</div></div>${caption && `<figcaption><b>${caption.split('|')[0]}</b><span>${caption.split('|')[1]}</span></figcaption>`}</figure>`
const mark = `<img class="mark" src="/img/logo-512.webp?v=4" width="512" height="512" alt="" loading="lazy" decoding="async">`
const nameOf = d => d.name.replace('Kommunikationstraining', 'Kommunikations&shy;training').replace('Erziehungsberatung', 'Erziehungs&shy;beratung')
const card = (d, i = 0, goWord = 'Mehr erfahren') => `<a class="card rv" style="--d:${i * 60}ms" href="${d.path}"><h3>${nameOf(d)}</h3><p>${inline(d.card || d.teaser)}</p><span class="go">${goWord}</span></a>`
const book = (thema, cls = 'primary', label = 'Termin anfragen') => `<a class="btn ${cls}" href="/termin/${thema ? '?thema=' + thema : ''}">${label}</a>`

const PRICES = [['Erstgespräch', 'kostenfrei', 'ca. 30 Minuten, zum gegenseitigen Kennenlernen'], ['Einzelsitzung', '100 €', '60 Minuten'], ['Paargespräch', '180 €', '90 Minuten'], ['Jugendcoaching', '100 €', '60 Minuten'], ['Erziehungsberatung', '100 €', '60 Minuten'], ['Onlineberatung', '100 €', '60 Minuten']]
const place = `<a class="place" href="${GMAPS}" target="_blank" rel="noopener"><span class="place-pin" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M10 17.500s5.500-4.700 5.500-9.200a5.500 5.500 0 0 0-11 0c0 4.500 5.500 9.200 5.500 9.200z"/><circle cx="10" cy="8.300" r="2"/></svg></span><span class="place-text"><b>${P.practice}</b><span>${P.street}, ${P.zip} ${P.city}</span></span><span class="place-go">In Google Maps öffnen</span></a>`
const prices = (n = PRICES.length) => `<div class="fees rv">${PRICES.slice(0, n).map(([t, p, s]) => `<div class="fee"><span class="fee-name">${t}</span><span class="fee-note">${s}</span><b class="fee-price">${p}</b></div>`).join('')}</div>`

const cta = (du, title, text, thema) => `
<section class="cta-wrap"><div class="cta rv">
  ${mark}
  <h2>${title || 'Der erste Schritt ist ein Gespräch.'}</h2>
  <p>${text || (du ? 'Das Erstgespräch ist kostenfrei und dauert etwa 30 Minuten. Du oder Deine Eltern können mir schreiben oder mich anrufen.' : 'Das Erstgespräch ist kostenfrei und dauert etwa 30 Minuten.')}</p>
  <div class="actions">${book(thema, 'gold')}<a class="btn on-deep" href="tel:${P.tel}">${P.phone}</a><a class="btn on-deep" href="mailto:${P.mail}">E-Mail schreiben</a></div>
</div></section>`

const steps = du => `<div class="steps-wrap rv" data-steps><span class="steps-line" aria-hidden="true"><i></i></span><ol class="steps">
    <li><h3>Erstgespräch</h3><p>Kostenfrei, etwa 30 Minuten. ${du ? 'Du erzählst, was Dich gerade bewegt und was sich verändern soll.' : 'Sie schildern, was Sie zurzeit bewegt und was sich verändern soll.'}</p></li>
    <li><h3>Passt es?</h3><p>Gemeinsam klären wir, ob meine Begleitung zu ${du ? 'Deinem' : 'Ihrem'} Anliegen passt.</p></li>
    <li><h3>${du ? 'Dein' : 'Ihr'} Rhythmus</h3><p>${du ? 'Du wählst' : 'Sie wählen'} die Abstände der Sitzungen. Meist genügen wenige Termine.</p></li>
  </ol></div>`

const G = '<svg class="g" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.500c3.540 0 6.710 1.220 9.210 3.600l6.850-6.850C35.900 2.380 30.470 0 24 0 14.620 0 6.510 5.380 2.560 13.220l7.980 6.190C12.430 13.720 17.740 9.500 24 9.500z"/><path fill="#4285F4" d="M46.980 24.550c0-1.570-.15-3.090-.38-4.550H24v9.020h12.940c-.58 2.960-2.260 5.480-4.780 7.180l7.730 6c4.510-4.180 7.090-10.360 7.090-17.650z"/><path fill="#FBBC05" d="M10.530 28.590c-.48-1.450-.76-2.990-.76-4.590s.27-3.140.76-4.590l-7.980-6.190C.92 16.460 0 20.120 0 24c0 3.880.92 7.540 2.560 10.780l7.970-6.190z"/><path fill="#34A853" d="M24 48c6.480 0 11.930-2.130 15.890-5.810l-7.730-6c-2.150 1.450-4.920 2.300-8.160 2.300-6.260 0-11.570-4.220-13.470-9.910l-7.980 6.190C6.510 42.620 14.620 48 24 48z"/></svg>'
const STARS = '<span class="stars" role="img" aria-label="5 von 5 Sternen"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.600l2.600 5.300 5.800.8-4.200 4.100 1 5.800L10 14.900l-5.200 2.700 1-5.800L1.600 7.700l5.800-.8z"/></svg><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.600l2.600 5.300 5.800.8-4.200 4.100 1 5.800L10 14.900l-5.200 2.700 1-5.800L1.600 7.700l5.800-.8z"/></svg><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.600l2.600 5.300 5.800.8-4.200 4.100 1 5.800L10 14.900l-5.200 2.700 1-5.800L1.600 7.700l5.800-.8z"/></svg><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.600l2.600 5.300 5.800.8-4.200 4.100 1 5.800L10 14.900l-5.200 2.700 1-5.800L1.600 7.700l5.800-.8z"/></svg><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.600l2.600 5.300 5.800.8-4.200 4.100 1 5.800L10 14.900l-5.200 2.700 1-5.800L1.600 7.700l5.800-.8z"/></svg></span>'
// Drei kleine Zeichnungen, die sich bewegen: Raum, Gehen, Bildschirm
// Zeichnungen: Linien mit Klasse d zeichnen sich beim Erscheinen selbst, f blendet ein, der Rest läuft als ruhige Schleife
const ART_RAW = {
  praxis: `<svg class="art art-praxis" viewBox="0 0 240 150" aria-hidden="true"><defs><clipPath id="zw-win"><rect x="75" y="15" width="42" height="38" rx="4"/></clipPath></defs>
<ellipse class="rug f" style="--i:1" cx="96" cy="125" rx="82" ry="4.500"/>
<g class="lampon"><path class="cone" d="M181 52h18l20 72h-58z"/></g>
<g class="soft"><rect class="pane f" style="--i:4" x="74" y="14" width="44" height="40" rx="5"/><g clip-path="url(#zw-win)"><g class="cloud cw"><path d="M2 10h24a5 5 0 0 0 0-10 8 8 0 0 0-15-2 5.500 5.500 0 0 0-9 4.500A4 4 0 0 0 2 10z" transform="translate(-8 24) scale(.7)"/></g></g><rect class="d" style="--i:4" x="74" y="14" width="44" height="40" rx="5"/><path class="d" style="--i:5" d="M96 14v40M74 34h44"/></g>
<path class="ground d" style="--i:0" d="M10 124h220"/>
<path class="d" style="--i:1" d="M26 116V93a12 12 0 0 1 12-12h26a12 12 0 0 1 12 12v23"/><path class="seat d" style="--i:2" d="M20 105a4 4 0 0 1 4-4h54a4 4 0 0 1 4 4v11H20z"/><path class="d" style="--i:2" d="M25 116v8M77 116v8"/>
<path class="d" style="--i:3" d="M124 116V95a10 10 0 0 1 10-10h22a10 10 0 0 1 10 10v21"/><path class="seat d" style="--i:3" d="M119 106a4 4 0 0 1 4-4h44a4 4 0 0 1 4 4v10h-52z"/><path class="d" style="--i:3" d="M124 116v8M166 116v8"/>
<g class="thin"><path class="d" style="--i:6" d="M91 104h18M100 104v20"/><path class="d" style="--i:7" d="M96 104v-6h8v6M104 99.500h2.500v3H104"/><path class="steam" d="M98 94c-2.500-3 2.500-5 0-8.500"/><path class="steam s2" d="M102.500 94c-2.500-3 2.500-5 0-8.500"/></g>
<path class="d" style="--i:4" d="M190 124V52M182 124h16"/><path class="shade d" style="--i:5" d="M178 52h24l-6-20h-12z"/><ellipse class="bulb" cx="190" cy="53" rx="9" ry="2.600"/><g class="pull"><path class="cord" d="M197.500 52v11"/><circle class="knob" cx="197.500" cy="64.500" r="1.900"/></g>
<circle class="mote" cx="186" cy="98" r="1.100"/><circle class="mote m2" cx="195" cy="106" r=".9"/><circle class="mote m3" cx="182" cy="112" r="1"/>
<path class="pot d" style="--i:6" d="M208 124l-2-11h18l-2 11z"/><g class="leaf" style="transform-origin:215px 113px"><path class="d" style="--i:7" d="M215 113c0-10 4-17 11-20-1 9-4 16-11 20"/></g><g class="leaf l2" style="transform-origin:215px 113px"><path class="d" style="--i:8" d="M215 113c-1-8-5-14-12-15 1 8 5 13 12 15"/></g></svg>`,
  walk: `<svg class="art art-walk" viewBox="0 0 240 150" aria-hidden="true">
<g class="f" style="--i:2"><g class="sunwrap"><circle class="halo" cx="196" cy="38" r="19"/><circle class="sun" cx="196" cy="38" r="11"/></g></g>
<g class="f soft" style="--i:4"><g class="cloud c1"><path d="M2 10h24a5 5 0 0 0 0-10 8 8 0 0 0-15-2 5.500 5.500 0 0 0-9 4.500A4 4 0 0 0 2 10z" transform="translate(0 12)"/></g><g class="cloud c2"><path d="M2 10h24a5 5 0 0 0 0-10 8 8 0 0 0-15-2 5.500 5.500 0 0 0-9 4.500A4 4 0 0 0 2 10z" transform="translate(0 30) scale(.7)"/></g></g>
<g class="hills"><path class="hillfill" d="M-240 106c40-22 80-22 120 0s80 22 120 0 80-22 120 0 80 22 120 0 80-22 120 0 80 22 120 0V150h-720z"/><path class="hill d" style="--i:0" d="M-240 106c40-22 80-22 120 0s80 22 120 0 80-22 120 0 80 22 120 0 80-22 120 0 80 22 120 0"/></g>
<g class="f" style="--i:3"><g class="pass"><g class="tree"><path d="M40 131v-28"/><path class="crown" d="M40 106c-11 0-17-8-17-17s7-18 17-18 17 9 17 18-6 17-17 17z"/></g></g><g class="pass p2"><g class="tree"><path d="M40 131v-20"/><path class="crown" d="M40 113c-8 0-12-6-12-12s5-13 12-13 12 7 12 13-4 12-12 12z"/></g></g></g>
<g class="f" style="--i:1"><path class="ground run" d="M-40 132h320"/></g>
<g class="enter"><g transform="translate(100 1)"><ellipse class="shadow" cx="1" cy="131" rx="11" ry="1.800"/><g class="walker"><path class="arm a" d="M0 73l-2 12 3 9"/><g class="leg a"><path d="M0 100v15"/><g class="shin"><path d="M0 115v15h5"/></g></g><g class="leg b"><path d="M0 100v15"/><g class="shin"><path d="M0 115v15h5"/></g></g><path class="coat" d="M-6 66c3-3 9-3 12 0 2 10 3 22 4 35H-10c1-13 2-25 4-35z"/><circle class="head" cx="0" cy="55" r="7.500"/><path class="arm b" d="M0 73l-2 12 3 9"/></g></g><g class="w2" transform="translate(134 5) scale(.9)"><ellipse class="shadow" cx="1" cy="131" rx="11" ry="1.800"/><g class="walker"><path class="arm a" d="M0 73l-2 12 3 9"/><g class="leg a"><path d="M0 100v15"/><g class="shin"><path d="M0 115v15h5"/></g></g><g class="leg b"><path d="M0 100v15"/><g class="shin"><path d="M0 115v15h5"/></g></g><path class="coat" d="M-6 66c3-3 9-3 12 0 2 10 3 22 4 35H-10c1-13 2-25 4-35z"/><circle class="head" cx="0" cy="55" r="7.500"/><path class="hair" d="M6 51c4 1 6.500 4 6.500 9"/><path class="arm b" d="M0 73l-2 12 3 9"/></g></g>
<g class="thin"><g class="say"><rect x="70" y="22" width="26" height="15" rx="7.500"/><path d="M88 37l2.500 4"/><circle class="dot" cx="77.500" cy="29.500" r="1.200"/><circle class="dot d2" cx="83" cy="29.500" r="1.200"/><circle class="dot d3" cx="88.500" cy="29.500" r="1.200"/></g><g class="say y2"><rect x="148" y="30" width="24" height="14" rx="7"/><path d="M154 44l-2.500 4"/><path d="M154.500 37h11"/></g></g></g></svg>`,
  online: `<svg class="art art-online" viewBox="0 0 240 150" aria-hidden="true"><defs><clipPath id="zw-scr"><rect x="53" y="25" width="134" height="84" rx="7"/></clipPath></defs>
<ellipse class="rug f" style="--i:0" cx="120" cy="125" rx="98" ry="4"/>
<rect class="screen d" style="--i:0" x="52" y="24" width="136" height="86" rx="8"/>
<g clip-path="url(#zw-scr)"><path class="glare" d="M60 14h20l-34 110H26z"/></g>
<path class="d" style="--i:1" d="M14 124h212M108 110l-3 14M132 110l3 14"/>
<g class="nod" style="transform-origin:120px 70px"><circle class="head d" style="--i:3" cx="120" cy="58" r="11"/></g><path class="d" style="--i:4" d="M98 96c2-12 10-18 22-18s20 6 22 18"/>
<g class="f thin" style="--i:7"><g class="live"><circle class="ring" cx="64" cy="36" r="3"/><circle class="pt" cx="64" cy="36" r="2.400"/></g><rect class="pip" x="155" y="80" width="26" height="22" rx="5"/><circle cx="168" cy="88" r="3.500"/><path d="M161.500 99.500c1-4 3.500-5.500 6.500-5.500s5.500 1.500 6.500 5.500"/></g>
<g class="bubble b1 thin"><rect x="148" y="34" width="30" height="17" rx="8.500"/><circle class="dot" cx="156.500" cy="42.500" r="1.400"/><circle class="dot d2" cx="163" cy="42.500" r="1.400"/><circle class="dot d3" cx="169.500" cy="42.500" r="1.400"/></g>
<g class="thin"><path class="d" style="--i:5" d="M27 124v-10h11v10M38 117h3v4h-3"/><path class="steam" d="M30.500 109c-2-2.500 2-4 0-7"/><path class="steam s2" d="M34.500 109c-2-2.500 2-4 0-7"/></g>
<path class="pot d" style="--i:6" d="M200 124l-2-10h16l-2 10z"/><g class="leaf" style="transform-origin:206px 114px"><path class="d" style="--i:7" d="M206 114c0-10 4-17 11-20-1 9-4 16-11 20"/></g><g class="leaf l2" style="transform-origin:206px 114px"><path class="d" style="--i:8" d="M206 114c-1-8-5-14-12-15 1 8 5 13 12 15"/></g></svg>`,
}
const ART = Object.fromEntries(Object.entries(ART_RAW).map(([k, v]) => [k, v.replace(/\n/g, '').replace(/class="([^"]*\bd)"/g, 'class="$1" pathLength="1"')]))

const FAQ = [
  ['Was bedeutet systemische Therapie?', 'Systemische Therapie betrachtet Menschen im Zusammenhang mit ihrem Umfeld und ihren Beziehungen. Gemeinsam schauen wir auf Herausforderungen, vorhandene Stärken und neue Perspektiven, damit Veränderungen möglich werden.'],
  ['Wie läuft ein erstes Gespräch ab?', 'Sie schildern, was Sie zurzeit bewegt und was sich verändern soll. Gemeinsam klären wir, ob meine Begleitung zu Ihrem Anliegen passt. Das Erstgespräch ist kostenfrei und dauert etwa 30 Minuten.'],
  ['Gibt es Unterstützung für Jugendliche?', 'Im Jugendcoaching können junge Menschen ihre Gedanken ordnen, eigene Ressourcen entdecken und passende Wege im Umgang mit Herausforderungen entwickeln.'],
  ['Kann ich auch als Elternteil kommen?', 'In der Erziehungsberatung schauen wir auf die Situation in Ihrer Familie und erarbeiten neue Perspektiven für den Alltag und die Kommunikation.'],
  ['Sind Termine online möglich?', 'Ja. Ich begleite Menschen flexibel online oder offline; je nach Anliegen kann ein Gespräch auch in der Natur stattfinden.'],
  ['Was kostet eine Sitzung?', 'Das Erstgespräch ist kostenfrei. Eine Einzelsitzung, ein Jugendcoaching, eine Erziehungsberatung oder eine Onlineberatung kosten 100 € für 60 Minuten, ein Paargespräch 180 € für 90 Minuten.'],
  ['Wo ist die Praxis?', `Im ${ADDRESS}. Ich begleite Klienten aus dem Raum ${P.areas.join(', ')} und Umgebung, online auch deutschlandweit sowie aus Österreich und der Schweiz.`],
]
const faq = `<div class="faq rv">${FAQ.map(([q, a]) => `<details name="faq"><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>`

// Zeichen: eine Familie, 24er Raster, nur Linie
const ICO = {
  book: '<path d="M4 5.500c2.500-1 5-1 8 .500v13c-3-1.500-5.500-1.500-8-.500zM20 5.500c-2.500-1-5-1-8 .500v13c3-1.500 5.500-1.500 8-.500z"/>',
  globe: '<circle cx="12" cy="12" r="8.500"/><path d="M3.500 12h17M12 3.500c2.500 2.500 3.500 5.500 3.500 8.500s-1 6-3.500 8.500c-2.500-2.500-3.500-5.500-3.500-8.500s1-6 3.500-8.500z"/>',
  mountain: '<path d="M3 19l6-10 4 6 2.500-3.500L21 19z"/><circle cx="17" cy="6" r="1.600"/>',
  cap: '<path d="M2.500 9.500L12 5l9.500 4.500L12 14zM6.500 11.800V16c1.500 1.500 3.500 2.200 5.500 2.200s4-.7 5.500-2.200v-4.200M21.500 9.500v5"/>',
  talk: '<path d="M4 6.500a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9l-3 2.500v-2.500a2 2 0 0 1-2-2zM16 9.500h2a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2v2.300l-2.800-2.300H12"/>',
  ban: '<circle cx="12" cy="12" r="8.500"/><path d="M6 6l12 12"/>',
  drawer: '<path d="M4.500 4.500h15v15h-15zM4.500 12h15M10 8.200h4M10 15.800h4"/>',
  small: '<path d="M4 7a2.500 2.500 0 0 1 2.500-2.500h11A2.500 2.500 0 0 1 20 7v7a2.500 2.500 0 0 1-2.500 2.500H11l-4 3v-3h-.5A2.500 2.500 0 0 1 4 14z"/><path d="M9 10.700h.01M12 10.700h.01M15 10.700h.01"/>',
  couple: '<circle cx="9" cy="12" r="5.500"/><circle cx="15" cy="12" r="5.500"/>',
  steps: '<path d="M4 19h4v-4h4v-4h4V7h4"/>',
  monitor: '<path d="M4 5.500h16V16H4zM9.500 19.500h5M12 16v3.500"/>',
  kids: '<circle cx="7" cy="9.500" r="2.200"/><circle cx="17" cy="9.500" r="2.200"/><circle cx="12" cy="7.500" r="2.500"/><path d="M3.500 17.500c.4-2.300 1.700-3.500 3.500-3.500M20.500 17.500c-.4-2.300-1.700-3.500-3.500-3.500M7.500 19.500c.5-3 2.200-4.500 4.500-4.500s4 1.500 4.500 4.500"/>',
  peace: '<path d="M5 19c2-7 6-11 14-14M9.500 12.500c-2.500-.5-3.500-2-3.500-4 2 0 3.500 1 3.500 4zM13.500 9c-2-1-2.500-2.500-2-4.500 2 .5 3 2 2 4.500zM12 15c2.500.5 4.500-.3 5.500-2-2-1-4-.6-5.500 2z"/>',
  down: '<path d="M12 4.500v10M8 11l4 4 4-4M5 19.500h14"/>',
  user: '<circle cx="12" cy="8.500" r="3.500"/><path d="M5 19.500c.8-4 3.500-6 7-6s6.200 2 7 6"/>',
  list: '<path d="M9 7h11M9 12h11M9 17h11M4.500 7h.01M4.500 12h.01M4.500 17h.01"/>',
  pin: '<path d="M12 20.500s6.500-5.500 6.500-10.800a6.500 6.500 0 0 0-13 0c0 5.300 6.500 10.800 6.500 10.800z"/><circle cx="12" cy="9.800" r="2.300"/>',
  area: '<circle cx="12" cy="12" r="8.500"/><path d="M15.500 8.500l-2 5-5 2 2-5z"/>',
  phone: '<path d="M8 3.800l-2.600.5a1.200 1.200 0 0 0-1 1.300c.6 7.400 6.600 13.400 14 14a1.200 1.200 0 0 0 1.300-1l.5-2.600a1.200 1.200 0 0 0-.7-1.300l-2.900-1.200a1.200 1.200 0 0 0-1.300.3l-1.100 1.300a9.600 9.600 0 0 1-5.400-5.400l1.300-1.100a1.200 1.200 0 0 0 .3-1.300L9.300 4.500A1.200 1.200 0 0 0 8 3.800z"/>',
  mail: '<path d="M4 6.500h16v11H4zM4.500 7l7.500 6 7.500-6"/>',
  cal: '<path d="M4.500 6h15v13.500h-15zM4.500 10.500h15M8.500 3.500v4M15.500 3.500v4"/>',
}
const ico = n => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICO[n]}</svg>`
const glance = `
<div class="infos">
  <div class="info rv">${ico('user')}<div><h3>Wer</h3><p>${P.name}, systemische und traumasensible Therapeutin und Coach, Dipl. Sozialpädagogin (FH), seit über 18 Jahren selbstständig.</p></div></div>
  <div class="info rv" style="--d:60ms">${ico('pin')}<div><h3>Wo</h3><p>${ADDRESS}, sowie online und als Walk and Talk.</p><p><a class="link" href="${GMAPS}" target="_blank" rel="noopener">In Google Maps öffnen</a></p></div></div>
  <div class="info rv">${ico('phone')}<div><h3>Telefon</h3><p><a class="info-big" href="tel:${P.tel}">${P.phone}</a></p><p>Bitte auf den Anrufbeantworter sprechen, ich rufe zurück.</p></div></div>
  <div class="info rv" style="--d:60ms">${ico('mail')}<div><h3>E-Mail</h3><p><a class="info-big" href="mailto:${P.mail}">${P.mail}</a></p><p><a class="link" href="#schreiben">Oder direkt hier schreiben</a></p></div></div>
  <div class="info is-wide rv">${ico('list')}<div><h3>Angebot</h3><p class="info-tags">${services.map(s => `<a href="${s.path}">${s.name}</a>`).join('')}</p></div></div>
  <div class="info rv">${ico('area')}<div><h3>Einzugsgebiet</h3><p>${P.areas.join(', ')} und Umgebung. Online deutschlandweit, in Österreich und der Schweiz.</p></div></div>
  <div class="info rv" style="--d:60ms">${ico('cal')}<div><h3>Schulferien</h3><p>Während der bayerischen Schulferien ist die Praxis nicht besetzt. Danach melde ich mich, so schnell es mir möglich ist.</p></div></div>
</div>`
const contactForm = `
<form class="cform rv" id="kontakt-form" method="post" action="/api/anfrage" data-mail="${P.mail}" novalidate>
  <input type="hidden" name="art" value="kontakt">
  <p class="cform-trap" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label></p>
  <label class="cfield"><span>Name <i aria-hidden="true">*</i></span><input type="text" name="name" autocomplete="name" required minlength="2" maxlength="120"></label>
  <div class="cform-row">
    <label class="cfield"><span>E-Mail <i aria-hidden="true">*</i></span><input type="email" name="email" autocomplete="email" inputmode="email" required maxlength="160"></label>
    <label class="cfield"><span>Telefon (optional)</span><input type="tel" name="telefon" autocomplete="tel" inputmode="tel" maxlength="40"></label>
  </div>
  <label class="cfield"><span>Ihre Nachricht <i aria-hidden="true">*</i></span><textarea name="nachricht" rows="5" required minlength="5" maxlength="1500" placeholder="Worum geht es? Wann erreiche ich Sie am besten?"></textarea></label>
  <label class="ccheck"><input type="checkbox" name="einwilligung" value="1" required><span>Ich bin einverstanden, dass meine Angaben zur Beantwortung meiner Nachricht verwendet werden. <a class="link" href="/datenschutz/">Datenschutz</a></span></label>
  <p class="cform-error" data-cform-error role="alert" hidden></p>
  <div class="cform-end"><button class="btn primary" type="submit">Nachricht senden</button><p class="small">Bitte keine Notfälle über dieses Formular. In akuten Krisen: Telefonseelsorge 0800 111 0 111.</p></div>
  <div class="cform-done" data-cform-done hidden tabindex="-1"><h3>Danke, Ihre Nachricht ist angekommen.</h3><p>Ich melde mich bei Ihnen. Während der bayerischen Schulferien kann es etwas länger dauern.</p></div>
</form>`

// Kursdetails, früher als PDF-Kursblatt: jetzt direkt auf der Seite in einem Fenster
const COURSE_INFO = [
  { lead: 'Steckt ihr mitten im Übergang vom Paar zur Familie oder seid gerade Eltern geworden? Ihr merkt, dass sich etwas verändert, Konflikte sich mehren und die Paarbeziehung anders geworden ist?', points: ['Was macht unsere Partnerschaft wieder lebendig, und wie halten wir sie lebendig?', 'Wie gehen wir achtsam und wertschätzend miteinander um und kommunizieren besser?', 'Wie kann eine Krise als Chance genutzt werden?', 'Wie finden wir gute Entscheidungen in wichtigen Lebensfragen?'], how: 'In Kurzvorträgen geht es um typische Paarsituationen. Jedes Paar kann eigene Themen einbringen und lernt in Übungen die eigene Paardynamik, Ressourcen und individuelle Lösungen kennen. Die meiste Zeit verbringt ihr als Paar miteinander.', info: [['Wann', 'Samstag und Sonntag, jeweils 10 bis 17 Uhr. Neuer Termin, sobald genügend Anmeldungen da sind.'], ['Wo', 'ZeitRaum, Weilheimer Str. 9, Landsberg am Lech'], ['Gruppe', 'maximal 3 Paare'], ['Kursgebühr', '250 € pro Paar']] },
  { lead: 'Mehr Gelassenheit und Ruhe im Erziehungsalltag, hin zu einem wertschätzenden Miteinander. Gute Erziehung lässt sich lernen, üben und verbessern, wie Lesen und Schreiben auch.', points: ['Bindungsstarke, tragfähige und wertschätzende Erziehungsmethoden kennenlernen', 'Sinnvolle Grenzen setzen', 'Erfahren, wie Ihr Kind besser kooperiert', 'Ihr Kind gut begleiten und ermutigen'], how: 'Das Elterntraining ist angelehnt an die STEP-Methode und unterstützt Eltern in ihrer Erziehungs- und Beziehungsarbeit. Freiwillige Nachtreffen helfen, das Gelernte in der Familie zu festigen.', info: [['Wann', 'Wochenendseminar Freitag bis Sonntag. Nächster Termin auf Anfrage.'], ['Wo', 'ZeitRaum, Weilheimer Str. 9, Landsberg am Lech'], ['Gruppe', 'maximal 8 Personen'], ['Kursgebühr', '200 € pro Person, für Paare 20 % Rabatt']], note: 'Bitte das Alter des Kindes bei der Anmeldung angeben.' },
  { lead: 'Dasselbe Elterntraining als Online-Kurs, bequem von zu Hause aus. Für mehr Gelassenheit und Ruhe im Erziehungsalltag.', points: ['Bindungsstarke, tragfähige und wertschätzende Erziehungsmethoden kennenlernen', 'Sinnvolle Grenzen setzen', 'Erfahren, wie Ihr Kind besser kooperiert', 'Ihr Kind gut begleiten und ermutigen'], how: 'Zehn Treffen, angelehnt an die STEP-Methode. Beim ersten Treffen werden alle weiteren Termine gemeinsam mit der Gruppe abgesprochen. Freiwillige Nachtreffen helfen, dranzubleiben.', info: [['Wann', '10 Treffen, samstags 10:30 bis 12:30 Uhr. Start auf Anfrage.'], ['Wo', 'online'], ['Gruppe', 'maximal 6 Personen'], ['Kursgebühr', '200 € pro Person, für Paare 20 % Rabatt']], note: 'Bitte das Alter des Kindes bei der Anmeldung angeben.' },
  { lead: 'Für Kinder ist die Trennung der Eltern oft ein einschneidendes Erlebnis. In der Gruppe bekommen sie Raum, mit der veränderten Lebenssituation besser umgehen zu lernen, und emotionale Unterstützung.', points: ['Elternabend mit Hinweisen, wie Eltern ihr Kind zu Hause unterstützen können', 'Im geschützten Rahmen über Gedanken, Gefühle, Ängste und Wünsche sprechen', 'Gefühle wahrnehmen, zulassen und ausdrücken, auch Scham überwinden', 'Eigene Ressourcen und neue Lösungen kennenlernen', 'Selbstwert stärken und eine eigenständige Beziehung zu beiden Eltern aufbauen'], how: 'Zwei Gruppen nach Alter: 8 bis 10 Jahre und 11 bis 13 Jahre.', info: [['Wann', 'wöchentlich, 10 Treffen, 17 bis 18 Uhr. Start, sobald genügend Anmeldungen da sind.'], ['Wo', 'ZeitRaum, Weilheimer Str. 9, Landsberg am Lech'], ['Gruppe', 'maximal 4 Kinder'], ['Kursgebühr', '200 € pro Kind, Geschwister 10 % Rabatt']], note: 'Bitte das Alter des Kindes bei der Anmeldung angeben.' },
]
const courseSheet = (c, i, t, ic) => `<dialog class="sheet course-sheet" id="kurs-${i}" aria-labelledby="kurs-${i}-t">
  <div class="sheet-in" tabindex="-1">
    <div class="sheet-grip" aria-hidden="true"><span></span></div>
    <button class="sheet-x" type="button" data-sheet-close aria-label="Schließen"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></svg></button>
    <span class="course-ico">${ico(ic)}</span>
    <h2 id="kurs-${i}-t">${t}</h2>
    <p class="sheet-lead">${c.lead}</p>
    <h3>Darum geht es</h3>
    <ul class="cs-points">${c.points.map(x => `<li>${x}</li>`).join('')}</ul>
    <p class="cs-how">${c.how}</p>
    <dl class="cs-info">${c.info.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    ${c.note ? `<p class="cs-note">${c.note}</p>` : ''}
    <div class="cs-acts"><a class="btn primary" href="/termin/?thema=kurs">Kurs anfragen</a><a class="btn" href="tel:${P.tel}">${P.phone}</a></div>
  </div>
</dialog>`
const COURSES = [
  ['couple', 'Eltern sein, Paar bleiben', 'Seitdem die Kinder da sind, ist alles anders? Streit nimmt zu, die Liebe ab? Dann lade ich herzlich zu diesem Paar-Seminar ein.', 'Wochenendseminar, maximal 3 Paare', '/downloads/eltern-sein-paar-bleiben.pdf'],
  ['steps', 'Schritt für Schritt als Eltern fit', 'Mehr Gelassenheit und Ruhe im Erziehungsalltag. Das Elterntraining hilft, ein kooperatives und konfliktärmeres Zusammenleben in der Familie zu entwickeln.', 'Wochenendseminar im ZeitRaum, maximal 8 Personen', '/downloads/schritt-fuer-schritt-als-eltern-fit.pdf'],
  ['monitor', 'Schritt für Schritt als Eltern fit, online', 'Dasselbe Elterntraining als Online-Kurs, von zu Hause aus.', 'Online-Kurs, 10 Treffen, maximal 6 Personen', '/downloads/schritt-fuer-schritt-als-eltern-fit-online.pdf'],
  ['kids', 'Gruppe für Trennungs- und Scheidungskinder', 'In dem Gruppenangebot wird Kindern der Raum und die Möglichkeit gegeben, mit der Scheidung oder Trennung ihrer Eltern besser zurechtzukommen.', 'Für Kinder von 8 bis 10 Jahren, 10 Treffen, maximal 4 Kinder', '/downloads/gruppe-trennungs-und-scheidungskinder.pdf'],
]

// ── Strukturierte Daten
const business = {
  '@context': 'https://schema.org', '@type': 'ProfessionalService', '@id': ORIGIN + '/#praxis',
  name: `${P.name}, ${P.practice}`,
  description: 'Systemische und traumasensible Einzel- und Paartherapie, Jugendcoaching und Erziehungsberatung in Landsberg am Lech, online und als Walk and Talk.',
  url: ORIGIN + '/', logo: ORIGIN + '/img/icon-512.png', image: ORIGIN + '/img/pamela-zurbuchen-992.jpg', telephone: P.tel, email: P.mail, priceRange: '€€',
  address: { '@type': 'PostalAddress', streetAddress: P.street, postalCode: P.zip, addressLocality: P.city, addressRegion: 'Bayern', addressCountry: 'DE' },
  areaServed: [...P.areas.map(a => ({ '@type': 'City', name: a })), { '@type': 'Country', name: 'Deutschland' }, { '@type': 'Country', name: 'Österreich' }, { '@type': 'Country', name: 'Schweiz' }],
  availableLanguage: 'de', founder: { '@id': ORIGIN + '/#pamela-zurbuchen' },
  makesOffer: PRICES.map(([t, p, s]) => ({ '@type': 'Offer', name: `${t} (${s.split(',')[0]})`, price: p === 'kostenfrei' ? '0' : p.replace(' €', ''), priceCurrency: 'EUR' })),
  potentialAction: { '@type': 'ReserveAction', name: 'Termin anfragen', target: ORIGIN + '/termin/' },
}
const person = {
  '@context': 'https://schema.org', '@type': 'Person', '@id': ORIGIN + '/#pamela-zurbuchen', name: P.name,
  jobTitle: 'Systemische und traumasensible Therapeutin und Coach, Dipl. Sozialpädagogin (FH)',
  image: ORIGIN + '/img/pamela-zurbuchen-992.jpg', url: ORIGIN + '/ueber-mich/', worksFor: { '@id': ORIGIN + '/#praxis' },
  knowsAbout: ['Systemische Therapie', 'Traumasensible Begleitung', 'Paartherapie', 'Jugendcoaching', 'Erziehungsberatung', 'Bindungspsychotherapie', 'Kommunikationstraining'],
}
const crumbs = (...items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [['Start', '/'], ...items].map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: ORIGIN + path })) })

// ── Seiten
const pages = []

pages.push({
  path: '/',
  title: 'Systemische Therapie und Paartherapie in Landsberg am Lech | Pamela Zurbuchen',
  desc: 'Systemische und traumasensible Einzel- und Paartherapie, Jugendcoaching und Erziehungsberatung in Landsberg am Lech. In der Praxis, online oder als Walk and Talk. Erstgespräch kostenfrei.',
  ld: [business, person, { '@context': 'https://schema.org', '@type': 'WebSite', name: P.name, url: ORIGIN + '/', inLanguage: 'de' }, { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }],
  body: `
<section class="hero hero-photo">
  <picture class="hero-bg"><source type="image/webp" media="(max-width: 960px)" srcset="/img/hero-900.webp"><source type="image/webp" srcset="/img/hero-1366.webp"><img src="/img/hero-1366.jpg" width="1366" height="768" alt="" fetchpriority="high" decoding="async"></picture>
  <div class="wrap hero-grid">
  <div class="hero-card">
    <h1 class="glass">${glass('Systemische und traumasensible Therapie in')} <span class="place">${['Landsberg', 'am&nbsp;Lech'].map((w, i) => `<span class="gw" style="--i:${i + 5}">${w}</span>`).join(' ')}</span></h1>
    <p class="lead rv" style="--d:80ms">Für Einzelne, Paare, Eltern und Jugendliche: in der Praxis, online oder im Gehen.</p>
    <form class="quick rv" style="--d:160ms" action="/termin/" method="get" aria-label="Termin anfragen">
      <p class="quick-line">Ich suche <label><span class="sr">Anliegen</span><select name="thema"><option value="einzeltherapie">eine Einzeltherapie</option><option value="paartherapie">eine Paartherapie</option><option value="jugendcoaching">ein Jugendcoaching</option><option value="erziehungsberatung">eine Erziehungsberatung</option><option value="kurs">einen Kurs oder ein Training</option><option value="offen">erst einmal Orientierung</option></select></label>, am liebsten <label><span class="sr">Form</span><select name="ort"><option value="praxis">in der Praxis</option><option value="online">online</option><option value="walk">beim Walk and Talk</option><option value="egal">egal wo</option></select></label> und <label><span class="sr">Wunschzeit</span><select name="zeit"><option value="vormittags">vormittags</option><option value="nachmittags">nachmittags</option><option value="abends">am frühen Abend</option><option value="flexibel">zeitlich flexibel</option></select></label>.</p>
      <div class="quick-foot"><button class="btn primary" type="submit">Termin anfragen</button><span class="small">Kostenfreies Erstgespräch, etwa 30 Minuten</span></div>
    </form>
  </div>
</div>
</section>

<section class="trust-strip"><div class="wrap">
  <a class="g-badge rv" href="#stimmen">${G}<span><b>5,0 ${STARS}</b><small>Google-Bewertungen</small></span></a>
  <ul class="quals rv" style="--d:80ms"><li>Dipl. Sozialpädagogin (FH)</li><li>Systemische Therapeutin (IFW)</li><li>Bindungspsychotherapie nach Prof. Dr. Brisch</li><li>Ausgebildete STEP-Elterntrainerin</li><li>Seit über 18 Jahren selbstständig</li></ul>
</div></section>

<section class="section"><div class="wrap split">
  <h2 class="rv">Was beschäftigt Sie gerade?</h2>
  <ul class="links rv">
    <li><a href="/einzeltherapie/">Ich bin erschöpft <span>Einzeltherapie</span></a></li>
    <li><a href="/paartherapie/">Wir verstehen uns nicht mehr <span>Paartherapie</span></a></li>
    <li><a href="/erziehungsberatung/">Der Familienalltag ist anstrengend <span>Erziehungsberatung</span></a></li>
    <li><a href="/jugendcoaching/">Schule, Freunde, Zukunft <span>Jugendcoaching</span></a></li>
    <li><a href="/kommunikationstraining/">Unser Team redet aneinander vorbei <span>Kommunikationstraining</span></a></li>
    <li><a href="/termin/">Ich weiß es noch nicht genau <span>Erstgespräch</span></a></li>
  </ul>
</div></section>

<section class="deep">${mark}<div class="wrap">
  <figure class="rv">
    <blockquote class="quote">„Ich weiß, dass ich nichts weiß – alles hat einen Sinn.“</blockquote>
    <figcaption class="lead quote-by">Diesen Sinn möchte ich mit einer wertschätzenden und neugierigen Haltung erforschen. <a class="link" href="/ueber-mich/">Mehr über mich</a></figcaption>
  </figure>
</div></section>

<section class="section" id="angebot"><div class="wrap">
  <div class="head rv"><h2>Begleitung für Einzelne, Paare, Eltern und Jugendliche</h2></div>
  <div class="grid g4">${services.slice(0, 4).map((s, i) => `<a class="item rv" style="--d:${i * 70}ms" href="${s.path}"><h3>${nameOf(s)}</h3><p>${inline(s.card)}</p><span class="more">Mehr erfahren</span></a>`).join('')}</div>
  <p class="also rv">Außerdem: ${services.slice(4).map(s => `<a class="link" href="${s.path}">${s.name}</a>`).join(', ')}</p>
</div></section>

<section class="section"><div class="wrap">
  <div class="head rv"><h2>So beginnt es</h2></div>
  ${steps()}
</div></section>

<section class="section"><div class="wrap">
  <div class="head rv"><h2>Sie entscheiden, was Ihnen guttut</h2></div>
  <div class="grid g3 ways">
    <div class="way rv">${ART.praxis}<h3>In der Praxis</h3><p>${ADDRESS}</p></div>
    <div class="way rv" style="--d:90ms">${ART.walk}<h3>Walk and Talk</h3><p>Im Gehen kommt vieles in Fluss und es unterhält sich ungezwungener.</p></div>
    <div class="way rv" style="--d:180ms">${ART.online}<h3>Online</h3><p>Deutschlandweit sowie für Klienten aus Österreich und der Schweiz.</p></div>
  </div>
</div></section>

<section class="section tinted" id="stimmen"><div class="wrap">
  <div class="rev-head rv"><h2>Was Menschen über die Begleitung sagen</h2><div class="g-score">${G}<span><b>5,0</b>${STARS}<small>Bewertungen auf Google</small></span></div></div>
  <div class="grid g2">
    <figure class="card voice rv"><div class="voice-top">${STARS}${G}</div><blockquote class="quote">„Pamela Zurbuchen hat eine sehr angenehme und einfühlsame Art! Außerdem die Fähigkeit aufmerksam zu …“</blockquote><figcaption><b>Brigitte B.</b><span>Google-Rezension, Auszug</span></figcaption></figure>
    <figure class="card voice rv" style="--d:80ms"><div class="voice-top">${STARS}${G}</div><blockquote class="quote">„Seit Jahren suche ich bei Frau Zurbuchen Rat bei Erziehungsfragen. Mit ihrem Feingefühl hatte sie bisher immer den richtigen Riecher …“</blockquote><figcaption><b>Angie L.</b><span>Google-Rezension, Auszug</span></figcaption></figure>
  </div>
</div></section>


<section class="section"><div class="wrap">
  <div class="head rv"><h2>Was eine Sitzung kostet</h2><p>Bei finanziellem Engpass sind Sonderregelungen möglich. <a class="link" href="/preise/">Alle Preise</a></p></div>
  ${prices(3)}
</div></section>

<section class="section"><div class="wrap">
  <div class="head rv"><h2>Kurse und Gedanken</h2></div>
  <div class="bento">
    <a class="tile tile-deep rv" href="/kurse/">${mark}<span class="tile-kind">Kurse und Seminare</span><h3>Für Eltern, Paare und Kinder</h3><ul class="tile-list"><li>Eltern sein, Paar bleiben</li><li>Schritt für Schritt als Eltern fit</li><li>Gruppe für Trennungs- und Scheidungskinder</li></ul><span class="tile-go">Alle Kurse ansehen</span></a>
    <a class="tile tile-blush rv" style="--d:160ms" href="/blog/"><span class="tile-kind">Blog</span><h3>Gedanken und Impulse</h3><p>Zu Erschöpfung, Partnerschaft, Elternsein und systemischer Therapie.</p><span class="tile-go">Weiterlesen</span></a>
  </div>
</div></section>

<section class="section"><div class="wrap split faq-split">
  <div class="rv"><h2>Häufige Fragen</h2><p class="faq-side">Ihre Frage ist nicht dabei? Schreiben Sie mir oder rufen Sie an.</p><a class="btn" href="/kontakt/">Kontakt aufnehmen</a></div>
  ${faq}
</div></section>
${cta()}`,
})

pages.push({
  path: '/angebot/',
  title: 'Angebot: Therapie, Coaching und Beratung in Landsberg am Lech | Pamela Zurbuchen',
  desc: 'Einzeltherapie, Paartherapie, Jugendcoaching, Erziehungsberatung, Kommunikationstraining, Vorträge und Schulungen. In Landsberg am Lech, online und als Walk and Talk.',
  ld: [crumbs(['Angebot', '/angebot/']), { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: services.map((s, i) => ({ '@type': 'ListItem', position: i + 1, name: s.name, url: ORIGIN + s.path })) }],
  body: `
<section class="page-hero"><div class="wrap">
  <h1 class="glass">${glass('Meine Leistungen')}</h1>
  <p class="lead rv" style="--d:160ms">Therapie, Coaching und Beratung für Einzelpersonen, Eltern, Paare, Jugendliche und Organisationen. Ich arbeite on- und offline.</p>
</div></section>
<section class="section"><div class="wrap">
  <div class="rows">${services.map(s => `<article class="row rv"><div><h2><a href="${s.path}">${nameOf(s)}</a></h2><p class="small">${s.price === 'nach Absprache' ? 'Kosten nach Absprache' : s.price}</p></div><div><p>${inline(s.card)}</p><p class="row-links"><a class="link" href="${s.path}">Mehr erfahren</a><a class="link" href="/termin/?thema=${['kommunikationstraining', 'vortraege-und-schulungen'].includes(slug(s.path)) ? 'kurs' : slug(s.path) === 'walk-and-talk' ? 'offen&ort=walk' : slug(s.path)}">Termin anfragen</a></p></div></article>`).join('')}</div>
</div></section>
${cta()}`,
})

const SVC_ART = {
  '/einzeltherapie/': ART.praxis,
  '/walk-and-talk/': ART.walk,
  '/paartherapie/': `<svg class="art art-svc art-paar" viewBox="0 0 240 150" aria-hidden="true">
<ellipse class="rug" cx="120" cy="127" rx="96" ry="4.500"/>
<g class="soft"><rect class="pane" x="98" y="14" width="44" height="36" rx="5"/><rect x="98" y="14" width="44" height="36" rx="5"/><path d="M120 14v36M98 32h44"/></g>
<path stroke="var(--wine-300)" d="M12 126h216"/>
<g transform="translate(74 0) scale(1 1)"><path class="seat" d="M-20 124V84a8 8 0 0 1 8-8h2v32h28v8H-12v8"/><path d="M-16 116v8M16 116v8"/><circle class="head" cx="0" cy="58" r="7.500"/><path class="coat" d="M-7 70c3-3 11-3 14 0l2 36H-8z"/><path d="M-2 106h20v20h4"/><path d="M7 76l8 14 7-3"/></g><g transform="translate(166 0) scale(-1 1)"><path class="seat" d="M-20 124V84a8 8 0 0 1 8-8h2v32h28v8H-12v8"/><path d="M-16 116v8M16 116v8"/><circle class="head" cx="0" cy="58" r="7.500"/><path class="coat" d="M-7 70c3-3 11-3 14 0l2 36H-8z"/><path d="M-2 106h20v20h4"/><path d="M7 76l8 14 7-3"/></g>
<g class="thin"><path d="M108 108h24M120 108v18"/><path d="M111 108v-5h6v5M125 108v-5h6v5"/><path class="steam" d="M114 99c-2-2.500 2-4 0-7"/><path class="steam s2" d="M128 99c-2-2.500 2-4 0-7"/></g>
<g class="thin"><g class="say"><rect class="seat" x="70" y="28" width="30" height="16" rx="8"/><path d="M80 44l-2 4"/><circle class="dot" cx="78" cy="36" r="1.200"/><circle class="dot d2" cx="85" cy="36" r="1.200"/><circle class="dot d3" cx="92" cy="36" r="1.200"/></g><g class="say y2"><rect class="seat" x="140" y="28" width="30" height="16" rx="8"/><path d="M160 44l2 4"/><path d="M148 36h14"/></g></g>
<g class="sway"><path class="pot" d="M214 126l-2-10h14l-2 10z"/><path d="M219 116c0-9 4-15 10-18-1 8-4 14-10 18M219 116c-1-7-4-12-10-13 1 7 4 11 10 13"/></g>
</svg>`,
  '/jugendcoaching/': `<svg class="art art-svc art-jug" viewBox="0 0 240 150" aria-hidden="true"><g><g class="rise"><circle cx="186" cy="92" r="26" fill="var(--blush-300)" stroke="none" opacity=".3"/><circle class="glowsun" cx="186" cy="92" r="15" fill="var(--blush-300)" stroke="none"/></g></g>
<path class="hillback" d="M-4 100c30-14 60-16 92-8s66 10 96 0 40-10 60-6V150H-4z"/><path class="hillfill" d="M-4 100c30-14 60-16 92-8s66 10 96 0 40-10 60-6V150H-4z"/>
<path class="hillfill" d="M-4 118c40-10 84-10 124-2s80 6 124-4V150H-4z"/>
<path stroke="var(--wine-300)" d="M-4 100c30-14 60-16 92-8s66 10 96 0 40-10 60-6"/>
<path class="road" d="M70 150c8-14 30-22 52-28s38-14 46-26c-2 12-14 22-34 30s-34 14-40 24z"/>
<path class="road" d="M150 112c10-2 22-4 34-10-8 8-20 12-30 14z"/>
<g class="tree"><path stroke="var(--wine-300)" d="M40 104V92"/><path class="crown" d="M40 94c-8 0-12-6-12-12s5-13 12-13 12 7 12 13-4 12-12 12z"/></g>
<g class="tree t2"><path stroke="var(--wine-300)" d="M214 98v-9"/><path class="crown" d="M214 91c-6 0-9-4-9-9s4-10 9-10 9 5 9 10-3 9-9 9z"/></g>
<g transform="translate(66 1)"><ellipse class="shadow" cx="0" cy="130.500" rx="11" ry="1.800"/><path d="M-3 101v29M3.500 101v29"/><path class="seat" d="M-13 72h7v20h-7a3 3 0 0 1-3-3V75a3 3 0 0 1 3-3z"/><path class="coat" d="M-6 66c3-3 9-3 12 0 2 10 3 22 4 35H-10c1-13 2-25 4-35z"/><circle class="head" cx="0" cy="55" r="7.500"/><path d="M-7.500 52c2-6 13-6 15 0"/><path d="M6 72l6 13"/></g>
<g transform="translate(140 0)"><path d="M10 122V96"/><path class="seat" d="M10 98h20l5 5-5 5H10z"/><path class="seat" stroke="var(--wine-300)" d="M10 110H-6l-5 4.500 5 4.500h16z"/></g>
<g class="fly"><path class="bird" d="M0 0q3-3 6 0q3-3 6 0" transform="translate(150 50)"/><path class="bird b2" d="M0 0q2-2 4 0q2-2 4 0" transform="translate(166 42)"/></g>
</svg>`,
  '/erziehungsberatung/': `<svg class="art art-svc art-erz" viewBox="0 0 240 150" aria-hidden="true">
<ellipse class="rug" cx="122" cy="127" rx="88" ry="4.500"/>
<g class="soft"><rect class="pane" x="168" y="16" width="44" height="38" rx="5"/><rect x="168" y="16" width="44" height="38" rx="5"/><path d="M190 16v38M168 35h44"/></g>
<path stroke="var(--wine-300)" d="M12 126h216"/>
<g class="sway"><path class="pot" d="M26 126l-2-11h16l-2 11z"/><path d="M32 115c0-10 4-17 11-20-1 9-4 16-11 20M32 115c-1-8-5-14-12-15 1 8 5 13 12 15"/></g>
<g transform="translate(84 0)"><path class="seat" d="M-13 106h26v5h-26z"/><path d="M-10 111v15M10 111v15"/><circle class="head" cx="0" cy="58" r="7.500"/><path class="coat" d="M-7 70c3-3 11-3 14 0l2 36H-8z"/><path d="M-2 106h20v20h4"/><path d="M7 76l12 16"/></g>
<g class="blocks"><rect class="seat" x="114" y="114" width="13" height="12" rx="1.500"/><rect class="seat" x="127" y="114" width="13" height="12" rx="1.500"/><rect class="seat b2" x="120" y="102" width="13" height="12" rx="1.500"/><rect class="seat b3 drop" x="121" y="90" width="11" height="12" rx="1.500"/></g>
<g transform="translate(154 40) scale(.66)"><ellipse class="shadow" cx="0" cy="130.500" rx="11" ry="1.800"/><path d="M-3 101v29M3.500 101v29"/><path class="coat" d="M-6 66c3-3 9-3 12 0 2 10 3 22 4 35H-10c1-13 2-25 4-35z"/><circle class="head" cx="0" cy="55" r="7.500"/><path d="M-5 72l-14 16"/><path d="M5 72l5 15"/></g>
</svg>`,
}
for (const s of services) {
  pages.push({
    path: s.path, title: s.title, desc: s.desc,
    ld: [crumbs(['Angebot', '/angebot/'], [s.name, s.path]), { '@context': 'https://schema.org', '@type': 'Service', name: s.name, description: s.desc, url: ORIGIN + s.path, provider: { '@id': ORIGIN + '/#praxis' }, areaServed: P.areas.concat(['Deutschland', 'Österreich', 'Schweiz']) }],
    body: `
<section class="page-hero"><div class="wrap${SVC_ART[s.path] ? ' has-art' : ''}">
  <p class="small crumb rv"><a class="link" href="/angebot/">Angebot</a></p>
  <h1 class="glass">${glass(s.h1)}</h1>
  <p class="lead rv" style="--d:260ms">${s.lead}</p>
  ${SVC_ART[s.path] ? `<figure class="svc-art rv" style="--d:320ms">${SVC_ART[s.path]}</figure>` : ''}
</div></section>
<section class="section"><div class="wrap with-aside">
  <div class="prose" data-fold>${md(s.body)}</div>
  <aside class="aside rv">
    <dl>
      <div><dt>Kosten</dt><dd class="big">${s.price}</dd></div>
      <div><dt>Erstgespräch</dt><dd>kostenfrei, ca. 30 Minuten</dd></div>
      <div><dt>Ort</dt><dd>${P.practice}, ${P.city}, online oder als Walk and Talk</dd></div>
    </dl>
    ${book(slug(s.path), 'gold')}
    <a class="small" href="/preise/">Alle Preise und Informationen</a>
  </aside>
</div></section>
<section class="section"><div class="wrap">
  <div class="head rv"><h2>So beginnt es</h2></div>
  ${steps(s.du)}
</div></section>
<section class="section"><div class="wrap">
  <div class="head rv"><h2>Weitere Angebote</h2></div>
  <div class="grid g3">${services.filter(o => o !== s).slice(0, 3).map((o, i) => card(o, i)).join('')}</div>
</div></section>
${cta(s.du, undefined, undefined, slug(s.path))}`,
  })
}

pages.push({
  path: '/ueber-mich/',
  title: 'Über Pamela Zurbuchen | Systemische Therapeutin und Coach in Landsberg am Lech',
  desc: 'Pamela Zurbuchen, Dipl. Sozialpädagogin (FH), systemische Einzel-, Paar- und Familientherapeutin (IFW), traumasensibel, seit über 18 Jahren selbstständig in Landsberg am Lech.',
  ld: [person, crumbs(['Über mich', '/ueber-mich/'])],
  body: `
<section class="hero"><div class="wrap hero-grid">
  <div>
    <h1 class="glass">${glass('Hallo, ich bin Pamela Zurbuchen.')}</h1>
    <p class="lead rv" style="--d:360ms">Jahrgang 1975, verheiratet, eine Tochter. Ich begleite Menschen als systemische, traumasensible Therapeutin und Coach.</p>
    <p class="lead rv" style="--d:440ms">Seit über 18 Jahren arbeite ich selbstständig mit Einzelpersonen, Paaren, Familien und in Organisationen.</p>
    <div class="actions rv" style="--d:520ms">${book()}</div>
  </div>
  ${portrait('pamela-zurbuchen-praxis', [764, 480], 'Pamela Zurbuchen im Gespräch', 764, 955, `${P.name}|Systemische und traumasensible Therapeutin und Coach`)}
</div></section>
<section class="deep">${mark}<div class="wrap">
  <figure class="rv">
    <blockquote class="quote">„Ich weiß, dass ich nichts weiß – alles hat einen Sinn.“</blockquote>
    <figcaption class="lead quote-by">Diesen Sinn möchte ich mit einer wertschätzenden und neugierigen Haltung erforschen, um mein Gegenüber individuell und bestmöglich begleiten zu können.</figcaption>
  </figure>
</div></section>
<section class="section"><div class="wrap">
  <div class="split"><h2 class="rv">Was mich ausmacht</h2><p class="lead rv" style="--d:80ms">Ich liebe tiefgründige Gespräche. Lache gerne und bin viel in der Natur. Meine feinen Antennen begleiten mich schon mein ganzes Leben und bereichern mich und meine Arbeit.</p></div>
  <div class="likes">
    <div class="like-card is-warm rv"><h3>Das macht mich glücklich</h3><ul class="facts">${[['book', 'Gute Bücher, ob Fachbuch oder Roman'], ['globe', 'Reisen'], ['mountain', 'Kraftorte'], ['cap', 'Fortbildungen'], ['talk', 'Inspirierende Gespräche']].map(([i, t]) => `<li>${ico(i)}<span>${t}</span></li>`).join('')}</ul></div>
    <div class="like-card rv" style="--d:90ms"><h3>Was ich nicht mag</h3><ul class="facts">${[['ban', 'Respektlosigkeit gegenüber Mensch und Natur'], ['drawer', 'Schubladendenken'], ['small', 'Small-Talk']].map(([i, t]) => `<li>${ico(i)}<span>${t}</span></li>`).join('')}</ul></div>
  </div>
</div></section>
<section class="section"><div class="wrap">
  <div class="head rv"><h2>Meine Einstellung</h2></div>
  <ol class="tenets">${['Es gibt immer einen Weg.', 'Veränderung ist jederzeit möglich.', 'Schaue auf das ganze System und hinter die Kulissen, damit Du verstehen kannst.', 'Jeder Mensch, jedes System hat seine ganz individuellen Lösungsansätze.', 'Es gibt nicht nur „Schwarz oder Weiß“: in der Mitte ist es bunt.', 'Ich weiß, dass ich nichts weiß, deshalb forsche ich achtsam nach, um den anderen zu verstehen.'].map((t, i) => `<li class="rv" style="--d:${i * 60}ms">${t}</li>`).join('')}</ol>
</div></section>
<section class="section"><div class="wrap split">
  <div class="rv"><h2>Meine wichtigsten Qualifikationen</h2></div>
  <div class="prose">${md(`- Dipl. Sozialpädagogin (FH)
- Systemische Einzel-, Paar- und Familientherapeutin (IFW)
- Bindungspsychotherapie: bindungsbasierte Beratung und Therapie für Kinder und Jugendliche (Prof. Dr. Brisch, München)
- Fortbildungen zum Thema Trauma und traumasensibel arbeiten (u. a. Gunda Frey und Dami Charf)
- Dipl. Integrative Klangpädagogin (Tanja Draxler, Institut für Klang- und Entspannungspädagogik, Österreich)
- Phonophorese-Master (Tonpunktur / Klangzentrum Österreich)
- Ausgebildete STEP-Elterntrainerin
- Fortbildung in AD(H)S-Elternberatung
- Lernberaterin von Grundschulkindern
- und einige andere kleinere Fortbildungen`)}</div>
</div></section>
${cta()}`,
})

pages.push({
  path: '/kurse/',
  title: 'Kurse und Seminare für Eltern, Paare und Kinder | Pamela Zurbuchen',
  desc: 'Kurse in Landsberg am Lech und online: Eltern sein, Paar bleiben. Schritt für Schritt als Eltern fit. Gruppe für Trennungs- und Scheidungskinder.',
  ld: [crumbs(['Kurse', '/kurse/'])],
  body: `
<section class="page-hero"><div class="wrap">
  <h1 class="glass">${glass('Kurse und Seminare')}</h1>
  <p class="lead rv" style="--d:160ms">Für Eltern, Paare und Kinder, im ${P.practice} in Landsberg am Lech und online. Termine, Ablauf und Kursgebühr finden Sie in den Details zu jedem Kurs.</p>
</div></section>
<section class="section"><div class="wrap">
  <div class="courses">${COURSES.map(([ic, t, text, meta, pdf], i) => `
    <article class="course rv" style="--d:${(i % 2) * 80}ms"><span class="course-ico">${ico(ic)}</span><h2>${t}</h2><ul class="course-meta">${meta.split(', ').map(m => `<li>${m}</li>`).join('')}</ul><p>${text}</p><p class="course-acts"><button class="btn primary sm" type="button" data-course-open="kurs-${i}">Details ansehen</button><a class="course-more" href="/termin/?thema=kurs">Anfragen</a></p></article>`).join('')}
  </div>
</div></section>
${COURSES.map(([ic, t], i) => courseSheet(COURSE_INFO[i], i, t, ic)).join('')}
${cta(false, 'Fragen zu einem Kurs?', 'Bitte bei Kursen für Kinder das Alter des Kindes angeben.', 'kurs')}`,
})

for (const d of docs.filter(d => d.type === 'page')) {
  const isCourse = d.path.startsWith('/kurse/')
  pages.push({
    path: d.path, title: d.title, desc: d.desc,
    ld: [isCourse ? crumbs(['Kurse', '/kurse/'], [d.name, d.path]) : crumbs([d.name, d.path])],
    body: `
<section class="page-hero"><div class="wrap${d.logo ? ' with-logo' : ''}">
  <div>${isCourse ? '<p class="small crumb rv"><a class="link" href="/kurse/">Kurse</a></p>' : ''}<h1 class="glass">${glass(d.h1)}</h1>
  <p class="lead rv" style="--d:260ms">${d.lead}</p></div>
  ${d.logo ? `<img class="logo rv" src="/img/die-friedensstifter-480.webp" width="480" height="480" alt="Logo Die Friedensstifter" decoding="async">` : ''}
</div></section>
${d.prices ? `<section class="section"><div class="wrap"><h2 class="sr">Preise im Überblick</h2>${prices()}</div></section>` : ''}
<section class="section"><div class="wrap with-toc">${toc(d.body)}<div class="prose" data-fold>${d.path === '/preise/' ? md(d.body).replace('</p>', '</p>' + place) : md(d.body)}</div></div></section>
${isCourse ? cta(false, 'Kurs für Ihre Schule anfragen', 'Gerne berate ich Sie zu Ablauf, Terminen und Kosten.', 'kurs') : cta()}`,
  })
}

pages.push({
  path: '/blog/',
  title: 'Blog: Gedanken zu Therapie, Partnerschaft und Elternsein | Pamela Zurbuchen',
  desc: 'Der Blog von Pamela Zurbuchen, Landsberg am Lech: Impulse zu Erschöpfung, Partnerschaft, Elternsein, Walk and Talk und systemischer Therapie.',
  ld: [crumbs(['Blog', '/blog/'])],
  body: `
<section class="page-hero"><div class="wrap">
  <h1 class="glass">${glass('Gedanken und Impulse')}</h1>
  <p class="lead rv" style="--d:200ms">Was hilft, wenn alles zu viel wird? Wie finden Paare wieder zueinander, und was brauchen Kinder? Hier teile ich, was ich in meiner Arbeit beobachte und gelernt habe.</p>
</div></section>
<section class="section"><div class="wrap"><h2 class="sr">Artikel</h2><div class="grid g2">${posts.map((p, i) => card(p, i, 'Weiterlesen')).join('')}</div></div></section>
${cta()}`,
})

for (const d of posts) {
  pages.push({
    path: d.path, title: d.title, desc: d.desc, ogType: 'article',
    ld: [crumbs(['Blog', '/blog/'], [d.name, d.path]), { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: d.h1, description: d.desc, url: ORIGIN + d.path, inLanguage: 'de', author: { '@id': ORIGIN + '/#pamela-zurbuchen' }, publisher: { '@id': ORIGIN + '/#praxis' }, image: ORIGIN + '/img/og.jpg' }],
    body: `
<article>
<section class="page-hero"><div class="wrap">
  <p class="small crumb rv"><a class="link" href="/blog/">Blog</a></p>
  <h1 class="glass">${glass(d.h1)}</h1>
  <p class="small by rv" style="--d:260ms">Von <a class="link" href="/ueber-mich/">${P.name}</a></p>
</div></section>
<section class="section"><div class="wrap with-toc">${toc(d.body, `<p class="small">Lesezeit etwa ${minutes(d.body)} Minuten</p>`)}<div class="prose">${md(d.body)}</div></div></section>
</article>
<section class="section"><div class="wrap">
  <div class="head rv"><h2>Passend dazu</h2></div>
  <div class="grid g2">${card(services[3], 0)}${card(posts.find(p => p !== d), 1, 'Weiterlesen')}</div>
</div></section>
${cta(false, undefined, undefined, 'erziehungsberatung')}`,
  })
}

pages.push({
  path: '/kontakt/',
  title: 'Kontakt und Erstgespräch | Pamela Zurbuchen, Landsberg am Lech',
  desc: `Kostenfreies Erstgespräch vereinbaren: ${P.phone}, ${P.mail}. ${ADDRESS}. Auch online und als Walk and Talk.`,
  ld: [business, crumbs(['Kontakt', '/kontakt/'])],
  body: `
<section class="hero"><div class="wrap hero-grid">
  <div>
    <h1 class="glass">${glass('Melden Sie sich, ganz unverbindlich.')}</h1>
    <p class="lead rv" style="--d:360ms">Ich arbeite unbürokratisch und lösungsorientiert. Das Erstgespräch ist kostenfrei und dauert etwa 30 Minuten.</p>
    <div class="actions rv" style="--d:440ms">${book()}<a class="btn" href="tel:${P.tel}">${P.phone}</a></div>
  </div>
  ${portrait('pamela-zurbuchen-praxis', [764, 480], 'Pamela Zurbuchen', 764, 955)}
</div></section>
<section class="section"><div class="wrap">
  <div class="head rv"><h2>Auf einen Blick</h2></div>
  ${glance}
</div></section>
<section class="section" id="schreiben"><div class="wrap split">
  <div class="rv"><h2>Schreiben Sie mir</h2><p class="lead" style="margin-top:16px">Ein paar Zeilen genügen. Ich antworte persönlich.</p><p style="margin-top:20px">Lieber Schritt für Schritt? <a class="link" href="/termin/">Termin in fünf Fragen anfragen</a></p></div>
  ${contactForm}
</div></section>
<section class="section"><div class="wrap">
  <div class="head rv"><h2>Was eine Sitzung kostet</h2><p><a class="link" href="/preise/">Alle Preise und Informationen</a></p></div>
  ${prices(3)}
</div></section>`,
})

// Terminanfrage: eine Frage pro Bildschirm. Ohne Skript ist es ein normales Formular.
const opt = (name, type, items) => `<div class="opts${items.length > 4 ? ' two' : ''}">${items.map(([v, label], i) => `<label class="opt"><input type="${type}" name="${name}" value="${esc(v)}"><kbd aria-hidden="true">${'ABCDEFGH'[i]}</kbd><span>${label}</span></label>`).join('')}</div>`
const next = (label = 'Weiter') => `<p class="err" role="alert"></p><div class="next"><button class="btn primary" type="button" data-next>${label}</button><span class="small">oder Enter drücken</span></div>`
pages.push({
  path: '/termin/', bodyClass: 'flow-page',
  title: 'Termin anfragen | Pamela Zurbuchen, Landsberg am Lech',
  desc: 'In fünf kurzen Fragen zum kostenfreien Erstgespräch mit Pamela Zurbuchen: Anliegen, Ort, Wunschzeit und Kontakt. Sie erhalten einen Terminvorschlag.',
  ld: [crumbs(['Termin anfragen', '/termin/'])],
  body: `
<section class="flow" aria-label="Terminanfrage">
  <div class="flow-bar" aria-hidden="true"><i></i></div>
  <form id="flow" action="/api/anfrage" method="post" novalidate data-mail="${P.mail}">
    <fieldset class="step on" data-step="thema" data-kind="single">
      <legend><span class="count">Frage 1 von 5</span><h1>Worum geht es?</h1></legend>
      <p class="hint">Das Erstgespräch ist kostenfrei und dauert etwa 30 Minuten.</p>
      ${opt('thema', 'radio', [['einzeltherapie', 'Einzeltherapie'], ['paartherapie', 'Paartherapie'], ['jugendcoaching', 'Jugendcoaching'], ['erziehungsberatung', 'Erziehungsberatung'], ['kurs', 'Kurs, Training oder Vortrag'], ['offen', 'Ich bin noch unsicher']])}
      <p class="err" role="alert"></p>
    </fieldset>
    <fieldset class="step" data-step="ort" data-kind="single">
      <legend><span class="count">Frage 2 von 5</span>Wie möchten Sie sich treffen?</legend>
      ${opt('ort', 'radio', [['praxis', 'In der Praxis in Landsberg am Lech'], ['online', 'Online'], ['walk', 'Walk and Talk in der Natur'], ['egal', 'Das ist mir gleich']])}
      <p class="err" role="alert"></p>
    </fieldset>
    <fieldset class="step" data-step="zeit" data-kind="multi">
      <legend><span class="count">Frage 3 von 5</span>Wann passt es Ihnen meistens?</legend>
      <p class="hint">Mehrere Antworten möglich. Sie erhalten danach einen Terminvorschlag.</p>
      ${opt('zeit', 'checkbox', [['vormittags', 'Vormittags'], ['nachmittags', 'Nachmittags'], ['abends', 'Am frühen Abend'], ['flexibel', 'Ich bin flexibel']])}
      ${next()}
    </fieldset>
    <fieldset class="step" data-step="kontakt" data-kind="fields">
      <legend><span class="count">Frage 4 von 5</span>Wie darf ich Sie erreichen?</legend>
      <p class="hint">E-Mail oder Telefon genügt.</p>
      <div class="fields">
        <div class="field"><label for="f-name">Ihr Name</label><input id="f-name" name="name" autocomplete="name" placeholder="Vor- und Nachname" required maxlength="120"></div>
        <div class="field"><label for="f-email">E-Mail</label><input id="f-email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="name@beispiel.de" maxlength="160"></div>
        <div class="field"><label for="f-tel">Telefon</label><input id="f-tel" name="telefon" type="tel" autocomplete="tel" inputmode="tel" placeholder="Für einen Rückruf" maxlength="40"></div>
        <div class="hp" aria-hidden="true"><label for="f-web">Website</label><input id="f-web" name="website" tabindex="-1" autocomplete="off"></div>
      </div>
      ${next()}
    </fieldset>
    <fieldset class="step" data-step="nachricht" data-kind="fields">
      <legend><span class="count">Frage 5 von 5</span>Möchten Sie mir noch etwas mitgeben?</legend>
      <p class="hint">Freiwillig. Bitte keine sensiblen Details, die besprechen wir im Gespräch.</p>
      <div class="fields">
        <div class="field"><label for="f-msg">Ihre Nachricht</label><textarea id="f-msg" name="nachricht" maxlength="1500" placeholder="Zum Beispiel: Rückruf am liebsten ab 17 Uhr"></textarea></div>
        <label class="check"><input type="checkbox" name="einwilligung" value="ja" required><span>Ich bin einverstanden, dass meine Angaben verwendet werden, um meine Anfrage zu beantworten. Mehr dazu im <a class="link" href="/datenschutz/">Datenschutz</a>.</span></label>
      </div>
      <p class="err" role="alert"></p>
      <div class="next"><button class="btn primary" type="submit">Anfrage senden</button></div>
    </fieldset>
    <section class="step done" data-step="fertig" aria-live="polite">
      <img src="/img/logo-192.webp?v=4" width="192" height="192" alt="">
      <h2 data-done-title>Danke, Ihre Anfrage ist unterwegs.</h2>
      <p class="lead" data-done-text>Ich melde mich mit einem Terminvorschlag bei Ihnen. Während der bayerischen Schulferien kann es etwas länger dauern.</p>
      <div class="actions"><a class="btn primary" data-done-mail hidden href="mailto:${P.mail}">E-Mail öffnen</a><a class="btn" href="/">Zur Startseite</a></div>
    </section>
  </form>
  <div class="flow-nav"><div class="flow-nav-in"><button class="flow-back" type="button" data-prev>Zurück</button><span class="flow-count" aria-hidden="true" data-count-label></span><button class="flow-fwd" type="button" data-fwd>Weiter</button></div></div>
</section>`,
})

for (const d of docs.filter(d => d.type === 'legal')) {
  pages.push({ path: d.path, title: d.title, desc: d.desc, noindex: true, body: `
<section class="page-hero"><div class="wrap"><h1 class="glass">${glass(d.h1)}</h1></div></section>
<section class="section"><div class="wrap"><div class="prose">${md(d.body)}</div></div></section>` })
}

pages.push({ path: '/404', file: '404.html', title: 'Seite nicht gefunden | Pamela Zurbuchen', desc: 'Diese Seite gibt es nicht.', noindex: true, body: `
<section class="lost"><div class="wrap">
  <img class="lost-mark" src="/img/logo-512.webp?v=4" width="512" height="512" alt="">
  <h1 class="glass">${glass('Hier geht es nicht weiter.')}</h1>
  <p class="lead">Die Seite wurde verschoben oder es gab sie nie. Von der Startseite aus finden Sie alles wieder.</p>
  <div class="actions"><a class="btn primary" href="/">Zur Startseite</a><a class="btn" href="/angebot/">Zum Angebot</a><a class="btn" href="/kontakt/">Kontakt</a></div>
</div></section>` })

// ── Hülle
const FOOT = [
  ['Angebot', services.map(s => [s.path, s.name])],
  ['Mehr', [['/ueber-mich/', 'Über mich'], ['/kurse/', 'Kurse'], ['/preise/', 'Preise'], ['/blog/', 'Blog'], ['/kontakt/', 'Kontakt'], ['/termin/', 'Termin anfragen']]],
]
const SLOGAN = 'Systemische und traumasensible Einzel- und Paartherapie'
const brand = `<a class="brand" href="/" aria-label="${P.name}, Startseite"><img class="brand-mark" src="/img/logo-96.webp?v=4" width="96" height="96" alt=""><span class="brand-text"><b>${P.name}</b><small>${SLOGAN}</small></span></a>`
const current = (p, h) => p.path === h || p.path.startsWith(h) || (h === '/angebot/' && SERVICE_ORDER.includes(p.path))
// Chat unten rechts, im Aufbau wie bei Primava: kompakte Taste, Fenster mit Verlauf, Vorschlägen und Eingabe.
// Die Antworten sind feste Texte aus den Inhalten der Seite: kein Modell, kein Mensch am anderen Ende.
const ANSWERS = [
  { q: 'Was kostet eine Sitzung?', k: ['kost', 'preis', 'euro', '€', 'teuer', 'honorar', 'bezahl'], a: FAQ[5][1], to: ['/preise/', 'Alle Preise'] },
  { q: 'Wie läuft das Erstgespräch ab?', k: ['erstgespr', 'erste', 'kennenlern', 'ablauf', 'anfang'], a: FAQ[1][1] },
  { q: 'Geht das auch online?', k: ['online', 'video', 'zoom', 'fern', 'walk', 'natur', 'spazier'], a: FAQ[4][1], to: ['/walk-and-talk/', 'Walk and Talk und Online'] },
  { q: 'Wo ist die Praxis?', k: ['wo ', 'adresse', 'praxis', 'ort', 'anfahrt', 'landsberg', 'zeitraum'], a: FAQ[6][1], to: ['/kontakt/', 'Kontakt'] },
  { q: 'Hilfe für Jugendliche', k: ['jugend', 'teen', 'schule', 'sohn', 'tochter'], a: FAQ[2][1], to: ['/jugendcoaching/', 'Zum Jugendcoaching'] },
  { q: 'Beratung für Eltern', k: ['eltern', 'erzieh', 'kind', 'famil', 'mutter', 'vater'], a: FAQ[3][1], to: ['/erziehungsberatung/', 'Zur Erziehungsberatung'] },
  { q: 'Was heißt systemisch?', k: ['system', 'method', 'ansatz', 'trauma'], a: FAQ[0][1], to: ['/einzeltherapie/', 'Zur Einzeltherapie'] },
  { q: 'Termin absagen', k: ['absag', 'storn', 'ausfall', 'verschieb'], a: 'Bis zu 72 Stunden vor dem Termin können Termine kostenfrei abgesagt werden. Danach fällt ein Ausfallhonorar an.', to: ['/preise/', 'Alle Regelungen'] },
  { q: 'Paartherapie', k: ['paar', 'beziehung', 'ehe', 'partner', 'trennung'], a: 'In der Paartherapie schaffen wir Raum, unterschiedliche Sichtweisen zu verstehen und wiederkehrende Gespräche behutsam anders zu führen. Ein Paargespräch dauert 90 Minuten und kostet 180 €.', to: ['/paartherapie/', 'Zur Paartherapie'] },
]
const topics = ANSWERS.slice(0, 6).map((x, i) => ({ label: x.q, to: 'a' + i }))
const CHAT = {
  nodes: {
    welcome: { text: ['Hallo, schön, dass Sie da sind.', 'Wobei kann ich Ihnen weiterhelfen?'], chips: [{ label: 'Termin anfragen', href: '/termin/', primary: true }, ...topics] },
    menu: { text: ['Gern. Wählen Sie ein Thema oder schreiben Sie Ihre Frage.'], chips: topics },
    kontakt: { text: ['Das beantwortet Ihnen Pamela Zurbuchen am besten persönlich.', 'Während der bayerischen Schulferien ist die Praxis nicht besetzt.'], chips: [{ label: 'Termin anfragen', href: '/termin/', primary: true }, { label: 'Anrufen', href: `tel:${P.tel}` }, { label: 'E-Mail schreiben', href: `mailto:${P.mail}` }, { label: 'Zurück zu den Themen', to: 'menu' }] },
    ...Object.fromEntries(ANSWERS.map((x, i) => ['a' + i, { text: [x.a], chips: [...(x.to ? [{ label: x.to[1], href: x.to[0] }] : []), { label: 'Termin anfragen', href: '/termin/', primary: true }, { label: 'Andere Frage', to: 'menu' }] }])),
  },
  intents: ANSWERS.map((x, i) => ({ k: x.k, to: 'a' + i })),
}
const X = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></svg>'
const widgets = `
<div class="cw" data-chat>
  <button class="cw-backdrop" type="button" aria-label="Chat schließen" data-chat-close tabindex="-1"></button>
  <div class="cw-panel" id="chat-panel" role="dialog" aria-label="Chat mit Antworten aus dieser Website" inert>
    <div class="cw-grip" aria-hidden="true"><span></span></div>
    <div class="cw-head">
      <img class="cw-avatar" src="/img/pamela-avatar.webp" width="34" height="34" alt="">
      <div class="cw-head-text"><p class="cw-names">${P.name}</p><p class="cw-status"><span class="cw-status-dot" aria-hidden="true"></span>Antworten sofort, aus dieser Website</p></div>
      <button class="cw-close" type="button" aria-label="Schließen" data-chat-close>${X}</button>
    </div>
    <div class="cw-thread" aria-live="polite"></div>
    <div class="cw-chips" role="group" aria-label="Vorschläge"></div>
    <div class="cw-foot-cta"><a class="cw-cta" href="/termin/">Termin anfragen</a></div>
    <form class="cw-composer"><input name="q" type="text" autocomplete="off" maxlength="200" placeholder="Frage schreiben…" aria-label="Nachricht"><button class="cw-send" type="submit" aria-label="Senden"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg></button></form>
    <p class="cw-note">Automatische Antworten, kein Live-Gespräch. In akuten Krisen: Telefonseelsorge 0800 111 0 111 oder Notruf 112.</p>
  </div>
  <button class="cw-launcher" type="button" aria-expanded="false" aria-controls="chat-panel">
    <span class="cw-launcher-face" aria-hidden="true"><img src="/img/pamela-avatar.webp" width="42" height="42" alt="" loading="lazy" decoding="async"><i></i></span>
    <span class="cw-launcher-mark" aria-hidden="true"><svg class="cw-ico" viewBox="0 0 20 20"><path d="M10 3.200c-4.100 0-7.300 2.800-7.300 6.400 0 1.900.9 3.600 2.400 4.800l-.6 2.900 3.200-1.500c.7.200 1.500.3 2.300.3 4.100 0 7.300-2.800 7.300-6.500S14.100 3.200 10 3.200z"/><circle cx="6.900" cy="9.700" r=".95"/><circle cx="10" cy="9.700" r=".95"/><circle cx="13.100" cy="9.700" r=".95"/></svg></span>
    <span class="cw-launcher-text"><span>Haben Sie Fragen?</span><small>Antworten sofort</small></span>
    <span class="cw-launcher-x" aria-hidden="true">${X}</span>
  </button>
  <script type="application/json" id="chat-data">${JSON.stringify(CHAT)}</script>
</div>
<nav class="dock" data-dock aria-label="Schnellzugriff">
  <a href="tel:${P.tel}" aria-label="Anrufen"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6.6 3.2 4.4 3.6a1 1 0 0 0-.8 1.1c.5 6.200 5.500 11.200 11.700 11.700a1 1 0 0 0 1.100-.8l.4-2.200a1 1 0 0 0-.6-1.100l-2.400-1a1 1 0 0 0-1.100.3l-.9 1.100a8 8 0 0 1-4.500-4.500l1.100-.9a1 1 0 0 0 .3-1.100l-1-2.400a1 1 0 0 0-1.100-.6z"/></svg></a>
  <button type="button" data-loc-open aria-label="Standort anzeigen" aria-controls="standort">${PIN}</button>
  <a class="dock-main" href="/termin/">Termin anfragen</a>
</nav>
<div class="loc" data-loc>
  <button class="loc-pill" type="button" data-loc-open aria-expanded="false" aria-controls="standort">${PIN}<span>Standort</span></button>
  <section class="loc-card" id="standort" hidden aria-label="Standort der Praxis">
    <button class="loc-x" type="button" data-loc-close aria-label="Schließen">${X}</button>
    <div class="loc-map" data-loc-map><button class="loc-load" type="button" data-loc-load data-src="${MAPS_EMBED}">${PIN}<b>Karte laden</b></button></div>
    <div class="loc-body">
      <h2>${P.practice}, ${P.name}</h2>
      <p class="loc-addr">${PIN}<span>${P.street}, ${P.zip} ${P.city}</span></p>
      <div class="loc-acts">
        <a class="btn primary" href="${MAPS_ROUTE}" target="_blank" rel="noopener"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M17 3 3.500 8.600l5.600 2.300 2.300 5.600z"/></svg>Route</a>
        <a class="btn" href="tel:${P.tel}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6.6 3.2 4.4 3.6a1 1 0 0 0-.8 1.1c.5 6.200 5.500 11.200 11.700 11.700a1 1 0 0 0 1.100-.8l.4-2.200a1 1 0 0 0-.6-1.100l-2.400-1a1 1 0 0 0-1.100.3l-.9 1.100a8 8 0 0 1-4.500-4.500l1.100-.9a1 1 0 0 0 .3-1.100l-1-2.400a1 1 0 0 0-1.100-.6z"/></svg>Anrufen</a>
        <a class="btn loc-wide" href="${GMAPS}" target="_blank" rel="noopener">In Google Maps öffnen</a>
      </div>
      <p class="loc-note">Beim Laden der Karte wird eine Verbindung zu Google hergestellt.</p>
    </div>
  </section>
</div>
<dialog class="sheet" id="kontakt-wahl" aria-labelledby="kw-titel">
  <div class="sheet-in" tabindex="-1" autofocus>
    <div class="sheet-grip" aria-hidden="true"><span></span></div>
    <button class="sheet-x" type="button" data-sheet-close aria-label="Schließen">${X}</button>
    <h2 id="kw-titel">Termin anfragen</h2>
    <p class="sheet-lead">Das Erstgespräch ist kostenfrei und dauert etwa 30 Minuten. Wie möchten Sie sich melden?</p>
    <a class="pick is-main" data-sheet-form href="/termin/"><span><b>Kurz ausfüllen</b><small>Fünf Fragen, etwa eine Minute. Sie erhalten einen Terminvorschlag.</small></span></a>
    <a class="pick" href="tel:${P.tel}"><span><b>Anrufen</b><small>${P.phone}, bitte auf den Anrufbeantworter sprechen</small></span></a>
    <a class="pick" href="mailto:${P.mail}"><span><b>E-Mail schreiben</b><small>${P.mail}</small></span></a>
  </div>
</dialog>
<section class="consent" data-consent hidden aria-labelledby="consent-titel">
  <h2 id="consent-titel"><i aria-hidden="true"></i>Ihre Privatsphäre</h2>
  <p>Notwendige Speicher halten diese Seite am Laufen. Statistik gibt es nur mit Ihrer Zustimmung: anonym, ohne Cookies, ohne Werbung, ohne Profil. <a href="/datenschutz/">Datenschutz</a></p>
  <div class="consent-opts" hidden>
    <label><span><b>Notwendig</b><small>Merkt sich Ihre Auswahl. Immer aktiv.</small></span><input type="checkbox" checked disabled aria-label="Notwendig"></label>
    <label><span><b>Statistik</b><small>Anonyme Besuchszahlen. Derzeit ist kein Dienst eingebunden.</small></span><input type="checkbox" data-consent-stats aria-label="Statistik"></label>
  </div>
  <button class="btn consent-more" type="button" data-consent-more>Einstellungen</button>
  <div class="consent-foot"><button class="btn" type="button" data-consent-set="necessary">Ablehnen</button><button class="btn" type="button" data-consent-set="all">Akzeptieren</button></div>
</section>`


const layout = p => `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.desc)}">
${p.noindex ? '<meta name="robots" content="noindex, follow">' : `<link rel="canonical" href="${ORIGIN}${p.path}">`}
<meta property="og:type" content="${p.ogType || 'website'}">
<meta property="og:locale" content="de_DE">
<meta property="og:site_name" content="${P.name}">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.desc)}">
<meta property="og:url" content="${ORIGIN}${p.path}">
<meta property="og:image" content="${ORIGIN}/img/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${P.name}, systemische und traumasensible Therapie in ${P.city}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(p.title)}">
<meta name="twitter:description" content="${esc(p.desc)}">
<meta name="twitter:image" content="${ORIGIN}/img/og.jpg">
<meta name="geo.region" content="DE-BY">
<meta name="geo.placename" content="${P.city}">
<meta name="theme-color" content="#F8F6EE">
<meta name="color-scheme" content="light">
<link rel="icon" href="/favicon.ico?v=4" sizes="32x32">
<link rel="icon" href="/favicon.png?v=4" type="image/png" sizes="48x48">
<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=4">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/fonts/Geist-VF-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/GeistSerif-VF.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/styles.css">
<script>(function(d){d.classList.add('js');var t='light';try{t=localStorage.getItem('zt-theme')||'light'}catch(e){}d.dataset.themeChoice=t;d.dataset.theme=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';if(d.dataset.theme==='dark'){var m=document.querySelector('meta[name=theme-color]');if(m)m.content='#121814'}})(document.documentElement)</script>
<script type="speculationrules">{"prerender":[{"where":{"and":[{"href_matches":"/*"},{"not":{"href_matches":"/downloads/*"}},{"not":{"href_matches":"/api/*"}}]},"eagerness":"moderate"}]}</script>
${(p.ld || []).map(ld).join('\n')}
</head>
<body${p.bodyClass ? ` class="${p.bodyClass}"` : ''}>
<a class="skip" href="#inhalt">Zum Inhalt springen</a>
<header class="top"><div class="wrap top-row">
  ${brand}
  <nav class="nav" aria-label="Hauptnavigation">${NAV.map(([h, t]) => `<a href="${h}"${current(p, h) ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
  <a class="btn primary sm" href="/termin/">Termin anfragen</a>
  <a class="flow-close" href="/" aria-label="Anfrage schließen und zur Startseite"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg></a>
  <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menue" aria-label="Menü öffnen"><span></span><span></span></button>
</div>
<div class="drawer" id="menue"><div><nav class="wrap drawer-nav" aria-label="Menü">
  ${NAV.map(([h, t], i) => `<a class="drawer-link" style="--n:${i}" href="${h}"${current(p, h) ? ' aria-current="page"' : ''}><span>${t}</span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 10h11M11 5.500l4.500 4.500L11 14.500"/></svg></a>`).join('')}
  <div class="drawer-acts" style="--n:${NAV.length}"><a class="btn primary" href="/termin/">Termin anfragen</a><a class="btn" href="tel:${P.tel}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6.6 3.2 4.4 3.6a1 1 0 0 0-.8 1.100c.5 6.200 5.500 11.200 11.700 11.700a1 1 0 0 0 1.100-.8l.4-2.200a1 1 0 0 0-.6-1.100l-2.400-1a1 1 0 0 0-1.100.3l-.9 1.100a8 8 0 0 1-4.500-4.500l1.100-.9a1 1 0 0 0 .3-1.100l-1-2.400a1 1 0 0 0-1.100-.6z"/></svg>Anrufen</a><a class="btn" href="mailto:${P.mail}"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.500" y="4.500" width="15" height="11" rx="2"/><path d="M3 6l7 5.200L17 6"/></svg>E-Mail</a></div>
  <div class="drawer-foot" style="--n:${NAV.length + 1}">
    <a class="drawer-place" href="${GMAPS}" target="_blank" rel="noopener"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 17.800s5.600-4.900 5.600-9.300a5.600 5.600 0 0 0-11.200 0c0 4.400 5.600 9.300 5.600 9.300z"/><circle cx="10" cy="8.500" r="2"/></svg><span>${P.practice}<br>${P.street}, ${P.zip} ${P.city}</span></a>
    <div class="theme" role="group" aria-label="Darstellung">
      <button type="button" data-theme-set="light" aria-label="Hell"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="3.2"/><path d="M10 2.500v2M10 15.500v2M2.500 10h2M15.500 10h2M4.700 4.700l1.400 1.400M13.900 13.900l1.400 1.400M4.700 15.300l1.400-1.400M13.900 6.100l1.400-1.400"/></svg></button>
      <button type="button" data-theme-set="dark" aria-label="Dunkel"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16 11.600A6.600 6.600 0 0 1 8.400 4a6.600 6.600 0 1 0 7.600 7.600z"/></svg></button>
    </div>
  </div>
</nav></div></div>
</header>
<button class="scrim" type="button" data-menu-close aria-label="Menü schließen" tabindex="-1"></button>
<main id="inhalt">${p.body}
</main>
<footer class="foot"><div class="wrap">
  ${brand}
  <p class="foot-lead">Systemische und traumasensible Begleitung für Einzelne, Paare, Eltern und Jugendliche: in Landsberg am Lech, online und als Walk and Talk.</p>
  <a class="g-badge on-deep" href="/#stimmen">${G}<span><b>Google-Rezensionen</b><small>5,0 von 5 Sternen</small></span></a>
  <div class="cols">
    ${FOOT.map(([t, links]) => `<nav aria-label="${t}"><h3>${t}</h3><ul>${links.map(([h, n]) => `<li><a href="${h}">${n}</a></li>`).join('')}</ul></nav>`).join('')}
    <div><h3>Praxis</h3><ul><li>${P.practice}</li><li>${P.street}</li><li>${P.zip} ${P.city}</li><li><a href="${MAPS}" rel="noopener">Auf der Karte ansehen</a></li></ul></div>
    <div><h3>Kontakt</h3><ul><li><a href="tel:${P.tel}">${P.phone}</a></li><li><a href="mailto:${P.mail}">${P.mail}</a></li><li><a href="/termin/">Termin anfragen</a></li></ul></div>
  </div>
  <div class="fine">
    <p>Während der bayerischen Schulferien ist die Praxis nicht besetzt. Einzugsgebiet: ${P.areas.join(', ')} und Umgebung, online auch in Österreich und der Schweiz.</p>
    <p>Der Chat beantwortet allgemeine Fragen mit festen Texten dieser Website und ersetzt keine Beratung. Die Rezensionen sind Auszüge aus öffentlichen Google-Bewertungen.</p>
    <p>In akuten Krisen: Telefonseelsorge rund um die Uhr unter 0800 111 0 111, Notruf 112.</p>
  </div>
  <div class="foot-end">
    <p>© ${new Date().getFullYear()} ${P.name}</p>
    <div class="foot-legal"><a href="/impressum/">Impressum</a><a href="/datenschutz/">Datenschutz</a><button type="button" data-consent-open>Cookie-Einstellungen</button></div>
    <div class="theme" role="group" aria-label="Darstellung">
      <button type="button" data-theme-set="light" aria-label="Hell"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="3.2"/><path d="M10 2.500v2M10 15.500v2M2.500 10h2M15.500 10h2M4.700 4.700l1.400 1.400M13.900 13.900l1.400 1.400M4.700 15.300l1.400-1.400M13.900 6.100l1.400-1.400"/></svg></button>
      <button type="button" data-theme-set="system" aria-label="Wie das Gerät"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="4" width="14" height="9.500" rx="1.500"/><path d="M7.500 16.500h5M10 13.500v3"/></svg></button>
      <button type="button" data-theme-set="dark" aria-label="Dunkel"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16 11.600A6.600 6.600 0 0 1 8.400 4a6.600 6.600 0 1 0 7.600 7.600z"/></svg></button>
    </div>
  </div>
</div></footer>
${p.bodyClass ? '' : widgets}
<script src="/site.js" defer></script>
</body>
</html>
`

const write = (rel, text) => { const f = join(OUT, rel); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, text) }
for (const p of pages) write(p.file || join(p.path, 'index.html'), layout(p))

const indexed = pages.filter(p => !p.noindex)
const today = new Date().toISOString().slice(0, 10)
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexed.map(p => `  <url><loc>${ORIGIN}${p.path}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`)
write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${ORIGIN}/sitemap.xml\n`)
write('site.webmanifest', JSON.stringify({ name: P.name, short_name: 'Zurbuchen', start_url: '/', display: 'browser', background_color: '#F8F6EE', theme_color: '#5E7B53', icons: [{ src: '/img/icon-512.png', sizes: '512x512', type: 'image/png' }] }))
// Für KI-Suchsysteme: die Fakten der Praxis in einer lesbaren Datei.
write('llms.txt', `# ${P.name}, ${P.practice}

> Systemische und traumasensible Einzel- und Paartherapie, Jugendcoaching und Erziehungsberatung in ${P.city}, online und als Walk and Talk.

- Wer: ${P.name}, systemische und traumasensible Therapeutin und Coach, Dipl. Sozialpädagogin (FH), seit über 18 Jahren selbstständig
- Wo: ${ADDRESS}; online deutschlandweit, Österreich und Schweiz
- Einzugsgebiet: ${P.areas.join(', ')} und Umgebung
- Kosten: ${PRICES.map(([t, p, s]) => `${t} ${p} (${s.split(',')[0]})`).join(', ')}
- Kontakt: ${P.phone}, ${P.mail}
- Termin anfragen: ${ORIGIN}/termin/

## Seiten
${indexed.map(p => `- [${p.title.split(' | ')[0]}](${ORIGIN}${p.path}): ${p.desc}`).join('\n')}
`)
console.log(`${pages.length} Seiten nach ${OUT}`)
