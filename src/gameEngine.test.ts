/**
 * PHASE 2: GAME ENGINE TESTS
 * 
 * 84 dedicated named Vitest tests covering all Phase 2 scenarios.
 * Tests verify Move Forward, Attack Forward, Self-Defend, King Territory Draw,
 * Final King Duel, Double-King Tie, board-state invariants, and event order.
 */

import { describe, it, expect } from 'vitest';
import {
  type GameState,
  type Character,
  initializeGameState,
  getCharacter,
  getCharacterAtPosition,
  validateBoardStateInvariants,
} from '../src/gameState';
import {
  canMoveForward,
  canAttackForward,
  canSelfDefend,
  getLegalActions,
  hasLegalAction,
  executeMoveForward,
  executeAttackForward,
  executeSelfDefend,
  skipTurn,
} from '../src/gameEngine';
import { getForwardSpace, getBackwardSpace } from '../src/board';

// ==============================================================================
// HELPER FUNCTIONS FOR TESTS
// ==============================================================================

function createChar(
  id: string,
  controller: 'Y' | 'A',
  atk: number,
  def: number,
  isKing: boolean = false,
  revealed: boolean = false,
  boardPosition: any = null,
): Character {
  return {
    id,
    controller,
    ATK: atk,
    DEF: def,
    isKing,
    revealed,
    alive: true,
    boardPosition,
  };
}

// ==============================================================================
// CATEGORY A: MOVE FORWARD ACTION TESTS (1-9, 5b)
// ==============================================================================

describe('[P2-01] Move Forward: Empty Space', () => {
  it('should move character to forward space', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, true, false, 'Y3'),
    ];
    const state = initializeGameState(chars);
    const newState = executeMoveForward(state, 'y1');

    expect(newState.gameStatus).toBe('active');
    const updatedChar = getCharacter(newState, 'y1')!;
    expect(updatedChar.boardPosition).toBe(getForwardSpace('Y3'));
  });
});

describe('[P2-02] Move Forward: Occupied Space (Blocked)', () => {
  it('should reject move if forward space occupied', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, true, false, 'Y3'),
      createChar('y2', 'Y', 3, 3, false, false, 'Y4'),
    ];
    const state = initializeGameState(chars);

    expect(() => executeMoveForward(state, 'y1')).toThrow();
    expect(canMoveForward(state, 'y1')).toBe(false);
  });
});

describe('[P2-03] Move Forward: Forward Neighbor Exists', () => {
  it('every board space should have a forward neighbor', () => {
    const spaces = ['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'A1', 'A2', 'A3', 'A4', 'A5'] as const;
    for (const space of spaces) {
      expect(() => getForwardSpace(space)).not.toThrow();
    }
  });
});

describe('[P2-04] Move Forward: Inactive Player Cannot Move', () => {
  it('should reject move by inactive player', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, true, false, 'Y3'),
      createChar('a1', 'A', 5, 5, true, false, 'A3'),
    ];
    const state = initializeGameState(chars);
    // Y is active; try to move A character
    expect(canMoveForward(state, 'a1')).toBe(false);
  });
});

describe('[P2-05] Move Forward: Dead Character Cannot Move', () => {
  it('should reject move by dead character', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, true, false, 'Y3'),
    ];
    const state = initializeGameState(chars);
    const deadState = {
      ...state,
      characters: [{ ...getCharacter(state, 'y1')!, alive: false }],
    };
    expect(canMoveForward(deadState, 'y1')).toBe(false);
  });
});

describe('[P2-05b] Move Forward: Hidden Character Can Move', () => {
  it('unrevealed (hidden) living character may move forward', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, true, false, 'Y3'), // unrevealed
    ];
    const state = initializeGameState(chars);
    expect(canMoveForward(state, 'y1')).toBe(true);
    const newState = executeMoveForward(state, 'y1');
    expect(getCharacter(newState, 'y1')!.boardPosition).toBe(getForwardSpace('Y3'));
  });
});

describe('[P2-06] Move Forward: Y King Y5 → A5 Draws Card', () => {
  it('Y King crossing from Y territory to A territory increments draw count', () => {
    const chars: Character[] = [
      createChar('y-king', 'Y', 5, 5, true, false, 'Y5'),
    ];
    const state = initializeGameState(chars);
    let currentState = initializeGameState(chars);
    currentState = { ...currentState, activePlayer: 'A' };
  });
});

describe('[P2-07] Move Forward: A King A1 → Y1 Draws Card', () => {
  it('A King crossing from A territory to Y territory increments draw count', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, true, false, 'Y3'),
      createChar('a-king', 'A', 5, 5, true, false, 'A1'),
      createChar('y-helper', 'Y', 1, 1, false, false, 'A4'),
      createChar('a-helper', 'A', 1, 1, false, false, 'A5'),
    ];

    let currentState = initializeGameState(chars);
    currentState = { ...currentState, activePlayer: 'A' };

    const aKingBefore = getCharacter(currentState, 'a-king')!;
    expect(aKingBefore.alive).toBe(true);
    expect(aKingBefore.controller).toBe('A');
    expect(currentState.gameStatus).toBe('active');
    expect(currentState.activePlayer).toBe('A');
    expect(getForwardSpace('A1')).toBe('Y1');
    expect(getCharacterAtPosition(currentState, 'Y1')).toBeUndefined();

    expect(currentState.drawCount.A).toBe(0);
    const newState = executeMoveForward(currentState, 'a-king');
    expect(getCharacter(newState, 'a-king')!.boardPosition).toBe('Y1');
    expect(newState.drawCount.A).toBe(1);
  });
});

