import React, { useEffect, useMemo, useState } from 'react';
import { type Controller, type GameState } from './gameState';
import { createStandardGameSetup, getPlayerGameView } from './setup';
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
  getBattlePublicView,
  passBattlePriority,
  resolvePendingBattle,
  startBattle,
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
  const [viewBoardDuringBattle, setViewBoardDuringBattle] = useState(false);

  const safeView = useMemo(() => (state ? getPlayerGameView(state) : null), [state]);
  const battleView = useMemo(() => {
    if (!state?.pendingBattle) {
      return null;
    }
    return getBattlePublicView(state);
  }, [state]);
  const publicEventLog = useMemo(() => (safeView ? toPublicEventText(safeView.eventLog) : []), [safeView]);

  const startNewGame = (): void => {
    const next = createGameState
      ? createGameState(firstPlayer)
      : createStandardGameSetup(firstPlayer, Math.random);
    setState(next);
    setSelectedCardId(null);
    setViewBoardDuringBattle(false);
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
    setViewBoardDuringBattle(false);
    setSelectedCardId(null);
  };

  if (screen === 'start' || !safeView) {
    return React.createElement(StartScreen, {
      firstPlayer,
      onFirstPlayerChange: setFirstPlayer,
      onNewGame: startNewGame,
    });
  }

  if (state?.pendingBattle && battleView && !viewBoardDuringBattle) {
    return React.createElement(
      'main',
      { className: 'app-shell battle-shell', 'data-testid': 'match-screen' },
      React.createElement(BattleScreen, {
        battle: battleView,
        handoffRequiredFor: state.pendingBattle.handoffRequiredFor,
        onAcknowledgeHandoff: handleAcknowledgeHandoff,
        onPassPriority: handlePassPriority,
        onResolveBattle: handleResolveBattle,
        onViewBoard: () => setViewBoardDuringBattle(true),
      }),
    );
  }

  if (state?.pendingBattle && battleView && viewBoardDuringBattle) {
    return React.createElement(
      'main',
      { className: 'app-shell', 'data-testid': 'match-screen' },
      React.createElement('section', { className: 'center-board battle-board-readonly' },
        React.createElement('div', { className: 'battle-banner', 'data-testid': 'battle-in-progress-banner' },
          'Battle In Progress: Board is read-only.',
        ),
        React.createElement(Board, {
          view: battleView.boardView,
          selectedCardId: null,
          onCardClick: () => undefined,
          readOnly: true,
        }),
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: () => setViewBoardDuringBattle(false),
            'data-testid': 'return-to-battle',
          },
          'Return to Battle',
        ),
      ),
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
