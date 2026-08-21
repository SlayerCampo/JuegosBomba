import { useState, type ChangeEvent } from 'react';
import { EmojiSelector } from '@/components/common/EmojiSelector';
import { EMOJIS, type Emoji } from '@/types/player';
import { escapeHTML } from '@/utils/textUtils';

interface ProfileSetupProps {
  initialName?: string;
  initialEmoji?: Emoji;
  onConfirm: (name: string, emoji: Emoji) => void;
  isLoading?: boolean;
  confirmLabel?: string;
}

export function ProfileSetup({
  initialName = '',
  initialEmoji = EMOJIS[0],
  onConfirm,
  isLoading = false,
  confirmLabel = '✔ Listo',
}: ProfileSetupProps) {
  const [name, setName] = useState(initialName);
  const [emoji, setEmoji] = useState<Emoji>(initialEmoji);
  const [error, setError] = useState('');

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.slice(0, 18); // max 18 chars
    setName(val);
    if (val.trim().length > 0) setError('');
  };

  const handleConfirm = () => {
    const trimmed = name.trim();
    if (trimmed.length < 1) {
      setError('¡Escribe tu nombre!');
      return;
    }
    onConfirm(escapeHTML(trimmed), emoji);
  };

  return (
    <div className="w-full flex flex-col items-center gap-5">
      {/* Emoji picker */}
      <EmojiSelector selected={emoji} onChange={setEmoji} />

      {/* Name input */}
      <div className="w-full flex flex-col gap-1 items-center">
        <label
          htmlFor="profile-name"
          className="text-xs font-semibold uppercase tracking-wider text-center"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Tu nombre
        </label>
        <input
          id="profile-name"
          type="text"
          value={name}
          onChange={handleNameChange}
          placeholder="Escribe tu nombre..."
          maxLength={18}
          disabled={isLoading}
          className="w-full font-black border-2 outline-none text-center
                     transition-all duration-200"
          style={{
            padding: '24px',
            borderRadius: '24px',
            fontSize: '20px',
            background: 'var(--color-bg-card)',
            borderColor: error ? 'var(--color-danger-dark)' : 'var(--color-border)',
            color: 'var(--color-text-main)',
            caretColor: 'var(--color-primary)',
          }}
          onFocus={(e) =>
            (e.target.style.borderColor = 'var(--color-primary)')
          }
          onBlur={(e) =>
            (e.target.style.borderColor = error
              ? 'var(--color-danger-dark)'
              : 'var(--color-border)')
          }
          onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
        />
        {error && (
          <p className="text-xs pl-1 animate-slide-up" style={{ color: 'var(--color-danger-dark)' }}>
            {error}
          </p>
        )}
      </div>



      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={isLoading}
        className="w-full mt-2 font-black text-white
                   transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                   disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shadow-md"
        style={{
          padding: '24px 32px',
          borderRadius: '40px',
          fontSize: '24px',
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
          boxShadow: '0 8px 30px var(--color-primary-glow)',
        }}
      >
        {isLoading ? '⏳ Esperando...' : confirmLabel}
      </button>
    </div>
  );
}
