/**
 * Motion layer (anime.js v4.5): smooth scroll, satellite choreography, HUD, text reveals.
 * The page is fully readable without this module; it only adds motion.
 */
import { animate, createTimeline, stagger, splitText, scrambleText, onScroll, createDrawable, utils } from 'animejs';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrowMQ = matchMedia('(max-width: 900px)');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ------------------------------------------------------------------ 1. 3D scene (in parallel) */
const canvas = $('#space');
const hasGL = !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
const spaceReady = hasGL
  ? import('./space.js').then(async m => { await m.startSpace(canvas); return m; })
  : Promise.reject(new Error('WebGL unavailable'));
spaceReady.catch(e => { console.warn('[space]', e); document.documentElement.classList.add('no-webgl'); });

/* ------------------------------------------------------------------ 2. Smooth scroll */
if (!reduced) {
  import('lenis').then(({ default: Lenis }) => {
    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, anchors: false });
    window.__lenis = lenis;
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length < 2 || !$(id)) return;
      e.preventDefault();
      lenis.scrollTo(id, { duration: 1.8, easing: t => 1 - Math.pow(1 - t, 4) });
    }));
  }).catch(e => console.warn('[lenis]', e));
}

/* ------------------------------------------------------------------ 3. HUD ring */
const NS = 'http://www.w3.org/2000/svg';
function buildHud() {
  const svg = $('#hud-svg');
  const el = (tag, attrs, parent = svg) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  };
  const arc = (r, a0, a1) => {
    const x0 = r * Math.cos(a0), y0 = r * Math.sin(a0), x1 = r * Math.cos(a1), y1 = r * Math.sin(a1);
    return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  };

  const sweepSvg = $('#hud-sweep'), tickSvg = $('#hud-ticks');
  el('path', { class: 'sweep', d: arc(238, -2.7, -1.5) }, sweepSvg);
  el('circle', { class: 'ring', r: 252 });
  el('circle', { class: 'ring dash', r: 222 });

  const ticks = [];
  for (let i = 0; i < 180; i++) {
    const a = (i / 180) * Math.PI * 2, major = i % 10 === 0;
    const r0 = 262, r1 = major ? 282 : 271;
    ticks.push(el('line', {
      class: 'tick' + (major ? ' major' : ''),
      x1: (r0 * Math.cos(a)).toFixed(2), y1: (r0 * Math.sin(a)).toFixed(2),
      x2: (r1 * Math.cos(a)).toFixed(2), y2: (r1 * Math.sin(a)).toFixed(2),
    }, tickSvg));
  }

  const colors = ['#ff4b4b', '#ffa828', '#26f2d5', '#4d9cff', '#a369ff', '#8dff55'];
  const arcs = colors.map((c, i) => {
    const a0 = -Math.PI / 2 + (i * Math.PI) / 3 + 0.035;
    const d = arc(300, a0, a0 + Math.PI / 3 - 0.07);
    el('path', { class: 'arc-glow', d, stroke: c });
    return el('path', { class: 'arc', d, stroke: c });
  });

  [[-212, 0, -186, 0], [186, 0, 212, 0], [0, -212, 0, -186], [0, 186, 0, 212]].forEach(([x1, y1, x2, y2]) =>
    el('line', { class: 'cross', x1, y1, x2, y2 }));

  // Orbit trail: dots along a tilted ellipse (the satellite's ground track, stylised)
  const dots = [];
  const tilt = -0.32;
  for (let i = 0; i < 30; i++) {
    const t = Math.PI * (0.08 + (i / 29) * 0.9);
    const ex = 245 * Math.cos(t), ey = 78 * Math.sin(t);
    const x = ex * Math.cos(tilt) - ey * Math.sin(tilt), y = ex * Math.sin(tilt) + ey * Math.cos(tilt);
    const d = el('circle', { class: 'orbit-dot', cx: x.toFixed(2), cy: y.toFixed(2), r: (1.6 + (i / 29) * 3).toFixed(2) });
    d.style.transformBox = 'fill-box'; d.style.transformOrigin = 'center';
    dots.push(d);
  }

  // Intro: draw arcs, cascade ticks, wake the trail (all anime.js)
  if (reduced) return;
  utils.set(ticks, { opacity: 0 });
  utils.set(dots, { opacity: 0 });
  animate(createDrawable(arcs), { draw: ['0 0', '0 1'], duration: 1600, delay: stagger(140, { start: 350 }), ease: 'inOutQuart' });
  animate(ticks, { opacity: (t) => (t.classList.contains('major') ? 0.9 : 0.55), duration: 300, delay: stagger(5, { start: 300 }), ease: 'outQuad' });
  // Rotate whole <svg> layers (HTML transforms are GPU-composited; rotating inner SVG groups repaints every frame)
  animate(tickSvg, { rotate: '1turn', duration: 160000, loop: true, ease: 'linear' });
  animate(sweepSvg, { rotate: '-1turn', duration: 9000, loop: true, ease: 'linear' });
  animate(dots, {
    opacity: [{ to: 1, duration: 500 }, { to: 0.3, duration: 900 }],
    scale: [{ to: 1.9, duration: 500 }, { to: 1, duration: 900 }],
    delay: stagger(55, { start: 1200 }),
    loop: true, loopDelay: 600, ease: 'inOutSine',
  });
}

