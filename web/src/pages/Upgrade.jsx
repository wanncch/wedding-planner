import React, { useEffect, useState } from 'react';
import { supabase, friendlyError } from '../lib/supabase.js';
import { useAuth, useToast } from '../lib/store.jsx';
import { uploadPath } from '../lib/files.js';
import { rp, dMed } from '../lib/format.js';
import { Icon, Field, Area, Seg, Spinner, Pill } from '../components/ui.jsx';
import { PlanBadge, StoredImg } from '../components/Account.jsx';

const PERKS = ['Semua menu tanpa batas', 'Undang pasangan, keluarga & WO', 'Mode hari H & check-in tamu', 'Simpan foto & dokumen'];

export default function Upgrade() {
  const { user, account, reloadAccount } = useAuth();
  const toast = useToast();
  const [plans, setPlans] = useState(null);
  const [st, setSt] = useState({});
  const [mine, setMine] = useState([]);
  const [planId, setPlanId] = useState('premium');
  const [method, setMethod] = useState('qris');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function load() {
    const [p, s, m] = await Promise.all([
      supabase.from('plans').select('*').eq('is_active', true).gt('price', 0).order('sort'),
      supabase.from('app_settings').select('*'),
      supabase.from('payment_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);
    setPlans(p.data || []);
    setSt(Object.fromEntries((s.data || []).map(r => [r.key, r.value])));
    setMine(m.data || []);
    if (p.data && p.data.length && !p.data.some(x => x.id === planId)) setPlanId(p.data[0].id);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { if (st.qris_url === '' && st.bank_accounts) setMethod('transfer'); }, [st.qris_url, st.bank_accounts]);

  const plan = (plans || []).find(p => p.id === planId);
  const pending = mine.find(m => m.status === 'pending');

  function pickFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setFile(f); setErr('');
    setPreview(f.type.startsWith('image/') ? URL.createObjectURL(f) : '');
  }

  async function submit() {
    if (!plan) return;
    if (!file) { setErr('Upload foto / screenshot bukti bayar dulu.'); return; }
    setBusy(true); setErr('');
    try {
      const proof = await uploadPath('payments/' + user.id, file);
      const { error } = await supabase.from('payment_requests').insert({
        plan_id: plan.id, amount: plan.price, method: method === 'qris' ? 'QRIS' : 'Transfer bank', proof_url: proof, note,
      });
      if (error) throw error;
      toast('Konfirmasi terkirim. Premium aktif setelah dicek admin.', 'ok');
      setFile(null); setPreview(''); setNote('');
      await load(); reloadAccount();
    } catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  }

  const back = () => { if (window.history.length > 1) window.history.back(); else window.location.hash = '#/pilih'; };
  const wa = (st.contact_wa || '').replace(/\D/g, '').replace(/^0/, '62');

  return (
    <div className="auth" style={{ alignItems: 'start', paddingTop: 28 }}>
      <div style={{ width: '100%', maxWidth: 560, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="between">
          <button type="button" className="btn2 sm" onClick={back}><Icon name="left" size={15} />Kembali</button>
          {account && <span className="row" style={{ gap: 6 }}><PlanBadge a={account} />{account.days_left !== null && account.days_left !== undefined && account.active && <span className="xs muted">sisa {account.days_left} hari</span>}</span>}
        </div>

        {plans === null ? <Spinner label="Memuat paket…" /> : (
          <>
            <div className="hero" style={{ padding: 22 }}>
              <div className="chipw"><Icon name="crown" size={14} />UPGRADE</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 700, marginTop: 10 }}>{plan ? plan.name : 'Premium'}</div>
              <div className="big" style={{ fontSize: 40, marginTop: 4 }}>{plan ? rp(plan.price) : '–'}</div>
              <div style={{ opacity: .9, marginTop: 4 }}>sekali bayar · {plan ? plan.description : ''}</div>
              <div style={{ display: 'grid', gap: 4, marginTop: 12, fontWeight: 600 }}>{PERKS.map(p => <span key={p}>✓ {p}</span>)}</div>
            </div>

            {plans.length > 1 && (
              <div className="g2">
                {plans.map(p => (
                  <button type="button" key={p.id} className={'plancard' + (p.id === planId ? ' on' : '')} onClick={() => setPlanId(p.id)} aria-pressed={p.id === planId}>
                    <b>{p.name}</b><span className="price">{rp(p.price)}</span><span className="xs muted">{p.description}</span>
                  </button>
                ))}
              </div>
            )}

            {pending ? (
              <div className="g col">
                <div className="row nowrap"><span className="ico"><Icon name="clock" /></span><div><b>Pembayaran sedang dicek admin</b><div className="xs muted">{rp(pending.amount)} · {pending.method} · dikirim {dMed(pending.created_at)}. Biasanya kurang dari 1 jam.</div></div></div>
                {wa && <a className="btn2" href={'https://wa.me/' + wa + '?text=' + encodeURIComponent('Halo admin, saya sudah kirim bukti bayar Wedding Planner (' + (user.email || '') + ').')} target="_blank" rel="noreferrer"><Icon name="wa" size={16} />Tanya admin lewat WA</a>}
              </div>
            ) : (
              <div className="g col">
                <Field label="Bayar lewat">
                  <Seg value={method} onChange={setMethod} items={[{ key: 'qris', label: 'QRIS' }, { key: 'transfer', label: 'Transfer bank' }]} />
                </Field>
                {method === 'qris' ? (
                  st.qris_url ? <div className="col" style={{ alignItems: 'center', gap: 6 }}><StoredImg src={st.qris_url} alt="Kode QRIS" className="qr" /><span className="xs muted">Nominal tepat <b>{plan ? rp(plan.price) : ''}</b></span></div>
                    : <div className="note">QRIS belum tersedia. Pilih transfer bank{wa ? ' atau hubungi admin lewat WA' : ''}.</div>
                ) : (
                  <div className="note" style={{ whiteSpace: 'pre-line' }}>{st.bank_accounts || 'Nomor rekening belum diisi admin.'}{'\n'}Nominal tepat <b>{plan ? rp(plan.price) : ''}</b></div>
                )}
                {st.pay_instructions && <div className="xs muted" style={{ whiteSpace: 'pre-line' }}>{st.pay_instructions}</div>}
                <Field label="Upload bukti bayar" hint="foto / screenshot" error={err}>
                  <label className="up">
                    <span className="thumb">{preview ? <img src={preview} alt="" /> : <Icon name="upload" />}</span>
                    <span className="sm"><b>{file ? file.name : 'Pilih file'}</b><span className="xs muted" style={{ display: 'block' }}>JPG, PNG, atau PDF · maks 10 MB</span></span>
                    <input type="file" accept="image/*,application/pdf" onChange={pickFile} style={{ display: 'none' }} />
                  </label>
                </Field>
                <Field label="Catatan" hint="opsional"><Area value={note} onChange={setNote} rows={2} placeholder="mis. transfer dari rekening a.n. …" /></Field>
                <button type="button" className="btn" onClick={submit} disabled={busy || !plan}>{busy ? 'Mengirim…' : 'Kirim konfirmasi'}</button>
                <div className="xs muted" style={{ textAlign: 'center' }}>Premium aktif setelah dicek admin (biasanya &lt; 1 jam).</div>
              </div>
            )}

            {mine.length > 0 && (
              <div className="g col">
                <div className="h2">Riwayat pembayaran</div>
                {mine.map(m => (
                  <div key={m.id} className="li">
                    <span className="grow"><b>{rp(m.amount)}</b><span className="xs muted" style={{ display: 'block' }}>{m.method || 'manual'} · {dMed(m.created_at)}{m.admin_note ? ' · ' + m.admin_note : ''}</span></span>
                    <Pill cls={m.status === 'approved' ? 'p-ok' : m.status === 'rejected' ? 'p-bad' : 'p-wait'}>{m.status === 'approved' ? 'Disetujui' : m.status === 'rejected' ? 'Ditolak' : 'Dicek'}</Pill>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
