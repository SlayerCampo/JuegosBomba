// ================================================================
// APP VIEW — Top-level navigation enum
// ================================================================

export type AppView =
  | 'home'
  // Palabras Bomba flow
  | 'palabras-config'
  | 'palabras-lobby'
  | 'palabras-profile'
  | 'palabras-countdown'
  | 'palabras-game'
  | 'palabras-gameover'
  // STOP Bomba flow
  | 'stop-config'
  | 'stop-lobby'
  | 'stop-profile'
  | 'stop-countdown'
  | 'stop-game'
  | 'stop-review'
  | 'stop-gameover';
