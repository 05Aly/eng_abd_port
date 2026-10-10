import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { imageUrl, isHttps, supabase } from '../lib/supabase';
import { videoEmbed } from '../lib/video';
import { useReveal } from '../lib/hooks';
import Split from '../components/Split';
import Wires from '../components/Wires';

export default function Project() {
  const { id } = useParams();
  const [p, setP] = useState(undefined); // undefined = loading, null = not found
  const [zoom, setZoom] = useState('');
  useReveal(p);

  useEffect(() => {
    window.scrollTo(0, 0); setP(undefined);
    if (!supabase || !/^[0-9a-f-]{36}$/i.test(id)) return setP(null);
    supabase.from('projects').select('*').eq('id', id).maybeSingle().then(({ data }) => setP(data || null));
  }, [id]);
  useEffect(() => {
    const t = document.title; if (p?.title) document.title = `${p.title} | Abdullah Adel`;
    return () => { document.title = t; };
  }, [p]);
  useEffect(() => {
    if (!zoom) return;
    const k = e => e.key === 'Escape' && setZoom('');
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, [zoom]);

  const embed = p ? videoEmbed(p.video_url) : null;
  const gallery = p?.gallery || [];

  return (
    <>
      <Wires />
      <header className="nav"><Link className="logo" to="/"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l11 20H1z" fill="currentColor" /></svg>Abdullah Adel</Link><Link className="btn nav-cta" to="/#projects">All projects</Link></header>
      <main className="pj">
        {p === null && <div className="cell tall"><span className="cap">404</span><div><h3>Project not found.</h3><Link className="btn" to="/#projects">Back to projects</Link></div></div>}
        {p && (<>
          <p className="cap dim" data-anim="fade">{[p.category, p.year].filter(Boolean).join(' / ')}</p>
          <Split as="h1">{p.title}</Split>
          {p.tech?.length > 0 && <ul className="chips cap" data-anim="fade">{p.tech.map(t => <li key={t}>{t}</li>)}</ul>}
          <p className="row" data-anim="fade">
            {isHttps(p.demo_url) && <a className="btn" href={p.demo_url} target="_blank" rel="noopener noreferrer">Live demo</a>}
            {isHttps(p.github_url) && <a className="btn ghost" href={p.github_url} target="_blank" rel="noopener noreferrer">GitHub</a>}
          </p>
          {p.image_path && <img className="pj-hero" data-anim="up" src={imageUrl(p.image_path)} alt={p.title} />}
          {p.description && <p className="big pj-sec" data-anim="up">{p.description}</p>}
          {embed && <div className="pj-sec" data-anim="up"><span className="cap">Video</span>
            <div className="pj-video"><iframe src={embed} title={`${p.title} video`} loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture; fullscreen" /></div></div>}
          {p.details && <div className="pj-sec" data-anim="up"><span className="cap">Details</span><p className="pj-details">{p.details}</p></div>}
          {gallery.length > 0 && <div className="pj-sec"><span className="cap">Gallery</span>
            <div className="pj-gal">{gallery.map(g => <button key={g} className="pj-thumb" data-anim="cell" onClick={() => setZoom(imageUrl(g))} aria-label="Open image"><img src={imageUrl(g)} alt="" loading="lazy" /></button>)}</div></div>}
          <Link className="btn ghost pj-back" to="/#projects">&larr; Back to projects</Link>
        </>)}
      </main>
      {zoom && <div className="lb" role="dialog" aria-modal="true" aria-label="Image" onClick={() => setZoom('')}><img src={zoom} alt="" /></div>}
      <footer className="foot cap"><span>&copy; {new Date().getFullYear()} Abdullah Adel</span><Link to="/">Home</Link></footer>
    </>
  );
}