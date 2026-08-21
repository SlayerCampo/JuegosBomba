import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  children: ReactNode;
  /** If true, clicking backdrop does NOT close the modal */
  persistent?: boolean;
}

export function Modal({ isOpen, onClose, title, children, persistent = false }: ModalProps) {
  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={!persistent && onClose ? onClose : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4 border animate-pop-in"
        style={{
          background: 'var(--color-bg-card-solid)',
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-lg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2
            className="text-xl font-bold text-center"
            style={{ color: 'var(--color-text-main)' }}
          >
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
