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
// Standort: Google Maps. Die Karte selbst lädt erst nach einem Klick, vorher geht keine Anfrage an Google.
const MAPS_Q = encodeURIComponent(`${P.practice} ${P.name}, ${P.street}, ${P.zip} ${P.city}`)
const MAPS = 'https://www.google.com/maps/search/?api=1&query=' + MAPS_Q
const MAPS_ROUTE = 'https://www.google.com/maps/dir/?api=1&destination=' + MAPS_Q
const MAPS_EMBED = 'https://www.google.com/maps?q=' + MAPS_Q + '&hl=de&z=16&output=embed'
const PIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.500s7-6 7-11.500a7 7 0 0 0-14 0c0 5.500 7 11.500 7 11.500z"/><circle cx="12" cy="10" r="2.600"/></svg>'
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
const portrait = (name, sizes, alt, w, h, caption = '') => `<figure class="portrait rv"><div class="frame">${picture(name, sizes, alt, w, h, 'fetchpriority="high" decoding="async"')}</div>${caption && `<figcaption><b>${caption.split('|')[0]}</b><span>${caption.split('|')[1]}</span></figcaption>`}</figure>`
const mark = `<img class="mark" src="/img/logo-512.webp" width="512" height="512" alt="" loading="lazy" decoding="async">`
const nameOf = d => d.name.replace('Kommunikationstraining', 'Kommunikations&shy;training').replace('Erziehungsberatung', 'Erziehungs&shy;beratung')
const card = (d, i = 0, goWord = 'Mehr erfahren') => `<a class="card rv" style="--d:${i * 60}ms" href="${d.path}"><h3>${nameOf(d)}</h3><p>${inline(d.card || d.teaser)}</p><span class="go">${goWord}</span></a>`
const book = (thema, cls = 'primary', label = 'Termin anfragen') => `<a class="btn ${cls}" href="/termin/${thema ? '?thema=' + thema : ''}">${label}</a>`

