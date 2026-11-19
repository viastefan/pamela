// Menü, Erscheinen, Zählen und die Terminanfrage. Ohne Skript bleibt alles sichtbar und bedienbar.
(function () {
  var doc = document, root = doc.documentElement
  var calm = matchMedia('(prefers-reduced-motion: reduce)').matches

  // Kopf: Linie erst beim Scrollen, Menü am Handy
  var top = doc.querySelector('.top'), btn = doc.querySelector('.menu-btn')
  var loc = doc.querySelector('[data-loc]')
  var onScroll = function () {
    top.classList.toggle('scrolled', scrollY > 8)
    if (loc) loc.classList.toggle('show', scrollY > innerHeight * .6)
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll()
  // Standort: Taste öffnet die Karte, die Google-Karte lädt erst auf Klick
  if (loc) {
    var locPill = loc.querySelector('[data-loc-open]'), locCard = loc.querySelector('.loc-card'), locLoad = loc.querySelector('[data-loc-load]')
    var setLoc = function (open) { loc.classList.toggle('open', open); locCard.hidden = !open; locPill.setAttribute('aria-expanded', String(open)) }
    locPill.addEventListener('click', function () { setLoc(true); loc.querySelector('[data-loc-close]').focus() })
    loc.querySelector('[data-loc-close]').addEventListener('click', function () { setLoc(false); locPill.focus() })
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && loc.classList.contains('open')) { setLoc(false); locPill.focus() } })
    locLoad.addEventListener('click', function () {
      var f = doc.createElement('iframe'); f.src = locLoad.dataset.src; f.title = 'Karte: Standort der Praxis'; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade'
      locLoad.replaceWith(f)
    })
  }
  if (btn) {
    var setMenu = function (open) {
      top.toggleAttribute('data-open', open)
      btn.setAttribute('aria-expanded', String(open))
      btn.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen')
      doc.body.style.overflow = open ? 'hidden' : ''
    }
    btn.addEventListener('click', function () { setMenu(!top.hasAttribute('data-open')) })
    doc.querySelectorAll('[data-menu-close]').forEach(function (b) { b.addEventListener('click', function () { setMenu(false) }) })
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false) })
    addEventListener('resize', function () { if (innerWidth > 960) setMenu(false) })
  }

  // Erscheinen und Zählen
  var count = function (el) {
    var to = +el.dataset.count, t0 = performance.now(), ms = 1100
    var tick = function (t) {
      var k = Math.min(1, (t - t0) / ms); k = 1 - Math.pow(1 - k, 3)
      el.textContent = Math.round(to * k)
      if (k < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }
  var items = doc.querySelectorAll('.rv')
  if (!('IntersectionObserver' in window)) items.forEach(function (el) { el.classList.add('in') })
  else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return
        e.target.classList.add('in'); io.unobserve(e.target)
        if (!calm) e.target.querySelectorAll('[data-count]').forEach(count)
      })
    }, { rootMargin: '0px 0px -8% 0px' })
    items.forEach(function (el) { io.observe(el) })
  }

  // Darstellung: hell, wie das Gerät oder dunkel
  var themeBtns = doc.querySelectorAll('[data-theme-set]')
  var setTheme = function (t) {
    try { localStorage.setItem('zt-theme', t) } catch (e) {}
    root.dataset.themeChoice = t
    root.dataset.theme = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light'
    themeBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.themeSet === t)) })
  }
  themeBtns.forEach(function (b) {
    b.setAttribute('aria-pressed', String(b.dataset.themeSet === (root.dataset.themeChoice || 'light')))
    b.addEventListener('click', function () { setTheme(b.dataset.themeSet) })
  })

  // Ablauf: die Verbindungslinie füllt sich beim Scrollen, die Schritte werden nacheinander aktiv
  var stepBlocks = [].slice.call(doc.querySelectorAll('[data-steps]'))
  var syncSteps = function () {
    stepBlocks.forEach(function (el) {
      var r = el.getBoundingClientRect(), p = Math.max(0, Math.min(1, (innerHeight * .82 - r.top) / (innerHeight * .5)))
      if (calm) p = 1
      el.style.setProperty('--p', p.toFixed(3))
      ;[].forEach.call(el.querySelectorAll('li'), function (li, i, all) { li.classList.toggle('on', p >= i / all.length + .04) })
    })
  }
  if (stepBlocks.length) { addEventListener('scroll', syncSteps, { passive: true }); addEventListener('resize', syncSteps); syncSteps() }

  // Cookie-Einstellungen: Auswahl einmal treffen, im Fuß jederzeit ändern
  var consent = doc.querySelector('[data-consent]')
  if (consent) {
    var opts = consent.querySelector('.consent-opts'), more = consent.querySelector('[data-consent-more]'), stats = consent.querySelector('[data-consent-stats]')
    var stored = null
    try { stored = localStorage.getItem('zt-consent') } catch (e) {}
    var save = function (v) {
      try { localStorage.setItem('zt-consent', v) } catch (e) {}
      root.dataset.consent = v; consent.hidden = true
    }
    if (stored) root.dataset.consent = stored
    else setTimeout(function () { consent.hidden = false }, 900)
    consent.querySelectorAll('[data-consent-set]').forEach(function (b) { b.addEventListener('click', function () { save(b.dataset.consentSet) }) })
    more.addEventListener('click', function () {
      if (opts.hidden) { opts.hidden = false; more.textContent = 'Auswahl speichern'; return }
      save(stats.checked ? 'all' : 'necessary')
    })
    doc.querySelectorAll('[data-consent-open]').forEach(function (b) {
      b.addEventListener('click', function () { stats.checked = root.dataset.consent === 'all'; opts.hidden = false; more.textContent = 'Auswahl speichern'; consent.hidden = false })
    })
  }

  // Termin anfragen: erst die Wahl (ausfüllen, anrufen, schreiben)
  var sheet = doc.getElementById('kontakt-wahl')
  if (sheet && sheet.showModal) {
    doc.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="/termin/"]')
      if (!a || a.closest('.sheet') || e.metaKey || e.ctrlKey || e.shiftKey) return
      e.preventDefault()
      sheet.querySelector('[data-sheet-form]').href = a.getAttribute('href')
      sheet.showModal()
    })
    sheet.addEventListener('click', function (e) { if (e.target === sheet || e.target.closest('[data-sheet-close]')) sheet.close() })
  }

  // Chat: geführte Antworten aus den Inhalten der Seite, Aufbau wie bei Primava
  var cw = doc.querySelector('[data-chat]')
  if (cw) {
    var chatData = JSON.parse(doc.getElementById('chat-data').textContent)
    var launcher = cw.querySelector('.cw-launcher'), panel = cw.querySelector('.cw-panel'), thread = cw.querySelector('.cw-thread')
    var chips = cw.querySelector('.cw-chips'), composer = cw.querySelector('.cw-composer'), started = false, typing = null
    var el = function (tag, cls, text) { var n = doc.createElement(tag); n.className = cls; if (text) n.textContent = text; return n }
    var down = function () { thread.scrollTo({ top: thread.scrollHeight, behavior: calm ? 'auto' : 'smooth' }) }
    var setChips = function (list) {
      chips.textContent = ''; chips.hidden = !list.length
      list.forEach(function (c) {
        var n = el(c.href ? 'a' : 'button', 'cw-chip' + (c.primary ? ' is-primary' : ''), c.label)
        if (c.href) n.href = c.href
        else { n.type = 'button'; n.addEventListener('click', function () { user(c.label); bot(c.to) }) }
        chips.appendChild(n)
      })
    }
    var user = function (text) { var m = el('div', 'cw-msg cw-msg-user'); m.appendChild(el('p', '', text)); thread.appendChild(m); down() }
    var botRow = function () {
      var m = el('div', 'cw-msg cw-msg-bot'), av = el('img', 'cw-msg-avatar')
      av.src = '/img/pamela-avatar.webp'; av.alt = ''; av.width = 22; av.height = 22
      m.appendChild(av); m.appendChild(el('div', 'cw-bubble')); return m
    }
    var bot = function (id, now) {
      var node = chatData.nodes[id] || chatData.nodes.kontakt, wait = botRow()
      wait.lastChild.className = 'cw-bubble cw-typing'
      for (var i = 0; i < 3; i++) wait.lastChild.appendChild(doc.createElement('span'))
      setChips([]); clearTimeout(typing)
      var show = function () {
        wait.remove()
        var m = botRow(); node.text.forEach(function (t) { m.lastChild.appendChild(el('p', '', t)) })
        thread.appendChild(m); setChips(node.chips || []); down()
      }
      if (now || calm) return show()
      thread.appendChild(wait); down()
      typing = setTimeout(show, 420 + Math.min(720, node.text.join(' ').length * 3.5))
    }
    var match = function (text) {
      var t = ' ' + text.toLowerCase() + ' ', best = 'kontakt', score = 0
      chatData.intents.forEach(function (x) {
        var n = x.k.filter(function (k) { return t.indexOf(k) > -1 }).length
        if (n > score) { score = n; best = x.to }
      })
      return best
    }
    // Am Handy folgt das Fenster dem sichtbaren Bereich, damit die Tastatur nichts verdeckt
    var vv = window.visualViewport
    var syncViewport = function () {
      if (!cw.classList.contains('is-open')) { root.style.removeProperty('--cw-vvh'); root.style.removeProperty('--cw-top'); return }
      root.style.setProperty('--cw-vvh', Math.round(vv ? vv.height : innerHeight) + 'px')
      root.style.setProperty('--cw-top', Math.round(vv ? vv.offsetTop : 0) + 'px')
    }
    if (vv) { vv.addEventListener('resize', syncViewport); vv.addEventListener('scroll', syncViewport) }
    var setChat = function (on) {
      cw.classList.toggle('is-open', on); panel.inert = !on
      launcher.setAttribute('aria-expanded', String(on))
      launcher.setAttribute('aria-label', on ? 'Chat schließen' : 'Chat öffnen')
      if (innerWidth <= 640) doc.body.style.overflow = on ? 'hidden' : ''
      syncViewport()
      if (on && !started) { started = true; bot('welcome', true) }
      if (on && matchMedia('(pointer: fine)').matches) setTimeout(function () { composer.q.focus({ preventScroll: true }) }, 280)
    }
    launcher.addEventListener('click', function () { setChat(!cw.classList.contains('is-open')) })
    doc.querySelectorAll('[data-chat-open]').forEach(function (b) { b.addEventListener('click', function () { setChat(true) }) })
    cw.querySelectorAll('[data-chat-close]').forEach(function (b) { b.addEventListener('click', function () { setChat(false) }) })
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && cw.classList.contains('is-open')) { setChat(false); launcher.focus() } })
    composer.addEventListener('submit', function (e) {
      e.preventDefault()
      var q = composer.q.value.trim(); if (!q) return
      composer.q.value = ''; user(q); bot(match(q))
    })
  }

  // Terminanfrage
  var form = doc.getElementById('flow')
  if (!form) return
  var steps = [].slice.call(form.querySelectorAll('.step'))
  var bar = doc.querySelector('.flow-bar i'), prev = doc.querySelector('[data-prev]'), fwd = doc.querySelector('[data-fwd]')
  var last = steps.length - 1, at = 0, sending = false
  var LABEL = { thema: 'Anliegen', ort: 'Form', zeit: 'Wunschzeit' }

  var show = function (i, back) {
    steps[at].classList.remove('on', 'back')
    at = Math.max(0, Math.min(last, i))
    var s = steps[at]
    s.classList.toggle('back', !!back); s.classList.add('on')
    bar.style.width = (at / last) * 100 + '%'
    prev.disabled = at === 0 || at === last
    fwd.disabled = at >= last - 1
    doc.querySelector('.flow-nav').hidden = at === last
    var f = s.querySelector('input:checked') || s.querySelector('input:not([tabindex="-1"]), textarea')
    if (f && at !== last) setTimeout(function () { f.focus({ preventScroll: true }) }, calm ? 0 : 260)
    scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' })
  }
  var fail = function (s, msg) { var e = s.querySelector('.err'); if (e) e.textContent = msg; return false }
  var valid = function (s) {
    var k = s.dataset.step, d = new FormData(form)
    fail(s, '')
    if (k === 'thema' || k === 'ort') return d.get(k) ? true : fail(s, 'Bitte wählen Sie eine Antwort.')
    if (k === 'zeit') return d.getAll('zeit').length ? true : fail(s, 'Bitte wählen Sie mindestens eine Antwort.')
    if (k === 'kontakt') {
      var mail = String(d.get('email') || '').trim(), tel = String(d.get('telefon') || '').trim()
      if (String(d.get('name') || '').trim().length < 2) return fail(s, 'Bitte nennen Sie Ihren Namen.')
      if (!mail && !tel) return fail(s, 'Bitte geben Sie eine E-Mail-Adresse oder eine Telefonnummer an.')
      if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) return fail(s, 'Diese E-Mail-Adresse sieht nicht vollständig aus.')
      if (tel && tel.replace(/\D/g, '').length < 6) return fail(s, 'Diese Telefonnummer sieht nicht vollständig aus.')
    }
    if (k === 'nachricht' && !d.get('einwilligung')) return fail(s, 'Bitte bestätigen Sie die Einwilligung.')
    return true
  }
  var go = function () { if (at < last - 1 && valid(steps[at])) show(at + 1) }

  var labelOf = function (name) {
    return [].map.call(form.querySelectorAll('input[name="' + name + '"]:checked'), function (i) { return i.parentNode.querySelector('span').textContent }).join(', ')
  }
  var finish = function (ok, data) {
    sending = false
    if (!ok) {
      // Kein Versand über den Server möglich: die fertige Anfrage geht über das eigene Mailprogramm.
      var body = ['Guten Tag Frau Zurbuchen,', '', 'ich möchte einen Termin anfragen.', '',
        'Anliegen: ' + labelOf('thema'), 'Form: ' + labelOf('ort'), 'Wunschzeit: ' + labelOf('zeit'), '',
        ['Name: ' + data.name, data.email && 'E-Mail: ' + data.email, data.telefon && 'Telefon: ' + data.telefon].filter(Boolean).join('\n'),
        data.nachricht ? '\n' + data.nachricht : ''].join('\n').trim()
      var href = 'mailto:' + form.dataset.mail + '?subject=' + encodeURIComponent('Terminanfrage: ' + labelOf('thema')) + '&body=' + encodeURIComponent(body)
      doc.querySelector('[data-done-title]').textContent = 'Fast geschafft.'
      doc.querySelector('[data-done-text]').textContent = 'Ihre Anfrage steht fertig in einer E-Mail. Bitte senden Sie sie in Ihrem Mailprogramm ab.'
      var m = doc.querySelector('[data-done-mail]'); m.hidden = false; m.href = href
      location.href = href
    }
    show(last)
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault()
    if (sending || !valid(steps[at])) return
    for (var i = 0; i < last; i++) if (!valid(steps[i])) return show(i, true)
    sending = true
    var d = new FormData(form), data = {}
    d.forEach(function (v, k) { if (k !== 'zeit') data[k] = String(v).trim() })
    data.zeit = d.getAll('zeit')
    data.thema_text = labelOf('thema'); data.ort_text = labelOf('ort'); data.zeit_text = labelOf('zeit')
    var b = form.querySelector('[type=submit]'); b.disabled = true
    fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { finish(r.ok, data) }, function () { finish(false, data) })
      .then(function () { b.disabled = false })
  })

  form.addEventListener('change', function (e) {
    var s = e.target.closest('.step'); if (!s) return
    fail(s, '')
    if (s.dataset.kind === 'single' && e.target.type === 'radio') {
      e.target.parentNode.classList.add('pulse')
      setTimeout(function () { e.target.parentNode.classList.remove('pulse'); if (steps[at] === s) go() }, calm ? 0 : 380)
    }
  })
  form.addEventListener('click', function (e) { if (e.target.closest('[data-next]')) go() })
  prev.addEventListener('click', function () { show(at - 1, true) })
  fwd.addEventListener('click', go)
  doc.addEventListener('keydown', function (e) {
    if (at === last || e.metaKey || e.altKey) return
    var s = steps[at], tag = e.target.tagName
    if (e.key === 'Enter') {
      if (tag === 'TEXTAREA' && !e.ctrlKey) return
      if (tag === 'A' || (tag === 'BUTTON' && !e.target.closest('.step'))) return
      e.preventDefault()
      if (at === last - 1) form.requestSubmit(); else go()
      return
    }
    if (tag === 'INPUT' && e.target.type !== 'radio' && e.target.type !== 'checkbox' || tag === 'TEXTAREA') return
    var i = 'abcdefgh'.indexOf(e.key.toLowerCase()), opts = s.querySelectorAll('.opt input')
    if (i > -1 && opts[i] && !e.ctrlKey) { opts[i].click(); opts[i].focus() }
  })

  // Vorauswahl aus dem Link oder dem Satz auf der Startseite (?thema=…&ort=…&zeit=…): beantwortete Fragen überspringen
  var q = new URLSearchParams(location.search), start = 0
  ;['thema', 'ort', 'zeit'].every(function (name, i) {
    var v = (q.get(name) || '').replace(/[^a-z]/g, ''), el = v && form.querySelector('input[name="' + name + '"][value="' + v + '"]')
    if (!el) return false
    el.checked = true; start = i + 1
    return true
  })
  show(start)
})()

/* Szenen nur im Sichtfeld animieren; kleines Geheimnis */
;(() => {
  const ways = document.querySelectorAll('.way');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('pz', !e.isIntersecting)), { rootMargin: '80px' });
    ways.forEach((w) => { w.classList.add('pz'); io.observe(w); });
  }
  const out = document.querySelectorAll('[data-secret] span');
  const words = ['Alles', 'hat einen', 'Sinn.'];
  document.querySelectorAll('.hs').forEach((b) => b.addEventListener('click', () => {
    const i = +b.dataset.i; b.classList.add('found');
    if (out[i]) { out[i].textContent = words[i]; requestAnimationFrame(() => out[i].classList.add('on')); }
  }));
})();
