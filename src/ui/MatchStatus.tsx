import React from 'react';
import { type Controller } from '../gameState';
import { type PlayerSafeGameView } from '../setup';

interface MatchStatusProps {
  view: PlayerSafeGameView;
  side: Controller;
}

export function MatchStatus({ view, side }: MatchStatusProps): React.ReactElement {
  const isActive = view.activePlayer === side;
  const powerCount = side === 'Y' ? view.powerCardHandCount.Y : view.powerCardHandCount.A;

  return React.createElement(
    React.Fragment,
    null,
    React.createElement('div', { className: 'status-block', 'data-testid': `${side}-status` },
      React.createElement('h3', null, `${side} Player`),
      React.createElement('p', { className: 'status-label', 'data-testid': `${side}-state` }, isActive ? 'Status: Active Turn' : 'Status: Waiting'),
      React.createElement('p', {
        className: 'status-label',
        'data-testid': side === 'Y' ? 'y-power-count' : 'a-power-count',
      }, `${side} Power Cards: ${powerCount}`),
    ),
  );
}
