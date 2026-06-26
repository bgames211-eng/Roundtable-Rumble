import React, { useEffect, useMemo, useState } from 'react';
import { Board } from './Board';
import type {
  BattlePublicView,
  PlayBattlePowerCardInput,
  PrivateBattleHandView,
} from '../battleFlow';
import type { Controller } from '../gameState';
import type { PlayerSafeGameView } from '../setup';
import './BattleScreen.css';

interface BattleScreenProps {
  battle: BattlePublicView;
  boardView: PlayerSafeGameView;
  privateHand: PrivateBattleHandView | null;
  handoffRequiredFor: Controller | null;
  battleIntroKey: string;
  onAcknowledgeHandoff: (player: Controller) => void;
  onPassPriority: () => void;
  onPlayCard: (input: PlayBattlePowerCardInput) => void;
  onResolveBattle: () => void;
}

function battleTypeLabel(type: BattlePublicView['battleType']): string {
  return type === 'attack' ? 'Attack Forward' : 'Self-Defend';
}

function renderIntroCard(cardName: string, revealed: boolean, testId: string): React.ReactElement {
  return React.createElement(
    'div',
    {
      className: `battle-intro-card ${revealed ? 'revealed' : 'hidden'}`,
      'data-testid': testId,
    },
    revealed
      ? React.createElement('div', { className: 'battle-intro-face', 'data-testid': `${testId}-face` }, cardName)
      : React.createElement('div', { className: 'battle-intro-back', 'data-testid': `${testId}-back` }, 'Roundtable Rumble'),
  );
}

function renderMatchupCard(
  title: string,
  card: BattlePublicView['initiator'],
): React.ReactElement {
  return React.createElement(
    'article',
    { className: 'battle-duel-card', 'data-testid': `battle-duel-${card.controller}` },
    React.createElement('h4', null, title),
    React.createElement('p', { className: 'battle-card-name', 'data-testid': `battle-name-${card.id}` }, card.displayName),
    React.createElement('p', { className: 'battle-card-meta' }, `ATK ${card.ATK} / DEF ${card.DEF}`),
    React.createElement('p', { className: 'battle-card-meta' }, `Space: ${card.boardPosition}`),
    React.createElement('p', { className: 'battle-card-meta' }, `King: ${card.isKing ? 'Yes' : 'No'}`),
  );
}