/* ------------------------------------------------------------------ 4. Hero intro */
function heroIntro() {
  const split = splitText('#hero-title', { chars: { class: 'char', wrap: 'clip' } });
  if (reduced) return;
  utils.set(split.chars, { y: '110%' });
  animate(split.chars, { y: '0%', duration: 1200, delay: stagger(26, { start: 250 }), ease: 'out(4)' });
  const rest = [$('.hero-sub'), ...$$('.hero-actions > *'), $('.telemetry')];
  utils.set(rest, { opacity: 0, y: 24 });
  animate(rest, { opacity: 1, y: 0, duration: 1000, delay: stagger(110, { start: 700 }), ease: 'out(3)' });
  scrambleAll($$('[data-tm]'), 900);
}

/* ------------------------------------------------------------------ 5. Labels, reveals, counters */
function wrapLabels() {
  $$('[data-scramble]').forEach(l => {
    const txt = [...l.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
    if (!txt) return;
    const s = document.createElement('span');
    s.className = 'label-text';
    s.textContent = txt.textContent.trim();
    txt.replaceWith(s);
  });
}

function scrambleAll(els, delay = 0) {
  els.forEach((el, i) => animate(el, { innerHTML: scrambleText({ chars: 'A-Z0-9#%', revealRate: 45, settleDuration: 350 }), delay: delay + i * 60 }));
}

function revealOnScroll() {
  if (reduced) return;
  // One-shot reveals: native IntersectionObserver fires for any scroll method (wheel, jump, restored position).
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    e.target.__reveal?.forEach(fn => fn());
  }), { rootMargin: '0px 0px -8% 0px' });
  const when = (el, fn) => { (el.__reveal ||= []).push(fn); io.observe(el); };

  $$('[data-scramble]').forEach(l => {
    if (l.closest('#hero')) { scrambleAll([$('.label-text', l)], 200); return; }
    const t = $('.label-text', l);
    utils.set(t, { opacity: 0 });
    when(l, () => { utils.set(t, { opacity: 1 }); scrambleAll([t]); });
  });

  $$('.reveal-title').forEach(el => {
    const s = splitText(el, { words: { class: 'word', wrap: 'clip' } });
    utils.set(s.words, { y: '108%' });
    when(el, () => animate(s.words, { y: '0%', duration: 1100, delay: stagger(55), ease: 'out(4)' }));
  });

  $$('.reveal-up').forEach(el => {
    utils.set(el, { opacity: 0, y: 36 });
    when(el, () => animate(el, { opacity: 1, y: 0, duration: 1000, ease: 'out(3)' }));
  });

  $$('.reveal-stagger').forEach(el => {
    const kids = [...el.children];
    utils.set(kids, { opacity: 0, y: 28 });
    when(el, () => animate(kids, { opacity: 1, y: 0, duration: 900, delay: stagger(80), ease: 'out(3)' }));
  });

  // Project cards cascade in by row
  const cards = $$('.project-card');
  utils.set(cards, { opacity: 0, y: 50 });
  cards.forEach((c, i) => when(c, () => animate(c, { opacity: 1, y: 0, duration: 1000, delay: (i % 3) * 90, ease: 'out(3)' })));
  $$('.filter-tab').forEach(t => t.addEventListener('click', () => {
    const shown = cards.filter(c => c.style.display !== 'none');
    animate(shown, { opacity: [0, 1], y: [24, 0], duration: 700, delay: stagger(50), ease: 'out(3)' });
  }));

  // Orbit log line is scrubbed by scroll
  const line = $('.log-line line');
  if (line) {
    animate(createDrawable(line), {
      draw: ['0 0', '0 1'], ease: 'linear',
      autoplay: onScroll({ target: '.log', enter: 'center top', leave: 'center bottom', sync: 0.2 }),
    });
  }

  // Stat counters
  $$('[data-count]').forEach(el => {
    const o = { v: 0 };
    when(el, () => animate(o, {
      v: +el.dataset.count, duration: 1600, ease: 'out(3)',
      onUpdate: () => (el.textContent = Math.round(o.v)),
    }));
  });

}

