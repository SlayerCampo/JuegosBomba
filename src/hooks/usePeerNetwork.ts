/**
 * usePeerNetwork — React hook wrapping PeerJS
 *
 * This is the direct translation of the vanilla PeerNetwork class into
 * React lifecycle idioms. Key design decisions:
 *
 * 1. The Peer object and DataConnections live in refs (not state) — they are
 *    imperative handles that must NOT trigger re-renders when mutated.
 *
 * 2. UI-relevant state (status, myId, roomCode, connectedPeerIds) lives in
 *    useState so the lobby UI reacts to changes.
 *
 * 3. isHost is stored in BOTH a ref (for use inside callbacks without stale
 *    closures) and state (for reactive UI updates).
 *
 * 4. The onMessage callback is stored in a ref so it can be updated by the
 *    parent on every render without recreating every PeerJS event handler.
 *
 * 5. All exported actions (initAsHost, initAsGuest, joinRoom, send, disconnect)
 *    are stable useCallback references — safe to put in dependency arrays.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import type { ConnectionStatus, PeerMessage, RoomPrefix } from '@/types/network';
import { generateShortId } from '@/utils/textUtils';

// ICE server config (mirrors vanilla peer-network.js)
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export interface UsePeerNetworkOptions {
  /** Called every time a message arrives from any peer */
  onMessage: (msg: PeerMessage) => void;
}

export interface UsePeerNetworkReturn {
  // ── Reactive state (drives UI) ──────────────────────────────
  status: ConnectionStatus;
  isHost: boolean;
  myId: string | null;
  roomCode: string | null;        // user-facing 4-char code (no prefix)
  connectedPeerIds: string[];     // live list of connected guest IDs
  error: Error | null;

  // ── Stable actions ──────────────────────────────────────────
  initAsHost: (prefix: RoomPrefix) => Promise<string>; // resolves with roomCode
  initAsGuest: (prefix: RoomPrefix) => Promise<void>;  // resolves when peer is open
  joinRoom: (code: string) => Promise<void>;           // resolves when connected to host
  send: <T>(type: string, payload: T, targetPeerId?: string) => void;
  disconnect: () => void;
}

