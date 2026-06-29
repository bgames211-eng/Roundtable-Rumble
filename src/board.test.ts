import { describe, it, expect } from 'vitest';
import {
  BOARD_PATH,
  getForwardSpace,
  getBackwardSpace,
  getTerritory,
  isEnemyTerritory,
  doesKingTerritoryDrawTrigger,
  canNormalAttack,
  canSelfDefend
} from './board';
import { moveKingAndCheckDraw } from './actions';

describe('Board path basic movement (1-10)', () => {
  it('forwards around the loop (1-10)', () => {
    expect(getForwardSpace('P1_1')).toBe('P1_2');
    expect(getForwardSpace('P1_2')).toBe('P1_3');
    expect(getForwardSpace('P1_3')).toBe('P1_4');
    expect(getForwardSpace('P1_4')).toBe('P1_5');
    expect(getForwardSpace('P1_5')).toBe('P2_5');
    expect(getForwardSpace('P2_5')).toBe('P2_4');
    expect(getForwardSpace('P2_4')).toBe('P2_3');
    expect(getForwardSpace('P2_3')).toBe('P2_2');
    expect(getForwardSpace('P2_2')).toBe('P2_1');
    expect(getForwardSpace('P2_1')).toBe('P1_1');
  });
});

describe('Backward movement (11-20)', () => {
  it('backwards around the loop (11-20)', () => {
    expect(getBackwardSpace('P1_1')).toBe('P2_1');
    expect(getBackwardSpace('P1_2')).toBe('P1_1');
    expect(getBackwardSpace('P1_3')).toBe('P1_2');
    expect(getBackwardSpace('P1_4')).toBe('P1_3');
    expect(getBackwardSpace('P1_5')).toBe('P1_4');
    expect(getBackwardSpace('P2_5')).toBe('P1_5');
    expect(getBackwardSpace('P2_4')).toBe('P2_5');
    expect(getBackwardSpace('P2_3')).toBe('P2_4');
    expect(getBackwardSpace('P2_2')).toBe('P2_3');
    expect(getBackwardSpace('P2_1')).toBe('P2_2');
  });
});

describe('Territory crossing explicit checks (21-24)', () => {
  it('Y5->A5 and A1->Y1 are crossings and others are not', () => {
    expect(getTerritory('P1_5')).toBe('P1');
    expect(getTerritory('P2_5')).toBe('P2');
    expect(getTerritory('P2_1')).toBe('P2');
    expect(getTerritory('P1_1')).toBe('P1');

    // crossing cases
    expect(isEnemyTerritory('P1', 'P2_5')).toBe(true);
    expect(isEnemyTerritory('P2', 'P1_1')).toBe(true);

    // non-crossing one-space forwards (example: Y1->Y2)
    expect(isEnemyTerritory('P1', getForwardSpace('P1_1'))).toBe(false);
  });
});

describe('Attack and self-defend adjacency (25-28)', () => {
  it('can attack directly forward only and self-defend directly behind only', () => {
    expect(canNormalAttack('P1_2','P1','P1_3','P2')).toBe(true);
    expect(canNormalAttack('P1_2','P1','P1_4','P2')).toBe(false);

    expect(canSelfDefend('P1_3','P1','P1_2','P2')).toBe(true);
    expect(canSelfDefend('P1_3','P1','P1_1','P2')).toBe(false);
  });
});

describe('King starting positions (29-30)', () => {
  it('kings start in Y3 and A3 and follow loop', () => {
    expect(getTerritory('P1_3')).toBe('P1');
    expect(getTerritory('P2_3')).toBe('P2');
    expect(getForwardSpace('P1_3')).toBe('P1_4');
    expect(getForwardSpace('P2_3')).toBe('P2_2');
  });
});

describe('Consistency checks (31-32)', () => {
  it('forward then backward returns same space', () => {
    for (const s of BOARD_PATH) {
      expect(getBackwardSpace(getForwardSpace(s))).toBe(s);
      expect(getForwardSpace(getBackwardSpace(s))).toBe(s);
    }
  });
});