/* ------------------------------------------------------------------ 6. Hover micro-interactions */
function hoverLetters() {
  if (reduced) return;
  $$('.nav-link, .btn-line, .contact-links a').forEach(a => {
    const txt = [...a.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
    if (!txt) return;
    const span = document.createElement('span');
    span.textContent = txt.textContent.trim();
    txt.replaceWith(span);
    const { chars } = splitText(span, { chars: { class: 'hchar' } });
    chars.forEach(c => (c.style.display = 'inline-block'));
    a.addEventListener('pointerenter', () => animate(chars, {
      y: [{ to: -5, duration: 160, ease: 'out(3)' }, { to: 0, duration: 420, ease: 'outElastic(1, .5)' }],
      delay: stagger(16), composition: 'blend',
    }));
  });
}

/* ------------------------------------------------------------------ 7. Live telemetry */
function telemetry() {
  const alt = $('[data-tm="alt"]'), vel = $('[data-tm="vel"]');
  if (!alt || reduced) return;
  let k = 0;
  setInterval(() => {
    if (scrollY > innerHeight) return;
    k += 1;
    const a = (705 + Math.sin(k * 0.7) * 0.6).toFixed(1);
    const v = (7.504 + Math.cos(k * 0.9) * 0.004).toFixed(3);
    animate(alt, { innerHTML: scrambleText({ text: `${a} KM`, chars: '0-9', settleDuration: 250 }) });
    animate(vel, { innerHTML: scrambleText({ text: `${v} KM/S`, chars: '0-9', settleDuration: 250 }), delay: 120 });
  }, 2200);
}

/* ------------------------------------------------------------------ 8. Satellite choreography */
const BASE = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, scale: 0.8, wing: 0, thrust: 0, rcs: 0.2, beam: 0, earthY: 0, spin: 0 };
const STATES = {
  hero:           { x: 2.25, y: 0.05, rx: -0.5, ry: -1.75, rz: -2.3, scale: 0.84, thrust: 1, rcs: 0.25 },
  about:          { x: -2.7, y: -0.2, z: 0.6, rx: 0.4, ry: -3.3, rz: -0.35, scale: 0.85, thrust: 0.06, rcs: 0.9, wing: 0.55, earthY: -3 },
  experience:     { x: 3.0, y: 0.4, rx: 0.15, ry: -0.7, rz: 0.35, scale: 0.68, rcs: 0.35, wing: 1.0, earthY: -6 },
  projects:       { x: 0.2, y: 2.15, z: -1, rx: 0.05, ry: 0.5, rz: 0, scale: 0.6, rcs: 0.15, beam: 1, earthY: 1.5 },
  publication:    { x: -3.0, y: 0.25, rx: -0.25, ry: 1.6, rz: 0.4, scale: 0.7, rcs: 0.4, earthY: -2 },
  skills:         { x: 3.1, y: -0.2, rx: 0.45, ry: 2.6, rz: -0.3, scale: 0.72, rcs: 0.6, wing: -0.5, earthY: -4 },
  certifications: { x: -2.9, y: 0.5, rx: -0.3, ry: 3.6, rz: 0.2, scale: 0.66, rcs: 0.3, earthY: -2 },
  contact:        { x: 2.9, y: 1.1, z: -6, rx: -0.5, ry: 4.5, rz: -2.3, scale: 0.8, thrust: 2.6, rcs: 1, earthY: 0.5 },
};
const ORDER = Object.keys(STATES);
const full = id => ({ ...BASE, ...STATES[id] });

