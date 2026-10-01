/**
 * Motion layer — anime.js v4. Progressive enhancement only:
 * if this module fails to load, the page renders normally without animation.
 */
import { animate, stagger, utils } from 'https://cdn.jsdelivr.net/npm/animejs@4/+esm';

if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  initDotField();
  initHeroIntro();
  initScrollReveals();
}

/* 1. Cursor-reactive dot field behind the hero -------------------------- */
function initDotField() {
  const hero = document.getElementById('hero');
  const field = document.getElementById('hero-field');
  if (!hero || !field) return;

  const cols = 28, rows = 14;
  field.innerHTML = '<i></i>'.repeat(cols * rows);
  const dots = [...field.children];

  // Breathing wave from the centre, forever.
  animate(dots, {
    opacity: [{ to: 0.9 }, { to: 0.18 }],
    scale: [{ to: 1.8 }, { to: 1 }],
    delay: stagger(40, { grid: [cols, rows], from: 'center' }),
    duration: 1600,
    loopDelay: 1200,
    loop: true,
    ease: 'inOutSine',
  });

  // Pointer proximity: dots swell near the cursor via a CSS custom property.
  let centers = [];
  const measure = () => { centers = dots.map(d => { const r = d.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }); };
  measure();
  addEventListener('resize', measure);
  addEventListener('scroll', measure, { passive: true });

  let pending = null, raf = 0;
  const RADIUS = 150;
  const paint = () => {
    raf = 0;
    const { clientX: x, clientY: y } = pending;
    dots.forEach((d, i) => {
      const dx = centers[i][0] - x, dy = centers[i][1] - y;
      const p = Math.max(0, 1 - Math.hypot(dx, dy) / RADIUS);
      d.style.setProperty('--p', (p * p * 2.5).toFixed(2));
    });
  };
  hero.addEventListener('pointermove', e => { pending = e; if (!raf) raf = requestAnimationFrame(paint); });
  hero.addEventListener('pointerleave', () => dots.forEach(d => d.style.setProperty('--p', 0)));
}

/* 2. Hero intro: character stagger on the title, then the rest ----------- */
function initHeroIntro() {
  const title = document.querySelector('.hero-title');
  if (!title) return;

  // Wrap every character in a span, grouped by word so lines still break at spaces.
  const walk = node => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.trim().split(/\s+/).forEach((word, i) => {
          if (i) frag.append(' ');
          const w = document.createElement('span');
          w.className = 'w';
          for (const ch of word) {
            const s = document.createElement('span');
            s.className = 'ch';
            s.textContent = ch;
            w.appendChild(s);
          }
          frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
    });
  };
  walk(title);

  const chars = title.querySelectorAll('.ch');
  const rest = document.querySelectorAll('.hero-content > :not(.hero-title), .hero-card-widget');

  utils.set(chars, { opacity: 0, translateY: '0.6em' });
  utils.set(rest, { opacity: 0, translateY: 24 });

  animate(chars, {
    opacity: 1,
    translateY: 0,
    delay: stagger(22, { start: 150 }),
    duration: 900,
    ease: 'outExpo',
  });
  animate(rest, {
    opacity: 1,
    translateY: 0,
    delay: stagger(90, { start: 500 }),
    duration: 800,
    ease: 'outCubic',
    onComplete: () => clearInline(rest),
  });

  // Count the mini stats up from zero.
  document.querySelectorAll('.mini-stat-num').forEach(el => {
    const target = parseInt(el.textContent, 10);
    if (Number.isNaN(target)) return;
    const o = { v: 0 };
    animate(o, { v: target, duration: 1400, delay: 900, ease: 'outCubic', modifier: utils.round(0), onUpdate: () => (el.textContent = o.v) });
  });
}

/* 3. Scroll reveals: each container staggers its children in ------------ */
function initScrollReveals() {
  const groups = document.querySelectorAll(
    '.section-header, .filter-tabs, .pillars-grid, .projects-grid, .pub-card, .timeline-items, .certs-grid, .skills-grid, .contact-card-main'
  );
  if (!groups.length || !('IntersectionObserver' in window)) return;

  const SELF = '.section-header, .pub-card, .contact-card-main';
  const itemsOf = g => (g.matches(SELF) ? [g] : [...g.children]);

  groups.forEach(g => utils.set(itemsOf(g), { opacity: 0, translateY: 28 }));

  const io = new IntersectionObserver(entries => {
    entries.forEach(({ isIntersecting, target }) => {
      if (!isIntersecting) return;
      io.unobserve(target);
      const items = itemsOf(target);
      animate(items, {
        opacity: 1,
        translateY: 0,
        delay: stagger(70),
        duration: 750,
        ease: 'outCubic',
        onComplete: () => clearInline(items),
      });
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

  groups.forEach(g => io.observe(g));
}

/* Hand transform/opacity back to the stylesheet so :hover lifts still work. */
function clearInline(els) {
  els.forEach(el => { el.style.transform = ''; el.style.opacity = ''; });
}
