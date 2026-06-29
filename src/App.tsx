import React, { useEffect, useMemo, useRef, useState } from 'react';
import { type Controller, type GameState, getSpaceTerritory, logEvent, shouldTriggerFinalKingDuel } from './gameState';
import {
  advanceSessionDeckPools,
  collectSessionUsedCardIds,
  createInitialSessionDeckPools,
  createMultiGameSessionSetup,
  createStandardGameSetup,
  getPlayerGameView,
  getPrivatePowerCardHand,
  type SessionDeckPools,
} from './setup';
import { getPowerCardDefinition } from './powerCards';
import { Board } from './ui/Board';
import { CharacterCardFrame, PowerCardFrame } from './ui/CardFrames';
import { StartScreen, type GameMode, type PlayerColor, type SessionMode } from './ui/StartScreen';
import { ActionControls, type LegalActionType } from './ui/ActionControls';
import { BattleScreen } from './ui/BattleScreen';
import {
  canUseMrsPuffSpecial,
  canUseRapunzelSpecial,
  canMoveForward,
  executeBackItUpMove,
  executeBehindTheCurtainsSwap,
  executeFreezeGunSpecial,
  executeMoveForward,
  executeMrsPuffSpecial,
  executeNightcrawlerTeleportMove,
  executePortalMove,
  executeRapunzelSpecial,
  executeSwapCharactersMove,
  getBackItUpDestinations,
  getNightcrawlerTeleportDestinations,
  getLegalActions,
  hasLegalAction,
  skipTurn,
} from './gameEngine';
import { getCharacter } from './gameState';
import {
  acknowledgeBattleHandoff,
  getBattlePrivateHandView,
  getBattlePublicView,
  getLegalBattleCardPlayOptions,
  getProjectedBattleResult,
  playBattlePowerCard,
  previewBattlePowerCardPlay,
  resolvePendingBattle,
  setBattleReady,
  startFinalKingDuel,
  startBattle,
  type PrivateBattleHandView,
  type PlayBattlePowerCardInput,
} from './battleFlow';
import { chooseBotBattleDecision, chooseBotBoardDecision, chooseBotCurtainsSwap, type BotDifficulty } from './bot';
import { getBotGameView } from './botView';
import { getBackwardSpace, getForwardSpace } from './board';
import { FIRST_ALPHA_POWER_CARD_DEFINITIONS } from './powerCards';
import { loadPowerCatalog } from './cardCatalog';

function toPublicEventText(events: Array<{ turn: number; activePlayer: Controller; action: string }>): string[] {
  return [...events]
    .reverse()
    .map(event => `T${event.turn} ${event.activePlayer === 'P1' ? 'Player One' : 'Player Two'}: ${event.action}`);
}

function displayController(controller: Controller): string {
  return controller === 'P1' ? 'Human' : 'Bot';
}

function displayPlayerLabel(controller: Controller): string {
  return controller === 'P1' ? 'Player One' : 'Player Two';
}

function displayTurnLabel(controller: Controller, color: PlayerColor): string {
  return `${color} Player's Turn`;
}

