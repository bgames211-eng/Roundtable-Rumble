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
  controller: 'P1' | 'P2',
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
    createChar('y-att', 'P1', 10, 6, false, 'P1_3', yName),
    createChar('a-def', 'P2', 7, 8, false, 'P1_4', aName),
    createChar('y-king', 'P1', 8, 8, true, 'P1_1', 'Y-KING'),
    createChar('a-king', 'P2', 8, 8, true, 'P2_3', 'A-KING'),
  ]);

  return {
    ...base,
    activePlayer: 'P1' as const,
    powerCardHands: {
      P1: [],
      P2: [],
    },
    usedPowerCardPile: [],
  };
}

function openBattleAndAcknowledge(state: GameState): GameState {
  const started = startBattle(state, 'attack', 'y-att');
  return acknowledgeBattleHandoff(started, 'P1');
}

describe('Phase 4A Step 3 battle power cards', () => {
  it('only current priority player can play a card', () => {
    const state = {
      ...createBattleState(),
      powerCardHands: {
        P1: [{ instanceId: 'power-y-1', definitionId: 'power-alpha-006' }],
        P2: [{ instanceId: 'power-a-1', definitionId: 'power-alpha-005' }],
      },
    };

    const battle = openBattleAndAcknowledge(state);

    expect(() =>
      playBattlePowerCard(battle, 'P2', {
        instanceId: 'power-a-1',
        selectedChoice: 'ATK',
      }),
    ).toThrow();
  });

  it('POWER STONE applies +2 chosen stat and updates preview', () => {
    const state = {
      ...createBattleState(),
      powerCardHands: {
        P1: [{ instanceId: 'power-y-ps', definitionId: 'power-alpha-006' }],
        P2: [],
      },
    };

    const battle = openBattleAndAcknowledge(state);
    const afterPlay = playBattlePowerCard(battle, 'P1', {
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
        P1: [
          { instanceId: 'power-y-sk', definitionId: 'power-alpha-004' },
          { instanceId: 'power-y-lb', definitionId: 'power-alpha-005' },
        ],
        P2: [],
      },
    };

    const battle = openBattleAndAcknowledge(state);
    const afterSuperkick = playBattlePowerCard(battle, 'P1', {
      instanceId: 'power-y-sk',
      selectedChoice: 'DEF',
    });

    const ackA = acknowledgeBattleHandoff(afterSuperkick, 'P2');
    const passA = passBattlePriority(ackA, 'P2');
    const ackY = acknowledgeBattleHandoff(passA, 'P1');

    const afterLowBlow = playBattlePowerCard(ackY, 'P1', {
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
        P1: [{ instanceId: 'power-y-bomb', definitionId: 'power-alpha-002' }],
        P2: [],
      },
    };

    const battle = openBattleAndAcknowledge(state);
    const afterPlay = playBattlePowerCard(battle, 'P1', {
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
        P1: [{ instanceId: 'power-y-wall', definitionId: 'power-alpha-008' }],
        P2: [],
      },
    };

    const battle = openBattleAndAcknowledge(state);
    const handView = getBattlePrivateHandView(battle, 'P1');

    expect(handView.cards[0].isPlayable).toBe(false);
    expect(handView.cards[0].disabledReason).toContain('KOOL-AID MAN');
  });

  it('MONGOL EMPIRE is temporary normally but permanent on GENGHIS KHAN', () => {
    const nonGenghis = {
      ...createBattleState('Ordinary Fighter', 'A-Fighter'),
      powerCardHands: {
        P1: [{ instanceId: 'power-y-me-1', definitionId: 'power-alpha-010' }],
        P2: [],
      },
    };

    const nonGenghisAfterPlay = playBattlePowerCard(openBattleAndAcknowledge(nonGenghis), 'P1', {
      instanceId: 'power-y-me-1',
    });

    const viewNonGenghis = getBattlePublicView(nonGenghisAfterPlay);
    expect(viewNonGenghis.initiatorEffectiveATK).toBe(15);

    const passANonGenghis = passBattlePriority(
      acknowledgeBattleHandoff(nonGenghisAfterPlay, 'P2'),
      'P2',
    );
    const readyNonGenghis = passBattlePriority(
      acknowledgeBattleHandoff(passANonGenghis, 'P1'),
      'P1',
    );
    const resolvedNonGenghis = resolvePendingBattle(readyNonGenghis);
    expect(resolvedNonGenghis.persistentCharacterModifiers['y-att']).toBeUndefined();

    const genghis = {
      ...createBattleState('Genghis Khan', 'A-Fighter'),
      powerCardHands: {
        P1: [{ instanceId: 'power-y-me-2', definitionId: 'power-alpha-010' }],
        P2: [],
      },
    };

    const genghisAfterPlay = playBattlePowerCard(openBattleAndAcknowledge(genghis), 'P1', {
      instanceId: 'power-y-me-2',
    });

    const viewGenghis = getBattlePublicView(genghisAfterPlay);
    expect(viewGenghis.initiatorEffectiveATK).toBe(15);

    const passAGenghis = passBattlePriority(
      acknowledgeBattleHandoff(genghisAfterPlay, 'P2'),
      'P2',
    );
    const readyGenghis = passBattlePriority(
      acknowledgeBattleHandoff(passAGenghis, 'P1'),
      'P1',
    );
    const resolvedGenghis = resolvePendingBattle(readyGenghis);
    expect(resolvedGenghis.persistentCharacterModifiers['y-att']).toBeUndefined();
    expect(resolvedGenghis.characters.find(character => character.id === 'y-att')?.attachments?.some(attachment => (
      attachment.definitionId === 'power-alpha-010' && attachment.ATK === 5 && attachment.DEF === 0
    ))).toBe(true);
  });

  it('CHAMPION\'S ADVANTAGE changes only its controller selected comparison stat', () => {
    const state = {
      ...createBattleState(),
      powerCardHands: {
        P1: [{ instanceId: 'power-y-ca-1', definitionId: 'power-alpha-003' }],
        P2: [],
      },
    };

    const afterPlay = playBattlePowerCard(openBattleAndAcknowledge(state), 'P1', {
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
        P1: [
          { instanceId: 'power-y-ca-2a', definitionId: 'power-alpha-003' },
          { instanceId: 'power-y-ca-2b', definitionId: 'power-alpha-003' },
        ],
        P2: [],
      },
    };

    const afterFirst = playBattlePowerCard(openBattleAndAcknowledge(state), 'P1', {
      instanceId: 'power-y-ca-2a',
      selectedChoice: 'DEF',
    });

    const yAgain = acknowledgeBattleHandoff(
      passBattlePriority(acknowledgeBattleHandoff(afterFirst, 'P2'), 'P2'),
      'P1',
    );

    const afterSecond = playBattlePowerCard(yAgain, 'P1', {
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
        P1: [{ instanceId: 'power-y-sb-legal', definitionId: 'power-alpha-001' }],
        P2: [],
      },
    };

    const hand = getBattlePrivateHandView(openBattleAndAcknowledge(state), 'P1');
    expect(hand.cards[0].isPlayable).toBe(true);
  });

  it('SUPER BAT is illegal while opponent currently uses ATK', () => {
    const state = {
      ...createBattleState(),
      powerCardHands: {
        P1: [{ instanceId: 'power-y-sb-illegal', definitionId: 'power-alpha-001' }],
        P2: [{ instanceId: 'power-a-ca-for-sb', definitionId: 'power-alpha-003' }],
      },
    };

    const battle = openBattleAndAcknowledge(state);
    const aTurn = acknowledgeBattleHandoff(passBattlePriority(battle, 'P1'), 'P2');
    const afterAChampion = playBattlePowerCard(aTurn, 'P2', {
      instanceId: 'power-a-ca-for-sb',
      selectedChoice: 'ATK',
    });

    const yTurn = acknowledgeBattleHandoff(afterAChampion, 'P1');
    const yHand = getBattlePrivateHandView(yTurn, 'P1');
    expect(yHand.cards[0].isPlayable).toBe(false);
  });

  it('SUPER BAT -4 DEF persists if opponent later switches to ATK', () => {
    const state = {
      ...createBattleState(),
      powerCardHands: {
        P1: [{ instanceId: 'power-y-sb-persist', definitionId: 'power-alpha-001' }],
        P2: [{ instanceId: 'power-a-ca-persist', definitionId: 'power-alpha-003' }],
      },
    };

    const afterSuperBat = playBattlePowerCard(openBattleAndAcknowledge(state), 'P1', {
      instanceId: 'power-y-sb-persist',
    });

    const afterChampion = playBattlePowerCard(acknowledgeBattleHandoff(afterSuperBat, 'P2'), 'P2', {
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
        P1: [{ instanceId: 'power-y-flip-1', definitionId: 'power-alpha-007' }],
        P2: [],
      },
    };

    const afterFlip = playBattlePowerCard(openBattleAndAcknowledge(state), 'P1', {
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
        P1: [
          { instanceId: 'power-y-flip-2', definitionId: 'power-alpha-007' },
          { instanceId: 'power-y-ps-after-flip', definitionId: 'power-alpha-006' },
        ],
        P2: [],
      },
    };

    const afterFlip = playBattlePowerCard(openBattleAndAcknowledge(state), 'P1', {
      instanceId: 'power-y-flip-2',
    });

    const yAgain = acknowledgeBattleHandoff(
      passBattlePriority(acknowledgeBattleHandoff(afterFlip, 'P2'), 'P2'),
      'P1',
    );

    const afterStone = playBattlePowerCard(yAgain, 'P1', {
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
        P1: [
          { instanceId: 'power-y-flip-a', definitionId: 'power-alpha-007' },
          { instanceId: 'power-y-flip-b', definitionId: 'power-alpha-007' },
        ],
        P2: [],
      },
    };

    const afterFirst = playBattlePowerCard(openBattleAndAcknowledge(state), 'P1', {
      instanceId: 'power-y-flip-a',
    });

    const yAgain = acknowledgeBattleHandoff(
      passBattlePriority(acknowledgeBattleHandoff(afterFirst, 'P2'), 'P2'),
      'P1',
    );

    const afterSecond = playBattlePowerCard(yAgain, 'P1', {
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
        P1: [{ instanceId: 'power-y-ko-legal', definitionId: 'power-alpha-009' }],
        P2: [],
      },
    };

    const legalHand = getBattlePrivateHandView(openBattleAndAcknowledge(losing), 'P1');
    expect(legalHand.cards[0].isPlayable).toBe(true);

    const winning = {
      ...createBattleState(),
      powerCardHands: {
        P1: [{ instanceId: 'power-y-ko-illegal', definitionId: 'power-alpha-009' }],
        P2: [],
      },
    };

    const illegalHand = getBattlePrivateHandView(openBattleAndAcknowledge(winning), 'P1');
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
        P1: [{ instanceId: 'power-y-ko-1', definitionId: 'power-alpha-009' }],
        P2: [],
      },
    };

    const afterKickOut = playBattlePowerCard(openBattleAndAcknowledge(state), 'P1', {
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
        P1: [{ instanceId: 'power-y-ko-2', definitionId: 'power-alpha-009' }],
        P2: [{ instanceId: 'power-a-lb-after-ko', definitionId: 'power-alpha-005' }],
      },
    };

    const afterKickOut = playBattlePowerCard(openBattleAndAcknowledge(state), 'P1', {
      instanceId: 'power-y-ko-2',
    });

    const afterLowBlow = playBattlePowerCard(acknowledgeBattleHandoff(afterKickOut, 'P2'), 'P2', {
      instanceId: 'power-a-lb-after-ko',
      selectedChoice: 'ATK',
    });

    const view = getBattlePublicView(afterLowBlow);
    expect(view.initiatorEffectiveComparison).toBe(4);
    expect(view.opponentEffectiveComparison).toBe(8);
  });

  it('weapon cards equip as attachments and apply persistent stat bonuses in battle previews', () => {
    const state = {
      ...createBattleState('Fighter', 'A-Fighter'),
      powerCardHands: {
        P1: [{ instanceId: 'power-y-pk-1', definitionId: 'power-alpha-011' }],
        P2: [],
      },
    };

    const afterEquip = playBattlePowerCard(openBattleAndAcknowledge(state), 'P1', {
      instanceId: 'power-y-pk-1',
      targetCharacterId: 'y-att',
    });

    const view = getBattlePublicView(afterEquip);
    expect(view.initiatorEffectiveATK).toBe(13);
    expect(view.initiatorEffectiveDEF).toBe(9);
  });

  it('BATARANG and FRYING PAN apply named character bonuses', () => {
    const batmanState = {
      ...createBattleState('Batman', 'A-Fighter'),
      powerCardHands: {
        P1: [{ instanceId: 'power-y-batarang-1', definitionId: 'power-alpha-013' }],
        P2: [],
      },
    };

    const batmanAfterEquip = playBattlePowerCard(openBattleAndAcknowledge(batmanState), 'P1', {
      instanceId: 'power-y-batarang-1',
      targetCharacterId: 'y-att',
    });

    const batmanView = getBattlePublicView(batmanAfterEquip);
    expect(batmanView.initiatorEffectiveATK).toBe(13);
    expect(batmanView.opponentEffectiveDEF).toBe(6);

    const rapunzelState = {
      ...createBattleState('Rapunzel', 'A-Fighter'),
      powerCardHands: {
        P1: [{ instanceId: 'power-y-pan-1', definitionId: 'power-alpha-015' }],
        P2: [],
      },
    };

    const rapunzelAfterEquip = playBattlePowerCard(openBattleAndAcknowledge(rapunzelState), 'P1', {
      instanceId: 'power-y-pan-1',
      targetCharacterId: 'y-att',
    });

    const rapunzelView = getBattlePublicView(rapunzelAfterEquip);
    expect(rapunzelView.initiatorEffectiveATK).toBe(14);
    expect(rapunzelView.initiatorEffectiveDEF).toBe(10);
  });

  it('weapon cards can equip opponent battler', () => {
    const state = {
      ...createBattleState('Fighter', 'Opponent'),
      powerCardHands: {
        P1: [{ instanceId: 'power-y-ray-opponent', definitionId: 'power-alpha-012' }],
        P2: [],
      },
    };

    const afterEquip = playBattlePowerCard(openBattleAndAcknowledge(state), 'P1', {
      instanceId: 'power-y-ray-opponent',
      targetCharacterId: 'a-def',
    });

    const view = getBattlePublicView(afterEquip);
    expect(view.opponentEffectiveATK).toBe(12);
    expect(view.opponentEffectiveDEF).toBe(9);
  });

  it('FREEZE GUN equips without auto-freezing a target', () => {
    const state = {
      ...createBattleState('Mr. Freeze', 'Opponent'),
      powerCardHands: {
        P1: [{ instanceId: 'power-y-freeze-gun', definitionId: 'power-alpha-014' }],
        P2: [],
      },
    };

    const afterEquip = playBattlePowerCard(openBattleAndAcknowledge(state), 'P1', {
      instanceId: 'power-y-freeze-gun',
      targetCharacterId: 'y-att',
    });

    const view = getBattlePublicView(afterEquip);
    expect(view.opponent.isFrozen).toBe(false);
  });

  it('equipped weapons stay out of used pile until the equipped character is defeated', () => {
    const base = createBattleState('Fighter', 'Defender');
    const state = {
      ...base,
      characters: base.characters.map(character => (
        character.id === 'y-att'
          ? { ...character, ATK: 4 }
          : character
      )),
      powerCardHands: {
        P1: [{ instanceId: 'power-y-weapon-drop', definitionId: 'power-alpha-011' }],
        P2: [],
      },
    };

    const afterEquip = playBattlePowerCard(openBattleAndAcknowledge(state), 'P1', {
      instanceId: 'power-y-weapon-drop',
      targetCharacterId: 'y-att',
    });
    expect(afterEquip.usedPowerCardPile).toHaveLength(0);

    const passA = passBattlePriority(acknowledgeBattleHandoff(afterEquip, 'P2'), 'P2');
    const readyY = passBattlePriority(acknowledgeBattleHandoff(passA, 'P1'), 'P1');
    const resolved = resolvePendingBattle(readyY);

    const droppedWeapon = resolved.usedPowerCardPile.find(entry => entry.instanceId === 'power-y-weapon-drop');
    expect(droppedWeapon).toBeDefined();
    expect(droppedWeapon?.effectSummary).toContain('was defeated');
  });

  it('TAG TEAM adds the relevant stat from an allied character directly behind battler', () => {
    const base = createBattleState();
    const state = {
      ...base,
      characters: [
        ...base.characters,
        createChar('y-support', 'P1', 4, 12, false, 'P1_2', 'Support'),
      ],
      powerCardHands: {
        P1: [{ instanceId: 'power-y-tag-team', definitionId: 'power-alpha-016' }],
        P2: [],
      },
    };

    const afterPlay = playBattlePowerCard(openBattleAndAcknowledge(state), 'P1', {
      instanceId: 'power-y-tag-team',
    });

    const view = getBattlePublicView(afterPlay);
    expect(view.initiatorEffectiveATK).toBe(14);
    expect(afterPlay.characters.find(character => character.id === 'y-support')?.revealed).toBe(true);
  });

  it('PHONE A FRIEND replaces selected own living character with top hidden deck card', () => {
    const state = {
      ...createBattleState(),
      characterDeck: [
        {
          instanceId: 'deck-top-1',
          definitionId: 'alpha-new-1',
          displayName: 'Deck Hero',
          ATK: 13,
          DEF: 2,
          ability: null,
          statRule: null,
          imageKey: 'deck-hero',
        },
      ],
      powerCardHands: {
        P1: [{ instanceId: 'power-y-phone', definitionId: 'power-alpha-017' }],
        P2: [],
      },
    };

    const afterPlay = playBattlePowerCard(openBattleAndAcknowledge(state), 'P1', {
      instanceId: 'power-y-phone',
      targetCharacterId: 'y-king',
    });

    const replaced = afterPlay.characters.find(character => character.id === 'deck-top-1');
    expect(replaced?.displayName).toBe('Deck Hero');
    expect(replaced?.ATK).toBe(13);
    expect(replaced?.isKing).toBe(true);
    expect(afterPlay.characterDeck).toHaveLength(0);
    expect(afterPlay.graveyard[afterPlay.graveyard.length - 1]?.id).toBe('y-king');
  });

  it('PHONE A FRIEND drawing RIDDLER in battle immediately uses bottom deck stats', () => {
    const state = {
      ...createBattleState(),
      characterDeck: [
        {
          instanceId: 'deck-riddler',
          definitionId: 'alpha-033',
          displayName: 'RIDDLER',
          ATK: 0,
          DEF: 0,
          ability: null,
          statRule: null,
          imageKey: 'riddler',
        },
        {
          instanceId: 'deck-bottom-source',
          definitionId: 'alpha-source',
          displayName: 'Bottom Source',
          ATK: 14,
          DEF: 9,
          ability: null,
          statRule: null,
          imageKey: 'source',
        },
      ],
      powerCardHands: {
        P1: [{ instanceId: 'power-y-phone-riddler', definitionId: 'power-alpha-017' }],
        P2: [],
      },
    };

    const afterPlay = playBattlePowerCard(openBattleAndAcknowledge(state), 'P1', {
      instanceId: 'power-y-phone-riddler',
      targetCharacterId: 'y-att',
    });

    const view = getBattlePublicView(afterPlay);
    expect(afterPlay.pendingBattle?.initiatorId).toBe('deck-riddler');
    expect(view.initiatorRiddlerSource?.instanceId).toBe('deck-bottom-source');
    expect(view.initiatorEffectiveATK).toBe(14);
    expect(view.initiatorEffectiveComparison).toBe(14);
    expect(afterPlay.characterDeck).toHaveLength(0);
  });

  it('SWAP CHARACTERS during battle replaces swapped-out battler, reveals replacement, and creates no draw triggers', () => {
    const state = {
      ...createBattleState(),
      characters: [
        createChar('y-att', 'P1', 10, 6, false, 'P1_3', 'Y-Attacker'),
        createChar('a-def', 'P2', 7, 8, false, 'P1_4', 'A-Defender'),
        createChar('y-king', 'P1', 8, 8, true, 'P1_1', 'Y-KING'),
        createChar('a-king', 'P2', 8, 8, true, 'P2_3', 'A-KING'),
        { ...createChar('a-frozen', 'P2', 2, 2, false, 'P2_4', 'A-Frozen'), isFrozen: true },
      ],
      powerCardHands: {
        P1: [{ instanceId: 'power-y-swap', definitionId: 'power-alpha-018' }],
        P2: [],
      },
    };

    const afterPlay = playBattlePowerCard(openBattleAndAcknowledge(state), 'P1', {
      instanceId: 'power-y-swap',
      targetCharacterId: 'y-att',
      secondTargetCharacterId: 'a-frozen',
    });

    const publicView = getBattlePublicView(afterPlay);
    const replacement = afterPlay.characters.find(character => character.id === 'a-frozen');

    expect(afterPlay.drawCount.P1).toBe(0);
    expect(afterPlay.drawCount.P2).toBe(0);
    expect(afterPlay.pendingBattle?.initiatorId).toBe('a-frozen');
    expect(replacement?.revealed).toBe(true);
    expect(replacement?.isFrozen).toBe(true);
    expect(publicView.initiatorEffectiveATK).toBe(10);
    expect(publicView.initiatorEffectiveDEF).toBe(6);
  });

  it('SWAP CHARACTERS keeps BRICK WALL on the same character when battlers trade sides', () => {
    const state = {
      ...createBattleState('DARYL', 'LARRY'),
      powerCardHands: {
        P1: [{ instanceId: 'power-y-wall', definitionId: 'power-alpha-008' }],
        P2: [{ instanceId: 'power-a-swap', definitionId: 'power-alpha-018' }],
      },
    };

    const started = openBattleAndAcknowledge(state);
    const afterBrickWall = playBattlePowerCard(started, 'P1', {
      instanceId: 'power-y-wall',
    });

    const p2Turn = acknowledgeBattleHandoff(afterBrickWall, 'P2');
    const afterSwap = playBattlePowerCard(p2Turn, 'P2', {
      instanceId: 'power-a-swap',
      targetCharacterId: 'a-def',
      secondTargetCharacterId: 'y-att',
    });

    const view = getBattlePublicView(afterSwap);
    expect(afterSwap.pendingBattle?.initiatorId).toBe('a-def');
    expect(afterSwap.pendingBattle?.opponentId).toBe('y-att');
    expect(afterSwap.pendingBattle?.temporaryModifiers.some(modifier => (
      modifier.sourceInstanceId === 'power-y-wall'
      && modifier.targetCharacterId === 'y-att'
      && modifier.stat === 'DEF'
      && modifier.amount === 5
    ))).toBe(true);
    expect(view.opponentEffectiveDEF).toBe(11);
  });

  it('SWAP CHARACTERS during battle transfers king status to the incoming replacement and keeps the swapped-out king non-king', () => {
    const state = {
      ...createBattleState(),
      powerCardHands: {
        P1: [{ instanceId: 'power-y-swap', definitionId: 'power-alpha-018' }],
        P2: [],
      },
    };

    const afterPlay = playBattlePowerCard(openBattleAndAcknowledge(state), 'P1', {
      instanceId: 'power-y-swap',
      targetCharacterId: 'y-att',
      secondTargetCharacterId: 'a-king',
    });

    const yAtt = afterPlay.characters.find(character => character.id === 'y-att');
    const aKing = afterPlay.characters.find(character => character.id === 'a-king');

    expect(afterPlay.pendingBattle?.initiatorId).toBe('a-king');
    expect(yAtt?.controller).toBe('P2');
    expect(aKing?.controller).toBe('P1');
    expect(yAtt?.isKing).toBe(true);
    expect(aKing?.isKing).toBe(false);
  });

  it('SWAP CHARACTERS swapping RIDDLER into battle immediately uses bottom deck stats', () => {
    const state = {
      ...createBattleState(),
      characters: [
        createChar('y-att', 'P1', 10, 6, false, 'P1_3', 'Y-Attacker'),
        createChar('a-def', 'P2', 7, 8, false, 'P1_4', 'A-Defender'),
        createChar('y-king', 'P1', 8, 8, true, 'P1_1', 'Y-KING'),
        createChar('a-king', 'P2', 8, 8, true, 'P2_3', 'A-KING'),
        createChar('a-riddler', 'P2', 0, 0, false, 'P2_4', 'RIDDLER'),
      ],
      characterDeck: [
        {
          instanceId: 'deck-riddler-source',
          definitionId: 'alpha-source',
          displayName: 'Riddler Source',
          ATK: 12,
          DEF: 9,
          ability: null,
          statRule: null,
          imageKey: 'riddler-source',
        },
      ],
      powerCardHands: {
        P1: [{ instanceId: 'power-y-swap-riddler', definitionId: 'power-alpha-018' }],
        P2: [],
      },
    };

    const afterPlay = playBattlePowerCard(openBattleAndAcknowledge(state), 'P1', {
      instanceId: 'power-y-swap-riddler',
      targetCharacterId: 'y-att',
      secondTargetCharacterId: 'a-riddler',
    });

    const view = getBattlePublicView(afterPlay);
    expect(afterPlay.pendingBattle?.initiatorId).toBe('a-riddler');
    expect(view.initiatorRiddlerSource?.instanceId).toBe('deck-riddler-source');
    expect(view.initiatorEffectiveATK).toBe(12);
    expect(view.initiatorEffectiveComparison).toBe(12);
    expect(afterPlay.characterDeck).toHaveLength(0);
  });

  it('NO SPRAY cancels latest cancelable opponent battle card effects', () => {
    const state = {
      ...createBattleState(),
      powerCardHands: {
        P1: [{ instanceId: 'power-y-nospray', definitionId: 'power-alpha-020' }],
        P2: [{ instanceId: 'power-a-superkick', definitionId: 'power-alpha-004' }],
      },
    };

    const started = openBattleAndAcknowledge(state);
    const p2Turn = acknowledgeBattleHandoff(passBattlePriority(started, 'P1'), 'P2');
    const afterKick = playBattlePowerCard(p2Turn, 'P2', {
      instanceId: 'power-a-superkick',
      selectedChoice: 'DEF',
    });

    const p1Turn = acknowledgeBattleHandoff(afterKick, 'P1');
    const afterNoSpray = playBattlePowerCard(p1Turn, 'P1', {
      instanceId: 'power-y-nospray',
    });

    const view = getBattlePublicView(afterNoSpray);
    expect(view.initiatorEffectiveDEF).toBe(6);
  });

  it('BEHIND THE CURTAINS can resolve in battle without swapping cards', () => {
    const state = {
      ...createBattleState(),
      powerCardHands: {
        P1: [{ instanceId: 'power-y-curtains', definitionId: 'power-alpha-019' }],
        P2: [{ instanceId: 'power-a-card', definitionId: 'power-alpha-001' }],
      },
    };

    const started = openBattleAndAcknowledge(state);
    const afterCurtains = playBattlePowerCard(started, 'P1', {
      instanceId: 'power-y-curtains',
    });

    expect(afterCurtains.powerCardHands.P1).toHaveLength(0);
    expect(afterCurtains.powerCardHands.P2.map(card => card.instanceId)).toEqual(['power-a-card']);
    expect(afterCurtains.usedPowerCardPile.some(card => card.instanceId === 'power-y-curtains')).toBe(true);
  });

  it('BEHIND THE CURTAINS can resolve in battle with one-for-one hand swap', () => {
    const state = {
      ...createBattleState(),
      powerCardHands: {
        P1: [
          { instanceId: 'power-y-curtains', definitionId: 'power-alpha-019' },
          { instanceId: 'power-y-extra', definitionId: 'power-alpha-002' },
        ],
        P2: [
          { instanceId: 'power-a-extra', definitionId: 'power-alpha-003' },
        ],
      },
    };

    const started = openBattleAndAcknowledge(state);
    const afterCurtains = playBattlePowerCard(started, 'P1', {
      instanceId: 'power-y-curtains',
      ownSwapCardInstanceId: 'power-y-extra',
      opponentSwapCardInstanceId: 'power-a-extra',
    });

    expect(afterCurtains.powerCardHands.P1.map(card => card.instanceId)).toEqual(['power-a-extra']);
    expect(afterCurtains.powerCardHands.P2.map(card => card.instanceId)).toEqual(['power-y-extra']);
    expect(afterCurtains.usedPowerCardPile.some(card => card.instanceId === 'power-y-curtains')).toBe(true);
  });

  it('MIND STONE marks currently-held power cards as revealed for the rest of the game', () => {
    const state = {
      ...createBattleState(),
      powerCardHands: {
        P1: [
          { instanceId: 'power-y-mind', definitionId: 'power-alpha-024' },
          { instanceId: 'power-y-other', definitionId: 'power-alpha-002' },
        ],
        P2: [
          { instanceId: 'power-a-other', definitionId: 'power-alpha-003' },
        ],
      },
    };

    const battle = openBattleAndAcknowledge(state);
    const afterMind = playBattlePowerCard(battle, 'P1', {
      instanceId: 'power-y-mind',
    });

    expect(afterMind.revealedPowerCardInstanceIds?.P1).toContain('power-y-mind');
    expect(afterMind.revealedPowerCardInstanceIds?.P1).toContain('power-y-other');
    expect(afterMind.revealedPowerCardInstanceIds?.P2).toContain('power-a-other');
  });

  it('all First Alpha deck definitions are playable when legal conditions are met', () => {
    const inDeckDefinitions = FIRST_ALPHA_POWER_CARD_DEFINITIONS.filter(definition => definition.alphaDeckCount > 0);
    const allDefinitionsInHand = inDeckDefinitions.map((definition, index) => ({
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
        P1: allDefinitionsInHand,
        P2: [],
      },
    };

    const hand = getBattlePrivateHandView(openBattleAndAcknowledge(state), 'P1');
    expect(hand.cards).toHaveLength(inDeckDefinitions.length);
    const conditionallyLegalInWindow = new Set([
      'power-alpha-009',
      'power-alpha-016',
      'power-alpha-017',
      'power-alpha-018',
      'power-alpha-019',
      'power-alpha-020',
      'power-alpha-021',
      'power-alpha-022',
      'power-alpha-025',
      'power-alpha-026',
      'power-alpha-027',
      'power-alpha-028',
      'power-alpha-029',
      'power-alpha-030',
    ]);
    for (const card of hand.cards) {
      if (conditionallyLegalInWindow.has(card.definitionId)) {
        continue;
      }
      expect(card.isPlayable, card.definitionId).toBe(true);
      expect(card.disabledReason, card.definitionId).toBeNull();
    }
  });

  it('staged no-power-card battles still resolve unchanged', () => {
    const baseline = {
      ...createBattleState(),
      powerCardHands: { P1: [], P2: [] },
      usedPowerCardPile: [],
    };

    const instant = executeAttackForward(baseline, 'y-att');

    const started = startBattle(baseline, 'attack', 'y-att');
    const passOne = passBattlePriority(acknowledgeBattleHandoff(started, 'P1'), 'P1');
    const passTwo = passBattlePriority(acknowledgeBattleHandoff(passOne, 'P2'), 'P2');
    const staged = resolvePendingBattle(passTwo);

    expect(staged.gameStatus).toBe(instant.gameStatus);
    expect(staged.activePlayer).toBe(instant.activePlayer);
    expect(staged.turnNumber).toBe(instant.turnNumber);
    expect(staged.graveyard.map(card => card.id)).toEqual(instant.graveyard.map(card => card.id));
  });
});
