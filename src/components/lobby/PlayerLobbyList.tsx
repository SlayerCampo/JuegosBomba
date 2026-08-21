import type { PlayerProfile } from '@/types/player';

interface PlayerLobbyListProps {
  players: PlayerProfile[];
  myId: string;
  title?: string;
}

interface PlayerCardProps {
  player: PlayerProfile;
  isMe: boolean;
}

function PlayerCard({ player, isMe }: PlayerCardProps) {
  return (
    <div
      className="flex items-center transition-all duration-300 shadow-sm"
      style={{
        padding: '20px 28px',
        borderRadius: '24px',
        gap: '16px',
        border: '2px solid',
        background: player.isReady
          ? 'rgba(134, 239, 172, 0.15)'
          : 'var(--color-bg-card)',
        borderColor: player.isReady
          ? 'var(--color-success-dark)'
          : 'var(--color-border)',
        boxShadow: player.isReady ? '0 0 20px rgba(134, 239, 172, 0.2)' : 'none',
      }}
    >
      {/* Emoji */}
      <span className="text-2xl select-none">{player.emoji}</span>

      {/* Name */}
      <span
        className="flex-1 font-bold text-lg truncate"
        style={{ color: 'var(--color-text-main)' }}
      >
        {player.name}
        {isMe && (
          <span
            className="ml-2 text-xs font-normal"
            style={{ color: 'var(--color-text-muted)' }}
          >
            (tú)
          </span>
        )}
      </span>

      {/* Ready badge */}
      {player.isReady ? (
        <span
          className="font-black shadow-sm"
          style={{ 
            background: 'var(--color-success-dark)', 
            color: 'white',
            padding: '8px 16px',
            borderRadius: '16px',
            fontSize: '14px'
          }}
        >
          ✔ Listo
        </span>
      ) : (
        <span
          className="text-xs"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Esperando...
        </span>
      )}
    </div>
  );
}

export function PlayerLobbyList({ players, myId, title = 'Jugadores' }: PlayerLobbyListProps) {
  if (players.length === 0) {
    return (
      <div
        className="text-center py-6 text-sm animate-pulse-slow"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Esperando jugadores...
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3">
      <p
        className="text-sm font-bold uppercase tracking-widest mb-1 text-center"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {title} ({players.length})
      </p>
      {players.map((p) => (
        <PlayerCard key={p.id} player={p} isMe={p.id === myId} />
      ))}
    </div>
  );
}