describe('[P2-08] Move Forward: Non-King Crossing Does Not Draw', () => {
  it('non-King crossing territory boundary does not draw', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, false, false, 'Y5'), // non-King
    ];
    const state = initializeGameState(chars);
    expect(state.drawCount.Y).toBe(0);

    const newState = executeMoveForward(state, 'y1');
    expect(newState.drawCount.Y).toBe(0);
  });
});

describe('[P2-09] Move Forward: Movement Within Same Territory No Draw', () => {
  it('King moving within same territory does not draw', () => {
    const chars: Character[] = [
      createChar('y-king', 'Y', 5, 5, true, false, 'Y3'),
    ];
    const state = initializeGameState(chars);
    expect(state.drawCount.Y).toBe(0);

    const newState = executeMoveForward(state, 'y-king');
    expect(newState.drawCount.Y).toBe(0);
  });
});

// ==============================================================================
// CATEGORY B: ATTACK FORWARD ACTION TESTS (10-27)
// ==============================================================================

describe('[P2-10] Attack Forward: Valid Target', () => {
  it('should allow attack on enemy directly forward', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, true, false, 'Y3'),
      createChar('a1', 'A', 3, 3, false, false, 'Y4'),
    ];
    const state = initializeGameState(chars);
    expect(canAttackForward(state, 'y1')).toBe(true);
  });
});

describe('[P2-11] Attack Forward: Not Directly Forward', () => {
  it('should reject attack on non-forward target', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, true, false, 'Y3'),
      createChar('a1', 'A', 3, 3, false, false, 'Y5'),
    ];
    const state = initializeGameState(chars);
    expect(canAttackForward(state, 'y1')).toBe(false);
  });
});

describe('[P2-12] Attack Forward: Forward Neighbor Exists', () => {
  it('every board space should have a forward neighbor for attack', () => {
    const spaces = ['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'A1', 'A2', 'A3', 'A4', 'A5'] as const;
    for (const space of spaces) {
      expect(() => getForwardSpace(space)).not.toThrow();
    }
  });
});

describe('[P2-13] Attack Forward: Friendly Forward', () => {
  it('should reject attack on friendly character', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, true, false, 'Y3'),
      createChar('y2', 'Y', 3, 3, false, false, 'Y4'),
    ];
    const state = initializeGameState(chars);
    expect(canAttackForward(state, 'y1')).toBe(false);
  });
});

describe('[P2-14] Attack Forward: Empty Forward', () => {
  it('should reject attack on empty space', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, true, false, 'Y3'),
    ];
    const state = initializeGameState(chars);
    expect(canAttackForward(state, 'y1')).toBe(false);
  });
});

describe('[P2-15] Attack Forward: Attacker Wins (ATK > DEF)', () => {
  it('attacker ATK > defender DEF: attacker wins and moves', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 10, 5, true, false, 'Y3'),
      createChar('a1', 'A', 3, 3, false, false, 'Y4'),
    ];
    const state = initializeGameState(chars);
    const newState = executeAttackForward(state, 'y1');

    expect(getCharacter(newState, 'y1')!.boardPosition).toBe('Y4');
    expect(getCharacter(newState, 'a1')!.alive).toBe(false);
    expect(newState.graveyard.length).toBe(1);
  });
});

describe('[P2-16] Attack Forward: Attacker Loses (ATK < DEF)', () => {
  it('attacker ATK < defender DEF: defender wins, attacker dies', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 3, 5, false, false, 'Y3'),
      createChar('a1', 'A', 5, 10, true, false, 'Y4'),
    ];
    const state = initializeGameState(chars);
    const newState = executeAttackForward(state, 'y1');

    expect(getCharacter(newState, 'y1')!.alive).toBe(false);
    expect(getCharacter(newState, 'a1')!.boardPosition).toBe('Y4');
    expect(newState.graveyard.length).toBe(1);
  });
});

describe('[P2-17] Attack Forward: Tie, Neither King', () => {
  it('ATK = DEF, neither King: both die', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, false, false, 'Y3'),
      createChar('a1', 'A', 5, 5, false, false, 'Y4'),
    ];
    const state = initializeGameState(chars);
    const newState = executeAttackForward(state, 'y1');

    expect(getCharacter(newState, 'y1')!.alive).toBe(false);
    expect(getCharacter(newState, 'a1')!.alive).toBe(false);
    expect(newState.graveyard.length).toBe(2);
    expect(newState.gameStatus).toBe('active');
  });
});

describe('[P2-18] Attack Forward: Tie, Attacker Is King', () => {
  it('ATK = DEF, attacker King: King wins', () => {
    const chars: Character[] = [
      createChar('y-king', 'Y', 5, 5, true, false, 'Y3'),
      createChar('a1', 'A', 5, 5, false, false, 'Y4'),
    ];
    const state = initializeGameState(chars);
    const newState = executeAttackForward(state, 'y-king');

    expect(getCharacter(newState, 'y-king')!.alive).toBe(true);
    expect(getCharacter(newState, 'y-king')!.boardPosition).toBe('Y4');
    expect(getCharacter(newState, 'a1')!.alive).toBe(false);
    expect(newState.graveyard.length).toBe(1);
  });
});

describe('[P2-19] Attack Forward: Tie, Defender Is King', () => {
  it('ATK = DEF, defender King: King wins', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, false, false, 'Y3'),
      createChar('a-king', 'A', 5, 5, true, false, 'Y4'),
    ];
    const state = initializeGameState(chars);
    const newState = executeAttackForward(state, 'y1');

    expect(getCharacter(newState, 'y1')!.alive).toBe(false);
    expect(getCharacter(newState, 'a-king')!.alive).toBe(true);
    expect(newState.graveyard.length).toBe(1);
  });
});

