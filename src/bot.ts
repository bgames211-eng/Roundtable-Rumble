import type { PlayBattlePowerCardInput, ProjectedBattleResult } from './battleFlow';
import type { BotGameView, BotLegalActionDescriptor } from './botView';
import { getPowerCardAiMetadata, type PowerCardInstance } from './powerCards';

export type BotDifficulty = 'Easy' | 'Standard' | 'Hard';

export type BotBoardDecision =
  | {
      kind: 'action';
      action: BotLegalActionDescriptor;
      score: number;
      explanation: string;
      alternativesConsidered: number;
    }
  | {
      kind: 'skip';
      explanation: string;
    };

interface ScoredBoardAction {
  action: BotLegalActionDescriptor;
  score: number;
  reasons: string[];
}

export type BotBoardDecisionContext = Pick<
  BotGameView,
  | 'botController'
  | 'activePlayer'
  | 'gameStatus'
  | 'pendingBattle'
  | 'legalActions'
>;

export type BotBattleDecision =
  | {
      kind: 'pass';
      explanation: string;
      alternativesConsidered?: number;
    }
  | {
      kind: 'play';
      input: PlayBattlePowerCardInput;
      displayName: string;
      definitionId: string;
      explanation: string;
      projectedMarginForBot: number;
      score: number;
      alternativesConsidered: number;
      counterStabilityMarginForBot?: number | null;
      deepCounterStabilityMarginForBot?: number | null;
      expectedDeepCounterStabilityMarginForBot?: number | null;
    };

export interface BattlePlayCandidate {
  input: PlayBattlePowerCardInput;
  displayName: string;
  definitionId: string;
  projectedResult: ProjectedBattleResult;
  opponentBestCounterMarginForBot?: number | null;
  opponentReplyOptionCount?: number;
  opponentBestCounterAfterBotBestRejoinderMarginForBot?: number | null;
  opponentExpectedCounterAfterBotBestRejoinderMarginForBot?: number | null;
}

export interface BotBattleDecisionContext {
  botController: 'P1' | 'P2';
  currentResult: ProjectedBattleResult;
  candidates: BattlePlayCandidate[];
  difficulty?: BotDifficulty;
  imminentKingLoss?: boolean;
  botBattlerIsKing?: boolean;
  opponentBattlerIsKing?: boolean;
  ownBattlerThreatScore?: number;
  opponentBattlerThreatScore?: number;
  opponentBattlerIsTopRevealedThreat?: boolean;
  opponentPowerCardCount?: number;
  remainingBattleHandCount?: number;
  randomFn?: () => number;
}

export interface BotCurtainsDecision {
  shouldPlay: boolean;
  ownSwapCardInstanceId: string | null;
  opponentSwapCardInstanceId: string | null;
  strategicGain: number;
  explanation: string;
}

const BATTLE_PRIORITY_BY_DEFINITION_ID: string[] = [
  'power-alpha-009',
  'power-alpha-003',
  'power-alpha-001',
  'power-alpha-004',
  'power-alpha-005',
  'power-alpha-002',
  'power-alpha-016',
  'power-alpha-008',
  'power-alpha-010',
  'power-alpha-006',
  'power-alpha-007',
];

function cardPriorityRank(definitionId: string): number {
  const index = BATTLE_PRIORITY_BY_DEFINITION_ID.indexOf(definitionId);
  return index >= 0 ? index : BATTLE_PRIORITY_BY_DEFINITION_ID.length + 1;
}

function marginForController(controller: 'P1' | 'P2', result: ProjectedBattleResult): number {
  if (result.winner === controller) {
    return result.winningMargin;
  }
  if (result.winner === 'draw') {
    return 0;
  }
  return -result.winningMargin;
}

function strategicValueScore(definitionId: string): number {
  const strategicValue = getPowerCardAiMetadata(definitionId).strategicValue;
  if (strategicValue === 'premium') {
    return 4;
  }
  if (strategicValue === 'high') {
    return 3;
  }
  if (strategicValue === 'medium') {
    return 2;
  }
  return 1;
}

