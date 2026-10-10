import { useEffect, useState } from 'react';

export const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Adds .in to [data-anim] / [data-split] elements when they scroll into view. Re-scans when `dep` changes. */
export function useReveal(dep) {
  useEffect(() => {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: 0.05, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('[data-anim],[data-split]').forEach((el, i) => {
      if (el.classList.contains('in')) return;
      if (el.dataset.anim === 'cell') el.style.setProperty('--d', (i % 4) * .08 + 's');
      io.observe(el);
    });
    return () => io.disconnect();
  }, [dep]);
}

/* Typewriter that cycles through `words` */
export function useTyped(words) {
  const [text, setText] = useState(words[0]);
  useEffect(() => {
    if (reduceMotion()) return;
    let r = 0, c = 0, del = false, id;
    const tick = () => {
      const w = words[r]; c += del ? -1 : 1; setText(w.slice(0, c));
      let d = del ? 30 : 65;
      if (!del && c === w.length) { del = true; d = 1500; } else if (del && c === 0) { del = false; r = (r + 1) % words.length; d = 300; }
      id = setTimeout(tick, d);
    };
    tick();
    return () => clearTimeout(id);
  }, []);
  return text;
}

/* Which section is in the middle of the screen (drives the active nav link) */
export function useActiveSection(ids) {
  const [active, setActive] = useState('');
  useEffect(() => {
    const so = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }), { rootMargin: '-45% 0px -50% 0px' });
    ids.forEach(id => { const el = document.getElementById(id); if (el) so.observe(el); });
    return () => so.disconnect();
  }, []);
  return active;
}
