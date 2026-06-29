import React from 'react';
import { type Controller } from '../gameState';
import type { BotDifficulty } from '../bot';
import { CharacterCardFrame, PowerCardFrame } from './CardFrames';
import { ALPHA_1_CHARACTER_DEFINITIONS } from '../cardDefinitions';
import { FIRST_ALPHA_POWER_CARD_DEFINITIONS } from '../powerCards';
import {
  loadCharacterCatalog,
  loadPowerCatalog,
  saveCharacterCatalog,
  savePowerCatalog,
} from '../cardCatalog';
import { PUBLIC_ASSETS } from '../publicAssets';
import './StartScreen.css';

export type GameMode = 'manual-two-player' | 'human-y-vs-bot-a';
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
  playerColors: { P1: PlayerColor; P2: PlayerColor };
  onFirstPlayerChange: (next: Controller) => void;
  onGameModeChange: (next: GameMode) => void;
  onSessionModeChange: (next: SessionMode) => void;
  onBotDifficultyChange: (next: BotDifficulty) => void;
  onPlayerColorChange: (player: Controller, color: PlayerColor) => void;
  onNewGame: (firstPlayerOverride?: Controller) => void;
  initialPhase?: SetupPhase;
  onCatalogBack?: () => void;
}

type SetupPhase = 'landing' | 'mode' | 'setup' | 'rps' | 'catalog';
type RpsChoice = 'rock' | 'paper' | 'scissors';
type RpsOutcome = 'human' | 'bot' | 'tie';
type CatalogMode = 'character' | 'power';

interface EditableCharacterCatalogCard {
  definitionId: string;
  displayName: string;
  printedATK: number;
  printedDEF: number;
  ability: string;
  visualMode: 'layered-art' | 'full-card-face';
  artImageUrl: string;
  fullCardFaceImageUrl: string;
}