export function chooseBotCurtainsSwap(
  ownHand: PowerCardInstance[],
  opponentHand: PowerCardInstance[],
  curtainsInstanceId: string,
  difficulty: BotDifficulty = 'Standard',
): BotCurtainsDecision {
  const ownCandidates = ownHand.filter(card => card.instanceId !== curtainsInstanceId);
  if (ownCandidates.length === 0 || opponentHand.length === 0) {
    return {
      shouldPlay: false,
      ownSwapCardInstanceId: null,
      opponentSwapCardInstanceId: null,
      strategicGain: 0,
      explanation: 'Skip BEHIND THE CURTAINS: no valid swap targets.',
    };
  }

  const ownLowest = [...ownCandidates].sort((left, right) => {
    const delta = strategicValueScore(left.definitionId) - strategicValueScore(right.definitionId);
    if (delta !== 0) {
      return delta;
    }
    return left.instanceId.localeCompare(right.instanceId);
  })[0];

  const opponentHighest = [...opponentHand].sort((left, right) => {
    const delta = strategicValueScore(right.definitionId) - strategicValueScore(left.definitionId);
    if (delta !== 0) {
      return delta;
    }
    return left.instanceId.localeCompare(right.instanceId);
  })[0];

  const strategicGain = strategicValueScore(opponentHighest.definitionId) - strategicValueScore(ownLowest.definitionId);
  const threshold = difficulty === 'Hard' ? 1 : difficulty === 'Standard' ? 2 : 3;
  if (strategicGain < threshold) {
    return {
      shouldPlay: false,
      ownSwapCardInstanceId: null,
      opponentSwapCardInstanceId: null,
      strategicGain,
      explanation: `Skip BEHIND THE CURTAINS: gain ${strategicGain} below ${difficulty} threshold ${threshold}.`,
    };
  }

  return {
    shouldPlay: true,
    ownSwapCardInstanceId: ownLowest.instanceId,
    opponentSwapCardInstanceId: opponentHighest.instanceId,
    strategicGain,
    explanation: `Play BEHIND THE CURTAINS: swap lower-value own card for higher-value opponent card (gain ${strategicGain}).`,
  };
}

function cardImpactCost(definitionId: string): number {
  const strategicValue = getPowerCardAiMetadata(definitionId).strategicValue;
  if (strategicValue === 'premium') {
    return 4;
  }
  if (strategicValue === 'high') {
    return 3;
  }
  if (strategicValue === 'medium') {
    return 2;
  }
  return 1;
}

function outcomeTierForMargin(projectedMarginForBot: number): number {
  if (projectedMarginForBot > 0) {
    return 2;
  }
  if (projectedMarginForBot === 0) {
    return 1;
  }
  return 0;
}

