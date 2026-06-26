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

export type BoardSpace = 'Y1' | 'Y2' | 'Y3' | 'Y4' | 'Y5' | 'A1' | 'A2' | 'A3' | 'A4' | 'A5';
export type Controller = 'Y' | 'A';
export type GameStatus = 'active' | 'Y wins' | 'A wins' | 'draw';
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
}

export interface Character {
  id: string;
  controller: Controller;
  ATK: number;
  DEF: number;
  definitionId?: string;
  displayName?: string;
  ability?: string | null;
  statRule?: string | null;
  imageKey?: string;
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
  handoffRequiredFor: Controller | null;
  comparisonStatOverrides: Partial<Record<Controller, 'ATK' | 'DEF'>>;
  temporaryModifiers: BattleTemporaryModifier[];
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

export interface PersistentCharacterModifier {
  ATK: number;
  DEF: number;
}

export interface GameState {
  activePlayer: Controller;
  turnNumber: number;
  characters: Character[];
  characterDeck: CharacterDeckCard[];
  powerCardDeck: PowerCardInstance[];
  powerCardHands: { Y: PowerCardInstance[]; A: PowerCardInstance[] };
  usedPowerCardPile: UsedPowerCardEntry[];
  persistentCharacterModifiers: Record<string, PersistentCharacterModifier>;
  graveyard: Character[];
  drawCount: { Y: number; A: number };
  gameStatus: GameStatus;
  eventLog: ActionEvent[];
  pendingBattle: PendingBattle | null;
}

/**
 * Initialize a new game with given characters.
 * If exactly one King per side exists, Final King Duel resolves immediately.
 */
export function initializeGameState(initialCharacters: Character[]): GameState {
  const state: GameState = {
    activePlayer: 'Y',
    turnNumber: 1,
    characters: initialCharacters.map(ch => ({ ...ch, alive: true })),
    characterDeck: [],
    powerCardDeck: buildFirstAlphaPowerCardDeck(),
    powerCardHands: { Y: [], A: [] },
    usedPowerCardPile: [],
    persistentCharacterModifiers: {},
    graveyard: [],
    drawCount: { Y: 0, A: 0 },
    gameStatus: 'active',
    pendingBattle: null,
    eventLog: [
      {
        turn: 1,
        activePlayer: 'Y',
        action: 'Initialize Game',
        details: { characterCount: initialCharacters.length },
      },
    ],
  };

  // Check for immediate Final King Duel at setup
  const finalDuelState = checkAndResolveFinalKingDuel(state);
  return finalDuelState;
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
 * Get the territory of a board space ('Y' or 'A').
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

  const yLiving = state.characters.filter(ch => ch.controller === 'Y' && ch.alive);
  const aLiving = state.characters.filter(ch => ch.controller === 'A' && ch.alive);

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
    newStatus = 'Y wins';
  } else if (aKing.ATK > yKing.ATK) {
    newStatus = 'A wins';
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

  const yLiving = state.characters.filter(ch => ch.controller === 'Y' && ch.alive);
  const aLiving = state.characters.filter(ch => ch.controller === 'A' && ch.alive);

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
export function getLivingCharacterCounts(state: GameState): { Y: number; A: number } {
  return {
    Y: state.characters.filter(ch => ch.controller === 'Y' && ch.alive).length,
    A: state.characters.filter(ch => ch.controller === 'A' && ch.alive).length,
  };
}

/**
 * Derive public power-card hand counts from authoritative private hands.
 */
export function getPowerCardHandCounts(state: GameState): { Y: number; A: number } {
  return countPowerCardsByController(state.powerCardHands);
}