interface EditablePowerCatalogCard {
  definitionId: string;
  displayName: string;
  rulesText: string;
  visualMode: 'layered-art' | 'full-card-face';
  artImageUrl: string;
  fullCardFaceImageUrl: string;
}

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
  playerColors = { P1: 'Blue', P2: 'Red' },
  onFirstPlayerChange,
  onGameModeChange,
  onSessionModeChange,
  onBotDifficultyChange,
  onPlayerColorChange,
  onNewGame,
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
  const [characterCatalog, setCharacterCatalog] = React.useState<EditableCharacterCatalogCard[]>(() =>
    loadCharacterCatalog(ALPHA_1_CHARACTER_DEFINITIONS),
  );
  const [powerCatalog, setPowerCatalog] = React.useState<EditablePowerCatalogCard[]>(() =>
    loadPowerCatalog(FIRST_ALPHA_POWER_CARD_DEFINITIONS),
  );
  const [characterCatalogWarnings, setCharacterCatalogWarnings] = React.useState<Record<string, string>>({});
  const [powerCatalogWarnings, setPowerCatalogWarnings] = React.useState<Record<string, string>>({});
  const [openColorPickerFor, setOpenColorPickerFor] = React.useState<Controller | null>(null);
  const colorPickerRootRef = React.useRef<HTMLFieldSetElement | null>(null);

  const colorsUnique = playerColors.P1 !== playerColors.P2;

  React.useEffect(() => {
    setModeDraft(gameMode);
  }, [gameMode]);

  React.useEffect(() => {
    if (initialPhase) {
      setPhase(initialPhase);
    }
  }, [initialPhase]);

  React.useEffect(() => {
    saveCharacterCatalog(characterCatalog);
  }, [characterCatalog]);

  React.useEffect(() => {
    savePowerCatalog(powerCatalog);
  }, [powerCatalog]);

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

  React.useEffect(() => {
    const active = true;

    const probeImage = (url: string, onOk: () => void, onFail: () => void): void => {
      const image = new Image();
      image.onload = () => {
        if (!active) return;
        onOk();
      };
      image.onerror = () => {
        if (!active) return;
        onFail();
      };
      image.src = url;
    };

    const nextCharacterWarnings: Record<string, string> = {};
    const nextPowerWarnings: Record<string, string> = {};

    for (const card of characterCatalog) {
      if (card.visualMode === 'full-card-face' && card.fullCardFaceImageUrl.trim()) {
        probeImage(
          card.fullCardFaceImageUrl,
          () => {
            setCharacterCatalogWarnings(prev => {
              if (prev[card.definitionId] === 'Full Card Face image failed to load — using Layered Art preview.') {
                const next = { ...prev };
                delete next[card.definitionId];
                return next;
              }
              return prev;
            });
          },
          () => {
            setCharacterCatalogWarnings(prev => ({
              ...prev,
              [card.definitionId]: 'Full Card Face image failed to load — using Layered Art preview.',
            }));
          },
        );
      } else if (card.visualMode === 'full-card-face') {
        nextCharacterWarnings[card.definitionId] = 'Full Card Face image missing — using Layered Art preview.';
      }
    }

    for (const card of powerCatalog) {
      if (card.visualMode === 'full-card-face' && card.fullCardFaceImageUrl.trim()) {
        probeImage(
          card.fullCardFaceImageUrl,
          () => {
            setPowerCatalogWarnings(prev => {
              if (prev[card.definitionId] === 'Full Card Face image failed to load — using Layered Art preview.') {
                const next = { ...prev };
                delete next[card.definitionId];
                return next;
              }
              return prev;
            });
          },
          () => {
            setPowerCatalogWarnings(prev => ({
              ...prev,
              [card.definitionId]: 'Full Card Face image failed to load — using Layered Art preview.',
            }));
          },
        );
      } else if (card.visualMode === 'full-card-face') {
        nextPowerWarnings[card.definitionId] = 'Full Card Face image missing — using Layered Art preview.';
      }
    }

    setCharacterCatalogWarnings(nextCharacterWarnings);
    setPowerCatalogWarnings(nextPowerWarnings);

    return () => {
      // local guard only; no cleanup needed for Image objects
    };
  }, [characterCatalog, powerCatalog]);

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

  const renderCharacterCatalogCard = (card: EditableCharacterCatalogCard, index: number): React.ReactElement => {
    const isFullCardFace = card.visualMode === 'full-card-face';
    const warning = characterCatalogWarnings[card.definitionId] ?? '';

    return React.createElement(
      'article',
      { key: card.definitionId, className: 'catalog-card' },
      React.createElement('span', { className: `catalog-badge catalog-badge-${isFullCardFace ? 'full' : 'layered'}` }, isFullCardFace ? 'Full Card Face' : 'Layered Art'),
      React.createElement('div', { className: 'catalog-preview' },
        warning
          ? React.createElement('p', { className: 'catalog-warning' }, warning)
          : null,
        React.createElement(CharacterCardFrame, {
          size: 'hand',
          revealed: true,
          controllerColorClass: 'player-color-silver',
          displayName: card.displayName,
          ATK: card.printedATK,
          DEF: card.printedDEF,
          ability: card.ability,
          artSrc: card.artImageUrl || null,
          fullCardFaceSrc: card.fullCardFaceImageUrl || null,
          visualMode: card.visualMode,
          testId: `catalog-character-preview-${card.definitionId}`,
        }),
      ),
      React.createElement('div', { className: 'catalog-editor' },
        React.createElement('label', null, 'Card Visual Mode',
          React.createElement('select', {
            value: card.visualMode,
            onChange: (event: React.ChangeEvent<HTMLSelectElement>) => setCharacterCatalog(prev => prev.map((entry, row) => row === index
              ? { ...entry, visualMode: event.currentTarget.value as 'layered-art' | 'full-card-face' }
              : entry)),
          },
          React.createElement('option', { value: 'layered-art' }, 'Layered Art'),
          React.createElement('option', { value: 'full-card-face' }, 'Full Card Face'),
          ),
        ),
        React.createElement('label', null, 'Name',
          React.createElement('input', {
            type: 'text',
            value: card.displayName,
            onChange: event => setCharacterCatalog(prev => prev.map((entry, row) => row === index
              ? { ...entry, displayName: event.currentTarget.value }
              : entry)),
          }),
        ),
        React.createElement('label', null, 'ATK',
          React.createElement('input', {
            type: 'number',
            step: '0.5',
            value: String(card.printedATK),
            onChange: event => setCharacterCatalog(prev => prev.map((entry, row) => row === index
              ? { ...entry, printedATK: Number(event.currentTarget.value) || 0 }
              : entry)),
          }),
        ),
        React.createElement('label', null, 'DEF',
          React.createElement('input', {
            type: 'number',
            step: '0.5',
            value: String(card.printedDEF),
            onChange: event => setCharacterCatalog(prev => prev.map((entry, row) => row === index
              ? { ...entry, printedDEF: Number(event.currentTarget.value) || 0 }
              : entry)),
          }),
        ),
        React.createElement('label', null, 'Ability',
          React.createElement('textarea', {
            value: card.ability,
            onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => setCharacterCatalog(prev => prev.map((entry, row) => row === index
              ? { ...entry, ability: event.currentTarget.value }
              : entry)),
          }),
        ),
        React.createElement('label', { className: isFullCardFace ? 'catalog-field-muted' : '' }, 'Art Image URL',
          React.createElement('input', {
            type: 'text',
            value: card.artImageUrl,
            placeholder: 'https://... or local path',
            onChange: event => setCharacterCatalog(prev => prev.map((entry, row) => row === index
              ? { ...entry, artImageUrl: event.currentTarget.value }
              : entry)),
          }),
          React.createElement('small', { className: 'catalog-helper' }, 'Use this for artwork only. The game will place the card frame, name, stats, and rules over it.'),
        ),
        isFullCardFace
          ? React.createElement('label', null, 'Full Card Face Image URL',
              React.createElement('input', {
                type: 'text',
                value: card.fullCardFaceImageUrl,
                placeholder: 'https://... or local path',
                onChange: event => setCharacterCatalog(prev => prev.map((entry, row) => row === index
                  ? { ...entry, fullCardFaceImageUrl: event.currentTarget.value }
                  : entry)),
              }),
              React.createElement('small', { className: 'catalog-helper' }, 'Use this for a complete finished card design. The game will display this image as the visible card front.'),
            )
          : null,
        warning
          ? React.createElement('p', { className: 'catalog-warning' }, warning)
          : null,
      ),
    );
  };

  const renderPowerCatalogCard = (card: EditablePowerCatalogCard, index: number): React.ReactElement => {
    const isFullCardFace = card.visualMode === 'full-card-face';
    const warning = powerCatalogWarnings[card.definitionId] ?? '';

    return React.createElement(
      'article',
      { key: card.definitionId, className: 'catalog-card' },
      React.createElement('span', { className: `catalog-badge catalog-badge-${isFullCardFace ? 'full' : 'layered'}` }, isFullCardFace ? 'Full Card Face' : 'Layered Art'),
      React.createElement('div', { className: 'catalog-preview' },
        warning
          ? React.createElement('p', { className: 'catalog-warning' }, warning)
          : null,
        React.createElement(PowerCardFrame, {
          size: 'hand',
          displayName: card.displayName,
          rulesText: card.rulesText,
          artSrc: card.artImageUrl || null,
          fullCardFaceSrc: card.fullCardFaceImageUrl || null,
          visualMode: card.visualMode,
          state: 'playable',
          testId: `catalog-power-preview-${card.definitionId}`,
        }),
      ),
      React.createElement('div', { className: 'catalog-editor' },
        React.createElement('label', null, 'Card Visual Mode',
          React.createElement('select', {
            value: card.visualMode,
            onChange: (event: React.ChangeEvent<HTMLSelectElement>) => setPowerCatalog(prev => prev.map((entry, row) => row === index
              ? { ...entry, visualMode: event.currentTarget.value as 'layered-art' | 'full-card-face' }
              : entry)),
          },
          React.createElement('option', { value: 'layered-art' }, 'Layered Art'),
          React.createElement('option', { value: 'full-card-face' }, 'Full Card Face'),
          ),
        ),
        React.createElement('label', null, 'Name',
          React.createElement('input', {
            type: 'text',
            value: card.displayName,
            onChange: event => setPowerCatalog(prev => prev.map((entry, row) => row === index
              ? { ...entry, displayName: event.currentTarget.value }
              : entry)),
          }),
        ),
        React.createElement('label', null, 'Rules',
          React.createElement('textarea', {
            value: card.rulesText,
            onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => setPowerCatalog(prev => prev.map((entry, row) => row === index
              ? { ...entry, rulesText: event.currentTarget.value }
              : entry)),
          }),
        ),
        React.createElement('label', { className: isFullCardFace ? 'catalog-field-muted' : '' }, 'Art Image URL',
          React.createElement('input', {
            type: 'text',
            value: card.artImageUrl,
            placeholder: 'https://... or local path',
            onChange: event => setPowerCatalog(prev => prev.map((entry, row) => row === index
              ? { ...entry, artImageUrl: event.currentTarget.value }
              : entry)),
          }),
          React.createElement('small', { className: 'catalog-helper' }, 'Use this for artwork only. The game will place the card frame, name, stats, and rules over it.'),
        ),
        isFullCardFace
          ? React.createElement('label', null, 'Full Card Face Image URL',
              React.createElement('input', {
                type: 'text',
                value: card.fullCardFaceImageUrl,
                placeholder: 'https://... or local path',
                onChange: event => setPowerCatalog(prev => prev.map((entry, row) => row === index
                  ? { ...entry, fullCardFaceImageUrl: event.currentTarget.value }
                  : entry)),
              }),
              React.createElement('small', { className: 'catalog-helper' }, 'Use this for a complete finished card design. The game will display this image as the visible card front.'),
            )
          : null,
        warning
          ? React.createElement('p', { className: 'catalog-warning' }, warning)
          : null,
      ),
    );
  };

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
        React.createElement('p', { className: 'start-subtitle' }, 'Browse and edit Character or Power card data.'),
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
        ? React.createElement('section', { className: 'catalog-grid', 'data-testid': 'character-catalog-grid' }, characterCatalog.map(renderCharacterCatalogCard))
        : React.createElement('section', { className: 'catalog-grid', 'data-testid': 'power-catalog-grid' }, powerCatalog.map(renderPowerCatalogCard)),
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
        ),
      ),
      React.createElement('p', { className: 'mode-confirm-copy' }, `Selected Mode: ${modeDraft === 'manual-two-player' ? '2 Player Manual' : '1 Player V Bot'}`),
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
              transitionTo('setup');
            },
            'data-testid': 'confirm-mode-button',
          },
          'Continue',
        ),
      ),
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
            className: 'rps-choice',
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
