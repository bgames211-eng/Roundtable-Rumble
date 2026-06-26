import React from 'react';
import { type PlayerSafeCardView, type PlayerSafeGameView } from '../setup';
import './Board.css';

interface BoardProps {
  view: PlayerSafeGameView;
}

const topRow = ['A1', 'A2', 'A3', 'A4', 'A5'] as const;
const bottomRow = ['Y1', 'Y2', 'Y3', 'Y4', 'Y5'] as const;

function cardAt(view: PlayerSafeGameView, position: string): PlayerSafeCardView | undefined {
  return view.boardCards.find(card => card.boardPosition === position);
}

function renderCard(card: PlayerSafeCardView | undefined): React.ReactNode {
  if (!card) {
    return React.createElement('div', { className: 'card-empty', 'data-testid': 'empty-space' }, 'Empty');
  }

  if (!card.revealed) {
    return React.createElement(
      'div',
      {
        className: 'card-back',
        'data-testid': 'card-back',
        'aria-label': 'Unrevealed card',
      },
      React.createElement('span', null, 'Roundtable Rumble'),
    );
  }

  return React.createElement(
    'div',
    {
      className: 'card-revealed',
      'data-testid': 'card-revealed',
    },
    React.createElement('div', { className: 'placeholder-tile', 'aria-hidden': 'true' }, 'RT'),
    React.createElement('div', { className: 'revealed-name' }, card.displayName),
    React.createElement('div', { className: 'revealed-stats' }, `ATK ${card.ATK} / DEF ${card.DEF}`),
  );
}

function spaceCell(view: PlayerSafeGameView, position: (typeof topRow)[number] | (typeof bottomRow)[number]): React.ReactNode {
  const card = cardAt(view, position);
  const isKingStart = position === 'A3' || position === 'Y3';

  return React.createElement(
    'div',
    {
      className: `board-space ${isKingStart ? 'king-start' : ''}`,
      key: position,
      'data-testid': `space-${position}`,
    },
    React.createElement('div', { className: 'space-header' },
      React.createElement('span', { className: 'space-label' }, position),
      isKingStart
        ? React.createElement('span', { className: 'king-badge', 'data-testid': `king-start-${position}` }, '♛ King Start')
        : null,
    ),
    renderCard(card),
  );
}

export function Board({ view }: BoardProps): React.ReactElement {
  return React.createElement(
    'section',
    { className: 'board-wrap' },
    React.createElement('h2', { className: 'board-title' }, 'Manual Board'),

    React.createElement('div', { className: 'direction-row top-direction', 'data-testid': 'direction-top' }, 'A5 → A4 → A3 → A2 → A1'),

    React.createElement('div', { className: 'board-grid' },
      React.createElement('div', { className: 'edge-connector left-down', 'data-testid': 'left-connector' }, 'A1 ↓ Y1'),

      React.createElement('div', { className: 'board-main' },
        React.createElement('div', { className: 'lane-direction lane-direction-top', 'aria-hidden': 'true' }, '⟵⟵⟵⟵⟵ LEFTWARD A-LANE'),
        React.createElement('div', { className: 'row top-row', 'data-testid': 'top-row' }, topRow.map(pos => spaceCell(view, pos))),
        React.createElement('div', { className: 'row-arrow top-arrows', 'aria-hidden': 'true' }, '← ← ← ←'),
        React.createElement('div', { className: 'row-arrow bottom-arrows', 'aria-hidden': 'true' }, '→ → → →'),
        React.createElement('div', { className: 'row bottom-row', 'data-testid': 'bottom-row' }, bottomRow.map(pos => spaceCell(view, pos))),
        React.createElement('div', { className: 'lane-direction lane-direction-bottom', 'aria-hidden': 'true' }, 'Y-LANE RIGHTWARD ⟶⟶⟶⟶⟶'),
      ),

      React.createElement('div', { className: 'edge-connector right-up', 'data-testid': 'right-connector' }, 'Y5 ↑ A5'),
    ),

    React.createElement('div', { className: 'direction-row bottom-direction', 'data-testid': 'direction-bottom' }, 'Y1 → Y2 → Y3 → Y4 → Y5'),
  );
}
