import { useEffect, useRef, useState } from 'react';
import { supabase, imageUrl, isHttps } from '../lib/supabase';
import { reduceMotion, useActiveSection, useReveal, useTyped } from '../lib/hooks';
import Split from '../components/Split';
import Count from '../components/Count';
import Wires from '../components/Wires';

const ROLES = ['Mechatronics Eng. Student', 'AI & ML Engineer', 'Backend Developer', 'Embedded Systems Dev', 'Full-Stack Builder'];
const SKILLS = ['Python', 'C / C++', 'Flask', 'MongoDB', 'YOLO', 'LLaMA 3', 'Arduino', 'Gemini API', 'Streamlit', 'Git / GitHub'];
const ARSENAL = [
  ['Languages', ['Python', 'C / C++', 'JavaScript']],
  ['Backend and databases', ['Flask', 'MongoDB', 'SQLite', 'JWT']],
  ['AI and machine learning', ['YOLO', 'LLaMA 3', 'NLLB-200', 'Gemini API', 'AI Agents', 'HuggingFace']],
  ['Embedded systems', ['Arduino', 'Circuit Design']],
  ['Development tools', ['Git / GitHub', 'Streamlit', 'Ollama']],
];
const NAV = [['about', 'Profile'], ['arsenal', 'Arsenal'], ['projects', 'Projects'], ['journey', 'Journey'], ['contact', 'Contact']];

