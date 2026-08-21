// ================================================================
// NETWORK TYPES
// ================================================================

export type RoomPrefix = 'WB-' | 'ST-';

export type ConnectionStatus =
  | 'idle'
  | 'initializing'
  | 'hosting'
  | 'joining'
  | 'connected'
  | 'error'
  | 'disconnected';

// Every message sent over the P2P wire has a type and payload
export interface PeerMessage<T = unknown> {
  type: string;
  payload: T;
  _senderId?: string; // injected by PeerNetwork upon receipt
}

// The shape of the usePeerNetwork hook's return value
export interface NetworkState {
  status: ConnectionStatus;
  myId: string | null;
  hostId: string | null;
  isHost: boolean;
  roomCode: string | null; // the 4-char user-facing code (no prefix)
  connectedPeerIds: string[];
  error: Error | null;
}

export interface NetworkActions {
  initAsHost: (prefix: RoomPrefix) => Promise<string>;
  initAsGuest: (prefix: RoomPrefix) => Promise<void>;
  joinRoom: (code: string) => Promise<void>;
  send: <T>(type: string, payload: T, targetPeerId?: string) => void;
  disconnect: () => void;
}
