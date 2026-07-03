import { describe, expect, it } from 'vitest';
import { type Character, initializeGameState } from './gameState';
import { executeAttackForward, executeSelfDefend } from './gameEngine';
import {
  acknowledgeBattleHandoff,
  applyBreakingBreadAssembly,
  getBattlePublicView,
  passBattlePriority,
  playBattlePowerCard,
  recordBattleCardPlay,
  resolvePendingBattle,
  startFinalKingDuel,
  startBattle,
} from './battleFlow';

function createChar(
  id: string,
  controller: 'P1' | 'P2',
  ATK: number,
  DEF: number,
  isKing: boolean,
  boardPosition: Character['boardPosition'],
  displayName?: string,
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

describe('Phase 3C battleFlow', () => {
  it('Attack starts pending battle and does not instantly resolve', () => {
    const state = initializeGameState([
      createChar('y-att', 'P1', 7, 3, false, 'P1_3'),
      createChar('y-king', 'P1', 8, 8, true, 'P1_1'),
      createChar('a-def', 'P2', 3, 4, false, 'P1_4'),
      createChar('a-king', 'P2', 8, 8, true, 'P2_3'),
    ]);

    const started = startBattle(state, 'attack', 'y-att');

    expect(started.pendingBattle).not.toBeNull();
    expect(started.pendingBattle?.status).toBe('WindowOpen');
    expect(started.pendingBattle?.battleType).toBe('attack');
    expect(started.graveyard.length).toBe(0);
    expect(started.turnNumber).toBe(state.turnNumber);
    expect(started.activePlayer).toBe(state.activePlayer);
    expect(started.characters.find(c => c.id === 'y-att')?.boardPosition).toBe('P1_3');
    expect(started.characters.find(c => c.id === 'a-def')?.boardPosition).toBe('P1_4');
  });

  it('Self-Defend starts pending battle and does not instantly resolve', () => {
    const state = initializeGameState([
      createChar('y-def', 'P1', 3, 8, false, 'P1_4'),
      createChar('y-king', 'P1', 8, 8, true, 'P1_1'),
      createChar('a-att', 'P2', 3, 4, false, 'P1_3'),
      createChar('a-king', 'P2', 8, 8, true, 'P2_3'),
    ]);

    const started = startBattle(state, 'defend', 'y-def');

    expect(started.pendingBattle).not.toBeNull();
    expect(started.pendingBattle?.status).toBe('WindowOpen');
    expect(started.pendingBattle?.battleType).toBe('defend');
    expect(started.graveyard.length).toBe(0);
    expect(started.characters.find(c => c.id === 'y-def')?.boardPosition).toBe('P1_4');
    expect(started.characters.find(c => c.id === 'a-att')?.boardPosition).toBe('P1_3');
  });

  it('Both battle participants are revealed at battle start', () => {
    const state = initializeGameState([
      createChar('y-att', 'P1', 6, 4, false, 'P1_3'),
      createChar('a-def', 'P2', 2, 2, false, 'P1_4'),
      createChar('y-king', 'P1', 8, 8, true, 'P1_1'),
      createChar('a-king', 'P2', 8, 8, true, 'P2_3'),
    ]);

    const started = startBattle(state, 'attack', 'y-att');

    expect(started.characters.find(c => c.id === 'y-att')?.revealed).toBe(true);
    expect(started.characters.find(c => c.id === 'a-def')?.revealed).toBe(true);
  });

  it('Initiator receives first priority and priority alternates one-card-or-pass flow', () => {
    const state = initializeGameState([
      createChar('y-att', 'P1', 6, 4, false, 'P1_3'),
      createChar('a-def', 'P2', 2, 2, false, 'P1_4'),
      createChar('y-king', 'P1', 8, 8, true, 'P1_1'),
      createChar('a-king', 'P2', 8, 8, true, 'P2_3'),
    ]);

    const started = startBattle(state, 'attack', 'y-att');
    expect(started.pendingBattle?.currentPriorityPlayer).toBe('P1');

    const afterPass = passBattlePriority(started, 'P1');
    expect(afterPass.pendingBattle?.currentPriorityPlayer).toBe('P2');
    expect(afterPass.pendingBattle?.consecutivePassCount).toBe(1);

    const afterCardPlay = recordBattleCardPlay(afterPass, 'P2');
    expect(afterCardPlay.pendingBattle?.consecutivePassCount).toBe(0);
    expect(afterCardPlay.pendingBattle?.currentPriorityPlayer).toBe('P1');
  });

  it('Two consecutive passes create ReadyToResolve', () => {
    const state = initializeGameState([
      createChar('y-att', 'P1', 6, 4, false, 'P1_3'),
      createChar('a-def', 'P2', 2, 2, false, 'P1_4'),
      createChar('y-king', 'P1', 8, 8, true, 'P1_1'),
      createChar('a-king', 'P2', 8, 8, true, 'P2_3'),
    ]);

    const started = startBattle(state, 'attack', 'y-att');
    const passOne = passBattlePriority(started, 'P1');
    const passTwo = passBattlePriority(passOne, 'P2');

    expect(passTwo.pendingBattle?.status).toBe('ReadyToResolve');
    expect(passTwo.pendingBattle?.consecutivePassCount).toBe(2);
  });

  it('No death, movement, graveyard change, or turn switch occurs before resolve', () => {
    const state = initializeGameState([
      createChar('y-att', 'P1', 6, 4, false, 'P1_3'),
      createChar('a-def', 'P2', 2, 2, false, 'P1_4'),
      createChar('y-king', 'P1', 8, 8, true, 'P1_1'),
      createChar('a-king', 'P2', 8, 8, true, 'P2_3'),
    ]);

    const started = startBattle(state, 'attack', 'y-att');
    const passOne = passBattlePriority(started, 'P1');

    expect(passOne.turnNumber).toBe(state.turnNumber);
    expect(passOne.activePlayer).toBe(state.activePlayer);
    expect(passOne.graveyard.length).toBe(0);
    expect(passOne.characters.find(c => c.id === 'y-att')?.boardPosition).toBe('P1_3');
    expect(passOne.characters.find(c => c.id === 'a-def')?.boardPosition).toBe('P1_4');
    expect(passOne.characters.find(c => c.id === 'a-def')?.alive).toBe(true);
  });

  it('getBattlePublicView exposes battle participants and safe board view only', () => {
    const state = initializeGameState([
      createChar('y-att', 'P1', 6, 4, false, 'P1_3'),
      createChar('a-def', 'P2', 2, 2, false, 'P1_4'),
      createChar('y-king', 'P1', 8, 8, true, 'P1_1'),
      createChar('a-king', 'P2', 8, 8, true, 'P2_3'),
    ]);

    const started = startBattle(state, 'attack', 'y-att');
    const publicView = getBattlePublicView(started);

    expect(publicView.initiator.id).toBe('y-att');
    expect(publicView.opponent.id).toBe('a-def');
    expect(publicView.boardView.characterDeck.remainingCount).toBe(0);
    expect(publicView.initiatorComparisonLabel).toBe('ATK');
    expect(publicView.opponentComparisonLabel).toBe('DEF');
  });

  it('Rick and Carl cross-controller synergy applies +2 to battle comparison values when both are revealed/alive', () => {
    const state = initializeGameState([
      createChar('rick', 'P1', 9, 8, false, 'P1_3', 'RICK GRIMES'),
      createChar('carl', 'P2', 5.5, 5, false, 'P1_4', 'CARL GRIMES'),
      createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING'),
      createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
    ]);

    const revealed = {
      ...state,
      characters: state.characters.map(character => (
        character.id === 'rick' || character.id === 'carl'
          ? { ...character, revealed: true }
          : character
      )),
    };

    const started = startBattle(revealed, 'attack', 'rick');
    const publicView = getBattlePublicView(started);

    expect(publicView.initiatorEffectiveComparison).toBe(11);
    expect(publicView.opponentEffectiveComparison).toBe(7);
  });

  it('Rick keeps +2 battle bonus even when Carl is dead', () => {
    const state = initializeGameState([
      createChar('rick', 'P1', 9, 8, false, 'P1_3', 'RICK GRIMES'),
      createChar('enemy', 'P2', 4, 5, false, 'P1_4', 'ENEMY'),
      {
        ...createChar('carl', 'P2', 5.5, 5, false, 'P2_2', 'CARL GRIMES'),
        revealed: true,
        alive: false,
        boardPosition: null,
      },
      createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING'),
      createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
    ]);

    const started = startBattle(state, 'attack', 'rick');
    const publicView = getBattlePublicView(started);

    expect(publicView.initiatorEffectiveComparison).toBe(11);
    expect(publicView.opponentEffectiveComparison).toBe(5);
  });

  it('Rick does not get +2 battle bonus before Carl is revealed', () => {
    const state = initializeGameState([
      {
        ...createChar('rick', 'P1', 9, 8, false, 'P1_3', 'RICK GRIMES'),
        revealed: true,
      },
      createChar('enemy', 'P2', 4, 5, false, 'P1_4', 'ENEMY'),
      {
        ...createChar('carl', 'P2', 5.5, 5, false, 'P2_2', 'CARL GRIMES'),
        revealed: false,
        alive: true,
      },
      createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING'),
      createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
    ]);

    const started = startBattle(state, 'attack', 'rick');
    const publicView = getBattlePublicView(started);

    expect(publicView.initiatorEffectiveComparison).toBe(9);
    expect(publicView.opponentEffectiveComparison).toBe(5);
  });

  it('resolvePendingBattle matches existing Phase 2 resolver outcome when no Power Cards are played', () => {
    const baseline = initializeGameState([
      createChar('y-att', 'P1', 10, 4, false, 'P1_3'),
      createChar('y-king', 'P1', 8, 8, true, 'P1_1'),
      createChar('a-def', 'P2', 3, 2, false, 'P1_4'),
      createChar('a-king', 'P2', 8, 8, true, 'P2_3'),
    ]);

    const instant = executeAttackForward(baseline, 'y-att');

    const stagedStart = startBattle(baseline, 'attack', 'y-att');
    const stagedPass1 = passBattlePriority(stagedStart, 'P1');
    const stagedPass2 = passBattlePriority(stagedPass1, 'P2');
    const stagedResolved = resolvePendingBattle(stagedPass2);

    expect(stagedResolved.pendingBattle).toBeNull();
    expect(stagedResolved.gameStatus).toBe(instant.gameStatus);
    expect(stagedResolved.activePlayer).toBe(instant.activePlayer);
    expect(stagedResolved.turnNumber).toBe(instant.turnNumber);
    expect(stagedResolved.graveyard.map(card => card.id)).toEqual(instant.graveyard.map(card => card.id));

    const stagedCore = stagedResolved.characters.map(c => ({
      id: c.id,
      alive: c.alive,
      boardPosition: c.boardPosition,
      revealed: c.revealed,
    }));
    const instantCore = instant.characters.map(c => ({
      id: c.id,
      alive: c.alive,
      boardPosition: c.boardPosition,
      revealed: c.revealed,
    }));

    expect(stagedCore).toEqual(instantCore);
  });

  it('resolvePendingBattle supports staged Self-Defend and matches instant resolver', () => {
    const baseline = initializeGameState([
      createChar('y-def', 'P1', 4, 8, false, 'P1_4'),
      createChar('y-king', 'P1', 8, 8, true, 'P1_1'),
      createChar('a-att', 'P2', 7, 3, false, 'P1_3'),
      createChar('a-king', 'P2', 8, 8, true, 'P2_3'),
    ]);

    const instant = executeSelfDefend(baseline, 'y-def');
    const staged = resolvePendingBattle(
      passBattlePriority(
        passBattlePriority(startBattle(baseline, 'defend', 'y-def'), 'P1'),
        'P2',
      ),
    );

    expect(staged.pendingBattle).toBeNull();
    expect(staged.gameStatus).toBe(instant.gameStatus);
    expect(staged.graveyard.map(card => card.id)).toEqual(instant.graveyard.map(card => card.id));
  });

  it('Riddler uses bottom character-deck stats for battle and consumes that card to graveyard', () => {
    const baseline = initializeGameState([
      createChar('y-riddler', 'P1', 0, 0, false, 'P1_3', 'RIDDLER'),
      createChar('y-king', 'P1', 8, 8, true, 'P1_1', 'Y-KING'),
      createChar('a-def', 'P2', 4, 2, false, 'P1_4', 'A-DEF'),
      createChar('a-king', 'P2', 8, 8, true, 'P2_3', 'A-KING'),
    ]);

    const withDeck = {
      ...baseline,
      characterDeck: [
        {
          instanceId: 'deck-top',
          definitionId: 'alpha-top',
          displayName: 'Top Card',
          ATK: 1,
          DEF: 1,
          ability: null,
          statRule: null,
          imageKey: 'top',
        },
        {
          instanceId: 'deck-bottom',
          definitionId: 'alpha-bottom',
          displayName: 'Bottom Card',
          ATK: 13,
          DEF: 12,
          ability: null,
          statRule: null,
          imageKey: 'bottom',
        },
      ],
    };

    const started = startBattle(withDeck, 'attack', 'y-riddler');
    const publicView = getBattlePublicView(started);

    expect(publicView.initiatorRiddlerSource?.instanceId).toBe('deck-bottom');
    expect(publicView.initiatorEffectiveComparison).toBe(13);
    expect(started.characterDeck.map(card => card.instanceId)).toEqual(['deck-top']);

    const ready = passBattlePriority(passBattlePriority(started, 'P1'), 'P2');
    const resolved = resolvePendingBattle(ready);

    expect(resolved.graveyard.some(card => card.id === 'deck-bottom')).toBe(true);
  });

  it('Riddler consumed source is placed immediately before defeated Riddler in graveyard order', () => {
    const baseline = initializeGameState([
      createChar('y-riddler', 'P1', 0, 0, false, 'P1_3', 'RIDDLER'),
      createChar('y-king', 'P1', 8, 8, true, 'P1_1', 'Y-KING'),
      createChar('a-att', 'P2', 12, 9, false, 'P1_4', 'A-ATT'),
      createChar('a-king', 'P2', 8, 8, true, 'P2_3', 'A-KING'),
    ]);

    const withDeck = {
      ...baseline,
      characterDeck: [
        {
          instanceId: 'deck-top',
          definitionId: 'alpha-top',
          displayName: 'Top Card',
          ATK: 1,
          DEF: 1,
          ability: null,
          statRule: null,
          imageKey: 'top',
        },
        {
          instanceId: 'deck-bottom',
          definitionId: 'alpha-bottom',
          displayName: 'Bottom Card',
          ATK: 6,
          DEF: 4,
          ability: null,
          statRule: null,
          imageKey: 'bottom',
        },
      ],
    };

    const started = startBattle(withDeck, 'attack', 'y-riddler');
    const ready = passBattlePriority(passBattlePriority(started, 'P1'), 'P2');
    const resolved = resolvePendingBattle(ready);

    const ids = resolved.graveyard.map(card => card.id);
    const sourceIndex = ids.indexOf('deck-bottom');
    const riddlerIndex = ids.indexOf('y-riddler');
    expect(sourceIndex).toBeGreaterThanOrEqual(0);
    expect(riddlerIndex).toBeGreaterThanOrEqual(0);
    expect(sourceIndex + 1).toBe(riddlerIndex);
  });

  it('Mirror main battler copies opponent main battler printed battle stats', () => {
    const baseline = initializeGameState([
      createChar('y-mirror', 'P1', 0, 0, false, 'P1_3', 'MIRROR'),
      createChar('y-king', 'P1', 8, 8, true, 'P1_1', 'Y-KING'),
      createChar('a-def', 'P2', 9, 4, false, 'P1_4', 'A-DEF'),
      createChar('a-king', 'P2', 8, 8, true, 'P2_3', 'A-KING'),
    ]);

    const started = startBattle(baseline, 'attack', 'y-mirror');
    const publicView = getBattlePublicView(started);

    expect(publicView.initiatorEffectiveComparison).toBe(9);
    expect(publicView.opponentEffectiveComparison).toBe(4);
  });

  it('Mirror follower attachment copies opponent main battler stats as attachment bonus', () => {
    const baseline = initializeGameState([
      {
        ...createChar('y-host', 'P1', 2, 2, false, 'P1_3', 'Y-HOST'),
        attachments: [
          {
            instanceId: 'mirror-attach',
            definitionId: 'alpha-046',
            displayName: 'MIRROR',
            category: 'follower',
            ATK: 0,
            DEF: 0,
          },
        ],
      } as Character,
      createChar('y-king', 'P1', 8, 8, true, 'P1_1', 'Y-KING'),
      createChar('a-def', 'P2', 7, 6, false, 'P1_4', 'A-DEF'),
      createChar('a-king', 'P2', 8, 8, true, 'P2_3', 'A-KING'),
    ]);

    const started = startBattle(baseline, 'attack', 'y-host');
    const publicView = getBattlePublicView(started);

    expect(publicView.initiatorEffectiveComparison).toBe(9);
  });

  it('Mirror updates copied stat when opponent main battler changes during battle', () => {
    const baseline = initializeGameState([
      createChar('y-mirror', 'P1', 0, 0, false, 'P1_3', 'MIRROR'),
      createChar('y-king', 'P1', 8, 8, true, 'P1_1', 'Y-KING'),
      createChar('a-old', 'P2', 6, 4, false, 'P1_4', 'A-OLD'),
      createChar('a-king', 'P2', 8, 8, true, 'P2_3', 'A-KING'),
      createChar('a-bench', 'P2', 2, 2, false, 'P2_4', 'A-BENCH'),
    ]);

    const withPhoneFriend = {
      ...baseline,
      powerCardHands: {
        ...baseline.powerCardHands,
        P2: [{ instanceId: 'power-y-phone', definitionId: 'power-alpha-017' }],
      },
      characterDeck: [
        {
          instanceId: 'deck-new-ally',
          definitionId: 'alpha-new-ally',
          displayName: 'NEW ALLY',
          ATK: 11,
          DEF: 1,
          ability: null,
          statRule: null,
          imageKey: 'new-ally',
        },
      ],
    };

    const started = startBattle(withPhoneFriend, 'attack', 'y-mirror');
    expect(getBattlePublicView(started).initiatorEffectiveComparison).toBe(6);

    const passed = passBattlePriority(started, 'P1');
    const acknowledged = acknowledgeBattleHandoff(passed, 'P2');
    const afterPhoneFriend = playBattlePowerCard(acknowledged, 'P2', {
      instanceId: 'power-y-phone',
      targetCharacterId: 'a-old',
    });
    const publicView = getBattlePublicView(afterPhoneFriend);

    expect(publicView.opponent.id).toBe('deck-new-ally');
    expect(publicView.initiatorEffectiveComparison).toBe(11);
  });

  it('Riddler using Mirror source copies opponent main battler stats', () => {
    const baseline = initializeGameState([
      createChar('y-riddler', 'P1', 0, 0, false, 'P1_3', 'RIDDLER'),
      createChar('y-king', 'P1', 8, 8, true, 'P1_1', 'Y-KING'),
      createChar('a-def', 'P2', 8, 5, false, 'P1_4', 'A-DEF'),
      createChar('a-king', 'P2', 8, 8, true, 'P2_3', 'A-KING'),
    ]);

    const withDeck = {
      ...baseline,
      characterDeck: [
        {
          instanceId: 'deck-top',
          definitionId: 'alpha-top',
          displayName: 'Top Card',
          ATK: 1,
          DEF: 1,
          ability: null,
          statRule: null,
          imageKey: 'top',
        },
        {
          instanceId: 'deck-mirror',
          definitionId: 'alpha-046',
          displayName: 'MIRROR',
          ATK: 0,
          DEF: 0,
          ability: null,
          statRule: null,
          imageKey: 'mirror',
        },
      ],
    };

    const started = startBattle(withDeck, 'attack', 'y-riddler');
    const publicView = getBattlePublicView(started);

    expect(publicView.initiatorRiddlerSource?.instanceId).toBe('deck-mirror');
    expect(publicView.initiatorEffectiveComparison).toBe(8);
  });

  it('Ant draws 2 power cards after winning a staged pending battle', () => {
    const baseline = initializeGameState([
      createChar('ant', 'P1', 9, 2, false, 'P1_3', 'ANT'),
      createChar('y-king', 'P1', 8, 8, true, 'P1_1', 'Y-KING'),
      createChar('a-def', 'P2', 2, 2, false, 'P1_4', 'A-DEF'),
      createChar('a-king', 'P2', 8, 8, true, 'P2_3', 'A-KING'),
    ]);

    const initialDeckCount = baseline.powerCardDeck.length;
    const ready = passBattlePriority(passBattlePriority(startBattle(baseline, 'attack', 'ant'), 'P1'), 'P2');
    const resolved = resolvePendingBattle(ready);

    expect(resolved.drawCount.P1).toBe(baseline.drawCount.P1 + 2);
    expect(resolved.powerCardHands.P1).toHaveLength(2);
    expect(resolved.powerCardDeck).toHaveLength(initialDeckCount - 2);
    expect(resolved.eventLog.filter(event => event.action === 'Ant Victory Draw')).toHaveLength(2);
  });

  it('used pile window for a battle includes dropped attachments from defeated characters', () => {
    const baseline = initializeGameState([
      createChar('skar', 'P1', 9, 9, false, 'P1_3', 'SKAR PRODUCTIONS'),
      {
        ...createChar('target', 'P2', 2, 2, false, 'P1_4', 'TARGET'),
        attachments: [
          {
            instanceId: 'ray-gun-drop',
            definitionId: 'power-alpha-011',
            displayName: 'RAY GUN',
            category: 'weapon',
            ATK: 3,
            DEF: 3,
            specialUsed: false,
          },
        ],
      } as Character,
      createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING'),
      createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
    ]);

    const withExistingUsedCard = {
      ...baseline,
      usedPowerCardPile: [
        {
          instanceId: 'old-used',
          definitionId: 'power-alpha-002',
          controller: 'P1' as const,
          displayName: 'OLD',
          selectedChoice: null,
          effectSummary: 'Earlier turn card',
        },
      ],
    };

    const started = startBattle(withExistingUsedCard, 'attack', 'skar');
    const startCount = started.pendingBattle?.usedPowerPileStartCount ?? -1;
    expect(startCount).toBe(1);

    const ready = passBattlePriority(passBattlePriority(started, 'P1'), 'P2');
    const resolved = resolvePendingBattle(ready);

    const thisBattleUsedCards = resolved.usedPowerCardPile.slice(startCount);
    expect(thisBattleUsedCards.some(card => card.instanceId === 'ray-gun-drop')).toBe(true);
  });

  it('defeated follower attachments are sent to graveyard (not used power pile)', () => {
    const baseline = initializeGameState([
      {
        ...createChar('attacker', 'P1', 3, 3, false, 'P1_3', 'ATTACKER'),
        attachments: [
          {
            instanceId: 'follower-drop-1',
            definitionId: 'char-alpha-frenchtoast',
            displayName: 'FRENCH TOAST',
            category: 'follower',
            ATK: 5,
            DEF: 3,
          },
        ],
      } as Character,
      {
        ...createChar('defender', 'P2', 9, 9, false, 'P1_4', 'DEFENDER'),
      } as Character,
      createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING'),
      createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
    ]);

    const started = startBattle(baseline, 'attack', 'attacker');
    const ready = passBattlePriority(passBattlePriority(started, 'P1'), 'P2');
    const resolved = resolvePendingBattle(ready);

    expect(resolved.graveyard.some(card => card.id === 'follower-drop-1')).toBe(true);
    expect(resolved.usedPowerCardPile.some(card => card.instanceId === 'follower-drop-1')).toBe(false);
    const hostIndex = resolved.graveyard.findIndex(card => card.id === 'attacker');
    const followerIndex = resolved.graveyard.findIndex(card => card.id === 'follower-drop-1');
    expect(followerIndex).toBeGreaterThanOrEqual(0);
    expect(hostIndex).toBeGreaterThan(followerIndex);
  });

  it('tie battle graveyard order uses opponent stack first and initiator stack second', () => {
    const baseline = initializeGameState([
      {
        ...createChar('initiator', 'P1', 5, 5, false, 'P1_3', 'INITIATOR'),
        attachments: [
          {
            instanceId: 'init-follower-low',
            definitionId: 'char-alpha-frenchtoast',
            displayName: 'INIT LOW',
            category: 'follower',
            ATK: 2,
            DEF: 1,
          },
          {
            instanceId: 'init-follower-high',
            definitionId: 'char-alpha-heisenberg',
            displayName: 'INIT HIGH',
            category: 'follower',
            ATK: 4,
            DEF: 1,
          },
        ],
      } as Character,
      {
        ...createChar('opponent', 'P2', 6, 10, false, 'P1_4', 'OPPONENT'),
        attachments: [
          {
            instanceId: 'opp-follower-mid',
            definitionId: 'char-alpha-frenchtoast',
            displayName: 'OPP MID',
            category: 'follower',
            ATK: 3,
            DEF: 1,
          },
        ],
      } as Character,
      createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING'),
      createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
    ]);

    const started = startBattle(baseline, 'attack', 'initiator');
    const ready = passBattlePriority(passBattlePriority(started, 'P1'), 'P2');
    const resolved = resolvePendingBattle(ready);

    const stackOrder = resolved.graveyard
      .map(card => card.id)
      .filter(id => id === 'opp-follower-mid' || id === 'opponent' || id === 'init-follower-low' || id === 'init-follower-high' || id === 'initiator');
    expect(stackOrder).toEqual([
      'opp-follower-mid',
      'opponent',
      'init-follower-low',
      'init-follower-high',
      'initiator',
    ]);
  });

  it('final king duel uses Riddler bottom-deck source for ATK comparison', () => {
    const state = initializeGameState([
      createChar('riddler-king', 'P1', 0, 0, true, 'P1_3', 'RIDDLER'),
      createChar('other-king', 'P2', 8, 8, true, 'P2_3', 'OTHER KING'),
    ]);

    const withDeck = {
      ...state,
      characterDeck: [
        {
          instanceId: 'deck-top',
          definitionId: 'alpha-top',
          displayName: 'Top Card',
          ATK: 2,
          DEF: 2,
          ability: null,
          statRule: null,
          imageKey: 'top',
        },
        {
          instanceId: 'deck-bottom',
          definitionId: 'alpha-bottom',
          displayName: 'Bottom Card',
          ATK: 13,
          DEF: 12,
          ability: null,
          statRule: null,
          imageKey: 'bottom',
        },
      ],
    };

    const started = startFinalKingDuel(withDeck);
    const view = getBattlePublicView(started);

    expect(view.initiatorRiddlerSource?.instanceId).toBe('deck-bottom');
    expect(view.initiatorBaseComparison).toBe(13);
    expect(started.characterDeck.map(card => card.instanceId)).toEqual(['deck-top']);
  });

  it('final king duel refills from backup character pile for Riddler source when deck is empty', () => {
    const state = initializeGameState([
      createChar('riddler-king', 'P1', 0, 0, true, 'P1_3', 'RIDDLER'),
      createChar('other-king', 'P2', 9, 9, true, 'P2_3', 'OTHER KING'),
    ]);

    const withBackupOnly = {
      ...state,
      characterDeck: [],
      sessionUsedCharacterPile: [
        {
          instanceId: 'backup-bottom',
          definitionId: 'alpha-backup',
          displayName: 'Backup Bottom',
          ATK: 11,
          DEF: 7,
          ability: null,
          statRule: null,
          imageKey: 'backup-bottom',
        },
      ],
    };

    const started = startFinalKingDuel(withBackupOnly);
    const view = getBattlePublicView(started);

    expect(view.initiatorRiddlerSource?.instanceId).toBe('backup-bottom');
    expect(view.initiatorBaseComparison).toBe(11);
    expect(started.characterDeck).toHaveLength(0);
    expect(started.sessionUsedCharacterPile).toHaveLength(0);
    expect(started.sessionRunoutOccurred).toBe(true);
  });

  it('BREAKING BREAD assembles from backup deck when main deck has no eligible cards even outside multi-game', () => {
    const state = initializeGameState([
      createChar('p1-target', 'P1', 6, 6, false, 'P1_2', 'P1-TARGET'),
      createChar('p1-king', 'P1', 8, 8, true, 'P1_3', 'P1-KING'),
      createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
    ]);

    const withBackupSupply = {
      ...state,
      sessionMode: 'single-game' as const,
      characterDeck: [
        {
          instanceId: 'deck-non-bb',
          definitionId: 'char-alpha-batman',
          displayName: 'BATMAN',
          ATK: 7,
          DEF: 7,
          ability: null,
          statRule: null,
          imageKey: 'batman',
        },
      ],
      sessionUsedCharacterPile: [
        {
          instanceId: 'backup-bread-1',
          definitionId: 'char-alpha-frenchtoast',
          displayName: 'FRENCHTOAST',
          ATK: 3,
          DEF: 3,
          ability: null,
          statRule: null,
          imageKey: 'frenchtoast',
        },
        {
          instanceId: 'backup-bread-2',
          definitionId: 'char-alpha-heisenberg',
          displayName: 'HEISENBERG',
          ATK: 4,
          DEF: 4,
          ability: null,
          statRule: null,
          imageKey: 'heisenberg',
        },
      ],
    };

    const { nextState, assembledCount, assembledDefinitionIds } = applyBreakingBreadAssembly(
      withBackupSupply,
      'P1',
      'p1-target',
    );

    expect(assembledCount).toBe(2);
    expect(assembledDefinitionIds).toEqual(['char-alpha-frenchtoast', 'char-alpha-heisenberg']);
    expect(nextState.characterDeck.map(card => card.instanceId)).toEqual(['deck-non-bb']);
    expect(nextState.sessionUsedCharacterPile).toHaveLength(0);

    const target = nextState.characters.find(character => character.id === 'p1-target');
    expect(target?.attachments?.map(attachment => attachment.definitionId)).toEqual([
      'char-alpha-frenchtoast',
      'char-alpha-heisenberg',
    ]);
  });
});
