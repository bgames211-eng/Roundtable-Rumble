import { describe, it, expect } from 'vitest';
import { ALPHA_1_CHARACTER_DEFINITIONS } from './cardDefinitions';
import { FIRST_ALPHA_POWER_CARD_DEFINITIONS, buildFirstAlphaPowerCardDeck } from './powerCards';
import {
  advanceSessionDeckPools,
  createInitialSessionDeckPools,
  createMultiGameSessionSetup,
  createStandardGameSetup,
  getPlayerGameView,
  getPrivatePowerCardHand,
} from './setup';
import { initializeGameState, type Character } from './gameState';

function sequenceRandom(values: number[]): () => number {
  let idx = 0;
  return () => {
    const next = values[idx % values.length];
    idx += 1;
    return next;
  };
}

function getOrderedInstanceIds(state: ReturnType<typeof createStandardGameSetup>): string[] {
  const boardOrder = ['P1_1', 'P1_2', 'P1_3', 'P1_4', 'P1_5', 'P2_1', 'P2_2', 'P2_3', 'P2_4', 'P2_5'] as const;
  const boardIds = boardOrder.map(
    space => state.characters.find(ch => ch.boardPosition === space)?.id ?? 'missing',
  );
  const deckIds = state.characterDeck.map(card => card.instanceId);
  return [...boardIds, ...deckIds];
}

describe('Phase 3A Card Definitions', () => {
  it('contains the expanded supported character definition pool and fixed stats', () => {
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
      { definitionId: 'alpha-017', displayName: 'CEDI OSMAN', printedATK: 6, printedDEF: 5 },
      { definitionId: 'alpha-018', displayName: 'LEGO CAP / CAPTAIN AMERICA', printedATK: 3, printedDEF: 2 },
      { definitionId: 'alpha-019', displayName: 'THE PENGUIN', printedATK: 2, printedDEF: 9 },
      { definitionId: 'alpha-020', displayName: 'MR. FREEZE', printedATK: 9, printedDEF: 9 },
      { definitionId: 'alpha-021', displayName: 'BOB', printedATK: 10, printedDEF: 10 },
      { definitionId: 'alpha-022', displayName: 'SOKKA', printedATK: 6, printedDEF: 5 },
      { definitionId: 'alpha-023', displayName: 'ZUKO', printedATK: 8, printedDEF: 7 },
      { definitionId: 'alpha-024', displayName: 'GENGHIS KHAN', printedATK: 8, printedDEF: 8 },
      { definitionId: 'alpha-025', displayName: 'KOOL-AID MAN', printedATK: 10, printedDEF: 1 },
      { definitionId: 'alpha-026', displayName: 'ROOMBA', printedATK: 5, printedDEF: 6 },
      { definitionId: 'alpha-027', displayName: 'NIGHTCRAWLER', printedATK: 6.5, printedDEF: 7 },
      { definitionId: 'alpha-028', displayName: 'RAPUNZEL', printedATK: 5, printedDEF: 7 },
      { definitionId: 'alpha-029', displayName: 'MRS. PUFF', printedATK: 1, printedDEF: 10 },
      { definitionId: 'alpha-030', displayName: 'SPONGEBOB', printedATK: 4, printedDEF: 8 },
      { definitionId: 'alpha-031', displayName: 'ANT', printedATK: 1, printedDEF: 1 },
      { definitionId: 'alpha-032', displayName: 'CARL GRIMES', printedATK: 5.5, printedDEF: 5 },
      { definitionId: 'alpha-033', displayName: 'RIDDLER', printedATK: 0, printedDEF: 0 },
      { definitionId: 'alpha-034', displayName: 'UNCLE IROH', printedATK: 9, printedDEF: 7 },
      { definitionId: 'alpha-035', displayName: 'JEREMY JAHNS', printedATK: 6, printedDEF: 6.5 },
      { definitionId: 'alpha-036', displayName: 'SKAR PRODUCTIONS', printedATK: 7.5, printedDEF: 6 },
      { definitionId: 'alpha-037', displayName: 'BIRD', printedATK: 2, printedDEF: 2 },
      { definitionId: 'alpha-038', displayName: 'AVATAR AANG', printedATK: 8.5, printedDEF: 8.5 },
      { definitionId: 'alpha-039', displayName: 'THANOS', printedATK: 10, printedDEF: 10 },
      { definitionId: 'alpha-040', displayName: 'HEISENBERG', printedATK: 8, printedDEF: 6 },
      { definitionId: 'alpha-041', displayName: 'HANK SCHRADER', printedATK: 7, printedDEF: 5 },
      { definitionId: 'alpha-042', displayName: 'FRENCH TOAST', printedATK: 5, printedDEF: 2 },
      { definitionId: 'alpha-043', displayName: 'CHICKEN SANDWICH', printedATK: 3, printedDEF: 3 },
      { definitionId: 'alpha-044', displayName: 'GRILLED CHEESE 2', printedATK: 4, printedDEF: 1 },
      { definitionId: 'alpha-045', displayName: 'INDIANA JONES', printedATK: 6, printedDEF: 6 },
      { definitionId: 'alpha-046', displayName: 'MIRROR', printedATK: 0, printedDEF: 0 },
    ];

    expect(ALPHA_1_CHARACTER_DEFINITIONS).toHaveLength(46);
    expect(
      ALPHA_1_CHARACTER_DEFINITIONS.map(def => ({
        definitionId: def.definitionId,
        displayName: def.displayName,
        printedATK: def.printedATK,
        printedDEF: def.printedDEF,
      })),
    ).toEqual(expected);

    for (const def of ALPHA_1_CHARACTER_DEFINITIONS) {
      if (def.definitionId === 'alpha-033') {
        expect(def.statRule).toContain('bottom Character Card');
      } else if (def.definitionId === 'alpha-046') {
        expect(def.statRule).toContain('Mirror ATK equals the opponent main battler ATK');
      } else {
        expect(def.statRule).toBeNull();
      }
      expect(def.imageKey.length).toBeGreaterThan(0);
    }

    const genghis = ALPHA_1_CHARACTER_DEFINITIONS.find(def => def.definitionId === 'alpha-024');
    expect(genghis?.ability).toContain('Mongol Empire');
  });
});

