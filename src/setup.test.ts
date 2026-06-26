import { describe, it, expect } from 'vitest';
import { ALPHA_1_CHARACTER_DEFINITIONS } from './cardDefinitions';
import { createStandardGameSetup, getPlayerGameView } from './setup';

function sequenceRandom(values: number[]): () => number {
  let idx = 0;
  return () => {
    const next = values[idx % values.length];
    idx += 1;
    return next;
  };
}

function getOrderedInstanceIds(state: ReturnType<typeof createStandardGameSetup>): string[] {
  const boardOrder = ['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'A1', 'A2', 'A3', 'A4', 'A5'] as const;
  const boardIds = boardOrder.map(
    space => state.characters.find(ch => ch.boardPosition === space)?.id ?? 'missing',
  );
  const deckIds = state.characterDeck.map(card => card.instanceId);
  return [...boardIds, ...deckIds];
}

describe('Phase 3A Card Definitions', () => {
  it('contains all 16 exact approved Alpha definitions and fixed stats', () => {
    const expected = [
      { definitionId: 'alpha-001', displayName: 'BRENDAN', printedATK: 5, printedDEF: 4 },
      { definitionId: 'alpha-002', displayName: 'LUKE', printedATK: 4, printedDEF: 3 },
      { definitionId: 'alpha-003', displayName: 'JOHN CENA', printedATK: 6, printedDEF: 7 },
      { definitionId: 'alpha-004', displayName: 'BATMAN', printedATK: 7, printedDEF: 6 },
      { definitionId: 'alpha-005', displayName: 'BAXTER', printedATK: 6, printedDEF: 7 },
      { definitionId: 'alpha-006', displayName: 'SPIDER-MAN', printedATK: 7, printedDEF: 8 },
      { definitionId: 'alpha-007', displayName: 'KEITH', printedATK: 8, printedDEF: 7 },
      { definitionId: 'alpha-008', displayName: 'HULK', printedATK: 8, printedDEF: 8 },
      { definitionId: 'alpha-009', displayName: 'RICK GRIMES', printedATK: 9, printedDEF: 8 },
      { definitionId: 'alpha-010', displayName: 'DARYL DIXON', printedATK: 7, printedDEF: 7 },
      { definitionId: 'alpha-011', displayName: 'NEBULA', printedATK: 7, printedDEF: 6 },
      { definitionId: 'alpha-012', displayName: 'GAMORA', printedATK: 8, printedDEF: 7.5 },
      { definitionId: 'alpha-013', displayName: 'LARRY', printedATK: 8, printedDEF: 7.5 },
      { definitionId: 'alpha-014', displayName: 'PATRICK', printedATK: 6, printedDEF: 9 },
      { definitionId: 'alpha-015', displayName: 'SANDY CHEEKS', printedATK: 9, printedDEF: 7 },
      { definitionId: 'alpha-016', displayName: 'TOPH', printedATK: 9, printedDEF: 9 },
    ];

    expect(ALPHA_1_CHARACTER_DEFINITIONS).toHaveLength(16);
    expect(
      ALPHA_1_CHARACTER_DEFINITIONS.map(def => ({
        definitionId: def.definitionId,
        displayName: def.displayName,
        printedATK: def.printedATK,
        printedDEF: def.printedDEF,
      })),
    ).toEqual(expected);

    for (const def of ALPHA_1_CHARACTER_DEFINITIONS) {
      expect(def.ability).toBeNull();
      expect(def.statRule).toBeNull();
      expect(def.imageKey.length).toBeGreaterThan(0);
    }
  });
});

describe('Phase 3A Standard Setup', () => {
  it('shuffles deterministically with injected random function', () => {
    const rngValues = [0.1, 0.9, 0.3, 0.2, 0.8, 0.55, 0.44, 0.66, 0.12, 0.77, 0.5, 0.25, 0.75, 0.33, 0.67, 0.42];
    const stateA = createStandardGameSetup('Y', sequenceRandom(rngValues));
    const stateB = createStandardGameSetup('Y', sequenceRandom(rngValues));
    expect(getOrderedInstanceIds(stateA)).toEqual(getOrderedInstanceIds(stateB));
  });

  it('deals exactly 10 cards and keeps exactly 6 cards in hidden character deck', () => {
    const state = createStandardGameSetup('Y', sequenceRandom([0.5]));
    expect(state.characters).toHaveLength(10);
    expect(state.characterDeck).toHaveLength(6);

    const allInstanceIds = new Set([
      ...state.characters.map(ch => ch.id),
      ...state.characterDeck.map(card => card.instanceId),
    ]);
    expect(allInstanceIds.size).toBe(16);
  });

  it('fills every standard board setup space at setup', () => {
    const state = createStandardGameSetup('Y', sequenceRandom([0.25]));
    const setupSpaces = ['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'A1', 'A2', 'A3', 'A4', 'A5'];
    for (const space of setupSpaces) {
      expect(state.characters.some(ch => ch.boardPosition === space)).toBe(true);
    }
  });

  it('assigns Kings by position: Y3 and A3', () => {
    const state = createStandardGameSetup('Y', sequenceRandom([0.75]));
    const y3 = state.characters.find(ch => ch.boardPosition === 'Y3');
    const a3 = state.characters.find(ch => ch.boardPosition === 'A3');
    expect(y3?.isKing).toBe(true);
    expect(a3?.isKing).toBe(true);
    expect(state.characters.filter(ch => ch.isKing)).toHaveLength(2);
  });

  it('starts all dealt characters as alive and unrevealed', () => {
    const state = createStandardGameSetup('Y', sequenceRandom([0.6]));
    for (const ch of state.characters) {
      expect(ch.alive).toBe(true);
      expect(ch.revealed).toBe(false);
    }
  });

  it('player-safe view hides unrevealed identity, stats, definition, ability, and deck order', () => {
    const state = createStandardGameSetup('Y', sequenceRandom([0.4]));
    const view = getPlayerGameView(state);

    expect(view.characterDeck.remainingCount).toBe(6);
    expect('cards' in view.characterDeck).toBe(false);
    expect('characterDeckOrder' in view).toBe(false);

    for (const card of view.boardCards) {
      expect(card.revealed).toBe(false);
      expect('displayName' in card).toBe(false);
      expect('ATK' in card).toBe(false);
      expect('DEF' in card).toBe(false);
      expect('definitionId' in card).toBe(false);
      expect('ability' in card).toBe(false);
    }
  });

  it('player-safe view reveals identity and stats when a card is revealed', () => {
    const state = createStandardGameSetup('Y', sequenceRandom([0.11]));
    const targetId = state.characters[0].id;

    const revealedState = {
      ...state,
      characters: state.characters.map(ch => (ch.id === targetId ? { ...ch, revealed: true } : ch)),
    };

    const view = getPlayerGameView(revealedState);
    const target = view.boardCards.find(card => card.instanceId === targetId);

    expect(target?.revealed).toBe(true);
    expect(target?.displayName).toBeDefined();
    expect(target?.ATK).toBeDefined();
    expect(target?.DEF).toBeDefined();
    expect(target?.definitionId).toBeDefined();
  });

  it('starts each player with 3 Power Card placeholders and drawCount preserved at 0', () => {
    const state = createStandardGameSetup('Y', sequenceRandom([0.22]));
    expect(state.powerCardHandCount).toEqual({ Y: 3, A: 3 });
    expect(state.drawCount).toEqual({ Y: 0, A: 0 });
  });

  it('respects explicitly chosen first player', () => {
    const yFirst = createStandardGameSetup('Y', sequenceRandom([0.15]));
    const aFirst = createStandardGameSetup('A', sequenceRandom([0.15]));
    expect(yFirst.activePlayer).toBe('Y');
    expect(aFirst.activePlayer).toBe('A');
  });
});