function battleCandidateScore(
  candidate: BattlePlayCandidate,
  projectedMarginForBot: number,
  delta: number,
  currentMargin: number,
  difficulty: BotDifficulty,
  imminentKingLoss = false,
  botBattlerIsKing = false,
  opponentBattlerIsKing = false,
  ownBattlerThreatScore = 0,
  opponentBattlerThreatScore = 0,
  opponentBattlerIsTopRevealedThreat = false,
  opponentPowerCardCount = 0,
  remainingBattleHandCount = 0,
): number {
  const impactCost = cardImpactCost(candidate.definitionId);
  const cardMetadata = getPowerCardAiMetadata(candidate.definitionId);
  const outcomeTier = outcomeTierForMargin(projectedMarginForBot);
  const overkill = Math.max(0, projectedMarginForBot - 2);
  const conservationMultiplier = imminentKingLoss ? 0.35 : 1;

  let score = outcomeTier * 100;
  score += delta * 35;
  score += Math.max(0, projectedMarginForBot) * 8;

  const conservationWeight = difficulty === 'Hard' ? 5 : difficulty === 'Standard' ? 6 : 3;
  score -= impactCost * conservationWeight * conservationMultiplier;

  // Penalize high-impact overspend when the line stays non-winning.
  if (projectedMarginForBot <= 0) {
    score -= impactCost * (difficulty === 'Hard' ? 4 : difficulty === 'Standard' ? 8 : 3) * conservationMultiplier;
  }

  // When already losing, heavily discount tiny non-winning improvements with premium cards.
  if (currentMargin < 0 && projectedMarginForBot < 0 && delta <= 1) {
    score -= impactCost * (difficulty === 'Hard' ? 6 : difficulty === 'Standard' ? 10 : 4) * conservationMultiplier;
  }

  // Do not dump equipment into a line that is still clearly losing unless it creates real swing.
  if (cardMetadata.effectType === 'equipment' && projectedMarginForBot < 0) {
    if (delta < 3) {
      score -= (difficulty === 'Hard' ? 140 : difficulty === 'Standard' ? 110 : 45) * conservationMultiplier;
    }
    if (projectedMarginForBot <= -2) {
      score -= (difficulty === 'Hard' ? 90 : difficulty === 'Standard' ? 65 : 25) * conservationMultiplier;
    }
  }

  // Avoid unnecessary large-margin spending once a win line exists.
  score -= overkill * (difficulty === 'Hard' ? 10 : difficulty === 'Standard' ? 8 : 4);

  // In non-king lines, only favorable draw trades should be encouraged.
  if (!imminentKingLoss && !botBattlerIsKing && projectedMarginForBot === 0) {
    let drawTradeSignal = 0;

    if (opponentBattlerIsKing) {
      drawTradeSignal += 180;
    }
    if (opponentBattlerIsTopRevealedThreat) {
      drawTradeSignal += 95;
    }

    const relativeThreat = opponentBattlerThreatScore - ownBattlerThreatScore;
    drawTradeSignal += relativeThreat * 7;

    if (opponentPowerCardCount > remainingBattleHandCount) {
      drawTradeSignal += 20;
    }

    score += drawTradeSignal;
    score -= difficulty === 'Hard' ? 110 : difficulty === 'Standard' ? 160 : 90;
    if (drawTradeSignal <= 0) {
      score -= difficulty === 'Hard' ? 90 : difficulty === 'Standard' ? 120 : 60;
    }
  }

  // Preserve clutch/high-impact cards when this is not a king battle and the line still loses.
  if (!imminentKingLoss && !botBattlerIsKing && projectedMarginForBot <= 0) {
    const isHighReserveCard = cardMetadata.strategicValue === 'premium' || cardMetadata.strategicValue === 'high';
    if (isHighReserveCard && remainingBattleHandCount <= 1) {
      score -= difficulty === 'Hard' ? 170 : difficulty === 'Standard' ? 220 : 260;
    }
    if (cardMetadata.strategicValue === 'premium' && projectedMarginForBot < 0) {
      score -= difficulty === 'Hard' ? 80 : difficulty === 'Standard' ? 110 : 140;
    }
  }

  if (imminentKingLoss) {
    if (projectedMarginForBot > 0) {
      score += 240;
    } else if (projectedMarginForBot === 0) {
      score += 120;
    } else {
      score += Math.max(0, delta) * 60;
    }

    if (candidate.definitionId === 'power-alpha-017') {
      // Phone a Friend can rescue king-loss lines through high-variance replacement.
      score += 70;
    }
  }

  const counterMargin = candidate.opponentBestCounterMarginForBot;
  if (counterMargin !== undefined && counterMargin !== null) {
    // Hard/Standard should avoid flashy wins that immediately collapse to known counters.
    if (projectedMarginForBot > 0 && counterMargin <= 0) {
      score -= difficulty === 'Hard' ? 180 : difficulty === 'Standard' ? 130 : 30;
    } else if (projectedMarginForBot > 0 && counterMargin < projectedMarginForBot) {
      const fragility = projectedMarginForBot - counterMargin;
      score -= fragility * (difficulty === 'Hard' ? 22 : difficulty === 'Standard' ? 14 : 4);
    }
  }

  const deepCounterMargin = candidate.opponentBestCounterAfterBotBestRejoinderMarginForBot;
  if (deepCounterMargin !== undefined && deepCounterMargin !== null) {
    // Prefer lines that still hold after reply+rejoinder lookahead.
    if (projectedMarginForBot > 0 && deepCounterMargin <= 0) {
      score -= difficulty === 'Hard' ? 120 : difficulty === 'Standard' ? 90 : 20;
    } else if (projectedMarginForBot > 0 && deepCounterMargin < projectedMarginForBot) {
      const collapse = projectedMarginForBot - deepCounterMargin;
      score -= collapse * (difficulty === 'Hard' ? 14 : difficulty === 'Standard' ? 9 : 3);
    }

    if (deepCounterMargin > 0) {
      score += deepCounterMargin * (difficulty === 'Hard' ? 12 : difficulty === 'Standard' ? 7 : 2);
    }
  }

  const expectedDeepCounterMargin = candidate.opponentExpectedCounterAfterBotBestRejoinderMarginForBot;
  if (expectedDeepCounterMargin !== undefined && expectedDeepCounterMargin !== null) {
    if (projectedMarginForBot > 0 && expectedDeepCounterMargin <= 0) {
      score -= difficulty === 'Hard' ? 80 : difficulty === 'Standard' ? 55 : 16;
    } else if (projectedMarginForBot > 0 && expectedDeepCounterMargin < projectedMarginForBot) {
      const expectedCollapse = projectedMarginForBot - expectedDeepCounterMargin;
      score -= expectedCollapse * (difficulty === 'Hard' ? 8 : difficulty === 'Standard' ? 5 : 2);
    }

    if (expectedDeepCounterMargin > 0) {
      score += expectedDeepCounterMargin * (difficulty === 'Hard' ? 8 : difficulty === 'Standard' ? 5 : 1);
    }
  }

  return score;
}

