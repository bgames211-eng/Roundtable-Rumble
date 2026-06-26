import React, { useMemo, useState } from 'react';
import { type Controller, type GameState } from './gameState';
import { createStandardGameSetup, getPlayerGameView } from './setup';
import { Board } from './ui/Board';
import { StartScreen } from './ui/StartScreen';
import { MatchStatus } from './ui/MatchStatus';

function toPublicEventText(events: Array<{ turn: number; activePlayer: Controller; action: string }>): string[] {
  return [...events]
    .reverse()
    .map(event => `T${event.turn} ${event.activePlayer}: ${event.action}`);
}

export function App(): React.ReactElement {
  const [screen, setScreen] = useState<'start' | 'match'>('start');
  const [firstPlayer, setFirstPlayer] = useState<Controller>('Y');
  const [state, setState] = useState<GameState | null>(null);

  const safeView = useMemo(() => (state ? getPlayerGameView(state) : null), [state]);
  const publicEventLog = useMemo(() => (safeView ? toPublicEventText(safeView.eventLog) : []), [safeView]);

  const startNewGame = (): void => {
    const next = createStandardGameSetup(firstPlayer, Math.random);
    setState(next);
    setScreen('match');
  };

  if (screen === 'start' || !safeView) {
    return React.createElement(StartScreen, {
      firstPlayer,
      onFirstPlayerChange: setFirstPlayer,
      onNewGame: startNewGame,
    });
  }

  return React.createElement(
    'main',
    { className: 'app-shell', 'data-testid': 'match-screen' },
    React.createElement('section', { className: 'left-panel' },
      React.createElement(MatchStatus, {
        view: safeView,
        side: 'Y',
      }),
    ),
    React.createElement('section', { className: 'center-board' },
      React.createElement(Board, { view: safeView }),
    ),
    React.createElement('section', { className: 'right-panel' },
      React.createElement(MatchStatus, {
        view: safeView,
        side: 'A',
      }),
    ),
    React.createElement('section', { className: 'shared-bottom' },
      React.createElement('div', { className: 'status-block shared-summary' },
        React.createElement('h3', null, 'Match Summary'),
        React.createElement('p', { className: 'status-label', 'data-testid': 'active-player' }, `Active: ${safeView.activePlayer}`),
        React.createElement('p', { className: 'status-label', 'data-testid': 'turn-number' }, `Turn: ${safeView.turnNumber}`),
        React.createElement('p', { className: 'status-label', 'data-testid': 'deck-count' }, `Character Deck: ${safeView.characterDeck.remainingCount}`),
        React.createElement('p', { className: 'status-label', 'data-testid': 'graveyard-count' }, `Graveyard Count: ${safeView.graveyard.length}`),
        React.createElement('p', { className: 'status-label', 'data-testid': 'game-status' }, `Status: ${safeView.gameStatus}`),
      ),
      React.createElement('div', { className: 'status-block shared-graveyard', 'data-testid': 'graveyard-panel' },
        React.createElement('h3', null, 'Central Graveyard'),
        safeView.graveyard.length > 0
          ? React.createElement('p', { className: 'status-label', 'data-testid': 'graveyard-top' }, `Top Card: ${safeView.graveyard[safeView.graveyard.length - 1].displayName}`)
          : React.createElement('p', { className: 'status-label', 'data-testid': 'graveyard-top' }, 'Top Card: None'),
        React.createElement('p', { className: 'status-label' }, `Total: ${safeView.graveyard.length}`),
      ),
      React.createElement('div', { className: 'status-block shared-log', 'data-testid': 'event-log' },
        React.createElement('h3', null, 'Event Log (Newest First)'),
        React.createElement(
          'ol',
          { className: 'event-log' },
          publicEventLog.map((entry, idx) => React.createElement('li', { key: `${idx}-${entry}` }, entry)),
        ),
      ),
    ),
  );
}
