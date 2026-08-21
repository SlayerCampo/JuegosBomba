import { useState, useRef, useEffect } from 'react';
import { ConfirmModal } from '@/components/common/ConfirmModal';

interface GlobalMenuProps {
  onGoHome: () => void;
}

export function GlobalMenu({ onGoHome }: GlobalMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGoHome = () => {
    setIsOpen(false);
    onGoHome();
  };

  const handleExitRequest = () => {
    setIsOpen(false);
    setShowExitModal(true);
  };

  const handleExitConfirm = () => {
    setShowExitModal(false);
    onGoHome();
  };

  const handleExitCancel = () => {
    setShowExitModal(false);
  };

  return (
    <>
      {/* ── Gear trigger + dropdown ─────────────────────────── */}
      <div ref={containerRef} className="fixed bottom-[84px] lg:bottom-6 right-5 z-50">
        {/* Trigger button — large tap target for mobile */}
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Menú de opciones"
          className="flex items-center justify-center rounded-2xl text-xl transition-all duration-200
                     hover:scale-110 active:scale-95 cursor-pointer border-2"
          style={{
            width: '52px',
            height: '52px',
            background: 'var(--color-bg-card)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          ⚙️
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div
            className="absolute bottom-16 right-0 min-w-52 rounded-2xl border-2 flex flex-col
                       gap-1 animate-slide-up overflow-hidden"
            style={{
              background: 'var(--color-bg-card)',
              borderColor: 'var(--color-border)',
              boxShadow: 'var(--shadow-lg)',
              backdropFilter: 'blur(20px)',
              padding: '8px',
            }}
          >
            <button
              onClick={handleGoHome}
              className="flex items-center gap-3 text-left rounded-xl font-semibold text-sm
                         transition-all duration-150 hover:scale-[1.02] cursor-pointer"
              style={{
                padding: '12px 16px',
                color: 'var(--color-text-main)',
                background: 'transparent',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-primary-glow)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span className="text-base">🏠</span>
              Volver al Inicio
            </button>

            {/* Divider */}
            <div style={{ height: '1px', background: 'var(--color-border)', margin: '2px 8px' }} />

            <button
              onClick={handleExitRequest}
              className="flex items-center gap-3 text-left rounded-xl font-semibold text-sm
                         transition-all duration-150 hover:scale-[1.02] cursor-pointer"
              style={{
                padding: '12px 16px',
                color: 'var(--color-danger-dark)',
                background: 'transparent',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span className="text-base">🚪</span>
              Salir de Partida
            </button>
          </div>
        )}
      </div>

      {/* ── Custom confirm modal ────────────────────────────── */}
      <ConfirmModal
        isOpen={showExitModal}
        title="¿Salir de la partida?"
        message="Si sales ahora perderás tu progreso en la partida actual. ¿Seguro que quieres salir?"
        confirmLabel="🚪 Salir de todas formas"
        cancelLabel="Quedarme"
        isDanger
        onConfirm={handleExitConfirm}
        onCancel={handleExitCancel}
      />
    </>
  );
}
