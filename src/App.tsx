import React, { useEffect, useMemo, useState } from 'react';
import { type Controller, type GameState } from './gameState';
import {
  createStandardGameSetup,
  getPlayerGameView,
  getPrivatePowerCardHand,
} from './setup';
import { getPowerCardDefinition } from './powerCards';
import { Board } from './ui/Board';
import { StartScreen } from './ui/StartScreen';
import { MatchStatus } from './ui/MatchStatus';
import { ActionControls, type LegalActionType } from './ui/ActionControls';
import { BattleScreen } from './ui/BattleScreen';
import {
  executeMoveForward,
  getLegalActions,
  hasLegalAction,
  skipTurn,
} from './gameEngine';
import { getCharacter } from './gameState';
import {
  acknowledgeBattleHandoff,
  getBattlePrivateHandView,
  getBattlePublicView,
  passBattlePriority,
  playBattlePowerCard,
  resolvePendingBattle,
  startBattle,
  type PlayBattlePowerCardInput,
} from './battleFlow';

function toPublicEventText(events: Array<{ turn: number; activePlayer: Controller; action: string }>): string[] {
  return [...events]
    .reverse()
    .map(event => `T${event.turn} ${event.activePlayer}: ${event.action}`);
}

interface AppProps {
  createGameState?: (firstPlayer: Controller) => GameState;
}

