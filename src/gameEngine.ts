/**
 * PHASE 2: GAME ENGINE MODULE
 * 
 * Core action executors, battle system, and event order resolver.
 * Implements Move Forward, Attack Forward, Self-Defend.
 * All state updates are immutable.
 */

import { getForwardSpace, getBackwardSpace, getTerritory } from './board';
import {
  type GameState,
  type Character,
  type BoardSpace,
  type Controller,
  type GameStatus,
  getCharacter,
  getCharacterAtPosition,
  isPositionEmpty,
  getCharactersByController,
  getSpaceTerritory,
  isKingAlive,
  getKing,
  shouldTriggerFinalKingDuel,
  checkAndResolveFinalKingDuel,
  updateCharacter,
  addToGraveyard,
  logEvent,
  validateBoardStateInvariants,
  countLivingCharacters,
} from './gameState';

/**
 * VALIDATION: Check if a Move Forward action is legal.
 */
export function canMoveForward(state: GameState, characterId: string): boolean {
  if (state.gameStatus !== 'active') {
    return false;
  }

  const character = getCharacter(state, characterId);
  if (!character || !character.alive) {
    return false;
  }

  if (character.controller !== state.activePlayer) {
    return false;
  }

  const forwardSpace = getForwardSpace(character.boardPosition!);
  return isPositionEmpty(state, forwardSpace);
}

/**
 * VALIDATION: Check if an Attack Forward action is legal.
 */
export function canAttackForward(state: GameState, characterId: string): boolean {
  if (state.gameStatus !== 'active') {
    return false;
  }

  const character = getCharacter(state, characterId);
  if (!character || !character.alive) {
    return false;
  }

  if (character.controller !== state.activePlayer) {
    return false;
  }

  const forwardSpace = getForwardSpace(character.boardPosition!);
  const defender = getCharacterAtPosition(state, forwardSpace);

  return defender !== undefined && defender.alive && defender.controller !== character.controller;
}

/**
 * VALIDATION: Check if a Self-Defend action is legal.
 */
export function canSelfDefend(state: GameState, characterId: string): boolean {
  if (state.gameStatus !== 'active') {
    return false;
  }

  const character = getCharacter(state, characterId);
  if (!character || !character.alive) {
    return false;
  }

  if (character.controller !== state.activePlayer) {
    return false;
  }

  const backwardSpace = getBackwardSpace(character.boardPosition!);
  const enemy = getCharacterAtPosition(state, backwardSpace);

  return enemy !== undefined && enemy.alive && enemy.controller !== character.controller;
}

/**
 * Get all legal actions available to the active player.
 */
export function getLegalActions(state: GameState): Array<{ type: string; characterId: string }> {
  if (state.gameStatus !== 'active') {
    return [];
  }

  const activeChars = getCharactersByController(state, state.activePlayer);
  const actions: Array<{ type: string; characterId: string }> = [];

  for (const char of activeChars) {
    if (canMoveForward(state, char.id)) {
      actions.push({ type: 'move', characterId: char.id });
    }
    if (canAttackForward(state, char.id)) {
      actions.push({ type: 'attack', characterId: char.id });
    }
    if (canSelfDefend(state, char.id)) {
      actions.push({ type: 'defend', characterId: char.id });
    }
  }

  return actions;
}

/**
 * Determine if the active player has any legal action.
 */
export function hasLegalAction(state: GameState): boolean {
  return getLegalActions(state).length > 0;
}

/**
 * BATTLE: Resolve a stat comparison and determine winner/loser(s).
 * Used by both Attack Forward and Self-Defend.
 */
interface BattleOutcome {
  winnerId: string;
  loserId: string;
  doubleLoss: boolean; // true if both characters die
  isDoubleLoss: boolean;
  isDraw: boolean;
}