export function usePeerNetwork({ onMessage }: UsePeerNetworkOptions): UsePeerNetworkReturn {
  // ── React state (triggers re-renders) ───────────────────────
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [connectedPeerIds, setConnectedPeerIds] = useState<string[]>([]);
  const [error, setError] = useState<Error | null>(null);

  // ── Imperative refs (no re-renders) ─────────────────────────
  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const isHostRef = useRef<boolean>(false);      // mirrors isHost state, for callbacks
  const hostIdRef = useRef<string | null>(null); // full prefixed host ID
  const roomPrefixRef = useRef<RoomPrefix>('WB-');

  // Stable ref for the message handler — the game changes this every render
  // but we never want to recreate all the PeerJS listeners just because it changed.
  const onMessageRef = useRef<(msg: PeerMessage) => void>(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  });

  // ── Internal: destroy peer and reset all refs ────────────────
  const destroyPeer = useCallback(() => {
    connectionsRef.current.forEach((conn) => {
      try { conn.close(); } catch { /* ignore */ }
    });
    connectionsRef.current.clear();

    if (peerRef.current) {
      try { peerRef.current.destroy(); } catch { /* ignore */ }
      peerRef.current = null;
    }

    hostIdRef.current = null;
    isHostRef.current = false;
  }, []);

  // ── Internal: wire all events for a DataConnection ───────────
  const setupConnection = useCallback((conn: DataConnection) => {
    const peerId = conn.peer;
    connectionsRef.current.set(peerId, conn);

    // Notify the game layer
    if (isHostRef.current) {
      setConnectedPeerIds((prev) =>
        prev.includes(peerId) ? prev : [...prev, peerId]
      );
      onMessageRef.current({ type: 'CLIENT_CONNECTED', payload: peerId });
    } else {
      onMessageRef.current({ type: 'CONNECTED', payload: peerId });
    }

    // ── Data handler ─────────────────────────────────────────
    conn.on('data', (raw) => {
      // PeerJS deserializes JSON automatically — cast to our type
      const msg = raw as PeerMessage;
      if (typeof msg === 'object' && msg !== null) {
        // Inject sender ID so hosts can route responses
        (msg as PeerMessage)._senderId = peerId;
      }
      onMessageRef.current(msg as PeerMessage);
    });

    // ── Close handler ────────────────────────────────────────
    conn.on('close', () => {
      connectionsRef.current.delete(peerId);

      if (isHostRef.current) {
        setConnectedPeerIds((prev) => prev.filter((id) => id !== peerId));
        onMessageRef.current({ type: 'CLIENT_DISCONNECTED', payload: peerId });
      } else {
        setStatus('disconnected');
        onMessageRef.current({ type: 'DISCONNECTED', payload: null });
      }
    });

    conn.on('error', (err) => {
      console.error('[PeerNetwork] Connection error:', peerId, err);
    });
  }, []); // stable — reads isHostRef/onMessageRef by ref, not closure

  // ── initAsHost ───────────────────────────────────────────────
  const initAsHost = useCallback((prefix: RoomPrefix): Promise<string> => {
    return new Promise((resolve, reject) => {
      destroyPeer();

      isHostRef.current = true;
      roomPrefixRef.current = prefix;
      setIsHost(true);
      setConnectedPeerIds([]);
      setStatus('initializing');
      setError(null);

      const shortId = generateShortId();
      const fullId = `${prefix}${shortId}`;

      const peer = new Peer(fullId, { debug: 2, config: ICE_SERVERS });
      peerRef.current = peer;

      peer.on('open', (id) => {
        const code = id.replace(prefix, '');
        hostIdRef.current = id;
        setMyId(id);
        setRoomCode(code);
        setStatus('hosting');
        resolve(code);
      });

      peer.on('error', (err) => {
        const e = err as Error;
        setError(e);
        setStatus('error');
        reject(e);
      });

      // Host listens for ALL incoming connections
      peer.on('connection', (conn) => {
        if (conn.open) {
          setupConnection(conn);
        } else {
          conn.on('open', () => {
            setupConnection(conn);
          });
        }
      });
    });
  }, [destroyPeer, setupConnection]);

  // ── initAsGuest ──────────────────────────────────────────────
  // Creates a PeerJS peer (random ID) so we can then call joinRoom().
  // Returns a promise that resolves once the peer is "open" (registered with PeerJS).
  const initAsGuest = useCallback((prefix: RoomPrefix): Promise<void> => {
    return new Promise((resolve, reject) => {
      destroyPeer();

      isHostRef.current = false;
      roomPrefixRef.current = prefix;
      setIsHost(false);
      setConnectedPeerIds([]);
      setStatus('initializing');
      setError(null);

      // Guest gets a random ID assigned by PeerJS
      const peer = new Peer({ debug: 2, config: ICE_SERVERS });
      peerRef.current = peer;

      peer.on('open', (id) => {
        setMyId(id);
        setStatus('joining');
        resolve();
      });

      peer.on('error', (err) => {
        const e = err as Error;
        setError(e);
        setStatus('error');
        reject(e);
      });
    });
  }, [destroyPeer]);

  // ── joinRoom ─────────────────────────────────────────────────
  // Connects the guest peer to the host's full prefixed ID.
  // Enforces an 8-second timeout, matching the original.
  const joinRoom = useCallback((code: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!peerRef.current) {
        reject(new Error('Peer not initialized. Call initAsGuest first.'));
        return;
      }

      const fullHostId = `${roomPrefixRef.current}${code.trim().toUpperCase()}`;
      hostIdRef.current = fullHostId;

      const conn = peerRef.current.connect(fullHostId, { reliable: true });
      let settled = false;

      const cleanupFailure = (err: Error) => {
        if (settled) return;
        settled = true;
        try { conn.close(); } catch { /* ignore */ }
        reject(err);
      };

      const timeoutId = setTimeout(() => {
        cleanupFailure(new Error('Connection timeout after 8 seconds'));
      }, 8000);

      conn.on('open', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        setupConnection(conn);
        setStatus('connected');
        resolve();
      });

      conn.on('error', (err) => {
        clearTimeout(timeoutId);
        cleanupFailure(err as Error);
      });

      conn.on('close', () => {
        if (!settled) {
          clearTimeout(timeoutId);
          cleanupFailure(new Error('Connection closed before it could open'));
        }
      });
    });
  }, [setupConnection]);

  // ── send ─────────────────────────────────────────────────────
  // Host: broadcasts to ALL or sends to a specific peer.
  // Guest: always sends to the host.
  const send = useCallback(<T,>(type: string, payload: T, targetPeerId?: string) => {
    const message: PeerMessage<T> = { type, payload };

    if (isHostRef.current) {
      if (targetPeerId) {
        const conn = connectionsRef.current.get(targetPeerId);
        if (conn?.open) conn.send(message);
        else console.warn('[PeerNetwork] Target peer not open:', targetPeerId);
      } else {
        // Broadcast
        connectionsRef.current.forEach((conn) => {
          if (conn.open) conn.send(message);
        });
      }
    } else {
      // Guest always sends to host
      if (!hostIdRef.current) {
        console.warn('[PeerNetwork] No hostId stored.');
        return;
      }
      const conn = connectionsRef.current.get(hostIdRef.current);
      if (conn?.open) conn.send(message);
      else console.warn('[PeerNetwork] Host connection not open.');
    }
  }, []); // stable — all reads go through refs

  // ── disconnect ───────────────────────────────────────────────
  const disconnect = useCallback(() => {
    destroyPeer();
    setMyId(null);
    setRoomCode(null);
    setConnectedPeerIds([]);
    setIsHost(false);
    setStatus('idle');
    setError(null);
  }, [destroyPeer]);

  // ── Cleanup on unmount ───────────────────────────────────────
  useEffect(() => {
    return () => {
      // Silence React StrictMode double-mount — only destroy if peer exists
      if (peerRef.current) {
        try { peerRef.current.destroy(); } catch { /* ignore */ }
        peerRef.current = null;
      }
    };
  }, []);

  return {
    status,
    isHost,
    myId,
    roomCode,
    connectedPeerIds,
    error,
    initAsHost,
    initAsGuest,
    joinRoom,
    send,
    disconnect,
  };
}
