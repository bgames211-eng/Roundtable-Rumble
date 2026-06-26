import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
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

describe('Phase 3B Step 2 UI', () => {
  it('renders start screen and allows selecting Y or A', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByTestId('start-screen')).toBeInTheDocument();
    expect(screen.getByText('Roundtable Rumble')).toBeInTheDocument();
    expect(screen.getByText('Manual Two-Player Alpha')).toBeInTheDocument();

    const yRadio = screen.getByRole('radio', { name: /Y/i }) as HTMLInputElement;
    const aRadio = screen.getByRole('radio', { name: /A/i }) as HTMLInputElement;

    expect(yRadio.checked).toBe(true);
    await user.click(aRadio);
    expect(aRadio.checked).toBe(true);
    await user.click(yRadio);
    expect(yRadio.checked).toBe(true);
  });

  it('new game switches to match screen', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId('new-game-button'));
    expect(screen.getByTestId('match-screen')).toBeInTheDocument();
  });

  it('renders all ten board positions with exact top and bottom visual layout', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByTestId('new-game-button'));

    const topRow = screen.getByTestId('top-row');
    const bottomRow = screen.getByTestId('bottom-row');

    expect(topRow).toBeInTheDocument();
    expect(bottomRow).toBeInTheDocument();

    const topSpaces = ['A1', 'A2', 'A3', 'A4', 'A5'];
    const bottomSpaces = ['Y1', 'Y2', 'Y3', 'Y4', 'Y5'];

    for (const space of topSpaces) {
      expect(screen.getByTestId(`space-${space}`)).toBeInTheDocument();
    }
    for (const space of bottomSpaces) {
      expect(screen.getByTestId(`space-${space}`)).toBeInTheDocument();
    }

    const topText = topRow.textContent ?? '';
    const bottomText = bottomRow.textContent ?? '';
    expect(topText.indexOf('A1')).toBeLessThan(topText.indexOf('A2'));
    expect(topText.indexOf('A2')).toBeLessThan(topText.indexOf('A3'));
    expect(topText.indexOf('A3')).toBeLessThan(topText.indexOf('A4'));
    expect(topText.indexOf('A4')).toBeLessThan(topText.indexOf('A5'));

    expect(bottomText.indexOf('Y1')).toBeLessThan(bottomText.indexOf('Y2'));
    expect(bottomText.indexOf('Y2')).toBeLessThan(bottomText.indexOf('Y3'));
    expect(bottomText.indexOf('Y3')).toBeLessThan(bottomText.indexOf('Y4'));
    expect(bottomText.indexOf('Y4')).toBeLessThan(bottomText.indexOf('Y5'));
  });

  it('renders King Start markers on A3 and Y3', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByTestId('new-game-button'));

    expect(screen.getByTestId('king-start-A3')).toBeInTheDocument();
    expect(screen.getByTestId('king-start-Y3')).toBeInTheDocument();
  });

  it('active-player hidden card can be selected and remains anonymous', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('card-001', 'Y', 5, 5, false, 'Y1', 'SECRET-Y-1'),
        createChar('card-002', 'Y', 7, 7, true, 'Y3', 'Y-KING'),
        createChar('card-003', 'A', 6, 6, true, 'A3', 'A-KING'),
        createChar('card-004', 'A', 4, 4, false, 'A1', 'SECRET-A-1'),
      ]);
      return { ...base, activePlayer: 'Y' };
    };

    const { container } = render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));

    await user.click(screen.getByTestId('space-Y1'));
    expect(screen.getByTestId('selected-Y1')).toBeInTheDocument();

    const html = container.innerHTML;
    expect(html).not.toContain('SECRET-Y-1');
    expect(html).not.toContain('ATK 5');
    expect(html).not.toContain('DEF 5');
  });

  it('opponent card cannot be selected', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByTestId('new-game-button'));

    await user.click(screen.getByTestId('space-A1'));
    expect(screen.queryByTestId('selected-A1')).not.toBeInTheDocument();
  });

  it('selection can clear and change', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByTestId('new-game-button'));

    await user.click(screen.getByTestId('space-Y1'));
    expect(screen.getByTestId('selected-Y1')).toBeInTheDocument();

    await user.click(screen.getByTestId('space-Y1'));
    expect(screen.queryByTestId('selected-Y1')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('space-Y2'));
    expect(screen.getByTestId('selected-Y2')).toBeInTheDocument();
  });

  it('selected card shows only legal actions and illegal actions are absent', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('card-011', 'Y', 5, 5, false, 'Y3', 'Y-Attacker'),
        createChar('card-012', 'Y', 7, 7, true, 'Y1', 'Y-KING'),
        createChar('card-013', 'A', 3, 2, false, 'Y4', 'A-Defender'),
        createChar('card-014', 'A', 7, 7, true, 'A3', 'A-KING'),
      ]);
      return { ...base, activePlayer: 'Y' };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-Y3'));

    expect(screen.getByTestId('action-attack')).toBeInTheDocument();
    expect(screen.queryByTestId('action-move')).not.toBeInTheDocument();
    expect(screen.queryByTestId('action-defend')).not.toBeInTheDocument();
  });

  it('successful Move Forward updates board and event log', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('card-021', 'Y', 5, 5, false, 'Y3', 'Y-Mover'),
        createChar('card-022', 'Y', 7, 7, true, 'Y1', 'Y-KING'),
        createChar('card-023', 'A', 7, 7, true, 'A3', 'A-KING'),
      ]);
      return { ...base, activePlayer: 'Y' };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));

    const y4Before = screen.getByTestId('space-Y4');
    expect(within(y4Before).getByTestId('empty-space')).toBeInTheDocument();

    await user.click(screen.getByTestId('space-Y3'));
    await user.click(screen.getByTestId('action-move'));

    const y4After = screen.getByTestId('space-Y4');
    expect(within(y4After).getByTestId('card-back')).toBeInTheDocument();
    expect(screen.getByTestId('event-log')).toHaveTextContent('Move Forward');
  });

  it('battle action opens staged Battle Screen with both participants revealed', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('card-031', 'Y', 5, 5, false, 'Y3', 'Y-Reveal-Attacker'),
        createChar('card-032', 'Y', 7, 7, true, 'Y1', 'Y-KING'),
        createChar('card-033', 'A', 3, 2, false, 'Y4', 'A-Reveal-Defender'),
        createChar('card-034', 'A', 7, 7, true, 'A3', 'A-KING'),
      ]);
      return { ...base, activePlayer: 'Y' };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-Y3'));
    await user.click(screen.getByTestId('action-attack'));

    expect(screen.getByTestId('battle-screen')).toBeInTheDocument();
    expect(screen.getAllByTestId('card-revealed').length).toBeGreaterThan(0);
    expect(screen.getByTestId('battle-type')).toHaveTextContent('Attack Forward');
  });

  it('Skip Turn appears only when active player has no legal actions', async () => {
    const user = userEvent.setup();
    const noLegalSetup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('card-041', 'Y', 6, 6, true, 'Y3', 'Y-KING'),
        createChar('card-046', 'A', 7, 7, true, 'A3', 'A-KING'),
      ]);
      return {
        ...base,
        activePlayer: 'Y',
        gameStatus: 'active',
        characters: base.characters.map(card => {
          if (card.controller !== 'Y') {
            return card;
          }
          return {
            ...card,
            alive: false,
            boardPosition: null,
          };
        }),
      };
    };

    render(<App createGameState={noLegalSetup} />);
    await user.click(screen.getByTestId('new-game-button'));
    expect(screen.getByTestId('skip-turn-button')).toBeInTheDocument();

    cleanup();

    render(<App />);
    await user.click(screen.getByTestId('new-game-button'));
    expect(screen.queryByTestId('skip-turn-button')).not.toBeInTheDocument();
  });

  it('no action controls appear after game over', async () => {
    const user = userEvent.setup();
    const gameOverSetup = (): ReturnType<typeof initializeGameState> => {
      return initializeGameState([
        createChar('card-051', 'Y', 9, 9, true, 'Y3', 'Y-KING'),
        createChar('card-052', 'A', 1, 1, true, 'A3', 'A-KING'),
      ]);
    };

    render(<App createGameState={gameOverSetup} />);
    await user.click(screen.getByTestId('new-game-button'));

    expect(screen.getByTestId('no-actions-after-game-over')).toBeInTheDocument();
    expect(screen.queryByTestId('action-move')).not.toBeInTheDocument();
    expect(screen.queryByTestId('action-attack')).not.toBeInTheDocument();
    expect(screen.queryByTestId('action-defend')).not.toBeInTheDocument();
    expect(screen.queryByTestId('skip-turn-button')).not.toBeInTheDocument();
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
    expect(html).not.toContain('ability');
    expect(html).not.toContain('definitionId');
  });

  it('renders public counts and status fields', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByTestId('new-game-button'));

    expect(screen.getAllByTestId('active-player').length).toBe(1);
    expect(screen.getAllByTestId('turn-number').length).toBe(1);
    expect(screen.getAllByTestId('deck-count').length).toBe(1);
    expect(screen.getByTestId('deck-count').textContent).toContain('6');
    expect(screen.getAllByTestId('y-power-count')[0].textContent).toContain('3');
    expect(screen.getAllByTestId('a-power-count')[0].textContent).toContain('3');
    expect(screen.getAllByTestId('graveyard-count').length).toBe(1);
    expect(screen.getByTestId('graveyard-count').textContent).toContain('0');
  });

  it('renders board direction labels and edge connectors', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByTestId('new-game-button'));

    expect(screen.getByTestId('direction-top')).toHaveTextContent('A5 → A4 → A3 → A2 → A1');
    expect(screen.getByTestId('direction-bottom')).toHaveTextContent('Y1 → Y2 → Y3 → Y4 → Y5');
    expect(screen.getByTestId('right-connector')).toHaveTextContent('Y5');
    expect(screen.getByTestId('right-connector')).toHaveTextContent('A5');
    expect(screen.getByTestId('left-connector')).toHaveTextContent('A1');
    expect(screen.getByTestId('left-connector')).toHaveTextContent('Y1');
  });

  it('Attack starts pending battle and does not instantly resolve', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('y-attacker', 'Y', 9, 6, false, 'Y3', 'Y-ATTACKER'),
        createChar('a-defender', 'A', 3, 3, false, 'Y4', 'A-DEFENDER'),
        createChar('y-king', 'Y', 8, 8, true, 'Y1', 'Y-KING'),
        createChar('a-king', 'A', 8, 8, true, 'A3', 'A-KING'),
      ]);
      return { ...base, activePlayer: 'Y' };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-Y3'));
    await user.click(screen.getByTestId('action-attack'));

    expect(screen.getByTestId('battle-screen')).toBeInTheDocument();
    expect(screen.getByTestId('battle-type')).toHaveTextContent('Attack Forward');
    expect(screen.queryByTestId('battle-resolve-button')).not.toBeInTheDocument();
    expect(screen.queryByText('Attack Forward Outcome')).not.toBeInTheDocument();
  });

  it('Self-Defend starts pending battle and does not instantly resolve', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('y-defender', 'Y', 4, 9, false, 'Y4', 'Y-DEFENDER'),
        createChar('a-enemy', 'A', 6, 3, false, 'Y3', 'A-ENEMY'),
        createChar('y-king', 'Y', 8, 8, true, 'Y1', 'Y-KING'),
        createChar('a-king', 'A', 8, 8, true, 'A3', 'A-KING'),
      ]);
      return { ...base, activePlayer: 'Y' };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-Y4'));
    await user.click(screen.getByTestId('action-defend'));

    expect(screen.getByTestId('battle-screen')).toBeInTheDocument();
    expect(screen.getByTestId('battle-type')).toHaveTextContent('Self-Defend');
    expect(screen.queryByTestId('battle-resolve-button')).not.toBeInTheDocument();
  });

  it('battle start reveals both participants on Battle Screen', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('y-attacker', 'Y', 9, 6, false, 'Y3', 'Y-ATTACKER-NAME'),
        createChar('a-defender', 'A', 3, 3, false, 'Y4', 'A-DEFENDER-NAME'),
        createChar('y-king', 'Y', 8, 8, true, 'Y1', 'Y-KING'),
        createChar('a-king', 'A', 8, 8, true, 'A3', 'A-KING'),
      ]);
      return { ...base, activePlayer: 'Y' };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-Y3'));
    await user.click(screen.getByTestId('action-attack'));

    expect(screen.getAllByTestId('card-revealed').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Y-ATTACKER-NAME')).toBeInTheDocument();
    expect(screen.getByText('A-DEFENDER-NAME')).toBeInTheDocument();
  });

  it('initiator gets first priority and first pass creates privacy handoff', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('y-attacker', 'Y', 9, 6, false, 'Y3', 'Y-ATTACKER'),
        createChar('a-defender', 'A', 3, 3, false, 'Y4', 'A-DEFENDER'),
        createChar('y-king', 'Y', 8, 8, true, 'Y1', 'Y-KING'),
        createChar('a-king', 'A', 8, 8, true, 'A3', 'A-KING'),
      ]);
      return { ...base, activePlayer: 'Y' };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-Y3'));
    await user.click(screen.getByTestId('action-attack'));

    expect(screen.getByTestId('battle-priority')).toHaveTextContent('Y');
    expect(screen.getByTestId('battle-hand-visible')).toHaveTextContent('Visible Actual Hand: Y');

    await user.click(screen.getByTestId('battle-pass-button'));
    expect(screen.getByTestId('battle-handoff')).toHaveTextContent('Pass device to A');

    await user.click(screen.getByTestId('battle-handoff-acknowledge'));
    expect(screen.getByTestId('battle-priority')).toHaveTextContent('A');
    expect(screen.getByTestId('battle-hand-visible')).toHaveTextContent('Visible Actual Hand: A');
  });

  it('two consecutive passes create ReadyToResolve and no outcome occurs before Resolve Battle', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('y-attacker', 'Y', 9, 6, false, 'Y3', 'Y-ATTACKER'),
        createChar('a-defender', 'A', 3, 3, false, 'Y4', 'A-DEFENDER'),
        createChar('y-king', 'Y', 8, 8, true, 'Y1', 'Y-KING'),
        createChar('a-king', 'A', 8, 8, true, 'A3', 'A-KING'),
      ]);
      return { ...base, activePlayer: 'Y' };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-Y3'));
    await user.click(screen.getByTestId('action-attack'));

    await user.click(screen.getByTestId('battle-pass-button'));
    await user.click(screen.getByTestId('battle-handoff-acknowledge'));
    await user.click(screen.getByTestId('battle-pass-button'));

    expect(screen.getByTestId('battle-pass-progress')).toHaveTextContent('2/2');
    expect(screen.getByTestId('battle-resolve-button')).toBeInTheDocument();
    expect(screen.queryByText('King Death')).not.toBeInTheDocument();
    expect(screen.queryByText(/wins/)).not.toBeInTheDocument();
  });

  it('board actions are blocked and View Board is read-only while battle is pending', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('y-attacker', 'Y', 9, 6, false, 'Y3', 'Y-ATTACKER'),
        createChar('a-defender', 'A', 3, 3, false, 'Y4', 'A-DEFENDER'),
        createChar('y-king', 'Y', 8, 8, true, 'Y1', 'Y-KING'),
        createChar('a-king', 'A', 8, 8, true, 'A3', 'A-KING'),
      ]);
      return { ...base, activePlayer: 'Y' };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-Y3'));
    await user.click(screen.getByTestId('action-attack'));

    await user.click(screen.getByTestId('battle-view-board'));

    expect(screen.getByTestId('battle-in-progress-banner')).toBeInTheDocument();
    expect(screen.queryByTestId('action-controls')).not.toBeInTheDocument();
    expect(screen.queryByTestId('skip-turn-button')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('space-Y3'));
    expect(screen.queryByTestId('selected-Y3')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('return-to-battle'));
    expect(screen.getByTestId('battle-screen')).toBeInTheDocument();
  });

  it('Resolve Battle clears pending battle and applies final resolver outcome', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('y-attacker', 'Y', 10, 6, false, 'Y3', 'Y-ATTACKER'),
        createChar('a-defender', 'A', 3, 2, false, 'Y4', 'A-DEFENDER'),
        createChar('y-king', 'Y', 8, 8, true, 'Y1', 'Y-KING'),
        createChar('a-king', 'A', 8, 8, true, 'A3', 'A-KING'),
      ]);
      return { ...base, activePlayer: 'Y' };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-Y3'));
    await user.click(screen.getByTestId('action-attack'));

    await user.click(screen.getByTestId('battle-pass-button'));
    await user.click(screen.getByTestId('battle-handoff-acknowledge'));
    await user.click(screen.getByTestId('battle-pass-button'));
    await user.click(screen.getByTestId('battle-resolve-button'));

    expect(screen.queryByTestId('battle-screen')).not.toBeInTheDocument();
    const y3 = screen.getByTestId('space-Y3');
    expect(within(y3).getByTestId('empty-space')).toBeInTheDocument();
    expect(screen.getByTestId('event-log')).toHaveTextContent('Attack Forward Outcome');
  });

  it('battle rendering does not expose uninvolved hidden card data', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('y-attacker', 'Y', 9, 6, false, 'Y3', 'Y-ATTACKER'),
        createChar('a-defender', 'A', 3, 3, false, 'Y4', 'A-DEFENDER'),
        createChar('y-king', 'Y', 8, 8, true, 'Y1', 'Y-KING'),
        createChar('a-king', 'A', 8, 8, true, 'A3', 'A-KING'),
        createChar('a-hidden', 'A', 1, 1, false, 'A1', 'SECRET-UNINVOLVED-A1'),
      ]);
      return { ...base, activePlayer: 'Y' };
    };

    const { container } = render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('new-game-button'));
    await user.click(screen.getByTestId('space-Y3'));
    await user.click(screen.getByTestId('action-attack'));

    const html = container.innerHTML;
    expect(html).toContain('Y-ATTACKER');
    expect(html).toContain('A-DEFENDER');
    expect(html).not.toContain('SECRET-UNINVOLVED-A1');
    expect(html).not.toContain('definitionId');
    expect(html).not.toContain('ability');
  });
});