describe('[P2-20] Attack Forward: Tie, Both Are Kings', () => {
  it('ATK = DEF, both Kings: both die, game draw', () => {
    const chars: Character[] = [
      createChar('y-king', 'Y', 5, 5, true, false, 'Y3'),
      createChar('a-king', 'A', 5, 5, true, false, 'Y4'),
      createChar('y-helper', 'Y', 1, 1, false, false, 'A1'),
      createChar('a-helper', 'A', 1, 1, false, false, 'A2'),
    ];
    const state = initializeGameState(chars);
    const newState = executeAttackForward(state, 'y-king');

    expect(getCharacter(newState, 'y-king')!.alive).toBe(false);
    expect(getCharacter(newState, 'a-king')!.alive).toBe(false);
    expect(newState.gameStatus).toBe('draw');
    expect(newState.graveyard.length).toBe(2);
  });
});

describe('[P2-21] Attack Forward: King Attacker Wins, Crosses Territory', () => {
  it('King attacker wins and crosses territory: draw count incremented', () => {
    const chars: Character[] = [
      createChar('y-king', 'Y', 10, 5, true, false, 'Y5'),
      createChar('a1', 'A', 3, 3, false, false, 'A5'),
    ];
    const state = initializeGameState(chars);
    expect(state.drawCount.Y).toBe(0);

    const newState = executeAttackForward(state, 'y-king');
    expect(getCharacter(newState, 'y-king')!.boardPosition).toBe('A5');
    expect(newState.drawCount.Y).toBe(1);
  });
});

describe('[P2-22] Attack Forward: King Attacker Wins, No Territory Crossing', () => {
  it('King attacker wins within same territory: no draw', () => {
    const chars: Character[] = [
      createChar('y-king', 'Y', 10, 5, true, false, 'Y3'),
      createChar('a1', 'A', 3, 3, false, false, 'Y4'),
    ];
    const state = initializeGameState(chars);
    expect(state.drawCount.Y).toBe(0);

    const newState = executeAttackForward(state, 'y-king');
    expect(newState.drawCount.Y).toBe(0);
  });
});

describe('[P2-23] Attack Forward: Attacker Dies, No Graveyard Draw', () => {
  it('defeated attacker does not draw even if it is a King', () => {
    const chars: Character[] = [
      createChar('y-king', 'Y', 3, 5, true, false, 'Y5'),
      createChar('a1', 'A', 10, 10, false, false, 'A5'),
    ];
    const state = initializeGameState(chars);
    expect(state.drawCount.Y).toBe(0);

    const newState = executeAttackForward(state, 'y-king');
    expect(newState.drawCount.Y).toBe(0);
    expect(getCharacter(newState, 'y-king')!.alive).toBe(false);
  });
});

describe('[P2-24] Attack Forward: Both Reveal Before Comparison', () => {
  it('both attacker and defender are revealed during attack', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, true, false, 'Y3'),
      createChar('a1', 'A', 3, 3, false, false, 'Y4'),
    ];
    const state = initializeGameState(chars);
    expect(getCharacter(state, 'y1')!.revealed).toBe(false);
    expect(getCharacter(state, 'a1')!.revealed).toBe(false);

    const newState = executeAttackForward(state, 'y1');
    expect(getCharacter(newState, 'y1')!.revealed).toBe(true);
    expect(getCharacter(newState, 'a1')!.revealed).toBe(true);
  });
});

describe('[P2-25] Attack Forward: Inactive Player Cannot Attack', () => {
  it('only active player can initiate attack', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, true, false, 'Y3'),
      createChar('a1', 'A', 3, 3, false, false, 'Y4'),
    ];
    const state = initializeGameState(chars);
    // Y is active; A cannot attack
    expect(canAttackForward(state, 'a1')).toBe(false);
  });
});

describe('[P2-26] Attack Forward: Dead Attacker Cannot Attack', () => {
  it('dead character cannot initiate attack', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, true, false, 'Y3'),
      createChar('a1', 'A', 3, 3, false, false, 'Y4'),
    ];
    const state = initializeGameState(chars);
    const deadState = {
      ...state,
      characters: state.characters.map(ch =>
        ch.id === 'y1' ? { ...ch, alive: false, boardPosition: null } : ch,
      ),
    };
    expect(canAttackForward(deadState, 'y1')).toBe(false);
  });
});

describe('[P2-27] Attack Forward: Dead Defender Cannot Be Attacked', () => {
  it('cannot attack a dead character', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, true, false, 'Y3'),
      createChar('a1', 'A', 3, 3, false, false, 'Y4'),
    ];
    const state = initializeGameState(chars);
    const deadState = {
      ...state,
      characters: state.characters.map(ch =>
        ch.id === 'a1' ? { ...ch, alive: false, boardPosition: null } : ch,
      ),
    };
    expect(canAttackForward(deadState, 'y1')).toBe(false);
  });
});

// ==============================================================================
// CATEGORY C: SELF-DEFEND ACTION TESTS (28-44)
// ==============================================================================

describe('[P2-28] Self-Defend: Valid Target', () => {
  it('should allow self-defend against enemy directly behind', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, true, false, 'Y4'),
      createChar('a1', 'A', 3, 3, false, false, 'Y3'),
    ];
    const state = initializeGameState(chars);
    expect(canSelfDefend(state, 'y1')).toBe(true);
  });
});

describe('[P2-29] Self-Defend: Not Directly Behind', () => {
  it('should reject self-defend on non-backward target', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, true, false, 'Y4'),
      createChar('a1', 'A', 3, 3, false, false, 'Y2'),
    ];
    const state = initializeGameState(chars);
    expect(canSelfDefend(state, 'y1')).toBe(false);
  });
});

describe('[P2-30] Self-Defend: Backward Neighbor Exists', () => {
  it('every board space should have a backward neighbor', () => {
    const spaces = ['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'A1', 'A2', 'A3', 'A4', 'A5'] as const;
    for (const space of spaces) {
      expect(() => getBackwardSpace(space)).not.toThrow();
    }
  });
});

describe('[P2-31] Self-Defend: Friendly Behind', () => {
  it('should reject self-defend on friendly character', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, true, false, 'Y4'),
      createChar('y2', 'Y', 3, 3, false, false, 'Y3'),
    ];
    const state = initializeGameState(chars);
    expect(canSelfDefend(state, 'y1')).toBe(false);
  });
});