export default function Home() {
  const [projects, setProjects] = useState(null); // null = loading
  const [menu, setMenu] = useState(false);
  const role = useTyped(ROLES);
  const active = useActiveSection(NAV.map(n => n[0]));
  const marq = useRef(null);
  useReveal(projects);

  // Projects come from Supabase (RLS only returns published rows to visitors)
  useEffect(() => {
    if (!supabase) return setProjects([]);
    supabase.from('projects').select('*').eq('published', true)
      .order('sort_order', { ascending: true }).order('created_at', { ascending: false })
      .then(({ data }) => setProjects(data || []));
  }, []);

  useEffect(() => { document.body.classList.toggle('menu-open', menu); return () => document.body.classList.remove('menu-open'); }, [menu]);

  // Marquee slides with scroll and skews with scroll speed
  useEffect(() => {
    if (reduceMotion()) return;
    let last = scrollY, tick = false;
    const frame = () => {
      const y = scrollY, v = Math.max(-30, Math.min(30, y - last)); last = y;
      if (marq.current) marq.current.style.transform = `translate3d(${-(y * .6) % 1400}px,0,0) skewX(${(-v * .35).toFixed(1)}deg)`;
      tick = false;
    };
    const onScroll = () => { if (!tick) { tick = true; requestAnimationFrame(frame); } };
    addEventListener('scroll', onScroll, { passive: true }); frame();
    return () => removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <Wires />
      <a className="skip" href="#main">Skip to content</a>
      <header className="nav">
        <a className="logo" href="#home" aria-label="Abdullah Adel, home"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l11 20H1z" fill="currentColor" /></svg>Abdullah Adel</a>
        <nav id="menu" aria-label="Main">{NAV.map(([id, label]) => <a key={id} href={'#' + id} className={active === id ? 'on' : ''} onClick={() => setMenu(false)}>{label}</a>)}</nav>
        <a className="btn nav-cta" href="mailto:engabdullah3334@gmail.com">Email me</a>
        <button className="burger" aria-label="Toggle menu" aria-expanded={menu} aria-controls="menu" onClick={() => setMenu(m => !m)}>Menu</button>
      </header>

      <main id="main">
        <section className="hero" id="home">
          <div className="wrap hero-in">
            <p className="cap" data-anim="fade">Mechatronics / AI / Software</p>
            <Split as="h1">I build intelligent systems.</Split>
            <p className="role" data-anim="fade"><span>Current mode</span><b>{role}</b><i className="caret" /></p>
            <p className="lead" data-anim="fade">I connect intelligent software with the physical world through AI systems, full-stack products and embedded engineering.</p>
            <div className="row" data-anim="fade"><a className="btn" href="#projects">Explore projects</a><a className="btn ghost" href="#contact">Start a conversation</a></div>
          </div>
          <div className="hero-foot cap"><span>Cairo, Egypt</span><span>Available for opportunities</span><a href="#about">Scroll</a></div>
        </section>

        <div className="marq" aria-hidden="true"><div ref={marq}>{[...SKILLS, ...SKILLS.slice(0, 6)].map((s, i) => <span key={i}>{s}</span>)}</div></div>

        <section className="sec" id="about"><div className="wrap">
          <div className="head"><span className="cap">01</span><Split>From the first line of code to the physical world.</Split></div>
          <div className="cols">
            <div className="stack" data-anim="up">
              <p className="big">Ambitious Mechatronics Engineering student with hands-on experience building full-stack applications, AI-powered systems and embedded hardware projects.</p>
              <p className="dim">Passionate about bridging intelligent software with the physical world, one system at a time.</p>
              <ul className="chips cap">{['Artificial Intelligence', 'Machine Learning', 'Backend', 'Full-Stack', 'Embedded Systems', 'Robotics', 'Hardware-Software Integration'].map(t => <li key={t}>{t}</li>)}</ul>
            </div>
            <div className="grid2">
              {[[10, 'Projects built'], [4, 'AI systems'], [3, 'Years coding']].map(([n, l]) => <div className="cell" data-anim="cell" key={l}><Count to={n} /><span className="cap">{l}</span></div>)}
              <div className="cell" data-anim="cell"><b>B2</b><span className="cap">English level</span></div>
            </div>
          </div>
        </div></section>

        <section className="sec" id="arsenal"><div className="wrap">
          <div className="head"><span className="cap">02</span><Split>Tools I use to build.</Split></div>
          <div className="rows">{ARSENAL.map(([h, items]) => <div className="trow" data-anim="line" key={h}><h3>{h}</h3><ul>{items.map(i => <li key={i}>{i}</li>)}</ul></div>)}</div>
        </div></section>

        <section className="sec" id="projects"><div className="wrap">
          <div className="head"><span className="cap">03</span><Split>Selected projects.</Split></div>
          <div className="grid2 plist">
            {projects && projects.length > 0 ? projects.map(p => (
              <article className="cell tall" data-anim="cell" key={p.id}>
                {p.image_path && <img className="pimg" src={imageUrl(p.image_path)} alt="" loading="lazy" />}
                <span className="cap">{[p.category, p.year].filter(Boolean).join(' / ')}</span>
                <div>
                  <h3>{p.title}</h3>
                  {p.description && <p className="dim">{p.description}</p>}
                  {p.tech?.length > 0 && <ul className="chips cap">{p.tech.map(t => <li key={t}>{t}</li>)}</ul>}
                  <p className="row">
                    {isHttps(p.demo_url) && <a className="btn" href={p.demo_url} target="_blank" rel="noopener noreferrer">Live demo</a>}
                    {isHttps(p.github_url) && <a className="btn ghost" href={p.github_url} target="_blank" rel="noopener noreferrer">GitHub</a>}
                  </p>
                </div>
              </article>
            )) : projects && <div className="cell tall" data-anim="cell"><span className="cap">Archive</span><h3>More projects are taking shape.</h3></div>}
          </div>
        </div></section>

        <section className="sec" id="journey"><div className="wrap">
          <div className="head"><span className="cap">04</span><Split>Building the foundations.</Split></div>
          <div className="cols">
            <article className="cell tall" data-anim="cell"><span className="cap">Class of 2030 / Currently enrolled</span><div><h3>Helwan National University</h3><p className="dim">B.Sc. Mechatronics Engineering, Cairo, Egypt. Freshman, 1st year.</p><ul className="chips cap"><li>Robotics with AI</li><li>Circuit Analysis</li><li>Digital Logic</li></ul></div></article>
            <div className="stack">
              <div className="cell" data-anim="cell"><h3>Robotics with AI</h3><p className="cap dim">Smart Technology / Engineers Syndicate</p></div>
              <div className="cell" data-anim="cell"><h3>English, level B2</h3><p className="cap dim">Upper-Intermediate / Actively improving</p></div>
              <div className="cell" data-anim="cell"><h3>High school grade</h3><p className="cap dim">87% / High</p></div>
              <div className="cell langs" data-anim="cell">
                {[['Arabic', 'Native', 1], ['English', 'B2', .72], ['Japanese', 'Beginner, self-studying', .2]].map(([n, l, p]) => <div key={n}><span>{n} <em className="cap">{l}</em></span><i style={{ '--p': p }} /></div>)}
              </div>
            </div>
          </div>
        </div></section>

        <section className="sec" id="contact"><div className="wrap">
          <div className="head"><span className="cap">05</span><Split>Have a challenge worth solving?</Split></div>
          <p className="big narrow" data-anim="up">Open to internships, collaborations and opportunities in AI, software and mechatronics.</p>
          <div className="links">
            <a href="mailto:engabdullah3334@gmail.com" data-anim="line"><span className="cap">Email</span><span>engabdullah3334@gmail.com</span><span aria-hidden="true">&rarr;</span></a>
            <a href="tel:+201014860948" data-anim="line"><span className="cap">Phone</span><span dir="ltr">+20 101 486 0948</span><span aria-hidden="true">&rarr;</span></a>
            <a href="https://github.com/abdullahadel" target="_blank" rel="noopener noreferrer" data-anim="line"><span className="cap">GitHub</span><span>github.com/abdullahadel</span><span aria-hidden="true">&rarr;</span></a>
            <a href="https://linkedin.com/in/abdullahadel" target="_blank" rel="noopener noreferrer" data-anim="line"><span className="cap">LinkedIn</span><span>linkedin.com/in/abdullahadel</span><span aria-hidden="true">&rarr;</span></a>
          </div>
        </div></section>
      </main>
      <footer className="foot cap"><span>&copy; {new Date().getFullYear()} Abdullah Adel</span><span>Designed to think across systems</span><a href="#home">Back to top</a></footer>
    </>
  );
}