const PRICES = [['Erstgespräch', 'kostenfrei', 'ca. 30 Minuten, zum gegenseitigen Kennenlernen'], ['Einzelsitzung', '100 €', '60 Minuten'], ['Paargespräch', '180 €', '90 Minuten'], ['Jugendcoaching', '100 €', '60 Minuten'], ['Erziehungsberatung', '100 €', '60 Minuten'], ['Onlineberatung', '100 €', '60 Minuten']]
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
const RATE = `${G}<b>5,0</b>${STARS}<i class="gb-sep" aria-hidden="true"></i><small>2 <span class="gb-x">Google-</span>Rezensionen</small>`
// Drei kleine Zeichnungen, die sich bewegen: Raum, Gehen, Bildschirm
const ART = {
  praxis: `<svg class="art" viewBox="0 0 240 150" aria-hidden="true"><path class="beam" d="M58 14h36l-26 114H22z"/><path class="ground" d="M16 128h208"/><g class="lamp"><path d="M176 128V52"/><path d="M160 52h32l-7-22h-18z"/><circle class="glow" cx="176" cy="62" r="26"/></g><path d="M40 128V92c0-8 6-14 14-14h26c8 0 14 6 14 14v36M34 104h66M40 128v8M94 128v8"/><path d="M118 128v-30c0-7 5-12 12-12h22c7 0 12 5 12 12v30M112 108h58"/><g class="cup"><path d="M139 86v-7h12v7"/><path class="steam s1" d="M143 74c-3-4 3-6 0-11"/><path class="steam s2" d="M148 74c-3-4 3-6 0-11"/></g><path class="leaf" d="M206 128v-24c0-10 6-16 14-18-2 10-6 16-14 18M206 112c-8-2-12-8-13-16 8 1 12 6 13 16"/></svg>`,
  walk: `<svg class="art" viewBox="0 0 240 150" aria-hidden="true"><path class="hill" d="M0 112c40-34 76-34 116-8s84 20 124-10"/><circle class="sun" cx="196" cy="38" r="12"/><g class="cloud"><path d="M20 30h30M28 24h16"/></g><g class="tree"><path d="M40 131v-34"/><path class="crown" d="M40 97c-12 0-18-9-18-19s8-20 18-20 18 10 18 20-6 19-18 19z"/></g><path class="ground run" d="M-40 132h320"/><g transform="translate(104 1)"><g class="walker"><path class="arm a" d="M0 73l-3 12 2 10"/><g class="leg a"><path d="M0 100v15"/><g class="shin"><path d="M0 115v15h5"/></g></g><g class="leg b"><path d="M0 100v15"/><g class="shin"><path d="M0 115v15h5"/></g></g><path class="coat" d="M-7 69c4-3 10-3 14 0l3 33h-20z"/><circle class="head" cx="0" cy="56" r="8"/><path class="arm b" d="M0 73l-3 12 2 10"/></g></g><g class="w2" transform="translate(140 14) scale(.9)"><g class="walker"><path class="arm a" d="M0 73l-3 12 2 10"/><g class="leg a"><path d="M0 100v15"/><g class="shin"><path d="M0 115v15h5"/></g></g><g class="leg b"><path d="M0 100v15"/><g class="shin"><path d="M0 115v15h5"/></g></g><path class="coat" d="M-7 69c4-3 10-3 14 0l3 33h-20z"/><circle class="head" cx="0" cy="56" r="8"/><path class="arm b" d="M0 73l-3 12 2 10"/></g></g></svg>`,
  online: `<svg class="art" viewBox="0 0 240 150" aria-hidden="true"><rect x="52" y="30" width="136" height="86" rx="8"/><path d="M36 128h168M104 116l-4 12M136 116l4 12"/><circle cx="120" cy="64" r="11"/><path d="M98 100c2-12 10-18 22-18s20 6 22 18"/><g class="bubble b1"><rect x="150" y="14" width="46" height="26" rx="10"/><path d="M162 27h22"/></g><g class="bubble b2"><rect x="44" y="52" width="40" height="24" rx="10"/><path d="M54 64h20"/></g><circle class="live" cx="178" cy="44" r="3"/><path class="wave w1" d="M204 70c6 6 6 16 0 22"/><path class="wave w2" d="M212 62c10 10 10 28 0 38"/></svg>`,
}

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

const glance = `
<dl class="dl rv">
  <div><dt>Wer</dt><dd>${P.name}, systemische und traumasensible Therapeutin und Coach, Dipl. Sozialpädagogin (FH), seit über 18 Jahren selbstständig</dd></div>
  <div><dt>Angebot</dt><dd>${services.map(s => `<a class="link" href="${s.path}">${s.name}</a>`).join(', ')}</dd></div>
  <div><dt>Wo</dt><dd>${ADDRESS}, sowie online und als Walk and Talk<br><a class="link" href="${MAPS}" rel="noopener">Auf der Karte ansehen</a></dd></div>
  <div><dt>Einzugsgebiet</dt><dd>${P.areas.join(', ')} und Umgebung; online deutschlandweit, Österreich und Schweiz</dd></div>
  <div><dt>Telefon</dt><dd><a class="link" href="tel:${P.tel}">${P.phone}</a><br>Bitte auf den Anrufbeantworter sprechen, ich rufe zurück.</dd></div>
  <div><dt>E-Mail</dt><dd><a class="link" href="mailto:${P.mail}">${P.mail}</a></dd></div>
  <div><dt>Schulferien</dt><dd>Während der bayerischen Schulferien ist die Praxis nicht besetzt. Nach den Ferien melde ich mich, so schnell es mir möglich ist.</dd></div>
</dl>`

