// Menü, Erscheinen, Zählen und die Terminanfrage. Ohne Skript bleibt alles sichtbar und bedienbar.
// Fenster am Handy: erst als Karte mit Rand, am Griff hochziehen bis zur ganzen Seite, wieder runter und wegziehen
;(function () {
  var mq = matchMedia('(max-width: 640px)')
  window.sheetSnap = function (o) {
    var el = o.el, st = { p: 0, on: false, d: null }, gap = o.gap == null ? 8 : o.gap
    var boxH = function () { return o.box ? o.box.clientHeight : (window.visualViewport ? visualViewport.height : innerHeight) }
    var sizes = function () {
      var full = Math.round(boxH() - gap), half = Math.round(Math.min(o.half ? o.half() : full * .66, full - 40))
      return { full: full, half: Math.max(160, half) }
    }
    var apply = function (p, ty) {
      var z = sizes(); st.p = p
      el.style.setProperty('--p', p.toFixed(3))
      el.style.height = Math.round(z.half + p * (z.full - z.half)) + 'px'
      el.style.transform = ty ? 'translateY(' + Math.round(ty) + 'px)' : ''
      el.classList.toggle('is-full', p > .98)
    }
    var api = {
      expand: function () { if (st.on && mq.matches && st.p < .98) apply(1, 0) },
      reset: function (on) {
        st.on = !!on; el.classList.remove('is-drag', 'is-full')
        if (!on || !mq.matches) { el.style.removeProperty('--p'); el.style.height = ''; el.style.transform = ''; st.p = 0; return }
        el.style.height = ''; el.style.transform = ''
        apply(0, 0)
      }
    }
    var down = function (e) {
      if (!mq.matches || !st.on || (e.target.closest && e.target.closest('button, a, input'))) return
      var z = sizes(); st.d = { y: e.clientY, t: Date.now(), p0: st.p, h0: z.half + st.p * (z.full - z.half), z: z, p: st.p, ty: 0 }
      el.classList.add('is-drag')
      try { e.currentTarget.setPointerCapture(e.pointerId) } catch (err) {}
    }
    var move = function (e) {
      var d = st.d; if (!d) return
      var h = Math.min(d.z.full + 18, d.h0 - (e.clientY - d.y)), p, ty = 0
      if (h >= d.z.half) p = Math.min(1, (h - d.z.half) / (d.z.full - d.z.half)); else { p = 0; ty = d.z.half - h }
      d.p = p; d.ty = ty; apply(p, ty)
    }
    var up = function (e) {
      var d = st.d; if (!d) return
      st.d = null
      var v = (e.clientY - d.y) / Math.max(1, Date.now() - d.t), target
      if (v < -.18) target = 1
      else if (d.ty > d.z.half * .3 || (v > .5 && d.p0 < .5 && d.p < .02)) target = -1
      else if (v > .5) target = 0
      else target = d.p > .5 ? 1 : 0
      el.classList.remove('is-drag')
      if (target < 0) { var t = d.ty; el.style.transform = ''; o.close(); return }
      apply(target, 0)
    }
    // Wischen im Inhalt: erst zieht es das Fenster hoch, ist es ganz oben, scrollt der Inhalt weiter; ganz oben am Anfang zieht Wischen nach unten es wieder zurück
    var finish = function (y) { up({ clientY: y }) }
    if (o.content) {
      var c = o.content, ts = null
      c.addEventListener('touchstart', function (e) {
        if (!mq.matches || !st.on || e.touches.length !== 1) { ts = null; return }
        ts = { y: e.touches[0].clientY, undecided: true, drag: false, sc: c.scrollTop, last: e.touches[0].clientY }
      }, { passive: true })
      c.addEventListener('touchmove', function (e) {
        if (!ts) return
        var y = e.touches[0].clientY, dy = y - ts.y; ts.last = y
        if (ts.undecided) {
          if (Math.abs(dy) < 6) return
          ts.undecided = false
          var isFull = st.p > .98
          if ((dy < 0 && !isFull) || (dy > 0 && !isFull) || (dy > 0 && isFull && c.scrollTop <= 0)) {
            var z = sizes()
            st.d = { y: y, t: Date.now(), p0: st.p, h0: z.half + st.p * (z.full - z.half), z: z, p: st.p, ty: 0, sc0: c.scrollTop }
            ts.drag = true; el.classList.add('is-drag')
          }
        }
        if (ts.drag && st.d) {
          if (e.cancelable) e.preventDefault()
          var d = st.d, h = d.h0 - (y - d.y), p, ty = 0
          if (h > d.z.full) { c.scrollTop = d.sc0 + (h - d.z.full); h = d.z.full }
          if (h >= d.z.half) p = Math.min(1, (h - d.z.half) / (d.z.full - d.z.half)); else { p = 0; ty = d.z.half - h }
          d.p = p; d.ty = ty; apply(p, ty)
        }
      }, { passive: false })
      var tend = function () { if (ts && ts.drag && st.d) finish(ts.last); ts = null }
      c.addEventListener('touchend', tend); c.addEventListener('touchcancel', tend)
    }
    ;(o.grips || []).forEach(function (g) {
      if (!g) return
      g.addEventListener('pointerdown', down); g.addEventListener('pointermove', move)
      g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up)
    })
    var rs = function () { if (st.on && mq.matches) apply(st.p, 0) }
    addEventListener('resize', rs); if (window.visualViewport) visualViewport.addEventListener('resize', rs)
    return api
  }
})()

