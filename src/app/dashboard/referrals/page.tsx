'use client';

import { useState, useEffect } from 'react';
import { useData } from '@/lib/data/data-context';
import TerminalPanel from '@/components/terminal-panel';
import { useIsMobile } from '@/hooks/use-is-mobile';

export default function ReferralsPage() {
  const { repo, isAnonymous } = useData();
  const isMobile = useIsMobile();
  const [referralCode, setReferralCode] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [referralCount, setReferralCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [focusedPanel, setFocusedPanel] = useState<string>('code');

  async function loadData() {
    const [code, count] = await Promise.all([
      repo.getReferralCode(),
      repo.getReferralCount(),
    ]);
    setReferralCode(code ?? '');
    setReferralCount(count);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function handleSave() {
    const trimmed = editCode.trim();
    if (!trimmed || trimmed === referralCode) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setSaveError('');
    const result = await repo.setReferralCode(trimmed);
    setSaving(false);
    if (result.success) {
      setReferralCode(trimmed);
      setEditing(false);
    } else {
      setSaveError(result.error ?? 'Failed to save');
    }
  }

  function handleCopy() {
    const link = `${window.location.origin}/signup?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full font-mono text-xs text-gray-600 tracking-wider">
        LOADING DATA...
      </div>
    );
  }

  if (isAnonymous) {
    return (
      <div className="flex items-center justify-center h-full font-mono text-sm text-gray-500 tracking-wider">
        <div className="text-center space-y-2">
          <p>REFERRALS REQUIRE AN ACCOUNT</p>
          <a href="/signup" className="text-xs underline" style={{ color: '#ff8c00' }}>CREATE ACCOUNT</a>
        </div>
      </div>
    );
  }

  const referralLink = referralCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/signup?ref=${referralCode}`
    : '';

  return (
    <div className="relative w-full h-full" style={{ minHeight: 'calc(100vh - 48px)' }}>
      {/* ── Top status bar ── */}
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5 font-mono text-[13px] border-b"
        style={{ background: '#0a0a0a', borderColor: '#222', color: '#888' }}
      >
        <span style={{ color: '#ff8c00' }}>REFERRALS</span>
        <span>CODE: <span style={{ color: '#c586c0' }}>{referralCode || '—'}</span></span>
        <span>REFERRED: <span style={{ color: '#4ec9b0' }}>{referralCount}</span></span>
        <span style={{ color: '#555' }}>{new Date().toLocaleDateString()}</span>
      </div>

      {/* ── Panels ── */}
      <div className={isMobile ? 'p-3' : 'relative'} style={isMobile ? undefined : { height: 'calc(100vh - 80px)' }}>

        <TerminalPanel
          title="YOUR REFERRAL"
          defaultPosition={{ x: 16, y: 16 }}
          defaultSize={{ width: 600, height: 220 }}
          accentColor="#c586c0"
          zIndex={focusedPanel === 'code' ? 10 : 1}
          onFocus={() => setFocusedPanel('code')}
          isMobile={isMobile}
        >
          <div className="p-4 font-mono text-[13px] space-y-4">
            {/* Referral code */}
            <div>
              <span className="text-gray-500">REFERRAL CODE</span>
              {editing ? (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={editCode}
                    onChange={(e) => { setEditCode(e.target.value); setSaveError(''); }}
                    className="flex-1 bg-gray-900 border border-gray-700 px-2 py-1 text-gray-100 text-[13px] font-mono focus:border-[#c586c0] focus:outline-none"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
                  />
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-3 py-1 text-[11px] font-bold tracking-wider text-black"
                    style={{ background: '#c586c0' }}
                  >
                    {saving ? '...' : 'SAVE'}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-2 py-1 text-[11px] tracking-wider text-gray-500 hover:text-gray-300"
                  >
                    CANCEL
                  </button>
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-2">
                  <span style={{ color: '#c586c0' }}>{referralCode || '—'}</span>
                  <button
                    onClick={() => { setEditCode(referralCode); setEditing(true); setSaveError(''); }}
                    className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    EDIT
                  </button>
                </div>
              )}
              {saveError && <p className="mt-1 text-[11px] text-red-400">{saveError}</p>}
            </div>

            {/* Referral link */}
            {referralCode && (
              <div>
                <span className="text-gray-500">REFERRAL LINK</span>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-gray-400 truncate text-[12px]">{referralLink}</span>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 px-2 py-0.5 text-[11px] border rounded hover:bg-white/5 transition-colors"
                    style={{ borderColor: '#444', color: copied ? '#4ec9b0' : '#888' }}
                  >
                    {copied ? 'COPIED' : 'COPY'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </TerminalPanel>

        <TerminalPanel
          title="REFERRAL STATS"
          defaultPosition={{ x: 16, y: 260 }}
          defaultSize={{ width: 600, height: 160 }}
          accentColor="#4ec9b0"
          zIndex={focusedPanel === 'stats' ? 10 : 1}
          onFocus={() => setFocusedPanel('stats')}
          isMobile={isMobile}
        >
          <div className="p-4 font-mono text-[13px]">
            <div className="flex justify-between">
              <span className="text-gray-500">SUCCESSFUL REFERRALS</span>
              <span style={{ color: '#4ec9b0' }}>{referralCount}</span>
            </div>
          </div>
        </TerminalPanel>

      </div>
    </div>
  );
}
