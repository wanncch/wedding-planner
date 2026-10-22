import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, friendlyError, withRetry } from './supabase.js';
import { uid } from './format.js';

export const TABLES = ['events', 'tasks', 'vendors', 'budget_categories', 'budget_items', 'payments', 'gift_categories',
  'gift_items', 'guests', 'rundown_items', 'documents', 'reminders', 'notes', 'selfprep'];
const ORDER = { events: 'sort', tasks: 'sort', vendors: 'sort', budget_categories: 'sort', budget_items: 'sort', payments: 'sort',
  gift_categories: 'sort', gift_items: 'sort', guests: 'created_at', rundown_items: 'start_time', documents: 'sort',
  reminders: 'due_date', notes: 'sort', selfprep: 'sort' };
const REALTIME = ['guests', 'rundown_items', 'tasks'];
// Baris anak yang ikut terhapus di database (on delete cascade)
const CASCADE = { gift_categories: ['gift_items', 'category_id'], budget_items: ['payments', 'item_id'], events: ['rundown_items', 'event_id'] };

/* ------------------------------------------------------------------ */
/* Toast                                                               */
/* ------------------------------------------------------------------ */
const ToastCtx = createContext(null);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((msg, type = 'info', action) => {
    const id = Math.random();
    setItems(xs => [...xs, { id, msg, type, action }]);
    setTimeout(() => setItems(xs => xs.filter(x => x.id !== id)), type === 'error' ? 6000 : 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map(t => (
          <div key={t.id} className={'toast t-' + t.type}>
            <span>{t.msg}</span>
            {t.action && <button type="button" onClick={() => { t.action.fn(); setItems(xs => xs.filter(x => x.id !== t.id)); }}>{t.action.label}</button>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ------------------------------------------------------------------ */
/* Sesi login                                                          */
/* ------------------------------------------------------------------ */
const AuthCtx = createContext(null);
export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [recovery, setRecovery] = useState(false);
  const [account, setAccount] = useState(null);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => { if (alive) setSession(data.session || null); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      setSession(s || null);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session) { setProfile(null); return; }
    supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => setProfile(data || { id: session.user.id, display_name: session.user.email, email: session.user.email }));
  }, [session && session.user.id]);

  const reloadAccount = useCallback(async () => {
    if (!session) { setAccount(null); return null; }
    const { data, error } = await supabase.rpc('my_account');
    const a = error ? { active: true, unknown: true } : (data || { active: true, unknown: true });
    setAccount(a);
    return a;
  }, [session && session.user.id]);
  useEffect(() => { reloadAccount(); }, [reloadAccount]);

  const value = useMemo(() => ({ session, user: session && session.user, profile, setProfile, recovery, setRecovery, account, reloadAccount }),
    [session, profile, recovery, account, reloadAccount]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);

/* ------------------------------------------------------------------ */
/* Data satu pernikahan                                                */
/* ------------------------------------------------------------------ */
const WedCtx = createContext(null);
const cacheKey = (wid) => 'wp-cache-v2-' + wid;

function readCache(wid) {
  try { const s = localStorage.getItem(cacheKey(wid)); return s ? JSON.parse(s) : null; } catch (e) { return null; }
}
function writeCache(wid, data) {
  try { localStorage.setItem(cacheKey(wid), JSON.stringify(data)); } catch (e) { /* penuh / mode privat */ }
}

export async function fetchAll(wid) {
  const reqs = [
    supabase.from('weddings').select('*').eq('id', wid).single(),
    supabase.from('wedding_members').select('*').eq('wedding_id', wid),
    supabase.from('profiles').select('id,display_name,email'),
    supabase.from('wedding_invites').select('*').eq('wedding_id', wid).order('created_at'),
    ...TABLES.map(t => supabase.from(t).select('*').eq('wedding_id', wid).order(ORDER[t], { ascending: true, nullsFirst: false })),
    supabase.rpc('wedding_active', { w: wid }),
  ];
  const res = await Promise.all(reqs.map(q => withRetry(() => q)));
  const out = { wedding: res[0].data, members: res[1].data || [], profiles: res[2].data || [], invites: res[3].data || [] };
  TABLES.forEach((t, i) => { out[t] = res[4 + i].data || []; });
  out.active = res[4 + TABLES.length].data !== false;
  return out;
}

export function WeddingProvider({ wid, children }) {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(() => readCache(wid));
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(0);
  const [syncedAt, setSyncedAt] = useState(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  const commit = useCallback((fn) => {
    setData(prev => {
      const next = fn(prev);
      dataRef.current = next;
      writeCache(wid, next);
      return next;
    });
  }, [wid]);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const d = await fetchAll(wid);
      if (!d.wedding) throw new Error('Pernikahan tidak ditemukan atau kamu sudah tidak punya akses.');
      dataRef.current = d; setData(d); writeCache(wid, d); setSyncedAt(new Date());
    } catch (e) {
      setError(friendlyError(e));
    } finally { setLoading(false); }
  }, [wid]);

  useEffect(() => { reload(); }, [reload]);

  // Muat ulang saat tab aktif lagi setelah lama ditinggal
  useEffect(() => {
    let hiddenAt = 0;
    const onVis = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > 120000) reload();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [reload]);

  // Realtime untuk check-in, rundown live, dan tugas
  useEffect(() => {
    if (!supabase.channel) return undefined;
    const ch = supabase.channel('w-' + wid);
    REALTIME.forEach(t => {
      ch.on('postgres_changes', { event: '*', schema: 'public', table: t, filter: 'wedding_id=eq.' + wid }, (p) => {
        commit(prev => {
          if (!prev) return prev;
          const list = prev[t] || [];
          if (p.eventType === 'DELETE') return { ...prev, [t]: list.filter(r => r.id !== p.old.id) };
          const row = p.new;
          const exists = list.some(r => r.id === row.id);
          return { ...prev, [t]: exists ? list.map(r => (r.id === row.id ? { ...r, ...row } : r)) : [...list, row] };
        });
      });
    });
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [wid, commit]);

  const track = useCallback(async (fn) => {
    setPending(n => n + 1);
    try { return await fn(); } finally { setPending(n => n - 1); setSyncedAt(new Date()); }
  }, []);

  const add = useCallback(async (table, row) => {
    const rec = { id: uid(), wedding_id: wid, created_at: new Date().toISOString(), ...row };
    commit(prev => ({ ...prev, [table]: [...prev[table], rec] }));
    try {
      const res = await track(() => withRetry(() => supabase.from(table).insert(rec).select().single()));
      commit(prev => ({ ...prev, [table]: prev[table].map(r => (r.id === rec.id ? res.data : r)) }));
      return res.data;
    } catch (e) {
      commit(prev => ({ ...prev, [table]: prev[table].filter(r => r.id !== rec.id) }));
      toast(friendlyError(e), 'error');
      throw e;
    }
  }, [wid, commit, track, toast]);

  const addMany = useCallback(async (table, rows) => {
    if (!rows.length) return [];
    const recs = rows.map(r => ({ id: uid(), wedding_id: wid, created_at: new Date().toISOString(), ...r }));
    const ids = new Set(recs.map(r => r.id));
    commit(prev => ({ ...prev, [table]: [...prev[table], ...recs] }));
    try {
      const res = await track(() => withRetry(() => supabase.from(table).insert(recs).select()));
      const byId = Object.fromEntries(res.data.map(r => [r.id, r]));
      commit(prev => ({ ...prev, [table]: prev[table].map(r => byId[r.id] || r) }));
      return res.data;
    } catch (e) {
      commit(prev => ({ ...prev, [table]: prev[table].filter(r => !ids.has(r.id)) }));
      toast(friendlyError(e), 'error');
      throw e;
    }
  }, [wid, commit, track, toast]);

  const save = useCallback(async (table, id, patch) => {
    if (table === 'weddings') {
      const before = dataRef.current.wedding;
      commit(prev => ({ ...prev, wedding: { ...prev.wedding, ...patch } }));
      try {
        await track(() => withRetry(() => supabase.from('weddings').update(patch).eq('id', id)));
      } catch (e) {
        commit(prev => ({ ...prev, wedding: before }));
        toast(friendlyError(e), 'error'); throw e;
      }
      return;
    }
    const before = (dataRef.current[table] || []).find(r => r.id === id);
    commit(prev => ({ ...prev, [table]: prev[table].map(r => (r.id === id ? { ...r, ...patch } : r)) }));
    try {
      await track(() => withRetry(() => supabase.from(table).update(patch).eq('id', id)));
    } catch (e) {
      if (before) commit(prev => ({ ...prev, [table]: prev[table].map(r => (r.id === id ? before : r)) }));
      toast(friendlyError(e), 'error'); throw e;
    }
  }, [commit, track, toast]);

  const del = useCallback(async (table, id, opts = {}) => {
    const list = dataRef.current[table] || [];
    const before = list.find(r => r.id === id);
    const casc = CASCADE[table];
    const hadKids = casc ? (dataRef.current[casc[0]] || []).some(r => r[casc[1]] === id) : false;
    commit(prev => {
      const next = { ...prev, [table]: prev[table].filter(r => r.id !== id) };
      if (casc) next[casc[0]] = prev[casc[0]].filter(r => r[casc[1]] !== id);
      if (table === 'vendors') next.budget_items = prev.budget_items.map(r => (r.vendor_id === id ? { ...r, vendor_id: null } : r));
      return next;
    });
    try {
      await track(() => withRetry(() => supabase.from(table).delete().eq('id', id)));
      if (!opts.silent && !hadKids && before) {
        toast('Dihapus.', 'info', {
          label: 'Urungkan',
          fn: async () => {
            const { created_at, updated_at, ...rest } = before;
            commit(prev => ({ ...prev, [table]: [...prev[table], before] }));
            const r = await supabase.from(table).insert(rest);
            if (r.error) { toast(friendlyError(r.error), 'error'); commit(prev => ({ ...prev, [table]: prev[table].filter(x => x.id !== id) })); }
          }
        });
      }
    } catch (e) {
      if (before) commit(prev => ({ ...prev, [table]: [...prev[table], before] }));
      toast(friendlyError(e), 'error'); throw e;
    }
  }, [commit, track, toast]);

  const rpc = useCallback(async (fn, args) => {
    const res = await track(() => withRetry(() => supabase.rpc(fn, args)));
    return res.data;
  }, [track]);

  const value = useMemo(() => {
    if (!data || !data.wedding) return { loading, error, reload, data: null };
    const me = data.members.find(m => m.user_id === (user && user.id));
    const role = me ? me.role : 'viewer';
    const people = data.members.map(m => {
      const p = data.profiles.find(x => x.id === m.user_id) || {};
      return { ...m, name: m.label || p.display_name || p.email || 'Anggota', email: p.email };
    });
    const active = data.active !== false;
    return { loading, error, reload, data, wid, role, active, canEdit: role !== 'viewer' && active, isOwner: role === 'owner', me, people,
      add, addMany, save, del, rpc, commit, pending, syncedAt };
  }, [data, loading, error, reload, user, wid, add, addMany, save, del, rpc, commit, pending, syncedAt]);

  return <WedCtx.Provider value={value}>{children}</WedCtx.Provider>;
}
export const useW = () => useContext(WedCtx);
