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
import { loadCharacterCatalog } from './cardCatalog';

const CHARACTER_CATALOG_BY_DEFINITION_ID = new Map(
  loadCharacterCatalog(ALPHA_1_CHARACTER_DEFINITIONS).map(entry => [entry.definitionId, entry]),
);

function getCharacterVisualFallback(definitionId: string | undefined): {
  visualMode?: 'layered-art' | 'full-card-face';
  artImageUrl?: string;
  fullCardFaceImageUrl?: string;
} {
  if (!definitionId) {
    return {};
  }

  const entry = CHARACTER_CATALOG_BY_DEFINITION_ID.get(definitionId);
  if (!entry) {
    return {};
  }

  return {
    visualMode: entry.visualMode,
    artImageUrl: entry.artImageUrl,
    fullCardFaceImageUrl: entry.fullCardFaceImageUrl,
  };
}

export type RandomFn = () => number;

const Y_SETUP_SPACES: BoardSpace[] = ['P1_1', 'P1_2', 'P1_3', 'P1_4', 'P1_5'];
const A_SETUP_SPACES: BoardSpace[] = ['P2_1', 'P2_2', 'P2_3', 'P2_4', 'P2_5'];
const ALL_SETUP_SPACES: BoardSpace[] = [...Y_SETUP_SPACES, ...A_SETUP_SPACES];
const KING_SPOTS: BoardSpace[] = ['P1_3', 'P2_3'];

export interface PlayerSafeCardView {
  instanceId: string;
  controller: Controller;
  boardPosition: BoardSpace;
  isKingSpot: boolean;
  isKing: boolean;
  revealed: boolean;
  alive: boolean;
  isFrozen?: boolean;
  attachments?: Array<{
    instanceId: string;
    definitionId: string;
    displayName: string;
    ATK: number;
    DEF: number;
    specialUsed?: boolean;
  }>;
  displayName?: string;
  ATK?: number;
  DEF?: number;
  definitionId?: string;
  ability?: string | null;
  statRule?: string | null;
  visualMode?: 'layered-art' | 'full-card-face';
  artImageUrl?: string;
  fullCardFaceImageUrl?: string;
}

export interface PlayerSafeGameView {
  activePlayer: Controller;
  turnNumber: number;
  gameStatus: GameState['gameStatus'];
  kingSpots: BoardSpace[];
  drawCount: { P1: number; P2: number };
  powerCardHandCount: { P1: number; P2: number };
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
    visualMode?: 'layered-art' | 'full-card-face';
    artImageUrl?: string;
    fullCardFaceImageUrl?: string;
  }>;
  eventLog: Array<{
    turn: number;
    activePlayer: Controller;
    action: string;
  }>;
}

