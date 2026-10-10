import { useEffect, useRef } from 'react';
import { reduceMotion } from '../lib/hooks';

/* Fixed canvas: dim PCB traces with light pulses that run along them, faster while scrolling */
export default function Wires() {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current, g = cv.getContext('2d'), GAP = 11, reduce = reduceMotion();
    let W, H, paths = [], lastY = scrollY, boost = 0, prev = 0, raf;
    const bundle = (n, dir, y0, L, D, yEnd, vy) => {
      for (let k = 0; k < n; k++) {
        const x0 = dir > 0 ? 0 : W, y = y0 - vy * k * GAP, xh = x0 + dir * (L + k * GAP), xd = xh + dir * D;
        const pts = [[x0, y], [xh, y], [xd, y + vy * D], [xd, yEnd]], cum = [0];
        for (let i = 1; i < 4; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
        paths.push({ pts, cum, len: cum[3], pulses: [{ s: Math.random() * cum[3], v: 70 + Math.random() * 90 }, { s: Math.random() * cum[3], v: 50 + Math.random() * 60 }] });
      }
    };
    const build = () => {
      const d = Math.min(devicePixelRatio || 1, 1.5); W = innerWidth; H = innerHeight;
      cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); paths = [];
      bundle(8, 1, H * .55, W * .03, 55, H + 20, 1); bundle(6, 1, H * .14, W * .02, 36, H * .34, 1);
      bundle(8, -1, H * .66, W * .14, 90, H + 20, 1); bundle(5, -1, H * .2, W * .05, 40, H * .46, 1);
    };
    const seg = (p, a, b) => {
      g.beginPath(); let started = false;
      for (let i = 1; i < 4; i++) {
        const c0 = p.cum[i - 1], c1 = p.cum[i]; if (c1 < a || c0 > b) continue;
        const t0 = Math.max(a, c0) - c0, t1 = Math.min(b, c1) - c0, [x0, y0] = p.pts[i - 1], [x1, y1] = p.pts[i], k = c1 - c0;
        if (!started) { g.moveTo(x0 + (x1 - x0) * t0 / k, y0 + (y1 - y0) * t0 / k); started = true; }
        g.lineTo(x0 + (x1 - x0) * t1 / k, y0 + (y1 - y0) * t1 / k);
      }
      g.stroke();
    };
    const draw = t => {
      raf = requestAnimationFrame(draw); const dt = Math.min((t - prev) / 1000, .05); prev = t;
      boost += (Math.min(Math.abs(scrollY - lastY), 60) - boost) * .1; lastY = scrollY;
      g.clearRect(0, 0, W, H); g.lineWidth = 1; g.strokeStyle = `rgba(128,180,182,${(.22 + boost * .006).toFixed(3)})`;
      paths.forEach(p => {
        g.beginPath(); p.pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke();
        g.beginPath(); g.arc(p.pts[3][0], p.pts[3][1], 2.5, 0, 6.3); g.stroke();
      });
      if (reduce) return;
      g.lineWidth = 2; g.strokeStyle = '#c9ece3'; g.shadowColor = '#99c0b5'; g.shadowBlur = 12 + boost * .3; g.lineCap = 'round';
      paths.forEach(p => p.pulses.forEach(u => { u.s = (u.s + u.v * (1 + boost * .12) * dt) % (p.len + 120); seg(p, u.s - 90, u.s); }));
      g.shadowBlur = 0;
    };
    build(); addEventListener('resize', build); raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', build); };
  }, []);
  return <canvas id="wires" ref={ref} aria-hidden="true" />;
}