const COURSES = [
  ['Eltern sein, Paar bleiben', 'Seitdem die Kinder da sind, ist alles anders? Streit nimmt zu, die Liebe ab? Dann lade ich herzlich zu diesem Paar-Seminar ein.', 'Wochenendseminar, maximal 3 Paare', '/downloads/eltern-sein-paar-bleiben.pdf'],
  ['Schritt für Schritt als Eltern fit', 'Mehr Gelassenheit und Ruhe im Erziehungsalltag. Das Elterntraining hilft, ein kooperatives und konfliktärmeres Zusammenleben in der Familie zu entwickeln.', 'Wochenendseminar im ZeitRaum, maximal 8 Personen', '/downloads/schritt-fuer-schritt-als-eltern-fit.pdf'],
  ['Schritt für Schritt als Eltern fit, online', 'Dasselbe Elterntraining als Online-Kurs, von zu Hause aus.', 'Online-Kurs, 10 Treffen, maximal 6 Personen', '/downloads/schritt-fuer-schritt-als-eltern-fit-online.pdf'],
  ['Gruppe für Trennungs- und Scheidungskinder', 'In dem Gruppenangebot wird Kindern der Raum und die Möglichkeit gegeben, mit der Scheidung oder Trennung ihrer Eltern besser zurechtzukommen.', 'Für Kinder von 8 bis 10 Jahren, 10 Treffen, maximal 4 Kinder', '/downloads/gruppe-trennungs-und-scheidungskinder.pdf'],
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
<section class="hero"><div class="wrap hero-grid">
  <div>
    <h1 class="glass">${glass('Systemische und traumasensible Therapie in Landsberg am&nbsp;Lech')}</h1>
    <p class="lead rv" style="--d:80ms">Für Einzelne, Paare, Eltern und Jugendliche: in der Praxis, online oder im Gehen.</p>
    <form class="quick rv" style="--d:160ms" action="/termin/" method="get" aria-label="Termin anfragen">
      <p class="quick-line">Ich suche <label><span class="sr">Anliegen</span><select name="thema"><option value="einzeltherapie">eine Einzeltherapie</option><option value="paartherapie">eine Paartherapie</option><option value="jugendcoaching">ein Jugendcoaching</option><option value="erziehungsberatung">eine Erziehungsberatung</option><option value="kurs">einen Kurs oder ein Training</option><option value="offen">erst einmal Orientierung</option></select></label>, am liebsten <label><span class="sr">Form</span><select name="ort"><option value="praxis">in der Praxis</option><option value="online">online</option><option value="walk">beim Walk and Talk</option><option value="egal">egal wo</option></select></label> und <label><span class="sr">Wunschzeit</span><select name="zeit"><option value="vormittags">vormittags</option><option value="nachmittags">nachmittags</option><option value="abends">am frühen Abend</option><option value="flexibel">zeitlich flexibel</option></select></label>.</p>
      <div class="quick-foot"><button class="btn primary" type="submit">Termin anfragen</button><span class="small">Kostenfreies Erstgespräch, etwa 30 Minuten</span></div>
    </form>
  </div>
  ${portrait('pamela-zurbuchen', [992, 640], 'Pamela Zurbuchen, systemische und traumasensible Therapeutin in Landsberg am Lech', 992, 1240, `${P.name}|Dipl. Sozialpädagogin (FH), systemische Therapeutin (IFW)`)}
</div></section>

<section class="trust-strip"><div class="wrap">
  <a class="g-badge rv" href="#stimmen" aria-label="Google-Bewertungen: 5,0 von 5 Sternen, 2 Rezensionen">${RATE}</a>
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
  <div class="grid g4">${services.slice(0, 4).map((s, i) => `<a class="item rv" style="--d:${i * 60}ms" href="${s.path}"><h3>${nameOf(s)}</h3><p>${inline(s.card)}</p></a>`).join('')}</div>
  <p class="also rv">Außerdem: ${services.slice(4).map(s => `<a class="link" href="${s.path}">${s.name}</a>`).join(', ')}</p>
</div></section>

<section class="section"><div class="wrap">
  <div class="head rv"><h2>So beginnt es</h2></div>
  ${steps()}
</div></section>

<section class="section"><div class="wrap">
  <div class="head rv"><h2>Sie entscheiden, was Ihnen guttut</h2></div>
  <div class="grid g3 ways">
    <div class="way rv"><div class="scene">${ART.praxis}<button class="hs" type="button" data-i="0" style="left:86%;top:64%" aria-label="Kleine Überraschung"></button></div><h3>In der Praxis</h3><p>${ADDRESS}</p></div>
    <div class="way rv" style="--d:90ms"><div class="scene">${ART.walk}<button class="hs" type="button" data-i="1" style="left:82%;top:25%" aria-label="Kleine Überraschung"></button></div><h3>Walk and Talk</h3><p>Im Gehen kommt vieles in Fluss und es unterhält sich ungezwungener.</p></div>
    <div class="way rv" style="--d:180ms"><div class="scene">${ART.online}<button class="hs" type="button" data-i="2" style="left:88%;top:53%" aria-label="Kleine Überraschung"></button></div><h3>Online</h3><p>Deutschlandweit sowie für Klienten aus Österreich und der Schweiz.</p></div>
  </div>
  <p class="secret" data-secret aria-live="polite"><span></span><span></span><span></span></p>
</div></section>

<section class="section tinted" id="stimmen"><div class="wrap">
  <div class="rev-head rv"><h2>Was Menschen über die Begleitung sagen</h2><p class="g-badge g-still">${RATE}</p></div>
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
    <a class="tile tile-deep rv" href="/kurse/">${mark}<span class="tile-kind">Kurse und Seminare</span><h3>Für Eltern, Paare und Kinder</h3><p>Eltern sein, Paar bleiben. Schritt für Schritt als Eltern fit. Gruppe für Trennungs- und Scheidungskinder.</p><span class="tile-go">Alle Kurse ansehen</span></a>
    <a class="tile rv" style="--d:80ms" href="/kurse/die-friedensstifter/"><span class="tile-kind">Für Lehrkräfte und Schulen</span><h3>Die Friedensstifter</h3><p>Persönlich begleiteter Kommunikationskurs, online oder vor Ort.</p><span class="tile-go">Zum Kurs</span></a>
    <a class="tile tile-blush rv" style="--d:160ms" href="/blog/"><span class="tile-kind">Blog</span><h3>Gedanken zum Elternsein</h3><p>Was Kinder stärkt und wie Eltern ihren Weg finden.</p><span class="tile-go">Weiterlesen</span></a>
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

for (const s of services) {
  pages.push({
    path: s.path, title: s.title, desc: s.desc,
    ld: [crumbs(['Angebot', '/angebot/'], [s.name, s.path]), { '@context': 'https://schema.org', '@type': 'Service', name: s.name, description: s.desc, url: ORIGIN + s.path, provider: { '@id': ORIGIN + '/#praxis' }, areaServed: P.areas.concat(['Deutschland', 'Österreich', 'Schweiz']) }],
    body: `
<section class="page-hero"><div class="wrap">
  <p class="small crumb rv"><a class="link" href="/angebot/">Angebot</a></p>
  <h1 class="glass">${glass(s.h1)}</h1>
  <p class="lead rv" style="--d:260ms">${s.lead}</p>
</div></section>
<section class="section"><div class="wrap with-aside">
  <div class="prose">${md(s.body)}</div>
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
<section class="section"><div class="wrap split">
  <div class="rv"><h2>Was mich ausmacht</h2><figure class="side-photo">${picture('pamela-zurbuchen', [992, 640], 'Pamela Zurbuchen in der Natur', 992, 1240)}</figure></div>
  <div class="prose">${md(`Ich liebe tiefgründige Gespräche. Lache gerne und bin viel in der Natur. Meine feinen Antennen begleiten mich schon mein ganzes Leben und bereichern mich und meine Arbeit.

### Das macht mich glücklich

- Gute Bücher (egal ob Fachbuch oder Roman)
- Reisen
- Kraftorte
- Fortbildungen
- Inspirierende Gespräche

### Was ich nicht mag

- Respektlosigkeit gegenüber Mensch und Natur
- Schubladendenken
- Small-Talk`)}</div>
</div></section>
<section class="section"><div class="wrap split">
  <div class="rv"><h2>Meine Einstellung</h2></div>
  <div class="prose">${md(`- Es gibt immer einen Weg.
- Veränderung ist jederzeit möglich.
- Schaue auf das ganze System und hinter die Kulissen, damit Du verstehen kannst.
- Jeder Mensch, jedes System hat seine ganz individuellen Lösungsansätze.
- Es gibt nicht nur „Schwarz oder Weiß“: in der Mitte ist es bunt.
- Ich weiß, dass ich nichts weiß, deshalb forsche ich achtsam nach, um den anderen zu verstehen.`)}</div>
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
  desc: 'Kurse in Landsberg am Lech und online: Eltern sein, Paar bleiben. Schritt für Schritt als Eltern fit. Gruppe für Trennungs- und Scheidungskinder. Kommunikationskurs für Lehrkräfte.',
  ld: [crumbs(['Kurse', '/kurse/'])],
  body: `
<section class="page-hero"><div class="wrap">
  <h1 class="glass">${glass('Kurse und Seminare')}</h1>
  <p class="lead rv" style="--d:160ms">Für Eltern, Paare und Kinder, im ${P.practice} in Landsberg am Lech und online. Termine und Kursgebühr stehen im Kursblatt.</p>
</div></section>
<section class="section"><div class="wrap">
  <div class="rows">${COURSES.map(([t, text, meta, pdf]) => `
    <article class="row rv"><div><h2>${t}</h2><p class="small">${meta}</p></div><div><p>${text}</p><p class="row-links"><a class="link" href="${pdf}">Kursblatt als PDF</a><a class="link" href="/termin/?thema=kurs">Anfragen</a></p></div></article>`).join('')}
    <article class="row rv"><div><h2>Die Friedensstifter</h2><p class="small">Für Lehrkräfte und Schulen, 4 Monate, maximal 10 Personen</p></div><div><p>Persönlich begleiteter Kommunikationskurs: schwierige Eltern- und Schülergespräche souverän, gelassen und wertschätzend führen.</p><p class="row-links"><a class="link" href="/kurse/die-friedensstifter/">Zum Kurs</a></p></div></article>
  </div>
</div></section>
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
<section class="section"><div class="wrap with-toc">${toc(d.body)}<div class="prose">${md(d.body)}</div></div></section>
${isCourse ? cta(false, 'Kurs für Ihre Schule anfragen', 'Gerne berate ich Sie zu Ablauf, Terminen und Kosten.', 'kurs') : cta()}`,
  })
}

pages.push({
  path: '/blog/',
  title: 'Blog: Gedanken zum Elternsein | Pamela Zurbuchen',
  desc: 'Gedanken zum Elternsein von Pamela Zurbuchen: was es braucht, damit Kinder glücklich und gesund aufwachsen, und wie Eltern ihren eigenen Weg finden.',
  ld: [crumbs(['Blog', '/blog/'])],
  body: `
<section class="page-hero"><div class="wrap">
  <h1 class="glass">${glass('Gedanken zum Elternsein')}</h1>
  <p class="lead rv" style="--d:200ms">Was braucht es, damit Kinder und Menschen glücklich und gesund aufwachsen und bleiben? Hier teile ich, was ich dazu entdeckt, beobachtet und gelernt habe.</p>
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
      <img src="/img/logo-192.webp" width="192" height="192" alt="">
      <h2 data-done-title>Danke, Ihre Anfrage ist unterwegs.</h2>
      <p class="lead" data-done-text>Ich melde mich mit einem Terminvorschlag bei Ihnen. Während der bayerischen Schulferien kann es etwas länger dauern.</p>
      <div class="actions"><a class="btn primary" data-done-mail hidden href="mailto:${P.mail}">E-Mail öffnen</a><a class="btn" href="/">Zur Startseite</a></div>
    </section>
  </form>
  <div class="flow-nav"><button type="button" data-prev aria-label="Vorherige Frage">↑</button><button type="button" data-fwd aria-label="Nächste Frage">↓</button></div>
</section>`,
})

for (const d of docs.filter(d => d.type === 'legal')) {
  pages.push({ path: d.path, title: d.title, desc: d.desc, noindex: true, body: `
<section class="page-hero"><div class="wrap"><h1 class="glass">${glass(d.h1)}</h1></div></section>
<section class="section"><div class="wrap"><div class="prose">${md(d.body)}</div></div></section>` })
}

pages.push({ path: '/404', file: '404.html', title: 'Seite nicht gefunden | Pamela Zurbuchen', desc: 'Diese Seite gibt es nicht.', noindex: true, body: `
<section class="lost"><div class="wrap">
  <img class="lost-mark" src="/img/logo-512.webp" width="512" height="512" alt="">
  <h1 class="glass">${glass('Hier geht es nicht weiter.')}</h1>
  <p class="lead">Die Seite wurde verschoben oder es gab sie nie. Von der Startseite aus finden Sie alles wieder.</p>
  <div class="actions"><a class="btn primary" href="/">Zur Startseite</a><a class="btn" href="/angebot/">Zum Angebot</a><a class="btn" href="/kontakt/">Kontakt</a></div>
</div></section>` })

// ── Hülle
const FOOT = [
  ['Angebot', services.map(s => [s.path, s.name])],
  ['Mehr', [['/ueber-mich/', 'Über mich'], ['/kurse/', 'Kurse'], ['/kurse/die-friedensstifter/', 'Die Friedensstifter'], ['/preise/', 'Preise'], ['/blog/', 'Blog'], ['/kontakt/', 'Kontakt'], ['/termin/', 'Termin anfragen']]],
]
const SLOGAN = 'Systemische und traumasensible Einzel- und Paartherapie'
const brand = `<a class="brand" href="/" aria-label="${P.name}, Startseite"><img src="/img/logo-96.webp" width="96" height="96" alt=""><span class="brand-text"><b>${P.name}</b><small>${SLOGAN}</small></span></a>`
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
    <span class="cw-launcher-mark" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M3 3.5h10a.5.5 0 0 1 .5.5v6.5a.5.5 0 0 1-.5.5H8.5L5.5 13.5V11H3a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z"/></svg></span>
    <span class="cw-launcher-text"><span>Fragen?</span><small>Antworten sofort</small></span>
    <span class="cw-launcher-x" aria-hidden="true">${X}</span>
  </button>
  <script type="application/json" id="chat-data">${JSON.stringify(CHAT)}</script>
</div>
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
        <a class="btn loc-wide" href="${MAPS}" target="_blank" rel="noopener">In Google Maps öffnen</a>
      </div>
      <p class="loc-note">Beim Laden der Karte wird eine Verbindung zu Google hergestellt.</p>
    </div>
  </section>
</div>
<dialog class="sheet" id="kontakt-wahl" aria-labelledby="kw-titel">
  <div class="sheet-in">
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
<meta name="theme-color" content="#F8F4EF">
<meta name="color-scheme" content="light dark">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.png" type="image/png" sizes="48x48">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/fonts/Geist-VF-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/GeistSerif-VF.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/styles.css">
<script>(function(d){d.classList.add('js');var t='light';try{t=localStorage.getItem('zt-theme')||'light'}catch(e){}d.dataset.themeChoice=t;d.dataset.theme=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'})(document.documentElement)</script>
<script type="speculationrules">{"prerender":[{"where":{"and":[{"href_matches":"/*"},{"not":{"href_matches":"/downloads/*"}},{"not":{"href_matches":"/api/*"}}]},"eagerness":"moderate"}]}</script>
${(p.ld || []).map(ld).join('\n')}
</head>
<body${p.bodyClass ? ` class="${p.bodyClass}"` : ''}>
<a class="skip" href="#inhalt">Zum Inhalt springen</a>
<header class="top"><div class="wrap top-row">
  ${brand}
  <nav class="nav" aria-label="Hauptnavigation">${NAV.map(([h, t]) => `<a href="${h}"${current(p, h) ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
  <a class="btn primary sm" href="/termin/">Termin anfragen</a>
  <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menue" aria-label="Menü öffnen"><span></span><span></span></button>
</div>
<div class="drawer" id="menue"><div><nav class="wrap drawer-nav" aria-label="Menü">
  ${NAV.map(([h, t], i) => `<a class="drawer-link" style="--n:${i}" href="${h}"${current(p, h) ? ' aria-current="page"' : ''}>${t}</a>`).join('')}
  <div class="drawer-acts" style="--n:${NAV.length}"><a class="btn primary" href="/termin/">Termin anfragen</a><a class="btn" href="tel:${P.tel}">Anrufen</a><a class="btn" href="mailto:${P.mail}">E-Mail</a></div>
  <p class="small" style="--n:${NAV.length + 1}">${ADDRESS}</p>
</nav></div></div>
</header>
<button class="scrim" type="button" data-menu-close aria-label="Menü schließen" tabindex="-1"></button>
<main id="inhalt">${p.body}
</main>
<footer class="foot"><img class="foot-mark" src="/img/logo-512.webp" width="512" height="512" alt="" loading="lazy" decoding="async"><div class="wrap">
  ${brand}
  <p class="foot-lead">Systemische und traumasensible Begleitung für Einzelne, Paare, Eltern und Jugendliche: in Landsberg am Lech, online und als Walk and Talk.</p>
  <a class="g-badge on-deep" href="/#stimmen" aria-label="Google-Bewertungen: 5,0 von 5 Sternen, 2 Rezensionen">${RATE}</a>
  <div class="cols">
    ${FOOT.map(([t, links]) => `<nav aria-label="${t}"><h3>${t}</h3><ul>${links.map(([h, n]) => `<li><a href="${h}">${n}</a></li>`).join('')}</ul></nav>`).join('')}
    <div><h3>Praxis</h3><ul><li>${P.practice}</li><li>${P.street}</li><li>${P.zip} ${P.city}</li><li><a href="${MAPS}" rel="noopener">Auf der Karte ansehen</a></li></ul></div>
    <div><h3>Kontakt</h3><ul><li><a href="tel:${P.tel}">${P.phone}</a></li><li><a href="mailto:${P.mail}">${P.mail}</a></li><li><a href="/termin/">Termin anfragen</a></li></ul></div>
  </div>
  <div class="fine">
    <p>Das Erstgespräch ist kostenfrei und dauert etwa 30 Minuten. Eine Einzelsitzung kostet 100 € für 60 Minuten, ein Paargespräch 180 € für 90 Minuten. Termine können bis 72 Stunden vorher kostenfrei abgesagt werden; danach fällt ein Ausfallhonorar an. Bei finanziellem Engpass sind Sonderregelungen möglich.</p>
    <p>Während der bayerischen Schulferien ist die Praxis nicht besetzt. Einzugsgebiet: ${P.areas.join(', ')} und Umgebung; online deutschlandweit sowie in Österreich und der Schweiz.</p>
    <p>Der Chat auf dieser Website beantwortet allgemeine Fragen mit festen Texten aus den hier veröffentlichten Inhalten. Er ist kein Live-Gespräch und ersetzt keine Beratung. Die gezeigten Rezensionen sind Auszüge aus öffentlichen Google-Bewertungen.</p>
    <p>In akuten Krisen erreichen Sie die Telefonseelsorge rund um die Uhr unter 0800 111 0 111 und den Notruf unter 112.</p>
  </div>
  <div class="foot-end">
    <p>© ${new Date().getFullYear()} ${P.name}. Alle Rechte vorbehalten. <a href="/impressum/">Impressum</a> <a href="/datenschutz/">Datenschutz</a> <button type="button" data-consent-open>Cookie-Einstellungen</button></p>
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
write('site.webmanifest', JSON.stringify({ name: P.name, short_name: 'Zurbuchen', start_url: '/', display: 'browser', background_color: '#F8F4EF', theme_color: '#6F2039', icons: [{ src: '/img/icon-512.png', sizes: '512x512', type: 'image/png' }] }))
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