export function resolveBattle(
  attacker: Character,
  defender: Character,
  attackerStat: number,
  defenderStat: number,
): BattleOutcome {
  const isDraw = attackerStat === defenderStat;

  if (!isDraw) {
    // Clear winner
    if (attackerStat > defenderStat) {
      return {
        winnerId: attacker.id,
        loserId: defender.id,
        doubleLoss: false,
        isDoubleLoss: false,
        isDraw: false,
      };
    } else {
      return {
        winnerId: defender.id,
        loserId: attacker.id,
        doubleLoss: false,
        isDoubleLoss: false,
        isDraw: false,
      };
    }
  }

  // Tie resolution
  const attackerIsKing = attacker.isKing;
  const defenderIsKing = defender.isKing;
  const bothKings = attackerIsKing && defenderIsKing;
  const oneKing = attackerIsKing !== defenderIsKing;

  if (bothKings) {
    // Both Kings die in tie
    return {
      winnerId: attacker.id, // Attacker dies first in order
      loserId: defender.id,
      doubleLoss: true,
      isDoubleLoss: true,
      isDraw: true,
    };
  }

  if (oneKing) {
    // King wins the tie
    const kingId = attackerIsKing ? attacker.id : defender.id;
    const nonKingId = attackerIsKing ? defender.id : attacker.id;
    return {
      winnerId: kingId,
      loserId: nonKingId,
      doubleLoss: false,
      isDoubleLoss: false,
      isDraw: true,
    };
  }

  // Neither is a King; both die
  return {
    winnerId: attacker.id, // Attacker dies first in order
    loserId: defender.id,
    doubleLoss: true,
    isDoubleLoss: true,
    isDraw: true,
  };
}

/**
 * EXECUTION: Move Forward action.
 * Returns new game state after move, including King Territory Draw check.
 */
export function executeMoveForward(state: GameState, characterId: string): GameState {
  if (!canMoveForward(state, characterId)) {
    throw new Error(`Cannot execute Move Forward: action invalid for character ${characterId}`);
  }

  const character = getCharacter(state, characterId)!;
  const forwardSpace = getForwardSpace(character.boardPosition!);

  // Update character position
  const updatedChar = updateCharacter(character, {
    boardPosition: forwardSpace,
  });

  // Create new characters array
  const newCharacters = state.characters.map(ch => (ch.id === characterId ? updatedChar : ch));

  let newState: GameState = {
    ...state,
    characters: newCharacters,
  };

  // Check King Territory Draw
  if (character.isKing) {
    const originTerritory = getSpaceTerritory(character.boardPosition!);
    const destTerritory = getSpaceTerritory(forwardSpace);

    if (originTerritory !== destTerritory) {
      // King crossed territory boundary
      newState = {
        ...newState,
        drawCount: {
          ...newState.drawCount,
          [character.controller]: newState.drawCount[character.controller] + 1,
        },
      };

      newState = logEvent(newState, 'King Territory Draw', {
        characterId: character.id,
        fromSpace: character.boardPosition,
        toSpace: forwardSpace,
        newDrawCount: newState.drawCount[character.controller],
      });
    }
  }

  newState = logEvent(newState, 'Move Forward', {
    characterId: character.id,
    fromSpace: character.boardPosition,
    toSpace: forwardSpace,
  });

  validateBoardStateInvariants(newState);
  return endTurn(newState);
}

/**
 * EXECUTION: Attack Forward action.
 * Follows full 9-step event order.
 */
