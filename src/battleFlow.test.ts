import { describe, expect, it } from 'vitest';
import { type Character, initializeGameState } from './gameState';
import { executeAttackForward, executeSelfDefend } from './gameEngine';
import {
  getBattlePublicView,
  passBattlePriority,
  recordBattleCardPlay,
  resolvePendingBattle,
  startBattle,
} from './battleFlow';

function createChar(
  id: string,
  controller: 'Y' | 'A',
  ATK: number,
  DEF: number,
  isKing: boolean,
  boardPosition: Character['boardPosition'],
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
  };
}

describe('Phase 3C battleFlow', () => {
  it('Attack starts pending battle and does not instantly resolve', () => {
    const state = initializeGameState([
      createChar('y-att', 'Y', 7, 3, false, 'Y3'),
      createChar('y-king', 'Y', 8, 8, true, 'Y1'),
      createChar('a-def', 'A', 3, 4, false, 'Y4'),
      createChar('a-king', 'A', 8, 8, true, 'A3'),
    ]);

    const started = startBattle(state, 'attack', 'y-att');

    expect(started.pendingBattle).not.toBeNull();
    expect(started.pendingBattle?.status).toBe('WindowOpen');
    expect(started.pendingBattle?.battleType).toBe('attack');
    expect(started.graveyard.length).toBe(0);
    expect(started.turnNumber).toBe(state.turnNumber);
    expect(started.activePlayer).toBe(state.activePlayer);
    expect(started.characters.find(c => c.id === 'y-att')?.boardPosition).toBe('Y3');
    expect(started.characters.find(c => c.id === 'a-def')?.boardPosition).toBe('Y4');
  });

  it('Self-Defend starts pending battle and does not instantly resolve', () => {
    const state = initializeGameState([
      createChar('y-def', 'Y', 3, 8, false, 'Y4'),
      createChar('y-king', 'Y', 8, 8, true, 'Y1'),
      createChar('a-att', 'A', 3, 4, false, 'Y3'),
      createChar('a-king', 'A', 8, 8, true, 'A3'),
    ]);

    const started = startBattle(state, 'defend', 'y-def');

    expect(started.pendingBattle).not.toBeNull();
    expect(started.pendingBattle?.status).toBe('WindowOpen');
    expect(started.pendingBattle?.battleType).toBe('defend');
    expect(started.graveyard.length).toBe(0);
    expect(started.characters.find(c => c.id === 'y-def')?.boardPosition).toBe('Y4');
    expect(started.characters.find(c => c.id === 'a-att')?.boardPosition).toBe('Y3');
  });

  it('Both battle participants are revealed at battle start', () => {
    const state = initializeGameState([
      createChar('y-att', 'Y', 6, 4, false, 'Y3'),
      createChar('a-def', 'A', 2, 2, false, 'Y4'),
      createChar('y-king', 'Y', 8, 8, true, 'Y1'),
      createChar('a-king', 'A', 8, 8, true, 'A3'),
    ]);

    const started = startBattle(state, 'attack', 'y-att');

    expect(started.characters.find(c => c.id === 'y-att')?.revealed).toBe(true);
    expect(started.characters.find(c => c.id === 'a-def')?.revealed).toBe(true);
  });

  it('Initiator receives first priority and priority alternates one-card-or-pass flow', () => {
    const state = initializeGameState([
      createChar('y-att', 'Y', 6, 4, false, 'Y3'),
      createChar('a-def', 'A', 2, 2, false, 'Y4'),
      createChar('y-king', 'Y', 8, 8, true, 'Y1'),
      createChar('a-king', 'A', 8, 8, true, 'A3'),
    ]);

    const started = startBattle(state, 'attack', 'y-att');
    expect(started.pendingBattle?.currentPriorityPlayer).toBe('Y');

    const afterPass = passBattlePriority(started, 'Y');
    expect(afterPass.pendingBattle?.currentPriorityPlayer).toBe('A');
    expect(afterPass.pendingBattle?.consecutivePassCount).toBe(1);

    const afterCardPlay = recordBattleCardPlay(afterPass, 'A');
    expect(afterCardPlay.pendingBattle?.consecutivePassCount).toBe(0);
    expect(afterCardPlay.pendingBattle?.currentPriorityPlayer).toBe('Y');
  });

  it('Two consecutive passes create ReadyToResolve', () => {
    const state = initializeGameState([
      createChar('y-att', 'Y', 6, 4, false, 'Y3'),
      createChar('a-def', 'A', 2, 2, false, 'Y4'),
      createChar('y-king', 'Y', 8, 8, true, 'Y1'),
      createChar('a-king', 'A', 8, 8, true, 'A3'),
    ]);

    const started = startBattle(state, 'attack', 'y-att');
    const passOne = passBattlePriority(started, 'Y');
    const passTwo = passBattlePriority(passOne, 'A');

    expect(passTwo.pendingBattle?.status).toBe('ReadyToResolve');
    expect(passTwo.pendingBattle?.consecutivePassCount).toBe(2);
  });

  it('No death, movement, graveyard change, or turn switch occurs before resolve', () => {
    const state = initializeGameState([
      createChar('y-att', 'Y', 6, 4, false, 'Y3'),
      createChar('a-def', 'A', 2, 2, false, 'Y4'),
      createChar('y-king', 'Y', 8, 8, true, 'Y1'),
      createChar('a-king', 'A', 8, 8, true, 'A3'),
    ]);

    const started = startBattle(state, 'attack', 'y-att');
    const passOne = passBattlePriority(started, 'Y');

    expect(passOne.turnNumber).toBe(state.turnNumber);
    expect(passOne.activePlayer).toBe(state.activePlayer);
    expect(passOne.graveyard.length).toBe(0);
    expect(passOne.characters.find(c => c.id === 'y-att')?.boardPosition).toBe('Y3');
    expect(passOne.characters.find(c => c.id === 'a-def')?.boardPosition).toBe('Y4');
    expect(passOne.characters.find(c => c.id === 'a-def')?.alive).toBe(true);
  });

  it('getBattlePublicView exposes battle participants and safe board view only', () => {
    const state = initializeGameState([
      createChar('y-att', 'Y', 6, 4, false, 'Y3'),
      createChar('a-def', 'A', 2, 2, false, 'Y4'),
      createChar('y-king', 'Y', 8, 8, true, 'Y1'),
      createChar('a-king', 'A', 8, 8, true, 'A3'),
    ]);

    const started = startBattle(state, 'attack', 'y-att');
    const publicView = getBattlePublicView(started);

    expect(publicView.initiator.id).toBe('y-att');
    expect(publicView.opponent.id).toBe('a-def');
    expect(publicView.boardView.characterDeck.remainingCount).toBe(0);
    expect(publicView.initiatorComparisonLabel).toBe('ATK');
    expect(publicView.opponentComparisonLabel).toBe('DEF');
  });

  it('resolvePendingBattle matches existing Phase 2 resolver outcome when no Power Cards are played', () => {
    const baseline = initializeGameState([
      createChar('y-att', 'Y', 10, 4, false, 'Y3'),
      createChar('y-king', 'Y', 8, 8, true, 'Y1'),
      createChar('a-def', 'A', 3, 2, false, 'Y4'),
      createChar('a-king', 'A', 8, 8, true, 'A3'),
    ]);

    const instant = executeAttackForward(baseline, 'y-att');

    const stagedStart = startBattle(baseline, 'attack', 'y-att');
    const stagedPass1 = passBattlePriority(stagedStart, 'Y');
    const stagedPass2 = passBattlePriority(stagedPass1, 'A');
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
      createChar('y-def', 'Y', 4, 8, false, 'Y4'),
      createChar('y-king', 'Y', 8, 8, true, 'Y1'),
      createChar('a-att', 'A', 7, 3, false, 'Y3'),
      createChar('a-king', 'A', 8, 8, true, 'A3'),
    ]);

    const instant = executeSelfDefend(baseline, 'y-def');
    const staged = resolvePendingBattle(
      passBattlePriority(
        passBattlePriority(startBattle(baseline, 'defend', 'y-def'), 'Y'),
        'A',
      ),
    );

    expect(staged.pendingBattle).toBeNull();
    expect(staged.gameStatus).toBe(instant.gameStatus);
    expect(staged.graveyard.map(card => card.id)).toEqual(instant.graveyard.map(card => card.id));
  });
});
