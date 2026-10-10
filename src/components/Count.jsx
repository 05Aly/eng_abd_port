import { useEffect, useRef, useState } from 'react';
export default function Count({ to }) {
  const ref = useRef(null), [v, setV] = useState(0);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; io.disconnect();
      const t0 = performance.now();
      const step = n => { const k = Math.min((n - t0) / 1400, 1); setV(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }, { threshold: .5 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [to]);
  return <b ref={ref}>{v}+</b>;
}