export function executeAttackForward(state: GameState, characterId: string): GameState {
  if (!canAttackForward(state, characterId)) {
    throw new Error(
      `Cannot execute Attack Forward: action invalid for character ${characterId}`,
    );
  }

  const attacker = getCharacter(state, characterId)!;
  const forwardSpace = getForwardSpace(attacker.boardPosition!);
  const defender = getCharacterAtPosition(state, forwardSpace)!;

  // Step 2: Reveal both
  let newState: GameState = {
    ...state,
    characters: state.characters.map(ch => {
      if (ch.id === attacker.id || ch.id === defender.id) {
        return updateCharacter(ch, { revealed: true });
      }
      return ch;
    }),
  };

  newState = logEvent(newState, 'Reveal Battle Participants', {
    attackerId: attacker.id,
    defenderId: defender.id,
  });

  // Step 3: Resolve battle
  const outcome = resolveBattle(attacker, defender, attacker.ATK, defender.DEF);

  // Determine who dies
  const winnerId = outcome.winnerId;
  const loserId = outcome.loserId;
  const bothDie = outcome.doubleLoss;

  // Step 4 & 5: Move winning attacker + King Territory Draw
  let charAfterBattle = getCharacter(newState, attacker.id)!;

  if (winnerId === attacker.id) {
    // Attacker wins: move to defender's space
    charAfterBattle = updateCharacter(charAfterBattle, {
      boardPosition: forwardSpace,
    });

    newState = {
      ...newState,
      characters: newState.characters.map(ch =>
        ch.id === attacker.id ? charAfterBattle : ch,
      ),
    };

    // Check King Territory Draw for winning attacker
    if (attacker.isKing) {
      const originTerritory = getSpaceTerritory(attacker.boardPosition!);
      const destTerritory = getSpaceTerritory(forwardSpace);

      if (originTerritory !== destTerritory) {
        newState = {
          ...newState,
          drawCount: {
            ...newState.drawCount,
            [attacker.controller]: newState.drawCount[attacker.controller] + 1,
          },
        };

        newState = logEvent(newState, 'King Territory Draw', {
          characterId: attacker.id,
          reason: 'Attack Forward Win',
          newDrawCount: newState.drawCount[attacker.controller],
        });
      }
    }
  }

  // Step 6: Send defeated to Graveyard
  // If attacker won, defender dies
  // If defender won or tie, attacker dies
  // If both die (double loss), attacker first, then defender
  const toDefeatInOrder: string[] = bothDie ? [attacker.id, defender.id] : [loserId];

  for (const defeatId of toDefeatInOrder) {
    const defeated = getCharacter(newState, defeatId)!;
    newState = {
      ...newState,
      characters: newState.characters.map(ch =>
        ch.id === defeatId ? updateCharacter(ch, { alive: false, boardPosition: null }) : ch,
      ),
    };
    newState = addToGraveyard(newState, defeated);
  }

  newState = logEvent(newState, 'Attack Forward Outcome', {
    winnerId,
    loserId,
    bothDied: bothDie,
  });

  validateBoardStateInvariants(newState);

  // Step 7: Check King Death or Double-King Tie
  if (bothDie && attacker.isKing && defender.isKing) {
    // Double-King Tie: game ends immediately as draw
    newState = {
      ...newState,
      gameStatus: 'draw',
    };
    newState = logEvent(newState, 'Double-King Tie', {
      attacker: attacker.id,
      defender: defender.id,
      outcome: 'draw',
    });
    return newState; // END immediately, no step 8 or 9
  }

  // Check if a King died
  const defeated = toDefeatInOrder[0];
  const defeatedChar = state.characters.find(ch => ch.id === defeated)!;
  if (defeatedChar.isKing) {
    const winnerController = defeatedChar.controller === 'Y' ? 'A' : 'Y';
    const newStatus: GameStatus = winnerController === 'Y' ? 'Y wins' : 'A wins';
    newState = {
      ...newState,
      gameStatus: newStatus,
    };
    newState = logEvent(newState, 'King Death', {
      defeatedKingId: defeated,
      winner: winnerController,
    });
    return newState; // END, no step 8 or 9
  }

  validateBoardStateInvariants(newState);

  // Step 8: Check Final King Duel
  newState = checkAndResolveFinalKingDuel(newState);
  if (newState.gameStatus !== 'active') {
    return newState; // Game ended by duel, no turn switch
  }

  validateBoardStateInvariants(newState);

  // Step 9: End turn
  return endTurn(newState);
}

/**
 * EXECUTION: Self-Defend action.
 * Follows full 9-step event order (steps 5-6 are N/A).
 */