async function choreography() {
  const space = await spaceReady.catch(() => null);
  if (!space) return;
  const { rig, screen } = space;
  Object.assign(rig, full('hero'));

  const tl = createTimeline({ autoplay: false, defaults: { duration: 1000 } });
  for (let i = 1; i < ORDER.length; i++) {
    const a = full(ORDER[i - 1]), b = full(ORDER[i]);
    const props = { ease: i === ORDER.length - 1 ? 'in(2.2)' : 'inOutSine' };
    for (const k in b) props[k] = [a[k], b[k]];
    tl.add(rig, props, (i - 1) * 1000);
  }

  const sections = ORDER.map(id => document.getElementById(id));
  let anchors = [];
  const measure = () => {
    const vh = innerHeight, max = document.documentElement.scrollHeight - vh;
    anchors = sections.map((s, i) => (i === 0 ? 0 : i === sections.length - 1 ? max : Math.min(max, s.offsetTop - vh * 0.22)));
    for (let i = 1; i < anchors.length; i++) anchors[i] = Math.max(anchors[i], anchors[i - 1] + 1);
  };
  measure();
  new ResizeObserver(measure).observe(document.body);
  addEventListener('resize', measure);

  const progress = y => {
    for (let i = 0; i < anchors.length - 1; i++) {
      if (y < anchors[i + 1]) return i + Math.max(0, (y - anchors[i]) / (anchors[i + 1] - anchors[i]));
    }
    return anchors.length - 1;
  };

  const hud = $('#hud'), hudInner = $('#hud-inner');
  let f = progress(scrollY), last = performance.now();
  const tick = now => {
    const dt = Math.min((now - last) / 1000, 0.25); last = now;
    const target = progress(scrollY);
    f += (target - f) * (reduced ? 1 : 1 - Math.exp(-dt * 4.2));   // frame-rate independent smoothing
    if (Math.abs(target - f) < 1e-4) f = target;
    tl.seek(f * 1000);
    const h = Math.max(0, 1 - f * 1.8);
    hudInner.style.opacity = h.toFixed(3);
    hudInner.style.transform = `scale(${(0.8 + 0.2 * h).toFixed(3)})`;

    // HUD rides on the satellite; scale follows its projected size
    const size = Math.max(300, Math.min(screen.r * 3.1, Math.min(innerWidth, innerHeight) * (narrowMQ.matches ? 1.15 : 1.0)));
    const s = size / 640;
    hud.style.transform = `translate3d(${(screen.x - 320).toFixed(1)}px, ${(screen.y - 320).toFixed(1)}px, 0) scale(${s.toFixed(3)})`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ------------------------------------------------------------------ boot */
wrapLabels();
buildHud();
heroIntro();
revealOnScroll();
hoverLetters();
telemetry();
choreography();
