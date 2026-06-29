import { describe, expect, it } from 'vitest';
import { initializeGameState, type Character, type Controller } from './gameState';
import { getBotGameView } from './botView';

function createChar(
  id: string,
  controller: Controller,
  ATK: number,
  DEF: number,
  isKing: boolean,
  boardPosition: Character['boardPosition'],
  displayName: string,
  revealed = false,
): Character {
  return {
    id,
    controller,
    ATK,
    DEF,
    isKing,
    boardPosition,
    revealed,
    alive: true,
    displayName,
  };
}

describe('botView fairness and visibility constraints', () => {
  it('does not expose opponent hand cards in ownPowerCardHand', () => {
    const base = initializeGameState([
      createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING', true),
      createChar('p2-char', 'P2', 6, 6, false, 'P2_2', 'P2-CHAR', true),
      createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING', true),
    ]);

    const state = {
      ...base,
      activePlayer: 'P2' as const,
      powerCardHands: {
        P1: [{ instanceId: 'p1-secret', definitionId: 'power-alpha-006' }],
        P2: [{ instanceId: 'p2-own', definitionId: 'power-alpha-005' }],
      },
    };

    const view = getBotGameView(state, 'P2');
    expect(view.ownPowerCardHand.map(card => card.instanceId)).toEqual(['p2-own']);
    expect(view.ownPowerCardHand.some(card => card.instanceId === 'p1-secret')).toBe(false);
  });

  it('keeps knownBattleOutcomeForBot null when opponent is unrevealed', () => {
    const base = initializeGameState([
      createChar('p1-front', 'P1', 5, 5, false, 'P1_4', 'P1-HIDDEN', false),
      createChar('p2-attacker', 'P2', 9, 4, false, 'P1_3', 'P2-ATTACKER', true),
      createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING', true),
      createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING', true),
    ]);

    const state = {
      ...base,
      activePlayer: 'P2' as const,
    };

    const view = getBotGameView(state, 'P2');
    const attack = view.legalActions.find(action => action.type === 'attack' && action.characterId === 'p2-attacker');
    expect(attack).toBeDefined();
    expect(attack?.knownBattleOutcomeForBot).toBeNull();
    expect(attack?.targetRevealed).toBe(false);
  });

  it('includes opponent reply risk fields on move descriptors', () => {
    const base = initializeGameState([
      createChar('p1-front', 'P1', 5, 5, false, 'P1_3', 'P1-FRONT', true),
      createChar('p2-mover', 'P2', 6, 6, false, 'P2_2', 'P2-MOVER', true),
      createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING', true),
      createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING', true),
    ]);

    const state = {
      ...base,
      activePlayer: 'P2' as const,
    };

    const view = getBotGameView(state, 'P2');
    const move = view.legalActions.find(action => action.type === 'move' && action.characterId === 'p2-mover');
    expect(move).toBeDefined();
    expect(move?.opponentKnownWinningReplies).toBeGreaterThanOrEqual(0);
    expect(typeof move?.exposesOwnKingToKnownWinningReply).toBe('boolean');
  });

  it('exposes actor ability strategic score only when actor identity is revealed', () => {
    const base = initializeGameState([
      createChar('p1-front', 'P1', 6, 6, false, 'P1_4', 'P1-FRONT', true),
      createChar('p2-roomba', 'P2', 5, 6, false, 'P1_3', 'ROOMBA', false),
      createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING', true),
      createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING', true),
    ]);

    const unrevealedState = {
      ...base,
      activePlayer: 'P2' as const,
    };

    const unrevealedView = getBotGameView(unrevealedState, 'P2');
    const unrevealedAttack = unrevealedView.legalActions.find(action => (
      action.type === 'attack' && action.characterId === 'p2-roomba'
    ));
    expect(unrevealedAttack).toBeDefined();
    expect(unrevealedAttack?.actorAbilityStrategicScore).toBe(0);

    const revealedState = {
      ...unrevealedState,
      characters: unrevealedState.characters.map(character => (
        character.id === 'p2-roomba' ? { ...character, revealed: true } : character
      )),
    };

    const revealedView = getBotGameView(revealedState, 'P2');
    const revealedAttack = revealedView.legalActions.find(action => (
      action.type === 'attack' && action.characterId === 'p2-roomba'
    ));
    expect(revealedAttack).toBeDefined();
    expect(revealedAttack?.actorAbilityStrategicScore).toBeGreaterThan(0);
  });

  it('keeps target ability strategic score null when target identity is unrevealed', () => {
    const base = initializeGameState([
      createChar('p1-target', 'P1', 7, 7, false, 'P1_4', 'UNCLE IROH', false),
      createChar('p2-attacker', 'P2', 8, 6, false, 'P1_3', 'P2-ATTACKER', true),
      createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING', true),
      createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING', true),
    ]);

    const state = {
      ...base,
      activePlayer: 'P2' as const,
    };

    const view = getBotGameView(state, 'P2');
    const attack = view.legalActions.find(action => action.type === 'attack' && action.characterId === 'p2-attacker');
    expect(attack).toBeDefined();
    expect(attack?.targetRevealed).toBe(false);
    expect(attack?.targetAbilityStrategicScore).toBeNull();
  });
});