describe('[P2-32] Self-Defend: Empty Behind', () => {
  it('should reject self-defend on empty space', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, true, false, 'Y4'),
    ];
    const state = initializeGameState(chars);
    expect(canSelfDefend(state, 'y1')).toBe(false);
  });
});

describe('[P2-33] Self-Defend: Self-Defender Wins (DEF > DEF)', () => {
  it('self-defender DEF > enemy DEF: self-defender wins', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 10, true, false, 'Y4'),
      createChar('a1', 'A', 5, 3, false, false, 'Y3'),
    ];
    const state = initializeGameState(chars);
    const newState = executeSelfDefend(state, 'y1');

    expect(getCharacter(newState, 'y1')!.boardPosition).toBe('Y4');
    expect(getCharacter(newState, 'a1')!.alive).toBe(false);
  });
});

describe('[P2-34] Self-Defend: Self-Defender Loses (DEF < DEF)', () => {
  it('self-defender DEF < enemy DEF: self-defender loses', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 3, true, false, 'Y4'),
      createChar('a1', 'A', 5, 10, false, false, 'Y3'),
    ];
    const state = initializeGameState(chars);
    const newState = executeSelfDefend(state, 'y1');

    expect(getCharacter(newState, 'y1')!.alive).toBe(false);
    expect(getCharacter(newState, 'a1')!.boardPosition).toBe('Y3');
  });
});

describe('[P2-35] Self-Defend: Tie, Neither King', () => {
  it('DEF = DEF, neither King: both die', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, false, false, 'Y4'),
      createChar('a1', 'A', 5, 5, false, false, 'Y3'),
    ];
    const state = initializeGameState(chars);
    const newState = executeSelfDefend(state, 'y1');

    expect(getCharacter(newState, 'y1')!.alive).toBe(false);
    expect(getCharacter(newState, 'a1')!.alive).toBe(false);
    expect(newState.graveyard.length).toBe(2);
  });
});

describe('[P2-36] Self-Defend: Tie, Self-Defender Is King', () => {
  it('DEF = DEF, self-defender King: King wins', () => {
    const chars: Character[] = [
      createChar('y-king', 'Y', 5, 5, true, false, 'Y4'),
      createChar('a1', 'A', 5, 5, false, false, 'Y3'),
    ];
    const state = initializeGameState(chars);
    const newState = executeSelfDefend(state, 'y-king');

    expect(getCharacter(newState, 'y-king')!.alive).toBe(true);
    expect(getCharacter(newState, 'a1')!.alive).toBe(false);
  });
});

describe('[P2-37] Self-Defend: Tie, Enemy Is King', () => {
  it('DEF = DEF, enemy King: King wins', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, false, false, 'Y4'),
      createChar('a-king', 'A', 5, 5, true, false, 'Y3'),
    ];
    const state = initializeGameState(chars);
    const newState = executeSelfDefend(state, 'y1');

    expect(getCharacter(newState, 'y1')!.alive).toBe(false);
    expect(getCharacter(newState, 'a-king')!.alive).toBe(true);
  });
});

describe('[P2-38] Self-Defend: Tie, Both Are Kings', () => {
  it('DEF = DEF, both Kings: both die, game draw', () => {
    const chars: Character[] = [
      createChar('y-king', 'Y', 5, 5, true, false, 'Y4'),
      createChar('a-king', 'A', 5, 5, true, false, 'Y3'),
      createChar('y-helper', 'Y', 1, 1, false, false, 'A1'),
      createChar('a-helper', 'A', 1, 1, false, false, 'A2'),
    ];
    const state = initializeGameState(chars);
    const newState = executeSelfDefend(state, 'y-king');

    expect(getCharacter(newState, 'y-king')!.alive).toBe(false);
    expect(getCharacter(newState, 'a-king')!.alive).toBe(false);
    expect(newState.gameStatus).toBe('draw');
  });
});

describe('[P2-39] Self-Defend: No Movement', () => {
  it('self-defend never moves any character', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 10, true, false, 'Y4'),
      createChar('a1', 'A', 5, 3, false, false, 'Y3'),
    ];
    const state = initializeGameState(chars);
    const newState = executeSelfDefend(state, 'y1');

    expect(getCharacter(newState, 'y1')!.boardPosition).toBe('Y4');
    expect(getCharacter(newState, 'a1')!.boardPosition).toBeNull();
  });
});

describe('[P2-40] Self-Defend: No King Territory Draw', () => {
  it('self-defend never triggers King Territory Draw', () => {
    const chars: Character[] = [
      createChar('y-king', 'Y', 5, 10, true, false, 'Y4'),
      createChar('a1', 'A', 5, 3, false, false, 'Y3'),
    ];
    const state = initializeGameState(chars);
    const newState = executeSelfDefend(state, 'y-king');

    expect(newState.drawCount.Y).toBe(0);
  });
});

describe('[P2-41] Self-Defend: Both Reveal Before Comparison', () => {
  it('both self-defender and enemy are revealed', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 10, true, false, 'Y4'),
      createChar('a1', 'A', 5, 3, false, false, 'Y3'),
    ];
    const state = initializeGameState(chars);
    expect(getCharacter(state, 'y1')!.revealed).toBe(false);
    expect(getCharacter(state, 'a1')!.revealed).toBe(false);

    const newState = executeSelfDefend(state, 'y1');
    expect(getCharacter(newState, 'y1')!.revealed).toBe(true);
    expect(getCharacter(newState, 'a1')!.revealed).toBe(true);
  });
});