describe('Phase 3A Standard Setup', () => {
  it('shuffles deterministically with injected random function', () => {
    const rngValues = [0.1, 0.9, 0.3, 0.2, 0.8, 0.55, 0.44, 0.66, 0.12, 0.77, 0.5, 0.25, 0.75, 0.33, 0.67, 0.42];
    const stateA = createStandardGameSetup('P1', sequenceRandom(rngValues));
    const stateB = createStandardGameSetup('P1', sequenceRandom(rngValues));
    expect(getOrderedInstanceIds(stateA)).toEqual(getOrderedInstanceIds(stateB));
  });

  it('deals exactly 10 cards and keeps the remaining expanded pool in hidden character deck', () => {
    const state = createStandardGameSetup('P1', sequenceRandom([0.5]));
    const totalPowerCards = FIRST_ALPHA_POWER_CARD_DEFINITIONS.reduce((sum, card) => sum + card.alphaDeckCount, 0);
    expect(state.characters).toHaveLength(10);
    expect(state.characterDeck).toHaveLength(ALPHA_1_CHARACTER_DEFINITIONS.length - 10);
    expect(state.powerCardHands.P1).toHaveLength(3);
    expect(state.powerCardHands.P2).toHaveLength(3);
    expect(state.powerCardDeck).toHaveLength(totalPowerCards - 6);

    const allInstanceIds = new Set([
      ...state.characters.map(ch => ch.id),
      ...state.characterDeck.map(card => card.instanceId),
    ]);
    expect(allInstanceIds.size).toBe(ALPHA_1_CHARACTER_DEFINITIONS.length);

    const allPowerIds = new Set([
      ...state.powerCardHands.P1.map(card => card.instanceId),
      ...state.powerCardHands.P2.map(card => card.instanceId),
      ...state.powerCardDeck.map(card => card.instanceId),
    ]);
    expect(allPowerIds.size).toBe(totalPowerCards);
  });

  it('fills every standard board setup space at setup', () => {
    const state = createStandardGameSetup('P1', sequenceRandom([0.25]));
    const setupSpaces = ['P1_1', 'P1_2', 'P1_3', 'P1_4', 'P1_5', 'P2_1', 'P2_2', 'P2_3', 'P2_4', 'P2_5'];
    for (const space of setupSpaces) {
      expect(state.characters.some(ch => ch.boardPosition === space)).toBe(true);
    }
  });

  it('assigns Kings by position: Y3 and A3', () => {
    const state = createStandardGameSetup('P1', sequenceRandom([0.75]));
    const y3 = state.characters.find(ch => ch.boardPosition === 'P1_3');
    const a3 = state.characters.find(ch => ch.boardPosition === 'P2_3');
    expect(y3?.isKing).toBe(true);
    expect(a3?.isKing).toBe(true);
    expect(state.characters.filter(ch => ch.isKing)).toHaveLength(2);
  });

  it('starts all dealt characters as alive and unrevealed', () => {
    const state = createStandardGameSetup('P1', sequenceRandom([0.6]));
    for (const ch of state.characters) {
      expect(ch.alive).toBe(true);
      expect(ch.revealed).toBe(false);
    }
  });

  it('player-safe view hides unrevealed identity, stats, definition, ability, and deck order', () => {
    const state = createStandardGameSetup('P1', sequenceRandom([0.4]));
    const totalPowerCards = FIRST_ALPHA_POWER_CARD_DEFINITIONS.reduce((sum, card) => sum + card.alphaDeckCount, 0);
    const view = getPlayerGameView(state);

    expect(view.characterDeck.remainingCount).toBe(ALPHA_1_CHARACTER_DEFINITIONS.length - 10);
    expect('cards' in view.characterDeck).toBe(false);
    expect('characterDeckOrder' in view).toBe(false);
    expect(view.powerCardHandCount).toEqual({ P1: 3, P2: 3 });
    expect(view.powerCards.remainingDeckCount).toBe(totalPowerCards - 6);
    expect(view.powerCards.usedPileCount).toBe(0);

    for (const card of view.boardCards) {
      expect(card.revealed).toBe(false);
      expect('displayName' in card).toBe(false);
      expect('ATK' in card).toBe(false);
      expect('DEF' in card).toBe(false);
      expect('definitionId' in card).toBe(false);
      expect('ability' in card).toBe(false);
    }

    const serializedView = JSON.stringify(view);
    expect(serializedView).not.toContain('power-');
    expect(serializedView).not.toContain('power-alpha-');
    expect(serializedView).not.toContain('SUPER BAT');
    expect('powerCardDeck' in (view as unknown as Record<string, unknown>)).toBe(false);
    expect('powerCardHands' in (view as unknown as Record<string, unknown>)).toBe(false);
  });

  it('player-safe view reveals identity and stats when a card is revealed', () => {
    const state = createStandardGameSetup('P1', sequenceRandom([0.11]));
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

  it('player-safe view applies attachment stat boosts and normalizes legacy Space Stone values', () => {
    const state = initializeGameState([
      {
        id: 'jeremy',
        controller: 'P1',
        ATK: 6,
        DEF: 6.5,
        isKing: false,
        boardPosition: 'P1_2',
        revealed: true,
        alive: true,
        displayName: 'JEREMY JAHNS',
        attachments: [
          {
            instanceId: 'space-legacy',
            definitionId: 'power-alpha-027',
            displayName: 'SPACE STONE',
            category: 'weapon',
            ATK: 2,
            DEF: 0,
            specialUsed: false,
          },
          {
            instanceId: 'batarang',
            definitionId: 'power-alpha-013',
            displayName: 'BATARANG',
            category: 'weapon',
            ATK: 3,
            DEF: 1,
            specialUsed: false,
          },
        ],
      } as Character,
      {
        id: 'p1-king',
        controller: 'P1',
        ATK: 8,
        DEF: 8,
        isKing: true,
        boardPosition: 'P1_3',
        revealed: false,
        alive: true,
        displayName: 'P1 KING',
      } as Character,
      {
        id: 'p2-king',
        controller: 'P2',
        ATK: 8,
        DEF: 8,
        isKing: true,
        boardPosition: 'P2_3',
        revealed: false,
        alive: true,
        displayName: 'P2 KING',
      } as Character,
    ]);

    const view = getPlayerGameView(state);
    const jeremy = view.boardCards.find(card => card.instanceId === 'jeremy');

    expect(jeremy?.ATK).toBe(11);
    expect(jeremy?.DEF).toBe(9.5);
    const normalizedSpace = jeremy?.attachments?.find(attachment => attachment.definitionId === 'power-alpha-027');
    expect(normalizedSpace?.ATK).toBe(2);
    expect(normalizedSpace?.DEF).toBe(2);
  });

  it('Rick and Carl gain +2 while Rick is alive/revealed, and Rick keeps +2 after Carl is defeated', () => {
    const state = initializeGameState([
      {
        id: 'rick',
        controller: 'P1',
        ATK: 9,
        DEF: 8,
        isKing: false,
        boardPosition: 'P1_2',
        revealed: false,
        alive: true,
        displayName: 'RICK GRIMES',
      } as Character,
      {
        id: 'carl',
        controller: 'P1',
        ATK: 5.5,
        DEF: 5,
        isKing: false,
        boardPosition: 'P1_4',
        revealed: false,
        alive: true,
        displayName: 'CARL GRIMES',
      } as Character,
      {
        id: 'p1-king',
        controller: 'P1',
        ATK: 8,
        DEF: 8,
        isKing: true,
        boardPosition: 'P1_3',
        revealed: false,
        alive: true,
        displayName: 'P1 KING',
      } as Character,
      {
        id: 'p2-king',
        controller: 'P2',
        ATK: 8,
        DEF: 8,
        isKing: true,
        boardPosition: 'P2_3',
        revealed: false,
        alive: true,
        displayName: 'P2 KING',
      } as Character,
      {
        id: 'p2-other',
        controller: 'P2',
        ATK: 6,
        DEF: 6,
        isKing: false,
        boardPosition: 'P2_4',
        revealed: false,
        alive: true,
        displayName: 'Opponent',
      } as Character,
    ]);

    const rick = state.characters.find(character => character.id === 'rick');
    const carl = state.characters.find(character => character.id === 'carl');

    const onlyRickRevealed = {
      ...state,
      characters: state.characters.map(character => (
        character.id === rick?.id
          ? { ...character, revealed: true }
          : character
      )),
    };

    const noBonusBeforeCarlReveal = getPlayerGameView(onlyRickRevealed);
    const noBonusRickBeforeCarlReveal = noBonusBeforeCarlReveal.boardCards.find(card => card.instanceId === 'rick');
    expect(noBonusRickBeforeCarlReveal?.ATK).toBe(rick?.ATK);
    expect(noBonusRickBeforeCarlReveal?.DEF).toBe(rick?.DEF);
    expect(noBonusRickBeforeCarlReveal?.statRule ?? '').not.toContain('+2 ATK / +2 DEF');

    const bothRevealed = {
      ...state,
      characters: state.characters.map(character => {
        if (character.id === rick?.id || character.id === carl?.id) {
          return { ...character, revealed: true };
        }
        return character;
      }),
    };

    const boostedView = getPlayerGameView(bothRevealed);
    const boostedRick = boostedView.boardCards.find(card => card.instanceId === 'rick');
    const boostedCarl = boostedView.boardCards.find(card => card.instanceId === 'carl');

    expect(boostedRick?.ATK).toBe((rick?.ATK ?? 0) + 2);
    expect(boostedRick?.DEF).toBe((rick?.DEF ?? 0) + 2);
    expect(boostedCarl?.ATK).toBe((carl?.ATK ?? 0) + 2);
    expect(boostedCarl?.DEF).toBe((carl?.DEF ?? 0) + 2);
    expect(boostedRick?.statRule).toContain('+2 ATK / +2 DEF');
    expect(boostedCarl?.statRule).toContain('+2 ATK / +2 DEF');

    const carlDefeated = {
      ...bothRevealed,
      characters: bothRevealed.characters.map(character => (
        character.id === carl?.id
          ? { ...character, alive: false, boardPosition: null }
          : character
      )),
    };

    const postCarlDefeatView = getPlayerGameView(carlDefeated);
    const postCarlDefeatRick = postCarlDefeatView.boardCards.find(card => card.instanceId === 'rick');
    expect(postCarlDefeatRick?.ATK).toBe((rick?.ATK ?? 0) + 2);
    expect(postCarlDefeatRick?.DEF).toBe((rick?.DEF ?? 0) + 2);
    expect(postCarlDefeatRick?.statRule ?? '').toContain('+2 ATK / +2 DEF');
  });

  it('Rick and Carl gain +2 ATK/DEF even when on opposing controllers if both are alive and revealed', () => {
    const state = initializeGameState([
      {
        id: 'rick',
        controller: 'P1',
        ATK: 9,
        DEF: 8,
        isKing: false,
        boardPosition: 'P1_2',
        revealed: true,
        alive: true,
        displayName: 'RICK GRIMES',
      } as Character,
      {
        id: 'carl',
        controller: 'P2',
        ATK: 5.5,
        DEF: 5,
        isKing: false,
        boardPosition: 'P2_2',
        revealed: true,
        alive: true,
        displayName: 'CARL GRIMES',
      } as Character,
      {
        id: 'p1-king',
        controller: 'P1',
        ATK: 8,
        DEF: 8,
        isKing: true,
        boardPosition: 'P1_3',
        revealed: false,
        alive: true,
        displayName: 'P1 KING',
      } as Character,
      {
        id: 'p2-king',
        controller: 'P2',
        ATK: 8,
        DEF: 8,
        isKing: true,
        boardPosition: 'P2_3',
        revealed: false,
        alive: true,
        displayName: 'P2 KING',
      } as Character,
    ]);

    const view = getPlayerGameView(state);
    const rick = view.boardCards.find(card => card.instanceId === 'rick');
    const carl = view.boardCards.find(card => card.instanceId === 'carl');

    expect(rick?.ATK).toBe(11);
    expect(rick?.DEF).toBe(10);
    expect(carl?.ATK).toBe(7.5);
    expect(carl?.DEF).toBe(7);
    expect(rick?.statRule ?? '').toContain('+2 ATK / +2 DEF');
    expect(carl?.statRule ?? '').toContain('+2 ATK / +2 DEF');
  });

  it('starts each player with 3 actual Power Cards and drawCount preserved at 0', () => {
    const state = createStandardGameSetup('P1', sequenceRandom([0.22]));
    const totalPowerCards = FIRST_ALPHA_POWER_CARD_DEFINITIONS.reduce((sum, card) => sum + card.alphaDeckCount, 0);
    expect(state.powerCardHands.P1).toHaveLength(3);
    expect(state.powerCardHands.P2).toHaveLength(3);
    expect(state.powerCardDeck).toHaveLength(totalPowerCards - 6);
    expect(state.usedPowerCardPile).toHaveLength(0);
    expect(state.drawCount).toEqual({ P1: 0, P2: 0 });
  });

  it('exposes only the requested player private hand', () => {
    const state = createStandardGameSetup('P1', sequenceRandom([0.12, 0.61, 0.28, 0.94]));
    const yHand = getPrivatePowerCardHand(state, 'P1');
    const aHand = getPrivatePowerCardHand(state, 'P2');

    expect(yHand).toHaveLength(3);
    expect(aHand).toHaveLength(3);

    const yIds = new Set(yHand.map(card => card.instanceId));
    const aIds = new Set(aHand.map(card => card.instanceId));
    for (const id of yIds) {
      expect(aIds.has(id)).toBe(false);
    }
  });

  it('respects explicitly chosen first player', () => {
    const yFirst = createStandardGameSetup('P1', sequenceRandom([0.15]));
    const aFirst = createStandardGameSetup('P2', sequenceRandom([0.15]));
    expect(yFirst.activePlayer).toBe('P1');
    expect(aFirst.activePlayer).toBe('P2');
  });
});

describe('Phase 4A Power Card Deck', () => {
  it('builds power-card instances matching definition counts', () => {
    const deck = buildFirstAlphaPowerCardDeck();
    const expectedDeckSize = FIRST_ALPHA_POWER_CARD_DEFINITIONS.reduce(
      (total, definition) => total + definition.alphaDeckCount,
      0,
    );
    expect(deck).toHaveLength(expectedDeckSize);

    const byDefinition = new Map<string, number>();
    for (const card of deck) {
      byDefinition.set(card.definitionId, (byDefinition.get(card.definitionId) ?? 0) + 1);
    }

    for (const definition of FIRST_ALPHA_POWER_CARD_DEFINITIONS) {
      const expected = definition.alphaDeckCount;
      expect(byDefinition.get(definition.definitionId) ?? 0).toBe(expected);
    }
  });

  it('dealing order is repeatable under deterministic shuffle and instance IDs stay unique', () => {
    const rngValues = [0.03, 0.91, 0.41, 0.87, 0.22, 0.63, 0.15, 0.74, 0.39, 0.52, 0.68];
    const stateA = createStandardGameSetup('P1', sequenceRandom(rngValues));
    const stateB = createStandardGameSetup('P1', sequenceRandom(rngValues));

    const yHandA = stateA.powerCardHands.P1.map(card => card.instanceId);
    const yHandB = stateB.powerCardHands.P1.map(card => card.instanceId);
    const aHandA = stateA.powerCardHands.P2.map(card => card.instanceId);
    const aHandB = stateB.powerCardHands.P2.map(card => card.instanceId);
    expect(yHandA).toEqual(yHandB);
    expect(aHandA).toEqual(aHandB);

    const totalPowerCards = FIRST_ALPHA_POWER_CARD_DEFINITIONS.reduce((sum, card) => sum + card.alphaDeckCount, 0);
    const allIds = [
      ...stateA.powerCardHands.P1.map(card => card.instanceId),
      ...stateA.powerCardHands.P2.map(card => card.instanceId),
      ...stateA.powerCardDeck.map(card => card.instanceId),
    ];
    expect(new Set(allIds).size).toBe(totalPowerCards);
  });
});

describe('Multi-game session setup', () => {
  it('creates a session game using unused cards first and preserves setup counts', () => {
    const pools = createInitialSessionDeckPools();
    const state = createMultiGameSessionSetup('P1', sequenceRandom([0.37, 0.12, 0.81, 0.59]), pools);
    const totalPowerCards = FIRST_ALPHA_POWER_CARD_DEFINITIONS.reduce((sum, card) => sum + card.alphaDeckCount, 0);

    expect(state.characters).toHaveLength(10);
    expect(state.characterDeck).toHaveLength(ALPHA_1_CHARACTER_DEFINITIONS.length - 10);
    expect(state.powerCardHands.P1).toHaveLength(3);
    expect(state.powerCardHands.P2).toHaveLength(3);
    expect(state.powerCardDeck).toHaveLength(totalPowerCards - 6);
    expect(state.sessionUsedCharacterPile).toHaveLength(0);
    expect(state.sessionUsedPowerCardPile).toHaveLength(0);
  });

  it('advances session pools by moving all game-used cards out of unused pools', () => {
    const pools = createInitialSessionDeckPools();
    const state = createMultiGameSessionSetup('P2', sequenceRandom([0.22, 0.44, 0.66, 0.88]), pools);
    const advanced = advanceSessionDeckPools(pools, state);

    expect(advanced.unusedCharacterDeck).toHaveLength(ALPHA_1_CHARACTER_DEFINITIONS.length - 10);
    expect(advanced.usedCharacterPile).toHaveLength(10);

    const totalPowerCards = FIRST_ALPHA_POWER_CARD_DEFINITIONS.reduce((sum, card) => sum + card.alphaDeckCount, 0);
    expect(advanced.unusedPowerDeck).toHaveLength(totalPowerCards - 6);
    expect(advanced.usedPowerCardPile).toHaveLength(6);
  });

  it('advances pools by exact consumed card IDs, including cards consumed from deck by effects', () => {
    const pools = createInitialSessionDeckPools(sequenceRandom([0.31, 0.57, 0.79, 0.13, 0.45, 0.67]));
    const state = createMultiGameSessionSetup('P1', sequenceRandom([0.21, 0.43, 0.65, 0.87]), pools);

    const consumedCharacter = state.characterDeck[0];
    const consumedPower = state.powerCardDeck[0];

    const stateAfterEffectConsumption = {
      ...state,
      characterDeck: state.characterDeck.slice(1),
      powerCardDeck: state.powerCardDeck.slice(1),
    };

    const advanced = advanceSessionDeckPools(pools, stateAfterEffectConsumption);

    expect(advanced.unusedCharacterDeck.some(card => card.instanceId === consumedCharacter.instanceId)).toBe(false);
    expect(advanced.unusedPowerDeck.some(card => card.instanceId === consumedPower.instanceId)).toBe(false);
    expect(advanced.usedCharacterPile.some(card => card.instanceId === consumedCharacter.instanceId)).toBe(true);
    expect(advanced.usedPowerCardPile.some(card => card.instanceId === consumedPower.instanceId)).toBe(true);
  });

  it('uses remaining session cards first and tops up from used piles when a full setup is not possible from unused alone', () => {
    const initialPools = createInitialSessionDeckPools(sequenceRandom([0.11, 0.27, 0.43, 0.59, 0.73, 0.89]));
    const pools = {
      unusedCharacterDeck: initialPools.unusedCharacterDeck.slice(0, 9),
      usedCharacterPile: initialPools.unusedCharacterDeck.slice(9, 20),
      unusedPowerDeck: initialPools.unusedPowerDeck.slice(0, 5),
      usedPowerCardPile: initialPools.unusedPowerDeck.slice(5, 12),
    };

    const state = createMultiGameSessionSetup('P1', sequenceRandom([0.19, 0.37, 0.53, 0.71, 0.83]), pools);

    expect(state.characters).toHaveLength(10);
    expect(state.characterDeck).toHaveLength(0);
    expect(state.powerCardHands.P1).toHaveLength(3);
    expect(state.powerCardHands.P2).toHaveLength(3);
    expect(state.powerCardDeck).toHaveLength(0);

    const gameCharacterIds = new Set([
      ...state.characters.map(card => card.id),
      ...state.characterDeck.map(card => card.instanceId),
    ]);
    const gamePowerIds = new Set([
      ...state.powerCardHands.P1.map(card => card.instanceId),
      ...state.powerCardHands.P2.map(card => card.instanceId),
      ...state.powerCardDeck.map(card => card.instanceId),
    ]);

    // All remaining session cards are consumed into this setup before used-pile top-up.
    for (const card of pools.unusedCharacterDeck) {
      expect(gameCharacterIds.has(card.instanceId)).toBe(true);
    }
    for (const card of pools.unusedPowerDeck) {
      expect(gamePowerIds.has(card.instanceId)).toBe(true);
    }

    const supplementalCharacterCount = pools.usedCharacterPile.filter(card => gameCharacterIds.has(card.instanceId)).length;
    const supplementalPowerCount = pools.usedPowerCardPile.filter(card => gamePowerIds.has(card.instanceId)).length;

    expect(supplementalCharacterCount).toBe(1);
    expect(supplementalPowerCount).toBe(1);
    expect(state.sessionUsedCharacterPile).toHaveLength(pools.usedCharacterPile.length - supplementalCharacterCount);
    expect(state.sessionUsedPowerCardPile).toHaveLength(pools.usedPowerCardPile.length - supplementalPowerCount);

    for (const card of state.sessionUsedCharacterPile) {
      expect(gameCharacterIds.has(card.instanceId)).toBe(false);
    }
    for (const card of state.sessionUsedPowerCardPile) {
      expect(gamePowerIds.has(card.instanceId)).toBe(false);
    }
  });

  it('preloads backup piles for both deck types in the final runout game', () => {
    const initialPools = createInitialSessionDeckPools(sequenceRandom([0.05, 0.19, 0.33, 0.47, 0.61, 0.75]));
    const pools = {
      // Trigger runout from characters only.
      unusedCharacterDeck: initialPools.unusedCharacterDeck.slice(0, 9),
      usedCharacterPile: initialPools.unusedCharacterDeck.slice(9, 24),
      // Keep enough unused power for setup so power does not need top-up.
      unusedPowerDeck: initialPools.unusedPowerDeck.slice(0, 10),
      usedPowerCardPile: initialPools.unusedPowerDeck.slice(10, 18),
    };

    const state = createMultiGameSessionSetup('P1', sequenceRandom([0.14, 0.28, 0.42, 0.56, 0.7]), pools);

    expect(state.sessionRunoutOccurred).toBe(true);
    // One used character was consumed to complete setup, remaining used characters stay in backup.
    expect(state.sessionUsedCharacterPile).toHaveLength(pools.usedCharacterPile.length - 1);
    // No used power was required for setup, so all prior-session used power remains in backup.
    expect(state.sessionUsedPowerCardPile).toHaveLength(pools.usedPowerCardPile.length);
  });
});
