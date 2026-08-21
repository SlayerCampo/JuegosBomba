import { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface RoomCodeDisplayProps {
  code: string;
  /** 'WB-' for Palabras, 'ST-' for STOP — determines the URL param */
  gameType: 'palabras' | 'stop';
}

/** Copy icon SVG */
function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

/** Check icon SVG */
function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function RoomCodeDisplay({ code, gameType }: RoomCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const inviteUrl = useMemo(() => {
    const base = window.location.origin + window.location.pathname;
    const param = gameType === 'palabras' ? 'room' : 'stoproom';
    return `${base}?${param}=${code}`;
  }, [code, gameType]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteUrl).catch(() => {
      // Fallback for browsers without clipboard API
      const el = document.createElement('textarea');
      el.value = inviteUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // QR colors — use primary purple; dark mode uses a lighter purple
  const qrFgColor = '#7c3aed'; // rich violet, readable in both modes

  return (
    <div className="flex flex-col items-center gap-5 w-full">

      {/* ── Room code badge ────────────────────────────────────── */}
      <div
        className="rounded-3xl text-center w-full"
        style={{
          background: 'var(--color-bg-card)',
          border: '2px solid var(--color-primary)',
          boxShadow: '0 0 28px var(--color-primary-glow)',
          padding: '20px 28px',
        }}
      >
        <p
          className="text-xs font-bold uppercase tracking-[0.25em] mb-2"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Código de Sala
        </p>
        <p
          className="font-black"
          style={{
            color: 'var(--color-primary)',
            fontFamily: 'var(--font-main)',
            letterSpacing: '0.3em',
            fontSize: '52px',
            lineHeight: 1,
          }}
        >
          {code}
        </p>
      </div>

      {/* ── QR Code — themed with animated pulse ring ──────────── */}
      <div
        className="flex flex-col items-center gap-3"
      >
        {/* Outer pulse-ring wrapper */}
        <div
          className="animate-pulse-ring rounded-[28px]"
          style={{
            padding: '3px',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
          }}
        >
          {/* Inner card */}
          <div
            className="rounded-[26px] flex items-center justify-center"
            style={{
              background: '#fff',
              padding: '14px',
            }}
          >
            {/* Gradient overlay approach: QR in primary+accent gradient */}
            <div
              style={{
                borderRadius: '12px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <QRCodeSVG
                value={inviteUrl}
                size={168}
                bgColor="#ffffff"
                fgColor={qrFgColor}
                level="H"
                marginSize={0}
              />
              {/* Gradient color filter overlay — sits on top with mix-blend-mode */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(135deg, #7c3aed 0%, #c084fc 50%, #f472b6 100%)',
                  mixBlendMode: 'multiply',
                  pointerEvents: 'none',
                  opacity: 0.18,
                  borderRadius: '12px',
                }}
              />
            </div>
          </div>
        </div>

        <p
          className="text-xs text-center font-semibold"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Escanea el QR o comparte el código
        </p>
      </div>

      {/* ── Copy URL button ────────────────────────────────────── */}
      <button
        onClick={copyToClipboard}
        className="flex items-center gap-2 font-bold rounded-2xl border-2 transition-all
                   duration-200 hover:scale-105 active:scale-95 cursor-pointer"
        style={{
          padding: '14px 24px',
          fontSize: '14px',
          color: copied ? 'var(--color-success-dark)' : 'var(--color-primary)',
          borderColor: copied ? 'var(--color-success-dark)' : 'var(--color-primary)',
          background: copied ? 'rgba(134,239,172,0.12)' : 'var(--color-bg-card)',
          boxShadow: copied ? '0 0 12px rgba(134,239,172,0.3)' : '0 4px 12px var(--color-primary-glow)',
        }}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? '¡Enlace copiado!' : 'Copiar enlace de invitación'}
      </button>
    </div>
  );
}
