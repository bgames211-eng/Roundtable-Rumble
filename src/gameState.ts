/**
 * PHASE 2: GAME STATE MODULE
 * 
 * Manages Phase 2 game state structure, initialization, and utility functions.
 * All state updates are immutable.
 */

import { getForwardSpace, getBackwardSpace, getTerritory } from './board';
import {
  type PowerCardInstance,
  type UsedPowerCardEntry,
  buildFirstAlphaPowerCardDeck,
  countPowerCardsByController,
} from './powerCards';

export type BoardSpace = 'P1_1' | 'P1_2' | 'P1_3' | 'P1_4' | 'P1_5' | 'P2_1' | 'P2_2' | 'P2_3' | 'P2_4' | 'P2_5';
export type Controller = 'P1' | 'P2';
export type GameStatus = 'active' | 'P1 wins' | 'P2 wins' | 'draw';
export type BattleStatus = 'WindowOpen' | 'ReadyToResolve' | 'Resolving';
export type BattleType = 'attack' | 'defend';

export interface CharacterDeckCard {
  instanceId: string;
  definitionId: string;
  displayName: string;
  ATK: number;
  DEF: number;
  ability: string | null;
  statRule: string | null;
  imageKey: string;
  visualMode?: 'layered-art' | 'full-card-face';
  artImageUrl?: string;
  fullCardFaceImageUrl?: string;
}

export interface Character {
  id: string;
  controller: Controller;
  ATK: number;
  DEF: number;
  attachments?: CharacterAttachment[];
  isFrozen?: boolean;
  abilityUsed?: boolean;
  definitionId?: string;
  displayName?: string;
  ability?: string | null;
  statRule?: string | null;
  imageKey?: string;
  visualMode?: 'layered-art' | 'full-card-face';
  artImageUrl?: string;
  fullCardFaceImageUrl?: string;
  isKing: boolean;
  revealed: boolean;
  alive: boolean;
  boardPosition: BoardSpace | null;
}

export interface ActionEvent {
  turn: number;
  activePlayer: Controller;
  action: string;
  details: Record<string, unknown>;
}

export interface PendingBattle {
  isFinalKingDuel?: boolean;
  battleType: BattleType;
  status: BattleStatus;
  initiatorId: string;
  opponentId: string;
  initiatorController: Controller;
  opponentController: Controller;
  initiatorStartPosition: BoardSpace;
  opponentStartPosition: BoardSpace;
  initiatorBaseComparisonStat: number;
  opponentBaseComparisonStat: number;
  currentPriorityPlayer: Controller;
  consecutivePassCount: number;
  readyPlayers: { P1: boolean; P2: boolean };
  handoffRequiredFor: Controller | null;
  comparisonStatOverrides: Partial<Record<Controller, 'ATK' | 'DEF'>>;
  statsSwapped: boolean;
  temporaryModifiers: BattleTemporaryModifier[];
  usedPowerPileStartCount: number;
  riddlerStatSourceByCharacterId: Record<string, CharacterDeckCard>;
  riddlerConsumedCards: CharacterDeckCard[];
  boomerangLockedByController?: { P1: boolean; P2: boolean };
  activeBoomerangFlight?: {
    sourceController: Controller;
    sourceInstanceId: string;
    sourceCharacterId?: string;
    targetCharacterId: string;
    origin: 'hand' | 'sokka';
    returnToHandAfterBattle: boolean;
  } | null;
  eventHistory: string[];
}

export interface BattleTemporaryModifier {
  sourceInstanceId: string;
  sourceDefinitionId: string;
  sourceDisplayName: string;
  controller: Controller;
  targetCharacterId: string;
  stat: 'ATK' | 'DEF';
  amount: number;
  effectSummary: string;
  selectedChoice: 'ATK' | 'DEF' | null;
}

export interface CharacterAttachment {
  instanceId: string;
  definitionId: string;
  displayName: string;
  category: 'weapon' | 'follower';
  ATK: number;
  DEF: number;
  specialUsed?: boolean;
  infinityEmpowered?: boolean;
}

export interface PersistentCharacterModifier {
  ATK: number;
  DEF: number;
}

export interface ActiveForgeLocation {
  position: BoardSpace;
  cardInstanceId: string;
  sourceController: Controller;
}

