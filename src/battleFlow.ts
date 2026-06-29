import { getBackwardSpace, getForwardSpace } from './board';
import {
  type CharacterDeckCard,
  type Character,
  type BattleTemporaryModifier,
  type BattleType,
  type Controller,
  type GameState,
  type PendingBattle,
  getCharacter,
  getCharacterAtPosition,
  countLivingCharacters,
  logEvent,
} from './gameState';
import {
  canAttackForward,
  canSelfDefend,
  executeAttackForward,
  executeBehindTheCurtainsSwap,
  executeSwapCharactersMove,
  executeSelfDefend,
  resolveBattle,
} from './gameEngine';
import { getPlayerGameView, getPrivatePowerCardHand, shuffleCharacterInstances, type PlayerSafeGameView } from './setup';
import { FIRST_ALPHA_POWER_CARD_DEFINITIONS, getPowerCardDefinition, type UsedPowerCardEntry } from './powerCards';
import { loadPowerCatalog } from './cardCatalog';

type StatLabel = 'ATK' | 'DEF';

interface BattleParticipantPublic {
  id: string;
  controller: Controller;
  boardPosition: string;
  isKing: boolean;
  isFrozen: boolean;
  displayName: string;
  ATK: number;
  DEF: number;
  attachments: Array<{
    instanceId: string;
    definitionId: string;
    displayName: string;
    ATK: number;
    DEF: number;
    specialUsed?: boolean;
  }>;
}

export interface BattleModifierPublic {
  sourceCardName: string;
  sourceDefinitionId?: string;
  controller: Controller;
  targetCharacterId: string;
  stat: StatLabel;
  amount: number;
  effectSummary: string;
}

export interface BattlePublicView {
  isFinalKingDuel?: boolean;
  status: PendingBattle['status'];
  battleType: BattleType;
  statsSwapped?: boolean;
  currentPriorityPlayer: Controller;
  consecutivePassCount: number;
  readyPlayers: { P1: boolean; P2: boolean };
  initiator: BattleParticipantPublic;
  opponent: BattleParticipantPublic;
  initiatorComparisonLabel: StatLabel;
  opponentComparisonLabel: StatLabel;
  initiatorBaseComparison: number;
  opponentBaseComparison: number;
  initiatorEffectiveATK: number;
  initiatorEffectiveDEF: number;
  opponentEffectiveATK: number;
  opponentEffectiveDEF: number;
  initiatorEffectiveComparison: number;
  opponentEffectiveComparison: number;
  battleEventHistory: string[];
  boardView: PlayerSafeGameView;
  powerCardHandCount: { P1: number; P2: number };
  usedPowerCards: UsedPowerCardEntry[];
  liveModifiers: BattleModifierPublic[];
  initiatorRiddlerSource: CharacterDeckCard | null;
  opponentRiddlerSource: CharacterDeckCard | null;
}

export interface PrivateBattleHandCardView {
  instanceId: string;
  definitionId: string;
  displayName: string;
  rulesText: string;
  isPlayable: boolean;
  disabledReason: string | null;
  allowedChoices: Array<'ATK' | 'DEF'>;
  visualMode?: 'layered-art' | 'full-card-face';
  artImageUrl?: string;
  fullCardFaceImageUrl?: string;
}

export interface PrivateBattleHandView {
  player: Controller;
  cards: PrivateBattleHandCardView[];
}

export interface PlayBattlePowerCardInput {
  instanceId: string;
  selectedChoice?: 'ATK' | 'DEF';
  targetCharacterId?: string;
  secondTargetCharacterId?: string;
  ownSwapCardInstanceId?: string;
  opponentSwapCardInstanceId?: string;
}

export interface ProjectedBattleResult {
  winner: Controller | 'draw';
  initiatorComparisonValue: number;
  opponentComparisonValue: number;
  winningMargin: number;
}

export interface BattleCardPlayOption {
  input: PlayBattlePowerCardInput;
  definitionId: string;
  displayName: string;
}

