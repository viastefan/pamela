// Nimmt die Terminanfrage entgegen und verschickt zwei Mails über Resend:
// 1. die Benachrichtigung an die Praxis (Antwort geht direkt an die anfragende Person),
// 2. eine Bestätigung an die anfragende Person, wenn sie eine E-Mail-Adresse angegeben hat.
// Umgebungsvariablen: RESEND_API_KEY und ANFRAGE_TO (Empfängerin) sind Pflicht,
// ANFRAGE_FROM (verifizierter Absender), ANFRAGE_REPLY (Antwortadresse der Bestätigung) und
// ANFRAGE_COPY (stille Kopie der Anfrage an die Betreuung der Website) sind optional.
// Fehlen die Pflichtangaben, antwortet die Funktion mit 503 und die Seite weicht auf das Mailprogramm aus.
// Gespeichert wird nichts.

const line = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max)
const text = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b-\u001f\u007f]+/g, ' ').trim().slice(0, max)
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const THEMA = { einzeltherapie: 'Einzeltherapie', paartherapie: 'Paartherapie', jugendcoaching: 'Jugendcoaching', erziehungsberatung: 'Erziehungsberatung', kurs: 'Kurs, Training oder Vortrag', offen: 'Noch unsicher' }
const ORT = { praxis: 'In der Praxis', online: 'Online', walk: 'Walk and Talk', egal: 'Egal' }
const ZEIT = { vormittags: 'Vormittags', nachmittags: 'Nachmittags', abends: 'Am frühen Abend', flexibel: 'Flexibel' }
const DEFAULT_FROM = 'Pamela Zurbuchen <noreply@festag.app>'
const PRAXIS = { name: 'Pamela Zurbuchen', phone: '0176-43 45 22 86', mail: 'zurbuchen-therapie@gmx.de', site: 'www.zurbuchen-therapie.de' }

