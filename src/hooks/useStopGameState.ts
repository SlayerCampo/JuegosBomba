import { useState, useCallback, useRef } from 'react';
import type { 
  StopGameState, 
  CategoryKey, 
  StopStartGamePayload,
  StopReviewCategoryPayload,
  StopCatResolvedPayload,
  StopRoundResultsPayload,
  VoteValue
} from '@/types/stop';
import type { StopPlayer, PlayerMap, PlayerId } from '@/types/player';

export function useStopGameState() {
  const [gameState, setGameState] = useState<StopGameState | null>(null);
  const stateRef = useRef<StopGameState | null>(null);

  // We keep a separate ref just to track who has submitted answers this round.
  const submittedAnswersRef = useRef<Set<string>>(new Set());

  const applyState = useCallback((newState: StopGameState) => {
    stateRef.current = newState;
    setGameState(newState);
  }, []);

  const getRandomLetter = () => {
    const letters = 'ABCDEFGHIJLMNOPRSTUVZ'.split('');
    return letters[Math.floor(Math.random() * letters.length)];
  };

  const initGameAsHost = (
    categories: CategoryKey[],
    players: PlayerMap<StopPlayer>,
    roundMinutes: number = 5,
    round: number = 1
  ): StopStartGamePayload => {
    
    // If round 1, reset scores
    const pMap = { ...players };
    if (round === 1) {
      Object.keys(pMap).forEach(id => {
        pMap[id] = { ...pMap[id], score: 0 };
      });
    }

    const duration = roundMinutes * 60;
    const turnEndTime = Date.now() + 2500 + duration * 1000; // 2.5s for countdown overlay + duration

    const initialState: StopGameState = {
      selectedCats: categories,
      currentLetter: getRandomLetter(),
      currentRound: round,
      totalRounds: 5,
      roundMinutes,
      players: pMap,
      
      phase: 'PLAYING',
      turnEndTime,
      
      allAnswers: {},
      currentReviewCategoryIndex: 0,
      categoryVotes: {},
      isTieWarning: false,
    };

    submittedAnswersRef.current.clear();
    applyState(initialState);

    return {
      categories: initialState.selectedCats,
      letter: initialState.currentLetter,
      round: initialState.currentRound,
      players: initialState.players,
      roundMinutes: initialState.roundMinutes
    };
  };

  // Called when Host receives SUBMIT_ANSWERS
  const hostReceiveAnswers = (
    senderId: string, 
    answers: Record<CategoryKey, string>
  ): StopReviewCategoryPayload | null => {
    const state = stateRef.current;
    if (!state) return null;

    const allAnswers = { ...state.allAnswers };
    allAnswers[senderId] = answers;
    
    submittedAnswersRef.current.add(senderId);

    // Update state silently without triggering UI phase change yet
    stateRef.current = { ...state, allAnswers };
    setGameState(stateRef.current);

    // If everyone submitted
    if (submittedAnswersRef.current.size >= Object.keys(state.players).length) {
      return hostStartReview();
    }
    
    return null;
  };

  const hostStartReview = (categoryIndex: number = 0): StopReviewCategoryPayload | null => {
    const state = stateRef.current;
    if (!state) return null;

    if (categoryIndex >= state.selectedCats.length) {
      // Should go to Round Results
      return null; 
    }

    // Reset votes for this category
    const catVotes: Record<string, Record<string, VoteValue>> = {};
    const pIds = Object.keys(state.players);
    pIds.forEach(voterId => {
      catVotes[voterId] = {};
    });

    const cat = state.selectedCats[categoryIndex];

    const newState: StopGameState = {
      ...state,
      phase: 'REVIEWING',
      currentReviewCategoryIndex: categoryIndex,
      categoryVotes: catVotes,
      categoryResolutions: {},
      isTieWarning: false,
    };
    applyState(newState);

    return {
      cat,
      catIndex: categoryIndex,
      totalCats: state.selectedCats.length,
      allAnswers: state.allAnswers
    };
  };

  const hostReceiveVote = (
    voterId: PlayerId, 
    targetId: PlayerId, 
    vote: VoteValue
  ): StopCatResolvedPayload | null => {
    const state = stateRef.current;
    if (!state || state.phase !== 'REVIEWING') return null;

    const catVotes = { ...state.categoryVotes };
    if (!catVotes[voterId]) catVotes[voterId] = {};
    catVotes[voterId][targetId] = vote;

    stateRef.current = { ...state, categoryVotes: catVotes };
    setGameState(stateRef.current);

    // Check if everyone has voted for everyone
    let allVoted = true;
    const pIds = Object.keys(state.players);
    for (const vId of pIds) {
      for (const tId of pIds) {
        if (!catVotes[vId] || !catVotes[vId][tId]) {
          // Exception: if the target answer was empty, we could auto-fill it, 
          // but let's assume the UI enforces it or auto-fills 'invalid'.
          // Actually, let's just check if it's there.
          allVoted = false;
        }
      }
    }

    if (allVoted) {
      return hostResolveVotes();
    }

    return null;
  };

  const hostResolveVotes = (): StopCatResolvedPayload | null => {
    const state = stateRef.current;
    if (!state || state.phase !== 'REVIEWING') return null;

    let hasTie = false;
    const resolution: Record<string, { result: VoteValue; points: number }> = {};
    const pIds = Object.keys(state.players);

    pIds.forEach(targetId => {
      const counts = { valid: 0, invalid: 0, repeated: 0 };
      pIds.forEach(voterId => {
        const v = state.categoryVotes[voterId][targetId];
        if (v) counts[v]++;
      });

      const max = Math.max(counts.valid, counts.invalid, counts.repeated);
      const ties = (['valid', 'invalid', 'repeated'] as VoteValue[]).filter(v => counts[v] === max);

      if (ties.length > 1) {
        hasTie = true;
      } else {
        let pts = 0;
        if (ties[0] === 'valid') pts = 100;
        else if (ties[0] === 'repeated') pts = 50;
        resolution[targetId] = { result: ties[0], points: pts };
      }
    });

    if (hasTie) {
      applyState({ ...state, isTieWarning: true });
      return null; // Tie warning emitted separately
    } else {
      applyState({ ...state, isTieWarning: false, categoryResolutions: resolution });
      return { resolution };
    }
  };


  // Refined approach for points: 
  // We need an array of resolutions.
  const resolutionsRef = useRef<Record<CategoryKey, Record<PlayerId, { result: VoteValue; points: number }>>>({} as any);

  const saveResolutionsForCurrentCat = () => {
     const state = stateRef.current;
     if (state && state.categoryResolutions) {
       const cat = state.selectedCats[state.currentReviewCategoryIndex];
       resolutionsRef.current[cat] = state.categoryResolutions;
     }
  };

  const hostNextCategoryOrResults = (): StopReviewCategoryPayload | StopRoundResultsPayload | null => {
    saveResolutionsForCurrentCat();
    const state = stateRef.current;
    if (!state) return null;

    const nextIdx = state.currentReviewCategoryIndex + 1;
    if (nextIdx < state.selectedCats.length) {
      return hostStartReview(nextIdx);
    } else {
      // Round Results
      const roundPoints: Record<string, number> = {};
      const newPlayers = { ...state.players };

      Object.keys(newPlayers).forEach(id => {
        roundPoints[id] = 0;
        state.selectedCats.forEach(cat => {
          if (resolutionsRef.current[cat] && resolutionsRef.current[cat][id]) {
            roundPoints[id] += resolutionsRef.current[cat][id].points;
          }
        });
        newPlayers[id].score += roundPoints[id];
      });

      applyState({
        ...state,
        phase: 'ROUND_RESULTS',
        players: newPlayers,
        roundPoints
      });

      return {
        roundPoints,
        players: newPlayers
      };
    }
  };

  const handlePlayerDisconnect = (peerId: string) => {
    const state = stateRef.current;
    if (!state) return null;

    const players = { ...state.players };
    if (!players[peerId]) return null;

    delete players[peerId];
    
    // In Stop, if there are < 2 players left, the game is over
    const isGameOver = Object.keys(players).length < 2;

    const newState: StopGameState = {
      ...state,
      players
    };

    applyState(newState);

    return {
      loser: peerId,
      players,
      isGameOver
    };
  };

  return {
    gameState,
    stateRef,
    applyState,
    initGameAsHost,
    hostReceiveAnswers,
    hostStartReview,
    hostReceiveVote,
    hostResolveVotes,
    hostNextCategoryOrResults,
    resolutionsRef,
    handlePlayerDisconnect,
  };
}
