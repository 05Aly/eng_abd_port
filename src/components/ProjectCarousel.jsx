import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { imageUrl, isHttps } from '../lib/supabase';

const Chevron = ({ dir }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d={dir < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} /></svg>;

/* One card at a time. Auto advances every 10s: the active dot fills over 10s and its animationend moves to the next card.
   Hover or keyboard focus pauses the fill. With reduced motion there is no autoplay. */
export default function ProjectCarousel({ projects }) {
  const n = projects.length, multi = n > 1;
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const x0 = useRef(null);
  const go = d => setIdx(i => (i + d + n) % n);

  return (
    <div className={'pcar' + (paused ? ' paused' : '')} role="region" aria-roledescription="carousel" aria-label="Projects"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={e => e.target.matches(':focus-visible') && setPaused(true)}
      onBlur={e => !e.currentTarget.contains(e.relatedTarget) && setPaused(false)}
      onKeyDown={e => { if (!multi) return; if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); }}
      onPointerDown={e => { x0.current = e.clientX; }}
      onPointerUp={e => { if (x0.current == null || !multi) return; const dx = e.clientX - x0.current; x0.current = null; if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1); }}>
      <div className="pcar-view">
        <div className="pcar-track" style={{ transform: `translateX(-${idx * 100}%)` }}>
          {projects.map((p, i) => (
            <div className={'pcar-slide' + (i === idx ? ' on' : '')} key={p.id} aria-hidden={i !== idx} {...(i !== idx ? { inert: '' } : {})}>
              <article className="pc">
                <div className="pc-media">
                  {p.image_path ? <img src={imageUrl(p.image_path)} alt="" loading="lazy" />
                    : <div className="pc-ph"><svg width="48" height="48" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l11 20H1z" fill="none" stroke="currentColor" strokeWidth="1" /></svg></div>}
                </div>
                <div className="pc-body">
                  <span className="cap dim">{[p.category, p.year].filter(Boolean).join(' / ')}</span>
                  <div>
                    <h3><Link className="pc-link" to={`/projects/${p.id}`}>{p.title}</Link></h3>
                    {p.description && <p className="pc-desc">{p.description}</p>}
                  </div>
                  {p.tech?.length > 0 && <ul className="chips cap">{p.tech.slice(0, 4).map(t => <li key={t}>{t}</li>)}</ul>}
                  <div className="pc-foot">
                    <span className="cap pc-more">View details &rarr;</span>
                    {isHttps(p.demo_url) && <a className="btn sm" href={p.demo_url} target="_blank" rel="noopener noreferrer">Live demo</a>}
                    {isHttps(p.github_url) && <a className="btn ghost sm" href={p.github_url} target="_blank" rel="noopener noreferrer">GitHub</a>}
                  </div>
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>
      {multi && (
        <div className="pcar-ctl">
          <button className="pcar-btn" onClick={() => go(-1)} aria-label="Previous project"><Chevron dir={-1} /></button>
          <div className="pcar-dots" role="group" aria-label="Choose project">
            {projects.map((p, i) => (
              <button key={p.id} className={'dot' + (i === idx ? ' on' : '')} aria-label={`Project ${i + 1}: ${p.title}`} aria-current={i === idx} onClick={() => setIdx(i)}>
                {i === idx && <span className="fill" key={idx} onAnimationEnd={() => go(1)} />}
              </button>
            ))}
          </div>
          <button className="pcar-btn" onClick={() => go(1)} aria-label="Next project"><Chevron dir={1} /></button>
        </div>
      )}
    </div>
  );
}