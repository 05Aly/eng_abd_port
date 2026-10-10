import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BUCKET, imageUrl, isHttps, supabase } from '../lib/supabase';
import { videoEmbed } from '../lib/video';

const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_BYTES = 5 * 1024 * 1024, MAX_GALLERY = 10;
const blank = () => ({ title: '', category: '', year: String(new Date().getFullYear()), description: '', details: '', video_url: '', tech: '', github_url: '', demo_url: '', sort_order: 0, published: true });
const toForm = p => ({
  title: p.title, category: p.category || '', year: p.year || '', description: p.description || '', details: p.details || '', video_url: p.video_url || '',
  tech: (p.tech || []).join(', '), github_url: p.github_url || '', demo_url: p.demo_url || '', sort_order: p.sort_order ?? 0, published: p.published,
});
const checkImage = x => (!TYPES[x.type] ? 'Images must be JPG, PNG or WebP.' : x.size > MAX_BYTES ? 'Each image must be 5MB or smaller.' : '');

export default function Admin() {
  const nav = useNavigate();
  const top = useRef(null);
  const [list, setList] = useState([]);
  const [f, setF] = useState(blank());
  const [editing, setEditing] = useState(null);
  const [removeImg, setRemoveImg] = useState(false);
  const [file, setFile] = useState(null);                 // new cover image
  const [preview, setPreview] = useState('');
  const [keep, setKeep] = useState([]);                   // gallery paths already saved and still kept
  const [newG, setNewG] = useState([]);                   // new gallery files: [{ file, url }]
  const [fileKey, setFileKey] = useState(0);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const set = k => e => setF(s => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const load = async () => {
    const { data } = await supabase.from('projects').select('*').order('sort_order').order('created_at', { ascending: false });
    setList(data || []);
  };
  useEffect(() => {
    load();
    const m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex,nofollow'; document.head.append(m);
    const t = document.title; document.title = 'Admin';
    return () => { m.remove(); document.title = t; };
  }, []);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const clearFiles = () => { setFile(null); setPreview(''); newG.forEach(g => URL.revokeObjectURL(g.url)); setNewG([]); setFileKey(k => k + 1); };
  function reset() { setF(blank()); setEditing(null); setRemoveImg(false); setKeep([]); clearFiles(); }
  function startEdit(p) {
    setEditing(p); setF(toForm(p)); setRemoveImg(false); setKeep(p.gallery || []); clearFiles(); setMsg('');
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function pickCover(e) {
    const x = e.target.files?.[0]; setMsg('');
    if (!x) { setFile(null); return setPreview(''); }
    const err = checkImage(x); if (err) { e.target.value = ''; return setMsg(err); }
    setFile(x); setPreview(URL.createObjectURL(x)); setRemoveImg(false);
  }
  function pickGallery(e) {
    const picked = [...(e.target.files || [])]; e.target.value = ''; setMsg('');
    const room = MAX_GALLERY - keep.length - newG.length;
    if (picked.length > room) setMsg(`Gallery is limited to ${MAX_GALLERY} images.`);
    const ok = [];
    for (const x of picked.slice(0, Math.max(room, 0))) { const err = checkImage(x); if (err) { setMsg(err); continue; } ok.push({ file: x, url: URL.createObjectURL(x) }); }
    setNewG(g => [...g, ...ok]);
  }
  const dropNew = i => { URL.revokeObjectURL(newG[i].url); setNewG(g => g.filter((_, j) => j !== i)); };

  async function upload(x) { // random name, extension from the verified MIME type (never from the user's file name)
    const path = `${crypto.randomUUID()}.${TYPES[x.type]}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, x, { contentType: x.type, upsert: false, cacheControl: '31536000' });
    if (error) throw error;
    return path;
  }

  async function submit(e) {
    e.preventDefault(); if (busy) return;
    if (!f.title.trim()) return setMsg('Title is required.');
    if (f.github_url && !isHttps(f.github_url)) return setMsg('GitHub link must start with https://');
    if (f.demo_url && !isHttps(f.demo_url)) return setMsg('Demo link must start with https://');
    if (f.video_url && !videoEmbed(f.video_url)) return setMsg('Video link must be a YouTube or Vimeo link (https).');
    setBusy(true); setMsg('');

    const uploaded = [];
    try {
      const oldCover = editing?.image_path || null;
      let image_path = removeImg ? null : oldCover;
      if (file) { image_path = await upload(file); uploaded.push(image_path); }
      const added = [];
      for (const g of newG) { const path = await upload(g.file); uploaded.push(path); added.push(path); }

      const row = {
        title: f.title.trim(), category: f.category.trim() || null, year: f.year.trim() || null,
        description: f.description.trim() || null, details: f.details.trim() || null, video_url: f.video_url.trim() || null,
        tech: f.tech.split(',').map(s => s.trim()).filter(Boolean).slice(0, 12),
        github_url: f.github_url.trim() || null, demo_url: f.demo_url.trim() || null,
        sort_order: Number(f.sort_order) || 0, published: f.published, image_path, gallery: [...keep, ...added],
      };
      const { error } = editing ? await supabase.from('projects').update(row).eq('id', editing.id) : await supabase.from('projects').insert(row);
      if (error) throw error;

      // saved: delete files that are no longer used
      const gone = [...(oldCover && oldCover !== image_path ? [oldCover] : []), ...(editing?.gallery || []).filter(g => !keep.includes(g))];
      if (gone.length) await supabase.storage.from(BUCKET).remove(gone);
      setMsg(editing ? 'Project updated.' : 'Project added.');
      reset(); load();
    } catch (err) {
      if (uploaded.length) await supabase.storage.from(BUCKET).remove(uploaded); // roll back this attempt's uploads
      setMsg(`Could not save the project.${err?.message ? ' ' + err.message : ''}`);
    }
    setBusy(false);
  }

  async function togglePublish(p) { await supabase.from('projects').update({ published: !p.published }).eq('id', p.id); load(); }
  async function remove(p) {
    if (!confirm(`Delete "${p.title}"?`)) return;
    const { error } = await supabase.from('projects').delete().eq('id', p.id);
    if (error) return setMsg('Delete failed.');
    const files = [p.image_path, ...(p.gallery || [])].filter(Boolean);
    if (files.length) await supabase.storage.from(BUCKET).remove(files);
    if (editing?.id === p.id) reset();
    load();
  }
  async function logout() { await supabase.auth.signOut(); nav('/', { replace: true }); }

  const currentImg = editing?.image_path && !removeImg && !preview ? imageUrl(editing.image_path) : '';

  return (
    <main className="adm">
      <div className="adm-top" ref={top}><div><p className="cap">Admin</p><h1 className="adm-h">{editing ? 'Edit project' : 'Projects'}</h1></div><button className="btn ghost" onClick={logout}>Sign out</button></div>

      <form onSubmit={submit} className="adm-form" noValidate>
        <label>Title<input value={f.title} onChange={set('title')} maxLength={120} required /></label>
        <div className="adm-2"><label>Category<input value={f.category} onChange={set('category')} maxLength={60} placeholder="Full-Stack Web" /></label>
          <label>Year<input value={f.year} onChange={set('year')} maxLength={10} /></label></div>
        <label>Short description (shown on the card)<textarea rows={3} value={f.description} onChange={set('description')} maxLength={2000} /></label>
        <label>Tech (comma separated)<input value={f.tech} onChange={set('tech')} placeholder="Python, Flask, MongoDB" /></label>
        <div className="adm-2"><label>GitHub link<input type="url" value={f.github_url} onChange={set('github_url')} placeholder="https://github.com/..." /></label>
          <label>Live demo link<input type="url" value={f.demo_url} onChange={set('demo_url')} placeholder="https://..." /></label></div>

        {currentImg && <img className="pimg" src={currentImg} alt="Current cover" />}
        <label>{editing?.image_path ? 'Replace cover image (optional)' : 'Cover image'} (JPG, PNG or WebP, max 5MB)
          <input key={'c' + fileKey} type="file" accept="image/jpeg,image/png,image/webp" onChange={pickCover} /></label>
        {preview && <img className="pimg" src={preview} alt="New cover preview" />}
        {editing?.image_path && !file && <label className="adm-check"><input type="checkbox" checked={removeImg} onChange={e => setRemoveImg(e.target.checked)} />Remove current cover image</label>}

        <p className="cap" style={{ color: 'var(--glow)' }}>Project page only</p>
        <label>Detailed description<textarea rows={8} value={f.details} onChange={set('details')} maxLength={10000} />
          <span className="adm-hint">Shown only on the project page. Blank lines make paragraphs.</span></label>
        <label>Video link (YouTube or Vimeo)<input type="url" value={f.video_url} onChange={set('video_url')} placeholder="https://www.youtube.com/watch?v=..." /></label>
        <label>Gallery images (up to {MAX_GALLERY}, you can pick several at once)
          <input key={'g' + fileKey} type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={pickGallery} /></label>
        {(keep.length > 0 || newG.length > 0) && (
          <div className="adm-gal">
            {keep.map(g => <figure key={g}><img src={imageUrl(g)} alt="" /><button type="button" className="adm-x" aria-label="Remove image" onClick={() => setKeep(k => k.filter(x => x !== g))}>x</button></figure>)}
            {newG.map((g, i) => <figure key={g.url}><img src={g.url} alt="" /><button type="button" className="adm-x" aria-label="Remove image" onClick={() => dropNew(i)}>x</button></figure>)}
          </div>)}

        <div className="adm-2"><label>Order (lower shows first)<input type="number" value={f.sort_order} onChange={set('sort_order')} /></label>
          <label className="adm-check"><input type="checkbox" checked={f.published} onChange={set('published')} />Published</label></div>
        <div className="row">
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Saving' : editing ? 'Save changes' : 'Add project'}</button>
          {editing && <button className="btn ghost" type="button" onClick={() => { reset(); setMsg(''); }}>Cancel</button>}
        </div>
        <p className="adm-msg" role="status">{msg}</p>
      </form>

      <h2 className="adm-sub">Existing ({list.length})</h2>
      <ul className="adm-list">{list.map(p => (
        <li key={p.id} className={editing?.id === p.id ? 'is-editing' : ''}>
          {p.image_path ? <img src={imageUrl(p.image_path)} alt="" /> : <span className="adm-noimg" />}
          <div><b>{p.title}</b><span className="cap dim">{[p.category, p.year, p.published ? 'Published' : 'Hidden'].filter(Boolean).join(' / ')}</span></div>
          <button className="btn ghost" onClick={() => startEdit(p)}>Edit</button>
          <button className="btn ghost" onClick={() => togglePublish(p)}>{p.published ? 'Hide' : 'Show'}</button>
          <button className="btn ghost" onClick={() => remove(p)}>Delete</button>
        </li>))}</ul>
    </main>
  );
}