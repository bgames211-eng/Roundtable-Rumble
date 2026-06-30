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
  updateCharacter,
  addToGraveyard,
  logEvent,
  validateBoardStateInvariants,
  countLivingCharacters,
  getPowerCardHandCounts,
} from './gameState';
import { shufflePowerCardInstances } from './powerCards';

function normalizeName(name: string | undefined): string {
  return (name ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function isMrFreeze(name: string | undefined): boolean {
  return normalizeName(name) === 'MRFREEZE';
}

function isRoomba(name: string | undefined): boolean {
  return normalizeName(name) === 'ROOMBA';
}

function isAnt(name: string | undefined): boolean {
  return normalizeName(name) === 'ANT';
}

function isSpongeBob(name: string | undefined): boolean {
  return normalizeName(name) === 'SPONGEBOB';
}

function isMrsPuff(name: string | undefined): boolean {
  return normalizeName(name) === 'MRSPUFF';
}

function isNightcrawler(name: string | undefined): boolean {
  return normalizeName(name) === 'NIGHTCRAWLER';
}

function isRapunzel(name: string | undefined): boolean {
  return normalizeName(name) === 'RAPUNZEL';
}

function isCarlGrimes(name: string | undefined): boolean {
  return normalizeName(name) === 'CARLGRIMES';
}

function isRickGrimes(name: string | undefined): boolean {
  return normalizeName(name) === 'RICKGRIMES';
}

function isMrsPuffCharacter(name: string | undefined): boolean {
  return normalizeName(name) === 'MRSPUFF';
}

function hasLivingRevealedRick(state: GameState): boolean {
  const hasLivingRevealedRick = state.characters.some(character => (
    character.alive
    && character.revealed
    && isRickGrimes(character.displayName)
  ));
  return hasLivingRevealedRick;
}

function hasRevealedCarl(state: GameState): boolean {
  return state.characters.some(character => (
    character.revealed
    && isCarlGrimes(character.displayName)
  ));
}

function getEffectiveCoreStat(state: GameState, character: Character, stat: 'ATK' | 'DEF'): number {
  let value = character[stat];

  if (
    (isCarlGrimes(character.displayName) || isRickGrimes(character.displayName))
    && hasLivingRevealedRick(state)
    && hasRevealedCarl(state)
  ) {
    value += 2;
  }

  return value;
}

function drawTopPowerCardForController(
  state: GameState,
  controller: Controller,
  action: string,
  logDetails: Record<string, unknown>,
): GameState {
  let workingState = state;
  if (workingState.powerCardDeck.length === 0 && workingState.sessionUsedPowerCardPile.length > 0) {
    const replenishedDeck = shufflePowerCardInstances(workingState.sessionUsedPowerCardPile, Math.random);
    workingState = {
      ...workingState,
      powerCardDeck: replenishedDeck,
      sessionUsedPowerCardPile: [],
      sessionRunoutOccurred: true,
    };
  }

  if (workingState.powerCardDeck.length === 0) {
    return logEvent(state, `${action} - No Power Cards Remaining`, {
      ...logDetails,
      controller,
      remainingPowerCardDeckCount: 0,
    });
  }

  const drawnCard = workingState.powerCardDeck[0];
  const remainingDeck = workingState.powerCardDeck.slice(1);
  const nextHand = [...workingState.powerCardHands[controller], drawnCard];
  const next: GameState = {
    ...workingState,
    powerCardDeck: remainingDeck,
    powerCardHands: {
      ...workingState.powerCardHands,
      [controller]: nextHand,
    },
    drawCount: {
      ...workingState.drawCount,
      [controller]: workingState.drawCount[controller] + 1,
    },
  };

  return logEvent(next, action, {
    ...logDetails,
    controller,
    drawnPowerCardAuditInstanceId: drawnCard.instanceId,
    remainingPowerCardDeckCount: remainingDeck.length,
  });
}

function resolveRoombaMoveDraws(
  state: GameState,
  movedCharacters: Array<{ characterId: string; fromSpace: BoardSpace; toSpace: BoardSpace }>,
): GameState {
  let next = state;
  for (const moved of movedCharacters) {
    const character = getCharacter(next, moved.characterId);
    if (!character || !character.alive || !character.revealed || !isRoomba(character.displayName) || moved.fromSpace === moved.toSpace) {
      continue;
    }

    next = drawTopPowerCardForController(next, character.controller, 'Roomba Move Draw', {
      characterId: character.id,
      fromSpace: moved.fromSpace,
      toSpace: moved.toSpace,
    });
  }
  return next;
}

function resolveAntBattleWinDraw(state: GameState, winnerId: string): GameState {
  const winner = getCharacter(state, winnerId);
  if (!winner || !winner.alive || !isAnt(winner.displayName)) {
    return state;
  }

  let next = drawTopPowerCardForController(state, winner.controller, 'Ant Victory Draw', {
    characterId: winner.id,
    drawNumber: 1,
  });
  next = drawTopPowerCardForController(next, winner.controller, 'Ant Victory Draw', {
    characterId: winner.id,
    drawNumber: 2,
  });
  return next;
}

function getUnusedFreezeGunAttachmentIndex(character: Character): number {
  const attachments = character.attachments ?? [];
  return attachments.findIndex(
    attachment => attachment.definitionId === 'power-alpha-014' && !attachment.specialUsed,
  );
}

function resolveKingTerritoryDraw(
  state: GameState,
  controller: Controller,
  logDetails: Record<string, unknown>,
): GameState {
  let workingState = state;
  if (workingState.powerCardDeck.length === 0 && workingState.sessionUsedPowerCardPile.length > 0) {
    const replenishedDeck = shufflePowerCardInstances(workingState.sessionUsedPowerCardPile, Math.random);
    workingState = {
      ...workingState,
      powerCardDeck: replenishedDeck,
      sessionUsedPowerCardPile: [],
      sessionRunoutOccurred: true,
    };
  }

  if (workingState.powerCardDeck.length === 0) {
    return logEvent(state, 'King Territory Draw - No Power Cards Remaining', {
      ...logDetails,
      controller,
      remainingPowerCardDeckCount: 0,
    });
  }

  const drawnCard = workingState.powerCardDeck[0];
  const remainingPowerCardDeck = workingState.powerCardDeck.slice(1);
  const nextHand = [...workingState.powerCardHands[controller], drawnCard];

  let newState: GameState = {
    ...workingState,
    powerCardDeck: remainingPowerCardDeck,
    powerCardHands: {
      ...workingState.powerCardHands,
      [controller]: nextHand,
    },
    drawCount: {
      ...workingState.drawCount,
      [controller]: workingState.drawCount[controller] + 1,
    },
  };

  const handCounts = getPowerCardHandCounts(newState);

  newState = logEvent(newState, 'King Territory Draw', {
    ...logDetails,
    controller,
    drawnPowerCardAuditInstanceId: drawnCard.instanceId,
    remainingPowerCardDeckCount: newState.powerCardDeck.length,
    newDrawCount: newState.drawCount[controller],
    newPowerCardHandCount: handCounts[controller],
  });

  return newState;
}

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

  if (character.isFrozen) {
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

  if (character.isFrozen) {
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

  if (character.isFrozen) {
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
  if (isSpongeBob(attacker.displayName) && isMrsPuff(defender.displayName)) {
    return {
      winnerId: attacker.id,
      loserId: defender.id,
      doubleLoss: false,
      isDoubleLoss: false,
      isDraw: false,
    };
  }

  if (isSpongeBob(defender.displayName) && isMrsPuff(attacker.displayName)) {
    return {
      winnerId: defender.id,
      loserId: attacker.id,
      doubleLoss: false,
      isDoubleLoss: false,
      isDraw: false,
    };
  }

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

  newState = resolveRoombaMoveDraws(newState, [{
    characterId,
    fromSpace: character.boardPosition!,
    toSpace: forwardSpace,
  }]);

  // Check King Territory Draw
  if (character.isKing) {
    const originTerritory = getSpaceTerritory(character.boardPosition!);
    const destTerritory = getSpaceTerritory(forwardSpace);

    if (originTerritory !== destTerritory) {
      newState = resolveKingTerritoryDraw(newState, character.controller, {
        characterId: character.id,
        fromSpace: character.boardPosition,
        toSpace: forwardSpace,
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
  const outcome = resolveBattle(
    attacker,
    defender,
    getEffectiveCoreStat(state, attacker, 'ATK'),
    getEffectiveCoreStat(state, defender, 'DEF'),
  );

  // Determine who dies
  const winnerId = outcome.winnerId;
  const loserId = outcome.loserId;
  const bothDie = outcome.doubleLoss;

  // Step 4 & 5: Move winning attacker + King Territory Draw
  let charAfterBattle = getCharacter(newState, attacker.id)!;

  if (winnerId === attacker.id && !bothDie) {
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
        newState = resolveKingTerritoryDraw(newState, attacker.controller, {
          characterId: attacker.id,
          reason: 'Attack Forward Win',
        });
      }
    }

    newState = resolveRoombaMoveDraws(newState, [{
      characterId: attacker.id,
      fromSpace: attacker.boardPosition!,
      toSpace: forwardSpace,
    }]);
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

  if (!bothDie) {
    newState = resolveAntBattleWinDraw(newState, winnerId);
  }

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
    const winnerController = defeatedChar.controller === 'P1' ? 'P2' : 'P1';
    const newStatus: GameStatus = winnerController === 'P1' ? 'P1 wins' : 'P2 wins';
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

  // Step 8: End turn
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
  const outcome = resolveBattle(
    selfDefender,
    enemy,
    getEffectiveCoreStat(state, selfDefender, 'DEF'),
    getEffectiveCoreStat(state, enemy, 'DEF'),
  );

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

  if (!bothDie) {
    newState = resolveAntBattleWinDraw(newState, winnerId);
  }

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
    const winnerController = defeatedChar.controller === 'P1' ? 'P2' : 'P1';
    const newStatus: GameStatus = winnerController === 'P1' ? 'P1 wins' : 'P2 wins';
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

  // Step 8: End turn
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

export function getBackItUpDestinations(state: GameState, characterId: string): BoardSpace[] {
  const character = getCharacter(state, characterId);
  if (!character || !character.alive || !character.boardPosition) {
    return [];
  }

  const destinations: BoardSpace[] = [];
  let cursor = getBackwardSpace(character.boardPosition);

  while (cursor !== character.boardPosition) {
    if (!isPositionEmpty(state, cursor)) {
      break;
    }
    destinations.push(cursor);
    cursor = getBackwardSpace(cursor);
  }

  return destinations;
}

export function getNightcrawlerTeleportDestinations(state: GameState, characterId: string): BoardSpace[] {
  const character = getCharacter(state, characterId);
  if (!character || !character.alive || !character.boardPosition || !isNightcrawler(character.displayName)) {
    return [];
  }

  const destinations = new Set<BoardSpace>();
  let forwardCursor = character.boardPosition;
  let backwardCursor = character.boardPosition;

  for (let i = 0; i < 3; i += 1) {
    forwardCursor = getForwardSpace(forwardCursor);
    backwardCursor = getBackwardSpace(backwardCursor);
    if (isPositionEmpty(state, forwardCursor)) {
      destinations.add(forwardCursor);
    }
    if (isPositionEmpty(state, backwardCursor)) {
      destinations.add(backwardCursor);
    }
  }

  return [...destinations];
}

export function executeNightcrawlerTeleportMove(
  state: GameState,
  actingPlayer: Controller,
  characterId: string,
  destination: BoardSpace,
): GameState {
  if (state.gameStatus !== 'active') {
    throw new Error('Cannot execute NIGHTCRAWLER teleport: game is not active');
  }

  if (actingPlayer !== state.activePlayer) {
    throw new Error('Cannot execute NIGHTCRAWLER teleport: acting player is not active');
  }

  const character = getCharacter(state, characterId);
  if (!character || !character.alive || !character.boardPosition || !isNightcrawler(character.displayName)) {
    throw new Error('Cannot execute NIGHTCRAWLER teleport: selected character is invalid');
  }

  if (character.controller !== actingPlayer) {
    throw new Error('Cannot execute NIGHTCRAWLER teleport: selected character is not yours');
  }

  if (character.isFrozen) {
    throw new Error('Cannot execute NIGHTCRAWLER teleport: character is frozen');
  }

  const legalDestinations = getNightcrawlerTeleportDestinations(state, characterId);
  if (!legalDestinations.includes(destination)) {
    throw new Error('Cannot execute NIGHTCRAWLER teleport: destination is not legal');
  }

  const fromSpace = character.boardPosition;
  let next: GameState = {
    ...state,
    characters: state.characters.map(entry => (
      entry.id === characterId
        ? updateCharacter(entry, { boardPosition: destination })
        : entry
    )),
  };

  next = resolveRoombaMoveDraws(next, [{
    characterId,
    fromSpace,
    toSpace: destination,
  }]);

  const crossed = character.isKing
    && getSpaceTerritory(fromSpace) !== getSpaceTerritory(destination);

  if (crossed) {
    next = resolveKingTerritoryDraw(next, character.controller, {
      reason: 'NIGHTCRAWLER TELEPORT',
      characterId,
      fromSpace,
      toSpace: destination,
    });
  }

  next = logEvent(next, 'Nightcrawler Teleport', {
    actingPlayer,
    characterId,
    fromSpace,
    toSpace: destination,
  });

  validateBoardStateInvariants(next);
  return endTurn(next);
}

export function executePortalMove(
  state: GameState,
  actingPlayer: Controller,
  characterId: string,
  destination: BoardSpace,
  options?: { preserveTurn?: boolean },
): GameState {
  if (state.gameStatus !== 'active') {
    throw new Error('Cannot execute PORTAL: game is not active');
  }

  const character = getCharacter(state, characterId);
  if (!character || !character.alive || !character.boardPosition) {
    throw new Error('Cannot execute PORTAL: selected character is invalid');
  }

  if (actingPlayer !== state.activePlayer) {
    throw new Error('Cannot execute PORTAL: acting player is not active');
  }

  if (character.controller !== actingPlayer) {
    throw new Error('Cannot execute PORTAL: must target your own character');
  }

  if (!isPositionEmpty(state, destination)) {
    throw new Error('Cannot execute PORTAL: destination is occupied');
  }

  const fromSpace = character.boardPosition;
  let next: GameState = {
    ...state,
    characters: state.characters.map(entry => (
      entry.id === characterId
        ? updateCharacter(entry, { boardPosition: destination })
        : entry
    )),
  };

  next = resolveRoombaMoveDraws(next, [{
    characterId,
    fromSpace,
    toSpace: destination,
  }]);

  const crossed = character.isKing
    && getSpaceTerritory(fromSpace) !== getSpaceTerritory(destination);

  if (crossed) {
    next = resolveKingTerritoryDraw(next, character.controller, {
      reason: 'PORTAL',
      characterId,
      fromSpace,
      toSpace: destination,
    });
  }

  next = logEvent(next, 'PORTAL Move', {
    actingPlayer,
    characterId,
    fromSpace,
    toSpace: destination,
  });

  validateBoardStateInvariants(next);
  return options?.preserveTurn ? next : endTurn(next);
}

export function executeBackItUpMove(
  state: GameState,
  actingPlayer: Controller,
  characterId: string,
  destination: BoardSpace,
  options?: { preserveTurn?: boolean },
): GameState {
  if (state.gameStatus !== 'active') {
    throw new Error('Cannot execute BACK IT UP: game is not active');
  }

  if (actingPlayer !== state.activePlayer) {
    throw new Error('Cannot execute BACK IT UP: acting player is not active');
  }

  const character = getCharacter(state, characterId);
  if (!character || !character.alive || !character.boardPosition) {
    throw new Error('Cannot execute BACK IT UP: selected character is invalid');
  }

  const legalDestinations = getBackItUpDestinations(state, characterId);
  if (!legalDestinations.includes(destination)) {
    throw new Error('Cannot execute BACK IT UP: destination is not legal');
  }

  const fromSpace = character.boardPosition;
  let next: GameState = {
    ...state,
    characters: state.characters.map(entry => (
      entry.id === characterId
        ? updateCharacter(entry, { boardPosition: destination })
        : entry
    )),
  };

  next = resolveRoombaMoveDraws(next, [{
    characterId,
    fromSpace,
    toSpace: destination,
  }]);

  const crossed = character.isKing
    && getSpaceTerritory(fromSpace) !== getSpaceTerritory(destination);

  if (crossed) {
    next = resolveKingTerritoryDraw(next, character.controller, {
      reason: 'BACK IT UP',
      characterId,
      fromSpace,
      toSpace: destination,
    });
  }

  next = logEvent(next, 'Back It Up Move', {
    actingPlayer,
    characterId,
    fromSpace,
    toSpace: destination,
  });

  validateBoardStateInvariants(next);
  return options?.preserveTurn ? next : endTurn(next);
}

export function executeSwapCharactersMove(
  state: GameState,
  actingPlayer: Controller,
  ownCharacterId: string,
  opponentCharacterId: string,
  options?: { allowDuringBattle?: boolean; allowOutOfTurn?: boolean },
): GameState {
  if (state.gameStatus !== 'active') {
    throw new Error('Cannot execute SWAP CHARACTERS: game is not active');
  }

  if (state.pendingBattle && !options?.allowDuringBattle) {
    throw new Error('Cannot execute SWAP CHARACTERS: battle is currently active');
  }

  if (actingPlayer !== state.activePlayer && !options?.allowOutOfTurn) {
    throw new Error('Cannot execute SWAP CHARACTERS: acting player is not active');
  }

  if (ownCharacterId === opponentCharacterId) {
    throw new Error('Cannot execute SWAP CHARACTERS: must choose two different characters');
  }

  const ownCharacter = getCharacter(state, ownCharacterId);
  const opponentCharacter = getCharacter(state, opponentCharacterId);

  if (!ownCharacter || !ownCharacter.alive || !ownCharacter.boardPosition) {
    throw new Error('Cannot execute SWAP CHARACTERS: own selected character is invalid');
  }

  if (!opponentCharacter || !opponentCharacter.alive || !opponentCharacter.boardPosition) {
    throw new Error('Cannot execute SWAP CHARACTERS: opponent selected character is invalid');
  }

  if (ownCharacter.controller !== actingPlayer) {
    throw new Error('Cannot execute SWAP CHARACTERS: first selected character must be yours');
  }

  if (opponentCharacter.controller === actingPlayer) {
    throw new Error('Cannot execute SWAP CHARACTERS: second selected character must be opponent');
  }

  const ownFrom = ownCharacter.boardPosition;
  const opponentFrom = opponentCharacter.boardPosition;
  const ownWasKing = ownCharacter.isKing;
  const opponentWasKing = opponentCharacter.isKing;

  let next: GameState = {
    ...state,
    characters: state.characters.map(character => {
      if (character.id === ownCharacterId) {
        return updateCharacter(character, {
          boardPosition: opponentFrom,
          controller: opponentCharacter.controller,
        });
      }
      if (character.id === opponentCharacterId) {
        return updateCharacter(character, {
          boardPosition: ownFrom,
          controller: ownCharacter.controller,
        });
      }
      return character;
    }),
  };

  // King status transfers by swap participants, not by the board spaces they land on.
  next = {
    ...next,
    characters: next.characters.map(character => ({
      ...character,
      isKing: character.id === ownCharacterId
        ? opponentWasKing
        : character.id === opponentCharacterId
          ? ownWasKing
          : character.isKing,
    })),
  };

  next = logEvent(next, 'Swap Characters Move', {
    actingPlayer,
    ownCharacterId,
    opponentCharacterId,
    ownFrom,
    ownTo: opponentFrom,
    opponentFrom,
    opponentTo: ownFrom,
    switchedTeams: true,
    generatedDraws: false,
  });

  validateBoardStateInvariants(next);
  return next;
}

export function canUseRapunzelSpecial(state: GameState, characterId: string): boolean {
  const character = getCharacter(state, characterId);
  if (!character || !character.alive || !character.revealed || !character.boardPosition || character.controller !== state.activePlayer || character.abilityUsed || !isRapunzel(character.displayName)) {
    return false;
  }

  const frontSpace = getForwardSpace(character.boardPosition);
  if (!isPositionEmpty(state, frontSpace)) {
    return false;
  }

  let cursor = getBackwardSpace(character.boardPosition);
  while (cursor !== character.boardPosition) {
    const found = getCharacterAtPosition(state, cursor);
    if (found && found.alive) {
      return true;
    }
    cursor = getBackwardSpace(cursor);
  }

  return false;
}

export function executeRapunzelSpecial(state: GameState, characterId: string): GameState {
  if (!canUseRapunzelSpecial(state, characterId)) {
    throw new Error('Cannot execute Rapunzel special');
  }

  const rapunzel = getCharacter(state, characterId)!;
  const frontSpace = getForwardSpace(rapunzel.boardPosition!);
  let target = getCharacterAtPosition(state, getBackwardSpace(rapunzel.boardPosition!));
  let cursor = getBackwardSpace(rapunzel.boardPosition!);
  while ((!target || !target.alive) && cursor !== rapunzel.boardPosition) {
    cursor = getBackwardSpace(cursor);
    target = getCharacterAtPosition(state, cursor);
    if (target?.alive) {
      break;
    }
  }

  if (!target || !target.alive || !target.boardPosition) {
    throw new Error('Cannot execute Rapunzel special: no target behind');
  }

  const fromSpace = target.boardPosition;
  let next: GameState = {
    ...state,
    characters: state.characters.map(character => {
      if (character.id === rapunzel.id) {
        return { ...character, abilityUsed: true };
      }
      if (character.id === target.id) {
        return { ...character, boardPosition: frontSpace };
      }
      return character;
    }),
  };

  if (
    target.isKing
    && getSpaceTerritory(fromSpace) !== getSpaceTerritory(frontSpace)
  ) {
    next = resolveKingTerritoryDraw(next, target.controller, {
      reason: 'RAPUNZEL SPECIAL',
      characterId: target.id,
      fromSpace,
      toSpace: frontSpace,
      rapunzelCharacterId: rapunzel.id,
    });
  }

  next = resolveRoombaMoveDraws(next, [{
    characterId: target.id,
    fromSpace,
    toSpace: frontSpace,
  }]);

  next = logEvent(next, 'Rapunzel Special', {
    characterId: rapunzel.id,
    movedCharacterId: target.id,
    fromSpace,
    toSpace: frontSpace,
  });

  validateBoardStateInvariants(next);
  return next;
}

export function canUseMrsPuffSpecial(state: GameState, characterId: string): boolean {
  const character = getCharacter(state, characterId);
  return !!character
    && character.alive
    && character.revealed
    && !!character.boardPosition
    && character.controller === state.activePlayer
    && !character.abilityUsed
    && isMrsPuffCharacter(character.displayName);
}

function findNextOpenSpaceForward(state: GameState, start: BoardSpace): BoardSpace | null {
  let cursor = getForwardSpace(start);
  while (cursor !== start) {
    if (isPositionEmpty(state, cursor)) {
      return cursor;
    }
    cursor = getForwardSpace(cursor);
  }
  return null;
}

function findNextOpenSpaceBackward(state: GameState, start: BoardSpace): BoardSpace | null {
  let cursor = getBackwardSpace(start);
  while (cursor !== start) {
    if (isPositionEmpty(state, cursor)) {
      return cursor;
    }
    cursor = getBackwardSpace(cursor);
  }
  return null;
}

export function executeMrsPuffSpecial(state: GameState, characterId: string): GameState {
  if (!canUseMrsPuffSpecial(state, characterId)) {
    throw new Error('Cannot execute Mrs. Puff special');
  }

  const puff = getCharacter(state, characterId)!;
  const front = getCharacterAtPosition(state, getForwardSpace(puff.boardPosition!));
  const behind = getCharacterAtPosition(state, getBackwardSpace(puff.boardPosition!));
  const frontDestination = front?.boardPosition ? findNextOpenSpaceForward(state, front.boardPosition) : null;
  const behindDestination = behind?.boardPosition ? findNextOpenSpaceBackward(state, behind.boardPosition) : null;

  let next: GameState = {
    ...state,
    characters: state.characters.map(character => {
      if (character.id === puff.id) {
        return { ...character, abilityUsed: true };
      }
      if (front && frontDestination && character.id === front.id) {
        return { ...character, boardPosition: frontDestination };
      }
      if (behind && behindDestination && character.id === behind.id) {
        return { ...character, boardPosition: behindDestination };
      }
      return character;
    }),
  };

  next = resolveRoombaMoveDraws(next, [
    ...(front && frontDestination && front.boardPosition ? [{ characterId: front.id, fromSpace: front.boardPosition, toSpace: frontDestination }] : []),
    ...(behind && behindDestination && behind.boardPosition ? [{ characterId: behind.id, fromSpace: behind.boardPosition, toSpace: behindDestination }] : []),
  ]);

  next = logEvent(next, 'Mrs. Puff Special', {
    characterId: puff.id,
    frontCharacterId: front?.id ?? null,
    frontDestination,
    behindCharacterId: behind?.id ?? null,
    behindDestination,
  });

  validateBoardStateInvariants(next);
  return endTurn(next);
}

export function executeBehindTheCurtainsSwap(
  state: GameState,
  actingPlayer: Controller,
  ownHandCardInstanceId: string,
  opponentHandCardInstanceId: string,
): GameState {
  if (state.gameStatus !== 'active') {
    throw new Error('Cannot execute BEHIND THE CURTAINS: game is not active');
  }

  const opponent: Controller = actingPlayer === 'P1' ? 'P2' : 'P1';
  const ownHand = state.powerCardHands[actingPlayer];
  const opponentHand = state.powerCardHands[opponent];
  const ownCard = ownHand.find(card => card.instanceId === ownHandCardInstanceId);
  const opponentCard = opponentHand.find(card => card.instanceId === opponentHandCardInstanceId);

  if (!ownCard) {
    throw new Error('Cannot execute BEHIND THE CURTAINS: own selected card is not in hand');
  }

  if (!opponentCard) {
    throw new Error('Cannot execute BEHIND THE CURTAINS: opponent selected card is not in hand');
  }

  const next: GameState = {
    ...state,
    powerCardHands: {
      ...state.powerCardHands,
      [actingPlayer]: ownHand.map(card => (card.instanceId === ownCard.instanceId ? opponentCard : card)),
      [opponent]: opponentHand.map(card => (card.instanceId === opponentCard.instanceId ? ownCard : card)),
    },
  };

  return logEvent(next, 'Behind The Curtains Swap', {
    actingPlayer,
    ownHandCardInstanceId,
    opponentHandCardInstanceId,
  });
}

export function executeFreezeGunSpecial(
  state: GameState,
  sourceCharacterId: string,
  targetCharacterId: string,
): GameState {
  if (state.gameStatus !== 'active') {
    throw new Error('Cannot use Freeze Gun special: game is not active');
  }

  const source = getCharacter(state, sourceCharacterId);
  const target = getCharacter(state, targetCharacterId);

  if (!source || !source.alive) {
    throw new Error('Cannot use Freeze Gun special: source character is invalid');
  }

  const actingController = state.pendingBattle
    ? state.pendingBattle.currentPriorityPlayer
    : state.activePlayer;
  if (source.controller !== actingController) {
    throw new Error('Cannot use Freeze Gun special: source character is not controlled by acting player');
  }

  if (!target || !target.alive) {
    throw new Error('Cannot use Freeze Gun special: target character is invalid');
  }

  if (!isMrFreeze(source.displayName)) {
    throw new Error('Cannot use Freeze Gun special: source character is not Mr. Freeze');
  }

  const freezeGunIndex = getUnusedFreezeGunAttachmentIndex(source);
  if (freezeGunIndex === -1) {
    throw new Error('Cannot use Freeze Gun special: no unused Freeze Gun attachment found');
  }

  const sourceAttachments = [...(source.attachments ?? [])];
  sourceAttachments[freezeGunIndex] = {
    ...sourceAttachments[freezeGunIndex],
    specialUsed: true,
  };

  let nextState: GameState = {
    ...state,
    characters: state.characters.map(character => {
      if (character.id === sourceCharacterId) {
        return {
          ...character,
          attachments: sourceAttachments,
        };
      }

      if (character.id === targetCharacterId) {
        return {
          ...character,
          isFrozen: true,
        };
      }

      return character;
    }),
  };

  nextState = logEvent(nextState, 'Freeze Gun Special', {
    sourceCharacterId,
    targetCharacterId,
    sourceController: source.controller,
  });

  return nextState;
}

/**
 * End turn: increment turn counter and switch active player.
 */
function endTurn(state: GameState): GameState {
  if (state.gameStatus !== 'active') {
    return state; // Game already ended, no turn switch
  }

  const nextPlayer: Controller = state.activePlayer === 'P1' ? 'P2' : 'P1';
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

  return resolveFrozenBreakFreeAtTurnStart(newState);
}

function canMoveForwardIgnoringFrozen(state: GameState, characterId: string): boolean {
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

function resolveFrozenBreakFreeAtTurnStart(state: GameState): GameState {
  if (state.gameStatus !== 'active') {
    return state;
  }

  const activeCharacters = getCharactersByController(state, state.activePlayer).filter(character => character.alive);
  const legalActionsNow = getLegalActions(state);

  if (legalActionsNow.length > 0) {
    return state;
  }

  const frozenMoveCandidates = activeCharacters.filter(
    character => character.isFrozen && canMoveForwardIgnoringFrozen(state, character.id),
  );

  if (frozenMoveCandidates.length !== 1) {
    return state;
  }

  const thawedCharacter = frozenMoveCandidates[0];
  let nextState: GameState = {
    ...state,
    characters: state.characters.map(character => (
      character.id === thawedCharacter.id
        ? updateCharacter(character, { isFrozen: false })
        : character
    )),
  };

  nextState = logEvent(nextState, 'Frozen Break Free', {
    characterId: thawedCharacter.id,
    note: 'Character breaks free instead of moving; turn ends immediately',
  });

  return endTurn(nextState);
}
