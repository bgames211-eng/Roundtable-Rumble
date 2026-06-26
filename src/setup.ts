import { type CharacterCardDefinition, ALPHA_1_CHARACTER_DEFINITIONS } from './cardDefinitions';
import {
  type BoardSpace,
  type Character,
  type CharacterDeckCard,
  type Controller,
  type GameState,
  getPowerCardHandCounts,
  initializeGameState,
} from './gameState';
import {
  type PowerCardInstance,
  buildFirstAlphaPowerCardDeck,
  getPrivateHandForPlayer,
  shufflePowerCardInstances,
} from './powerCards';

export type RandomFn = () => number;

const Y_SETUP_SPACES: BoardSpace[] = ['Y1', 'Y2', 'Y3', 'Y4', 'Y5'];
const A_SETUP_SPACES: BoardSpace[] = ['A1', 'A2', 'A3', 'A4', 'A5'];
const ALL_SETUP_SPACES: BoardSpace[] = [...Y_SETUP_SPACES, ...A_SETUP_SPACES];
const KING_SPOTS: BoardSpace[] = ['Y3', 'A3'];

export interface PlayerSafeCardView {
  instanceId: string;
  controller: Controller;
  boardPosition: BoardSpace;
  isKingSpot: boolean;
  isKing: boolean;
  revealed: boolean;
  alive: boolean;
  displayName?: string;
  ATK?: number;
  DEF?: number;
  definitionId?: string;
  ability?: string | null;
  statRule?: string | null;
}

export interface PlayerSafeGameView {
  activePlayer: Controller;
  turnNumber: number;
  gameStatus: GameState['gameStatus'];
  kingSpots: BoardSpace[];
  drawCount: { Y: number; A: number };
  powerCardHandCount: { Y: number; A: number };
  powerCards: {
    remainingDeckCount: number;
    usedPileCount: number;
    usedPileDefinitionIds: string[];
  };
  characterDeck: { remainingCount: number };
  boardCards: PlayerSafeCardView[];
  graveyard: Array<{
    instanceId: string;
    displayName: string;
    definitionId?: string;
    ATK: number;
    DEF: number;
    ability?: string | null;
    statRule?: string | null;
  }>;
  eventLog: Array<{
    turn: number;
    activePlayer: Controller;
    action: string;
  }>;
}

function buildOpaqueInstanceId(oneBasedIndex: number): string {
  return `card-${String(oneBasedIndex).padStart(3, '0')}`;
}

function buildAlphaInstances(definitions: CharacterCardDefinition[]): CharacterDeckCard[] {
  return definitions.map((def, index) => ({
    instanceId: buildOpaqueInstanceId(index + 1),
    definitionId: def.definitionId,
    displayName: def.displayName,
    ATK: def.printedATK,
    DEF: def.printedDEF,
    ability: def.ability,
    statRule: def.statRule,
    imageKey: def.imageKey,
  }));
}