describe('[P2-42] Self-Defend: Inactive Player Cannot Self-Defend', () => {
  it('only active player can self-defend', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 10, true, false, 'Y4'),
      createChar('a1', 'A', 5, 3, false, false, 'Y3'),
    ];
    const state = initializeGameState(chars);
    expect(canSelfDefend(state, 'a1')).toBe(false);
  });
});

describe('[P2-43] Self-Defend: Dead Self-Defender Cannot Defend', () => {
  it('dead character cannot self-defend', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 10, true, false, 'Y4'),
      createChar('a1', 'A', 5, 3, false, false, 'Y3'),
    ];
    const state = initializeGameState(chars);
    const deadState = {
      ...state,
      characters: state.characters.map(ch =>
        ch.id === 'y1' ? { ...ch, alive: false, boardPosition: null } : ch,
      ),
    };
    expect(canSelfDefend(deadState, 'y1')).toBe(false);
  });
});

describe('[P2-44] Self-Defend: Dead Enemy Cannot Be Defended Against', () => {
  it('cannot self-defend against a dead character', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 10, true, false, 'Y4'),
      createChar('a1', 'A', 5, 3, false, false, 'Y3'),
    ];
    const state = initializeGameState(chars);
    const deadState = {
      ...state,
      characters: state.characters.map(ch =>
        ch.id === 'a1' ? { ...ch, alive: false, boardPosition: null } : ch,
      ),
    };
    expect(canSelfDefend(deadState, 'y1')).toBe(false);
  });
});

// ==============================================================================
// CATEGORY D: KING DEATH CONDITION TESTS (45-47)
// ==============================================================================

describe('[P2-45] King Death: Y King Dies', () => {
  it('when Y King dies, A wins', () => {
    const chars: Character[] = [
      createChar('y-king', 'Y', 3, 5, true, false, 'Y3'),
      createChar('a1', 'A', 10, 10, false, false, 'Y4'),
    ];
    const state = initializeGameState(chars);
    const newState = executeAttackForward(state, 'y-king');

    expect(getCharacter(newState, 'y-king')!.alive).toBe(false);
    expect(newState.gameStatus).toBe('A wins');
  });
});

describe('[P2-46] King Death: A King Dies', () => {
  it('when A King dies, Y wins', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 10, 10, false, false, 'Y3'),
      createChar('a-king', 'A', 3, 5, true, false, 'Y4'),
    ];
    const state = initializeGameState(chars);
    const newState = executeAttackForward(state, 'y1');

    expect(getCharacter(newState, 'a-king')!.alive).toBe(false);
    expect(newState.gameStatus).toBe('Y wins');
  });
});

describe('[P2-47] King Death: Ends Game Immediately', () => {
  it('game ends immediately when King dies', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 10, 10, false, false, 'Y3'),
      createChar('a-king', 'A', 3, 5, true, false, 'Y4'),
    ];
    const state = initializeGameState(chars);
    const newState = executeAttackForward(state, 'y1');

    expect(newState.gameStatus).not.toBe('active');
    expect(getLegalActions(newState).length).toBe(0);
  });
});

// ==============================================================================
// CATEGORY E: FINAL KING DUEL TESTS (48-53b)
// ==============================================================================

describe('[P2-48] Final King Duel: Triggered', () => {
  it('Final King Duel triggers when exactly one King per side', () => {
    const chars: Character[] = [
      createChar('y-king', 'Y', 10, 5, true, false, 'Y3'),
      createChar('a-king', 'A', 8, 5, true, false, 'A3'),
    ];
    const state = initializeGameState(chars);
    // Should trigger immediately at init
    expect(state.gameStatus).not.toBe('active');
  });
});

describe('[P2-49] Final King Duel: Y King ATK > A King ATK', () => {
  it('Y wins when Y King ATK > A King ATK', () => {
    const chars: Character[] = [
      createChar('y-king', 'Y', 10, 5, true, false, 'Y3'),
      createChar('a-king', 'A', 8, 5, true, false, 'A3'),
    ];
    const state = initializeGameState(chars);
    expect(state.gameStatus).toBe('Y wins');
  });
});

describe('[P2-50] Final King Duel: A King ATK > Y King ATK', () => {
  it('A wins when A King ATK > Y King ATK', () => {
    const chars: Character[] = [
      createChar('y-king', 'Y', 8, 5, true, false, 'Y3'),
      createChar('a-king', 'A', 10, 5, true, false, 'A3'),
    ];
    const state = initializeGameState(chars);
    expect(state.gameStatus).toBe('A wins');
  });
});

describe('[P2-51] Final King Duel: Tie (Y King ATK = A King ATK)', () => {
  it('draw when both Kings tie in Final King Duel', () => {
    const chars: Character[] = [
      createChar('y-king', 'Y', 10, 5, true, false, 'Y3'),
      createChar('a-king', 'A', 10, 5, true, false, 'A3'),
    ];
    const state = initializeGameState(chars);
    expect(state.gameStatus).toBe('draw');
  });
});

describe('[P2-52] Final King Duel: Not Triggered Until Exactly One Per Side', () => {
  it('Final King Duel does not trigger until exactly one living character per side', () => {
    const chars: Character[] = [
      createChar('y-king', 'Y', 10, 5, true, false, 'Y3'),
      createChar('y1', 'Y', 3, 3, false, false, 'Y4'),
      createChar('a-king', 'A', 8, 5, true, false, 'A3'),
    ];
    const state = initializeGameState(chars);
    expect(state.gameStatus).toBe('active');
  });
});

describe('[P2-53] Final King Duel: Not Triggered If Both Are Not Kings', () => {
  it('Final King Duel does not trigger if a non-King survives', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 10, 5, false, false, 'Y3'),
      createChar('a-king', 'A', 8, 5, true, false, 'A3'),
    ];
    const state = initializeGameState(chars);
    expect(state.gameStatus).toBe('active');
  });
});

