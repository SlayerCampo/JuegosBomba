import { useState, useCallback, createContext, useContext, useEffect, useRef } from 'react';
import type { AppView } from '@/types/appView';
import type { PeerMessage } from '@/types/network';
import type { 
  StopGameState,
  StopStartGamePayload,
  CategoryKey,
  StopReviewCategoryPayload,
  StopRoundResultsPayload,
  StopCatResolvedPayload,
  StopVotePayload,
  StopSubmitAnswersPayload,
  StopTriggerPayload,
  StopVotesSyncPayload
} from '@/types/stop';
import type { PlayerProfile, StopPlayer, PlayerMap } from '@/types/player';
import { NetworkProvider, useNetwork } from '@/context/NetworkContext';
import { useStopGameState } from '@/hooks/useStopGameState';
import { useAppContext } from '@/context/AppContext';

// Views
import { StopConfigView }    from './StopConfigView';
import { StopLobbyView }     from './StopLobbyView';
import { StopProfileView }   from './StopProfileView';
import { StopCountdownView } from './StopCountdownView';
import { StopGameView }      from './StopGameView';
import { StopReviewView }    from './StopReviewView';
import { StopGameOverView }  from './StopGameOverView';

// ── Flow Context ───────────────────────────────────────────────
interface StopFlowContextValue {
  selectedCats: CategoryKey[];
  setSelectedCats: (cats: CategoryKey[]) => void;
  customCategory: string | null;
  setCustomCategory: (cat: string | null) => void;
  roundSettings: { totalRounds: number; roundMinutes: number };
  setRoundSettings: React.Dispatch<React.SetStateAction<{ totalRounds: number; roundMinutes: number }>>;
  targetRoomCode: string | null;
  setTargetRoomCode: (code: string | null) => void;
  isHostIntent: boolean;
  setIsHostIntent: (isHost: boolean) => void;
  
  lobbyPlayers: Record<string, PlayerProfile>;
  setLobbyPlayers: React.Dispatch<React.SetStateAction<Record<string, PlayerProfile>>>;

  myProfile: { name: string; emoji: string } | null;
  setMyProfile: (profile: { name: string; emoji: string } | null) => void;

  gameState: StopGameState | null;
  startGameAsHost: () => void;
  
  // Game events exposed to views
  stopTriggeredBy: string | null;
  setStopTriggeredBy: (id: string | null) => void;
  dispatchLocalMessage: (msg: PeerMessage) => void;
}

const StopFlowContext = createContext<StopFlowContextValue | null>(null);

export function useStopFlow() {
  const ctx = useContext(StopFlowContext);
  if (!ctx) throw new Error('useStopFlow must be used within StopFlow');
  return ctx;
}

interface StopFlowProps {
  view: AppView;
  handlerRef: React.MutableRefObject<(msg: PeerMessage) => void>;
}

