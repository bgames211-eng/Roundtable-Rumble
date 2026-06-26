import { describe, expect, it } from 'vitest';
import { initializeGameState, type Character, type GameState } from './gameState';
import {
  acknowledgeBattleHandoff,
  getBattlePrivateHandView,
  getBattlePublicView,
  passBattlePriority,
  playBattlePowerCard,
  resolvePendingBattle,
  startBattle,
} from './battleFlow';
import { FIRST_ALPHA_POWER_CARD_DEFINITIONS } from './powerCards';
import { executeAttackForward } from './gameEngine';

function createChar(
  id: string,
  controller: 'Y' | 'A',
  ATK: number,
  DEF: number,
  isKing: boolean,
  boardPosition: Character['boardPosition'],
  displayName: string,
): Character {
  return {
    id,
    controller,
    ATK,
    DEF,
    isKing,
    boardPosition,
    revealed: false,
    alive: true,
    displayName,
  };
}

function createBattleState(yName = 'Y-Fighter', aName = 'A-Fighter'): GameState {
  const base = initializeGameState([
    createChar('y-att', 'Y', 10, 6, false, 'Y3', yName),
    createChar('a-def', 'A', 7, 8, false, 'Y4', aName),
    createChar('y-king', 'Y', 8, 8, true, 'Y1', 'Y-KING'),
    createChar('a-king', 'A', 8, 8, true, 'A3', 'A-KING'),
  ]);

  return {
    ...base,
    activePlayer: 'Y' as const,
    powerCardHands: {
      Y: [],
      A: [],
    },
    usedPowerCardPile: [],
  };
}

function openBattleAndAcknowledge(state: GameState): GameState {
  const started = startBattle(state, 'attack', 'y-att');
  return acknowledgeBattleHandoff(started, 'Y');
}