export function executeSelfDefend(state: GameState, characterId: string): GameState {
  if (!canSelfDefend(state, characterId)) {
    throw new Error(
      `Cannot execute Self-Defend: action invalid for character ${characterId}`,
    );
  }

  const selfDefender = getCharacter(state, characterId)!;
  const backwardSpace = getBackwardSpace(selfDefender.boardPosition!);
  const enemy = getCharacterAtPosition(state, backwardSpace)!;

  // Step 2: Reveal both
  let newState: GameState = {
    ...state,
    characters: state.characters.map(ch => {
      if (ch.id === selfDefender.id || ch.id === enemy.id) {
        return updateCharacter(ch, { revealed: true });
      }
      return ch;
    }),
  };

  newState = logEvent(newState, 'Reveal Battle Participants', {
    selfDefenderId: selfDefender.id,
    enemyId: enemy.id,
  });

  // Step 3: Resolve battle (DEF vs DEF, no movement)
  const outcome = resolveBattle(selfDefender, enemy, selfDefender.DEF, enemy.DEF);

  const winnerId = outcome.winnerId;
  const loserId = outcome.loserId;
  const bothDie = outcome.doubleLoss;

  // Steps 4-5: NO movement, NO King Territory Draw

  // Step 6: Send defeated to Graveyard
  const toDefeatInOrder: string[] = bothDie ? [selfDefender.id, enemy.id] : [loserId];

  for (const defeatId of toDefeatInOrder) {
    const defeated = getCharacter(newState, defeatId)!;
    newState = {
      ...newState,
      characters: newState.characters.map(ch =>
        ch.id === defeatId ? updateCharacter(ch, { alive: false, boardPosition: null }) : ch,
      ),
    };
    newState = addToGraveyard(newState, defeated);
  }

  newState = logEvent(newState, 'Self-Defend Outcome', {
    winnerId,
    loserId,
    bothDied: bothDie,
  });

  validateBoardStateInvariants(newState);

  // Step 7: Check King Death or Double-King Tie
  if (bothDie && selfDefender.isKing && enemy.isKing) {
    // Double-King Tie: game ends immediately as draw
    newState = {
      ...newState,
      gameStatus: 'draw',
    };
    newState = logEvent(newState, 'Double-King Tie', {
      selfDefender: selfDefender.id,
      enemy: enemy.id,
      outcome: 'draw',
    });
    return newState; // END immediately, no step 8 or 9
  }

  // Check if a King died
  const defeated = toDefeatInOrder[0];
  const defeatedChar = state.characters.find(ch => ch.id === defeated)!;
  if (defeatedChar.isKing) {
    const winnerController = defeatedChar.controller === 'Y' ? 'A' : 'Y';
    const newStatus: GameStatus = winnerController === 'Y' ? 'Y wins' : 'A wins';
    newState = {
      ...newState,
      gameStatus: newStatus,
    };
    newState = logEvent(newState, 'King Death', {
      defeatedKingId: defeated,
      winner: winnerController,
    });
    return newState; // END, no step 8 or 9
  }

  validateBoardStateInvariants(newState);

  // Step 8: Check Final King Duel
  newState = checkAndResolveFinalKingDuel(newState);
  if (newState.gameStatus !== 'active') {
    return newState; // Game ended by duel, no turn switch
  }

  validateBoardStateInvariants(newState);

  // Step 9: End turn
  return endTurn(newState);
}

/**
 * Skip turn if no legal action available.
 */
export function skipTurn(state: GameState): GameState {
  if (state.gameStatus !== 'active') {
    throw new Error('Cannot skip turn: game is not active');
  }

  const player = state.activePlayer;

  let newState = logEvent(state, 'Turn Skipped', {
    player,
    reason: 'No legal core action available',
  });

  return endTurn(newState);
}

/**
 * End turn: increment turn counter and switch active player.
 */
function endTurn(state: GameState): GameState {
  if (state.gameStatus !== 'active') {
    return state; // Game already ended, no turn switch
  }

  const nextPlayer: Controller = state.activePlayer === 'Y' ? 'A' : 'Y';
  const nextTurn = state.turnNumber + 1;

  let newState: GameState = {
    ...state,
    activePlayer: nextPlayer,
    turnNumber: nextTurn,
  };

  newState = logEvent(newState, 'Turn End', {
    nextActivePlayer: nextPlayer,
    nextTurnNumber: nextTurn,
  });

  return newState;
}
