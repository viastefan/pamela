// Nimmt Kontaktformular und Terminanfrage entgegen und verschickt zwei Mails über Resend (Absenderdomain festag.app):
// 1. an die Praxis: "Diese Person hat sich im Kontaktformular eingetragen" mit allen Angaben,
// 2. an die anfragende Person: Dank für den Eintrag, "wir melden uns in Kürze".
// Beide Mails kommen von "No Reply". Es gibt bewusst keine Antwortadresse (kein Reply-To) und keine Kopie an die Betreuung der Website:
// Antworten schreibt die Praxis selbst, manuell, aus ihrem eigenen Postfach.
// Umgebungsvariablen: RESEND_API_KEY und ANFRAGE_TO (Empfängerin) sind Pflicht, ANFRAGE_FROM (verifizierter Absender) ist optional.
// Fehlen die Pflichtangaben, antwortet die Funktion mit 503 und die Seite weicht auf das Mailprogramm aus. Gespeichert wird nichts.

const line = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max)
const text = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b-\u001f\u007f]+/g, ' ').trim().slice(0, max)
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const THEMA = { einzeltherapie: 'Einzeltherapie', paartherapie: 'Paartherapie', jugendcoaching: 'Jugendcoaching', erziehungsberatung: 'Erziehungsberatung', kurs: 'Kurs, Training oder Vortrag', offen: 'Noch unsicher' }
const ORT = { praxis: 'In der Praxis', online: 'Online', walk: 'Walk and Talk', egal: 'Egal' }
const ZEIT = { vormittags: 'Vormittags', nachmittags: 'Nachmittags', abends: 'Am frühen Abend', flexibel: 'Flexibel' }
const DEFAULT_FROM = 'Pamela Zurbuchen <noreply@festag.app>'
const PRAXIS = { name: 'Pamela Zurbuchen', phone: '0176-43 45 22 86', mail: 'zurbuchen-therapie@gmx.de', site: 'www.zurbuchen-therapie.de' }

