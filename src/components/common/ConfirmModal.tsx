import { useState } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  isDanger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    /* ── Backdrop ── */
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.45)' }}
      onClick={onCancel}
    >
      {/* ── Card ── */}
      <div
        className="w-full max-w-sm flex flex-col gap-5 rounded-3xl border-2 animate-slide-up"
        style={{
          background: 'var(--color-bg-card)',
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-lg)',
          padding: '32px 28px',
          backdropFilter: 'blur(24px)',
        }}
        onClick={(e) => e.stopPropagation()} // prevent backdrop click
      >
        {/* Icon + Title */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
            style={{
              background: isDanger ? 'rgba(239,68,68,0.12)' : 'var(--color-primary-glow)',
            }}
          >
            {isDanger ? '🚪' : '❓'}
          </div>
          <h3
            className="text-xl font-black"
            style={{ color: 'var(--color-text-main)' }}
          >
            {title}
          </h3>
        </div>

        {/* Message */}
        <p
          className="text-sm text-center leading-relaxed"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {message}
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirm}
            className="w-full font-black text-white rounded-2xl transition-all duration-200
                       hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            style={{
              padding: '16px 24px',
              fontSize: '16px',
              background: isDanger
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
              boxShadow: isDanger
                ? '0 6px 20px rgba(239,68,68,0.35)'
                : '0 6px 20px var(--color-primary-glow)',
            }}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="w-full font-bold rounded-2xl border-2 transition-all duration-150
                       hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            style={{
              padding: '14px 24px',
              fontSize: '15px',
              color: 'var(--color-text-muted)',
              borderColor: 'var(--color-border)',
              background: 'transparent',
            }}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
