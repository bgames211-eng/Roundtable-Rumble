import React from 'react';
import { type Controller } from '../gameState';
import type { BotDifficulty } from '../bot';
import { CharacterCardFrame, PowerCardFrame } from './CardFrames';
import { ALPHA_1_CHARACTER_DEFINITIONS } from '../cardDefinitions';
import { FIRST_ALPHA_POWER_CARD_DEFINITIONS } from '../powerCards';
import {
  createDefaultCharacterCatalogEntry,
  createDefaultPowerCatalogEntry,
} from '../cardCatalog';
import { PUBLIC_ASSETS } from '../publicAssets';
import './StartScreen.css';

export type GameMode = 'manual-two-player' | 'human-y-vs-bot-a' | 'hosted-two-player';
export type SessionMode = 'single-game' | 'multi-game';
export type PlayerColor =
  | 'Blue'
  | 'Red'
  | 'Lime Green'
  | 'Bright Purple'
  | 'Yellow'
  | 'Silver'
  | 'Rainbow'
  | 'White'
  | 'Black'
  | 'Hot Pink'
  | 'Orange Blue Camo'
  | 'Navy Green'
  | 'US Flag'
  | 'Red Black Stripes'
  | 'Green Yellow Stripes'
  | 'Lightning Electric'
  | 'Fire Embers'
  | 'Sparkling Sand'
  | 'Glowing Orange'
  | 'Black and Gold Dots'
  | 'Slime'
  | 'Cheeta'
  | 'Military Camo'
  | 'Yellow Stars';

const PLAYER_COLORS: PlayerColor[] = [
  'Blue',
  'Red',
  'Lime Green',
  'Bright Purple',
  'Yellow',
  'Silver',
  'Rainbow',
  'White',
  'Black',
  'Hot Pink',
  'Orange Blue Camo',
  'Navy Green',
  'US Flag',
  'Red Black Stripes',
  'Green Yellow Stripes',
  'Lightning Electric',
  'Fire Embers',
  'Sparkling Sand',
  'Glowing Orange',
  'Black and Gold Dots',
  'Slime',
  'Cheeta',
  'Military Camo',
  'Yellow Stars',
];

const COLOR_SWATCH_STYLES: Record<PlayerColor, string> = {
  Blue: 'linear-gradient(135deg, #6fb3ff, #2d6cff)',
  Red: 'linear-gradient(135deg, #ff7d7d, #d92d2d)',
  'Lime Green': 'linear-gradient(135deg, #b7ff6b, #4bbd32)',
  'Bright Purple': 'linear-gradient(135deg, #dd9bff, #8a35d7)',
  Yellow: 'linear-gradient(135deg, #fff28a, #d8ab1e)',
  Silver: 'linear-gradient(135deg, #f2f4f7, #98a3ad)',
  Rainbow: 'linear-gradient(90deg, #ff5f5f, #ffae42, #fffa65, #63ff81, #6dc5ff, #9a7dff, #ff7ad9)',
  White: 'linear-gradient(135deg, #ffffff, #cfd8e3)',
  Black: 'linear-gradient(135deg, #4d4d4d, #070707)',
  'Hot Pink': 'linear-gradient(135deg, #ff87c8, #ff1f8f)',
  'Orange Blue Camo': 'linear-gradient(135deg, #ff8a00 0 28%, #2458ff 28% 56%, #ff8a00 56% 74%, #2f7ad5 74% 100%)',
  'Navy Green': 'linear-gradient(135deg, #0a2a57, #1f6c48)',
  'US Flag': 'linear-gradient(180deg, #bf1e2e 0 14%, #ffffff 14% 28%, #bf1e2e 28% 42%, #ffffff 42% 56%, #bf1e2e 56% 70%, #ffffff 70% 84%, #bf1e2e 84% 100%)',
  'Red Black Stripes': 'repeating-linear-gradient(135deg, #8b1010 0 12px, #0a0a0a 12px 24px)',
  'Green Yellow Stripes': 'repeating-linear-gradient(135deg, #1f7f3d 0 12px, #dbbb1b 12px 24px)',
  'Lightning Electric': 'linear-gradient(130deg, #c6f5ff 0%, #4de0ff 35%, #1a6fff 68%, #fcfca1 100%)',
  'Fire Embers': 'linear-gradient(135deg, #3d1508 0%, #8f2b0d 35%, #db4a1a 62%, #ffbf4a 100%)',
  'Sparkling Sand': 'linear-gradient(135deg, #f8e7b8 0%, #efc97f 45%, #fff3d5 70%, #d8ab5e 100%)',
  'Glowing Orange': 'linear-gradient(135deg, #ff9d2f 0%, #ff6b00 55%, #ffd38a 100%)',
  'Black and Gold Dots': 'radial-gradient(circle at 18% 22%, #ffd86a 0 9%, #0d0d0d 10% 100%), radial-gradient(circle at 72% 58%, #ffd86a 0 8%, #0d0d0d 9% 100%), radial-gradient(circle at 45% 80%, #ffd86a 0 7%, #0d0d0d 8% 100%), #0d0d0d',
  Slime: 'linear-gradient(135deg, #9cff47 0%, #4dcf2f 45%, #1e7b26 100%)',
  Cheeta: 'repeating-linear-gradient(145deg, #d99b46 0 18px, #2b190f 18px 26px, #f1c26f 26px 40px)',
  'Military Camo': 'repeating-linear-gradient(145deg, #36492e 0 14px, #5f6f3f 14px 24px, #2a3422 24px 34px, #8a7f5c 34px 44px)',
  'Yellow Stars': 'radial-gradient(circle at 18% 22%, #ffe86e 0 8%, #15335c 9% 100%), radial-gradient(circle at 73% 34%, #ffe86e 0 7%, #15335c 8% 100%), radial-gradient(circle at 49% 72%, #ffe86e 0 9%, #15335c 10% 100%), #15335c',
};