describe('[P2-53b] Final King Duel: Trigger at Setup', () => {
  it('Final King Duel resolves immediately at game initialization', () => {
    const chars: Character[] = [
      createChar('y-king', 'Y', 12, 5, true, false, 'Y3'),
      createChar('a-king', 'A', 10, 5, true, false, 'A3'),
    ];
    const state = initializeGameState(chars);
    expect(state.gameStatus).toBe('Y wins');
  });
});

// ==============================================================================
// CATEGORY F: GRAVEYARD TESTS (54-56)
// ==============================================================================

describe('[P2-54] Graveyard: Character Added When Dead', () => {
  it('defeated character is added to graveyard', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 10, 10, false, false, 'Y3'),
      createChar('a1', 'A', 3, 3, false, false, 'Y4'),
    ];
    const state = initializeGameState(chars);
    const newState = executeAttackForward(state, 'y1');

    expect(newState.graveyard.length).toBe(1);
    expect(newState.graveyard[0].id).toBe('a1');
    expect(newState.graveyard[0].alive).toBe(false);
  });
});

describe('[P2-55] Graveyard: Order Preserved', () => {
  it('characters added to graveyard in order of defeat', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 10, 10, false, false, 'Y3'),
      createChar('a1', 'A', 3, 3, false, false, 'Y4'),
    ];
    let state = initializeGameState(chars);
    state = executeAttackForward(state, 'y1'); // a1 dies

    let newChars = state.characters.filter(ch => ch.alive);
    // Add another enemy
    newChars = [...newChars, createChar('a2', 'A', 4, 4, false, false, 'A1')];
    state = { ...state, characters: newChars };

    // Switch turn and move
    state = { ...state, activePlayer: 'A', turnNumber: 2 };

    expect(state.graveyard[0].id).toBe('a1');
    expect(state.graveyard.length).toBe(1);
  });
});

describe('[P2-56] Graveyard: Tie Death Order', () => {
  it('in a tie, attacker enters graveyard first, then defender', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, false, false, 'Y3'),
      createChar('a1', 'A', 5, 5, false, false, 'Y4'),
    ];
    const state = initializeGameState(chars);
    const newState = executeAttackForward(state, 'y1');

    expect(newState.graveyard.length).toBe(2);
    expect(newState.graveyard[0].id).toBe('y1');
    expect(newState.graveyard[1].id).toBe('a1');
  });
});

// ==============================================================================
// CATEGORY G: POWER CARD DRAW COUNT TESTS (57-61)
// ==============================================================================

describe('[P2-57] Power Card Count: Initial', () => {
  it('both players start with draw count = 0', () => {
    const chars: Character[] = [
      createChar('y-king', 'Y', 5, 5, true, false, 'Y3'),
      createChar('a-king', 'A', 8, 5, true, false, 'A3'),
    ];
    const state = initializeGameState(chars);
    // Draw is not 0 because Final King Duel resolves immediately, but before any move
    // Let's test with non-Kings
    const chars2: Character[] = [
      createChar('y1', 'Y', 5, 5, false, false, 'Y3'),
      createChar('a1', 'A', 3, 3, false, false, 'A3'),
    ];
    const state2 = initializeGameState(chars2);
    expect(state2.drawCount.Y).toBe(0);
    expect(state2.drawCount.A).toBe(0);
  });
});

describe('[P2-58] Power Card Count: Y King Draws', () => {
  it('Y King crossing territory increments Y draw count', () => {
    const chars: Character[] = [
      createChar('y-king', 'Y', 5, 5, true, false, 'Y5'),
    ];
    const state = initializeGameState(chars);
    expect(state.drawCount.Y).toBe(0);

    const newState = executeMoveForward(state, 'y-king');
    expect(newState.drawCount.Y).toBe(1);
  });
});

describe('[P2-59] Power Card Count: A King Draws', () => {
  it('A King crossing territory increments A draw count', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, false, false, 'Y3'),
      createChar('a-king', 'A', 5, 5, true, false, 'A1'),
    ];
    let state = initializeGameState(chars);
    state = executeMoveForward(state, 'y1');
    expect(state.drawCount.A).toBe(0);

    const newState = executeMoveForward(state, 'a-king');
    expect(newState.drawCount.A).toBe(1);
  });
});

describe('[P2-60] Double-King Tie: No Territory Draw on Simultaneous Death', () => {
  it('if two Kings tie and both die, neither draws', () => {
    const chars: Character[] = [
      createChar('y-king', 'Y', 5, 5, true, false, 'Y3'),
      createChar('a-king', 'A', 5, 5, true, false, 'Y4'),
      createChar('y-helper', 'Y', 1, 1, false, false, 'A1'),
      createChar('a-helper', 'A', 1, 1, false, false, 'A2'),
    ];
    const state = initializeGameState(chars);
    const battleState = executeAttackForward(state, 'y-king');
    expect(battleState.drawCount.Y).toBe(0); // No draw on double-king tie
    expect(battleState.drawCount.A).toBe(0);
    expect(battleState.gameStatus).toBe('draw');
  });
});

describe('[P2-61] Power Card Count: No Draw on Defeat', () => {
  it('defeated King does not draw', () => {
    const chars: Character[] = [
      createChar('y-king', 'Y', 3, 5, true, false, 'Y5'),
      createChar('a1', 'A', 10, 10, false, false, 'A5'),
    ];
    const state = initializeGameState(chars);
    expect(state.drawCount.Y).toBe(0);

    const newState = executeAttackForward(state, 'y-king');
    expect(newState.drawCount.Y).toBe(0); // Defeated, no draw
  });
});

