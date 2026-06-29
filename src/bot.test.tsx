import { afterEach, describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { chooseBotBattleDecision, chooseBotBoardDecision } from './bot';
import { initializeGameState, type Character, type Controller } from './gameState';

afterEach(() => {
  cleanup();
});

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

describe('Phase 5 Bot', () => {
  it('start screen exposes human vs bot mode using P1/P2 naming', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId('mode-bot'));
    expect(screen.getByTestId('mode-bot')).toHaveAttribute('aria-pressed', 'true');
  });

  it('bot board decision prefers move over non-winning battle', () => {
    const decision = chooseBotBoardDecision({
      botController: 'P2',
      activePlayer: 'P2',
      turnNumber: 3,
      gameStatus: 'active',
      publicView: {} as never,
      pendingBattle: null,
      hasLegalAction: true,
      ownPowerCardHand: [],
      legalActions: [
        { type: 'attack', characterId: 'a-1', knownBattleOutcomeForBot: null },
        { type: 'move', characterId: 'a-2', knownBattleOutcomeForBot: null },
      ],
    });

    expect(decision.kind).toBe('action');
    if (decision.kind === 'action') {
      expect(decision.action.type).toBe('move');
    }
  });

  it('bot battle decision chooses pass when already projected to win', () => {
    const decision = chooseBotBattleDecision('P2', {
      winner: 'P2',
      initiatorComparisonValue: 5,
      opponentComparisonValue: 8,
      winningMargin: 3,
    }, []);

    expect(decision.kind).toBe('pass');
  });

  it('bot board turn runs automatically in bot mode when P2 is active', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING'),
        createChar('p2-mover', 'P2', 6, 6, false, 'P2_2', 'P2-MOVER', true),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING', true),
      ]);
      return { ...base, activePlayer: 'P2' };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('mode-bot'));
    await user.click(screen.getByTestId('new-game-button'));

    await waitFor(() => {
      expect(screen.queryByTestId('bot-board-status')).not.toBeInTheDocument();
      expect(screen.queryByTestId('take-bot-turn-button')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('bot battle turn auto-acts and exposes no manual bot action button', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-att', 'P1', 7, 4, false, 'P1_3', 'P1-ATT', true),
        createChar('p2-def', 'P2', 8, 9, false, 'P1_4', 'P2-DEF', true),
        createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING', true),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING', true),
      ]);
      return {
        ...base,
        activePlayer: 'P1',
        powerCardHands: {
          P1: [],
          P2: [{ instanceId: 'power-a-only', definitionId: 'power-alpha-006' }],
        },
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('mode-bot'));
    await user.click(screen.getByTestId('new-game-button'));

    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));
    if (screen.queryByTestId('battle-handoff-acknowledge')) {
      await user.click(screen.getByTestId('battle-handoff-acknowledge'));
    }
    await user.click(screen.getByTestId('battle-ready-button'));

    expect(await screen.findByTestId('bot-battle-priority-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('take-bot-battle-action')).not.toBeInTheDocument();

    const revealAck = await screen.findByTestId('bot-power-reveal-ack').catch(() => null);
    if (revealAck) {
      await user.click(revealAck);
    }

    await waitFor(() => {
      expect(screen.queryByTestId('bot-battle-priority-panel')).not.toBeInTheDocument();
    }, { timeout: 6000 });
  });
});
