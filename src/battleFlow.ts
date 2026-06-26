import { getBackwardSpace, getForwardSpace } from './board';
import {
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
import { getPlayerGameView, type PlayerSafeGameView } from './setup';

interface BattleParticipantPublic {
  id: string;
  controller: Controller;
  boardPosition: string;
  isKing: boolean;
  displayName: string;
  ATK: number;
  DEF: number;
}

export interface BattlePublicView {
  status: PendingBattle['status'];
  battleType: BattleType;
  currentPriorityPlayer: Controller;
  consecutivePassCount: number;
  initiator: BattleParticipantPublic;
  opponent: BattleParticipantPublic;
  initiatorComparisonLabel: 'ATK' | 'DEF';
  opponentComparisonLabel: 'DEF';
  initiatorBaseComparison: number;
  opponentBaseComparison: number;
  battleEventHistory: string[];
  boardView: PlayerSafeGameView;
  powerCardHandCount: { Y: number; A: number };
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
    handoffRequiredFor: null,
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

export function getBattlePublicView(state: GameState): BattlePublicView {
  const battle = requirePendingBattle(state);
  const initiator = getCharacter(state, battle.initiatorId);
  const opponent = getCharacter(state, battle.opponentId);

  if (!initiator || !opponent) {
    throw new Error('Pending battle participants are missing');
  }

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
    initiatorComparisonLabel: battle.battleType === 'attack' ? 'ATK' : 'DEF',
    opponentComparisonLabel: 'DEF',
    initiatorBaseComparison: battle.initiatorBaseComparisonStat,
    opponentBaseComparison: battle.opponentBaseComparisonStat,
    battleEventHistory: [...battle.eventHistory],
    boardView: getPlayerGameView(state),
    powerCardHandCount: { ...state.powerCardHandCount },
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

  const baseState: GameState = {
    ...state,
    pendingBattle: null,
  };

  const resolved = battle.battleType === 'attack'
    ? executeAttackForward(baseState, battle.initiatorId)
    : executeSelfDefend(baseState, battle.initiatorId);

  return {
    ...resolved,
    pendingBattle: null,
  };
}
