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
    expect(getForwardSpace('Y1')).toBe('Y2');
    expect(getForwardSpace('Y2')).toBe('Y3');
    expect(getForwardSpace('Y3')).toBe('Y4');
    expect(getForwardSpace('Y4')).toBe('Y5');
    expect(getForwardSpace('Y5')).toBe('A5');
    expect(getForwardSpace('A5')).toBe('A4');
    expect(getForwardSpace('A4')).toBe('A3');
    expect(getForwardSpace('A3')).toBe('A2');
    expect(getForwardSpace('A2')).toBe('A1');
    expect(getForwardSpace('A1')).toBe('Y1');
  });
});

describe('Backward movement (11-20)', () => {
  it('backwards around the loop (11-20)', () => {
    expect(getBackwardSpace('Y1')).toBe('A1');
    expect(getBackwardSpace('Y2')).toBe('Y1');
    expect(getBackwardSpace('Y3')).toBe('Y2');
    expect(getBackwardSpace('Y4')).toBe('Y3');
    expect(getBackwardSpace('Y5')).toBe('Y4');
    expect(getBackwardSpace('A5')).toBe('Y5');
    expect(getBackwardSpace('A4')).toBe('A5');
    expect(getBackwardSpace('A3')).toBe('A4');
    expect(getBackwardSpace('A2')).toBe('A3');
    expect(getBackwardSpace('A1')).toBe('A2');
  });
});

describe('Territory crossing explicit checks (21-24)', () => {
  it('Y5->A5 and A1->Y1 are crossings and others are not', () => {
    expect(getTerritory('Y5')).toBe('Y');
    expect(getTerritory('A5')).toBe('A');
    expect(getTerritory('A1')).toBe('A');
    expect(getTerritory('Y1')).toBe('Y');

    // crossing cases
    expect(isEnemyTerritory('Y', 'A5')).toBe(true);
    expect(isEnemyTerritory('A', 'Y1')).toBe(true);

    // non-crossing one-space forwards (example: Y1->Y2)
    expect(isEnemyTerritory('Y', getForwardSpace('Y1'))).toBe(false);
  });
});

describe('Attack and self-defend adjacency (25-28)', () => {
  it('can attack directly forward only and self-defend directly behind only', () => {
    expect(canNormalAttack('Y2','Y','Y3','A')).toBe(true);
    expect(canNormalAttack('Y2','Y','Y4','A')).toBe(false);

    expect(canSelfDefend('Y3','Y','Y2','A')).toBe(true);
    expect(canSelfDefend('Y3','Y','Y1','A')).toBe(false);
  });
});

describe('King starting positions (29-30)', () => {
  it('kings start in Y3 and A3 and follow loop', () => {
    expect(getTerritory('Y3')).toBe('Y');
    expect(getTerritory('A3')).toBe('A');
    expect(getForwardSpace('Y3')).toBe('Y4');
    expect(getForwardSpace('A3')).toBe('A2');
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
    expect(doesKingTerritoryDrawTrigger('Y', true, 'Y5','A5')).toBe(true);
    expect(doesKingTerritoryDrawTrigger('A', true, 'A1','Y1')).toBe(true);
  });

  it('non-king crossing does not draw (35)', () => {
    expect(doesKingTerritoryDrawTrigger('Y', false, 'Y5','A5')).toBe(false);
  });

  it('king moving within own or enemy territory does not draw (36,37)', () => {
    expect(doesKingTerritoryDrawTrigger('Y', true, 'Y3','Y4')).toBe(false);
    expect(doesKingTerritoryDrawTrigger('Y', true, 'A4','A3')).toBe(false);
  });

  it('king defeats enemy and moves into enemy draws exactly 1 (52,53)', () => {
    // simulate winning attack that moves king into enemy space
    expect(moveKingAndCheckDraw('Y','Y5','A5')).toBe(true);
    expect(moveKingAndCheckDraw('A','A1','Y1')).toBe(true);
  });

  it('king attacks across border but loses or ties does not move and draws no card (54)', () => {
    // losing or tying: king does not relocate -> endSpace == startSpace
    expect(doesKingTerritoryDrawTrigger('Y', true, 'Y5','Y5')).toBe(false);
  });

  it('backward king moves crossing draws', () => {
    expect(doesKingTerritoryDrawTrigger('Y', true, 'Y1','A1')).toBe(true);
    expect(doesKingTerritoryDrawTrigger('A', true, 'A5','Y5')).toBe(true);
  });

  it('portal and teleport style moves trigger when crossing from own->enemy', () => {
    expect(doesKingTerritoryDrawTrigger('Y', true, 'Y2','A3')).toBe(true);
    expect(doesKingTerritoryDrawTrigger('A', true, 'A4','Y2')).toBe(true);
  });

  it('king moved by opponent effect into enemy territory still draws', () => {
    expect(doesKingTerritoryDrawTrigger('Y', true, 'Y4','A4')).toBe(true);
  });

  it('king moved from enemy back into own draws no card', () => {
    expect(doesKingTerritoryDrawTrigger('Y', true, 'A4','Y4')).toBe(false);
  });

  it('king moved within enemy territory draws no card', () => {
    expect(doesKingTerritoryDrawTrigger('Y', true, 'A5','A4')).toBe(false);
  });

  it('one relocation effect cannot award more than 1 card (single evaluation)', () => {
    // evaluate same relocation only once
    const triggered = doesKingTerritoryDrawTrigger('Y', true, 'Y5','A5');
    expect(triggered).toBe(true);
    // subsequent re-eval of same move doesn't produce a different boolean
    expect(doesKingTerritoryDrawTrigger('Y', true, 'Y5','A5')).toBe(true);
  });
});

describe('Attack/self-defend target rules (38-41,48-51)', () => {
  it('attack targets ENEMY directly forward only', () => {
    expect(canNormalAttack('Y2','Y','Y3','A')).toBe(true);
    expect(canNormalAttack('Y2','Y','Y3','Y')).toBe(false);
  });

  it('self-defend targets ENEMY directly behind only', () => {
    expect(canSelfDefend('Y3','Y','Y2','A')).toBe(true);
    expect(canSelfDefend('Y3','Y','Y2','Y')).toBe(false);
  });

  it('allied forward cannot be attacked and allied behind cannot be self-defended', () => {
    expect(canNormalAttack('Y2','Y','Y3','Y')).toBe(false);
    expect(canSelfDefend('Y3','Y','Y2','Y')).toBe(false);
  });
});