export function shuffleCharacterInstances(
  instances: CharacterDeckCard[],
  randomFn: RandomFn,
): CharacterDeckCard[] {
  const shuffled = [...instances];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const randomValue = randomFn();
    if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
      throw new Error('Random function must return a finite number in [0, 1).');
    }
    const j = Math.floor(randomValue * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function createStandardGameSetup(firstPlayer: Controller, randomFn: RandomFn): GameState {
  if (firstPlayer !== 'Y' && firstPlayer !== 'A') {
    throw new Error('firstPlayer must be Y or A');
  }

  const instances = buildAlphaInstances(ALPHA_1_CHARACTER_DEFINITIONS);
  const shuffled = shuffleCharacterInstances(instances, randomFn);

  const yDealt = shuffled.slice(0, 5);
  const aDealt = shuffled.slice(5, 10);
  const hiddenDeck = shuffled.slice(10);

  const shuffledPowerDeck = shufflePowerCardInstances(buildFirstAlphaPowerCardDeck(), randomFn);
  const yPowerCards = shuffledPowerDeck.slice(0, 3);
  const aPowerCards = shuffledPowerDeck.slice(3, 6);
  const remainingPowerDeck = shuffledPowerDeck.slice(6);

  const dealtCharacters: Character[] = [];

  for (let i = 0; i < 5; i += 1) {
    const card = yDealt[i];
    const boardPosition = Y_SETUP_SPACES[i];
    dealtCharacters.push({
      id: card.instanceId,
      definitionId: card.definitionId,
      displayName: card.displayName,
      ATK: card.ATK,
      DEF: card.DEF,
      ability: card.ability,
      statRule: card.statRule,
      imageKey: card.imageKey,
      controller: 'Y',
      isKing: boardPosition === 'Y3',
      revealed: false,
      alive: true,
      boardPosition,
    });
  }

  for (let i = 0; i < 5; i += 1) {
    const card = aDealt[i];
    const boardPosition = A_SETUP_SPACES[i];
    dealtCharacters.push({
      id: card.instanceId,
      definitionId: card.definitionId,
      displayName: card.displayName,
      ATK: card.ATK,
      DEF: card.DEF,
      ability: card.ability,
      statRule: card.statRule,
      imageKey: card.imageKey,
      controller: 'A',
      isKing: boardPosition === 'A3',
      revealed: false,
      alive: true,
      boardPosition,
    });
  }

  const baseState = initializeGameState(dealtCharacters);

  return {
    ...baseState,
    activePlayer: firstPlayer,
    characterDeck: hiddenDeck,
    powerCardDeck: remainingPowerDeck,
    powerCardHands: { Y: yPowerCards, A: aPowerCards },
    usedPowerCardPile: [],
  };
}

export function getPlayerGameView(state: GameState): PlayerSafeGameView {
  const boardCards: PlayerSafeCardView[] = [];
  const powerCardHandCount = getPowerCardHandCounts(state);

  for (const space of ALL_SETUP_SPACES) {
    const card = state.characters.find(ch => ch.alive && ch.boardPosition === space);
    if (!card) {
      continue;
    }

    const safeCard: PlayerSafeCardView = {
      instanceId: card.id,
      controller: card.controller,
      boardPosition: space,
      isKingSpot: KING_SPOTS.includes(space),
      isKing: card.isKing,
      revealed: card.revealed,
      alive: card.alive,
    };

    if (card.revealed) {
      safeCard.displayName = card.displayName ?? 'Unknown';
      safeCard.ATK = card.ATK;
      safeCard.DEF = card.DEF;
      safeCard.definitionId = card.definitionId;
      safeCard.ability = card.ability ?? null;
      safeCard.statRule = card.statRule ?? null;
    }

    boardCards.push(safeCard);
  }

  return {
    activePlayer: state.activePlayer,
    turnNumber: state.turnNumber,
    gameStatus: state.gameStatus,
    kingSpots: [...KING_SPOTS],
    drawCount: { ...state.drawCount },
    powerCardHandCount,
    powerCards: {
      remainingDeckCount: state.powerCardDeck.length,
      usedPileCount: state.usedPowerCardPile.length,
      usedPileDefinitionIds: state.usedPowerCardPile.map(card => card.definitionId),
    },
    characterDeck: {
      remainingCount: state.characterDeck.length,
    },
    boardCards,
    graveyard: state.graveyard.map(card => ({
      instanceId: card.id,
      displayName: card.displayName ?? 'Unknown',
      definitionId: card.definitionId,
      ATK: card.ATK,
      DEF: card.DEF,
      ability: card.ability ?? null,
      statRule: card.statRule ?? null,
    })),
    eventLog: state.eventLog.map(event => ({
      turn: event.turn,
      activePlayer: event.activePlayer,
      action: event.action,
    })),
  };
}

export interface PrivatePowerCardView {
  instanceId: string;
  definitionId: string;
}

/**
 * Returns only the requested player's own power-card hand.
 */
export function getPrivatePowerCardHand(
  state: GameState,
  player: Controller,
): PrivatePowerCardView[] {
  const privateHand: PowerCardInstance[] = getPrivateHandForPlayer(state.powerCardHands, player);
  return privateHand.map(card => ({
    instanceId: card.instanceId,
    definitionId: card.definitionId,
  }));
}
