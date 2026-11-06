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
  const setCnt = (e, i, n) => { if (e.closest('.steps') || e.hasAttribute('data-pad')) e.innerHTML = `<b>${pad2(i + 1)}</b><span>/ ${pad2(n)}</span>`; else e.textContent = `${i + 1} de ${n}`; };
  const BG = { night: '#001c3b', navy: '#243a5e', sky: '#e4ebf4', dusk: '#3c5078' };
  const PROFILE = { act2: 'night', s00: 'night', s01: 'navy', s02a: 'sky', s02b: 'night', s03a: 'night', s03b: 'night', s03c: 'sky', s04a: 'sky', s04b: 'sky', s05: 'night', s06: 'night', s07: 'night', s08: 'night', s09: 'night' };
  // how present the vector field is behind each scene (content-heavy scenes keep it quieter)
  const FIELD = { s00: 1, s01: .85, s02a: .6, s02b: .5, s03a: .7, s03b: .8, s03c: .45, s04a: .45, s04b: .4, s05: .75, s06: .8, s07: .75, s08: .5, s09: .6 };
  const secs = $$('main > .sc, .ft');
  const RMQ = matchMedia('(prefers-reduced-motion: reduce)');
  ScrollTrigger.config({ ignoreMobileResize: true });

  function fit() { root.style.setProperty('--k', Math.max(Math.min(innerWidth / 1440, innerHeight / 800, 1.3), .5)); }
  fit();
  addEventListener('resize', fit);

  // 7 nov: each «Digital por defecto» caption sits 24 px under its own mockup (they have different heights)
  function capFit() {
    $$('#s03c .stage-l [data-a=mock]').forEach(m => {
      const c = m.firstElementChild && m.firstElementChild.firstElementChild, cap = m.lastElementChild;
      if (c && cap && c !== cap && c.offsetHeight) cap.style.top = (c.offsetTop + c.offsetHeight + 24) + 'px';
    });
  }
  capFit();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(capFit);
  addEventListener('load', capFit);

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
      const rgb = dark ? '0,32,91' : '201,211,227', A = (dark ? .11 : .14) * amt * (W < 768 ? .6 : 1);
      const st = (a) => (g.strokeStyle = `rgba(${rgb},${Math.max(0, Math.min(1, a)).toFixed(3)})`);
      const mob = W < 768;
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
  mm.add({ mob: '(max-width: 767px), (max-height: 560px)', lap: '(min-width: 768px) and (min-height: 561px) and (max-width: 1679px)', desk: '(min-width: 1680px) and (min-height: 561px)', short: '(max-height: 560px)', reduce: '(prefers-reduced-motion: reduce)' }, (ctx) => {
    const c = ctx.conditions, RM = c.reduce || c.short;
    const stageOf = (sec) => (sec.classList.contains('ft') ? sec : $(c.mob ? '.stage-m' : '.stage-l', sec));
    const k = () => (c.mob ? 1 : parseFloat(getComputedStyle(root).getPropertyValue('--k')) || 1);
    const steppers = [];
    const HANDLED = new Set();   // elements a scene animates itself (the generic reveal leaves them alone)
    const own = (els) => { (els && els.length !== undefined ? els : [els]).forEach(e => e && HANDLED.add(e)); return els; };
    // Act 2 (6 nov, Israel's sketches): on laptop the map, proposal, concept, digital, venue, plenary, social event,
    // crew and sustainability are layers of ONE pinned scene; each gesture plays one step or one hand-over, in time
    const A2IDS = ['s02b', 's03a', 's03b', 's03c', 's04a', 's04b', 's05', 's06', 's07'];
    const ACT2 = !c.mob && !RM && !!$('#s02b');
    const A2X = { loops: [] };
    let a2wrap = null;
    if (ACT2) {
      a2wrap = document.createElement('section');
      a2wrap.id = 'act2'; a2wrap.className = 'sc a2'; a2wrap.dataset.ch = $('#s02b').dataset.ch; a2wrap.dataset.th = 'night';
      a2wrap.setAttribute('aria-label', 'Conferencia, propuesta, implantación y equipo');
      $('#s02b').before(a2wrap);
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
      const hero = $('.lay-hero', S), brief = $('#s01', S), agL = $('#s02a', S);
      const land = $('.land', sec), holeP = $('#landholep'), lp = $('.lp', land), li = $('.li', land), scrim = $('.scrim', land);
      const kv = $('[data-a=kv]', S), ly = (q) => $$(`.kl[data-l=${q}] .ki`, kv), kl = (q) => $$(`.kl[data-l=${q}]`, kv);
      const days = $$('button[data-day]', agL), parts = $$('[data-part]', agL);
      const sh = $('[data-a=shutter]', agL), ph = $$('[data-a^=ph]', agL), rest = (+sh.dataset.rest || 36) + 'px';
      const win = sh.parentElement, frame = win.parentElement;

      /* hero intro, once, on load */
      const intro = gsap.timeline();
      if (RM) intro.from(hero, { opacity: 0, duration: .2 });
      else {
        intro.from(ly('rearL'), { xPercent: -70, opacity: 0, duration: 1.2, ease: 'expo.out' }, .05)
          .from(ly('rearR'), { xPercent: 70, opacity: 0, duration: 1.2, ease: 'expo.out' }, .05)
          .fromTo(ly('win'), { clipPath: 'inset(48% 48% 48% 48% round 14px)', scale: .86, opacity: 0 },
            { clipPath: 'inset(0% 0% 0% 0% round 0px)', scale: 1, opacity: 1, duration: 1.15, ease: 'expo.out', stagger: { each: .14, from: 'center' } }, .2)
          .fromTo($$('.pi', kv), { scale: 1.18, transformOrigin: '50% 50%' }, { scale: 1, duration: 1.6, ease: 'expo.out', stagger: .06 }, .2)
          .from(ly('c295'), { xPercent: -38, yPercent: 34, rotation: -5, opacity: 0, duration: 1.5, ease: 'power3.out' }, .55)
          .from(ly('cn235'), { xPercent: 55, yPercent: -40, rotation: 7, opacity: 0, duration: 1.35, ease: 'power3.out' }, .8)
          .from($$('[data-a=cl1],[data-a=cl2]', hero), { yPercent: 60, opacity: 0, duration: .8, stagger: .12, ease: 'power3.out' }, .7)
          .from($$('[data-a=badge]', hero), { scale: .8, rotation: -20, opacity: 0, duration: 1.1, ease: 'power3.out' }, 1)
          .from($$('[data-a=sub],[data-a=cta]', hero), { y: 16, opacity: 0, duration: .5, stagger: .1, ease: 'power3.out' }, 1.1);
        if ($('.kbar', hero)) intro.from($('.kbar', hero), { scaleX: 0, transformOrigin: '0% 50%', duration: .7, ease: 'power3.out' }, .95);
        if ($('.hatch27', hero)) intro.from($('.hatch27', hero), { clipPath: 'inset(0 100% 0 0)', duration: .9, ease: 'power2.out' }, 1);
        if (!c.mob && !CAP && matchMedia('(hover: hover) and (pointer: fine)').matches) {
          const qs = $$('.kp', kv).map(p => { const d = +p.parentElement.dataset.depth || .5; return [d, gsap.quickTo(p, 'x', { duration: .9, ease: 'power3.out' }), gsap.quickTo(p, 'y', { duration: .9, ease: 'power3.out' })]; });
          const qp = $$('.ph', kv).map(g => [gsap.quickTo(g, 'x', { duration: 1.1, ease: 'power3.out' }), gsap.quickTo(g, 'y', { duration: 1.1, ease: 'power3.out' })]);
          sec.addEventListener('pointermove', e => { const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
            qs.forEach(([d, qx, qy]) => { qx(-nx * 46 * d); qy(-ny * 26 * d); }); qp.forEach(([qx, qy]) => { qx(nx * 34); qy(ny * 18); }); });
          sec.addEventListener('pointerleave', () => { qs.forEach(([, qx, qy]) => { qx(0); qy(0); }); qp.forEach(([qx, qy]) => { qx(0); qy(0); }); });
        }
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
      const stamp = document.createElement('div'); stamp.className = 'stamp'; stamp.setAttribute('aria-hidden', 'true');
      const sid = 'stp' + (c.mob ? 'm' : 'l');
      // a real rubber stamp: worn ink (turbulence mask), double rim, text on the ring, big enough to run off the card's edge
      stamp.innerHTML = `<svg viewBox="0 0 200 200"><defs><path id="${sid}" d="M100 100 m-70 0 a70 70 0 1 1 140 0 a70 70 0 1 1 -140 0"/>
        <filter id="${sid}f" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="n"/>
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.7 1.5" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in" result="ink"/>
        <feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="1" seed="3" result="w"/><feDisplacementMap in="ink" in2="w" scale="2.2"/></filter></defs>
        <g filter="url(#${sid}f)" fill="none" stroke="currentColor">
        <circle cx="100" cy="100" r="94" stroke-width="5"/><circle cx="100" cy="100" r="86" stroke-width="1.6"/><circle cx="100" cy="100" r="55" stroke-width="2.2"/>
        <text font-size="15" font-weight="800" letter-spacing="3.6" fill="currentColor" stroke="none"><textPath href="#${sid}">SEVILLA · SVQ · CLEARED · LTA 2027 ·</textPath></text>
        <text x="100" y="92" text-anchor="middle" font-size="13" font-weight="700" letter-spacing="2" fill="currentColor" stroke="none">SAN PABLO</text>
        <text x="100" y="122" text-anchor="middle" font-size="31" font-weight="800" letter-spacing="1" fill="currentColor" stroke="none">2027</text>
        <path d="M58 132 H142" stroke-width="2"/><path d="M78 66 l22-6 22 6" stroke-width="2"/></g></svg>`;
      card.appendChild(stamp);
      pt.fromTo(stamp, { scale: 1.6, rotation: -30, opacity: 0 }, { scale: 1, rotation: -12, opacity: .7, duration: .26, ease: 'power4.in' }, 1.25)
        .fromTo(card, { x: 0 }, { x: 3, duration: .04, yoyo: true, repeat: 1 }, 1.47);
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

      /* agenda: the day list reflows smoothly (FLIP) and its sessions come in one after another */
      let ready = false, dayOn = 0, partOn = 0;
      // the open list changes by height: the old one folds while the new one unfolds, at the same time and with the same
      // curve, so the menu never jumps; its sessions then come in one by one
      const visL = () => $$('.sess', agL).filter(o => o.offsetParent !== null);
      const agSet = (d, p) => {
        const before = visL(), hb = before.map(o => o.offsetHeight);   // layout px (the stage and the act wrapper are scaled)
        dayOn = d; partOn = p;
        agL.dataset.dayOn = d; agL.dataset.partOn = p;
        days.forEach(x => x.setAttribute('aria-selected', +x.dataset.day === d));
        parts.forEach(t => t.setAttribute('aria-selected', +t.dataset.part === p));
        $$('[data-cnt]', agL).forEach(e => setCnt(e, p, 4));
        $$('.dots', agL).forEach(dd => $$('i', dd).forEach((dot, j) => dot.classList.toggle('on', j === p)));
        if (RM || CAP || !ready || getComputedStyle(agL).visibility === 'hidden') return;
        const after = visL(), E = 'power2.inOut', D = .65, PB = (o) => parseFloat(getComputedStyle(o).paddingBottom) || 0, BB = (o) => getComputedStyle(o).boxSizing === 'border-box';
        // the bottom padding folds with the list (it used to stay and jump at the end); a day change inside the same part
        // is one list growing or shrinking to the new height, never two lists folding against each other
        const same = (o) => after.find(x => x !== o && x.parentElement === o.parentElement);
        before.forEach((o, j) => {
          if (after.includes(o)) return;
          gsap.killTweensOf(o); gsap.killTweensOf($$('li', o));
          if (same(o)) { gsap.set(o, { clearProps: 'display,height,opacity,paddingBottom' }); return; }
          const pb = PB(o);
          gsap.fromTo(o, { display: 'block', height: hb[j] - (BB(o) ? 0 : pb), paddingBottom: pb, opacity: 1 }, { height: 0, paddingBottom: 0, opacity: 0, duration: D, ease: E, onComplete: () => gsap.set(o, { clearProps: 'display,height,opacity,paddingBottom' }) });
        });
        after.forEach(o => {
          if (before.includes(o)) return;
          gsap.killTweensOf(o);
          const pb = PB(o), bb = BB(o) ? 0 : pb, prev = before.find(x => x.parentElement === o.parentElement), h0 = prev ? hb[before.indexOf(prev)] - bb : 0;
          gsap.set(o, { height: 'auto', paddingBottom: pb }); const h1 = o.offsetHeight - bb;   // its natural height, measured once
          gsap.fromTo(o, { height: Math.max(0, h0), paddingBottom: prev ? pb : 0 }, { height: h1, paddingBottom: pb, duration: D, ease: E, onComplete: () => gsap.set(o, { clearProps: 'height,paddingBottom' }) });
          gsap.fromTo($$('li', o), { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: .5, stagger: .05, delay: prev ? .05 : .2, ease: 'power2.out', overwrite: 'auto' });
        });
      };
      agSet(0, 0);

      /* the landscape layer: it IS the central window, grown. At the hand-over the full photo is laid exactly where the
         window shows it and clipped to the window's frame; then frame and photo grow together to the full screen. */
      const P = { show: 0, reveal: 0, hole: 0, gone: 0, par: 0, flip: 0 };
      const win2 = kl('win')[1], w2svg = win2 && $('svg.ki', win2), w2pi = win2 && $('.pi', win2);
      const nums = (el, k) => (el.dataset[k] || '').split(' ').map(Number);
      const rr = (x, y, w, h, r) => `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
      const IA = 2400 / 1600, OVER = 1.12;  // photo aspect; the full-screen photo is a little larger than the screen, for parallax
      let from0 = null;  // frame + photo rects at the hand-over, measured once per pass (the KV may be drifting with the pointer)
      const measure = (lr) => {
        const fr = w2svg.getBoundingClientRect(), [vw] = nums(w2svg, 'vb'), [fx, fy, fw, fh] = nums(w2svg, 'full'), [ix, iy, iw] = nums(w2svg, 'img');
        const pr = w2pi.getBoundingClientRect(), su = pr.width / iw;
        return { fr: { l: fr.left - lr.left, t: fr.top - lr.top, r: lr.right - fr.right, b: lr.bottom - fr.bottom }, rad: (+w2svg.dataset.r || 0) * fr.width / vw,
                 img: { x: pr.left - lr.left + (fx - ix) * su, y: pr.top - lr.top + (fy - iy) * su, w: fw * su, h: fh * su } };
      };
      const cover = (lr) => { const w = Math.max(lr.width, lr.height * IA) * OVER, h = w / IA; return { x: (lr.width - w) / 2, y: (lr.height - h) / 2, w, h }; };
      const lerp = (a, b, t) => a + (b - a) * t;
      const render = () => {
        if (P.gone > .5 || P.show < .5) { land.style.visibility = 'hidden'; from0 = null; return; }
        land.style.visibility = 'visible';
        const lr = land.getBoundingClientRect(), cv = cover(lr), e = P.reveal;
        if (e < 1 && w2svg) {
          if (!from0 || e === 0) from0 = measure(lr);
          const f = from0, im = { x: lerp(f.img.x, cv.x, e), y: lerp(f.img.y, cv.y, e), w: lerp(f.img.w, cv.w, e), h: lerp(f.img.h, cv.h, e) };
          Object.assign(li.style, { left: im.x + 'px', top: im.y + 'px', width: im.w + 'px', height: im.h + 'px' });
          const k1 = 1 - e, rad = f.rad * (e < .85 ? 1 : (1 - e) / .15);
          land.style.clipPath = `inset(${(f.fr.t * k1).toFixed(2)}px ${(f.fr.r * k1).toFixed(2)}px ${(f.fr.b * k1).toFixed(2)}px ${(f.fr.l * k1).toFixed(2)}px round ${rad.toFixed(2)}px)`;
        } else {
          Object.assign(li.style, { left: cv.x + 'px', top: cv.y + 'px', width: cv.w + 'px', height: cv.h + 'px' });
          land.style.clipPath = 'none';
        }
        // parallax of the landscape through the act: it drifts up as you go deeper
        li.style.transform = `translate3d(0, ${(-P.par * (cv.h - lr.height) * .45).toFixed(1)}px, 0)`;
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
        // landscape phones: the act is laid out as a column, no pin, the agenda changes part by part with its buttons
        gsap.set([brief, agL], { autoAlpha: 1 }); pt.progress(1);
        ready = true;
        const go = (d, p) => { agSet(d, p); ph.forEach((im, j) => (im.style.opacity = j === p ? 1 : 0)); };
        parts.forEach(t => t.addEventListener('click', () => go(dayOn, +t.dataset.part)));
        days.forEach(t => t.addEventListener('click', () => go(+t.dataset.day, partOn)));
        $$('[data-next]', agL).forEach(b => b.addEventListener('click', () => go(dayOn, (partOn + 1) % 4)));
        $$('[data-prev]', agL).forEach(b => b.addEventListener('click', () => go(dayOn, (partOn + 3) % 4)));
      } else {
        const n = 15, T1 = 3.75, AG = T1 + 2.1, STEP = 1.05;
        const marks = [0, T1]; for (let kx = 0; kx < 12; kx++) marks.push(AG + kx * STEP); marks.push(AG + 11 * STEP + 2.0);
        const tl = gsap.timeline({ paused: true, onUpdate: render });
        const heroTxt0 = $$('.ktt, .kbar, .sig, .hatch27, .lay-hero [data-a=cta]', S).filter(e => hero.contains(e));
        const heroTxt = heroTxt0.filter(e => !heroTxt0.some(o => o !== e && o.contains(e)));  // never animate a child and its parent
        const briefT = $('[data-a=t]', brief), op = $('[data-a=op]', brief), bsub = $('[data-a=sub]', brief);
        const wrapL = c.mob ? agL : (agL.querySelector(':scope > div') || agL);
        const agKids = Array.from(wrapL.children).filter(e => !['STYLE', 'SCRIPT'].includes(e.tagName)).concat(c.mob ? [] : $$(':scope > .steps', agL));
        gsap.set([brief, agL], { autoAlpha: 0 });
        gsap.set([pass, briefT].filter(Boolean), { autoAlpha: 0 });
        // 0 → 1: the KV opens up around its central window; the window, frame and photo, grows to the whole screen
        tl.fromTo(heroTxt, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: 30, duration: .45, stagger: .03, ease: 'power2.in', immediateRender: false }, 0)
          .to($$('.glow', hero), { autoAlpha: 0, duration: .3, ease: 'none' }, 0)
          .to(kl('c295'), { xPercent: 45, yPercent: -70, autoAlpha: 0, duration: 1.1, ease: 'power2.in' }, .05)
          .to(kl('cn235'), { xPercent: 80, yPercent: 60, autoAlpha: 0, duration: 1, ease: 'power2.in' }, .05)
          .to(kl('rearL'), { xPercent: -90, autoAlpha: 0, duration: .9, ease: 'power2.in' }, .05)
          .to(kl('rearR'), { xPercent: 90, autoAlpha: 0, duration: .9, ease: 'power2.in' }, .05)
          .to(kl('win')[0], { xPercent: -70, autoAlpha: 0, duration: .9, ease: 'power2.in' }, .1)
          .to(kl('win')[2], { xPercent: 70, autoAlpha: 0, duration: .9, ease: 'power2.in' }, .1)
          // hand-over: the landscape takes the window's place pixel for pixel, the window itself is no longer needed
          .to(P, { show: 1, duration: .001 }, .3)
          .set(win2, { autoAlpha: 0 }, .302)
          .to(P, { reveal: 1, duration: 1.9, ease: 'power2.inOut' }, .32)
          .to(scrim, { opacity: 1, duration: 1.2, ease: 'power1.inOut' }, 1)
          .set(hero, { autoAlpha: 0 }, 2.25)
          // the boarding pass arrives on its own once the landscape is there
          .set(brief, { autoAlpha: 1 }, 1.95)
          .fromTo(briefT, { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .5, ease: 'power2.out', immediateRender: false }, 2.0)
          .add(pt, 2.1);
        // the landscape drifts a little at every step (parallax through the act)
        tl.fromTo(P, { par: 0 }, { par: 1, duration: marks[13] - 2.25, ease: 'none', immediateRender: false }, 2.25);
        // 1 → 2: the pass turns on itself, inwards; when it is edge-on the window takes over and finishes the turn,
        // and the menus come in at its sides
        const fr0 = frame.getBoundingClientRect(), fcx = fr0.left + fr0.width / 2, fcy = fr0.top + fr0.height / 2;
        const menus = agKids.filter(e => !e.contains(frame));
        const side = (e) => { const r = e.getBoundingClientRect(); return c.mob ? { y: (r.top + r.height / 2 < fcy ? -1 : 1) * 30 } : { x: (r.left + r.width / 2 < fcx ? -1 : 1) * 60 }; };
        gsap.set(pass, { transformPerspective: 1500 });
        gsap.set(frame, { transformPerspective: 1500 });
        tl.to(P, { flip: 1, duration: .001 }, T1)
          .to([briefT, bsub].filter(Boolean), { y: -24, autoAlpha: 0, duration: .45, ease: 'power2.in' }, T1)
          .fromTo(pass, { rotationY: 0, rotationX: 0 }, { rotationY: 90, rotationX: 0, duration: .75, ease: 'power2.in', immediateRender: false }, T1 + .05)
          .set(agKids, { autoAlpha: 0 }, T1 + .79)
          .set(agL, { autoAlpha: 1 }, T1 + .8)
          .set(brief, { autoAlpha: 0 }, T1 + .8)
          .fromTo(frame, { rotationY: -90, autoAlpha: 1 }, { rotationY: 0, autoAlpha: 1, duration: .85, ease: 'power2.out', immediateRender: false }, T1 + .8);
        if (c.mob) tl.fromTo(agKids.filter(e => e.contains(frame)), { autoAlpha: 0 }, { autoAlpha: 1, duration: .01, immediateRender: false }, T1 + .8);
        menus.forEach((e, j) => tl.fromTo(e, { ...side(e), autoAlpha: 0 }, { x: 0, y: 0, autoAlpha: 1, duration: .8, ease: 'power3.out', immediateRender: false }, T1 + 1.0 + j * .07));
        tl.to(P, { flip: 0, duration: .001 }, T1 + 1.7);
        // 2 … 13: twelve states, each one blind down, view changes, blind up
        for (let kx = 0; kx < 11; kx++) {
          const t = AG + kx * STEP, p0 = kx % 4, p1 = (kx + 1) % 4;
          tl.to(sh, { height: '100%', duration: .46, ease: 'power2.inOut' }, t)
            .to(ph[p0], { opacity: 0, duration: .14, ease: 'none' }, t + .36)
            .fromTo(ph[p1], { opacity: 0, scale: 1.14 }, { opacity: 1, scale: 1, duration: .62, ease: 'power2.out', immediateRender: false }, t + .38)
            .to(sh, { height: rest, duration: .52, ease: 'power3.inOut' }, t + .48);
        }
        // 13 → 14: blind down, the window now opens on the blue field, the window grows until the field is all there is
        const tE = marks[13];
        tl.to(sh, { height: '100%', duration: .45, ease: 'power2.inOut' }, tE)
          .to(menus, { autoAlpha: 0, y: -20, duration: .36, stagger: .015, ease: 'power2.in' }, tE + .05)  // done before tE+.46 (see «Continuar»)
          .set(ph, { opacity: 0 }, tE + .46)
          .set(win, { backgroundColor: 'rgba(0,0,0,0)', boxShadow: 'none' }, tE + .46)
          // the bezel stays as a ring (inset shadow as wide as the padding), the inside of the frame becomes a hole
          .set(frame, { backgroundColor: 'rgba(0,0,0,0)', boxShadow: () => `0 0 0 1px rgba(0,32,91,.25), inset 0 0 0 ${parseFloat(getComputedStyle(frame).paddingTop) || 16}px #ffffff` }, tE + .46)
          .to(P, { hole: 1, duration: .01 }, tE + .46)
          .to(sh, { height: '0%', duration: .5, ease: 'power2.inOut' }, tE + .5)
          .to(frame, { scale: c.mob ? 9 : 7, duration: .95, ease: 'power3.in' }, tE + 1.0)
          .to(P, { gone: 1, duration: .01 }, marks[14] - .02)
          .set(agL, { autoAlpha: 0 }, marks[14] - .01);
        if (tl.duration() < marks[14]) tl.set({}, {}, marks[14]);

        let cur = -1;
        const CH = (i) => (i === 0 ? 'Portada' : i === 1 ? 'Briefing' : 'Conference');
        const mark = (i) => {
          if (i === cur) return; cur = i;
          const kx = Math.max(0, Math.min(11, i - 2));
          agSet(Math.floor(kx / 4), kx % 4);
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
        const AG0 = 2, AG1 = 13;
        const mapEl = $('#s02b');
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
          const parTo = clamp((marks[i] - 2.25) / (marks[13] - 2.25), 0, 1);
          if (parTw) parTw.kill();
          parTw = gsap.to(P, { par: parTo, duration: 1.1, ease: 'power2.inOut', onUpdate: render });
          o.tw = gsap.timeline({ onComplete: fin })
            .to(sh, { height: '100%', duration: .45, ease: 'power2.inOut' })
            .add(() => { const pv = P.par; tl.time(marks[i]); P.par = pv; render(); gsap.set(sh, { height: '100%' }); gsap.fromTo(ph[(i - AG0) % 4], { scale: 1.14 }, { scale: 1, duration: .7, ease: 'power2.out' }); })
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
        parts.forEach(t => t.addEventListener('click', () => o.go(2 + dayOn * 4 + +t.dataset.part)));
        days.forEach(t => t.addEventListener('click', () => o.go(2 + +t.dataset.day * 4 + partOn)));
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


    /* ---------- 02 Location ---------- */
    try {
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
          gsap.set([...wp.slice(1), ...wpl.slice(1)], { opacity: 0 });
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

    /* ---------- 03 Claim (free scroll, scrubbed) ---------- */
    if (!ACT2) try {
      const sec = $('#s03b'), S = stageOf(sec);
      const win = $('[data-a=cwin]', S), cin = $('[data-a=cin]', S), cout = $('[data-a=cout]', S);
      own([win, cout]);
      const sync = () => { const a = cout.getBoundingClientRect(), b = win.getBoundingClientRect(), kk = k(); cin.style.left = (a.left - b.left) / kk + 'px'; cin.style.top = (a.top - b.top) / kk + 'px'; };
      const strip = $('.strip', win), pl = $('.cplane', S);
      if (pl) own([pl]);
      // played once when the scene arrives, never scrubbed backwards (6 nov): the window opens, the claim slides in,
      // the C295 flies in and settles breaking the frame; it re-arms only when the scene is entirely below the screen
      enter(sec, (tl) => {
        const from = JSON.parse(win.dataset.from), to = JSON.parse(win.dataset.to), dx = +(cout.dataset.dx || 0);
        if (RM) { tl.set(win, to).set(cout, { x: 0 }).add(sync); return; }
        tl.fromTo(win, from, { ...to, duration: 1.5, ease: 'power3.inOut', onUpdate: sync, immediateRender: true }, 0)
          .fromTo(cout, { x: dx }, { x: 0, duration: 1.5, ease: 'power3.inOut', onUpdate: sync, immediateRender: true }, 0);
        if (pl) tl.fromTo(pl, { x: c.mob ? 260 : 520, y: c.mob ? 60 : 140, rotation: -7, opacity: 0 }, { x: 0, y: 0, rotation: 0, opacity: 1, duration: 2.2, ease: 'power2.out', immediateRender: true }, .5);
      }, 'top 72%');
      sync(); addEventListener('resize', sync);
      // the landscape drifts through the glass with the scroll (a parallax, not an animation that plays back)
      if (!RM && strip) gsap.fromTo(strip, { yPercent: 9, scale: 1.08 }, { yPercent: -9, scale: 1, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: SCRUB } });
    } catch (err) { console.warn('03 Claim', err); }

    /* ---------- 03 Digital (pinned, 6 pieces) ---------- */
    if (!ACT2) try {
      // entrance: the board is switched on row by row, the first piece flips in, the first mockup rises into place
      enter($('#s03c'), (tl, S) => {
        const brd = $('.dboard', S) || $$('[data-a=brow]', S)[0]?.closest('div');
        const rows = $$('[data-a=brow]', S), m0 = $$('[data-a=mock]', S).find(m => m.dataset.k === '0'), cells0 = rows[0] ? $$('[data-a=cell]', rows[0]) : [];
        const head = $$('.dcol > h2, .dcol > p', S);
        own([brd, m0, ...head].filter(Boolean));
        if (RM) { tl.from([brd, m0, ...head].filter(Boolean), { opacity: 0, duration: .2 }); return; }
        if (has(head)) tl.from(head, { y: 30, opacity: 0, duration: .9, stagger: .1, ease: 'power3.out' }, 0);
        if (brd) tl.fromTo(brd, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'power2.inOut' }, .2);
        if (has(rows)) tl.from(rows, { opacity: 0, x: -18, duration: .6, stagger: .07, ease: 'power3.out' }, .5);
        if (has(cells0)) tl.fromTo(cells0, { rotationX: -90, opacity: .2 }, { rotationX: 0, opacity: 1, duration: .45, stagger: { amount: .35 }, ease: 'power3.out', immediateRender: false }, .95);
        if (m0) tl.from(m0, { y: 60, scale: .94, opacity: 0, transformOrigin: '50% 60%', duration: 1.1, ease: 'power3.out' }, .45);
      }, 'top 70%');
      stepper($('#s03c'), 6, (tl, S) => {
        const mocks = $$('[data-a=mock]', S), rows = $$('[data-a=brow]', S);
        const ON = { background: '#243a5e', boxShadow: 'inset 4px 0 0 #9fd0ff' }, OFF = { background: 'rgba(0,0,0,0)', boxShadow: 'inset 0 0 0 #9fd0ff' };
        gsap.set(rows[0], ON);
        if (RM) { for (let i = 0; i < 5; i++) tl.set(mocks[i], { opacity: 0 }, i + .5).set(mocks[i + 1], { opacity: 1 }, i + .5).set(rows[i], OFF, i + .5).set(rows[i + 1], ON, i + .5); return; }
        rows.forEach((r, i) => { if (i) gsap.set($$('[data-a=cell]', r), { opacity: .35, color: 'rgba(255,255,255,0)' }); });
        for (let i = 0; i < 5; i++) {
          tl.to(mocks[i], { y: -30, opacity: 0, duration: .5, ease: 'power2.inOut' }, i)
            .fromTo(mocks[i + 1], { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: .5, ease: 'power3.out', immediateRender: false }, i + .3)
            .fromTo($$('[data-a=cell]', rows[i + 1]), { rotationX: -90 }, { opacity: 1, rotationX: 0, color: '#ffffff', duration: .4, stagger: { amount: .25 }, ease: 'power3.out', immediateRender: false }, i + .3)
            .to(rows[i], { ...OFF, duration: .1 }, i + .35)
            .to(rows[i + 1], { ...ON, duration: .1 }, i + .4);
        }
        return () => [mocks[0] && mocks[0].parentElement, rows[0] && rows[0].parentElement];
      }, null, 50, 1.1);
    } catch (err) { console.warn('03 Digital', err); }

    /* ---------- 04 Plano (pinned, 4 stops) ---------- */
    if (!ACT2) try {
      const pl = stepper($('#s04a'), 4, (tl, S) => {
        const r = $('[data-a=iroute]', S), cards = $$('[data-a=scard]', S), F = r.dataset.f.split(',').map(Number);
        for (let i = 0; i < 3; i++) {
          tl.to(r, { attr: { 'stroke-dashoffset': 1 - F[i + 1] }, duration: .95, ease: 'sine.inOut' }, i)
            .to(cards[i], { opacity: 0, y: -12, duration: .45, ease: 'power2.inOut' }, i + .2).fromTo(cards[i + 1], { y: 16 }, { opacity: 1, y: 0, duration: .55, ease: 'power3.out', immediateRender: false }, i + .4);
        }
      }, (i, S) => $$('[data-a=ipin]', S).forEach((p, j) => p.classList.toggle('on', j === i)), 50, 1.1);
      if (pl.o) pl.o.jump = (from, to) => {
        const r = $('[data-a=iroute]', pl.S), cards = $$('[data-a=scard]', pl.S), F = r.dataset.f.split(',').map(Number);
        return gsap.timeline()
          .to(r, { attr: { 'stroke-dashoffset': 1 - F[to] }, duration: 1, ease: 'sine.inOut' }, 0)
          .to(cards[from], { opacity: 0, y: -12, duration: .4, ease: 'power2.in' }, 0)
          .set(cards.filter((_, j) => j !== to), { opacity: 0 }, .4)
          .fromTo(cards[to], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .6, ease: 'power3.out' }, .4);
      };
      $$('[data-a=ipin]', pl.S).forEach(p => p.addEventListener('click', () => pl.go(+p.dataset.k)));
    } catch (err) { console.warn('04 Plano', err); }

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
      if (!ACT2) enter(sec, (tl, S) => {
        const nap = own($('[data-a=napkin]', S)), posts = own($$('[data-a=post]', S));
        if (RM) { tl.from([nap, ...posts, fA, fB].filter(Boolean), { opacity: 0, duration: .2 }); return; }
        // the friezes are drawn along their length, from opposite sides, like ribbons being laid on the table
        tl.fromTo(fA, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'power2.inOut' }, 0)
          .fromTo(fB, { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'power2.inOut' }, .15)
          ;
        // stickers: each card is laid from one corner to the opposite one, along the diagonal, and settles flat
        const peel = (el, corner, at, d = 1.1) => {
          const T = 320, C = { tl: [0, 0, 1, 1], tr: [100, 0, -1, 1], bl: [0, 100, 1, -1], br: [100, 100, -1, -1] }[corner];
          const [x, y, sx, sy] = C, poly = (t) => `polygon(${x}% ${y}%, ${x + sx * t}% ${y}%, ${x}% ${y + sy * t}%)`;
          const r0 = +gsap.getProperty(el, 'rotation') || 0;
          tl.fromTo(el, { clipPath: poly(0), rotation: r0 + sx * sy * 3, scale: 1.04 }, { clipPath: poly(T), rotation: r0, scale: 1, duration: d, ease: 'power2.inOut', immediateRender: true }, at)
            .set(el, { clearProps: 'clipPath' }, at + d);
        };
        peel(nap, 'tl', .3, 1.25);
        posts.forEach((p, i) => {
          const r = p.getBoundingClientRect(), left = r.left + r.width / 2 < innerWidth / 2, top = r.top + r.height / 2 < (S.getBoundingClientRect().top + S.getBoundingClientRect().height / 2);
          peel(p, (top ? 't' : 'b') + (left ? 'l' : 'r'), .75 + i * .16, 1);
        });
      }, 'top 62%');
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
        if (!ACT2) $$('[data-a=post]', S).forEach((p, i) => gsap.to(p.firstElementChild, { y: [-14, 10, -8, 12][i % 4], ease: 'none', scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom top', scrub: SCRUB } }));
      }
    } catch (err) { console.warn('05 Social event', err); }

    /* ---------- 06 Organigrama ---------- */
    try {
      const sec = $('#s06'), S = stageOf(sec);
      const cards = own($$('[data-a=tcard]', S)), hs = own($$('[data-a=hs]', S));
      own($$('.crewbg, .tlist, .cslot, svg.dr', S));
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
        tl
          .from($$('.pin[data-a=hs]', S), { scale: .7, opacity: 0, duration: .7, stagger: .1, ease: 'power3.out' }, 1.1)
          .add(() => { shown = true; drawLine(cur, 1); }, 1.5);
        if (CAP) { shown = true; const l = lineOf(cur); if (l) gsap.set(l, { opacity: 1, attr: { 'stroke-dashoffset': 0 } }); }
        if (has($$('.tlist .tab', S))) tl.from($$('.tlist .tab', S), { y: 16, opacity: 0, duration: .6, stagger: .07, ease: 'power3.out' }, 1.2);
        if (has($$('.cslot', S))) tl.from($$('.cslot', S), { y: 30, opacity: 0, duration: .8, ease: 'power3.out' }, 1.4);
        else if (has($$('[data-stack]', S))) tl.from($$('[data-stack]', S), { y: 30, opacity: 0, duration: .8, ease: 'power3.out' }, 1.2);
        if (has($$('button.tab:not(.tl)[data-a=hs]', S))) tl.from($$('button.tab:not(.tl)[data-a=hs]', S), { y: 20, opacity: 0, duration: .6, stagger: .06, ease: 'power3.out' }, .8);
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
      tl.fromTo = (tg, from, to, at) => { if (tg !== root) gsap.set(tg, from); return _ft(tg, from, to, at); };
      const marks = [], CHS = [];
      const chap = (id, steps) => CHS.push({ id, from: marks.length - 1, steps });  // called right after the chapter's first mark
      const layer = (id, on, at) => tl.set(Ly(id), { autoAlpha: on ? 1 : 0 }, at);
      gsap.set(A2IDS.map(Ly), { autoAlpha: 0 });
      const IMM = { immediateRender: false };
      const len1 = (els) => els.forEach(e => e.setAttribute('pathLength', 1));

      /* ---- 0 · map: the city is drawn ---- */
      const mS = Sg('s02b');
      const osm = $$('svg.osm path', mS), fills = osm.filter(p => p.getAttribute('fill') !== 'none'), strokes = osm.filter(p => p.getAttribute('fill') === 'none').reverse();
      const D = 1800;
      osm.forEach(p => { const da = p.getAttribute('stroke-dasharray'); if (da) p.dataset.da = da; });
      const mRoute = $$('[data-a=route]', mS), mPins = $$('[data-a=lpin]', mS), mLab = $$('.mview [data-ax]:not([data-a=lpin])', mS);
      const mCol = $('.tcol', mS), mBits = $$('.mfr, .mzc, figure, .osmc', mS);
      layer('s02b', 1, 0);
      tl.fromTo(fills, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power1.inOut', ...IMM }, 0);
      const sDraw = strokes.filter(p => !p.dataset.da), sFade = strokes.filter(p => p.dataset.da);
      len1(sDraw);
      sDraw.forEach((p, i) => tl.fromTo(p, { attr: { 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: 2.0, ease: 'power2.inOut', ...IMM }, .1 + i * .1));
      tl.fromTo(sFade, { opacity: 0 }, { opacity: 1, duration: 1, ...IMM }, .8);
      tl.fromTo(mRoute, { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: 1.1, ...IMM }, 1.3)
        .fromTo(mPins, { scale: .8, opacity: 0 }, { scale: 1, opacity: 1, duration: .7, stagger: .12, ...IMM }, 1.5)
        .fromTo(mLab, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .7, stagger: .06, ...IMM }, 1.8)
        .fromTo(mCol ? Array.from(mCol.children) : [], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .9, stagger: .08, ...IMM }, .2)
        .fromTo(mBits, { opacity: 0 }, { opacity: 1, duration: .8, stagger: .08, ease: 'power1.inOut', ...IMM }, 1.2);
      marks.push(2.8); chap('s02b', 1);

      /* ---- 0 → 1 · the map is undrawn, the compass is drawn clockwise across the screen ---- */
      const kS = Sg('s03a'), nd = $('svg.nd', kS), dialBox = $('.dial > div', kS);
      const seg = $$('[data-a=seg]', kS), wp = $$('[data-a=wp]', kS), ring = $('[data-a=ring]', kS), wpl = $$('[data-a=wpl]', nd), ktxt = $$('text', nd).filter(e => !wpl.includes(e));
      const kshapes = $$('line, circle, path, polyline, rect', nd).filter(e => !e.matches('[data-a=seg], [data-a=wp], [data-a=ring]'));
      const kdash = kshapes.filter(e => { const da = e.getAttribute('stroke-dasharray'); return da && da !== '1'; }), kdraw = kshapes.filter(e => !kdash.includes(e));
      len1(kdraw);
      const cx = (e) => { const b = e.getBBox(); return b.x + b.width / 2; };
      kdraw.sort((a, b) => cx(a) - cx(b)); ktxt.sort((a, b) => cx(a) - cx(b));
      const kbox = $('.kbox', kS), kcards = $$('[data-a=kcard]', kS).sort((x, y) => x.dataset.k - y.dataset.k);
      const kh = kcards.map(cd => cd.offsetHeight);
      const khead = $$('h2, p.cap', kS).filter(e => !kbox.contains(e));
      gsap.set(kbox, { height: kh[0] + 54, overflow: 'hidden' });
      gsap.set(kcards.slice(1), { autoAlpha: 0 });
      gsap.set(seg.slice(1), { attr: { 'stroke-dashoffset': 1 } });
      let t = marks[0];
      tl.to(sDraw.slice().reverse(), { attr: { 'stroke-dashoffset': -1 }, duration: 1.0, stagger: { amount: .5 }, ease: 'power2.inOut' }, t)
        .to(sFade, { opacity: 0, duration: .6, ease: 'sine.inOut' }, t)
        .to(fills, { opacity: 0, duration: .9, ease: 'sine.inOut' }, t + .2)
        .to([...mRoute, ...mPins, ...mLab, ...mBits], { opacity: 0, duration: .6 }, t)
        .to(mCol ? Array.from(mCol.children) : [], { opacity: 0, y: -12, duration: .6, stagger: .05 }, t);
      layer('s03a', 1, t + .7); layer('s02b', 0, t + 1.6);
      tl.fromTo(kdraw, { attr: { 'stroke-dasharray': 1, 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: 1.5, stagger: { amount: 1.2 }, ease: 'sine.inOut', ...IMM }, t + .7)
        .fromTo(ktxt, { opacity: 0 }, { opacity: 1, duration: .6, stagger: { amount: 1.1 }, ease: 'sine.inOut', ...IMM }, t + 1.1)
        .fromTo(kdash, { opacity: 0 }, { opacity: 1, duration: .9, ease: 'sine.inOut', ...IMM }, t + 1.6)
        .fromTo(dialBox, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: .7, ...IMM }, t + 1.6)
        .fromTo(seg[0], { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: 1.0, ease: 'sine.inOut', ...IMM }, t + 2.0)
        // 7 nov: only the departure (CONT) is on the dial at first; IDEA, DIGI and GIFT appear as their legs arrive
        .fromTo([wp[0], ring], { opacity: 0, scale: .6, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: .7, stagger: .1, ...IMM }, t + 2.1)
        .fromTo(wpl[0], { opacity: 0 }, { opacity: 1, duration: .6, ...IMM }, t + 2.3)
        .fromTo(khead, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .8, stagger: .08, ...IMM }, t + 1.0)
        .fromTo(kbox, { opacity: 0, x: -40, clipPath: 'inset(0% 0% 0% 0%)' }, { opacity: 1, x: 0, duration: 1.0, ease: 'power3.inOut', ...IMM }, t + 1.5);
      t += 3.1; marks.push(t); chap('s03a', 4);
      for (let i = 0; i < 3; i++) {
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

      /* ---- 4 → 5 · the compass is undrawn and the card closes; a rhombus rises from below the screen to its height
              and turns into the concept window ---- */
      const cS = Sg('s03b'), cz = $('.cz', cS), win = $('[data-a=cwin]', cS), cin = $('[data-a=cin]', cS), cout = $('[data-a=cout]', cS);
      const strip = $('.strip', win), cpl = $('.cplane', cS), cps = $$(':scope > p:not([data-a])', cz);
      // the inner copy follows the outer one; the scale is measured on the window itself, so it holds while the scene shrinks
      const sync = () => { const a = cout.getBoundingClientRect(), b = win.getBoundingClientRect(), kk = (b.width / (win.offsetWidth || 1)) || k(); cin.style.left = (a.left - b.left) / kk + 'px'; cin.style.top = (a.top - b.top) / kk + 'px'; };
      const to = JSON.parse(win.dataset.to), wcx = to.left + to.width / 2, wcy = to.top + to.height / 2, dx = +(cout.dataset.dx || 0);
      tl.to(kdraw.slice().reverse(), { attr: { 'stroke-dashoffset': 1 }, duration: 1.0, stagger: { amount: .7 }, ease: 'sine.inOut' }, t)
        .to([...kdash, ...ktxt, ...seg, ...wp, ...wpl, ring, dialBox], { opacity: 0, duration: .7 }, t + .1)
        .to(kbox, { clipPath: 'inset(0% 0% 100% 0%)', duration: .8, ease: 'power3.inOut' }, t)
        .to(khead, { opacity: 0, y: -12, duration: .6 }, t + .1);
      layer('s03b', 1, t + .9); layer('s03a', 0, t + 1.8);
      tl.fromTo(win, { left: wcx - 70, top: 840, width: 140, height: 140, borderRadius: 26, rotation: 45, opacity: 1 },
        { top: wcy - 70, rotation: 22, duration: 1.2, ease: 'power2.inOut', ...IMM }, t + .9)
        .to(win, { ...to, rotation: 0, duration: 1.4, ease: 'power3.inOut', onUpdate: sync }, t + 1.95)
        .fromTo(strip, { yPercent: 14, scale: 1.14 }, { yPercent: 0, scale: 1, duration: 2.6, ease: 'sine.inOut', ...IMM }, t + .9)
        .fromTo(cin, { opacity: 0 }, { opacity: 1, duration: .5, ...IMM }, t + 3.0)
        .fromTo(cout, { x: dx * .35, opacity: 0 }, { x: 0, opacity: 1, duration: 1.3, onUpdate: sync, ...IMM }, t + 2.3)
        .fromTo(cps, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .8, stagger: .1, ...IMM }, t + 3.0);
      if (cpl) tl.fromTo(cpl, { x: 520, y: 140, rotation: -7, opacity: 0 }, { x: 0, y: 0, rotation: 0, opacity: 1, duration: 1.8, ...IMM }, t + 2.6);
      t += 4.4; marks.push(t); chap('s03b', 1);

      /* ---- 5 → 6 · the concept screen becomes the picture of the mail banner: it gets its night backdrop (invisible
              on the night page), shrinks and rounds while the page turns to day, and lands on the banner's picture; the
              white card of the banner then appears around it ---- */
      const dS = Sg('s03c'), mocks = $$('[data-a=mock]', dS), rows = $$('[data-a=brow]', dS);
      const brd = $('.dboard', dS) || (rows[0] && rows[0].closest('ol').parentElement), dhead = $$('.dcol > h2, .dcol > p', dS);
      const m0card = mocks[0].firstElementChild.firstElementChild;
      const pic = $$('div', m0card).find(d => d.style.height === '187px') || m0card;
      const sr = dS.getBoundingClientRect(), mr = pic.getBoundingClientRect(), kk0 = sr.width / 1440;
      const B = { x: (mr.left - sr.left) / kk0, y: (mr.top - sr.top) / kk0, w: mr.width / kk0, h: mr.height / kk0 };
      const sc = B.w / 1440, crop = Math.max(0, (800 - B.h / sc) / 2);
      const ON = { background: '#243a5e', boxShadow: 'inset 4px 0 0 #9fd0ff' }, OFF = { background: 'rgba(0,0,0,0)', boxShadow: 'inset 0 0 0 #9fd0ff' };
      gsap.set(rows[0], ON); rows.forEach((r, i) => { if (i) gsap.set($$('[data-a=cell]', r), { opacity: .35, color: 'rgba(255,255,255,0)' }); });
      gsap.set(mocks.slice(1), { opacity: 0 });
      const czL = Ly('s03b');
      // 7 nov: the banner keeps the horizon and the road. The scene carries its own copy of the field (same flight,
      // same moment), which takes over from the page's as the backdrop turns opaque, and keeps flying inside the banner
      const czc = document.createElement('canvas'), CR = Math.min(2, devicePixelRatio || 1);
      czc.className = 'czf'; czc.setAttribute('aria-hidden', 'true'); czc.width = 1440 * CR; czc.height = 800 * CR;
      Object.assign(czc.style, { position: 'absolute', left: 0, top: 0, width: '1440px', height: '800px', opacity: 0, pointerEvents: 'none' });
      cz.prepend(czc);
      const czg = czc.getContext('2d');
      gsap.ticker.add(() => { if (+czc.style.opacity > 0 && czL.style.visibility !== 'hidden' && window.__field) window.__field.paint(czg, 1440, 800, CR, false, FIELD.s03b); });
      tl.fromTo(cz, { backgroundColor: 'rgba(0,28,59,0)' }, { backgroundColor: NIGHT, duration: .6, ease: 'sine.inOut', ...IMM }, t)
        .fromTo(czc, { opacity: 0 }, { opacity: 1, duration: .6, ease: 'sine.inOut', ...IMM }, t)
        .set(czL, { zIndex: 3, pointerEvents: 'none' }, t)
        // the small copy of the concept does not belong in a mail banner: it fades out as the scene shrinks
        .to(cps, { opacity: 0, duration: .7, ease: 'sine.inOut' }, t + .2)
        // the banner's own picture (with its own claim) stays hidden: the shrunk scene IS its picture
        .set(pic, { opacity: 0 }, t)
        .fromTo(cz, { x: 0, y: 0, scale: 1, clipPath: 'inset(-60% -60% -60% -60% round 0px)' },
          { x: B.x, y: B.y - crop * sc, scale: sc, clipPath: `inset(${crop.toFixed(1)}px 0px ${crop.toFixed(1)}px 0px round ${(4 / sc).toFixed(1)}px)`, duration: 1.8, ease: 'power3.inOut', ...IMM }, t + .3)
        .fromTo(root, { '--c-bg': NIGHT }, { '--c-bg': SKY, duration: 1.4, ease: 'power2.inOut', ...IMM }, t + .6);
      layer('s03c', 1, t + .8);
      tl.fromTo(dhead, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .9, stagger: .1, ...IMM }, t + 1.2)
        .fromTo(brd, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.0, ...IMM }, t + 1.3)
        .fromTo(rows, { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: .6, stagger: .06, ...IMM }, t + 1.5)
        .fromTo($$('[data-a=cell]', rows[0]), { rotationX: -90, opacity: .2 }, { rotationX: 0, opacity: 1, duration: .45, stagger: { amount: .3 }, ...IMM }, t + 1.9)
        .fromTo(mocks[0], { opacity: 0, y: 0 }, { opacity: 1, duration: .6, ...IMM }, t + 2.0);
      t += 3.0; marks.push(t); chap('s03c', 6);
      for (let i = 0; i < 5; i++) {
        // the first piece leaves with the key visual it carries
        if (i === 0) { tl.to(cz, { y: '-=24', opacity: 0, duration: .55 }, t); layer('s03b', 0, t + .56); }
        tl.to(mocks[i], { y: -24, opacity: 0, duration: .55 }, t)
          .fromTo(mocks[i + 1], { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: .65, ...IMM }, t + .3)
          .fromTo($$('[data-a=cell]', rows[i + 1]), { rotationX: -90 }, { opacity: 1, rotationX: 0, color: '#ffffff', duration: .45, stagger: { amount: .25 }, ...IMM }, t + .3)
          .to(rows[i], { ...OFF, duration: .3 }, t + .3).to(rows[i + 1], { ...ON, duration: .3 }, t + .35);
        t += 1.1; marks.push(t);
      }

      /* ---- 11 → 12 · the board closes, the rest fades; the venue rhombus is drawn and the plan builds up ---- */
      const sS = Sg('s04a'), iso = $('svg', sS), gGrid = $('[data-iso=grid]', iso), gFloor = $('[data-iso=floor]', iso), gObj = $$('[data-iso=obj]', iso), gRoute = $('[data-iso=route]', iso);
      const rhomb = gFloor ? $$('polygon', gFloor).pop() : null, floorSides = gFloor ? $$('polygon', gFloor).slice(0, -1) : [];
      const iroute = $('[data-a=iroute]', sS), F = iroute.dataset.f.split(',').map(Number), scards = $$('[data-a=scard]', sS), ipins = $$('[data-a=ipin]', sS);
      const shead = $$('h2, h2 + p', sS), sbg = $('.sbg', sS), ilegs = $$('[data-a=ileg]', sS), ilegBox = $('.ileg', sS);
      if (rhomb) len1([rhomb]);
      gsap.set(scards.slice(1), { opacity: 0 });
      tl.to(brd, { clipPath: 'inset(0% 0% 100% 0%)', duration: .8, ease: 'power3.inOut' }, t)
        .to([...mocks, ...dhead, ...$$('[data-a=mock] ~ *, .dcol ~ p, .dcap', dS)], { opacity: 0, duration: .6 }, t + .1);
      layer('s04a', 1, t + .7); layer('s03c', 0, t + 1.2);
      tl.fromTo(gGrid, { opacity: 0 }, { opacity: 1, duration: .9, ease: 'sine.inOut', ...IMM }, t + .7);
      if (rhomb) tl.fromTo(rhomb, { attr: { 'stroke-dasharray': 1, 'stroke-dashoffset': 1 }, fillOpacity: 0 }, { attr: { 'stroke-dashoffset': 0 }, duration: 1.1, ease: 'sine.inOut', ...IMM }, t + .7)
        .to(rhomb, { fillOpacity: 1, duration: .6 }, t + 1.6)
        .fromTo(floorSides, { opacity: 0 }, { opacity: 1, duration: .6, ...IMM }, t + 1.6);
      tl.fromTo(gObj, { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: .7, stagger: .08, ...IMM }, t + 1.8)
        .fromTo(gRoute, { opacity: 0 }, { opacity: 1, duration: .6, ...IMM }, t + 2.4)
        .fromTo(iroute, { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 1 - F[0] }, duration: .9, ...IMM }, t + 2.5)
        .fromTo(ipins, { opacity: 0, scale: .8 }, { opacity: 1, scale: 1, duration: .7, stagger: .08, ...IMM }, t + 2.6)
        .fromTo(sbg, { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: 1.0, ease: 'power3.inOut', ...IMM }, t + 1.6)
        .fromTo(scards[0], { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: 1.0, ease: 'power3.inOut', ...IMM }, t + 1.75)
        .fromTo(ilegBox, { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: 1.0, ease: 'power3.inOut', ...IMM }, t + 1.85)
        .fromTo(shead, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .9, stagger: .1, ...IMM }, t + 1.2);
      t += 3.4; marks.push(t); chap('s04a', 4);
      for (let i = 0; i < 3; i++) {
        tl.to(iroute, { attr: { 'stroke-dashoffset': 1 - F[i + 1] }, duration: 1.1 }, t)
          .to(scards[i], { opacity: 0, y: -8, duration: .45, ease: 'power2.in' }, t + .1).fromTo(scards[i + 1], { opacity: 0, y: 12, x: 0 }, { opacity: 1, y: 0, duration: .65, ease: 'power2.out', ...IMM }, t + .5);
        t += 1.3; marks.push(t);
      }

      /* ---- 15 → 16 · the plan is undrawn, the card closes; the gallery turns in from the right, already curved ---- */
      const pS = Sg('s04b'), P = A2X.ple, phead = $$('h2', pS), pcap = $('.pcap', pS);
      tl.to([...gObj].reverse(), { opacity: 0, y: -10, duration: .5, stagger: .04 }, t)
        .to([gRoute, ...ipins], { opacity: 0, duration: .5 }, t)
        .to([sbg, ...scards, ilegBox], { clipPath: 'inset(0% 0% 0% 100%)', duration: .9, ease: 'power3.inOut' }, t)
        .to(shead, { opacity: 0, y: -12, duration: .6 }, t + .1);
      if (rhomb) tl.to(rhomb, { attr: { 'stroke-dashoffset': 1 }, fillOpacity: 0, duration: .8, ease: 'sine.inOut' }, t + .5);
      tl.to([...floorSides, gGrid], { opacity: 0, duration: .6 }, t + .7);
      layer('s04b', 1, t + 1.1); layer('s04a', 0, t + 1.5);
      tl.fromTo(P.st, { off: -4.6, alpha: 1, k: 1 }, { off: 0, alpha: 1, k: 1, duration: 2.6, ease: 'power3.out', onUpdate: P.place, ...IMM }, t + 1.0)
        .fromTo(phead, { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: .8, ...IMM }, t + 1.4)
        .fromTo(pcap, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .8, ...IMM }, t + 2.4);
      t += 3.5; marks.push(t); chap('s04b', 1);

      /* ---- 16 → 17 · the gallery keeps turning the same way as it leaves; night; the social event deals its cards ---- */
      const soS = Sg('s05'), nap = $('[data-a=napkin]', soS), posts = $$('[data-a=post]', soS), fA = A2X.soc.fA, fB = A2X.soc.fB;
      // the drum turns away (same way it came in) and folds in on itself as it fades, render by render
      tl.to(P.st, { off: 4.6, duration: 2.0, ease: 'power2.in', onUpdate: P.place }, t)
        .to([...phead, pcap], { opacity: 0, duration: .6 }, t)
        .fromTo(root, { '--c-bg': SKY }, { '--c-bg': NIGHT, duration: 1.3, ease: 'power2.inOut', ...IMM }, t + .9);
      layer('s05', 1, t + 1.75); layer('s04b', 0, t + 2.05);
      const PEEL = { tl: [0, 0, 1, 1], tr: [100, 0, -1, 1], bl: [0, 100, 1, -1], br: [100, 100, -1, -1] };
      const poly = (cn, v) => { const [x, y, sx, sy] = PEEL[cn]; return `polygon(${x}% ${y}%, ${x + sx * v}% ${y}%, ${x}% ${y + sy * v}%)`; };
      const corner = (el) => { const r = el.getBoundingClientRect(), s = soS.getBoundingClientRect(); return ((r.top + r.height / 2 < s.top + s.height / 2) ? 't' : 'b') + ((r.left + r.width / 2 < s.left + s.width / 2) ? 'l' : 'r'); };
      const cards5 = [[nap, 'tl'], ...posts.map(p => [p, corner(p)])];
      const r0 = (el) => +gsap.getProperty(el, 'rotation') || 0;
      tl.fromTo(fA, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ...IMM }, t + 1.75)
        .fromTo(fB, { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ...IMM }, t + 1.9);
      cards5.forEach(([el, cn], i) => {
        const [, , sx, sy] = PEEL[cn], rr = r0(el);
        tl.fromTo(el, { clipPath: poly(cn, 0), rotation: rr + sx * sy * 3, scale: 1.04 }, { clipPath: poly(cn, 320), rotation: rr, scale: 1, duration: i ? 1.0 : 1.2, ...IMM }, t + (i ? 2.25 + i * .14 : 1.95));
      });
      t += 4.4; marks.push(t); chap('s05', 1);

      /* ---- 17 → 18 · the cards and friezes fold away; the C295 flies in from the right as it is drawn ---- */
      const crS = Sg('s06'), plane = $('svg.dr', crS), out = $$('[data-a=trace] polygon', crS), inn = $$('.tin polyline', crS);
      const cpins = $$('.pin[data-a=hs]', crS), crest = $$('.crewbg, .tlist, .cslot, h2, p.cap', crS);
      const scl = (el) => { const m = el.getScreenCTM && el.getScreenCTM(); return m ? Math.max(1, Math.hypot(m.a, m.b)) * 1.04 : 1.5; };
      cards5.slice().reverse().forEach(([el, cn], i) => {
        const [, , sx, sy] = PEEL[cn], rr = r0(el);
        tl.to(el, { clipPath: poly(cn, 0), rotation: rr + sx * sy * 3, scale: 1.03, duration: 1.0 }, t + i * .1);
      });
      tl.to(fA, { clipPath: 'inset(0% 100% 0% 0%)', duration: 1.1 }, t + .2)
        .to(fB, { clipPath: 'inset(0% 0% 0% 100%)', duration: 1.1 }, t + .3);
      layer('s06', 1, t + .7); layer('s05', 0, t + 1.6);
      // it comes from beyond the right edge of the screen (even on wide screens, where the canvas does not reach the edge)
      tl.fromTo(plane, { x: () => 1500 + Math.max(0, (innerWidth / k() - 1440) / 2), opacity: 1 }, { x: 0, duration: 2.9, ease: 'power3.out', ...IMM }, t + .5);
      [...out, ...inn].forEach((el, j) => tl.fromTo(el, { attr: { 'stroke-dasharray': () => scl(el) + ' ' + scl(el), 'stroke-dashoffset': () => scl(el) } },
        { attr: { 'stroke-dashoffset': 0 }, duration: j < out.length ? 2.2 : 1.2, ease: 'sine.inOut', ...IMM }, t + (j < out.length ? .7 : 1.4 + .6 * (j - out.length) / Math.max(1, inn.length - 1))));
      // the body of the plane is only filled once its outline is drawn (no silhouette ahead of the line)
      const trace = $('[data-a=trace]', crS);
      if (trace) tl.fromTo(trace, { attr: { 'fill-opacity': 0 } }, { attr: { 'fill-opacity': .3 }, duration: .9, ...IMM }, t + 2.4);
      tl.fromTo(crest, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .9, stagger: .08, ...IMM }, t + 2.3)
        .fromTo(cpins, { scale: .8, opacity: 0 }, { scale: 1, opacity: 1, duration: .7, stagger: .1, ...IMM }, t + 2.6);
      t += 3.6; marks.push(t); chap('s06', 1);

      /* ---- 18 → 19 · the plane leaves to the left; only then are the gauges drawn ---- */
      const gS = Sg('s07'), gauges = $$('[data-a=gauge]', gS), rims = $$('[data-a=grim]', gS), ticks = $$('[data-a=gtick]', gS);
      const garcs = gauges.map(g => $('path', g)), needles = $$('[data-a=needle]', gS), glabels = $$(':scope > div > div, h2, h2 ~ p', gS).filter(e => !e.closest('svg'));
      len1(rims);
      tl.to([...cpins, ...crest, ...$$('path.ln', crS)], { opacity: 0, duration: .6 }, t)
        .to(plane, { x: -1800, duration: 1.5, ease: 'power3.in' }, t + .1);
      layer('s07', 1, t + 1.3); layer('s06', 0, t + 1.65);
      t += 1.3;
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
      tl.eventCallback('onUpdate', () => { P.place(); sync(); });
      const n = marks.length;
      const chOf = (i) => CHS.findIndex(c2 => i >= c2.from && i < c2.from + c2.steps);
      let cur = -1, chOn = -1;
      const loops = () => {
        const id = CHS[chOn] ? CHS[chOn].id : '';
        A2X.loops.forEach(([tw, lid]) => (lid === id ? tw.play() : tw.pause()));
      };
      // the concept keeps its depth while it is on screen: the landscape drifts behind the glass, the C295 floats,
      // and both follow the pointer a little (the window and the plane are fixed by the act; only their inner offsets move)
      const stripImg = strip && $('img', strip);
      if (stripImg && cpl) {
        A2X.loops.push([gsap.fromTo(stripImg, { xPercent: -2, yPercent: 1.5 }, { xPercent: 2, yPercent: -1.5, duration: 9, ease: 'sine.inOut', yoyo: true, repeat: -1, paused: true }), 's03b'],
          [gsap.fromTo(cpl, { yPercent: 0 }, { yPercent: -5, duration: 3.4, ease: 'sine.inOut', yoyo: true, repeat: -1, paused: true }), 's03b']);
        const qx = gsap.quickTo(stripImg, 'x', { duration: 1.4, ease: 'power3.out' }), qy = gsap.quickTo(stripImg, 'y', { duration: 1.4, ease: 'power3.out' });
        const px = gsap.quickTo(cpl, 'xPercent', { duration: 1.2, ease: 'power3.out' });
        sec.addEventListener('pointermove', e => {
          if (!CHS[chOn] || CHS[chOn].id !== 's03b' || o.busy) return;
          const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
          qx(-nx * 28); qy(-ny * 18); px(nx * 4);
        });
      }
      let crewCall = null;
      const mark = (i, instant) => {
        if (i === cur) return; cur = i;
        const ch = chOf(i); if (ch !== chOn) { chOn = ch; loops(); }
        // the chosen team's line is drawn once the plane is in place (it is not part of the scrubbable timeline)
        if (crewCall) crewCall.kill();
        if (CHS[ch].id === 's06') crewCall = gsap.delayedCall(instant ? 0 : 3.1, () => A2X.crew.show(true));
        else A2X.crew.show(false);
        const lay = Ly(CHS[ch].id);
        sec.dataset.ch = lay.dataset.ch;
        if (o.st && curY() >= o.st.start - 2 && curY() <= o.st.end + 2) $('#chap').textContent = lay.dataset.ch;
        gsap.to(fieldState, { amt: FIELD[CHS[ch].id] ?? .7, duration: .8, overwrite: true });
        if (CHS[ch].id === 's04a') [...ipins, ...ilegs].forEach((p) => p.classList.toggle('on', +p.dataset.k === i - CHS[ch].from));
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
      o.set = (i) => { if (o.tw) o.tw.kill(); o.q = 0; o.busy = false; o.drive = false; tl.time(i === 0 && curY() < o.st.start - 2 ? 0 : marks[i]); o.at = i; mark(i, true); };
      const after = () => { o.drive = false; o.busy = false; if (o.q) { const d = Math.sign(o.q); o.q = 0; const nx = o.at + d; if (nx >= 0 && nx < n) o.go(nx); } };
      // 7 nov · a jump inside one chapter (venue stops, board rows) never blanks the scene: only what differs between
      // the two steps moves. The target is read from the act itself (time moved there and back, unpainted), the
      // pieces travel to it (what leaves fades first, what arrives fades in after), and then, in one frame, they get
      // their old values back and the act is set on the new step, so its own record of start values stays right.
      const MV = ['opacity', 'y'], CELL = ['opacity', 'rotationX', 'color'], ROW = ['opacity', 'x', 'backgroundColor', 'boxShadow'];
      const JUMPSET = {
        s03c: () => [...mocks.map(e => [e, MV]), [cz, MV], ...rows.map(e => [e, ROW]), ...rows.flatMap(r => $$('[data-a=cell]', r)).map(e => [e, CELL])],
        s04a: () => [[iroute, ['attr']], ...scards.map(e => [e, ['opacity', 'x', 'y']])],
      };
      const readOf = ([e, props]) => { const v = {}; props.forEach(p => { if (p === 'attr') v.attr = { 'stroke-dashoffset': +e.getAttribute('stroke-dashoffset') }; else v[p] = gsap.getProperty(e, p); }); return v; };
      const jumpWithin = (i) => {
        const id = CHS[chOf(i)].id, set = JUMPSET[id](), els = set.map(x => x[0]);
        const t0 = tl.time(), from = set.map(readOf), czOn = id === 's03c' && i === CHS[chOf(i)].from;
        tl.time(marks[i], true); const to = set.map(readOf); tl.time(t0, true);
        o.busy = true; o.drive = true; o.t0 = performance.now(); if (o.tw) o.tw.kill();
        const prev = o.at; o.at = i; mark(i);
        if (czOn) gsap.set(czL, { autoAlpha: 1 });
        const jt = gsap.timeline({ onComplete() {
          els.forEach((e, j) => gsap.set(e, from[j]));
          if (czOn) gsap.set(czL, { autoAlpha: Ly('s03b').style.visibility === 'hidden' ? 0 : 1 });
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
      o.go = (i) => {
        i = clamp(i, 0, n - 1);
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
      rows.forEach((r, j) => { r.setAttribute('role', 'button'); r.tabIndex = 0; r.style.cursor = 'pointer'; const go = () => o.go(CHS[3].from + j); r.addEventListener('click', go); r.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }); });
      ipins.forEach((p, j) => p.addEventListener('click', () => o.go(CHS[4].from + j)));
      ilegs.forEach((p) => p.addEventListener('click', () => o.go(CHS[4].from + +p.dataset.k)));
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
  const closeIx = () => { if (ixp.classList.contains('on')) { ixp.classList.remove('on'); ixb.setAttribute('aria-expanded', false); } };
  addEventListener('keydown', e => { if (e.key === 'Escape' && ixp.classList.contains('on')) { closeIx(); ixb.focus(); } });
  addEventListener('pointerdown', e => { if (!ixp.contains(e.target) && !ixb.contains(e.target)) closeIx(); });
  let ixY = 0; ixb.addEventListener('click', () => (ixY = scrollY)); addEventListener('scroll', () => { if (Math.abs(scrollY - ixY) > 80) closeIx(); }, { passive: true });
  // Index, brand chip, back to top: never drag the page through every chapter. Neighbouring sections scroll
  // smoothly; anything further is a cut: the content fades out, the page moves while hidden, the destination fades
  // in and plays its own entrance. The background never jumps: the field keeps its position and the page tone
  // blends from the old colour to the new one.
  const mainEl = $('main'), footEl = $('footer.ft');
  let jumping = false;
  function jumpTo(top, el, act, step) {
    const from = scrollY;
    const setAll = () => STEPPERS.forEach(o => { const past = o !== act && top >= o.st.end - 2; o.set(o === act ? step : (past ? o.n - 1 : 0)); o.frozen = past; });
    if (RMQ.matches) { scrollTo(0, top); ScrollTrigger.update(); setAll(); return; }
    if (Math.abs(top - from) <= innerHeight * 1.15 && !act) { scrollToY(top, .9); return; }
    if (jumping) return; jumping = true;
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
      gsap.fromTo(parts, { opacity: 0 }, { opacity: 1, duration: .6, ease: 'power2.out', delay: tone ? .3 : .05, clearProps: 'opacity', onComplete: () => (jumping = false) });
    } });
  }
  $$('#ixp a, a[href^="#s"], a.skip').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href').slice(1), el = document.getElementById(id); if (!el) return;
    e.preventDefault();
    closeIx();
    el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true });
    // targets inside Act 1 (portada, briefing, agenda) are steps of the pinned act
    const act = window.__act && window.__act(), ACTSTEP = { s00: 0, s01: 1, s02a: 2 };
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

  /* ---------- credentials gallery: centred slides, arrows, drag, counter, caption ---------- */
  document.querySelectorAll('[data-a=gal]').forEach(g => {
    const t = g.querySelector('[data-gal-track]'), s = [...t.children], bar = g.parentElement.parentElement;
    const scope = g.closest('.stage-l, .stage-m') || bar;
    const cnt = scope.querySelector('[data-gal-cnt]'), cap = scope.querySelector('[data-gal-cap]'), pv = scope.querySelector('[data-gal-prev]'), nx = scope.querySelector('[data-gal-next]');
    const step = () => (s[1].offsetLeft - s[0].offsetLeft) || 1, idx = () => clamp(Math.round(t.scrollLeft / step()), 0, s.length - 1);
    let on = -1;
    const upd = () => { const i = idx(); if (i === on) return; on = i; s.forEach((li, j) => li.classList.toggle('on', j === i)); if (th.length) thMark(i); if (cnt) cnt.textContent = (i + 1) + ' de ' + s.length; if (cap) cap.textContent = s[i].querySelector('img').alt; if (pv) pv.disabled = i === 0; if (nx) nx.disabled = i === s.length - 1; };
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
    const SEL = '#s00 [data-a^=ph], #s02b figure img, #s03c img[src*="dg-"], #s03c img[src*="plan-"], #s04a img[alt]:not([alt=""]), #s04b [data-a=pan] img, #s05 img[alt]:not([alt=""]), #s08 [data-gal-track] img';
    const box = document.createElement('div');
    box.id = 'lbx'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Imagen ampliada'); box.hidden = true;
    box.innerHTML = '<div class="lb-bg"></div><img class="lb-im" alt=""><p class="lb-cap"></p><button type="button" class="lb-x" aria-label="Cerrar imagen">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></button>';
    document.body.appendChild(box);
    const bg = box.querySelector('.lb-bg'), im = box.querySelector('.lb-im'), cap = box.querySelector('.lb-cap'), x = box.querySelector('.lb-x');
    let src = null, busy = false, down = null;
    // stacked photos (the agenda window): the click goes to whichever one is showing
    const op = (n) => { let o = 1; for (let p = n; p && p.nodeType === 1; p = p.parentElement) o *= +getComputedStyle(p).opacity; return o; };
    const shown = (el) => { const sib = [...el.parentElement.children].filter(n => n.classList.contains('lb-t')); return sib.length > 1 ? sib.reduce((a, b) => (op(b) > op(a) ? b : a)) : el; };
    const ok = (el) => el && el.matches && el.matches(SEL) && !(el.closest('[data-gal-track] li') && !el.closest('li.on'));
    $$(SEL).forEach(el => { el.classList.add('lb-t'); if (!el.closest('button,a')) { el.tabIndex = 0; el.setAttribute('role', 'button'); el.setAttribute('aria-label', 'Ampliar imagen: ' + (el.alt || '')); } });
    const fit = () => {
      const m = innerWidth < 768 ? 16 : 56, capH = innerWidth < 768 ? 64 : 72, nw = im.naturalWidth || 1600, nh = im.naturalHeight || 900;
      const s = Math.min((innerWidth - m * 2) / nw, (innerHeight - m - capH) / nh, 1.6), w = nw * s, h = nh * s;
      return { w, h, l: (innerWidth - w) / 2, t: (m + innerHeight - capH - h) / 2 };
    };
    const from = (r, f) => ({ x: r.left + r.width / 2 - (f.l + f.w / 2), y: r.top + r.height / 2 - (f.t + f.h / 2), scale: Math.max(r.width / f.w, r.height / f.h) });
    const open = (el) => {
      if (busy || window.__lbOpen) return;
      src = el; window.__lbOpen = true; busy = true;
      im.src = el.currentSrc || el.src; im.alt = el.alt || ''; cap.textContent = el.alt || '';
      box.hidden = false; lenis && lenis.stop(); root.classList.add('lb-on');
      const go = () => {
        const f = fit(), r = el.getBoundingClientRect(), a = from(r, f);
        gsap.set(im, { left: f.l, top: f.t, width: f.w, height: f.h });
        const tl = gsap.timeline({ onComplete: () => { busy = false; x.focus({ preventScroll: true }); } });
        if (RMQ.matches) tl.fromTo([bg, im, cap, x], { opacity: 0 }, { opacity: 1, duration: .2 });
        else tl.fromTo(bg, { opacity: 0 }, { opacity: 1, duration: .5, ease: 'power2.out' }, 0)
          .fromTo(im, { ...a, opacity: .4 }, { x: 0, y: 0, scale: 1, opacity: 1, duration: .7, ease: 'power3.inOut' }, 0)
          .fromTo([cap, x], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .45, ease: 'power2.out', stagger: .05 }, .45);
      };
      im.complete && im.naturalWidth ? go() : im.addEventListener('load', go, { once: true });
    };
    const close = () => {
      if (!window.__lbOpen || busy) return;
      busy = true;
      const done = () => { box.hidden = true; busy = false; window.__lbOpen = false; root.classList.remove('lb-on'); lenis && lenis.start(); gsap.set([im, cap, x, bg], { clearProps: 'transform,opacity' }); src && src.focus && src.focus({ preventScroll: true }); src = null; };
      if (RMQ.matches) { gsap.to(box.children, { opacity: 0, duration: .15, onComplete: done }); return; }
      const f = fit(), r = src.getBoundingClientRect(), vis = r.bottom > 0 && r.top < innerHeight && r.width > 2, a = from(r, f);
      gsap.timeline({ onComplete: done })
        .to([cap, x], { opacity: 0, duration: .2, ease: 'power2.in' }, 0)
        .to(im, vis ? { ...a, opacity: .2, duration: .55, ease: 'power3.inOut' } : { opacity: 0, scale: .96, duration: .35, ease: 'power2.in' }, 0)
        .to(bg, { opacity: 0, duration: .45, ease: 'power2.inOut' }, .1);
    };
    // a click only opens when the pointer did not drag (gallery, drum, credentials)
    addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; }, true);
    addEventListener('click', e => {
      const el = e.target.closest && (e.target.closest('.lb-t') || (e.target.closest('[data-gal-track] li') || {}).firstElementChild);
      if (!ok(el)) return;
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
