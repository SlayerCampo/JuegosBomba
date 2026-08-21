interface ErrorCardProps {
  /** The raw error message — will be mapped to a friendly Spanish message */
  message: string;
  /** Optional callback shown as a "Reintentar" button */
  onRetry?: () => void;
}

/** Maps raw/technical error strings to friendly user-facing Spanish messages. */
function getFriendlyMessage(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'No pudimos conectar. Verifica tu conexión a internet e intenta de nuevo.';
  }
  if (lower.includes('no hay código') || lower.includes('falta el código') || lower.includes('código de sala')) {
    return 'Falta el código de sala. Regresa e ingrésalo de nuevo.';
  }
  if (lower.includes('peer not initialized')) {
    return 'Hubo un problema al inicializar la conexión. Por favor recarga la página.';
  }
  if (lower.includes('connection closed')) {
    return 'La conexión se cerró inesperadamente. Vuelve a intentarlo.';
  }
  if (lower.includes('unavailable id') || lower.includes('peer id')) {
    return 'No encontramos esa sala. Revisa el código e intenta de nuevo.';
  }
  if (lower.includes('network') || lower.includes('internet')) {
    return 'Problema de red. Verifica tu conexión a internet e intenta de nuevo.';
  }
  // Generic fallback
  return 'Algo salió mal. Por favor intenta de nuevo.';
}

export function ErrorCard({ message, onRetry }: ErrorCardProps) {
  const friendly = getFriendlyMessage(message);

  return (
    <div
      className="w-full flex flex-col gap-3 rounded-2xl border-2 animate-slide-in-up"
      style={{
        background: 'rgba(239, 68, 68, 0.08)',
        borderColor: 'var(--color-danger-dark)',
        padding: '20px 24px',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <span className="text-2xl flex-shrink-0 mt-0.5">🔌</span>

        {/* Message */}
        <div className="flex-1">
          <p
            className="font-black text-sm mb-1"
            style={{ color: 'var(--color-danger-dark)' }}
          >
            Sin conexión
          </p>
          <p
            className="text-sm leading-snug"
            style={{ color: 'var(--color-text-main)' }}
          >
            {friendly}
          </p>
        </div>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="self-end text-sm font-bold px-4 py-2 rounded-xl border-2 transition-all
                     duration-150 hover:scale-105 active:scale-95 cursor-pointer"
          style={{
            borderColor: 'var(--color-danger-dark)',
            color: 'var(--color-danger-dark)',
            background: 'transparent',
          }}
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