export function BattleScreen({
  battle,
  boardView,
  privateHand,
  handoffRequiredFor,
  battleIntroKey,
  onAcknowledgeHandoff,
  onPassPriority,
  onPlayCard,
  onResolveBattle,
}: BattleScreenProps): React.ReactElement {
  const [selectedChoices, setSelectedChoices] = useState<Record<string, 'ATK' | 'DEF'>>({});
  const [expandedBoard, setExpandedBoard] = useState(false);
  const [completedIntroKeys, setCompletedIntroKeys] = useState<Record<string, true>>({});
  const [showIntroFaces, setShowIntroFaces] = useState(false);
  const [showMainControls, setShowMainControls] = useState(false);

  const introAlreadyCompleted = !!completedIntroKeys[battleIntroKey];

  useEffect(() => {
    if (introAlreadyCompleted) {
      setShowIntroFaces(true);
      setShowMainControls(true);
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setShowIntroFaces(true);
      setShowMainControls(true);
      setCompletedIntroKeys(prev => ({ ...prev, [battleIntroKey]: true }));
      return;
    }

    setShowIntroFaces(false);
    setShowMainControls(false);

    const revealTimer = window.setTimeout(() => {
      setShowIntroFaces(true);
    }, 360);

    const controlsTimer = window.setTimeout(() => {
      setShowMainControls(true);
      setCompletedIntroKeys(prev => ({ ...prev, [battleIntroKey]: true }));
    }, 720);

    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(controlsTimer);
    };
  }, [battleIntroKey, introAlreadyCompleted]);

  const canPass = battle.status === 'WindowOpen';
  const canResolve = battle.status === 'ReadyToResolve';
  const privateCards = privateHand?.cards ?? [];

  const leftHandPanel = useMemo(() => {
    if (!showMainControls || handoffRequiredFor) {
      return React.createElement(
        'div',
        { className: 'battle-hand-placeholder', 'data-testid': 'battle-hand-placeholder' },
        React.createElement('p', null, `Y: ${battle.powerCardHandCount.Y} hidden cards`),
        React.createElement('p', null, `A: ${battle.powerCardHandCount.A} hidden cards`),
      );
    }

    return React.createElement(
      'div',
      { className: 'battle-private-hand', 'data-testid': `battle-private-hand-${battle.currentPriorityPlayer}` },
      privateCards.map(card => {
        const choice = selectedChoices[card.instanceId];
        const requiresChoice = card.allowedChoices.length > 0;
        const canPlayWithChoice = card.isPlayable && (!requiresChoice || !!choice);

        return React.createElement(
          'div',
          { className: 'battle-private-card', key: card.instanceId, 'data-testid': `battle-private-card-${card.instanceId}` },
          React.createElement('p', { className: 'battle-private-card-name' }, card.displayName),
          React.createElement('p', { className: 'battle-private-card-text' }, card.rulesText),
          requiresChoice
            ? React.createElement(
                'div',
                { className: 'battle-choice-row' },
                card.allowedChoices.map(option =>
                  React.createElement(
                    'label',
                    { key: `${card.instanceId}-${option}` },
                    React.createElement('input', {
                      type: 'radio',
                      name: `choice-${card.instanceId}`,
                      checked: choice === option,
                      onChange: () => {
                        setSelectedChoices(prev => ({ ...prev, [card.instanceId]: option }));
                      },
                    }),
                    option,
                  ),
                ),
              )
            : null,
          card.disabledReason
            ? React.createElement(
                'p',
                { className: 'battle-card-disabled-reason', 'data-testid': `battle-card-disabled-${card.instanceId}` },
                card.disabledReason,
              )
            : null,
          React.createElement(
            'button',
            {
              type: 'button',
              disabled: !canPlayWithChoice,
              onClick: () => {
                onPlayCard({
                  instanceId: card.instanceId,
                  selectedChoice: choice,
                });
              },
              'data-testid': `battle-play-card-${card.instanceId}`,
            },
            canPlayWithChoice ? 'Play' : 'Play (disabled)',
          ),
        );
      }),
    );
  }, [battle, handoffRequiredFor, onPlayCard, privateCards, selectedChoices, showMainControls]);

  if (!showMainControls) {
    return React.createElement(
      'section',
      { className: 'battle-screen', 'data-testid': 'battle-screen' },
      React.createElement('div', { className: 'battle-intro', 'data-testid': 'battle-intro' },
        React.createElement('h2', null, `Battle: ${battleTypeLabel(battle.battleType)}`),
        React.createElement('p', { className: 'battle-intro-copy' }, 'A clash is about to begin...'),
        React.createElement('div', { className: 'battle-intro-row' },
          renderIntroCard(battle.initiator.displayName, showIntroFaces, 'battle-intro-initiator'),
          React.createElement('div', { className: 'battle-intro-vs' }, 'VS'),
          renderIntroCard(battle.opponent.displayName, showIntroFaces, 'battle-intro-opponent'),
        ),
      ),
    );
  }

  return React.createElement(
    'section',
    { className: 'battle-screen', 'data-testid': 'battle-screen' },
    React.createElement('div', { className: `battle-top-board ${expandedBoard ? 'expanded' : ''}`, 'data-testid': 'battle-embedded-board' },
      React.createElement('div', { className: 'battle-board-header' },
        React.createElement('h3', null, 'Battle Board (Read-Only)'),
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: () => setExpandedBoard(prev => !prev),
            'data-testid': 'battle-toggle-board-size',
          },
          expandedBoard ? 'Shrink Board' : 'Expand Board',
        ),
      ),
      React.createElement(Board, {
        view: boardView,
        selectedCardId: null,
        onCardClick: () => undefined,
        readOnly: true,
      }),
    ),

    handoffRequiredFor
      ? React.createElement(
          'section',
          { className: 'battle-handoff', 'data-testid': 'battle-handoff' },
          React.createElement('h2', null, `Pass device to ${handoffRequiredFor}. ${handoffRequiredFor} may view their hand.`),
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
        )
      : null,

    React.createElement('div', { className: 'battle-main-grid' },
      React.createElement('aside', { className: 'battle-panel battle-left' },
        React.createElement('h3', null, `Your Power Cards (${battle.currentPriorityPlayer})`),
        leftHandPanel,
      ),

      React.createElement('section', { className: 'battle-panel battle-center' },
        React.createElement('h2', null, 'Battle Matchup'),
        React.createElement('p', { className: 'battle-line', 'data-testid': 'battle-type' }, `Type: ${battleTypeLabel(battle.battleType)}`),
        React.createElement('div', { className: 'battle-duel-row' },
          renderMatchupCard('Initiator', battle.initiator),
          React.createElement('div', { className: 'battle-vs-divider' }, 'VS'),
          renderMatchupCard('Opponent', battle.opponent),
        ),
      ),

      React.createElement('aside', { className: 'battle-panel battle-right' },
        React.createElement('p', { className: 'battle-line', 'data-testid': 'battle-priority' }, `Current Priority: ${battle.currentPriorityPlayer}`),
        React.createElement('p', { className: 'battle-line', 'data-testid': 'battle-pass-progress' }, `Consecutive Passes: ${battle.consecutivePassCount}/2`),
        React.createElement(
          'p',
          { className: 'battle-effective-line', 'data-testid': 'battle-effective-preview' },
          `Comparison: ${battle.initiatorComparisonLabel} ${battle.initiatorEffectiveComparison} vs ${battle.opponentComparisonLabel} ${battle.opponentEffectiveComparison}`,
        ),
        React.createElement(
          'div',
          { className: 'battle-effective-grid' },
          React.createElement('p', { 'data-testid': 'battle-effective-initiator-atk' }, `Initiator ATK: ${battle.initiatorEffectiveATK}`),
          React.createElement('p', { 'data-testid': 'battle-effective-initiator-def' }, `Initiator DEF: ${battle.initiatorEffectiveDEF}`),
          React.createElement('p', { 'data-testid': 'battle-effective-opponent-atk' }, `Opponent ATK: ${battle.opponentEffectiveATK}`),
          React.createElement('p', { 'data-testid': 'battle-effective-opponent-def' }, `Opponent DEF: ${battle.opponentEffectiveDEF}`),
        ),

        React.createElement('div', { className: 'battle-modifier-box', 'data-testid': 'battle-live-modifiers' },
          React.createElement('strong', null, 'Battle Modifiers'),
          battle.liveModifiers.length === 0
            ? React.createElement('p', null, 'None')
            : React.createElement(
                'ul',
                null,
                battle.liveModifiers.map((modifier, index) =>
                  React.createElement(
                    'li',
                    { key: `${index}-${modifier.sourceCardName}-${modifier.stat}` },
                    `${modifier.sourceCardName}: ${modifier.amount > 0 ? '+' : ''}${modifier.amount} ${modifier.stat} on ${modifier.targetCharacterId}`,
                  ),
                ),
              ),
        ),

        React.createElement('div', { className: 'battle-used-cards', 'data-testid': 'battle-used-cards' },
          React.createElement('strong', null, 'Used Power Cards'),
          battle.usedPowerCards.length === 0
            ? React.createElement('p', null, 'None yet')
            : React.createElement(
                'ul',
                null,
                [...battle.usedPowerCards].reverse().map(card =>
                  React.createElement(
                    'li',
                    { key: `used-${card.instanceId}` },
                    `${card.displayName} by ${card.controller} | Choice: ${card.selectedChoice ?? 'N/A'} | Effect: ${card.effectSummary}`,
                  ),
                ),
              ),
        ),

        React.createElement('div', { className: 'battle-controls' },
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
        ),

        React.createElement('div', { className: 'battle-events', 'data-testid': 'battle-event-history' },
          React.createElement('strong', null, 'Battle History'),
          React.createElement(
            'ol',
            null,
            [...battle.battleEventHistory].reverse().map((event, index) =>
              React.createElement('li', { key: `${index}-${event}` }, event),
            ),
          ),
        ),
      ),
    ),
  );
}
