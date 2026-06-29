import React from 'react';
import { type Controller } from '../gameState';
import { type PlayerSafeGameView } from '../setup';
import type { PlayerColor } from './StartScreen';

interface MatchStatusProps {
  view: PlayerSafeGameView;
  side: Controller;
  color?: PlayerColor;
}

export function MatchStatus({ view, side, color }: MatchStatusProps): React.ReactElement {
  const isActive = view.activePlayer === side;
  const powerCount = side === 'P1' ? view.powerCardHandCount.P1 : view.powerCardHandCount.P2;
  const displayName = side === 'P1' ? 'Player One' : 'Player Two';

  return React.createElement(
    React.Fragment,
    null,
    React.createElement('div', { className: 'status-block', 'data-testid': `${side}-status` },
      React.createElement('h3', null, displayName),
      color ? React.createElement('p', { className: 'status-label', 'data-testid': `${side}-color` }, `Color: ${color}`) : null,
      React.createElement('p', { className: 'status-label', 'data-testid': `${side}-state` }, isActive ? 'Status: Your Turn' : 'Status: Waiting'),
      React.createElement('p', {
        className: 'status-label',
        'data-testid': side === 'P1' ? 'y-power-count' : 'a-power-count',
      }, `${displayName} Power Cards: ${powerCount}`),
    ),
  );
}
