import { getBackwardSpace, getForwardSpace } from './board';
import {
  type BattleTemporaryModifier,
  type BattleType,
  type Controller,
  type GameState,
  type PendingBattle,
  getCharacter,
  getCharacterAtPosition,
  logEvent,
} from './gameState';
import {
  canAttackForward,
  canSelfDefend,
  executeAttackForward,
  executeSelfDefend,
} from './gameEngine';
import { getPlayerGameView, getPrivatePowerCardHand, type PlayerSafeGameView } from './setup';
import { getPowerCardDefinition, type UsedPowerCardEntry } from './powerCards';

type StatLabel = 'ATK' | 'DEF';

interface BattleParticipantPublic {
  id: string;
  controller: Controller;
  boardPosition: string;
  isKing: boolean;
  displayName: string;
  ATK: number;
  DEF: number;
}

export interface BattleModifierPublic {
  sourceCardName: string;
  controller: Controller;
  targetCharacterId: string;
  stat: StatLabel;
  amount: number;
  effectSummary: string;
}

export interface BattlePublicView {
  status: PendingBattle['status'];
  battleType: BattleType;
  currentPriorityPlayer: Controller;
  consecutivePassCount: number;
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
  powerCardHandCount: { Y: number; A: number };
  usedPowerCards: UsedPowerCardEntry[];
  liveModifiers: BattleModifierPublic[];
}

export interface PrivateBattleHandCardView {
  instanceId: string;
  definitionId: string;
  displayName: string;
  rulesText: string;
  isPlayable: boolean;
  disabledReason: string | null;
  allowedChoices: Array<'ATK' | 'DEF'>;
}

export interface PrivateBattleHandView {
  player: Controller;
  cards: PrivateBattleHandCardView[];
}

