import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const MAX_TRIES = 5, LOCK_MS = 60_000;

export default function AdminLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [tries, setTries] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);

  useEffect(() => {
    const m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex,nofollow'; document.head.append(m);
    const t = document.title; document.title = 'Sign in';
    return () => { m.remove(); document.title = t; };
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (busy || !supabase) return;
    if (Date.now() < lockUntil) return setErr('Too many attempts. Wait a minute and try again.');
    setBusy(true); setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
    let ok = false;
    if (!error) {
      const { data } = await supabase.rpc('is_admin');
      ok = data === true;
      if (!ok) await supabase.auth.signOut(); // valid account but not an admin
    }
    setBusy(false);
    if (ok) return nav('/admin_add', { replace: true });
    const n = tries + 1; setTries(n); setPass('');
    if (n >= MAX_TRIES) { setLockUntil(Date.now() + LOCK_MS); setTries(0); }
    setErr('Invalid email or password.'); // same message for every failure on purpose
  }

  return (
    <main className="adm adm-narrow">
      <p className="cap">Admin</p>
      <h1 className="adm-h">Sign in</h1>
      <form onSubmit={submit} className="adm-form" noValidate>
        <label>Email<input type="email" autoComplete="username" maxLength={254} required value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" autoComplete="current-password" maxLength={128} required value={pass} onChange={e => setPass(e.target.value)} /></label>
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Checking' : 'Sign in'}</button>
        <p className="adm-msg" role="alert">{err}</p>
      </form>
    </main>
  );
}
