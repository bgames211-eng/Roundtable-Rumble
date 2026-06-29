import type { PlayBattlePowerCardInput, ProjectedBattleResult } from './battleFlow';
import type { BotGameView, BotLegalActionDescriptor } from './botView';

export type BotDifficulty = 'Easy' | 'Standard' | 'Hard';

export type BotBoardDecision =
  | { kind: 'action'; action: BotLegalActionDescriptor }
  | { kind: 'skip' };

export type BotBattleDecision =
  | { kind: 'pass' }
  | {
      kind: 'play';
      input: PlayBattlePowerCardInput;
      displayName: string;
      definitionId: string;
    };

export interface BattlePlayCandidate {
  input: PlayBattlePowerCardInput;
  displayName: string;
  definitionId: string;
  projectedResult: ProjectedBattleResult;
}

const CARD_PRIORITY: string[] = [
  'KICK-OUT!!',
  "CHAMPION'S ADVANTAGE",
  'SUPER BAT',
  'SUPERKICK!',
  'LOW BLOW!',
  'BOOM !! BOMB',
  'BRICK WALL',
  'MONGOL EMPIRE',
  'POWER STONE',
  'FLIP THE SCRIPT',
];

function cardPriorityRank(displayName: string): number {
  const index = CARD_PRIORITY.indexOf(displayName);
  return index >= 0 ? index : CARD_PRIORITY.length + 1;
}

export function chooseBotBoardDecision(view: BotGameView, difficulty: BotDifficulty = 'Standard'): BotBoardDecision {
  if (view.activePlayer !== view.botController || view.pendingBattle || view.gameStatus !== 'active') {
    return { kind: 'skip' };
  }

  const actions = view.legalActions;
  const winningAttacks = actions.filter(action => action.type === 'attack' && action.knownBattleOutcomeForBot === 'win');
  const winningDefends = actions.filter(action => action.type === 'defend' && action.knownBattleOutcomeForBot === 'win');
  const drawAttacks = actions.filter(action => action.type === 'attack' && action.knownBattleOutcomeForBot === 'draw');
  const drawDefends = actions.filter(action => action.type === 'defend' && action.knownBattleOutcomeForBot === 'draw');
  const moveForward = actions.find(action => action.type === 'move');
  const attackForward = actions.find(action => action.type === 'attack');
  const selfDefend = actions.find(action => action.type === 'defend');

  if (difficulty === 'Easy') {
    if (moveForward) {
      return { kind: 'action', action: moveForward };
    }
    if (attackForward) {
      return { kind: 'action', action: attackForward };
    }
    if (selfDefend) {
      return { kind: 'action', action: selfDefend };
    }
    return { kind: 'skip' };
  }

  if (difficulty === 'Hard') {
    if (winningAttacks[0]) {
      return { kind: 'action', action: winningAttacks[0] };
    }
    if (winningDefends[0]) {
      return { kind: 'action', action: winningDefends[0] };
    }
    if (drawDefends[0]) {
      return { kind: 'action', action: drawDefends[0] };
    }
    if (drawAttacks[0]) {
      return { kind: 'action', action: drawAttacks[0] };
    }
    if (selfDefend) {
      return { kind: 'action', action: selfDefend };
    }
    if (moveForward) {
      return { kind: 'action', action: moveForward };
    }
    if (attackForward) {
      return { kind: 'action', action: attackForward };
    }
    return { kind: 'skip' };
  }

  if (winningAttacks[0]) {
    return { kind: 'action', action: winningAttacks[0] };
  }
  if (winningDefends[0]) {
    return { kind: 'action', action: winningDefends[0] };
  }
  if (moveForward) {
    return { kind: 'action', action: moveForward };
  }
  if (attackForward) {
    return { kind: 'action', action: attackForward };
  }
  if (selfDefend) {
    return { kind: 'action', action: selfDefend };
  }

  return { kind: 'skip' };
}

export function chooseBotBattleDecision(
  botController: 'P2' | 'P1',
  currentResult: ProjectedBattleResult,
  candidates: BattlePlayCandidate[],
  difficulty: BotDifficulty = 'Standard',
): BotBattleDecision {
  if (currentResult.winner === botController) {
    return { kind: 'pass' };
  }

  const winningCandidates = candidates.filter(candidate => candidate.projectedResult.winner === botController);
  if (winningCandidates.length === 0) {
    return { kind: 'pass' };
  }

  winningCandidates.sort((left, right) => {
    if (difficulty === 'Hard') {
      if (left.projectedResult.winningMargin !== right.projectedResult.winningMargin) {
        return left.projectedResult.winningMargin - right.projectedResult.winningMargin;
      }

      const leftRank = cardPriorityRank(left.displayName);
      const rightRank = cardPriorityRank(right.displayName);
      if (leftRank !== rightRank) {
        return rightRank - leftRank;
      }
    } else {
      if (right.projectedResult.winningMargin !== left.projectedResult.winningMargin) {
        return right.projectedResult.winningMargin - left.projectedResult.winningMargin;
      }

      const leftRank = cardPriorityRank(left.displayName);
      const rightRank = cardPriorityRank(right.displayName);
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }
    }

    const leftChoice = left.input.selectedChoice ?? '';
    const rightChoice = right.input.selectedChoice ?? '';
    if (leftChoice !== rightChoice) {
      return leftChoice.localeCompare(rightChoice);
    }

    return left.input.instanceId.localeCompare(right.input.instanceId);
  });

  const best = winningCandidates[0];
  return {
    kind: 'play',
    input: best.input,
    displayName: best.displayName,
    definitionId: best.definitionId,
  };
}
