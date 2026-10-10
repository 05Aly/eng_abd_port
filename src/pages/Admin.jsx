import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BUCKET, imageUrl, isHttps, supabase } from '../lib/supabase';

const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_BYTES = 5 * 1024 * 1024;
const blank = () => ({ title: '', category: '', year: String(new Date().getFullYear()), description: '', tech: '', github_url: '', demo_url: '', sort_order: 0, published: true });
const toForm = p => ({
  title: p.title, category: p.category || '', year: p.year || '', description: p.description || '', tech: (p.tech || []).join(', '),
  github_url: p.github_url || '', demo_url: p.demo_url || '', sort_order: p.sort_order ?? 0, published: p.published,
});

export default function Admin() {
  const nav = useNavigate();
  const top = useRef(null);
  const [list, setList] = useState([]);
  const [f, setF] = useState(blank());
  const [editing, setEditing] = useState(null);   // the project being edited, or null when adding
  const [removeImg, setRemoveImg] = useState(false);
  const [file, setFile] = useState(null);
  const [fileKey, setFileKey] = useState(0);      // changing it clears the file input
  const [preview, setPreview] = useState('');
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

  const clearImage = () => { setFile(null); setPreview(''); setFileKey(k => k + 1); };
  function reset() { setF(blank()); setEditing(null); setRemoveImg(false); clearImage(); }

  function startEdit(p) {
    setEditing(p); setF(toForm(p)); setRemoveImg(false); clearImage(); setMsg('');
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function pick(e) {
    const x = e.target.files?.[0]; setMsg('');
    if (!x) return clearImage();
    if (!TYPES[x.type]) { clearImage(); return setMsg('Image must be JPG, PNG or WebP.'); }
    if (x.size > MAX_BYTES) { clearImage(); return setMsg('Image must be 5MB or smaller.'); }
    setFile(x); setPreview(URL.createObjectURL(x)); setRemoveImg(false);
  }

  async function submit(e) {
    e.preventDefault(); if (busy) return;
    if (!f.title.trim()) return setMsg('Title is required.');
    if (f.github_url && !isHttps(f.github_url)) return setMsg('GitHub link must start with https://');
    if (f.demo_url && !isHttps(f.demo_url)) return setMsg('Demo link must start with https://');
    setBusy(true); setMsg('');

    const oldPath = editing?.image_path || null;
    let image_path = removeImg ? null : oldPath;
    let uploaded = null;
    if (file) { // random file name, extension from the verified MIME type (never from the user's file name)
      uploaded = `${crypto.randomUUID()}.${TYPES[file.type]}`;
      const { error } = await supabase.storage.from(BUCKET).upload(uploaded, file, { contentType: file.type, upsert: false, cacheControl: '31536000' });
      if (error) { setBusy(false); return setMsg('Image upload failed.'); }
      image_path = uploaded;
    }
    const row = {
      title: f.title.trim(), category: f.category.trim() || null, year: f.year.trim() || null, description: f.description.trim() || null,
      tech: f.tech.split(',').map(s => s.trim()).filter(Boolean).slice(0, 12),
      github_url: f.github_url.trim() || null, demo_url: f.demo_url.trim() || null,
      sort_order: Number(f.sort_order) || 0, published: f.published, image_path,
    };
    const { error } = editing
      ? await supabase.from('projects').update(row).eq('id', editing.id)
      : await supabase.from('projects').insert(row);
    if (error) { if (uploaded) await supabase.storage.from(BUCKET).remove([uploaded]); setBusy(false); return setMsg('Could not save the project.'); }

    if (oldPath && oldPath !== image_path) await supabase.storage.from(BUCKET).remove([oldPath]); // old image replaced or removed
    setMsg(editing ? 'Project updated.' : 'Project added.');
    reset(); setBusy(false); load();
  }

  async function togglePublish(p) {
    await supabase.from('projects').update({ published: !p.published }).eq('id', p.id); load();
  }
  async function remove(p) {
    if (!confirm(`Delete "${p.title}"?`)) return;
    const { error } = await supabase.from('projects').delete().eq('id', p.id);
    if (error) return setMsg('Delete failed.');
    if (p.image_path) await supabase.storage.from(BUCKET).remove([p.image_path]);
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
        <label>Description<textarea rows={4} value={f.description} onChange={set('description')} maxLength={2000} /></label>
        <label>Tech (comma separated)<input value={f.tech} onChange={set('tech')} placeholder="Python, Flask, MongoDB" /></label>
        <div className="adm-2"><label>GitHub link<input type="url" value={f.github_url} onChange={set('github_url')} placeholder="https://github.com/..." /></label>
          <label>Live demo link<input type="url" value={f.demo_url} onChange={set('demo_url')} placeholder="https://..." /></label></div>

        {currentImg && <img className="pimg" src={currentImg} alt="Current project" />}
        <label>{editing?.image_path ? 'Replace image (optional)' : 'Project image'} (JPG, PNG or WebP, max 5MB)
          <input key={fileKey} type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} /></label>
        {preview && <img className="pimg" src={preview} alt="New image preview" />}
        {editing?.image_path && !file && <label className="adm-check"><input type="checkbox" checked={removeImg} onChange={e => setRemoveImg(e.target.checked)} />Remove current image</label>}

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
