import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const BUCKET = 'project-images';

/* Session lives in cookies (SameSite=Strict, Secure on https), split in chunks to stay under the 4KB cookie limit.
   Note: cookies written by browser JS cannot be HttpOnly. Real protection comes from RLS + the CSP in vercel.json. */
const CHUNK = 3000;
const opts = () => `; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Strict${location.protocol === 'https:' ? '; Secure' : ''}`;
const read = n => { const m = document.cookie.split('; ').find(c => c.startsWith(n + '=')); return m ? decodeURIComponent(m.slice(n.length + 1)) : null; };
const wipe = n => { document.cookie = `${n}=; path=/; max-age=0; SameSite=Strict`; };
const cookieStorage = {
  getItem(k) {
    const n = Number(read(`${k}.n`)); if (!n) return null;
    let s = ''; for (let i = 0; i < n; i++) { const p = read(`${k}.${i}`); if (p == null) return null; s += p; }
    return s;
  },
  setItem(k, v) {
    this.removeItem(k);
    const parts = v.match(new RegExp(`.{1,${CHUNK}}`, 'gs')) || [];
    document.cookie = `${k}.n=${parts.length}${opts()}`;
    parts.forEach((p, i) => { document.cookie = `${k}.${i}=${encodeURIComponent(p)}${opts()}`; });
  },
  removeItem(k) { const n = Number(read(`${k}.n`)) || 0; for (let i = 0; i < n; i++) wipe(`${k}.${i}`); wipe(`${k}.n`); },
};

export const configured = Boolean(url && key);
export const supabase = configured
  ? createClient(url, key, { auth: { storage: cookieStorage, storageKey: 'aa-session', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
  : null;

export const imageUrl = path => (supabase && path ? supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : '');
export const isHttps = u => { try { return new URL(String(u).trim()).protocol === 'https:'; } catch { return false; } };