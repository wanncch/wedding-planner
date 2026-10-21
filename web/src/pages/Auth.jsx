import React, { useState } from 'react';
import { supabase, friendlyError } from '../lib/supabase.js';
import { useAuth } from '../lib/store.jsx';
import { go } from '../lib/nav.js';
import { Icon, Field, Text } from '../components/ui.jsx';

function Brand() {
  return (
    <div className="brand" style={{ padding: 0 }}>
      <span className="logo" style={{ width: 48, height: 48, borderRadius: 16 }}><Icon name="rings" size={26} /></span>
      <div><div className="bn" style={{ fontSize: 23 }}>Wedding Planner</div><div className="by">by Wanncch</div></div>
    </div>
  );
}

function afterLogin() {
  let tok = null;
  try { tok = localStorage.getItem('wp-pending-invite'); } catch (e) { /* abaikan */ }
  if (tok) go('undangan/' + tok);
  else {
    let cur = null;
    try { cur = localStorage.getItem('wp-current'); } catch (e) { /* abaikan */ }
    go(cur ? 'w/' + cur + '/beranda' : 'pilih');
  }
}

export default function AuthPage({ mode: initial = 'masuk', note }) {
  const [mode, setMode] = useState(initial);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [show, setShow] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(''); setInfo('');
    const em = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { setErr('Format email belum benar.'); return; }
    if (mode !== 'lupa' && pass.length < 8) { setErr('Kata sandi minimal 8 karakter.'); return; }
    if (mode === 'daftar' && name.trim().length < 2) { setErr('Isi nama panggilanmu.'); return; }
    setBusy(true);
    try {
      if (mode === 'masuk') {
        const { error } = await supabase.auth.signInWithPassword({ email: em, password: pass });
        if (error) throw error;
        afterLogin();
      } else if (mode === 'daftar') {
        const { data, error } = await supabase.auth.signUp({
          email: em, password: pass,
          options: { data: { display_name: name.trim() }, emailRedirectTo: window.location.origin + '/' },
        });
        if (error) throw error;
        if (data.session) afterLogin();
        else { setInfo('Akun dibuat. Kami kirim link konfirmasi ke ' + em + '. Buka email, klik link-nya, lalu masuk di sini.'); setMode('masuk'); }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(em, { redirectTo: window.location.origin + '/' });
        if (error) throw error;
        setInfo('Link atur ulang kata sandi sudah dikirim ke ' + em + '. Cek juga folder spam.');
      }
    } catch (e2) {
      setErr(friendlyError(e2));
    } finally { setBusy(false); }
  }

  return (
    <div className="auth">
      <form className="g authcard" onSubmit={submit} noValidate>
        <Brand />
        <div>
          <div className="h1" style={{ fontSize: 28 }}>{mode === 'masuk' ? 'Masuk' : mode === 'daftar' ? 'Buat akun' : 'Lupa kata sandi'}</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.5 }}>
            {note || (mode === 'daftar' ? 'Satu akun bisa dipakai berdua dengan pasangan dan keluarga.' : mode === 'lupa' ? 'Masukkan email akunmu, kami kirim link untuk membuat kata sandi baru.' : 'Rencanakan pernikahan berdua, dari persiapan sampai hari H.')}
          </div>
        </div>
        {mode === 'daftar' && <Field label="Nama panggilan"><Text value={name} onChange={setName} placeholder="mis. Rina" autoComplete="nickname" /></Field>}
        <Field label="Email"><Text type="email" value={email} onChange={setEmail} placeholder="nama@email.com" autoComplete="email" inputMode="email" /></Field>
        {mode !== 'lupa' && (
          <Field label="Kata sandi" hint={mode === 'daftar' ? 'minimal 8 karakter' : ''}>
            <div className="inp money" style={{ paddingRight: 6 }}>
              <input type={show ? 'text' : 'password'} value={pass} onChange={(e) => setPass(e.target.value)} autoComplete={mode === 'daftar' ? 'new-password' : 'current-password'} />
              <button type="button" className="ibtn" style={{ border: 0, background: 'none' }} onClick={() => setShow(!show)} aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}><Icon name={show ? 'eyeoff' : 'eye'} /></button>
            </div>
          </Field>
        )}
        {err && <div className="note" style={{ background: '#F6D9D4', color: '#8E3A30' }} role="alert">{err}</div>}
        {info && <div className="note" style={{ background: '#D7EADF', color: '#2F5A43' }}>{info}</div>}
        <button type="submit" className="btn" disabled={busy} style={{ minHeight: 46 }}>
          {busy ? 'Sebentar…' : mode === 'masuk' ? 'Masuk' : mode === 'daftar' ? 'Buat akun' : 'Kirim link'}
        </button>
        <div className="between sm">
          {mode === 'masuk' ? (
            <>
              <button type="button" className="lnk" onClick={() => { setMode('daftar'); setErr(''); setInfo(''); }}>Belum punya akun? Daftar</button>
              <button type="button" className="lnk" onClick={() => { setMode('lupa'); setErr(''); setInfo(''); }}>Lupa kata sandi</button>
            </>
          ) : (
            <button type="button" className="lnk" onClick={() => { setMode('masuk'); setErr(''); }}>‹ Kembali ke masuk</button>
          )}
        </div>
      </form>
    </div>
  );
}

export function ResetPassword() {
  const { setRecovery } = useAuth();
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function submit(e) {
    e.preventDefault();
    if (pass.length < 8) { setErr('Kata sandi minimal 8 karakter.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pass });
    setBusy(false);
    if (error) { setErr(friendlyError(error)); return; }
    setRecovery(false);
    go('pilih');
  }
  return (
    <div className="auth">
      <form className="g authcard" onSubmit={submit}>
        <Brand />
        <div className="h1" style={{ fontSize: 26 }}>Buat kata sandi baru</div>
        <Field label="Kata sandi baru" hint="minimal 8 karakter"><Text type="password" value={pass} onChange={setPass} autoComplete="new-password" /></Field>
        {err && <div className="note" style={{ background: '#F6D9D4', color: '#8E3A30' }}>{err}</div>}
        <button type="submit" className="btn" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan kata sandi'}</button>
      </form>
    </div>
  );
}
