import { useAppContext } from '@/context/AppContext';
import { AdBannerSlot } from '@/components/common/AdBannerSlot';

/** Chunky circle-arrow icon for game cards */
function ArrowIcon() {
  return (
    <div
      className="flex items-center justify-center rounded-xl flex-shrink-0 transition-transform
                 duration-200 group-hover:translate-x-1"
      style={{
        width: '36px',
        height: '36px',
        background: 'var(--color-primary-glow)',
        color: 'var(--color-primary)',
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    </div>
  );
}

interface GameCardProps {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  badge?: string;
}

function GameCard({ icon, title, description, onClick, disabled, badge }: GameCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group relative w-full flex items-center gap-4 text-left
                  border-2 transition-all duration-200 cursor-pointer
                  ${disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]'
                  }`}
      style={{
        padding: '20px 24px',
        borderRadius: '24px',
        background: 'var(--color-bg-card)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
        backdropFilter: 'blur(18px)',
      }}
    >
      {/* Game icon bubble */}
      <div
        className="rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{
          width: '64px',
          height: '64px',
          fontSize: '34px',
          background: 'var(--color-primary-glow)',
          border: '2px solid var(--color-border)',
        }}
      >
        {icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <h3
          className="font-black text-lg leading-tight mb-1"
          style={{ color: 'var(--color-text-main)' }}
        >
          {title}
        </h3>
        <p className="text-sm leading-snug" style={{ color: 'var(--color-text-muted)' }}>
          {description}
        </p>
      </div>

      {/* Right side: badge or arrow */}
      {badge ? (
        <span
          className="text-xs font-black px-3 py-1.5 rounded-full flex-shrink-0"
          style={{
            background: 'var(--color-primary-glow)',
            color: 'var(--color-primary)',
            border: '1.5px solid var(--color-primary)',
          }}
        >
          {badge}
        </span>
      ) : (
        <ArrowIcon />
      )}
    </button>
  );
}

export function HomeView() {
  const { navigate } = useAppContext();
  return (
    <div className="w-full flex flex-col items-center gap-8 animate-slide-up">
      {/* Hero title */}
      <div className="text-center pt-2">
        <h1
          className="text-5xl font-black tracking-tight leading-none mb-3"
          style={{ color: 'var(--color-text-main)' }}
        >
          JUEGOS{' '}
          <span
            className="block"
            style={{
              background: `linear-gradient(135deg, var(--color-primary), var(--color-accent))`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            BOMBA!
          </span>
        </h1>
        <p className="text-base mt-2 font-medium" style={{ color: 'var(--color-text-muted)' }}>
          ¡Hola! Selecciona un juego para empezar.
        </p>
      </div>

      {/* Game cards */}
      <div className="w-full flex flex-col gap-4">
        <GameCard
          icon="💣"
          title="Palabras Bomba"
          description="Agilidad mental, tiempo en contra y muchas palabras."
          onClick={() => navigate('palabras-config')}
        />
        <GameCard
          icon="🛑"
          title="STOP Bomba"
          description="Categorías, letra secreta y ¡el primero en gritar STOP!"
          onClick={() => navigate('stop-config')}
        />
        <GameCard
          icon="🎭"
          title="Adivina Quién Soy"
          description="¿Podrás descubrir quién eres antes que los demás?"
          onClick={() => {}}
          disabled
          badge="Próximamente"
        />
      </div>

      <div className="w-full">
        <AdBannerSlot />
      </div>
    </div>
  );
}