function isCloseStandardDrawTradeEdge(
  entry: { candidate: BattlePlayCandidate; projectedMargin: number; score: number },
  difficulty: BotDifficulty,
  botBattlerIsKing: boolean,
  imminentKingLoss: boolean,
  remainingBattleHandCount: number,
): boolean {
  if (difficulty !== 'Standard' || botBattlerIsKing || imminentKingLoss) {
    return false;
  }

  if (entry.projectedMargin !== 0) {
    return false;
  }

  const metadata = getPowerCardAiMetadata(entry.candidate.definitionId);
  const isHighReserveCard = metadata.strategicValue === 'premium' || metadata.strategicValue === 'high';
  if (!isHighReserveCard || remainingBattleHandCount > 1) {
    return false;
  }

  // Near-threshold draw-trade value band where either spend/save can be correct.
  return entry.score >= 45 && entry.score <= 95;
}

function scoreBoardAction(view: BotGameView, action: BotLegalActionDescriptor, difficulty: BotDifficulty): ScoredBoardAction {
  const isKingActor = action.actorIsKing;
  const isActorRevealed = action.actorRevealed;
  const isTargetKing = !!action.targetIsKing;
  const isTargetHidden = action.targetRevealed === false;
  const targetKnownATK = action.targetKnownATK;
  const targetKnownDEF = action.targetKnownDEF;
  const actorAbilityValue = action.actorAbilityStrategicScore;
  const targetAbilityValue = action.targetAbilityStrategicScore ?? 0;

  let score = 0;
  const reasons: string[] = [];

  if (action.type === 'move') {
    score += 40;
    reasons.push('safe-progress baseline');

    if (isKingActor) {
      score += difficulty === 'Hard' ? 5 : 2;
      reasons.push('king reposition without immediate battle');
    }

    if (action.mayGainPowerCardDraw) {
      score += difficulty === 'Hard' ? 68 : difficulty === 'Standard' ? 34 : 22;
      reasons.push('safe king crossing can draw a power card');
    }

    if (action.crossesIntoEnemyTerritory && !action.mayGainPowerCardDraw) {
      score -= difficulty === 'Hard' ? 10 : 6;
      reasons.push('crossing territory without clear card gain has positional risk');
    }

    if (!isActorRevealed) {
      score += difficulty === 'Hard' ? 2 : 1;
      reasons.push('keeps hidden-information pressure');
    }

    if (actorAbilityValue > 0) {
      score += actorAbilityValue * (difficulty === 'Hard' ? 4 : 2);
      reasons.push('preserves utility from strategic ability unit');
    }

      if (action.exposesOwnKingToKnownWinningReply) {
        score -= difficulty === 'Hard' ? 350 : 180;
        reasons.push('exposing own king to known winning reply');
      }

      score -= action.opponentKnownWinningReplies * (difficulty === 'Hard' ? 28 : 16);
  }

  if (action.type === 'attack') {
    score += difficulty === 'Hard' ? 26 : 18;
    reasons.push('creates immediate pressure');

    if (action.knownBattleOutcomeForBot === 'win') {
      score += difficulty === 'Hard' ? 130 : difficulty === 'Standard' ? 115 : 85;
      reasons.push('known favorable battle outcome');
    } else if (action.knownBattleOutcomeForBot === 'draw') {
      score += difficulty === 'Hard' ? 20 : 10;
      reasons.push('known draw may trade value');
    } else if (action.knownBattleOutcomeForBot === 'loss') {
      score -= difficulty === 'Hard' ? 220 : 180;
      reasons.push('known losing battle outcome');
    } else {
      score -= difficulty === 'Hard' ? 10 : difficulty === 'Standard' ? 14 : 8;
      reasons.push('unknown combat risk');

      if (!isKingActor) {
        score += difficulty === 'Hard' ? 24 : difficulty === 'Standard' ? 12 : 0;
        reasons.push('non-king initiative pressure in uncertain line');
      }
    }

    if (isTargetKing && action.knownBattleOutcomeForBot === 'win') {
      score += difficulty === 'Hard' ? 260 : difficulty === 'Standard' ? 230 : 170;
      reasons.push('winning line threatens enemy king directly');
    }

    if (isTargetKing && action.knownBattleOutcomeForBot === null) {
      score += difficulty === 'Hard' ? 34 : difficulty === 'Standard' ? 14 : 8;
      reasons.push('king-hunt pressure even under hidden information');
    }

    if (
      isTargetKing
      && targetKnownATK !== null
      && targetKnownDEF !== null
      && targetKnownDEF > targetKnownATK
      && action.knownBattleOutcomeForBot !== 'win'
    ) {
      score -= difficulty === 'Hard' ? 105 : difficulty === 'Standard' ? 88 : 40;
      reasons.push('high-defense king is a poor non-winning attack target');
    }

    if (targetAbilityValue > 0 && action.knownBattleOutcomeForBot === 'win') {
      score += targetAbilityValue * (difficulty === 'Hard' ? 22 : difficulty === 'Standard' ? 16 : 8);
      reasons.push('removing revealed strategic ability threat');
    }

    if (isTargetHidden && action.knownBattleOutcomeForBot === null) {
      score -= difficulty === 'Hard' ? 26 : difficulty === 'Standard' ? 18 : 8;
      reasons.push('attacking unrevealed target carries unknown matchup risk');
    }

    if (isKingActor) {
      score -= difficulty === 'Hard' ? 45 : 25;
      reasons.push('risking king in attack line');

      if (action.knownBattleOutcomeForBot === 'loss') {
        score -= difficulty === 'Hard' ? 280 : difficulty === 'Standard' ? 200 : 100;
        reasons.push('avoid king-initiated known losing attack');
      }
    }
  }

  if (action.type === 'defend') {
    score += difficulty === 'Hard' ? 10 : difficulty === 'Standard' ? 24 : 14;
    reasons.push('defensive board stabilization');

    if (action.knownBattleOutcomeForBot === 'win') {
      score += difficulty === 'Hard' ? 118 : difficulty === 'Standard' ? 102 : 74;
      reasons.push('known favorable self-defend outcome');
    } else if (action.knownBattleOutcomeForBot === 'draw') {
      score += difficulty === 'Hard' ? 16 : 8;
      reasons.push('known draw blocks pressure');
    } else if (action.knownBattleOutcomeForBot === 'loss') {
      score -= difficulty === 'Hard' ? 205 : 165;
      reasons.push('known losing self-defend outcome');
    } else {
      score -= difficulty === 'Hard' ? 22 : difficulty === 'Standard' ? 10 : 6;
      reasons.push('uncertain self-defend result');

      if (!isKingActor) {
        score -= difficulty === 'Hard' ? 18 : difficulty === 'Standard' ? 8 : 0;
        reasons.push('avoid passive non-king self-defend loops');
      }
    }

    if (isKingActor) {
      score += difficulty === 'Hard' ? 10 : 4;
      reasons.push('king safety has high priority');

      if (action.knownBattleOutcomeForBot === 'loss') {
        score -= difficulty === 'Hard' ? 300 : difficulty === 'Standard' ? 220 : 110;
        reasons.push('avoid king-initiated known losing defend battle');
      }
    }

    if (actorAbilityValue > 0) {
      score += actorAbilityValue * (difficulty === 'Hard' ? 3 : 2);
      reasons.push('maintains board value of revealed utility unit');
    }

    if (isTargetKing && action.knownBattleOutcomeForBot === 'win') {
      score += difficulty === 'Hard' ? 120 : 95;
      reasons.push('defensive line can remove enemy king threat');
    }
  }

  return { action, score, reasons };
}

