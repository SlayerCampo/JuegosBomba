import { useState, type FormEvent } from 'react';
import { ErrorCard } from '@/components/common/ErrorCard';
import { ChevronRight, Loader2 } from 'lucide-react';

interface RoomCodeInputProps {
  onJoin: (code: string) => void;
  isConnecting: boolean;
  error: string | null;
}

export function RoomCodeInput({ onJoin, isConnecting, error }: RoomCodeInputProps) {
  const [code, setCode] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = code.trim().toUpperCase();
    if (cleaned.length === 4) {
      onJoin(cleaned);
    }
  };

  const isReady = code.length === 4 && !isConnecting;

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
      {/* Input row */}
      <div className="flex flex-row items-center justify-center gap-3 w-full max-w-sm mx-auto">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
          placeholder="A1B2"
          maxLength={4}
          disabled={isConnecting}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="h-14 flex-1 font-black text-3xl text-center tracking-[0.3em] border-2 outline-none
                     transition-all duration-200 rounded-xl"
          style={{
            background: 'var(--color-bg-card)',
            borderColor: error
              ? 'var(--color-danger-dark)'
              : code.length === 4
              ? 'var(--color-primary)'
              : 'var(--color-border)',
            color: 'var(--color-text-main)',
            caretColor: 'var(--color-primary)',
            fontFamily: 'var(--font-main)',
            boxShadow: isReady ? '0 0 0 4px var(--color-primary-glow)' : 'none',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)'; }}
          onBlur={(e) => {
            e.target.style.borderColor = error
              ? 'var(--color-danger-dark)'
              : code.length === 4
              ? 'var(--color-primary)'
              : 'var(--color-border)';
          }}
        />

        {/* Submit button — chunky, rounded, with SVG arrow */}
        <button
          type="submit"
          disabled={!isReady}
          aria-label="Unirse a la sala"
          className={`h-14 w-14 flex items-center justify-center rounded-xl font-bold text-white
                     transition-all duration-200 flex-shrink-0
                     ${isReady ? 'hover:scale-105 active:scale-95 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
          style={{
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
            boxShadow: isReady ? '0 6px 20px var(--color-primary-glow)' : 'none',
            border: 'none',
          }}
        >
          {isConnecting ? (
            <Loader2 className="w-7 h-7 animate-spin" />
          ) : (
            <ChevronRight className="w-7 h-7" strokeWidth={3} />
          )}
        </button>
      </div>

      {/* Connecting status */}
      {isConnecting && (
        <p
          className="text-sm text-center animate-pulse-slow font-semibold"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Conectando...
        </p>
      )}

      {/* Error display — friendly card */}
      {error && !isConnecting && (
        <ErrorCard message={error} />
      )}
    </form>
  );
}
