// Beantwortet Fragen im Website-Chat. Kein Sprachmodell: die Antworten kommen aus der festen Wissensbasis (chat-kb.js).
// Es wird nichts gespeichert und nichts protokolliert; die Frage wird nur für die Dauer der Anfrage verarbeitet.
const { KB, SPECIAL, PHONE, MAIL, TEL } = require('./chat-kb.js')

const norm = s => ' ' + String(s || '').toLowerCase().replace(/[^a-z0-9äöüß€?\s]/g, ' ').replace(/\s+/g, ' ').trim() + ' '
const byId = Object.fromEntries(KB.map(e => [e.id, e]))

const chipsFor = (ids, primaryLink) => {
  const out = []
  if (primaryLink) out.push({ label: primaryLink[1], href: primaryLink[0], primary: true })
  ids.forEach(id => { if (byId[id]) out.push({ label: byId[id].q, ask: id }) })
  return out
}

const uniq = list => list.filter((c, i) => list.findIndex(x => x.label === c.label) === i)
const reply = (e, extraLinks) => ({
  id: e.id,
  text: e.a,
  chips: uniq([...(e.links || []).map(l => ({ label: l.label, href: l.href, primary: !!l.primary })), ...(extraLinks || []), ...chipsFor(e.next || [], e.go)]).slice(0, 6),
})

const welcome = () => ({
  id: 'welcome',
  text: ['Guten Tag, ich bin die digitale Assistenz der Praxis von Pamela Zurbuchen. Ich beantworte Fragen zu Angebot, Ablauf, Kosten und Terminen.', 'Wählen Sie ein Thema oder schreiben Sie Ihre Frage.'],
  chips: [{ label: 'Termin anfragen', href: '/termin/', primary: true }, ...['kosten', 'erstgespraech', 'online', 'ort', 'krankenkasse'].map(id => ({ label: byId[id].q, ask: id }))],
})

const fallback = ids => ({
  id: 'fallback',
  text: ['Dazu habe ich keine passende Antwort. Das beantwortet Pamela Zurbuchen am besten persönlich.', `Sie erreichen sie unter ${PHONE} oder per E-Mail an ${MAIL}. Oder Sie fragen den Termin an, dann meldet sie sich bei Ihnen.`],
  chips: [{ label: 'Termin anfragen', href: '/termin/', primary: true }, { label: 'Anrufen', href: 'tel:' + TEL }, ...chipsFor(ids.slice(0, 3))],
})

const answer = q => {
  const t = norm(q)
  if (t.trim().length < 2) return welcome()
  // 1. Krise und medizinische Fragen haben Vorrang
  if (SPECIAL.krise.k.some(k => t.includes(k))) return { id: 'krise', text: SPECIAL.krise.a, chips: SPECIAL.krise.links }
  // 2. Treffer nach Stichwörtern, längere Treffer zählen mehr; die Frage selbst zählt am meisten
  const scored = KB.map(e => {
    let s = 0
    e.k.forEach(k => { if (t.includes(k.length < 4 ? ' ' + k : k)) s += k.length >= 6 ? 3 : 2 })
    if (t.trim() === norm(e.q).trim()) s += 20
    return { e, s }
  }).sort((a, b) => b.s - a.s)
  if (SPECIAL.medizin.k.some(k => t.includes(k)) && scored[0].s < 6) return { id: 'medizin', text: SPECIAL.medizin.a, chips: chipsFor(SPECIAL.medizin.next, SPECIAL.medizin.go) }
  const words = t.trim().split(' ').length
  if (words <= 4 && SPECIAL.gruss.k.some(k => t.includes(k)) && scored[0].s < 3) return { id: 'gruss', text: SPECIAL.gruss.a, chips: chipsFor(SPECIAL.gruss.next) }
  if (words <= 4 && SPECIAL.danke.k.some(k => t.includes(k)) && scored[0].s < 3) return { id: 'danke', text: SPECIAL.danke.a, chips: chipsFor(SPECIAL.danke.next, SPECIAL.danke.go) }
  if (scored[0].s >= 2) return reply(scored[0].e)
  return fallback(['kosten', 'erstgespraech', 'online'])
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method === 'GET') return res.status(200).json(welcome())
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'Methode nicht erlaubt' }) }
  let b = req.body
  if (typeof b === 'string') { try { b = JSON.parse(b) } catch (e) { b = {} } }
  b = b || {}
  // Ein Vorschlag wird über seine Kennung abgefragt, freie Fragen über den Text
  if (typeof b.ask === 'string' && byId[b.ask]) return res.status(200).json(reply(byId[b.ask]))
  const q = String(b.q == null ? '' : b.q).replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, 300)
  return res.status(200).json(answer(q))
}
module.exports.answer = answer