// Eine ruhige Mail im Stil der Website: Logo, Überschrift, ein Satz, die Angaben als Tabelle, Kontakt, Fußzeile.
const SITE = process.env.SITE_URL || 'https://pamela-festag.vercel.app'
const C = { bg: '#F8F6EE', card: '#FFFFFF', line: '#E6EEE0', ink: '#33352B', ink2: '#56574B', ink3: '#767567', brand: '#5E7B53', tint: '#EFF4EA' }
const mail = ({ title, intro, rows, foot, cta }) => `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${title}</title></head>
<body style="margin:0;background:${C.bg};padding:32px 16px;font:16px/1.6 -apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:${C.ink2}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto"><tr><td style="padding:0 4px 18px">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="vertical-align:middle"><img src="${SITE}/img/icon-512.png" width="36" height="36" alt="" style="display:block;border:0"></td><td style="padding-left:12px;vertical-align:middle;font:400 19px/1.2 Georgia,'Times New Roman',serif;color:${C.ink}">${PRAXIS.name}<br><span style="font:12px/1.4 -apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:${C.brand}">Systemische und traumasensible Einzel- und Paartherapie</span></td></tr></table>
</td></tr><tr><td style="background:${C.card};border-radius:18px;border:1px solid ${C.line};padding:32px 30px">
<h1 style="margin:0 0 12px;font:400 26px/1.25 Georgia,'Times New Roman',serif;color:${C.ink}">${title}</h1>
<p style="margin:0 0 24px">${intro}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.line}">${rows.map(([k, v]) => `<tr><td style="padding:12px 16px 12px 0;border-bottom:1px solid ${C.line};font-size:13px;color:${C.ink3};vertical-align:top;white-space:nowrap">${k}</td><td style="padding:12px 0;border-bottom:1px solid ${C.line};color:${C.ink}">${esc(v).replace(/\n/g, '<br>')}</td></tr>`).join('')}</table>
${cta ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:26px"><tr><td style="background:${C.brand};border-radius:999px"><a href="${cta[1]}" style="display:inline-block;padding:12px 24px;font-size:15px;color:#FFFFFF;text-decoration:none">${cta[0]}</a></td></tr></table>` : ''}
</td></tr><tr><td style="padding:20px 6px 0;font-size:13px;line-height:1.55;color:${C.ink3}">${foot}</td></tr></table></body></html>`

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
  const from = process.env.ANFRAGE_FROM || DEFAULT_FROM, reply = process.env.ANFRAGE_REPLY || PRAXIS.mail
  if (!key || !to) return done(503, { error: 'not_configured' })
  // Optionale stille Kopie der Anfrage (ANFRAGE_COPY, mehrere Adressen mit Komma). Standard: keine Kopie.
  const copy = (process.env.ANFRAGE_COPY || '').split(',').map(x => x.trim()).filter(Boolean)
  const bcc = copy.length ? { bcc: copy } : {}

  const wish = [['Anliegen', thema], ['Form', ort], ['Wunschzeit', zeit.join(', ')]]
  const contact = [['Name', name], ['E-Mail', email], ['Telefon', telefon], ['Nachricht', nachricht]].filter(r => r[1])
  const plain = rows => rows.map(([k, v]) => `${k}: ${v}`).join('\n')

  if (kontakt) {
    const rows = [['Name', name], ['E-Mail', email], ['Telefon', telefon], ['Nachricht', nachricht]].filter(r => r[1])
    const sent = await send(key, {
      from, to: [to], ...bcc, subject: `Neue Nachricht über die Website (${name})`, ...(email ? { reply_to: email } : {}),
      text: `Neue Nachricht über die Website\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}`,
      html: mail({ title: 'Neue Nachricht', intro: `${esc(name)} hat über das Kontaktformular geschrieben.${email ? ' Eine Antwort auf diese Mail geht direkt an die Person.' : ' Bitte telefonisch melden.'}`, rows, foot: 'Diese Nachricht wurde automatisch von der Website verschickt.', cta: email ? ['Direkt antworten', `mailto:${email}`] : telefon ? ['Zurückrufen', `tel:${telefon.replace(/[^+\\d]/g, '')}`] : null }),
    })
    if (!sent) return done(502, { error: 'send_failed' })
    if (email) await send(key, {
      from, to: [email], reply_to: reply, subject: 'Ihre Nachricht ist angekommen',
      text: `Guten Tag ${name},\n\nvielen Dank für Ihre Nachricht. Ich melde mich bei Ihnen. Während der bayerischen Schulferien kann es etwas länger dauern.\n\n${PRAXIS.name}\n${PRAXIS.phone}\n${PRAXIS.mail}`,
      html: mail({ title: 'Ihre Nachricht ist angekommen', intro: `Guten Tag ${esc(name)}, vielen Dank für Ihre Nachricht. Ich melde mich bei Ihnen. Während der bayerischen Schulferien kann es etwas länger dauern.`, rows: [['Ihre Nachricht', nachricht]], foot: `<b style="color:${C.ink2}">${PRAXIS.name}</b> · ZeitRaum, Weilheimer Str. 9, 86899 Landsberg am Lech<br>${PRAXIS.phone} · <a href="mailto:${PRAXIS.mail}" style="color:${C.brand}">${PRAXIS.mail}</a><br><br>Diese Bestätigung wurde automatisch verschickt. Wenn Sie antworten, erreicht Ihre Nachricht die Praxis.<br>In akuten Krisen: Telefonseelsorge 0800 111 0 111, Notruf 112.`, cta: ['Zur Website', SITE] }),
    })
    return done(200, { ok: true })
  }

  // 1. An die Praxis. Ohne diese Mail gilt die Anfrage als nicht zugestellt.
  const lead = await send(key, {
    from, to: [to], ...bcc, subject: `Neue Terminanfrage: ${thema} (${name})`, ...(email ? { reply_to: email } : {}),
    text: `Neue Terminanfrage über die Website\n\n${plain([...wish, ...contact])}`,
    html: mail({ title: 'Neue Terminanfrage', intro: `${esc(name)} hat über die Website einen Termin angefragt.${email ? ' Eine Antwort auf diese Mail geht direkt an die Person.' : ' Bitte telefonisch melden.'}`, rows: [...wish, ...contact], foot: 'Diese Nachricht wurde automatisch von der Website verschickt.', cta: email ? ['Direkt antworten', `mailto:${email}`] : telefon ? ['Zurückrufen', `tel:${telefon.replace(/[^+\\d]/g, '')}`] : null }),
  })
  if (!lead) return done(502, { error: 'send_failed' })

  // 2. Bestätigung an die anfragende Person. Schlägt sie fehl, ist die Anfrage trotzdem angekommen.
  if (email) await send(key, {
    from, to: [email], reply_to: reply, subject: 'Ihre Terminanfrage ist angekommen',
    text: `Guten Tag ${name},\n\nvielen Dank für Ihre Anfrage. Ich melde mich mit einem Terminvorschlag bei Ihnen. Während der bayerischen Schulferien kann es etwas länger dauern.\n\n${plain(wish)}\n\n${PRAXIS.name}\n${PRAXIS.phone}\n${PRAXIS.mail}`,
    html: mail({ title: 'Ihre Anfrage ist angekommen', intro: `Guten Tag ${esc(name)}, vielen Dank für Ihre Nachricht. Ich melde mich mit einem Terminvorschlag bei Ihnen. Während der bayerischen Schulferien kann es etwas länger dauern.`, rows: wish, foot: `<b style="color:${C.ink2}">${PRAXIS.name}</b> · ZeitRaum, Weilheimer Str. 9, 86899 Landsberg am Lech<br>${PRAXIS.phone} · <a href="mailto:${PRAXIS.mail}" style="color:${C.brand}">${PRAXIS.mail}</a><br><br>Diese Bestätigung wurde automatisch verschickt. Wenn Sie antworten, erreicht Ihre Nachricht die Praxis.<br>In akuten Krisen: Telefonseelsorge 0800 111 0 111, Notruf 112.`, cta: ['Zur Website', SITE] }),
  })
  return done(200, { ok: true })
}
