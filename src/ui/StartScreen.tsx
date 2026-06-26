import React from 'react';
import { type Controller } from '../gameState';

interface StartScreenProps {
  firstPlayer: Controller;
  onFirstPlayerChange: (next: Controller) => void;
  onNewGame: () => void;
}

export function StartScreen({
  firstPlayer,
  onFirstPlayerChange,
  onNewGame,
}: StartScreenProps): React.ReactElement {
  return React.createElement(
    'main',
    { className: 'start-screen', 'data-testid': 'start-screen' },
    React.createElement('h1', { className: 'start-title' }, 'Roundtable Rumble'),
    React.createElement('p', { className: 'start-subtitle' }, 'Manual Two-Player Alpha'),

    React.createElement(
      'fieldset',
      { className: 'first-player-field' },
      React.createElement('legend', null, 'Choose First Player'),
      React.createElement(
        'div',
        { className: 'first-player-options' },
        React.createElement(
          'label',
          null,
          React.createElement('input', {
            type: 'radio',
            name: 'first-player',
            value: 'Y',
            checked: firstPlayer === 'Y',
            onChange: () => onFirstPlayerChange('Y'),
          }),
          ' Y',
        ),
        React.createElement(
          'label',
          null,
          React.createElement('input', {
            type: 'radio',
            name: 'first-player',
            value: 'A',
            checked: firstPlayer === 'A',
            onChange: () => onFirstPlayerChange('A'),
          }),
          ' A',
        ),
      ),
    ),

    React.createElement(
      'div',
      { className: 'start-actions' },
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: onNewGame,
          'data-testid': 'new-game-button',
        },
        'New Game',
      ),
    ),
  );
}
