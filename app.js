/* LTA Operators Conference 2027 · beon. worldwide for Airbus
   One engine: GSAP + ScrollTrigger, Lenis smooth wheel (fine pointers), one fixed vector field behind every scene,
   scroll-scrubbed entrances, and pinned stretches where ONE gesture (wheel, swipe, key) plays ONE complete step. */
(() => {
  gsap.registerPlugin(ScrollTrigger);
  const CAP = !!window.__CAPTURE;
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pad2 = (v) => String(v).padStart(2, '0');
  const setCnt = (e, i, n) => { if (e.closest('.steps') || e.hasAttribute('data-pad')) e.innerHTML = `<b>${pad2(i + 1)}</b><span>/ ${pad2(n)}</span>`; else e.textContent = `${i + 1} / ${n}`; };
  const BG = { night: '#001c3b', navy: '#243a5e', sky: '#e4ebf4', dusk: '#3c5078' };
  const PROFILE = { act2: 'night', s00: 'night', s01: 'navy', s02: 'navy', s02a: 'sky', s02b: 'night', s03a: 'night', s03b: 'night', s03c: 'night', s04a: 'sky', s04b: 'sky', s04c: 'night', s04d: 'night', s05: 'night', s06: 'night', s06b: 'night', s07: 'night', s08: 'night', s09: 'night' };
  // how present the vector field is behind each scene (content-heavy scenes keep it quieter)
  const FIELD = { s00: 1, s01: .85, s02a: .6, s02b: .5, s03a: .7, s03b: .8, s03c: .45, s04a: .4, s04b: .4, s04c: .6, s04d: .6, s05: .75, s06: .8, s06b: .5, s07: .75, s08: .5, s09: .6 };
  const secs = $$('main > .sc, .ft');
  const RMQ = matchMedia('(prefers-reduced-motion: reduce)');
  ScrollTrigger.config({ ignoreMobileResize: true });

  function fit() { root.style.setProperty('--k', Math.max(Math.min(innerWidth / 1440, innerHeight / 800, 1.3), .5)); }
  fit();
  addEventListener('resize', fit);

  /* v2.20 (11 nov): landscape tablets keep the laptop canvas and its animations, but the canvas is shown at ~71 %, so
     its small type gets a lift: every text of 16 px or less inside the canvas grows by the same factor (the hierarchy
     stays), until it reads at least like 16 px at 84 % on screen. Runs before any scene measures itself. */
  const TBQ = matchMedia('(pointer:coarse) and (orientation:landscape) and (min-width:900px)');
  const TIGHT = '#s03b .mfd, #s06b .wgate, #s06b .whint', FULL = '#s01 .pbk';   // the objectives card (back of the pass) is already full
  const lift = () => {
    const k = parseFloat(getComputedStyle(root).getPropertyValue('--k')) || 1, f = TBQ.matches ? clamp(.84 / k, 1, 1.22) : 1;
    root.classList.toggle('tb', f > 1);
    $$('.stage-l *').forEach(el => {
      if (el.closest('svg')) return;
      if (!Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim())) return;
      if (el.dataset.fs0 == null) {
        if (f === 1) return;
        const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize); if (fs > 16.5) return;
        el.dataset.fs0 = fs; el.dataset.lh0 = cs.lineHeight.endsWith('px') ? parseFloat(cs.lineHeight) : '';
        el.dataset.fsi = el.style.fontSize; el.dataset.lhi = el.style.lineHeight;   // the inline values, to put back
      }
      const fs0 = +el.dataset.fs0, lh0 = el.dataset.lh0, g = el.closest(FULL) ? 1 : el.closest(TIGHT) ? 1 + (f - 1) * .35 : f;   // boxes of fixed height lift less
      el.style.fontSize = f > 1 ? (fs0 * g).toFixed(2) + 'px' : el.dataset.fsi;
      el.style.lineHeight = f > 1 && lh0 ? (+lh0 * g).toFixed(2) + 'px' : el.dataset.lhi;
    });
  };
  lift();
  TBQ.addEventListener('change', () => { lift(); ScrollTrigger.refresh(); });

  // (v2.11: the touchpoint captions were removed; the old caption fitter is gone)

  /* ---------- smooth scroll (wheel only; touch keeps native momentum) ---------- */
  let lenis = null;
  if (!CAP && !RMQ.matches && window.Lenis && matchMedia('(pointer: fine)').matches) {
    lenis = new Lenis({ lerp: .11, wheelMultiplier: 1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const SCRUB = lenis ? true : .4;
  const ease3 = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let navTo = null;
  const px = { v: 0 };
  const curY = () => (navTo != null ? navTo : lenis ? lenis.targetScroll : scrollY);
  function scrollToY(y, dur = .85, done) {
    navTo = y;
    const fin = () => { navTo = null; done && done(); };
    if (RMQ.matches) { scrollTo(0, y); requestAnimationFrame(fin); return; }
    if (lenis) lenis.scrollTo(y, { duration: dur, easing: ease3, force: true, lock: true, onComplete: fin });
    else { px.v = scrollY; gsap.to(px, { v: y, duration: dur, ease: 'power2.inOut', overwrite: true, onUpdate: () => scrollTo(0, px.v), onComplete: fin }); }
  }

  /* ---------- the fixed vector field: one background for the whole flight ---------- */
  const fieldState = { amt: 1 };
  let fieldOff = 0;  // added when the index jumps, so the field keeps flying instead of jumping
  (() => {
    const cv = document.createElement('canvas');
    cv.id = 'field'; cv.setAttribute('aria-hidden', 'true');
    document.body.prepend(cv);
    const g = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, last = '';
    const size = () => { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); last = ''; };
    size(); addEventListener('resize', size);
    const line = (x1, y1, x2, y2) => { g.moveTo(x1, y1); g.lineTo(x2, y2); };
    // the flight never stops (7 nov): the road and the sky always move forward at a gentle cruise, and every scroll or
    // step adds speed that eases back down; the distance flown only grows, whichever way the page goes
    let drift = 0, vel = 60, lastS = null, lastT = performance.now();
    function draw() {
      const now = performance.now(), dt = Math.min(.1, (now - lastT) / 1000); lastT = now;
      const sc = lenis ? lenis.animatedScroll : scrollY;
      let ds = lastS == null ? 0 : Math.abs(sc - lastS); lastS = sc;
      if (ds > H * .9 || navTo != null) ds = 0;             // cuts and jumps move the page, not the plane
      const target = 60 + Math.min(1400, ds / Math.max(dt, .008) * 1.1);
      vel += (target - vel) * Math.min(1, dt * (target > vel ? 3 : 1.2));
      drift += vel * dt;
      const s = RMQ.matches ? 0 : drift;
      const dark = root.dataset.ink === 'dark';
      const key = Math.round(s * 4) + '|' + dark + '|' + fieldState.amt.toFixed(3) + '|' + W + 'x' + H + '|' + Math.round(sc);
      if (key === last) return; last = key;
      const max = Math.max(1, document.documentElement.scrollHeight - H), p = (RMQ.matches ? 0 : sc + fieldOff) / max;
      fieldNow.s = s; fieldNow.p = p;
      paint(g, W, H, dpr, s, p, dark, fieldState.amt);
    }
    // the field itself, drawn into any 2D context (the page canvas, or a copy carried by a scene: the mail banner)
    const fieldNow = { s: 0, p: 0 };
    function paint(g, W, H, dpr, s, p, dark, amt) {
      const line = (x1, y1, x2, y2) => { g.moveTo(x1, y1); g.lineTo(x2, y2); };
      const rgb = dark ? '0,32,91' : '201,211,227', A = (dark ? .11 : .14) * amt * (W < 768 || (W < H && W < 1200) ? .6 : 1);
      const st = (a) => (g.strokeStyle = `rgba(${rgb},${Math.max(0, Math.min(1, a)).toFixed(3)})`);
      const mob = W < 768 || (W < H && W < 1200);
      const hy = H * ((mob ? .84 : .70) + (mob ? .05 : .08) * Math.sin(p * Math.PI * 2.4 + 0.5)), vx = W * 0.5;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); g.lineWidth = 1;
      // sky: rays fanning up from the vanishing point, turning slowly with the scroll
      g.save(); g.beginPath(); g.rect(0, 0, W, hy); g.clip();
      const N = mob ? 18 : 26, sp = Math.PI / N, off = ((s * 0.00022) % sp + sp) % sp, R = Math.hypot(W, H) * 1.2;
      g.beginPath(); for (let i = 0; i <= N; i++) { const a = Math.PI + i * sp + off; line(vx, hy, vx + Math.cos(a) * R, hy + Math.sin(a) * R); } st(A * .8); g.stroke();
      // radar arcs expanding outward as you advance
      const f = ((s / 900) % 1 + 1) % 1, R0 = Math.min(W, H) * .16;
      for (let k = -1; k < 9; k++) {
        const r = R0 * Math.pow(1.42, k + f); if (r < 4) continue;
        const fade = Math.min(1, r / (R0 * 1.4)) * Math.max(0, 1 - r / (Math.hypot(W, H) * 1.05));
        g.beginPath(); g.arc(vx, hy, r, Math.PI, 2 * Math.PI); st(A * 1.5 * fade); g.stroke();
      }
      g.restore();
      // ground: horizon, perspective fan, cross lines rushing toward you, runway edges and centre dashes
      g.save(); g.beginPath(); g.rect(0, hy, W, H - hy); g.clip();
      g.beginPath(); line(0, hy, W, hy); st(A * 2.4); g.stroke();
      const D = H - hy, M = mob ? 14 : 22;
      g.beginPath(); for (let i = -M; i <= M; i++) line(vx, hy, vx + i * W * .16, H + D * 4); st(A); g.stroke();
      const f2 = ((s / 320) % 1 + 1) % 1;
      for (let k = 0; k < 26; k++) {
        const z = k + 1 - f2; if (z < .35) continue;
        const y = hy + D * .9 / z; if (y > H + 2) continue;
        g.beginPath(); line(0, y, W, y); st(A * Math.min(1.4, 1.4 / z)); g.stroke();
      }
      const half = W * (mob ? .16 : .085);
      g.beginPath(); line(vx, hy, vx - half * 4, hy + D * 4); line(vx, hy, vx + half * 4, hy + D * 4); st(A * 2.6); g.stroke();
      for (let k = 0; k < 18; k++) {
        const z0 = k + 1 - f2, z1 = z0 + .45; if (z0 < .3) continue;
        const y0 = hy + D * .9 / z0, y1 = hy + D * .9 / z1;
        g.beginPath(); g.lineWidth = Math.max(1, 3 / z0); line(vx, Math.min(y0, H + 40), vx, y1); st(A * 3.2 * Math.min(1, 1.6 / z0)); g.stroke();
        // edge lights
        const t = (y0 - hy) / (D * 4), r = Math.max(.8, 2.6 / z0);
        if (y0 < H + 6) { g.fillStyle = `rgba(${dark ? '0,32,91' : '255,255,255'},${(A * 4.2 * Math.min(1, 1.4 / z0)).toFixed(3)})`; for (const sx of [-1, 1]) { g.beginPath(); g.arc(vx + sx * half * 4 * t, y0, r, 0, 7); g.fill(); } }
      }
      g.lineWidth = 1; g.restore();
    }
    gsap.ticker.add(draw);
    window.__field = { draw: () => { last = ''; draw(); }, paint: (ctx, w, h, r, dark, amt) => paint(ctx, w, h, r, fieldNow.s, fieldNow.p, dark, amt) };
  })();

  // index panel (opens where the user is; choosing a chapter is the only thing that scrolls)
  const ixb = $('#ixb'), ixp = $('#ixp');
  ixb.addEventListener('click', () => { const on = !ixp.classList.contains('on'); ixp.classList.toggle('on', on); ixb.setAttribute('aria-expanded', on); });
  $$('#ixp a').forEach(a => a.addEventListener('click', () => { ixp.classList.remove('on'); ixb.setAttribute('aria-expanded', false); }));
  // v2.22: when the index opens, the section on screen is marked (the deepest entry that matches it)
  const ixHere = () => {
    let id = null;
    const a1 = window.__act && window.__act(), a2 = window.__act2 && window.__act2(), y = scrollY;
    if (a2 && a2.st && y >= a2.st.start - 2 && y <= a2.st.end + 2) { const ch = a2.chs.filter(c => c.from <= a2.at).pop(); id = ch && ch.id; }
    else if (a1 && a1.st && y >= a1.st.start - 2 && y <= a1.st.end + 2) id = ['s00', 's01', 's02', 's02a'][Math.min(a1.at, 3)] || 's02a';
    else { const e = document.elementFromPoint(innerWidth / 2, innerHeight / 2); const sc = e && e.closest('section[id], .lay[id], .mlay[id]'); id = sc && sc.id; }
    const links = $$('#ixp a'); let hit = null;
    links.forEach(l => { if (l.getAttribute('href') === '#' + id) hit = l; });   // the last match is the most specific
    links.forEach(l => l.setAttribute('aria-current', l === hit ? 'true' : 'false'));
    if (hit) hit.scrollIntoView({ block: 'nearest' });
  };
  ixb.addEventListener('click', () => { if (ixp.classList.contains('on')) ixHere(); });

  /* ---------- one gesture = one step (shared by every pinned stretch) ---------- */
  let STEPPERS = [];
  // move the page without anyone seeing it: the field keeps its position, nothing in between
  function teleport(top) {
    const s0 = lenis ? lenis.animatedScroll : scrollY;
    navTo = top;
    if (lenis) lenis.scrollTo(top, { immediate: true, force: true }); else scrollTo(0, top);
    fieldOff += s0 - top;
    ScrollTrigger.update();
    requestAnimationFrame(() => requestAnimationFrame(() => { navTo = null; }));
  }
  // going up never plays a stretch backwards (6 nov): the scene keeps the state it is in and the page goes past it
  // in one gesture; it is only re-armed once it is entirely below the screen
  function passUp(o, cb) {
    if (o.up) { o.up(); cb && cb(); return; }
    o.frozen = true; o.q = 0; o.busy = true; o.drive = true; o.t0 = performance.now();
    const done = () => { o.busy = false; o.drive = false; cb && cb(); };
    const leave = () => { teleport(o.st.start); scrollToY(Math.max(0, o.st.start - innerHeight * .6), .8, done); };
    const y = curY();
    if (y > o.st.end + 2) scrollToY(o.st.end, clamp((y - o.st.end) / innerHeight * .8, .2, .6), leave); else leave();
  }
  let rvItems = [];
  let gid = 0, used = -1;
  const inside = (y) => STEPPERS.find(o => y >= o.st.start - 2 && y <= o.st.end + 2);
  // returns true when the gesture is taken by a stepper (and must not scroll the page)
  function intent(dir, g, dist) {
    if (window.__lbOpen) return true;                 // the lightbox holds the page still
    if (!STEPPERS.length || !dir) return false;
    const y = curY(), o = inside(y);
    // 7 nov (Israel): going up plays the steps backwards, one gesture per step, exactly like going down
    if (o) {
      if (g === used) return true;                    // tail of a gesture that already played a step
      o.frozen = false;
      if (dir < 0 && o.at <= 0 && o.upExit && !o.busy) { used = g; o.upExit(); return true; }   // act 2 → back into act 1
      const exit = (dir > 0 && o.at >= o.n - 1) || (dir < 0 && o.at <= 0);
      if (o.busy) { used = g; if (!exit && performance.now() - o.t0 > 300) o.q = clamp(o.q + dir, -1, 1); return true; }
      if (exit) return false;                           // free exit at both ends
      used = g; o.go(o.at + dir); return true;
    }
    for (const s of STEPPERS) {                         // just under a stretch that ends in place (the act → map): replay its exit backwards
      const yb = s.below && s.below();
      if (dir < 0 && yb != null && y >= yb - 4 && y <= yb + innerHeight * .25) { used = g; s.fromBelow(); return true; }
    }
    for (const s of STEPPERS) {                         // arriving at a stretch: land on its first (or last) step
      if (dir > 0 && y < s.st.start - 2 && y + dist >= s.st.start - 2) { used = g; s.frozen = false; s.land(0); return true; }
      if (dir < 0 && y > s.st.end + 2 && y + dist <= s.st.end + 2) { used = g; s.frozen = false; s.land(s.n - 1); return true; }
    }
    return false;
  }
  if (!CAP) {
    let lastT = 0, lastA = 0, lastS = 0;
    addEventListener('wheel', e => {
      if (!STEPPERS.length || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const m = e.deltaMode === 1 ? 16.7 : e.deltaMode === 2 ? innerHeight : 1, dy = e.deltaY * m, a = Math.abs(dy), sg = Math.sign(dy);
      if (!sg) return;
      if (e.timeStamp - lastT > 300 || sg !== lastS || (a > lastA * 2.2 && a > 24)) gid++;
      lastT = e.timeStamp; lastA = a; lastS = sg;
      if (intent(sg, gid, dy)) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, { capture: true, passive: false });
    addEventListener('keydown', e => {
      if (!STEPPERS.length || e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented) return;
      const t = e.target, k = e.key;
      if (t.closest && t.closest('input,textarea,select,[contenteditable],[data-gal-track],#ixp')) return;
      if (k === ' ' && t.closest && t.closest('button,a')) return;
      const dir = (k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !e.shiftKey)) ? 1 : (k === 'ArrowUp' || k === 'PageUp' || (k === ' ' && e.shiftKey)) ? -1 : 0;
      if (!dir) return;
      if (intent(dir, ++gid, dir * (k.startsWith('Arrow') ? 80 : innerHeight * .9))) e.preventDefault();
    }, true);
    // touch: the first move decides; inside a stretch the swipe is taken whole and plays one step
    let ty = null, tg = 0, tmode = 0, tfired = false, touching = false, tEnd = 0, frozen = false;
    const freeze = (on) => { frozen = on; root.classList.toggle('freeze', on); };
    addEventListener('touchstart', e => { touching = true; ty = e.touches.length === 1 ? e.touches[0].clientY : null; tg = ++gid; tmode = 0; tfired = false; }, { capture: true, passive: true });
    addEventListener('touchmove', e => {
      if (ty === null || !STEPPERS.length) return;
      const dy = ty - e.touches[0].clientY;
      if (frozen) { if (e.cancelable) e.preventDefault(); return; }
      if (!tmode) {
        if (!dy) return;
        const o = inside(curY());
        if (!o) { tmode = -1; return; }
        const dir = Math.sign(dy), exit = (dir > 0 && o.at >= o.n - 1) || (dir < 0 && o.at <= 0 && !o.upExit);
        tmode = exit && !o.busy ? -1 : 1;
      }
      if (tmode < 0) return;
      if (e.cancelable) e.preventDefault();
      if (!tfired && Math.abs(dy) > 28) { tfired = true; intent(Math.sign(dy), tg, dy); }
    }, { capture: true, passive: false });
    const tUp = () => { touching = false; ty = null; tEnd = performance.now(); if (frozen && navTo == null) freeze(false); };
    addEventListener('touchend', tUp, { capture: true, passive: true });
    addEventListener('touchcancel', tUp, { capture: true, passive: true });
    // a native swipe or its momentum that runs into a stretch is stopped and lands on its edge step
    let lastY = scrollY;
    addEventListener('scroll', () => {
      const y = scrollY;
      if (navTo == null && !lenis && (touching || performance.now() - tEnd < 1500) && Math.abs(y - lastY) < innerHeight) {
        for (const s of STEPPERS) {
          const down = lastY < s.st.start - 2 && y > s.st.start + 2, up = lastY > s.st.end + 2 && y < s.st.end - 2;
          if (!down && !up) continue;
          freeze(true); used = tg;
          const un = () => { if (!touching) freeze(false); };
          s.frozen = false; s.land(up ? s.n - 1 : 0, un);
          break;
        }
      }
      lastY = navTo != null ? navTo : y;
    }, { passive: true });
  }

  const mm = gsap.matchMedia();
  mm.add({ mob: '(max-width: 767px), (max-height: 560px), (orientation: portrait) and (max-width: 1199px)', lap: '(min-width: 768px) and (min-height: 561px) and (max-width: 1679px) and (orientation: landscape), (min-width: 1200px) and (min-height: 561px) and (max-width: 1679px)', desk: '(min-width: 1680px) and (min-height: 561px)', short: '(max-height: 560px)', reduce: '(prefers-reduced-motion: reduce)' }, (ctx) => {
    const c = ctx.conditions, RM = c.reduce || c.short;
    const stageOf = (sec) => (sec.classList.contains('ft') ? sec : $(c.mob ? '.stage-m' : '.stage-l', sec));
    const k = () => (c.mob ? 1 : parseFloat(getComputedStyle(root).getPropertyValue('--k')) || 1);
    const steppers = [];
    const HANDLED = new Set();   // elements a scene animates itself (the generic reveal leaves them alone)
    const own = (els) => { (els && els.length !== undefined ? els : [els]).forEach(e => e && HANDLED.add(e)); return els; };
    // Act 2 (6 nov, Israel's sketches): on laptop the map, proposal, concept, digital, venue, plenary, social event,
    // crew and sustainability are layers of ONE pinned scene; each gesture plays one step or one hand-over, in time
    const A2IDS = ['s03a', 's03b', 's03c', 's04b', 's04a', 's04c', 's05', 's06', 's06b', 's07'];
    const ACT2 = !c.mob && !RM && !!$('#s03a');
    const A2X = { loops: [] };
    let a2wrap = null;
    if (ACT2) {
      a2wrap = document.createElement('section');
      a2wrap.id = 'act2'; a2wrap.className = 'sc a2'; a2wrap.dataset.ch = $('#s03a').dataset.ch; a2wrap.dataset.th = 'night';
      a2wrap.setAttribute('aria-label', 'Proposal, conference, location, social event, team and sustainability');
      $('#s03a').before(a2wrap);
      A2IDS.forEach(id => { const s = $('#' + id); s.classList.add('a2l'); a2wrap.appendChild(s); });
    }
    const SECS = ACT2 ? secs.filter(s => !A2IDS.includes(s.id)).flatMap(s => (s.id === 's00' ? [s, a2wrap] : [s])) : secs;

    /* ---------- stepper helpers ---------- */
    function counter(S, n) {
      return (i) => {
        $$('[data-cnt]', S).forEach(e => setCnt(e, i, n));
        $$('.dots', S).forEach(d => $$('i', d).forEach((dot, j) => dot.classList.toggle('on', j === i)));
      };
    }
    // pinned stretch: the scroll only decides WHICH step is shown; each step always plays whole, in time
    function stepper(sec, n, build, onStep, per = 50, pace = 1.05) {
      const S = stageOf(sec), setC = counter(S, n);
      let cur = -1;
      const mark = (i) => { if (i === cur) return; cur = i; setC(i); onStep && onStep(i, S); };
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } });
      const je = build(tl, S);
      if (tl.duration() < n - 1) tl.set({}, {}, n - 1);
      if (RM) {
        mark(0);
        const go = (i) => { i = clamp(i, 0, n - 1); gsap.to(S, { opacity: .2, duration: .1, onComplete() { tl.time(i); mark(i); gsap.to(S, { opacity: 1, duration: .15 }); } }); };
        $$('[data-next]', S).forEach(b => b.addEventListener('click', () => go(cur + 1)));
        $$('[data-prev]', S).forEach(b => b.addEventListener('click', () => go(cur - 1)));
        $$('[data-go]', S).forEach(el => { el.setAttribute('role', 'button'); el.tabIndex = 0; el.style.cursor = 'pointer'; el.addEventListener('click', () => go(+el.dataset.go)); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(+el.dataset.go); } }); });
        return { go, S, tl };
      }
      const o = { sec, n, at: 0, busy: false, q: 0, drive: false, tw: null, jumpEls: typeof je === 'function' ? je : null };
      const show = (i) => {
        o.at = i; mark(i);
        if (o.tw) o.tw.kill();
        if (CAP) { tl.time(i); return; }
        const d = Math.abs(tl.time() - i);
        if (d < .001) return;
        o.tw = tl.tweenTo(i, { duration: clamp(pace * d, .45, 1.8), ease: 'none' });
      };
      o.st = ScrollTrigger.create({
        id: sec.id, trigger: sec, pin: true, start: 'top top', end: () => '+=' + innerHeight * Math.max(1, n - 1) * per / 100, invalidateOnRefresh: true,
        onUpdate: (self) => { if (o.drive || o.frozen) return; const i = Math.round(self.progress * (n - 1)); if (i !== o.at) show(i); },
      });
      o.pos = (i) => o.st.start + (o.st.end - o.st.start) * i / Math.max(1, n - 1);
      o.set = (i) => { if (o.tw) o.tw.kill(); o.q = 0; o.busy = false; o.drive = false; tl.time(i); o.at = i; mark(i); };
      const after = () => {
        o.drive = false; o.busy = false;
        if (o.q) { const d = Math.sign(o.q); o.q -= d; const nx = o.at + d; if (nx >= 0 && nx < n) o.go(nx); else o.q = 0; }
      };
      o.go = (i) => {
        i = clamp(i, 0, n - 1);
        // a jump of more than one step (pins, tabs) never sweeps through the steps in between
        if (o.jump && Math.abs(i - o.at) > 1 && !RM && !CAP) {
          const from = o.at; o.busy = true; o.t0 = performance.now(); o.drive = true;
          if (o.tw) o.tw.kill();
          o.at = i; mark(i);
          let done = 0; const fin = () => { if (++done === 2) after(); };
          o.tw = o.jump(from, i, tl).eventCallback('onComplete', () => { tl.time(i); fin(); });
          scrollToY(o.pos(i), 1, fin); return;
        }
        o.busy = true; o.t0 = performance.now(); o.drive = true; show(i); scrollToY(o.pos(i), pace, after);
      };
      o.land = (i, cb) => { o.busy = true; o.t0 = performance.now(); o.drive = true; o.q = 0; show(i); scrollToY(o.pos(i), clamp(Math.abs(curY() - o.pos(i)) / innerHeight * .9, .3, .8), () => { after(); cb && cb(); }); };
      steppers.push(o);
      mark(0);
      // re-armed (back to its first step) only once the whole scene is below the screen
      ScrollTrigger.create({ trigger: o.st.pin.parentElement && o.st.pin.parentElement.classList.contains('pin-spacer') ? o.st.pin.parentElement : sec, start: 'top bottom', onLeaveBack: () => { o.frozen = false; o.set(0); } });
      // the content is the control (6 nov): log entries, board rows, pins… any [data-go] jumps to its step
      $$('[data-go]', S).forEach(el => {
        el.setAttribute('role', 'button'); el.tabIndex = 0; el.style.cursor = 'pointer';
        const go = () => o.go(+el.dataset.go);
        el.addEventListener('click', go);
        el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); go(); } });
      });
      // default direct jump: the step-dependent blocks fade out, the timeline is set, they fade back in
      if (o.jumpEls) o.jump = (from, to) => {
        const els = o.jumpEls().filter(Boolean);
        return gsap.timeline().to(els, { opacity: 0, duration: .32, ease: 'power2.in' }).add(() => tl.time(to))
          .to(els, { opacity: 1, duration: .5, ease: 'power2.out' });
      };
      $$('[data-next]', S).forEach(b => b.addEventListener('click', () => o.go(o.at + 1)));
      $$('[data-prev]', S).forEach(b => b.addEventListener('click', () => o.go(o.at - 1)));
      return { go: (i) => o.go(i), S, tl, o };
    }
    // scene entrance: plays in time once the scene is well inside the viewport; rewinds when you go back above it
    const enter = (sec, fn, start = 'top 66%') => {
      const S = stageOf(sec);
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
      fn(tl, S);
      if (CAP) { tl.progress(1); return tl; }
      ScrollTrigger.create({ trigger: sec, start: RM ? 'clamp(top 80%)' : 'clamp(' + start + ')', onEnter: () => tl.play() });
      ScrollTrigger.create({ trigger: sec, start: 'top bottom', onLeaveBack: () => tl.pause(0) });
      sec.addEventListener('focusin', () => tl.progress(1));
      return tl;
    };
    const has = (t) => t && (t.length === undefined || t.length > 0);
    const rise = (tl, t, at = 0, d = .7, extra = {}) => !has(t) ? tl : tl.from(own(t), RM ? { opacity: 0, duration: .2 } : { y: 40, opacity: 0, duration: d, ease: 'power2.out', ...extra }, at);

    /* ---------- Act 1 (storyboard of 6 nov) ----------
       0 hero · 1 the central window grows (same frame, same photo) until the landscape fills the screen, and the
       boarding pass arrives on its own · 2–13 agenda, 3 days × 4 parts · 14 the blind drops and rises on the blue
       field, the window grows until the field fills the screen, and the page carries on to the map.
       One pinned scene, one gesture per step, each step played whole and in time. */
    let ACT = null;
    try {
      const sec = $('#s00'), S = stageOf(sec);
      HANDLED.add(S);
      const hero = $('.lay-hero', S), brief = $('#s01', S), objL = $('#s02', S), agL = $('#s02a', S);
      const land = $('.land', sec), lrh = $('.lrh', sec), holeP = $('#landholep'), lp = $('.lp', land), li = $('.li', land), scrim = $('.scrim', land);
      const days = $$('button[data-day]', agL), parts = [];
      const sh = $('[data-a=shutter]', agL), ph = $$('[data-a^=ph]', agL), rest = (+sh.dataset.rest || 36) + 'px';
      const win = sh.parentElement, frame = win.parentElement;

      /* hero intro, once, on load (v2: no key visual on the cover; the name, dates and city rise in) */
      const intro = gsap.timeline();
      if (RM) intro.from(hero, { opacity: 0, duration: .2 });
      else {
        const ifrom = (q, v, at) => { const e = $$(q, hero); if (e.length) intro.from(e, v, at); };
        ifrom('[data-a=sub]', { y: 16, opacity: 0, duration: .6, ease: 'power3.out' }, .15);
        ifrom('.h1v2 > span', { yPercent: 60, opacity: 0, duration: 1.0, stagger: .14, ease: 'power3.out' }, .3);
        ifrom('.kmeta > span, .kmeta > i', { y: 18, opacity: 0, duration: .7, stagger: .1, ease: 'power3.out' }, .75);
        ifrom('.sig', { opacity: 0, duration: .8, ease: 'power1.out' }, 1.0);
        ifrom('[data-a=cta]', { y: 16, opacity: 0, duration: .5, ease: 'power3.out' }, 1.1);
      }
      if (CAP) intro.progress(1);

      /* boarding pass: issued, printed, counted, scanned, stamped (a sub-timeline of the act) */
      const pass = $('.pgrp', brief) || $('[data-a=passwrap]', brief), card = $('[data-a=pass]', brief) || $('.pm', brief);
      const pt = gsap.timeline();
      const r0 = gsap.getProperty(pass, 'rotation') || 0, y0 = gsap.getProperty(pass, 'y') || 0;
      pt.fromTo(pass, { y: y0 + (c.mob ? 160 : 260), x: c.mob ? 30 : 80, rotation: r0 + 9, scale: .84, autoAlpha: 0, transformOrigin: '50% 60%' }, { y: y0, x: 0, rotation: r0, scale: 1, autoAlpha: 1, duration: 1.1, ease: 'power3.out' }, .05);
      const rows = c.mob ? $$('.rt,.g3,.g2,.st', card) : Array.from(card.children).filter(e => e.tagName === 'DIV');
      pt.fromTo(rows, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .55, stagger: .09, ease: 'power3.out' }, .45);
      if ($('[data-a=op]', brief)) pt.fromTo($('[data-a=op]', brief), { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .7, ease: 'power2.out' }, .5);
      $$('[data-num]', brief).forEach((el, i) => { const o = { v: 0 }, n = +el.dataset.num; pt.fromTo(o, { v: 0 }, { v: n, duration: .55, ease: 'power2.out', onUpdate: () => (el.textContent = Math.round(o.v)) }, .6 + i * .08); });
      const bc = $$('div[aria-hidden="true"]', card).find(d => d.children.length > 12 && $$('i', d).length === d.children.length);
      if (bc && bc.offsetParent !== null) {
        const vert = bc.offsetHeight > bc.offsetWidth;
        const beam = document.createElement('i'); beam.setAttribute('aria-hidden', 'true'); beam.className = 'scan';
        Object.assign(beam.style, vert ? { left: bc.offsetLeft - 8 + 'px', top: bc.offsetTop + 'px', width: bc.offsetWidth + 16 + 'px', height: '2px' }
          : { left: bc.offsetLeft + 'px', top: bc.offsetTop - 6 + 'px', width: '2px', height: bc.offsetHeight + 12 + 'px' });
        bc.parentElement.appendChild(beam);
        pt.fromTo(beam, { opacity: 0 }, { opacity: 1, duration: .04 }, .95)
          .fromTo(beam, vert ? { y: 0 } : { x: 0 }, vert ? { y: bc.offsetHeight, duration: .4 } : { x: bc.offsetWidth, duration: .4 }, .95)
          .to(beam, { opacity: 0, duration: .06 }, 1.35)
          .fromTo(Array.from(bc.children), { opacity: .15 }, { opacity: 1, duration: .02, stagger: .38 / bc.children.length }, .95);
      }
      // v2.6: a real rubber stamp made from the conference logo: the logo is inked in one colour (its light parts stay
      // paper), with a double rim, text on the ring and worn ink
      const stamp = document.createElement('div'); stamp.className = 'stamp'; stamp.setAttribute('aria-hidden', 'true');
      const sid = 'stp' + (c.mob ? 'm' : 'l');
      stamp.innerHTML = `<svg viewBox="0 0 200 200"><defs><path id="${sid}" d="M100 100 m-77 0 a77 77 0 1 1 154 0 a77 77 0 1 1 -154 0"/>
        <filter id="${sid}i" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 .043  0 0 0 0 .227  0 0 0 0 .561  -.45 -.9 -.15 1.15 0"/></filter>
        <filter id="${sid}f" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="n"/>
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.2 1.75" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in" result="ink"/>
        <feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="1" seed="3" result="w"/><feDisplacementMap in="ink" in2="w" scale="2"/></filter></defs>
        <g filter="url(#${sid}f)" fill="none" stroke="currentColor">
        <circle cx="100" cy="100" r="97" stroke-width="4"/><circle cx="100" cy="100" r="90" stroke-width="1.4"/>
        <text font-size="11.5" font-weight="800" letter-spacing="2.6" fill="currentColor" stroke="none"><textPath href="#${sid}">SEVILLE · LEZL · 1–3 JUNE 2027 · CLEARED ·</textPath></text>
        <circle cx="100" cy="100" r="66" stroke-width="1.6"/>
        <image href="img/kv/badge.webp" x="38" y="38" width="124" height="124" filter="url(#${sid}i)"/></g></svg>`;
      card.appendChild(stamp);
      pt.fromTo(stamp, { scale: 1.6, rotation: -30, opacity: 0 }, { scale: 1, rotation: -14, opacity: 1, duration: .26, ease: 'power4.in' }, 1.08)
        .fromTo(card, { x: 0 }, { x: 3, duration: .04, yoyo: true, repeat: 1 }, 1.3);
      if ($('[data-a=sub]', brief)) pt.fromTo($('[data-a=sub]', brief), { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .4, ease: 'power2.out' }, .7);
      if (!RM && !c.mob && !CAP && matchMedia('(hover: hover) and (pointer: fine)').matches && $('[data-a=pass]', brief)) {
        const glare = document.createElement('i'); glare.className = 'glare'; glare.setAttribute('aria-hidden', 'true'); card.appendChild(glare);
        gsap.set(pass, { transformPerspective: 1600 });
        const rx = gsap.quickTo(pass, 'rotationX', { duration: .6, ease: 'power3.out' }), ry = gsap.quickTo(pass, 'rotationY', { duration: .6, ease: 'power3.out' });
        const onLeave = () => { rx(0); ry(0); glare.style.opacity = 0; };
        sec.addEventListener('pointermove', e => {
          if (getComputedStyle(brief).visibility === 'hidden' || P.flip) return;
          const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
          if (x < -.2 || x > 1.2 || y < -.3 || y > 1.3) return onLeave();
          ry((x - .5) * 9); rx(-(y - .5) * 7);
          glare.style.setProperty('--gx', (x * 100).toFixed(1) + '%'); glare.style.setProperty('--gy', (y * 100).toFixed(1) + '%'); glare.style.opacity = 1;
        });
        sec.addEventListener('pointerleave', onLeave);
      }

      /* agenda (v2): one day at a time; the day's list replaces the other, its rows come in one after another */
      let ready = false, dayOn = 0, partOn = 0;
      const agSet = (d) => {
        if (d === dayOn && ready && agL.dataset.dayOn != null) return;
        dayOn = d; agL.dataset.dayOn = d;
        days.forEach(x => x.setAttribute('aria-selected', +x.dataset.day === d));
        $$('[data-cnt]', agL).forEach(e => setCnt(e, d, 3));
        $$('.dots', agL).forEach(dd => $$('i', dd).forEach((dot, j) => dot.classList.toggle('on', j === d)));
        if (RM || CAP || !ready || getComputedStyle(agL).visibility === 'hidden') return;
        const rows = $$(`.dlist[data-day="${d}"] li`, agL).filter(li => li.offsetParent !== null);
        gsap.fromTo(rows, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .5, stagger: .06, delay: .15, ease: 'power2.out', overwrite: 'auto' });
      };
      agSet(0);

      /* the landscape layer: it IS the central window, grown. At the hand-over the full photo is laid exactly where the
         window shows it and clipped to the window's frame; then frame and photo grow together to the full screen. */
      const P = { show: 0, rise: 0, reveal: 0, hole: 0, gone: 0, par: 0, flip: 0 };
      const win2 = null, w2svg = null, w2pi = null;
      const nums = (el, k) => (el.dataset[k] || '').split(' ').map(Number);
      const rr = (x, y, w, h, r) => `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
      const IA = 2400 / 1600, OVER = 1.12;  // photo aspect; the full-screen photo is a little larger than the screen, for parallax
      let from0 = null;  // frame + photo rects at the hand-over, measured once per pass (the KV may be drifting with the pointer)
      // v2: no KV window to grow from; the landscape opens from a porthole in the middle of the screen
      const measure0 = (lr) => { const w = Math.min(lr.width * .2, 260), h = w * 1.3; return { fr: { l: (lr.width - w) / 2, r: (lr.width - w) / 2, t: (lr.height - h) / 2, b: (lr.height - h) / 2 }, rad: w / 2, img: cover(lr) }; };
      const measure = (lr) => {
        const fr = w2svg.getBoundingClientRect(), [vw] = nums(w2svg, 'vb'), [fx, fy, fw, fh] = nums(w2svg, 'full'), [ix, iy, iw] = nums(w2svg, 'img');
        const pr = w2pi.getBoundingClientRect(), su = pr.width / iw;
        return { fr: { l: fr.left - lr.left, t: fr.top - lr.top, r: lr.right - fr.right, b: lr.bottom - fr.bottom }, rad: (+w2svg.dataset.r || 0) * fr.width / vw,
                 img: { x: pr.left - lr.left + (fx - ix) * su, y: pr.top - lr.top + (fy - iy) * su, w: fw * su, h: fh * su } };
      };
      const cover = (lr) => { const w = Math.max(lr.width, lr.height * IA) * OVER, h = w / IA; return { x: (lr.width - w) / 2, y: (lr.height - h) / 2, w, h }; };
      const lerp = (a, b, t) => a + (b - a) * t;
      // a rounded rectangle centred on cx, cy, turned by ang degrees, as an SVG path in screen pixels
      const rrot = (cx, cy, w, h, r, ang) => {
        const c = Math.cos(ang * Math.PI / 180), s2 = Math.sin(ang * Math.PI / 180), P2 = (x, y) => `${(cx + x * c - y * s2).toFixed(1)} ${(cy + x * s2 + y * c).toFixed(1)}`;
        const a = w / 2, b2 = h / 2;
        return `M${P2(-a + r, -b2)}L${P2(a - r, -b2)}A${r} ${r} 0 0 1 ${P2(a, -b2 + r)}L${P2(a, b2 - r)}A${r} ${r} 0 0 1 ${P2(a - r, b2)}L${P2(-a + r, b2)}A${r} ${r} 0 0 1 ${P2(-a, b2 - r)}L${P2(-a, -b2 + r)}A${r} ${r} 0 0 1 ${P2(-a + r, -b2)}Z`;
      };
      let parS = 0, parT = 0;
      gsap.ticker.add(() => {
        if (Math.abs(P.par - parS) < .0004 || land.style.visibility === 'hidden') return;
        const now = performance.now(), dt = Math.min(.05, (now - (parT || now)) / 1000 || .016); parT = now;
        parS += (P.par - parS) * Math.min(1, dt * 3.2); render();
      });
      const render = () => {
        if (P.gone > .5 || P.show < .5 || P.reveal >= 1) { if (lrh) lrh.style.visibility = 'hidden'; }
        if (P.gone > .5 || P.show < .5) { land.style.visibility = 'hidden'; from0 = null; return; }
        land.style.visibility = 'visible';
        const lr = land.getBoundingClientRect(), cv = cover(lr), e = P.reveal;
        if (e < 1 && !w2svg) {
          // v2.10: the white rounded rhombus of v1 rises from below the screen turning on itself, settles in the
          // centre and opens as a window until the landscape fills the screen
          Object.assign(li.style, { left: cv.x + 'px', top: cv.y + 'px', width: cv.w + 'px', height: cv.h + 'px' });
          const s0 = Math.min(lr.width, lr.height) * .175, ee = e;
          const cx = lr.width / 2, cy = lerp(lr.height + s0 * 1.2, lr.height / 2, P.rise);
          const ang = lerp(135, 0, P.rise);  // it turns as it rises and arrives upright, a square ready to open
          const w = lerp(s0, lr.width * 1.06, ee), h = lerp(s0, lr.height * 1.06, ee), r = lerp(s0 * .19, 0, ee), b = lerp(s0 * .1, 0, Math.min(1, ee * 1.6));
          land.style.clipPath = `path("${rrot(cx, cy, w - 2 * b, h - 2 * b, Math.max(0, r - b), ang)}")`;
          if (lrh) { lrh.style.visibility = ee < .98 ? 'visible' : 'hidden'; Object.assign(lrh.style, { width: w + 'px', height: h + 'px', borderRadius: r + 'px', borderWidth: b + 'px', opacity: 1 - Math.max(0, (ee - .7) / .3), transform: `translate(${cx - w / 2}px, ${cy - h / 2}px) rotate(${ang}deg)` }); }
        } else if (e < 1) {
          if (!from0 || e === 0) from0 = w2svg ? measure(lr) : measure0(lr);
          const f = from0, im = { x: lerp(f.img.x, cv.x, e), y: lerp(f.img.y, cv.y, e), w: lerp(f.img.w, cv.w, e), h: lerp(f.img.h, cv.h, e) };
          Object.assign(li.style, { left: im.x + 'px', top: im.y + 'px', width: im.w + 'px', height: im.h + 'px' });
          const k1 = 1 - e, rad = f.rad * (e < .85 ? 1 : (1 - e) / .15);
          land.style.clipPath = `inset(${(f.fr.t * k1).toFixed(2)}px ${(f.fr.r * k1).toFixed(2)}px ${(f.fr.b * k1).toFixed(2)}px ${(f.fr.l * k1).toFixed(2)}px round ${rad.toFixed(2)}px)`;
        } else {
          Object.assign(li.style, { left: cv.x + 'px', top: cv.y + 'px', width: cv.w + 'px', height: cv.h + 'px' });
          land.style.clipPath = 'none';
        }
        // parallax of the landscape through the act: it drifts up as you go deeper
        // v2.13: the landscape follows the act's parallax value through a soft spring (it never starts or stops dead,
        // whatever the pace of the step that moves it); a cut snaps it
        if (CAP || RM || Math.abs(P.par - parS) > .35) parS = P.par;
        li.style.transform = `translate3d(0, ${(-parS * (cv.h - lr.height) * .38).toFixed(1)}px, 0)`;
        if (P.hole > .5) {
          const r = win.getBoundingClientRect(), sc = r.width / (win.offsetWidth || 1);
          const rad = Math.min(parseFloat(getComputedStyle(win).borderTopLeftRadius) * sc || 0, r.width / 2, r.height / 2);
          holeP.setAttribute('d', `M-10 -10H${lr.width + 10}V${lr.height + 10}H-10Z` + rr(r.left - lr.left, r.top - lr.top, r.width, r.height, rad));
          land.style.clipPath = 'url(#landhole)';
        }
      };
      // pointer parallax on the landscape (hover devices)
      if (!RM && !CAP && matchMedia('(hover: hover) and (pointer: fine)').matches) {
        const qx = gsap.quickTo(lp, 'x', { duration: 1.2, ease: 'power3.out' }), qy = gsap.quickTo(lp, 'y', { duration: 1.2, ease: 'power3.out' });
        sec.addEventListener('pointermove', e => { const w = P.reveal * P.reveal; qx(-(e.clientX / innerWidth - .5) * 24 * w); qy(-(e.clientY / innerHeight - .5) * 14 * w); });
      }
      addEventListener('resize', () => requestAnimationFrame(render));

      if (c.short) {
        // landscape phones: the act is laid out as a column, no pin, the agenda changes day by day with its buttons
        gsap.set([brief, objL, agL], { autoAlpha: 1 }); pt.progress(1);
        ready = true;
        const go = (d) => { agSet(d); ph.forEach((im, j) => (im.style.opacity = j === d ? 1 : 0)); };
        days.forEach(t => t.addEventListener('click', () => go(+t.dataset.day)));
        $$('[data-next]', agL).forEach(b => b.addEventListener('click', () => go((dayOn + 1) % 3)));
        $$('[data-prev]', agL).forEach(b => b.addEventListener('click', () => go((dayOn + 2) % 3)));
      } else {
        // v2: 0 cover · 1 boarding pass · 2 objectives · 3–5 agenda, one day each · 6 the window opens on the blue
        const n = 7, T1 = 3.75, T2 = T1 + 2.6, AG = T2 + 2.3, STEP = 1.05;
        const marks = [0, T1, T2, AG, AG + STEP, AG + 2 * STEP, AG + 2 * STEP + 2.0];
        const AG0 = 3, AG1 = 5;
        const tl = gsap.timeline({ paused: true, onUpdate: render });
        const heroTxt0 = $$('.klab, .ktt, .kmeta, .sig, .lay-hero [data-a=cta]', S).filter(e => hero.contains(e));
        const heroTxt = heroTxt0.filter(e => !heroTxt0.some(o => o !== e && o.contains(e)));  // never animate a child and its parent
        const briefT = $('[data-a=t]', brief), op = $('[data-a=op]', brief), bsub = $('[data-a=sub]', brief);
        const back = $('.pbk', brief);
        const ohead = $('[data-a=ohead]', objL), objs = back ? $$('[data-a=obj]', back) : $$('[data-a=obj]', objL);
        if (back) gsap.set(back, { autoAlpha: 0, transformPerspective: 1500 });
        const wrapL = c.mob ? agL : (agL.querySelector(':scope > div') || agL);
        const agKids = Array.from(wrapL.children).filter(e => !['STYLE', 'SCRIPT'].includes(e.tagName)).concat(c.mob ? [] : $$(':scope > .steps', agL));
        gsap.set([brief, objL, agL], { autoAlpha: 0 });
        gsap.set([pass, briefT].filter(Boolean), { autoAlpha: 0 });
        // 0 → 1: the cover's words leave; the landscape opens from a porthole in the middle until it fills the screen
        tl.fromTo(heroTxt, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -24, duration: .5, stagger: .04, ease: 'power2.in', immediateRender: false }, 0)
          .to($$('.glow', hero), { autoAlpha: 0, duration: .3, ease: 'none' }, 0)
          .to(P, { show: 1, duration: .001 }, .25)
          .fromTo(P, { rise: 0 }, { rise: 1, duration: 1.0, ease: 'power2.inOut', immediateRender: false }, .26)
          .to(P, { reveal: 1, duration: 1.35, ease: 'power3.inOut' }, 1.2)
          .to(scrim, { opacity: 1, duration: 1.2, ease: 'power1.inOut' }, 1.4)
          .set(hero, { autoAlpha: 0 }, 2.4)
          // the boarding pass arrives on its own once the landscape is there
          .set(brief, { autoAlpha: 1 }, 2.15)
          .fromTo(briefT, { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .5, ease: 'power2.out', immediateRender: false }, 2.2)
          .add(pt, 2.3);
        // the landscape drifts a little at every step (parallax through the act)
        tl.fromTo(P, { par: 0 }, { par: 1, duration: marks[AG1] - 2.25, ease: 'none', immediateRender: false }, 2.25);
        // 1 → 2: the pass takes off (up and away, as the aircraft on it); the objectives come in one after another
        tl.to([briefT, bsub].filter(Boolean), { y: -24, autoAlpha: 0, duration: .45, ease: 'power2.in' }, T1);
        if (back) {
          // 1 → 2 (laptop): the C295 flies off; the pass turns over and its back shows the four objectives
          gsap.set(card, { transformPerspective: 1500 });
          tl.to(op, { x: 340, y: -220, rotation: -6, autoAlpha: 0, duration: .9, ease: 'power2.in' }, T1)
            .fromTo(card, { rotationY: 0 }, { rotationY: 90, duration: .6, ease: 'power2.in', immediateRender: false }, T1 + .15)
            .set(card, { autoAlpha: 0 }, T1 + .75)
            .fromTo(back, { rotationY: -90, autoAlpha: 1 }, { rotationY: 0, autoAlpha: 1, duration: .75, ease: 'power2.out', immediateRender: false }, T1 + .75)
            .set(objL, { autoAlpha: 1 }, T1 + .6)
            .fromTo(ohead, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .7, ease: 'power3.out', immediateRender: false }, T1 + .65)
            .fromTo($$('.osep', back), { scaleY: 0, transformOrigin: '50% 0%' }, { scaleY: 1, duration: .7, stagger: .08, ease: 'power2.out', immediateRender: false }, T1 + 1.2)
            .fromTo($('.ofine', back), { autoAlpha: 0 }, { autoAlpha: 1, duration: .5, immediateRender: false }, T1 + 1.5);
          // each objective comes in part by part: the disc pops, the number slides, the title, the rule and the copy follow.
          // Every part is put in its starting state now, so nothing shows (and then blinks) while the card turns over
          gsap.set($$('.osep', back), { scaleY: 0, transformOrigin: '50% 0%' }); gsap.set($('.ofine', back), { autoAlpha: 0 });
          objs.forEach(ob => { gsap.set(ob, { autoAlpha: 1 }); gsap.set($('.oic', ob), { scale: .3, autoAlpha: 0 }); gsap.set($('.onum', ob), { x: 24, autoAlpha: 0 });
            gsap.set([$('.ott', ob), $('.otx', ob)], { y: 14, autoAlpha: 0 }); gsap.set($('.obar', ob), { scaleX: 0, transformOrigin: '0% 50%' }); });
          objs.forEach((ob, i) => { const at = T1 + 1.15 + i * .14;
            tl.fromTo($('.oic', ob), { scale: .3, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: .55, ease: 'back.out(2)', immediateRender: false }, at)
              .fromTo($('.onum', ob), { x: 24, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: .6, ease: 'power3.out', immediateRender: false }, at + .08)
              .fromTo($('.ott', ob), { y: 14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .55, ease: 'power3.out', immediateRender: false }, at + .16)
              .fromTo($('.obar', ob), { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: .5, ease: 'power3.out', immediateRender: false }, at + .26)
              .fromTo($('.otx', ob), { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .55, ease: 'power3.out', immediateRender: false }, at + .3); });
        } else {
          tl.to(pass, { y: '-=120', x: '+=60', rotation: '-=4', autoAlpha: 0, duration: .9, ease: 'power2.in' }, T1 + .05)
            .set(brief, { autoAlpha: 0 }, T1 + .96)
            .set(objL, { autoAlpha: 1 }, T1 + .7)
            .fromTo(ohead, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .7, ease: 'power3.out', immediateRender: false }, T1 + .75)
            .fromTo(objs, { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .8, stagger: .12, ease: 'power3.out', immediateRender: false }, T1 + 1.0);
        }
        // 2 → 3: the objectives clear; the window turns in and the menus come in at its sides
        const fr0 = frame.getBoundingClientRect(), fcx = fr0.left + fr0.width / 2, fcy = fr0.top + fr0.height / 2;
        const menus = agKids.filter(e => !e.contains(frame));
        const side = (e) => { const r = e.getBoundingClientRect(); return c.mob ? { y: (r.top + r.height / 2 < fcy ? -1 : 1) * 30 } : { x: (r.left + r.width / 2 < fcx ? -1 : 1) * 60 }; };
        gsap.set(frame, { transformPerspective: 1500 });
        tl.to(P, { flip: 1, duration: .001 }, T2);
        if (back) tl.to(ohead, { y: -20, autoAlpha: 0, duration: .45, ease: 'power2.in' }, T2)
          // 2 → 3 (laptop): the second turn; where the front of the pass should come back, the window arrives
          .fromTo(back, { rotationY: 0 }, { rotationY: 90, duration: .6, ease: 'power2.in', immediateRender: false }, T2 + .05)
          .set(back, { autoAlpha: 0 }, T2 + .66)
          .set(brief, { autoAlpha: 0 }, T2 + .66);
        else tl.to([...objs].reverse(), { y: -20, autoAlpha: 0, duration: .45, stagger: .05, ease: 'power2.in' }, T2)
          .to(ohead, { y: -20, autoAlpha: 0, duration: .45, ease: 'power2.in' }, T2 + .1);
        tl
          .set(objL, { autoAlpha: 0 }, T2 + .75)
          .set(agKids, { autoAlpha: 0 }, T2 + .59)
          .set(agL, { autoAlpha: 1 }, T2 + .6)
          .fromTo(frame, { rotationY: -90, autoAlpha: 1 }, { rotationY: 0, autoAlpha: 1, duration: .85, ease: 'power2.out', immediateRender: false }, T2 + .6);
        if (c.mob) tl.fromTo(agKids.filter(e => e.contains(frame)), { autoAlpha: 0 }, { autoAlpha: 1, duration: .01, immediateRender: false }, T2 + .6);
        menus.forEach((e, j) => tl.fromTo(e, { ...side(e), autoAlpha: 0 }, { x: 0, y: 0, autoAlpha: 1, duration: .8, ease: 'power3.out', immediateRender: false }, T2 + .8 + j * .07));
        tl.to(P, { flip: 0, duration: .001 }, T2 + 1.5);
        // 3 … 5: three days, each one blind down, view changes, blind up
        for (let kx = 0; kx < 2; kx++) {
          const t = AG + kx * STEP;
          tl.to(sh, { height: '100%', duration: .46, ease: 'power2.inOut' }, t)
            .to(ph[kx], { opacity: 0, duration: .14, ease: 'none' }, t + .36)
            .fromTo(ph[kx + 1], { opacity: 0, scale: 1.14 }, { opacity: 1, scale: 1, duration: .62, ease: 'power2.out', immediateRender: false }, t + .38)
            .to(sh, { height: rest, duration: .52, ease: 'power3.inOut' }, t + .48);
        }
        // 5 → 6: blind down, the window now opens on the blue field, the window grows until the field is all there is
        const tE = marks[AG1];
        tl.to(sh, { height: '100%', duration: .45, ease: 'power2.inOut' }, tE)
          .to(menus, { autoAlpha: 0, y: -20, duration: .36, stagger: .015, ease: 'power2.in' }, tE + .05)  // done before tE+.46 (see «Continue»)
          .set(ph, { opacity: 0 }, tE + .46)
          .set(win, { backgroundColor: 'rgba(0,0,0,0)', boxShadow: 'none' }, tE + .46)
          // the bezel stays as a ring (inset shadow as wide as the padding), the inside of the frame becomes a hole
          .set(frame, { backgroundColor: 'rgba(0,0,0,0)', boxShadow: () => `0 0 0 1px rgba(0,32,91,.25), inset 0 0 0 ${parseFloat(getComputedStyle(frame).paddingTop) || 16}px #ffffff` }, tE + .46)
          .to(P, { hole: 1, duration: .01 }, tE + .46)
          .to(sh, { height: '0%', duration: .5, ease: 'power2.inOut' }, tE + .5)
          .to(frame, { scale: c.mob ? 9 : 7, duration: .95, ease: 'power3.in' }, tE + 1.0)
          .to(P, { gone: 1, duration: .01 }, marks[n - 1] - .02)
          .set(agL, { autoAlpha: 0 }, marks[n - 1] - .01);
        if (tl.duration() < marks[n - 1]) tl.set({}, {}, marks[n - 1]);

        let cur = -1;
        const CH = (i) => (i === 0 ? 'Cover' : i === 1 ? 'Briefing' : i === 2 ? 'Objectives' : 'Agenda');
        const mark = (i) => {
          if (i === cur) return; cur = i;
          agSet(Math.max(0, Math.min(2, i - AG0)));
          sec.dataset.ch = CH(i);
          const st = o.st; if (st && st.isActive) $('#chap').textContent = CH(i);
        };
        const o = { sec, n, at: 0, busy: false, q: 0, drive: false, tw: null };
        let parTw = null;
        const show = (i) => {
          o.at = i; mark(i);
          if (o.tw) o.tw.kill();
          if (parTw) { parTw.kill(); parTw = null; }
          if (CAP || RM) { tl.time(marks[i]); render(); return; }
          const d = Math.abs(tl.time() - marks[i]);
          if (d < .001) return;
          o.tw = tl.tweenTo(marks[i], { duration: clamp(d, .35, 3.2), ease: 'none' });
        };
        o.st = ScrollTrigger.create({
          id: 's00', trigger: sec, pin: true, start: 'top top', end: () => '+=' + innerHeight * (n - 1) * .5, invalidateOnRefresh: true,
          onUpdate: (self) => { if (o.drive || o.frozen) return; const i = Math.round(self.progress * (n - 1)); if (i !== o.at) show(i); },
          onToggle: (self) => { if (self.isActive) $('#chap').textContent = CH(o.at); },
        });
        o.pos = (i) => o.st.start + (o.st.end - o.st.start) * i / (n - 1);
        o.set = (i) => { if (o.tw) o.tw.kill(); o.q = 0; o.busy = false; o.drive = false; tl.time(marks[i]); o.at = i; mark(i); render(); };
        const after = () => { o.drive = false; o.busy = false; if (o.q) { const d = Math.sign(o.q); o.q -= d; const nx = o.at + d; if (nx >= 0 && nx < n) o.go(nx); else o.q = 0; } };
        const dur = (i) => clamp(Math.abs(marks[i] - tl.time()), .5, 3.2);
        const mapEl = $('#s03a');
        const mapTop = () => (mapEl ? mapEl.getBoundingClientRect().top + scrollY : o.st.end + innerHeight);
        // move the page without anyone seeing it: same background (the field keeps its position), nothing in between
        const cut = (top) => {
          const s0 = lenis ? lenis.animatedScroll : scrollY;
          navTo = top;
          if (lenis) lenis.scrollTo(top, { immediate: true, force: true }); else scrollTo(0, top);
          fieldOff += s0 - top;
          ScrollTrigger.update();
          requestAnimationFrame(() => requestAnimationFrame(() => { navTo = null; }));
        };
        o.below = () => (RM || (window.__act2 && window.__act2()) ? null : mapTop());  // with act 2 the map is a chapter of it
        o.fromBelow = () => { cut(o.pos(n - 1)); o.set(n - 1); o.go(n - 2); };
        // up (6 nov): the act is never played backwards; the page cuts straight to the cover, which is the act re-armed

        // a jump between two agenda states (day or part buttons) is ONE blind cycle, never a sweep through the states between
        const agJump = (i) => {
          o.busy = true; o.t0 = performance.now(); o.drive = true;
          if (o.tw) o.tw.kill();
          o.at = i; mark(i);
          if (RM || CAP) { tl.time(marks[i]); render(); scrollToY(o.pos(i), .01, after); return; }
          let done = 0; const fin = () => { if (++done === 2) after(); };
          // 7 nov: the landscape behind glides to its new height during the whole jump; the act's own time is set
          // under the blind, which would make it snap, so the gliding value is put back right after
          const parTo = clamp((marks[i] - 2.25) / (marks[AG1] - 2.25), 0, 1);
          if (parTw) parTw.kill();
          parTw = gsap.to(P, { par: parTo, duration: 1.1, ease: 'power2.inOut', onUpdate: render });
          o.tw = gsap.timeline({ onComplete: fin })
            .to(sh, { height: '100%', duration: .45, ease: 'power2.inOut' })
            .add(() => { const pv = P.par; tl.time(marks[i]); P.par = pv; render(); gsap.set(sh, { height: '100%' }); gsap.fromTo(ph[i - AG0], { scale: 1.14 }, { scale: 1, duration: .7, ease: 'power2.out' }); })
            .to(sh, { height: rest, duration: .55, ease: 'power3.inOut' }, '+=.04');
          scrollToY(o.pos(i), 1.0, fin);
        };
        o.go = (i) => {
          i = clamp(i, 0, n - 1);
          if (Math.abs(i - o.at) > 1 && i >= AG0 && i <= AG1 && o.at >= AG0 && o.at <= AG1) return agJump(i);
          o.busy = true; o.t0 = performance.now(); o.drive = true; const d = dur(i); show(i);
          // the last step does not stop on an empty screen: once the window has opened on the field, the page goes on to the map
          if (i === n - 1 && !RM) scrollToY(o.pos(i), d, () => { cut(mapTop()); after(); const A2 = window.__act2 && window.__act2(); if (A2) A2.arrive(); });
          else scrollToY(o.pos(i), d, after);
        };
        o.land = (i, cb) => { o.busy = true; o.t0 = performance.now(); o.drive = true; o.q = 0; show(i); scrollToY(o.pos(i), clamp(Math.abs(curY() - o.pos(i)) / innerHeight * .9, .3, .8), () => { after(); cb && cb(); }); };
        steppers.push(o);
        ACT = o; o.tl = tl; o.marks = marks;
        mark(0); render();
        ready = true;
        $$('[data-next]', agL).forEach(b => b.addEventListener('click', () => o.go(o.at + 1)));
        $$('[data-prev]', agL).forEach(b => b.addEventListener('click', () => o.go(o.at - 1)));
        days.forEach(t => t.addEventListener('click', () => o.go(AG0 + +t.dataset.day)));
        // 7 nov · «Continuar»: from any agenda state straight into the exit to the blue (13 → 14), never through the
        // states in between. The menus leave and the blind drops; with the screen in that state the act is moved, in
        // the same frame, to the moment of its own exit where the blind is down, and plays the rest of it.
        const cont = $('[data-ag-cont]', agL);
        if (cont && !RM && !CAP) cont.addEventListener('click', (e) => {
          e.preventDefault(); e.stopImmediatePropagation();
          if (o.busy) return;
          if (o.at < AG0 || o.at > AG1) { o.go(n - 1); return; }
          o.busy = true; o.drive = true; o.q = 0; o.t0 = performance.now(); if (o.tw) o.tw.kill();
          const tE = marks[AG1], r0 = sh.style.height;
          // the landscape behind glides to where the exit has it (end of its parallax) instead of snapping there
          if (parTw) parTw.kill();
          const glide = gsap.to(P, { par: 1, duration: 1.3, ease: 'power2.inOut', onUpdate: render });
          gsap.timeline({ onComplete() {
            gsap.set(menus, { autoAlpha: 1, y: 0 }); sh.style.height = r0;   // let the act record its own start values…
            const pv = P.par;
            cut(o.pos(AG1)); tl.time(tE + .47); P.par = pv; render();       // …and land on the same picture, unpainted in between
            o.at = AG1; mark(AG1); o.go(n - 1);
          } })
            .to(menus, { autoAlpha: 0, y: -20, duration: .36, stagger: .015, ease: 'power2.in' }, 0)
            .to(sh, { height: '100%', duration: .45, ease: 'power2.inOut' }, 0);
        });
      }
    } catch (err) { console.warn('Act 1', err); }
    window.__act = () => ACT;


    /* ---------- 02 Location (removed in v2) ---------- */
    if ($('#s02b')) try {
      const sec = $('#s02b'), S0 = stageOf(sec), view = $('.mview', S0);
      if (view) own([view]);
      if (!ACT2) enter(sec, (tl, S) => {
        // the city is drawn: water appears, then every road is traced from its start, big roads first
        const paths = $$('svg.osm path', S), fills = paths.filter(p => p.getAttribute('fill') !== 'none'), strokes = paths.filter(p => p.getAttribute('fill') === 'none');
        if (!RM && paths.length) {
          const D = 1800;
          tl.from(fills, { opacity: 0, duration: 1.2, ease: 'power1.inOut' }, 0);
          strokes.reverse().forEach((p, i) => tl.fromTo(p, { attr: { 'stroke-dasharray': `${D} ${D}`, 'stroke-dashoffset': D } }, { attr: { 'stroke-dashoffset': 0 }, duration: 2.2, ease: 'power2.inOut', immediateRender: true }, .1 + i * .12));
          tl.add(() => strokes.forEach(p => { p.removeAttribute('stroke-dashoffset'); if (!/rail|aero/.test(p.dataset.k || '')) { const da = p.dataset.da; da ? p.setAttribute('stroke-dasharray', da) : p.removeAttribute('stroke-dasharray'); } }));
        }
        tl.fromTo($$('[data-a=route]', S), { attr: { 'stroke-dashoffset': RM ? 0 : 1 }, opacity: RM ? 0 : 1 }, { attr: { 'stroke-dashoffset': 0 }, opacity: 1, duration: RM ? .2 : 1.2, ease: 'power2.inOut' }, RM ? 0 : 1.4);
        if (has($$('[data-a=lpin]', S))) tl.from(own($$('[data-a=lpin]', S)), RM ? { opacity: 0, duration: .2 } : { scale: .7, opacity: 0, duration: .8, stagger: .15, ease: 'power3.out' }, RM ? 0 : 1.6);
        const lab = $$('.mview [data-ax]:not([data-a=lpin])', S);
        if (has(lab)) tl.from(lab, RM ? { opacity: 0, duration: .2 } : { opacity: 0, y: 8, duration: .7, stagger: .08, ease: 'power3.out' }, RM ? 0 : 1.9);
      });
      // keep the dash patterns the map uses at rest (rail, aerodrome) so the drawing can hand them back
      $$('svg.osm path', S0).forEach(p => { const da = p.getAttribute('stroke-dasharray'); if (da) p.dataset.da = da; });
      // zoom (buttons) and drag (pointer) inside the frame; labels keep their size and follow their point
      if (view && !c.mob) {
        const [fx0, fy0, fx1, fy1] = view.dataset.f.split(' ').map(Number), [bx0, by0, bx1, by1] = view.dataset.b.split(' ').map(Number);
        const layers = $$('svg.osm, svg.rts', view), movers = $$('[data-ax]', view), drag = $('.mdrag', view);
        const st = { z: 1, x: 0, y: 0 };
        gsap.set(layers, { transformOrigin: '0 0' });
        const clampT = () => {
          st.x = clamp(st.x, fx1 - bx1 * st.z, fx0 - bx0 * st.z);
          st.y = clamp(st.y, Math.min(fy1 - by1 * st.z, 0), Math.max(fy0 - by0 * st.z, 0));
        };
        const apply = (d) => {
          clampT();
          const o = { duration: d, ease: 'power3.out', overwrite: 'auto' };
          gsap.to(layers, { x: st.x, y: st.y, scale: st.z, ...o });
          movers.forEach(m => gsap.to(m, { x: +m.dataset.ax * (st.z - 1) + st.x, y: +m.dataset.ay * (st.z - 1) + st.y, ...o }));
        };
        const zoomAt = (f, cx = (fx0 + fx1) / 2, cy = (fy0 + fy1) / 2) => {
          const z = clamp(st.z * f, 1, 3.2), px = (cx - st.x) / st.z, py = (cy - st.y) / st.z;
          st.z = z; st.x = cx - px * z; st.y = cy - py * z; apply(RM ? 0 : .7);
        };
        $$('[data-mz]', S0).forEach(bt => bt.addEventListener('click', () => {
          const m = bt.dataset.mz;
          if (m === 'in') zoomAt(1.5); else if (m === 'out') zoomAt(1 / 1.5); else { st.z = 1; st.x = 0; st.y = 0; apply(RM ? 0 : .8); }
        }));
        let p0 = null;
        drag.addEventListener('pointerdown', e => { if (e.button) return; p0 = { x: e.clientX, y: e.clientY, tx: st.x, ty: st.y, s: view.getBoundingClientRect().width / 1440 }; drag.setPointerCapture(e.pointerId); drag.style.cursor = 'grabbing'; });
        drag.addEventListener('pointermove', e => { if (!p0) return; st.x = p0.tx + (e.clientX - p0.x) / p0.s; st.y = p0.ty + (e.clientY - p0.y) / p0.s; apply(.25); });
        const up = () => { if (!p0) return; p0 = null; drag.style.cursor = 'grab'; };
        drag.addEventListener('pointerup', up); drag.addEventListener('pointercancel', up);
        drag.addEventListener('dblclick', e => { const r = view.getBoundingClientRect(), s = r.width / 1440; zoomAt(1.5, (e.clientX - r.left) / s, (e.clientY - r.top) / s); });
      }
    } catch (err) { console.warn('02 Location', err); }

    /* ---------- 03 Key points (pinned, 4 waypoints) ---------- */
    if (!ACT2) try {
      // the whole compass is drawn when the scene arrives: rings, ticks, rays and the first leg, then its figures
      enter($('#s03a'), (tl, S) => {
        const svg = $('svg.nd', S) || $('svg[viewBox="20 296 350 446"]', S); if (!svg) return;
        own([svg]);
        const shapes = $$('line, circle, path, polyline, rect', svg).filter(e => !e.matches('[data-a=seg]:not(:first-of-type), [data-a=wp], [data-a=ring]') && !(e.dataset.a === 'seg' && e !== $('[data-a=seg]', svg)));
        // 7 nov: IDEA, DIGI and GIFT (diamond and label) wait for their own step; only CONT and the ring arrive with the dial
        const later = [...$$('[data-a=wp]', svg).slice(1), ...$$('[data-a=wpl]', svg).slice(1)];
        const txt = $$('text', svg).filter(e => !later.includes(e)), wp = $$('[data-a=wp], [data-a=ring]', svg).filter(e => !later.includes(e)), box = $$('.dial > div', S);
        if (RM) { tl.from([svg, ...box], { opacity: 0, duration: .2 }); return; }
        shapes.forEach(e => { const da = e.getAttribute('stroke-dasharray'); if (da && da !== '1') e.dataset.da = da; if (e.dataset.a !== 'seg') e.setAttribute('pathLength', 1); });
        tl.fromTo(shapes.filter(e => e.dataset.a !== 'seg'), { attr: { 'stroke-dasharray': 1, 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: 1.6, stagger: { amount: .9 }, ease: 'power2.inOut', immediateRender: true }, 0)
          .add(() => shapes.forEach(e => { if (e.dataset.a === 'seg') return; e.removeAttribute('pathLength'); e.removeAttribute('stroke-dashoffset'); e.dataset.da ? e.setAttribute('stroke-dasharray', e.dataset.da) : e.removeAttribute('stroke-dasharray'); }), 2.6)
          .from(txt, { opacity: 0, duration: .8, stagger: { amount: .6 }, ease: 'power1.inOut' }, .9)
          .from(wp, { opacity: 0, scale: .6, transformOrigin: '50% 50%', duration: .7, stagger: .1, ease: 'power3.out' }, 1.4);
        if (has(box)) tl.from(box, { opacity: 0, y: -10, duration: .7, ease: 'power3.out' }, 1.2);
      }, 'top 70%');
      stepper($('#s03a'), 4, (tl, S) => {
        const seg = $$('[data-a=seg]', S), ring = $('[data-a=ring]', S), wp = $$('[data-a=wp]', S), wpl = $$('[data-a=wpl]', S);
        if (!RM) {
          gsap.set([...wp.slice(1), ...wpl.slice(1)], { opacity: $('.kbox', S) ? 0 : .3 });   // v2.20 mobile: the waypoints ahead wait, faint
          for (let i = 0; i < 3; i++) tl.to(wp[i + 1], { opacity: 1, duration: .35, ease: 'sine.out' }, i + .5).to(wpl[i + 1], { opacity: 1, duration: .35, ease: 'sine.out' }, i + .58);
        }
        const cards = $$('[data-a=kcard]', S).sort((x, y) => x.dataset.k - y.dataset.k), mk = $$('[data-a=mk]', S);
        own(cards); own($$('.kline', S));
        const kb = cards.map(cd => $('.kb', cd)), km = cards.map(cd => $('.km', cd)), kl = $('.kline', S);
        if (cards.length && $('.kbox', S)) {
          gsap.set(cards.slice(1), { autoAlpha: 0 });
          for (let i = 0; i < 3; i++) {
            const bb = wp[i + 1].getBBox();
            tl.to(seg[i + 1], { attr: { 'stroke-dashoffset': 0 }, duration: .95, ease: 'sine.inOut' }, i)
              .to(ring, { attr: { cx: bb.x + bb.width / 2, cy: bb.y + bb.height / 2 }, duration: .95, ease: 'sine.inOut' }, i)
              .to(cards[i], { autoAlpha: 0, duration: .3 }, i).fromTo(cards[i + 1], { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: .5, immediateRender: false }, i + .25);
          }
          return () => [$('.kbox', S), $('.dial', S)];
        }
        if (cards.length) {
          gsap.set(cards.slice(1), { autoAlpha: 0, y: 14 });
          gsap.set(km[0], { backgroundColor: 'var(--acc)' });
          if (kl) gsap.set(kl, { scaleY: 0 });
        }
        for (let i = 0; i < 3; i++) {
          const bb = wp[i + 1].getBBox();
          // the leg is drawn and the ring travels with one soft curve
          tl.to(seg[i + 1], { attr: { 'stroke-dashoffset': 0 }, duration: .95, ease: 'sine.inOut' }, i)
            .to(ring, { attr: { cx: bb.x + bb.width / 2, cy: bb.y + bb.height / 2 }, duration: .95, ease: 'sine.inOut' }, i);
          if (cards.length) {
            // the log: the open entry folds to its title, the line grows, the next waypoint is written under it
            tl.to(kb[i], { height: 0, autoAlpha: 0, duration: .5, ease: 'power2.inOut' }, i)
              .to(cards[i], { opacity: .55, duration: .5, ease: 'power1.inOut' }, i)
              .to(km[i], { backgroundColor: 'var(--fg2)', boxShadow: 'inset 0 0 0 2px var(--fg2)', duration: .5 }, i);
            if (kl) tl.to(kl, { scaleY: (i + 1) / 3, duration: .8, ease: 'sine.inOut' }, i + .1);
            tl.fromTo(cards[i + 1], { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: .6, ease: 'power3.out', immediateRender: false }, i + .4)
              .fromTo(km[i + 1], { backgroundColor: 'rgba(0,0,0,0)' }, { backgroundColor: 'var(--acc)', duration: .4, immediateRender: false }, i + .55);
          }
          if (mk.length) tl.to(mk[i], { opacity: 0, y: -12, duration: .4, ease: 'power2.in' }, i + .2).fromTo(mk[i + 1], { y: 18 }, { opacity: 1, y: 0, duration: .55, ease: 'power3.out', immediateRender: false }, i + .4);
        }
        return () => [$('.klog', S), $('.dial', S), mk.length ? mk[0].parentElement : null];
      }, null, 50, 1.15);
    } catch (err) { console.warn('03 Key points', err); }

    /* ---------- 04.01 Creative concept, stacked (v2): the argument rises in; the key visual assembles when it arrives ---------- */
    if (!ACT2) try {
      const sec = $('#s03b'), S = stageOf(sec), ckv = $('.ckv', S), kvb = ckv && $('[data-a=kv]', ckv);
      if (kvb) {
        const kvl = (q) => $$(`.kl[data-l=${q}]`, kvb), kvi = (q) => $$(`.kl[data-l=${q}] .ki`, kvb);
        own([kvb]);
        enter(ckv, (tl) => {
          if (RM) { tl.from(kvb, { opacity: 0, duration: .2 }); return; }
          tl.from(kvl('rearL'), { xPercent: -70, opacity: 0, duration: 1.2, ease: 'expo.out' }, 0)
            .from(kvl('rearR'), { xPercent: 70, opacity: 0, duration: 1.2, ease: 'expo.out' }, 0)
            .fromTo(kvi('win'), { clipPath: 'inset(48% 48% 48% 48% round 14px)', scale: .86, opacity: 0 }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', scale: 1, opacity: 1, duration: 1.15, ease: 'expo.out', stagger: { each: .14, from: 'center' }, immediateRender: true }, .15)
            .from(kvl('c295'), { xPercent: -38, yPercent: 34, rotation: -5, opacity: 0, duration: 1.5, ease: 'power3.out' }, .5)
            .from(kvl('cn235'), { xPercent: 55, yPercent: -40, rotation: 7, opacity: 0, duration: 1.35, ease: 'power3.out' }, .75);
        }, 'top 75%');
      }
    } catch (err) { console.warn('04.01 Concept', err); }

    /* ---------- 03 Digital (pinned, 6 pieces) ---------- */
    if (!ACT2) try {
      // entrance: the board is switched on row by row, the first piece flips in, the first mockup rises into place
      enter($('#s03c'), (tl, S) => {
        const brd = $('.dboard', S) || $$('[data-a=brow]', S)[0]?.closest('div');
        const rows = $$('[data-a=brow]', S), m0 = $$('[data-a=mock]', S).find(m => m.dataset.k === '0'), cells0 = rows[0] ? $$('[data-a=cell]', rows[0]) : [];
        const head = $$('.dcol > .lab, .dcol .tha', S);
        own([brd, m0, ...head].filter(Boolean));
        if (RM) { tl.from([brd, m0, ...head].filter(Boolean), { opacity: 0, duration: .2 }); return; }
        if (has(head)) tl.from(head, { y: 30, opacity: 0, duration: .9, stagger: .1, ease: 'power3.out' }, 0);
        if (brd) tl.fromTo(brd, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'power2.inOut' }, .2);
        if (has(rows)) tl.from(rows, { opacity: 0, x: -18, duration: .6, stagger: .07, ease: 'power3.out' }, .5);
        if (has(cells0)) tl.fromTo(cells0, { rotationX: -90, opacity: .2 }, { rotationX: 0, opacity: 1, duration: .45, stagger: { amount: .35 }, ease: 'power3.out', immediateRender: false }, .95);
        if (m0) tl.from(m0, { y: 60, scale: .94, opacity: 0, transformOrigin: '50% 60%', duration: 1.1, ease: 'power3.out' }, .45);
      }, 'top 70%');
      stepper($('#s03c'), 4, (tl, S) => {
        const mocks = $$('[data-a=mock]', S), rows = $$('[data-a=brow]', S);
        const ON = { background: '#243a5e', boxShadow: 'inset 4px 0 0 #9fd0ff' }, OFF = { background: 'rgba(0,0,0,0)', boxShadow: 'inset 0 0 0 #9fd0ff' };
        gsap.set(rows[0], ON);
        if (RM) { for (let i = 0; i < 3; i++) tl.set(mocks[i], { opacity: 0 }, i + .5).set(mocks[i + 1], { opacity: 1 }, i + .5).set(rows[i], OFF, i + .5).set(rows[i + 1], ON, i + .5); return; }
        rows.forEach((r, i) => { if (i) gsap.set($$('[data-a=cell]', r), { opacity: .35, color: 'rgba(255,255,255,0)' }); });
        for (let i = 0; i < 3; i++) {
          tl.to(mocks[i], { y: -30, opacity: 0, duration: .5, ease: 'power2.inOut' }, i)
            .fromTo(mocks[i + 1], { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: .5, ease: 'power3.out', immediateRender: false }, i + .3)
            .fromTo($$('[data-a=cell]', rows[i + 1]), { rotationX: -90 }, { opacity: 1, rotationX: 0, color: '#ffffff', duration: .4, stagger: { amount: .25 }, ease: 'power3.out', immediateRender: false }, i + .3)
            .to(rows[i], { ...OFF, duration: .1 }, i + .35)
            .to(rows[i + 1], { ...ON, duration: .1 }, i + .4);
        }
        return () => [mocks[0] && mocks[0].parentElement, rows[0] && rows[0].parentElement];
      }, null, 50, 1.1);
    } catch (err) { console.warn('03 Digital', err); }

    /* ---------- 04.03 Implementation: stacked on mobile, no pin (v2) ---------- */

    /* ---------- 04 Plenaria (free scroll; arrows + drag rotate the curved gallery) ---------- */
    try {
      const sec = $('#s04b'), S = stageOf(sec), n = 5, setC = counter(S, n);
      const cyl = $('[data-a=cyl]', S), R = +cyl.dataset.r || 900, STP = +cyl.dataset.step || 38;
      const pans = $$('[data-a=pan]', S).sort((a, b) => a.dataset.i - b.dataset.i);
      $$('[data-prev],[data-next]', S).forEach(b => (b.disabled = false));
      // a convex drum seen from outside: each panel is placed by its distance d to the current position,
      // wrapped to [-n/2, n/2), so the carousel is endless; the nearest panel is the biggest
      const st = { pos: 0, k: 1, off: 0, alpha: 1 };
      const mod = (v) => ((v % n) + n) % n;
      const place = () => {
        pans.forEach((p, i) => {
          // the ring wraps on its own position only; the entrance/exit offset is NOT wrapped, so the whole ring can
          // travel in from beyond the right edge and out beyond the left one, leaving the stage empty
          const d = (mod(i - st.pos + n / 2) - n / 2) - st.off, ad = Math.abs(d);
          p.style.transform = `translateZ(${-R}px) rotateY(${(d * STP * st.k).toFixed(3)}deg) translateZ(${R}px)`;
          p.style.opacity = (ad < 1.4 ? 1 : Math.max(0, 1 - (ad - 1.4) / .6)) * st.alpha;
          p.style.zIndex = String(100 - Math.round(ad * 10));
          p.style.pointerEvents = ad < .5 && st.alpha > .5 ? 'auto' : 'none';
        });
      };
      let goTw = null;
      const go = (to, d = 1) => {
        const idx = mod(Math.round(to)); setC(idx);
        if (RM) { st.pos = to; place(); return; }
        // 'auto' only replaces an earlier move of pos; the act's entrance/exit tweens (off, alpha) keep running
        goTw = gsap.to(st, { pos: to, duration: d, ease: 'power3.inOut', overwrite: 'auto', onUpdate: place });
      };
      let target = 0;
      place(); setC(0);
      $$('[data-next]', S).forEach(b => b.addEventListener('click', () => go(target = Math.round(st.pos) + 1)));
      $$('[data-prev]', S).forEach(b => b.addEventListener('click', () => go(target = Math.round(st.pos) - 1)));
      // drag: the drum follows the pointer and settles on the nearest panel
      const area = cyl.parentElement;
      area.style.touchAction = 'pan-y'; area.style.cursor = 'grab'; area.style.userSelect = 'none';
      let p0 = null;
      area.addEventListener('pointerdown', e => { p0 = { x: e.clientX, pos: st.pos, t: performance.now() }; area.style.cursor = 'grabbing'; });
      addEventListener('pointermove', e => { if (!p0) return; const w = area.getBoundingClientRect().width / (c.mob ? 1.4 : 4.2); gsap.killTweensOf(st, 'pos'); st.pos = p0.pos - (e.clientX - p0.x) / w; place(); });
      addEventListener('pointerup', e => {
        if (!p0) return; const dx = e.clientX - p0.x, v = dx / Math.max(1, performance.now() - p0.t); p0 = null; area.style.cursor = 'grab';
        target = Math.round(st.pos - (Math.abs(v) > .6 ? Math.sign(v) * .5 : 0)); go(target, .8);
      });
      area.addEventListener('keydown', e => { if (e.key === 'ArrowRight') go(target = Math.round(st.pos) + 1); if (e.key === 'ArrowLeft') go(target = Math.round(st.pos) - 1); });
      A2X.ple = { st, place, cyl, pans, area, setC, mod: (v) => mod(Math.round(v)), dragging: () => !!p0, moving: () => !!(goTw && goTw.isActive()) };
      if (!ACT2) enter(sec, (tl, S) => {
        own(pans);
        if (RM) { tl.from(pans, { opacity: 0, duration: .2 }); return; }
        // the carousel arrives turning: it spins in from the right and settles on the first render (no fold, no jump)
        tl.fromTo(cyl, { opacity: 0 }, { opacity: 1, duration: .7, ease: 'power2.out', immediateRender: true }, 0)
          .fromTo(st, { pos: -1.5 }, { pos: 0, duration: 1.8, ease: 'power3.out', immediateRender: true, onUpdate: place }, 0);
      }, 'top 45%');
    } catch (err) { console.warn('04 Plenaria', err); }

    /* ---------- 05 Social event: the napkin unfolds, postcards are dealt, friezes run ---------- */
    try {
      const sec = $('#s05');
      const fA = $('[data-a=friezeA]', sec), fB = $('[data-a=friezeB]', sec);
      A2X.soc = { fA, fB };
      if (!RM) {
        const S = stageOf(sec);
        // the friezes run sideways all the time, in opposite directions, as an endless band
        [[fA, -1], [fB, 1]].forEach(([fz, dir]) => {
          const inner = fz && fz.firstElementChild, unit = inner && inner.children[0], sep = unit && unit.nextElementSibling;
          if (!unit) return;
          const w = () => { const nx = inner.children[2]; return nx ? nx.offsetLeft - unit.offsetLeft : unit.offsetWidth; };
          const kids = Array.from(inner.children);
          const tw = gsap.fromTo(kids, { x: dir > 0 ? -w() : 0 }, { x: dir > 0 ? 0 : -w(), duration: 16, ease: 'none', repeat: -1 });
          // the tiled band travels with the words, at the same speed: one tile per loop of its own
          const tile = parseFloat(getComputedStyle(fz).backgroundSize) || 22, tt = tile / (w() / 16);
          const bw = gsap.fromTo(fz, { backgroundPositionX: (dir > 0 ? -tile : 0) + 'px' }, { backgroundPositionX: (dir > 0 ? 0 : -tile) + 'px', duration: tt, ease: 'none', repeat: -1 });
          if (ACT2) { tw.pause(); bw.pause(); A2X.loops.push([tw, 's05'], [bw, 's05']); }
          else ScrollTrigger.create({ trigger: sec, start: 'top bottom', end: 'bottom top', onToggle: st => { const on = st.isActive; [tw, bw].forEach(t => (on ? t.play() : t.pause())); } });
        });
      }
    } catch (err) { console.warn('05 Social event', err); }

    /* ---------- 04.04 Contents: the LED screen plays the conference graphics in a loop (key visual, speaker title,
       session card with its transition); the chips light up with what is on screen; the equaliser never stops ---------- */
    try {
      const sec = $('#s04c'), S = stageOf(sec);
      if (sec && S && !RM && !ACT2 && $('.cl3', S)) {
        const l3 = $('.cl3', S), ses = $('.csess', S), wipe = $('.cwipe', S), chips = $$('.cchip', S), kvb = $('[data-a=kv]', S);
        const on = (ks) => () => chips.forEach(c => c.classList.toggle('on', ks.includes(+c.dataset.c)));
        const lp = gsap.timeline({ repeat: -1, paused: true, defaults: { ease: 'power3.out' } });
        lp.add(on([0]), 0)
          .fromTo($$('.kl[data-l=c295]', kvb), { y: 0 }, { y: -6, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0)
          .add(on([1]), 3.2)
          .fromTo(l3, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: .7 }, 3.2)
          .to(l3, { opacity: 0, x: -20, duration: .45, ease: 'power2.in' }, 6.0)
          .add(on([2, 3]), 6.5)
          .fromTo(wipe, { xPercent: 0 }, { xPercent: 380, duration: 1.0, ease: 'power2.inOut' }, 6.5)
          .set(ses, { opacity: 1 }, 7.0)
          .fromTo(Array.from(ses.children), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .6, stagger: .1 }, 7.1)
          .fromTo(wipe, { xPercent: 0 }, { xPercent: 380, duration: 1.0, ease: 'power2.inOut' }, 9.6)
          .set(ses, { opacity: 0 }, 10.1)
          .add(on([0]), 10.1)
          .set({}, {}, 11);
        const eq = gsap.to($$('.ceq i', S), { scaleY: () => .25 + Math.random() * .75, duration: .22, ease: 'none', repeat: -1, repeatRefresh: true, yoyo: true, stagger: { each: .06 }, paused: true });
        if (ACT2) A2X.loops.push([lp, 's04c'], [eq, 's04c']);
        else ScrollTrigger.create({ trigger: sec, start: 'top bottom', end: 'bottom top', onToggle: (self) => { self.isActive ? (lp.play(), eq.play()) : (lp.pause(), eq.pause()); } });
      }
    } catch (err) { console.warn('04.04 Contents', err); }

    /* ---------- 06 Organigrama ---------- */
    try {
      const sec = $('#s06'), S = stageOf(sec);
      const cards = own($$('[data-a=tcard]', S)), hs = own($$('[data-a=hs]', S));
      own($$('.crewbg, .mfh, .tlist, .cslot, svg.dr', S));
      let cur = 0, shown = false;
      const lineOf = (i) => $$('path.ln', S).find(l => +l.dataset.k === i);
      // the connector from the chosen point to the open card is drawn every time the choice changes
      const drawLine = (i, d = .8) => {
        $$('path.ln', S).forEach(l => { if (+l.dataset.k !== i) gsap.to(l, { opacity: 0, duration: RM ? 0 : .3, overwrite: true }); });
        const l = lineOf(i); if (!l) return;
        if (RM) { gsap.set(l, { opacity: 1, attr: { 'stroke-dashoffset': 0 } }); return; }
        gsap.fromTo(l, { opacity: 1, attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: d, ease: 'power2.inOut', overwrite: true });
      };
      A2X.crew = { show: (on) => { shown = on; if (on) drawLine(cur, 1); else $$('path.ln', S).forEach(l => gsap.set(l, { opacity: 0 })); } };
      if (!ACT2) enter(sec, (tl, S) => {
        const out = $$('[data-a=trace] polygon', S), inn = $$('.tin polyline', S);
        if (RM) { tl.from([...out, ...inn], { opacity: 0, duration: .2 }, 0); tl.add(() => { shown = true; drawLine(cur); }); return; }
        // non-scaling strokes dash in screen units: with pathLength=1 the dash must be as long as the on-screen scale,
        // or the trace stops short of its end (6 nov); once drawn, the dash is removed altogether
        const scl = (el) => { const m = el.getScreenCTM && el.getScreenCTM(); return m ? Math.max(1, Math.hypot(m.a, m.b)) * 1.02 : 1.5; };
        const dash = (els, d, at, stg) => els.forEach((el, j) => {
          tl.fromTo(el, { attr: { 'stroke-dasharray': () => scl(el) + ' ' + scl(el), 'stroke-dashoffset': () => scl(el) } },
            { attr: { 'stroke-dashoffset': 0 }, duration: d, ease: 'power2.inOut', immediateRender: true,
              onComplete: () => el.setAttribute('stroke-dasharray', 'none') }, at + (stg ? stg * j / Math.max(1, els.length - 1) : 0));
        });
        dash(out, 1.6, 0); dash(inn, 1.1, .5, .6);
        if (has($$('.pin[data-a=hs]', S))) tl.from($$('.pin[data-a=hs]', S), { scale: .7, opacity: 0, duration: .7, stagger: .1, ease: 'power3.out' }, 1.1);
        tl.add(() => { shown = true; drawLine(cur, 1); }, 1.5);
        // v2.20: explicit end state (a from() reads its end lazily, and could read the hidden entrance state)
        if (has($$('.mall .tcard', S))) tl.fromTo(own($$('.mall .tcard', S)), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .7, stagger: .1, ease: 'power3.out', immediateRender: false }, .6);
        if (CAP) { shown = true; const l = lineOf(cur); if (l) gsap.set(l, { opacity: 1, attr: { 'stroke-dashoffset': 0 } }); }
        if (has($$('.tlist .tab', S))) tl.from($$('.tlist .tab', S), { y: 16, opacity: 0, duration: .6, stagger: .07, ease: 'power3.out' }, 1.2);
        if (has($$('.cslot', S))) tl.from($$('.cslot', S), { y: 30, opacity: 0, duration: .8, ease: 'power3.out' }, 1.4);
        else if (has($$('[data-stack]', S))) tl.from($$('[data-stack]', S), { y: 30, opacity: 0, duration: .8, ease: 'power3.out' }, 1.2);
        if (has($$('button.tab:not(.tl)[data-a=hs]', S))) tl.fromTo($$('button.tab:not(.tl)[data-a=hs]', S), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: .6, stagger: .06, ease: 'power3.out', immediateRender: false }, .8);
      });
      // only the chosen team's card is open; the others are folded away in the same slot
      const pick = (i) => {
        const prev = cur; cur = i;
        hs.forEach(h => {
          const on = +h.dataset.k === i;
          if (h.classList.contains('pin')) h.classList.toggle('on', on);
          else if (!h.classList.contains('tl')) h.style.display = on ? 'none' : '';
          h.setAttribute('aria-pressed', on);
        });
        cards.forEach(cd => {
          const on = +cd.dataset.k === i;
          cd.classList.toggle('on', on);
          if (RM) { gsap.set(cd, { opacity: on ? 1 : 0, visibility: on ? 'visible' : 'hidden' }); return; }
          if (on) gsap.fromTo(cd, { opacity: 0, y: 14, visibility: 'visible' }, { opacity: 1, y: 0, duration: .55, delay: prev === i ? 0 : .12, ease: 'power3.out', overwrite: true });
          else gsap.to(cd, { opacity: 0, y: -10, duration: .3, ease: 'power2.in', overwrite: true, onComplete: () => gsap.set(cd, { visibility: 'hidden' }) });
        });
        if (shown) drawLine(i);
      };
      hs.forEach(h => h.addEventListener('click', () => pick(+h.dataset.k)));
      pick(0);
    } catch (err) { console.warn('06 Organigrama', err); }

    /* ---------- 07 Sostenibilidad ---------- */
    try {
      if (!ACT2) enter($('#s07'), (tl, S) => {
        $$('[data-a=needle]', S).forEach((n, i) => {
          if (RM) gsap.set(n, { rotation: -135, svgOrigin: n.dataset.o });
          else tl.fromTo(n, { rotation: -135, svgOrigin: n.dataset.o }, { rotation: 135, svgOrigin: n.dataset.o, duration: .55, ease: 'power2.inOut' }, .2 + .12 * i).to(n, { rotation: -135, svgOrigin: n.dataset.o, duration: .65, ease: 'power2.inOut' }, .8 + .12 * i);
        });
      });
    } catch (err) { console.warn('07 Sostenibilidad', err); }

    /* ---------- Act 2 (laptop; Israel's sketches of 6 nov) ----------
       0 map · 1–4 compass, full width, its route traced step by step, the copy in a floating card · 5 the IDEA rhombus
       turns into the concept window · 6–11 the concept screen shrinks into the mail banner; departures board ·
       12–15 the board closes, the venue rhombus is drawn and the plan builds up · 16 the gallery turns in, full width,
       and drifts on its own · 17 it turns out the other way; the social event · 18 the friezes and cards fold away,
       the C295 is drawn flying in from the left · 19 it leaves to the left and the gauges are drawn.
       Down plays one step or one hand-over, in time. Up never plays backwards: it cuts to the previous chapter as it ended. */
    let ACT2O = null;
    if (ACT2) try {
      const sec = a2wrap, Ly = (id) => $('#' + id, sec), Sg = (id) => $('.stage-l', Ly(id));
      const NIGHT = BG.night, SKY = BG.sky;
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut', lazy: false } });
      // GSAP 3.12 rewinds a fromTo to the values its targets had BEFORE it, not to its "from": so every piece is put in
      // its starting state now, and jumping back (a cut to an earlier chapter, a re-arm) finds it there again
      const _ft = tl.fromTo.bind(tl);
      // v2.12: only the FIRST fromTo on an element (per property) sets its resting value: what the element shows before
      // the act reaches it is the start of its earliest tween, never the start of a later one (that was making whole
      // scenes appear, complete, for a frame before their entrance)
      const INIT = new WeakMap();
      tl.fromTo = (tg, from, to, at) => {
        if (tg !== root) gsap.utils.toArray(tg).forEach(el => {
          if (!el || typeof el !== 'object') return;
          let done = INIT.get(el); if (!done) INIT.set(el, done = new Set());
          const sub = {};
          Object.keys(from).forEach(k => {
            if (k === 'attr') { const a = {}; Object.keys(from.attr).forEach(ak => { if (!done.has('attr.' + ak)) { done.add('attr.' + ak); a[ak] = from.attr[ak]; } }); if (Object.keys(a).length) sub.attr = a; }
            else if (['immediateRender', 'duration', 'ease', 'stagger', 'onUpdate', 'transformOrigin', 'svgOrigin'].includes(k)) sub[k] = from[k];
            else if (!done.has(k)) { done.add(k); sub[k] = from[k]; }
          });
          ['duration', 'ease', 'stagger', 'onUpdate', 'immediateRender'].forEach(k => delete sub[k]);
          if (Object.keys(sub).length) gsap.set(el, sub);
        });
        return _ft(tg, from, to, at);
      };
      const marks = [], CHS = [];
      const chap = (id, steps) => CHS.push({ id, from: marks.length - 1, steps });  // called right after the chapter's first mark
      const layer = (id, on, at) => tl.set(Ly(id), { autoAlpha: on ? 1 : 0 }, at);
      gsap.set(A2IDS.map(Ly), { autoAlpha: 0 });
      const IMM = { immediateRender: false };
      const len1 = (els) => els.forEach(e => e.setAttribute('pathLength', 1));

      /* ---- 0 · vision (v2): act 1 has just opened on the blue field; the compass is drawn across the screen ---- */
      const kS = Sg('s03a'), nd = $('svg.nd', kS), dialBox = $('.dial > div', kS);
      const seg = $$('[data-a=seg]', kS), wp = $$('[data-a=wp]', kS), ring = $('[data-a=ring]', kS), wpl = $$('[data-a=wpl]', nd), ktxt = $$('text', nd).filter(e => !wpl.includes(e));
      const kshapes = $$('line, circle, path, polyline, rect', nd).filter(e => !e.matches('[data-a=seg], [data-a=wp], [data-a=ring]'));
      const kdash = kshapes.filter(e => { const da = e.getAttribute('stroke-dasharray'); return da && da !== '1'; }), kdraw = kshapes.filter(e => !kdash.includes(e));
      len1(kdraw);
      const cx = (e) => { const b = e.getBBox(); return b.x + b.width / 2; };
      kdraw.sort((a, b) => cx(a) - cx(b)); ktxt.sort((a, b) => cx(a) - cx(b));
      const kbox = $('.kbox', kS), kcards = $$('[data-a=kcard]', kS).sort((x, y) => x.dataset.k - y.dataset.k);
      const kh = kcards.map(cd => cd.offsetHeight), KN = kcards.length;
      const khead = $$('h2, p.cap', kS).filter(e => !kbox.contains(e));
      gsap.set(kbox, { height: kh[0] + 54, overflow: 'hidden' });
      gsap.set(kcards.slice(1), { autoAlpha: 0 });
      gsap.set(seg.slice(1), { attr: { 'stroke-dashoffset': 1 } });
      let t = 0;
      layer('s03a', 1, 0);
      tl.fromTo(kdraw, { attr: { 'stroke-dasharray': 1, 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: 1.5, stagger: { amount: 1.2 }, ease: 'sine.inOut', ...IMM }, t + .1)
        .fromTo(ktxt, { opacity: 0 }, { opacity: 1, duration: .6, stagger: { amount: 1.1 }, ease: 'sine.inOut', ...IMM }, t + .5)
        .fromTo(kdash, { opacity: 0 }, { opacity: 1, duration: .9, ease: 'sine.inOut', ...IMM }, t + 1.0)
        .fromTo(dialBox, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: .7, ...IMM }, t + 1.0)
        .fromTo(seg[0], { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: 1.0, ease: 'sine.inOut', ...IMM }, t + 1.4)
        .fromTo([wp[0], ring], { opacity: 0, scale: .6, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: .7, stagger: .1, ...IMM }, t + 1.5)
        .fromTo(wpl[0], { opacity: 0 }, { opacity: 1, duration: .6, ...IMM }, t + 1.7)
        .fromTo(khead, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .8, stagger: .08, ...IMM }, t + .4)
        .fromTo(kbox, { opacity: 0, x: -40, clipPath: 'inset(0% 0% 0% 0%)' }, { opacity: 1, x: 0, duration: 1.0, ease: 'power3.inOut', ...IMM }, t + .9);
      t = 2.6; marks.push(t); chap('s03a', KN);
      for (let i = 0; i < KN - 1; i++) {
        const bb = wp[i + 1].getBBox();
        tl.to(seg[i + 1], { attr: { 'stroke-dashoffset': 0 }, duration: 1.2 }, t)
          .to(ring, { attr: { cx: bb.x + bb.width / 2, cy: bb.y + bb.height / 2 }, duration: 1.2 }, t)
          .to(kcards[i], { autoAlpha: 0, y: -8, duration: .45 }, t)
          .to(kbox, { height: kh[i + 1] + 54, duration: .8 }, t + .2)
          .fromTo(kcards[i + 1], { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: .6, ...IMM }, t + .45)
          .fromTo(wp[i + 1], { opacity: 0, scale: .6, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: .55, ease: 'back.out(1.6)', ...IMM }, t + .75)
          .fromTo(wpl[i + 1], { opacity: 0, x: wpl[i + 1].getAttribute('text-anchor') === 'end' ? 8 : -8 }, { opacity: 1, x: 0, duration: .5, ...IMM }, t + .85);
        t += 1.4; marks.push(t);
      }

      /* ---- vision → creative concept: the compass is undrawn and the card closes; the argument is set ---- */
      const cS = Sg('s03b'), carg = $('.carg', cS), ckv = $('.ckv', cS), alab = $('[data-a=alab]', cS), ah = $('.carg h2', cS), aps = $$('.carg p.ap, .carg p.cl', cS), mfds = $$('.carg .mfd', cS), scrs = $$('.carg .scr', cS), sbits = $$('.carg .scr > *', cS), hud = $('.carg .hud', cS), hudi = hud ? $$('i', hud) : [];
      const kvb = $('[data-a=kv]', ckv), kvl = (q) => $$(`.kl[data-l=${q}]`, kvb), kvi = (q) => $$(`.kl[data-l=${q}] .ki`, kvb);
      const cl1 = $('[data-a=cl1]', ckv), cl2 = $('[data-a=cl2]', ckv), kbar = $('.kbar', ckv), khat = $('.hatch27', ckv), kbad = $('[data-a=kbadge]', ckv);
      gsap.set(ckv, { autoAlpha: 0 });
      tl.to(kdraw.slice().reverse(), { attr: { 'stroke-dashoffset': 1 }, duration: 1.0, stagger: { amount: .7 }, ease: 'sine.inOut' }, t)
        .to([...kdash, ...ktxt, ...seg, ...wp, ...wpl, ring, dialBox], { opacity: 0, duration: .7 }, t + .1)
        .to(kbox, { clipPath: 'inset(0% 0% 100% 0%)', duration: .8, ease: 'power3.inOut' }, t)
        .to(khead, { opacity: 0, y: -12, duration: .6 }, t + .1);
      layer('s03b', 1, t + .8); layer('s03a', 0, t + 1.6);
      tl.fromTo(alab, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .6, ...IMM }, t + 1.0)
        .fromTo(ah, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.0, ease: 'power3.out', ...IMM }, t + 1.1)
      if (mfds.length) {
        /* glass cockpit: the three displays rise in their bezels, power on (a line opening to the full screen), then the readouts settle */
        tl.fromTo(mfds, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: .9, stagger: .12, ease: 'power3.out', ...IMM }, t + 1.35)
          .fromTo(scrs, { clipPath: 'inset(49% 0% 49% 0% round 6px)' }, { clipPath: 'inset(0% 0% 0% 0% round 6px)', duration: .7, stagger: .12, ease: 'power3.inOut', ...IMM }, t + 1.75)
          .fromTo(sbits, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .5, stagger: .04, ease: 'power2.out', ...IMM }, t + 2.15)
          .fromTo(hud, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .7, ease: 'power3.out', ...IMM }, t + 2.5)
          .fromTo(hudi, { scaleY: 0 }, { scaleY: 1, duration: .7, ease: 'power3.out', transformOrigin: '50% 0%', ...IMM }, t + 2.6);
        /* instrument loops, played only while the concept is on screen */
        const ro = (sel, v) => { const n = $(sel, cS); if (!n) return; const tw = gsap.to(n, { ...v, svgOrigin: '0 0', paused: true }); A2X.loops.push([tw, 's03b']); };
        ro('.carg .att', { rotation: 9, y: 6, duration: 3.2, ease: 'sine.inOut', repeat: -1, yoyo: true });
        ro('.carg .rose', { rotation: -360, duration: 40, ease: 'none', repeat: -1 });
        ro('.carg .sweep', { rotation: 360, duration: 4, ease: 'none', repeat: -1 });
      } else tl.fromTo(aps, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .8, stagger: .12, ease: 'power3.out', ...IMM }, t + 1.5);
      t += 3.4; marks.push(t); chap('s03b', 2);

      /* ---- argument → key visual: the words clear and the KV assembles, windows first, then the two aircraft ---- */
      // the displays switch off (the picture shrinks to a line) and the bezels fold shut, all gone before the KV comes
      if (mfds.length) tl.to(hud, { opacity: 0, y: -10, duration: .35, ease: 'power2.in' }, t)
        .to([...scrs].reverse(), { clipPath: 'inset(50% 0% 50% 0% round 6px)', duration: .3, stagger: .04, ease: 'power3.in' }, t)
        .to([...mfds].reverse(), { scaleY: 0, opacity: 0, transformOrigin: '50% 50%', duration: .32, stagger: .04, ease: 'power3.in' }, t + .22);
      else tl.to([...aps].reverse(), { opacity: 0, y: -16, duration: .5, stagger: .06, ease: 'power2.in' }, t);
      tl
        .to([ah, alab], { opacity: 0, y: -20, duration: .55, ease: 'power2.in' }, t + .15)
        .set(ckv, { autoAlpha: 1 }, t + .6)
        .fromTo(kvl('rearL'), { xPercent: -70, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 1.2, ease: 'expo.out', ...IMM }, t + .65)
        .fromTo(kvl('rearR'), { xPercent: 70, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 1.2, ease: 'expo.out', ...IMM }, t + .65)
        .fromTo(kvi('win'), { clipPath: 'inset(48% 48% 48% 48% round 14px)', scale: .86, opacity: 0 }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', scale: 1, opacity: 1, duration: 1.15, ease: 'expo.out', stagger: { each: .14, from: 'center' }, ...IMM }, t + .8)
        .fromTo(kvl('c295'), { xPercent: -38, yPercent: 34, rotation: -5, opacity: 0 }, { xPercent: 0, yPercent: 0, rotation: 0, opacity: 1, duration: 1.5, ease: 'power3.out', ...IMM }, t + 1.15)
        .fromTo(kvl('cn235'), { xPercent: 55, yPercent: -40, rotation: 7, opacity: 0 }, { xPercent: 0, yPercent: 0, rotation: 0, opacity: 1, duration: 1.35, ease: 'power3.out', ...IMM }, t + 1.4)
        .fromTo([cl1, cl2], { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .8, stagger: .12, ease: 'power3.out', ...IMM }, t + 1.6)
        .fromTo(kbar, { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: .7, ease: 'power3.out', ...IMM }, t + 1.85)
        .fromTo(khat, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: .9, ease: 'power2.out', ...IMM }, t + 1.9)
        .fromTo(kbad, { scale: .8, rotation: -20, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 1.1, ease: 'power3.out', ...IMM }, t + 1.9);
      t += 3.2; marks.push(t);

      /* ---- key visual → touchpoints: the KV steps back as the page turns to day; the first piece comes in ---- */
      const dS = Sg('s03c'), mocks = $$('[data-a=mock]', dS), rows = $$('[data-a=brow]', dS);
      const brd = $('.dboard', dS) || (rows[0] && rows[0].closest('ol').parentElement);
      const tha = $('.tha', dS), thb = $('.thb', dS), tpb = $('.tpb', dS), dlab = $('.dcol > .lab', dS);
      const ON = { background: '#243a5e', boxShadow: 'inset 4px 0 0 #9fd0ff' }, OFF = { background: 'rgba(0,0,0,0)', boxShadow: 'inset 0 0 0 #9fd0ff' };
      gsap.set(rows[0], ON); rows.forEach((r, i) => { if (i) gsap.set($$('[data-a=cell]', r), { opacity: .35, color: 'rgba(255,255,255,0)' }); });
      gsap.set(mocks.slice(1), { opacity: 0 });
      /* v2.7: the central window of the KV grows into the landscape that carries the touchpoints */
      const tland = $('.tland', Ly('s03c')), tli = tland && $('img', tland), tsc = tland && $('i', tland), tpa = $('.tpa', dS);
      const w2 = kvi('win')[1], w2pi = w2 && $('.pi', w2), Q = { e: 0, par: 0 }, QP = { x: 0, y: 0 };
      let q0 = null, qpS = 0, qpT = 0;
      const qnum = (el, k) => (el.dataset[k] || '').split(' ').map(Number);
      const qcover = (lr) => { const w = Math.max(lr.width, lr.height * 1.5) * 1.12, h = w / 1.5; return { x: (lr.width - w) / 2, y: (lr.height - h) / 2, w, h }; };
      const qmeasure = (lr) => {
        const fr = w2.getBoundingClientRect(), [vw] = qnum(w2, 'vb'), [fx, fy, fw, fh] = qnum(w2, 'full'), [, , iw] = qnum(w2, 'img');
        const pr = w2pi.getBoundingClientRect(), [ix, iy] = qnum(w2, 'img'), su = pr.width / iw;
        return { fr: { l: fr.left - lr.left, t: fr.top - lr.top, r: lr.right - fr.right, b: lr.bottom - fr.bottom }, rad: (+w2.dataset.r || 0) * fr.width / vw,
                 img: { x: pr.left - lr.left + (fx - ix) * su, y: pr.top - lr.top + (fy - iy) * su, w: fw * su, h: fh * su } };
      };
      const qrender = () => {
        if (!tland || !w2 || !w2pi) return;
        const vis = Q.e > 0 && Ly('s03c').style.visibility !== 'hidden';
        if (!vis) { if (tland.style.visibility !== 'hidden') tland.style.visibility = 'hidden'; q0 = null; qpS = Q.par; return; }
        tland.style.visibility = 'visible';
        const lr = tland.getBoundingClientRect(), cv = qcover(lr), e = Q.e;
        if (tsc) tsc.style.opacity = (e * e).toFixed(3);
        if (e < 1) {
          if (!q0) q0 = qmeasure(lr);
          const f = q0, L = (a, b) => a + (b - a) * e, k1 = 1 - e, rad = f.rad * (e < .85 ? 1 : (1 - e) / .15);
          Object.assign(tli.style, { left: L(f.img.x, cv.x) + 'px', top: L(f.img.y, cv.y) + 'px', width: L(f.img.w, cv.w) + 'px', height: L(f.img.h, cv.h) + 'px' });
          tland.style.clipPath = `inset(${(f.fr.t * k1).toFixed(2)}px ${(f.fr.r * k1).toFixed(2)}px ${(f.fr.b * k1).toFixed(2)}px ${(f.fr.l * k1).toFixed(2)}px round ${rad.toFixed(2)}px)`;
        } else {
          q0 = null;
          Object.assign(tli.style, { left: cv.x + 'px', top: cv.y + 'px', width: cv.w + 'px', height: cv.h + 'px' });
          tland.style.clipPath = 'none';
        }
        // parallax: the landscape drifts up through the six pieces and follows the pointer a little
        const rng = (cv.h - lr.height) / 2;
        // (the drift only applies once the window has opened: during the growth the photo stays exactly where the KV shows it)
        const ee = e * e;
        // v2.25: the drift follows the step through a soft spring (as the agenda's landscape), never in a straight tween
        const nowq = performance.now(), dtq = Math.min(.05, (nowq - (qpT || nowq)) / 1000 || .016); qpT = nowq;
        qpS = e < 1 ? Q.par : qpS + (Q.par - qpS) * Math.min(1, dtq * 2.6);
        tli.style.transform = `translate3d(${(QP.x * ee).toFixed(1)}px, ${(((.5 - qpS) * rng * .9 + QP.y) * ee).toFixed(1)}px, 0)`;
      };
      if (tland && !CAP && matchMedia('(hover: hover) and (pointer: fine)').matches) {
        const qx = gsap.quickTo(QP, 'x', { duration: 1.2, ease: 'power3.out' }), qy = gsap.quickTo(QP, 'y', { duration: 1.2, ease: 'power3.out' });
        addEventListener('pointermove', (ev) => { qx(-(ev.clientX / innerWidth - .5) * 30); qy(-(ev.clientY / innerHeight - .5) * 18); });
      }
      if (tland) gsap.ticker.add(qrender);
      tl.to([kbad, khat, kbar, cl2, cl1], { opacity: 0, y: -14, duration: .5, stagger: .05, ease: 'power2.in' }, t)
        .to(kvl('c295'), { xPercent: -24, yPercent: -10, opacity: 0, duration: .7, ease: 'power2.in' }, t)
        .to(kvl('cn235'), { xPercent: 30, yPercent: 12, opacity: 0, duration: .7, ease: 'power2.in' }, t);
      layer('s03c', 1, t + .5);
      tl.fromTo(Q, { e: 0 }, { e: 1, duration: 1.5, ease: 'power3.inOut', ...IMM }, t + .6)
        .fromTo(tland, { opacity: 1 }, { opacity: 1, duration: .01, ...IMM }, t + .5);
      layer('s03b', 0, t + 2.05);
      const tpp = [tpa].filter(Boolean);
      tl.fromTo([dlab, tha].filter(Boolean), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .9, stagger: .1, ...IMM }, t + 1.9)
        .fromTo(tpp, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .9, ...IMM }, t + 2.1)
        .fromTo(brd, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.0, ...IMM }, t + 2.1)
        .fromTo(rows, { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: .6, stagger: .06, ...IMM }, t + 2.3)
        .fromTo($$('[data-a=cell]', rows[0]), { rotationX: -90, opacity: .2 }, { rotationX: 0, opacity: 1, duration: .45, stagger: { amount: .3 }, ...IMM }, t + 2.7)
        .fromTo(mocks[0], { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .8, ease: 'power3.out', ...IMM }, t + 2.4);
      t += .8;
      t += 3.0; marks.push(t); chap('s03c', 4);
      for (let i = 0; i < 3; i++) {
        tl.fromTo(Q, { par: i / 3 }, { par: (i + 1) / 3, duration: 1.1, ease: 'power2.inOut', ...IMM }, t);
        tl.to(mocks[i], { y: -24, opacity: 0, duration: .55 }, t)
          .fromTo(mocks[i + 1], { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: .65, ...IMM }, t + .3)
          .fromTo($$('[data-a=cell]', rows[i + 1]), { rotationX: -90 }, { opacity: 1, rotationX: 0, color: '#ffffff', duration: .45, stagger: { amount: .25 }, ...IMM }, t + .3)
          .to(rows[i], { ...OFF, duration: .3 }, t + .3).to(rows[i + 1], { ...ON, duration: .3 }, t + .35);
        // from the printed pieces to the digital ones, the heading and its line change with them
        if (i === 2) tl.to([tha, tpa].filter(Boolean), { opacity: 0, y: -10, duration: .45, ease: 'power2.in' }, t)
          .fromTo(thb, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .6, ease: 'power2.out', ...IMM }, t + .35)
          .fromTo(tpb, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .6, ease: 'power2.out', ...IMM }, t + .45);
        t += 1.1; marks.push(t);
      }

      /* ---- touchpoints → location: the board closes; the hotel turns in from the right, already curved ---- */
      const pS = Sg('s04b'), P = A2X.ple, phead = $$('p.lab, h2, p.lp1', pS), pcap = $('.pcap', pS);
      tl.to(brd, { clipPath: 'inset(0% 0% 100% 0%)', duration: .8, ease: 'power3.inOut' }, t)
        .to([...mocks, ...$$('.dcol > :not(.dboard)', dS), ...$$('.tpp', dS)], { opacity: 0, duration: .6 }, t + .1)
        .to(tland, { opacity: 0, duration: 1.0, ease: 'power2.inOut' }, t + .3)
        .fromTo(root, { '--c-bg': NIGHT }, { '--c-bg': SKY, duration: 1.1, ease: 'power2.inOut', ...IMM }, t + .3);
      layer('s04b', 1, t + .9); layer('s03c', 0, t + 1.3);
      tl.fromTo(P.st, { off: -4.6, alpha: 1, k: 1 }, { off: 0, alpha: 1, k: 1, duration: 2.6, ease: 'power3.out', onUpdate: P.place, ...IMM }, t + .8)
        .fromTo(phead, { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: .8, stagger: .08, ...IMM }, t + 1.1)
        .fromTo(pcap, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .8, ...IMM }, t + 2.2);
      t += 3.5; marks.push(t); chap('s04b', 1);

      /* ---- location → implementation (v2, 10 nov): the hotel turns away the same way; the overview map is unrolled ---- */
      const sS = Sg('s04a'), ipans = $$('.ipan', sS), SPN = Object.fromEntries(ipans.map(p2 => [p2.dataset.k, p2])), imap = $('.imap', sS), iscr = $('.iscr', sS);
      const CAM = JSON.parse(imap.dataset.cam || '[]'), ZK = ['welcome', 'room', 'wg', 'mkt'];
      const ileg = $('.ileg', sS), ilbs = $$('.ilb', imap), izs = $$('.iz', imap), iexs = $$('.iex, .iwc', imap), ipins = $$('.ipin', imap);
      const iouts = $$('.iout path, .ilines path', imap), islab = $('.islab', imap);
      const zg = (k) => $(`.iz[data-z=${k}]`, imap), ztop = (k) => { const g = zg(k); return g ? $('.izt', g) : null; };
      const ibox = $('.ibox', sS), IH = Object.fromEntries(ipans.map(p2 => { const it = $('.itx', p2); return [p2.dataset.k, it ? it.offsetHeight : 400]; }));
      const IP = (k) => { const p2 = SPN[k]; return { ipk: $('.ipk', p2), itx: $('.itx', p2), ivm: $('.ivm', p2), ivt: $('.ivt', p2), ild: $('.ild', p2), lds: $$('.ild path', p2), ldc: $$('.ild circle', p2) }; };
      const PX = 556, PY = 108, PW = 836, PH = 520, TX = 640, TY = 662, SHUT = { scale: .06, x: TX - (PX + PW / 2), y: TY - (PY + PH / 2), opacity: 0 };
      gsap.set(ipans.filter(p2 => p2.dataset.k !== '0'), { opacity: 0 });
      gsap.set(imap, { x: 0, y: 0, scale: 1 });
      tl.to(P.st, { off: 4.6, duration: 2.0, ease: 'power2.in', onUpdate: P.place }, t)
        .to([...phead, pcap], { opacity: 0, duration: .6 }, t);
      layer('s04a', 1, t + 1.2); layer('s04b', 0, t + 2.05);
      const tp = t + .8;
      // the overview map is drawn: the floor's outline and its inner lines, then the slab, the zones rise one by one,
      // the exits and toilets appear and each pin drops with its name
      tl.fromTo(Array.from(SPN[0].children), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .9, stagger: .1, ...IMM }, tp + .9)
        .fromTo(iouts, { attr: { 'stroke-dasharray': 1, 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: 1.2, stagger: { amount: .6 }, ease: 'sine.inOut', ...IMM }, tp + .9)
        .fromTo(islab, { opacity: 0 }, { opacity: 1, duration: .8, ...IMM }, tp + 1.6);
      izs.forEach((g, i) => tl.fromTo($('.izb', g), { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: .7, ease: 'power3.out', ...IMM }, tp + 1.9 + i * .1)
        .fromTo($('.izt', g), { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: .7, ease: 'power3.out', ...IMM }, tp + 1.9 + i * .1)
        .fromTo($('.izl', g), { attr: { 'stroke-dasharray': 1, 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: .8, ease: 'sine.inOut', ...IMM }, tp + 2.1 + i * .1));
      tl.fromTo(iexs, { opacity: 0 }, { opacity: 1, duration: .4, stagger: .04, ...IMM }, tp + 2.4)
        .fromTo(ileg, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .6, ...IMM }, tp + 2.6);
      ipins.forEach((pn, i) => { const at = tp + 2.5 + i * .12;
        tl.fromTo($('.ipd', pn), { opacity: 0 }, { opacity: 1, duration: .2, ...IMM }, at - .05)
          .fromTo($('.ips', pn), { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: .4, ease: 'power2.out', ...IMM }, at)
          .fromTo($('.ipc', pn), { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: .5, ease: 'back.out(2)', ...IMM }, at + .25)
          .fromTo($('.ilb', pn), { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: .5, ease: 'power3.out', ...IMM }, at + .4); });
      t = tp + 3.8; marks.push(t); chap('s04a', 11);
      // v2.18: a walk through the spaces in two steps each. First the space as it is today: the camera closes in on
      // the zone, the zone lifts and the window opens from its pin with the empty space. Then the render, larger: the
      // window grows over the map and the picture changes to the render (mark() swaps it). After the welcome area,
      // the welcome pack. The text box stays; only its copy changes.
      const BIG = { left: 556, top: 108, width: 836, height: 520 }, SMALL = { left: PX, top: PY, width: PW, height: PH };
      const STRIP_A = { left: TX + 64, top: 642 }, STRIP_B = STRIP_A;
      const STOPS = [[1, 0], [1, 1], ['p', 0], ['p', 1], [2, 0], [2, 1], [3, 0], [3, 1], [4, 0], [4, 1]];
      A2X.istops = STOPS;
      const swapText = (from, to, at) => { tl.to(Array.from(IP(from).itx.children), { opacity: 0, y: -10, duration: .35, stagger: .03, ease: 'power2.in' }, at)
        .to(ibox, { height: IH[to], duration: .7, ease: 'power3.inOut' }, at + .3)
        .fromTo(Array.from(IP(to).itx.children), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .6, stagger: .06, ease: 'power2.out', ...IMM }, at + .75); };
      const openSpace = (k, zi, at) => { const nx = IP(k);
        tl.to(imap, { ...CAM[zi], duration: 1.05, ease: 'power3.inOut' }, at)
          .fromTo(zg(ZK[zi]), { y: 0 }, { y: -10, duration: .6, ease: 'power2.out', ...IMM }, at + .7)
          .fromTo(ztop(ZK[zi]), { attr: { fill: '#cfe0f7' } }, { attr: { fill: '#7fb0ee' }, duration: .6, ...IMM }, at + .7)
          .fromTo(SPN[k], { opacity: 0 }, { opacity: 1, duration: .01, ...IMM }, at + .7)
          .fromTo(nx.ild, { opacity: 1 }, { opacity: 1, duration: .01, ...IMM }, at + .7)
          .fromTo(nx.ldc, { scale: 0, transformOrigin: '50% 50%', opacity: 0 }, { scale: 1, opacity: 1, duration: .5, ease: 'back.out(1.8)', ...IMM }, at + .75)
          .fromTo(nx.lds, { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: .5, ease: 'power2.out', ...IMM }, at + .85)
          .fromTo(nx.ivm, { ...SHUT, ...SMALL, transformOrigin: '50% 50%' }, { scale: 1, x: 0, y: 0, opacity: 1, duration: .9, ease: 'expo.out', ...IMM }, at + 1.0)
          .fromTo(nx.ivt, { opacity: 0, x: -20, ...STRIP_A }, { opacity: 1, x: 0, duration: .6, ease: 'power3.out', ...IMM }, at + 1.15)
          .fromTo($$('button, .tbc', nx.ivt), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .45, stagger: .06, ...IMM }, at + 1.25); };
      const closeSpace = (k, zi, at) => { const pv = IP(k);
        tl.to(pv.ivt, { opacity: 0, y: 10, duration: .35 }, at)
          .to(pv.ivm, { opacity: 0, scale: .94, duration: .5, ease: 'power2.in' }, at + .05)
          .to(pv.ild, { opacity: 0, duration: .3 }, at)
          .set(SPN[k], { opacity: 0 }, at + .6);
        if (zi != null) tl.to(zg(ZK[zi]), { y: 0, duration: .6 }, at + .3).to(ztop(ZK[zi]), { attr: { fill: '#cfe0f7' }, duration: .5 }, at + .3); };
      // v2.19: today → render keeps the window as it is (always large); mark() crossfades the picture
      const bigger = (k, at) => { tl.set({}, {}, at + 1.0); };
      // overview → welcome (today)
      tl.fromTo(ibox, { height: IH[1], clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: .75, ease: 'power3.out', ...IMM }, t + .8)
        .to(Array.from(SPN[0].children), { opacity: 0, y: -10, duration: .45, stagger: .04, ease: 'power2.in' }, t)
        .to([ileg, ...ilbs].filter(Boolean), { opacity: 0, duration: .4 }, t)
        .fromTo(Array.from(IP(1).itx.children), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .7, stagger: .07, ease: 'power2.out', ...IMM }, t + 1.25);
      openSpace(1, 0, t + .3); t += 2.4; marks.push(t);
      // welcome → its render, larger
      bigger(1, t); t += 1.0; marks.push(t);
      // render → welcome pack: the render steps back; the gifts come in on a white card, one by one
      { const pk = IP('p').ipk, grp2 = $$('.ipg', pk).sort((a, b) => a.dataset.g - b.dataset.g), figA = $$('figure', grp2[0]), figB = $$('figure', grp2[1]);
        gsap.set(figB, { opacity: 0 });
        tl.to(IP(1).ivt, { opacity: 0, y: 10, duration: .35 }, t).to(IP(1).ivm, { opacity: 0, duration: .8, ease: 'power1.inOut' }, t + .25).set(SPN[1], { opacity: 0 }, t + 1.06)
          .fromTo(SPN.p, { opacity: 0 }, { opacity: 1, duration: .01, ...IMM }, t + .3)
          .fromTo(pk, { clipPath: 'inset(0% 0% 100% 0% round 8px)' }, { clipPath: 'inset(0% 0% 0% 0% round 8px)', duration: 1.0, ease: 'power2.inOut', ...IMM }, t + .3)
          .fromTo(figA, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .7, stagger: .12, ease: 'power3.out', ...IMM }, t + .8);
        swapText(1, 'p', t); t += 1.8; marks.push(t);
        // the gifts, two by two: the first pair leaves, the second comes in
        tl.to(figA, { opacity: 0, y: -16, duration: .4, stagger: .06, ease: 'power2.in' }, t)
          .fromTo(figB, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .7, stagger: .12, ease: 'power3.out', ...IMM }, t + .45);
        t += 1.3; marks.push(t);
        const figs = figB;
        // welcome pack → conference room (today)
        tl.to(figs, { opacity: 0, y: -14, duration: .35, stagger: .04, ease: 'power2.in' }, t)
          .to(pk, { clipPath: 'inset(0% 0% 100% 0% round 8px)', duration: .55, ease: 'power3.in' }, t + .2)
          .set(SPN.p, { opacity: 0 }, t + .8)
          .to(zg(ZK[0]), { y: 0, duration: .6 }, t + .3).to(ztop(ZK[0]), { attr: { fill: '#cfe0f7' }, duration: .5 }, t + .3);
        swapText('p', 2, t); openSpace(2, 1, t + .3); t += 2.4; marks.push(t); }
      bigger(2, t); t += 1.0; marks.push(t);
      for (const [k, zi] of [[3, 2], [4, 3]]) {
        closeSpace(k - 1, zi - 1, t); swapText(k - 1, k, t); openSpace(k, zi, t + .3); t += 2.4; marks.push(t);
        bigger(k, t); t += 1.0; marks.push(t);
      }

      /* ---- implementation → contents: the spaces clear; night; the LED screen switches on and plays the key visual ---- */
      const ctS = Sg('s04c'), cbox = $('.cbox', ctS), cnvs = $$('.cnv', ctS), csd = [$('.clab', ctS), ...Array.from($('.csd', ctS).children)].filter(Boolean);
      const avtx = $('.ctx[data-g=av]', ctS), aptx = $('.ctx[data-g=app]', ctS), capp = $('.capp', ctS), cside = $('.cappside', ctS);
      const csb = $$('.csb', ctS).sort((x, y) => x.dataset.k - y.dataset.k);
      gsap.set(csb[0], { clipPath: 'inset(0% 100% 0% 0% round 10px)' }); gsap.set(cbox, { opacity: 0 });   // hidden until the act gets there
      { const q4 = IP(4); tl.to(Array.from(q4.itx.children), { opacity: 0, y: -10, duration: .35, stagger: .03 }, t).to(ibox, { clipPath: 'inset(0% 0% 100% 0%)', duration: .5, ease: 'power3.in' }, t + .2)
          .to(q4.ivm, { opacity: 0, scale: .94, duration: .5, ease: 'power2.in' }, t).to([q4.ivt, q4.ild], { opacity: 0, duration: .3 }, t); }
      tl.to(SPN[4], { opacity: 0, duration: .3 }, t + .5)
        .to(imap, { opacity: 0, duration: .7, ease: 'power1.inOut' }, t + .15)
        .fromTo(root, { '--c-bg': SKY }, { '--c-bg': NIGHT, duration: 1.3, ease: 'power2.inOut', ...IMM }, t + .4);
      layer('s04c', 1, t + .7); layer('s04a', 0, t + 1.0);
      tl.fromTo(csd, { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: .8, stagger: .07, ...IMM }, t + .8)
        .fromTo(Array.from(avtx.children), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .9, stagger: .1, ...IMM }, t + .85)
        .fromTo(cbox, { opacity: 0, scale: .96, transformOrigin: '50% 60%' }, { opacity: 1, scale: 1, duration: 1.0, ease: 'power3.out', ...IMM }, t + .9)
        .fromTo(csb[0], { clipPath: 'inset(0% 100% 0% 0% round 10px)' }, { clipPath: 'inset(0% 0% 0% 0% round 10px)', duration: 1.1, ease: 'power3.inOut', ...IMM }, t + 1.1);
      t += 3.0; marks.push(t); chap('s04c', 3);
      // v2.18: 02 speaker titles · the key visual storyboard slides away and the lower-third storyboard takes its place
      // v2.24: one transition for the whole viewer: the next picture wipes in from the left over the current one,
      // which dims away underneath (storyboard → storyboard → app)
      tl.fromTo(csb[1], { opacity: 1, clipPath: 'inset(0% 100% 0% 0% round 10px)' }, { clipPath: 'inset(0% 0% 0% 0% round 10px)', duration: 1.0, ease: 'power3.inOut', ...IMM }, t)
        .to(csb[0], { opacity: 0, duration: .9, ease: 'power2.in' }, t + .1);
      t += 1.4; marks.push(t);
      // 03 event app: the storyboard folds away; the app rises in its place, its features beside it
      tl.fromTo(capp, { opacity: 1, clipPath: 'inset(0% 100% 0% 0% round 10px)' }, { clipPath: 'inset(0% 0% 0% 0% round 10px)', duration: 1.0, ease: 'power3.inOut', ...IMM }, t)
        .to(csb[1], { opacity: 0, duration: .9, ease: 'power2.in' }, t + .1)
        .to(avtx, { opacity: 0, y: -12, duration: .5 }, t)
        .fromTo(aptx, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .8, ...IMM }, t + .5)
        .fromTo(cside, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .8, ...IMM }, t + .8);
      t += 2.4; marks.push(t);

      /* ---- event app → social event: the app steps down; the cards are dealt ---- */
      const soS = Sg('s05'), posts = $$('[data-a=post]', soS), fA = A2X.soc.fA, fB = A2X.soc.fB;
      const spn = $$('.spn', soS).sort((a, b) => a.dataset.k - b.dataset.k), stabs = $$('.stab', soS), sback = $('.shead .sback:not(.scont)', soS);
      const grp = (g) => posts.filter(p2 => +p2.dataset.g === g);
      tl.to([cbox, capp, cside], { opacity: 0, y: 30, duration: .7, ease: 'power1.inOut' }, t)
        .to([aptx, ...csd], { opacity: 0, y: -12, duration: .5, stagger: .03 }, t);
      layer('s05', 1, t + .9); layer('s04c', 0, t + 1.0);
      const PEEL = { tl: [0, 0, 1, 1], tr: [100, 0, -1, 1], bl: [0, 100, 1, -1], br: [100, 100, -1, -1] };
      // the sticker's anchor corner sits 12% outside the box, so a lifted (hovered) card is never clipped
      const poly = (cn, v) => { const [x, y, sx, sy] = PEEL[cn], m = 12; return `polygon(${x - sx * m}% ${y - sy * m}%, ${x + sx * (v - m)}% ${y - sy * m}%, ${x - sx * m}% ${y + sy * (v - m)}%)`; };
      const corner = (el) => { const r = el.getBoundingClientRect(), s = soS.getBoundingClientRect(); return ((r.top + r.height / 2 < s.top + s.height / 2) ? 't' : 'b') + ((r.left + r.width / 2 < s.left + s.width / 2) ? 'l' : 'r'); };
      const r0 = (el) => +gsap.getProperty(el, 'rotation') || 0;
      const CN = new Map(posts.map(p2 => [p2, corner(p2)])), R0 = new Map(posts.map(p2 => [p2, r0(p2)]));
      // postcards are laid like stickers, corner to corner, and lifted the same way
      const dealIn = (g, at, T = tl, im = IMM) => grp(g).forEach((el, i) => { const cn = CN.get(el), [, , sx, sy] = PEEL[cn], rr = R0.get(el);
        T.fromTo(el, { clipPath: poly(cn, 0), rotation: rr + sx * sy * 3, scale: 1.04 }, { clipPath: poly(cn, 320), rotation: rr, scale: 1, duration: i ? .9 : 1.1, ...im }, at + i * .13); });
      const dealOut = (g, at, T = tl) => grp(g).slice().reverse().forEach((el, i) => { const cn = CN.get(el), [, , sx, sy] = PEEL[cn], rr = R0.get(el);
        T.to(el, { clipPath: poly(cn, 0), rotation: rr + sx * sy * 3, scale: 1.03, duration: .7 }, at + i * .06); });
      /* v2.11: overview of three napkins over the crossed friezes (they stay crossed behind everything). A napkin opens
         by growing into the central white card (one frame resizes, the napkin's content fades out, the proposal's
         fades in); between proposals the frame resizes and the content changes on white; the postcards always leave
         first and the new ones are stuck on after, corner to corner */
      const snaps = $$('.snap', soS).sort((a, b) => a.dataset.k - b.dataset.k), sov = [...Array.from($('.sov', soS).children), $('.sovc', soS)].filter(Boolean), shd = $('.shead', soS), shlab = $('.shlab', soS);
      const sfr = $('.sfr', soS), NR = snaps.map(r0), SCN = ['bl', 'tr', 'br'];
      const nIn = (el) => Array.from($('.snb > span', el).children), kids = (k2) => Array.from(spn[k2].firstElementChild.children);
      snaps.forEach((el, i) => CN.set(el, SCN[i])); CN.set(sfr, 'tl');
      const N0 = snaps.map(el => ({ left: parseFloat(el.style.left), top: parseFloat(el.style.top), width: 320, height: 430 }));
      const FH = spn.map(el => el.offsetHeight || 480);
      // v2.13: the card and its bar are one group, centred on the same line whatever the proposal's length
      const GC = 452, TOP = FH.map(h => Math.round(GC - (h + 26 + 104) / 2)), FR = (k2) => ({ left: 438, top: TOP[k2], width: 564, height: FH[k2] });
      spn.forEach((el, k2) => gsap.set(el, { top: TOP[k2] }));
      gsap.set(spn, { opacity: 1 }); spn.forEach((el, k2) => gsap.set(kids(k2), { opacity: 0, y: 12 }));
      posts.forEach(el => gsap.set(el, { clipPath: poly(CN.get(el), 0) }));
      const tS = t + .9;
      tl.fromTo(fA, { clipPath: 'inset(0% 100% 0% 0%)', y: -436, rotation: -3 }, { clipPath: 'inset(0% 0% 0% 0%)', y: -436, rotation: -3, duration: 1.6, ...IMM }, tS + .1)
        .fromTo(fB, { clipPath: 'inset(0% 0% 0% 100%)', opacity: 1, x: 0, rotation: 2.5 }, { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, x: 0, rotation: 2.5, duration: 1.6, ...IMM }, tS + .2)
        .fromTo(sov, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .8, stagger: .08, ...IMM }, tS + .1);
      snaps.forEach((el, i) => { const [, , sx, sy] = PEEL[CN.get(el)];
        tl.fromTo(el, { clipPath: poly(CN.get(el), 0), rotation: NR[i] + sx * sy * 4, opacity: 1 }, { clipPath: poly(CN.get(el), 320), rotation: NR[i], duration: 1.0, ease: 'power2.out', ...IMM }, tS + .5 + i * .16); });
      t = tS + 2.2; marks.push(t); chap('s05', 4);
      const peelOff = (el, i, at, T) => { const [, , sx, sy] = PEEL[CN.get(el)]; T.to(el, { clipPath: poly(CN.get(el), 0), rotation: NR[i] + sx * sy * 4, duration: .55, ease: 'power2.in' }, at); };
      const stickOn = (el, i, at, T) => { const [, , sx, sy] = PEEL[CN.get(el)]; T.fromTo(el, { clipPath: poly(CN.get(el), 0), rotation: NR[i] + sx * sy * 4, opacity: 1, ...N0[i] }, { clipPath: poly(CN.get(el), 320), rotation: NR[i], duration: .8, ease: 'power2.out' }, at); };
      const open1 = (k2, at, T = tl, im = IMM) => {
        const el = snaps[k2];
        snaps.forEach((o2, i) => { if (i !== k2) peelOff(o2, i, at + Math.abs(i - k2) * .06, T); });
        T.to(sov, { opacity: 0, y: -10, duration: .4 }, at)
          .to(nIn(el), { opacity: 0, duration: .3, stagger: .03 }, at)
          .fromTo(el, { ...N0[k2], rotation: NR[k2] }, { ...FR(k2), rotation: 0, duration: .9, ease: 'power3.inOut', ...im }, at + .15)
          .fromTo(sfr, { opacity: 0, top: TOP[k2], height: FH[k2], clipPath: poly('tl', 320) }, { opacity: 1, duration: .01, ...im }, at + 1.05)
          .to(el, { opacity: 0, duration: .01 }, at + 1.06)
          .fromTo(kids(k2), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .5, stagger: .05, ...im }, at + 1.1)
          .fromTo(shd, { top: TOP[k2] + FH[k2] + 26 }, { top: TOP[k2] + FH[k2] + 26, duration: .01, ...im }, at + 1.0)
          .fromTo([shd, shlab], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .6, ...im }, at + 1.3);
        dealIn(k2, at + 1.25, T, im);
      };
      const close1 = (k2, at, T) => {
        const el = snaps[k2];
        dealOut(k2, at, T);
        T.to([shd, shlab], { opacity: 0, y: 10, duration: .35 }, at)
          .to(kids(k2), { opacity: 0, y: -8, duration: .3, stagger: .03 }, at)
          .fromTo(el, { ...FR(k2), rotation: 0, opacity: 1, clipPath: poly(CN.get(el), 320) }, { ...N0[k2], rotation: NR[k2], duration: .9, ease: 'power3.inOut' }, at + .5)
          .to(sfr, { opacity: 0, duration: .01 }, at + .5)
          .fromTo(nIn(el), { opacity: 0 }, { opacity: 1, duration: .4, stagger: .04 }, at + 1.2)
          .to(sov, { opacity: 1, y: 0, duration: .6, stagger: .06 }, at + 1.1);
        snaps.forEach((o2, i) => { if (i !== k2) stickOn(o2, i, at + 1.0 + Math.abs(i - k2) * .08, T); });
      };
      A2X.soc.open1 = open1; A2X.soc.close1 = close1;
      open1(0, t);
      t += 2.6; marks.push(t);
      // proposal → proposal: the postcards peel off and the copy fades; the white card resizes; then the new copy and postcards
      for (let k2 = 0; k2 < 2; k2++) {
        dealOut(k2, t);
        tl.to(kids(k2), { opacity: 0, y: -8, duration: .3, stagger: .03 }, t)
          .to(sfr, { top: TOP[k2 + 1], height: FH[k2 + 1], duration: .6, ease: 'power3.inOut' }, t + .55)
          .to(shd, { top: TOP[k2 + 1] + FH[k2 + 1] + 26, duration: .6, ease: 'power3.inOut' }, t + .55)
          .fromTo(kids(k2 + 1), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .5, stagger: .05, ...IMM }, t + 1.05);
        dealIn(k2 + 1, t + 1.2);
        t += 2.4; marks.push(t);
      }
      const cards5 = grp(2).map(el => [el, CN.get(el)]);

      /* ---- 17 → 18 · the cards and friezes fold away; the C295 flies in from the right as it is drawn ---- */
      const crS = Sg('s06'), plane = $('svg.dr', crS), out = $$('[data-a=trace] polygon', crS), inn = $$('.tin polyline', crS);
      const cpinsL = $$('.pin[data-a=cpin]', crS), cteams = $$('.cteam', crS).sort((a, b) => a.dataset.k - b.dataset.k), TP = (k) => $$('.cpass', cteams[k]), cpall = $$('.cslotw .cpass', crS), cslotl = $('.cslotl', crS), chd = $$(':scope > h2, :scope > p.cap', crS);
      const cpins = cpinsL, crest = [...chd, cslotl, ...cpall].filter(Boolean);
      const HIDE = (el) => -(el.offsetTop + el.offsetHeight + 30);   // above the slot, out of sight
      const scl = (el) => { const m = el.getScreenCTM && el.getScreenCTM(); return m ? Math.max(1, Math.hypot(m.a, m.b)) * 1.04 : 1.5; };
      cards5.slice().reverse().forEach(([el, cn], i) => {
        const [, , sx, sy] = PEEL[cn], rr = r0(el);
        tl.to(el, { clipPath: poly(cn, 0), rotation: rr + sx * sy * 3, scale: 1.03, duration: 1.0 }, t + i * .1);
      });
      tl.to(fA, { clipPath: 'inset(0% 100% 0% 0%)', duration: 1.1 }, t + .2)
        .to(fB, { clipPath: 'inset(0% 0% 0% 100%)', duration: 1.1 }, t + .25)
        .to(kids(2), { opacity: 0, duration: .3 }, t)
        .to(sfr, { clipPath: poly('tl', 0), duration: .8, ease: 'power2.in' }, t + .2)
        .to([shd, shlab], { opacity: 0, y: 10, duration: .5 }, t);
      layer('s06', 1, t + .7); layer('s05', 0, t + 1.6);
      // the C295 in profile flies in from the right as it is drawn; its points appear; the counter prints the first crew
      tl.fromTo(plane, { x: () => 1500 + Math.max(0, (innerWidth / k() - 1440) / 2), opacity: 1 }, { x: 0, duration: 2.9, ease: 'power3.out', ...IMM }, t + .5);
      [...out, ...inn].forEach((el, j) => tl.fromTo(el, { attr: { 'stroke-dasharray': () => scl(el) + ' ' + scl(el), 'stroke-dashoffset': () => scl(el) } },
        { attr: { 'stroke-dashoffset': 0 }, duration: j < out.length ? 2.2 : 1.2, ease: 'sine.inOut', ...IMM }, t + (j < out.length ? .7 : 1.4 + .6 * (j - out.length) / Math.max(1, inn.length - 1))));
      const trace = $('[data-a=trace]', crS);
      if (trace) tl.fromTo(trace, { attr: { 'fill-opacity': 0 } }, { attr: { 'fill-opacity': .3 }, duration: .9, ...IMM }, t + 2.4);
      const SH0 = '0 20px 40px rgba(0,8,24,0)', SH1 = '0 20px 40px rgba(0,8,24,.45)';  // the passes' shadow grows as they come out of the slot and fades as they go back
      // the slot prints the leadership's passes; then (v2.19) one step per team: the passes go back into the slot and
      // the next team's are printed
      tl.fromTo(chd, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .9, stagger: .08, ...IMM }, t + 2.3)
        .fromTo(cpinsL, { scale: .8, opacity: 0 }, { scale: 1, opacity: 1, duration: .7, stagger: .1, ...IMM }, t + 2.6)
        .fromTo(cslotl, { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: .35, duration: .7, ease: 'power3.out', ...IMM }, t + 2.7);
      cpall.forEach(el => gsap.set(el, { y: HIDE(el), boxShadow: SH0 }));
      // v2.23.1: every card lands before the step ends (the 4th one used to stop a few px short, cut by the slot)
      TP(0).forEach((el, j) => tl.fromTo(el, { y: HIDE(el), boxShadow: SH0 }, { y: 0, boxShadow: SH1, duration: .7, ease: 'power2.out', ...IMM }, t + 2.9 + j * .1));
      t += 4.0; marks.push(t); chap('s06', 5);
      for (let k2 = 1; k2 < 5; k2++) {
        TP(k2 - 1).slice().reverse().forEach((el, j) => tl.to(el, { y: HIDE(el), boxShadow: SH0, duration: .45, ease: 'power2.in' }, t + j * .05));
        TP(k2).forEach((el, j) => tl.fromTo(el, { y: HIDE(el), boxShadow: SH0 }, { y: 0, boxShadow: SH1, duration: .7, ease: 'power2.out', ...IMM }, t + .45 + j * .1));
        t += 1.6; marks.push(t);
      }

      /* ---- crew → work plan (v2, 10 nov): the plane leaves to the left, drawing the timeline behind it; the phases rise in order ---- */
      const wS = Sg('s06b'), whead = Array.from($('.whead', wS).children), wbd = $('.wbd', wS), wrows = $$('.wrow', wS), wgate = $('.wgate', wS), wgks = $$('.wgk', wS);
      const wbh = $$('.wbd .bh, .whint', wS), wtx = (r) => $('.c3', r);
      // v2.23: the nav log's route column: progress line, the filled waypoints and the ring on the active row
      const wrp = $('.wrp', wS), wring = $('.wring', wS), wdf = $$('.wdf', wS), wdm = $('.wdm', wS), RHW = 54, wfill = (k) => wdf.find(d => +d.dataset.k === k);
      const wrtAll = [...$$('.wrt > path:not(.wrp):not(.wdf), .wrt > circle', wS), wfill(0)].filter(Boolean);
      // v2.12: the crew leaves first and completely (passes back into the slot, the plane off to the left), then the board
      TP(4).slice().reverse().forEach((el, j) => tl.to(el, { y: HIDE(el), boxShadow: SH0, duration: .5, ease: 'power2.in' }, t + j * .04));
      tl
        .to([...cpins, ...chd, cslotl], { opacity: 0, duration: .45 }, t + .1)
        .to(plane, { x: -1800, duration: 1.0, ease: 'power3.in' }, t + .2);
      layer('s06b', 1, t + 1.15); layer('s06', 0, t + 1.25);
      t += .35;
      // v2.23: the nav log drops in, the rows and the route come in; the leg card opens
      tl.fromTo(whead, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .8, stagger: .08, ...IMM }, t + 1.0)
        .fromTo(wbd, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.0, ease: 'power3.inOut', ...IMM }, t + 1.1)
        .fromTo(wbh, { opacity: 0 }, { opacity: 1, duration: .5, ...IMM }, t + 1.4);
      // v2.24: only the row you are on is at full opacity; the others wait at 50 %
      wrows.forEach((r, i) => tl.fromTo(r, { opacity: 0, x: -14 }, { opacity: i ? .5 : 1, x: 0, duration: .5, ...IMM }, t + 1.5 + i * .07)
        .fromTo(wtx(r), { opacity: 0 }, { opacity: 1, duration: .4, ...IMM }, t + 1.6 + i * .07));
      // the route column: the waypoints pop in down the rows, the ring settles on the first one
      tl.fromTo(wrtAll, { opacity: 0 }, { opacity: 1, duration: .4, stagger: .04, ...IMM }, t + 1.55)
        .fromTo(wring, { scale: .4 }, { scale: 1, duration: .6, ease: 'back.out(2)', ...IMM }, t + 2.0);
      gsap.set(wrp, { attr: { 'stroke-dashoffset': 1 } }); gsap.set(wring, { y: 0 });
      tl.fromTo(wgate, { opacity: 0, clipPath: 'inset(0% 0% 100% 0%)' }, { opacity: 1, clipPath: 'inset(0% 0% 0% 0%)', duration: .8, ease: 'power3.out', ...IMM }, t + 2.3);
      const WON = { backgroundColor: '#243a5e', boxShadow: 'inset 4px 0 0 #9fd0ff', opacity: 1 }, WOFF = { backgroundColor: 'rgba(36,58,94,0)', boxShadow: 'inset 0 0 0 #9fd0ff', opacity: .5 };
      wrows.forEach((r, j) => gsap.set(r, j ? { backgroundColor: WOFF.backgroundColor, boxShadow: WOFF.boxShadow } : { backgroundColor: WON.backgroundColor, boxShadow: WON.boxShadow }));
      t += 3.2; marks.push(t); chap('s06b', 7);
      // v2.14: one flight per step (from the kick-off to the closure); the row lights up, its flaps turn, the gate card
      // changes; a click on a row jumps to its step
      for (let k2 = 0; k2 < 6; k2++) {
        tl.to(wrows[k2], { ...WOFF, duration: .35 }, t)
          .to(wrows[k2 + 1], { ...WON, duration: .35 }, t + .05)
          .to(wrp, { attr: { 'stroke-dashoffset': 1 - (k2 + 1) / 6 }, duration: .8, ease: 'power2.inOut' }, t)
          .to(wring, { y: RHW * (k2 + 1), duration: .8, ease: 'power2.inOut' }, t)
          .to(wgks[k2], { opacity: 0, y: -8, duration: .35, ease: 'power2.in' }, t)
          .fromTo(wgks[k2 + 1], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .5, ease: 'power2.out', ...IMM }, t + .3);
        if (wfill(k2 + 1)) tl.to(wfill(k2 + 1), { opacity: 1, duration: .3 }, t + .55);
        t += 1.1; marks.push(t);
      }
      // the event's status blinks like a real board while the chapter is on screen
      // the destination waypoint (Seville) pulses softly while the chapter is on screen
      if (wdm) { const bl = gsap.to(wdm, { opacity: .45, duration: .9, ease: 'sine.inOut', repeat: -1, yoyo: true, paused: true }); A2X.loops.push([bl, 's06b']); }

      /* ---- work plan → sustainability: the phases clear; the gauges are drawn ---- */
      const gS = Sg('s07'), gauges = $$('[data-a=gauge]', gS), rims = $$('[data-a=grim]', gS), ticks = $$('[data-a=gtick]', gS);
      const garcs = gauges.map(g => $('path', g)), needles = $$('[data-a=needle]', gS), glabels = $$(':scope > div > div, h2, h2 ~ p', gS).filter(e => !e.closest('svg'));
      len1(rims);
      tl.to(wgate, { clipPath: 'inset(0% 0% 100% 0%)', duration: .5, ease: 'power2.in' }, t)
        .to(wbd, { clipPath: 'inset(0% 0% 100% 0%)', duration: .7, ease: 'power3.in' }, t + .1)
        .to([...whead, $('.whint', wS)].filter(Boolean), { opacity: 0, y: -12, duration: .5 }, t + .1);
      layer('s07', 1, t + .9); layer('s06b', 0, t + 1.0);
      t += .9;
      tl.fromTo(rims, { attr: { 'stroke-dasharray': 1, 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: 1.2, stagger: .14, ease: 'sine.inOut', ...IMM }, t)
        .fromTo(ticks, { opacity: 0 }, { opacity: 1, duration: .7, stagger: .14, ...IMM }, t + .6)
        .fromTo(garcs, { opacity: 0 }, { opacity: 1, duration: .7, stagger: .14, ...IMM }, t + .8)
        .fromTo(glabels, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .8, stagger: .05, ...IMM }, t + .4);
      needles.forEach((nn, i) => tl.fromTo(nn, { rotation: -135, svgOrigin: nn.dataset.o, opacity: 0 }, { rotation: 135, opacity: 1, svgOrigin: nn.dataset.o, duration: .7, ...IMM }, t + 1.0 + .12 * i)
        .to(nn, { rotation: -135, svgOrigin: nn.dataset.o, duration: .8 }, t + 1.7 + .12 * i));
      t += 2.8; marks.push(t); chap('s07', 1);
      if (tl.duration() < t) tl.set({}, {}, t);

      /* ---- the stepper: one gesture, one step; up cuts to the chapter before, as it ended ---- */
      // after any jump of the playhead (a cut, a re-arm) the drum and the claim's inner copy are placed again
      tl.eventCallback('onUpdate', () => { P.place(); if (A2X.wplace) A2X.wplace(); });
      const n = marks.length;
      const chOf = (i) => CHS.findIndex(c2 => i >= c2.from && i < c2.from + c2.steps);
      let cur = -1, chOn = -1;
      const loops = (i) => {
        const id = CHS[chOn] ? CHS[chOn].id : '', st = CHS[chOn] ? i - CHS[chOn].from : -1;
        A2X.loops.forEach(([tw, lid, s0]) => (lid === id && (s0 == null || s0 === st) ? tw.play() : tw.pause()));
      };
      // the key visual keeps its depth while it is on screen: its layers follow the pointer, each by its depth
      if (!CAP && matchMedia('(hover: hover) and (pointer: fine)').matches) {
        const qs = $$('.kp', kvb).map(p => { const d = +p.parentElement.dataset.depth || .5; return [d, gsap.quickTo(p, 'x', { duration: .9, ease: 'power3.out' }), gsap.quickTo(p, 'y', { duration: .9, ease: 'power3.out' })]; });
        // and, as on the v1 cover, the photos travel inside their windows the other way
        const qp = $$('.ph', kvb).map(g => [gsap.quickTo(g, 'x', { duration: 1.1, ease: 'power3.out' }), gsap.quickTo(g, 'y', { duration: 1.1, ease: 'power3.out' })]);
        const rest = () => { qs.forEach(([, qx, qy]) => { qx(0); qy(0); }); qp.forEach(([qx, qy]) => { qx(0); qy(0); }); };
        sec.addEventListener('pointermove', e => {
          if (!CHS[chOn] || CHS[chOn].id !== 's03b' || o.busy) return rest();
          const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
          qs.forEach(([d, qx, qy]) => { qx(-nx * 46 * d); qy(-ny * 26 * d); });
          qp.forEach(([qx, qy]) => { qx(nx * 34); qy(ny * 18); });
        });
        sec.addEventListener('pointerleave', rest);
      }
      // v2.14: the photos sit a little larger than their windows, so the pointer can move them without ever showing an edge
      gsap.set($$('.pi', kvb), { scale: 1.1, transformOrigin: '50% 50%' });
      let crewCall = null;
      const mark = (i, instant) => {
        if (i === cur) return; cur = i;
        const ch = chOf(i); if (ch !== chOn) chOn = ch; loops(i);
        // the chosen team's line is drawn once the plane is in place (it is not part of the scrubbable timeline)
        if (crewCall) crewCall.kill();
        if (CHS[ch].id === 's06') crewCall = gsap.delayedCall(instant ? 0 : 3.1, () => A2X.crew.show(true));
        else A2X.crew.show(false);
        if (CHS[ch].id === 's06') cpinsL.forEach(b => { const on = +b.dataset.k === i - CHS[ch].from; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
        const lay = Ly(CHS[ch].id);
        sec.dataset.ch = lay.dataset.ch;
        if (o.st && curY() >= o.st.start - 2 && curY() <= o.st.end + 2) $('#chap').textContent = lay.dataset.ch;
        gsap.to(fieldState, { amt: FIELD[CHS[ch].id] ?? .7, duration: .8, overwrite: true });
        if (CHS[ch].id === 's05') { const st = i - CHS[ch].from; stabs.forEach((b) => b.classList.toggle('on', +b.dataset.k === st - 1)); snaps.forEach((b) => (b.style.pointerEvents = st === 0 ? 'auto' : 'none')); shd.style.pointerEvents = st === 0 ? 'none' : 'auto'; const sc = $('.sovc', soS); if (sc) sc.style.pointerEvents = st === 0 ? 'auto' : 'none'; }
        if (CHS[ch].id === 's06b') wrows.forEach((r, j) => r.setAttribute('aria-current', j === i - CHS[ch].from ? 'step' : 'false'));
        // v2.27: only the animation on screen plays, from the start each time it arrives
        csb.forEach((e, j) => { const v = $('video', e); if (!v) return; const on = CHS[ch].id === 's04c' && i - CHS[ch].from === j;
          if (on && v.paused) { try { v.currentTime = 0; } catch (_) {} const pp = v.play(); if (pp && pp.catch) pp.catch(() => {}); } else if (!on && !v.paused) v.pause(); });
        if (CHS[ch].id === 's04c') { const st = i - CHS[ch].from; [capp, cside].forEach(e => (e.style.pointerEvents = st === 2 ? 'auto' : 'none')); csb.forEach((e, j) => (e.style.pointerEvents = st === j ? 'auto' : 'none')); }
        if (CHS[ch].id === 's04c') cnvs.forEach((b) => { const on = +b.dataset.k === i - CHS[ch].from; b.classList.toggle('on', on); b.setAttribute('aria-current', on ? 'step' : 'false'); });
        if (CHS[ch].id === 's04a') { const st = i - CHS[ch].from, stop = st ? A2X.istops[st - 1] : [0, 0];
          ipans.forEach((p) => (p.style.pointerEvents = p.dataset.k === String(stop[0]) ? 'auto' : 'none'));
          $$('.ipk .ipg', SPN.p).forEach((g) => (g.style.pointerEvents = stop[0] === 'p' && +g.dataset.g === stop[1] ? 'auto' : 'none'));
          // today first, then the render: the main picture follows the step (a thumb can still change it)
          const pn = SPN[stop[0]], iv = pn && $('[data-iv]', pn);
          if (iv && st) { const vi = String(stop[1] ? 1 : 0); $$('.ivm img[data-vi]', iv).forEach(im => im.classList.toggle('on', im.dataset.vi === vi)); $$('.ivt button[data-vi]', iv).forEach(b => { b.classList.toggle('on', b.dataset.vi === vi); b.setAttribute('aria-pressed', b.dataset.vi === vi); }); } }
        if (CHS[ch].id === 's03c') rows.forEach((r, j) => r.setAttribute('aria-current', j === i - CHS[ch].from ? 'step' : 'false'));
      };
      const o = { sec, n, at: 0, busy: false, q: 0, drive: false, tw: null, frozen: false };
      const show = (i) => {
        o.at = i; mark(i);
        if (o.tw) o.tw.kill();
        if (CAP) { tl.time(marks[i]); return; }
        const d = Math.abs(tl.time() - marks[i]); if (d < .001) return;
        o.tw = tl.tweenTo(marks[i], { duration: d, ease: 'none' });
      };
      o.st = ScrollTrigger.create({
        id: 'act2', trigger: sec, pin: true, start: 'top top', end: () => '+=' + innerHeight * (n - 1) * .5, invalidateOnRefresh: true,
        // the scroll never plays the act; if the page lands elsewhere in it (scrollbar), the step is set, never played back
        onUpdate: (self) => { if (o.drive || o.busy || navTo != null) return; const i = Math.round(self.progress * (n - 1)); if (i !== o.at) o.set(i); },
        onToggle: (self) => { if (self.isActive) $('#chap').textContent = sec.dataset.ch; },
      });
      // re-armed (before the map is drawn) only once the whole act is below the screen
      ScrollTrigger.create({ trigger: sec.parentElement.classList.contains('pin-spacer') ? sec.parentElement : sec, start: 'top bottom', onLeaveBack: () => { if (o.tw) o.tw.kill(); tl.time(0); o.at = 0; mark(0); } });
      o.pos = (i) => o.st.start + (o.st.end - o.st.start) * i / (n - 1);
      o.set = (i) => { if (o.finish) o.finish(); if (o.tw) o.tw.kill(); o.q = 0; o.busy = false; o.drive = false; tl.time(i === 0 && curY() < o.st.start - 2 ? 0 : marks[i]); o.at = i; mark(i, true); };
      const after = () => { o.drive = false; o.busy = false; if (o.q) { const d = Math.sign(o.q); o.q = 0; const nx = o.at + d; if (nx >= 0 && nx < n) o.go(nx); } };
      // 7 nov · a jump inside one chapter (venue stops, board rows) never blanks the scene: only what differs between
      // the two steps moves. The target is read from the act itself (time moved there and back, unpainted), the
      // pieces travel to it (what leaves fades first, what arrives fades in after), and then, in one frame, they get
      // their old values back and the act is set on the new step, so its own record of start values stays right.
      const MV = ['opacity', 'y'], CELL = ['opacity', 'rotationX', 'color'], ROW = ['opacity', 'x', 'backgroundColor', 'boxShadow'];
      const JUMPSET = {
        s03c: () => [...mocks.map(e => [e, MV]), [tha, MV], [thb, MV], [tpb, MV], ...rows.map(e => [e, ROW]), ...rows.flatMap(r => $$('[data-a=cell]', r)).map(e => [e, CELL])],
        s05: () => [...posts.map(e => [e, ['clipPath', 'rotation', 'scale']]), ...snaps.map(e => [e, ['opacity', 'left', 'top', 'width', 'height', 'rotation', 'clipPath']]), ...snaps.flatMap(e => nIn(e).map(c2 => [c2, ['opacity']])), [sfr, ['opacity', 'top', 'height']], ...spn.flatMap((e, k2) => kids(k2).map(c2 => [c2, MV])), ...sov.map(e => [e, MV]), [shd, ['opacity', 'y', 'top']], [shlab, MV]],
        s06b: () => [...wrows.map(e => [e, ['backgroundColor', 'boxShadow', 'opacity']]), ...wgks.map(e => [e, MV]), [wrp, ['attr']], [wring, ['y']], ...wdf.map(e => [e, ['opacity']])],
        s06: () => [...cpall.map(e => [e, ['y', 'boxShadow']])],
        s04c: () => [...csb.map(e => [e, ['opacity', 'clipPath']]), [cbox, ['opacity', 'y']], [avtx, MV], [aptx, MV], [capp, ['opacity', 'y', 'clipPath']], [cside, ['opacity', 'y']]],
        s04a: () => [...ipans.map(e => [e, ['opacity']]), ...Array.from(SPN[0].children).map(e => [e, MV]), [imap, ['x', 'y', 'scale']], [ibox, ['clipPath', 'height']], ...[ileg, ...ilbs].filter(Boolean).map(e => [e, ['opacity']]), ...ZK.map(k => [zg(k), ['y']]),
          ...[1, 2, 3, 4].flatMap(k => { const q = IP(k); return [[q.ivm, ['opacity', 'scale', 'x', 'y', 'left', 'top', 'width', 'height']], [q.ivt, ['opacity', 'x', 'y', 'left', 'top']], [q.ild, ['opacity']], ...Array.from(q.itx.children).map(e => [e, MV])]; }),
          [IP('p').ipk, ['clipPath']], ...$$('figure', IP('p').ipk).map(e => [e, MV]), ...Array.from(IP('p').itx.children).map(e => [e, MV])],
      };
      const readOf = ([e, props]) => { const v = {}; props.forEach(p => { if (p === 'attr') v.attr = { 'stroke-dashoffset': +e.getAttribute('stroke-dashoffset') }; else v[p] = gsap.getProperty(e, p); }); return v; };
      const jumpWithin = (i) => {
        if (o.tw && o.tw.isActive() && o.tw.vars && o.tw.vars.onComplete) { const pt2 = o.tw; o.tw = null; pt2.progress(1); }
        const id = CHS[chOf(i)].id, set = JUMPSET[id](), els = set.map(x => x[0]);
        const t0 = tl.time(), from = set.map(readOf);
        tl.time(marks[i], true); const to = set.map(readOf); tl.time(t0, true);
        o.busy = true; o.drive = true; o.t0 = performance.now(); if (o.tw) o.tw.kill();
        const prev = o.at; o.at = i; mark(i);
        const jt = gsap.timeline({ onComplete() {
          els.forEach((e, j) => gsap.set(e, from[j]));
          tl.time(marks[i]);
          after();
        } });
        els.forEach((e, j) => {
          const a = from[j], b = to[j], rest = {};
          Object.keys(b).forEach(p => { if (p !== 'opacity' && p !== 'attr' && a[p] !== b[p]) rest[p] = b[p]; });
          if (b.attr && a.attr && b.attr['stroke-dashoffset'] !== a.attr['stroke-dashoffset']) rest.attr = b.attr;
          const da = b.opacity == null ? 0 : +b.opacity - +a.opacity;
          if (Object.keys(rest).length) jt.to(e, { ...rest, duration: .9, ease: 'power2.inOut' }, da > 0 ? .2 : 0);
          if (da < -.01) jt.to(e, { opacity: b.opacity, duration: .35, ease: 'power2.in' }, 0);
          else if (da > .01) jt.to(e, { opacity: b.opacity, duration: .55, ease: 'power2.out' }, .32);
        });
        if (jt.duration() < .9) jt.set({}, {}, .9);
        o.tw = jt;
        scrollToY(o.pos(i), .9);
        return prev;
      };
      // social event: from the overview a napkin opens straight into any proposal, and «All proposals» closes any of
      // them back into its napkin (a one-off animation; then the act is set on the new step, as in a jump)
      // «Continue»: whatever the social event shows (the three napkins or a proposal) leaves the way the act takes its
      // last proposal away: postcards and card peel off, napkins peel off, the friezes fold. Then the act plays the
      // crew's own entrance (the plane flies in and is drawn, the passes are printed).
      const toCrew = () => {
        const c5 = CHS.find(c2 => c2.id === 's05'), c6 = CHS.find(c2 => c2.id === 's06'); if (!c5 || !c6) return;
        if (o.busy && o.tw && o.tw.isActive()) { const pt2 = o.tw; o.tw = null; pt2.progress(1); }
        if (chOf(o.at) !== CHS.indexOf(c5)) { o.go(c6.from); return; }
        const st = o.at - c5.from, i = c6.from;
        o.busy = true; o.drive = true; o.q = 0; o.t0 = performance.now(); if (o.tw) o.tw.kill();
        o.at = i; mark(i);
        const jt = gsap.timeline({ onComplete() {
          const t0 = marks[i - 1] + .5;
          tl.time(t0, true); gsap.set(Ly('s05'), { autoAlpha: 0 });
          o.tw = tl.tweenTo(marks[i], { duration: marks[i] - t0, ease: 'none', onComplete: after });
        } });
        if (st === 0) { snaps.forEach((el, j) => peelOff(el, j, j * .08, jt)); jt.to(sov, { opacity: 0, y: -10, duration: .4, stagger: .04 }, 0); }
        else { const k2 = st - 1; dealOut(k2, 0, jt);
          jt.to(kids(k2), { opacity: 0, duration: .3 }, 0).to(sfr, { clipPath: poly('tl', 0), duration: .7, ease: 'power2.in' }, .2).to([shd, shlab], { opacity: 0, y: 10, duration: .4 }, 0); }
        jt.to(fA, { clipPath: 'inset(0% 100% 0% 0%)', duration: .9 }, .15).to(fB, { clipPath: 'inset(0% 0% 0% 100%)', duration: .9 }, .2);
        scrollToY(o.pos(i), 1.0 + (marks[i] - marks[i - 1] - .5));
      };
      const socMorph = (i) => {
        const c5 = CHS.find(c2 => c2.id === 's05'); if (!c5 || !A2X.soc.open1) return false;
        const f5 = c5.from, a0 = o.at; let k2, open;
        if (a0 === f5 && i >= f5 + 2 && i <= f5 + 3) { k2 = i - f5 - 1; open = true; }
        else if (i === f5 && a0 >= f5 + 2 && a0 <= f5 + 3) { k2 = a0 - f5 - 1; open = false; }
        else return false;
        // a morph still running is finished first (its end sets the act right), then the new one starts
        if (o.tw && o.tw.isActive()) { const pt2 = o.tw; o.tw = null; pt2.progress(1); }
        const keep = JUMPSET.s05().map(x => [x[0], readOf(x)]);
        o.busy = true; o.drive = true; o.t0 = performance.now(); if (o.tw) o.tw.kill();
        o.at = i; mark(i);
        const jt = gsap.timeline({ onComplete() { keep.forEach(([e, v]) => gsap.set(e, v)); tl.time(marks[i]); after(); } });
        if (open) A2X.soc.open1(k2, 0, jt, {}); else A2X.soc.close1(k2, 0, jt);
        o.tw = jt;
        scrollToY(o.pos(i), Math.min(1.2, jt.duration()));
        return true;
      };
      // v2.17: a one-off transition still running (a jump inside a chapter, a napkin morph, «Continue») is always
      // finished, never killed half-way, before anything else moves the act: killed, it left pieces in between states
      const finishTw = () => { if (o.tw && o.tw.isActive() && o.tw.vars && o.tw.vars.onComplete) { const pt2 = o.tw; o.tw = null; o.q = 0; pt2.progress(1); } };
      o.finish = finishTw;
      o.go = (i) => {
        i = clamp(i, 0, n - 1);
        finishTw();
        if (socMorph(i)) return;
        if ((i < o.at - 1 || i > o.at + 1) && chOf(i) === chOf(o.at) && JUMPSET[CHS[chOf(i)].id]) { jumpWithin(i); return; }
        if (i < o.at - 1 || i > o.at + 1) {
          // a jump (pins, rows, index) is a short cross-fade of the scene onto the new step, never a sweep
          o.busy = true; o.drive = true; o.t0 = performance.now(); if (o.tw) o.tw.kill();
          const lay = Ly(CHS[chOf(o.at)].id), lay2 = Ly(CHS[chOf(i)].id);
          o.tw = gsap.timeline({ onComplete: after })
            .to([Sg(lay.id), Sg(lay2.id)], { opacity: 0, duration: .3, ease: 'power2.in' })
            .add(() => { tl.time(marks[i]); o.at = i; mark(i, true); })
            .to([Sg(lay.id), Sg(lay2.id)], { opacity: 1, duration: .45, ease: 'power2.out' });
          scrollToY(o.pos(i), .75);
          return;
        }
        o.busy = true; o.drive = true; o.t0 = performance.now();
        const back = i < o.at, d = Math.abs(marks[i] - tl.time()) * (back ? .8 : 1);
        o.at = i; mark(i);
        if (o.tw) o.tw.kill();
        o.tw = tl.tweenTo(marks[i], { duration: d, ease: 'none' });
        scrollToY(o.pos(i), clamp(d, .5, 3.6), after);
      };
      o.land = (i, cb) => { o.busy = true; o.t0 = performance.now(); o.drive = true; o.q = 0; show(i); scrollToY(o.pos(i), clamp(Math.abs(curY() - o.pos(i)) / innerHeight * .9, .3, .8), () => { after(); cb && cb(); }); };
      o.arrive = () => { if (tl.time() < marks[0] - .01) { o.at = 0; show(0); } };
      o.endLand = () => { o.busy = true; o.drive = true; o.t0 = performance.now(); scrollToY(o.st.end, .5, after); };
      // up from the map: the map is undrawn, then act 1 replays its exit backwards (the window closes over the field)
      o.upExit = () => {
        const A = window.__act && window.__act(); if (!A) return;
        o.busy = true; o.drive = true; o.t0 = performance.now(); if (o.tw) o.tw.kill();
        o.tw = tl.tweenTo(0, { duration: Math.min(1.4, tl.time()), ease: 'none', onComplete: () => { o.busy = false; o.drive = false; A.fromBelow(); } });
      };
      steppers.push(o);
      ACT2O = o; o.tl = tl; o.marks = marks; o.chs = CHS;
      mark(0);
      // the content is the control: board rows and venue stops jump to their step
      rows.forEach((r, j) => { r.setAttribute('role', 'button'); r.tabIndex = 0; r.style.cursor = 'pointer'; const go = () => o.go(CHS.find(c2 => c2.id === 's03c').from + j); r.addEventListener('click', go); r.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }); });
      const s05from = () => CHS.find(c2 => c2.id === 's05').from;
      stabs.forEach((b) => b.addEventListener('click', () => o.go(s05from() + 1 + +b.dataset.k)));
      snaps.forEach((b) => b.addEventListener('click', () => o.go(s05from() + 1 + +b.dataset.k)));
      if (sback) sback.addEventListener('click', () => o.go(s05from()));
      // «Continue»: from the overview or any proposal straight on to the crew
      $$('[data-s5-cont]', soS).forEach(b => b.addEventListener('click', () => toCrew()));
      cnvs.forEach((b) => b.addEventListener('click', () => o.go(CHS.find(c2 => c2.id === 's04c').from + +b.dataset.k)));
      wrows.forEach((r, j) => { const go6 = () => o.go(CHS.find(c2 => c2.id === 's06b').from + j);
        r.addEventListener('click', go6); r.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go6(); } }); });
      // the crew counter: choosing a point on the aircraft takes the passes back into the slot and prints the team's
      // a point on the aircraft goes to its team's step
      cpinsL.forEach(b => b.addEventListener('click', () => o.go(CHS.find(c2 => c2.id === 's06').from + +b.dataset.k)));
      // the gallery drifts slowly on its own while it is on screen and at rest (hover, focus, drag or the viewer pause it)
      // 7 nov: the drum turns for as long as it is on screen, also while it comes in and while it leaves, so the
      // entrance eases into the drift and the exit accelerates out of it with no stop in between
      const pLy = Ly('s04b');
      let lastIdx = -1;
      gsap.ticker.add((time, dt) => {
        if (pLy.style.visibility !== 'hidden' && +gsap.getProperty(pLy, 'opacity') > 0 && !P.dragging() && !P.moving() && !window.__lbOpen) {
          P.st.pos += dt / 7000; P.place();
          const idx = P.mod(P.st.pos); if (idx !== lastIdx) { lastIdx = idx; P.setC(idx); }
        }
      });
    } catch (err) { console.warn('Act 2', err); }
    window.__act2 = () => ACT2O;

    /* ---------- 08 Credenciales ---------- */
    try {
      // the gallery enters with the generic soft fade (no side entrance)
    } catch (err) { console.warn('08 Credenciales', err); }

    /* ---------- footer: landing ---------- */
    try {
      const ft = $('#s09');
      if (ft) {
        // its pieces enter with the generic entrance system below
      }
    } catch (err) { console.warn('footer', err); }

    /* ---------- entrances: every element is hidden until it reaches the viewport, then plays its own entrance ----------
       Done with CSS keyframes (class .rv / .rv.go) so it never fights the values GSAP or the steppers set inline:
       the keyframe has no end state, so each element lands on whatever opacity/transform it is meant to have. */
    try {
      if (!CAP && !RM) {
        const SKIPT = new Set(['STYLE', 'SCRIPT', 'BR', 'DEFS', 'TITLE', 'TEMPLATE']);
        const MATCH = 'h1,h2,h3,h4,p,li,figure,img,button,a,svg,time,.tab,.btn,.steps,.lab,.cap,.tag,.pend-x,[role=img],[role=group]';
        const surface = (cs) => (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') || cs.backgroundImage !== 'none' || cs.boxShadow !== 'none' || parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderLeftWidth) > 0;
        const holds = (el) => { for (const h of HANDLED) if (el !== h && el.contains(h)) return true; return false; };
        const items = [];
        const visit = (el, area) => {
          if (SKIPT.has(el.tagName) || el.hasAttribute('data-bgx') || HANDLED.has(el) || el.classList.contains('seam')) return;
          if (gsap.getTweensOf(el).length) return;   // v2.20: an element GSAP already animates never gets a second entrance
          const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return;
          const r = el.getBoundingClientRect(), big = r.width * r.height > area * .45, svg = el.tagName.toLowerCase() === 'svg';
          const cand = !holds(el) && (!big || svg) && (el.dataset.a || el.matches(MATCH) || (el.tagName === 'DIV' && surface(cs)) || (!/^(OL|UL)$/.test(el.tagName) && Array.from(el.children).some(k => k.dataset && k.dataset.a)));
          if (cand) { if (r.width || r.height) items.push({ el, soft: big || svg && r.height > 200 }); return; }
          Array.from(el.children).forEach(k => visit(k, area));
        };
        SECS.forEach(sec => {
          if (sec === a2wrap) return;
          const S = stageOf(sec); if (!S || HANDLED.has(S)) return;
          const R0 = S.getBoundingClientRect();
          Array.from(S.children).forEach(k => visit(k, Math.max(1, R0.width * Math.min(R0.height, innerHeight))));
        });
        items.forEach(({ el, soft }) => el.classList.add('rv', soft ? 'rv-s' : 'rv-u'));
        const play = (batch) => {
          batch.map(el => [el, el.getBoundingClientRect()]).sort((a, b) => (a[1].top - b[1].top) || (a[1].left - b[1].left))
            .forEach(([el], i) => { el.style.animationDelay = Math.min(i * 70, 560) + 'ms'; el.classList.add('go'); });
        };
        const reset = (batch) => batch.forEach(el => { el.classList.remove('go'); el.style.animationDelay = ''; });
        // play when in view (clamped, so the last pieces of the page always play); reset only once fully below the screen
        ScrollTrigger.batch(items.map(o => o.el), { start: 'clamp(top 92%)', end: () => ScrollTrigger.maxScroll(window) + 1, interval: .08, onEnter: play });
        ScrollTrigger.batch(items.map(o => o.el), { start: 'top bottom', end: () => ScrollTrigger.maxScroll(window) + 1, interval: .08, onLeaveBack: reset });
        rvItems = items.map(o => o.el);
      }
    } catch (err) { console.warn('entrances', err); }


    /* ---------- page tone: the flight profile, always blended with scroll ---------- */
    gsap.set(root, { '--c-bg': BG[PROFILE[SECS[0].id]] });
    const trig = (sec) => (sec.parentElement.classList.contains('pin-spacer') ? sec.parentElement : sec);
    if (RM) {
      SECS.forEach(sec => {
        const to = () => gsap.to(root, { '--c-bg': BG[PROFILE[sec.id]], duration: .3, overwrite: true });
        ScrollTrigger.create({ trigger: trig(sec), start: 'top center', end: 'bottom center', onEnter: to, onEnterBack: to });
      });
    } else {
      SECS.forEach((sec, i) => {
        if (!i) return;
        const a = BG[PROFILE[SECS[i - 1].id]], b = BG[PROFILE[sec.id]];
        if (a === b) return;
        // a timed, eased cross-fade when the new section takes the middle of the screen: never a hard switch,
        // never a long muddy in-between while you scroll
        const go = (col) => () => gsap.to(root, { '--c-bg': col, duration: CAP ? 0 : 1.1, ease: 'power2.inOut', overwrite: true });
        ScrollTrigger.create({ trigger: sec, start: 'top 55%', onEnter: go(b), onLeaveBack: go(a) });
      });
    }
    // v2.20: the header band (phones, portrait tablets) steps aside while Act 1 is on screen
    { const s0 = SECS.find(x => x.id === 's00'); if (s0) ScrollTrigger.create({ trigger: trig(s0), start: 'top top', end: 'bottom 76px', onToggle: s => root.classList.toggle('nob', s.isActive) }); }
    // chapter label and field presence
    SECS.forEach(sec => ScrollTrigger.create({ trigger: trig(sec), start: 'top center', end: 'bottom center', onToggle: s => {
      if (!s.isActive) return;
      $('#chap').textContent = sec.dataset.ch;
      if (sec !== a2wrap) gsap.to(fieldState, { amt: FIELD[sec.id] ?? .7, duration: RM ? 0 : .8, overwrite: true });
    } }));

    /* ---------- transit plane between chapters ---------- */
    $$('[data-a=seam]').forEach(sm => {
      const sec = sm.closest('.sc');
      if (RM) { gsap.set(sm, { opacity: 0 }); return; }
      gsap.fromTo(sm, { x: -220 }, { x: () => innerWidth + 40, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top 35%', scrub: SCRUB, invalidateOnRefresh: true } });
    });

    STEPPERS = steppers;
    return () => {
      if (a2wrap) {
        ScrollTrigger.getAll().forEach(s => { if (s.trigger === a2wrap || s.pin === a2wrap) s.kill(true); });   // unpin first
        A2IDS.forEach(id => { const s = $('#' + id); s.classList.remove('a2l'); gsap.set(s, { clearProps: 'all' }); a2wrap.before(s); });
        a2wrap.remove(); a2wrap = null;
      }
      STEPPERS = []; rvItems.forEach(el => { el.classList.remove('rv', 'rv-s', 'rv-u', 'go'); el.style.animationDelay = ''; }); rvItems = []; gsap.set(root, { clearProps: '--c-bg' }); };
  });

  /* ---------- index, anchors, back to top ---------- */
  let jumping = false, jumpNext = null;
  const closeIx = () => { if (ixp.classList.contains('on')) { ixp.classList.remove('on'); ixb.setAttribute('aria-expanded', false); } };
  addEventListener('keydown', e => { if (e.key === 'Escape' && ixp.classList.contains('on')) { closeIx(); ixb.focus(); } });
  addEventListener('pointerdown', e => { if (!ixp.contains(e.target) && !ixb.contains(e.target)) closeIx(); });
  let ixY = 0; ixb.addEventListener('click', () => (ixY = scrollY));
  // v2.20: only the user's own scrolling closes it; a jump or a step moving the page never does
  addEventListener('scroll', () => { if (navTo != null || jumping) { ixY = scrollY; return; } if (Math.abs(scrollY - ixY) > 80) closeIx(); }, { passive: true });
  // Index, brand chip, back to top: never drag the page through every chapter. Neighbouring sections scroll
  // smoothly; anything further is a cut: the content fades out, the page moves while hidden, the destination fades
  // in and plays its own entrance. The background never jumps: the field keeps its position and the page tone
  // blends from the old colour to the new one.
  const mainEl = $('main'), footEl = $('footer.ft');
  function jumpTo(top, el, act, step) {
    const from = scrollY;
    const setAll = () => STEPPERS.forEach(o => { const past = o !== act && top >= o.st.end - 2; o.set(o === act ? step : (past ? o.n - 1 : 0)); o.frozen = past; });
    if (RMQ.matches) { scrollTo(0, top); ScrollTrigger.update(); setAll(); return; }
    if (jumping) { jumpNext = [top, el, act, step]; return; }
    if (Math.abs(top - from) <= innerHeight * 1.15 && !act) { scrollToY(top, .9); return; }
    jumping = true;
    // 7 nov: a dip, never a slide. Opacity only (a transform on <main> would unhook the pinned acts, which then pop in
    // late); the page empties, the tone changes while it is empty, and the destination fades in where it already is.
    const parts = [mainEl, footEl].filter(Boolean);
    navTo = top;
    gsap.killTweensOf(parts);
    gsap.to(parts, { opacity: 0, duration: .32, ease: 'power2.in', onComplete() {
      const bg0 = getComputedStyle(root).getPropertyValue('--c-bg').trim();
      const s0 = lenis ? lenis.animatedScroll : scrollY;
      if (lenis) lenis.scrollTo(top, { immediate: true, force: true }); else scrollTo(0, top);
      ScrollTrigger.update();
      fieldOff += s0 - top;
      setAll();
      ScrollTrigger.update();
      // the destination tone: what the acts just rendered, or where the page-tone triggers that just fired are heading.
      // Only those loose tweens are replaced (never overwrite:true, which would also kill the acts' own tone tweens)
      let bg1 = getComputedStyle(root).getPropertyValue('--c-bg').trim();
      const loose = gsap.getTweensOf(root).filter(tw => tw.parent === gsap.globalTimeline);
      if (loose.length) { const v = loose[loose.length - 1].vars['--c-bg']; if (v) bg1 = v; loose.forEach(tw => tw.kill()); }
      const tone = bg0 && bg1 && bg0 !== bg1;
      if (tone) gsap.fromTo(root, { '--c-bg': bg0 }, { '--c-bg': bg1, duration: .5, ease: 'sine.inOut' });
      requestAnimationFrame(() => requestAnimationFrame(() => { navTo = null; }));
      // v2.20: a jump never lands on empty frames. The pictures on (and just below) the destination screen load first,
      // capped so a slow network never holds the page hidden for long
      const t0 = performance.now();
      const shown = (im) => { if (getComputedStyle(im).visibility === 'hidden') return false; for (let n = im; n && n !== mainEl; n = n.parentElement) if (+getComputedStyle(n).opacity < .05) return false; return true; };
      const imgs = $$('main img').filter(im => { const r = im.getBoundingClientRect(); return r.bottom > -innerHeight * .25 && r.top < innerHeight * 1.5 && r.width > 0 && shown(im); });
      imgs.forEach(im => { if (im.loading === 'lazy') im.loading = 'eager'; });
      const ready = Promise.all(imgs.map(im => (im.complete && im.naturalWidth ? Promise.resolve() : (im.decode ? im.decode() : new Promise(r => im.addEventListener('load', r, { once: true })))).catch(() => {})));
      Promise.race([ready, new Promise(r => setTimeout(r, 1400))]).then(() => {
        if (jumpNext) { const nx = jumpNext; jumpNext = null; jumping = false; jumpTo(...nx); return; }   // still hidden: go straight on
        const wait = Math.max(0, (tone ? .3 : .05) - (performance.now() - t0) / 1000);
        gsap.fromTo(parts, { opacity: 0 }, { opacity: 1, duration: .6, ease: 'power2.out', delay: wait, clearProps: 'opacity', onComplete: () => {
          jumping = false;
          if (jumpNext) { const nx = jumpNext; jumpNext = null; jumpTo(...nx); }
        } });
      });
    } });
  }
  $$('#ixp a, a[href^="#s"], a.skip').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href').slice(1), el = document.getElementById(id); if (!el) return;
    e.preventDefault();
    closeIx();
    el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true });
    // targets inside Act 1 (portada, briefing, agenda) are steps of the pinned act
    const act = window.__act && window.__act(), ACTSTEP = { s00: 0, s01: 1, s02: 2, s02a: 3 };
    if (act && id in ACTSTEP) {
      const step = ACTSTEP[id], y = scrollY, inAct = y >= act.st.start - 2 && y <= act.st.end + 2;
      if (inAct && Math.abs(step - act.at) <= 1) { act.go(step); return; }
      jumpTo(act.pos(step), el, act, step); return;
    }
    const a2 = window.__act2 && window.__act2();
    if (a2) { const ch = a2.chs.find(c2 => c2.id === id); if (ch) { jumpTo(a2.pos(ch.from), el, a2, ch.from); return; } }
    const st = ScrollTrigger.getById(id);
    const top = st ? st.start : (el.parentElement.classList.contains('pin-spacer') ? el.parentElement : el).getBoundingClientRect().top + scrollY;
    jumpTo(top, el);
  }));

  /* ---------- ink follows the page tone ---------- */
  const lum = (s) => { const m = s.match(/[\d.]+/g); let r, g, b; if (s.trim()[0] === '#') { const h = s.trim().slice(1); [r, g, b] = [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); } else if (m) [r, g, b] = m.map(Number); else return 0; const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const TONES = ['#001c3b', '#243a5e', '#3c5078', '#e4ebf4'];
  let chipTone = '';
  const ink = () => {
    const v = getComputedStyle(root).getPropertyValue('--c-bg'), L = lum(v);
    const mode = window.__inkForce || (L > .2 ? 'dark' : 'light'); if (root.dataset.ink !== mode) root.dataset.ink = mode;
    const t = TONES.reduce((best, x) => Math.abs(lum(x) - L) < Math.abs(lum(best) - L) ? x : best, TONES[0]);
    const pick = mode === 'dark' ? '#e4ebf4' : (t === '#e4ebf4' ? '#3c5078' : t);
    if (pick !== chipTone) { chipTone = pick; root.style.setProperty('--c-chip', pick); }
  };
  gsap.ticker.add(ink); ink();

  /* ---------- image viewers (04.03 Implementation): a thumb shows its picture in the main frame ---------- */
  document.querySelectorAll('[data-iv]').forEach(v => {
    const pics = v.querySelectorAll('.ivm img[data-vi]'), btns = v.querySelectorAll('.ivt button[data-vi]');
    btns.forEach(b => b.addEventListener('click', () => {
      pics.forEach(p => p.classList.toggle('on', p.dataset.vi === b.dataset.vi));
      btns.forEach(x => { const sel = x === b; x.classList.toggle('on', sel); x.setAttribute('aria-pressed', sel); });
    }));
  });

  /* ---------- credentials gallery: centred slides, arrows, drag, counter, caption ---------- */
  document.querySelectorAll('[data-a=gal]').forEach(g => {
    const t = g.querySelector('[data-gal-track]'), s = [...t.children], bar = g.parentElement.parentElement;
    const scope = g.closest('.stage-l, .stage-m') || bar;
    const cnt = scope.querySelector('[data-gal-cnt]'), cap = scope.querySelector('[data-gal-cap]'), pv = scope.querySelector('[data-gal-prev]'), nx = scope.querySelector('[data-gal-next]');
    const step = () => (s[1].offsetLeft - s[0].offsetLeft) || 1, idx = () => clamp(Math.round(t.scrollLeft / step()), 0, s.length - 1);
    let on = -1;
    const upd = () => { const i = idx(); if (i === on) return; on = i; s.forEach((li, j) => li.classList.toggle('on', j === i)); if (th.length) thMark(i); if (cnt) cnt.textContent = (i + 1) + ' / ' + s.length; if (cap) cap.textContent = s[i].querySelector('img').alt; if (pv) pv.disabled = i === 0; if (nx) nx.disabled = i === s.length - 1; };
    const to = (i) => t.scrollTo({ left: clamp(i, 0, s.length - 1) * step(), behavior: RMQ.matches ? 'auto' : 'smooth' });
    // film strip (laptop, 7 nov): a thumbnail per slide; the active one is marked and kept in view
    const th = $$('[data-gal-thumbs] button', scope);
    th.forEach((b, j) => b.addEventListener('click', () => to(j)));
    const thMark = (i) => { th.forEach((b, j) => b.classList.toggle('on', j === i)); const b = th[i], box = b && b.parentElement; if (b && box) box.scrollTo({ left: b.offsetLeft - (box.clientWidth - b.offsetWidth) / 2, behavior: RMQ.matches ? 'auto' : 'smooth' }); };
    pv && pv.addEventListener('click', () => to(idx() - 1)); nx && nx.addEventListener('click', () => to(idx() + 1));
    s.forEach((li, j) => li.addEventListener('click', () => { if (!moved && j !== idx()) to(j); }));
    t.addEventListener('scroll', () => requestAnimationFrame(upd), { passive: true });
    // mouse drag (touch and trackpads scroll natively)
    let x0 = null, l0 = 0, moved = false;
    t.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button) return; x0 = e.clientX; l0 = t.scrollLeft; moved = false; });
    addEventListener('pointermove', e => { if (x0 === null) return; const dx = e.clientX - x0; if (!moved && Math.abs(dx) > 4) { moved = true; t.classList.add('drag'); } if (moved) t.scrollLeft = l0 - dx; });
    addEventListener('pointerup', e => { if (x0 === null) return; const dx = e.clientX - x0; x0 = null; if (!moved) return; t.classList.remove('drag'); const base = Math.round(l0 / step()); to(Math.abs(dx) > 60 ? base + (dx < 0 ? 1 : -1) : Math.round(t.scrollLeft / step())); setTimeout(() => (moved = false), 0); });
    upd();
  });

  /* ---------- lightbox: every photo opens full size over the blurred page (6 nov) ---------- */
  (() => {
    const SEL = '#s00 [data-a^=ph], #s03c img[src*="mk-"], #s03c img[src*="dg-"], #s03c img[src*="plan-"], #s04a .ivm img, #s04a .ipk img, #s04a .mpk img, #s04a .imap img, #s04c .capp img, #s04b [data-a=pan] img, #s05 img[alt]:not([alt=""]), #s08 [data-gal-track] img';
    const box = document.createElement('div');
    box.id = 'lbx'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Enlarged image'); box.hidden = true;
    box.innerHTML = '<div class="lb-bg"></div><img class="lb-im" alt=""><p class="lb-cap"></p><button type="button" class="lb-x" aria-label="Close image">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></button>';
    document.body.appendChild(box);
    const bg = box.querySelector('.lb-bg'), im = box.querySelector('.lb-im'), cap = box.querySelector('.lb-cap'), x = box.querySelector('.lb-x');
    let src = null, busy = false, down = null;
    // stacked photos (the agenda window): the click goes to whichever one is showing
    const op = (n) => { let o = 1; for (let p = n; p && p.nodeType === 1; p = p.parentElement) o *= +getComputedStyle(p).opacity; return o; };
    const shown = (el) => { const sib = [...el.parentElement.children].filter(n => n.classList.contains('lb-t')); return sib.length > 1 ? sib.reduce((a, b) => (op(b) > op(a) ? b : a)) : el; };
    const ok = (el) => el && el.matches && el.matches(SEL) && !(el.closest('[data-gal-track] li') && !el.closest('li.on'));
    $$(SEL).forEach(el => { el.classList.add('lb-t'); if (!el.closest('button,a')) { el.tabIndex = 0; el.setAttribute('role', 'button'); el.setAttribute('aria-label', 'Enlarge image: ' + (el.alt || '')); } });
    const fit = () => {
      const m = innerWidth < 768 ? 16 : 56, capH = innerWidth < 768 ? 64 : 72, nw = im.naturalWidth || 1600, nh = im.naturalHeight || 900;
      const s = Math.min((innerWidth - m * 2) / nw, (innerHeight - m - capH) / nh, 1.6), w = nw * s, h = nh * s;
      return { w, h, l: (innerWidth - w) / 2, t: (m + innerHeight - capH - h) / 2 };
    };
    // v2.13: the enlarged photo grows from inside the clicked one (fitted, never cropped differently) and fades in
    const from = (r, f) => ({ x: r.left + r.width / 2 - (f.l + f.w / 2), y: r.top + r.height / 2 - (f.t + f.h / 2), scale: Math.min(r.width / f.w, r.height / f.h) });
    const open = (el) => {
      if (busy || window.__lbOpen) return;
      src = el; window.__lbOpen = true; busy = true;
      gsap.set(im, { opacity: 0 }); im.removeAttribute('src');
      im.src = el.currentSrc || el.src; im.alt = el.alt || ''; cap.textContent = el.alt || '';
      box.hidden = false; lenis && lenis.stop(); root.classList.add('lb-on');
      const go = () => {
        const f = fit(), r = el.getBoundingClientRect(), a = from(r, f);
        gsap.set(im, { left: f.l, top: f.t, width: f.w, height: f.h });
        const tl = gsap.timeline({ onComplete: () => { busy = false; x.focus({ preventScroll: true }); } });
        if (RMQ.matches) tl.fromTo([bg, im, cap, x], { opacity: 0 }, { opacity: 1, duration: .2 });
        else tl.fromTo(bg, { opacity: 0 }, { opacity: 1, duration: .5, ease: 'power2.out' }, 0)
          .fromTo(im, { ...a, opacity: 0 }, { x: 0, y: 0, scale: 1, duration: .65, ease: 'power3.inOut' }, 0)
          .to(im, { opacity: 1, duration: .3, ease: 'power1.out' }, 0)
          .fromTo([cap, x], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .45, ease: 'power2.out', stagger: .05 }, .45);
      };
      (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(go);
    };
    const close = () => {
      if (!window.__lbOpen || busy) return;
      busy = true;
      const done = () => { box.hidden = true; busy = false; window.__lbOpen = false; root.classList.remove('lb-on'); lenis && lenis.start(); gsap.set([im, cap, x, bg], { clearProps: 'transform,opacity' }); src && src.focus && src.focus({ preventScroll: true }); src = null; };
      if (RMQ.matches) { gsap.to(box.children, { opacity: 0, duration: .15, onComplete: done }); return; }
      const f = fit(), r = src.getBoundingClientRect(), vis = r.bottom > 0 && r.top < innerHeight && r.width > 2, a = from(r, f);
      gsap.timeline({ onComplete: done })
        .to([cap, x], { opacity: 0, duration: .2, ease: 'power2.in' }, 0)
        .to(im, vis ? { ...a, duration: .5, ease: 'power3.inOut' } : { scale: .96, duration: .35, ease: 'power2.in' }, 0)
        .to(im, { opacity: 0, duration: .3, ease: 'power1.in' }, vis ? .22 : 0)
        .to(bg, { opacity: 0, duration: .45, ease: 'power2.inOut' }, .1);
    };
    // a click only opens when the pointer did not drag (gallery, drum, credentials)
    addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; }, true);
    addEventListener('click', e => {
      let el = e.target.closest && (e.target.closest('.lb-t') || (e.target.closest('[data-gal-track] li') || {}).firstElementChild);
      if (!ok(el)) return;
      const vis = (n) => op(n) > .5 && getComputedStyle(n).visibility !== 'hidden';
      if (!vis(el)) { const hit = document.elementsFromPoint(e.clientX, e.clientY).map(n => n.closest && n.closest('.lb-t')).find(n => n && ok(n) && vis(n)); if (!hit) return; el = hit; }
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      e.preventDefault(); e.stopPropagation(); open(shown(el));
    }, true);
    addEventListener('keydown', e => {
      if (window.__lbOpen) {
        if (e.key === 'Escape') { e.preventDefault(); close(); }
        else if (e.key === 'Tab') { e.preventDefault(); x.focus(); }
        return;
      }
      const el = e.target;
      if ((e.key === 'Enter' || e.key === ' ') && el.classList && el.classList.contains('lb-t') && ok(el)) { e.preventDefault(); e.stopImmediatePropagation(); open(el); }
    }, true);
    bg.addEventListener('click', close); x.addEventListener('click', close); im.addEventListener('click', close);
    box.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    addEventListener('resize', () => { if (window.__lbOpen && !busy) { const f = fit(); gsap.set(im, { left: f.l, top: f.t, width: f.w, height: f.h }); } });
  })();

  if (location.hash === '#final' || /[?&]final\b/.test(location.search)) root.classList.add('final');
  addEventListener('load', () => ScrollTrigger.refresh());
  window.ST = ScrollTrigger;
  window.__lenis = lenis;
})();
