import { Modal } from './Modal';

interface DisconnectModalProps {
  isOpen: boolean;
  onGoHome: () => void;
}

export function DisconnectModal({ isOpen, onGoHome }: DisconnectModalProps) {
  return (
    <Modal isOpen={isOpen} title="😢 Desconectado" persistent>
      <p
        className="text-center text-sm"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Un jugador se desconectó de la partida.
        La conexión se ha interrumpido.
      </p>
      <button
        onClick={onGoHome}
        className="w-full py-3 rounded-xl font-bold text-white transition-all
                   duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        style={{ background: 'var(--color-primary-dark)' }}
      >
        🏠 Volver al Inicio
      </button>
    </Modal>
  );
}
