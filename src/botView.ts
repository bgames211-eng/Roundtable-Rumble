import { getBackwardSpace, getForwardSpace, getTerritory } from './board';
import { getBattlePublicView, type BattlePublicView } from './battleFlow';
import {
  canMoveForward,
  executeMoveForward,
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
import { abilityStrategicScore } from './characterAbilityMetadata';

export interface BotLegalActionDescriptor {
  type: 'move' | 'attack' | 'defend';
  characterId: string;
  knownBattleOutcomeForBot: 'win' | 'loss' | 'draw' | null;
  actorIsKing: boolean;
  actorRevealed: boolean;
  actorBoardPosition: BoardSpace | null;
  actorKnownATK: number | null;
  actorKnownDEF: number | null;
  targetCharacterId: string | null;
  targetIsKing: boolean | null;
  targetRevealed: boolean | null;
  targetBoardPosition: BoardSpace | null;
  crossesIntoEnemyTerritory: boolean;
  mayGainPowerCardDraw: boolean;
  allowsOpponentKingCrossDrawReply: boolean;
  opponentKnownWinningReplies: number;
  exposesOwnKingToKnownWinningReply: boolean;
  actorAbilityStrategicScore: number;
  targetAbilityStrategicScore: number | null;
  targetKnownATK: number | null;
  targetKnownDEF: number | null;
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

  const publicView = getPlayerGameView(state);

  return getLegalActions(state).map(action => {
    const actor = publicView.boardCards.find(card => card.instanceId === action.characterId) ?? null;
    const actorPosition = actor?.boardPosition ?? null;
    const targetSpace = actorPosition
      ? (action.type === 'move' || action.type === 'attack'
        ? getForwardSpace(actorPosition)
        : getBackwardSpace(actorPosition))
      : null;
    const target = targetSpace
      ? publicView.boardCards.find(card => card.boardPosition === targetSpace && card.alive)
      : null;
    const crossesIntoEnemyTerritory = !!actorPosition && !!targetSpace && getTerritory(targetSpace) !== getTerritory(actorPosition);
    const mayGainPowerCardDraw = action.type === 'move'
      && !!actor?.isKing
      && crossesIntoEnemyTerritory
      && publicView.powerCards.remainingDeckCount > 0;

    let opponentKnownWinningReplies = 0;
    let exposesOwnKingToKnownWinningReply = false;
    let allowsOpponentKingCrossDrawReply = false;

    if (action.type === 'move' && canMoveForward(state, action.characterId)) {
      const nextState = executeMoveForward(state, action.characterId);
      const opponent: Controller = botController === 'P1' ? 'P2' : 'P1';
      if (!nextState.pendingBattle && nextState.activePlayer === opponent && nextState.gameStatus === 'active') {
        const opponentActions = getLegalActions(nextState);
        const ownKing = nextState.characters.find(character => (
          character.alive
          && character.controller === botController
          && character.isKing
        ));

        for (const opponentAction of opponentActions) {
          if (opponentAction.type === 'move') {
            const opponentActor = getCharacter(nextState, opponentAction.characterId);
            if (opponentActor?.alive && opponentActor.isKing && opponentActor.boardPosition) {
              const nextSpace = getForwardSpace(opponentActor.boardPosition);
              const crosses = getTerritory(nextSpace) !== getTerritory(opponentActor.boardPosition);
              if (crosses && nextState.powerCardDeck.length > 0) {
                allowsOpponentKingCrossDrawReply = true;
              }
            }
          }

          const knownOutcome = getKnownBattleOutcome(nextState, opponent, opponentAction);
          if (knownOutcome !== 'win') {
            continue;
          }

          opponentKnownWinningReplies += 1;
          if (ownKing && (opponentAction.type === 'attack' || opponentAction.type === 'defend')) {
            const opponentActor = getCharacter(nextState, opponentAction.characterId);
            if (opponentActor?.boardPosition) {
              const targetSpace = opponentAction.type === 'attack'
                ? getForwardSpace(opponentActor.boardPosition)
                : getBackwardSpace(opponentActor.boardPosition);
              if (ownKing.boardPosition === targetSpace) {
                exposesOwnKingToKnownWinningReply = true;
              }
            }
          }
        }
      }
    }

    return {
      type: action.type as BotLegalActionDescriptor['type'],
      characterId: action.characterId,
      knownBattleOutcomeForBot: getKnownBattleOutcome(state, botController, action),
      actorIsKing: !!actor?.isKing,
      actorRevealed: !!actor?.revealed,
      actorBoardPosition: actorPosition,
      actorKnownATK: actor?.revealed ? actor.ATK : null,
      actorKnownDEF: actor?.revealed ? actor.DEF : null,
      targetCharacterId: target?.instanceId ?? null,
      targetIsKing: target?.isKing ?? null,
      targetRevealed: target?.revealed ?? null,
      targetBoardPosition: target?.boardPosition ?? null,
      crossesIntoEnemyTerritory,
      mayGainPowerCardDraw,
      allowsOpponentKingCrossDrawReply,
      opponentKnownWinningReplies,
      exposesOwnKingToKnownWinningReply,
      actorAbilityStrategicScore: abilityStrategicScore(actor?.displayName),
      targetAbilityStrategicScore: target
        ? (target.revealed ? abilityStrategicScore(target.displayName) : null)
        : null,
      targetKnownATK: target?.revealed ? target.ATK : null,
      targetKnownDEF: target?.revealed ? target.DEF : null,
    };
  });
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