const SITE = process.env.SITE_URL || 'https://pamela-festag.vercel.app'
const C = { bg: '#F8F6F2', card: '#FFFFFF', line: '#F0E4D8', ink: '#232B26', ink2: '#48514B', ink3: '#6B736D', brand: '#EE8640', brandInk: '#2A1708', tint: '#FDF1E6' }
// Eine ruhige Mail im Stil der Website. Bewusst ohne Bilder (viele Mailprogramme blockieren sie): Monogramm, Überschrift, Text, Angaben, Kontakt.
const FONT = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif", SERIF = "Georgia,'Times New Roman',serif"
const mail = ({ title, hello, intro, rows, foot, cta, next }) => `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"><title>${title}</title></head>
<body style="margin:0;background:${C.bg};padding:28px 14px;font:16px/1.6 ${FONT};color:${C.ink2}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(String(intro).replace(/<[^>]+>/g, ''))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin:0 auto"><tr><td style="padding:0 6px 18px">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="40" height="40" valign="top" align="center" style="width:40px;height:40px;border-radius:20px;background:${C.brand};color:${C.brandInk};font:400 21px/40px ${SERIF}">P</td><td style="padding-left:12px;vertical-align:middle;font:400 20px/1.2 ${SERIF};color:${C.ink}">${PRAXIS.name}<br><span style="font:12px/1.5 ${FONT};color:#B4500D">Systemische und traumasensible Einzel- und Paartherapie</span></td></tr></table>
</td></tr><tr><td style="background:${C.card};border-radius:14px;border:1px solid ${C.line};border-top:4px solid ${C.brand};padding:34px 32px 30px">
<h1 style="margin:0 0 18px;font:400 28px/1.2 ${SERIF};color:${C.ink};letter-spacing:-.01em">${title}</h1>
${hello ? `<p style="margin:0 0 6px;color:${C.ink}">${hello}</p>` : ''}<p style="margin:0 0 26px">${intro}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.tint};border-radius:10px"><tr><td style="padding:8px 20px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.map(([k, v], i) => `<tr><td style="padding:13px 16px 13px 0;${i ? `border-top:1px solid ${C.line};` : ''}font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:${C.ink3};vertical-align:top;white-space:nowrap;width:1%">${k}</td><td style="padding:13px 0;${i ? `border-top:1px solid ${C.line};` : ''}color:${C.ink};vertical-align:top;padding-left:8px">${esc(v).replace(/\n/g, '<br>')}</td></tr>`).join('')}</table>
</td></tr></table>
${next ? `<p style="margin:26px 0 0;color:${C.ink2}">${next}</p>` : ''}
${cta ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:26px"><tr><td bgcolor="${C.brand}" style="background:${C.brand};border-radius:9px"><a href="${cta[1]}" style="display:inline-block;padding:13px 26px;font:600 15px/1 ${FONT};color:${C.brandInk} !important;text-decoration:none !important;border-radius:9px"><span style="color:${C.brandInk};text-decoration:none">${cta[0]}</span></a></td></tr></table>` : ''}
</td></tr><tr><td style="padding:22px 8px 0;font-size:13px;line-height:1.6;color:${C.ink3}">${foot}</td></tr></table></body></html>`

// Höchstens acht Sekunden warten; bei einem Fehler nur den Status festhalten, keine Angaben der Person.
const send = (key, body) => fetch('https://api.resend.com/emails', {
  method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  signal: AbortSignal.timeout(8000),
}).then(r => { if (!r.ok) console.error('resend', r.status); return r.ok }, e => { console.error('resend', e && e.name); return false })

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method' }) }

  res.setHeader('Cache-Control', 'no-store')
  // Nur Anfragen von der eigenen Seite und in vernünftiger Größe
  const origin = req.headers.origin
  if (origin) { let host = ''; try { host = new URL(origin).host } catch {} if (host !== req.headers.host) return res.status(403).json({ error: 'origin' }) }
  if (Number(req.headers['content-length'] || 0) > 20000) return res.status(413).json({ error: 'too_large' })

  let b = req.body
  if (typeof b === 'string') { try { b = JSON.parse(b) } catch { b = Object.fromEntries(new URLSearchParams(b)) } }
  b = b && typeof b === 'object' ? b : {}
  const wantsPage = !String(req.headers['content-type'] || '').includes('json')
  const kontakt = b.art === 'kontakt' // kurze Nachricht von der Kontaktseite statt der geführten Terminanfrage
  const done = (status, body) => wantsPage && status === 200 ? res.redirect(303, kontakt ? '/kontakt/?gesendet=1#schreiben' : '/termin/?gesendet=1') : res.status(status).json(body)

  if (line(b.website, 10)) return done(200, { ok: true }) // Feld, das nur Bots ausfüllen

  const name = line(b.name, 120), email = line(b.email, 160), telefon = line(b.telefon, 40), nachricht = text(b.nachricht, 1500)
  const zeit = [...new Set([].concat(b.zeit || []).flatMap(z => String(z).split(',')).map(z => ZEIT[z.trim()]).filter(Boolean))]
  const thema = THEMA[b.thema], ort = ORT[b.ort]
  if (name.length < 2 || !b.einwilligung || b.einwilligung === 'false') return done(400, { error: 'incomplete' })
  if (kontakt ? nachricht.length < 5 : (!thema || !ort || !zeit.length)) return done(400, { error: 'incomplete' })
  if (!email && !telefon) return done(400, { error: 'contact' })
  if (email && !/^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]{2,}$/.test(email)) return done(400, { error: 'email' })

  const { RESEND_API_KEY: key, ANFRAGE_TO: to } = process.env
  const from = process.env.ANFRAGE_FROM || DEFAULT_FROM
  if (!key || !to) return done(503, { error: 'not_configured' })
  const wish = [['Anliegen', thema], ['Form', ort], ['Wunschzeit', zeit.join(', ')]]
  const contact = [['Name', name], ['E-Mail', email], ['Telefon', telefon], ['Nachricht', nachricht]].filter(r => r[1])
  const plain = rows => rows.map(([k, v]) => `${k}: ${v}`).join('\n')

  const NOREPLY = 'Diese Nachricht wurde automatisch verschickt. Bitte antworten Sie nicht auf diese E-Mail, sie wird nicht gelesen.'
  const CRISIS = 'In akuten Krisen: Telefonseelsorge 0800 111 0 111, Notruf 112.'
  const rows = kontakt ? contact : [...wish, ...contact]
  const art = kontakt ? 'im Kontaktformular' : 'im Terminformular'

  // 1. An die Praxis. Ohne diese Mail gilt die Anfrage als nicht zugestellt. Kein Reply-To: Die Praxis antwortet selbst.
  const addr = (from.match(/<([^>]+)>/) || [])[1] || from
  const lead = await send(key, {
    from: `Website Zurbuchen <${addr}>`, to: [to], subject: kontakt ? `Neue Nachricht über das Kontaktformular (${name})` : `Neue Terminanfrage: ${thema} (${name})`,
    text: `Neuer Eintrag ${art}\n\n${name} hat sich ${art} eingetragen.\n\n${plain(rows)}\n\nDiese Nachricht wurde automatisch von der Website verschickt. Bitte nicht auf diese E-Mail antworten, sondern die Person selbst kontaktieren.`,
    html: mail({ title: kontakt ? 'Neue Nachricht' : 'Neue Terminanfrage', intro: `<b>${esc(name)}</b> hat sich ${art} eingetragen.`, rows, next: email || telefon ? 'Bitte melden Sie sich bei der Person, die Kontaktdaten stehen oben.' : '', foot: 'Diese Nachricht wurde automatisch von Ihrer Website verschickt. Bitte nicht auf diese E-Mail antworten, sondern die Person selbst kontaktieren.', cta: null }),
  })
  if (!lead) return done(502, { error: 'send_failed' })

  // 2. Bestätigung an die anfragende Person. Schlägt sie fehl, ist die Anfrage trotzdem angekommen. Kein Reply-To.
  if (email) await send(key, {
    from, to: [email], subject: 'Vielen Dank für Ihren Eintrag',
    text: `Guten Tag ${name},\n\nvielen Dank für Ihren Eintrag. Ich melde mich in Kürze persönlich bei Ihnen.\n\n${kontakt ? '' : plain(wish) + '\n\n'}Herzliche Grüße\n${PRAXIS.name}\nZeitRaum, Weilheimer Str. 9, 86899 Landsberg am Lech\nTelefon ${PRAXIS.phone}\n\n${NOREPLY}\n${CRISIS}`,
    html: mail({ title: 'Vielen Dank für Ihren Eintrag', hello: `Guten Tag ${esc(name)},`, intro: 'schön, dass Sie sich gemeldet haben. Ihre Anfrage ist bei mir angekommen, und ich melde mich in Kürze persönlich bei Ihnen.', rows: kontakt ? [['Ihre Nachricht', nachricht]] : wish, next: `Wenn es eilt, erreichen Sie mich unter <a href="tel:+4917643452286" style="color:#B4500D;text-decoration:underline">${PRAXIS.phone}</a>.<br><span style="color:${C.ink}">Herzliche Grüße, ${PRAXIS.name}</span>`, foot: `<b style="color:${C.ink2}">${PRAXIS.name}</b> · ZeitRaum, Weilheimer Str. 9, 86899 Landsberg am Lech<br><br>${NOREPLY}<br>${CRISIS}`, cta: ['Zur Website', SITE] }),
  })
  return done(200, { ok: true })
}