export interface PlayBattlePowerCardInput {
  instanceId: string;
  selectedChoice?: 'ATK' | 'DEF';
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

function getBattlingCharacterIdForController(battle: PendingBattle, controller: Controller): string {
  return battle.initiatorController === controller ? battle.initiatorId : battle.opponentId;
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

  const base = character[stat];
  const temporary = getTemporaryStatModifierTotal(battle, characterId, stat);
  const persistent = getPersistentStatModifierTotal(state, characterId, stat);
  return base + temporary + persistent;
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

function buildBattleContext(
  state: GameState,
  battleType: BattleType,
  initiatorId: string,
): PendingBattle {
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

  const initiatorStat = battleType === 'attack' ? initiator.ATK : initiator.DEF;

  return {
    battleType,
    status: 'WindowOpen',
    initiatorId: initiator.id,
    opponentId: opponent.id,
    initiatorController: initiator.controller,
    opponentController: opponent.controller,
    initiatorStartPosition: initiator.boardPosition,
    opponentStartPosition: opponent.boardPosition,
    initiatorBaseComparisonStat: initiatorStat,
    opponentBaseComparisonStat: opponent.DEF,
    currentPriorityPlayer: initiator.controller,
    consecutivePassCount: 0,
    handoffRequiredFor: initiator.controller,
    comparisonStatOverrides: {},
    temporaryModifiers: [],
    eventHistory: [
      `Battle started: ${battleType === 'attack' ? 'Attack Forward' : 'Self-Defend'}`,
      `Priority: ${initiator.controller}`,
    ],
  };
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

  const battle = buildBattleContext(state, battleType, initiatorId);

  let next: GameState = {
    ...state,
    pendingBattle: battle,
    characters: state.characters.map(character => {
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
    const opponentController: Controller = actingPlayer === 'Y' ? 'A' : 'Y';
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
    const opponent = getCharacter(state, getBattlingCharacterIdForController(battle, actingPlayer === 'Y' ? 'A' : 'Y'));
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

  return {
    isPlayable: false,
    disabledReason: 'Not playable in this build yet',
    allowedChoices: [],
  };
}

export function getBattlePrivateHandView(state: GameState, player: Controller): PrivateBattleHandView {
  const battle = requirePendingBattle(state);

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
  const opponentController: Controller = actingPlayer === 'Y' ? 'A' : 'Y';
  const opponentCharacterId = getBattlingCharacterIdForController(battle, opponentController);

  let updatedBattle: PendingBattle = battle;
  let effectSummary = '';

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
    effectSummary = 'Both battlers swap current effective ATK and DEF for this battle';

    const ownCurrentATK = getEffectiveBattleStat(state, updatedBattle, ownCharacterId, 'ATK');
    const ownCurrentDEF = getEffectiveBattleStat(state, updatedBattle, ownCharacterId, 'DEF');
    const opponentCurrentATK = getEffectiveBattleStat(state, updatedBattle, opponentCharacterId, 'ATK');
    const opponentCurrentDEF = getEffectiveBattleStat(state, updatedBattle, opponentCharacterId, 'DEF');

    updatedBattle = applyModifier(
      updatedBattle,
      cardInHand.instanceId,
      cardInHand.definitionId,
      definition.displayName,
      actingPlayer,
      ownCharacterId,
      'ATK',
      ownCurrentDEF - ownCurrentATK,
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
      ownCurrentATK - ownCurrentDEF,
      effectSummary,
      null,
    );
    updatedBattle = applyModifier(
      updatedBattle,
      cardInHand.instanceId,
      cardInHand.definitionId,
      definition.displayName,
      actingPlayer,
      opponentCharacterId,
      'ATK',
      opponentCurrentDEF - opponentCurrentATK,
      effectSummary,
      null,
    );
    updatedBattle = applyModifier(
      updatedBattle,
      cardInHand.instanceId,
      cardInHand.definitionId,
      definition.displayName,
      actingPlayer,
      opponentCharacterId,
      'DEF',
      opponentCurrentATK - opponentCurrentDEF,
      effectSummary,
      null,
    );
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
  }

  const nextPriority: Controller = actingPlayer === 'Y' ? 'A' : 'Y';
  const nextHand = hand.filter(card => card.instanceId !== input.instanceId);
  const usedEntry: UsedPowerCardEntry = {
    instanceId: cardInHand.instanceId,
    definitionId: cardInHand.definitionId,
    controller: actingPlayer,
    displayName: definition.displayName,
    selectedChoice: input.selectedChoice ?? null,
    effectSummary,
  };

  const ownCharacter = getCharacter(state, ownCharacterId);
  const addPermanent = cardInHand.definitionId === 'power-alpha-010' && isGenghisKhan(ownCharacter?.displayName);
  const existingPersistent = state.persistentCharacterModifiers[ownCharacterId] ?? { ATK: 0, DEF: 0 };

  let next: GameState = {
    ...state,
    powerCardHands: {
      ...state.powerCardHands,
      [actingPlayer]: nextHand,
    },
    usedPowerCardPile: [...state.usedPowerCardPile, usedEntry],
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
      handoffRequiredFor: nextPriority,
      eventHistory: [
        ...updatedBattle.eventHistory,
        `${actingPlayer} played ${definition.displayName}`,
        effectSummary,
        'Pass streak reset to 0',
        `Priority: ${nextPriority}`,
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

  const initiatorBaseComparison = comparisons.initiatorLabel === 'ATK'
    ? initiator.ATK + initiatorPersistentATK
    : initiator.DEF + initiatorPersistentDEF;
  const opponentBaseComparison = comparisons.opponentLabel === 'ATK'
    ? opponent.ATK + opponentPersistentATK
    : opponent.DEF + opponentPersistentDEF;

  return {
    status: battle.status,
    battleType: battle.battleType,
    currentPriorityPlayer: battle.currentPriorityPlayer,
    consecutivePassCount: battle.consecutivePassCount,
    initiator: {
      id: initiator.id,
      controller: initiator.controller,
      boardPosition: initiator.boardPosition ?? battle.initiatorStartPosition,
      isKing: initiator.isKing,
      displayName: initiator.displayName ?? 'Unknown',
      ATK: initiator.ATK,
      DEF: initiator.DEF,
    },
    opponent: {
      id: opponent.id,
      controller: opponent.controller,
      boardPosition: opponent.boardPosition ?? battle.opponentStartPosition,
      isKing: opponent.isKing,
      displayName: opponent.displayName ?? 'Unknown',
      ATK: opponent.ATK,
      DEF: opponent.DEF,
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
      controller: modifier.controller,
      targetCharacterId: modifier.targetCharacterId,
      stat: modifier.stat,
      amount: modifier.amount,
      effectSummary: modifier.effectSummary,
    })),
  };
}

export function passBattlePriority(state: GameState, actingPlayer: Controller): GameState {
  const battle = requirePendingBattle(state);

  if (battle.status !== 'WindowOpen') {
    throw new Error('Cannot pass priority: battle window is not open');
  }

  if (actingPlayer !== battle.currentPriorityPlayer) {
    throw new Error('Cannot pass priority: it is not this player\'s priority');
  }

  const nextPriority: Controller = actingPlayer === 'Y' ? 'A' : 'Y';
  const nextPassCount = battle.consecutivePassCount + 1;
  const ready = nextPassCount >= 2;

  const updatedBattle: PendingBattle = {
    ...battle,
    currentPriorityPlayer: nextPriority,
    consecutivePassCount: nextPassCount,
    status: ready ? 'ReadyToResolve' : 'WindowOpen',
    handoffRequiredFor: ready ? null : nextPriority,
    eventHistory: [
      ...battle.eventHistory,
      `${actingPlayer} passed priority (${nextPassCount}/2)`,
      ready ? 'Battle is Ready To Resolve' : `Priority: ${nextPriority}`,
    ],
  };

  let next: GameState = {
    ...state,
    pendingBattle: updatedBattle,
  };

  next = logEvent(next, 'Battle Pass', {
    actingPlayer,
    consecutivePassCount: nextPassCount,
    nextPriority,
    readyToResolve: ready,
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

  const nextPriority: Controller = actingPlayer === 'Y' ? 'A' : 'Y';

  const updatedBattle: PendingBattle = {
    ...battle,
    currentPriorityPlayer: nextPriority,
    consecutivePassCount: 0,
    handoffRequiredFor: nextPriority,
    eventHistory: [
      ...battle.eventHistory,
      `${actingPlayer} played a legal battle card placeholder`,
      'Pass streak reset to 0',
      `Priority: ${nextPriority}`,
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
  for (const character of normalizedCharacters) {
    if (!character.alive && cleanedPersistent[character.id]) {
      delete cleanedPersistent[character.id];
    }
  }

  return {
    ...resolved,
    characters: normalizedCharacters,
    persistentCharacterModifiers: cleanedPersistent,
    pendingBattle: null,
  };
}
