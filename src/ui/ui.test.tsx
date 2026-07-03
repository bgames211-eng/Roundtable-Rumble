import { afterEach, describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { initializeGameState, type Character, type Controller } from '../gameState';

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

function buildBattleSetup() {
  return (): ReturnType<typeof initializeGameState> => {
    const base = initializeGameState([
      createChar('p1-attacker', 'P1', 9, 6, false, 'P1_3', 'P1-ATTACKER'),
      createChar('p2-defender', 'P2', 3, 3, false, 'P1_4', 'P2-DEFENDER'),
      createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING'),
      createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
    ]);
    return { ...base, activePlayer: 'P1' };
  };
}

function buildDefendSetup() {
  return (): ReturnType<typeof initializeGameState> => {
    const base = initializeGameState([
      createChar('p1-defender', 'P1', 4, 9, false, 'P1_4', 'P1-DEFENDER'),
      createChar('p2-enemy', 'P2', 6, 3, false, 'P1_3', 'P2-ENEMY'),
      createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING'),
      createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
    ]);
    return { ...base, activePlayer: 'P1' };
  };
}

describe('Phase 5 UI', () => {
  it('requires unique colors before starting a new game', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByTestId('color-select-P1'), 'Blue');

    const p2Select = screen.getByTestId('color-select-P2') as HTMLSelectElement;
    const blueOption = Array.from(p2Select.options).find(option => option.value === 'Blue');
    expect(blueOption).toBeDefined();
    expect(blueOption).toBeDisabled();
    expect(screen.queryByTestId('color-uniqueness-error')).not.toBeInTheDocument();
    expect(screen.getByTestId('new-game-button')).toBeEnabled();
  });

  it('renders the start screen without visible P1/P2 labels', () => {
    const { container } = render(<App />);
    const text = container.textContent ?? '';

    expect(text).toContain('Roundtable Rumble');
    expect(text).not.toContain(' P1');
    expect(text).not.toContain(' P2');
  });

  it('new game switches to match screen', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId('new-game-button'));
    expect(screen.getByTestId('match-screen')).toBeInTheDocument();
  });

  it('renders ten distinct square spaces and both center piles', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByTestId('new-game-button'));

    expect(screen.getByTestId('circular-board')).toBeInTheDocument();
    expect(screen.getByTestId('board-center-piles')).toBeInTheDocument();
    expect(screen.getByTestId('center-graveyard-pile')).toBeInTheDocument();
    expect(screen.getByTestId('center-used-power-pile')).toBeInTheDocument();

    const spaces = ['P1_1', 'P1_2', 'P1_3', 'P1_4', 'P1_5', 'P2_1', 'P2_2', 'P2_3', 'P2_4', 'P2_5'];
    const slotStyles = new Set<string>();

    for (const space of spaces) {
      const node = screen.getByTestId(`space-${space}`);
      expect(node).toBeInTheDocument();
      expect(node.querySelector('.ring-space-square')).toBeTruthy();
      slotStyles.add(node.getAttribute('style') ?? '');
    }

    expect(slotStyles.size).toBe(10);
    expect(screen.getByTestId('territory-divider')).toBeInTheDocument();
    expect(screen.getByTestId('connector-P1_1')).toBeInTheDocument();
    expect(screen.getByTestId('connector-P2_5')).toBeInTheDocument();
  });

  it('renders king start markers on the two king slots', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByTestId('new-game-button'));

    expect(screen.getByTestId('king-start-P1_3')).toBeInTheDocument();
    expect(screen.getByTestId('king-start-P2_3')).toBeInTheDocument();
  });

  it('does not show raw board IDs in visible text', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByTestId('new-game-button'));

    const text = container.textContent ?? '';
    expect(text).not.toContain('P1_1');
    expect(text).not.toContain('P2_5');
    expect(text).not.toContain('P1_3');
  });

  it('does not show raw P1/P2 labels in visible player-facing text', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByTestId('new-game-button'));

    const text = container.textContent ?? '';
    expect(text).not.toContain('P1');
    expect(text).not.toContain('P2');
    expect(text).toContain('Player One');
    expect(text).toContain('Player Two');
  });

  it('shows the active-player hidden card anonymously and keeps opponent selection blocked', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('card-001', 'P1', 5, 5, false, 'P1_1', 'SECRET-HUMAN-1'),
        createChar('card-002', 'P1', 7, 7, true, 'P1_3', 'HUMAN-KING'),
        createChar('card-003', 'P2', 6, 6, true, 'P2_3', 'BOT-KING'),
        createChar('card-004', 'P2', 4, 4, false, 'P2_1', 'SECRET-BOT-1'),
      ]);
      return { ...base, activePlayer: 'P1' };
    };

    const { container } = render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));

    await user.click(screen.getByTestId('space-P1_1'));
    expect(screen.getByTestId('selected-P1_1')).toBeInTheDocument();

    await user.click(screen.getByTestId('space-P2_1'));
    expect(screen.queryByTestId('selected-P2_1')).not.toBeInTheDocument();

    const html = container.innerHTML;
    expect(html).not.toContain('SECRET-HUMAN-1');
    expect(html).not.toContain('ATK 5');
    expect(html).not.toContain('DEF 5');
  });

  it('selection can clear and change', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByTestId('new-game-button'));

    await user.click(screen.getByTestId('space-P1_1'));
    expect(screen.getByTestId('selected-P1_1')).toBeInTheDocument();

    await user.click(screen.getByTestId('space-P1_1'));
    expect(screen.queryByTestId('selected-P1_1')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('space-P1_2'));
    expect(screen.getByTestId('selected-P1_2')).toBeInTheDocument();
  });

  it('selected card shows only legal actions', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('card-011', 'P1', 5, 5, false, 'P1_3', 'P1-Attacker'),
        createChar('card-012', 'P1', 7, 7, true, 'P1_1', 'P1-KING'),
        createChar('card-013', 'P2', 3, 2, false, 'P1_4', 'P2-Defender'),
        createChar('card-014', 'P2', 7, 7, true, 'P2_3', 'P2-KING'),
      ]);
      return { ...base, activePlayer: 'P1' };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));

    expect(screen.getByTestId('action-attack')).toBeInTheDocument();
    expect(screen.queryByTestId('action-move')).not.toBeInTheDocument();
    expect(screen.queryByTestId('action-defend')).not.toBeInTheDocument();
  });

  it('successful move forward updates the board and event log', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('card-021', 'P1', 5, 5, false, 'P1_3', 'P1-Mover'),
        createChar('card-022', 'P1', 7, 7, true, 'P1_1', 'P1-KING'),
        createChar('card-023', 'P2', 7, 7, true, 'P2_3', 'P2-KING'),
      ]);
      return { ...base, activePlayer: 'P1' };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));

    const slot = screen.getByTestId('space-P1_4');
    expect(within(slot).getByTestId('empty-space')).toBeInTheDocument();

    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-move'));

    expect(screen.getByTestId('event-log')).toHaveTextContent('Move Forward');
  });

  it('attack opens battle screen immediately and reveals both participants', async () => {
    const user = userEvent.setup();
    render(<App createGameState={buildBattleSetup()} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));

    expect(screen.queryByTestId('battle-intro')).not.toBeInTheDocument();
    await user.click(await screen.findByTestId('battle-reveal-P1'));

    expect(screen.getByTestId('battle-screen')).toBeInTheDocument();
    expect(screen.getAllByTestId('card-revealed').length).toBeGreaterThan(0);
    expect(screen.getByTestId('battle-type')).toHaveTextContent('ATK vs DEF');
  });

  it('self-defend opens battle screen immediately and keeps battle unresolved', async () => {
    const user = userEvent.setup();
    render(<App createGameState={buildDefendSetup()} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_4'));
    await user.click(screen.getByTestId('action-defend'));

    expect(screen.queryByTestId('battle-intro')).not.toBeInTheDocument();
    await user.click(await screen.findByTestId('battle-reveal-P1'));

    expect(screen.getByTestId('battle-screen')).toBeInTheDocument();
    expect(screen.getByTestId('battle-type')).toHaveTextContent('DEF vs DEF');
    expect(screen.queryByTestId('battle-resolve-button')).not.toBeInTheDocument();
  });

  it('battle renders cinematic overlay and no cutscene cards', async () => {
    const user = userEvent.setup();
    render(<App createGameState={buildBattleSetup()} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));

    expect(screen.queryByTestId('battle-intro')).not.toBeInTheDocument();
    expect(screen.getByTestId('battle-hero-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('battle-embedded-board')).toBeInTheDocument();

    await screen.findByTestId('battle-reveal-P1');
  });

  it('reduced-motion mode still renders battle screen without cutscene intro', async () => {
    const user = userEvent.setup();
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;

    render(<App createGameState={buildBattleSetup()} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));

    await waitFor(() => {
      expect(screen.queryByTestId('battle-intro')).not.toBeInTheDocument();
      expect(screen.getByTestId('battle-hero-overlay')).toBeInTheDocument();
    });

    window.matchMedia = originalMatchMedia;
  });

  it('battle keeps board in background view and has no expand toggle control', async () => {
    const user = userEvent.setup();
    render(<App createGameState={buildBattleSetup()} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));

    await user.click(await screen.findByTestId('battle-reveal-P1'));
    expect(screen.getByTestId('battle-embedded-board')).toBeInTheDocument();
    expect(screen.queryByTestId('battle-toggle-board-size')).not.toBeInTheDocument();
  });

  it('ready flow exposes resolve button after both players are ready', async () => {
    const user = userEvent.setup();
    render(<App createGameState={buildBattleSetup()} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));

    await user.click(await screen.findByTestId('battle-reveal-P1'));
    await user.click(screen.getByTestId('battle-ready-button'));
    await user.click(screen.getByTestId('battle-reveal-P2'));
    await user.click(screen.getByTestId('battle-ready-button'));

    expect(screen.getByTestId('battle-resolve-button')).toBeInTheDocument();
  });

  it('resolve battle clears pending battle', async () => {
    const user = userEvent.setup();
    render(<App createGameState={buildBattleSetup()} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));

    await user.click(await screen.findByTestId('battle-reveal-P1'));
    await user.click(screen.getByTestId('battle-ready-button'));
    await user.click(screen.getByTestId('battle-reveal-P2'));
    await user.click(screen.getByTestId('battle-ready-button'));
    await user.click(screen.getByTestId('battle-resolve-button'));

    expect(screen.queryByTestId('battle-screen')).not.toBeInTheDocument();
  });

  it('battle screen keeps the embedded board read only', async () => {
    const user = userEvent.setup();
    render(<App createGameState={buildBattleSetup()} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));

    await user.click(await screen.findByTestId('battle-reveal-P1'));

    expect(screen.getByTestId('battle-embedded-board')).toBeInTheDocument();
    expect(screen.queryByTestId('action-controls')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('space-P1_3'));
    expect(screen.queryByTestId('selected-P1_3')).not.toBeInTheDocument();
  });

  it('renders public counts and status fields', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByTestId('new-game-button'));

    expect(screen.getByTestId('turn-banner')).toBeInTheDocument();
    expect(screen.getByTestId('active-player')).toHaveTextContent('Player One');
    expect(screen.getByTestId('turn-number')).toHaveTextContent('Round 1');
    expect(screen.getByTestId('character-deck-stack')).toHaveTextContent('Character Deck');
    expect(screen.getByTestId('power-deck-stack')).toHaveTextContent('Power Card Deck');
    expect(screen.getByTestId('graveyard-panel')).toBeInTheDocument();
    expect(screen.getByTestId('graveyard-top')).toHaveTextContent('Top Card: None');
  });

  it('rendered HTML still does not leak unrevealed names or stats', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByTestId('new-game-button'));

    expect(screen.getAllByTestId('card-back').length).toBe(10);

    const html = container.innerHTML;
    expect(html).not.toContain('BRENDAN');
    expect(html).not.toContain('LUKE');
    expect(html).not.toContain('JOHN CENA');
    expect(html).not.toContain('ATK ');
    expect(html).not.toContain('DEF ');
    expect(html).not.toContain('alpha-');
    expect(html).not.toContain('definitionId');
  });

  it('Skip Turn appears only when active player has no legal actions', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByTestId('new-game-button'));
    expect(screen.queryByTestId('skip-turn-button')).not.toBeInTheDocument();
  });

  it('king-only board enters final king duel battle instead of ending immediately', async () => {
    const user = userEvent.setup();
    const gameOverSetup = (): ReturnType<typeof initializeGameState> => {
      return initializeGameState([
        createChar('card-051', 'P1', 9, 9, true, 'P1_3', 'P1-KING'),
        createChar('card-052', 'P2', 1, 1, true, 'P2_3', 'P2-KING'),
      ]);
    };

    render(<App createGameState={gameOverSetup} />);
    await user.click(screen.getByTestId('new-game-button'));

    expect(screen.getByTestId('battle-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('action-controls')).not.toBeInTheDocument();
  });

  it('private hand is hidden until reveal and shows only the chosen side hand', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('y-attacker', 'P1', 9, 6, false, 'P1_3', 'P1-ATTACKER'),
        createChar('a-defender', 'P2', 3, 3, false, 'P1_4', 'P2-DEFENDER'),
        createChar('y-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING'),
        createChar('a-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
        powerCardHands: {
          P1: [
            { instanceId: 'power-y-001', definitionId: 'power-alpha-006' },
            { instanceId: 'power-y-002', definitionId: 'power-alpha-004' },
          ],
          P2: [
            { instanceId: 'power-a-001', definitionId: 'power-alpha-005' },
          ],
        },
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));

    expect(screen.getByTestId('battle-reveal-P1')).toHaveTextContent('Reveal');
    expect(screen.queryByTestId('battle-private-hand-P1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('battle-private-hand-P2')).not.toBeInTheDocument();
    expect(screen.getByTestId('battle-hidden-back-P1-0')).toBeInTheDocument();
    expect(screen.getByTestId('battle-hidden-back-P2-0')).toBeInTheDocument();

    await user.click(await screen.findByTestId('battle-reveal-P1'));
    expect(screen.getByTestId('battle-reveal-P1')).toHaveTextContent('Hide');
    expect(screen.getByTestId('battle-private-hand-P1')).toBeInTheDocument();
    expect(screen.queryByTestId('battle-private-hand-P2')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('battle-reveal-P1'));
    expect(screen.getByTestId('battle-reveal-P1')).toHaveTextContent('Reveal');
    expect(screen.queryByTestId('battle-private-hand-P1')).not.toBeInTheDocument();
    expect(screen.getByTestId('battle-hidden-back-P1-0')).toBeInTheDocument();
  });

  it('both real hands are never in the DOM together during battle privacy flow', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('y-attacker', 'P1', 9, 6, false, 'P1_3', 'P1-ATTACKER'),
        createChar('a-defender', 'P2', 3, 3, false, 'P1_4', 'P2-DEFENDER'),
        createChar('y-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING'),
        createChar('a-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
        powerCardHands: {
          P1: [{ instanceId: 'power-y-010', definitionId: 'power-alpha-006' }],
          P2: [{ instanceId: 'power-a-010', definitionId: 'power-alpha-005' }],
        },
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));

    await user.click(await screen.findByTestId('battle-reveal-P1'));
    expect(screen.getByTestId('battle-private-hand-P1')).toBeInTheDocument();
    expect(screen.queryByTestId('battle-private-hand-P2')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('battle-ready-button'));
    await user.click(screen.getByTestId('battle-reveal-P2'));
    expect(screen.getByTestId('battle-private-hand-P2')).toBeInTheDocument();
    expect(screen.queryByTestId('battle-private-hand-P1')).not.toBeInTheDocument();
  });

  it('battle screen contains a small read-only embedded board and current score banner', async () => {
    const user = userEvent.setup();
    render(<App createGameState={buildBattleSetup()} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));

    await user.click(await screen.findByTestId('battle-reveal-P1'));

    expect(screen.getByTestId('battle-embedded-board')).toBeInTheDocument();
    expect(screen.getByTestId('battle-score-banner')).toBeInTheDocument();
    expect(screen.queryByTestId('action-controls')).not.toBeInTheDocument();
  });

  it('battle event history does not expose raw controller IDs', async () => {
    const user = userEvent.setup();
    render(<App createGameState={buildBattleSetup()} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));

    await user.click(await screen.findByTestId('battle-reveal-P1'));
    const text = screen.getByTestId('battle-event-history').textContent ?? '';
    expect(text).not.toContain('P1');
    expect(text).not.toContain('P2');
  });

  it('board-phase hand stays visible for revealed player and battle-only cards are disabled', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByTestId('new-game-button'));

    expect(screen.getByTestId('manual-handoff-row')).toBeInTheDocument();
    expect(screen.getByTestId('manual-reveal-P1')).toHaveTextContent('Reveal');
    expect(screen.getByTestId('manual-handoff-row').querySelectorAll('[data-testid^="manual-power-"]').length).toBe(0);
    await user.click(screen.getByTestId('manual-reveal-P1'));
    expect(screen.getByTestId('manual-reveal-P1')).toHaveTextContent('Hide');

    expect(screen.getByTestId('manual-handoff-row').querySelectorAll('[data-testid^="manual-power-"]').length).toBeGreaterThan(0);

    await user.click(screen.getByTestId('manual-reveal-P1'));
    expect(screen.getByTestId('manual-reveal-P1')).toHaveTextContent('Reveal');
    expect(screen.getByTestId('manual-handoff-row').querySelectorAll('[data-testid^="manual-power-"]').length).toBe(0);
  });

  it('hand hides and opposing reveal control appears when board-phase turn changes', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('y-move', 'P1', 5, 5, false, 'P1_3', 'P1-MOVE'),
        createChar('a-safe', 'P2', 5, 5, true, 'P2_3', 'P2-SAFE'),
      ]);
      return { ...base, activePlayer: 'P1' };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('manual-reveal-P1'));

    expect(screen.getByTestId('manual-handoff-row')).toBeInTheDocument();

    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-move'));

    expect(screen.queryByTestId('manual-handoff-row')?.querySelectorAll('[data-testid^="manual-power-"]').length ?? 0).toBe(0);
    expect(screen.getByTestId('manual-reveal-P2')).toBeInTheDocument();
  });

  it('implemented battle cards show enabled Play control when legal', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('y-attacker', 'P1', 9, 6, false, 'P1_3', 'P1-ATTACKER'),
        createChar('a-defender', 'P2', 3, 3, false, 'P1_4', 'P2-DEFENDER'),
        createChar('y-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING'),
        createChar('a-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
        powerCardHands: {
          P1: [{ instanceId: 'power-y-unimpl', definitionId: 'power-alpha-001' }],
          P2: [],
        },
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));
    await user.click(await screen.findByTestId('battle-reveal-P1'));

    await user.click(screen.getByTestId('battle-card-tap-power-y-unimpl'));
    expect(screen.getByTestId('battle-inspector-play-button')).toBeEnabled();
  });

  it('battle screen exposes the current human and bot readiness compactly', async () => {
    const user = userEvent.setup();
    render(<App createGameState={buildBattleSetup()} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));

    await user.click(await screen.findByTestId('battle-reveal-P1'));
    expect(screen.getByTestId('battle-ready-p1')).toHaveTextContent('Player One Ready: No');
    expect(screen.getByTestId('battle-ready-p2')).toHaveTextContent('Player Two Ready: No');
  });

  it('battle full-board link opens and returns to battle correctly', async () => {
    const user = userEvent.setup();
    render(<App createGameState={buildBattleSetup()} />);

    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));

    await user.click(screen.getByTestId('battle-open-full-board-header'));
    expect(await screen.findByTestId('battle-full-board-view')).toBeInTheDocument();
    await user.click(screen.getByTestId('battle-return-to-battle'));

    await user.click(await screen.findByTestId('battle-reveal-P1'));

    await user.click(screen.getByTestId('battle-open-full-board-header'));
    expect(screen.getByTestId('battle-full-board-view')).toBeInTheDocument();
  });

  it('battle full-board allows inspecting unrevealed cards without flipping them face-up', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-attacker', 'P1', 9, 6, false, 'P1_3', 'P1-ATTACKER'),
        createChar('p2-defender', 'P2', 3, 3, false, 'P1_4', 'P2-DEFENDER'),
        createChar('p2-hidden', 'P2', 7, 7, false, 'P2_1', 'SECRET-HIDDEN'),
        createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING'),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return { ...base, activePlayer: 'P1' };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));

    await user.click(screen.getByTestId('battle-open-full-board-header'));
    await user.click(screen.getByTestId('space-P2_1'));

    const readModal = screen.getByTestId('battle-fullboard-character-read');
    expect(readModal).toBeInTheDocument();
    expect(within(readModal).getByTestId('battle-fullboard-read-card')).toHaveClass('character-hidden');
    expect(readModal).not.toHaveTextContent('SECRET-HIDDEN');
  });

  it('battle full-board opens a hidden character with follower attachments without crashing', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-attacker', 'P1', 9, 6, false, 'P1_3', 'P1-ATTACKER'),
        createChar('p2-defender', 'P2', 3, 3, false, 'P1_4', 'P2-DEFENDER'),
        createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING'),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
        characters: base.characters.map(character => (
          character.id === 'p2-defender'
            ? {
                ...character,
                attachments: [
                  {
                    instanceId: 'follower-heisenberg-1',
                    definitionId: 'char-alpha-heisenberg',
                    displayName: 'HEISENBERG',
                    category: 'follower',
                    ATK: 4,
                    DEF: 4,
                  },
                ],
              }
            : character
        )),
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));

    await user.click(screen.getByTestId('battle-open-full-board-header'));
    await user.click(screen.getByTestId('space-P1_4'));

    const readModal = await screen.findByTestId('battle-fullboard-character-read');
    expect(within(readModal).getByTestId('battle-fullboard-read-attachment-rail')).toBeInTheDocument();
    expect(within(readModal).getByTestId('battle-fullboard-read-card')).toBeInTheDocument();
  });

  it('battle full-board shows Uncle Iroh anytime special button when Iroh is revealed', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-attacker', 'P1', 9, 6, false, 'P1_3', 'P1-ATTACKER'),
        createChar('p2-defender', 'P2', 3, 3, false, 'P1_4', 'P2-DEFENDER'),
        createChar('p1-iroh', 'P1', 9, 7, false, 'P1_1', 'UNCLE IROH'),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
        characters: base.characters.map(character => (
          character.id === 'p1-iroh'
            ? { ...character, revealed: true }
            : character
        )),
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));

    await user.click(screen.getByTestId('battle-open-full-board-header'));
    await user.click(screen.getByTestId('space-P1_1'));

    expect(screen.getByTestId('battle-fullboard-anytime-special-button')).toBeInTheDocument();
    expect(screen.getByTestId('battle-fullboard-anytime-special-button')).toHaveTextContent('Use Uncle Iroh Counter (30s)');
  });

  it('manual battle mode shows Iroh anytime special for the current priority player', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-attacker', 'P1', 9, 6, false, 'P1_3', 'P1-ATTACKER'),
        createChar('p2-defender', 'P2', 3, 3, false, 'P1_4', 'P2-DEFENDER'),
        createChar('p2-iroh', 'P2', 9, 7, false, 'P2_1', 'UNCLE IROH'),
        createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING'),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
        characters: base.characters.map(character => (
          character.id === 'p2-iroh'
            ? { ...character, revealed: true }
            : character
        )),
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));

    await user.click(screen.getByTestId('battle-ready-button'));
    await user.click(screen.getByTestId('battle-reveal-P1'));

    await user.click(screen.getByTestId('battle-open-full-board-header'));
    await user.click(screen.getByTestId('space-P2_1'));

    expect(screen.getByTestId('battle-fullboard-anytime-special-button')).toHaveTextContent('Use Uncle Iroh Counter (30s)');
  });

  it('manual battle SWAP CHARACTERS opens Iroh counter prompt before swap resolves', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-rapunzel', 'P1', 5, 7, false, 'P1_3', 'RAPUNZEL'),
        createChar('p2-iroh', 'P2', 9, 7, false, 'P1_4', 'UNCLE IROH'),
        createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING'),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
        characters: base.characters.map(character => (
          character.id === 'p2-iroh'
            ? { ...character, revealed: true }
            : character
        )),
        powerCardHands: {
          ...base.powerCardHands,
          P1: [{ instanceId: 'power-y-swap', definitionId: 'power-alpha-018' }],
          P2: [],
        },
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));

    await user.click(await screen.findByTestId('battle-reveal-P1'));
    await user.click(screen.getByTestId('battle-card-tap-power-y-swap'));
    await user.click(screen.getByTestId('battle-inspector-play-button'));

    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('battle-swap-own-confirm'));
    await user.click(screen.getByTestId('space-P1_4'));
    await user.click(screen.getByTestId('battle-swap-opponent-confirm'));

    const reactionModal = await screen.findByTestId('battle-nospray-reaction-modal');
    expect(reactionModal).toHaveTextContent('Uncle Iroh Counter');
    expect(screen.getByTestId('battle-nospray-use-button')).toHaveTextContent('Use Uncle Iroh Counter');
    await user.click(screen.getByTestId('battle-nospray-use-button'));

    await waitFor(() => {
      expect(screen.queryByTestId('battle-nospray-reaction-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('battle-screen')).toBeInTheDocument();
    });
  });

  it('manual battle NO SPRAY prompt sends the canceled card to the used pile immediately', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-rapunzel', 'P1', 5, 7, false, 'P1_3', 'RAPUNZEL'),
        createChar('p2-nospray', 'P2', 9, 7, false, 'P1_4', 'P2-NO-SPRAY'),
        createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING'),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
        characters: base.characters.map(character => (
          character.id === 'p2-nospray'
            ? { ...character, revealed: true }
            : character
        )),
        powerCardHands: {
          ...base.powerCardHands,
          P1: [{ instanceId: 'power-y-swap', definitionId: 'power-alpha-018' }],
          P2: [{ instanceId: 'power-a-nospray', definitionId: 'power-alpha-020' }],
        },
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));

    await user.click(await screen.findByTestId('battle-reveal-P1'));
    await user.click(screen.getByTestId('battle-card-tap-power-y-swap'));
    await user.click(screen.getByTestId('battle-inspector-play-button'));

    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('battle-swap-own-confirm'));
    await user.click(screen.getByTestId('space-P1_4'));
    await user.click(screen.getByTestId('battle-swap-opponent-confirm'));

    const reactionModal = await screen.findByTestId('battle-nospray-reaction-modal');
    expect(reactionModal).toHaveTextContent('NO SPRAY');
    expect(screen.getByTestId('battle-nospray-use-button')).toHaveTextContent('Use NO SPRAY');

    await user.click(screen.getByTestId('battle-nospray-use-button'));

    expect(screen.getByTestId('battle-nospray-reaction-modal')).toHaveTextContent('NO SPRAY Card View');
    expect(screen.getByTestId('battle-nospray-use-button')).toHaveTextContent('Play This Card');
    expect(screen.getByTestId('battle-nospray-card-back-button')).toBeInTheDocument();

    await user.click(screen.getByTestId('battle-nospray-use-button'));

    await waitFor(() => {
      const usedPile = screen.getByTestId('center-used-power-pile');
      const firstUsed = usedPile.querySelector('[data-testid="center-used-power-card-0"] img') as HTMLImageElement | null;
      const secondUsed = usedPile.querySelector('[data-testid="center-used-power-card-1"] img') as HTMLImageElement | null;
      expect(firstUsed?.getAttribute('src') ?? '').toContain('swap%20characters');
      expect(secondUsed?.getAttribute('src') ?? '').toContain('no%20spray');
    });

    await waitFor(() => {
      expect(screen.queryByTestId('battle-nospray-reaction-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('battle-screen')).toBeInTheDocument();
    });

    expect(screen.getByTestId('battle-event-history').textContent ?? '').toContain('NO SPRAY canceled SWAP CHARACTERS');
  });

  it('bot battle still shows opponent power-card backs when Mind Stone was not played', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-attacker', 'P1', 9, 6, false, 'P1_3', 'P1-ATTACKER'),
        createChar('p2-defender', 'P2', 7, 7, false, 'P1_4', 'P2-DEFENDER'),
        createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING'),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
        powerCardHands: {
          P1: [{ instanceId: 'power-y-1', definitionId: 'power-alpha-004' }],
          P2: [
            { instanceId: 'power-a-1', definitionId: 'power-alpha-001' },
            { instanceId: 'power-a-2', definitionId: 'power-alpha-020' },
          ],
        },
      };
    };

    render(<App initialGameMode="Human vs Bot" createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));

    await user.click(await screen.findByTestId('battle-reveal-P1'));

    expect(screen.getByTestId('battle-hidden-back-P2-0')).toBeInTheDocument();
    expect(screen.getByTestId('battle-hidden-back-P2-1')).toBeInTheDocument();
  });

  it('does not show selected-card special button for an opponent revealed ability card', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-attacker', 'P1', 9, 6, false, 'P1_3', 'P1-ATTACKER'),
        createChar('p2-iroh', 'P2', 9, 7, false, 'P2_1', 'UNCLE IROH'),
        createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING'),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
        characters: base.characters.map(character => (
          character.id === 'p2-iroh'
            ? { ...character, revealed: true }
            : character
        )),
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P2_1'));

    expect(screen.queryByTestId('character-special-from-selected')).not.toBeInTheDocument();
  });

  it('battle full-board character click exposes Jeremy Jahns anytime special', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-attacker', 'P1', 9, 6, false, 'P1_3', 'P1-ATTACKER'),
        createChar('p2-defender', 'P2', 3, 3, false, 'P1_4', 'P2-DEFENDER'),
        createChar('p1-jeremy', 'P1', 8, 7, false, 'P1_1', 'JEREMY JAHNS'),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
        characters: base.characters.map(character => (
          character.id === 'p1-jeremy'
            ? { ...character, revealed: true }
            : character
        )),
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));

    await user.click(screen.getByTestId('battle-open-full-board-header'));
    await user.click(screen.getByTestId('space-P1_1'));
    expect(screen.getByTestId('battle-full-board-view')).toBeInTheDocument();
    expect(screen.getByTestId('battle-fullboard-anytime-special-button')).toHaveTextContent('Use Jeremy Jahns Special');
  });

  it('battle full-board does not show Jeremy special for opponent-owned Jeremy', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-attacker', 'P1', 9, 6, false, 'P1_3', 'P1-ATTACKER'),
        createChar('p2-defender', 'P2', 3, 3, false, 'P1_4', 'P2-DEFENDER'),
        createChar('p2-jeremy', 'P2', 8, 7, false, 'P2_1', 'JEREMY JAHNS'),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
        characters: base.characters.map(character => (
          character.id === 'p2-jeremy'
            ? { ...character, revealed: true }
            : character
        )),
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));

    await user.click(screen.getByTestId('battle-open-full-board-header'));
    await user.click(screen.getByTestId('space-P2_1'));
    expect(screen.getByTestId('battle-full-board-view')).toBeInTheDocument();
    expect(screen.queryByTestId('battle-fullboard-anytime-special-button')).not.toBeInTheDocument();
  });

  it('closing a character view opened from the battle screen returns to the battle screen', async () => {
    const user = userEvent.setup();

    render(<App createGameState={buildBattleSetup()} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));
    await user.click(await screen.findByTestId('battle-reveal-P1'));

    await user.click(screen.getByTestId('battle-open-character-p1-attacker'));
    expect(screen.getByTestId('battle-screen-character-read')).toBeInTheDocument();

    await user.click(screen.getByTestId('battle-screen-read-close'));
    expect(screen.getByTestId('battle-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('battle-full-board-view')).not.toBeInTheDocument();
  });

  it('Jeremy special modal supports view switching between full board and battle screen', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-attacker', 'P1', 9, 6, false, 'P1_3', 'P1-ATTACKER'),
        createChar('p2-defender', 'P2', 3, 3, false, 'P1_4', 'P2-DEFENDER'),
        createChar('p1-jeremy', 'P1', 8, 7, false, 'P1_1', 'JEREMY JAHNS'),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
        characters: base.characters.map(character => (
          character.id === 'p1-jeremy'
            ? { ...character, revealed: true }
            : character
        )),
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));

    await user.click(screen.getByTestId('battle-open-full-board-header'));
    await user.click(screen.getByTestId('space-P1_1'));
    await user.click(screen.getByTestId('battle-fullboard-anytime-special-button'));

    expect(screen.getByTestId('jeremy-special-modal')).toBeInTheDocument();
    expect(screen.getByTestId('jeremy-view-indicator')).toHaveTextContent('Viewing: Full Board');

    await user.click(screen.getByTestId('jeremy-view-battle'));
    expect(screen.getByTestId('battle-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('jeremy-special-modal')).not.toBeInTheDocument();
    expect(screen.getByTestId('jeremy-reopen-controls')).toBeInTheDocument();

    await user.click(screen.getByTestId('jeremy-return-selection'));
    expect(screen.getByTestId('jeremy-special-modal')).toBeInTheDocument();
    expect(screen.getByTestId('jeremy-view-indicator')).toHaveTextContent('Viewing: Battle Screen');

    await user.click(screen.getByTestId('jeremy-view-full-board'));
    expect(screen.getByTestId('battle-full-board-view')).toBeInTheDocument();
    expect(screen.queryByTestId('jeremy-special-modal')).not.toBeInTheDocument();
    expect(screen.getByTestId('jeremy-reopen-controls')).toBeInTheDocument();

    await user.click(screen.getByTestId('jeremy-return-selection'));
    expect(screen.getByTestId('jeremy-special-modal')).toBeInTheDocument();
    expect(screen.getByTestId('jeremy-view-indicator')).toHaveTextContent('Viewing: Full Board');
  });

  it('TAG TEAM with an unrevealed allied character behind battler does not blank battle screen', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-keith', 'P1', 8, 6, false, 'P1_3', 'KEITH'),
        createChar('p1-behind', 'P1', 5, 4, false, 'P1_2', 'P1-BEHIND-HIDDEN'),
        createChar('p2-iroh', 'P2', 9, 7, false, 'P1_4', 'UNCLE IROH'),
        createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING'),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
        powerCardHands: {
          ...base.powerCardHands,
          P1: [{ instanceId: 'power-y-tag-team', definitionId: 'power-alpha-016' }],
          P2: [],
        },
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));

    await user.click(screen.getByTestId('battle-reveal-P1'));
    await user.click(screen.getByTestId('battle-card-tap-power-y-tag-team'));
    await user.click(screen.getByTestId('battle-inspector-play-button'));

    expect(screen.getByTestId('match-screen')).toBeInTheDocument();
    expect(screen.getByTestId('battle-screen')).toBeInTheDocument();
  });

  it('BEHIND THE CURTAINS locks in after play and allows switching between battle and full-board views', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-attacker', 'P1', 9, 6, false, 'P1_3', 'P1-ATTACKER'),
        createChar('p2-defender', 'P2', 3, 3, false, 'P1_4', 'P2-DEFENDER'),
        createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING'),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
        powerCardHands: {
          ...base.powerCardHands,
          P1: [{ instanceId: 'power-y-curtains', definitionId: 'power-alpha-019' }],
          P2: [],
        },
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));
    await user.click(screen.getByTestId('battle-reveal-P1'));

    await user.click(screen.getByTestId('battle-card-tap-power-y-curtains'));
    await user.click(screen.getByTestId('battle-inspector-play-button'));

    expect(screen.getByTestId('board-curtains-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('curtains-cancel')).not.toBeInTheDocument();
    expect(screen.getByTestId('curtains-view-indicator')).toHaveTextContent('Viewing: Full Board');

    await user.click(screen.getByTestId('curtains-view-battle'));
    expect(screen.getByTestId('battle-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('board-curtains-modal')).not.toBeInTheDocument();
    expect(screen.getByTestId('curtains-reopen-controls')).toBeInTheDocument();

    await user.click(screen.getByTestId('curtains-return-selection'));
    expect(screen.getByTestId('board-curtains-modal')).toBeInTheDocument();
    expect(screen.getByTestId('curtains-view-indicator')).toHaveTextContent('Viewing: Battle Screen');

    await user.click(screen.getByTestId('curtains-view-full-board'));
    expect(screen.getByTestId('battle-full-board-view')).toBeInTheDocument();
    expect(screen.queryByTestId('board-curtains-modal')).not.toBeInTheDocument();
    expect(screen.getByTestId('curtains-reopen-controls')).toBeInTheDocument();

    await user.click(screen.getByTestId('curtains-return-selection'));
    expect(screen.getByTestId('board-curtains-modal')).toBeInTheDocument();
    expect(screen.getByTestId('curtains-view-indicator')).toHaveTextContent('Viewing: Full Board');
  });

  it('main board character view shows active Uncle Iroh timer tag after arming', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-iroh', 'P1', 9, 7, false, 'P1_1', 'UNCLE IROH'),
        createChar('p1-king', 'P1', 8, 8, true, 'P1_3', 'P1-KING'),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
        characters: base.characters.map(character => (
          character.id === 'p1-iroh'
            ? { ...character, revealed: true }
            : character
        )),
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_1'));
    await user.click(screen.getByTestId('character-special-from-selected'));
    await user.click(screen.getByTestId('space-P1_1'));
    await user.click(screen.getByTestId('board-read-selected-card'));

    const modal = screen.getByTestId('board-character-read-modal');
    expect(within(modal).getByTestId('character-status-tag')).toHaveTextContent(/^Iroh\s+\d+s$/);
  });

  it('battle full-board character view shows active Uncle Iroh timer tag after arming', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-attacker', 'P1', 9, 6, false, 'P1_3', 'P1-ATTACKER'),
        createChar('p2-defender', 'P2', 3, 3, false, 'P1_4', 'P2-DEFENDER'),
        createChar('p1-iroh', 'P1', 9, 7, false, 'P1_1', 'UNCLE IROH'),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
        characters: base.characters.map(character => (
          character.id === 'p1-iroh'
            ? { ...character, revealed: true }
            : character
        )),
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_1'));
    await user.click(screen.getByTestId('character-special-from-selected'));

    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));
    await user.click(screen.getByTestId('battle-open-full-board-header'));
    await user.click(screen.getByTestId('space-P1_1'));

    const modal = screen.getByTestId('battle-fullboard-character-read');
    expect(within(modal).getByTestId('character-status-tag')).toHaveTextContent(/^Iroh\s+\d+s$/);
  });

  it('main board character view shows -1 status tag for Avatar Aang after escape is used', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-aang', 'P1', 7.5, 7.5, false, 'P1_1', 'AVATAR AANG'),
        createChar('p1-king', 'P1', 8, 8, true, 'P1_3', 'P1-KING'),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
        characters: base.characters.map(character => (
          character.id === 'p1-aang'
            ? {
                ...character,
                revealed: true,
                abilityUsed: true,
                statRule: 'Permanent -1 ATK AND DEF',
              }
            : character
        )),
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_1'));
    await user.click(screen.getByTestId('board-read-selected-card'));

    const modal = screen.getByTestId('board-character-read-modal');
    expect(within(modal).getByTestId('character-status-tag')).toHaveTextContent('-1');
  });

  it('attachment opened from main board character view renders as a large card', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-skar', 'P1', 7.5, 6, false, 'P1_1', 'SKAR PRODUCTIONS'),
        createChar('p1-king', 'P1', 8, 8, true, 'P1_3', 'P1-KING'),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
        characters: base.characters.map(character => (
          character.id === 'p1-skar'
            ? {
                ...character,
                revealed: true,
                attachments: [
                  {
                    instanceId: 'follower-french-toast-1',
                    definitionId: 'char-alpha-frenchtoast',
                    displayName: 'FRENCH TOAST',
                    category: 'follower',
                    ATK: 5,
                    DEF: 3,
                  },
                ],
              }
            : character
        )),
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_1'));
    await user.click(screen.getByTestId('board-read-selected-card'));

    await user.click(screen.getByTestId('board-character-read-attachment-follower-french-toast-1'));

    const attachmentModal = await screen.findByTestId('attachment-card-read-modal');
    const frame = within(attachmentModal).getByTestId('attachment-card-read-frame');
    expect(frame).toHaveClass('character-card-battle');
    expect(frame).not.toHaveClass('character-card-compact');
  });

  it('Aang escape targeting overlay keeps board clickable and limits legal spots after battle death', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-aang', 'P1', 2, 2, false, 'P1_3', 'AVATAR AANG'),
        createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING'),
        createChar('p2-heavy', 'P2', 10, 10, false, 'P1_4', 'P2-HEAVY'),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));

    await user.click(await screen.findByTestId('battle-reveal-P1'));
    await user.click(screen.getByTestId('battle-ready-button'));
    await user.click(screen.getByTestId('battle-reveal-P2'));
    await user.click(screen.getByTestId('battle-ready-button'));
    await user.click(screen.getByTestId('battle-resolve-button'));

    await user.click(await screen.findByTestId('aang-escape-use'));

    const modal = screen.getByTestId('aang-escape-modal');
    expect(modal).toHaveClass('board-targeting-overlay');
    expect(screen.getByTestId('action-target-P1_2')).toBeInTheDocument();
    expect(screen.getByTestId('action-target-P1_5')).toBeInTheDocument();
    expect(screen.queryByTestId('action-target-P1_3')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('action-target-P1_5'));
    await waitFor(() => {
      expect(screen.queryByTestId('aang-escape-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('event-log')).toHaveTextContent('Avatar Aang Escape');
    });
  });

  it('Aang escape uses attacker-start and forward-from-Aang options when Aang is attacked and loses', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-attacker', 'P1', 10, 10, false, 'P1_3', 'P1-ATTACKER'),
        createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING'),
        createChar('p2-aang', 'P2', 2, 2, false, 'P1_4', 'AVATAR AANG'),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));

    await user.click(await screen.findByTestId('battle-reveal-P1'));
    await user.click(screen.getByTestId('battle-ready-button'));
    await user.click(screen.getByTestId('battle-reveal-P2'));
    await user.click(screen.getByTestId('battle-ready-button'));
    await user.click(screen.getByTestId('battle-resolve-button'));

    await user.click(await screen.findByTestId('aang-escape-use'));

    expect(screen.getByTestId('action-target-P1_3')).toBeInTheDocument();
    expect(screen.getByTestId('action-target-P1_5')).toBeInTheDocument();
    expect(screen.queryByTestId('action-target-P1_4')).not.toBeInTheDocument();
    expect(screen.queryByTestId('action-target-P1_2')).not.toBeInTheDocument();
  });

  it('King Aang battle loss defers game end until escape decision when legal spots exist', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-attacker', 'P1', 10, 10, false, 'P1_3', 'P1-ATTACKER'),
        createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING'),
        createChar('p2-aang-king', 'P2', 2, 2, true, 'P1_4', 'AVATAR AANG'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));

    await user.click(await screen.findByTestId('battle-reveal-P1'));
    await user.click(screen.getByTestId('battle-ready-button'));
    await user.click(screen.getByTestId('battle-reveal-P2'));
    await user.click(screen.getByTestId('battle-ready-button'));
    await user.click(screen.getByTestId('battle-resolve-button'));

    expect(await screen.findByTestId('aang-escape-modal')).toBeInTheDocument();
    expect(screen.getByTestId('game-status')).toHaveTextContent('Status: active');

    await user.click(screen.getByTestId('aang-escape-use'));
    expect(screen.getByTestId('action-target-P1_3')).toBeInTheDocument();
    expect(screen.getByTestId('action-target-P1_5')).toBeInTheDocument();

    await user.click(screen.getByTestId('aang-escape-pass'));
    expect(screen.getByTestId('aang-escape-modal')).toBeInTheDocument();

    await user.click(screen.getByTestId('aang-escape-pass'));
    await waitFor(() => {
      expect(screen.queryByTestId('aang-escape-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('game-status')).toHaveTextContent('Status: P1 wins');
    });
  });

  it('Nightcrawler king teleport across territory triggers king draw event and FX banner', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        {
          ...createChar('p1-nightcrawler', 'P1', 6.5, 7, true, 'P1_5', 'NIGHTCRAWLER'),
          revealed: true,
        },
        createChar('p1-side', 'P1', 4, 4, false, 'P1_3', 'P1-SIDE'),
        createChar('p2-side', 'P2', 4, 4, false, 'P2_2', 'P2-SIDE'),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_5'));
    await user.click(screen.getByTestId('character-special-from-selected'));

    expect(screen.getByTestId('action-target-P2_5')).toBeInTheDocument();
    await user.click(screen.getByTestId('action-target-P2_5'));

    await waitFor(() => {
      expect(screen.getByTestId('event-log')).toHaveTextContent('King Territory Draw');
      expect(screen.getByTestId('king-draw-animation')).toBeInTheDocument();
    });
  });

  it('card rotation stays mild and readable across the ring', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByTestId('new-game-button'));

    const cards = Array.from(document.querySelectorAll('.character-card-frame'));
    expect(cards.length).toBeGreaterThan(0);

    for (const card of cards) {
      const transform = card.getAttribute('style') ?? '';
      const match = transform.match(/rotate\((-?\d+(?:\.\d+)?)deg\)/);
      const rotation = match ? Math.abs(Number(match[1])) : 0;
      expect(rotation).toBeLessThanOrEqual(12);
    }
  });

  it('card placement remains separated in the normal setup', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByTestId('new-game-button'));

    const positions = ['P1_1', 'P1_2', 'P1_3', 'P1_4', 'P1_5', 'P2_1', 'P2_2', 'P2_3', 'P2_4', 'P2_5'];
    const distinctStyles = new Set<string>();

    for (const position of positions) {
      distinctStyles.add(screen.getByTestId(`space-${position}`).getAttribute('style') ?? '');
    }

    expect(distinctStyles.size).toBe(10);
  });

  it('bot mode shows the human hand at the bottom and hides the bot hand from the DOM', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('human-card', 'P1', 8, 8, true, 'P1_1', 'HUMAN-KING'),
        createChar('human-side', 'P1', 4, 4, false, 'P1_3', 'HUMAN-SIDE'),
        createChar('bot-card', 'P2', 8, 8, true, 'P2_3', 'BOT-KING'),
        createChar('bot-side', 'P2', 4, 4, false, 'P2_1', 'BOT-SIDE'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
        powerCardHands: {
          P1: [{ instanceId: 'power-human-1', definitionId: 'power-alpha-006' }],
          P2: [{ instanceId: 'power-bot-1', definitionId: 'power-alpha-005' }],
        },
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('mode-bot'));
    await user.click(screen.getByTestId('new-game-button'));

    expect(screen.getByTestId('human-hand-panel')).toBeInTheDocument();
    expect(screen.getByTestId('human-power-cards')).toBeInTheDocument();
    expect(screen.queryByText('BOT-KING')).not.toBeInTheDocument();
  });

  it('bot opponent cards remain face down at the top in bot mode', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByTestId('mode-bot'));
    await user.click(screen.getByTestId('new-game-button'));

    expect(screen.getByTestId('opponent-power-cards')).toBeInTheDocument();
    expect(screen.getAllByTestId('card-back').length).toBeGreaterThan(0);
  });

  it('battle visibility does not leak uninterested hidden card data', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('y-attacker', 'P1', 9, 6, false, 'P1_3', 'P1-ATTACKER'),
        createChar('a-defender', 'P2', 3, 3, false, 'P1_4', 'P2-DEFENDER'),
        createChar('y-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING'),
        createChar('a-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
        createChar('a-hidden', 'P2', 1, 1, false, 'P2_1', 'SECRET-UNINVOLVED-BOT'),
      ]);
      return { ...base, activePlayer: 'P1' };
    };

    const { container } = render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));
    await user.click(await screen.findByTestId('battle-reveal-P1'));

    const html = container.innerHTML;
    expect(html).not.toContain('SECRET-UNINVOLVED-BOT');
    expect(html).not.toContain('definitionId');
  });

  it('board swap flow confirms both picks and swaps team control', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-own', 'P1', 6, 6, false, 'P1_2', 'P1-OWN'),
        createChar('p1-king', 'P1', 8, 8, true, 'P1_3', 'P1-KING'),
        createChar('p2-opp', 'P2', 6, 6, false, 'P2_4', 'P2-OPP'),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
        powerCardHands: {
          P1: [{ instanceId: 'power-y-swap', definitionId: 'power-alpha-018' }],
          P2: [],
        },
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('manual-reveal-P1'));

    await user.click(screen.getByTestId('manual-power-button-power-y-swap'));
    await user.click(screen.getByTestId('board-power-card-play-button'));

    await user.click(screen.getByTestId('space-P1_2'));
    expect(await screen.findByTestId('board-character-read-modal')).toBeInTheDocument();
    await user.click(screen.getByTestId('board-swap-own-confirm'));

    await user.click(screen.getByTestId('space-P2_4'));
    expect(await screen.findByTestId('board-character-read-modal')).toBeInTheDocument();
    await user.click(screen.getByTestId('board-swap-opponent-confirm'));

    await waitFor(() => {
      expect(screen.getByTestId('event-log')).toHaveTextContent('Swap Characters Move');
    }, { timeout: 3500 });

    await user.click(screen.getByTestId('space-P1_2'));
    expect(screen.getByTestId('selected-P1_2')).toBeInTheDocument();

    await user.click(screen.getByTestId('space-P1_2'));
    await user.click(screen.getByTestId('space-P2_4'));
    expect(screen.queryByTestId('selected-P2_4')).not.toBeInTheDocument();
  });

  it('board BREAKING BREAD targets own alive card and confirms from character modal header', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-own', 'P1', 6, 6, false, 'P1_2', 'P1-OWN'),
        createChar('p1-king', 'P1', 8, 8, true, 'P1_3', 'P1-KING'),
        createChar('p2-opp', 'P2', 6, 6, false, 'P2_4', 'P2-OPP'),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
        characterDeck: [
          {
            instanceId: 'deck-bread-1',
            definitionId: 'char-alpha-frenchtoast',
            displayName: 'FRENCHTOAST',
            ATK: 3,
            DEF: 3,
            ability: null,
            statRule: null,
            imageKey: 'frenchtoast',
          },
          {
            instanceId: 'deck-bread-2',
            definitionId: 'char-alpha-heisenberg',
            displayName: 'HEISENBERG',
            ATK: 4,
            DEF: 4,
            ability: null,
            statRule: null,
            imageKey: 'heisenberg',
          },
        ],
        powerCardHands: {
          P1: [{ instanceId: 'power-y-breaking-bread', definitionId: 'power-alpha-030' }],
          P2: [],
        },
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('manual-reveal-P1'));

    await user.click(screen.getByTestId('manual-power-button-power-y-breaking-bread'));
    await user.click(screen.getByTestId('board-power-card-play-button'));

    await user.click(screen.getByTestId('space-P1_2'));
    expect(await screen.findByTestId('board-character-read-modal')).toBeInTheDocument();
    expect(screen.getByTestId('board-breaking-bread-confirm-top')).toBeInTheDocument();

    await user.click(screen.getByTestId('board-breaking-bread-confirm-top'));

    await waitFor(() => {
      expect(screen.getByTestId('event-log')).toHaveTextContent('Breaking Bread Assembly');
      expect(screen.queryByTestId('board-character-read-modal')).not.toBeInTheDocument();
    });
  });

  it('battle BREAKING BREAD opens full board targeting and only then triggers NO SPRAY window', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-attacker', 'P1', 7, 6, false, 'P1_3', 'P1-ATTACKER'),
        createChar('p2-defender', 'P2', 6, 6, false, 'P1_4', 'P2-DEFENDER'),
        createChar('p1-backline', 'P1', 4, 8, false, 'P1_2', 'P1-BACKLINE'),
        createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING'),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
        characterDeck: [
          {
            instanceId: 'deck-bread-1',
            definitionId: 'char-alpha-frenchtoast',
            displayName: 'FRENCHTOAST',
            ATK: 3,
            DEF: 3,
            ability: null,
            statRule: null,
            imageKey: 'frenchtoast',
          },
          {
            instanceId: 'deck-bread-2',
            definitionId: 'char-alpha-hank',
            displayName: 'HANKSCHRADER',
            ATK: 4,
            DEF: 5,
            ability: null,
            statRule: null,
            imageKey: 'hank',
          },
        ],
        powerCardHands: {
          P1: [{ instanceId: 'power-y-breaking-bread', definitionId: 'power-alpha-030' }],
          P2: [{ instanceId: 'power-a-nospray', definitionId: 'power-alpha-020' }],
        },
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));
    await user.click(await screen.findByTestId('battle-reveal-P1'));

    await user.click(screen.getByTestId('battle-card-tap-power-y-breaking-bread'));
    await user.click(screen.getByTestId('battle-inspector-play-button'));

    expect(screen.getByTestId('battle-full-board-view')).toBeInTheDocument();
    expect(screen.queryByTestId('battle-nospray-reaction-modal')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('space-P1_2'));
    expect(await screen.findByTestId('battle-breaking-bread-character-read')).toBeInTheDocument();
    await user.click(screen.getByTestId('battle-breaking-bread-confirm'));

    const reactionModal = await screen.findByTestId('battle-nospray-reaction-modal');
    expect(reactionModal).toBeInTheDocument();
    await user.click(screen.getByTestId('battle-nospray-use-button'));
    expect(screen.getByTestId('battle-nospray-use-button')).toHaveTextContent('Play This Card');
    await user.click(screen.getByTestId('battle-nospray-use-button'));

    await waitFor(() => {
      expect(screen.queryByTestId('battle-nospray-reaction-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('battle-screen')).toBeInTheDocument();
    });
  });

  it('battle REALITY STONE play opens full board targeting without crashing', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-attacker', 'P1', 7, 6, false, 'P1_3', 'P1-ATTACKER'),
        createChar('p2-defender', 'P2', 6, 6, false, 'P1_4', 'P2-DEFENDER'),
        createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING'),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
        powerCardHands: {
          P1: [{ instanceId: 'power-y-reality', definitionId: 'power-alpha-025' }],
          P2: [],
        },
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));

    await user.click(await screen.findByTestId('battle-reveal-P1'));
    await user.click(screen.getByTestId('battle-card-tap-power-y-reality'));
    await user.click(screen.getByTestId('battle-inspector-play-button'));

    await waitFor(() => {
      expect(screen.getByTestId('match-screen')).toBeInTheDocument();
      expect(screen.getByTestId('battle-screen')).toBeInTheDocument();
    });
  });

  it('board THE FORGE places on open space and equips landing character', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-mover', 'P1', 6, 6, false, 'P1_3', 'P1-MOVER'),
        createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING'),
        createChar('p2-guard', 'P2', 5, 5, false, 'P2_1', 'P2-GUARD'),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
        powerCardHands: {
          P1: [{ instanceId: 'power-y-forge', definitionId: 'power-alpha-040' }],
          P2: [],
        },
        powerCardDeck: [{ instanceId: 'power-y-pocket', definitionId: 'power-alpha-011' }],
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('manual-reveal-P1'));

    await user.click(screen.getByTestId('manual-power-button-power-y-forge'));
    await user.click(screen.getByTestId('board-power-card-play-button'));
    await user.click(screen.getByTestId('action-target-P1_4'));

    expect(screen.getByTestId('forge-location-P1_4')).toBeInTheDocument();

    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-move'));

    expect(await screen.findByTestId('forge-welcome-modal')).toBeInTheDocument();
    await user.click(screen.getByTestId('forge-weapon-option-power-y-pocket'));
    await user.click(screen.getByTestId('forge-confirm-weapon'));

    await waitFor(() => {
      expect(screen.queryByTestId('forge-welcome-modal')).not.toBeInTheDocument();
      expect(screen.queryByTestId('forge-location-P1_4')).not.toBeInTheDocument();
      expect(screen.getByTestId('event-log')).toHaveTextContent('Forge Weapon Equipped');
    });
  });

  it('battle weapon equip resolves after confirm and removes the weapon from hand', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-attacker', 'P1', 7, 6, false, 'P1_3', 'P1-ATTACKER'),
        createChar('p2-defender', 'P2', 6, 6, false, 'P1_4', 'P2-DEFENDER'),
        createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING'),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
        powerCardHands: {
          P1: [{ instanceId: 'power-y-batarang', definitionId: 'power-alpha-013' }],
          P2: [],
        },
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));

    await user.click(await screen.findByTestId('battle-reveal-P1'));
    await user.click(screen.getByTestId('battle-card-tap-power-y-batarang'));
    await user.click(screen.getByTestId('battle-inspector-play-button'));

    await user.click(screen.getByTestId('space-P1_3'));
    expect(await screen.findByTestId('battle-weapon-character-read')).toBeInTheDocument();
    await user.click(screen.getByTestId('battle-weapon-confirm'));

    await waitFor(() => {
      expect(screen.queryByTestId('battle-weapon-character-read')).not.toBeInTheDocument();
      expect(screen.queryByTestId('battle-card-tap-power-y-batarang')).not.toBeInTheDocument();
    });
  });

  it('board REALITY STONE play opens targeting modal without crashing', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-own', 'P1', 6, 6, false, 'P1_2', 'P1-OWN'),
        createChar('p1-king', 'P1', 8, 8, true, 'P1_3', 'P1-KING'),
        createChar('p2-opp', 'P2', 6, 6, false, 'P2_4', 'P2-OPP'),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
        powerCardHands: {
          P1: [{ instanceId: 'power-y-reality-board', definitionId: 'power-alpha-025' }],
          P2: [],
        },
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('manual-reveal-P1'));
    await user.click(screen.getByTestId('manual-power-button-power-y-reality-board'));
    await user.click(screen.getByTestId('board-power-card-play-button'));

    expect(await screen.findByTestId('reality-stone-targeting-modal')).toBeInTheDocument();
  });

  it('Reality targeting does not reveal unrevealed hand or board character identity in selected text', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-own', 'P1', 6, 6, false, 'P1_2', 'P1-OWN'),
        createChar('p1-king', 'P1', 8, 8, true, 'P1_3', 'P1-KING'),
        createChar('p2-hidden-char', 'P2', 6, 6, false, 'P2_4', 'P2-SECRET-CHAR'),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
        powerCardHands: {
          P1: [{ instanceId: 'power-y-reality-board', definitionId: 'power-alpha-025' }],
          P2: [{ instanceId: 'power-a-hidden', definitionId: 'power-alpha-017' }],
        },
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('manual-reveal-P1'));
    await user.click(screen.getByTestId('manual-power-button-power-y-reality-board'));
    await user.click(screen.getByTestId('board-power-card-play-button'));

    expect(await screen.findByTestId('reality-stone-targeting-modal')).toBeInTheDocument();

    await user.click(screen.getByTestId('reality-target-hand-P2-power-a-hidden'));
    expect(screen.getByTestId('reality-selected-target')).toHaveTextContent('Hidden Power Card');
    expect(screen.getByTestId('reality-selected-target')).not.toHaveTextContent('PHONE A FRIEND');

    await user.click(screen.getByTestId('reality-target-boardchar-p2-hidden-char'));
    expect(screen.getByTestId('reality-selected-target')).toHaveTextContent('Hidden Character');
    expect(screen.getByTestId('reality-selected-target')).not.toHaveTextContent('P2-SECRET-CHAR');
  });

  it('board NO SPRAY can cancel BEHIND THE CURTAINS in main board view', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-own', 'P1', 6, 6, false, 'P1_2', 'P1-OWN'),
        createChar('p1-king', 'P1', 8, 8, true, 'P1_3', 'P1-KING'),
        createChar('p2-own', 'P2', 6, 6, false, 'P2_2', 'P2-OWN'),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING'),
      ]);

      return {
        ...base,
        activePlayer: 'P1',
        powerCardHands: {
          P1: [{ instanceId: 'power-y-curtains', definitionId: 'power-alpha-019' }],
          P2: [{ instanceId: 'power-a-nospray', definitionId: 'power-alpha-020' }],
        },
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('manual-reveal-P1'));
    expect(screen.getByTestId('game-mode-label')).toHaveTextContent('Mode: Player One vs Player Two');

    await user.click(await screen.findByTestId('manual-power-button-power-y-curtains'));
    await user.click(screen.getByTestId('board-power-card-play-button'));
    await user.click(screen.getByTestId('curtains-confirm'));
    await user.click(await screen.findByTestId('manual-reveal-P2'));

    await waitFor(() => {
      expect(screen.queryByTestId('board-curtains-modal')).not.toBeInTheDocument();
    });

    expect(await screen.findByTestId('board-nospray-reaction-modal')).toBeInTheDocument();
    await user.click(screen.getByTestId('board-nospray-use-button'));

    await waitFor(() => {
      expect(screen.queryByTestId('board-nospray-reaction-modal')).not.toBeInTheDocument();
      expect(screen.queryByTestId('board-curtains-modal')).not.toBeInTheDocument();
    });

    await user.click(await screen.findByTestId('manual-reveal-P1'));
    expect(screen.queryByTestId('manual-power-button-power-y-curtains')).not.toBeInTheDocument();
  });
});