export interface GameState {
  activePlayer: Controller;
  turnNumber: number;
  characters: Character[];
  characterDeck: CharacterDeckCard[];
  sessionUsedCharacterPile: CharacterDeckCard[];
  powerCardDeck: PowerCardInstance[];
  sessionUsedPowerCardPile: PowerCardInstance[];
  powerCardHands: { P1: PowerCardInstance[]; P2: PowerCardInstance[] };
  publicPowerCardHandCount?: { P1: number; P2: number };
  usedPowerCardPile: UsedPowerCardEntry[];
  sessionMode: 'single-game' | 'multi-game';
  sessionGameNumber: number;
  sessionRunoutOccurred: boolean;
  persistentCharacterModifiers: Record<string, PersistentCharacterModifier>;
  graveyard: Character[];
  drawCount: { P1: number; P2: number };
  gameStatus: GameStatus;
  eventLog: ActionEvent[];
  pendingBattle: PendingBattle | null;
  revealedPowerCardInstanceIds?: { P1: string[]; P2: string[] };
  thanosFirstCrossTriggered?: boolean;
  infinityStoneSeenByController?: { P1: string[]; P2: string[] };
  infinityGauntletEmpowered?: boolean;
  activeForgeLocation?: ActiveForgeLocation | null;
}

/**
 * Initialize a new game with given characters.
 */
export function initializeGameState(initialCharacters: Character[]): GameState {
  const state: GameState = {
    activePlayer: 'P1',
    turnNumber: 1,
    characters: initialCharacters.map(ch => ({
      ...ch,
      alive: true,
      isFrozen: ch.isFrozen ?? false,
      abilityUsed: ch.abilityUsed ?? false,
      attachments: ch.attachments ?? [],
    })),
    characterDeck: [],
    sessionUsedCharacterPile: [],
    powerCardDeck: buildFirstAlphaPowerCardDeck(),
    sessionUsedPowerCardPile: [],
    powerCardHands: { P1: [], P2: [] },
    usedPowerCardPile: [],
    sessionMode: 'single-game',
    sessionGameNumber: 1,
    sessionRunoutOccurred: false,
    persistentCharacterModifiers: {},
    graveyard: [],
    drawCount: { P1: 0, P2: 0 },
    gameStatus: 'active',
    pendingBattle: null,
    revealedPowerCardInstanceIds: { P1: [], P2: [] },
    thanosFirstCrossTriggered: false,
    infinityStoneSeenByController: { P1: [], P2: [] },
    infinityGauntletEmpowered: false,
    activeForgeLocation: null,
    eventLog: [
      {
        turn: 1,
        activePlayer: 'P1',
        action: 'Initialize Game',
        details: { characterCount: initialCharacters.length },
      },
    ],
  };

  return state;
}

/**
 * Get a living character by ID.
 */
export function getCharacter(state: GameState, characterId: string): Character | undefined {
  return state.characters.find(ch => ch.id === characterId);
}

/**
 * Get all living characters controlled by a player.
 */
export function getCharactersByController(state: GameState, controller: Controller): Character[] {
  return state.characters.filter(ch => ch.controller === controller);
}

/**
 * Get a character at a specific board position (must be living and alive).
 */
export function getCharacterAtPosition(state: GameState, position: BoardSpace): Character | undefined {
  return state.characters.find(ch => ch.boardPosition === position && ch.alive);
}

/**
 * Check if a board position is empty (no living character).
 */
export function isPositionEmpty(state: GameState, position: BoardSpace): boolean {
  return getCharacterAtPosition(state, position) === undefined;
}

/**
 * Get the territory of a board space ('P1' or 'P2').
 */
export function getSpaceTerritory(space: BoardSpace): Controller {
  return getTerritory(space) as Controller;
}

/**
 * Check if a King is alive for a given controller.
 */
export function isKingAlive(state: GameState, controller: Controller): boolean {
  return state.characters.some(
    ch => ch.controller === controller && ch.isKing && ch.alive,
  );
}

/**
 * Count living characters for a controller.
 */
export function countLivingCharacters(state: GameState, controller: Controller): number {
  return state.characters.filter(ch => ch.controller === controller && ch.alive).length;
}

/**
 * Get the King for a controller (if alive).
 */
export function getKing(state: GameState, controller: Controller): Character | undefined {
  return state.characters.find(
    ch => ch.controller === controller && ch.isKing && ch.alive,
  );
}

/**
 * Determine if a Final King Duel should happen and resolve it immediately if so.
 * Precondition: game.gameStatus === 'active'
 */