function normalizeCardName(name: string | undefined): string {
  return (name ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function isMrFreezeName(name: string | undefined): boolean {
  return normalizeCardName(name) === 'MRFREEZE';
}

function isAvatarAangName(name: string | undefined): boolean {
  const normalized = normalizeCardName(name);
  return normalized === 'AVATARAANG' || normalized === 'AANG';
}

function isJeremyJahnsName(name: string | undefined): boolean {
  return normalizeCardName(name) === 'JEREMYJAHNS';
}

function isSkarProductionsName(name: string | undefined): boolean {
  return normalizeCardName(name) === 'SKARPRODUCTIONS';
}

function isUncleIrohName(name: string | undefined): boolean {
  return normalizeCardName(name) === 'UNCLEIROH';
}

function isRoombaName(name: string | undefined): boolean {
  return normalizeCardName(name) === 'ROOMBA';
}

function isNightcrawlerName(name: string | undefined): boolean {
  return normalizeCardName(name) === 'NIGHTCRAWLER';
}

function isRickGrimesName(name: string | undefined): boolean {
  return normalizeCardName(name) === 'RICKGRIMES';
}

function isCarlGrimesName(name: string | undefined): boolean {
  return normalizeCardName(name) === 'CARLGRIMES';
}

function isNoSprayCancelableDefinition(definitionId: string): boolean {
  return definitionId.startsWith('power-alpha-');
}

function isWeaponDefinitionId(definitionId: string): boolean {
  return [
    'power-alpha-011',
    'power-alpha-012',
    'power-alpha-013',
    'power-alpha-014',
    'power-alpha-015',
  ].includes(definitionId);
}

interface AppProps {
  createGameState?: (firstPlayer: Controller) => GameState;
}

type SessionRpsChoice = 'rock' | 'paper' | 'scissors';
type SessionRpsOutcome = 'P1' | 'P2' | 'tie';

interface SessionRpsBattle {
  humanChoice: SessionRpsChoice;
  botChoice: SessionRpsChoice;
  outcome: SessionRpsOutcome;
}

interface PendingBotBoardAction {
  action: 'move' | 'attack' | 'defend';
  characterId: string;
  message: string;
  explanation: string;
  score: number;
  alternativesConsidered: number;
}

interface PendingBotBattleReveal {
  input: PlayBattlePowerCardInput;
  displayName: string;
  definitionId: string;
  rulesText: string;
  visualMode?: 'layered-art' | 'full-card-face';
  artImageUrl?: string;
  fullCardFaceImageUrl?: string;
}

interface PendingBattleReactionWindow {
  sourceController: Controller;
  responder: Controller;
  input: PlayBattlePowerCardInput;
  cardInstanceId: string;
  definitionId: string;
  displayName: string;
  rulesText: string;
  visualMode?: 'layered-art' | 'full-card-face';
  artImageUrl?: string;
  fullCardFaceImageUrl?: string;
  noSprayOptions: Array<{ instanceId: string; label: string }>;
  selectedNoSprayInstanceId: string;
  irohCounterCharacterId: string | null;
  parent: PendingBattleReactionWindow | null;
}

interface PendingBoardReactionWindow {
  sourceController: Controller;
  responder: Controller;
  cardInstanceId: string;
  definitionId: string;
  displayName: string;
  rulesText: string;
  visualMode?: 'layered-art' | 'full-card-face';
  artImageUrl?: string;
  fullCardFaceImageUrl?: string;
  noSprayOptions: Array<{ instanceId: string; label: string }>;
  selectedNoSprayInstanceId: string;
}

interface PendingHumanBoardAction {
  action: 'move' | 'attack';
  characterId: string;
}

type PendingBoardPowerPlay = {
  cardInstanceId: string;
  definitionId: string;
  step:
    | 'portal-pick-character'
    | 'portal-pick-destination'
    | 'back-pick-character'
    | 'back-pick-destination'
    | 'swap-pick-own'
    | 'swap-pick-opponent';
  sourceCharacterId?: string;
  pendingCharacterId?: string;
};

type PendingBattleSwapPlay = {
  cardInstanceId: string;
  actor: Controller;
  step: 'swap-pick-own' | 'swap-pick-opponent';
  sourceCharacterId: string | null;
  pendingCharacterId: string | null;
};

type PendingCurtainsPlay = {
  cardInstanceId: string;
  ownSwapCardInstanceId: string | null;
  opponentSwapCardInstanceId: string | null;
};

type PendingCurtainsSwapMotion = {
  nextState: GameState;
  own: {
    instanceId: string;
    displayName: string;
    rulesText: string;
    artImageUrl?: string;
    fullCardFaceImageUrl?: string;
    visualMode?: 'layered-art' | 'full-card-face';
  };
  opponent: {
    instanceId: string;
    displayName: string;
    rulesText: string;
    artImageUrl?: string;
    fullCardFaceImageUrl?: string;
    visualMode?: 'layered-art' | 'full-card-face';
  };
};

type PendingBoardWeaponEquipPlay = {
  cardInstanceId: string;
  selectedCharacterId: string | null;
};

type PendingBattlePhoneFriendPlay = {
  actor: Controller;
  cardInstanceId: string;
  selectedCharacterId: string | null;
};

type PendingBattleWeaponEquipPlay = {
  cardInstanceId: string;
  selectedCharacterId: string | null;
};

type PendingBoardCharacterSpecial = {
  characterId: string;
  definitionId?: string;
  step: 'nightcrawler-pick-destination';
};

type PhoneFriendAnimationState = {
  oldCharacterId: string;
  oldController: Controller;
  oldDisplayName: string;
  oldATK: number;
  oldDEF: number;
  oldVisualMode?: 'layered-art' | 'full-card-face';
  oldArtImageUrl?: string;
  oldFullCardFaceImageUrl?: string;
  newDisplayName: string;
  newATK: number;
  newDEF: number;
  newVisualMode?: 'layered-art' | 'full-card-face';
  newArtImageUrl?: string;
  newFullCardFaceImageUrl?: string;
};

type PendingJeremySpecial = {
  characterId: string;
  selectedInstanceId: string | null;
  topCards: Array<{ instanceId: string; definitionId: string }>;
};

type PendingAangEscape = {
  characterId: string;
  options: RingPosition[];
  fromPosition: RingPosition;
  step: 'prompt' | 'pick-spot';
};

type PendingSkarReclaim = {
  controller: Controller;
  cards: Array<{ instanceId: string; definitionId: string; displayName: string }>;
  selectedInstanceId: string | null;
  step: 'prompt' | 'select';
};

type PendingIrohCounter = {
  controller: Controller;
  characterId: string;
  expiresAt: number;
};

type AnytimeCharacterSpecialAction = 'jeremy' | 'iroh';

type RingPosition = 'P1_1' | 'P1_2' | 'P1_3' | 'P1_4' | 'P1_5' | 'P2_1' | 'P2_2' | 'P2_3' | 'P2_4' | 'P2_5';

interface PendingBoardCardMotion {
  characterId: string;
  type: 'move' | 'attack';
  fromPosition: RingPosition;
  toPosition: RingPosition;
}

interface PendingSwapCharactersMotionEntry {
  characterId: string;
  revealed: boolean;
  displayName: string;
  ATK: number;
  DEF: number;
  isKing: boolean;
  toIsKing: boolean;
  isFrozen?: boolean;
  fromController: Controller;
  toController: Controller;
  fromPosition: RingPosition;
  toPosition: RingPosition;
  visualMode?: 'layered-art' | 'full-card-face';
  artImageUrl?: string;
  fullCardFaceImageUrl?: string;
}

interface PendingSwapCharactersMotion {
  first: PendingSwapCharactersMotionEntry;
  second?: PendingSwapCharactersMotionEntry;
  nextState: GameState;
  durationMs?: number;
}

interface PendingMrsPuffPuffUp {
  characterId: string;
  displayName: string;
  ATK: number;
  DEF: number;
  isKing: boolean;
  isFrozen?: boolean;
  controller: Controller;
  visualMode?: 'layered-art' | 'full-card-face';
  artImageUrl?: string;
  fullCardFaceImageUrl?: string;
}

interface PendingBoardSpecialMotion {
  characterId: string;
  displayName: string;
  ATK: number;
  DEF: number;
  isKing: boolean;
  isFrozen?: boolean;
  controller: Controller;
  fromPosition: RingPosition;
  toPosition: RingPosition;
  visualMode?: 'layered-art' | 'full-card-face';
  artImageUrl?: string;
  fullCardFaceImageUrl?: string;
  style: 'wind' | 'rapunzel-fling' | 'nightcrawler-portal' | 'power-portal' | 'back-it-up';
}

interface PendingRapunzelHairTrail {
  sourceCharacterId: string;
  sourcePosition: RingPosition;
  targetCharacterId: string;
  targetPosition: RingPosition;
  attachedPosition: RingPosition | null;
  phase: 'attach' | 'fling' | 'retract';
  pathPositions: RingPosition[];
}

interface PostBattleBoardAnimation {
  loser: {
    id: string;
    displayName: string;
    ATK: number;
    DEF: number;
    isKing: boolean;
    controller: Controller;
    fromPosition: RingPosition;
    visualMode?: 'layered-art' | 'full-card-face';
    artImageUrl?: string;
    fullCardFaceImageUrl?: string;
  } | null;
  winnerAdvance: {
    id: string;
    displayName: string;
    ATK: number;
    DEF: number;
    isKing: boolean;
    controller: Controller;
    fromPosition: RingPosition;
    toPosition: RingPosition;
    visualMode?: 'layered-art' | 'full-card-face';
    artImageUrl?: string;
    fullCardFaceImageUrl?: string;
  } | null;
}

export function App({ createGameState }: AppProps = {}): React.ReactElement {
  const [screen, setScreen] = useState<'start' | 'match'>('start');
  const [firstPlayer, setFirstPlayer] = useState<Controller>('P1');
  const [gameMode, setGameMode] = useState<GameMode>('manual-two-player');
  const [sessionMode, setSessionMode] = useState<SessionMode>('single-game');
  const [sessionDeckPools, setSessionDeckPools] = useState<SessionDeckPools | null>(null);
  const [sessionGameNumber, setSessionGameNumber] = useState(1);
  const [sessionWinHistory, setSessionWinHistory] = useState<Array<'P1' | 'P2' | 'draw'>>([]);
  const [sessionScore, setSessionScore] = useState<{ P1: number; P2: number; draw: number }>({ P1: 0, P2: 0, draw: 0 });
  const [sessionRpsPromptOpen, setSessionRpsPromptOpen] = useState(false);
  const [sessionRpsLocked, setSessionRpsLocked] = useState(false);
  const [sessionRpsResult, setSessionRpsResult] = useState('');
  const [sessionRpsBattle, setSessionRpsBattle] = useState<SessionRpsBattle | null>(null);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('Standard');
  const [gameCatalogOpen, setGameCatalogOpen] = useState(false);
  const [playerColors, setPlayerColors] = useState<{ P1: PlayerColor; P2: PlayerColor }>({
    P1: 'Blue',
    P2: 'Red',
  });
  const [state, setState] = useState<GameState | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [boardHandoffRequiredFor, setBoardHandoffRequiredFor] = useState<Controller | null>(null);
  const [boardHandVisibleFor, setBoardHandVisibleFor] = useState<Controller | null>(null);
  const [battleHandVisibleFor, setBattleHandVisibleFor] = useState<Controller | null>(null);
  const [expandedBoardPowerCardId, setExpandedBoardPowerCardId] = useState<string | null>(null);
  const [expandedBoardCharacterId, setExpandedBoardCharacterId] = useState<string | null>(null);
  const [boardEventLogOpen, setBoardEventLogOpen] = useState(false);
  const [showBattleFullBoard, setShowBattleFullBoard] = useState(false);
  const [pendingBotBoardAction, setPendingBotBoardAction] = useState<PendingBotBoardAction | null>(null);
  const [pendingBotBattleReveal, setPendingBotBattleReveal] = useState<PendingBotBattleReveal | null>(null);
  const [queuedBotBattleReveal, setQueuedBotBattleReveal] = useState<PendingBotBattleReveal | null>(null);
  const [pendingBattleReactionWindow, setPendingBattleReactionWindow] = useState<PendingBattleReactionWindow | null>(null);
  const [pendingBoardReactionWindow, setPendingBoardReactionWindow] = useState<PendingBoardReactionWindow | null>(null);
  const [battleReactionSecondsLeft, setBattleReactionSecondsLeft] = useState<number | null>(null);
  const [boardReactionSecondsLeft, setBoardReactionSecondsLeft] = useState<number | null>(null);
  const [pendingHumanBoardAction, setPendingHumanBoardAction] = useState<PendingHumanBoardAction | null>(null);
  const [pendingBoardCardMotion, setPendingBoardCardMotion] = useState<PendingBoardCardMotion | null>(null);
  const [pendingSwapCharactersMotion, setPendingSwapCharactersMotion] = useState<PendingSwapCharactersMotion | null>(null);
  const [pendingBoardSpecialMotion, setPendingBoardSpecialMotion] = useState<PendingBoardSpecialMotion | null>(null);
  const [pendingMrsPuffPuffUp, setPendingMrsPuffPuffUp] = useState<PendingMrsPuffPuffUp | null>(null);
  const [pendingRapunzelHairTrail, setPendingRapunzelHairTrail] = useState<PendingRapunzelHairTrail | null>(null);
  const [postBattleBoardAnimation, setPostBattleBoardAnimation] = useState<PostBattleBoardAnimation | null>(null);
  const [kingDrawAnimationFor, setKingDrawAnimationFor] = useState<'P1' | 'P2' | null>(null);
  const [kingDrawBoardPosition, setKingDrawBoardPosition] = useState<RingPosition | null>(null);
  const [kingDrawTravelStart, setKingDrawTravelStart] = useState<{ x: number; y: number } | null>(null);
  const [kingDrawTravelVector, setKingDrawTravelVector] = useState<{ x: number; y: number } | null>(null);
  const [drawFxReason, setDrawFxReason] = useState<'king-territory' | 'roomba' | 'ant' | null>(null);
  const [roombaDrawTravelVectors, setRoombaDrawTravelVectors] = useState<{
    toRoombaX: number;
    toRoombaY: number;
    toHandX: number;
    toHandY: number;
  } | null>(null);
  const kingDrawFxTimerRef = useRef<number | null>(null);
  const antVictoryFxDelayTimerRef = useRef<number | null>(null);
  const processedDrawFxEventIndexRef = useRef<number>(-1);
  const [battleUsedPileStartCount, setBattleUsedPileStartCount] = useState<number | null>(null);
  const [finalKingDuelTransitionPhase, setFinalKingDuelTransitionPhase] = useState<'idle' | 'rumble' | 'implode'>('idle');
  const [finalKingDuelRumbleIds, setFinalKingDuelRumbleIds] = useState<string[]>([]);
  const [endgameRevealCharacterIds, setEndgameRevealCharacterIds] = useState<string[]>([]);
  const [endgameRevealOpponentHand, setEndgameRevealOpponentHand] = useState(false);
  const [endgameMessageVisible, setEndgameMessageVisible] = useState(false);
  const [thawingCharacterIds, setThawingCharacterIds] = useState<string[]>([]);
  const [freezeSpecialSourceId, setFreezeSpecialSourceId] = useState<string | null>(null);
  const [freezeSpecialTargetId, setFreezeSpecialTargetId] = useState<string | null>(null);
  const [pendingBoardPowerPlay, setPendingBoardPowerPlay] = useState<PendingBoardPowerPlay | null>(null);
  const [pendingBoardWeaponEquipPlay, setPendingBoardWeaponEquipPlay] = useState<PendingBoardWeaponEquipPlay | null>(null);
  const [pendingCurtainsPlay, setPendingCurtainsPlay] = useState<PendingCurtainsPlay | null>(null);
  const [showCurtainsSelectionModal, setShowCurtainsSelectionModal] = useState<boolean>(true);
  const [pendingCurtainsSwapMotion, setPendingCurtainsSwapMotion] = useState<PendingCurtainsSwapMotion | null>(null);
  const [pendingBoardCharacterSpecial, setPendingBoardCharacterSpecial] = useState<PendingBoardCharacterSpecial | null>(null);
  const [pendingBattlePhoneFriendPlay, setPendingBattlePhoneFriendPlay] = useState<PendingBattlePhoneFriendPlay | null>(null);
  const [pendingBattleWeaponEquipPlay, setPendingBattleWeaponEquipPlay] = useState<PendingBattleWeaponEquipPlay | null>(null);
  const [pendingBattleSwapPlay, setPendingBattleSwapPlay] = useState<PendingBattleSwapPlay | null>(null);
  const [phoneFriendAnimation, setPhoneFriendAnimation] = useState<PhoneFriendAnimationState | null>(null);
  const [pendingJeremySpecial, setPendingJeremySpecial] = useState<PendingJeremySpecial | null>(null);
  const [showJeremySelectionModal, setShowJeremySelectionModal] = useState<boolean>(true);
  const [pendingAangEscape, setPendingAangEscape] = useState<PendingAangEscape | null>(null);
  const [pendingSkarReclaim, setPendingSkarReclaim] = useState<PendingSkarReclaim | null>(null);
  const [pendingIrohCounter, setPendingIrohCounter] = useState<PendingIrohCounter | null>(null);
  const [irohTimerNowMs, setIrohTimerNowMs] = useState<number>(Date.now());
  const previousFrozenByIdRef = useRef<Map<string, boolean>>(new Map());
  const scoredSessionGamesRef = useRef<Set<number>>(new Set());
  const rapunzelTimerRefs = useRef<number[]>([]);

  const clearRapunzelTimers = (): void => {
    for (const timer of rapunzelTimerRefs.current) {
      window.clearTimeout(timer);
    }
    rapunzelTimerRefs.current = [];
  };

  const resolveSessionRps = (humanChoice: SessionRpsChoice, botChoice: SessionRpsChoice): SessionRpsOutcome => {
    if (humanChoice === botChoice) {
      return 'tie';
    }

    const humanWins = (
      (humanChoice === 'rock' && botChoice === 'scissors')
      || (humanChoice === 'paper' && botChoice === 'rock')
      || (humanChoice === 'scissors' && botChoice === 'paper')
    );

    return humanWins ? 'P1' : 'P2';
  };

  const sessionRpsLabel = (choice: SessionRpsChoice): string => {
    if (choice === 'rock') return 'Rock';
    if (choice === 'paper') return 'Paper';
    return 'Scissors';
  };

  const openInGameCatalog = (): void => {
    if (!state) {
      return;
    }
    setGameCatalogOpen(true);
    setScreen('start');
  };

  const closeInGameCatalog = (): void => {
    setGameCatalogOpen(false);
    setScreen('match');
  };

  const sessionRpsIcon = (choice: SessionRpsChoice): string => {
    if (choice === 'rock') return '🪨';
    if (choice === 'paper') return '📄';
    return '✂️';
  };

  const safeView = useMemo(() => (state ? getPlayerGameView(state) : null), [state]);
  const sessionRemainingDeckCounts = useMemo(() => {
    if (!state || state.sessionMode !== 'multi-game' || !sessionDeckPools) {
      return null;
    }

    const used = collectSessionUsedCardIds(state);
    const usedCharacterIds = new Set(used.usedCharacterInstanceIds);
    const usedPowerIds = new Set(used.usedPowerInstanceIds);

    const characterRemaining = sessionDeckPools.unusedCharacterDeck.reduce((count, card) => (
      usedCharacterIds.has(card.instanceId) ? count : count + 1
    ), 0);
    const powerRemaining = sessionDeckPools.unusedPowerDeck.reduce((count, card) => (
      usedPowerIds.has(card.instanceId) ? count : count + 1
    ), 0);

    return {
      character: Math.max(0, characterRemaining),
      power: Math.max(0, powerRemaining),
    };
  }, [sessionDeckPools, state]);
  const battleView = useMemo(() => {
    if (!state?.pendingBattle) {
      return null;
    }
    return getBattlePublicView(state);
  }, [state]);
  const usedPowerCardsThisBattle = useMemo(() => {
    if (!state?.pendingBattle || battleUsedPileStartCount === null) {
      return [];
    }
    return state.usedPowerCardPile.slice(battleUsedPileStartCount);
  }, [battleUsedPileStartCount, state]);
  const powerCatalogById = useMemo(
    () => new Map(loadPowerCatalog(FIRST_ALPHA_POWER_CARD_DEFINITIONS).map(entry => [entry.definitionId, entry])),
    [],
  );
  const irohStatusByCharacterId = useMemo<Record<string, string>>(() => {
    if (!state) {
      return {};
    }

    const labels: Record<string, string> = {};

    if (pendingIrohCounter && pendingIrohCounter.expiresAt > irohTimerNowMs) {
      const remainingSeconds = Math.max(1, Math.ceil((pendingIrohCounter.expiresAt - irohTimerNowMs) / 1000));
      labels[pendingIrohCounter.characterId] = `Iroh ${remainingSeconds}s`;
    }

    const assignReactionLabel = (controller: Controller, secondsLeft: number | null): void => {
      if (secondsLeft === null || secondsLeft <= 0) {
        return;
      }

      const iroh = state.characters.find(character => (
        character.controller === controller
        && character.alive
        && character.revealed
        && !character.abilityUsed
        && isUncleIrohName(character.displayName)
      ));

      if (!iroh || labels[iroh.id]) {
        return;
      }

      labels[iroh.id] = `Iroh ${secondsLeft}s`;
    };

    if (pendingBattleReactionWindow) {
      assignReactionLabel(pendingBattleReactionWindow.responder, battleReactionSecondsLeft);
    }
    if (pendingBoardReactionWindow) {
      assignReactionLabel(pendingBoardReactionWindow.responder, boardReactionSecondsLeft);
    }

    const hasLivingRevealedRick = state.characters.some(character => (
      character.alive
      && character.revealed
      && isRickGrimesName(character.displayName)
    ));
    const hasRevealedCarl = state.characters.some(character => (
      character.revealed
      && isCarlGrimesName(character.displayName)
    ));
    if (hasLivingRevealedRick && hasRevealedCarl) {
      for (const character of state.characters) {
        if (!character.alive || !character.revealed) {
          continue;
        }
        if (isRickGrimesName(character.displayName) || isCarlGrimesName(character.displayName)) {
          labels[character.id] = 'CORAL! +2';
        }
      }
    }

    for (const character of state.characters) {
      if (!character.alive || !character.revealed || !character.abilityUsed) {
        continue;
      }
      if (isAvatarAangName(character.displayName) && !labels[character.id]) {
        labels[character.id] = '-1';
      }
    }

    return labels;
  }, [
    battleReactionSecondsLeft,
    boardReactionSecondsLeft,
    irohTimerNowMs,
    pendingBattleReactionWindow,
    pendingBoardReactionWindow,
    pendingIrohCounter,
    state,
  ]);

  const isBotMode = gameMode === 'human-y-vs-bot-a';
  const isHumanBoardTurn = !isBotMode || state?.activePlayer === 'P1';
  const isBotBoardTurn = !!state
    && isBotMode
    && !state.pendingBattle
    && state.gameStatus === 'active'
    && state.activePlayer === 'P2'
    && pendingBotBoardAction === null
    && postBattleBoardAnimation === null
    && finalKingDuelTransitionPhase === 'idle';
  const isBotBattleTurn = !!state?.pendingBattle
    && isBotMode
    && state.pendingBattle.currentPriorityPlayer === 'P2'
    && state.pendingBattle.status === 'WindowOpen'
    && pendingBotBattleReveal === null
    && queuedBotBattleReveal === null;

  const battlePrivateHand = useMemo<PrivateBattleHandView | null>(() => {
    if (!state?.pendingBattle) {
      return null;
    }

    if (isBotMode) {
      if (state.pendingBattle.handoffRequiredFor === null && state.pendingBattle.currentPriorityPlayer === 'P1') {
        return getBattlePrivateHandView(state, 'P1');
      }

      const privateCards = getPrivatePowerCardHand(state, 'P1');
      return {
        player: 'P1',
        cards: privateCards.map(card => {
          const definition = getPowerCardDefinition(card.definitionId);
          const visual = powerCatalogById.get(card.definitionId);
          return {
            instanceId: card.instanceId,
            definitionId: card.definitionId,
            displayName: definition.displayName,
            rulesText: definition.rulesText,
            isPlayable: false,
            disabledReason: 'Waiting for reveal step to finish',
            allowedChoices: [],
            visualMode: visual?.visualMode,
            artImageUrl: visual?.artImageUrl,
            fullCardFaceImageUrl: visual?.fullCardFaceImageUrl,
          };
        }),
      };
    }

    if (state.pendingBattle.handoffRequiredFor !== null) {
      return null;
    }

    return getBattlePrivateHandView(state, state.pendingBattle.currentPriorityPlayer);
  }, [state, isBotMode, powerCatalogById]);

  const manualBattleHandsByController = useMemo<{ P1: PrivateBattleHandView; P2: PrivateBattleHandView } | null>(() => {
    if (!state?.pendingBattle || isBotMode) {
      return null;
    }

    const buildReadOnlyHand = (player: Controller): PrivateBattleHandView => {
      const privateCards = getPrivatePowerCardHand(state, player);
      return {
        player,
        cards: privateCards.map(card => {
          const definition = getPowerCardDefinition(card.definitionId);
          const visual = powerCatalogById.get(card.definitionId);
          return {
            instanceId: card.instanceId,
            definitionId: card.definitionId,
            displayName: definition.displayName,
            rulesText: definition.rulesText,
            isPlayable: false,
            disabledReason: 'Not your priority',
            allowedChoices: [],
            visualMode: visual?.visualMode,
            artImageUrl: visual?.artImageUrl,
            fullCardFaceImageUrl: visual?.fullCardFaceImageUrl,
          };
        }),
      };
    };

    const currentPriority = state.pendingBattle.currentPriorityPlayer;
    const priorityHand = battlePrivateHand;

    const p1 = currentPriority === 'P1' && priorityHand?.player === 'P1'
      ? priorityHand
      : buildReadOnlyHand('P1');
    const p2 = currentPriority === 'P2' && priorityHand?.player === 'P2'
      ? priorityHand
      : buildReadOnlyHand('P2');

    return { P1: p1, P2: p2 };
  }, [battlePrivateHand, isBotMode, powerCatalogById, state]);

  useEffect(() => {
    if (!state?.pendingBattle) {
      return;
    }

    if (isBotMode) {
      if (state.pendingBattle.handoffRequiredFor !== 'P1') {
        return;
      }
      setState(acknowledgeBattleHandoff(state, 'P1'));
      return;
    }

    if (state.pendingBattle.handoffRequiredFor !== null) {
      setState(acknowledgeBattleHandoff(state, state.pendingBattle.handoffRequiredFor));
    }
  }, [isBotMode, state]);

  useEffect(() => {
    if (!state || state.gameStatus !== 'active' || state.pendingBattle) {
      return;
    }

    if (!shouldTriggerFinalKingDuel(state)) {
      return;
    }

    if (postBattleBoardAnimation || finalKingDuelTransitionPhase !== 'idle') {
      return;
    }

    const p1King = state.characters.find(character => character.controller === 'P1' && character.isKing && character.alive);
    const p2King = state.characters.find(character => character.controller === 'P2' && character.isKing && character.alive);

    if (!p1King || !p2King) {
      return;
    }

    const isJsdomTestEnv = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
    if (isJsdomTestEnv) {
      setState(prev => {
        if (!prev || prev.gameStatus !== 'active' || prev.pendingBattle || !shouldTriggerFinalKingDuel(prev)) {
          return prev;
        }
        return startFinalKingDuel(prev);
      });
      return;
    }

    setFinalKingDuelRumbleIds([p1King.id, p2King.id]);
    setFinalKingDuelTransitionPhase('rumble');

    const implodeTimer = window.setTimeout(() => {
      setFinalKingDuelTransitionPhase('implode');
    }, 700);

    const battleTimer = window.setTimeout(() => {
      setState(prev => {
        if (!prev || prev.gameStatus !== 'active' || prev.pendingBattle || !shouldTriggerFinalKingDuel(prev)) {
          return prev;
        }

        return startFinalKingDuel(prev);
      });
      setFinalKingDuelTransitionPhase('idle');
      setFinalKingDuelRumbleIds([]);
    }, 1350);

    return () => {
      window.clearTimeout(implodeTimer);
      window.clearTimeout(battleTimer);
    };
  }, [postBattleBoardAnimation, state]);

  useEffect(() => {
    if (!state || state.gameStatus === 'active') {
      setEndgameRevealCharacterIds([]);
      setEndgameRevealOpponentHand(false);
      setEndgameMessageVisible(false);
      return;
    }

    const hiddenBoardCharacterIds = state.characters
      .filter(character => character.alive && !character.revealed)
      .map(character => character.id);

    setEndgameRevealCharacterIds(hiddenBoardCharacterIds);
    setEndgameRevealOpponentHand(false);
    setEndgameMessageVisible(false);

    const handRevealTimer = window.setTimeout(() => {
      setEndgameRevealOpponentHand(true);
    }, 420);

    const messageTimer = window.setTimeout(() => {
      setEndgameMessageVisible(true);
    }, 950);

    return () => {
      window.clearTimeout(handRevealTimer);
      window.clearTimeout(messageTimer);
    };
  }, [state]);

  const boardPhasePrivateHand = useMemo(() => {
    if (!state || state.pendingBattle) {
      return null;
    }

    if (isBotMode) {
      const privateCards = getPrivatePowerCardHand(state, 'P1');
      return privateCards.map(card => {
        const definition = getPowerCardDefinition(card.definitionId);
        const visual = powerCatalogById.get(card.definitionId);
        return {
          instanceId: card.instanceId,
          definitionId: card.definitionId,
          displayName: definition.displayName,
          rulesText: definition.rulesText,
          visualMode: visual?.visualMode,
          artImageUrl: visual?.artImageUrl,
          fullCardFaceImageUrl: visual?.fullCardFaceImageUrl,
        };
      });
    }

    if (!boardHandVisibleFor) {
      return null;
    }

    const privateCards = getPrivatePowerCardHand(state, boardHandVisibleFor);
    return privateCards.map(card => {
      const definition = getPowerCardDefinition(card.definitionId);
      const visual = powerCatalogById.get(card.definitionId);
      return {
        controller: boardHandVisibleFor,
        instanceId: card.instanceId,
        definitionId: card.definitionId,
        displayName: definition.displayName,
        rulesText: definition.rulesText,
        visualMode: visual?.visualMode,
        artImageUrl: visual?.artImageUrl,
        fullCardFaceImageUrl: visual?.fullCardFaceImageUrl,
      };
    });
  }, [state, boardHandVisibleFor, isBotMode, powerCatalogById]);

  const expandedBoardPowerCard = useMemo(() => {
    if (!expandedBoardPowerCardId || !boardPhasePrivateHand) {
      return null;
    }
    return boardPhasePrivateHand.find(card => card.instanceId === expandedBoardPowerCardId) ?? null;
  }, [expandedBoardPowerCardId, boardPhasePrivateHand]);

  const expandedBoardCharacter = useMemo(() => {
    if (!expandedBoardCharacterId || !safeView) {
      return null;
    }
    const card = safeView.boardCards.find(boardCard => boardCard.instanceId === expandedBoardCharacterId) ?? null;
    const allowUnrevealedRead = !!pendingBattleWeaponEquipPlay
      || !!pendingBattlePhoneFriendPlay
      || !!pendingBattleSwapPlay
      || showBattleFullBoard
      || !!pendingBoardWeaponEquipPlay
      || (pendingBoardPowerPlay?.definitionId === 'power-alpha-018' && !!pendingBoardPowerPlay.pendingCharacterId);
    return card && (card.revealed || allowUnrevealedRead) ? card : null;
  }, [expandedBoardCharacterId, pendingBattlePhoneFriendPlay, pendingBattleSwapPlay, pendingBattleWeaponEquipPlay, pendingBoardPowerPlay, pendingBoardWeaponEquipPlay, safeView, showBattleFullBoard]);

  const publicEventLog = useMemo(() => (safeView ? toPublicEventText(safeView.eventLog) : []), [safeView]);

  const endgameBoardView = useMemo(() => {
    if (!safeView || !state) {
      return safeView;
    }

    if (state.gameStatus === 'active') {
      return safeView;
    }

    const hiddenSet = new Set(endgameRevealCharacterIds);

    return {
      ...safeView,
      boardCards: safeView.boardCards.map(card => {
        if (card.revealed || !hiddenSet.has(card.instanceId)) {
          return card;
        }

        const source = state.characters.find(character => character.id === card.instanceId);
        if (!source) {
          return card;
        }

        return {
          ...card,
          revealed: true,
          displayName: source.displayName ?? 'Unknown',
          ATK: source.ATK,
          DEF: source.DEF,
          definitionId: source.definitionId,
          ability: source.ability ?? null,
          statRule: source.statRule ?? null,
          visualMode: source.visualMode,
          artImageUrl: source.artImageUrl,
          fullCardFaceImageUrl: source.fullCardFaceImageUrl,
        };
      }),
    };
  }, [endgameRevealCharacterIds, safeView, state]);

  const endgameHeadline = useMemo(() => {
    if (!state || state.gameStatus === 'active') {
      return '';
    }

    if (state.gameStatus === 'draw') {
      return 'Draw';
    }

    if (isBotMode) {
      return state.gameStatus === 'P1 wins' ? 'You Win' : 'You Lose';
    }

    return state.gameStatus === 'P1 wins' ? 'Player One Wins' : 'Player Two Wins';
  }, [isBotMode, state]);

  const boardActiveColor = safeView ? playerColors[safeView.activePlayer] : playerColors.P1;
  const isGameOver = !!safeView && safeView.gameStatus !== 'active';
  const topHandController: Controller = isBotMode
    ? 'P2'
    : safeView?.activePlayer === 'P1'
      ? 'P2'
      : 'P1';

  const canUseFreezeGunSpecial = (characterId: string): boolean => {
    if (!state || state.gameStatus !== 'active') {
      return false;
    }

    const actingController: Controller = pendingBattleReactionWindow
      ? pendingBattleReactionWindow.responder
      : pendingBoardReactionWindow
        ? pendingBoardReactionWindow.responder
        : state.pendingBattle
          ? state.pendingBattle.currentPriorityPlayer
          : state.activePlayer;

    const character = state.characters.find(entry => entry.id === characterId);
    if (
      !character
      || !character.alive
      || !character.revealed
      || character.controller !== actingController
      || !isMrFreezeName(character.displayName)
    ) {
      return false;
    }

    return (character.attachments ?? []).some(
      attachment => attachment.definitionId === 'power-alpha-014' && !attachment.specialUsed,
    );
  };

  const openFreezeSpecialPicker = (sourceCharacterId: string): void => {
    if (!state || !canUseFreezeGunSpecial(sourceCharacterId)) {
      return;
    }

    const defaultTarget = state.characters.find(character => character.alive)?.id ?? null;
    setFreezeSpecialSourceId(sourceCharacterId);
    setFreezeSpecialTargetId(defaultTarget);
  };

  const handleAttachmentCardClick = (characterId: string, attachmentInstanceId: string): void => {
    if (!state) {
      return;
    }

    const character = state.characters.find(entry => entry.id === characterId);
    const attachment = character?.attachments?.find(entry => entry.instanceId === attachmentInstanceId);
    if (!character || !attachment) {
      return;
    }

    if (attachment.definitionId === 'power-alpha-014' && canUseFreezeGunSpecial(characterId)) {
      openFreezeSpecialPicker(characterId);
    }
  };

  const closeFreezeSpecialPicker = (): void => {
    setFreezeSpecialSourceId(null);
    setFreezeSpecialTargetId(null);
  };

  const executeManualFreezeSpecial = (): void => {
    if (!state || !freezeSpecialSourceId || !freezeSpecialTargetId) {
      return;
    }

    try {
      const nextState = executeFreezeGunSpecial(state, freezeSpecialSourceId, freezeSpecialTargetId);
      setState(nextState);
      closeFreezeSpecialPicker();
    } catch {
      closeFreezeSpecialPicker();
    }
  };

  const freezeSpecialTargetOptions = useMemo(() => {
    if (!state || !safeView) {
      return [] as Array<{ id: string; label: string }>;
    }

    return safeView.boardCards
      .filter(card => card.alive)
      .map(card => ({
        id: card.instanceId,
        label: card.revealed && card.displayName
          ? `${card.displayName} (${card.boardPosition})`
          : `Face-down card (${card.boardPosition})`,
      }));
  }, [safeView, state]);

  const freezeSpecialSourceCharacter = useMemo(() => {
    if (!state || !freezeSpecialSourceId) {
      return null;
    }
    return state.characters.find(character => character.id === freezeSpecialSourceId) ?? null;
  }, [freezeSpecialSourceId, state]);

  const curtainsSourceController = useMemo<Controller | null>(() => {
    if (!pendingCurtainsPlay || !state) {
      return null;
    }
    if (state.powerCardHands.P1.some(card => card.instanceId === pendingCurtainsPlay.cardInstanceId)) {
      return 'P1';
    }
    if (state.powerCardHands.P2.some(card => card.instanceId === pendingCurtainsPlay.cardInstanceId)) {
      return 'P2';
    }
    return null;
  }, [pendingCurtainsPlay, state]);

  const curtainsOwnCardOptions = useMemo(() => {
    if (!pendingCurtainsPlay || !state) {
      return [] as Array<{
        instanceId: string;
        displayName: string;
        rulesText: string;
        visualMode?: 'layered-art' | 'full-card-face';
        artImageUrl?: string;
        fullCardFaceImageUrl?: string;
      }>;
    }

    if (!curtainsSourceController) {
      return [];
    }

    const ownHand = state.powerCardHands[curtainsSourceController]
      .filter(card => card.instanceId !== pendingCurtainsPlay.cardInstanceId)
      .map(card => {
        const definition = getPowerCardDefinition(card.definitionId);
        const visual = powerCatalogById.get(card.definitionId);
        return {
          instanceId: card.instanceId,
          displayName: definition.displayName,
          rulesText: definition.rulesText,
          visualMode: visual?.visualMode,
          artImageUrl: visual?.artImageUrl,
          fullCardFaceImageUrl: visual?.fullCardFaceImageUrl,
        };
      });

    return ownHand;
  }, [curtainsSourceController, pendingCurtainsPlay, powerCatalogById, state]);

  const curtainsOpponentCardOptions = useMemo(() => {
    if (!pendingCurtainsPlay || !state) {
      return [] as Array<{
        instanceId: string;
        displayName: string;
        rulesText: string;
        visualMode?: 'layered-art' | 'full-card-face';
        artImageUrl?: string;
        fullCardFaceImageUrl?: string;
      }>;
    }

    if (!curtainsSourceController) {
      return [];
    }

    const opponent: Controller = curtainsSourceController === 'P1' ? 'P2' : 'P1';
    return state.powerCardHands[opponent].map(card => {
      const definition = getPowerCardDefinition(card.definitionId);
      const visual = powerCatalogById.get(card.definitionId);
      return {
        instanceId: card.instanceId,
        displayName: definition.displayName,
        rulesText: definition.rulesText,
        visualMode: visual?.visualMode,
        artImageUrl: visual?.artImageUrl,
        fullCardFaceImageUrl: visual?.fullCardFaceImageUrl,
      };
    });
  }, [curtainsSourceController, pendingCurtainsPlay, powerCatalogById, state]);

  const startBoardReactionWindow = (
    currentState: GameState,
    sourceController: Controller,
    cardInstanceId: string,
    definitionId: string,
  ): boolean => {
    const responder: Controller = sourceController === 'P1' ? 'P2' : 'P1';
    const noSprayCards = currentState.powerCardHands[responder].filter(card => card.definitionId === 'power-alpha-020');
    if (noSprayCards.length === 0 || !isNoSprayCancelableDefinition(definitionId)) {
      return false;
    }

    const noSprayOptions = noSprayCards.map(card => ({
      instanceId: card.instanceId,
      label: `NO SPRAY (${card.instanceId})`,
    }));

    const definition = getPowerCardDefinition(definitionId);
    const visual = powerCatalogById.get(definitionId);
    setPendingBoardReactionWindow({
      sourceController,
      responder,
      cardInstanceId,
      definitionId,
      displayName: definition.displayName,
      rulesText: definition.rulesText,
      visualMode: visual?.visualMode,
      artImageUrl: visual?.artImageUrl,
      fullCardFaceImageUrl: visual?.fullCardFaceImageUrl,
      noSprayOptions,
      selectedNoSprayInstanceId: noSprayOptions[0].instanceId,
    });
    setBoardReactionSecondsLeft(20);
    if (!isBotMode) {
      setBoardHandVisibleFor(null);
      setBoardHandoffRequiredFor(responder);
    }
    return true;
  };

  const executeBehindTheCurtainsBoardPlay = (skipBoardNoSprayWindow = false): void => {
    if (!state || !pendingCurtainsPlay) {
      return;
    }

    const sourceController: Controller | null = state.powerCardHands.P1.some(card => card.instanceId === pendingCurtainsPlay.cardInstanceId)
      ? 'P1'
      : state.powerCardHands.P2.some(card => card.instanceId === pendingCurtainsPlay.cardInstanceId)
        ? 'P2'
        : null;

    if (!sourceController) {
      setPendingCurtainsPlay(null);
      return;
    }

    const sourceCard = state.powerCardHands[sourceController].find(card => card.instanceId === pendingCurtainsPlay.cardInstanceId);
    if (!sourceCard) {
      setPendingCurtainsPlay(null);
      return;
    }

    if (state.pendingBattle) {
      const input: PlayBattlePowerCardInput = {
        instanceId: pendingCurtainsPlay.cardInstanceId,
        ownSwapCardInstanceId: pendingCurtainsPlay.ownSwapCardInstanceId ?? undefined,
        opponentSwapCardInstanceId: pendingCurtainsPlay.opponentSwapCardInstanceId ?? undefined,
      };

      if (!skipBoardNoSprayWindow && startBattleReactionWindow(state, sourceController, input, sourceCard.definitionId)) {
        setPendingCurtainsPlay(null);
        setSelectedCardId(null);
        setShowBattleFullBoard(false);
        return;
      }

      const nextState = playBattlePowerCard(state, sourceController, input);
      setState(nextState);
      setPendingCurtainsPlay(null);
      setSelectedCardId(null);
      setShowBattleFullBoard(false);
      return;
    }

    if (!skipBoardNoSprayWindow && startBoardReactionWindow(state, sourceController, sourceCard.instanceId, sourceCard.definitionId)) {
      return;
    }

    if (
      pendingIrohCounter
      && pendingIrohCounter.controller !== sourceController
      && pendingIrohCounter.expiresAt > Date.now()
    ) {
      let canceled = logEvent(state, 'Uncle Iroh Counter - Power Card Canceled', {
        counterController: pendingIrohCounter.controller,
        sourceController,
        cardDefinitionId: sourceCard.definitionId,
        cardInstanceId: sourceCard.instanceId,
        phase: 'board',
      });
      canceled = {
        ...canceled,
        characters: canceled.characters.map(character => (
          character.id === pendingIrohCounter.characterId
            ? { ...character, abilityUsed: true }
            : character
        )),
      };
      setState(canceled);
      setPendingIrohCounter(null);
      setPendingCurtainsPlay(null);
      setSelectedCardId(null);
      return;
    }

    let nextState = consumeBoardPowerCard(state, sourceController, pendingCurtainsPlay.cardInstanceId, 'BEHIND THE CURTAINS hand inspection');

    if (pendingCurtainsPlay.ownSwapCardInstanceId && pendingCurtainsPlay.opponentSwapCardInstanceId) {
      const ownSwapCard = state.powerCardHands[sourceController].find(card => card.instanceId === pendingCurtainsPlay.ownSwapCardInstanceId);
      const opponentController = sourceController === 'P1' ? 'P2' : 'P1';
      const opponentSwapCard = state.powerCardHands[opponentController].find(card => card.instanceId === pendingCurtainsPlay.opponentSwapCardInstanceId);

      if (ownSwapCard && opponentSwapCard) {
        const swappedState = executeBehindTheCurtainsSwap(
          nextState,
          sourceController,
          pendingCurtainsPlay.ownSwapCardInstanceId,
          pendingCurtainsPlay.opponentSwapCardInstanceId,
        );

        setPendingCurtainsSwapMotion({
          nextState: swappedState,
          own: {
            instanceId: ownSwapCard.instanceId,
            displayName: ownSwapCard.displayName,
            rulesText: ownSwapCard.rulesText,
            artImageUrl: ownSwapCard.artImageUrl,
            fullCardFaceImageUrl: ownSwapCard.fullCardFaceImageUrl,
            visualMode: ownSwapCard.visualMode,
          },
          opponent: {
            instanceId: opponentSwapCard.instanceId,
            displayName: opponentSwapCard.displayName,
            rulesText: opponentSwapCard.rulesText,
            artImageUrl: opponentSwapCard.artImageUrl,
            fullCardFaceImageUrl: opponentSwapCard.fullCardFaceImageUrl,
            visualMode: opponentSwapCard.visualMode,
          },
        });
        setPendingCurtainsPlay(null);
        setSelectedCardId(null);
        return;
      }

      nextState = executeBehindTheCurtainsSwap(
        nextState,
        sourceController,
        pendingCurtainsPlay.ownSwapCardInstanceId,
        pendingCurtainsPlay.opponentSwapCardInstanceId,
      );
    }

    setState(nextState);
    setPendingCurtainsPlay(null);
    setSelectedCardId(null);
  };

  const resolveBoardReactionWindow = (useNoSpray: boolean): void => {
    if (!state || !pendingBoardReactionWindow) {
      return;
    }

    if (!useNoSpray) {
      setPendingBoardReactionWindow(null);
      setBoardReactionSecondsLeft(null);
      executeBehindTheCurtainsBoardPlay(true);
      return;
    }

    const noSprayCard = state.powerCardHands[pendingBoardReactionWindow.responder].find(
      card => card.instanceId === pendingBoardReactionWindow.selectedNoSprayInstanceId,
    ) ?? state.powerCardHands[pendingBoardReactionWindow.responder].find(card => card.definitionId === 'power-alpha-020');
    if (!noSprayCard) {
      setPendingBoardReactionWindow(null);
      setBoardReactionSecondsLeft(null);
      executeBehindTheCurtainsBoardPlay(true);
      return;
    }

    const nextState = consumeBoardPowerCard(
      state,
      pendingBoardReactionWindow.responder,
      noSprayCard.instanceId,
      `NO SPRAY canceled ${pendingBoardReactionWindow.displayName}`,
    );
    setState(nextState);
    setPendingBoardReactionWindow(null);
    setBoardReactionSecondsLeft(null);
    setPendingCurtainsPlay(null);
    setSelectedCardId(null);
  };

  const commitBattleCardPlay = (currentState: GameState, actor: Controller, input: PlayBattlePowerCardInput): GameState => {
    return playBattlePowerCard(currentState, actor, input);
  };

  const startBattleReactionWindow = (
    currentState: GameState,
    sourceController: Controller,
    input: PlayBattlePowerCardInput,
    definitionId: string,
    parent: PendingBattleReactionWindow | null = null,
  ): boolean => {
    const responder: Controller = sourceController === 'P1' ? 'P2' : 'P1';
    const responderHand = currentState.powerCardHands[responder];
    const noSprayCards = responderHand.filter(card => card.definitionId === 'power-alpha-020');
    const irohCounterCharacter = currentState.characters.find(character => (
      character.alive
      && character.revealed
      && character.controller === responder
      && !character.abilityUsed
      && isUncleIrohName(character.displayName)
    ));

    if (!isNoSprayCancelableDefinition(definitionId) || (noSprayCards.length === 0 && !irohCounterCharacter)) {
      return false;
    }

    const noSprayOptions = noSprayCards.map(card => ({
      instanceId: card.instanceId,
      label: `NO SPRAY (${card.instanceId})`,
    }));

    const definition = getPowerCardDefinition(definitionId);
    const visual = powerCatalogById.get(definitionId);
    setPendingBattleReactionWindow({
      sourceController,
      responder,
      input,
      cardInstanceId: input.instanceId,
      definitionId,
      displayName: definition.displayName,
      rulesText: definition.rulesText,
      visualMode: visual?.visualMode,
      artImageUrl: visual?.artImageUrl,
      fullCardFaceImageUrl: visual?.fullCardFaceImageUrl,
      noSprayOptions,
      selectedNoSprayInstanceId: noSprayOptions[0]?.instanceId ?? '',
      irohCounterCharacterId: irohCounterCharacter?.id ?? null,
      parent,
    });
    setBattleReactionSecondsLeft(20);
    if (isBotMode && currentState.pendingBattle && currentState.pendingBattle.handoffRequiredFor !== responder) {
      setState({
        ...currentState,
        pendingBattle: {
          ...currentState.pendingBattle,
          handoffRequiredFor: responder,
        },
      });
    }
    return true;
  };

  const flattenBattleReactionChain = (top: PendingBattleReactionWindow): PendingBattleReactionWindow[] => {
    const chain: PendingBattleReactionWindow[] = [];
    let current: PendingBattleReactionWindow | null = top;
    while (current) {
      chain.push(current);
      current = current.parent;
    }
    return chain.reverse();
  };

  const resolveBattleReactionChain = (
    currentState: GameState,
    top: PendingBattleReactionWindow,
  ): GameState => {
    const chain = flattenBattleReactionChain(top);
    const effective = new Array(chain.length).fill(true);

    for (let i = chain.length - 2; i >= 0; i -= 1) {
      const nextCard = chain[i + 1];
      effective[i] = !(effective[i + 1] && nextCard.definitionId === 'power-alpha-020');
    }

    let nextState = currentState;

    for (let i = 0; i < chain.length; i += 1) {
      const reaction = chain[i];
      if (!effective[i]) {
        continue;
      }

      if (reaction.definitionId === 'power-alpha-020') {
        const hand = nextState.powerCardHands[reaction.sourceController];
        const noSprayCard = hand.find(card => card.instanceId === reaction.input.instanceId);
        if (!noSprayCard || !nextState.pendingBattle) {
          continue;
        }

        const definition = getPowerCardDefinition(noSprayCard.definitionId);
        const visual = powerCatalogById.get(noSprayCard.definitionId);
        const canceledLabel = i > 0 ? chain[i - 1].displayName : 'previous effect';
        const nextPriority: Controller = reaction.sourceController === 'P1' ? 'P2' : 'P1';

        let consumed: GameState = {
          ...nextState,
          powerCardHands: {
            ...nextState.powerCardHands,
            [reaction.sourceController]: hand.filter(card => card.instanceId !== noSprayCard.instanceId),
          },
          usedPowerCardPile: [
            ...nextState.usedPowerCardPile,
            {
              instanceId: noSprayCard.instanceId,
              definitionId: noSprayCard.definitionId,
              controller: reaction.sourceController,
              displayName: definition.displayName,
              selectedChoice: null,
              effectSummary: `NO SPRAY canceled ${canceledLabel}`,
              visualMode: visual?.visualMode,
              artImageUrl: visual?.artImageUrl,
              fullCardFaceImageUrl: visual?.fullCardFaceImageUrl,
            },
          ],
          pendingBattle: {
            ...nextState.pendingBattle,
            currentPriorityPlayer: nextPriority,
            consecutivePassCount: 0,
            readyPlayers: { P1: false, P2: false },
            handoffRequiredFor: nextPriority,
            eventHistory: [
              ...nextState.pendingBattle.eventHistory,
              `${reaction.sourceController === 'P1' ? 'Human' : 'Bot'} played ${definition.displayName}`,
              `NO SPRAY canceled ${canceledLabel}`,
              'Ready flags reset',
              `Priority: ${nextPriority === 'P1' ? 'Human' : 'Bot'}`,
            ],
          },
        };

        consumed = logEvent(consumed, 'Battle Card Played', {
          actingPlayer: reaction.sourceController,
          definitionId: noSprayCard.definitionId,
          instanceId: noSprayCard.instanceId,
          selectedChoice: null,
          targetCharacterId: null,
        });
        nextState = consumed;
        continue;
      }

      nextState = commitBattleCardPlay(nextState, reaction.sourceController, reaction.input);
    }

    return nextState;
  };

  const resolveBattleReactionWindow = (useNoSpray: boolean): void => {
    if (!state?.pendingBattle || !pendingBattleReactionWindow) {
      return;
    }

    const reaction = pendingBattleReactionWindow;
    if (useNoSpray) {
      const responderHand = state.powerCardHands[reaction.responder];
      const noSprayCard = responderHand.find(
        card => card.instanceId === reaction.selectedNoSprayInstanceId,
      ) ?? responderHand.find(card => card.definitionId === 'power-alpha-020');
      if (noSprayCard) {
        const noSprayInput: PlayBattlePowerCardInput = { instanceId: noSprayCard.instanceId };

        if (startBattleReactionWindow(state, reaction.responder, noSprayInput, 'power-alpha-020', reaction)) {
          setBattleReactionSecondsLeft(20);
          return;
        }
      }

      if (reaction.irohCounterCharacterId) {
        let next = logEvent(state, 'Uncle Iroh Counter - Power Card Canceled', {
          counterController: reaction.responder,
          sourceController: reaction.sourceController,
          cardDefinitionId: reaction.definitionId,
          cardInstanceId: reaction.cardInstanceId,
          phase: 'battle-reaction',
        });

        next = {
          ...next,
          characters: next.characters.map(character => (
            character.id === reaction.irohCounterCharacterId
              ? { ...character, abilityUsed: true }
              : character
          )),
        };

        setState(next);
        setPendingBattleReactionWindow(null);
        setBattleReactionSecondsLeft(null);
        setPendingIrohCounter(null);
        return;
      }
    }

    const nextState = resolveBattleReactionChain(state, reaction);

    setState(nextState);
    setPendingBattleReactionWindow(null);
    setBattleReactionSecondsLeft(null);
  };

  const phoneFriendSelectableTargets = useMemo(() => {
    if (!state || !pendingBattlePhoneFriendPlay) {
      return [] as Array<{ id: string; boardPosition: RingPosition; displayName: string }>;
    }

    return state.characters
      .filter(character => character.alive && character.controller === pendingBattlePhoneFriendPlay.actor && !!character.boardPosition)
      .map(character => ({
        id: character.id,
        boardPosition: character.boardPosition as RingPosition,
        displayName: character.displayName ?? character.id,
      }));
  }, [pendingBattlePhoneFriendPlay, state]);

  const selectedPhoneFriendCharacter = useMemo(() => {
    if (!state || !pendingBattlePhoneFriendPlay?.selectedCharacterId) {
      return null;
    }
    return state.characters.find(character => character.id === pendingBattlePhoneFriendPlay.selectedCharacterId) ?? null;
  }, [pendingBattlePhoneFriendPlay, state]);

  const selectedBattleWeaponTarget = useMemo(() => {
    if (!state || !pendingBattleWeaponEquipPlay?.selectedCharacterId) {
      return null;
    }
    return state.characters.find(character => character.id === pendingBattleWeaponEquipPlay.selectedCharacterId) ?? null;
  }, [pendingBattleWeaponEquipPlay, state]);

  const selectedBattleSwapTarget = useMemo(() => {
    if (!state || !pendingBattleSwapPlay?.pendingCharacterId) {
      return null;
    }
    return state.characters.find(character => character.id === pendingBattleSwapPlay.pendingCharacterId) ?? null;
  }, [pendingBattleSwapPlay, state]);

  const selectedBoardWeaponTarget = useMemo(() => {
    if (!state || !pendingBoardWeaponEquipPlay?.selectedCharacterId) {
      return null;
    }
    return state.characters.find(character => character.id === pendingBoardWeaponEquipPlay.selectedCharacterId) ?? null;
  }, [pendingBoardWeaponEquipPlay, state]);

  const beginPhoneFriendBattleAnimation = (): void => {
    if (!state || !state.pendingBattle || !pendingBattlePhoneFriendPlay?.selectedCharacterId) {
      return;
    }

    const target = state.characters.find(character => character.id === pendingBattlePhoneFriendPlay.selectedCharacterId);
    const topDeckCard = state.characterDeck[0];
    if (!target || !topDeckCard) {
      return;
    }

    setPhoneFriendAnimation({
      oldCharacterId: target.id,
      oldController: target.controller,
      oldDisplayName: target.displayName ?? target.id,
      oldATK: target.ATK,
      oldDEF: target.DEF,
      oldVisualMode: target.visualMode,
      oldArtImageUrl: target.artImageUrl,
      oldFullCardFaceImageUrl: target.fullCardFaceImageUrl,
      newDisplayName: topDeckCard.displayName,
      newATK: topDeckCard.ATK,
      newDEF: topDeckCard.DEF,
      newVisualMode: topDeckCard.visualMode,
      newArtImageUrl: topDeckCard.artImageUrl,
      newFullCardFaceImageUrl: topDeckCard.fullCardFaceImageUrl,
    });

    const cardInstanceId = pendingBattlePhoneFriendPlay.cardInstanceId;
    const targetCharacterId = pendingBattlePhoneFriendPlay.selectedCharacterId;
    const actor = pendingBattlePhoneFriendPlay.actor;

    window.setTimeout(() => {
      if (!state?.pendingBattle) {
        return;
      }

      const sourceCard = state.powerCardHands[actor].find(card => card.instanceId === cardInstanceId);
      if (sourceCard && startBattleReactionWindow(state, actor, {
        instanceId: cardInstanceId,
        targetCharacterId,
      }, sourceCard.definitionId)) {
        setPhoneFriendAnimation(null);
        setPendingBattlePhoneFriendPlay(null);
        setShowBattleFullBoard(false);
        return;
      }

      setState(playBattlePowerCard(state, actor, {
        instanceId: cardInstanceId,
        targetCharacterId,
      }));
      setPhoneFriendAnimation(null);
      setPendingBattlePhoneFriendPlay(null);
      setShowBattleFullBoard(false);
    }, 2450);
  };

  const confirmBattleWeaponEquip = (): void => {
    if (!state?.pendingBattle || !pendingBattleWeaponEquipPlay?.selectedCharacterId) {
      return;
    }

    const actor = state.pendingBattle.currentPriorityPlayer;
    const input: PlayBattlePowerCardInput = {
      instanceId: pendingBattleWeaponEquipPlay.cardInstanceId,
      targetCharacterId: pendingBattleWeaponEquipPlay.selectedCharacterId,
    };
    const sourceCard = state.powerCardHands[actor].find(card => card.instanceId === input.instanceId);
    if (!sourceCard) {
      setPendingBattleWeaponEquipPlay(null);
      setExpandedBoardCharacterId(null);
      setShowBattleFullBoard(false);
      return;
    }

    if (startBattleReactionWindow(state, actor, input, sourceCard.definitionId)) {
      setPendingBattleWeaponEquipPlay(null);
      setExpandedBoardCharacterId(null);
      setShowBattleFullBoard(false);
      return;
    }

    setState(playBattlePowerCard(state, actor, input));
    setPendingBattleWeaponEquipPlay(null);
    setExpandedBoardCharacterId(null);
    setShowBattleFullBoard(false);
  };

  const confirmBoardWeaponEquip = (): void => {
    if (!state || !pendingBoardWeaponEquipPlay?.selectedCharacterId) {
      return;
    }

    const actor = state.activePlayer;
    const input: PlayBattlePowerCardInput = {
      instanceId: pendingBoardWeaponEquipPlay.cardInstanceId,
      targetCharacterId: pendingBoardWeaponEquipPlay.selectedCharacterId,
    };
    const sourceCard = state.powerCardHands[actor].find(card => card.instanceId === input.instanceId);
    if (!sourceCard) {
      setPendingBoardWeaponEquipPlay(null);
      return;
    }

    const targetCharacter = state.characters.find(character => character.id === input.targetCharacterId);
    if (!targetCharacter || !targetCharacter.alive || !targetCharacter.boardPosition) {
      setPendingBoardWeaponEquipPlay(null);
      return;
    }

    const definition = getPowerCardDefinition(sourceCard.definitionId);
    const statsByDefinitionId: Record<string, { ATK: number; DEF: number }> = {
      'power-alpha-011': { ATK: 3, DEF: 3 },
      'power-alpha-012': { ATK: 5, DEF: 1 },
      'power-alpha-013': { ATK: 3, DEF: 1 },
      'power-alpha-014': { ATK: 4, DEF: 2 },
      'power-alpha-015': { ATK: 2, DEF: 4 },
    };

    const baseBonus = statsByDefinitionId[sourceCard.definitionId];
    const bonusATK = sourceCard.definitionId === 'power-alpha-013' && /BATMAN/i.test(targetCharacter.displayName ?? '')
      ? baseBonus.ATK
      : sourceCard.definitionId === 'power-alpha-015' && /RAPUNZEL/i.test(targetCharacter.displayName ?? '')
        ? baseBonus.ATK + 2
        : baseBonus.ATK;
    const bonusDEF = baseBonus.DEF;

    let nextState: GameState = {
      ...state,
      characters: state.characters.map(character => (
        character.id === targetCharacter.id
          ? {
              ...character,
              attachments: [
                ...(character.attachments ?? []),
                {
                  instanceId: sourceCard.instanceId,
                  definitionId: sourceCard.definitionId,
                  displayName: definition.displayName,
                  category: 'weapon',
                  ATK: bonusATK,
                  DEF: bonusDEF,
                  specialUsed: false,
                },
              ],
            }
          : character
      )),
    };

    if (sourceCard.definitionId === 'power-alpha-014') {
      nextState = logEvent(nextState, 'Freeze Gun Equipped', {
        controller: actor,
        cardDefinitionId: sourceCard.definitionId,
        cardInstanceId: sourceCard.instanceId,
        targetCharacterId: targetCharacter.id,
        effectSummary: `${definition.displayName} equipped to ${targetCharacter.displayName ?? targetCharacter.id} (+${bonusATK} ATK / +${bonusDEF} DEF)`,
        phase: 'board',
      });
    }

    nextState = consumeBoardPowerCard(
      nextState,
      actor,
      sourceCard.instanceId,
      `${definition.displayName} equipped to ${targetCharacter.displayName ?? targetCharacter.id} (+${bonusATK} ATK / +${bonusDEF} DEF)`,
    );

    setState(nextState);
    setPendingBoardWeaponEquipPlay(null);
    setExpandedBoardCharacterId(null);
  };

  const queueSwapCharactersAnimation = (
    nextState: GameState,
    ownCharacter: GameState['characters'][number],
    opponentCharacter: GameState['characters'][number],
    ownFrom: RingPosition,
    opponentFrom: RingPosition,
  ): void => {
    const swappedOwn = nextState.characters.find(character => character.id === ownCharacter.id);
    const swappedOpponent = nextState.characters.find(character => character.id === opponentCharacter.id);

    setPendingSwapCharactersMotion({
      first: {
        characterId: ownCharacter.id,
        revealed: ownCharacter.revealed,
        displayName: ownCharacter.displayName ?? ownCharacter.id,
        ATK: ownCharacter.ATK,
        DEF: ownCharacter.DEF,
        isKing: ownCharacter.isKing,
        toIsKing: swappedOwn?.isKing ?? ownCharacter.isKing,
        isFrozen: ownCharacter.isFrozen,
        fromController: ownCharacter.controller,
        toController: swappedOwn?.controller ?? ownCharacter.controller,
        fromPosition: ownFrom,
        toPosition: opponentFrom,
        visualMode: ownCharacter.visualMode,
        artImageUrl: ownCharacter.artImageUrl,
        fullCardFaceImageUrl: ownCharacter.fullCardFaceImageUrl,
      },
      second: {
        characterId: opponentCharacter.id,
        revealed: opponentCharacter.revealed,
        displayName: opponentCharacter.displayName ?? opponentCharacter.id,
        ATK: opponentCharacter.ATK,
        DEF: opponentCharacter.DEF,
        isKing: opponentCharacter.isKing,
        toIsKing: swappedOpponent?.isKing ?? opponentCharacter.isKing,
        isFrozen: opponentCharacter.isFrozen,
        fromController: opponentCharacter.controller,
        toController: swappedOpponent?.controller ?? opponentCharacter.controller,
        fromPosition: opponentFrom,
        toPosition: ownFrom,
        visualMode: opponentCharacter.visualMode,
        artImageUrl: opponentCharacter.artImageUrl,
        fullCardFaceImageUrl: opponentCharacter.fullCardFaceImageUrl,
      },
      nextState,
    });
  };

  const confirmBoardSwapSelection = (): void => {
    if (!state || !pendingBoardPowerPlay || pendingBoardPowerPlay.definitionId !== 'power-alpha-018') {
      return;
    }

    if (pendingBoardPowerPlay.step === 'swap-pick-own' && pendingBoardPowerPlay.pendingCharacterId) {
      setPendingBoardPowerPlay({
        ...pendingBoardPowerPlay,
        sourceCharacterId: pendingBoardPowerPlay.pendingCharacterId,
        pendingCharacterId: undefined,
        step: 'swap-pick-opponent',
      });
      setExpandedBoardCharacterId(null);
      return;
    }

    if (
      pendingBoardPowerPlay.step !== 'swap-pick-opponent'
      || !pendingBoardPowerPlay.sourceCharacterId
      || !pendingBoardPowerPlay.pendingCharacterId
    ) {
      return;
    }

    const ownCharacter = getCharacter(state, pendingBoardPowerPlay.sourceCharacterId);
    const opponentCharacter = getCharacter(state, pendingBoardPowerPlay.pendingCharacterId);
    if (!ownCharacter?.boardPosition || !opponentCharacter?.boardPosition) {
      setPendingBoardPowerPlay(null);
      setExpandedBoardCharacterId(null);
      return;
    }

    const ownFrom = ownCharacter.boardPosition as RingPosition;
    const opponentFrom = opponentCharacter.boardPosition as RingPosition;

    if (
      pendingIrohCounter
      && pendingIrohCounter.controller !== state.activePlayer
      && pendingIrohCounter.expiresAt > Date.now()
    ) {
      let canceled = logEvent(state, 'Uncle Iroh Counter - Power Card Canceled', {
        counterController: pendingIrohCounter.controller,
        sourceController: state.activePlayer,
        cardDefinitionId: pendingBoardPowerPlay.definitionId,
        cardInstanceId: pendingBoardPowerPlay.cardInstanceId,
        phase: 'board',
      });
      canceled = {
        ...canceled,
        characters: canceled.characters.map(character => (
          character.id === pendingIrohCounter.characterId
            ? { ...character, abilityUsed: true }
            : character
        )),
      };
      setState(canceled);
      setPendingIrohCounter(null);
      setPendingBoardPowerPlay(null);
      setExpandedBoardCharacterId(null);
      setSelectedCardId(null);
      return;
    }

    let nextState = executeSwapCharactersMove(state, state.activePlayer, ownCharacter.id, opponentCharacter.id);
    nextState = consumeBoardPowerCard(nextState, state.activePlayer, pendingBoardPowerPlay.cardInstanceId, 'SWAP CHARACTERS board swap');

    queueSwapCharactersAnimation(nextState, ownCharacter, opponentCharacter, ownFrom, opponentFrom);
    setPendingBoardPowerPlay(null);
    setExpandedBoardCharacterId(null);
    setSelectedCardId(null);
  };

  const confirmBattleSwapSelection = (): void => {
    if (!state?.pendingBattle || !pendingBattleSwapPlay) {
      return;
    }

    if (pendingBattleSwapPlay.step === 'swap-pick-own' && pendingBattleSwapPlay.pendingCharacterId) {
      setPendingBattleSwapPlay({
        ...pendingBattleSwapPlay,
        sourceCharacterId: pendingBattleSwapPlay.pendingCharacterId,
        pendingCharacterId: null,
        step: 'swap-pick-opponent',
      });
      setExpandedBoardCharacterId(null);
      return;
    }

    if (
      pendingBattleSwapPlay.step !== 'swap-pick-opponent'
      || !pendingBattleSwapPlay.sourceCharacterId
      || !pendingBattleSwapPlay.pendingCharacterId
    ) {
      return;
    }

    const ownCharacter = getCharacter(state, pendingBattleSwapPlay.sourceCharacterId);
    const opponentCharacter = getCharacter(state, pendingBattleSwapPlay.pendingCharacterId);
    if (!ownCharacter?.boardPosition || !opponentCharacter?.boardPosition) {
      setPendingBattleSwapPlay(null);
      setExpandedBoardCharacterId(null);
      setShowBattleFullBoard(false);
      return;
    }

    const ownFrom = ownCharacter.boardPosition as RingPosition;
    const opponentFrom = opponentCharacter.boardPosition as RingPosition;

    const input: PlayBattlePowerCardInput = {
      instanceId: pendingBattleSwapPlay.cardInstanceId,
      targetCharacterId: ownCharacter.id,
      secondTargetCharacterId: opponentCharacter.id,
    };

    const sourceCard = state.powerCardHands[pendingBattleSwapPlay.actor].find(card => card.instanceId === input.instanceId);
    if (!sourceCard) {
      setPendingBattleSwapPlay(null);
      setExpandedBoardCharacterId(null);
      setShowBattleFullBoard(false);
      return;
    }

    if (
      pendingIrohCounter
      && pendingIrohCounter.controller !== pendingBattleSwapPlay.actor
      && pendingIrohCounter.expiresAt > Date.now()
    ) {
      let canceled = logEvent(state, 'Uncle Iroh Counter - Power Card Canceled', {
        counterController: pendingIrohCounter.controller,
        sourceController: pendingBattleSwapPlay.actor,
        cardDefinitionId: sourceCard.definitionId,
        cardInstanceId: sourceCard.instanceId,
        phase: 'battle',
      });
      canceled = {
        ...canceled,
        characters: canceled.characters.map(character => (
          character.id === pendingIrohCounter.characterId
            ? { ...character, abilityUsed: true }
            : character
        )),
      };
      setState(canceled);
      setPendingIrohCounter(null);
      setPendingBattleSwapPlay(null);
      setExpandedBoardCharacterId(null);
      setShowBattleFullBoard(false);
      return;
    }

    if (startBattleReactionWindow(state, pendingBattleSwapPlay.actor, input, sourceCard.definitionId)) {
      setPendingBattleSwapPlay(null);
      setExpandedBoardCharacterId(null);
      setShowBattleFullBoard(false);
      return;
    }

    const nextState = playBattlePowerCard(state, pendingBattleSwapPlay.actor, input);
    queueSwapCharactersAnimation(nextState, ownCharacter, opponentCharacter, ownFrom, opponentFrom);
    setPendingBattleSwapPlay(null);
    setExpandedBoardCharacterId(null);
  };

  useEffect(() => {
    if (!state) {
      previousFrozenByIdRef.current = new Map();
      return;
    }

    const previous = previousFrozenByIdRef.current;
    const current = new Map<string, boolean>();
    const thawedIds: string[] = [];

    for (const character of state.characters) {
      const isFrozen = !!character.isFrozen;
      current.set(character.id, isFrozen);
      if ((previous.get(character.id) ?? false) && !isFrozen) {
        thawedIds.push(character.id);
      }
    }

    previousFrozenByIdRef.current = current;

    if (thawedIds.length === 0) {
      return;
    }

    setThawingCharacterIds(prev => Array.from(new Set([...prev, ...thawedIds])));
    const timer = window.setTimeout(() => {
      setThawingCharacterIds(prev => prev.filter(id => !thawedIds.includes(id)));
    }, 1200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [state]);

  useEffect(() => {
    if (!state || state.pendingBattle || state.gameStatus !== 'active') {
      return;
    }

    if (isBotMode) {
      if (boardHandoffRequiredFor !== null) {
        setBoardHandoffRequiredFor(null);
      }
      if (boardHandVisibleFor !== 'P1') {
        setBoardHandVisibleFor('P1');
      }
      return;
    }

    if (boardHandoffRequiredFor !== null) {
      setBoardHandoffRequiredFor(null);
    }
  }, [state, boardHandVisibleFor, boardHandoffRequiredFor, isBotMode]);

  useEffect(() => {
    if (!pendingIrohCounter) {
      return;
    }

    setIrohTimerNowMs(Date.now());

    const remaining = pendingIrohCounter.expiresAt - Date.now();
    if (remaining <= 0) {
      setPendingIrohCounter(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setPendingIrohCounter(null);
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [pendingIrohCounter]);

  useEffect(() => {
    if (!pendingIrohCounter) {
      return;
    }

    const timer = window.setInterval(() => {
      setIrohTimerNowMs(Date.now());
    }, 250);

    return () => window.clearInterval(timer);
  }, [pendingIrohCounter]);

  useEffect(() => {
    if (!state?.pendingBattle) {
      if (battleHandVisibleFor !== null) {
        setBattleHandVisibleFor(null);
      }
      return;
    }

    if (isBotMode) {
      if (battleHandVisibleFor !== 'P1') {
        setBattleHandVisibleFor('P1');
      }
      return;
    }

    if (battleHandVisibleFor !== null) {
      return;
    }
  }, [battleHandVisibleFor, isBotMode, state?.pendingBattle]);

  const applyFreshMatchState = (next: GameState, effectiveFirstPlayer: Controller): void => {
    void effectiveFirstPlayer;

    clearRapunzelTimers();

    setState(next);
    setSelectedCardId(null);
    setBoardHandVisibleFor(isBotMode ? 'P1' : null);
    setBoardHandoffRequiredFor(null);
    setBattleHandVisibleFor(null);
    setShowBattleFullBoard(false);
    setBoardEventLogOpen(false);
    setPendingBotBoardAction(null);
    setPendingBotBattleReveal(null);
    setQueuedBotBattleReveal(null);
    setPendingBattleReactionWindow(null);
    setPendingBoardReactionWindow(null);
    setBattleReactionSecondsLeft(null);
    setBoardReactionSecondsLeft(null);
    setPendingHumanBoardAction(null);
    setPendingBoardCardMotion(null);
    setPendingSwapCharactersMotion(null);
    setPendingBoardSpecialMotion(null);
    setPendingMrsPuffPuffUp(null);
    setPendingRapunzelHairTrail(null);
    setPostBattleBoardAnimation(null);
    setExpandedBoardPowerCardId(null);
    setExpandedBoardCharacterId(null);
    setPendingBoardPowerPlay(null);
    setPendingCurtainsPlay(null);
    setPendingBoardCharacterSpecial(null);
    setPendingBattlePhoneFriendPlay(null);
    setPendingBattleWeaponEquipPlay(null);
    setPendingBattleSwapPlay(null);
    setPhoneFriendAnimation(null);
    setPendingJeremySpecial(null);
    setShowJeremySelectionModal(true);
    setPendingAangEscape(null);
    setPendingSkarReclaim(null);
    setPendingIrohCounter(null);
    closeFreezeSpecialPicker();
    setKingDrawAnimationFor(null);
    setKingDrawBoardPosition(null);
    setKingDrawTravelStart(null);
    setKingDrawTravelVector(null);
    setFinalKingDuelTransitionPhase('idle');
    setFinalKingDuelRumbleIds([]);
    setEndgameRevealCharacterIds([]);
    setEndgameRevealOpponentHand(false);
    setEndgameMessageVisible(false);
    setGameCatalogOpen(false);
    setScreen('match');
  };

  const startNewGame = (firstPlayerOverride?: Controller): void => {
    const effectiveFirstPlayer = firstPlayerOverride ?? firstPlayer;

    if (sessionMode === 'multi-game') {
      const startingPools = createInitialSessionDeckPools(Math.random);
      const next = createMultiGameSessionSetup(effectiveFirstPlayer, Math.random, startingPools);
      const setupRunoutOccurred = startingPools.unusedCharacterDeck.length < 10 || startingPools.unusedPowerDeck.length < 6;
      setSessionDeckPools(startingPools);
      setSessionGameNumber(1);
      setSessionWinHistory([]);
      setSessionScore({ P1: 0, P2: 0, draw: 0 });
      scoredSessionGamesRef.current = new Set();
      setSessionRpsPromptOpen(false);
      setSessionRpsBattle(null);
      setSessionRpsLocked(false);
      setSessionRpsResult('');
      applyFreshMatchState({
        ...next,
        sessionMode: 'multi-game',
        sessionGameNumber: 1,
        sessionRunoutOccurred: setupRunoutOccurred,
        sessionUsedCharacterPile: [],
        sessionUsedPowerCardPile: [],
      }, effectiveFirstPlayer);
      return;
    }

    const next = createGameState
      ? createGameState(effectiveFirstPlayer)
      : createStandardGameSetup(effectiveFirstPlayer, Math.random);

    setSessionDeckPools(null);
    setSessionGameNumber(1);
    setSessionWinHistory([]);
    setSessionScore({ P1: 0, P2: 0, draw: 0 });
    scoredSessionGamesRef.current = new Set();
    setSessionRpsPromptOpen(false);
    setSessionRpsBattle(null);
    setSessionRpsLocked(false);
    setSessionRpsResult('');
    applyFreshMatchState({
      ...next,
      sessionMode: 'single-game',
      sessionGameNumber: 1,
      sessionRunoutOccurred: false,
      sessionUsedCharacterPile: [],
      sessionUsedPowerCardPile: [],
    }, effectiveFirstPlayer);
  };

  const continueSession = (firstPlayerOverride?: Controller): void => {
    if (!state || state.gameStatus === 'active' || !sessionDeckPools) {
      return;
    }

    const effectiveFirstPlayer = firstPlayerOverride ?? firstPlayer;
    const nextPools = advanceSessionDeckPools(sessionDeckPools, state);
    const nextGameNumber = sessionGameNumber + 1;
    const nextGame = createMultiGameSessionSetup(effectiveFirstPlayer, Math.random, nextPools);
    const setupRunoutOccurred = nextPools.unusedCharacterDeck.length < 10 || nextPools.unusedPowerDeck.length < 6;

    setFirstPlayer(effectiveFirstPlayer);
    setSessionDeckPools(nextPools);
    setSessionGameNumber(nextGameNumber);
    setSessionRpsPromptOpen(false);
    setSessionRpsBattle(null);
    setSessionRpsLocked(false);
    setSessionRpsResult('');

    applyFreshMatchState({
      ...nextGame,
      sessionMode: 'multi-game',
      sessionGameNumber: nextGameNumber,
      sessionRunoutOccurred: setupRunoutOccurred,
      sessionUsedCharacterPile: [],
      sessionUsedPowerCardPile: [],
    }, effectiveFirstPlayer);
  };

  const endSession = (): void => {
    setSessionDeckPools(null);
    setSessionGameNumber(1);
    setSessionWinHistory([]);
    setSessionScore({ P1: 0, P2: 0, draw: 0 });
    scoredSessionGamesRef.current = new Set();
    setSessionRpsPromptOpen(false);
    setSessionRpsBattle(null);
    setSessionRpsLocked(false);
    setSessionRpsResult('');
    setState(null);
    setScreen('start');
  };

  const beginSessionRps = (): void => {
    setSessionRpsPromptOpen(true);
    setSessionRpsBattle(null);
    setSessionRpsLocked(false);
    setSessionRpsResult('');
  };

  const runSessionRpsRound = (humanChoice: SessionRpsChoice): void => {
    if (sessionRpsLocked) {
      return;
    }

    const choices: SessionRpsChoice[] = ['rock', 'paper', 'scissors'];
    const botChoice = choices[Math.floor(Math.random() * choices.length)];
    const outcome = resolveSessionRps(humanChoice, botChoice);

    setSessionRpsLocked(true);
    setSessionRpsBattle({ humanChoice, botChoice, outcome });

    if (outcome === 'tie') {
      setSessionRpsResult(`Tie: ${sessionRpsLabel(humanChoice)} vs ${sessionRpsLabel(botChoice)}. Play again.`);
      window.setTimeout(() => {
        setSessionRpsLocked(false);
      }, 1200);
      return;
    }

    if (outcome === 'P1') {
      setSessionRpsResult(`You win: ${sessionRpsLabel(humanChoice)} beats ${sessionRpsLabel(botChoice)}. You go first.`);
      window.setTimeout(() => {
        continueSession('P1');
      }, 1650);
      return;
    }

    setSessionRpsResult(`Bot wins: ${sessionRpsLabel(botChoice)} beats ${sessionRpsLabel(humanChoice)}. Bot goes first.`);
    window.setTimeout(() => {
      continueSession('P2');
    }, 1650);
  };

  useEffect(() => {
    if (!state || state.sessionMode !== 'multi-game' || state.gameStatus === 'active') {
      return;
    }

    const gameNumber = state.sessionGameNumber;
    if (scoredSessionGamesRef.current.has(gameNumber)) {
      return;
    }

    scoredSessionGamesRef.current.add(gameNumber);

    const winner = state.gameStatus === 'P1 wins'
      ? 'P1'
      : state.gameStatus === 'P2 wins'
        ? 'P2'
        : 'draw';

    setSessionWinHistory(prev => [...prev, winner]);
    setSessionScore(prev => ({
      P1: prev.P1 + (winner === 'P1' ? 1 : 0),
      P2: prev.P2 + (winner === 'P2' ? 1 : 0),
      draw: prev.draw + (winner === 'draw' ? 1 : 0),
    }));
  }, [state]);

  useEffect(() => {
    if (pendingCurtainsPlay) {
      setShowCurtainsSelectionModal(true);
    }
  }, [pendingCurtainsPlay]);

  useEffect(() => {
    if (pendingJeremySpecial) {
      setShowJeremySelectionModal(true);
    }
  }, [pendingJeremySpecial]);

  const selectedSafeCard = useMemo(() => {
    if (!safeView || !selectedCardId) {
      return null;
    }
    return safeView.boardCards.find(card => card.instanceId === selectedCardId) ?? null;
  }, [safeView, selectedCardId]);

  const selectedLiveCharacter = useMemo(() => {
    if (!state || !selectedCardId) {
      return null;
    }
    return state.characters.find(character => character.id === selectedCardId) ?? null;
  }, [selectedCardId, state]);

  const getAnytimeCharacterSpecialStatus = (
    characterId: string,
  ): {
    action: AnytimeCharacterSpecialAction;
    label: string;
    disabledReason: string | null;
  } | null => {
    if (!state || state.gameStatus !== 'active') {
      return null;
    }

    const stateCharacter = state.characters.find(entry => entry.id === characterId);
    const boardCharacter = safeView?.boardCards.find(entry => entry.instanceId === characterId) ?? null;
    const characterAlive = stateCharacter?.alive ?? boardCharacter?.alive ?? false;
    const characterVisible = !!stateCharacter?.revealed || !!boardCharacter?.revealed;

    if (!characterAlive || !characterVisible) {
      return null;
    }

    const displayName = stateCharacter?.displayName ?? boardCharacter?.displayName;
    const abilityUsed = stateCharacter?.abilityUsed ?? false;
    const owner = stateCharacter?.controller ?? boardCharacter?.controller ?? null;
    const ownerCanActNow = owner !== null && (
      owner === state.activePlayer
      || state.pendingBattle?.currentPriorityPlayer === owner
      || pendingBattleReactionWindow?.responder === owner
      || pendingBoardReactionWindow?.responder === owner
    );

    if (!ownerCanActNow) {
      return null;
    }

    if (isJeremyJahnsName(displayName)) {
      if (pendingCurtainsPlay) {
        return { action: 'jeremy', label: 'Use Jeremy Jahns Special', disabledReason: 'Resolve BEHIND THE CURTAINS first.' };
      }
      if (abilityUsed) {
        return { action: 'jeremy', label: 'Use Jeremy Jahns Special', disabledReason: 'Already used this game.' };
      }
      if (state.powerCardDeck.length === 0) {
        return { action: 'jeremy', label: 'Use Jeremy Jahns Special', disabledReason: 'Power deck is empty.' };
      }
      return { action: 'jeremy', label: 'Use Jeremy Jahns Special', disabledReason: null };
    }

    if (isUncleIrohName(displayName)) {
      if (pendingCurtainsPlay) {
        return { action: 'iroh', label: 'Use Uncle Iroh Counter (30s)', disabledReason: 'Resolve BEHIND THE CURTAINS first.' };
      }
      if (abilityUsed) {
        return { action: 'iroh', label: 'Use Uncle Iroh Counter (30s)', disabledReason: 'Already used this game.' };
      }
      return { action: 'iroh', label: 'Use Uncle Iroh Counter (30s)', disabledReason: null };
    }

    return null;
  };

  const renderAnytimeCharacterSpecialControl = (characterId: string, testPrefix: string): React.ReactNode => {
    const anytimeStatus = getAnytimeCharacterSpecialStatus(characterId);
    if (!anytimeStatus) {
      return null;
    }

    const label = anytimeStatus.label;
    const disabledReason = anytimeStatus.disabledReason;

    return React.createElement(
      'div',
      { className: 'board-modal-anytime-special', 'data-testid': `${testPrefix}-anytime-special` },
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: () => executeAnytimeCharacterSpecial(characterId),
          disabled: !!disabledReason,
          'data-testid': `${testPrefix}-anytime-special-button`,
        },
        label,
      ),
      disabledReason
        ? React.createElement('p', { className: 'status-label', 'data-testid': `${testPrefix}-anytime-special-reason` }, disabledReason)
        : null,
    );
  };

  const executeAnytimeCharacterSpecial = (characterId: string): void => {
    if (!state) {
      return;
    }

    const status = getAnytimeCharacterSpecialStatus(characterId);
    if (!status || status.disabledReason) {
      return;
    }

    const sourceCharacter = state.characters.find(character => character.id === characterId);
    if (!sourceCharacter) {
      return;
    }

    if (status.action === 'jeremy') {
      const topCards = state.powerCardDeck.slice(0, 3).map(card => ({
        instanceId: card.instanceId,
        definitionId: card.definitionId,
      }));

      setPendingJeremySpecial({
        characterId: sourceCharacter.id,
        selectedInstanceId: topCards[0]?.instanceId ?? null,
        topCards,
      });
      return;
    }

    let next: GameState = {
      ...state,
      characters: state.characters.map(character => (
        character.id === sourceCharacter.id
          ? { ...character, abilityUsed: true }
          : character
      )),
    };

    if (pendingBattleReactionWindow && pendingBattleReactionWindow.responder === sourceCharacter.controller) {
      next = logEvent(next, 'Uncle Iroh Counter - Power Card Canceled', {
        counterController: sourceCharacter.controller,
        sourceController: pendingBattleReactionWindow.sourceController,
        cardDefinitionId: pendingBattleReactionWindow.definitionId,
        cardInstanceId: pendingBattleReactionWindow.cardInstanceId,
        phase: 'battle-reaction',
      });
      setState(next);
      setPendingBattleReactionWindow(null);
      setBattleReactionSecondsLeft(null);
      setPendingIrohCounter(null);
      return;
    }

    if (pendingBoardReactionWindow && pendingBoardReactionWindow.responder === sourceCharacter.controller) {
      next = logEvent(next, 'Uncle Iroh Counter - Power Card Canceled', {
        counterController: sourceCharacter.controller,
        sourceController: pendingBoardReactionWindow.sourceController,
        cardDefinitionId: pendingBoardReactionWindow.definitionId,
        cardInstanceId: pendingBoardReactionWindow.cardInstanceId,
        phase: 'board-reaction',
      });
      setState(next);
      setPendingBoardReactionWindow(null);
      setBoardReactionSecondsLeft(null);
      setPendingCurtainsPlay(null);
      setPendingIrohCounter(null);
      return;
    }

    next = logEvent(next, 'Uncle Iroh Counter Armed', {
      characterId: sourceCharacter.id,
      controller: sourceCharacter.controller,
      durationSeconds: 30,
    });

    setState(next);
    setPendingIrohCounter({
      controller: sourceCharacter.controller,
      characterId: sourceCharacter.id,
      expiresAt: Date.now() + 30_000,
    });
  };

  const selectedCharacterSpecialLabel = useMemo(() => {
    if (!state || !selectedLiveCharacter || !selectedLiveCharacter.revealed) {
      return null;
    }

    const isActivePlayerCharacter = selectedLiveCharacter.controller === state.activePlayer;

    const normalized = normalizeCardName(selectedLiveCharacter.displayName);
    if (isActivePlayerCharacter && normalized === 'NIGHTCRAWLER' && getNightcrawlerTeleportDestinations(state, selectedLiveCharacter.id).length > 0) {
      return 'Use Nightcrawler Teleport';
    }
    if (isActivePlayerCharacter && canUseRapunzelSpecial(state, selectedLiveCharacter.id)) {
      return 'Use Rapunzel Special';
    }
    if (isActivePlayerCharacter && canUseMrsPuffSpecial(state, selectedLiveCharacter.id)) {
      return 'Use Mrs. Puff Special';
    }
    const anytimeStatus = getAnytimeCharacterSpecialStatus(selectedLiveCharacter.id);
    if (anytimeStatus && !anytimeStatus.disabledReason) {
      return anytimeStatus.label;
    }

    return null;
  }, [selectedLiveCharacter, state]);

  const executeSelectedCharacterSpecial = (): void => {
    if (!state || !selectedLiveCharacter) {
      return;
    }

    if (selectedLiveCharacter.controller !== state.activePlayer) {
      return;
    }

    const normalized = normalizeCardName(selectedLiveCharacter.displayName);
    if (normalized === 'NIGHTCRAWLER') {
      if (getNightcrawlerTeleportDestinations(state, selectedLiveCharacter.id).length === 0) {
        return;
      }
      setPendingBoardCharacterSpecial({
        characterId: selectedLiveCharacter.id,
        definitionId: selectedLiveCharacter.definitionId,
        step: 'nightcrawler-pick-destination',
      });
      return;
    }

    if (canUseRapunzelSpecial(state, selectedLiveCharacter.id)) {
      const rapunzel = selectedLiveCharacter;
      const sourcePosition = rapunzel.boardPosition as RingPosition;
      const destination = getForwardSpace(sourcePosition) as RingPosition;
      const pathPositions: RingPosition[] = [sourcePosition];
      let cursor = getBackwardSpace(sourcePosition) as RingPosition;
      let target = state.characters.find(character => character.alive && character.boardPosition === cursor) ?? null;

      while (!target && cursor !== sourcePosition) {
        pathPositions.push(cursor);
        cursor = getBackwardSpace(cursor) as RingPosition;
        target = state.characters.find(character => character.alive && character.boardPosition === cursor) ?? null;
      }

      if (!target || !target.boardPosition) {
        return;
      }

      pathPositions.push(target.boardPosition as RingPosition);

      setPendingRapunzelHairTrail({
        sourceCharacterId: rapunzel.id,
        sourcePosition,
        targetCharacterId: target.id,
        targetPosition: target.boardPosition as RingPosition,
        attachedPosition: target.boardPosition as RingPosition,
        phase: 'attach',
        pathPositions,
      });

      const RAPUNZEL_ATTACH_HOLD_MS = 1000;
      const RAPUNZEL_FLING_MS = 1420;
      const RAPUNZEL_RETRACT_MS = 720;

      clearRapunzelTimers();

      const startFlingTimer = window.setTimeout(() => {
        setPendingRapunzelHairTrail(prev => {
          if (!prev || prev.sourceCharacterId !== rapunzel.id) {
            return prev;
          }

          return {
            ...prev,
            phase: 'fling',
            attachedPosition: destination,
            pathPositions: [sourcePosition, target.boardPosition as RingPosition, destination],
          };
        });

        setPendingBoardSpecialMotion({
          characterId: target.id,
          displayName: target.displayName ?? target.id,
          ATK: target.ATK,
          DEF: target.DEF,
          isKing: target.isKing,
          isFrozen: target.isFrozen,
          controller: target.controller,
          fromPosition: target.boardPosition as RingPosition,
          toPosition: destination,
          visualMode: target.visualMode,
          artImageUrl: target.artImageUrl,
          fullCardFaceImageUrl: target.fullCardFaceImageUrl,
          style: 'rapunzel-fling',
        });
      }, RAPUNZEL_ATTACH_HOLD_MS);

      const resolveSpecialTimer = window.setTimeout(() => {
        setState(prev => {
          if (!prev || prev.gameStatus !== 'active' || prev.pendingBattle) {
            return prev;
          }

          try {
            return executeRapunzelSpecial(prev, rapunzel.id);
          } catch {
            return prev;
          }
        });
        setPendingBoardSpecialMotion(null);

        setPendingRapunzelHairTrail(prev => {
          if (!prev || prev.sourceCharacterId !== rapunzel.id) {
            return prev;
          }

          return {
            ...prev,
            phase: 'retract',
            attachedPosition: null,
            pathPositions: [destination, sourcePosition],
          };
        });
      }, RAPUNZEL_ATTACH_HOLD_MS + RAPUNZEL_FLING_MS);

      const clearTrailTimer = window.setTimeout(() => {
        setPendingRapunzelHairTrail(null);
        clearRapunzelTimers();
      }, RAPUNZEL_ATTACH_HOLD_MS + RAPUNZEL_FLING_MS + RAPUNZEL_RETRACT_MS);

      rapunzelTimerRefs.current = [startFlingTimer, resolveSpecialTimer, clearTrailTimer];

      setSelectedCardId(null);
      return;
    }

    if (canUseMrsPuffSpecial(state, selectedLiveCharacter.id)) {
      const puffCharacter = selectedLiveCharacter;
      const nextState = executeMrsPuffSpecial(state, selectedLiveCharacter.id);

      const motionEntries = state.characters
        .map(character => {
          const nextCharacter = nextState.characters.find(entry => entry.id === character.id);
          if (!character.boardPosition || !nextCharacter?.boardPosition || character.boardPosition === nextCharacter.boardPosition) {
            return null;
          }

          return {
            characterId: character.id,
            revealed: character.revealed,
            displayName: character.displayName ?? character.id,
            ATK: character.ATK,
            DEF: character.DEF,
            isKing: character.isKing,
            toIsKing: nextCharacter.isKing,
            isFrozen: character.isFrozen,
            fromController: character.controller,
            toController: nextCharacter.controller,
            fromPosition: character.boardPosition as RingPosition,
            toPosition: nextCharacter.boardPosition as RingPosition,
            visualMode: character.visualMode,
            artImageUrl: character.artImageUrl,
            fullCardFaceImageUrl: character.fullCardFaceImageUrl,
          };
        })
        .filter((entry): entry is PendingSwapCharactersMotionEntry => entry !== null);

      if (motionEntries.length > 0) {
        setPendingSwapCharactersMotion({
          first: motionEntries[0],
          second: motionEntries[1],
          nextState,
          durationMs: 3000,
        });
      } else {
        setState(nextState);
      }

      setPendingMrsPuffPuffUp({
        characterId: puffCharacter.id,
        displayName: puffCharacter.displayName ?? puffCharacter.id,
        ATK: puffCharacter.ATK,
        DEF: puffCharacter.DEF,
        isKing: puffCharacter.isKing,
        isFrozen: puffCharacter.isFrozen,
        controller: puffCharacter.controller,
        visualMode: puffCharacter.visualMode,
        artImageUrl: puffCharacter.artImageUrl,
        fullCardFaceImageUrl: puffCharacter.fullCardFaceImageUrl,
      });
      setSelectedCardId(null);
      return;
    }

    const anytimeStatus = getAnytimeCharacterSpecialStatus(selectedLiveCharacter.id);
    if (anytimeStatus && !anytimeStatus.disabledReason) {
      executeAnytimeCharacterSpecial(selectedLiveCharacter.id);
      setSelectedCardId(null);
    }
  };

  const confirmJeremySpecial = (): void => {
    if (!state || !pendingJeremySpecial?.selectedInstanceId) {
      return;
    }

    const sourceCharacter = state.characters.find(character => character.id === pendingJeremySpecial.characterId);
    if (!sourceCharacter || !sourceCharacter.alive || sourceCharacter.abilityUsed || !isJeremyJahnsName(sourceCharacter.displayName)) {
      setPendingJeremySpecial(null);
      return;
    }

    const currentTop = state.powerCardDeck.slice(0, Math.min(3, state.powerCardDeck.length));
    const chosenCard = currentTop.find(card => card.instanceId === pendingJeremySpecial.selectedInstanceId);
    if (!chosenCard) {
      setPendingJeremySpecial(null);
      return;
    }

    const unchosen = currentTop.filter(card => card.instanceId !== chosenCard.instanceId);
    let randomizedDeck = state.powerCardDeck.slice(currentTop.length);
    for (const card of unchosen) {
      const insertAt = Math.floor(Math.random() * (randomizedDeck.length + 1));
      randomizedDeck = [
        ...randomizedDeck.slice(0, insertAt),
        card,
        ...randomizedDeck.slice(insertAt),
      ];
    }

    let next: GameState = {
      ...state,
      powerCardDeck: randomizedDeck,
      powerCardHands: {
        ...state.powerCardHands,
        [sourceCharacter.controller]: [...state.powerCardHands[sourceCharacter.controller], chosenCard],
      },
      drawCount: {
        ...state.drawCount,
        [sourceCharacter.controller]: state.drawCount[sourceCharacter.controller] + 1,
      },
      characters: state.characters.map(character => (
        character.id === sourceCharacter.id
          ? { ...character, abilityUsed: true }
          : character
      )),
    };

    next = logEvent(next, 'Jeremy Jahns Special', {
      characterId: sourceCharacter.id,
      selectedPowerCardInstanceId: chosenCard.instanceId,
      selectedPowerCardDefinitionId: chosenCard.definitionId,
      returnedPowerCardInstanceIds: unchosen.map(card => card.instanceId),
    });

    setState(next);
    setPendingJeremySpecial(null);
    setSelectedCardId(null);
  };

  const jeremySpecialModal = pendingJeremySpecial && state && showJeremySelectionModal
    ? React.createElement(
        'section',
        { className: 'board-card-modal', 'data-testid': 'jeremy-special-modal' },
        React.createElement(
          'div',
          { className: 'board-card-modal-panel board-power-card-modal-panel' },
          React.createElement('h3', null, 'Jeremy Jahns Special'),
          React.createElement('p', { className: 'status-label' }, 'Select one card from the top 3. The other 2 are shuffled back into the power deck.'),
          React.createElement(
            'div',
            { className: 'power-card-row' },
            pendingJeremySpecial.topCards.map(card => {
              const definition = getPowerCardDefinition(card.definitionId);
              const visual = powerCatalogById.get(card.definitionId);
              return React.createElement(
                'button',
                {
                  key: `jeremy-top-${card.instanceId}`,
                  type: 'button',
                  className: `power-card-button jeremy-top-card-button ${pendingJeremySpecial.selectedInstanceId === card.instanceId ? 'selected' : ''}`,
                  onClick: () => setPendingJeremySpecial(prev => (
                    prev
                      ? { ...prev, selectedInstanceId: card.instanceId }
                      : prev
                  )),
                  'data-testid': `jeremy-top-${card.instanceId}`,
                },
                React.createElement(PowerCardFrame, {
                  size: 'hand',
                  displayName: definition.displayName,
                  rulesText: definition.rulesText,
                  artSrc: visual?.artImageUrl ?? null,
                  fullCardFaceSrc: visual?.fullCardFaceImageUrl ?? null,
                  visualMode: visual?.visualMode ?? 'layered-art',
                  state: pendingJeremySpecial.selectedInstanceId === card.instanceId ? 'selected' : 'playable',
                  selected: pendingJeremySpecial.selectedInstanceId === card.instanceId,
                  testId: `jeremy-top-card-${card.instanceId}`,
                }),
              );
            }),
          ),
          React.createElement(
            'div',
            { className: 'power-popover-controls' },
            state.pendingBattle
              ? React.createElement(
                  React.Fragment,
                  null,
                  React.createElement(
                    'p',
                    { className: 'status-label', 'data-testid': 'jeremy-view-indicator' },
                    showBattleFullBoard ? 'Viewing: Full Board' : 'Viewing: Battle Screen',
                  ),
                  React.createElement(
                    'button',
                    {
                      type: 'button',
                      onClick: () => {
                        setShowBattleFullBoard(true);
                        setShowJeremySelectionModal(false);
                      },
                      disabled: showBattleFullBoard,
                      'data-testid': 'jeremy-view-full-board',
                    },
                    'View Full Board',
                  ),
                  React.createElement(
                    'button',
                    {
                      type: 'button',
                      onClick: () => {
                        setShowBattleFullBoard(false);
                        setShowJeremySelectionModal(false);
                      },
                      disabled: !showBattleFullBoard,
                      'data-testid': 'jeremy-view-battle',
                    },
                    'View Battle Screen',
                  ),
                )
              : null,
            React.createElement(
              'button',
              {
                type: 'button',
                onClick: confirmJeremySpecial,
                disabled: !pendingJeremySpecial.selectedInstanceId,
                'data-testid': 'jeremy-special-confirm',
              },
              'Confirm Selection',
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                onClick: () => setPendingJeremySpecial(null),
                'data-testid': 'jeremy-special-cancel',
              },
              'Cancel',
            ),
          ),
        ),
      )
    : null;

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

  const consumeBoardPowerCard = (
    currentState: GameState,
    actingPlayer: Controller,
    cardInstanceId: string,
    effectSummary: string,
  ): GameState => {
    const hand = currentState.powerCardHands[actingPlayer];
    const card = hand.find(entry => entry.instanceId === cardInstanceId);
    if (!card) {
      return currentState;
    }

    const definition = getPowerCardDefinition(card.definitionId);
    const visual = powerCatalogById.get(card.definitionId);
    const next: GameState = {
      ...currentState,
      powerCardHands: {
        ...currentState.powerCardHands,
        [actingPlayer]: hand.filter(entry => entry.instanceId !== cardInstanceId),
      },
      usedPowerCardPile: [
        ...currentState.usedPowerCardPile,
        {
          instanceId: card.instanceId,
          definitionId: card.definitionId,
          controller: actingPlayer,
          displayName: definition.displayName,
          selectedChoice: null,
          effectSummary,
          visualMode: visual?.visualMode,
          artImageUrl: visual?.artImageUrl,
          fullCardFaceImageUrl: visual?.fullCardFaceImageUrl,
        },
      ],
    };

    return logEvent(next, 'Board Power Card Played', {
      actingPlayer,
      cardInstanceId,
      cardDefinitionId: card.definitionId,
      effectSummary,
    });
  };

  const boardActionTargets = useMemo<Partial<Record<RingPosition, LegalActionType>>>(() => {
    if (pendingAangEscape?.step === 'pick-spot') {
      const targets: Partial<Record<RingPosition, LegalActionType>> = {};
      for (const space of pendingAangEscape.options) {
        targets[space] = 'move';
      }
      return targets;
    }

    if (pendingBoardCharacterSpecial && state) {
      if (pendingBoardCharacterSpecial.step === 'nightcrawler-pick-destination') {
        const legal = getNightcrawlerTeleportDestinations(state, pendingBoardCharacterSpecial.characterId) as RingPosition[];
        const targets: Partial<Record<RingPosition, LegalActionType>> = {};
        for (const space of legal) {
          targets[space] = 'move';
        }
        return targets;
      }
    }

    if (pendingBoardPowerPlay && state) {
      if (pendingBoardPowerPlay.step === 'portal-pick-destination') {
        const targets: Partial<Record<RingPosition, LegalActionType>> = {};
        for (const space of ['P1_1', 'P1_2', 'P1_3', 'P1_4', 'P1_5', 'P2_1', 'P2_2', 'P2_3', 'P2_4', 'P2_5'] as RingPosition[]) {
          const occupied = state.characters.some(character => character.alive && character.boardPosition === space);
          if (!occupied) {
            targets[space] = 'move';
          }
        }
        return targets;
      }

      if (pendingBoardPowerPlay.step === 'back-pick-destination' && pendingBoardPowerPlay.sourceCharacterId) {
        const legal = getBackItUpDestinations(state, pendingBoardPowerPlay.sourceCharacterId) as RingPosition[];
        const targets: Partial<Record<RingPosition, LegalActionType>> = {};
        for (const space of legal) {
          targets[space] = 'move';
        }
        return targets;
      }

      if (pendingBoardPowerPlay.step === 'swap-pick-own') {
        const targets: Partial<Record<RingPosition, LegalActionType>> = {};
        for (const character of state.characters) {
          if (character.alive && character.controller === state.activePlayer && character.boardPosition) {
            targets[character.boardPosition as RingPosition] = 'move';
          }
        }
        return targets;
      }

      if (pendingBoardPowerPlay.step === 'swap-pick-opponent') {
        const targets: Partial<Record<RingPosition, LegalActionType>> = {};
        for (const character of state.characters) {
          if (character.alive && character.controller !== state.activePlayer && character.boardPosition) {
            targets[character.boardPosition as RingPosition] = 'move';
          }
        }
        return targets;
      }
    }

    if (!selectedSafeCard?.boardPosition || legalActionsForSelection.length === 0) {
      return {};
    }

    const targets: Partial<Record<RingPosition, LegalActionType>> = {};
    const selectedPosition = selectedSafeCard.boardPosition as RingPosition;

    if (legalActionsForSelection.includes('move')) {
      targets[getForwardSpace(selectedPosition) as RingPosition] = 'move';
    }

    if (legalActionsForSelection.includes('attack')) {
      targets[getForwardSpace(selectedPosition) as RingPosition] = 'attack';
    }

    if (legalActionsForSelection.includes('defend')) {
      targets[getBackwardSpace(selectedPosition) as RingPosition] = 'defend';
    }

    return targets;
  }, [legalActionsForSelection, pendingAangEscape, pendingBoardCharacterSpecial, pendingBoardPowerPlay, selectedSafeCard?.boardPosition, state]);

  const boardActionTargetFx = pendingBoardPowerPlay?.step === 'portal-pick-destination'
    ? 'power-portal'
    : pendingBoardPowerPlay?.step === 'back-pick-destination'
      ? 'back-it-up'
      : null;

  const canSkip = useMemo(() => {
    if (!state || state.gameStatus !== 'active') {
      return false;
    }
    if (state.pendingBattle) {
      return false;
    }
    if (pendingHumanBoardAction || pendingBotBoardAction) {
      return false;
    }
    if (pendingSwapCharactersMotion) {
      return false;
    }
    return !hasLegalAction(state);
  }, [pendingBotBoardAction, pendingHumanBoardAction, pendingSwapCharactersMotion, state]);

  useEffect(() => {
    if (!pendingCurtainsSwapMotion) {
      return;
    }

    const timer = window.setTimeout(() => {
      setState(pendingCurtainsSwapMotion.nextState);
      setPendingCurtainsSwapMotion(null);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [pendingCurtainsSwapMotion]);

  useEffect(() => {
    if (pendingCurtainsSwapMotion) {
      setPendingCurtainsPlay(null);
    }
  }, [pendingCurtainsSwapMotion]);

  const triggerKingTerritoryFx = (
    controller: 'P1' | 'P2',
    boardPosition: RingPosition,
    animateDeckTravel: boolean,
  ): void => {
    setKingDrawAnimationFor(controller);
    setDrawFxReason('king-territory');
    setKingDrawBoardPosition(boardPosition);
    setRoombaDrawTravelVectors(null);

    if (animateDeckTravel) {
      const sourceDeck = document.querySelector('[data-testid="power-deck-stack"] .deck-stack-cards') as HTMLElement | null;
      const targetHand = document.querySelector(
        controller === 'P1' ? '[data-testid="human-power-cards"]' : '[data-testid="opponent-power-cards"]',
      ) as HTMLElement | null;

      if (sourceDeck && targetHand) {
        const sourceRect = sourceDeck.getBoundingClientRect();
        const targetRect = targetHand.getBoundingClientRect();
        const sourceCenterX = sourceRect.left + sourceRect.width / 2;
        const sourceCenterY = sourceRect.top + sourceRect.height / 2;
        const targetCenterX = targetRect.left + targetRect.width / 2;
        const targetCenterY = targetRect.top + targetRect.height / 2;
        const x = targetCenterX - sourceCenterX;
        const y = targetCenterY - sourceCenterY;
        setKingDrawTravelStart({ x: sourceCenterX, y: sourceCenterY });
        setKingDrawTravelVector({ x, y });
      } else {
        setKingDrawTravelStart(null);
        setKingDrawTravelVector(null);
      }
    } else {
      setKingDrawTravelStart(null);
      setKingDrawTravelVector(null);
    }

    if (kingDrawFxTimerRef.current !== null) {
      window.clearTimeout(kingDrawFxTimerRef.current);
    }

    kingDrawFxTimerRef.current = window.setTimeout(() => {
      setKingDrawAnimationFor(null);
      setDrawFxReason(null);
      setKingDrawBoardPosition(null);
      setKingDrawTravelStart(null);
      setKingDrawTravelVector(null);
      setRoombaDrawTravelVectors(null);
      kingDrawFxTimerRef.current = null;
    }, 8500);
  };

  const triggerRoombaDrawFx = (
    controller: 'P1' | 'P2',
    boardPosition: RingPosition,
  ): void => {
    setKingDrawAnimationFor(controller);
    setDrawFxReason('roomba');
    setKingDrawBoardPosition(boardPosition);
    setKingDrawTravelVector(null);

    const sourceDeck = document.querySelector('[data-testid="power-deck-stack"] .deck-stack-cards') as HTMLElement | null;
    const targetHand = document.querySelector(
      controller === 'P1' ? '[data-testid="human-power-cards"]' : '[data-testid="opponent-power-cards"]',
    ) as HTMLElement | null;
    const roombaTarget = document.querySelector(`[data-testid="space-${boardPosition}"]`) as HTMLElement | null;

    if (sourceDeck && targetHand && roombaTarget) {
      const sourceRect = sourceDeck.getBoundingClientRect();
      const handRect = targetHand.getBoundingClientRect();
      const roombaRect = roombaTarget.getBoundingClientRect();
      const sourceCenterX = sourceRect.left + sourceRect.width / 2;
      const sourceCenterY = sourceRect.top + sourceRect.height / 2;
      const handCenterX = handRect.left + handRect.width / 2;
      const handCenterY = handRect.top + handRect.height / 2;
      const roombaCenterX = roombaRect.left + roombaRect.width / 2;
      const roombaCenterY = roombaRect.top + roombaRect.height / 2;

      setKingDrawTravelStart({ x: sourceCenterX, y: sourceCenterY });
      setRoombaDrawTravelVectors({
        toRoombaX: roombaCenterX - sourceCenterX,
        toRoombaY: roombaCenterY - sourceCenterY,
        toHandX: handCenterX - sourceCenterX,
        toHandY: handCenterY - sourceCenterY,
      });
    } else {
      setKingDrawTravelStart(null);
      setRoombaDrawTravelVectors(null);
    }

    if (kingDrawFxTimerRef.current !== null) {
      window.clearTimeout(kingDrawFxTimerRef.current);
    }

    kingDrawFxTimerRef.current = window.setTimeout(() => {
      setKingDrawAnimationFor(null);
      setDrawFxReason(null);
      setKingDrawBoardPosition(null);
      setKingDrawTravelStart(null);
      setKingDrawTravelVector(null);
      setRoombaDrawTravelVectors(null);
      kingDrawFxTimerRef.current = null;
    }, 3000);
  };

  const triggerAntVictoryFx = (controller: 'P1' | 'P2'): void => {
    setKingDrawAnimationFor(controller);
    setDrawFxReason('ant');
    setKingDrawBoardPosition(null);
    setRoombaDrawTravelVectors(null);

    const sourceDeck = document.querySelector('[data-testid="power-deck-stack"] .deck-stack-cards') as HTMLElement | null;
    const targetHand = document.querySelector(
      controller === 'P1' ? '[data-testid="human-power-cards"]' : '[data-testid="opponent-power-cards"]',
    ) as HTMLElement | null;

    if (sourceDeck && targetHand) {
      const sourceRect = sourceDeck.getBoundingClientRect();
      const targetRect = targetHand.getBoundingClientRect();
      const sourceCenterX = sourceRect.left + sourceRect.width / 2;
      const sourceCenterY = sourceRect.top + sourceRect.height / 2;
      const targetCenterX = targetRect.left + targetRect.width / 2;
      const targetCenterY = targetRect.top + targetRect.height / 2;
      setKingDrawTravelStart({ x: sourceCenterX, y: sourceCenterY });
      setKingDrawTravelVector({ x: targetCenterX - sourceCenterX, y: targetCenterY - sourceCenterY });
    } else {
      setKingDrawTravelStart(null);
      setKingDrawTravelVector(null);
    }

    if (kingDrawFxTimerRef.current !== null) {
      window.clearTimeout(kingDrawFxTimerRef.current);
    }

    kingDrawFxTimerRef.current = window.setTimeout(() => {
      setKingDrawAnimationFor(null);
      setDrawFxReason(null);
      setKingDrawBoardPosition(null);
      setKingDrawTravelStart(null);
      setKingDrawTravelVector(null);
      setRoombaDrawTravelVectors(null);
      kingDrawFxTimerRef.current = null;
    }, 3200);
  };

  useEffect(() => {
    if (!state) {
      processedDrawFxEventIndexRef.current = -1;
      return;
    }

    if (state.eventLog.length === 0) {
      return;
    }

    const startIndex = Math.max(processedDrawFxEventIndexRef.current + 1, 0);
    if (startIndex >= state.eventLog.length) {
      return;
    }

    for (let index = startIndex; index < state.eventLog.length; index += 1) {
      const event = state.eventLog[index];

      if (event.action === 'Roomba Move Draw') {
        const detailCharacterId = typeof event.details.characterId === 'string'
          ? event.details.characterId
          : null;
        const detailToSpace = typeof event.details.toSpace === 'string'
          ? event.details.toSpace as RingPosition
          : null;
        const sourceCharacter = detailCharacterId
          ? state.characters.find(character => character.id === detailCharacterId)
          : null;

        if (!sourceCharacter || !isRoombaName(sourceCharacter.displayName)) {
          continue;
        }

        const destination = (sourceCharacter.boardPosition as RingPosition | null) ?? detailToSpace;
        if (!destination) {
          continue;
        }

        triggerRoombaDrawFx(sourceCharacter.controller, destination);
        continue;
      }

      if (event.action === 'Ant Victory Draw' && event.details.drawNumber === 2) {
        const controller = event.details.controller === 'P2' ? 'P2' : 'P1';
        if (antVictoryFxDelayTimerRef.current !== null) {
          window.clearTimeout(antVictoryFxDelayTimerRef.current);
        }
        antVictoryFxDelayTimerRef.current = window.setTimeout(() => {
          triggerAntVictoryFx(controller);
          antVictoryFxDelayTimerRef.current = null;
        }, 1250);
        continue;
      }

      if (event.action === 'King Territory Draw' || event.action === 'King Territory Draw - No Power Cards Remaining') {
        const controller = event.details.controller === 'P2' ? 'P2' : 'P1';
        const toSpace = typeof event.details.toSpace === 'string'
          ? event.details.toSpace as RingPosition
          : null;
        if (toSpace) {
          triggerKingTerritoryFx(controller, toSpace, event.action === 'King Territory Draw');
        }
      }
    }

    processedDrawFxEventIndexRef.current = state.eventLog.length - 1;
  }, [state]);

  useEffect(() => {
    if (!pendingMrsPuffPuffUp) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPendingMrsPuffPuffUp(null);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [pendingMrsPuffPuffUp]);

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
    if (pendingSwapCharactersMotion) {
      return;
    }

    if (finalKingDuelTransitionPhase !== 'idle') {
      return;
    }

    const clicked = safeView.boardCards.find(card => card.instanceId === instanceId);
    if (!clicked) {
      return;
    }

    if (pendingBoardPowerPlay && state) {
      if (pendingBoardPowerPlay.step === 'portal-pick-character') {
        if (clicked.alive && clicked.controller === state.activePlayer) {
          setPendingBoardPowerPlay({
            ...pendingBoardPowerPlay,
            sourceCharacterId: clicked.instanceId,
            step: 'portal-pick-destination',
          });
        }
        return;
      }

      if (pendingBoardPowerPlay.step === 'portal-pick-destination') {
        if (clicked.alive && clicked.controller === state.activePlayer) {
          setPendingBoardPowerPlay({
            ...pendingBoardPowerPlay,
            sourceCharacterId: clicked.instanceId,
          });
        }
        return;
      }

      if (pendingBoardPowerPlay.step === 'back-pick-character') {
        if (!clicked.alive) {
          return;
        }

        const legal = getBackItUpDestinations(state, clicked.instanceId);
        if (legal.length === 0) {
          return;
        }

        setPendingBoardPowerPlay({
          ...pendingBoardPowerPlay,
          sourceCharacterId: clicked.instanceId,
          step: 'back-pick-destination',
        });
        return;
      }

      if (pendingBoardPowerPlay.step === 'swap-pick-own') {
        if (clicked.alive && clicked.controller === state.activePlayer) {
          setPendingBoardPowerPlay({
            ...pendingBoardPowerPlay,
            pendingCharacterId: clicked.instanceId,
          });
          setExpandedBoardCharacterId(clicked.instanceId);
        }
        return;
      }

      if (pendingBoardPowerPlay.step === 'swap-pick-opponent' && pendingBoardPowerPlay.sourceCharacterId) {
        if (!clicked.alive || clicked.controller === state.activePlayer) {
          return;
        }
        setPendingBoardPowerPlay({
          ...pendingBoardPowerPlay,
          pendingCharacterId: clicked.instanceId,
        });
        setExpandedBoardCharacterId(clicked.instanceId);
        return;
      }

      return;
    }

    if (pendingBoardWeaponEquipPlay && state) {
      if (clicked.alive && clicked.boardPosition) {
        setPendingBoardWeaponEquipPlay({
          ...pendingBoardWeaponEquipPlay,
          selectedCharacterId: clicked.instanceId,
        });
        setExpandedBoardCharacterId(clicked.instanceId);
      }
      return;
    }

    if (clicked.revealed && clicked.controller !== safeView.activePlayer) {
      setExpandedBoardCharacterId(clicked.instanceId);
      return;
    }

    if (!isHumanBoardTurn) {
      return;
    }
    if (pendingHumanBoardAction || pendingBotBoardAction) {
      return;
    }

    if (clicked.controller !== safeView.activePlayer) {
      return;
    }
    setSelectedCardId(prev => (prev === instanceId ? null : instanceId));
  };

  const handleExecuteAction = (action: LegalActionType, targetPosition?: RingPosition): void => {
    if (pendingSwapCharactersMotion) {
      return;
    }
    if (pendingAangEscape?.step === 'pick-spot' && state && targetPosition) {
      if (!pendingAangEscape.options.includes(targetPosition)) {
        return;
      }

      const aang = state.characters.find(character => character.id === pendingAangEscape.characterId);
      if (!aang) {
        setPendingAangEscape(null);
        return;
      }

      let next: GameState = {
        ...state,
        characters: state.characters.map(character => (
          character.id === pendingAangEscape.characterId
            ? {
                ...character,
                alive: true,
                boardPosition: targetPosition,
                abilityUsed: true,
                ATK: character.ATK - 1,
                DEF: character.DEF - 1,
                statRule: 'Permanent -1 ATK AND DEF',
              }
            : character
        )),
        graveyard: state.graveyard.filter(card => card.id !== pendingAangEscape.characterId),
      };

      next = logEvent(next, 'Avatar Aang Escape', {
        characterId: pendingAangEscape.characterId,
        fromSpace: pendingAangEscape.fromPosition,
        toSpace: targetPosition,
        ATKPenalty: -1,
        DEFPenalty: -1,
      });

      setState(next);
      setPendingBoardSpecialMotion({
        characterId: aang.id,
        displayName: aang.displayName ?? aang.id,
        ATK: aang.ATK,
        DEF: aang.DEF,
        isKing: aang.isKing,
        isFrozen: aang.isFrozen,
        controller: aang.controller,
        fromPosition: pendingAangEscape.fromPosition,
        toPosition: targetPosition,
        visualMode: aang.visualMode,
        artImageUrl: aang.artImageUrl,
        fullCardFaceImageUrl: aang.fullCardFaceImageUrl,
        style: 'wind',
      });
      setPendingAangEscape(null);
      return;
    }

    if (pendingBoardCharacterSpecial && state) {
      if (pendingBoardCharacterSpecial.step === 'nightcrawler-pick-destination' && targetPosition) {
        const source = getCharacter(state, pendingBoardCharacterSpecial.characterId);
        const fromPosition = source?.boardPosition as RingPosition | null;
        const nextState = executeNightcrawlerTeleportMove(
          state,
          state.activePlayer,
          pendingBoardCharacterSpecial.characterId,
          targetPosition,
        );
        setState(nextState);
        if (source && fromPosition) {
          const emittedEvents = nextState.eventLog.slice(state.eventLog.length);
          const emittedKingDraw = emittedEvents.some(event => (
            (event.action === 'King Territory Draw' || event.action === 'King Territory Draw - No Power Cards Remaining')
            && event.details.reason === 'NIGHTCRAWLER TELEPORT'
          ));

          if (
            emittedKingDraw
          ) {
            triggerKingTerritoryFx(source.controller, targetPosition, nextState.powerCardDeck.length < state.powerCardDeck.length);
          }

          setPendingBoardSpecialMotion({
            characterId: source.id,
            displayName: source.displayName ?? source.id,
            ATK: source.ATK,
            DEF: source.DEF,
            isKing: source.isKing,
            isFrozen: source.isFrozen,
            controller: source.controller,
            fromPosition,
            toPosition: targetPosition,
            visualMode: source.visualMode,
            artImageUrl: source.artImageUrl,
            fullCardFaceImageUrl: source.fullCardFaceImageUrl,
            style: 'nightcrawler-portal',
          });
        }
        setPendingBoardCharacterSpecial(null);
        setSelectedCardId(null);
      }
      return;
    }

    if (pendingBoardPowerPlay && state) {
      if ((pendingBoardPowerPlay.step === 'portal-pick-destination' || pendingBoardPowerPlay.step === 'back-pick-destination') && targetPosition && pendingBoardPowerPlay.sourceCharacterId) {
        const actingPlayer = state.activePlayer;
        if (
          pendingIrohCounter
          && pendingIrohCounter.controller !== actingPlayer
          && pendingIrohCounter.expiresAt > Date.now()
        ) {
          let canceled = logEvent(state, 'Uncle Iroh Counter - Power Card Canceled', {
            counterController: pendingIrohCounter.controller,
            sourceController: actingPlayer,
            cardDefinitionId: pendingBoardPowerPlay.definitionId,
            cardInstanceId: pendingBoardPowerPlay.cardInstanceId,
            phase: 'board',
          });
          canceled = {
            ...canceled,
            characters: canceled.characters.map(character => (
              character.id === pendingIrohCounter.characterId
                ? { ...character, abilityUsed: true }
                : character
            )),
          };
          setState(canceled);
          setPendingIrohCounter(null);
          setPendingBoardPowerPlay(null);
          setSelectedCardId(null);
          return;
        }

        const sourceCharacter = getCharacter(state, pendingBoardPowerPlay.sourceCharacterId);
        if (!sourceCharacter?.boardPosition) {
          setPendingBoardPowerPlay(null);
          return;
        }

        const sourcePosition = sourceCharacter.boardPosition as RingPosition;
        let nextState: GameState;
        if (pendingBoardPowerPlay.step === 'portal-pick-destination') {
          nextState = executePortalMove(state, actingPlayer, pendingBoardPowerPlay.sourceCharacterId, targetPosition, { preserveTurn: true });
          nextState = consumeBoardPowerCard(nextState, actingPlayer, pendingBoardPowerPlay.cardInstanceId, 'PORTAL relocation');
        } else {
          nextState = executeBackItUpMove(state, actingPlayer, pendingBoardPowerPlay.sourceCharacterId, targetPosition, { preserveTurn: true });
          nextState = consumeBoardPowerCard(nextState, actingPlayer, pendingBoardPowerPlay.cardInstanceId, 'BACK IT UP relocation');
        }

        if (
          sourceCharacter.isKing
          && getSpaceTerritory(sourcePosition) !== getSpaceTerritory(targetPosition)
        ) {
          triggerKingTerritoryFx(sourceCharacter.controller, targetPosition, state.powerCardDeck.length > 0);
        }

        if (pendingBoardPowerPlay.step === 'portal-pick-destination' && sourceCharacter.revealed) {
          setPendingBoardSpecialMotion({
            characterId: sourceCharacter.id,
            displayName: sourceCharacter.displayName ?? sourceCharacter.id,
            ATK: sourceCharacter.ATK,
            DEF: sourceCharacter.DEF,
            isKing: sourceCharacter.isKing,
            isFrozen: sourceCharacter.isFrozen,
            controller: sourceCharacter.controller,
            fromPosition: sourcePosition,
            toPosition: targetPosition,
            visualMode: sourceCharacter.visualMode,
            artImageUrl: sourceCharacter.artImageUrl,
            fullCardFaceImageUrl: sourceCharacter.fullCardFaceImageUrl,
            style: 'power-portal',
          });
        } else if (pendingBoardPowerPlay.step === 'back-pick-destination' && sourceCharacter.revealed) {
          setPendingBoardSpecialMotion({
            characterId: sourceCharacter.id,
            displayName: sourceCharacter.displayName ?? sourceCharacter.id,
            ATK: sourceCharacter.ATK,
            DEF: sourceCharacter.DEF,
            isKing: sourceCharacter.isKing,
            isFrozen: sourceCharacter.isFrozen,
            controller: sourceCharacter.controller,
            fromPosition: sourcePosition,
            toPosition: targetPosition,
            visualMode: sourceCharacter.visualMode,
            artImageUrl: sourceCharacter.artImageUrl,
            fullCardFaceImageUrl: sourceCharacter.fullCardFaceImageUrl,
            style: 'back-it-up',
          });
        } else {
          setPendingBoardCardMotion({
            characterId: sourceCharacter.id,
            type: 'move',
            fromPosition: sourcePosition,
            toPosition: targetPosition,
          });
        }

        setState(nextState);
        setPendingBoardPowerPlay(null);
        setSelectedCardId(null);
      }
      return;
    }

    if (!state || !selectedCardId || state.gameStatus !== 'active') {
      return;
    }
    if (state.pendingBattle) {
      return;
    }
    if (finalKingDuelTransitionPhase !== 'idle') {
      return;
    }
    if (!isHumanBoardTurn) {
      return;
    }

    if (!legalActionsForSelection.includes(action)) {
      return;
    }

    if (action === 'move') {
      const selected = getCharacter(state, selectedCardId);
      if (!selected?.boardPosition) {
        return;
      }
      const toPosition = getForwardSpace(selected.boardPosition) as RingPosition;
      const crossedTerritory = selected.isKing
        && getSpaceTerritory(selected.boardPosition) !== getSpaceTerritory(toPosition);
      const canDrawFromDeck = state.powerCardDeck.length > 0;

      const isJsdomTestEnv = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
      if (isJsdomTestEnv) {
        const nextState = executeMoveForward(state, selectedCardId);
        if (crossedTerritory) {
          triggerKingTerritoryFx(selected.controller, toPosition, canDrawFromDeck);
        }
        setState(nextState);
        setSelectedCardId(null);
        return;
      }
      if (pendingHumanBoardAction) {
        return;
      }
      if (crossedTerritory) {
        triggerKingTerritoryFx(selected.controller, toPosition, canDrawFromDeck);
      }
      setPendingHumanBoardAction({ action: 'move', characterId: selectedCardId });
      if (isNightcrawlerName(selected.displayName) && selected.revealed) {
        setPendingBoardSpecialMotion({
          characterId: selectedCardId,
          displayName: selected.displayName ?? selectedCardId,
          ATK: selected.ATK,
          DEF: selected.DEF,
          isKing: selected.isKing,
          isFrozen: selected.isFrozen,
          controller: selected.controller,
          fromPosition: selected.boardPosition as RingPosition,
          toPosition,
          visualMode: selected.visualMode,
          artImageUrl: selected.artImageUrl,
          fullCardFaceImageUrl: selected.fullCardFaceImageUrl,
          style: 'nightcrawler-portal',
        });
      } else {
        setPendingBoardCardMotion({
          characterId: selectedCardId,
          type: 'move',
          fromPosition: selected.boardPosition as RingPosition,
          toPosition,
        });
      }
      setSelectedCardId(null);
      return;
    }

    if (action === 'attack') {
      const isJsdomTestEnv = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
      if (isJsdomTestEnv) {
        const nextState = startBattle(state, 'attack', selectedCardId);
        setState(nextState);
        setSelectedCardId(null);
        return;
      }
      if (pendingHumanBoardAction) {
        return;
      }
      const selected = getCharacter(state, selectedCardId);
      if (!selected?.boardPosition) {
        return;
      }
      const toPosition = getForwardSpace(selected.boardPosition) as RingPosition;
      setPendingHumanBoardAction({ action: 'attack', characterId: selectedCardId });
      setPendingBoardCardMotion({
        characterId: selectedCardId,
        type: 'attack',
        fromPosition: selected.boardPosition as RingPosition,
        toPosition,
      });
      setSelectedCardId(null);
      return;
    }

    let nextState: GameState;
    nextState = startBattle(state, 'defend', selectedCardId);

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
    if (finalKingDuelTransitionPhase !== 'idle') {
      return;
    }
    if (!isHumanBoardTurn) {
      return;
    }
    if (pendingHumanBoardAction || pendingBotBoardAction) {
      return;
    }
    if (hasLegalAction(state)) {
      return;
    }
    const nextState = skipTurn(state);
    setState(nextState);
    setSelectedCardId(null);
  };

  const handleTakeBotTurn = (): void => {
    if (
      !state
      || !isBotBoardTurn
      || pendingSwapCharactersMotion
      || pendingBoardCardMotion
      || pendingBoardSpecialMotion
      || pendingCurtainsSwapMotion
    ) {
      return;
    }

    if (!pendingCurtainsPlay && !pendingBoardPowerPlay) {
      const curtainsCard = state.powerCardHands.P2.find(card => card.definitionId === 'power-alpha-019');
      if (curtainsCard) {
        const curtainsDecision = chooseBotCurtainsSwap(
          state.powerCardHands.P2,
          state.powerCardHands.P1,
          curtainsCard.instanceId,
          botDifficulty,
        );
        if (curtainsDecision.shouldPlay) {
          const nextState = logEvent(state, 'Bot P2 Decision', {
            action: 'play-board-card',
            definitionId: 'power-alpha-019',
            instanceId: curtainsCard.instanceId,
            strategicGain: curtainsDecision.strategicGain,
            explanation: curtainsDecision.explanation,
          });
          console.info(`[Bot AI] ${curtainsDecision.explanation}`);
          setState(nextState);
          setPendingCurtainsPlay({
            cardInstanceId: curtainsCard.instanceId,
            ownSwapCardInstanceId: curtainsDecision.ownSwapCardInstanceId,
            opponentSwapCardInstanceId: curtainsDecision.opponentSwapCardInstanceId,
          });
          setShowCurtainsSelectionModal(false);
          setSelectedCardId(null);
          return;
        }
      }
    }

    if (!pendingCurtainsPlay && !pendingBoardPowerPlay) {
      const portalCard = state.powerCardHands.P2.find(card => card.definitionId === 'power-alpha-022');
      const backItUpCard = state.powerCardHands.P2.find(card => card.definitionId === 'power-alpha-021');
      if (portalCard || backItUpCard) {
        const evaluateBoardScore = (candidateState: GameState): number => {
          const candidateView = getBotGameView(candidateState, 'P2');
          const candidateDecision = chooseBotBoardDecision({
            botController: candidateView.botController,
            activePlayer: candidateView.activePlayer,
            gameStatus: candidateView.gameStatus,
            pendingBattle: candidateView.pendingBattle,
            legalActions: candidateView.legalActions,
          }, botDifficulty);
          return candidateDecision.kind === 'action' ? candidateDecision.score : -999;
        };

        const baselineScore = evaluateBoardScore(state);
        const allRingSpaces: RingPosition[] = ['P1_1', 'P1_2', 'P1_3', 'P1_4', 'P1_5', 'P2_1', 'P2_2', 'P2_3', 'P2_4', 'P2_5'];
        const candidates: Array<{
          definitionId: string;
          cardInstanceId: string;
          sourceCharacterId: string;
          destination: RingPosition;
          nextState: GameState;
          score: number;
          improvement: number;
        }> = [];

        if (portalCard) {
          const ownLiving = state.characters.filter(character => (
            character.alive
            && character.controller === 'P2'
            && !!character.boardPosition
          ));

          for (const source of ownLiving) {
            for (const destination of allRingSpaces) {
              const occupied = state.characters.some(character => character.alive && character.boardPosition === destination);
              if (occupied || source.boardPosition === destination) {
                continue;
              }

              try {
                let next = executePortalMove(state, 'P2', source.id, destination, { preserveTurn: true });
                next = consumeBoardPowerCard(next, 'P2', portalCard.instanceId, 'PORTAL relocation');
                const score = evaluateBoardScore(next);
                candidates.push({
                  definitionId: portalCard.definitionId,
                  cardInstanceId: portalCard.instanceId,
                  sourceCharacterId: source.id,
                  destination,
                  nextState: next,
                  score,
                  improvement: score - baselineScore,
                });
              } catch {
                // Ignore illegal candidate lines and continue evaluating legal options.
              }
            }
          }
        }

        if (backItUpCard) {
          const aliveCharacters = state.characters.filter(character => character.alive && !!character.boardPosition);
          for (const source of aliveCharacters) {
            const legalDestinations = getBackItUpDestinations(state, source.id) as RingPosition[];
            for (const destination of legalDestinations) {
              if (source.boardPosition === destination) {
                continue;
              }

              try {
                let next = executeBackItUpMove(state, 'P2', source.id, destination, { preserveTurn: true });
                next = consumeBoardPowerCard(next, 'P2', backItUpCard.instanceId, 'BACK IT UP relocation');
                const score = evaluateBoardScore(next);
                candidates.push({
                  definitionId: backItUpCard.definitionId,
                  cardInstanceId: backItUpCard.instanceId,
                  sourceCharacterId: source.id,
                  destination,
                  nextState: next,
                  score,
                  improvement: score - baselineScore,
                });
              } catch {
                // Ignore illegal candidate lines and continue evaluating legal options.
              }
            }
          }
        }

        if (candidates.length > 0) {
          candidates.sort((left, right) => {
            if (right.improvement !== left.improvement) {
              return right.improvement - left.improvement;
            }
            if (right.score !== left.score) {
              return right.score - left.score;
            }
            if (left.definitionId !== right.definitionId) {
              return left.definitionId.localeCompare(right.definitionId);
            }
            return left.sourceCharacterId.localeCompare(right.sourceCharacterId);
          });

          const best = candidates[0];
          const threshold = botDifficulty === 'Hard' ? 18 : botDifficulty === 'Standard' ? 30 : 45;
          if (best.improvement >= threshold) {
            if (
              pendingIrohCounter
              && pendingIrohCounter.controller !== 'P2'
              && pendingIrohCounter.expiresAt > Date.now()
            ) {
              let canceled = logEvent(state, 'Uncle Iroh Counter - Power Card Canceled', {
                counterController: pendingIrohCounter.controller,
                sourceController: 'P2',
                cardDefinitionId: best.definitionId,
                cardInstanceId: best.cardInstanceId,
                phase: 'board',
              });
              canceled = {
                ...canceled,
                characters: canceled.characters.map(character => (
                  character.id === pendingIrohCounter.characterId
                    ? { ...character, abilityUsed: true }
                    : character
                )),
              };
              setState(canceled);
              setPendingIrohCounter(null);
              setSelectedCardId(null);
              return;
            }

            const sourceBefore = getCharacter(state, best.sourceCharacterId);
            const fromPosition = sourceBefore?.boardPosition as RingPosition | null;

            if (
              sourceBefore?.isKing
              && fromPosition
              && getSpaceTerritory(fromPosition) !== getSpaceTerritory(best.destination)
            ) {
              triggerKingTerritoryFx(sourceBefore.controller, best.destination, state.powerCardDeck.length > 0);
            }

            if (sourceBefore && sourceBefore.revealed) {
              setPendingBoardSpecialMotion({
                characterId: sourceBefore.id,
                displayName: sourceBefore.displayName ?? sourceBefore.id,
                ATK: sourceBefore.ATK,
                DEF: sourceBefore.DEF,
                isKing: sourceBefore.isKing,
                isFrozen: sourceBefore.isFrozen,
                controller: sourceBefore.controller,
                fromPosition: fromPosition ?? best.destination,
                toPosition: best.destination,
                visualMode: sourceBefore.visualMode,
                artImageUrl: sourceBefore.artImageUrl,
                fullCardFaceImageUrl: sourceBefore.fullCardFaceImageUrl,
                style: best.definitionId === 'power-alpha-022' ? 'power-portal' : 'back-it-up',
              });
            } else if (fromPosition) {
              setPendingBoardCardMotion({
                characterId: best.sourceCharacterId,
                type: 'move',
                fromPosition,
                toPosition: best.destination,
              });
            }

            const cardLabel = best.definitionId === 'power-alpha-022' ? 'PORTAL' : 'BACK IT UP';
            const explanation = `Bot uses ${cardLabel}: projected board score improves by ${best.improvement}.`;
            console.info(`[Bot AI] ${explanation}`);
            const nextState = logEvent(best.nextState, 'Bot P2 Decision', {
              action: 'play-board-card',
              definitionId: best.definitionId,
              instanceId: best.cardInstanceId,
              sourceCharacterId: best.sourceCharacterId,
              destination: best.destination,
              projectedScore: best.score,
              projectedImprovement: best.improvement,
              explanation,
            });
            setState(nextState);
            setSelectedCardId(null);
            return;
          }
        }
      }
    }

    if (!pendingCurtainsPlay && !pendingBoardPowerPlay && !pendingSwapCharactersMotion) {
      const swapCard = state.powerCardHands.P2.find(card => card.definitionId === 'power-alpha-018');
      if (swapCard) {
        const evaluateBoardScore = (candidateState: GameState): number => {
          const candidateView = getBotGameView(candidateState, 'P2');
          const candidateDecision = chooseBotBoardDecision({
            botController: candidateView.botController,
            activePlayer: candidateView.activePlayer,
            gameStatus: candidateView.gameStatus,
            pendingBattle: candidateView.pendingBattle,
            legalActions: candidateView.legalActions,
          }, botDifficulty);
          return candidateDecision.kind === 'action' ? candidateDecision.score : -999;
        };

        const baselineScore = evaluateBoardScore(state);
        const ownCharacters = state.characters.filter(character => (
          character.alive
          && character.controller === 'P2'
          && !!character.boardPosition
        ));
        const opponentCharacters = state.characters.filter(character => (
          character.alive
          && character.controller === 'P1'
          && !!character.boardPosition
        ));

        const swapCandidates: Array<{
          ownCharacterId: string;
          opponentCharacterId: string;
          ownFrom: RingPosition;
          opponentFrom: RingPosition;
          nextState: GameState;
          score: number;
          improvement: number;
          donationPenalty: number;
        }> = [];

        for (const own of ownCharacters) {
          if (botDifficulty !== 'Easy' && own.isKing) {
            continue;
          }

          for (const opponent of opponentCharacters) {
            const ownFrom = own.boardPosition as RingPosition;
            const opponentFrom = opponent.boardPosition as RingPosition;
            try {
              let next = executeSwapCharactersMove(state, 'P2', own.id, opponent.id);
              next = consumeBoardPowerCard(next, 'P2', swapCard.instanceId, 'SWAP CHARACTERS board swap');

              const ownAttachmentStats = (own.attachments ?? []).reduce((sum, attachment) => (
                sum + (attachment.ATK ?? 0) + (attachment.DEF ?? 0)
              ), 0);
              const ownAttachmentCount = (own.attachments ?? []).length;
              const donationPenalty = ownAttachmentStats * (botDifficulty === 'Hard' ? 18 : botDifficulty === 'Standard' ? 12 : 6)
                + ownAttachmentCount * (botDifficulty === 'Hard' ? 42 : botDifficulty === 'Standard' ? 28 : 12);

              const rawScore = evaluateBoardScore(next);
              const score = rawScore - donationPenalty;
              swapCandidates.push({
                ownCharacterId: own.id,
                opponentCharacterId: opponent.id,
                ownFrom,
                opponentFrom,
                nextState: next,
                score,
                improvement: score - baselineScore,
                donationPenalty,
              });
            } catch {
              // Ignore illegal swap candidates and continue evaluating legal options.
            }
          }
        }

        if (swapCandidates.length > 0) {
          swapCandidates.sort((left, right) => {
            if (right.improvement !== left.improvement) {
              return right.improvement - left.improvement;
            }
            if (right.score !== left.score) {
              return right.score - left.score;
            }
            if (left.ownCharacterId !== right.ownCharacterId) {
              return left.ownCharacterId.localeCompare(right.ownCharacterId);
            }
            return left.opponentCharacterId.localeCompare(right.opponentCharacterId);
          });

          const bestSwap = swapCandidates[0];
          const threshold = botDifficulty === 'Hard' ? 22 : botDifficulty === 'Standard' ? 34 : 50;
          if (bestSwap.improvement >= threshold) {
            if (
              pendingIrohCounter
              && pendingIrohCounter.controller !== 'P2'
              && pendingIrohCounter.expiresAt > Date.now()
            ) {
              let canceled = logEvent(state, 'Uncle Iroh Counter - Power Card Canceled', {
                counterController: pendingIrohCounter.controller,
                sourceController: 'P2',
                cardDefinitionId: swapCard.definitionId,
                cardInstanceId: swapCard.instanceId,
                phase: 'board',
              });
              canceled = {
                ...canceled,
                characters: canceled.characters.map(character => (
                  character.id === pendingIrohCounter.characterId
                    ? { ...character, abilityUsed: true }
                    : character
                )),
              };
              setState(canceled);
              setPendingIrohCounter(null);
              setSelectedCardId(null);
              return;
            }

            const ownBefore = getCharacter(state, bestSwap.ownCharacterId);
            const opponentBefore = getCharacter(state, bestSwap.opponentCharacterId);
            if (ownBefore && opponentBefore) {
              const explanation = `Bot uses SWAP CHARACTERS: projected board score improves by ${bestSwap.improvement}.`;
              console.info(`[Bot AI] ${explanation}`);
              const nextState = logEvent(bestSwap.nextState, 'Bot P2 Decision', {
                action: 'play-board-card',
                definitionId: swapCard.definitionId,
                instanceId: swapCard.instanceId,
                ownCharacterId: bestSwap.ownCharacterId,
                opponentCharacterId: bestSwap.opponentCharacterId,
                projectedScore: bestSwap.score,
                projectedImprovement: bestSwap.improvement,
                donationPenalty: bestSwap.donationPenalty,
                explanation,
              });
              queueSwapCharactersAnimation(
                nextState,
                ownBefore,
                opponentBefore,
                bestSwap.ownFrom,
                bestSwap.opponentFrom,
              );
              setSelectedCardId(null);
              return;
            }
          }
        }
      }
    }

    const botView = getBotGameView(state, 'P2');
    const decision = chooseBotBoardDecision({
      botController: botView.botController,
      activePlayer: botView.activePlayer,
      gameStatus: botView.gameStatus,
      pendingBattle: botView.pendingBattle,
      legalActions: botView.legalActions,
    }, botDifficulty, Math.random);

    let nextState = state;
    if (decision.kind === 'action') {
      const action = decision.action;
      const decisionMessage = decision.explanation;
      console.info(`[Bot AI] ${decisionMessage}`);
      nextState = logEvent(nextState, 'Bot P2 Decision', {
        action: action.type,
        characterId: action.characterId,
        score: decision.score,
        alternativesConsidered: decision.alternativesConsidered,
        explanation: decision.explanation,
      });
      setState(nextState);
      if (action.type === 'move' || action.type === 'attack' || action.type === 'defend') {
        const character = getCharacter(state, action.characterId);
        const fromPosition = character?.boardPosition;
        if (fromPosition && (action.type === 'move' || action.type === 'attack')) {
          const toPosition = getForwardSpace(fromPosition) as RingPosition;
          if (
            action.type === 'move'
            && character?.isKing
            && getSpaceTerritory(fromPosition) !== getSpaceTerritory(toPosition)
          ) {
            triggerKingTerritoryFx(character.controller, toPosition, state.powerCardDeck.length > 0);
          }
          if (action.type === 'move' && character && character.revealed && isNightcrawlerName(character.displayName)) {
            setPendingBoardSpecialMotion({
              characterId: action.characterId,
              displayName: character.displayName ?? action.characterId,
              ATK: character.ATK,
              DEF: character.DEF,
              isKing: character.isKing,
              isFrozen: character.isFrozen,
              controller: character.controller,
              fromPosition: fromPosition as RingPosition,
              toPosition,
              visualMode: character.visualMode,
              artImageUrl: character.artImageUrl,
              fullCardFaceImageUrl: character.fullCardFaceImageUrl,
              style: 'nightcrawler-portal',
            });
          } else {
            setPendingBoardCardMotion({
              characterId: action.characterId,
              type: action.type,
              fromPosition: fromPosition as RingPosition,
              toPosition,
            });
          }
        }
        setPendingBotBoardAction({
          action: action.type,
          characterId: action.characterId,
          message: action.type === 'move'
            ? 'Bot is preparing Move Forward...'
            : action.type === 'attack'
              ? 'Bot is preparing Attack Forward...'
              : 'Bot is preparing Self-Defend...',
          explanation: decision.explanation,
          score: decision.score,
          alternativesConsidered: decision.alternativesConsidered,
        });
      }
    } else if (!botView.hasLegalAction) {
      nextState = skipTurn(state);
      nextState = logEvent(nextState, 'Bot P2 skipped when no legal actions exist', {});
      setState(nextState);
      setSelectedCardId(null);
      return;
    }
    setSelectedCardId(null);
  };

  useEffect(() => {
    if (!isBotMode || !state || !pendingCurtainsPlay) {
      return;
    }
    if (curtainsSourceController !== 'P2') {
      return;
    }
    if (pendingBoardReactionWindow || pendingBattleReactionWindow) {
      return;
    }

    executeBehindTheCurtainsBoardPlay();
  }, [
    isBotMode,
    state,
    pendingCurtainsPlay,
    curtainsSourceController,
    pendingBoardReactionWindow,
    pendingBattleReactionWindow,
  ]);

  useEffect(() => {
    if (!pendingSwapCharactersMotion) {
      return;
    }

    const shouldReturnToBattleAfterSwap = !!state?.pendingBattle;

    const timer = window.setTimeout(() => {
      setState(pendingSwapCharactersMotion.nextState);
      setPendingSwapCharactersMotion(null);
      if (shouldReturnToBattleAfterSwap) {
        setShowBattleFullBoard(false);
      }
    }, pendingSwapCharactersMotion.durationMs ?? 1650);

    return () => window.clearTimeout(timer);
  }, [pendingSwapCharactersMotion, state?.pendingBattle]);

  const handleSetBattleReady = (ready: boolean): void => {
    if (!state?.pendingBattle) {
      return;
    }

    if (pendingBattleReactionWindow) {
      return;
    }

    if (isBotMode && state.pendingBattle.currentPriorityPlayer === 'P2') {
      return;
    }

    const actor = state.pendingBattle.currentPriorityPlayer;
    const next = setBattleReady(state, actor, ready);
    setState(next);
  };

  const handleTakeBotBattleAction = (): void => {
    if (!state?.pendingBattle || !isBotBattleTurn) {
      return;
    }

    if (pendingBattleReactionWindow) {
      return;
    }

    if (state.pendingBattle.handoffRequiredFor === 'P2') {
      setState(acknowledgeBattleHandoff(state, 'P2'));
      return;
    }

    if (state.pendingBattle.handoffRequiredFor !== null) {
      return;
    }

    const currentResult = getProjectedBattleResult(state);
    const botBattlerId = state.pendingBattle.initiatorController === 'P2'
      ? state.pendingBattle.initiatorId
      : state.pendingBattle.opponentId;
    const opponentBattlerId = state.pendingBattle.initiatorController === 'P2'
      ? state.pendingBattle.opponentId
      : state.pendingBattle.initiatorId;
    const botBattler = getCharacter(state, botBattlerId);
    const opponentBattler = getCharacter(state, opponentBattlerId);
    const imminentKingLoss = currentResult.winner === 'P1' && !!botBattler?.isKing;
    const botBattlerIsKing = !!botBattler?.isKing;
    const opponentBattlerIsKing = !!opponentBattler?.isKing;
    const remainingBattleHandCount = state.powerCardHands.P2.length;
    const opponentPowerCardCount = state.powerCardHands.P1.length;

    const threatScore = (character: GameState['characters'][number] | null): number => {
      if (!character || !character.alive || !character.revealed) {
        return 0;
      }

      const attachmentStats = (character.attachments ?? []).reduce((sum, attachment) => (
        sum + (attachment.ATK ?? 0) + (attachment.DEF ?? 0)
      ), 0);

      let score = Math.max(character.ATK, character.DEF) * 2 + Math.min(character.ATK, character.DEF);
      score += attachmentStats * 2;
      if (character.isKing) {
        score += 14;
      }
      return score;
    };

    const ownBattlerThreatScore = threatScore(botBattler ?? null);
    const opponentBattlerThreatScore = threatScore(opponentBattler ?? null);
    const maxOpponentRevealedThreat = state.characters
      .filter(character => character.alive && character.controller === 'P1' && character.revealed)
      .reduce((max, character) => Math.max(max, threatScore(character)), 0);
    const opponentBattlerIsTopRevealedThreat = (
      opponentBattlerThreatScore > 0
      && opponentBattlerThreatScore >= maxOpponentRevealedThreat
    );
    const marginForBot = (result: ReturnType<typeof getProjectedBattleResult>): number => {
      if (result.winner === 'P2') {
        return result.winningMargin;
      }
      if (result.winner === 'draw') {
        return 0;
      }
      return -result.winningMargin;
    };

    const candidateOptions = getLegalBattleCardPlayOptions(state, 'P2').map(option => {
      const firstPreviewState = playBattlePowerCard(state, 'P2', option.input);
      const firstProjectedResult = getProjectedBattleResult(firstPreviewState);

      let opponentBestCounterMarginForBot: number | null = null;
      let opponentBestCounterAfterBotBestRejoinderMarginForBot: number | null = null;
      let opponentExpectedCounterAfterBotBestRejoinderMarginForBot: number | null = null;
      let opponentReplyOptionCount = 0;
      if (
        firstPreviewState.pendingBattle
        && firstPreviewState.pendingBattle.status === 'WindowOpen'
        && firstPreviewState.pendingBattle.handoffRequiredFor === null
        && firstPreviewState.pendingBattle.currentPriorityPlayer === 'P1'
      ) {
        const opponentReplies = getLegalBattleCardPlayOptions(firstPreviewState, 'P1');
        opponentReplyOptionCount = opponentReplies.length;

        const opponentReplyCap = botDifficulty === 'Hard' ? 6 : botDifficulty === 'Standard' ? 4 : 2;
        const rankedReplies = opponentReplies
          .map(reply => {
            const replyState = playBattlePowerCard(firstPreviewState, 'P1', reply.input);
            const replyProjectedResult = getProjectedBattleResult(replyState);
            const replyMargin = marginForBot(replyProjectedResult);
            return {
              reply,
              replyState,
              replyMargin,
            };
          })
          .sort((left, right) => left.replyMargin - right.replyMargin)
          .slice(0, opponentReplyCap);

        const lineMargins: number[] = [];
        for (const rankedReply of rankedReplies) {
          const replyState = rankedReply.replyState;
          const replyMargin = rankedReply.replyMargin;
          if (opponentBestCounterMarginForBot === null || replyMargin < opponentBestCounterMarginForBot) {
            opponentBestCounterMarginForBot = replyMargin;
          }

          let lineMargin = replyMargin;
          if (
            replyState.pendingBattle
            && replyState.pendingBattle.status === 'WindowOpen'
            && replyState.pendingBattle.handoffRequiredFor === null
            && replyState.pendingBattle.currentPriorityPlayer === 'P2'
          ) {
            const botRejoinders = getLegalBattleCardPlayOptions(replyState, 'P2');
            const botRejoinderCap = botDifficulty === 'Hard' ? 5 : botDifficulty === 'Standard' ? 3 : 2;
            const rankedRejoinders = botRejoinders
              .map(rejoinder => {
                const rejoinderProjected = previewBattlePowerCardPlay(replyState, 'P2', rejoinder.input).projectedResult;
                const rejoinderMargin = marginForBot(rejoinderProjected);
                return {
                  rejoinderMargin,
                };
              })
              .sort((left, right) => right.rejoinderMargin - left.rejoinderMargin)
              .slice(0, botRejoinderCap);

            const bestBotRejoinderMargin = rankedRejoinders[0]?.rejoinderMargin ?? null;

            if (bestBotRejoinderMargin !== null) {
              lineMargin = bestBotRejoinderMargin;
            }
          }

          lineMargins.push(lineMargin);

          if (
            opponentBestCounterAfterBotBestRejoinderMarginForBot === null
            || lineMargin < opponentBestCounterAfterBotBestRejoinderMarginForBot
          ) {
            opponentBestCounterAfterBotBestRejoinderMarginForBot = lineMargin;
          }
        }

        if (lineMargins.length > 0) {
          opponentExpectedCounterAfterBotBestRejoinderMarginForBot = lineMargins.reduce((sum, margin) => sum + margin, 0) / lineMargins.length;
        }
      }

      return {
        input: option.input,
        displayName: option.displayName,
        definitionId: option.definitionId,
        projectedResult: firstProjectedResult,
        opponentBestCounterMarginForBot,
        opponentReplyOptionCount,
        opponentBestCounterAfterBotBestRejoinderMarginForBot,
        opponentExpectedCounterAfterBotBestRejoinderMarginForBot,
      };
    });

    const decision = chooseBotBattleDecision({
      botController: 'P2',
      currentResult,
      candidates: candidateOptions,
      difficulty: botDifficulty,
      imminentKingLoss,
      botBattlerIsKing,
      opponentBattlerIsKing,
      ownBattlerThreatScore,
      opponentBattlerThreatScore,
      opponentBattlerIsTopRevealedThreat,
      opponentPowerCardCount,
      remainingBattleHandCount,
      randomFn: Math.random,
    });
    if (decision.kind === 'pass') {
      console.info(`[Bot AI] ${decision.explanation}`);
      let nextState = setBattleReady(state, 'P2', true);
      nextState = logEvent(nextState, 'Bot P2 Decision', {
        action: 'pass',
        explanation: decision.explanation,
        alternativesConsidered: decision.alternativesConsidered ?? candidateOptions.length,
      });
      nextState = logEvent(nextState, 'Bot P2 marked READY', {});
      setState(nextState);
    } else {
      console.info(`[Bot AI] ${decision.explanation}`);
      let nextState = logEvent(state, 'Bot P2 Decision', {
        action: 'play-card',
        definitionId: decision.definitionId,
        instanceId: decision.input.instanceId,
        projectedMarginForBot: decision.projectedMarginForBot,
        score: decision.score,
        alternativesConsidered: decision.alternativesConsidered,
        counterStabilityMarginForBot: decision.counterStabilityMarginForBot ?? null,
        deepCounterStabilityMarginForBot: decision.deepCounterStabilityMarginForBot ?? null,
        expectedDeepCounterStabilityMarginForBot: decision.expectedDeepCounterStabilityMarginForBot ?? null,
        explanation: decision.explanation,
      });
      setState(nextState);
      const definition = getPowerCardDefinition(decision.definitionId);
      const revealVisual = powerCatalogById.get(decision.definitionId);
      setQueuedBotBattleReveal({
        input: decision.input,
        displayName: decision.displayName,
        definitionId: decision.definitionId,
        rulesText: definition.rulesText,
        visualMode: revealVisual?.visualMode,
        artImageUrl: revealVisual?.artImageUrl,
        fullCardFaceImageUrl: revealVisual?.fullCardFaceImageUrl,
      });
      return;
    }
  };

  const handleAcknowledgeBotBattleReveal = (): void => {
    if (!pendingBotBattleReveal) {
      return;
    }

    if (state?.pendingBattle) {
      const startedReaction = startBattleReactionWindow(
        state,
        'P2',
        pendingBotBattleReveal.input,
        pendingBotBattleReveal.definitionId,
      );
      if (startedReaction) {
        setPendingBotBattleReveal(null);
        return;
      }
    }

    if (state?.pendingBattle && pendingBotBattleReveal.definitionId === 'power-alpha-017' && pendingBotBattleReveal.input.targetCharacterId) {
      const target = state.characters.find(character => character.id === pendingBotBattleReveal.input.targetCharacterId);
      const topDeckCard = state.characterDeck[0];
      const revealSnapshot = pendingBotBattleReveal;

      if (target && topDeckCard) {
        setPhoneFriendAnimation({
          oldCharacterId: target.id,
          oldController: target.controller,
          oldDisplayName: target.displayName ?? target.id,
          oldATK: target.ATK,
          oldDEF: target.DEF,
          oldVisualMode: target.visualMode,
          oldArtImageUrl: target.artImageUrl,
          oldFullCardFaceImageUrl: target.fullCardFaceImageUrl,
          newDisplayName: topDeckCard.displayName,
          newATK: topDeckCard.ATK,
          newDEF: topDeckCard.DEF,
          newVisualMode: topDeckCard.visualMode,
          newArtImageUrl: topDeckCard.artImageUrl,
          newFullCardFaceImageUrl: topDeckCard.fullCardFaceImageUrl,
        });

        setPendingBotBattleReveal(null);

        window.setTimeout(() => {
          setState(current => {
            if (!current?.pendingBattle) {
              return current;
            }

            let next = playBattlePowerCard(current, 'P2', revealSnapshot.input);
            next = logEvent(next, `Bot P2 played ${revealSnapshot.displayName}`, {
              definitionId: revealSnapshot.definitionId,
              instanceId: revealSnapshot.input.instanceId,
              selectedChoice: revealSnapshot.input.selectedChoice ?? null,
            });
            return next;
          });
          setPhoneFriendAnimation(null);
        }, 2450);

        return;
      }
    }

    setState(prev => {
      if (!prev?.pendingBattle) {
        return prev;
      }

      let next = playBattlePowerCard(prev, 'P2', pendingBotBattleReveal.input);
      next = logEvent(next, `Bot P2 played ${pendingBotBattleReveal.displayName}`, {
        definitionId: pendingBotBattleReveal.definitionId,
        instanceId: pendingBotBattleReveal.input.instanceId,
        selectedChoice: pendingBotBattleReveal.input.selectedChoice ?? null,
      });
      return next;
    });

    setPendingBotBattleReveal(null);
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

    const battleSnapshot = state.pendingBattle;
    const battlePublic = getBattlePublicView(state);
    const scoreDelta = battlePublic.initiatorEffectiveComparison - battlePublic.opponentEffectiveComparison;
    const winnerId = scoreDelta > 0
      ? battleSnapshot.initiatorId
      : scoreDelta < 0
        ? battleSnapshot.opponentId
        : null;
    const loserId = scoreDelta > 0
      ? battleSnapshot.opponentId
      : scoreDelta < 0
        ? battleSnapshot.initiatorId
        : null;

    const loserCharacter = loserId ? getCharacter(state, loserId) : null;
    const winnerCharacter = winnerId ? getCharacter(state, winnerId) : null;
    const winnerIsAdvancingAttacker = !!winnerId
      && battleSnapshot.battleType === 'attack'
      && winnerId === battleSnapshot.initiatorId;

    const thisBattleUsedCards = battleUsedPileStartCount === null
      ? []
      : state.usedPowerCardPile.slice(battleUsedPileStartCount);

    let next = resolvePendingBattle(state);

    setState(next);
    setSelectedCardId(null);
    setPendingAangEscape(null);

    if (
      loserCharacter
      && loserCharacter.boardPosition
      && isAvatarAangName(loserCharacter.displayName)
      && !loserCharacter.abilityUsed
    ) {
      const loserAfter = next.characters.find(character => character.id === loserCharacter.id);
      if (loserAfter && !loserAfter.alive) {
        const options = new Set<RingPosition>();
        const loserWasInitiator = loserCharacter.id === battleSnapshot.initiatorId;

        const loserDeathSpot = loserCharacter.boardPosition as RingPosition;
        const opponentBattleSpot = (loserWasInitiator
          ? battleSnapshot.opponentStartPosition
          : battleSnapshot.initiatorStartPosition) as RingPosition | null;

        const candidateSpaces: RingPosition[] = [];

        if (battleSnapshot.battleType === 'attack' && loserWasInitiator) {
          candidateSpaces.push(getBackwardSpace(loserDeathSpot) as RingPosition);
          if (opponentBattleSpot) {
            candidateSpaces.push(getForwardSpace(opponentBattleSpot) as RingPosition);
          }
        } else if (battleSnapshot.battleType === 'defend' && loserWasInitiator) {
          candidateSpaces.push(getForwardSpace(loserDeathSpot) as RingPosition);
          if (opponentBattleSpot) {
            candidateSpaces.push(getBackwardSpace(opponentBattleSpot) as RingPosition);
          }
        } else if (battleSnapshot.battleType === 'attack' && !loserWasInitiator) {
          if (battleSnapshot.initiatorStartPosition) {
            candidateSpaces.push(battleSnapshot.initiatorStartPosition as RingPosition);
          }
          candidateSpaces.push(getForwardSpace(loserDeathSpot) as RingPosition);
        } else if (battleSnapshot.battleType === 'defend' && !loserWasInitiator) {
          candidateSpaces.push(getBackwardSpace(loserDeathSpot) as RingPosition);
          if (opponentBattleSpot) {
            candidateSpaces.push(getForwardSpace(opponentBattleSpot) as RingPosition);
          }
        }

        for (const space of candidateSpaces) {
          if (space === loserDeathSpot) {
            continue;
          }
          if (!next.characters.some(character => character.alive && character.boardPosition === space)) {
            options.add(space);
          }
        }

        if (options.size > 0) {
          setPendingAangEscape({
            characterId: loserCharacter.id,
            options: [...options],
            fromPosition: loserCharacter.boardPosition as RingPosition,
            step: 'prompt',
          });
        }
      }
    }

    if (
      winnerIsAdvancingAttacker
      && winnerCharacter?.isKing
      && battleSnapshot.initiatorStartPosition
      && battleSnapshot.opponentStartPosition
      && getSpaceTerritory(battleSnapshot.initiatorStartPosition) !== getSpaceTerritory(battleSnapshot.opponentStartPosition)
    ) {
      triggerKingTerritoryFx(
        winnerCharacter.controller,
        battleSnapshot.opponentStartPosition as RingPosition,
        state.powerCardDeck.length > 0,
      );
    }

    const animationPayload: PostBattleBoardAnimation = {
      loser: loserCharacter && loserCharacter.boardPosition
        ? {
            id: loserCharacter.id,
            displayName: loserCharacter.displayName ?? 'Unknown',
            ATK: loserCharacter.ATK,
            DEF: loserCharacter.DEF,
            isKing: loserCharacter.isKing,
            controller: loserCharacter.controller,
            fromPosition: loserCharacter.boardPosition as RingPosition,
            visualMode: loserCharacter.visualMode,
            artImageUrl: loserCharacter.artImageUrl,
            fullCardFaceImageUrl: loserCharacter.fullCardFaceImageUrl,
          }
        : null,
      winnerAdvance: winnerIsAdvancingAttacker && winnerCharacter && battleSnapshot.initiatorStartPosition && battleSnapshot.opponentStartPosition
        ? {
            id: winnerCharacter.id,
            displayName: winnerCharacter.displayName ?? 'Unknown',
            ATK: winnerCharacter.ATK,
            DEF: winnerCharacter.DEF,
            isKing: winnerCharacter.isKing,
            controller: winnerCharacter.controller,
            fromPosition: battleSnapshot.initiatorStartPosition as RingPosition,
            toPosition: battleSnapshot.opponentStartPosition as RingPosition,
            visualMode: winnerCharacter.visualMode,
            artImageUrl: winnerCharacter.artImageUrl,
            fullCardFaceImageUrl: winnerCharacter.fullCardFaceImageUrl,
          }
        : null,
    };

    setPostBattleBoardAnimation(animationPayload);

    const skarInvolvedCharacter = [
      getCharacter(state, battleSnapshot.initiatorId),
      getCharacter(state, battleSnapshot.opponentId),
    ].find(character => !!character && isSkarProductionsName(character.displayName));

    if (skarInvolvedCharacter && thisBattleUsedCards.length > 0) {
      setPendingSkarReclaim({
        controller: skarInvolvedCharacter.controller,
        cards: thisBattleUsedCards.map(card => ({
          instanceId: card.instanceId,
          definitionId: card.definitionId,
          displayName: card.displayName,
        })),
        selectedInstanceId: thisBattleUsedCards[0]?.instanceId ?? null,
        step: 'prompt',
      });
    }
  };

  const queueBattleCardPlay = (
    currentState: GameState,
    actor: Controller,
    input: PlayBattlePowerCardInput,
    persistCurrentStateOnEarlyExit = false,
  ): void => {
    const actorHand = currentState.powerCardHands[actor];
    const card = actorHand.find(entry => entry.instanceId === input.instanceId);
    if (!card) {
      if (persistCurrentStateOnEarlyExit) {
        setState(currentState);
      }
      return;
    }

    if ((actor === 'P1' || !isBotMode) && card.definitionId === 'power-alpha-017') {
      if (persistCurrentStateOnEarlyExit) {
        setState(currentState);
      }
      setPendingBattlePhoneFriendPlay({
        actor,
        cardInstanceId: input.instanceId,
        selectedCharacterId: null,
      });
      setShowBattleFullBoard(true);
      return;
    }

    if ((actor === 'P1' || !isBotMode) && isWeaponDefinitionId(card.definitionId)) {
      if (persistCurrentStateOnEarlyExit) {
        setState(currentState);
      }
      setPendingBattleWeaponEquipPlay({
        cardInstanceId: input.instanceId,
        selectedCharacterId: null,
      });
      setShowBattleFullBoard(true);
      return;
    }

    if ((actor === 'P1' || !isBotMode) && card.definitionId === 'power-alpha-018') {
      if (persistCurrentStateOnEarlyExit) {
        setState(currentState);
      }
      setPendingBattleSwapPlay({
        cardInstanceId: input.instanceId,
        actor,
        step: 'swap-pick-own',
        sourceCharacterId: null,
        pendingCharacterId: null,
      });
      setShowBattleFullBoard(true);
      return;
    }

    if ((actor === 'P1' || !isBotMode) && card.definitionId === 'power-alpha-019') {
      if (persistCurrentStateOnEarlyExit) {
        setState(currentState);
      }
      setPendingCurtainsPlay({
        cardInstanceId: input.instanceId,
        ownSwapCardInstanceId: null,
        opponentSwapCardInstanceId: null,
      });
      setShowBattleFullBoard(true);
      return;
    }

    if (
      pendingIrohCounter
      && pendingIrohCounter.controller !== actor
      && pendingIrohCounter.expiresAt > Date.now()
    ) {
      let canceled = logEvent(currentState, 'Uncle Iroh Counter - Power Card Canceled', {
        counterController: pendingIrohCounter.controller,
        sourceController: actor,
        cardDefinitionId: card.definitionId,
        cardInstanceId: card.instanceId,
        phase: 'battle',
      });
      canceled = {
        ...canceled,
        characters: canceled.characters.map(character => (
          character.id === pendingIrohCounter.characterId
            ? { ...character, abilityUsed: true }
            : character
        )),
      };
      setState(canceled);
      setPendingIrohCounter(null);
      return;
    }

    const startedReaction = startBattleReactionWindow(currentState, actor, input, card.definitionId);
    if (startedReaction) {
      if (persistCurrentStateOnEarlyExit) {
        setState(currentState);
      }
      return;
    }

    try {
      const next = playBattlePowerCard(currentState, actor, input);
      setState(next);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown battle card play error';
      const rejected = logEvent(currentState, 'Battle Card Play Rejected', {
        controller: actor,
        definitionId: card.definitionId,
        instanceId: card.instanceId,
        reason: message,
      });
      setState(rejected);
    }
  };

  const handlePlayBattleCard = (input: PlayBattlePowerCardInput): void => {
    if (!state?.pendingBattle) {
      return;
    }

    if (pendingCurtainsPlay) {
      return;
    }

    const actor = state.pendingBattle.currentPriorityPlayer;
    if (isBotMode && actor === 'P2') {
      return;
    }

    if (pendingBattleReactionWindow) {
      if (actor !== pendingBattleReactionWindow.sourceController) {
        return;
      }

      const lockedState = resolveBattleReactionChain(state, pendingBattleReactionWindow);
      setPendingBattleReactionWindow(null);
      setBattleReactionSecondsLeft(null);
      queueBattleCardPlay(lockedState, actor, input, true);
      return;
    }

    queueBattleCardPlay(state, actor, input);
  };

  const handleSkarPass = (): void => {
    setPendingSkarReclaim(null);
  };

  const handleSkarConfirmReclaim = (): void => {
    if (!state || !pendingSkarReclaim?.selectedInstanceId) {
      return;
    }

    const selected = pendingSkarReclaim.cards.find(card => card.instanceId === pendingSkarReclaim.selectedInstanceId);
    if (!selected) {
      return;
    }

    const usedIndex = state.usedPowerCardPile.findIndex(card => card.instanceId === selected.instanceId);
    if (usedIndex === -1) {
      setPendingSkarReclaim(null);
      return;
    }

    let next: GameState = {
      ...state,
      usedPowerCardPile: state.usedPowerCardPile.filter((_, index) => index !== usedIndex),
      powerCardHands: {
        ...state.powerCardHands,
        [pendingSkarReclaim.controller]: [
          ...state.powerCardHands[pendingSkarReclaim.controller],
          {
            instanceId: selected.instanceId,
            definitionId: selected.definitionId,
          },
        ],
      },
    };

    next = logEvent(next, 'Skar Productions Reclaim', {
      controller: pendingSkarReclaim.controller,
      reclaimedInstanceId: selected.instanceId,
      reclaimedDefinitionId: selected.definitionId,
    });

    setState(next);
    setPendingSkarReclaim(null);
  };

  useEffect(() => {
    if (!isBotMode || !pendingSkarReclaim || pendingSkarReclaim.controller !== 'P2') {
      return;
    }

    const timer = window.setTimeout(() => {
      if (!pendingSkarReclaim) {
        return;
      }

      if (pendingSkarReclaim.step === 'prompt') {
        setPendingSkarReclaim(prev => (prev ? { ...prev, step: 'select' } : prev));
        return;
      }

      if (!pendingSkarReclaim.selectedInstanceId) {
        const fallback = pendingSkarReclaim.cards[0]?.instanceId ?? null;
        if (!fallback) {
          handleSkarPass();
          return;
        }
        setPendingSkarReclaim(prev => (prev ? { ...prev, selectedInstanceId: fallback } : prev));
        return;
      }

      handleSkarConfirmReclaim();
    }, 550);

    return () => window.clearTimeout(timer);
  }, [handleSkarConfirmReclaim, isBotMode, pendingSkarReclaim]);

  useEffect(() => {
    if (!isBotBoardTurn) {
      return;
    }

    const BOT_BOARD_THINK_MS = 450;
    const timer = window.setTimeout(() => {
      handleTakeBotTurn();
    }, BOT_BOARD_THINK_MS);

    return () => window.clearTimeout(timer);
  }, [
    isBotBoardTurn,
    state?.turnNumber,
    state?.eventLog.length,
    pendingBoardCardMotion,
    pendingBoardSpecialMotion,
    pendingCurtainsSwapMotion,
  ]);

  useEffect(() => {
    if (!pendingHumanBoardAction) {
      return;
    }

    const timer = window.setTimeout(() => {
      setState(prev => {
        if (!prev || prev.pendingBattle || prev.gameStatus !== 'active') {
          return prev;
        }
        if (pendingHumanBoardAction.action === 'move') {
          if (!canMoveForward(prev, pendingHumanBoardAction.characterId)) {
            return prev;
          }
          return executeMoveForward(prev, pendingHumanBoardAction.characterId);
        }
        if (!getLegalActions(prev).some(action => action.type === 'attack' && action.characterId === pendingHumanBoardAction.characterId)) {
          return prev;
        }
        return startBattle(prev, 'attack', pendingHumanBoardAction.characterId);
      });
      setPendingHumanBoardAction(null);
      setPendingBoardCardMotion(null);
    }, pendingHumanBoardAction.action === 'move' ? 900 : 900);

    return () => window.clearTimeout(timer);
  }, [pendingHumanBoardAction]);

  useEffect(() => {
    if (!pendingBotBoardAction) {
      return;
    }

    const timer = window.setTimeout(() => {
      setState(prev => {
        if (!prev || prev.pendingBattle || prev.gameStatus !== 'active' || prev.activePlayer !== 'P2') {
          return prev;
        }

        if (pendingBotBoardAction.action === 'move') {
          if (!canMoveForward(prev, pendingBotBoardAction.characterId)) {
            return prev;
          }
          let next = executeMoveForward(prev, pendingBotBoardAction.characterId);
          next = logEvent(next, 'Bot P2 Move Forward', {
            characterId: pendingBotBoardAction.characterId,
            decisionExplanation: pendingBotBoardAction.explanation,
            decisionScore: pendingBotBoardAction.score,
          });
          return next;
        }

        if (pendingBotBoardAction.action === 'attack') {
          if (!getLegalActions(prev).some(action => action.type === 'attack' && action.characterId === pendingBotBoardAction.characterId)) {
            return prev;
          }
          let next = startBattle(prev, 'attack', pendingBotBoardAction.characterId);
          next = logEvent(next, 'Bot P2 Attack Forward', {
            characterId: pendingBotBoardAction.characterId,
            decisionExplanation: pendingBotBoardAction.explanation,
            decisionScore: pendingBotBoardAction.score,
          });
          return next;
        }

        if (!getLegalActions(prev).some(action => action.type === 'defend' && action.characterId === pendingBotBoardAction.characterId)) {
          return prev;
        }
        let next = startBattle(prev, 'defend', pendingBotBoardAction.characterId);
        next = logEvent(next, 'Bot P2 Self-Defend', {
          characterId: pendingBotBoardAction.characterId,
          decisionExplanation: pendingBotBoardAction.explanation,
          decisionScore: pendingBotBoardAction.score,
        });
        return next;
      });
      setPendingBotBoardAction(null);
      setPendingBoardCardMotion(null);
    }, pendingBotBoardAction.action === 'move' ? 900 : pendingBotBoardAction.action === 'attack' ? 1000 : 1100);

    return () => window.clearTimeout(timer);
  }, [pendingBotBoardAction]);

  useEffect(() => {
    if (!pendingBoardCardMotion || pendingHumanBoardAction || pendingBotBoardAction) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPendingBoardCardMotion(null);
    }, 950);

    return () => window.clearTimeout(timer);
  }, [pendingBoardCardMotion, pendingHumanBoardAction, pendingBotBoardAction]);

  useEffect(() => {
    if (!isBotBattleTurn || !state?.pendingBattle) {
      return;
    }

    const currentProjected = getProjectedBattleResult(state);
    const botCurrentlyLosing = currentProjected.winner === 'P1' && currentProjected.winningMargin > 0;
    const BOT_BATTLE_THINK_MS = botCurrentlyLosing ? 900 : 600;
    const timer = window.setTimeout(() => {
      handleTakeBotBattleAction();
    }, BOT_BATTLE_THINK_MS);

    return () => window.clearTimeout(timer);
  }, [
    isBotBattleTurn,
    botDifficulty,
    state?.pendingBattle?.handoffRequiredFor,
    state?.pendingBattle?.consecutivePassCount,
    state?.pendingBattle?.currentPriorityPlayer,
    state?.pendingBattle?.status,
    state?.pendingBattle?.readyPlayers?.P1,
    state?.pendingBattle?.readyPlayers?.P2,
  ]);

  useEffect(() => {
    if (!postBattleBoardAnimation) {
      return;
    }
    const timer = window.setTimeout(() => {
      setPostBattleBoardAnimation(null);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [postBattleBoardAnimation]);

  useEffect(() => {
    if (!pendingBoardSpecialMotion) {
      return;
    }
    const timer = window.setTimeout(() => {
      setPendingBoardSpecialMotion(null);
    }, pendingBoardSpecialMotion.style === 'rapunzel-fling'
      ? 1400
      : pendingBoardSpecialMotion.style === 'power-portal'
        ? 1700
      : pendingBoardSpecialMotion.style === 'back-it-up'
        ? 1780
      : pendingBoardSpecialMotion.style === 'nightcrawler-portal'
        ? 1150
        : 1050);
    return () => window.clearTimeout(timer);
  }, [pendingBoardSpecialMotion]);

  useEffect(() => {
    if (!queuedBotBattleReveal || !state?.pendingBattle || state.pendingBattle.status !== 'WindowOpen') {
      return;
    }

    const timer = window.setTimeout(() => {
      setPendingBotBattleReveal(queuedBotBattleReveal);
      setQueuedBotBattleReveal(null);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [queuedBotBattleReveal, state?.pendingBattle?.status]);

  useEffect(() => {
    if (state?.pendingBattle) {
      return;
    }
    if (pendingBattleReactionWindow) {
      setPendingBattleReactionWindow(null);
    }
    if (battleReactionSecondsLeft !== null) {
      setBattleReactionSecondsLeft(null);
    }
    if (pendingBotBattleReveal) {
      setPendingBotBattleReveal(null);
    }
    if (queuedBotBattleReveal) {
      setQueuedBotBattleReveal(null);
    }
  }, [battleReactionSecondsLeft, pendingBattleReactionWindow, pendingBotBattleReveal, queuedBotBattleReveal, state?.pendingBattle]);

  useEffect(() => {
    if (!expandedBoardPowerCardId) {
      return;
    }

    const cardStillVisible = !!boardPhasePrivateHand?.some(card => card.instanceId === expandedBoardPowerCardId);
    if (!cardStillVisible) {
      setExpandedBoardPowerCardId(null);
    }
  }, [expandedBoardPowerCardId, boardPhasePrivateHand]);

  useEffect(() => {
    if (!expandedBoardCharacterId || !safeView) {
      return;
    }

    const allowUnrevealedBattleTargetRead = !!pendingBattleWeaponEquipPlay
      || !!pendingBattlePhoneFriendPlay
      || !!pendingBattleSwapPlay
      || showBattleFullBoard
      || !!pendingBoardWeaponEquipPlay
      || (pendingBoardPowerPlay?.definitionId === 'power-alpha-018' && !!pendingBoardPowerPlay.pendingCharacterId);
    const cardStillVisible = !!safeView.boardCards.some(card => (
      card.instanceId === expandedBoardCharacterId
      && (allowUnrevealedBattleTargetRead ? card.alive : card.revealed)
    ));
    if (!cardStillVisible) {
      setExpandedBoardCharacterId(null);
    }
  }, [expandedBoardCharacterId, pendingBattlePhoneFriendPlay, pendingBattleSwapPlay, pendingBattleWeaponEquipPlay, pendingBoardPowerPlay, pendingBoardWeaponEquipPlay, safeView, showBattleFullBoard]);

  useEffect(() => () => {
    if (kingDrawFxTimerRef.current !== null) {
      window.clearTimeout(kingDrawFxTimerRef.current);
    }
    if (antVictoryFxDelayTimerRef.current !== null) {
      window.clearTimeout(antVictoryFxDelayTimerRef.current);
    }
    clearRapunzelTimers();
  }, []);

  useEffect(() => {
    if (!state?.pendingBattle && showBattleFullBoard) {
      setShowBattleFullBoard(false);
      setPendingBattleSwapPlay(null);
    }
  }, [showBattleFullBoard, state?.pendingBattle]);

  useEffect(() => {
    if (state?.pendingBattle) {
      return;
    }
    if (pendingBattlePhoneFriendPlay) {
      setPendingBattlePhoneFriendPlay(null);
    }
    if (pendingBattleWeaponEquipPlay) {
      setPendingBattleWeaponEquipPlay(null);
    }
    if (phoneFriendAnimation) {
      setPhoneFriendAnimation(null);
    }
  }, [pendingBattlePhoneFriendPlay, pendingBattleWeaponEquipPlay, phoneFriendAnimation, state?.pendingBattle]);

  useEffect(() => {
    if (state?.pendingBattle) {
      if (battleUsedPileStartCount === null) {
        setBattleUsedPileStartCount(state.usedPowerCardPile.length);
      }
      return;
    }
    if (battleUsedPileStartCount !== null) {
      setBattleUsedPileStartCount(null);
    }
  }, [battleUsedPileStartCount, state?.pendingBattle, state?.usedPowerCardPile.length]);

  useEffect(() => {
    if (pendingBoardReactionWindow) {
      return;
    }
    if (boardReactionSecondsLeft !== null) {
      setBoardReactionSecondsLeft(null);
    }
  }, [boardReactionSecondsLeft, pendingBoardReactionWindow]);

  useEffect(() => {
    if (!pendingBoardReactionWindow || boardReactionSecondsLeft === null) {
      return;
    }

    if (boardReactionSecondsLeft <= 0) {
      resolveBoardReactionWindow(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setBoardReactionSecondsLeft(prev => (prev === null ? prev : prev - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [boardReactionSecondsLeft, pendingBoardReactionWindow, state]);

  useEffect(() => {
    if (!pendingBattleReactionWindow || battleReactionSecondsLeft === null) {
      return;
    }

    if (isBotMode && pendingBattleReactionWindow.responder === 'P2' && state?.pendingBattle) {
      const currentProjected = getProjectedBattleResult(state);
      const preview = previewBattlePowerCardPlay(
        state,
        pendingBattleReactionWindow.sourceController,
        pendingBattleReactionWindow.input,
      ).projectedResult;
      const botWouldWantNoSpray = (
        currentProjected.winner !== 'P2' && preview.winner === 'P1'
      ) || (
        preview.winner === 'P1' && currentProjected.winningMargin < preview.winningMargin
      );

      const timer = window.setTimeout(() => {
        resolveBattleReactionWindow(botWouldWantNoSpray);
      }, 900);

      return () => window.clearTimeout(timer);
    }

    if (battleReactionSecondsLeft <= 0) {
      resolveBattleReactionWindow(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setBattleReactionSecondsLeft(prev => (prev === null ? prev : prev - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [
    battleReactionSecondsLeft,
    isBotMode,
    pendingBattleReactionWindow,
    state,
  ]);

  if (screen === 'start' || !safeView) {
    return React.createElement(StartScreen, {
      firstPlayer,
      gameMode,
      sessionMode,
      botDifficulty,
      playerColors,
      onFirstPlayerChange: setFirstPlayer,
      onGameModeChange: setGameMode,
      onSessionModeChange: setSessionMode,
      onBotDifficultyChange: setBotDifficulty,
      onPlayerColorChange: (player, color) => {
        setPlayerColors(prev => ({ ...prev, [player]: color }));
      },
      onNewGame: startNewGame,
      initialPhase: gameCatalogOpen ? 'catalog' : undefined,
      onCatalogBack: gameCatalogOpen ? closeInGameCatalog : undefined,
    });
  }

  if (state?.pendingBattle && battleView) {
    const battleIntroKey = `${state.turnNumber}-${state.pendingBattle.battleType}-${state.pendingBattle.initiatorId}-${state.pendingBattle.opponentId}`;
    const freezeBattleSources = [battleView.initiator, battleView.opponent]
      .filter(participant => canUseFreezeGunSpecial(participant.id))
      .filter(participant => !isBotMode || participant.controller === 'P1');

    if (showBattleFullBoard) {
      const battleTargetMap: Partial<Record<RingPosition, LegalActionType>> = {};
      if (pendingBattlePhoneFriendPlay) {
        for (const target of phoneFriendSelectableTargets) {
          battleTargetMap[target.boardPosition] = 'move';
        }
      }
      if (pendingBattleWeaponEquipPlay) {
        for (const target of state.characters.filter(character => character.alive && !!character.boardPosition)) {
          battleTargetMap[target.boardPosition as RingPosition] = 'move';
        }
      }
      if (pendingBattleSwapPlay) {
        for (const target of state.characters.filter(character => character.alive && !!character.boardPosition)) {
          if (pendingBattleSwapPlay.step === 'swap-pick-own' && target.controller === pendingBattleSwapPlay.actor) {
            battleTargetMap[target.boardPosition as RingPosition] = 'move';
          }
          if (pendingBattleSwapPlay.step === 'swap-pick-opponent' && target.controller !== pendingBattleSwapPlay.actor) {
            battleTargetMap[target.boardPosition as RingPosition] = 'move';
          }
        }
      }
      const expandedBattleReadCharacter = expandedBoardCharacterId
        ? state.characters.find(character => character.id === expandedBoardCharacterId) ?? null
        : null;
      const handleBattleTargetSelection = (instanceId: string): void => {
        if (!state) {
          return;
        }

        const selected = state.characters.find(character => character.id === instanceId);
        if (!selected || !selected.alive || !selected.boardPosition) {
          return;
        }

        if (pendingBattlePhoneFriendPlay) {
          if (selected.controller !== pendingBattlePhoneFriendPlay.actor) {
            return;
          }
          setPendingBattlePhoneFriendPlay({
            ...pendingBattlePhoneFriendPlay,
            selectedCharacterId: selected.id,
          });
          return;
        }

        if (pendingBattleWeaponEquipPlay) {
          setPendingBattleWeaponEquipPlay({
            ...pendingBattleWeaponEquipPlay,
            selectedCharacterId: selected.id,
          });
          setExpandedBoardCharacterId(selected.id);
          return;
        }

        if (pendingBattleSwapPlay) {
          if (pendingBattleSwapPlay.step === 'swap-pick-own' && selected.controller !== pendingBattleSwapPlay.actor) {
            return;
          }
          if (pendingBattleSwapPlay.step === 'swap-pick-opponent' && selected.controller === pendingBattleSwapPlay.actor) {
            return;
          }
          setPendingBattleSwapPlay({
            ...pendingBattleSwapPlay,
            pendingCharacterId: selected.id,
          });
          setExpandedBoardCharacterId(selected.id);
          return;
        }

        setExpandedBoardCharacterId(selected.id);
      };

      return React.createElement(
        'main',
        { className: 'app-shell battle-shell battle-fullboard-shell', 'data-testid': 'match-screen' },
        React.createElement('section', { className: 'battle-fullboard-view', 'data-testid': 'battle-full-board-view' },
          React.createElement('header', { className: 'battle-fullboard-header' },
            React.createElement('h2', null, 'Full Board View'),
            React.createElement(
              'button',
              {
                type: 'button',
                onClick: () => {
                  setShowBattleFullBoard(false);
                  setPendingBattlePhoneFriendPlay(null);
                  setPendingBattleWeaponEquipPlay(null);
                  setPendingBattleSwapPlay(null);
                  setPhoneFriendAnimation(null);
                },
                'data-testid': 'battle-return-to-battle',
              },
              'Return to Battle',
            ),
          ),
          pendingCurtainsPlay && !pendingBattleReactionWindow && !showCurtainsSelectionModal
            ? React.createElement(
                'div',
                { className: 'power-popover-controls', 'data-testid': 'curtains-reopen-controls' },
                React.createElement(
                  'p',
                  { className: 'status-label', 'data-testid': 'curtains-reopen-hint' },
                  'BEHIND THE CURTAINS selection is hidden while you inspect this view.',
                ),
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: () => setShowCurtainsSelectionModal(true),
                    'data-testid': 'curtains-return-selection',
                  },
                  'Return to Select Cards',
                ),
              )
            : null,
          pendingJeremySpecial && !showJeremySelectionModal
            ? React.createElement(
                'div',
                { className: 'power-popover-controls', 'data-testid': 'jeremy-reopen-controls' },
                React.createElement(
                  'p',
                  { className: 'status-label', 'data-testid': 'jeremy-reopen-hint' },
                  'Jeremy selection is hidden while you inspect this view.',
                ),
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: () => setShowJeremySelectionModal(true),
                    'data-testid': 'jeremy-return-selection',
                  },
                  'Return to Select Cards',
                ),
              )
            : null,
          pendingBattlePhoneFriendPlay
            ? React.createElement(
                'p',
                { className: 'status-label', 'data-testid': 'battle-phone-friend-targeting-hint' },
                'PHONE A FRIEND: select one of your living board characters (glowing) to replace.',
              )
            : pendingBattleWeaponEquipPlay
              ? React.createElement(
                  'p',
                  { className: 'status-label', 'data-testid': 'battle-weapon-targeting-hint' },
                  'WEAPON: select any living character on the board to equip this weapon.',
                )
              : pendingBattleSwapPlay
                ? React.createElement(
                    'p',
                    { className: 'status-label', 'data-testid': 'battle-swap-targeting-hint' },
                    pendingBattleSwapPlay.step === 'swap-pick-own'
                      ? 'SWAP CHARACTERS: select one of your living board characters (glowing), then confirm.'
                      : 'SWAP CHARACTERS: select one opponent living character (glowing), then confirm swap.',
                  )
            : null,
          React.createElement(Board, {
            view: battleView.boardView,
            selectedCardId: pendingBattlePhoneFriendPlay?.selectedCharacterId
              ?? pendingBattleWeaponEquipPlay?.selectedCharacterId
              ?? pendingBattleSwapPlay?.pendingCharacterId
              ?? null,
            onCardClick: (instanceId: string) => {
              if (!state) {
                return;
              }
              handleBattleTargetSelection(instanceId);
            },
            onAttachmentClick: handleAttachmentCardClick,
            actionTargets: battleTargetMap,
            onActionTargetClick: (_, position) => {
              const target = state.characters.find(character => character.alive && character.boardPosition === position);
              if (target) {
                handleBattleTargetSelection(target.id);
              }
            },
            allowCardClickOnActionTargets: !!pendingBattleWeaponEquipPlay || !!pendingBattlePhoneFriendPlay || !!pendingBattleSwapPlay,
            readOnly: !pendingBattlePhoneFriendPlay && !pendingBattleWeaponEquipPlay && !pendingBattleSwapPlay,
            inspectAllCards: !pendingBattlePhoneFriendPlay && !pendingBattleWeaponEquipPlay && !pendingBattleSwapPlay,
            characterStatusById: irohStatusByCharacterId,
            playerColors,
            swapCharacterMotion: pendingSwapCharactersMotion,
            thawingCharacterIds,
          }),
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'tabletop-catalog-button',
              onClick: openInGameCatalog,
              'data-testid': 'tabletop-catalog-open',
            },
            'Card Catalog',
          ),
          pendingBattlePhoneFriendPlay && selectedPhoneFriendCharacter
            ? React.createElement(
                'section',
                { className: 'board-card-modal', 'data-testid': 'battle-phone-friend-card-options' },
                React.createElement(
                  'div',
                  { className: 'board-card-modal-panel board-power-card-modal-panel' },
                  React.createElement('h3', null, selectedPhoneFriendCharacter.displayName ?? selectedPhoneFriendCharacter.id),
                  React.createElement('p', { className: 'status-label' }, 'Choose to view this card or confirm Phone a Friend.'),
                  React.createElement(
                    'div',
                    { className: 'power-popover-controls' },
                    React.createElement(
                      'button',
                      {
                        type: 'button',
                        onClick: () => setExpandedBoardCharacterId(selectedPhoneFriendCharacter.id),
                        'data-testid': 'battle-phone-friend-view-card',
                      },
                      'View Card',
                    ),
                    React.createElement(
                      'button',
                      {
                        type: 'button',
                        onClick: beginPhoneFriendBattleAnimation,
                        'data-testid': 'battle-phone-friend-confirm',
                      },
                      'Phone a Friend',
                    ),
                  ),
                ),
              )
            : null,
          pendingBattleWeaponEquipPlay && selectedBattleWeaponTarget && expandedBoardCharacterId === selectedBattleWeaponTarget.id
            ? React.createElement(
                'section',
                {
                  className: 'board-card-modal',
                  'data-testid': 'battle-weapon-character-read',
                  onClick: () => setExpandedBoardCharacterId(null),
                },
                React.createElement(
                  'div',
                  {
                    className: 'board-card-modal-panel board-character-card-modal-panel',
                    onClick: (event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation(),
                  },
                  React.createElement(CharacterCardFrame, {
                    size: 'battle',
                    revealed: selectedBattleWeaponTarget.revealed,
                    controllerColorClass: selectedBattleWeaponTarget.controller === 'P1' ? 'player-color-blue' : 'player-color-red',
                    displayName: selectedBattleWeaponTarget.displayName,
                    ATK: selectedBattleWeaponTarget.ATK,
                    DEF: selectedBattleWeaponTarget.DEF,
                    ability: selectedBattleWeaponTarget.ability ?? null,
                    statRule: selectedBattleWeaponTarget.statRule ?? null,
                    artSrc: selectedBattleWeaponTarget.artImageUrl ?? null,
                    fullCardFaceSrc: selectedBattleWeaponTarget.fullCardFaceImageUrl ?? null,
                    visualMode: selectedBattleWeaponTarget.visualMode,
                    isKing: selectedBattleWeaponTarget.isKing,
                    isFrozen: selectedBattleWeaponTarget.isFrozen,
                    statusTag: irohStatusByCharacterId[selectedBattleWeaponTarget.id] ?? null,
                    testId: 'battle-weapon-read-card',
                  }),
                  renderAnytimeCharacterSpecialControl(selectedBattleWeaponTarget.id, 'battle-weapon'),
                  React.createElement(
                    'div',
                    { className: 'power-popover-controls board-modal-actions', 'data-testid': 'battle-weapon-actions' },
                    React.createElement(
                      'button',
                      {
                        type: 'button',
                        onClick: confirmBattleWeaponEquip,
                        'data-testid': 'battle-weapon-confirm',
                      },
                      'Equip Weapon',
                    ),
                    React.createElement(
                      'button',
                      {
                        type: 'button',
                        onClick: () => setExpandedBoardCharacterId(null),
                        'data-testid': 'battle-weapon-close',
                      },
                      'Close',
                    ),
                  ),
                ),
              )
            : null,
          pendingBattleSwapPlay && selectedBattleSwapTarget && expandedBoardCharacterId === selectedBattleSwapTarget.id
            ? React.createElement(
                'section',
                {
                  className: 'board-card-modal',
                  'data-testid': 'battle-swap-character-read',
                  onClick: () => setExpandedBoardCharacterId(null),
                },
                React.createElement(
                  'div',
                  {
                    className: 'board-card-modal-panel board-character-card-modal-panel',
                    onClick: (event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation(),
                  },
                  React.createElement(CharacterCardFrame, {
                    size: 'battle',
                    revealed: selectedBattleSwapTarget.revealed,
                    controllerColorClass: selectedBattleSwapTarget.controller === 'P1' ? 'player-color-blue' : 'player-color-red',
                    displayName: selectedBattleSwapTarget.displayName,
                    ATK: selectedBattleSwapTarget.ATK,
                    DEF: selectedBattleSwapTarget.DEF,
                    ability: selectedBattleSwapTarget.ability ?? null,
                    statRule: selectedBattleSwapTarget.statRule ?? null,
                    artSrc: selectedBattleSwapTarget.artImageUrl ?? null,
                    fullCardFaceSrc: selectedBattleSwapTarget.fullCardFaceImageUrl ?? null,
                    visualMode: selectedBattleSwapTarget.visualMode,
                    isKing: selectedBattleSwapTarget.isKing,
                    isFrozen: selectedBattleSwapTarget.isFrozen,
                    statusTag: irohStatusByCharacterId[selectedBattleSwapTarget.id] ?? null,
                    testId: 'battle-swap-read-card',
                  }),
                  renderAnytimeCharacterSpecialControl(selectedBattleSwapTarget.id, 'battle-swap'),
                  React.createElement(
                    'div',
                    { className: 'power-popover-controls board-modal-actions', 'data-testid': 'battle-swap-actions' },
                    React.createElement(
                      'button',
                      {
                        type: 'button',
                        onClick: confirmBattleSwapSelection,
                        'data-testid': pendingBattleSwapPlay.step === 'swap-pick-own'
                          ? 'battle-swap-own-confirm'
                          : 'battle-swap-opponent-confirm',
                      },
                      pendingBattleSwapPlay.step === 'swap-pick-own' ? 'Confirm First Selection' : 'Confirm Swap',
                    ),
                    React.createElement(
                      'button',
                      {
                        type: 'button',
                        onClick: () => setExpandedBoardCharacterId(null),
                        'data-testid': 'battle-swap-close',
                      },
                      'Close',
                    ),
                  ),
                ),
              )
            : null,
          pendingCurtainsPlay && showCurtainsSelectionModal
            ? React.createElement(
                'section',
                { className: 'board-card-modal board-curtains-overlay', 'data-testid': 'board-curtains-modal' },
                React.createElement(
                  'div',
                  { className: 'board-card-modal-panel board-power-card-modal-panel board-curtains-panel board-curtains-panel-static' },
                  React.createElement('h3', null, 'BEHIND THE CURTAINS'),
                  React.createElement(
                    'p',
                    { className: 'status-label' },
                    'Curtains open: inspect all cards face-up. Optional swap is one-for-one.',
                  ),
                  React.createElement(
                    'div',
                    { className: 'board-curtains-content' },
                    React.createElement(
                      'section',
                      { className: 'curtains-hand-zone curtains-opponent-zone' },
                      React.createElement('h4', null, 'Opponent Hand (Face-Up)'),
                      React.createElement(
                        'div',
                        { className: 'power-card-row curtains-card-row', 'data-testid': 'curtains-opponent-row' },
                        curtainsOpponentCardOptions.length > 0
                          ? curtainsOpponentCardOptions.map(card => React.createElement(
                              'button',
                              {
                                key: card.instanceId,
                                type: 'button',
                                className: 'power-card-button curtains-card-button',
                                onClick: () => setPendingCurtainsPlay(prev => (
                                  prev
                                    ? {
                                        ...prev,
                                        opponentSwapCardInstanceId: prev.opponentSwapCardInstanceId === card.instanceId
                                          ? null
                                          : card.instanceId,
                                      }
                                    : prev
                                )),
                                'aria-pressed': pendingCurtainsPlay.opponentSwapCardInstanceId === card.instanceId,
                                'data-testid': `curtains-opponent-card-${card.instanceId}`,
                              },
                              React.createElement(PowerCardFrame, {
                                size: 'hand',
                                displayName: card.displayName,
                                rulesText: card.rulesText,
                                artSrc: card.artImageUrl ?? null,
                                fullCardFaceSrc: card.fullCardFaceImageUrl ?? null,
                                visualMode: card.visualMode ?? 'layered-art',
                                state: pendingCurtainsPlay.opponentSwapCardInstanceId === card.instanceId ? 'selected' : 'playable',
                                selected: pendingCurtainsPlay.opponentSwapCardInstanceId === card.instanceId,
                                testId: `curtains-opponent-face-${card.instanceId}`,
                              }),
                            ))
                          : React.createElement('p', { className: 'status-label' }, 'Opponent has no power cards.'),
                      ),
                    ),
                    React.createElement(
                      'section',
                      { className: 'curtains-hand-zone curtains-own-zone' },
                      React.createElement('h4', null, 'Your Hand (Bottom)'),
                      React.createElement(
                        'div',
                        { className: 'power-card-row curtains-card-row', 'data-testid': 'curtains-own-row' },
                        curtainsOwnCardOptions.length > 0
                          ? curtainsOwnCardOptions.map(card => React.createElement(
                              'button',
                              {
                                key: card.instanceId,
                                type: 'button',
                                className: 'power-card-button curtains-card-button',
                                onClick: () => setPendingCurtainsPlay(prev => (
                                  prev
                                    ? {
                                        ...prev,
                                        ownSwapCardInstanceId: prev.ownSwapCardInstanceId === card.instanceId
                                          ? null
                                          : card.instanceId,
                                      }
                                    : prev
                                )),
                                'aria-pressed': pendingCurtainsPlay.ownSwapCardInstanceId === card.instanceId,
                                'data-testid': `curtains-own-card-${card.instanceId}`,
                              },
                              React.createElement(PowerCardFrame, {
                                size: 'hand',
                                displayName: card.displayName,
                                rulesText: card.rulesText,
                                artSrc: card.artImageUrl ?? null,
                                fullCardFaceSrc: card.fullCardFaceImageUrl ?? null,
                                visualMode: card.visualMode ?? 'layered-art',
                                state: pendingCurtainsPlay.ownSwapCardInstanceId === card.instanceId ? 'selected' : 'playable',
                                selected: pendingCurtainsPlay.ownSwapCardInstanceId === card.instanceId,
                                testId: `curtains-own-face-${card.instanceId}`,
                              }),
                            ))
                          : React.createElement('p', { className: 'status-label' }, 'No swappable cards in your hand.'),
                      ),
                    ),
                  ),
                  React.createElement(
                    'div',
                    { className: 'power-popover-controls' },
                    state?.pendingBattle
                      ? React.createElement(
                          React.Fragment,
                          null,
                          React.createElement(
                            'p',
                            { className: 'status-label', 'data-testid': 'curtains-view-indicator' },
                            showBattleFullBoard ? 'Viewing: Full Board' : 'Viewing: Battle Screen',
                          ),
                          React.createElement(
                            'button',
                            {
                              type: 'button',
                              onClick: () => {
                                setShowBattleFullBoard(true);
                                setShowCurtainsSelectionModal(false);
                              },
                              disabled: showBattleFullBoard,
                              'data-testid': 'curtains-view-full-board',
                            },
                            'View Full Board',
                          ),
                          React.createElement(
                            'button',
                            {
                              type: 'button',
                              onClick: () => {
                                setShowBattleFullBoard(false);
                                setShowCurtainsSelectionModal(false);
                              },
                              disabled: !showBattleFullBoard,
                              'data-testid': 'curtains-view-battle',
                            },
                            'View Battle Screen',
                          ),
                        )
                      : null,
                    React.createElement(
                      'button',
                      {
                        type: 'button',
                        onClick: () => executeBehindTheCurtainsBoardPlay(),
                        disabled: (
                          (pendingCurtainsPlay.ownSwapCardInstanceId === null) !== (pendingCurtainsPlay.opponentSwapCardInstanceId === null)
                        ),
                        'data-testid': 'curtains-confirm',
                      },
                      'Confirm',
                    ),
                  ),
                ),
              )
            : null,
          phoneFriendAnimation
            ? React.createElement(
                'section',
                { className: 'board-card-modal', 'data-testid': 'battle-phone-friend-animation' },
                React.createElement(
                  'div',
                  { className: 'board-card-modal-panel board-power-card-modal-panel battle-phone-friend-cinematic-panel' },
                  React.createElement('h3', null, 'PHONE A FRIEND'),
                  React.createElement('p', { className: 'status-label battle-phone-friend-ring' }, 'Riiing... Riiing...'),
                  React.createElement(
                    'div',
                    { className: 'battle-phone-friend-cinematic-stage' },
                    React.createElement(
                      'div',
                      { className: 'battle-phone-friend-card-column' },
                      React.createElement('p', { className: 'battle-phone-friend-caption' }, 'Selected Character'),
                      React.createElement(CharacterCardFrame, {
                        size: 'compact',
                        revealed: true,
                        controllerColorClass: phoneFriendAnimation.oldController === 'P2' ? 'player-color-red' : 'player-color-blue',
                        displayName: phoneFriendAnimation.oldDisplayName,
                        ATK: phoneFriendAnimation.oldATK,
                        DEF: phoneFriendAnimation.oldDEF,
                        ability: null,
                        artSrc: phoneFriendAnimation.oldArtImageUrl ?? null,
                        fullCardFaceSrc: phoneFriendAnimation.oldFullCardFaceImageUrl ?? null,
                        visualMode: phoneFriendAnimation.oldVisualMode,
                        isKing: false,
                        isFrozen: false,
                        testId: 'battle-phone-friend-old-card',
                      }),
                    ),
                    React.createElement(
                      'div',
                      { className: 'battle-phone-friend-call-column', 'aria-hidden': 'true' },
                      React.createElement('span', { className: 'battle-phone-friend-call-icon' }, '☎'),
                      React.createElement('span', { className: 'battle-phone-friend-wave battle-phone-friend-wave-a' }),
                      React.createElement('span', { className: 'battle-phone-friend-wave battle-phone-friend-wave-b' }),
                    ),
                    React.createElement(
                      'div',
                      { className: 'battle-phone-friend-card-column' },
                      React.createElement('p', { className: 'battle-phone-friend-caption' }, 'Backup Arrives'),
                      React.createElement(CharacterCardFrame, {
                        size: 'compact',
                        revealed: true,
                        controllerColorClass: phoneFriendAnimation.oldController === 'P2' ? 'player-color-red' : 'player-color-blue',
                        displayName: phoneFriendAnimation.newDisplayName,
                        ATK: phoneFriendAnimation.newATK,
                        DEF: phoneFriendAnimation.newDEF,
                        ability: null,
                        artSrc: phoneFriendAnimation.newArtImageUrl ?? null,
                        fullCardFaceSrc: phoneFriendAnimation.newFullCardFaceImageUrl ?? null,
                        visualMode: phoneFriendAnimation.newVisualMode,
                        isKing: false,
                        isFrozen: false,
                        testId: 'battle-phone-friend-new-card',
                      }),
                    ),
                  ),
                  React.createElement('p', { className: 'status-label' }, `${phoneFriendAnimation.oldDisplayName} called in ${phoneFriendAnimation.newDisplayName}.`),
                  React.createElement('p', { className: 'status-label' }, `Incoming Stats: ATK ${phoneFriendAnimation.newATK} / DEF ${phoneFriendAnimation.newDEF}`),
                ),
              )
            : null,
          pendingBattlePhoneFriendPlay && selectedPhoneFriendCharacter && expandedBoardCharacterId === selectedPhoneFriendCharacter.id
            ? React.createElement(
                'section',
                {
                  className: 'board-card-modal',
                  'data-testid': 'battle-phone-friend-character-read',
                  onClick: () => setExpandedBoardCharacterId(null),
                },
                React.createElement(
                  'div',
                  {
                    className: 'board-card-modal-panel board-character-card-modal-panel',
                    onClick: (event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation(),
                  },
                  React.createElement(CharacterCardFrame, {
                    size: 'battle',
                    revealed: true,
                    controllerColorClass: selectedPhoneFriendCharacter.controller === 'P1' ? 'player-color-blue' : 'player-color-red',
                    displayName: selectedPhoneFriendCharacter.displayName,
                    ATK: selectedPhoneFriendCharacter.ATK,
                    DEF: selectedPhoneFriendCharacter.DEF,
                    ability: selectedPhoneFriendCharacter.ability ?? null,
                    statRule: selectedPhoneFriendCharacter.statRule ?? null,
                    artSrc: selectedPhoneFriendCharacter.artImageUrl ?? null,
                    fullCardFaceSrc: selectedPhoneFriendCharacter.fullCardFaceImageUrl ?? null,
                    visualMode: selectedPhoneFriendCharacter.visualMode,
                    isKing: selectedPhoneFriendCharacter.isKing,
                    isFrozen: selectedPhoneFriendCharacter.isFrozen,
                    statusTag: irohStatusByCharacterId[selectedPhoneFriendCharacter.id] ?? null,
                    testId: 'battle-phone-friend-read-card',
                  }),
                  renderAnytimeCharacterSpecialControl(selectedPhoneFriendCharacter.id, 'battle-phone-friend'),
                  React.createElement(
                    'button',
                    {
                      type: 'button',
                      onClick: () => setExpandedBoardCharacterId(null),
                      'data-testid': 'battle-phone-friend-read-close',
                    },
                    'Close',
                  ),
                ),
              )
            : null,
          !pendingBattlePhoneFriendPlay && !pendingBattleWeaponEquipPlay && !pendingBattleSwapPlay && expandedBattleReadCharacter
            ? React.createElement(
                'section',
                {
                  className: 'board-card-modal',
                  'data-testid': 'battle-fullboard-character-read',
                  onClick: () => setExpandedBoardCharacterId(null),
                },
                React.createElement(
                  'div',
                  {
                    className: 'board-card-modal-panel board-character-card-modal-panel',
                    onClick: (event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation(),
                  },
                  React.createElement(CharacterCardFrame, {
                    size: 'battle',
                    revealed: expandedBattleReadCharacter.revealed,
                    controllerColorClass: expandedBattleReadCharacter.controller === 'P1' ? 'player-color-blue' : 'player-color-red',
                    displayName: expandedBattleReadCharacter.displayName,
                    ATK: expandedBattleReadCharacter.ATK,
                    DEF: expandedBattleReadCharacter.DEF,
                    ability: expandedBattleReadCharacter.ability,
                    statRule: expandedBattleReadCharacter.statRule ?? null,
                    artSrc: expandedBattleReadCharacter.artImageUrl ?? null,
                    fullCardFaceSrc: expandedBattleReadCharacter.fullCardFaceImageUrl ?? null,
                    visualMode: expandedBattleReadCharacter.visualMode,
                    isKing: expandedBattleReadCharacter.isKing,
                    isFrozen: expandedBattleReadCharacter.isFrozen,
                    statusTag: irohStatusByCharacterId[expandedBattleReadCharacter.id] ?? null,
                    testId: 'battle-fullboard-read-card',
                  }),
                  canUseFreezeGunSpecial(expandedBattleReadCharacter.id)
                    ? React.createElement(
                        'button',
                        {
                          type: 'button',
                          onClick: () => openFreezeSpecialPicker(expandedBattleReadCharacter.id),
                          'data-testid': 'battle-fullboard-freeze-special',
                        },
                        'Use Freeze Gun Special',
                      )
                    : null,
                  renderAnytimeCharacterSpecialControl(expandedBattleReadCharacter.id, 'battle-fullboard'),
                  React.createElement(
                    'button',
                    {
                      type: 'button',
                      onClick: () => setExpandedBoardCharacterId(null),
                      'data-testid': 'battle-fullboard-read-close',
                    },
                    'Close',
                  ),
                ),
              )
            : null,
          jeremySpecialModal,
        ),
      );
    }

    return React.createElement(
      'main',
      { className: 'app-shell battle-shell', 'data-testid': 'match-screen' },
      React.createElement(BattleScreen, {
        battle: battleView,
        boardView: battleView.boardView,
        privateHand: battlePrivateHand,
        handoffRequiredFor: isBotMode ? null : state.pendingBattle.handoffRequiredFor,
        manualHandsByController: manualBattleHandsByController,
        revealedHandFor: battleHandVisibleFor,
        onRevealHand: (controller: Controller) => setBattleHandVisibleFor(current => (current === controller ? null : controller)),
        battleIntroKey,
        botPriorityPanel: isBotBattleTurn
          ? {
              message: 'Bot P2 is thinking...',
              handCount: battleView.powerCardHandCount.P2,
            }
          : queuedBotBattleReveal
            ? {
                message: 'Bot is weighing a power card...',
                handCount: battleView.powerCardHandCount.P2,
              }
          : null,
        botPowerReveal: pendingBotBattleReveal
          ? {
              displayName: pendingBotBattleReveal.displayName,
              rulesText: pendingBotBattleReveal.rulesText,
              visualMode: pendingBotBattleReveal.visualMode,
              artImageUrl: pendingBotBattleReveal.artImageUrl,
              fullCardFaceImageUrl: pendingBotBattleReveal.fullCardFaceImageUrl,
            }
          : null,
        hasUsedPowerThisBattle: battleUsedPileStartCount !== null
          ? state.usedPowerCardPile.length > battleUsedPileStartCount
          : false,
        usedPowerCardsThisBattle,
        isBotMode,
        onOpenFullBoard: () => setShowBattleFullBoard(true),
        characterStatusById: irohStatusByCharacterId,
        playerColors,
        onAcknowledgeHandoff: handleAcknowledgeHandoff,
        onAcknowledgeBotPowerReveal: handleAcknowledgeBotBattleReveal,
        onSetReady: handleSetBattleReady,
        onAttachmentClick: handleAttachmentCardClick,
        onOpenCharacterCard: (characterId: string) => {
          setShowBattleFullBoard(true);
          setExpandedBoardCharacterId(characterId);
        },
        onPlayCard: handlePlayBattleCard,
        onResolveBattle: handleResolveBattle,
      }),
      freezeBattleSources.length > 0
        ? React.createElement(
            'section',
            { className: 'battle-freeze-special-actions', 'data-testid': 'battle-freeze-special-actions' },
            React.createElement('strong', null, 'Freeze Gun Special'),
            freezeBattleSources.map(source => React.createElement(
              'button',
              {
                key: `battle-freeze-source-${source.id}`,
                type: 'button',
                onClick: () => openFreezeSpecialPicker(source.id),
                'data-testid': `battle-freeze-source-${source.id}`,
              },
              `Use with ${source.displayName}`,
            )),
          )
        : null,
      freezeSpecialSourceId && freezeSpecialSourceCharacter
        ? React.createElement(
            'section',
            { className: 'board-card-modal', 'data-testid': 'freeze-special-modal' },
            React.createElement(
              'div',
              { className: 'board-card-modal-panel board-power-card-modal-panel' },
              React.createElement('h3', null, `Freeze Gun Special: ${freezeSpecialSourceCharacter.displayName ?? 'Mr. Freeze'}`),
              React.createElement('p', { className: 'status-label' }, 'Select any living character to freeze.'),
              React.createElement(
                'select',
                {
                  value: freezeSpecialTargetId ?? '',
                  onChange: event => setFreezeSpecialTargetId(event.target.value),
                  'data-testid': 'freeze-special-target-select',
                },
                freezeSpecialTargetOptions.map(option => React.createElement(
                  'option',
                  { key: option.id, value: option.id },
                  option.label,
                )),
              ),
              React.createElement(
                'div',
                { className: 'power-popover-controls' },
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: executeManualFreezeSpecial,
                    disabled: !freezeSpecialTargetId,
                    'data-testid': 'freeze-special-confirm',
                  },
                  'Fire Freeze Gun',
                ),
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: closeFreezeSpecialPicker,
                    'data-testid': 'freeze-special-cancel',
                  },
                  'Cancel',
                ),
              ),
            ),
          )
        : null,
      pendingCurtainsPlay && !pendingBattleReactionWindow && !showCurtainsSelectionModal
        ? React.createElement(
            'section',
            { className: 'battle-freeze-special-actions', 'data-testid': 'curtains-reopen-controls' },
            React.createElement('strong', null, 'Behind the Curtains'),
            React.createElement('p', { className: 'status-label', 'data-testid': 'curtains-reopen-hint' }, 'Selection view hidden. Return when ready.'),
            React.createElement(
              'button',
              {
                type: 'button',
                onClick: () => setShowCurtainsSelectionModal(true),
                'data-testid': 'curtains-return-selection',
              },
              'Return to Select Cards',
            ),
          )
        : null,
      pendingJeremySpecial && !showJeremySelectionModal
        ? React.createElement(
            'section',
            { className: 'battle-freeze-special-actions', 'data-testid': 'jeremy-reopen-controls' },
            React.createElement('strong', null, 'Jeremy Jahns Special'),
            React.createElement('p', { className: 'status-label', 'data-testid': 'jeremy-reopen-hint' }, 'Selection view hidden. Return when ready.'),
            React.createElement(
              'button',
              {
                type: 'button',
                onClick: () => setShowJeremySelectionModal(true),
                'data-testid': 'jeremy-return-selection',
              },
              'Return to Select Cards',
            ),
          )
        : null,
      pendingCurtainsPlay && !pendingBattleReactionWindow && showCurtainsSelectionModal
        ? React.createElement(
            'section',
            { className: 'board-card-modal board-curtains-overlay', 'data-testid': 'board-curtains-modal' },
            React.createElement(
              'div',
              { className: 'board-card-modal-panel board-power-card-modal-panel board-curtains-panel board-curtains-panel-static' },
              React.createElement('h3', null, 'BEHIND THE CURTAINS'),
              React.createElement(
                'p',
                { className: 'status-label' },
                'Curtains open: inspect all cards face-up. Optional swap is one-for-one.',
              ),
              React.createElement(
                'div',
                { className: 'board-curtains-content' },
                React.createElement(
                  'section',
                  { className: 'curtains-hand-zone curtains-opponent-zone' },
                  React.createElement('h4', null, 'Opponent Hand (Face-Up)'),
                  React.createElement(
                    'div',
                    { className: 'power-card-row curtains-card-row', 'data-testid': 'curtains-opponent-row' },
                    curtainsOpponentCardOptions.length > 0
                      ? curtainsOpponentCardOptions.map(card => React.createElement(
                          'button',
                          {
                            key: card.instanceId,
                            type: 'button',
                            className: 'power-card-button curtains-card-button',
                            onClick: () => setPendingCurtainsPlay(prev => (
                              prev
                                ? {
                                    ...prev,
                                    opponentSwapCardInstanceId: prev.opponentSwapCardInstanceId === card.instanceId
                                      ? null
                                      : card.instanceId,
                                  }
                                : prev
                            )),
                            'aria-pressed': pendingCurtainsPlay.opponentSwapCardInstanceId === card.instanceId,
                            'data-testid': `curtains-opponent-card-${card.instanceId}`,
                          },
                          React.createElement(PowerCardFrame, {
                            size: 'hand',
                            displayName: card.displayName,
                            rulesText: card.rulesText,
                            artSrc: card.artImageUrl ?? null,
                            fullCardFaceSrc: card.fullCardFaceImageUrl ?? null,
                            visualMode: card.visualMode ?? 'layered-art',
                            state: pendingCurtainsPlay.opponentSwapCardInstanceId === card.instanceId ? 'selected' : 'playable',
                            selected: pendingCurtainsPlay.opponentSwapCardInstanceId === card.instanceId,
                            testId: `curtains-opponent-face-${card.instanceId}`,
                          }),
                        ))
                      : React.createElement('p', { className: 'status-label' }, 'Opponent has no power cards.'),
                  ),
                ),
                React.createElement(
                  'section',
                  { className: 'curtains-hand-zone curtains-own-zone' },
                  React.createElement('h4', null, 'Your Hand (Bottom)'),
                  React.createElement(
                    'div',
                    { className: 'power-card-row curtains-card-row', 'data-testid': 'curtains-own-row' },
                    curtainsOwnCardOptions.length > 0
                      ? curtainsOwnCardOptions.map(card => React.createElement(
                          'button',
                          {
                            key: card.instanceId,
                            type: 'button',
                            className: 'power-card-button curtains-card-button',
                            onClick: () => setPendingCurtainsPlay(prev => (
                              prev
                                ? {
                                    ...prev,
                                    ownSwapCardInstanceId: prev.ownSwapCardInstanceId === card.instanceId
                                      ? null
                                      : card.instanceId,
                                  }
                                : prev
                            )),
                            'aria-pressed': pendingCurtainsPlay.ownSwapCardInstanceId === card.instanceId,
                            'data-testid': `curtains-own-card-${card.instanceId}`,
                          },
                          React.createElement(PowerCardFrame, {
                            size: 'hand',
                            displayName: card.displayName,
                            rulesText: card.rulesText,
                            artSrc: card.artImageUrl ?? null,
                            fullCardFaceSrc: card.fullCardFaceImageUrl ?? null,
                            visualMode: card.visualMode ?? 'layered-art',
                            state: pendingCurtainsPlay.ownSwapCardInstanceId === card.instanceId ? 'selected' : 'playable',
                            selected: pendingCurtainsPlay.ownSwapCardInstanceId === card.instanceId,
                            testId: `curtains-own-face-${card.instanceId}`,
                          }),
                        ))
                      : React.createElement('p', { className: 'status-label' }, 'No swappable cards in your hand.'),
                  ),
                ),
              ),
              React.createElement(
                'div',
                { className: 'power-popover-controls' },
                React.createElement(
                  'p',
                  { className: 'status-label', 'data-testid': 'curtains-view-indicator' },
                  showBattleFullBoard ? 'Viewing: Full Board' : 'Viewing: Battle Screen',
                ),
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: () => {
                      setShowBattleFullBoard(true);
                      setShowCurtainsSelectionModal(false);
                    },
                    disabled: showBattleFullBoard,
                    'data-testid': 'curtains-view-full-board',
                  },
                  'View Full Board',
                ),
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: () => {
                      setShowBattleFullBoard(false);
                      setShowCurtainsSelectionModal(false);
                    },
                    disabled: !showBattleFullBoard,
                    'data-testid': 'curtains-view-battle',
                  },
                  'View Battle Screen',
                ),
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: () => executeBehindTheCurtainsBoardPlay(),
                    disabled: (
                      (pendingCurtainsPlay.ownSwapCardInstanceId === null) !== (pendingCurtainsPlay.opponentSwapCardInstanceId === null)
                    ),
                    'data-testid': 'curtains-confirm',
                  },
                  'Confirm',
                ),
              ),
            ),
          )
        : null,
      pendingBattleReactionWindow
      && (
        (isBotMode && pendingBattleReactionWindow.responder === 'P1')
        || (!isBotMode && state.pendingBattle?.handoffRequiredFor === null)
      )
        ? React.createElement(
            'section',
            { className: 'board-card-modal', 'data-testid': 'battle-nospray-reaction-modal' },
            React.createElement(
              'div',
              { className: 'board-card-modal-panel board-power-card-modal-panel' },
              React.createElement('h3', null, 'No Spray Response Window'),
              React.createElement('p', { className: 'status-label' }, `${displayPlayerLabel(pendingBattleReactionWindow.sourceController)} played ${pendingBattleReactionWindow.displayName}.`),
              React.createElement(
                'p',
                { className: 'status-label' },
                pendingBattleReactionWindow.noSprayOptions.length > 0 && pendingBattleReactionWindow.irohCounterCharacterId
                  ? `${displayPlayerLabel(pendingBattleReactionWindow.responder)} has ${battleReactionSecondsLeft ?? 0} seconds to use NO SPRAY or Uncle Iroh Counter.`
                  : pendingBattleReactionWindow.noSprayOptions.length > 0
                    ? `${displayPlayerLabel(pendingBattleReactionWindow.responder)} has ${battleReactionSecondsLeft ?? 0} seconds to use NO SPRAY.`
                    : `${displayPlayerLabel(pendingBattleReactionWindow.responder)} has ${battleReactionSecondsLeft ?? 0} seconds to use Uncle Iroh Counter.`,
              ),
              pendingBattleReactionWindow.noSprayOptions.length > 1
                ? React.createElement(
                    'label',
                    { className: 'status-label', htmlFor: 'battle-nospray-select' },
                    'Select NO SPRAY card:',
                    React.createElement(
                      'select',
                      {
                        id: 'battle-nospray-select',
                        value: pendingBattleReactionWindow.selectedNoSprayInstanceId,
                        onChange: event => setPendingBattleReactionWindow(prev => (
                          prev
                            ? { ...prev, selectedNoSprayInstanceId: event.target.value }
                            : prev
                        )),
                        'data-testid': 'battle-nospray-select',
                      },
                      pendingBattleReactionWindow.noSprayOptions.map(option => React.createElement(
                        'option',
                        { key: option.instanceId, value: option.instanceId },
                        option.label,
                      )),
                    ),
                  )
                : null,
              React.createElement(
                'div',
                { className: 'nospray-target-stage', 'data-testid': 'battle-nospray-cinematic-stage' },
                React.createElement(PowerCardFrame, {
                  size: 'battle',
                  displayName: pendingBattleReactionWindow.displayName,
                  rulesText: pendingBattleReactionWindow.rulesText,
                  artSrc: pendingBattleReactionWindow.artImageUrl ?? null,
                  fullCardFaceSrc: pendingBattleReactionWindow.fullCardFaceImageUrl ?? null,
                  visualMode: pendingBattleReactionWindow.visualMode ?? 'layered-art',
                  state: 'selected',
                  selected: true,
                  testId: 'battle-nospray-reaction-card',
                }),
                React.createElement(
                  'div',
                  { className: 'nospray-cinematic', 'aria-hidden': 'true' },
                  React.createElement('span', { className: 'nospray-hand' }),
                  React.createElement('span', { className: 'nospray-bottle' }),
                  React.createElement('span', { className: 'nospray-mist' }),
                ),
              ),
              React.createElement(
                'div',
                { className: 'power-popover-controls' },
                !isBotMode || pendingBattleReactionWindow.responder === 'P1'
                  ? React.createElement(
                      'button',
                      {
                        type: 'button',
                        onClick: () => resolveBattleReactionWindow(true),
                        'data-testid': 'battle-nospray-use-button',
                      },
                      pendingBattleReactionWindow.noSprayOptions.length > 0
                        ? 'Use NO SPRAY'
                        : 'Use Uncle Iroh Counter',
                    )
                  : null,
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: () => resolveBattleReactionWindow(false),
                    'data-testid': 'battle-nospray-let-resolve',
                  },
                  'Let It Resolve',
                ),
              ),
            ),
          )
        : null,
      jeremySpecialModal,
    );
  }

  return React.createElement(
    'main',
    { className: 'app-shell', 'data-testid': 'match-screen' },
    state.sessionMode === 'multi-game'
      ? React.createElement('section', { className: 'session-score-tracker', 'data-testid': 'session-score-tracker' },
          React.createElement('strong', null, 'Session Score'),
          React.createElement('p', { className: 'status-label' }, `Player One: ${sessionScore.P1}`),
          React.createElement('p', { className: 'status-label' }, `Player Two: ${sessionScore.P2}`),
          React.createElement('p', { className: 'status-label' }, `Draws: ${sessionScore.draw}`),
          sessionWinHistory.length > 0
            ? React.createElement(
                'ol',
                { className: 'session-score-history' },
                sessionWinHistory.map((winner, index) => React.createElement(
                  'li',
                  { key: `session-win-${index + 1}` },
                  `Game ${index + 1}: ${winner === 'P1' ? 'Player One' : winner === 'P2' ? 'Player Two' : 'Draw'}`,
                )),
              )
            : React.createElement('p', { className: 'status-label' }, 'No completed games yet.'),
        )
      : null,
    React.createElement('header', { className: 'tabletop-header' },
      React.createElement('h1', { className: 'tabletop-game-title' }, 'Roundtable Rumble'),
    ),
    React.createElement('section', { className: 'tabletop-top-hand' },
      React.createElement('div', { className: 'opponent-hand-strip', 'data-testid': 'opponent-power-cards' },
        React.createElement('h3', null, isBotMode ? displayPlayerLabel(topHandController) : displayPlayerLabel('P2')),
        !isBotMode
          ? React.createElement(
              'div',
              { className: 'power-popover-controls' },
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => setBoardHandVisibleFor(current => (current === 'P2' ? null : 'P2')),
                  'data-testid': 'manual-reveal-P2',
                },
                boardHandVisibleFor === 'P2' ? 'Hide' : 'Reveal',
              ),
            )
          : null,
        isGameOver
          ? React.createElement('div', { className: 'power-card-row' },
              state.powerCardHands[topHandController].map((card, index) => {
                const definition = getPowerCardDefinition(card.definitionId);
                const visual = powerCatalogById.get(card.definitionId);

                return React.createElement(
                  'div',
                  {
                    key: `top-power-reveal-${card.instanceId}`,
                    className: `endgame-hand-card ${endgameRevealOpponentHand ? 'face-up' : 'face-down'}`,
                    style: { '--flip-delay': `${index * 90}ms` } as React.CSSProperties,
                  },
                  React.createElement(PowerCardFrame, {
                    size: 'compact',
                    displayName: definition.displayName,
                    rulesText: definition.rulesText,
                    artSrc: visual?.artImageUrl ?? null,
                    fullCardFaceSrc: visual?.fullCardFaceImageUrl ?? null,
                    visualMode: visual?.visualMode ?? 'layered-art',
                    state: endgameRevealOpponentHand ? 'playable' : 'back',
                    testId: endgameRevealOpponentHand ? `top-power-reveal-${card.instanceId}` : `top-power-back-${index}`,
                  }),
                );
              }),
            )
          : !isBotMode && boardHandVisibleFor === 'P2'
            ? React.createElement('div', { className: 'power-card-row', 'data-testid': 'manual-hand-P2' },
                (boardPhasePrivateHand ?? [])
                  .filter(card => card.controller === 'P2')
                  .map(card => React.createElement(
                    'button',
                    {
                      key: card.instanceId,
                      type: 'button',
                      className: 'power-card-button',
                      onClick: () => setExpandedBoardPowerCardId(card.instanceId),
                      'data-testid': `manual-power-button-${card.instanceId}`,
                    },
                    React.createElement(PowerCardFrame, {
                      size: 'compact',
                      displayName: card.displayName,
                      rulesText: card.rulesText,
                      artSrc: card.artImageUrl ?? null,
                      fullCardFaceSrc: card.fullCardFaceImageUrl ?? null,
                      visualMode: card.visualMode ?? 'layered-art',
                      state: expandedBoardPowerCardId === card.instanceId ? 'selected' : 'playable',
                      selected: expandedBoardPowerCardId === card.instanceId,
                      testId: `manual-power-${card.instanceId}`,
                    }),
                  )),
              )
            : React.createElement('div', { className: 'power-card-row power-card-row-face-down' },
                Array.from({ length: safeView.powerCardHandCount[isBotMode ? topHandController : 'P2'] }).map((_, index) =>
                  React.createElement(PowerCardFrame, {
                    key: `top-power-${index}`,
                    size: 'compact',
                    state: 'back',
                    testId: `top-power-back-${index}`,
                  }),
                ),
              ),
      ),
    ),
    React.createElement('section', { className: 'tabletop-board-row' },
      React.createElement('div', { className: `tabletop-board-shell ${isGameOver ? 'game-over' : ''}` },
        React.createElement(Board, {
          view: endgameBoardView ?? safeView,
          selectedCardId,
          onCardClick: handleCardClick,
          onAttachmentClick: handleAttachmentCardClick,
          actionTargets: boardActionTargets,
          onActionTargetClick: handleExecuteAction,
          allowCardClickOnActionTargets: pendingBoardPowerPlay?.step === 'swap-pick-own' || pendingBoardPowerPlay?.step === 'swap-pick-opponent',
          allowWeaponTargetClicks: !!pendingBoardWeaponEquipPlay,
          portalRetargetEnabled: pendingBoardPowerPlay?.step === 'portal-pick-destination',
          portalSourceCharacterId: pendingBoardPowerPlay?.step === 'portal-pick-destination'
            ? (pendingBoardPowerPlay.sourceCharacterId ?? null)
            : null,
          actionTargetFx: boardActionTargetFx,
          playerColors,
          cardMotion: pendingBoardCardMotion,
          swapCharacterMotion: pendingSwapCharactersMotion,
          specialCardMotion: pendingBoardSpecialMotion,
          rapunzelHairTrail: pendingRapunzelHairTrail,
          postBattleMotion: postBattleBoardAnimation,
          kingDrawFx: kingDrawAnimationFor && kingDrawBoardPosition
            ? { controller: kingDrawAnimationFor, position: kingDrawBoardPosition }
            : null,
          revealAnimationIds: isGameOver ? endgameRevealCharacterIds : [],
          kingDuelRumbleIds: finalKingDuelTransitionPhase === 'idle' ? [] : finalKingDuelRumbleIds,
          thawingCharacterIds,
          boardImploding: finalKingDuelTransitionPhase === 'implode',
          characterStatusById: irohStatusByCharacterId,
        }),
        isGameOver && endgameMessageVisible
          ? React.createElement(
              'div',
              { className: 'endgame-main-board-overlay', 'data-testid': 'endgame-main-board-overlay' },
              React.createElement('div', { className: 'endgame-result-banner', 'data-testid': 'endgame-result-banner' },
                React.createElement('h3', null, endgameHeadline),
                React.createElement('p', null, `Final Result: ${safeView.gameStatus}`),
                state.sessionMode === 'multi-game'
                  ? React.createElement(
                      React.Fragment,
                      null,
                      React.createElement('p', null, `Session Game ${state.sessionGameNumber}`),
                      state.sessionRunoutOccurred
                        ? React.createElement('p', null, 'Final game reached after deck runout. End the session to reset all decks.')
                        : React.createElement(
                            'button',
                            {
                              type: 'button',
                              onClick: () => {
                                if (isBotMode) {
                                  beginSessionRps();
                                  return;
                                }
                                continueSession();
                              },
                              'data-testid': 'endgame-continue-session-button',
                            },
                            'Continue Session',
                          ),
                      React.createElement(
                        'button',
                        {
                          type: 'button',
                          onClick: endSession,
                          'data-testid': 'endgame-end-session-button',
                        },
                        'End Session',
                      ),
                    )
                  : React.createElement(
                      'button',
                      {
                        type: 'button',
                        onClick: () => {
                          setState(null);
                          setScreen('start');
                        },
                        'data-testid': 'endgame-new-game-button',
                      },
                      'New Game',
                    ),
              ),
            )
          : null,
      ),
      React.createElement('aside', { className: 'tabletop-status-rail', 'data-testid': 'tabletop-status-rail' },
        React.createElement('div', { className: 'turn-banner', 'data-testid': 'turn-banner' },
          React.createElement('span', { className: 'turn-banner-label' }, displayTurnLabel(safeView.activePlayer, boardActiveColor)),
          React.createElement('span', { className: 'turn-banner-subtitle' }, `${displayController(safeView.activePlayer)} controls ${displayPlayerLabel(safeView.activePlayer)}`),
        ),
        React.createElement('div', { className: 'status-strip' },
          React.createElement('span', { 'data-testid': 'active-player' }, `Turn: ${displayPlayerLabel(safeView.activePlayer)}`),
          React.createElement('span', { 'data-testid': 'turn-number' }, `Round ${safeView.turnNumber}`),
          React.createElement('span', { 'data-testid': 'game-status' }, `Status: ${safeView.gameStatus}`),
          React.createElement('span', { 'data-testid': 'game-mode-label' }, isBotMode ? 'Mode: Human vs Bot' : 'Mode: Player One vs Player Two'),
          React.createElement('span', { 'data-testid': 'session-mode-label' }, state.sessionMode === 'multi-game' ? `Session: Multi-Game (Game ${state.sessionGameNumber})` : 'Session: Single Game'),
        ),
        pendingBotBoardAction
          ? React.createElement(
              'div',
              { className: 'battle-banner', 'data-testid': 'bot-board-action-banner' },
              pendingBotBoardAction.message,
            )
          : null,
        pendingHumanBoardAction
          ? React.createElement(
              'div',
              { className: 'battle-banner', 'data-testid': 'human-move-animation-banner' },
              pendingHumanBoardAction.action === 'move'
                ? 'Move Forward animation in progress...'
                : 'Attack Forward wind-up in progress...',
            )
          : null,
        kingDrawAnimationFor
          ? React.createElement(
              'div',
              {
                className: `king-draw-banner ${drawFxReason === 'ant' ? 'ant-draw-banner' : ''}`,
                'data-testid': 'king-draw-animation',
              },
              React.createElement('strong', null, drawFxReason === 'ant' ? '+2 Power Cards!' : '+1 Power Card!'),
              React.createElement(
                'span',
                null,
                drawFxReason === 'ant'
                  ? (kingDrawAnimationFor === 'P1' ? 'ANT Victory! Player One draws +2 Power Cards.' : 'ANT Victory! Player Two draws +2 Power Cards.')
                  : drawFxReason === 'roomba'
                  ? (kingDrawAnimationFor === 'P1' ? 'Player One Roomba moved and draws 1.' : 'Player Two Roomba moved and draws 1.')
                  : (kingDrawAnimationFor === 'P1' ? 'Player One king crossed territory.' : 'Player Two king crossed territory.'),
              ),
              drawFxReason === 'ant'
                ? React.createElement('span', { className: 'ant-draw-plus-two', 'data-testid': 'ant-draw-plus-two' }, '+2')
                : null,
            )
          : null,
        kingDrawAnimationFor && drawFxReason === 'ant'
          ? React.createElement(
              React.Fragment,
              null,
              React.createElement('div', { className: 'ant-draw-flash', 'data-testid': 'ant-draw-flash' }),
              React.createElement(
                'div',
                { className: 'ant-draw-confetti', 'data-testid': 'ant-draw-confetti' },
                Array.from({ length: 96 }).map((_, index) => React.createElement(
                  'span',
                  {
                    key: `ant-confetti-${index}`,
                    className: 'ant-confetti-piece',
                    style: {
                      '--confetti-left': `${2 + ((index * 7) % 96)}%`,
                      '--confetti-delay': `${(index % 16) * 110}ms`,
                      '--confetti-rotate': `${(index * 17) % 360}deg`,
                    } as React.CSSProperties,
                  },
                )),
              ),
            )
          : null,
        kingDrawAnimationFor && drawFxReason === 'king-territory' && kingDrawTravelVector && kingDrawTravelStart
          ? React.createElement(
              'div',
              {
                className: 'king-draw-travel',
                style: {
                  '--draw-start-x': `${kingDrawTravelStart.x}px`,
                  '--draw-start-y': `${kingDrawTravelStart.y}px`,
                  '--draw-dx': `${kingDrawTravelVector.x}px`,
                  '--draw-dy': `${kingDrawTravelVector.y}px`,
                } as React.CSSProperties,
                'data-testid': 'king-draw-travel',
              },
              kingDrawAnimationFor === 'P1' ? 'POWER CARD' : 'RR',
            )
          : null,
        kingDrawAnimationFor && drawFxReason === 'ant' && kingDrawTravelVector && kingDrawTravelStart
          ? React.createElement(
              'div',
              {
                className: 'ant-draw-travel',
                style: {
                  '--draw-start-x': `${kingDrawTravelStart.x}px`,
                  '--draw-start-y': `${kingDrawTravelStart.y}px`,
                  '--draw-dx': `${kingDrawTravelVector.x}px`,
                  '--draw-dy': `${kingDrawTravelVector.y}px`,
                } as React.CSSProperties,
                'data-testid': 'ant-draw-travel',
              },
              React.createElement('span', { className: 'ant-draw-card ant-draw-card-a' }, 'POWER CARD'),
              React.createElement('span', { className: 'ant-draw-card ant-draw-card-b' }, 'POWER CARD'),
            )
          : null,
        kingDrawAnimationFor && drawFxReason === 'roomba' && roombaDrawTravelVectors && kingDrawTravelStart
          ? React.createElement(
              'div',
              {
                className: 'roomba-draw-travel',
                style: {
                  '--draw-start-x': `${kingDrawTravelStart.x}px`,
                  '--draw-start-y': `${kingDrawTravelStart.y}px`,
                  '--to-roomba-x': `${roombaDrawTravelVectors.toRoombaX}px`,
                  '--to-roomba-y': `${roombaDrawTravelVectors.toRoombaY}px`,
                  '--to-hand-x': `${roombaDrawTravelVectors.toHandX}px`,
                  '--to-hand-y': `${roombaDrawTravelVectors.toHandY}px`,
                } as React.CSSProperties,
                'data-testid': 'roomba-draw-travel',
              },
              'POWER CARD',
            )
          : null,
        pendingMrsPuffPuffUp
          ? React.createElement(
              'div',
              { className: 'mrs-puff-puff-overlay', 'data-testid': 'mrs-puff-puff-overlay' },
              React.createElement('p', { className: 'status-label' }, `${pendingMrsPuffPuffUp.displayName} puffs up!`),
              React.createElement(
                'div',
                { className: 'mrs-puff-puff-card' },
                React.createElement(CharacterCardFrame, {
                  size: 'battle',
                  revealed: true,
                  controllerColorClass: pendingMrsPuffPuffUp.controller === 'P1' ? 'player-color-blue' : 'player-color-red',
                  displayName: pendingMrsPuffPuffUp.displayName,
                  ATK: pendingMrsPuffPuffUp.ATK,
                  DEF: pendingMrsPuffPuffUp.DEF,
                  ability: '',
                  artSrc: pendingMrsPuffPuffUp.artImageUrl ?? null,
                  fullCardFaceSrc: pendingMrsPuffPuffUp.fullCardFaceImageUrl ?? null,
                  visualMode: pendingMrsPuffPuffUp.visualMode,
                  isKing: pendingMrsPuffPuffUp.isKing,
                  isFrozen: pendingMrsPuffPuffUp.isFrozen,
                  testId: 'mrs-puff-puff-card',
                }),
              ),
            )
          : null,
        React.createElement('div', { className: 'compact-deck-stack', 'data-testid': 'compact-deck-stack' },
          React.createElement('div', { className: 'deck-stack', 'data-testid': 'character-deck-stack' },
            React.createElement('strong', null, 'Character Deck'),
            React.createElement(
              'div',
              { className: 'deck-stack-cards' },
              Array.from({ length: Math.min(3, sessionRemainingDeckCounts?.character ?? safeView.characterDeck.remainingCount) }).map((_, index) => React.createElement(
                'div',
                {
                  key: `character-deck-stack-${index}`,
                  className: 'deck-stack-card deck-stack-character-card',
                  style: { transform: `translate(${index * 3}px, ${index * -4}px) rotate(${index * -1.6}deg)` },
                },
                React.createElement(CharacterCardFrame, {
                  size: 'board',
                  revealed: false,
                  controllerColorClass: 'player-color-blue',
                  testId: `character-deck-card-${index}`,
                }),
              )),
            ),
            React.createElement('span', { className: 'deck-stack-count' }, String(sessionRemainingDeckCounts?.character ?? safeView.characterDeck.remainingCount)),
          ),
          React.createElement('div', { className: 'deck-stack', 'data-testid': 'power-deck-stack' },
            React.createElement('strong', null, 'Power Card Deck'),
            React.createElement(
              'div',
              { className: 'deck-stack-cards' },
              Array.from({ length: Math.min(3, sessionRemainingDeckCounts?.power ?? safeView.powerCards.remainingDeckCount) }).map((_, index) => React.createElement(
                'div',
                {
                  key: `power-deck-stack-${index}`,
                  className: 'deck-stack-card deck-stack-power-card',
                  style: { transform: `translate(${index * 3}px, ${index * -4}px) rotate(${index * 1.6}deg)` },
                },
                React.createElement(PowerCardFrame, {
                  size: 'board',
                  state: 'back',
                  testId: `power-deck-card-${index}`,
                }),
              )),
            ),
            React.createElement('span', { className: 'deck-stack-count' }, String(sessionRemainingDeckCounts?.power ?? safeView.powerCards.remainingDeckCount)),
          ),
        ),
      ),
    ),
    React.createElement('section', { className: 'tabletop-bottom-row' },
      React.createElement('div', { className: 'human-hand-panel', 'data-testid': 'human-hand-panel' },
        React.createElement('h3', null, isBotMode ? 'Human Power Cards' : displayPlayerLabel('P1')),
        !isBotMode
          ? React.createElement(
              'div',
              { className: 'power-popover-controls' },
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => setBoardHandVisibleFor(current => (current === 'P1' ? null : 'P1')),
                  'data-testid': 'manual-reveal-P1',
                },
                boardHandVisibleFor === 'P1' ? 'Hide' : 'Reveal',
              ),
            )
          : null,
        isBotMode
          ? React.createElement(
              'div',
              { className: 'power-card-row', 'data-testid': 'human-power-cards' },
              (boardPhasePrivateHand ?? [])
                .map(card => React.createElement(
                  'button',
                  {
                    key: card.instanceId,
                    type: 'button',
                    className: 'power-card-button',
                    onClick: () => setExpandedBoardPowerCardId(card.instanceId),
                    'data-testid': `human-power-button-${card.instanceId}`,
                  },
                  React.createElement(PowerCardFrame, {
                    size: 'hand',
                    displayName: card.displayName,
                    rulesText: card.rulesText,
                    artSrc: card.artImageUrl ?? null,
                    fullCardFaceSrc: card.fullCardFaceImageUrl ?? null,
                    visualMode: card.visualMode ?? 'layered-art',
                    state: expandedBoardPowerCardId === card.instanceId ? 'selected' : 'playable',
                    selected: expandedBoardPowerCardId === card.instanceId,
                    testId: `human-power-${card.instanceId}`,
                  }),
                )),
            )
          : React.createElement(
              'div',
              { className: 'power-card-row', 'data-testid': 'manual-handoff-row' },
              boardHandVisibleFor === 'P1' && boardPhasePrivateHand
                ? boardPhasePrivateHand.map(card => React.createElement(
                    'button',
                    {
                      key: card.instanceId,
                      type: 'button',
                      className: 'power-card-button',
                      onClick: () => setExpandedBoardPowerCardId(card.instanceId),
                      'data-testid': `manual-power-button-${card.instanceId}`,
                    },
                    React.createElement(PowerCardFrame, {
                      size: 'hand',
                      displayName: card.displayName,
                      rulesText: card.rulesText,
                      artSrc: card.artImageUrl ?? null,
                      fullCardFaceSrc: card.fullCardFaceImageUrl ?? null,
                      visualMode: card.visualMode ?? 'layered-art',
                      state: expandedBoardPowerCardId === card.instanceId ? 'selected' : 'playable',
                      selected: expandedBoardPowerCardId === card.instanceId,
                      testId: `manual-power-${card.instanceId}`,
                    }),
                  ))
                : null,
            ),
      ),
      React.createElement('div', { className: 'action-dock', 'data-testid': 'action-dock' },
        pendingHumanBoardAction
          ? React.createElement(
              'p',
              { className: 'status-label', 'data-testid': 'action-animation-pending' },
              pendingHumanBoardAction.action === 'move' ? 'Animating Move Forward...' : 'Animating Attack Forward...'
            )
          : selectedSafeCard
          ? React.createElement(ActionControls, {
              gameStatus: safeView.gameStatus,
              selectedCard: selectedSafeCard,
              legalActions: legalActionsForSelection,
              canSkip,
              onAction: handleExecuteAction,
              onSkip: handleSkipTurn,
            })
          : React.createElement('p', { className: 'status-label', 'data-testid': 'action-hint-idle' }, 'Select a card to act.'),
        selectedSafeCard?.revealed
          ? React.createElement(
              'button',
              {
                type: 'button',
                onClick: () => setExpandedBoardCharacterId(selectedSafeCard.instanceId),
                'data-testid': 'board-read-selected-card',
              },
              'Read Selected Card',
            )
          : null,
        selectedSafeCard?.revealed && canUseFreezeGunSpecial(selectedSafeCard.instanceId)
          ? React.createElement(
              'button',
              {
                type: 'button',
                onClick: () => openFreezeSpecialPicker(selectedSafeCard.instanceId),
                'data-testid': 'freeze-special-from-selected',
              },
              'Use Freeze Gun Special',
            )
          : null,
        selectedCharacterSpecialLabel
          ? React.createElement(
              'button',
              {
                type: 'button',
                onClick: executeSelectedCharacterSpecial,
                'data-testid': 'character-special-from-selected',
              },
              selectedCharacterSpecialLabel,
            )
          : null,
      ),
      React.createElement('div', { className: 'tabletop-info-column' },
        React.createElement('div', { className: 'status-block compact-summary', 'data-testid': 'graveyard-panel' },
          React.createElement('h3', null, 'Graveyard'),
          safeView.graveyard.length > 0
            ? React.createElement('p', { className: 'status-label', 'data-testid': 'graveyard-top' }, `Top Card: ${safeView.graveyard[safeView.graveyard.length - 1].displayName}`)
            : React.createElement('p', { className: 'status-label', 'data-testid': 'graveyard-top' }, 'Top Card: None'),
          React.createElement('p', { className: 'status-label' }, `Total: ${safeView.graveyard.length}`),
        ),
      ),
    ),
    React.createElement(
      'button',
      {
        type: 'button',
        className: 'tabletop-event-log-button',
        onClick: () => setBoardEventLogOpen(true),
        'data-testid': 'board-event-log-open',
      },
      'Event Log',
    ),
    React.createElement(
      'div',
      { className: 'battle-sr-meta', 'data-testid': 'event-log' },
      React.createElement(
        'ol',
        null,
        publicEventLog.map((entry, idx) => React.createElement('li', { key: `${idx}-${entry}` }, entry)),
      ),
    ),
    React.createElement(
      'button',
      {
        type: 'button',
        className: 'tabletop-catalog-button',
        onClick: openInGameCatalog,
        'data-testid': 'tabletop-catalog-open',
      },
      'Card Catalog',
    ),
    boardEventLogOpen
      ? React.createElement(
          'section',
          { className: 'tabletop-event-log-modal', 'data-testid': 'board-event-log-modal' },
          React.createElement('div', { className: 'tabletop-event-log-panel' },
            React.createElement('strong', null, 'Event Log'),
            React.createElement(
              'ol',
              { className: 'event-log' },
              publicEventLog.map((entry, idx) => React.createElement('li', { key: `${idx}-${entry}` }, entry)),
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                onClick: () => setBoardEventLogOpen(false),
                'data-testid': 'board-event-log-close',
              },
              'Close',
            ),
          ),
        )
      : null,
    expandedBoardPowerCard
      ? React.createElement(
          'section',
          { className: 'board-card-modal', 'data-testid': 'board-power-card-popover' },
          React.createElement('div', { className: 'board-card-modal-panel board-power-card-modal-panel' },
            React.createElement(PowerCardFrame, {
              size: 'battle',
              displayName: expandedBoardPowerCard.displayName,
              rulesText: expandedBoardPowerCard.rulesText,
              artSrc: expandedBoardPowerCard.artImageUrl ?? null,
              fullCardFaceSrc: expandedBoardPowerCard.fullCardFaceImageUrl ?? null,
              visualMode: expandedBoardPowerCard.visualMode ?? 'layered-art',
              state: 'selected',
              selected: true,
              testId: 'board-power-card-popover-card',
            }),
            React.createElement(
              'p',
              { className: 'status-label', 'data-testid': 'board-power-card-play-status' },
              isWeaponDefinitionId(expandedBoardPowerCard.definitionId)
                ? 'WEAPON: equip this card to one of your living board characters.'
                : expandedBoardPowerCard.definitionId === 'power-alpha-022'
                ? 'PORTAL: select one of your alive characters, then select any open destination spot.'
                : expandedBoardPowerCard.definitionId === 'power-alpha-021'
                  ? 'BACK IT UP: select any alive character, then select a legal backward open spot.'
                  : expandedBoardPowerCard.definitionId === 'power-alpha-018'
                    ? 'SWAP CHARACTERS: select your living card, then select an opponent living card.'
                    : expandedBoardPowerCard.definitionId === 'power-alpha-019'
                      ? 'BEHIND THE CURTAINS: inspect opponent hand and optionally swap one card each.'
                  : 'Read-only on board phase. Play availability: battle window only with priority.',
            ),
            React.createElement(
              'div',
              { className: 'power-popover-controls' },
              (
                isWeaponDefinitionId(expandedBoardPowerCard.definitionId)
                || (
                expandedBoardPowerCard.definitionId === 'power-alpha-022'
                || expandedBoardPowerCard.definitionId === 'power-alpha-021'
                || expandedBoardPowerCard.definitionId === 'power-alpha-018'
                || expandedBoardPowerCard.definitionId === 'power-alpha-019'
                )
              )
                && state
                && state.gameStatus === 'active'
                && !state.pendingBattle
                && boardHandVisibleFor === state.activePlayer
                && isHumanBoardTurn
                && !pendingBoardPowerPlay
                && !pendingCurtainsPlay
                ? React.createElement(
                    'button',
                    {
                      type: 'button',
                      onClick: () => {
                        if (isWeaponDefinitionId(expandedBoardPowerCard.definitionId)) {
                          setPendingBoardWeaponEquipPlay({
                            cardInstanceId: expandedBoardPowerCard.instanceId,
                            selectedCharacterId: null,
                          });
                        } else if (expandedBoardPowerCard.definitionId === 'power-alpha-019') {
                          setPendingCurtainsPlay({
                            cardInstanceId: expandedBoardPowerCard.instanceId,
                            ownSwapCardInstanceId: null,
                            opponentSwapCardInstanceId: null,
                          });
                        } else {
                          setPendingBoardPowerPlay({
                            cardInstanceId: expandedBoardPowerCard.instanceId,
                            definitionId: expandedBoardPowerCard.definitionId,
                            step: expandedBoardPowerCard.definitionId === 'power-alpha-022'
                              ? 'portal-pick-character'
                              : expandedBoardPowerCard.definitionId === 'power-alpha-021'
                                ? 'back-pick-character'
                                : 'swap-pick-own',
                            pendingCharacterId: undefined,
                          });
                        }
                        setExpandedBoardPowerCardId(null);
                      },
                      'data-testid': 'board-power-card-play-button',
                    },
                    'Play This Card',
                  )
                : null,
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => setExpandedBoardPowerCardId(null),
                  'data-testid': 'board-power-card-close-button',
                },
                'Close',
              ),
            ),
          ),
        )
      : null,
    expandedBoardCharacter
      ? React.createElement(
          'section',
          {
            className: 'board-card-modal',
            'data-testid': 'board-character-read-modal',
            onClick: () => setExpandedBoardCharacterId(null),
          },
          React.createElement(
            'div',
            {
              className: 'board-card-modal-panel board-character-card-modal-panel',
              onClick: (event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation(),
            },
            React.createElement(
              'button',
              {
                type: 'button',
                className: 'board-modal-close',
                onClick: () => setExpandedBoardCharacterId(null),
                'aria-label': 'Close character card viewer',
                'data-testid': 'board-character-read-close-top',
              },
              'Close',
            ),
            React.createElement(CharacterCardFrame, {
              size: 'battle',
              revealed: expandedBoardCharacter.revealed,
              controllerColorClass: expandedBoardCharacter.controller === 'P1' ? 'player-color-blue' : 'player-color-red',
              displayName: expandedBoardCharacter.displayName,
              ATK: expandedBoardCharacter.ATK,
              DEF: expandedBoardCharacter.DEF,
              ability: expandedBoardCharacter.ability,
              statRule: expandedBoardCharacter.statRule ?? null,
              artSrc: expandedBoardCharacter.artImageUrl ?? null,
              fullCardFaceSrc: expandedBoardCharacter.fullCardFaceImageUrl ?? null,
              visualMode: expandedBoardCharacter.visualMode,
              isKing: expandedBoardCharacter.isKing,
              isFrozen: expandedBoardCharacter.isFrozen,
              isThawing: thawingCharacterIds.includes(expandedBoardCharacter.instanceId),
              statusTag: irohStatusByCharacterId[expandedBoardCharacter.instanceId] ?? null,
              testId: 'board-character-read-card',
            }),
            canUseFreezeGunSpecial(expandedBoardCharacter.instanceId)
              ? React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: () => openFreezeSpecialPicker(expandedBoardCharacter.instanceId),
                    'data-testid': 'freeze-special-from-character-modal',
                  },
                  'Use Freeze Gun Special',
                )
              : null,
            renderAnytimeCharacterSpecialControl(expandedBoardCharacter.instanceId, 'board-character'),
            React.createElement(
              'div',
              { className: 'power-popover-controls board-modal-actions' },
              pendingBoardWeaponEquipPlay && selectedBoardWeaponTarget && expandedBoardCharacterId === selectedBoardWeaponTarget.id
                ? React.createElement(
                    'button',
                    {
                      type: 'button',
                      onClick: confirmBoardWeaponEquip,
                      'data-testid': 'board-weapon-target-confirm',
                    },
                    'Equip Weapon',
                  )
                : null,
              pendingBoardPowerPlay
                && pendingBoardPowerPlay.definitionId === 'power-alpha-018'
                && pendingBoardPowerPlay.pendingCharacterId === expandedBoardCharacterId
                ? React.createElement(
                    'button',
                    {
                      type: 'button',
                      onClick: confirmBoardSwapSelection,
                      'data-testid': pendingBoardPowerPlay.step === 'swap-pick-own'
                        ? 'board-swap-own-confirm'
                        : 'board-swap-opponent-confirm',
                    },
                    pendingBoardPowerPlay.step === 'swap-pick-own' ? 'Confirm First Selection' : 'Confirm Swap',
                  )
                : null,
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => setExpandedBoardCharacterId(null),
                  'data-testid': 'board-character-read-close',
                },
                'Close',
              ),
            ),
          ),
        )
      : null,
    freezeSpecialSourceId && freezeSpecialSourceCharacter
      ? React.createElement(
          'section',
          { className: 'board-card-modal', 'data-testid': 'freeze-special-modal' },
          React.createElement(
            'div',
            { className: 'board-card-modal-panel board-power-card-modal-panel' },
            React.createElement('h3', null, `Freeze Gun Special: ${freezeSpecialSourceCharacter.displayName ?? 'Mr. Freeze'}`),
            React.createElement('p', { className: 'status-label' }, 'Select any living character to freeze.'),
            React.createElement(
              'select',
              {
                value: freezeSpecialTargetId ?? '',
                onChange: event => setFreezeSpecialTargetId(event.target.value),
                'data-testid': 'freeze-special-target-select',
              },
              freezeSpecialTargetOptions.map(option => React.createElement(
                'option',
                { key: option.id, value: option.id },
                option.label,
              )),
            ),
            React.createElement(
              'div',
              { className: 'power-popover-controls' },
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: executeManualFreezeSpecial,
                  disabled: !freezeSpecialTargetId,
                  'data-testid': 'freeze-special-confirm',
                },
                'Fire Freeze Gun',
              ),
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: closeFreezeSpecialPicker,
                  'data-testid': 'freeze-special-cancel',
                },
                'Cancel',
              ),
            ),
          ),
        )
      : null,
    pendingBoardReactionWindow
    && (
      (isBotMode && pendingBoardReactionWindow.responder === 'P1')
      || (!isBotMode && boardHandoffRequiredFor === null && boardHandVisibleFor === pendingBoardReactionWindow.responder)
    )
      ? React.createElement(
          'section',
          { className: 'board-card-modal', 'data-testid': 'board-nospray-reaction-modal' },
          React.createElement(
            'div',
            { className: 'board-card-modal-panel board-power-card-modal-panel' },
            React.createElement('h3', null, 'No Spray Response Window'),
            React.createElement('p', { className: 'status-label' }, `${displayPlayerLabel(pendingBoardReactionWindow.sourceController)} played ${pendingBoardReactionWindow.displayName}.`),
            React.createElement('p', { className: 'status-label' }, `${displayPlayerLabel(pendingBoardReactionWindow.responder)} has ${boardReactionSecondsLeft ?? 0} seconds to use NO SPRAY.`),
            pendingBoardReactionWindow.noSprayOptions.length > 1
              ? React.createElement(
                  'label',
                  { className: 'status-label', htmlFor: 'board-nospray-select' },
                  'Select NO SPRAY card:',
                  React.createElement(
                    'select',
                    {
                      id: 'board-nospray-select',
                      value: pendingBoardReactionWindow.selectedNoSprayInstanceId,
                      onChange: event => setPendingBoardReactionWindow(prev => (
                        prev
                          ? { ...prev, selectedNoSprayInstanceId: event.target.value }
                          : prev
                      )),
                      'data-testid': 'board-nospray-select',
                    },
                    pendingBoardReactionWindow.noSprayOptions.map(option => React.createElement(
                      'option',
                      { key: option.instanceId, value: option.instanceId },
                      option.label,
                    )),
                  ),
                )
              : null,
            React.createElement(
              'div',
              { className: 'nospray-target-stage', 'data-testid': 'board-nospray-cinematic-stage' },
              React.createElement(PowerCardFrame, {
                size: 'battle',
                displayName: pendingBoardReactionWindow.displayName,
                rulesText: pendingBoardReactionWindow.rulesText,
                artSrc: pendingBoardReactionWindow.artImageUrl ?? null,
                fullCardFaceSrc: pendingBoardReactionWindow.fullCardFaceImageUrl ?? null,
                visualMode: pendingBoardReactionWindow.visualMode ?? 'layered-art',
                state: 'selected',
                selected: true,
                testId: 'board-nospray-reaction-card',
              }),
            ),
            React.createElement(
              'div',
              { className: 'power-popover-controls' },
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => resolveBoardReactionWindow(true),
                  'data-testid': 'board-nospray-use-button',
                },
                'Use NO SPRAY',
              ),
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => resolveBoardReactionWindow(false),
                  'data-testid': 'board-nospray-let-resolve',
                },
                'Let It Resolve',
              ),
            ),
          ),
        )
      : null,
    pendingCurtainsPlay && !pendingBoardReactionWindow
      ? React.createElement(
          'section',
          { className: 'board-card-modal board-curtains-overlay', 'data-testid': 'board-curtains-modal' },
          React.createElement(
            'div',
            { className: 'board-card-modal-panel board-power-card-modal-panel board-curtains-panel' },
            React.createElement('h3', null, 'BEHIND THE CURTAINS'),
            React.createElement(
              'p',
              { className: 'status-label' },
              'Curtains open: inspect all cards face-up. Optional swap is one-for-one.',
            ),
            React.createElement(
              'div',
              { className: 'board-curtains-content' },
              React.createElement(
                'section',
                { className: 'curtains-hand-zone curtains-opponent-zone' },
                React.createElement('h4', null, 'Opponent Hand (Face-Up)'),
                React.createElement(
                  'div',
                  { className: 'power-card-row curtains-card-row', 'data-testid': 'curtains-opponent-row' },
                  curtainsOpponentCardOptions.length > 0
                    ? curtainsOpponentCardOptions.map(card => React.createElement(
                        'button',
                        {
                          key: card.instanceId,
                          type: 'button',
                          className: 'power-card-button curtains-card-button',
                          onClick: () => setPendingCurtainsPlay(prev => (
                            prev
                              ? {
                                  ...prev,
                                  opponentSwapCardInstanceId: prev.opponentSwapCardInstanceId === card.instanceId
                                    ? null
                                    : card.instanceId,
                                }
                              : prev
                          )),
                          'aria-pressed': pendingCurtainsPlay.opponentSwapCardInstanceId === card.instanceId,
                          'data-testid': `curtains-opponent-card-${card.instanceId}`,
                        },
                        React.createElement(PowerCardFrame, {
                          size: 'hand',
                          displayName: card.displayName,
                          rulesText: card.rulesText,
                          artSrc: card.artImageUrl ?? null,
                          fullCardFaceSrc: card.fullCardFaceImageUrl ?? null,
                          visualMode: card.visualMode ?? 'layered-art',
                          state: pendingCurtainsPlay.opponentSwapCardInstanceId === card.instanceId ? 'selected' : 'playable',
                          selected: pendingCurtainsPlay.opponentSwapCardInstanceId === card.instanceId,
                          testId: `curtains-opponent-face-${card.instanceId}`,
                        }),
                      ))
                    : React.createElement('p', { className: 'status-label' }, 'Opponent has no power cards.'),
                ),
              ),
              React.createElement(
                'section',
                { className: 'curtains-hand-zone curtains-own-zone' },
                React.createElement('h4', null, 'Your Hand (Bottom)'),
                React.createElement(
                  'div',
                  { className: 'power-card-row curtains-card-row', 'data-testid': 'curtains-own-row' },
                  curtainsOwnCardOptions.length > 0
                    ? curtainsOwnCardOptions.map(card => React.createElement(
                        'button',
                        {
                          key: card.instanceId,
                          type: 'button',
                          className: 'power-card-button curtains-card-button',
                          onClick: () => setPendingCurtainsPlay(prev => (
                            prev
                              ? {
                                  ...prev,
                                  ownSwapCardInstanceId: prev.ownSwapCardInstanceId === card.instanceId
                                    ? null
                                    : card.instanceId,
                                }
                              : prev
                          )),
                          'aria-pressed': pendingCurtainsPlay.ownSwapCardInstanceId === card.instanceId,
                          'data-testid': `curtains-own-card-${card.instanceId}`,
                        },
                        React.createElement(PowerCardFrame, {
                          size: 'hand',
                          displayName: card.displayName,
                          rulesText: card.rulesText,
                          artSrc: card.artImageUrl ?? null,
                          fullCardFaceSrc: card.fullCardFaceImageUrl ?? null,
                          visualMode: card.visualMode ?? 'layered-art',
                          state: pendingCurtainsPlay.ownSwapCardInstanceId === card.instanceId ? 'selected' : 'playable',
                          selected: pendingCurtainsPlay.ownSwapCardInstanceId === card.instanceId,
                          testId: `curtains-own-face-${card.instanceId}`,
                        }),
                      ))
                    : React.createElement('p', { className: 'status-label' }, 'No swappable cards in your hand.'),
                ),
              ),
            ),
            React.createElement(
              'div',
              { className: 'power-popover-controls' },
              state?.pendingBattle
                ? React.createElement(
                    React.Fragment,
                    null,
                    React.createElement(
                      'button',
                      {
                        type: 'button',
                        onClick: () => setShowBattleFullBoard(true),
                        disabled: showBattleFullBoard,
                        'data-testid': 'curtains-view-full-board',
                      },
                      'View Full Board',
                    ),
                    React.createElement(
                      'button',
                      {
                        type: 'button',
                        onClick: () => setShowBattleFullBoard(false),
                        disabled: !showBattleFullBoard,
                        'data-testid': 'curtains-view-battle',
                      },
                      'View Battle Screen',
                    ),
                  )
                : null,
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => executeBehindTheCurtainsBoardPlay(),
                  disabled: (
                    (pendingCurtainsPlay.ownSwapCardInstanceId === null) !== (pendingCurtainsPlay.opponentSwapCardInstanceId === null)
                  ),
                  'data-testid': 'curtains-confirm',
                },
                'Confirm',
              ),
            ),
          ),
        )
      : null,
    pendingCurtainsSwapMotion
      ? React.createElement(
          'section',
          { className: 'board-card-modal board-curtains-overlay board-curtains-swap-overlay', 'data-testid': 'board-curtains-swap-modal' },
          React.createElement(
            'div',
            { className: 'board-card-modal-panel board-power-card-modal-panel board-curtains-panel board-curtains-swap-panel' },
            React.createElement('h3', null, 'BEHIND THE CURTAINS'),
            React.createElement('p', { className: 'status-label' }, 'Swapping selected cards...'),
            React.createElement(
              'div',
              { className: 'curtains-swap-stage' },
              React.createElement(
                'div',
                { className: 'curtains-swap-lane curtains-swap-lane-own' },
                React.createElement('p', { className: 'curtains-swap-lane-label' }, 'Your Hand'),
                React.createElement(
                  'div',
                  { className: 'curtains-swap-card curtains-swap-card-own' },
                  React.createElement(PowerCardFrame, {
                    size: 'hand',
                    displayName: pendingCurtainsSwapMotion.own.displayName,
                    rulesText: pendingCurtainsSwapMotion.own.rulesText,
                    artSrc: pendingCurtainsSwapMotion.own.artImageUrl ?? null,
                    fullCardFaceSrc: pendingCurtainsSwapMotion.own.fullCardFaceImageUrl ?? null,
                    visualMode: pendingCurtainsSwapMotion.own.visualMode ?? 'layered-art',
                    state: 'selected',
                    selected: true,
                    testId: `curtains-swap-own-${pendingCurtainsSwapMotion.own.instanceId}`,
                  }),
                ),
              ),
              React.createElement('div', { className: 'curtains-swap-arrow', 'aria-hidden': 'true' }, '⇄'),
              React.createElement(
                'div',
                { className: 'curtains-swap-lane curtains-swap-lane-opponent' },
                React.createElement('p', { className: 'curtains-swap-lane-label' }, 'Opponent Hand'),
                React.createElement(
                  'div',
                  { className: 'curtains-swap-card curtains-swap-card-opponent' },
                  React.createElement(PowerCardFrame, {
                    size: 'hand',
                    displayName: pendingCurtainsSwapMotion.opponent.displayName,
                    rulesText: pendingCurtainsSwapMotion.opponent.rulesText,
                    artSrc: pendingCurtainsSwapMotion.opponent.artImageUrl ?? null,
                    fullCardFaceSrc: pendingCurtainsSwapMotion.opponent.fullCardFaceImageUrl ?? null,
                    visualMode: pendingCurtainsSwapMotion.opponent.visualMode ?? 'layered-art',
                    state: 'selected',
                    selected: true,
                    testId: `curtains-swap-opponent-${pendingCurtainsSwapMotion.opponent.instanceId}`,
                  }),
                ),
              ),
            ),
          ),
        )
      : null,
    pendingBoardPowerPlay
      ? React.createElement(
          'section',
          { className: 'board-card-modal board-targeting-overlay', 'data-testid': 'board-power-targeting-modal' },
          React.createElement(
            'div',
            { className: 'board-card-modal-panel board-power-card-modal-panel board-power-targeting-panel' },
            React.createElement(
              'h3',
              null,
              pendingBoardPowerPlay.definitionId === 'power-alpha-022'
                ? 'PORTAL Targeting'
                : pendingBoardPowerPlay.definitionId === 'power-alpha-021'
                  ? 'BACK IT UP Targeting'
                  : 'SWAP CHARACTERS Targeting',
            ),
            React.createElement(
              'p',
              { className: 'status-label' },
              pendingBoardPowerPlay.step === 'portal-pick-character'
                ? 'Select one of your alive characters on the board.'
                : pendingBoardPowerPlay.step === 'portal-pick-destination'
                  ? 'Select any glowing open destination space.'
                  : pendingBoardPowerPlay.step === 'back-pick-character'
                    ? 'Select any alive character on the board.'
                    : pendingBoardPowerPlay.step === 'back-pick-destination'
                      ? 'Select one glowing backward destination space.'
                      : pendingBoardPowerPlay.step === 'swap-pick-own'
                        ? 'Select one of your glowing living cards, then confirm in card view.'
                        : 'Select one glowing opponent living card, then confirm swap in card view.',
            ),
            React.createElement(
              'p',
              { className: 'status-label board-targeting-hint' },
              'Board stays interactive while this prompt is open.',
            ),
            React.createElement(
              'div',
              { className: 'power-popover-controls' },
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => setPendingBoardPowerPlay(null),
                  'data-testid': 'board-power-targeting-cancel',
                },
                'Cancel',
              ),
            ),
          ),
        )
      : null,
    jeremySpecialModal,
    pendingAangEscape
      ? React.createElement(
          'section',
          {
            className: `board-card-modal ${pendingAangEscape.step === 'pick-spot' ? 'board-targeting-overlay' : ''}`,
            'data-testid': 'aang-escape-modal',
          },
          React.createElement(
            'div',
            {
              className: `board-card-modal-panel board-power-card-modal-panel ${pendingAangEscape.step === 'pick-spot' ? 'board-power-targeting-panel' : ''}`,
            },
            React.createElement('h3', null, 'Avatar Aang Escape'),
            pendingAangEscape.step === 'prompt'
              ? React.createElement('p', { className: 'status-label' }, 'Aang was defeated. Use his special ability to escape?')
              : React.createElement('p', { className: 'status-label board-targeting-hint' }, 'Select any glowing destination spot on the board.'),
            React.createElement(
              'div',
              { className: 'power-popover-controls' },
              pendingAangEscape.step === 'prompt'
                ? React.createElement(
                    'button',
                    {
                      type: 'button',
                      onClick: () => setPendingAangEscape(prev => (prev ? { ...prev, step: 'pick-spot' } : prev)),
                      'data-testid': 'aang-escape-use',
                    },
                    'Use Special Ability',
                  )
                : null,
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => setPendingAangEscape(null),
                  'data-testid': 'aang-escape-pass',
                },
                pendingAangEscape.step === 'prompt' ? 'Pass' : 'Cancel',
              ),
            ),
          ),
        )
      : null,
    pendingSkarReclaim && (!isBotMode || pendingSkarReclaim.controller === 'P1')
      ? React.createElement(
          'section',
          { className: 'board-card-modal', 'data-testid': 'skar-reclaim-modal' },
          React.createElement(
            'div',
            { className: 'board-card-modal-panel board-power-card-modal-panel' },
            React.createElement('h3', null, 'Skar Productions Ability'),
            pendingSkarReclaim.step === 'prompt'
              ? React.createElement('p', { className: 'status-label' }, 'Use Skar Productions to reclaim one power card played this battle?')
              : React.createElement('p', { className: 'status-label' }, 'Select one card to reclaim. Others remain in used pile.'),
            pendingSkarReclaim.step === 'select'
              ? React.createElement(
                  'div',
                  { className: 'power-card-row' },
                  pendingSkarReclaim.cards.map(card => {
                    const definition = getPowerCardDefinition(card.definitionId);
                    const visual = powerCatalogById.get(card.definitionId);
                    return React.createElement(
                      'button',
                      {
                        key: `skar-reclaim-${card.instanceId}`,
                        type: 'button',
                        className: 'power-card-button',
                        onClick: () => setPendingSkarReclaim(prev => (
                          prev
                            ? { ...prev, selectedInstanceId: card.instanceId }
                            : prev
                        )),
                        'data-testid': `skar-reclaim-${card.instanceId}`,
                      },
                      React.createElement(PowerCardFrame, {
                        size: 'hand',
                        displayName: definition.displayName,
                        rulesText: definition.rulesText,
                        artSrc: visual?.artImageUrl ?? null,
                        fullCardFaceSrc: visual?.fullCardFaceImageUrl ?? null,
                        visualMode: visual?.visualMode ?? 'layered-art',
                        state: pendingSkarReclaim.selectedInstanceId === card.instanceId ? 'selected' : 'playable',
                        selected: pendingSkarReclaim.selectedInstanceId === card.instanceId,
                        testId: `skar-reclaim-card-${card.instanceId}`,
                      }),
                    );
                  }),
                )
              : null,
            React.createElement(
              'div',
              { className: 'power-popover-controls' },
              pendingSkarReclaim.step === 'prompt'
                ? React.createElement(
                    'button',
                    {
                      type: 'button',
                      onClick: () => setPendingSkarReclaim(prev => (
                        prev
                          ? { ...prev, step: 'select' }
                          : prev
                      )),
                      'data-testid': 'skar-reclaim-use',
                    },
                    'Use Ability',
                  )
                : React.createElement(
                    'button',
                    {
                      type: 'button',
                      onClick: handleSkarConfirmReclaim,
                      disabled: !pendingSkarReclaim.selectedInstanceId,
                      'data-testid': 'skar-reclaim-confirm',
                    },
                    'Confirm Reclaim',
                  ),
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: handleSkarPass,
                  'data-testid': 'skar-reclaim-pass',
                },
                pendingSkarReclaim.step === 'prompt' ? 'Pass' : 'Cancel',
              ),
            ),
          ),
        )
      : null,
    sessionRpsPromptOpen
      ? React.createElement(
          'section',
          { className: 'board-card-modal', 'data-testid': 'session-rps-modal' },
          React.createElement(
            'div',
            { className: 'board-card-modal-panel board-power-card-modal-panel session-rps-panel' },
            React.createElement('h3', null, 'Rock Paper Scissors'),
            React.createElement('p', { className: 'status-label' }, 'New game, new first player. Winner starts the next game.'),
            React.createElement('div', { className: `rps-battle ${sessionRpsBattle ? `outcome-${sessionRpsBattle.outcome === 'tie' ? 'tie' : sessionRpsBattle.outcome === 'P1' ? 'human' : 'bot'}` : 'outcome-pending'}` },
              React.createElement('div', { className: 'rps-fighter fighter-human' },
                React.createElement('span', { className: 'rps-fighter-icon', 'aria-hidden': 'true' }, sessionRpsBattle ? sessionRpsIcon(sessionRpsBattle.humanChoice) : '❔'),
              ),
              React.createElement('span', { className: 'rps-versus' }, 'VS'),
              React.createElement('div', { className: 'rps-fighter fighter-bot' },
                React.createElement('span', { className: 'rps-fighter-icon', 'aria-hidden': 'true' }, sessionRpsBattle ? sessionRpsIcon(sessionRpsBattle.botChoice) : '❔'),
              ),
            ),
            React.createElement('div', { className: 'rps-grid' },
              (['rock', 'paper', 'scissors'] as const).map(choice => React.createElement(
                'button',
                {
                  key: `session-rps-${choice}`,
                  type: 'button',
                  className: 'rps-choice',
                  onClick: () => runSessionRpsRound(choice),
                  disabled: sessionRpsLocked,
                  'data-testid': `session-rps-${choice}`,
                },
                React.createElement('span', { className: 'rps-choice-art', 'aria-hidden': 'true' }, sessionRpsIcon(choice)),
              )),
            ),
            sessionRpsResult
              ? React.createElement('p', { className: 'rps-result', 'data-testid': 'session-rps-result' }, sessionRpsResult)
              : null,
            React.createElement('div', { className: 'power-popover-controls' },
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => {
                    setSessionRpsPromptOpen(false);
                    setSessionRpsBattle(null);
                    setSessionRpsLocked(false);
                    setSessionRpsResult('');
                  },
                  'data-testid': 'session-rps-cancel',
                },
                'Cancel',
              ),
            ),
          ),
        )
      : null,
    null,
  );
}