describe('Phase 4A Step 3 battle power cards', () => {
  it('only current priority player can play a card', () => {
    const state = {
      ...createBattleState(),
      powerCardHands: {
        Y: [{ instanceId: 'power-y-1', definitionId: 'power-alpha-006' }],
        A: [{ instanceId: 'power-a-1', definitionId: 'power-alpha-005' }],
      },
    };

    const battle = openBattleAndAcknowledge(state);

    expect(() =>
      playBattlePowerCard(battle, 'A', {
        instanceId: 'power-a-1',
        selectedChoice: 'ATK',
      }),
    ).toThrow();
  });

  it('POWER STONE applies +2 chosen stat and updates preview', () => {
    const state = {
      ...createBattleState(),
      powerCardHands: {
        Y: [{ instanceId: 'power-y-ps', definitionId: 'power-alpha-006' }],
        A: [],
      },
    };

    const battle = openBattleAndAcknowledge(state);
    const afterPlay = playBattlePowerCard(battle, 'Y', {
      instanceId: 'power-y-ps',
      selectedChoice: 'ATK',
    });
    const publicView = getBattlePublicView(afterPlay);

    expect(publicView.initiatorEffectiveATK).toBe(12);
    expect(publicView.initiatorEffectiveComparison).toBe(12);
  });

  it('SUPERKICK and LOW BLOW apply correct chosen opponent debuffs', () => {
    const state = {
      ...createBattleState(),
      powerCardHands: {
        Y: [
          { instanceId: 'power-y-sk', definitionId: 'power-alpha-004' },
          { instanceId: 'power-y-lb', definitionId: 'power-alpha-005' },
        ],
        A: [],
      },
    };

    const battle = openBattleAndAcknowledge(state);
    const afterSuperkick = playBattlePowerCard(battle, 'Y', {
      instanceId: 'power-y-sk',
      selectedChoice: 'DEF',
    });

    const ackA = acknowledgeBattleHandoff(afterSuperkick, 'A');
    const passA = passBattlePriority(ackA, 'A');
    const ackY = acknowledgeBattleHandoff(passA, 'Y');

    const afterLowBlow = playBattlePowerCard(ackY, 'Y', {
      instanceId: 'power-y-lb',
      selectedChoice: 'ATK',
    });

    const view = getBattlePublicView(afterLowBlow);
    expect(view.opponentEffectiveDEF).toBe(3);
    expect(view.opponentEffectiveATK).toBe(3);
  });

  it('BOOM !! BOMB applies both modifiers', () => {
    const state = {
      ...createBattleState(),
      powerCardHands: {
        Y: [{ instanceId: 'power-y-bomb', definitionId: 'power-alpha-002' }],
        A: [],
      },
    };

    const battle = openBattleAndAcknowledge(state);
    const afterPlay = playBattlePowerCard(battle, 'Y', {
      instanceId: 'power-y-bomb',
    });
    const view = getBattlePublicView(afterPlay);

    expect(view.opponentEffectiveATK).toBe(3);
    expect(view.initiatorEffectiveDEF).toBe(5);
  });

  it('BRICK WALL is illegal against KOOL-AID MAN', () => {
    const state = {
      ...createBattleState('Y-Fighter', 'Kool-Aid Man'),
      powerCardHands: {
        Y: [{ instanceId: 'power-y-wall', definitionId: 'power-alpha-008' }],
        A: [],
      },
    };

    const battle = openBattleAndAcknowledge(state);
    const handView = getBattlePrivateHandView(battle, 'Y');

    expect(handView.cards[0].isPlayable).toBe(false);
    expect(handView.cards[0].disabledReason).toContain('KOOL-AID MAN');
  });

  it('MONGOL EMPIRE is temporary normally but permanent on GENGHIS KHAN', () => {
    const nonGenghis = {
      ...createBattleState('Ordinary Fighter', 'A-Fighter'),
      powerCardHands: {
        Y: [{ instanceId: 'power-y-me-1', definitionId: 'power-alpha-010' }],
        A: [],
      },
    };

    const nonGenghisAfterPlay = playBattlePowerCard(openBattleAndAcknowledge(nonGenghis), 'Y', {
      instanceId: 'power-y-me-1',
    });

    const viewNonGenghis = getBattlePublicView(nonGenghisAfterPlay);
    expect(viewNonGenghis.initiatorEffectiveATK).toBe(15);

    const passANonGenghis = passBattlePriority(
      acknowledgeBattleHandoff(nonGenghisAfterPlay, 'A'),
      'A',
    );
    const readyNonGenghis = passBattlePriority(
      acknowledgeBattleHandoff(passANonGenghis, 'Y'),
      'Y',
    );
    const resolvedNonGenghis = resolvePendingBattle(readyNonGenghis);
    expect(resolvedNonGenghis.persistentCharacterModifiers['y-att']).toBeUndefined();

    const genghis = {
      ...createBattleState('Genghis Khan', 'A-Fighter'),
      powerCardHands: {
        Y: [{ instanceId: 'power-y-me-2', definitionId: 'power-alpha-010' }],
        A: [],
      },
    };

    const genghisAfterPlay = playBattlePowerCard(openBattleAndAcknowledge(genghis), 'Y', {
      instanceId: 'power-y-me-2',
    });

    const viewGenghis = getBattlePublicView(genghisAfterPlay);
    expect(viewGenghis.initiatorEffectiveATK).toBe(15);

    const passAGenghis = passBattlePriority(
      acknowledgeBattleHandoff(genghisAfterPlay, 'A'),
      'A',
    );
    const readyGenghis = passBattlePriority(
      acknowledgeBattleHandoff(passAGenghis, 'Y'),
      'Y',
    );
    const resolvedGenghis = resolvePendingBattle(readyGenghis);
    expect(resolvedGenghis.persistentCharacterModifiers['y-att']?.ATK).toBe(5);
  });

  it('CHAMPION\'S ADVANTAGE changes only its controller selected comparison stat', () => {
    const state = {
      ...createBattleState(),
      powerCardHands: {
        Y: [{ instanceId: 'power-y-ca-1', definitionId: 'power-alpha-003' }],
        A: [],
      },
    };

    const afterPlay = playBattlePowerCard(openBattleAndAcknowledge(state), 'Y', {
      instanceId: 'power-y-ca-1',
      selectedChoice: 'DEF',
    });

    const view = getBattlePublicView(afterPlay);
    expect(view.initiatorComparisonLabel).toBe('DEF');
    expect(view.opponentComparisonLabel).toBe('DEF');
    expect(view.initiatorEffectiveComparison).toBe(view.initiatorEffectiveDEF);
  });

  it('later CHAMPION\'S ADVANTAGE by same player replaces prior override', () => {
    const state = {
      ...createBattleState(),
      powerCardHands: {
        Y: [
          { instanceId: 'power-y-ca-2a', definitionId: 'power-alpha-003' },
          { instanceId: 'power-y-ca-2b', definitionId: 'power-alpha-003' },
        ],
        A: [],
      },
    };

    const afterFirst = playBattlePowerCard(openBattleAndAcknowledge(state), 'Y', {
      instanceId: 'power-y-ca-2a',
      selectedChoice: 'DEF',
    });

    const yAgain = acknowledgeBattleHandoff(
      passBattlePriority(acknowledgeBattleHandoff(afterFirst, 'A'), 'A'),
      'Y',
    );

    const afterSecond = playBattlePowerCard(yAgain, 'Y', {
      instanceId: 'power-y-ca-2b',
      selectedChoice: 'ATK',
    });

    const view = getBattlePublicView(afterSecond);
    expect(view.initiatorComparisonLabel).toBe('ATK');
    expect(view.initiatorEffectiveComparison).toBe(view.initiatorEffectiveATK);
  });

  it('SUPER BAT is legal only while opponent currently uses DEF', () => {
    const state = {
      ...createBattleState(),
      powerCardHands: {
        Y: [{ instanceId: 'power-y-sb-legal', definitionId: 'power-alpha-001' }],
        A: [],
      },
    };

    const hand = getBattlePrivateHandView(openBattleAndAcknowledge(state), 'Y');
    expect(hand.cards[0].isPlayable).toBe(true);
  });

  it('SUPER BAT is illegal while opponent currently uses ATK', () => {
    const state = {
      ...createBattleState(),
      powerCardHands: {
        Y: [{ instanceId: 'power-y-sb-illegal', definitionId: 'power-alpha-001' }],
        A: [{ instanceId: 'power-a-ca-for-sb', definitionId: 'power-alpha-003' }],
      },
    };

    const battle = openBattleAndAcknowledge(state);
    const aTurn = acknowledgeBattleHandoff(passBattlePriority(battle, 'Y'), 'A');
    const afterAChampion = playBattlePowerCard(aTurn, 'A', {
      instanceId: 'power-a-ca-for-sb',
      selectedChoice: 'ATK',
    });

    const yTurn = acknowledgeBattleHandoff(afterAChampion, 'Y');
    const yHand = getBattlePrivateHandView(yTurn, 'Y');
    expect(yHand.cards[0].isPlayable).toBe(false);
  });

  it('SUPER BAT -4 DEF persists if opponent later switches to ATK', () => {
    const state = {
      ...createBattleState(),
      powerCardHands: {
        Y: [{ instanceId: 'power-y-sb-persist', definitionId: 'power-alpha-001' }],
        A: [{ instanceId: 'power-a-ca-persist', definitionId: 'power-alpha-003' }],
      },
    };

    const afterSuperBat = playBattlePowerCard(openBattleAndAcknowledge(state), 'Y', {
      instanceId: 'power-y-sb-persist',
    });

    const afterChampion = playBattlePowerCard(acknowledgeBattleHandoff(afterSuperBat, 'A'), 'A', {
      instanceId: 'power-a-ca-persist',
      selectedChoice: 'ATK',
    });

    const view = getBattlePublicView(afterChampion);
    expect(view.opponentEffectiveDEF).toBe(4);
    expect(view.opponentComparisonLabel).toBe('ATK');
    expect(view.opponentEffectiveComparison).toBe(7);
  });

  it('FLIP THE SCRIPT swaps current effective values, not printed stats', () => {
    const state = {
      ...createBattleState(),
      powerCardHands: {
        Y: [{ instanceId: 'power-y-flip-1', definitionId: 'power-alpha-007' }],
        A: [],
      },
    };

    const afterFlip = playBattlePowerCard(openBattleAndAcknowledge(state), 'Y', {
      instanceId: 'power-y-flip-1',
    });

    const view = getBattlePublicView(afterFlip);
    expect(view.initiatorEffectiveATK).toBe(6);
    expect(view.initiatorEffectiveDEF).toBe(10);
    expect(view.initiator.ATK).toBe(10);
    expect(view.initiator.DEF).toBe(6);
  });

  it('effects after FLIP THE SCRIPT apply to post-swap stat labels', () => {
    const state = {
      ...createBattleState(),
      powerCardHands: {
        Y: [
          { instanceId: 'power-y-flip-2', definitionId: 'power-alpha-007' },
          { instanceId: 'power-y-ps-after-flip', definitionId: 'power-alpha-006' },
        ],
        A: [],
      },
    };

    const afterFlip = playBattlePowerCard(openBattleAndAcknowledge(state), 'Y', {
      instanceId: 'power-y-flip-2',
    });

    const yAgain = acknowledgeBattleHandoff(
      passBattlePriority(acknowledgeBattleHandoff(afterFlip, 'A'), 'A'),
      'Y',
    );

    const afterStone = playBattlePowerCard(yAgain, 'Y', {
      instanceId: 'power-y-ps-after-flip',
      selectedChoice: 'ATK',
    });

    const view = getBattlePublicView(afterStone);
    expect(view.initiatorEffectiveATK).toBe(8);
    expect(view.initiatorEffectiveDEF).toBe(10);
  });

  it('two FLIP THE SCRIPT cards swap current values twice', () => {
    const state = {
      ...createBattleState(),
      powerCardHands: {
        Y: [
          { instanceId: 'power-y-flip-a', definitionId: 'power-alpha-007' },
          { instanceId: 'power-y-flip-b', definitionId: 'power-alpha-007' },
        ],
        A: [],
      },
    };

    const afterFirst = playBattlePowerCard(openBattleAndAcknowledge(state), 'Y', {
      instanceId: 'power-y-flip-a',
    });

    const yAgain = acknowledgeBattleHandoff(
      passBattlePriority(acknowledgeBattleHandoff(afterFirst, 'A'), 'A'),
      'Y',
    );

    const afterSecond = playBattlePowerCard(yAgain, 'Y', {
      instanceId: 'power-y-flip-b',
    });

    const view = getBattlePublicView(afterSecond);
    expect(view.initiatorEffectiveATK).toBe(10);
    expect(view.initiatorEffectiveDEF).toBe(6);
  });

  it('KICK-OUT!! is legal only while controller is currently losing', () => {
    const losingBase = createBattleState();
    const losing = {
      ...losingBase,
      characters: losingBase.characters.map(character => {
        if (character.id === 'y-att') {
          return { ...character, ATK: 5, DEF: 6 };
        }
        return character;
      }),
      powerCardHands: {
        Y: [{ instanceId: 'power-y-ko-legal', definitionId: 'power-alpha-009' }],
        A: [],
      },
    };

    const legalHand = getBattlePrivateHandView(openBattleAndAcknowledge(losing), 'Y');
    expect(legalHand.cards[0].isPlayable).toBe(true);

    const winning = {
      ...createBattleState(),
      powerCardHands: {
        Y: [{ instanceId: 'power-y-ko-illegal', definitionId: 'power-alpha-009' }],
        A: [],
      },
    };

    const illegalHand = getBattlePrivateHandView(openBattleAndAcknowledge(winning), 'Y');
    expect(illegalHand.cards[0].isPlayable).toBe(false);
  });

  it('KICK-OUT!! snapshots opponent current comparison value', () => {
    const base = createBattleState();
    const state = {
      ...base,
      characters: base.characters.map(character => {
        if (character.id === 'y-att') {
          return { ...character, ATK: 5, DEF: 6 };
        }
        return character;
      }),
      powerCardHands: {
        Y: [{ instanceId: 'power-y-ko-1', definitionId: 'power-alpha-009' }],
        A: [],
      },
    };

    const afterKickOut = playBattlePowerCard(openBattleAndAcknowledge(state), 'Y', {
      instanceId: 'power-y-ko-1',
    });

    const view = getBattlePublicView(afterKickOut);
    expect(view.initiatorEffectiveComparison).toBe(8);
    expect(view.opponentEffectiveComparison).toBe(8);
  });

  it('later modifiers can change values after KICK-OUT!!', () => {
    const base = createBattleState();
    const state = {
      ...base,
      characters: base.characters.map(character => {
        if (character.id === 'y-att') {
          return { ...character, ATK: 5, DEF: 6 };
        }
        return character;
      }),
      powerCardHands: {
        Y: [{ instanceId: 'power-y-ko-2', definitionId: 'power-alpha-009' }],
        A: [{ instanceId: 'power-a-lb-after-ko', definitionId: 'power-alpha-005' }],
      },
    };

    const afterKickOut = playBattlePowerCard(openBattleAndAcknowledge(state), 'Y', {
      instanceId: 'power-y-ko-2',
    });

    const afterLowBlow = playBattlePowerCard(acknowledgeBattleHandoff(afterKickOut, 'A'), 'A', {
      instanceId: 'power-a-lb-after-ko',
      selectedChoice: 'ATK',
    });

    const view = getBattlePublicView(afterLowBlow);
    expect(view.initiatorEffectiveComparison).toBe(4);
    expect(view.opponentEffectiveComparison).toBe(8);
  });

  it('all First Alpha deck definitions are playable when legal conditions are met', () => {
    const allDefinitionsInHand = FIRST_ALPHA_POWER_CARD_DEFINITIONS.map((definition, index) => ({
      instanceId: `power-y-all-${index + 1}`,
      definitionId: definition.definitionId,
    }));

    const base = createBattleState();
    const state = {
      ...base,
      characters: base.characters.map(character => {
        if (character.id === 'y-att') {
          return { ...character, ATK: 5, DEF: 6 };
        }
        return character;
      }),
      powerCardHands: {
        Y: allDefinitionsInHand,
        A: [],
      },
    };

    const hand = getBattlePrivateHandView(openBattleAndAcknowledge(state), 'Y');
    expect(hand.cards).toHaveLength(FIRST_ALPHA_POWER_CARD_DEFINITIONS.length);
    for (const card of hand.cards) {
      expect(card.isPlayable).toBe(true);
      expect(card.disabledReason).toBeNull();
    }
  });

  it('staged no-power-card battles still resolve unchanged', () => {
    const baseline = {
      ...createBattleState(),
      powerCardHands: { Y: [], A: [] },
      usedPowerCardPile: [],
    };

    const instant = executeAttackForward(baseline, 'y-att');

    const started = startBattle(baseline, 'attack', 'y-att');
    const passOne = passBattlePriority(acknowledgeBattleHandoff(started, 'Y'), 'Y');
    const passTwo = passBattlePriority(acknowledgeBattleHandoff(passOne, 'A'), 'A');
    const staged = resolvePendingBattle(passTwo);

    expect(staged.gameStatus).toBe(instant.gameStatus);
    expect(staged.activePlayer).toBe(instant.activePlayer);
    expect(staged.turnNumber).toBe(instant.turnNumber);
    expect(staged.graveyard.map(card => card.id)).toEqual(instant.graveyard.map(card => card.id));
  });
});
