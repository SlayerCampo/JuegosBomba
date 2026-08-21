/**
 * NetworkContext — provides a shared usePeerNetwork instance to an entire
 * game's component tree (Palabras flow OR Stop flow).
 *
 * CRITICAL design note:
 * Each game (Palabras, STOP) gets its OWN NetworkContext provider, wrapping
 * only that game's views. This mirrors the vanilla architecture where
 * WordGame and StopGame each own separate PeerNetwork instances.
 *
 * The provider is mounted when the user enters a game flow and unmounted
 * (triggering disconnect cleanup) when they leave. This eliminates ghost
 * connections automatically.
 *
 * Usage:
 *   // In PalabrasFlow.tsx
 *   <NetworkProvider prefix="WB-" onMessage={handlePalabrasMessage}>
 *     <PalabrasLobbyView />
 *     <PalabrasGameView />
 *   </NetworkProvider>
 *
 *   // In any child:
 *   const { send, roomCode, connectedPeerIds } = useNetwork();
 */

import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { usePeerNetwork, type UsePeerNetworkReturn } from '@/hooks/usePeerNetwork';
import type { PeerMessage } from '@/types/network';

// ── Context type ────────────────────────────────────────────────
type NetworkContextValue = UsePeerNetworkReturn;

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function useNetwork(): NetworkContextValue {
  const ctx = useContext(NetworkContext);
  if (!ctx) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return ctx;
}

// ── Provider props ──────────────────────────────────────────────
interface NetworkProviderProps {
  /**
   * Called when any P2P message arrives (from any peer).
   * This should be a stable callback (e.g. from useCallback or useReducer dispatch).
   * The hook stores it in a ref internally so stale closures are never an issue.
   */
  onMessage: (msg: PeerMessage) => void;
  children: ReactNode;
}

export function NetworkProvider({ onMessage, children }: NetworkProviderProps) {
  // Keep onMessage stable — we wrap it in a ref-backed callback
  // so even if the parent passes a new function every render,
  // the network hook only sees one stable reference.
  const onMessageRef = useRef<(msg: PeerMessage) => void>(onMessage);
  onMessageRef.current = onMessage;

  const stableOnMessage = useCallback((msg: PeerMessage) => {
    onMessageRef.current(msg);
  }, []); // truly stable — never recreated

  const network = usePeerNetwork({ onMessage: stableOnMessage });

  // Memoize the context value to prevent all consumers re-rendering
  // on every status change (only the specific field they read changes)
  const value = useMemo(() => network, [network]);

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}
