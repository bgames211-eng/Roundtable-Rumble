import React from 'react';
import type { PlayerSafeCardView } from '../setup';
import './ActionControls.css';

export type LegalActionType = 'move' | 'attack' | 'defend';

interface ActionControlsProps {
  gameStatus: 'active' | 'P1 wins' | 'P2 wins' | 'draw';
  selectedCard: PlayerSafeCardView | null;
  legalActions: LegalActionType[];
  canSkip: boolean;
  onAction: (action: LegalActionType) => void;
  onSkip: () => void;
}

function labelForAction(action: LegalActionType): string {
  if (action === 'move') return 'Move Forward';
  if (action === 'attack') return 'Attack Forward';
  return 'Self-Defend';
}

export function ActionControls({
  gameStatus,
  selectedCard,
  legalActions,
  canSkip,
  onAction,
  onSkip,
}: ActionControlsProps): React.ReactElement {
  if (gameStatus !== 'active') {
    return React.createElement(
      'div',
      { className: 'action-controls', 'data-testid': 'action-controls' },
      React.createElement('h3', null, 'Action Controls'),
      React.createElement('p', { className: 'action-hint', 'data-testid': 'no-actions-after-game-over' }, 'Game over: actions are disabled.'),
    );
  }

  return React.createElement(
    'div',
    { className: 'action-controls', 'data-testid': 'action-controls' },
    React.createElement('h3', null, 'Action Controls'),
    selectedCard
      ? React.createElement(
          React.Fragment,
          null,
          React.createElement(
            'p',
            { className: 'selected-card-line', 'data-testid': 'selected-card-indicator' },
                'Card selected. Choose an action below.',
          ),
          legalActions.length > 0
            ? React.createElement(
                'div',
                { className: 'action-button-row' },
                legalActions.map(action =>
                  React.createElement(
                    'button',
                    {
                      key: action,
                      type: 'button',
                      onClick: () => onAction(action),
                      'data-testid': `action-${action}`,
                    },
                    labelForAction(action),
                  ),
                ),
              )
            : React.createElement('p', { className: 'action-hint', 'data-testid': 'no-legal-actions-for-selection' }, 'No legal actions for selected card.'),
        )
      : React.createElement('p', { className: 'action-hint', 'data-testid': 'select-card-hint' }, 'Select an active-player card to view legal actions.'),
    canSkip
      ? React.createElement(
          'button',
          {
            type: 'button',
            className: 'skip-button',
            onClick: onSkip,
            'data-testid': 'skip-turn-button',
          },
          'Skip Turn',
        )
      : null,
  );
}
