import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Home from './pages/Home';

// Admin code is a separate chunk: it is never downloaded by normal visitors.
const Admin = lazy(() => import('./pages/Admin'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));

/* 'loading' | 'admin' | 'guest'. getUser() asks the server to validate the token, then is_admin() checks the admins table. */
function useAdminStatus() {
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    let alive = true;
    const set = s => alive && setStatus(s);
    (async () => {
      if (!supabase) return set('guest');
      const { data } = await supabase.auth.getUser();
      if (!data?.user) return set('guest');
      const { data: ok } = await supabase.rpc('is_admin');
      set(ok === true ? 'admin' : 'guest');
    })();
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') set('guest'); });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);
  return status;
}

// /admin_add: only for a logged in admin, everyone else goes back to the normal site
function AdminGate() {
  const s = useAdminStatus();
  if (s === 'loading') return null;
  return s === 'admin' ? <Admin /> : <Navigate to="/" replace />;
}
// /admin_add/login: the form, unless you are already logged in
function LoginGate() {
  const s = useAdminStatus();
  if (s === 'loading') return null;
  return s === 'admin' ? <Navigate to="/admin_add" replace /> : <AdminLogin />;
}

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin_add" element={<AdminGate />} />
        <Route path="/admin_add/login" element={<LoginGate />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