export function checkAndResolveFinalKingDuel(state: GameState): GameState {
  if (state.gameStatus !== 'active') {
    return state;
  }

  const yLiving = state.characters.filter(ch => ch.controller === 'P1' && ch.alive);
  const aLiving = state.characters.filter(ch => ch.controller === 'P2' && ch.alive);

  // Must be exactly one living character per side, and both must be Kings
  if (yLiving.length !== 1 || aLiving.length !== 1) {
    return state;
  }

  const yKing = yLiving[0];
  const aKing = aLiving[0];

  if (!yKing.isKing || !aKing.isKing) {
    return state;
  }

  // Resolve Final King Duel: Y ATK vs A ATK
  let newStatus: GameStatus = 'active';
  if (yKing.ATK > aKing.ATK) {
    newStatus = 'P1 wins';
  } else if (aKing.ATK > yKing.ATK) {
    newStatus = 'P2 wins';
  } else {
    // Tie in Final King Duel = draw
    newStatus = 'draw';
  }

  const newLog: ActionEvent = {
    turn: state.turnNumber,
    activePlayer: state.activePlayer,
    action: 'Final King Duel',
    details: {
      yKingId: yKing.id,
      yATK: yKing.ATK,
      aKingId: aKing.id,
      aATK: aKing.ATK,
      outcome: newStatus,
    },
  };

  return {
    ...state,
    gameStatus: newStatus,
    eventLog: [...state.eventLog, newLog],
  };
}

/**
 * Check if exactly one King per side exists and if exactly one living character per side exists.
 * Used to determine if Final King Duel is possible.
 */
export function shouldTriggerFinalKingDuel(state: GameState): boolean {
  if (state.gameStatus !== 'active') {
    return false;
  }

  const yLiving = state.characters.filter(ch => ch.controller === 'P1' && ch.alive);
  const aLiving = state.characters.filter(ch => ch.controller === 'P2' && ch.alive);

  if (yLiving.length !== 1 || aLiving.length !== 1) {
    return false;
  }

  return yLiving[0].isKing && aLiving[0].isKing;
}

/**
 * Validate and maintain board-state invariants after each action.
 * Throws error if invariants violated.
 */
export function validateBoardStateInvariants(state: GameState): void {
  const positions = new Set<BoardSpace>();

  for (const ch of state.characters) {
    // Invariant 1: Living character must have non-null position
    if (ch.alive && ch.boardPosition === null) {
      throw new Error(`Invariant violated: living character ${ch.id} has null boardPosition`);
    }

    // Invariant 2: Dead character must have null position
    if (!ch.alive && ch.boardPosition !== null) {
      throw new Error(`Invariant violated: dead character ${ch.id} has non-null boardPosition`);
    }

    // Invariant 3: No two living characters at same position
    if (ch.alive && ch.boardPosition !== null) {
      if (positions.has(ch.boardPosition)) {
        throw new Error(
          `Invariant violated: two living characters at same position ${ch.boardPosition}`,
        );
      }
      positions.add(ch.boardPosition);
    }
  }
}

/**
 * Create an immutable copy of a character with updated fields.
 */
export function updateCharacter(
  character: Character,
  updates: Partial<Character>,
): Character {
  return { ...character, ...updates };
}

/**
 * Create a new game state with updated characters array.
 */
export function updateCharacters(
  state: GameState,
  updateFn: (characters: Character[]) => Character[],
): GameState {
  const newCharacters = updateFn([...state.characters]);
  validateBoardStateInvariants({ ...state, characters: newCharacters });
  return { ...state, characters: newCharacters };
}

/**
 * Add a character to the graveyard (in order).
 */
export function addToGraveyard(state: GameState, character: Character): GameState {
  return {
    ...state,
    graveyard: [...state.graveyard, { ...character, alive: false }],
  };
}

/**
 * Create a log entry and append to event log.
 */
export function logEvent(
  state: GameState,
  action: string,
  details: Record<string, unknown>,
): GameState {
  const event: ActionEvent = {
    turn: state.turnNumber,
    activePlayer: state.activePlayer,
    action,
    details,
  };
  return {
    ...state,
    eventLog: [...state.eventLog, event],
  };
}

/**
 * Get the number of living characters for each controller.
 */
export function getLivingCharacterCounts(state: GameState): { P1: number; P2: number } {
  return {
    P1: state.characters.filter(ch => ch.controller === 'P1' && ch.alive).length,
    P2: state.characters.filter(ch => ch.controller === 'P2' && ch.alive).length,
  };
}

/**
 * Derive public power-card hand counts from authoritative private hands.
 */
export function getPowerCardHandCounts(state: GameState): { P1: number; P2: number } {
  if (state.publicPowerCardHandCount) {
    return state.publicPowerCardHandCount;
  }
  return countPowerCardsByController(state.powerCardHands);
}
