import React from 'react';
import type { BattlePublicView } from '../battleFlow';
import type { Controller } from '../gameState';
import './BattleScreen.css';

interface BattleScreenProps {
  battle: BattlePublicView;
  handoffRequiredFor: Controller | null;
  onAcknowledgeHandoff: (player: Controller) => void;
  onPassPriority: () => void;
  onResolveBattle: () => void;
  onViewBoard: () => void;
}

function battleTypeLabel(type: BattlePublicView['battleType']): string {
  return type === 'attack' ? 'Attack Forward' : 'Self-Defend';
}

function renderCardColumn(title: string, card: BattlePublicView['initiator']): React.ReactElement {
  return React.createElement(
    'div',
    {
      className: 'battle-card-column',
      'data-testid': `battle-card-${card.controller}`,
    },
    React.createElement('div', { className: 'battle-card-revealed-flag', 'data-testid': 'card-revealed' }),
    React.createElement('h3', null, title),
    React.createElement('p', { className: 'battle-card-name', 'data-testid': `battle-name-${card.id}` }, card.displayName),
    React.createElement('p', { className: 'battle-card-meta' }, `Controller: ${card.controller}`),
    React.createElement('p', { className: 'battle-card-meta' }, `Space: ${card.boardPosition}`),
    React.createElement('p', { className: 'battle-card-meta' }, `ATK ${card.ATK} / DEF ${card.DEF}`),
    React.createElement('p', { className: 'battle-card-meta' }, `King: ${card.isKing ? 'Yes' : 'No'}`),
  );
}

export function BattleScreen({
  battle,
  handoffRequiredFor,
  onAcknowledgeHandoff,
  onPassPriority,
  onResolveBattle,
  onViewBoard,
}: BattleScreenProps): React.ReactElement {
  if (handoffRequiredFor) {
    return React.createElement(
      'section',
      { className: 'battle-handoff', 'data-testid': 'battle-handoff' },
      React.createElement('h2', null, `Pass device to ${handoffRequiredFor}.`),
      React.createElement('p', null, `${handoffRequiredFor}, acknowledge to continue.`),
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: () => onAcknowledgeHandoff(handoffRequiredFor),
          'data-testid': 'battle-handoff-acknowledge',
        },
        'Acknowledge',
      ),
    );
  }

  const canPass = battle.status === 'WindowOpen';
  const canResolve = battle.status === 'ReadyToResolve';

  return React.createElement(
    'section',
    { className: 'battle-screen', 'data-testid': 'battle-screen' },
    React.createElement('h2', null, 'Battle In Progress'),
    React.createElement('p', { className: 'battle-notice', 'data-testid': 'battle-no-power-cards-notice' }, 'Power Card effects are not implemented yet.'),
    React.createElement('p', { className: 'battle-line', 'data-testid': 'battle-type' }, `Type: ${battleTypeLabel(battle.battleType)}`),
    React.createElement('p', { className: 'battle-line', 'data-testid': 'battle-priority' }, `Current Priority: ${battle.currentPriorityPlayer}`),
    React.createElement('p', { className: 'battle-line', 'data-testid': 'battle-pass-progress' }, `Consecutive Passes: ${battle.consecutivePassCount}/2`),

    React.createElement(
      'div',
      { className: 'battle-comparison', 'data-testid': 'battle-comparison' },
      React.createElement(
        'p',
        null,
        `Base Comparison: ${battle.initiatorComparisonLabel} ${battle.initiatorBaseComparison} vs ${battle.opponentComparisonLabel} ${battle.opponentBaseComparison}`,
      ),
      React.createElement('div', { className: 'battle-modifier-row' },
        React.createElement('div', { className: 'battle-modifier-box', 'data-testid': 'future-modifiers-initiator' }, 'Future Modifiers (Initiator): none'),
        React.createElement('div', { className: 'battle-modifier-box', 'data-testid': 'future-modifiers-opponent' }, 'Future Modifiers (Opponent): none'),
      ),
    ),

    React.createElement(
      'div',
      { className: 'battle-card-row' },
      renderCardColumn('Initiator', battle.initiator),
      renderCardColumn('Opponent', battle.opponent),
    ),

    React.createElement(
      'div',
      { className: 'battle-hands', 'data-testid': 'battle-hands' },
      React.createElement('h3', null, 'Power Card Hands (Privacy Mode)'),
      React.createElement(
        'p',
        { 'data-testid': 'battle-hand-visible' },
        `Visible Actual Hand: ${battle.currentPriorityPlayer} (placeholder only in alpha)`,
      ),
      React.createElement('p', { 'data-testid': 'battle-hand-hidden-y' }, `Y Count: ${battle.powerCardHandCount.Y} (hidden placeholders for opponent)`),
      React.createElement('p', { 'data-testid': 'battle-hand-hidden-a' }, `A Count: ${battle.powerCardHandCount.A} (hidden placeholders for opponent)`),
    ),

    React.createElement(
      'div',
      { className: 'battle-controls' },
      canPass
        ? React.createElement(
            'button',
            {
              type: 'button',
              onClick: onPassPriority,
              'data-testid': 'battle-pass-button',
            },
            `Pass (${battle.currentPriorityPlayer})`,
          )
        : null,
      canResolve
        ? React.createElement(
            'button',
            {
              type: 'button',
              onClick: onResolveBattle,
              'data-testid': 'battle-resolve-button',
            },
            'Resolve Battle',
          )
        : null,
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: onViewBoard,
          'data-testid': 'battle-view-board',
        },
        'View Board',
      ),
    ),

    React.createElement(
      'div',
      { className: 'battle-events', 'data-testid': 'battle-event-history' },
      React.createElement('h3', null, 'Battle Event History'),
      React.createElement(
        'ol',
        null,
        [...battle.battleEventHistory].reverse().map((event, index) =>
          React.createElement('li', { key: `${index}-${event}` }, event),
        ),
      ),
    ),
  );
}