export function App({ createGameState }: AppProps = {}): React.ReactElement {
  const [screen, setScreen] = useState<'start' | 'match'>('start');
  const [firstPlayer, setFirstPlayer] = useState<Controller>('Y');
  const [state, setState] = useState<GameState | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [boardHandoffRequiredFor, setBoardHandoffRequiredFor] = useState<Controller | null>(null);
  const [boardHandVisibleFor, setBoardHandVisibleFor] = useState<Controller | null>(null);

  const safeView = useMemo(() => (state ? getPlayerGameView(state) : null), [state]);
  const battleView = useMemo(() => {
    if (!state?.pendingBattle) {
      return null;
    }
    return getBattlePublicView(state);
  }, [state]);

  const battlePrivateHand = useMemo(() => {
    if (!state?.pendingBattle || state.pendingBattle.handoffRequiredFor !== null) {
      return null;
    }

    return getBattlePrivateHandView(state, state.pendingBattle.currentPriorityPlayer);
  }, [state]);

  const boardPhasePrivateHand = useMemo(() => {
    if (!state || state.pendingBattle || boardHandoffRequiredFor !== null) {
      return null;
    }

    if (boardHandVisibleFor !== state.activePlayer) {
      return null;
    }

    const privateCards = getPrivatePowerCardHand(state, state.activePlayer);
    return privateCards.map(card => {
      const definition = getPowerCardDefinition(card.definitionId);
      return {
        instanceId: card.instanceId,
        displayName: definition.displayName,
        rulesText: definition.rulesText,
      };
    });
  }, [state, boardHandVisibleFor, boardHandoffRequiredFor]);

  const publicEventLog = useMemo(() => (safeView ? toPublicEventText(safeView.eventLog) : []), [safeView]);

  useEffect(() => {
    if (!state || state.pendingBattle || state.gameStatus !== 'active') {
      return;
    }

    if (boardHandVisibleFor !== state.activePlayer) {
      if (boardHandoffRequiredFor !== state.activePlayer) {
        setBoardHandoffRequiredFor(state.activePlayer);
      }
      if (boardHandVisibleFor !== null) {
        setBoardHandVisibleFor(null);
      }
    }
  }, [state, boardHandVisibleFor, boardHandoffRequiredFor]);

  const startNewGame = (): void => {
    const next = createGameState
      ? createGameState(firstPlayer)
      : createStandardGameSetup(firstPlayer, Math.random);
    setState(next);
    setSelectedCardId(null);
    setBoardHandVisibleFor(null);
    setBoardHandoffRequiredFor(firstPlayer);
    setScreen('match');
  };

  const selectedSafeCard = useMemo(() => {
    if (!safeView || !selectedCardId) {
      return null;
    }
    return safeView.boardCards.find(card => card.instanceId === selectedCardId) ?? null;
  }, [safeView, selectedCardId]);

  const legalActionsForSelection = useMemo<LegalActionType[]>(() => {
    if (!state || !selectedCardId || state.gameStatus !== 'active') {
      return [];
    }
    if (state.pendingBattle) {
      return [];
    }
    return getLegalActions(state)
      .filter(action => action.characterId === selectedCardId)
      .map(action => action.type as LegalActionType);
  }, [state, selectedCardId]);

  const canSkip = useMemo(() => {
    if (!state || state.gameStatus !== 'active') {
      return false;
    }
    if (state.pendingBattle) {
      return false;
    }
    return !hasLegalAction(state);
  }, [state]);

  useEffect(() => {
    if (!state || !selectedCardId) {
      return;
    }
    if (state.gameStatus !== 'active') {
      setSelectedCardId(null);
      return;
    }
    if (state.pendingBattle) {
      setSelectedCardId(null);
      return;
    }

    const selected = getCharacter(state, selectedCardId);
    if (!selected || !selected.alive || selected.controller !== state.activePlayer) {
      setSelectedCardId(null);
    }
  }, [state, selectedCardId]);

  const handleCardClick = (instanceId: string): void => {
    if (!safeView || safeView.gameStatus !== 'active') {
      return;
    }
    if (state?.pendingBattle) {
      return;
    }
    const clicked = safeView.boardCards.find(card => card.instanceId === instanceId);
    if (!clicked || clicked.controller !== safeView.activePlayer) {
      return;
    }
    setSelectedCardId(prev => (prev === instanceId ? null : instanceId));
  };

  const handleExecuteAction = (action: LegalActionType): void => {
    if (!state || !selectedCardId || state.gameStatus !== 'active') {
      return;
    }
    if (state.pendingBattle) {
      return;
    }

    if (!legalActionsForSelection.includes(action)) {
      return;
    }

    let nextState: GameState;
    if (action === 'move') {
      nextState = executeMoveForward(state, selectedCardId);
    } else if (action === 'attack') {
      nextState = startBattle(state, 'attack', selectedCardId);
    } else {
      nextState = startBattle(state, 'defend', selectedCardId);
    }

    setState(nextState);
    setSelectedCardId(null);
  };

  const handleSkipTurn = (): void => {
    if (!state || state.gameStatus !== 'active') {
      return;
    }
    if (state.pendingBattle) {
      return;
    }
    if (hasLegalAction(state)) {
      return;
    }
    const nextState = skipTurn(state);
    setState(nextState);
    setSelectedCardId(null);
  };

  const handlePassPriority = (): void => {
    if (!state?.pendingBattle) {
      return;
    }
    const actor = state.pendingBattle.currentPriorityPlayer;
    const next = passBattlePriority(state, actor);
    setState(next);
  };

  const handleAcknowledgeHandoff = (player: Controller): void => {
    if (!state?.pendingBattle) {
      return;
    }
    const next = acknowledgeBattleHandoff(state, player);
    setState(next);
  };

  const handleResolveBattle = (): void => {
    if (!state?.pendingBattle) {
      return;
    }
    const next = resolvePendingBattle(state);
    setState(next);
    setSelectedCardId(null);
  };

  const handlePlayBattleCard = (input: PlayBattlePowerCardInput): void => {
    if (!state?.pendingBattle) {
      return;
    }

    const actor = state.pendingBattle.currentPriorityPlayer;
    const next = playBattlePowerCard(state, actor, input);
    setState(next);
  };

  const handleAcknowledgeBoardHandoff = (): void => {
    if (!state || !boardHandoffRequiredFor) {
      return;
    }

    setBoardHandVisibleFor(boardHandoffRequiredFor);
    setBoardHandoffRequiredFor(null);
  };

  if (screen === 'start' || !safeView) {
    return React.createElement(StartScreen, {
      firstPlayer,
      onFirstPlayerChange: setFirstPlayer,
      onNewGame: startNewGame,
    });
  }

  if (state?.pendingBattle && battleView) {
    const battleIntroKey = `${state.turnNumber}-${state.pendingBattle.battleType}-${state.pendingBattle.initiatorId}-${state.pendingBattle.opponentId}`;

    return React.createElement(
      'main',
      { className: 'app-shell battle-shell', 'data-testid': 'match-screen' },
      React.createElement(BattleScreen, {
        battle: battleView,
        boardView: battleView.boardView,
        privateHand: battlePrivateHand,
        handoffRequiredFor: state.pendingBattle.handoffRequiredFor,
        battleIntroKey,
        onAcknowledgeHandoff: handleAcknowledgeHandoff,
        onPassPriority: handlePassPriority,
        onPlayCard: handlePlayBattleCard,
        onResolveBattle: handleResolveBattle,
      }),
    );
  }

  return React.createElement(
    'main',
    { className: 'app-shell', 'data-testid': 'match-screen' },
    React.createElement('section', { className: 'left-panel' },
      React.createElement(MatchStatus, {
        view: safeView,
        side: 'Y',
      }),
      React.createElement('div', { className: 'status-block', 'data-testid': 'board-phase-hand-panel' },
        React.createElement('h3', null, 'Your Power Cards'),
        boardHandoffRequiredFor
          ? React.createElement(
              'div',
              { 'data-testid': 'board-phase-handoff' },
              React.createElement('p', null, `Pass device to ${boardHandoffRequiredFor}. ${boardHandoffRequiredFor} may view their hand.`),
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: handleAcknowledgeBoardHandoff,
                  'data-testid': 'board-phase-handoff-acknowledge',
                },
                'Acknowledge',
              ),
            )
          : null,
        boardPhasePrivateHand
          ? React.createElement(
              'div',
              { className: 'board-hand-list', 'data-testid': 'board-phase-private-hand' },
              boardPhasePrivateHand.map(card =>
                React.createElement(
                  'div',
                  { className: 'board-hand-card', key: card.instanceId, 'data-testid': `board-phase-card-${card.instanceId}` },
                  React.createElement('p', { className: 'status-label' }, card.displayName),
                  React.createElement('p', { className: 'status-label' }, card.rulesText),
                  React.createElement(
                    'button',
                    {
                      type: 'button',
                      disabled: true,
                      'data-testid': `board-phase-card-disabled-${card.instanceId}`,
                    },
                    'Battle card - playable only during a battle',
                  ),
                ),
              ),
            )
          : React.createElement(
              'p',
              { className: 'status-label', 'data-testid': 'board-phase-hand-placeholder' },
              `Hidden card backs: ${safeView.powerCardHandCount[safeView.activePlayer]}`,
            ),
      ),
    ),
    React.createElement('section', { className: 'center-board' },
      React.createElement(Board, {
        view: safeView,
        selectedCardId,
        onCardClick: handleCardClick,
      }),
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
      React.createElement('div', { className: 'status-block shared-actions' },
        React.createElement(ActionControls, {
          gameStatus: safeView.gameStatus,
          selectedCard: selectedSafeCard,
          legalActions: legalActionsForSelection,
          canSkip,
          onAction: handleExecuteAction,
          onSkip: handleSkipTurn,
        }),
      ),
    ),
  );
}