interface StartScreenProps {
  firstPlayer: Controller;
  gameMode: GameMode;
  sessionMode: SessionMode;
  botDifficulty: BotDifficulty;
  multiplayerRoomCode?: string | null;
  multiplayerStatus?: string | null;
  multiplayerJoinCode?: string;
  multiplayerPlayer?: Controller | null;
  multiplayerRoomPhase?: 'lobby' | 'rps' | 'match' | 'match-paused' | null;
  multiplayerReady?: { P1: boolean; P2: boolean } | null;
  multiplayerRpsChoiceState?: { hasP1Choice: boolean; hasP2Choice: boolean } | null;
  multiplayerSessionMode?: SessionMode | null;
  multiplayerRpsResult?: {
    p1Choice: RpsChoice;
    p2Choice: RpsChoice;
    firstPlayer?: Controller;
    outcome: 'win' | 'tie';
  } | null;
  playerColors: { P1: PlayerColor; P2: PlayerColor };
  onFirstPlayerChange: (next: Controller) => void;
  onGameModeChange: (next: GameMode) => void;
  onSessionModeChange: (next: SessionMode) => void;
  onBotDifficultyChange: (next: BotDifficulty) => void;
  onMultiplayerJoinCodeChange?: (next: string) => void;
  onCreateMultiplayerRoom?: () => void;
  onJoinMultiplayerRoom?: () => void;
  onMultiplayerSessionModeChange?: (next: SessionMode) => void;
  onMultiplayerReadyToggle?: (ready: boolean) => void;
  onMultiplayerRpsChoice?: (choice: RpsChoice) => void;
  onMultiplayerRpsRedo?: () => void;
  onMultiplayerRpsBack?: () => void;
  onPlayerColorChange: (player: Controller, color: PlayerColor) => void;
  onNewGame: (firstPlayerOverride?: Controller) => void;
  onContinueGame?: () => void;
  hasContinueGame?: boolean;
  continueGameDisabledReason?: string | null;
  initialPhase?: SetupPhase;
  onCatalogBack?: () => void;
}

type SetupPhase = 'landing' | 'online' | 'online-host' | 'online-join' | 'online-rps' | 'online-rps-result' | 'mode' | 'setup' | 'rps' | 'catalog';
type RpsChoice = 'rock' | 'paper' | 'scissors';
type RpsOutcome = 'human' | 'bot' | 'tie';
type CatalogMode = 'character' | 'power';

interface RpsBattleState {
  humanChoice: RpsChoice;
  botChoice: RpsChoice;
  outcome: RpsOutcome;
}