;(function () {
  var doc = document, root = doc.documentElement
  var calm = matchMedia('(prefers-reduced-motion: reduce)').matches

  // Unterseiten: der Termin-Knopf unten blendet nach zwei Sekunden weich ein
  var svcBook = doc.querySelector('.svc-book')
  if (svcBook) setTimeout(function () { svcBook.classList.add('is-ready') }, calm ? 0 : 2000)

  // Kopf: Linie erst beim Scrollen, Menü am Handy
  var top = doc.querySelector('.top'), btn = doc.querySelector('.menu-btn')
  var dock = doc.querySelector('[data-dock]')
  var loc = doc.querySelector('[data-loc]')
  var onScroll = function () {
    top.classList.toggle('scrolled', scrollY > 8)
    if (dock) dock.classList.toggle('show', scrollY > innerHeight * .6)
    if (loc) loc.classList.toggle('show', scrollY > innerHeight * .6)
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll()
  // Standort: Karte mit Route unten links, die Google-Karte lädt erst nach einem Klick
  if (loc) {
    var locCard = loc.querySelector('.loc-card'), locLoad = loc.querySelector('[data-loc-load]'), locFrom = null
    var locOpeners = [].slice.call(doc.querySelectorAll('[data-loc-open]'))
    var locSnap = sheetSnap({ el: locCard, grips: [locCard.querySelector('.loc-grip')], box: loc, gap: 8, close: function () { closeLoc() }, half: function () { var m = locCard.querySelector('.loc-map'), b = locCard.querySelector('.loc-body'); return 168 + b.offsetHeight } })
    var setLoc = function (open) { loc.classList.toggle('open', open); locCard.hidden = !open; locSnap.reset(open); locOpeners.forEach(function (b) { b.setAttribute('aria-expanded', String(open)) }) }
    var closeLoc = function () { setLoc(false); if (locFrom && locFrom.offsetParent) locFrom.focus() }
    locOpeners.forEach(function (b) { b.addEventListener('click', function () { locFrom = b; setLoc(true); loc.querySelector('[data-loc-close]').focus() }) })
    loc.querySelector('[data-loc-close]').addEventListener('click', closeLoc)
    loc.addEventListener('click', function (e) { if (e.target === loc && loc.classList.contains('open')) closeLoc() })
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && loc.classList.contains('open')) closeLoc() })
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
  // Lange Seiten: jeder Abschnitt klappt auf, damit zuerst nur die Überschriften zu sehen sind
  doc.querySelectorAll('.prose[data-fold]').forEach(function (prose) {
    var heads = [].filter.call(prose.children, function (c) { return c.tagName === 'H2' })
    if (heads.length < 2) return
    heads.forEach(function (h, i) {
      var d = doc.createElement('details'), sum = doc.createElement('summary'), body = doc.createElement('div'), n
      d.className = 'fold'; body.className = 'fold-body'
      h.classList.remove('rv'); h.removeAttribute('style')
      prose.insertBefore(d, h); sum.appendChild(h); d.appendChild(sum); d.appendChild(body)
      while ((n = d.nextSibling) && n.tagName !== 'H2') body.appendChild(n)
      if (i === 0) d.open = true
    })
    var openFor = function () {
      var t = location.hash && doc.getElementById(decodeURIComponent(location.hash.slice(1)))
      var d = t && t.closest && t.closest('details.fold'); if (d && !d.open) d.open = true
    }
    addEventListener('hashchange', openFor); openFor()
    doc.querySelectorAll('.toc a[href^="#"]').forEach(function (a) { a.addEventListener('click', function () { setTimeout(openFor, 0) }) })
  })

  // Lange Inhalte bauen sich Zeile für Zeile auf
  if (!calm) doc.querySelectorAll('.prose > *, .rows > .row, .fees > *, .faq > *, .glance > *').forEach(function (el) {
    if (el.classList.contains('rv') || el.closest('.rv')) return
    var i = [].indexOf.call(el.parentNode.children, el)
    el.classList.add('rv'); el.style.setProperty('--d', (i % 5) * 60 + 'ms')
  })
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
  // Zeichnungen laufen nur, solange sie zu sehen sind
  if ('IntersectionObserver' in window) {
    var artIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.target.classList.toggle('off', !e.isIntersecting) })
    })
    doc.querySelectorAll('.art').forEach(function (el) { artIo.observe(el) })
  }

  // Darstellung: hell, wie das Gerät oder dunkel
  var themeBtns = doc.querySelectorAll('[data-theme-set]')
  var setTheme = function (t) {
    try { localStorage.setItem('zt-theme', t) } catch (e) {}
    root.dataset.themeChoice = t
    root.dataset.theme = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light'
    themeBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.themeSet === t)) })
    var meta = doc.querySelector('meta[name=theme-color]'); if (meta) meta.content = root.dataset.theme === 'dark' ? '#121814' : '#F8F6EE'
  }
  doc.querySelectorAll('[data-theme-toggle]').forEach(function (b) { b.addEventListener('click', function () { setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark') }) })
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener && matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (root.dataset.themeChoice === 'system') setTheme('system') })
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
  // Nur am großen Bildschirm als Popup; am Handy öffnet sich direkt die eigene Seite.
  var wide = matchMedia('(min-width: 961px) and (hover: hover)')
  if (sheet && sheet.showModal) {
    doc.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="/termin/"]')
      if (!a || a.closest('.sheet') || e.metaKey || e.ctrlKey || e.shiftKey || !wide.matches) return
      e.preventDefault()
      sheet.querySelector('[data-sheet-form]').href = a.getAttribute('href')
      sheet.showModal()
    })
    sheet.addEventListener('click', function (e) { if (e.target === sheet || e.target.closest('[data-sheet-close]')) sheet.close() })
    // Am Handy lässt sich das Blatt am Griff nach unten wegziehen
    var sGrip = sheet.querySelector('.sheet-grip'), sDrag = null
    if (sGrip) {
      sGrip.addEventListener('pointerdown', function (e) { sDrag = { y: e.clientY, t: Date.now(), dy: 0 }; sheet.classList.add('is-drag'); try { sGrip.setPointerCapture(e.pointerId) } catch (err) {} })
      sGrip.addEventListener('pointermove', function (e) { if (!sDrag) return; sDrag.dy = Math.max(0, e.clientY - sDrag.y); sheet.style.transform = 'translateY(' + sDrag.dy + 'px)' })
      var sEnd = function () {
        if (!sDrag) return
        var go = sDrag.dy > 12 && (sDrag.dy / Math.max(1, Date.now() - sDrag.t) > .6 || sDrag.dy > sheet.offsetHeight * .28)
        sheet.classList.remove('is-drag'); sheet.style.transform = ''; sDrag = null
        if (go) sheet.close()
      }
      sGrip.addEventListener('pointerup', sEnd); sGrip.addEventListener('pointercancel', sEnd)
    }
  }

  // Chat: geführte Antworten aus den Inhalten der Seite, Aufbau wie bei Primava
  var cw = doc.querySelector('[data-chat]')
  if (cw) {
    var launcher = cw.querySelector('.cw-launcher'), panel = cw.querySelector('.cw-panel'), thread = cw.querySelector('.cw-thread')
    var chips = cw.querySelector('.cw-chips'), composer = cw.querySelector('.cw-composer'), started = false, started2 = false, typing = null, busy = false
    var el = function (tag, cls, text) { var n = doc.createElement(tag); n.className = cls; if (text) n.textContent = text; return n }
    var down = function () { thread.scrollTo({ top: thread.scrollHeight, behavior: calm ? 'auto' : 'smooth' }) }
    // Antworten kommen vom Server (/api/chat); fällt er aus, bleibt ein ehrlicher Hinweis mit den Kontaktwegen
    var OFFLINE = { text: ['Die Antwort ist gerade nicht erreichbar. Pamela Zurbuchen erreichen Sie über die Kontaktseite oder per E-Mail an zurbuchen-therapie@gmx.de.'], chips: [{ label: 'Termin anfragen', href: '/termin/', primary: true }, { label: 'Zur Kontaktseite', href: '/kontakt/' }] }
    var api = function (body) {
      var opt = body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}
      return fetch('/api/chat', opt).then(function (r) { if (!r.ok) throw new Error('chat'); return r.json() }).catch(function () { return OFFLINE })
    }
    var setChips = function (list) {
      chips.textContent = ''; chips.hidden = !list.length
      list.forEach(function (c) {
        var n = el(c.href ? 'a' : 'button', 'cw-chip' + (c.primary ? ' is-primary' : ''), c.label)
        if (c.href) n.href = c.href
        else { n.type = 'button'; n.addEventListener('click', function () { if (!busy) { user(c.label); ask({ ask: c.ask }) } }) }
        chips.appendChild(n)
      })
    }
    var user = function (text) { var m = el('div', 'cw-msg cw-msg-user'); m.appendChild(el('p', '', text)); thread.appendChild(m); if (chatSnap) chatSnap.expand(); down() }
    var botRow = function () {
      var m = el('div', 'cw-msg cw-msg-bot'), av = el('img', 'cw-msg-avatar')
      av.src = '/img/pamela-avatar.webp?v=2'; av.alt = ''; av.width = 28; av.height = 28
      m.appendChild(av); m.appendChild(el('div', 'cw-bubble')); return m
    }
    var ask = function (body, now) {
      var wait = botRow(); busy = true
      wait.lastChild.className = 'cw-bubble cw-typing'
      for (var i = 0; i < 3; i++) wait.lastChild.appendChild(doc.createElement('span'))
      setChips([]); clearTimeout(typing); thread.appendChild(wait); down()
      var t0 = Date.now()
      api(body).then(function (node) {
        var len = (node.text || []).join(' ').length, delay = calm || now ? 0 : Math.max(0, 450 + Math.min(900, len * 3) - (Date.now() - t0))
        typing = setTimeout(function () {
          wait.remove()
          var m = botRow(); (node.text || []).forEach(function (t) { m.lastChild.appendChild(el('p', '', t)) })
          thread.appendChild(m); setChips(node.chips || []); if (started2 && chatSnap) chatSnap.expand(); started2 = true; down(); busy = false
        }, delay)
      })
    }
    // Am Handy folgt das Fenster dem sichtbaren Bereich, damit die Tastatur nichts verdeckt
    var vv = window.visualViewport
    var syncViewport = function () {
      if (!cw.classList.contains('is-open')) { root.style.removeProperty('--cw-vvh'); root.style.removeProperty('--cw-top'); return }
      root.style.setProperty('--cw-vvh', Math.round(vv ? vv.height : innerHeight) + 'px')
      root.style.setProperty('--cw-top', Math.round(vv ? vv.offsetTop : 0) + 'px')
    }
    if (vv) { vv.addEventListener('resize', syncViewport); vv.addEventListener('scroll', syncViewport) }
    var chatSnap = null
    var setChat = function (on) {
      cw.classList.toggle('is-open', on); panel.inert = !on
      if (chatSnap) chatSnap.reset(on)
      launcher.setAttribute('aria-expanded', String(on))
      launcher.setAttribute('aria-label', on ? 'Chat schließen' : 'Chat öffnen')
      if (innerWidth <= 640) doc.body.style.overflow = on ? 'hidden' : ''
      syncViewport()
      if (on && !started) { started = true; ask(null, true) }
      if (on && matchMedia('(pointer: fine)').matches) setTimeout(function () { composer.q.focus({ preventScroll: true }) }, 280)
    }
    launcher.addEventListener('click', function () { setChat(!cw.classList.contains('is-open')) })
    chatSnap = sheetSnap({ el: panel, grips: [cw.querySelector('.cw-grip'), cw.querySelector('.cw-head')], content: thread, box: cw, scroller: null, gap: 8, close: function () { setChat(false) }, half: function () { return Math.min(cw.clientHeight * .72, 640) } })
    ;['focus', 'input', 'pointerdown'].forEach(function (ev) { composer.q.addEventListener(ev, function () { if (chatSnap) chatSnap.expand() }) })
    doc.querySelectorAll('[data-chat-open]').forEach(function (b) { b.addEventListener('click', function () { setChat(true) }) })
    cw.querySelectorAll('[data-chat-close]').forEach(function (b) { b.addEventListener('click', function () { setChat(false) }) })
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && cw.classList.contains('is-open')) { setChat(false); launcher.focus() } })
    composer.addEventListener('submit', function (e) {
      e.preventDefault()
      var q = composer.q.value.trim(); if (!q) return
      if (busy) return
      composer.q.value = ''; user(q); ask({ q: q })
    })
  }

  // Kontaktformular: prüfen, senden, Dank an Ort und Stelle; ohne Server geht die Nachricht ins Mailprogramm
  var cform = doc.getElementById('kontakt-form')
  if (cform) {
    var cErr = cform.querySelector('[data-cform-error]'), cDone = cform.querySelector('[data-cform-done]'), cBtn = cform.querySelector('button[type="submit"]')
    var thanks = function () { cform.classList.add('is-done'); cDone.hidden = false; cDone.focus({ preventScroll: true }) }
    if (/[?&]gesendet=1/.test(location.search)) thanks()
    var fail = function (msg) { cErr.textContent = msg; cErr.hidden = false }
    cform.addEventListener('input', function (e) { var f = e.target.closest('.cfield, .ccheck'); if (f) f.classList.remove('is-bad') })
    cform.addEventListener('submit', function (e) {
      e.preventDefault(); cErr.hidden = true
      var bad = null
      ;[].forEach.call(cform.querySelectorAll('input[required], textarea[required]'), function (i) {
        var ok = i.type === 'checkbox' ? i.checked : i.checkValidity() && i.value.trim().length >= (i.minLength > 0 ? i.minLength : 1)
        i.closest('.cfield, .ccheck').classList.toggle('is-bad', !ok); if (!ok && !bad) bad = i
      })
      if (bad) { fail(bad.type === 'checkbox' ? 'Bitte stimmen Sie der Verwendung Ihrer Angaben zu.' : bad.type === 'email' ? 'Bitte geben Sie eine gültige E-Mail-Adresse an.' : 'Bitte füllen Sie die markierten Felder aus.'); bad.focus(); return }
      var data = {}; [].forEach.call(cform.elements, function (i) { if (i.name) data[i.name] = i.type === 'checkbox' ? i.checked : i.value })
      cBtn.disabled = true; cBtn.textContent = 'Wird gesendet …'
      var reset = function () { cBtn.disabled = false; cBtn.textContent = 'Nachricht senden' }
      fetch(cform.action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.ok ? thanks() : Promise.reject(r.status) })
        .catch(function (status) {
          reset()
          if (status === 400) return fail('Bitte prüfen Sie Ihre Angaben.')
          var body = ['Guten Tag Frau Zurbuchen,', '', data.nachricht, '', 'Name: ' + data.name, data.telefon ? 'Telefon: ' + data.telefon : ''].join('\n').trim()
          fail('Der Versand hat gerade nicht geklappt. Ihre Nachricht öffnet sich in Ihrem Mailprogramm.')
          location.href = 'mailto:' + cform.dataset.mail + '?subject=' + encodeURIComponent('Nachricht über die Website') + '&body=' + encodeURIComponent(body)
        })
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
    bar.style.width = Math.min(1, (at + 1) / last) * 100 + '%'
    prev.disabled = at === 0 || at === last
    fwd.textContent = at === last - 1 ? 'Anfrage senden' : 'Weiter'
    fwd.classList.toggle('send', at === last - 1)
    doc.querySelector('[data-count-label]').textContent = at < last ? (at + 1) + ' von ' + last : ''
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
  fwd.addEventListener('click', function () { if (at === last - 1) form.requestSubmit(); else go() })
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

// Auswahl im Hero: am Desktop ein eigenes kleines Menü, am Handy bleibt die Auswahl des Geräts
;(function () {
  var doc = document
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return
  var menu = null, owner = null, at = 0
  var close = function (focus) {
    if (!menu) return
    menu.remove(); owner.setAttribute('aria-expanded', 'false')
    if (focus) owner.focus({ preventScroll: true })
    menu = null; owner = null
  }
  var mark = function (i) {
    var items = menu.children
    at = (i + items.length) % items.length
    for (var k = 0; k < items.length; k++) items[k].classList.toggle('on', k === at)
  }
  var pick = function (i) {
    var sel = owner
    if (sel.selectedIndex !== i) { sel.selectedIndex = i; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })) }
    close(true)
  }
  var open = function (sel) {
    if (menu) { var same = owner === sel; close(false); if (same) return }
    owner = sel; menu = doc.createElement('div'); menu.className = 'qmenu'; menu.setAttribute('role', 'listbox')
    ;[].forEach.call(sel.options, function (o, i) {
      var b = doc.createElement('button'); b.type = 'button'; b.tabIndex = -1; b.textContent = o.textContent
      b.setAttribute('role', 'option'); b.setAttribute('aria-selected', String(i === sel.selectedIndex))
      b.addEventListener('click', function () { pick(i) })
      b.addEventListener('mousemove', function () { mark(i) })
      menu.appendChild(b)
    })
    doc.body.appendChild(menu); sel.setAttribute('aria-expanded', 'true')
    var r = sel.getBoundingClientRect(), w = menu.offsetWidth, h = menu.offsetHeight
    var left = Math.max(12, Math.min(r.left - 8, innerWidth - w - 12))
    var top = r.bottom + 8 + h > innerHeight - 8 && r.top - 8 - h > 8 ? r.top - 8 - h : r.bottom + 8
    menu.style.left = left + scrollX + 'px'; menu.style.top = top + scrollY + 'px'
    mark(sel.selectedIndex)
  }
  ;[].forEach.call(doc.querySelectorAll('.quick select'), function (sel) {
    sel.setAttribute('aria-haspopup', 'listbox'); sel.setAttribute('aria-expanded', 'false')
    sel.addEventListener('mousedown', function (e) { if (e.button) return; e.preventDefault(); sel.focus({ preventScroll: true }); open(sel) })
    sel.addEventListener('keydown', function (e) {
      var k = e.key
      if (!menu || owner !== sel) {
        if (k === ' ' || k === 'Enter' || k === 'ArrowDown' || k === 'ArrowUp') { e.preventDefault(); open(sel) }
        return
      }
      if (k === 'ArrowDown') { e.preventDefault(); mark(at + 1) }
      else if (k === 'ArrowUp') { e.preventDefault(); mark(at - 1) }
      else if (k === 'Home') { e.preventDefault(); mark(0) }
      else if (k === 'End') { e.preventDefault(); mark(menu.children.length - 1) }
      else if (k === 'Enter' || k === ' ') { e.preventDefault(); pick(at) }
      else if (k === 'Escape') { e.preventDefault(); close(true) }
      else if (k === 'Tab') close(false)
    })
    sel.addEventListener('blur', function () { setTimeout(function () { if (menu && owner === sel && !menu.contains(doc.activeElement)) close(false) }, 120) })
  })
  doc.addEventListener('mousedown', function (e) { if (menu && !menu.contains(e.target) && e.target !== owner) close(false) })
  addEventListener('resize', function () { close(false) })
})()

// Kursdetails: Fenster öffnen, schließen und am Handy am Griff nach unten wegziehen
;(function () {
  var doc = document
  doc.querySelectorAll('[data-course-open]').forEach(function (b) {
    var dlg = doc.getElementById(b.dataset.courseOpen)
    if (!dlg || !dlg.showModal) return
    b.addEventListener('click', function () { dlg.showModal(); dlg.querySelector('.sheet-in').scrollTop = 0; if (dlg._snap) dlg._snap.reset(true) })
  })
  doc.querySelectorAll('.course-sheet').forEach(function (dlg) {
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.closest('[data-sheet-close]')) dlg.close() })
    var snap = sheetSnap({ el: dlg, grips: [dlg.querySelector('.sheet-grip')], content: dlg.querySelector('.sheet-in'), gap: 8, close: function () { dlg.close() } })
    dlg._snap = snap
    dlg.addEventListener('close', function () { snap.reset(false) })
  })
})()