describe('King Territory Draw core tests (33-37, 52-54 and additions)', () => {
  it('King crossing via forward draws (33,34)', () => {
    expect(doesKingTerritoryDrawTrigger('P1', true, 'P1_5','P2_5')).toBe(true);
    expect(doesKingTerritoryDrawTrigger('P2', true, 'P2_1','P1_1')).toBe(true);
  });

  it('non-king crossing does not draw (35)', () => {
    expect(doesKingTerritoryDrawTrigger('P1', false, 'P1_5','P2_5')).toBe(false);
  });

  it('king moving within own or enemy territory does not draw (36,37)', () => {
    expect(doesKingTerritoryDrawTrigger('P1', true, 'P1_3','P1_4')).toBe(false);
    expect(doesKingTerritoryDrawTrigger('P1', true, 'P2_4','P2_3')).toBe(false);
  });

  it('king defeats enemy and moves into enemy draws exactly 1 (52,53)', () => {
    // simulate winning attack that moves king into enemy space
    expect(moveKingAndCheckDraw('P1','P1_5','P2_5')).toBe(true);
    expect(moveKingAndCheckDraw('P2','P2_1','P1_1')).toBe(true);
  });

  it('king attacks across border but loses or ties does not move and draws no card (54)', () => {
    // losing or tying: king does not relocate -> endSpace == startSpace
    expect(doesKingTerritoryDrawTrigger('P1', true, 'P1_5','P1_5')).toBe(false);
  });

  it('backward king moves crossing draws', () => {
    expect(doesKingTerritoryDrawTrigger('P1', true, 'P1_1','P2_1')).toBe(true);
    expect(doesKingTerritoryDrawTrigger('P2', true, 'P2_5','P1_5')).toBe(true);
  });

  it('portal and teleport style moves trigger when crossing from own->enemy', () => {
    expect(doesKingTerritoryDrawTrigger('P1', true, 'P1_2','P2_3')).toBe(true);
    expect(doesKingTerritoryDrawTrigger('P2', true, 'P2_4','P1_2')).toBe(true);
  });

  it('king moved by opponent effect into enemy territory still draws', () => {
    expect(doesKingTerritoryDrawTrigger('P1', true, 'P1_4','P2_4')).toBe(true);
  });

  it('king moved from enemy back into own draws no card', () => {
    expect(doesKingTerritoryDrawTrigger('P1', true, 'P2_4','P1_4')).toBe(false);
  });

  it('king moved within enemy territory draws no card', () => {
    expect(doesKingTerritoryDrawTrigger('P1', true, 'P2_5','P2_4')).toBe(false);
  });

  it('one relocation effect cannot award more than 1 card (single evaluation)', () => {
    // evaluate same relocation only once
    const triggered = doesKingTerritoryDrawTrigger('P1', true, 'P1_5','P2_5');
    expect(triggered).toBe(true);
    // subsequent re-eval of same move doesn't produce a different boolean
    expect(doesKingTerritoryDrawTrigger('P1', true, 'P1_5','P2_5')).toBe(true);
  });
});

describe('Attack/self-defend target rules (38-41,48-51)', () => {
  it('attack targets ENEMY directly forward only', () => {
    expect(canNormalAttack('P1_2','P1','P1_3','P2')).toBe(true);
    expect(canNormalAttack('P1_2','P1','P1_3','P1')).toBe(false);
  });

  it('self-defend targets ENEMY directly behind only', () => {
    expect(canSelfDefend('P1_3','P1','P1_2','P2')).toBe(true);
    expect(canSelfDefend('P1_3','P1','P1_2','P1')).toBe(false);
  });

  it('allied forward cannot be attacked and allied behind cannot be self-defended', () => {
    expect(canNormalAttack('P1_2','P1','P1_3','P1')).toBe(false);
    expect(canSelfDefend('P1_3','P1','P1_2','P1')).toBe(false);
  });
});