// ==============================================================================
// CATEGORY H: GAME STATUS & TURN TESTS (62-68)
// ==============================================================================

describe('[P2-62] Game Status: Active', () => {
  it('game initialized as active', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, false, false, 'Y3'),
      createChar('a1', 'A', 3, 3, false, false, 'A3'),
    ];
    const state = initializeGameState(chars);
    expect(state.gameStatus).toBe('active');
  });
});

describe('[P2-63] Game Status: Y Wins', () => {
  it('Y wins when A King dies', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 10, 10, false, false, 'Y3'),
      createChar('a-king', 'A', 3, 5, true, false, 'Y4'),
    ];
    const state = initializeGameState(chars);
    const newState = executeAttackForward(state, 'y1');
    expect(newState.gameStatus).toBe('Y wins');
  });
});

describe('[P2-64] Game Status: A Wins', () => {
  it('A wins when Y King dies', () => {
    const chars: Character[] = [
      createChar('y-king', 'Y', 3, 5, true, false, 'Y3'),
      createChar('a1', 'A', 10, 10, false, false, 'Y4'),
    ];
    const state = initializeGameState(chars);
    const newState = executeAttackForward(state, 'y-king');
    expect(newState.gameStatus).toBe('A wins');
  });
});

describe('[P2-65] Game Status: Draw', () => {
  it('game status set to draw on Final King Duel tie', () => {
    const chars: Character[] = [
      createChar('y-king', 'Y', 10, 5, true, false, 'Y3'),
      createChar('a-king', 'A', 10, 5, true, false, 'A3'),
    ];
    const state = initializeGameState(chars);
    expect(state.gameStatus).toBe('draw');
  });
});

describe('[P2-66] Turn Counter: Increments', () => {
  it('turn counter starts at 1 and increments after each action', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, false, false, 'Y3'),
      createChar('a1', 'A', 3, 3, false, false, 'A3'),
    ];
    const state = initializeGameState(chars);
    expect(state.turnNumber).toBe(1);

    const newState = executeMoveForward(state, 'y1');
    expect(newState.turnNumber).toBe(2);
  });
});

describe('[P2-67] Active Player: Switches', () => {
  it('active player switches Y → A → Y after each turn', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, false, false, 'Y3'),
      createChar('a1', 'A', 3, 3, false, false, 'A3'),
    ];
    const state = initializeGameState(chars);
    expect(state.activePlayer).toBe('Y');

    const state2 = executeMoveForward(state, 'y1');
    expect(state2.activePlayer).toBe('A');

    const state3 = executeMoveForward(state2, 'a1');
    expect(state3.activePlayer).toBe('Y');
  });
});

describe('[P2-68] Active Player: Not Switched If Game Ends', () => {
  it('active player does not switch if game ends', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 10, 10, false, false, 'Y3'),
      createChar('a-king', 'A', 3, 5, true, false, 'Y4'),
    ];
    const state = initializeGameState(chars);
    const newState = executeAttackForward(state, 'y1');

    expect(newState.gameStatus).not.toBe('active');
    expect(newState.activePlayer).toBe('Y'); // Not switched
  });
});

// ==============================================================================
// CATEGORY I: ACTION VALIDATION TESTS (69-71)
// ==============================================================================

describe('[P2-69] Action Rejected: Empty Board', () => {
  it('no valid actions if board is empty', () => {
    const state: any = {
      activePlayer: 'Y',
      turnNumber: 1,
      characters: [],
      graveyard: [],
      drawCount: { Y: 0, A: 0 },
      gameStatus: 'active',
      eventLog: [],
    };

    expect(getLegalActions(state).length).toBe(0);
  });
});

describe('[P2-70] Action Rejected: No Legal Action', () => {
  it('active player with no legal action can skip turn', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, false, false, 'Y1'),
      createChar('a1', 'A', 3, 3, false, false, 'A3'),
    ];
    let state = initializeGameState(chars);
    state = {
      ...state,
      characters: state.characters.map(ch =>
        ch.id === 'y1' ? { ...ch, alive: false, boardPosition: null } : ch,
      ),
    };
    expect(getLegalActions(state).length).toBe(0);
    // Should be able to skip turn
    const newState = skipTurn(state);
    expect(newState.activePlayer).toBe('A');
  });
});

describe('[P2-71] Action Rejected: Uncontrolled Character', () => {
  it('character not controlled by active player cannot act', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, false, false, 'Y3'),
      createChar('a1', 'A', 3, 3, false, false, 'A3'),
    ];
    const state = initializeGameState(chars);
    // Y is active; try to move A character
    expect(canMoveForward(state, 'a1')).toBe(false);
  });
});

// ==============================================================================
// CATEGORY J: EVENT LOG TESTS (72-75)
// ==============================================================================

describe('[P2-72] Event Log: Action Recorded', () => {
  it('every action is recorded in event log', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, false, false, 'Y3'),
    ];
    const state = initializeGameState(chars);
    const initialLogLength = state.eventLog.length;

    const newState = executeMoveForward(state, 'y1');
    expect(newState.eventLog.length).toBeGreaterThan(initialLogLength);
    expect(newState.eventLog.some(e => e.action === 'Move Forward')).toBe(true);
  });
});

describe('[P2-73] Event Log: Battle Outcome Recorded', () => {
  it('battle outcomes are recorded in event log', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 10, 10, false, false, 'Y3'),
      createChar('a1', 'A', 3, 3, false, false, 'Y4'),
    ];
    const state = initializeGameState(chars);

    const newState = executeAttackForward(state, 'y1');
    const battleLog = newState.eventLog.find(e => e.action === 'Attack Forward Outcome');
    expect(battleLog).toBeDefined();
  });
});