// ── Inner component: has access to NetworkContext ──────────────
function StopFlowInner({ view, handlerRef }: StopFlowProps) {
  const { navigate } = useAppContext();
  const { isHost, send } = useNetwork();
  
  const [selectedCats, setSelectedCats] = useState<CategoryKey[]>([]);
  const [customCategory, setCustomCategory] = useState<string | null>(null);
  const [roundSettings, setRoundSettings] = useState({ totalRounds: 5, roundMinutes: 5 });
  const [targetRoomCode, setTargetRoomCode] = useState<string | null>(null);
  const [isHostIntent, setIsHostIntent] = useState(false);
  const [lobbyPlayers, setLobbyPlayers] = useState<Record<string, PlayerProfile>>({});
  const [myProfile, setMyProfile] = useState<{ name: string; emoji: string } | null>(null);
  
  const [stopTriggeredBy, setStopTriggeredBy] = useState<string | null>(null);
  const [cheatMessage, setCheatMessage] = useState<{ id: number, text: string } | null>(null);

  // Clear cheat message after 5 seconds
  useEffect(() => {
    if (cheatMessage) {
      const timer = setTimeout(() => setCheatMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [cheatMessage]);

  const {
    gameState,
    applyState,
    initGameAsHost,
    hostReceiveAnswers,
    hostReceiveVote,
    hostNextCategoryOrResults,
    stateRef,
    handlePlayerDisconnect
  } = useStopGameState();

  const startGameAsHost = useCallback(() => {
    if (!isHost) return;
    const players: StopGameState['players'] = {};
    Object.values(lobbyPlayers).forEach(p => {
      players[p.id] = { ...p, score: 0 };
    });
    
    // Check if we already have a round
    const currentRound = stateRef.current ? stateRef.current.currentRound + 1 : 1;
    
    // Inject custom category if it exists
    const finalCats = customCategory ? [...selectedCats, customCategory] : selectedCats;
    
    const startPayload = initGameAsHost(finalCats, players, roundSettings.roundMinutes, currentRound, roundSettings.totalRounds);
    setStopTriggeredBy(null);
    send('STOP_START_GAME', startPayload);
    navigate('stop-countdown');
  }, [isHost, lobbyPlayers, selectedCats, customCategory, roundSettings, initGameAsHost, send, navigate, stateRef]);

  const handleMessage = useCallback((msg: PeerMessage) => {
    console.log('[StopFlow] handleMessage received:', msg.type, msg.payload);

    switch (msg.type) {
      // ── LOBBY MESSAGES ──

      // When a new guest's data channel opens, the host gets CLIENT_CONNECTED.
      // Immediately send the current lobby state to that specific guest so they
      // can see any players who joined before them.
      case 'CLIENT_CONNECTED': {
        if (isHost) {
          const newPeerId = msg.payload as string;
          console.log('[StopFlow] HOST: new client connected:', newPeerId);
          // Send the current lobby state specifically to this peer so they catch up
          setLobbyPlayers(prev => {
            console.log('[StopFlow] HOST: sending STOP_LOBBY_STATE to new peer, current players:', prev);
            send('STOP_LOBBY_STATE', prev, newPeerId);
            return prev; // no change to state
          });
        }
        break;
      }

      case 'PROFILE_READY': {
        if (isHost) {
          const profile = msg.payload as PlayerProfile;
          console.log('[StopFlow] HOST: received PROFILE_READY from:', profile.id, profile.name);
          setLobbyPlayers(prev => {
            const next = { ...prev, [profile.id]: profile };
            console.log('[StopFlow] HOST: broadcasting STOP_LOBBY_STATE, players:', next);
            send('STOP_LOBBY_STATE', next);
            return next;
          });
        }
        break;
      }

      case 'STOP_LOBBY_STATE': {
        if (!isHost) {
          const state = msg.payload as Record<string, PlayerProfile>;
          console.log('[StopFlow] GUEST: received STOP_LOBBY_STATE, players:', state);
          setLobbyPlayers(state);
        }
        break;
      }

      
      // ── GAME ──
      case 'STOP_START_GAME':
        if (!isHost) {
          const p = msg.payload as StopStartGamePayload;
          applyState({
            selectedCats: p.categories,
            currentLetter: p.letter,
            currentRound: p.round,
            totalRounds: p.totalRounds,
            roundMinutes: p.roundMinutes,
            players: p.players,
            phase: 'PLAYING',
            turnEndTime: Date.now() + 2500 + p.roundMinutes * 60 * 1000,
            allAnswers: {},
            currentReviewCategoryIndex: 0,
            categoryVotes: {},
            isTieWarning: false
          });
          setStopTriggeredBy(null);
          navigate('stop-countdown');
        }
        break;

      case 'STOP_TRIGGER':
        setStopTriggeredBy((msg.payload as StopTriggerPayload).triggeredBy);
        if (isHost) {
          send('STOP_TRIGGER', msg.payload);
        }
        // Do not navigate immediately, the overlay in StopGameView will handle this and then wait for host
        break;

      case 'STOP_CHEAT_DETECTED': {
        const cheatId = msg.payload as string;
        // Si no está en players (ej. es host pero host no está en lobbyPlayers a veces, usamos un nombre por defecto)
        const playerName = lobbyPlayers[cheatId]?.name || (cheatId === 'host' ? myProfile?.name : 'Alguien');
        setCheatMessage({ id: Date.now(), text: `¡🚨 ${playerName} se salió del juego a buscar respuestas!` });
        break;
      }

      case 'STOP_SUBMIT_ANSWERS':
        if (isHost) {
          const p = msg.payload as StopSubmitAnswersPayload;
          const reviewPayload = hostReceiveAnswers(p.id, p.answers);
          if (reviewPayload) {
            // Delay 3.5 seconds so everyone can see the BOOM overlay before voting
            setTimeout(() => {
              send('STOP_REVIEW_CATEGORY', reviewPayload);
              // also trigger locally for host
              if (stateRef.current) {
                applyState({
                  ...stateRef.current,
                  phase: 'REVIEWING',
                  currentReviewCategoryIndex: reviewPayload.catIndex
                });
                navigate('stop-review');
              }
            }, 3500);
          }
        }
        break;

      case 'STOP_REVIEW_CATEGORY':
        if (!isHost) {
          const p = msg.payload as StopReviewCategoryPayload;
          if (stateRef.current) {
            applyState({
              ...stateRef.current,
              phase: 'REVIEWING',
              currentReviewCategoryIndex: p.catIndex,
              allAnswers: p.allAnswers,
              categoryVotes: {},
              categoryResolutions: {},
              isTieWarning: false
            });
            navigate('stop-review');
          }
        }
        break;

      case 'STOP_VOTE':
        if (isHost) {
          const p = msg.payload as StopVotePayload;
          const resolvePayload = hostReceiveVote(p.voterId, p.targetId, p.vote);
          
          // Always sync votes immediately
          send('STOP_VOTES_SYNC', { votes: stateRef.current!.categoryVotes });
          
          if (resolvePayload) {
            send('STOP_CAT_RESOLVED', resolvePayload);
          }
        }
        break;

      case 'STOP_VOTES_SYNC':
        if (!isHost && stateRef.current) {
          const p = msg.payload as StopVotesSyncPayload;
          applyState({
            ...stateRef.current,
            categoryVotes: p.votes
          });
        }
        break;

      case 'STOP_TIE_WARNING':
        if (!isHost && stateRef.current) {
          applyState({ ...stateRef.current, isTieWarning: true });
        }
        break;

      case 'STOP_CAT_RESOLVED':
        if (!isHost && stateRef.current) {
          const p = msg.payload as StopCatResolvedPayload;
          if (p.removeWarning) {
            applyState({ ...stateRef.current, isTieWarning: false });
          } else if (p.resolution) {
            applyState({ ...stateRef.current, isTieWarning: false, categoryResolutions: p.resolution });
          }
        }
        break;

      case 'STOP_ROUND_RESULTS':
        if (!isHost && stateRef.current) {
          const p = msg.payload as StopRoundResultsPayload;
          applyState({
            ...stateRef.current,
            phase: 'ROUND_RESULTS',
            players: p.players,
            roundPoints: p.roundPoints
          });
        }
        break;

      case 'CLIENT_DISCONNECTED':
        if (isHost) {
          const peerId = msg.payload as string;
          setLobbyPlayers(prev => {
            const next = { ...prev };
            delete next[peerId];
            send('STOP_LOBBY_STATE', next);
            return next;
          });
          if (stateRef.current) {
             const result = handlePlayerDisconnect(peerId);
             if (result) {
               send('STOP_PLAYER_DISCONNECTED', result);
               if (result.isGameOver) {
                 send('STOP_GAME_OVER', result);
                 navigate('stop-gameover');
               }
             }
          }
        }
        break;

      case 'STOP_PLAYER_DISCONNECTED':
        if (!isHost) {
          const payload = msg.payload as any;
          if (stateRef.current) {
            applyState({ ...stateRef.current, players: payload.players });
          }
        }
        break;

      case 'DISCONNECTED':
        if (!isHost) {
          navigate('home');
        }
        break;

      case 'STOP_GAME_OVER':
        if (!isHost && stateRef.current) {
          const p = msg.payload as { players: PlayerMap<StopPlayer> };
          applyState({
             ...stateRef.current,
             players: p.players
          });
          navigate('stop-gameover');
        }
        break;
    }
  }, [
    isHost, send, navigate, applyState, 
    hostReceiveAnswers, hostReceiveVote, stateRef
  ]);

  // Host Transitions
  const handleHostNextCategory = useCallback(() => {
    if (!isHost) return;
    const payload = hostNextCategoryOrResults();
    if (payload) {
      if ('roundPoints' in payload) {
        // It's StopRoundResultsPayload
        send('STOP_ROUND_RESULTS', payload);
      } else {
        // It's StopReviewCategoryPayload
        send('STOP_REVIEW_CATEGORY', payload);
      }
    }
  }, [isHost, hostNextCategoryOrResults, send]);

  const handleHostNextRound = useCallback(() => {
    if (!isHost) return;
    const currentRound = stateRef.current ? stateRef.current.currentRound : 1;
    const totalRounds = stateRef.current ? stateRef.current.totalRounds : 5;
    
    if (currentRound >= totalRounds) {
      const payload = { players: stateRef.current!.players };
      send('STOP_GAME_OVER', payload);
      navigate('stop-gameover');
    } else {
      startGameAsHost();
    }
  }, [isHost, stateRef, send, navigate, startGameAsHost]);

  useEffect(() => {
    window.addEventListener('stop-host-next-category', handleHostNextCategory);
    window.addEventListener('stop-host-next-round', handleHostNextRound);
    return () => {
      window.removeEventListener('stop-host-next-category', handleHostNextCategory);
      window.removeEventListener('stop-host-next-round', handleHostNextRound);
    };
  }, [handleHostNextCategory, handleHostNextRound]);

  // ── Keep the NetworkProvider's message handler up-to-date via a ref ──
  // We update the ref passed from the parent on every render.
  handlerRef.current = handleMessage;

  function renderView() {
    switch (view) {
      case 'stop-config':    return <StopConfigView />;
      case 'stop-profile':   return <StopProfileView />;
      case 'stop-lobby':     return <StopLobbyView />;
      case 'stop-countdown': return <StopCountdownView />;
      case 'stop-game':      return <StopGameView />;
      case 'stop-review':    return <StopReviewView />;
      case 'stop-gameover':  return <StopGameOverView />;
      default:               return null;
    }
  }

  const dispatchLocalMessage = useCallback((msg: PeerMessage) => {
    handleMessage(msg);
  }, [handleMessage]);

  const contextValue: StopFlowContextValue = {
    selectedCats, setSelectedCats,
    customCategory, setCustomCategory,
    roundSettings, setRoundSettings,
    targetRoomCode, setTargetRoomCode,
    isHostIntent, setIsHostIntent,
    lobbyPlayers, setLobbyPlayers,
    myProfile, setMyProfile,
    gameState, startGameAsHost,
    stopTriggeredBy, setStopTriggeredBy,
    dispatchLocalMessage
  };

  return (
    <StopFlowContext.Provider value={contextValue}>
      {renderView()}

      {/* CHEAT TOAST */}
      {cheatMessage && (
        <div 
          key={cheatMessage.id} 
          className="fixed top-4 right-4 z-[99999] bg-red-600 text-white px-4 py-3 rounded-2xl shadow-2xl border-4 border-red-800 animate-slide-left flex items-center gap-3 max-w-[90vw]"
        >
           <span className="text-3xl animate-bounce">👀</span>
           <p className="font-black text-sm md:text-base">{cheatMessage.text}</p>
        </div>
      )}
    </StopFlowContext.Provider>
  );
}

// ── Outer wrapper: owns NetworkProvider so it stays mounted ──────
//
// FIX: Instead of storing `msgHandler` in React state (which triggers a
// NetworkProvider re-render/re-mount when updated), we pass a ref down
// to StopFlowInner which updates it on every render. The NetworkProvider
// receives a single stable callback that reads the ref.
//
export function StopFlow({ view }: { view: AppView }) {
  // Stable ref that always points to the latest handleMessage from StopFlowInner
  const handlerRef = useRef<(msg: PeerMessage) => void>(() => {});

  // This stable callback never changes — NetworkProvider is NEVER re-mounted
  const stableOnMessage = useCallback((msg: PeerMessage) => {
    handlerRef.current(msg);
  }, []); // [] = truly stable forever

  return (
    <NetworkProvider onMessage={stableOnMessage}>
      <StopFlowInner view={view} handlerRef={handlerRef} />
    </NetworkProvider>
  );
}
