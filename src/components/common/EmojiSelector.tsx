import { EMOJIS, type Emoji } from '@/types/player';

interface EmojiSelectorProps {
  selected: Emoji;
  onChange: (emoji: Emoji) => void;
}

/** Chunky left chevron SVG */
function ChevronLeft() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

/** Chunky right chevron SVG */
function ChevronRight() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function EmojiSelector({ selected, onChange }: EmojiSelectorProps) {
  const selectedIndex = EMOJIS.indexOf(selected);

  const prev = () => {
    const i = (selectedIndex - 1 + EMOJIS.length) % EMOJIS.length;
    onChange(EMOJIS[i]);
  };

  const next = () => {
    const i = (selectedIndex + 1) % EMOJIS.length;
    onChange(EMOJIS[i]);
  };

  return (
    <div className="flex items-center justify-center gap-5 w-full">
      {/* ← Prev button — chunky pill */}
      <button
        onClick={prev}
        aria-label="Emoji anterior"
        className="flex items-center justify-center rounded-2xl transition-all
                   duration-150 hover:scale-110 active:scale-95 cursor-pointer border-2
                   flex-shrink-0"
        style={{
          width: '56px',
          height: '56px',
          background: 'var(--color-bg-card)',
          borderColor: 'var(--color-primary)',
          color: 'var(--color-primary)',
          boxShadow: '0 4px 14px var(--color-primary-glow)',
        }}
      >
        <ChevronLeft />
      </button>

      {/* Selected emoji — big display */}
      <div
        className="rounded-3xl flex items-center justify-center select-none
                   transition-transform duration-150 hover:scale-105"
        style={{
          width: '96px',
          height: '96px',
          fontSize: '52px',
          background: 'var(--color-primary-glow)',
          boxShadow: 'var(--shadow-md)',
          border: '2px solid var(--color-border)',
        }}
      >
        {selected}
      </div>

      {/* → Next button — chunky pill */}
      <button
        onClick={next}
        aria-label="Siguiente emoji"
        className="flex items-center justify-center rounded-2xl transition-all
                   duration-150 hover:scale-110 active:scale-95 cursor-pointer border-2
                   flex-shrink-0"
        style={{
          width: '56px',
          height: '56px',
          background: 'var(--color-bg-card)',
          borderColor: 'var(--color-primary)',
          color: 'var(--color-primary)',
          boxShadow: '0 4px 14px var(--color-primary-glow)',
        }}
      >
        <ChevronRight />
      </button>
    </div>
  );
}