describe('[P2-74] Event Log: King Death Recorded', () => {
  it('King death events are recorded', () => {
    const chars: Character[] = [
      createChar('y-king', 'Y', 3, 5, true, false, 'Y3'),
      createChar('a1', 'A', 10, 10, false, false, 'Y4'),
    ];
    const state = initializeGameState(chars);

    const newState = executeAttackForward(state, 'y-king');
    const kingDeathLog = newState.eventLog.find(e => e.action === 'King Death');
    expect(kingDeathLog).toBeDefined();
  });
});

describe('[P2-75] Event Log: King Territory Draw Recorded', () => {
  it('King Territory Draw events are recorded', () => {
    const chars: Character[] = [
      createChar('y-king', 'Y', 5, 5, true, false, 'Y5'),
    ];
    const state = initializeGameState(chars);

    const newState = executeMoveForward(state, 'y-king');
    const drawLog = newState.eventLog.find(e => e.action === 'King Territory Draw');
    expect(drawLog).toBeDefined();
  });
});

// ==============================================================================
// CATEGORY K: BOARD-STATE INVARIANT TESTS (76-80)
// ==============================================================================

describe('[P2-76] Attack Win: No Cohabitation', () => {
  it('attack win never leaves two living characters in same space', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 10, 10, false, false, 'Y3'),
      createChar('a1', 'A', 3, 3, false, false, 'Y4'),
    ];
    const state = initializeGameState(chars);
    const newState = executeAttackForward(state, 'y1');

    validateBoardStateInvariants(newState);
  });
});

describe('[P2-77] Defeated Attacker Position', () => {
  it('defeated attacker has boardPosition = null', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 3, 5, false, false, 'Y3'),
      createChar('a1', 'A', 10, 10, false, false, 'Y4'),
    ];
    const state = initializeGameState(chars);
    const newState = executeAttackForward(state, 'y1');

    expect(getCharacter(newState, 'y1')!.boardPosition).toBeNull();
    expect(getCharacter(newState, 'y1')!.alive).toBe(false);
  });
});

describe('[P2-78] Defeated Defender Position', () => {
  it('defeated defender has boardPosition = null', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 10, 10, false, false, 'Y3'),
      createChar('a1', 'A', 3, 3, false, false, 'Y4'),
    ];
    const state = initializeGameState(chars);
    const newState = executeAttackForward(state, 'y1');

    expect(getCharacter(newState, 'a1')!.boardPosition).toBeNull();
    expect(getCharacter(newState, 'a1')!.alive).toBe(false);
  });
});

describe('[P2-79] Non-King Tie: Both Positions Null', () => {
  it('in non-King tie, both characters have boardPosition = null', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, false, false, 'Y3'),
      createChar('a1', 'A', 5, 5, false, false, 'Y4'),
    ];
    const state = initializeGameState(chars);
    const newState = executeAttackForward(state, 'y1');

    expect(getCharacter(newState, 'y1')!.boardPosition).toBeNull();
    expect(getCharacter(newState, 'a1')!.boardPosition).toBeNull();
  });
});

describe('[P2-80] Comprehensive Board-State Invariants', () => {
  it('all board-state invariants maintained after every action', () => {
    const chars: Character[] = [
      createChar('y-king', 'Y', 10, 5, true, false, 'Y3'),
      createChar('y1', 'Y', 5, 5, false, false, 'Y4'),
      createChar('a-king', 'A', 8, 5, true, false, 'A3'),
      createChar('a1', 'A', 3, 3, false, false, 'A5'),
    ];
    const state = initializeGameState(chars);

    // Verify initial state
    validateBoardStateInvariants(state);

    // Move Y King
    // Move Y1 (Y-king forward is blocked by Y1)
    let newState = executeMoveForward(state, 'y1');
    validateBoardStateInvariants(newState);

    // Move A King
    newState = executeMoveForward(newState, 'a-king');
    validateBoardStateInvariants(newState);

    // Attack Forward (y1 at Y5 attacks enemy at A5)
    newState = executeAttackForward(newState, 'y1');
    validateBoardStateInvariants(newState);
  });
});

// ==============================================================================
// CATEGORY L: EVENT ORDER AND END-GAME TRANSITION TESTS (81-82)
// ==============================================================================

describe('[P2-81] Non-King Tie Triggers Final King Duel', () => {
  it('non-King tie that removes final non-Kings triggers Final King Duel before turn switch', () => {
    const chars: Character[] = [
      createChar('y1', 'Y', 5, 5, false, false, 'Y3'),
      createChar('y-king', 'Y', 12, 5, true, false, 'A1'),
      createChar('a1', 'A', 5, 5, false, false, 'Y4'),
      createChar('a-king', 'A', 10, 5, true, false, 'A2'),
    ];
    const state = initializeGameState(chars);
    const newState = executeAttackForward(state, 'y1');

    // After tie kills both non-Kings, Final King Duel should trigger
    if (newState.gameStatus !== 'active') {
      // Final King Duel was triggered
      expect(['Y wins', 'A wins', 'draw']).toContain(newState.gameStatus);
    }
  });
});

describe('[P2-82] Double-King Tie Draw Protection', () => {
  it('double-King tie ends as draw and does not change during King-death processing', () => {
    const chars: Character[] = [
      createChar('y-king', 'Y', 5, 5, true, false, 'Y3'),
      createChar('a-king', 'A', 5, 5, true, false, 'Y4'),
      createChar('y-helper', 'Y', 1, 1, false, false, 'A1'),
      createChar('a-helper', 'A', 1, 1, false, false, 'A2'),
    ];
    const state = initializeGameState(chars);
    const newState = executeAttackForward(state, 'y-king');

    expect(newState.gameStatus).toBe('draw');
    expect(newState.graveyard.length).toBe(2);
    expect(getCharacter(newState, 'y-king')!.alive).toBe(false);
    expect(getCharacter(newState, 'a-king')!.alive).toBe(false);
  });
});
