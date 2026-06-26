import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';

afterEach(() => {
  cleanup();
});

describe('Phase 3B Step 1 UI', () => {
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

  it('shows unrevealed card backs only and does not leak hidden names/stats in HTML', async () => {
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

    expect(screen.getAllByTestId('active-player').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('turn-number').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('deck-count')[0].textContent).toContain('6');
    expect(screen.getAllByTestId('y-power-count')[0].textContent).toContain('3');
    expect(screen.getAllByTestId('a-power-count')[0].textContent).toContain('3');
    expect(screen.getAllByTestId('graveyard-count')[0].textContent).toContain('0');
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
});