function sortedScoredBoardActions(view: BotBoardDecisionContext, difficulty: BotDifficulty): ScoredBoardAction[] {
  const scored = view.legalActions.map(action => scoreBoardAction(view, action, difficulty));

  scored.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    const typeOrder = (type: BotLegalActionDescriptor['type']): number => (
      type === 'attack' ? 0 : type === 'defend' ? 1 : 2
    );
    const typeDelta = typeOrder(left.action.type) - typeOrder(right.action.type);
    if (typeDelta !== 0) {
      return typeDelta;
    }

    return left.action.characterId.localeCompare(right.action.characterId);
  });

  return scored;
}

function buildExplanation(chosen: ScoredBoardAction): string {
  const reasonText = chosen.reasons.slice(0, 3).join('; ');
  return `Bot selected ${chosen.action.type.toUpperCase()} with score ${chosen.score}: ${reasonText}`;
}

export function chooseBotBoardDecision(
  view: BotBoardDecisionContext,
  difficulty: BotDifficulty = 'Standard',
  randomFn: () => number = () => 0.5,
): BotBoardDecision {
  if (view.activePlayer !== view.botController || view.pendingBattle || view.gameStatus !== 'active') {
    return { kind: 'skip', explanation: 'Bot skipped: not active controller or board decision unavailable.' };
  }

  if (view.legalActions.length === 0) {
    return { kind: 'skip', explanation: 'Bot skipped: no legal board actions.' };
  }

  const ranked = sortedScoredBoardActions(view, difficulty);
  const ratio = difficulty === 'Easy' ? 0.5 : difficulty === 'Standard' ? 0.2 : 0.1;
  const bandSize = Math.max(1, Math.ceil(ranked.length * ratio));
  const topBand = ranked.slice(0, bandSize);

  const easyMistake = difficulty === 'Easy' && topBand.length > 1 && randomFn() < 0.04;
  const chosen = easyMistake ? topBand[topBand.length - 1] : topBand[0];

  return {
    kind: 'action',
    action: chosen.action,
    score: chosen.score,
    explanation: buildExplanation(chosen),
    alternativesConsidered: ranked.length,
  };
}