function normalizeName(name: string | undefined): string {
  return (name ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function isRickGrimes(name: string | undefined): boolean {
  return normalizeName(name) === 'RICKGRIMES';
}

function isCarlGrimes(name: string | undefined): boolean {
  return normalizeName(name) === 'CARLGRIMES';
}

function getAttachmentStatValue(
  attachment: Character['attachments'][number],
  stat: 'ATK' | 'DEF',
): number {
  if (attachment.definitionId === 'power-alpha-027') {
    return 2;
  }
  return attachment[stat] ?? 0;
}

function buildOpaqueInstanceId(oneBasedIndex: number): string {
  return `card-${String(oneBasedIndex).padStart(3, '0')}`;
}

function buildAlphaInstances(definitions: CharacterCardDefinition[]): CharacterDeckCard[] {
  const visualCatalog = loadCharacterCatalog(definitions);
  const visualByDefinitionId = new Map(visualCatalog.map(entry => [entry.definitionId, entry]));

  return definitions.map((def, index) => ({
    instanceId: buildOpaqueInstanceId(index + 1),
    definitionId: def.definitionId,
    displayName: def.displayName,
    ATK: def.printedATK,
    DEF: def.printedDEF,
    ability: def.ability,
    statRule: def.statRule,
    imageKey: def.imageKey,
    visualMode: visualByDefinitionId.get(def.definitionId)?.visualMode,
    artImageUrl: visualByDefinitionId.get(def.definitionId)?.artImageUrl,
    fullCardFaceImageUrl: visualByDefinitionId.get(def.definitionId)?.fullCardFaceImageUrl,
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
  if (firstPlayer !== 'P1' && firstPlayer !== 'P2') {
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
      attachments: [],
      isFrozen: false,
      ability: card.ability,
      statRule: card.statRule,
      imageKey: card.imageKey,
      visualMode: card.visualMode,
      artImageUrl: card.artImageUrl,
      fullCardFaceImageUrl: card.fullCardFaceImageUrl,
      controller: 'P1',
      isKing: boardPosition === 'P1_3',
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
      attachments: [],
      isFrozen: false,
      ability: card.ability,
      statRule: card.statRule,
      imageKey: card.imageKey,
      visualMode: card.visualMode,
      artImageUrl: card.artImageUrl,
      fullCardFaceImageUrl: card.fullCardFaceImageUrl,
      controller: 'P2',
      isKing: boardPosition === 'P2_3',
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
    powerCardHands: { P1: yPowerCards, P2: aPowerCards },
    usedPowerCardPile: [],
  };
}

export interface SessionDeckPools {
  unusedCharacterDeck: CharacterDeckCard[];
  usedCharacterPile: CharacterDeckCard[];
  unusedPowerDeck: PowerCardInstance[];
  usedPowerCardPile: PowerCardInstance[];
}

export interface SessionUsedCardIds {
  usedCharacterInstanceIds: string[];
  usedPowerInstanceIds: string[];
}

function uniqueCharacterCards(cards: CharacterDeckCard[]): CharacterDeckCard[] {
  const seen = new Set<string>();
  const unique: CharacterDeckCard[] = [];
  for (const card of cards) {
    if (seen.has(card.instanceId)) {
      continue;
    }
    seen.add(card.instanceId);
    unique.push(card);
  }
  return unique;
}

function uniquePowerCards(cards: PowerCardInstance[]): PowerCardInstance[] {
  const seen = new Set<string>();
  const unique: PowerCardInstance[] = [];
  for (const card of cards) {
    if (seen.has(card.instanceId)) {
      continue;
    }
    seen.add(card.instanceId);
    unique.push(card);
  }
  return unique;
}

function buildGameStateFromDecks(
  firstPlayer: Controller,
  characterDeck: CharacterDeckCard[],
  powerDeck: PowerCardInstance[],
): GameState {
  if (characterDeck.length < 10) {
    throw new Error('Cannot create setup: fewer than 10 character cards are available for setup');
  }
  if (powerDeck.length < 6) {
    throw new Error('Cannot create setup: fewer than 6 power cards are available for setup');
  }

  const yDealt = characterDeck.slice(0, 5);
  const aDealt = characterDeck.slice(5, 10);
  const hiddenDeck = characterDeck.slice(10);

  const yPowerCards = powerDeck.slice(0, 3);
  const aPowerCards = powerDeck.slice(3, 6);
  const remainingPowerDeck = powerDeck.slice(6);

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
      attachments: [],
      isFrozen: false,
      ability: card.ability,
      statRule: card.statRule,
      imageKey: card.imageKey,
      visualMode: card.visualMode,
      artImageUrl: card.artImageUrl,
      fullCardFaceImageUrl: card.fullCardFaceImageUrl,
      controller: 'P1',
      isKing: boardPosition === 'P1_3',
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
      attachments: [],
      isFrozen: false,
      ability: card.ability,
      statRule: card.statRule,
      imageKey: card.imageKey,
      visualMode: card.visualMode,
      artImageUrl: card.artImageUrl,
      fullCardFaceImageUrl: card.fullCardFaceImageUrl,
      controller: 'P2',
      isKing: boardPosition === 'P2_3',
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
    powerCardHands: { P1: yPowerCards, P2: aPowerCards },
    usedPowerCardPile: [],
  };
}

export function createInitialSessionDeckPools(randomFn: RandomFn = Math.random): SessionDeckPools {
  return {
    unusedCharacterDeck: shuffleCharacterInstances(buildAlphaInstances(ALPHA_1_CHARACTER_DEFINITIONS), randomFn),
    usedCharacterPile: [],
    unusedPowerDeck: shufflePowerCardInstances(buildFirstAlphaPowerCardDeck(), randomFn),
    usedPowerCardPile: [],
  };
}

export function createMultiGameSessionSetup(
  firstPlayer: Controller,
  randomFn: RandomFn,
  pools: SessionDeckPools,
): GameState {
  // Session decks are shuffled once at session start; subsequent games consume
  // cards in tracked order from the remaining unused stacks.
  // If there are not enough cards left for a full setup, consume all remaining
  // session cards first and top up from used piles for one final game.
  const unusedCharacters = uniqueCharacterCards(pools.unusedCharacterDeck);
  const usedCharacters = uniqueCharacterCards(pools.usedCharacterPile);
  const unusedPower = uniquePowerCards(pools.unusedPowerDeck);
  const usedPower = uniquePowerCards(pools.usedPowerCardPile);

  const neededCharactersFromUsed = Math.max(0, 10 - unusedCharacters.length);
  const neededPowerFromUsed = Math.max(0, 6 - unusedPower.length);

  if (unusedCharacters.length + usedCharacters.length < 10) {
    throw new Error('Cannot create setup: fewer than 10 character cards are available across session decks');
  }
  if (unusedPower.length + usedPower.length < 6) {
    throw new Error('Cannot create setup: fewer than 6 power cards are available across session decks');
  }

  const shuffledUsedCharacters = shuffleCharacterInstances(usedCharacters, randomFn);
  const shuffledUsedPower = shufflePowerCardInstances(usedPower, randomFn);

  const characterSupplements = shuffledUsedCharacters.slice(0, neededCharactersFromUsed);
  const powerSupplements = shuffledUsedPower.slice(0, neededPowerFromUsed);

  const characterDeckForGame = [...unusedCharacters, ...characterSupplements];
  const powerDeckForGame = [...unusedPower, ...powerSupplements];

  // During the final runout setup, cards from used piles that were not dealt
  // into this game become backup draw piles for any in-game draw effects.
  const backupCharacterPile = shuffledUsedCharacters.slice(neededCharactersFromUsed);
  const backupPowerPile = shuffledUsedPower.slice(neededPowerFromUsed);

  const usesRunoutTopUp = neededCharactersFromUsed > 0 || neededPowerFromUsed > 0;

  const nextState = buildGameStateFromDecks(
    firstPlayer,
    characterDeckForGame,
    powerDeckForGame,
  );

  return {
    ...nextState,
    sessionRunoutOccurred: usesRunoutTopUp,
    sessionUsedCharacterPile: backupCharacterPile,
    sessionUsedPowerCardPile: backupPowerPile,
  };
}

export function collectSessionUsedCardIds(state: GameState): SessionUsedCardIds {
  const usedCharacterIds = new Set<string>();
  const usedPowerIds = new Set<string>();

  for (const character of state.characters) {
    usedCharacterIds.add(character.id);
    for (const attachment of character.attachments ?? []) {
      usedPowerIds.add(attachment.instanceId);
    }
  }

  for (const character of state.graveyard) {
    usedCharacterIds.add(character.id);
    for (const attachment of character.attachments ?? []) {
      usedPowerIds.add(attachment.instanceId);
    }
  }

  for (const card of state.powerCardHands.P1) {
    usedPowerIds.add(card.instanceId);
  }
  for (const card of state.powerCardHands.P2) {
    usedPowerIds.add(card.instanceId);
  }
  for (const card of state.usedPowerCardPile) {
    usedPowerIds.add(card.instanceId);
  }

  return {
    usedCharacterInstanceIds: [...usedCharacterIds],
    usedPowerInstanceIds: [...usedPowerIds],
  };
}

export function advanceSessionDeckPools(
  pools: SessionDeckPools,
  gameState: GameState,
): SessionDeckPools {
  const used = collectSessionUsedCardIds(gameState);
  const usedCharacterSet = new Set(used.usedCharacterInstanceIds);
  const usedPowerSet = new Set(used.usedPowerInstanceIds);

  const allCharacters = buildAlphaInstances(ALPHA_1_CHARACTER_DEFINITIONS);
  const allPowers = buildFirstAlphaPowerCardDeck();
  const characterById = new Map(allCharacters.map(card => [card.instanceId, card]));
  const powerById = new Map(allPowers.map(card => [card.instanceId, card]));

  return {
    unusedCharacterDeck: pools.unusedCharacterDeck.filter(card => !usedCharacterSet.has(card.instanceId)),
    usedCharacterPile: uniqueCharacterCards([
      ...pools.usedCharacterPile,
      ...used.usedCharacterInstanceIds
        .map(id => characterById.get(id))
        .filter((card): card is CharacterDeckCard => !!card),
    ]),
    unusedPowerDeck: pools.unusedPowerDeck.filter(card => !usedPowerSet.has(card.instanceId)),
    usedPowerCardPile: uniquePowerCards([
      ...pools.usedPowerCardPile,
      ...used.usedPowerInstanceIds
        .map(id => powerById.get(id))
        .filter((card): card is PowerCardInstance => !!card),
    ]),
  };
}

export function getPlayerGameView(state: GameState): PlayerSafeGameView {
  const boardCards: PlayerSafeCardView[] = [];
  const powerCardHandCount = getPowerCardHandCounts(state);
  const hasLivingRevealedRick = state.characters.some(character => (
    character.alive
    && character.revealed
    && isRickGrimes(character.displayName)
  ));
  const hasRevealedCarl = state.characters.some(character => (
    character.revealed
    && isCarlGrimes(character.displayName)
  ));

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
      isFrozen: card.isFrozen ?? false,
      attachments: (card.attachments ?? []).map(attachment => ({
        instanceId: attachment.instanceId,
        definitionId: attachment.definitionId,
        displayName: attachment.displayName,
        ATK: getAttachmentStatValue(attachment, 'ATK'),
        DEF: getAttachmentStatValue(attachment, 'DEF'),
        specialUsed: attachment.specialUsed,
      })),
    };

    if (card.revealed) {
      const visualFallback = getCharacterVisualFallback(card.definitionId);
      const hasRickCarlBonus = hasLivingRevealedRick
        && hasRevealedCarl
        && (isRickGrimes(card.displayName) || isCarlGrimes(card.displayName));
      const attachmentBonus = (card.attachments ?? []).reduce(
        (total, attachment) => ({
          ATK: total.ATK + getAttachmentStatValue(attachment, 'ATK'),
          DEF: total.DEF + getAttachmentStatValue(attachment, 'DEF'),
        }),
        { ATK: 0, DEF: 0 },
      );
      safeCard.displayName = card.displayName ?? 'Unknown';
      safeCard.ATK = card.ATK + attachmentBonus.ATK + (hasRickCarlBonus ? 2 : 0);
      safeCard.DEF = card.DEF + attachmentBonus.DEF + (hasRickCarlBonus ? 2 : 0);
      safeCard.definitionId = card.definitionId;
      safeCard.ability = card.ability ?? null;
      safeCard.statRule = hasRickCarlBonus
        ? `${card.statRule ? `${card.statRule} | ` : ''}+2 ATK / +2 DEF while RICK is alive/revealed and CARL is revealed`
        : (card.statRule ?? null);
      safeCard.visualMode = card.visualMode ?? visualFallback.visualMode;
      safeCard.artImageUrl = card.artImageUrl ?? visualFallback.artImageUrl;
      safeCard.fullCardFaceImageUrl = card.fullCardFaceImageUrl ?? visualFallback.fullCardFaceImageUrl;
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
    graveyard: state.graveyard.map(card => {
      const visualFallback = getCharacterVisualFallback(card.definitionId);
      return {
        instanceId: card.id,
        displayName: card.displayName ?? 'Unknown',
        definitionId: card.definitionId,
        ATK: card.ATK,
        DEF: card.DEF,
        ability: card.ability ?? null,
        statRule: card.statRule ?? null,
        visualMode: card.visualMode ?? visualFallback.visualMode,
        artImageUrl: card.artImageUrl ?? visualFallback.artImageUrl,
        fullCardFaceImageUrl: card.fullCardFaceImageUrl ?? visualFallback.fullCardFaceImageUrl,
      };
    }),
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
