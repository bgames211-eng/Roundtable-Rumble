import { getBackwardSpace, getForwardSpace } from './board';
import { getBattlePublicView, type BattlePublicView } from './battleFlow';
import {
  getLegalActions,
  hasLegalAction,
  resolveBattle,
} from './gameEngine';
import {
  type BoardSpace,
  type Controller,
  type GameState,
  getCharacter,
  getCharacterAtPosition,
} from './gameState';
import {
  getPlayerGameView,
  getPrivatePowerCardHand,
  type PlayerSafeGameView,
  type PrivatePowerCardView,
} from './setup';

export interface BotLegalActionDescriptor {
  type: 'move' | 'attack' | 'defend';
  characterId: string;
  knownBattleOutcomeForBot: 'win' | 'loss' | 'draw' | null;
}

export interface BotGameView {
  botController: Controller;
  activePlayer: Controller;
  turnNumber: number;
  gameStatus: GameState['gameStatus'];
  publicView: PlayerSafeGameView;
  pendingBattle: BattlePublicView | null;
  legalActions: BotLegalActionDescriptor[];
  hasLegalAction: boolean;
  ownPowerCardHand: PrivatePowerCardView[];
}

function getOpponentForBattleAction(
  state: GameState,
  actorPosition: BoardSpace,
  actionType: 'attack' | 'defend',
) {
  const targetSpace = actionType === 'attack'
    ? getForwardSpace(actorPosition)
    : getBackwardSpace(actorPosition);
  return getCharacterAtPosition(state, targetSpace);
}

function getKnownBattleOutcome(
  state: GameState,
  botController: Controller,
  action: ReturnType<typeof getLegalActions>[number],
): 'win' | 'loss' | 'draw' | null {
  if (action.type !== 'attack' && action.type !== 'defend') {
    return null;
  }

  const actor = getCharacter(state, action.characterId);
  if (!actor || !actor.alive || !actor.boardPosition) {
    return null;
  }

  const opponent = getOpponentForBattleAction(state, actor.boardPosition, action.type);
  if (!opponent || !opponent.alive) {
    return null;
  }

  // Bot can only treat outcome as known if both participants are already publicly revealed.
  if (!actor.revealed || !opponent.revealed) {
    return null;
  }

  const actorComparison = action.type === 'attack' ? actor.ATK : actor.DEF;
  const opponentComparison = opponent.DEF;
  const outcome = resolveBattle(actor, opponent, actorComparison, opponentComparison);

  if (outcome.isDoubleLoss) {
    return 'draw';
  }

  const winningCharacter = getCharacter(state, outcome.winnerId);
  if (!winningCharacter) {
    return null;
  }

  return winningCharacter.controller === botController ? 'win' : 'loss';
}

function toBotLegalActionDescriptors(
  state: GameState,
  botController: Controller,
): BotLegalActionDescriptor[] {
  if (state.gameStatus !== 'active' || state.pendingBattle || state.activePlayer !== botController) {
    return [];
  }

  return getLegalActions(state).map(action => ({
    type: action.type as BotLegalActionDescriptor['type'],
    characterId: action.characterId,
    knownBattleOutcomeForBot: getKnownBattleOutcome(state, botController, action),
  }));
}

export function getBotGameView(state: GameState, botController: Controller): BotGameView {
  return {
    botController,
    activePlayer: state.activePlayer,
    turnNumber: state.turnNumber,
    gameStatus: state.gameStatus,
    publicView: getPlayerGameView(state),
    pendingBattle: state.pendingBattle ? getBattlePublicView(state) : null,
    legalActions: toBotLegalActionDescriptors(state, botController),
    hasLegalAction: state.activePlayer === botController && !state.pendingBattle && hasLegalAction(state),
    ownPowerCardHand: getPrivatePowerCardHand(state, botController),
  };
}