export function StartScreen({
  firstPlayer,
  gameMode,
  sessionMode,
  botDifficulty,
  multiplayerRoomCode = null,
  multiplayerStatus = null,
  multiplayerJoinCode = '',
  multiplayerPlayer = null,
  multiplayerRoomPhase = null,
  multiplayerReady = null,
  multiplayerRpsChoiceState = null,
  multiplayerSessionMode = null,
  multiplayerRpsResult = null,
  playerColors = { P1: 'Blue', P2: 'Red' },
  onFirstPlayerChange,
  onGameModeChange,
  onSessionModeChange,
  onBotDifficultyChange,
  onMultiplayerJoinCodeChange,
  onCreateMultiplayerRoom,
  onJoinMultiplayerRoom,
  onMultiplayerSessionModeChange,
  onMultiplayerReadyToggle,
  onMultiplayerRpsChoice,
  onMultiplayerRpsRedo,
  onMultiplayerRpsBack,
  onPlayerColorChange,
  onNewGame,
  onContinueGame,
  hasContinueGame = false,
  continueGameDisabledReason = null,
  initialPhase,
  onCatalogBack,
}: StartScreenProps): React.ReactElement {
  const isJsdomTestEnv = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
  const [phase, setPhase] = React.useState<SetupPhase>(initialPhase ?? (isJsdomTestEnv ? 'setup' : 'landing'));
  const [modeDraft, setModeDraft] = React.useState<GameMode>(gameMode);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [rpsResult, setRpsResult] = React.useState<string>('');
  const [rpsBattle, setRpsBattle] = React.useState<RpsBattleState | null>(null);
  const [rpsLocked, setRpsLocked] = React.useState(false);
  const [catalogMode, setCatalogMode] = React.useState<CatalogMode>('character');
  const [selectedMultiplayerRpsChoice, setSelectedMultiplayerRpsChoice] = React.useState<RpsChoice | null>(null);
  const characterCatalog = React.useMemo(
    () => ALPHA_1_CHARACTER_DEFINITIONS.map(createDefaultCharacterCatalogEntry),
    [],
  );
  const powerCatalog = React.useMemo(
    () => FIRST_ALPHA_POWER_CARD_DEFINITIONS.map(createDefaultPowerCatalogEntry),
    [],
  );
  const [selectedCharacterId, setSelectedCharacterId] = React.useState<string | null>(null);
  const [selectedPowerId, setSelectedPowerId] = React.useState<string | null>(null);
  const [openColorPickerFor, setOpenColorPickerFor] = React.useState<Controller | null>(null);
  const colorPickerRootRef = React.useRef<HTMLFieldSetElement | null>(null);
  const previousOwnSeatSubmittedRef = React.useRef<boolean>(false);
  const previousBothSeatsHaveNoRpsChoiceRef = React.useRef<boolean>(true);

  const colorsUnique = playerColors.P1 !== playerColors.P2;
  const ownSeat = multiplayerPlayer;
  const ownSeatHasSubmittedRpsChoice = ownSeat
    ? ownSeat === 'P1'
      ? !!multiplayerRpsChoiceState?.hasP1Choice
      : !!multiplayerRpsChoiceState?.hasP2Choice
    : false;
  const bothSeatsHaveNoRpsChoice = !multiplayerRpsChoiceState?.hasP1Choice && !multiplayerRpsChoiceState?.hasP2Choice;
  const ownReady = ownSeat ? !!multiplayerReady?.[ownSeat] : false;
  const opponentSeat: Controller = ownSeat === 'P1' ? 'P2' : 'P1';
  const opponentReady = ownSeat ? !!multiplayerReady?.[opponentSeat] : false;
  const effectiveSessionMode = multiplayerSessionMode ?? sessionMode;

  React.useEffect(() => {
    setModeDraft(gameMode);
  }, [gameMode]);

  React.useEffect(() => {
    if (initialPhase) {
      setPhase(initialPhase);
    }
  }, [initialPhase]);

  React.useEffect(() => {
    if (phase === 'online-rps-result' && !multiplayerRpsResult) {
      setSelectedMultiplayerRpsChoice(null);
      setPhase(multiplayerRoomPhase === 'rps' ? 'online-rps' : 'online');
      return;
    }

    if (phase === 'online-rps' && multiplayerRoomPhase !== 'rps' && !multiplayerRpsResult) {
      setSelectedMultiplayerRpsChoice(null);
      setPhase('online');
      return;
    }

    if (multiplayerRoomCode && multiplayerRoomPhase === 'rps' && !multiplayerRpsResult) {
      setPhase('online-rps');
      return;
    }

    if (multiplayerRpsResult) {
      setSelectedMultiplayerRpsChoice(null);
      setPhase('online-rps-result');
      return;
    }
  }, [multiplayerRoomCode, multiplayerRpsResult, multiplayerRoomPhase, phase]);

  React.useEffect(() => {
    const previous = previousOwnSeatSubmittedRef.current;
    if (phase === 'online-rps' && previous && !ownSeatHasSubmittedRpsChoice) {
      setSelectedMultiplayerRpsChoice(null);
    }
    previousOwnSeatSubmittedRef.current = ownSeatHasSubmittedRpsChoice;
  }, [ownSeatHasSubmittedRpsChoice, phase]);

  React.useEffect(() => {
    const previous = previousBothSeatsHaveNoRpsChoiceRef.current;
    if (phase === 'online-rps' && !previous && bothSeatsHaveNoRpsChoice && selectedMultiplayerRpsChoice !== null) {
      setSelectedMultiplayerRpsChoice(null);
    }
    previousBothSeatsHaveNoRpsChoiceRef.current = bothSeatsHaveNoRpsChoice;
  }, [bothSeatsHaveNoRpsChoice, phase, selectedMultiplayerRpsChoice]);

  React.useEffect(() => {
    if (!selectedCharacterId && characterCatalog.length > 0) {
      setSelectedCharacterId(characterCatalog[0].definitionId);
    }
  }, [characterCatalog, selectedCharacterId]);

  React.useEffect(() => {
    if (!selectedPowerId && powerCatalog.length > 0) {
      setSelectedPowerId(powerCatalog[0].definitionId);
    }
  }, [powerCatalog, selectedPowerId]);

  React.useEffect(() => {
    const onDocumentMouseDown = (event: MouseEvent): void => {
      if (!openColorPickerFor || !colorPickerRootRef.current) {
        return;
      }

      if (!colorPickerRootRef.current.contains(event.target as Node)) {
        setOpenColorPickerFor(null);
      }
    };

    document.addEventListener('mousedown', onDocumentMouseDown);
    return () => {
      document.removeEventListener('mousedown', onDocumentMouseDown);
    };
  }, [openColorPickerFor]);

  const transitionTo = React.useCallback((nextPhase: SetupPhase): void => {
    if (isJsdomTestEnv) {
      setPhase(nextPhase);
      return;
    }

    setIsTransitioning(true);
    window.setTimeout(() => {
      setPhase(nextPhase);
      setIsTransitioning(false);
    }, 220);
  }, [isJsdomTestEnv]);

  const toRpsLabel = (choice: RpsChoice): string => {
    if (choice === 'rock') return 'Rock';
    if (choice === 'paper') return 'Paper';
    return 'Scissors';
  };

  const toRpsIcon = (choice: RpsChoice): string => {
    if (choice === 'rock') return '🪨';
    if (choice === 'paper') return '📄';
    return '✂️';
  };

  const resolveRps = (humanChoice: RpsChoice, botChoice: RpsChoice): RpsOutcome => {
    if (humanChoice === botChoice) {
      return 'tie';
    }

    const humanWins = (
      (humanChoice === 'rock' && botChoice === 'scissors')
      || (humanChoice === 'paper' && botChoice === 'rock')
      || (humanChoice === 'scissors' && botChoice === 'paper')
    );

    return humanWins ? 'human' : 'bot';
  };

  const rpsAnimationClass = (side: 'human' | 'bot'): string => {
    if (!rpsBattle) {
      return '';
    }

    if (rpsBattle.outcome === 'tie') {
      return 'action-tie-bump';
    }

    const winner = rpsBattle.outcome === 'human' ? 'human' : 'bot';
    const winnerChoice = winner === 'human' ? rpsBattle.humanChoice : rpsBattle.botChoice;
    const loserChoice = winner === 'human' ? rpsBattle.botChoice : rpsBattle.humanChoice;
    const isWinner = side === winner;

    if (winnerChoice === 'paper' && loserChoice === 'rock') {
      return isWinner ? 'action-paper-wrap' : 'action-rock-trapped';
    }

    if (winnerChoice === 'rock' && loserChoice === 'scissors') {
      return isWinner ? 'action-rock-crush' : 'action-scissors-crushed';
    }

    if (winnerChoice === 'scissors' && loserChoice === 'paper') {
      return isWinner ? 'action-scissors-cut' : 'action-paper-sliced';
    }

    return '';
  };

  const runRpsRound = (humanChoice: RpsChoice): void => {
    if (rpsLocked) {
      return;
    }

    const choices: RpsChoice[] = ['rock', 'paper', 'scissors'];
    const botChoice = choices[Math.floor(Math.random() * choices.length)];
    const outcome = resolveRps(humanChoice, botChoice);

    setRpsLocked(true);
    setRpsBattle({ humanChoice, botChoice, outcome });

    if (outcome === 'tie') {
      setRpsResult(`Tie: ${toRpsLabel(humanChoice)} vs ${toRpsLabel(botChoice)}. Play again.`);
      window.setTimeout(() => {
        setRpsLocked(false);
      }, 1200);
      return;
    }

    if (outcome === 'human') {
      setRpsResult(`You win: ${toRpsLabel(humanChoice)} beats ${toRpsLabel(botChoice)}. You go first.`);
      window.setTimeout(() => {
        onNewGame('P1');
      }, 1650);
      return;
    }

    setRpsResult(`Bot wins: ${toRpsLabel(botChoice)} beats ${toRpsLabel(humanChoice)}. Bot goes first.`);
    window.setTimeout(() => {
      onNewGame('P2');
    }, 1650);
  };

  const screenClassName = (extraClasses = ''): string => {
    const classes = ['start-screen', extraClasses, isTransitioning ? 'start-screen-transitioning' : 'start-screen-enter'];
    return classes.filter(Boolean).join(' ');
  };

  const renderColorPicker = (player: Controller): React.ReactElement => {
    const selectedColor = playerColors[player];
    const otherPlayer: Controller = player === 'P1' ? 'P2' : 'P1';
    const isOpen = openColorPickerFor === player;

    return React.createElement(
      'div',
      { className: 'color-picker' },
      React.createElement(
        'button',
        {
          type: 'button',
          className: `color-preview-swatch color-preview-trigger ${isOpen ? 'open' : ''}`,
          style: { background: COLOR_SWATCH_STYLES[selectedColor] },
          onClick: () => setOpenColorPickerFor(prev => (prev === player ? null : player)),
          'aria-expanded': isOpen,
          'aria-haspopup': 'listbox',
          'data-testid': `color-preview-${player}`,
        },
        React.createElement('span', { className: 'color-swatch-label' }, selectedColor),
        React.createElement('span', { className: 'color-dropdown-chevron', 'aria-hidden': 'true' }, isOpen ? '▲' : '▼'),
      ),
      isOpen
        ? React.createElement(
            'div',
            { className: 'color-dropdown-panel', role: 'listbox', 'data-testid': `color-dropdown-${player}` },
            React.createElement('strong', { className: 'color-select-label' }, 'Pick Border Theme'),
            React.createElement(
              'div',
              { className: 'swatch-grid' },
              PLAYER_COLORS.map(color => {
                const disabled = playerColors[otherPlayer] === color && selectedColor !== color;
                const selected = selectedColor === color;

                return React.createElement(
                  'button',
                  {
                    key: `${player}-${color}`,
                    type: 'button',
                    className: `color-swatch ${selected ? 'selected' : ''}`,
                    style: { background: COLOR_SWATCH_STYLES[color] },
                    disabled,
                    'aria-selected': selected,
                    onClick: () => {
                      onPlayerColorChange(player, color);
                      setOpenColorPickerFor(null);
                    },
                    'data-testid': `color-swatch-${player}-${color}`,
                  },
                  React.createElement('span', { className: 'color-swatch-label' }, color),
                );
              }),
            ),
          )
        : null,
      React.createElement(
        'label',
        { className: 'color-select-label color-select-hidden' },
        'Border Theme',
        React.createElement(
          'select',
          {
            className: 'color-select',
            value: selectedColor,
            onChange: (event: React.ChangeEvent<HTMLSelectElement>) => onPlayerColorChange(player, event.currentTarget.value as PlayerColor),
            'data-testid': `color-select-${player}`,
          },
          PLAYER_COLORS.map(color => {
            const disabled = playerColors[otherPlayer] === color && selectedColor !== color;
            return React.createElement(
              'option',
              {
                key: `${player}-compat-${color}`,
                value: color,
                disabled,
              },
              color,
            );
          }),
        ),
      ),
    );
  };

  const selectedCharacter = characterCatalog.find(card => card.definitionId === selectedCharacterId) ?? null;
  const selectedPower = powerCatalog.find(card => card.definitionId === selectedPowerId) ?? null;

  const renderCharacterCatalogCard = (card: ReturnType<typeof createDefaultCharacterCatalogEntry>): React.ReactElement => React.createElement(
    'button',
    {
      key: card.definitionId,
      type: 'button',
      className: `catalog-character-tile ${selectedCharacterId === card.definitionId ? 'selected' : ''}`,
      onClick: () => setSelectedCharacterId(card.definitionId),
      'data-testid': `catalog-character-tile-${card.definitionId}`,
    },
    React.createElement(CharacterCardFrame, {
      size: 'battle',
      revealed: true,
      controllerColorClass: 'player-color-silver',
      displayName: card.displayName,
      ATK: card.printedATK,
      DEF: card.printedDEF,
      ability: card.ability,
      artSrc: card.artImageUrl || null,
      fullCardFaceSrc: card.fullCardFaceImageUrl || null,
      visualMode: card.visualMode,
      selected: selectedCharacterId === card.definitionId,
      testId: `catalog-character-preview-${card.definitionId}`,
    }),
  );

  const renderPowerCatalogCard = (card: ReturnType<typeof createDefaultPowerCatalogEntry>): React.ReactElement => React.createElement(
    'button',
    {
      key: card.definitionId,
      type: 'button',
      className: `catalog-power-tile ${selectedPowerId === card.definitionId ? 'selected' : ''}`,
      onClick: () => setSelectedPowerId(card.definitionId),
      'data-testid': `catalog-power-tile-${card.definitionId}`,
    },
    React.createElement(PowerCardFrame, {
      size: 'battle',
      displayName: card.displayName,
      rulesText: card.rulesText,
      artSrc: card.artImageUrl || null,
      fullCardFaceSrc: card.fullCardFaceImageUrl || null,
      visualMode: card.visualMode,
      state: selectedPowerId === card.definitionId ? 'selected' : 'playable',
      selected: selectedPowerId === card.definitionId,
      testId: `catalog-power-preview-${card.definitionId}`,
    }),
  );

  const multiplayerMenuSection = React.createElement(
    'section',
    { className: 'first-player-field', 'data-testid': 'multiplayer-section' },
    React.createElement('legend', null, 'Online Play'),
    React.createElement('p', { className: 'mode-confirm-copy' }, 'Play with a friend on another device.'),
    React.createElement('div', { className: 'mode-toggle-row' },
      React.createElement(
        'button',
        {
          type: 'button',
          className: `mode-button ${phase === 'online-host' ? 'selected' : ''}`,
          onClick: () => transitionTo('online-host'),
          'data-testid': 'open-host-page-button',
        },
        'Host Game',
      ),
      React.createElement(
        'button',
        {
          type: 'button',
          className: `mode-button ${phase === 'online-join' ? 'selected' : ''}`,
          onClick: () => transitionTo('online-join'),
          'data-testid': 'open-join-page-button',
        },
        'Join Game',
      ),
    ),
    multiplayerStatus ? React.createElement('p', { className: 'status-label', 'data-testid': 'room-status' }, multiplayerStatus) : null,
  );

  const hostGameSection = React.createElement(
    'section',
    { className: 'first-player-field', 'data-testid': 'host-game-section' },
    React.createElement('legend', null, 'Host Game'),
    React.createElement('p', { className: 'mode-confirm-copy' }, 'Create a game code, then share it with your friend.'),
    React.createElement(
      'button',
      { type: 'button', className: 'begin-button', onClick: onCreateMultiplayerRoom, 'data-testid': 'create-room-button' },
      'Create Code',
    ),
    multiplayerRoomCode ? React.createElement('p', { className: 'status-label room-code-display', 'data-testid': 'room-code-display' }, `Game Code: ${multiplayerRoomCode}`) : null,
    multiplayerStatus ? React.createElement('p', { className: 'status-label', 'data-testid': 'room-status-host' }, multiplayerStatus) : null,
  );

  const joinGameSection = React.createElement(
    'section',
    { className: 'first-player-field', 'data-testid': 'join-game-section' },
    React.createElement('legend', null, 'Join Game'),
    React.createElement('p', { className: 'mode-confirm-copy' }, 'Enter the game code from your friend.'),
    React.createElement('div', { className: 'mode-toggle-row' },
      React.createElement('input', {
        type: 'text',
        value: multiplayerJoinCode,
        onChange: event => onMultiplayerJoinCodeChange?.(event.currentTarget.value.toUpperCase()),
        placeholder: 'Enter game code',
        'data-testid': 'join-room-input',
      }),
      React.createElement(
        'button',
        { type: 'button', className: 'begin-button', onClick: onJoinMultiplayerRoom, 'data-testid': 'join-room-button' },
        'Join With Code',
      ),
    ),
    multiplayerStatus ? React.createElement('p', { className: 'status-label', 'data-testid': 'room-status-join' }, multiplayerStatus) : null,
  );

  const multiplayerLobbyControls = multiplayerRoomCode && ownSeat ? React.createElement(
    'section',
    { className: 'first-player-field', ref: colorPickerRootRef, 'data-testid': 'multiplayer-lobby-controls' },
    React.createElement('legend', null, 'Lobby Controls'),
    React.createElement('p', { className: 'mode-confirm-copy' }, `You are ${ownSeat === 'P1' ? 'Host (P1)' : 'Player Two (P2)'}.`),
    React.createElement('p', { className: 'mode-confirm-copy' }, `Room Phase: ${multiplayerRoomPhase ?? 'lobby'}`),
    React.createElement('div', { className: 'mode-toggle-row' },
      React.createElement('label', null, 'Session'),
      React.createElement('div', { className: 'mode-toggle-row' },
        React.createElement(
          'button',
          {
            type: 'button',
            className: `mode-button ${effectiveSessionMode === 'single-game' ? 'selected' : ''}`,
            onClick: () => onMultiplayerSessionModeChange?.('single-game'),
            disabled: ownSeat !== 'P1',
            'data-testid': 'lobby-session-single',
          },
          'Single Game',
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            className: `mode-button ${effectiveSessionMode === 'multi-game' ? 'selected' : ''}`,
            onClick: () => onMultiplayerSessionModeChange?.('multi-game'),
            disabled: ownSeat !== 'P1',
            'data-testid': 'lobby-session-multi',
          },
          'Multi Game',
        ),
      ),
    ),
    React.createElement('div', { className: 'mode-toggle-row' },
      React.createElement('label', null, 'Your Color'),
      renderColorPicker(ownSeat),
    ),
    React.createElement('p', { className: 'mode-confirm-copy' }, `Ready: You ${ownReady ? 'Yes' : 'No'} | Opponent ${opponentReady ? 'Yes' : 'No'}`),
    React.createElement(
      'button',
      {
        type: 'button',
        className: ownReady ? 'mode-button' : 'begin-button',
        onClick: () => onMultiplayerReadyToggle?.(!ownReady),
        'data-testid': 'lobby-ready-toggle',
      },
      ownReady ? 'Set Not Ready' : 'Set Ready',
    ),
    multiplayerRoomPhase === 'rps'
      ? React.createElement('p', { className: 'status-label', 'data-testid': 'lobby-rps-redirect' }, 'RPS in progress. Opening dedicated RPS screen...')
      : null,
  ) : null;

  if (phase === 'landing') {
    return React.createElement(
      'main',
      { className: screenClassName('start-screen-landing'), 'data-testid': 'start-screen' },
      React.createElement('div', { className: 'start-hero landing-hero' },
        React.createElement('img', {
          className: 'start-logo-image',
          src: PUBLIC_ASSETS.logo,
          alt: 'Roundtable Rumble',
          'aria-hidden': 'true',
        }),
        React.createElement('h1', { className: 'start-title' }, 'Roundtable Rumble'),
        React.createElement('p', { className: 'start-subtitle bangers-subtitle' }, 'A Brendan !! Game'),
      ),
      React.createElement('div', { className: 'start-actions start-actions-centered' },
        (hasContinueGame || continueGameDisabledReason)
          ? React.createElement(
              React.Fragment,
              null,
              React.createElement(
                'button',
                {
                  type: 'button',
                  className: 'begin-button',
                  onClick: () => onContinueGame?.(),
                  disabled: !hasContinueGame,
                  'data-testid': 'continue-game-button',
                },
                'Continue Game',
              ),
              continueGameDisabledReason
                ? React.createElement('p', { className: 'status-label', 'data-testid': 'continue-game-disabled-reason' }, continueGameDisabledReason)
                : null,
            )
          : null,
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'begin-button',
            onClick: () => transitionTo('mode'),
            'data-testid': 'begin-button',
          },
          'Begin',
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'mode-button',
            onClick: () => transitionTo('catalog'),
            'data-testid': 'open-card-catalog-button',
          },
          'Card Catalog',
        ),
      ),
    );
  }

  if (phase === 'catalog') {
    return React.createElement(
      'main',
      { className: screenClassName('start-screen-catalog'), 'data-testid': 'start-screen' },
      React.createElement('div', { className: 'start-hero' },
        React.createElement('img', {
          className: 'start-logo-image start-logo-image-small',
          src: PUBLIC_ASSETS.logo,
          alt: 'Roundtable Rumble',
          'aria-hidden': 'true',
        }),
        React.createElement('h1', { className: 'start-title' }, 'Card Catalog'),
        React.createElement('p', { className: 'start-subtitle' }, 'Read-only official card data. Select a card to inspect stats and coded special text.'),
      ),
      React.createElement('div', { className: 'catalog-mode-toggle' },
        React.createElement(
          'button',
          {
            type: 'button',
            className: `mode-button ${catalogMode === 'character' ? 'selected' : ''}`,
            onClick: () => setCatalogMode('character'),
            'data-testid': 'catalog-character-tab',
          },
          'Character Cards',
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            className: `mode-button ${catalogMode === 'power' ? 'selected' : ''}`,
            onClick: () => setCatalogMode('power'),
            'data-testid': 'catalog-power-tab',
          },
          'Power Cards',
        ),
      ),
      catalogMode === 'character'
        ? React.createElement(
            React.Fragment,
            null,
            React.createElement('section', { className: 'catalog-character-grid', 'data-testid': 'character-catalog-grid' }, characterCatalog.map(renderCharacterCatalogCard)),
            selectedCharacter
              ? React.createElement(
                  'section',
                  { className: 'catalog-read-panel', 'data-testid': 'catalog-character-details' },
                  React.createElement('h3', null, selectedCharacter.displayName),
                  React.createElement('p', { className: 'catalog-read-stats' }, `ATK ${selectedCharacter.printedATK} | DEF ${selectedCharacter.printedDEF}`),
                  React.createElement('p', { className: 'catalog-read-ability-title' }, 'Coded Special Ability'),
                  React.createElement('p', { className: 'catalog-read-ability' }, selectedCharacter.ability || 'No coded special ability.'),
                )
              : null,
          )
        : React.createElement(
            React.Fragment,
            null,
            React.createElement('section', { className: 'catalog-power-grid', 'data-testid': 'power-catalog-grid' }, powerCatalog.map(renderPowerCatalogCard)),
            selectedPower
              ? React.createElement(
                  'section',
                  { className: 'catalog-read-panel', 'data-testid': 'catalog-power-details' },
                  React.createElement('h3', null, selectedPower.displayName),
                  React.createElement('p', { className: 'catalog-read-ability-title' }, 'Official Rules Text'),
                  React.createElement('p', { className: 'catalog-read-ability' }, selectedPower.rulesText),
                )
              : null,
          ),
      React.createElement('div', { className: 'start-actions' },
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'mode-button',
            onClick: onCatalogBack ?? (() => transitionTo('landing')),
          },
          'Back',
        ),
      ),
    );
  }

  if (phase === 'mode') {
    return React.createElement(
      'main',
      { className: screenClassName(), 'data-testid': 'start-screen' },
      React.createElement('div', { className: 'start-hero' },
        React.createElement('h1', { className: 'start-title' }, 'Roundtable Rumble'),
        React.createElement('p', { className: 'start-subtitle bangers-subtitle' }, 'A Brendan !! Game'),
      ),
      React.createElement(
        'fieldset',
        { className: 'first-player-field', 'data-testid': 'game-mode-field' },
        React.createElement('legend', null, 'Game Mode'),
        React.createElement('div', { className: 'mode-toggle-row' },
          React.createElement(
            'button',
            {
              type: 'button',
              className: `mode-button ${modeDraft === 'manual-two-player' ? 'selected' : ''}`,
              onClick: () => setModeDraft('manual-two-player'),
              'data-testid': 'mode-manual',
              'aria-pressed': modeDraft === 'manual-two-player',
            },
            '2 Player Manual',
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              className: `mode-button ${modeDraft === 'human-y-vs-bot-a' ? 'selected' : ''}`,
              onClick: () => setModeDraft('human-y-vs-bot-a'),
              'data-testid': 'mode-bot',
              'aria-pressed': modeDraft === 'human-y-vs-bot-a',
            },
            '1 Player V Bot',
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              className: `mode-button ${modeDraft === 'hosted-two-player' ? 'selected' : ''}`,
              onClick: () => setModeDraft('hosted-two-player'),
              'data-testid': 'mode-hosted',
              'aria-pressed': modeDraft === 'hosted-two-player',
            },
            '2 Player Hosted',
          ),
        ),
      ),
      React.createElement('p', { className: 'mode-confirm-copy' }, `Selected Mode: ${modeDraft === 'manual-two-player' ? '2 Player Manual' : modeDraft === 'human-y-vs-bot-a' ? '1 Player V Bot' : '2 Player Hosted'}`),
      React.createElement('div', { className: 'start-actions' },
        React.createElement(
          'button',
          { type: 'button', className: 'mode-button', onClick: () => transitionTo('landing') },
          'Back',
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'begin-button',
            onClick: () => {
              onGameModeChange(modeDraft);
              transitionTo(modeDraft === 'hosted-two-player' ? 'online' : 'setup');
            },
            'data-testid': 'confirm-mode-button',
          },
          'Continue',
        ),
      ),
    );
  }

  if (phase === 'online') {
    return React.createElement(
      'main',
      { className: screenClassName(), 'data-testid': 'start-screen' },
      React.createElement('div', { className: 'start-hero' },
        React.createElement('h1', { className: 'start-title' }, 'Roundtable Rumble'),
        React.createElement('p', { className: 'start-subtitle bangers-subtitle' }, 'A Brendan !! Game'),
      ),
      multiplayerMenuSection,
      React.createElement('div', { className: 'start-actions' },
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'mode-button',
            onClick: () => transitionTo('mode'),
          },
          'Back',
        ),
      ),
    );
  }

  if (phase === 'online-host') {
    return React.createElement(
      'main',
      { className: screenClassName(), 'data-testid': 'start-screen' },
      React.createElement('div', { className: 'start-hero' },
        React.createElement('h1', { className: 'start-title' }, 'Roundtable Rumble'),
        React.createElement('p', { className: 'start-subtitle bangers-subtitle' }, 'A Brendan !! Game'),
      ),
      hostGameSection,
      multiplayerLobbyControls,
      React.createElement('div', { className: 'start-actions' },
        React.createElement(
          'button',
          { type: 'button', className: 'mode-button', onClick: () => transitionTo('online') },
          'Back',
        ),
      ),
    );
  }

  if (phase === 'online-join') {
    return React.createElement(
      'main',
      { className: screenClassName(), 'data-testid': 'start-screen' },
      React.createElement('div', { className: 'start-hero' },
        React.createElement('h1', { className: 'start-title' }, 'Roundtable Rumble'),
        React.createElement('p', { className: 'start-subtitle bangers-subtitle' }, 'A Brendan !! Game'),
      ),
      joinGameSection,
      multiplayerLobbyControls,
      React.createElement('div', { className: 'start-actions' },
        React.createElement(
          'button',
          { type: 'button', className: 'mode-button', onClick: () => transitionTo('online') },
          'Back',
        ),
      ),
    );
  }

  if (phase === 'online-rps' && multiplayerRoomCode && ownSeat) {
    const displayedChoice = selectedMultiplayerRpsChoice;

    return React.createElement(
      'main',
      { className: screenClassName('start-screen-rps'), 'data-testid': 'start-screen' },
      React.createElement('div', { className: 'start-hero rps-hero' },
        React.createElement('h1', { className: 'start-title' }, 'Rock Paper Scissors'),
        React.createElement('p', { className: 'start-subtitle' }, 'Hosted Match: head-to-head. Winner goes first.'),
      ),
      React.createElement('div', { className: 'rps-battle outcome-pending' },
        React.createElement(
          'div',
          { className: 'rps-fighter fighter-human' },
          React.createElement('span', { className: 'rps-fighter-icon', 'aria-hidden': 'true' }, ownSeat === 'P1' ? 'P1' : 'P2'),
          React.createElement('p', { className: 'mode-confirm-copy' }, ownSeat === 'P1' ? 'You: Player One' : 'You: Player Two'),
        ),
        React.createElement('span', { className: 'rps-versus' }, 'VS'),
        React.createElement(
          'div',
          { className: 'rps-fighter fighter-bot' },
          React.createElement('span', { className: 'rps-fighter-icon', 'aria-hidden': 'true' }, ownSeat === 'P1' ? 'P2' : 'P1'),
          React.createElement('p', { className: 'mode-confirm-copy' }, ownSeat === 'P1' ? 'Opponent: Player Two' : 'Opponent: Player One'),
        ),
      ),
      React.createElement('div', { className: 'rps-grid' },
        (['rock', 'paper', 'scissors'] as const).map(choice => React.createElement(
          'button',
          {
            key: choice,
            type: 'button',
            className: `rps-choice ${selectedMultiplayerRpsChoice === choice ? 'selected' : ''}`,
            onClick: () => {
              setSelectedMultiplayerRpsChoice(choice);
              onMultiplayerRpsChoice?.(choice);
            },
            disabled: ownSeatHasSubmittedRpsChoice || selectedMultiplayerRpsChoice !== null,
            'data-testid': `online-rps-${choice}`,
          },
          React.createElement('span', { className: 'rps-choice-art', 'aria-hidden': 'true' }, toRpsIcon(choice)),
          React.createElement('span', { className: 'sr-only' }, toRpsLabel(choice)),
        )),
      ),
      React.createElement(
        'p',
        { className: 'rps-result', 'data-testid': 'online-rps-status' },
        (displayedChoice || ownSeatHasSubmittedRpsChoice)
          ? displayedChoice
            ? `Locked in: ${toRpsLabel(displayedChoice)}. Waiting for opponent...`
            : 'Locked in. Waiting for opponent...'
          : 'Pick Rock, Paper, or Scissors.',
      ),
      React.createElement('div', { className: 'start-actions' },
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'mode-button',
            onClick: () => {
              onMultiplayerRpsBack?.();
              setSelectedMultiplayerRpsChoice(null);
              setPhase('online');
            },
            'data-testid': 'online-rps-back',
          },
          'Back',
        ),
      ),
    );
  }

  const activeMultiplayerRpsResult = multiplayerRpsResult;

  if (phase === 'online-rps-result' && activeMultiplayerRpsResult) {
    const winnerLabel = activeMultiplayerRpsResult.outcome === 'tie'
      ? 'Tie'
      : activeMultiplayerRpsResult.firstPlayer === 'P1'
        ? 'Player One'
        : 'Player Two';

    return React.createElement(
      'main',
      { className: screenClassName('start-screen-rps'), 'data-testid': 'start-screen' },
      React.createElement('div', { className: 'start-hero rps-hero' },
        React.createElement('h1', { className: 'start-title' }, 'RPS Result'),
        React.createElement('p', { className: 'start-subtitle' }, activeMultiplayerRpsResult.outcome === 'tie'
          ? 'Tie. Re-running Rock Paper Scissors...'
          : 'Both selections are in. Match starts in a moment...'),
      ),
      React.createElement('div', { className: 'rps-battle outcome-pending' },
        React.createElement(
          'div',
          { className: 'rps-fighter fighter-human' },
          React.createElement('span', { className: 'rps-fighter-icon', 'aria-hidden': 'true' }, toRpsIcon(activeMultiplayerRpsResult.p1Choice)),
          React.createElement('p', { className: 'mode-confirm-copy' }, `Player One: ${toRpsLabel(activeMultiplayerRpsResult.p1Choice)}`),
        ),
        React.createElement('span', { className: 'rps-versus' }, 'VS'),
        React.createElement(
          'div',
          { className: 'rps-fighter fighter-bot' },
          React.createElement('span', { className: 'rps-fighter-icon', 'aria-hidden': 'true' }, toRpsIcon(activeMultiplayerRpsResult.p2Choice)),
          React.createElement('p', { className: 'mode-confirm-copy' }, `Player Two: ${toRpsLabel(activeMultiplayerRpsResult.p2Choice)}`),
        ),
      ),
      React.createElement('p', { className: 'rps-result', 'data-testid': 'multiplayer-rps-result' }, activeMultiplayerRpsResult.outcome === 'tie'
        ? `Tie: ${toRpsLabel(activeMultiplayerRpsResult.p1Choice)} vs ${toRpsLabel(activeMultiplayerRpsResult.p2Choice)}. Restarting in 3...`
        : `${winnerLabel} wins RPS and goes first.`),
    );
  }

  if (phase === 'rps') {
    return React.createElement(
      'main',
      { className: screenClassName('start-screen-rps'), 'data-testid': 'start-screen' },
      React.createElement('div', { className: 'start-hero rps-hero' },
        React.createElement('h1', { className: 'start-title' }, 'Rock Paper Scissors'),
        React.createElement('p', { className: 'start-subtitle' }, 'Winner goes first.'),
      ),
      React.createElement('div', { className: `rps-battle ${rpsBattle ? `outcome-${rpsBattle.outcome}` : 'outcome-pending'}` },
        React.createElement(
          'div',
          { className: `rps-fighter fighter-human ${rpsBattle ? rpsAnimationClass('human') : ''}` },
          React.createElement('span', { className: 'rps-fighter-icon', 'aria-hidden': 'true' }, rpsBattle ? toRpsIcon(rpsBattle.humanChoice) : '❔'),
        ),
        React.createElement('span', { className: 'rps-versus' }, 'VS'),
        React.createElement(
          'div',
          { className: `rps-fighter fighter-bot ${rpsBattle ? rpsAnimationClass('bot') : ''}` },
          React.createElement('span', { className: 'rps-fighter-icon', 'aria-hidden': 'true' }, rpsBattle ? toRpsIcon(rpsBattle.botChoice) : '❔'),
        ),
      ),
      React.createElement('div', { className: 'rps-grid' },
        (['rock', 'paper', 'scissors'] as const).map(choice => React.createElement(
          'button',
          {
            key: choice,
            type: 'button',
            className: `rps-choice ${rpsBattle?.humanChoice === choice ? 'selected' : ''}`,
            onClick: () => runRpsRound(choice),
            disabled: rpsLocked,
            'data-testid': `rps-${choice}`,
            'aria-label': toRpsLabel(choice),
          },
          React.createElement('span', { className: 'rps-choice-art', 'aria-hidden': 'true' }, toRpsIcon(choice)),
          React.createElement('span', { className: 'sr-only' }, toRpsLabel(choice)),
        )),
      ),
      rpsResult ? React.createElement('p', { className: 'rps-result', 'data-testid': 'rps-result' }, rpsResult) : null,
      React.createElement('div', { className: 'start-actions' },
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'mode-button',
            onClick: () => {
              setRpsBattle(null);
              setRpsResult('');
              setRpsLocked(false);
              transitionTo('setup');
            },
          },
          'Back',
        ),
      ),
    );
  }

  return React.createElement(
    'main',
    { className: screenClassName(), 'data-testid': 'start-screen' },
    React.createElement('div', { className: 'start-hero' },
      React.createElement('h1', { className: 'start-title' }, 'Roundtable Rumble'),
      React.createElement('p', { className: 'start-subtitle bangers-subtitle' }, 'A Brendan !! Game'),
    ),

    gameMode === 'human-y-vs-bot-a'
      ? React.createElement(
          'fieldset',
          { className: 'first-player-field', 'data-testid': 'bot-difficulty-field' },
          React.createElement('legend', null, 'Bot Difficulty'),
          React.createElement('div', { className: 'mode-toggle-row' },
            (['Easy', 'Standard', 'Hard'] as BotDifficulty[]).map(level => React.createElement(
              'button',
              {
                key: level,
                type: 'button',
                className: `mode-button ${botDifficulty === level ? 'selected' : ''}`,
                onClick: () => onBotDifficultyChange(level),
                'data-testid': `bot-difficulty-${level.toLowerCase()}`,
                'aria-pressed': botDifficulty === level,
              },
              level,
            )),
          ),
        )
      : null,

    isJsdomTestEnv
      ? React.createElement(
          'fieldset',
          { className: 'first-player-field', 'data-testid': 'game-mode-field' },
          React.createElement('legend', null, 'Game Mode'),
          React.createElement('div', { className: 'mode-toggle-row' },
            React.createElement(
              'button',
              {
                type: 'button',
                className: `mode-button ${gameMode === 'manual-two-player' ? 'selected' : ''}`,
                onClick: () => onGameModeChange('manual-two-player'),
                'data-testid': 'mode-manual',
                'aria-pressed': gameMode === 'manual-two-player',
              },
              '2 Player Manual',
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                className: `mode-button ${gameMode === 'human-y-vs-bot-a' ? 'selected' : ''}`,
                onClick: () => onGameModeChange('human-y-vs-bot-a'),
                'data-testid': 'mode-bot',
                'aria-pressed': gameMode === 'human-y-vs-bot-a',
              },
              '1 Player V Bot',
            ),
          ),
        )
      : null,

    React.createElement(
      'fieldset',
      { className: 'first-player-field', 'data-testid': 'session-mode-field' },
      React.createElement('legend', null, 'Session Type'),
      React.createElement('div', { className: 'mode-toggle-row' },
        React.createElement(
          'button',
          {
            type: 'button',
            className: `mode-button ${sessionMode === 'single-game' ? 'selected' : ''}`,
            onClick: () => onSessionModeChange('single-game'),
            'data-testid': 'session-single-game',
            'aria-pressed': sessionMode === 'single-game',
          },
          'Single Game',
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            className: `mode-button ${sessionMode === 'multi-game' ? 'selected' : ''}`,
            onClick: () => onSessionModeChange('multi-game'),
            'data-testid': 'session-multi-game',
            'aria-pressed': sessionMode === 'multi-game',
          },
          'Multi-Game Session',
        ),
      ),
    ),

    React.createElement(
      'fieldset',
      { className: 'first-player-field', ref: colorPickerRootRef, 'data-testid': 'player-colors-field' },
      React.createElement('legend', null, 'Player Colors'),
      React.createElement('div', { className: 'color-columns' },
        React.createElement('div', { className: 'color-column' },
          React.createElement('h3', null, gameMode === 'human-y-vs-bot-a' ? 'Human Color' : 'Player One Color'),
          renderColorPicker('P1'),
        ),
        React.createElement('div', { className: 'color-column' },
          React.createElement('h3', null, gameMode === 'human-y-vs-bot-a' ? 'Bot Color' : 'Player Two Color'),
          renderColorPicker('P2'),
        ),
      ),
      !colorsUnique
        ? React.createElement('p', { className: 'status-label', 'data-testid': 'color-uniqueness-error' }, 'Players must choose different colors.')
        : null,
    ),

    gameMode === 'manual-two-player'
      ? React.createElement(
          'fieldset',
          { className: 'first-player-field' },
          React.createElement('legend', null, 'Choose First Player'),
          React.createElement('div', { className: 'first-player-options premium-buttons' },
            React.createElement(
              'button',
              {
                type: 'button',
                className: `mode-button ${firstPlayer === 'P1' ? 'selected' : ''}`,
                onClick: () => onFirstPlayerChange('P1'),
                'data-testid': 'first-player-p1',
                'aria-pressed': firstPlayer === 'P1',
              },
              'Player One',
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                className: `mode-button ${firstPlayer === 'P2' ? 'selected' : ''}`,
                onClick: () => onFirstPlayerChange('P2'),
                'data-testid': 'first-player-p2',
                'aria-pressed': firstPlayer === 'P2',
              },
              'Player Two',
            ),
          ),
        )
      : null,

    React.createElement('div', { className: 'start-actions' },
      React.createElement(
        'button',
        {
          type: 'button',
          className: 'mode-button',
          onClick: () => transitionTo('mode'),
        },
        'Back',
      ),
      gameMode === 'manual-two-player'
        ? React.createElement(
            'button',
            {
              type: 'button',
              className: 'begin-button',
              onClick: () => onNewGame(firstPlayer),
              disabled: !colorsUnique,
              'data-testid': 'new-game-button',
            },
            'Begin',
          )
        : React.createElement(
            'button',
            {
              type: 'button',
              className: 'begin-button',
              onClick: () => {
                if (isJsdomTestEnv) {
                  onNewGame('P1');
                  return;
                }
                setRpsBattle(null);
                setRpsResult('');
                setRpsLocked(false);
                transitionTo('rps');
              },
              disabled: !colorsUnique,
              'data-testid': 'new-game-button',
            },
            'Begin',
          ),
    ),
  );
}
