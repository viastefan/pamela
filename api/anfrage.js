// Nimmt die Terminanfrage entgegen und verschickt zwei Mails über Resend:
// 1. die Benachrichtigung an die Praxis (Antwort geht direkt an die anfragende Person),
// 2. eine Bestätigung an die anfragende Person, wenn sie eine E-Mail-Adresse angegeben hat.
// Umgebungsvariablen: RESEND_API_KEY und ANFRAGE_TO (Empfängerin) sind Pflicht,
// ANFRAGE_FROM (verifizierter Absender) und ANFRAGE_REPLY (Antwortadresse der Bestätigung) sind optional.
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

// Eine ruhige Mail: Überschrift, ein Satz, die Angaben als Tabelle, Fußzeile.
const mail = ({ title, intro, rows, foot }) => `<!doctype html><html lang="de"><body style="margin:0;background:#F8F4EF;padding:32px 16px;font:16px/1.55 -apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#53474A">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:16px;border:1px solid #EFE7E0"><tr><td style="padding:32px">
<p style="margin:0 0 20px;font-size:13px;letter-spacing:.02em;color:#6F2039">${PRAXIS.name}</p>
<h1 style="margin:0 0 12px;font:400 26px/1.2 Georgia,'Times New Roman',serif;color:#241A1C">${title}</h1>
<p style="margin:0 0 24px">${intro}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #EFE7E0">${rows.map(([k, v]) => `<tr><td style="padding:12px 16px 12px 0;border-bottom:1px solid #EFE7E0;font-size:13px;color:#74686B;vertical-align:top;white-space:nowrap">${k}</td><td style="padding:12px 0;border-bottom:1px solid #EFE7E0;color:#241A1C">${esc(v).replace(/\n/g, '<br>')}</td></tr>`).join('')}</table>
<p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#74686B">${foot}</p>
</td></tr></table></body></html>`

const send = (key, body) => fetch('https://api.resend.com/emails', {
  method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}).then(r => r.ok, () => false)

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method' }) }

  let b = req.body
  if (typeof b === 'string') { try { b = JSON.parse(b) } catch { b = Object.fromEntries(new URLSearchParams(b)) } }
  b = b && typeof b === 'object' ? b : {}
  const wantsPage = !String(req.headers['content-type'] || '').includes('json')
  const done = (status, body) => wantsPage && status === 200 ? res.redirect(303, '/termin/?gesendet=1') : res.status(status).json(body)

  if (line(b.website, 10)) return done(200, { ok: true }) // Feld, das nur Bots ausfüllen

  const name = line(b.name, 120), email = line(b.email, 160), telefon = line(b.telefon, 40), nachricht = text(b.nachricht, 1500)
  const zeit = [].concat(b.zeit || []).map(z => ZEIT[z]).filter(Boolean)
  const thema = THEMA[b.thema], ort = ORT[b.ort]
  if (!thema || !ort || !zeit.length || name.length < 2 || !b.einwilligung) return done(400, { error: 'incomplete' })
  if (!email && !telefon) return done(400, { error: 'contact' })
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return done(400, { error: 'email' })

  const { RESEND_API_KEY: key, ANFRAGE_TO: to } = process.env
  const from = process.env.ANFRAGE_FROM || DEFAULT_FROM, reply = process.env.ANFRAGE_REPLY || PRAXIS.mail
  if (!key || !to) return done(503, { error: 'not_configured' })

  const wish = [['Anliegen', thema], ['Form', ort], ['Wunschzeit', zeit.join(', ')]]
  const contact = [['Name', name], ['E-Mail', email], ['Telefon', telefon], ['Nachricht', nachricht]].filter(r => r[1])
  const plain = rows => rows.map(([k, v]) => `${k}: ${v}`).join('\n')

  // 1. An die Praxis. Ohne diese Mail gilt die Anfrage als nicht zugestellt.
  const lead = await send(key, {
    from, to: [to], subject: `Neue Terminanfrage: ${thema} (${name})`, ...(email ? { reply_to: email } : {}),
    text: `Neue Terminanfrage über die Website\n\n${plain([...wish, ...contact])}`,
    html: mail({ title: 'Neue Terminanfrage', intro: `${esc(name)} hat über die Website einen Termin angefragt.${email ? ' Eine Antwort auf diese Mail geht direkt an die Person.' : ' Bitte telefonisch melden.'}`, rows: [...wish, ...contact], foot: 'Diese Nachricht wurde automatisch von der Website verschickt.' }),
  })
  if (!lead) return done(502, { error: 'send_failed' })

  // 2. Bestätigung an die anfragende Person. Schlägt sie fehl, ist die Anfrage trotzdem angekommen.
  if (email) await send(key, {
    from, to: [email], reply_to: reply, subject: 'Ihre Terminanfrage ist angekommen',
    text: `Guten Tag ${name},\n\nvielen Dank für Ihre Anfrage. Ich melde mich mit einem Terminvorschlag bei Ihnen. Während der bayerischen Schulferien kann es etwas länger dauern.\n\n${plain(wish)}\n\n${PRAXIS.name}\n${PRAXIS.phone}\n${PRAXIS.mail}`,
    html: mail({ title: 'Ihre Anfrage ist angekommen', intro: `Guten Tag ${esc(name)}, vielen Dank für Ihre Nachricht. Ich melde mich mit einem Terminvorschlag bei Ihnen. Während der bayerischen Schulferien kann es etwas länger dauern.`, rows: wish, foot: `${PRAXIS.name}, ${PRAXIS.phone}, ${PRAXIS.mail}<br>Diese Bestätigung wurde automatisch verschickt. Wenn Sie antworten, erreicht Ihre Nachricht die Praxis.` }),
  })
  return done(200, { ok: true })
}