function normalizeName(name: string | undefined): string {
  return (name ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function isKoolAidMan(name: string | undefined): boolean {
  const normalized = normalizeName(name);
  return normalized === 'KOOLAIDMAN';
}

function isGenghisKhan(name: string | undefined): boolean {
  const normalized = normalizeName(name);
  return normalized === 'GENGHISKHAN';
}

function isBatman(name: string | undefined): boolean {
  const normalized = normalizeName(name);
  return normalized === 'BATMAN';
}

function isMrFreeze(name: string | undefined): boolean {
  const normalized = normalizeName(name);
  return normalized === 'MRFREEZE';
}

function isRapunzel(name: string | undefined): boolean {
  const normalized = normalizeName(name);
  return normalized === 'RAPUNZEL';
}

function isCarlGrimes(name: string | undefined): boolean {
  const normalized = normalizeName(name);
  return normalized === 'CARLGRIMES';
}

function isRickGrimes(name: string | undefined): boolean {
  const normalized = normalizeName(name);
  return normalized === 'RICKGRIMES';
}

function isRiddler(name: string | undefined): boolean {
  const normalized = normalizeName(name);
  return normalized === 'RIDDLER';
}

function isWeaponDefinition(definitionId: string): boolean {
  return (
    definitionId === 'power-alpha-011'
    || definitionId === 'power-alpha-012'
    || definitionId === 'power-alpha-013'
    || definitionId === 'power-alpha-014'
    || definitionId === 'power-alpha-015'
  );
}

function countAttachmentsByDefinitionId(state: GameState, characterId: string, definitionId: string): number {
  const character = getCharacter(state, characterId);
  if (!character?.attachments?.length) {
    return 0;
  }

  return character.attachments.filter(attachment => attachment.definitionId === definitionId).length;
}

function getBattlingCharacterIdForController(battle: PendingBattle, controller: Controller): string {
  return battle.initiatorController === controller ? battle.initiatorId : battle.opponentId;
}

function findTagTeamBehindCharacter(state: GameState, battle: PendingBattle, actingPlayer: Controller): Character | null {
  const ownBattlerId = getBattlingCharacterIdForController(battle, actingPlayer);
  const ownBattler = getCharacter(state, ownBattlerId);
  if (!ownBattler?.boardPosition) {
    return null;
  }

  const behindSpace = getBackwardSpace(ownBattler.boardPosition);
  const behind = getCharacterAtPosition(state, behindSpace);
  if (!behind || !behind.alive || behind.controller !== actingPlayer || behind.id === ownBattler.id) {
    return null;
  }

  return behind;
}

function getThisBattleUsedCards(state: GameState, battle: PendingBattle): UsedPowerCardEntry[] {
  return state.usedPowerCardPile.slice(battle.usedPowerPileStartCount);
}

function getLatestCancelableOpponentCardInBattle(
  state: GameState,
  battle: PendingBattle,
  actingPlayer: Controller,
): UsedPowerCardEntry | null {
  const opponent: Controller = actingPlayer === 'P1' ? 'P2' : 'P1';
  const isCancelableDefinition = (definitionId: string): boolean => definitionId.startsWith('power-alpha-');

  const thisBattleCards = getThisBattleUsedCards(state, battle)
    .filter(card => card.controller === opponent)
    .filter(card => isCancelableDefinition(card.definitionId))
    .filter(card => !card.effectSummary.toLowerCase().includes('permanent'));

  if (thisBattleCards.length === 0) {
    return null;
  }

  return thisBattleCards[thisBattleCards.length - 1];
}

function getTemporaryStatModifierTotal(
  battle: PendingBattle,
  characterId: string,
  stat: StatLabel,
): number {
  return battle.temporaryModifiers
    .filter(modifier => modifier.targetCharacterId === characterId && modifier.stat === stat)
    .reduce((total, modifier) => total + modifier.amount, 0);
}

function getPersistentStatModifierTotal(
  state: GameState,
  characterId: string,
  stat: StatLabel,
): number {
  return state.persistentCharacterModifiers[characterId]?.[stat] ?? 0;
}

function getAttachmentStatModifierTotal(
  state: GameState,
  characterId: string,
  stat: StatLabel,
): number {
  const character = getCharacter(state, characterId);
  if (!character?.attachments?.length) {
    return 0;
  }

  return character.attachments.reduce((total, attachment) => total + attachment[stat], 0);
}

function getConditionalBattleStatModifier(
  state: GameState,
  battle: PendingBattle,
  characterId: string,
  stat: StatLabel,
): number {
  let total = 0;

  const self = getCharacter(state, characterId);
  if (self && (isCarlGrimes(self.displayName) || isRickGrimes(self.displayName))) {
    const hasLivingRevealedRick = state.characters.some(character => (
      character.alive
      && character.revealed
      && character.controller === self.controller
      && isRickGrimes(character.displayName)
    ));
    const hasLivingRevealedCarl = state.characters.some(character => (
      character.alive
      && character.revealed
      && character.controller === self.controller
      && isCarlGrimes(character.displayName)
    ));
    if (hasLivingRevealedRick && hasLivingRevealedCarl) {
      total += 2;
    }
  }

  if (stat !== 'DEF') {
    return total;
  }

  const opponentId = characterId === battle.initiatorId ? battle.opponentId : battle.initiatorId;
  const opponent = getCharacter(state, opponentId);
  if (!opponent || !isBatman(opponent.displayName)) {
    return total;
  }

  const batarangCount = countAttachmentsByDefinitionId(state, opponentId, 'power-alpha-013');
  return total + (batarangCount * -2);
}

function getEffectiveBattleStat(
  state: GameState,
  battle: PendingBattle,
  characterId: string,
  stat: StatLabel,
): number {
  const character = getCharacter(state, characterId);
  if (!character) {
    throw new Error('Battle participant is missing');
  }

  const baseStat: StatLabel = battle.statsSwapped
    ? (stat === 'ATK' ? 'DEF' : 'ATK')
    : stat;
  const riddlerSource = battle.riddlerStatSourceByCharacterId[characterId];
  const base = riddlerSource ? riddlerSource[baseStat] : character[baseStat];
  const temporary = getTemporaryStatModifierTotal(battle, characterId, stat);
  const persistent = getPersistentStatModifierTotal(state, characterId, stat);
  const attachments = getAttachmentStatModifierTotal(state, characterId, stat);
  const conditional = getConditionalBattleStatModifier(state, battle, characterId, stat);
  return base + temporary + persistent + attachments + conditional;
}

function getDefaultComparisonLabelForController(
  battle: PendingBattle,
  controller: Controller,
): StatLabel {
  if (controller === battle.initiatorController) {
    return battle.battleType === 'attack' ? 'ATK' : 'DEF';
  }
  return 'DEF';
}

function getCurrentComparisonLabelForController(
  battle: PendingBattle,
  controller: Controller,
): StatLabel {
  return battle.comparisonStatOverrides[controller] ?? getDefaultComparisonLabelForController(battle, controller);
}

function getCurrentComparisonValues(state: GameState, battle: PendingBattle): {
  initiatorLabel: StatLabel;
  opponentLabel: StatLabel;
  initiatorValue: number;
  opponentValue: number;
} {
  const initiatorLabel = getCurrentComparisonLabelForController(battle, battle.initiatorController);
  const opponentLabel = getCurrentComparisonLabelForController(battle, battle.opponentController);

  const initiatorValue = getEffectiveBattleStat(state, battle, battle.initiatorId, initiatorLabel);
  const opponentValue = getEffectiveBattleStat(state, battle, battle.opponentId, opponentLabel);

  return {
    initiatorLabel,
    opponentLabel,
    initiatorValue,
    opponentValue,
  };
}

function getProjectedBattleResultFromContext(
  state: GameState,
  battle: PendingBattle,
): ProjectedBattleResult {
  const initiator = getCharacter(state, battle.initiatorId);
  const opponent = getCharacter(state, battle.opponentId);
  if (!initiator || !opponent) {
    throw new Error('Pending battle participants are missing');
  }

  const comparison = getCurrentComparisonValues(state, battle);
  const outcome = resolveBattle(
    initiator,
    opponent,
    comparison.initiatorValue,
    comparison.opponentValue,
  );

  let winner: Controller | 'draw' = 'draw';
  if (!outcome.isDoubleLoss) {
    const winnerCharacter = outcome.winnerId === initiator.id ? initiator : opponent;
    winner = winnerCharacter.controller;
  }

  return {
    winner,
    initiatorComparisonValue: comparison.initiatorValue,
    opponentComparisonValue: comparison.opponentValue,
    winningMargin: Math.abs(comparison.initiatorValue - comparison.opponentValue),
  };
}

function buildBattleContext(
  state: GameState,
  battleType: BattleType,
  initiatorId: string,
): { battle: PendingBattle; stateAfterSetup: GameState } {
  const initiator = getCharacter(state, initiatorId);
  if (!initiator || !initiator.alive || !initiator.boardPosition) {
    throw new Error('Cannot start battle: initiator is invalid');
  }

  const opponentPosition =
    battleType === 'attack'
      ? getForwardSpace(initiator.boardPosition)
      : getBackwardSpace(initiator.boardPosition);

  const opponent = getCharacterAtPosition(state, opponentPosition);
  if (!opponent || !opponent.alive || !opponent.boardPosition || opponent.controller === initiator.controller) {
    throw new Error('Cannot start battle: opponent is invalid');
  }

  let stateAfterSetup = state;
  const riddlerStatSourceByCharacterId: Record<string, CharacterDeckCard> = {};
  const riddlerConsumedCards: CharacterDeckCard[] = [];

  const refillCharacterDeckFromSessionUsedIfNeeded = (): void => {
    if (stateAfterSetup.characterDeck.length > 0 || stateAfterSetup.sessionUsedCharacterPile.length === 0) {
      return;
    }
    stateAfterSetup = {
      ...stateAfterSetup,
      characterDeck: shuffleCharacterInstances(stateAfterSetup.sessionUsedCharacterPile, Math.random),
      sessionUsedCharacterPile: [],
      sessionRunoutOccurred: true,
    };
  };

  const maybeConsumeRiddlerCard = (participant: Character): CharacterDeckCard | null => {
    refillCharacterDeckFromSessionUsedIfNeeded();
    if (!isRiddler(participant.displayName) || stateAfterSetup.characterDeck.length === 0) {
      return null;
    }

    const bottomCard = stateAfterSetup.characterDeck[stateAfterSetup.characterDeck.length - 1];
    stateAfterSetup = {
      ...stateAfterSetup,
      characterDeck: stateAfterSetup.characterDeck.slice(0, -1),
    };

    riddlerStatSourceByCharacterId[participant.id] = bottomCard;
    riddlerConsumedCards.push(bottomCard);
    return bottomCard;
  };

  const initiatorRiddlerSource = maybeConsumeRiddlerCard(initiator);
  const opponentRiddlerSource = maybeConsumeRiddlerCard(opponent);
  const initiatorStat = battleType === 'attack'
    ? (initiatorRiddlerSource?.ATK ?? initiator.ATK)
    : (initiatorRiddlerSource?.DEF ?? initiator.DEF);

  const battle: PendingBattle = {
    isFinalKingDuel: false,
    battleType,
    status: 'WindowOpen',
    initiatorId: initiator.id,
    opponentId: opponent.id,
    initiatorController: initiator.controller,
    opponentController: opponent.controller,
    initiatorStartPosition: initiator.boardPosition,
    opponentStartPosition: opponent.boardPosition,
    initiatorBaseComparisonStat: initiatorStat,
    opponentBaseComparisonStat: opponentRiddlerSource?.DEF ?? opponent.DEF,
    currentPriorityPlayer: initiator.controller,
    consecutivePassCount: 0,
    readyPlayers: { P1: false, P2: false },
    handoffRequiredFor: initiator.controller,
    comparisonStatOverrides: {},
    statsSwapped: false,
    temporaryModifiers: [],
    usedPowerPileStartCount: state.usedPowerCardPile.length,
    riddlerStatSourceByCharacterId,
    riddlerConsumedCards,
    eventHistory: [
      `Battle started: ${battleType === 'attack' ? 'Attack Forward' : 'Self-Defend'}`,
      ...(initiatorRiddlerSource
        ? [`Riddler source revealed for ${initiator.displayName ?? initiator.id}: ${initiatorRiddlerSource.displayName} (${initiatorRiddlerSource.ATK}/${initiatorRiddlerSource.DEF})`]
        : []),
      ...(opponentRiddlerSource
        ? [`Riddler source revealed for ${opponent.displayName ?? opponent.id}: ${opponentRiddlerSource.displayName} (${opponentRiddlerSource.ATK}/${opponentRiddlerSource.DEF})`]
        : []),
      `Priority: ${initiator.controller === 'P1' ? 'Human' : 'Bot'}`,
    ],
  };

  return {
    battle,
    stateAfterSetup,
  };
}

export function startFinalKingDuel(state: GameState): GameState {
  if (state.gameStatus !== 'active') {
    throw new Error('Cannot start final king duel: game is not active');
  }

  if (state.pendingBattle) {
    throw new Error('Cannot start final king duel: another battle is already pending');
  }

  const p1King = state.characters.find(character => character.controller === 'P1' && character.isKing && character.alive);
  const p2King = state.characters.find(character => character.controller === 'P2' && character.isKing && character.alive);

  if (!p1King || !p2King || !p1King.boardPosition || !p2King.boardPosition) {
    throw new Error('Cannot start final king duel: both living kings must be present');
  }

  if (countLivingCharacters(state, 'P1') !== 1 || countLivingCharacters(state, 'P2') !== 1) {
    throw new Error('Cannot start final king duel: both players must have only their king alive');
  }

  const initiatorController: Controller = state.activePlayer;
  const initiator = initiatorController === 'P1' ? p1King : p2King;
  const opponent = initiatorController === 'P1' ? p2King : p1King;

  const battle: PendingBattle = {
    isFinalKingDuel: true,
    battleType: 'defend',
    status: 'WindowOpen',
    initiatorId: initiator.id,
    opponentId: opponent.id,
    initiatorController,
    opponentController: initiatorController === 'P1' ? 'P2' : 'P1',
    initiatorStartPosition: initiator.boardPosition,
    opponentStartPosition: opponent.boardPosition,
    initiatorBaseComparisonStat: initiator.ATK,
    opponentBaseComparisonStat: opponent.ATK,
    currentPriorityPlayer: initiatorController,
    consecutivePassCount: 0,
    readyPlayers: { P1: false, P2: false },
    handoffRequiredFor: initiatorController,
    comparisonStatOverrides: {
      P1: 'ATK',
      P2: 'ATK',
    },
    statsSwapped: false,
    temporaryModifiers: [],
    usedPowerPileStartCount: state.usedPowerCardPile.length,
    riddlerStatSourceByCharacterId: {},
    riddlerConsumedCards: [],
    eventHistory: [
      'Final King Duel started',
      'Comparison is ATK vs ATK',
      `Priority: ${initiatorController === 'P1' ? 'Human' : 'Bot'}`,
    ],
  };

  let next: GameState = {
    ...state,
    pendingBattle: battle,
    characters: state.characters.map(character => {
      if (character.id === p1King.id || character.id === p2King.id) {
        return { ...character, revealed: true };
      }
      return character;
    }),
  };

  next = logEvent(next, 'Final King Duel Started', {
    p1KingId: p1King.id,
    p2KingId: p2King.id,
    firstPriority: initiatorController,
  });

  next = logEvent(next, 'Battle Window Open', {
    battleType: 'final-king-duel',
    firstPriority: battle.currentPriorityPlayer,
  });

  return next;
}

export function startBattle(state: GameState, battleType: BattleType, initiatorId: string): GameState {
  if (state.gameStatus !== 'active') {
    throw new Error('Cannot start battle: game is not active');
  }

  if (state.pendingBattle) {
    throw new Error('Cannot start battle: another battle is already pending');
  }

  const legal = battleType === 'attack'
    ? canAttackForward(state, initiatorId)
    : canSelfDefend(state, initiatorId);

  if (!legal) {
    throw new Error('Cannot start battle: action is not legal');
  }

  const battleContext = buildBattleContext(state, battleType, initiatorId);
  const battle = battleContext.battle;

  let next: GameState = {
    ...battleContext.stateAfterSetup,
    pendingBattle: battle,
    characters: battleContext.stateAfterSetup.characters.map(character => {
      if (character.id === battle.initiatorId || character.id === battle.opponentId) {
        return { ...character, revealed: true };
      }
      return character;
    }),
  };

  next = logEvent(next, 'Reveal Battle Participants', {
    battleType,
    initiatorId: battle.initiatorId,
    opponentId: battle.opponentId,
  });

  next = logEvent(next, 'Battle Window Open', {
    battleType,
    firstPriority: battle.currentPriorityPlayer,
  });

  return next;
}

function requirePendingBattle(state: GameState): PendingBattle {
  if (!state.pendingBattle) {
    throw new Error('No pending battle');
  }
  return state.pendingBattle;
}

function getCardPlayability(
  state: GameState,
  battle: PendingBattle,
  actingPlayer: Controller,
  definitionId: string,
): { isPlayable: boolean; disabledReason: string | null; allowedChoices: Array<'ATK' | 'DEF'> } {
  if (battle.status !== 'WindowOpen') {
    return {
      isPlayable: false,
      disabledReason: 'Battle window is closed',
      allowedChoices: [],
    };
  }

  if (actingPlayer !== battle.currentPriorityPlayer) {
    return {
      isPlayable: false,
      disabledReason: 'Not your priority',
      allowedChoices: [],
    };
  }

  if (definitionId === 'power-alpha-004' || definitionId === 'power-alpha-005' || definitionId === 'power-alpha-006') {
    return {
      isPlayable: true,
      disabledReason: null,
      allowedChoices: ['ATK', 'DEF'],
    };
  }

  if (definitionId === 'power-alpha-003') {
    return {
      isPlayable: true,
      disabledReason: null,
      allowedChoices: ['ATK', 'DEF'],
    };
  }

  if (definitionId === 'power-alpha-002' || definitionId === 'power-alpha-010') {
    return {
      isPlayable: true,
      disabledReason: null,
      allowedChoices: [],
    };
  }

  if (definitionId === 'power-alpha-001') {
    const opponentController: Controller = actingPlayer === 'P1' ? 'P2' : 'P1';
    const opponentLabel = getCurrentComparisonLabelForController(battle, opponentController);
    if (opponentLabel !== 'DEF') {
      return {
        isPlayable: false,
        disabledReason: 'Illegal unless opponent is currently using DEF',
        allowedChoices: [],
      };
    }

    return {
      isPlayable: true,
      disabledReason: null,
      allowedChoices: [],
    };
  }

  if (definitionId === 'power-alpha-007') {
    return {
      isPlayable: true,
      disabledReason: null,
      allowedChoices: [],
    };
  }

  if (definitionId === 'power-alpha-016') {
    const behind = findTagTeamBehindCharacter(state, battle, actingPlayer);
    if (!behind) {
      return {
        isPlayable: false,
        disabledReason: 'Illegal unless a living allied character is directly behind your battler',
        allowedChoices: [],
      };
    }

    return {
      isPlayable: true,
      disabledReason: null,
      allowedChoices: [],
    };
  }

  if (definitionId === 'power-alpha-017') {
    const livingOwn = state.characters.filter(character => character.alive && character.controller === actingPlayer);
    if (livingOwn.length === 0) {
      return {
        isPlayable: false,
        disabledReason: 'Illegal unless you control at least one living character',
        allowedChoices: [],
      };
    }

    if (state.characterDeck.length === 0) {
      return {
        isPlayable: false,
        disabledReason: 'Illegal unless the hidden character deck has at least one card',
        allowedChoices: [],
      };
    }

    return {
      isPlayable: true,
      disabledReason: null,
      allowedChoices: [],
    };
  }

  if (definitionId === 'power-alpha-020') {
    const target = getLatestCancelableOpponentCardInBattle(state, battle, actingPlayer);
    if (!target) {
      return {
        isPlayable: false,
        disabledReason: 'Illegal unless opponent has a cancelable current-battle power effect',
        allowedChoices: [],
      };
    }

    return {
      isPlayable: true,
      disabledReason: null,
      allowedChoices: [],
    };
  }

  if (
    definitionId === 'power-alpha-011'
    || definitionId === 'power-alpha-012'
    || definitionId === 'power-alpha-013'
    || definitionId === 'power-alpha-014'
    || definitionId === 'power-alpha-015'
  ) {
    return {
      isPlayable: true,
      disabledReason: null,
      allowedChoices: [],
    };
  }

  if (definitionId === 'power-alpha-009') {
    const comparisons = getCurrentComparisonValues(state, battle);
    const ownValue = actingPlayer === battle.initiatorController
      ? comparisons.initiatorValue
      : comparisons.opponentValue;
    const opponentValue = actingPlayer === battle.initiatorController
      ? comparisons.opponentValue
      : comparisons.initiatorValue;

    if (ownValue >= opponentValue) {
      return {
        isPlayable: false,
        disabledReason: 'Illegal unless your battler is currently losing',
        allowedChoices: [],
      };
    }

    return {
      isPlayable: true,
      disabledReason: null,
      allowedChoices: [],
    };
  }

  if (definitionId === 'power-alpha-008') {
    const opponent = getCharacter(state, getBattlingCharacterIdForController(battle, actingPlayer === 'P1' ? 'P2' : 'P1'));
    if (opponent && isKoolAidMan(opponent.displayName)) {
      return {
        isPlayable: false,
        disabledReason: 'Illegal against KOOL-AID MAN',
        allowedChoices: [],
      };
    }

    return {
      isPlayable: true,
      disabledReason: null,
      allowedChoices: [],
    };
  }

  if (definitionId === 'power-alpha-018') {
    return {
      isPlayable: true,
      disabledReason: null,
      allowedChoices: [],
    };
  }

  if (definitionId === 'power-alpha-019') {
    return {
      isPlayable: true,
      disabledReason: null,
      allowedChoices: [],
    };
  }

  return {
    isPlayable: false,
    disabledReason: 'Not playable in this build yet',
    allowedChoices: [],
  };
}

export function getBattlePrivateHandView(state: GameState, player: Controller): PrivateBattleHandView {
  const battle = requirePendingBattle(state);
  const powerCatalog = loadPowerCatalog(FIRST_ALPHA_POWER_CARD_DEFINITIONS);
  const powerCatalogById = new Map(powerCatalog.map(entry => [entry.definitionId, entry]));

  if (battle.handoffRequiredFor !== null) {
    throw new Error('Cannot view private battle hand: acknowledgment is required first');
  }

  if (player !== battle.currentPriorityPlayer) {
    throw new Error('Cannot view private battle hand: player does not have priority');
  }

  const privateCards = getPrivatePowerCardHand(state, player);

  return {
    player,
    cards: privateCards.map(card => {
      const definition = getPowerCardDefinition(card.definitionId);
      const playability = getCardPlayability(state, battle, player, card.definitionId);

      return {
        instanceId: card.instanceId,
        definitionId: card.definitionId,
        displayName: definition.displayName,
        rulesText: definition.rulesText,
        isPlayable: playability.isPlayable,
        disabledReason: playability.disabledReason,
        allowedChoices: playability.allowedChoices,
        visualMode: powerCatalogById.get(card.definitionId)?.visualMode,
        artImageUrl: powerCatalogById.get(card.definitionId)?.artImageUrl,
        fullCardFaceImageUrl: powerCatalogById.get(card.definitionId)?.fullCardFaceImageUrl,
      };
    }),
  };
}

function applyModifier(
  battle: PendingBattle,
  sourceInstanceId: string,
  sourceDefinitionId: string,
  sourceDisplayName: string,
  controller: Controller,
  targetCharacterId: string,
  stat: StatLabel,
  amount: number,
  effectSummary: string,
  selectedChoice: 'ATK' | 'DEF' | null,
): PendingBattle {
  const modifier: BattleTemporaryModifier = {
    sourceInstanceId,
    sourceDefinitionId,
    sourceDisplayName,
    controller,
    targetCharacterId,
    stat,
    amount,
    effectSummary,
    selectedChoice,
  };

  return {
    ...battle,
    temporaryModifiers: [...battle.temporaryModifiers, modifier],
  };
}

export function playBattlePowerCard(
  state: GameState,
  actingPlayer: Controller,
  input: PlayBattlePowerCardInput,
): GameState {
  const battle = requirePendingBattle(state);

  if (battle.handoffRequiredFor !== null) {
    throw new Error('Cannot play card: acknowledgment is required first');
  }

  if (battle.status !== 'WindowOpen') {
    throw new Error('Cannot play card: battle window is not open');
  }

  if (actingPlayer !== battle.currentPriorityPlayer) {
    throw new Error('Cannot play card: it is not this player\'s priority');
  }

  const hand = state.powerCardHands[actingPlayer];
  const cardInHand = hand.find(card => card.instanceId === input.instanceId);
  if (!cardInHand) {
    throw new Error('Cannot play card: card is not in acting player hand');
  }

  const definition = getPowerCardDefinition(cardInHand.definitionId);
  const powerCatalog = loadPowerCatalog(FIRST_ALPHA_POWER_CARD_DEFINITIONS);
  const powerCatalogEntry = powerCatalog.find(entry => entry.definitionId === cardInHand.definitionId);
  const playability = getCardPlayability(state, battle, actingPlayer, cardInHand.definitionId);
  if (!playability.isPlayable) {
    throw new Error(`Cannot play card: ${playability.disabledReason ?? 'illegal'}`);
  }

  if (playability.allowedChoices.length > 0) {
    if (!input.selectedChoice || !playability.allowedChoices.includes(input.selectedChoice)) {
      throw new Error('Cannot play card: required choice is missing or invalid');
    }
  }

  const ownCharacterId = getBattlingCharacterIdForController(battle, actingPlayer);
  const opponentController: Controller = actingPlayer === 'P1' ? 'P2' : 'P1';
  const opponentCharacterId = getBattlingCharacterIdForController(battle, opponentController);

  let updatedBattle: PendingBattle = battle;
  let effectSummary = '';
  let extraUsedEntries: UsedPowerCardEntry[] = [];

  if (cardInHand.definitionId === 'power-alpha-006') {
    effectSummary = `+2 ${input.selectedChoice} to own battler this battle`;
    updatedBattle = applyModifier(
      updatedBattle,
      cardInHand.instanceId,
      cardInHand.definitionId,
      definition.displayName,
      actingPlayer,
      ownCharacterId,
      input.selectedChoice!,
      2,
      effectSummary,
      input.selectedChoice!,
    );
  } else if (cardInHand.definitionId === 'power-alpha-004') {
    effectSummary = `-5 ${input.selectedChoice} to opponent battler this battle`;
    updatedBattle = applyModifier(
      updatedBattle,
      cardInHand.instanceId,
      cardInHand.definitionId,
      definition.displayName,
      actingPlayer,
      opponentCharacterId,
      input.selectedChoice!,
      -5,
      effectSummary,
      input.selectedChoice!,
    );
  } else if (cardInHand.definitionId === 'power-alpha-005') {
    effectSummary = `-4 ${input.selectedChoice} to opponent battler this battle`;
    updatedBattle = applyModifier(
      updatedBattle,
      cardInHand.instanceId,
      cardInHand.definitionId,
      definition.displayName,
      actingPlayer,
      opponentCharacterId,
      input.selectedChoice!,
      -4,
      effectSummary,
      input.selectedChoice!,
    );
  } else if (cardInHand.definitionId === 'power-alpha-002') {
    effectSummary = '-4 opponent ATK and -1 own DEF this battle';
    updatedBattle = applyModifier(
      updatedBattle,
      cardInHand.instanceId,
      cardInHand.definitionId,
      definition.displayName,
      actingPlayer,
      opponentCharacterId,
      'ATK',
      -4,
      effectSummary,
      null,
    );
    updatedBattle = applyModifier(
      updatedBattle,
      cardInHand.instanceId,
      cardInHand.definitionId,
      definition.displayName,
      actingPlayer,
      ownCharacterId,
      'DEF',
      -1,
      effectSummary,
      null,
    );
  } else if (cardInHand.definitionId === 'power-alpha-008') {
    effectSummary = '+5 DEF to own battler this battle';
    updatedBattle = applyModifier(
      updatedBattle,
      cardInHand.instanceId,
      cardInHand.definitionId,
      definition.displayName,
      actingPlayer,
      ownCharacterId,
      'DEF',
      5,
      effectSummary,
      null,
    );
  } else if (cardInHand.definitionId === 'power-alpha-010') {
    const ownCharacter = getCharacter(state, ownCharacterId);
    if (!ownCharacter) {
      throw new Error('Cannot play card: own battling character missing');
    }

    if (isGenghisKhan(ownCharacter.displayName)) {
      effectSummary = '+5 ATK permanent while alive (GENGHIS KHAN)';
    } else {
      effectSummary = '+5 ATK to own battler this battle';
      updatedBattle = applyModifier(
        updatedBattle,
        cardInHand.instanceId,
        cardInHand.definitionId,
        definition.displayName,
        actingPlayer,
        ownCharacterId,
        'ATK',
        5,
        effectSummary,
        null,
      );
    }
  } else if (cardInHand.definitionId === 'power-alpha-003') {
    const selectedStat = input.selectedChoice!;
    effectSummary = `Own comparison stat set to ${selectedStat} for this battle`;
    updatedBattle = {
      ...updatedBattle,
      comparisonStatOverrides: {
        ...updatedBattle.comparisonStatOverrides,
        [actingPlayer]: selectedStat,
      },
    };
  } else if (cardInHand.definitionId === 'power-alpha-001') {
    effectSummary = '-4 DEF to opponent battler this battle';
    updatedBattle = applyModifier(
      updatedBattle,
      cardInHand.instanceId,
      cardInHand.definitionId,
      definition.displayName,
      actingPlayer,
      opponentCharacterId,
      'DEF',
      -4,
      effectSummary,
      null,
    );
  } else if (cardInHand.definitionId === 'power-alpha-007') {
    effectSummary = 'Both battlers swap ATK/DEF base stats for this battle';
    updatedBattle = {
      ...updatedBattle,
      statsSwapped: !updatedBattle.statsSwapped,
    };
  } else if (cardInHand.definitionId === 'power-alpha-009') {
    const comparisons = getCurrentComparisonValues(state, updatedBattle);
    const ownLabel = getCurrentComparisonLabelForController(updatedBattle, actingPlayer);
    const ownValue = actingPlayer === updatedBattle.initiatorController
      ? comparisons.initiatorValue
      : comparisons.opponentValue;
    const opponentValue = actingPlayer === updatedBattle.initiatorController
      ? comparisons.opponentValue
      : comparisons.initiatorValue;

    if (ownValue >= opponentValue) {
      throw new Error('Cannot play card: Illegal unless your battler is currently losing');
    }

    const amount = opponentValue - ownValue;
    effectSummary = `Snapshot equalization: own ${ownLabel} set to ${opponentValue}`;
    updatedBattle = applyModifier(
      updatedBattle,
      cardInHand.instanceId,
      cardInHand.definitionId,
      definition.displayName,
      actingPlayer,
      ownCharacterId,
      ownLabel,
      amount,
      effectSummary,
      null,
    );
  } else if (isWeaponDefinition(cardInHand.definitionId)) {
    const targetCharacterId = input.targetCharacterId;
    if (!targetCharacterId) {
      throw new Error('Cannot play card: weapon target is required');
    }

    const targetCharacter = getCharacter(state, targetCharacterId);
    if (!targetCharacter || !targetCharacter.alive || !targetCharacter.boardPosition) {
      throw new Error('Cannot play card: weapon target must be a living board character');
    }

    const statsByDefinitionId: Record<string, { ATK: number; DEF: number }> = {
      'power-alpha-011': { ATK: 3, DEF: 3 },
      'power-alpha-012': { ATK: 5, DEF: 1 },
      'power-alpha-013': { ATK: 3, DEF: 1 },
      'power-alpha-014': { ATK: 4, DEF: 2 },
      'power-alpha-015': { ATK: 2, DEF: 4 },
    };

    const baseBonus = statsByDefinitionId[cardInHand.definitionId];
    const bonusATK = cardInHand.definitionId === 'power-alpha-013' && isBatman(targetCharacter.displayName)
      ? baseBonus.ATK
      : cardInHand.definitionId === 'power-alpha-015' && isRapunzel(targetCharacter.displayName)
        ? baseBonus.ATK + 2
        : baseBonus.ATK;
    const bonusDEF = baseBonus.DEF;

    const canUseFreezeShot = cardInHand.definitionId === 'power-alpha-014' && isMrFreeze(targetCharacter.displayName);

    effectSummary = `${definition.displayName} equipped to ${targetCharacter.displayName ?? targetCharacter.id} (+${bonusATK} ATK / +${bonusDEF} DEF)`;

    const currentAttachments = targetCharacter.attachments ?? [];
    const nextAttachments = [
      ...currentAttachments,
      {
        instanceId: cardInHand.instanceId,
        definitionId: cardInHand.definitionId,
        displayName: definition.displayName,
        category: 'weapon' as const,
        ATK: bonusATK,
        DEF: bonusDEF,
        specialUsed: false,
      },
    ];

    state = {
      ...state,
      characters: state.characters.map(character => (
        character.id === targetCharacterId
          ? { ...character, attachments: nextAttachments }
          : character
      )),
    };

    if (canUseFreezeShot) {
      updatedBattle = {
        ...updatedBattle,
        eventHistory: [
          ...updatedBattle.eventHistory,
          'FREEZE GUN equipped. Mr. Freeze special shot is available once via equipped card action.',
        ],
      };
    }
  } else if (cardInHand.definitionId === 'power-alpha-016') {
    const behind = findTagTeamBehindCharacter(state, updatedBattle, actingPlayer);
    if (!behind) {
      throw new Error('Cannot play card: TAG TEAM requires a living allied character directly behind your battler');
    }

    const ownLabel = getCurrentComparisonLabelForController(updatedBattle, actingPlayer);
    const amount = ownLabel === 'ATK'
      ? getEffectiveBattleStat(state, updatedBattle, behind.id, 'ATK')
      : getEffectiveBattleStat(state, updatedBattle, behind.id, 'DEF');

    effectSummary = `TAG TEAM adds ${amount} ${ownLabel} from ${behind.displayName ?? behind.id}`;
    updatedBattle = applyModifier(
      updatedBattle,
      cardInHand.instanceId,
      cardInHand.definitionId,
      definition.displayName,
      actingPlayer,
      ownCharacterId,
      ownLabel,
      amount,
      effectSummary,
      null,
    );
  } else if (cardInHand.definitionId === 'power-alpha-017') {
    if (state.characterDeck.length === 0 && state.sessionUsedCharacterPile.length > 0) {
      state = {
        ...state,
        characterDeck: shuffleCharacterInstances(state.sessionUsedCharacterPile, Math.random),
        sessionUsedCharacterPile: [],
        sessionRunoutOccurred: true,
      };
    }

    if (state.characterDeck.length === 0) {
      throw new Error('Cannot play card: character deck is empty');
    }

    const fallbackTarget = getCharacter(state, ownCharacterId);
    const requestedTarget = input.targetCharacterId ? getCharacter(state, input.targetCharacterId) : null;
    const targetCharacter = requestedTarget && requestedTarget.alive && requestedTarget.controller === actingPlayer
      ? requestedTarget
      : fallbackTarget;

    if (!targetCharacter || !targetCharacter.alive || targetCharacter.controller !== actingPlayer) {
      throw new Error('Cannot play card: PHONE A FRIEND target is invalid');
    }

    const drawnTop = state.characterDeck[0];
    const replacementId = drawnTop.instanceId;
    const wasInitiator = updatedBattle.initiatorId === targetCharacter.id;
    const wasOpponent = updatedBattle.opponentId === targetCharacter.id;
    const targetBoardPosition = targetCharacter.boardPosition;

    if (!targetBoardPosition) {
      throw new Error('Cannot play card: PHONE A FRIEND target has no board position');
    }

    const replacementCharacter: Character = {
      ...targetCharacter,
      id: replacementId,
      definitionId: drawnTop.definitionId,
      displayName: drawnTop.displayName,
      ATK: drawnTop.ATK,
      DEF: drawnTop.DEF,
      ability: drawnTop.ability,
      statRule: drawnTop.statRule,
      imageKey: drawnTop.imageKey,
      visualMode: drawnTop.visualMode,
      artImageUrl: drawnTop.artImageUrl,
      fullCardFaceImageUrl: drawnTop.fullCardFaceImageUrl,
      attachments: [],
      isFrozen: false,
      revealed: true,
      alive: true,
      boardPosition: targetBoardPosition,
    };

    const previousAttachments = targetCharacter.attachments ?? [];
    extraUsedEntries = previousAttachments.map(attachment => ({
      instanceId: attachment.instanceId,
      definitionId: attachment.definitionId,
      controller: targetCharacter.controller,
      displayName: attachment.displayName,
      selectedChoice: null,
      effectSummary: `Discarded from ${targetCharacter.displayName ?? targetCharacter.id} via PHONE A FRIEND`,
    }));

    const nextPersistent = { ...state.persistentCharacterModifiers };
    delete nextPersistent[targetCharacter.id];

    state = {
      ...state,
      characterDeck: state.characterDeck.slice(1),
      characters: state.characters.map(character => {
        if (character.id !== targetCharacter.id) {
          return character;
        }

        return replacementCharacter;
      }),
      graveyard: [
        ...state.graveyard,
        {
          ...targetCharacter,
          alive: false,
          boardPosition: null,
        },
      ],
      persistentCharacterModifiers: nextPersistent,
    };

    if (wasInitiator || wasOpponent) {
      updatedBattle = {
        ...updatedBattle,
        initiatorId: wasInitiator ? replacementId : updatedBattle.initiatorId,
        opponentId: wasOpponent ? replacementId : updatedBattle.opponentId,
        temporaryModifiers: updatedBattle.temporaryModifiers
          .filter(modifier => modifier.targetCharacterId !== targetCharacter.id)
          .map(modifier => ({
            ...modifier,
            targetCharacterId: modifier.targetCharacterId,
          })),
      };
    }

    effectSummary = `PHONE A FRIEND replaced ${targetCharacter.displayName ?? targetCharacter.id} with ${drawnTop.displayName}`;
  } else if (cardInHand.definitionId === 'power-alpha-019') {
    effectSummary = 'BEHIND THE CURTAINS hand inspection';

    const ownSwapCardInstanceId = input.ownSwapCardInstanceId;
    const opponentSwapCardInstanceId = input.opponentSwapCardInstanceId;
    if (ownSwapCardInstanceId && opponentSwapCardInstanceId) {
      const ownSwapCard = state.powerCardHands[actingPlayer].find(card => card.instanceId === ownSwapCardInstanceId);
      const opponentSwapCard = state.powerCardHands[opponentController].find(card => card.instanceId === opponentSwapCardInstanceId);

      if (ownSwapCard && opponentSwapCard) {
        const ownDefinition = getPowerCardDefinition(ownSwapCard.definitionId);
        const opponentDefinition = getPowerCardDefinition(opponentSwapCard.definitionId);
        effectSummary = `BEHIND THE CURTAINS swapped ${ownDefinition.displayName} with ${opponentDefinition.displayName}`;
      }

      state = executeBehindTheCurtainsSwap(
        state,
        actingPlayer,
        ownSwapCardInstanceId,
        opponentSwapCardInstanceId,
      );
    }
  } else if (cardInHand.definitionId === 'power-alpha-020') {
    const canceled = getLatestCancelableOpponentCardInBattle(state, updatedBattle, actingPlayer);
    if (!canceled) {
      throw new Error('Cannot play card: no cancelable opponent power card effect is active');
    }

    updatedBattle = {
      ...updatedBattle,
      temporaryModifiers: updatedBattle.temporaryModifiers.filter(modifier => modifier.sourceInstanceId !== canceled.instanceId),
    };

    if (canceled.definitionId === 'power-alpha-007') {
      updatedBattle = {
        ...updatedBattle,
        statsSwapped: !updatedBattle.statsSwapped,
      };
    }

    if (canceled.definitionId === 'power-alpha-003') {
      const opponentController: Controller = actingPlayer === 'P1' ? 'P2' : 'P1';
      const nextOverrides = { ...updatedBattle.comparisonStatOverrides };
      delete nextOverrides[opponentController];
      updatedBattle = {
        ...updatedBattle,
        comparisonStatOverrides: nextOverrides,
      };
    }

    effectSummary = `NO SPRAY canceled ${canceled.displayName} (${canceled.instanceId})`;
  } else if (cardInHand.definitionId === 'power-alpha-018') {
    const ownSwapTargetId = input.targetCharacterId ?? ownCharacterId;
    const opponentSwapTargetId = input.secondTargetCharacterId ?? opponentCharacterId;

    const initiatorWasSwapped = updatedBattle.initiatorId === ownSwapTargetId || updatedBattle.initiatorId === opponentSwapTargetId;
    const opponentWasSwapped = updatedBattle.opponentId === ownSwapTargetId || updatedBattle.opponentId === opponentSwapTargetId;
    const priorInitiatorStats = initiatorWasSwapped
      ? {
          ATK: getEffectiveBattleStat(state, updatedBattle, updatedBattle.initiatorId, 'ATK'),
          DEF: getEffectiveBattleStat(state, updatedBattle, updatedBattle.initiatorId, 'DEF'),
        }
      : null;
    const priorOpponentStats = opponentWasSwapped
      ? {
          ATK: getEffectiveBattleStat(state, updatedBattle, updatedBattle.opponentId, 'ATK'),
          DEF: getEffectiveBattleStat(state, updatedBattle, updatedBattle.opponentId, 'DEF'),
        }
      : null;

    state = executeSwapCharactersMove(
      state,
      actingPlayer,
      ownSwapTargetId,
      opponentSwapTargetId,
      { allowDuringBattle: true, allowOutOfTurn: true },
    );

    const replacementFor = (characterId: string): string => {
      if (characterId === ownSwapTargetId) {
        return opponentSwapTargetId;
      }
      if (characterId === opponentSwapTargetId) {
        return ownSwapTargetId;
      }
      return characterId;
    };

    const nextInitiatorId = replacementFor(updatedBattle.initiatorId);
    const nextOpponentId = replacementFor(updatedBattle.opponentId);
    const swappedOutBattlerIds = [
      nextInitiatorId !== updatedBattle.initiatorId ? updatedBattle.initiatorId : null,
      nextOpponentId !== updatedBattle.opponentId ? updatedBattle.opponentId : null,
    ].filter((id): id is string => !!id);

    if (nextInitiatorId !== updatedBattle.initiatorId || nextOpponentId !== updatedBattle.opponentId) {
      const forceRevealIds = new Set([nextInitiatorId, nextOpponentId]);
      state = {
        ...state,
        characters: state.characters.map(character => (
          forceRevealIds.has(character.id) && character.alive
            ? { ...character, revealed: true }
            : character
        )),
      };
    }

    const nextRiddlerSources: Record<string, CharacterDeckCard> = {};
    for (const [characterId, source] of Object.entries(updatedBattle.riddlerStatSourceByCharacterId)) {
      if (!swappedOutBattlerIds.includes(characterId)) {
        nextRiddlerSources[characterId] = source;
      }
    }

    updatedBattle = {
      ...updatedBattle,
      initiatorId: nextInitiatorId,
      opponentId: nextOpponentId,
      temporaryModifiers: updatedBattle.temporaryModifiers.filter(modifier => !swappedOutBattlerIds.includes(modifier.targetCharacterId)),
      riddlerStatSourceByCharacterId: nextRiddlerSources,
    };

    const nextInitiator = getCharacter(state, nextInitiatorId);
    if (priorInitiatorStats && nextInitiator?.isFrozen) {
      const currentATK = getEffectiveBattleStat(state, updatedBattle, nextInitiatorId, 'ATK');
      const currentDEF = getEffectiveBattleStat(state, updatedBattle, nextInitiatorId, 'DEF');
      const atkDelta = priorInitiatorStats.ATK - currentATK;
      const defDelta = priorInitiatorStats.DEF - currentDEF;
      if (atkDelta !== 0) {
        updatedBattle = applyModifier(
          updatedBattle,
          cardInHand.instanceId,
          cardInHand.definitionId,
          definition.displayName,
          actingPlayer,
          nextInitiatorId,
          'ATK',
          atkDelta,
          'Frozen replacement keeps swapped-out battler ATK for this battle',
          null,
        );
      }
      if (defDelta !== 0) {
        updatedBattle = applyModifier(
          updatedBattle,
          cardInHand.instanceId,
          cardInHand.definitionId,
          definition.displayName,
          actingPlayer,
          nextInitiatorId,
          'DEF',
          defDelta,
          'Frozen replacement keeps swapped-out battler DEF for this battle',
          null,
        );
      }
    }

    const nextOpponent = getCharacter(state, nextOpponentId);
    if (priorOpponentStats && nextOpponent?.isFrozen) {
      const currentATK = getEffectiveBattleStat(state, updatedBattle, nextOpponentId, 'ATK');
      const currentDEF = getEffectiveBattleStat(state, updatedBattle, nextOpponentId, 'DEF');
      const atkDelta = priorOpponentStats.ATK - currentATK;
      const defDelta = priorOpponentStats.DEF - currentDEF;
      if (atkDelta !== 0) {
        updatedBattle = applyModifier(
          updatedBattle,
          cardInHand.instanceId,
          cardInHand.definitionId,
          definition.displayName,
          actingPlayer,
          nextOpponentId,
          'ATK',
          atkDelta,
          'Frozen replacement keeps swapped-out battler ATK for this battle',
          null,
        );
      }
      if (defDelta !== 0) {
        updatedBattle = applyModifier(
          updatedBattle,
          cardInHand.instanceId,
          cardInHand.definitionId,
          definition.displayName,
          actingPlayer,
          nextOpponentId,
          'DEF',
          defDelta,
          'Frozen replacement keeps swapped-out battler DEF for this battle',
          null,
        );
      }
    }

    const ownTarget = getCharacter(state, ownSwapTargetId);
    const opponentTarget = getCharacter(state, opponentSwapTargetId);
    effectSummary = `SWAP CHARACTERS swapped ${ownTarget?.displayName ?? ownSwapTargetId} with ${opponentTarget?.displayName ?? opponentSwapTargetId}`;
  }

  const nextPriority: Controller = actingPlayer === 'P1' ? 'P2' : 'P1';
  const nextHand = state.powerCardHands[actingPlayer].filter(card => card.instanceId !== input.instanceId);
  const usedEntry: UsedPowerCardEntry = {
    instanceId: cardInHand.instanceId,
    definitionId: cardInHand.definitionId,
    controller: actingPlayer,
    displayName: definition.displayName,
    selectedChoice: input.selectedChoice ?? null,
    effectSummary,
    visualMode: powerCatalogEntry?.visualMode,
    artImageUrl: powerCatalogEntry?.artImageUrl,
    fullCardFaceImageUrl: powerCatalogEntry?.fullCardFaceImageUrl,
  };

  const ownCharacter = getCharacter(state, ownCharacterId);
  const addPermanent = cardInHand.definitionId === 'power-alpha-010' && isGenghisKhan(ownCharacter?.displayName);
  const existingPersistent = state.persistentCharacterModifiers[ownCharacterId] ?? { ATK: 0, DEF: 0 };
  const shouldEnterUsedPileImmediately = !isWeaponDefinition(cardInHand.definitionId);

  let next: GameState = {
    ...state,
    powerCardHands: {
      ...state.powerCardHands,
      [actingPlayer]: nextHand,
    },
    usedPowerCardPile: shouldEnterUsedPileImmediately
      ? [...state.usedPowerCardPile, ...extraUsedEntries, usedEntry]
      : [...state.usedPowerCardPile, ...extraUsedEntries],
    persistentCharacterModifiers: addPermanent
      ? {
          ...state.persistentCharacterModifiers,
          [ownCharacterId]: {
            ...existingPersistent,
            ATK: existingPersistent.ATK + 5,
          },
        }
      : state.persistentCharacterModifiers,
    pendingBattle: {
      ...updatedBattle,
      currentPriorityPlayer: nextPriority,
      consecutivePassCount: 0,
      readyPlayers: { P1: false, P2: false },
      handoffRequiredFor: nextPriority,
      eventHistory: [
        ...updatedBattle.eventHistory,
        `${actingPlayer === 'P1' ? 'Human' : 'Bot'} played ${definition.displayName}`,
        effectSummary,
        'Ready flags reset',
        `Priority: ${nextPriority === 'P1' ? 'Human' : 'Bot'}`,
      ],
    },
  };

  next = logEvent(next, 'Battle Card Played', {
    actingPlayer,
    cardInstanceId: cardInHand.instanceId,
    cardDefinitionId: cardInHand.definitionId,
    selectedChoice: input.selectedChoice ?? null,
    effectSummary,
    nextPriority,
    consecutivePassCount: 0,
  });

  return next;
}

export function getProjectedBattleResult(state: GameState): ProjectedBattleResult {
  const battle = requirePendingBattle(state);
  return getProjectedBattleResultFromContext(state, battle);
}

export function getLegalBattleCardPlayOptions(
  state: GameState,
  actingPlayer: Controller,
): BattleCardPlayOption[] {
  requirePendingBattle(state);
  const handView = getBattlePrivateHandView(state, actingPlayer);
  const options: BattleCardPlayOption[] = [];

  for (const card of handView.cards) {
    if (!card.isPlayable) {
      continue;
    }

    if (card.allowedChoices.length === 0) {
      if (isWeaponDefinition(card.definitionId)) {
        const livingCharacters = state.characters.filter(character => character.alive && !!character.boardPosition);
        for (const target of livingCharacters) {
          options.push({
            input: { instanceId: card.instanceId, targetCharacterId: target.id },
            definitionId: card.definitionId,
            displayName: `${card.displayName} (equip ${target.displayName ?? target.id})`,
          });
        }
        continue;
      }

      if (card.definitionId === 'power-alpha-017') {
        const ownLiving = state.characters.filter(character => character.alive && character.controller === actingPlayer);
        for (const candidate of ownLiving) {
          options.push({
            input: {
              instanceId: card.instanceId,
              targetCharacterId: candidate.id,
            },
            definitionId: card.definitionId,
            displayName: `${card.displayName} (replace ${candidate.displayName ?? candidate.id})`,
          });
        }
        continue;
      }

      options.push({
        input: { instanceId: card.instanceId },
        definitionId: card.definitionId,
        displayName: card.displayName,
      });
      continue;
    }

    for (const choice of card.allowedChoices) {
      options.push({
        input: {
          instanceId: card.instanceId,
          selectedChoice: choice,
        },
        definitionId: card.definitionId,
        displayName: card.displayName,
      });
    }
  }

  return options;
}

export function previewBattlePowerCardPlay(
  state: GameState,
  actingPlayer: Controller,
  input: PlayBattlePowerCardInput,
): { projectedResult: ProjectedBattleResult; nextPublicView: BattlePublicView } {
  const nextState = playBattlePowerCard(state, actingPlayer, input);
  return {
    projectedResult: getProjectedBattleResult(nextState),
    nextPublicView: getBattlePublicView(nextState),
  };
}

export function getBattlePublicView(state: GameState): BattlePublicView {
  const battle = requirePendingBattle(state);
  const initiator = getCharacter(state, battle.initiatorId);
  const opponent = getCharacter(state, battle.opponentId);
  const boardView = getPlayerGameView(state);

  if (!initiator || !opponent) {
    throw new Error('Pending battle participants are missing');
  }

  const initiatorEffectiveATK = getEffectiveBattleStat(state, battle, initiator.id, 'ATK');
  const initiatorEffectiveDEF = getEffectiveBattleStat(state, battle, initiator.id, 'DEF');
  const opponentEffectiveATK = getEffectiveBattleStat(state, battle, opponent.id, 'ATK');
  const opponentEffectiveDEF = getEffectiveBattleStat(state, battle, opponent.id, 'DEF');
  const comparisons = getCurrentComparisonValues(state, battle);
  const initiatorPersistentATK = getPersistentStatModifierTotal(state, initiator.id, 'ATK');
  const initiatorPersistentDEF = getPersistentStatModifierTotal(state, initiator.id, 'DEF');
  const opponentPersistentATK = getPersistentStatModifierTotal(state, opponent.id, 'ATK');
  const opponentPersistentDEF = getPersistentStatModifierTotal(state, opponent.id, 'DEF');
  const initiatorRiddlerSource = battle.riddlerStatSourceByCharacterId[initiator.id] ?? null;
  const opponentRiddlerSource = battle.riddlerStatSourceByCharacterId[opponent.id] ?? null;

  const initiatorBaseComparison = comparisons.initiatorLabel === 'ATK'
    ? (initiatorRiddlerSource?.ATK ?? initiator.ATK) + initiatorPersistentATK
    : (initiatorRiddlerSource?.DEF ?? initiator.DEF) + initiatorPersistentDEF;
  const opponentBaseComparison = comparisons.opponentLabel === 'ATK'
    ? (opponentRiddlerSource?.ATK ?? opponent.ATK) + opponentPersistentATK
    : (opponentRiddlerSource?.DEF ?? opponent.DEF) + opponentPersistentDEF;

  return {
    isFinalKingDuel: battle.isFinalKingDuel ?? false,
    status: battle.status,
    battleType: battle.battleType,
    statsSwapped: battle.statsSwapped,
    currentPriorityPlayer: battle.currentPriorityPlayer,
    consecutivePassCount: battle.consecutivePassCount,
    readyPlayers: { ...battle.readyPlayers },
    initiator: {
      id: initiator.id,
      controller: initiator.controller,
      boardPosition: initiator.boardPosition ?? battle.initiatorStartPosition,
      isKing: initiator.isKing,
      isFrozen: initiator.isFrozen ?? false,
      displayName: initiator.displayName ?? 'Unknown',
      ATK: initiator.ATK,
      DEF: initiator.DEF,
      attachments: (initiator.attachments ?? []).map(attachment => ({
        instanceId: attachment.instanceId,
        definitionId: attachment.definitionId,
        displayName: attachment.displayName,
        ATK: attachment.ATK,
        DEF: attachment.DEF,
        specialUsed: attachment.specialUsed,
      })),
    },
    opponent: {
      id: opponent.id,
      controller: opponent.controller,
      boardPosition: opponent.boardPosition ?? battle.opponentStartPosition,
      isKing: opponent.isKing,
      isFrozen: opponent.isFrozen ?? false,
      displayName: opponent.displayName ?? 'Unknown',
      ATK: opponent.ATK,
      DEF: opponent.DEF,
      attachments: (opponent.attachments ?? []).map(attachment => ({
        instanceId: attachment.instanceId,
        definitionId: attachment.definitionId,
        displayName: attachment.displayName,
        ATK: attachment.ATK,
        DEF: attachment.DEF,
        specialUsed: attachment.specialUsed,
      })),
    },
    initiatorComparisonLabel: comparisons.initiatorLabel,
    opponentComparisonLabel: comparisons.opponentLabel,
    initiatorBaseComparison,
    opponentBaseComparison,
    initiatorEffectiveATK,
    initiatorEffectiveDEF,
    opponentEffectiveATK,
    opponentEffectiveDEF,
    initiatorEffectiveComparison: comparisons.initiatorValue,
    opponentEffectiveComparison: comparisons.opponentValue,
    battleEventHistory: [...battle.eventHistory],
    boardView,
    powerCardHandCount: { ...boardView.powerCardHandCount },
    usedPowerCards: [...state.usedPowerCardPile],
    liveModifiers: battle.temporaryModifiers.map(modifier => ({
      sourceCardName: modifier.sourceDisplayName,
      sourceDefinitionId: modifier.sourceDefinitionId,
      controller: modifier.controller,
      targetCharacterId: modifier.targetCharacterId,
      stat: modifier.stat,
      amount: modifier.amount,
      effectSummary: modifier.effectSummary,
    })),
    initiatorRiddlerSource,
    opponentRiddlerSource,
  };
}

export function passBattlePriority(state: GameState, actingPlayer: Controller): GameState {
  return setBattleReady(state, actingPlayer, true);
}

export function setBattleReady(state: GameState, actingPlayer: Controller, ready: boolean): GameState {
  const battle = requirePendingBattle(state);

  if (battle.status !== 'WindowOpen') {
    throw new Error('Cannot change ready state: battle window is not open');
  }

  if (actingPlayer !== battle.currentPriorityPlayer) {
    throw new Error('Cannot change ready state: it is not this player\'s priority');
  }

  const nextPriority: Controller = actingPlayer === 'P1' ? 'P2' : 'P1';
  const nextReadyPlayers = {
    ...battle.readyPlayers,
    [actingPlayer]: ready,
  };
  const readyCount = Number(nextReadyPlayers.P1) + Number(nextReadyPlayers.P2);
  const readyToResolve = nextReadyPlayers.P1 && nextReadyPlayers.P2;

  const updatedBattle: PendingBattle = {
    ...battle,
    currentPriorityPlayer: readyToResolve ? battle.currentPriorityPlayer : nextPriority,
    readyPlayers: nextReadyPlayers,
    consecutivePassCount: readyCount,
    status: readyToResolve ? 'ReadyToResolve' : 'WindowOpen',
    handoffRequiredFor: readyToResolve ? null : nextPriority,
    eventHistory: [
      ...battle.eventHistory,
      `${actingPlayer === 'P1' ? 'Human' : 'Bot'} marked ${ready ? 'READY' : 'NOT READY'}`,
      readyToResolve ? 'Both players ready - battle can resolve' : `Priority: ${nextPriority === 'P1' ? 'Human' : 'Bot'}`,
    ],
  };

  let next: GameState = {
    ...state,
    pendingBattle: updatedBattle,
  };

  next = logEvent(next, 'Battle Ready State', {
    actingPlayer,
    ready,
    readyCount,
    nextPriority: nextPriority === 'P1' ? 'Human' : 'Bot',
    readyToResolve,
  });

  return next;
}

export function recordBattleCardPlay(state: GameState, actingPlayer: Controller): GameState {
  const battle = requirePendingBattle(state);

  if (battle.status !== 'WindowOpen') {
    throw new Error('Cannot record card play: battle window is not open');
  }

  if (actingPlayer !== battle.currentPriorityPlayer) {
    throw new Error('Cannot record card play: it is not this player\'s priority');
  }

  const nextPriority: Controller = actingPlayer === 'P1' ? 'P2' : 'P1';

  const updatedBattle: PendingBattle = {
    ...battle,
    currentPriorityPlayer: nextPriority,
    consecutivePassCount: 0,
    handoffRequiredFor: nextPriority,
    eventHistory: [
      ...battle.eventHistory,
      `${actingPlayer === 'P1' ? 'Human' : 'Bot'} played a legal battle card placeholder`,
      'Pass streak reset to 0',
      `Priority: ${nextPriority === 'P1' ? 'Human' : 'Bot'}`,
    ],
  };

  let next: GameState = {
    ...state,
    pendingBattle: updatedBattle,
  };

  next = logEvent(next, 'Battle Card Played', {
    actingPlayer,
    nextPriority,
    consecutivePassCount: 0,
  });

  return next;
}

export function acknowledgeBattleHandoff(state: GameState, receivingPlayer: Controller): GameState {
  const battle = requirePendingBattle(state);

  if (battle.handoffRequiredFor !== receivingPlayer) {
    return state;
  }

  return {
    ...state,
    pendingBattle: {
      ...battle,
      handoffRequiredFor: null,
    },
  };
}

function buildRiddlerConsumedGraveyardEntries(state: GameState, battle: PendingBattle): Character[] {
  if (battle.riddlerConsumedCards.length === 0) {
    return [];
  }

  const controllerByCharacterId = new Map(state.characters.map(character => [character.id, character.controller]));
  const ownerByConsumedInstanceId = new Map<string, Controller>();
  for (const [characterId, source] of Object.entries(battle.riddlerStatSourceByCharacterId)) {
    const owner = controllerByCharacterId.get(characterId);
    if (owner) {
      ownerByConsumedInstanceId.set(source.instanceId, owner);
    }
  }

  return battle.riddlerConsumedCards.map(card => ({
    id: card.instanceId,
    controller: ownerByConsumedInstanceId.get(card.instanceId) ?? state.activePlayer,
    ATK: card.ATK,
    DEF: card.DEF,
    attachments: [],
    isFrozen: false,
    abilityUsed: false,
    definitionId: card.definitionId,
    displayName: card.displayName,
    ability: card.ability,
    statRule: card.statRule,
    imageKey: card.imageKey,
    visualMode: card.visualMode,
    artImageUrl: card.artImageUrl,
    fullCardFaceImageUrl: card.fullCardFaceImageUrl,
    isKing: false,
    revealed: true,
    alive: false,
    boardPosition: null,
  }));
}

export function resolvePendingBattle(state: GameState): GameState {
  const battle = requirePendingBattle(state);

  if (battle.status !== 'ReadyToResolve') {
    throw new Error('Cannot resolve pending battle: battle is not ready');
  }

  const initiatorEffectiveATK = getEffectiveBattleStat(state, battle, battle.initiatorId, 'ATK');
  const initiatorEffectiveDEF = getEffectiveBattleStat(state, battle, battle.initiatorId, 'DEF');
  const opponentEffectiveATK = getEffectiveBattleStat(state, battle, battle.opponentId, 'ATK');
  const opponentEffectiveDEF = getEffectiveBattleStat(state, battle, battle.opponentId, 'DEF');
  const comparisons = getCurrentComparisonValues(state, battle);

  const projectedInitiatorATK = battle.battleType === 'attack'
    ? comparisons.initiatorValue
    : initiatorEffectiveATK;
  const projectedInitiatorDEF = battle.battleType === 'defend'
    ? comparisons.initiatorValue
    : initiatorEffectiveDEF;
  const projectedOpponentDEF = comparisons.opponentValue;

  const projectedState: GameState = {
    ...state,
    pendingBattle: null,
    characters: state.characters.map(character => {
      if (character.id === battle.initiatorId) {
        return { ...character, ATK: projectedInitiatorATK, DEF: projectedInitiatorDEF };
      }
      if (character.id === battle.opponentId) {
        return { ...character, ATK: opponentEffectiveATK, DEF: projectedOpponentDEF };
      }
      return character;
    }),
  };

  if (battle.isFinalKingDuel) {
    const projectedInitiator = getCharacter(projectedState, battle.initiatorId);
    const projectedOpponent = getCharacter(projectedState, battle.opponentId);

    if (!projectedInitiator || !projectedOpponent) {
      throw new Error('Cannot resolve final king duel: missing king participant');
    }

    const duelOutcome = resolveBattle(
      projectedInitiator,
      projectedOpponent,
      comparisons.initiatorValue,
      comparisons.opponentValue,
    );

    let finalState: GameState = {
      ...projectedState,
      pendingBattle: null,
    };

    const defeatedIds = duelOutcome.isDoubleLoss
      ? [projectedInitiator.id, projectedOpponent.id]
      : [duelOutcome.loserId];

    for (const defeatId of defeatedIds) {
      const defeated = getCharacter(finalState, defeatId);
      if (!defeated) {
        continue;
      }

      const droppedWeapons: UsedPowerCardEntry[] = (defeated.attachments ?? []).map(attachment => ({
        instanceId: attachment.instanceId,
        definitionId: attachment.definitionId,
        controller: defeated.controller,
        displayName: attachment.displayName,
        selectedChoice: null,
        effectSummary: `Weapon dropped as ${defeated.displayName ?? defeated.id} was defeated`,
      }));

      finalState = {
        ...finalState,
        characters: finalState.characters.map(character =>
          character.id === defeatId
            ? { ...character, alive: false, boardPosition: null, attachments: [] }
            : character,
        ),
        usedPowerCardPile: [...finalState.usedPowerCardPile, ...droppedWeapons],
      };
      finalState = {
        ...finalState,
        graveyard: [...finalState.graveyard, { ...defeated, alive: false, boardPosition: null }],
      };
    }

    const nextStatus = duelOutcome.isDoubleLoss
      ? 'draw'
      : (duelOutcome.winnerId === projectedInitiator.id
        ? projectedInitiator.controller
        : projectedOpponent.controller) === 'P1'
        ? 'P1 wins'
        : 'P2 wins';

    finalState = {
      ...finalState,
      gameStatus: nextStatus,
      pendingBattle: null,
    };

    finalState = logEvent(finalState, 'Final King Duel', {
      p1ATK: projectedInitiator.controller === 'P1' ? comparisons.initiatorValue : comparisons.opponentValue,
      p2ATK: projectedInitiator.controller === 'P2' ? comparisons.initiatorValue : comparisons.opponentValue,
      outcome: nextStatus,
      bothDied: duelOutcome.isDoubleLoss,
    });

    const riddlerConsumed = buildRiddlerConsumedGraveyardEntries(state, battle);
    if (riddlerConsumed.length === 0) {
      return finalState;
    }

    return {
      ...finalState,
      graveyard: [...finalState.graveyard, ...riddlerConsumed],
    };
  }

  const resolved = battle.battleType === 'attack'
    ? executeAttackForward(projectedState, battle.initiatorId)
    : executeSelfDefend(projectedState, battle.initiatorId);

  const originalById = new Map(state.characters.map(character => [character.id, character]));

  const normalizedCharacters = resolved.characters.map(character => {
    const original = originalById.get(character.id);
    if (!original) {
      return character;
    }

    return {
      ...character,
      ATK: original.ATK,
      DEF: original.DEF,
    };
  });

  const cleanedPersistent = { ...state.persistentCharacterModifiers };
  const droppedWeapons: UsedPowerCardEntry[] = [];
  const cleanedCharacters = normalizedCharacters.map(character => {
    if (character.alive) {
      return character;
    }

    for (const attachment of character.attachments ?? []) {
      droppedWeapons.push({
        instanceId: attachment.instanceId,
        definitionId: attachment.definitionId,
        controller: character.controller,
        displayName: attachment.displayName,
        selectedChoice: null,
        effectSummary: `Weapon dropped as ${character.displayName ?? character.id} was defeated`,
      });
    }

    return {
      ...character,
      attachments: [],
    };
  });

  for (const character of cleanedCharacters) {
    if (!character.alive && cleanedPersistent[character.id]) {
      delete cleanedPersistent[character.id];
    }
  }

  const resolvedWithCleanup: GameState = {
    ...resolved,
    characters: cleanedCharacters,
    persistentCharacterModifiers: cleanedPersistent,
    usedPowerCardPile: [...resolved.usedPowerCardPile, ...droppedWeapons],
    pendingBattle: null,
  };

  const riddlerConsumed = buildRiddlerConsumedGraveyardEntries(state, battle);
  if (riddlerConsumed.length === 0) {
    return resolvedWithCleanup;
  }

  return {
    ...resolvedWithCleanup,
    graveyard: [...resolvedWithCleanup.graveyard, ...riddlerConsumed],
  };
}