export function chooseBotBattleDecision(
  botControllerOrContext: 'P2' | 'P1' | BotBattleDecisionContext,
  currentResultArg?: ProjectedBattleResult,
  candidatesArg?: BattlePlayCandidate[],
  difficultyArg: BotDifficulty = 'Standard',
  randomFnArg: () => number = () => 0.5,
): BotBattleDecision {
  const botController = typeof botControllerOrContext === 'string'
    ? botControllerOrContext
    : botControllerOrContext.botController;
  const currentResult = typeof botControllerOrContext === 'string'
    ? currentResultArg
    : botControllerOrContext.currentResult;
  const candidates = typeof botControllerOrContext === 'string'
    ? candidatesArg
    : botControllerOrContext.candidates;
  const difficulty = typeof botControllerOrContext === 'string'
    ? difficultyArg
    : (botControllerOrContext.difficulty ?? difficultyArg);
  const imminentKingLoss = typeof botControllerOrContext === 'string'
    ? false
    : !!botControllerOrContext.imminentKingLoss;
  const botBattlerIsKing = typeof botControllerOrContext === 'string'
    ? false
    : !!botControllerOrContext.botBattlerIsKing;
  const opponentBattlerIsKing = typeof botControllerOrContext === 'string'
    ? false
    : !!botControllerOrContext.opponentBattlerIsKing;
  const ownBattlerThreatScore = typeof botControllerOrContext === 'string'
    ? 0
    : (botControllerOrContext.ownBattlerThreatScore ?? 0);
  const opponentBattlerThreatScore = typeof botControllerOrContext === 'string'
    ? 0
    : (botControllerOrContext.opponentBattlerThreatScore ?? 0);
  const opponentBattlerIsTopRevealedThreat = typeof botControllerOrContext === 'string'
    ? false
    : !!botControllerOrContext.opponentBattlerIsTopRevealedThreat;
  const opponentPowerCardCount = typeof botControllerOrContext === 'string'
    ? 0
    : (botControllerOrContext.opponentPowerCardCount ?? 0);
  const remainingBattleHandCount = typeof botControllerOrContext === 'string'
    ? 0
    : (botControllerOrContext.remainingBattleHandCount ?? 0);
  const randomFn = typeof botControllerOrContext === 'string'
    ? randomFnArg
    : (botControllerOrContext.randomFn ?? randomFnArg);

  if (!currentResult || !candidates) {
    return {
      kind: 'pass',
      explanation: 'Bot passes: incomplete battle decision context.',
    };
  }

  const currentMargin = marginForController(botController, currentResult);

  if (currentResult.winner === botController) {
    return {
      kind: 'pass',
      explanation: `Bot passes: already ahead by ${currentMargin}.`,
      alternativesConsidered: candidates.length,
    };
  }

  const evaluated = candidates.map(candidate => {
    const projectedMargin = marginForController(botController, candidate.projectedResult);
    const delta = projectedMargin - currentMargin;
    let score = battleCandidateScore(
      candidate,
      projectedMargin,
      delta,
      currentMargin,
      difficulty,
      imminentKingLoss,
      botBattlerIsKing,
      opponentBattlerIsKing,
      ownBattlerThreatScore,
      opponentBattlerThreatScore,
      opponentBattlerIsTopRevealedThreat,
      opponentPowerCardCount,
      remainingBattleHandCount,
    );

    const kingTieTrapKickOut = (
      candidate.definitionId === 'power-alpha-009'
      && !botBattlerIsKing
      && opponentBattlerIsKing
      && candidate.projectedResult.winner !== botController
      && candidate.projectedResult.winningMargin === 0
    );
    if (kingTieTrapKickOut) {
      // Against a king, equalizing to a tie still loses if our battler is not a king.
      score -= difficulty === 'Hard' ? 800 : difficulty === 'Standard' ? 900 : 1000;
    }

    return {
      candidate,
      projectedMargin,
      delta,
      score,
    };
  });

  const winning = evaluated.filter(entry => entry.projectedMargin > 0);
  if (winning.length > 0) {
    let winningPool = [...winning];

    if (difficulty !== 'Easy') {
      const resilientWins = winningPool.filter(entry => {
        const deepCounter = entry.candidate.opponentBestCounterAfterBotBestRejoinderMarginForBot;
        const directCounter = entry.candidate.opponentBestCounterMarginForBot;
        const sustainability = deepCounter ?? directCounter;
        return sustainability === undefined || sustainability === null || sustainability > 0;
      });
      if (resilientWins.length > 0) {
        winningPool = resilientWins;
      }

      const minimumWinningMargin = Math.min(...winningPool.map(entry => entry.projectedMargin));
      winningPool = winningPool.filter(entry => entry.projectedMargin === minimumWinningMargin);
    }

    winningPool.sort((left, right) => {
      if (difficulty === 'Easy') {
        if (right.projectedMargin !== left.projectedMargin) {
          return right.projectedMargin - left.projectedMargin;
        }
      } else if (right.score !== left.score) {
        return right.score - left.score;
      }

      const leftRank = cardPriorityRank(left.candidate.definitionId);
      const rightRank = cardPriorityRank(right.candidate.definitionId);
      if (leftRank !== rightRank) {
        return rightRank - leftRank;
      }

      const leftChoice = left.candidate.input.selectedChoice ?? '';
      const rightChoice = right.candidate.input.selectedChoice ?? '';
      if (leftChoice !== rightChoice) {
        return leftChoice.localeCompare(rightChoice);
      }

      return left.candidate.input.instanceId.localeCompare(right.candidate.input.instanceId);
    });

    const easyMistake = difficulty === 'Easy' && winningPool.length > 1 && randomFn() < 0.04;
    const bestWin = easyMistake ? winningPool[winningPool.length - 1] : winningPool[0];
    return {
      kind: 'play',
      input: bestWin.candidate.input,
      displayName: bestWin.candidate.displayName,
      definitionId: bestWin.candidate.definitionId,
      explanation: `Bot plays ${bestWin.candidate.displayName}: chooses resilient minimum-margin win (projected ${bestWin.projectedMargin}, score ${bestWin.score}).`,
      projectedMarginForBot: bestWin.projectedMargin,
      score: bestWin.score,
      alternativesConsidered: evaluated.length,
      counterStabilityMarginForBot: bestWin.candidate.opponentBestCounterMarginForBot,
      deepCounterStabilityMarginForBot: bestWin.candidate.opponentBestCounterAfterBotBestRejoinderMarginForBot,
      expectedDeepCounterStabilityMarginForBot: bestWin.candidate.opponentExpectedCounterAfterBotBestRejoinderMarginForBot,
    };
  }

  const shouldReserveForFutureBattle = !imminentKingLoss && !botBattlerIsKing;
  const drawTradeThreshold = difficulty === 'Hard' ? 35 : difficulty === 'Standard' ? 45 : 28;
  const improving = imminentKingLoss
    ? evaluated.filter(entry => entry.delta >= 0)
    : shouldReserveForFutureBattle
      ? evaluated.filter(entry => (
        entry.delta > 0
        && (
          entry.projectedMargin > 0
          || (entry.projectedMargin === 0 && entry.score >= drawTradeThreshold)
        )
      ))
      : evaluated.filter(entry => entry.delta > 0);

  if (improving.length === 0) {
    return {
      kind: 'pass',
      explanation: shouldReserveForFutureBattle
        ? 'Bot passes: no legal card reaches draw/win in this non-king battle.'
        : 'Bot passes: no legal card improves projected battle outcome.',
      alternativesConsidered: evaluated.length,
    };
  }

  improving.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    if (right.delta !== left.delta) {
      return right.delta - left.delta;
    }

    const leftRank = cardPriorityRank(left.candidate.definitionId);
    const rightRank = cardPriorityRank(right.candidate.definitionId);
    if (leftRank !== rightRank) {
      return rightRank - leftRank;
    }

    return left.candidate.input.instanceId.localeCompare(right.candidate.input.instanceId);
  });

  const easyMistake = difficulty === 'Easy' && improving.length > 1 && randomFn() < 0.04;
  const bestImprove = easyMistake ? improving[improving.length - 1] : improving[0];
  const isReserveLine = shouldReserveForFutureBattle && bestImprove.projectedMargin <= 0;
  const shouldUseImprove = imminentKingLoss
    ? bestImprove.score >= -120
    : isReserveLine
      ? difficulty === 'Hard'
        ? bestImprove.score >= 45
        : difficulty === 'Standard'
          ? bestImprove.score >= 70
          : false
    : difficulty === 'Hard'
      ? bestImprove.score >= 5
      : difficulty === 'Standard'
        ? bestImprove.score >= 25
        : false;

  if (
    shouldUseImprove
    && isCloseStandardDrawTradeEdge(bestImprove, difficulty, botBattlerIsKing, imminentKingLoss, remainingBattleHandCount)
    && randomFn() < 0.5
  ) {
    return {
      kind: 'pass',
      explanation: 'Bot passes: conserving last high-impact card in close non-king draw-trade edge case.',
      alternativesConsidered: evaluated.length,
    };
  }

  if (!shouldUseImprove) {
    return {
      kind: 'pass',
      explanation: `Bot passes: best improvement score (${bestImprove.score}) does not meet ${difficulty} threshold.`,
      alternativesConsidered: evaluated.length,
    };
  }

  return {
    kind: 'play',
    input: bestImprove.candidate.input,
    displayName: bestImprove.candidate.displayName,
    definitionId: bestImprove.candidate.definitionId,
    explanation: `Bot plays ${bestImprove.candidate.displayName}: improves projected margin by ${bestImprove.delta} (score ${bestImprove.score}).`,
    projectedMarginForBot: bestImprove.projectedMargin,
    score: bestImprove.score,
    alternativesConsidered: evaluated.length,
    counterStabilityMarginForBot: bestImprove.candidate.opponentBestCounterMarginForBot,
    deepCounterStabilityMarginForBot: bestImprove.candidate.opponentBestCounterAfterBotBestRejoinderMarginForBot,
    expectedDeepCounterStabilityMarginForBot: bestImprove.candidate.opponentExpectedCounterAfterBotBestRejoinderMarginForBot,
  };
}
