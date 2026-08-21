interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
}

export function ThemeToggle({ isDark, onToggle }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      aria-label="Cambiar tema"
      title="Modo oscuro / claro"
      className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full flex items-center justify-center text-lg
                 transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer
                 border"
      style={{
        background: 'var(--color-bg-card)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <span>{isDark ? '☀️' : '🌙'}</span>
    </button>
  );
}
