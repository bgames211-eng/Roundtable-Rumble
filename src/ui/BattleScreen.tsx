import React, { useEffect, useMemo, useState } from 'react';
import { Board } from './Board';
import { CharacterCardFrame, PowerCardFrame } from './CardFrames';
import type {
  BattlePublicView,
  PlayBattlePowerCardInput,
  PrivateBattleHandView,
} from '../battleFlow';
import type { Controller } from '../gameState';
import type { PlayerSafeGameView } from '../setup';
import type { PlayerColor } from './StartScreen';
import { FIRST_ALPHA_POWER_CARD_DEFINITIONS } from '../powerCards';
import { loadPowerCatalog } from '../cardCatalog';
import { getBackwardSpace } from '../board';
import './BattleScreen.css';

const SEEN_BATTLE_INTROS = new Set<string>();

interface BattleScreenProps {
  battle: BattlePublicView;
  boardView: PlayerSafeGameView;
  privateHand: PrivateBattleHandView | null;
  hasUsedPowerThisBattle?: boolean;
  usedPowerCardsThisBattle?: BattlePublicView['usedPowerCards'];
  handoffRequiredFor: Controller | null;
  battleIntroKey: string;
  botPriorityPanel?: {
    message: string;
    handCount: number;
  } | null;
  botPowerReveal?: {
    displayName: string;
    rulesText: string;
    visualMode?: 'layered-art' | 'full-card-face';
    artImageUrl?: string;
    fullCardFaceImageUrl?: string;
  } | null;
  multiplayerPowerReveal?: {
    actor: Controller;
    displayName: string;
    rulesText: string;
    visualMode?: 'layered-art' | 'full-card-face';
    artImageUrl?: string;
    fullCardFaceImageUrl?: string;
  } | null;
  isBotMode?: boolean;
  multiplayerSeat?: Controller | null;
  onOpenFullBoard?: () => void;
  playerColors?: { P1: PlayerColor; P2: PlayerColor };
  cardMotion?: {
    characterId: string;
    type: 'move' | 'attack';
    fromPosition: 'P1_1' | 'P1_2' | 'P1_3' | 'P1_4' | 'P1_5' | 'P2_1' | 'P2_2' | 'P2_3' | 'P2_4' | 'P2_5';
    toPosition: 'P1_1' | 'P1_2' | 'P1_3' | 'P1_4' | 'P1_5' | 'P2_1' | 'P2_2' | 'P2_3' | 'P2_4' | 'P2_5';
  } | null;
  swapCharacterMotion?: {
    first: {
      characterId: string;
      revealed: boolean;
      displayName: string;
      ATK: number;
      DEF: number;
      isKing: boolean;
      toIsKing: boolean;
      isFrozen?: boolean;
      fromController: 'P1' | 'P2';
      toController: 'P1' | 'P2';
      fromPosition: 'P1_1' | 'P1_2' | 'P1_3' | 'P1_4' | 'P1_5' | 'P2_1' | 'P2_2' | 'P2_3' | 'P2_4' | 'P2_5';
      toPosition: 'P1_1' | 'P1_2' | 'P1_3' | 'P1_4' | 'P1_5' | 'P2_1' | 'P2_2' | 'P2_3' | 'P2_4' | 'P2_5';
      visualMode?: 'layered-art' | 'full-card-face';
      artImageUrl?: string;
      fullCardFaceImageUrl?: string;
    };
    second?: {
      characterId: string;
      revealed: boolean;
      displayName: string;
      ATK: number;
      DEF: number;
      isKing: boolean;
      toIsKing: boolean;
      isFrozen?: boolean;
      fromController: 'P1' | 'P2';
      toController: 'P1' | 'P2';
      fromPosition: 'P1_1' | 'P1_2' | 'P1_3' | 'P1_4' | 'P1_5' | 'P2_1' | 'P2_2' | 'P2_3' | 'P2_4' | 'P2_5';
      toPosition: 'P1_1' | 'P1_2' | 'P1_3' | 'P1_4' | 'P1_5' | 'P2_1' | 'P2_2' | 'P2_3' | 'P2_4' | 'P2_5';
      visualMode?: 'layered-art' | 'full-card-face';
      artImageUrl?: string;
      fullCardFaceImageUrl?: string;
    };
    nextState: unknown;
    durationMs?: number;
  } | null;
  postBattleMotion?: {
    loser: {
      id: string;
      displayName: string;
      ATK: number;
      DEF: number;
      isKing: boolean;
      controller: 'P1' | 'P2';
      fromPosition: 'P1_1' | 'P1_2' | 'P1_3' | 'P1_4' | 'P1_5' | 'P2_1' | 'P2_2' | 'P2_3' | 'P2_4' | 'P2_5';
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
      controller: 'P1' | 'P2';
      fromPosition: 'P1_1' | 'P1_2' | 'P1_3' | 'P1_4' | 'P1_5' | 'P2_1' | 'P2_2' | 'P2_3' | 'P2_4' | 'P2_5';
      toPosition: 'P1_1' | 'P1_2' | 'P1_3' | 'P1_4' | 'P1_5' | 'P2_1' | 'P2_2' | 'P2_3' | 'P2_4' | 'P2_5';
      visualMode?: 'layered-art' | 'full-card-face';
      artImageUrl?: string;
      fullCardFaceImageUrl?: string;
    } | null;
  } | null;
  characterStatusById?: Record<string, string>;
  gauntletEnergizedCharacterIds?: string[];
  manualHandsByController?: { P1: PrivateBattleHandView; P2: PrivateBattleHandView } | null;
  revealedPowerCardInstanceIds?: { P1: string[]; P2: string[] } | null;
  autoExpandCardInstanceId?: string | null;
  revealedHandFor?: Controller | null;
  onRevealHand?: (controller: Controller) => void;
  onAcknowledgeHandoff: (player: Controller) => void;
  onAcknowledgeBotPowerReveal?: () => void;
  onSetReady: (ready: boolean) => void;
  onAttachmentClick?: (characterId: string, attachmentInstanceId: string) => void;
  onOpenCharacterCard?: (characterId: string) => void;
  onPlayCard: (input: PlayBattlePowerCardInput) => void;
  onResolveBattle: () => void;
}

function battleTypeLabel(type: BattlePublicView['battleType']): string {
  return type === 'attack' ? 'Attack Forward' : 'Self-Defend';
}

function playerLabel(controller: Controller): string {
  return controller === 'P1' ? 'Player One' : 'Player Two';
}

function colorClassFor(player: PlayerColor | undefined): string {
  if (!player) return 'player-color-blue';
  return `player-color-${player.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function cardVisualFor(boardView: PlayerSafeGameView, cardId: string): { artSrc: string | null; fullCardFaceSrc: string | null; visualMode: 'layered-art' | 'full-card-face' } {
  const card = boardView.boardCards.find(entry => entry.instanceId === cardId);
  return {
    artSrc: card?.artImageUrl ?? null,
    fullCardFaceSrc: card?.fullCardFaceImageUrl ?? null,
    visualMode: card?.visualMode ?? 'layered-art',
  };
}

const BOARD_ENTRY_VECTORS: Record<string, { x: number; y: number; rotation: number }> = {
  P2_3: { x: 0, y: -250, rotation: 0 },
  P2_4: { x: 215, y: -225, rotation: 9 },
  P2_5: { x: 340, y: -145, rotation: 12 },
  P1_5: { x: 340, y: 60, rotation: -12 },
  P1_4: { x: 215, y: 135, rotation: -8 },
  P1_3: { x: 0, y: 170, rotation: 0 },
  P1_2: { x: -215, y: 135, rotation: 8 },
  P1_1: { x: -340, y: 60, rotation: 12 },
  P2_1: { x: -340, y: -145, rotation: -12 },
  P2_2: { x: -215, y: -225, rotation: -8 },
};

function outcomeClass(outcome: 'leading' | 'trailing' | 'tied'): string {
  if (outcome === 'leading') return 'battle-outcome-leading';
  if (outcome === 'trailing') return 'battle-outcome-trailing';
  return 'battle-outcome-tied';
}

function renderMatchupCard(
  title: string,
  card: BattlePublicView['initiator'],
  outcome: 'leading' | 'trailing' | 'tied',
  orientation: 'human' | 'bot',
  scoreStatLabel: string,
  scoreValue: number,
  controllerColorClass: string,
  activeStatLabel: string,
  attachedPowerCards: React.ReactNode,
  tagTeamSupportCard: React.ReactNode,
  cardVisual: { artSrc: string | null; fullCardFaceSrc: string | null; visualMode: 'layered-art' | 'full-card-face' },
  statusTag: string | null,
  onOpenCharacterCard?: (characterId: string) => void,
  resolveRoleClass?: string,
): React.ReactElement {
  const entry = BOARD_ENTRY_VECTORS[card.boardPosition] ?? { x: 0, y: -220, rotation: 0 };
  const entryStyle = {
    '--entry-x': `${entry.x}px`,
    '--entry-y': `${entry.y}px`,
    '--entry-rotation': `${entry.rotation}deg`,
  } as React.CSSProperties;

  const normalizedStat = activeStatLabel.toUpperCase() === 'ATK' ? 'atk' : activeStatLabel.toUpperCase() === 'DEF' ? 'def' : 'none';

  const mainBattleCard = React.createElement(
    'button',
    {
      type: 'button',
      className: 'battle-battler-card-button',
      onClick: () => onOpenCharacterCard?.(card.id),
      'data-testid': `battle-open-character-${card.id}`,
    },
    React.createElement(CharacterCardFrame, {
      size: 'battle',
      revealed: true,
      controllerColorClass,
      displayName: card.displayName,
      ATK: card.ATK,
      DEF: card.DEF,
      ability: '',
      artSrc: cardVisual.artSrc,
      fullCardFaceSrc: cardVisual.fullCardFaceSrc,
      visualMode: cardVisual.visualMode,
      isKing: card.isKing,
      isFrozen: card.isFrozen,
      statusTag,
      testId: `battle-name-${card.id}`,
    }),
  );

  const cardStack = tagTeamSupportCard
    ? React.createElement(
        'div',
        { className: 'battle-tag-team-pair' },
        mainBattleCard,
        tagTeamSupportCard,
      )
    : mainBattleCard;

  return React.createElement(
    'article',
    {
      className: `battle-duel-card cinematic-entry ${outcomeClass(outcome)} battle-orientation-${orientation} battle-stat-${normalizedStat} ${resolveRoleClass ?? ''}`,
      style: entryStyle,
      'data-testid': `battle-duel-${card.controller}`,
    },
    React.createElement(
      'p',
      { className: 'battle-card-score-header', 'data-testid': `battle-score-${card.controller}` },
      React.createElement('span', { className: 'battle-score-stat' }, scoreStatLabel),
      React.createElement('span', { className: 'battle-score-value' }, String(scoreValue)),
    ),
    React.createElement(
      'div',
      { className: 'battle-character-stack' },
      cardStack,
      React.createElement('div', { className: 'battle-attached-power-zone' }, attachedPowerCards),
    ),
  );
}

function renderCinematicRevealCard(
  label: string,
  card: BattlePublicView['initiator'],
  revealed: boolean,
  cardVisual: { artSrc: string | null; fullCardFaceSrc: string | null; visualMode: 'layered-art' | 'full-card-face' },
  statusTag: string | null,
): React.ReactElement {
  return React.createElement(
    'div',
    { className: 'battle-cinematic-card' },
    React.createElement('h4', null, label),
    React.createElement(CharacterCardFrame, {
      size: 'battle',
      revealed,
      controllerColorClass: card.controller === 'P1' ? 'player-color-blue' : 'player-color-red',
      displayName: card.displayName,
      ATK: card.ATK,
      DEF: card.DEF,
      ability: '',
      artSrc: cardVisual.artSrc,
      fullCardFaceSrc: cardVisual.fullCardFaceSrc,
      visualMode: cardVisual.visualMode,
      isKing: card.isKing,
      isFrozen: card.isFrozen,
      statusTag: revealed ? statusTag : null,
      testId: `battle-cinematic-${card.id}`,
    }),
  );
}

export function BattleScreen({
  battle,
  boardView,
  privateHand,
  hasUsedPowerThisBattle = false,
  usedPowerCardsThisBattle = [],
  handoffRequiredFor,
  battleIntroKey,
  botPriorityPanel = null,
  botPowerReveal = null,
  multiplayerPowerReveal = null,
  isBotMode = false,
  multiplayerSeat = null,
  onOpenFullBoard,
  playerColors,
  cardMotion = null,
  swapCharacterMotion = null,
  postBattleMotion = null,
  characterStatusById = {},
  gauntletEnergizedCharacterIds = [],
  manualHandsByController = null,
  revealedPowerCardInstanceIds = null,
  autoExpandCardInstanceId = null,
  revealedHandFor = null,
  onRevealHand,
  onAcknowledgeHandoff,
  onAcknowledgeBotPowerReveal,
  onSetReady,
  onAttachmentClick,
  onOpenCharacterCard,
  onPlayCard,
  onResolveBattle,
}: BattleScreenProps): React.ReactElement {
  const [cinematicPhase, setCinematicPhase] = useState<'clash' | 'reveal' | 'hold' | 'main'>('clash');
  const [selectedChoices, setSelectedChoices] = useState<Record<string, 'ATK' | 'DEF'>>({});
  const [expandedPowerCardId, setExpandedPowerCardId] = useState<string | null>(null);
  const [resolvingAnimationActive, setResolvingAnimationActive] = useState(false);
  const [resolvePhase, setResolvePhase] = useState<'idle' | 'strike' | 'graveyard' | 'used' | 'advance'>('idle');
  const [resolveTravel, setResolveTravel] = useState<{ usedX: number; usedY: number; graveX: number; graveY: number } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [riddlerFxActive, setRiddlerFxActive] = useState(false);
  const [mirrorFxActive, setMirrorFxActive] = useState(false);
  const onResolveBattleRef = React.useRef(onResolveBattle);

  useEffect(() => {
    onResolveBattleRef.current = onResolveBattle;
  }, [onResolveBattle]);

  const canResolve = battle.status === 'ReadyToResolve';
  const canReadyToggle = battle.status === 'WindowOpen';
  const isCurrentReady = battle.readyPlayers[battle.currentPriorityPlayer];
  const isMultiplayerSeatView = !!multiplayerSeat;
  const readyToggleLocked = (isBotMode && battle.currentPriorityPlayer === 'P2')
    || (isMultiplayerSeatView && battle.currentPriorityPlayer !== multiplayerSeat);
  const privateCards = privateHand?.cards ?? [];
  const manualP1Cards = manualHandsByController?.P1.cards ?? [];
  const manualP2Cards = manualHandsByController?.P2.cards ?? [];
  const revealedSetP1 = new Set(revealedPowerCardInstanceIds?.P1 ?? []);
  const revealedSetP2 = new Set(revealedPowerCardInstanceIds?.P2 ?? []);
  const p1ReadyLabel = isBotMode ? 'Human' : 'Player One';
  const p2ReadyLabel = isBotMode ? 'Bot' : 'Player Two';
  const priorityLabel = battle.currentPriorityPlayer === 'P1' ? p1ReadyLabel : p2ReadyLabel;
  const visibleManualCards = isMultiplayerSeatView
    ? privateCards
    : !isBotMode
      ? (revealedHandFor === 'P1' ? manualP1Cards : revealedHandFor === 'P2' ? manualP2Cards : [])
      : privateCards;
  const scoreDelta = battle.initiatorEffectiveComparison - battle.opponentEffectiveComparison;
  const humanCard = battle.initiator.controller === 'P1' ? battle.initiator : battle.opponent;
  const rivalCard = battle.initiator.controller === 'P2' ? battle.initiator : battle.opponent;
  const humanScoreValue = battle.initiator.controller === humanCard.controller
    ? battle.initiatorEffectiveComparison
    : battle.opponentEffectiveComparison;
  const rivalScoreValue = battle.initiator.controller === rivalCard.controller
    ? battle.initiatorEffectiveComparison
    : battle.opponentEffectiveComparison;
  const humanActiveComparisonLabel = battle.initiator.controller === humanCard.controller
    ? battle.initiatorComparisonLabel
    : battle.opponentComparisonLabel;
  const rivalActiveComparisonLabel = battle.initiator.controller === rivalCard.controller
    ? battle.initiatorComparisonLabel
    : battle.opponentComparisonLabel;
  const scoreLabel = `${humanActiveComparisonLabel} ${humanScoreValue} vs ${rivalActiveComparisonLabel} ${rivalScoreValue}`;
  const sideScoreDelta = humanScoreValue - rivalScoreValue;
  const humanOutcome: 'leading' | 'trailing' | 'tied' = sideScoreDelta > 0 ? 'leading' : sideScoreDelta < 0 ? 'trailing' : 'tied';
  const rivalOutcome: 'leading' | 'trailing' | 'tied' = sideScoreDelta < 0 ? 'leading' : sideScoreDelta > 0 ? 'trailing' : 'tied';
  const p1ColorClass = colorClassFor(playerColors?.P1);
  const p2ColorClass = colorClassFor(playerColors?.P2);
  const powerCatalogById = useMemo(
    () => new Map(loadPowerCatalog(FIRST_ALPHA_POWER_CARD_DEFINITIONS).map(entry => [entry.definitionId, entry])),
    [],
  );
  const battleVisualById = useMemo(() => {
    const map = new Map<string, { artSrc: string | null; fullCardFaceSrc: string | null; visualMode: 'layered-art' | 'full-card-face' }>();
    for (const card of boardView.boardCards) {
      map.set(card.instanceId, {
        artSrc: card.artImageUrl ?? null,
        fullCardFaceSrc: card.fullCardFaceImageUrl ?? null,
        visualMode: card.visualMode ?? 'layered-art',
      });
    }
    return map;
  }, [boardView.boardCards]);
  const effectGroups = useMemo(() => {
    const targetIds = new Set([humanCard.id, rivalCard.id]);
    const bySource = new Map<string, { targets: Set<string>; summary: string; source: string; definitionId?: string }>();

    for (const modifier of battle.liveModifiers) {
      if (!targetIds.has(modifier.targetCharacterId)) {
        continue;
      }
      const key = `${modifier.sourceCardName}::${modifier.controller}`;
      const current = bySource.get(key) ?? {
        targets: new Set<string>(),
        summary: modifier.effectSummary,
        source: modifier.sourceCardName,
        definitionId: modifier.sourceDefinitionId,
      };
      if (!current.definitionId && modifier.sourceDefinitionId) {
        current.definitionId = modifier.sourceDefinitionId;
      }
      current.targets.add(modifier.targetCharacterId);
      bySource.set(key, current);
    }

    return Array.from(bySource.entries()).map(([key, value]) => ({
      key,
      source: value.source,
      definitionId: value.definitionId,
      summary: value.summary,
      targets: value.targets,
      shared: value.targets.size > 1 || value.source.toLowerCase() === 'flip the script',
    }));
  }, [battle.liveModifiers, humanCard.id, rivalCard.id]);
  const championAdvantageAttachments = useMemo(() => {
    const defaultInitiatorLabel = battle.battleType === 'attack' ? 'ATK' : 'DEF';
    const attachments: Array<{
      key: string;
      source: string;
      definitionId?: string;
      summary: string;
      targets: Set<string>;
      shared: boolean;
      sourceCharacterId?: string;
      attachmentInstanceId?: string;
    }> = [];

    if (battle.initiatorComparisonLabel !== defaultInitiatorLabel) {
      attachments.push({
        key: `champions-advantage-${battle.initiator.controller}`,
        source: "CHAMPION'S ADVANTAGE",
        definitionId: 'power-alpha-003',
        summary: `Own comparison stat set to ${battle.initiatorComparisonLabel} for this battle`,
        targets: new Set<string>([battle.initiator.id]),
        shared: false,
      });
    }

    if (battle.opponentComparisonLabel !== 'DEF') {
      attachments.push({
        key: `champions-advantage-${battle.opponent.controller}`,
        source: "CHAMPION'S ADVANTAGE",
        definitionId: 'power-alpha-003',
        summary: `Own comparison stat set to ${battle.opponentComparisonLabel} for this battle`,
        targets: new Set<string>([battle.opponent.id]),
        shared: false,
      });
    }

    return attachments;
  }, [
    battle.battleType,
    battle.initiator.id,
    battle.initiator.controller,
    battle.initiatorComparisonLabel,
    battle.opponent.id,
    battle.opponent.controller,
    battle.opponentComparisonLabel,
  ]);
  const attachedEffectCards = useMemo(
    () => {
      const participantAttachments = [
        ...humanCard.attachments.map((attachment, index) => ({
          key: `equip-${humanCard.id}-${attachment.instanceId}-${index}`,
          source: attachment.displayName,
          definitionId: attachment.definitionId,
          category: attachment.category,
          summary: `Equipped: +${attachment.ATK} ATK / +${attachment.DEF} DEF`,
          targets: new Set<string>([humanCard.id]),
          shared: false,
          sourceCharacterId: humanCard.id,
          attachmentInstanceId: attachment.instanceId,
          artImageUrl: attachment.artImageUrl ?? null,
          fullCardFaceImageUrl: attachment.fullCardFaceImageUrl ?? null,
          visualMode: attachment.visualMode ?? 'layered-art',
        })),
        ...rivalCard.attachments.map((attachment, index) => ({
          key: `equip-${rivalCard.id}-${attachment.instanceId}-${index}`,
          source: attachment.displayName,
          definitionId: attachment.definitionId,
          category: attachment.category,
          summary: `Equipped: +${attachment.ATK} ATK / +${attachment.DEF} DEF`,
          targets: new Set<string>([rivalCard.id]),
          shared: false,
          sourceCharacterId: rivalCard.id,
          attachmentInstanceId: attachment.instanceId,
          artImageUrl: attachment.artImageUrl ?? null,
          fullCardFaceImageUrl: attachment.fullCardFaceImageUrl ?? null,
          visualMode: attachment.visualMode ?? 'layered-art',
        })),
      ];

      return [...effectGroups.filter(group => !group.shared), ...championAdvantageAttachments, ...participantAttachments];
    },
    [championAdvantageAttachments, effectGroups, humanCard.attachments, humanCard.id, rivalCard.attachments, rivalCard.id],
  );
  const sharedEffectCards = effectGroups.filter(group => group.shared);
  const hasFlipSharedCard = sharedEffectCards.some(group => group.source.toLowerCase() === 'flip the script');
  const sharedEffectsForRender = battle.statsSwapped && !hasFlipSharedCard
    ? [
        ...sharedEffectCards,
        {
          key: 'flip-the-script-shared',
          source: 'FLIP THE SCRIPT',
          definitionId: 'power-alpha-007',
          summary: 'Both battlers swap ATK/DEF base stats for this battle',
          targets: new Set<string>([humanCard.id, rivalCard.id]),
          shared: true,
        },
      ]
    : sharedEffectCards;
  const expandedPowerCard = visibleManualCards.find(card => card.instanceId === expandedPowerCardId) ?? null;
  const explicitExpandedChoice = expandedPowerCard ? selectedChoices[expandedPowerCard.instanceId] : undefined;
  const expandedChoice = expandedPowerCard
    ? (explicitExpandedChoice ?? expandedPowerCard.allowedChoices[0])
    : undefined;
  const expandedRequiresChoice = !!expandedPowerCard && expandedPowerCard.allowedChoices.length > 0;
  const expandedCanPlay = !!expandedPowerCard
    && expandedPowerCard.isPlayable
    && (!expandedRequiresChoice || !!expandedChoice);

  const isFinalKingDuel = battle.initiator.isKing && battle.opponent.isKing;
  const winningController = sideScoreDelta === 0
    ? null
    : (sideScoreDelta > 0 ? 'P1' : 'P2');
  const canAdvanceAfterResolve = !battle.isFinalKingDuel && battle.battleType === 'attack' && winningController === battle.initiator.controller;
  const usedCardsForResolve = usedPowerCardsThisBattle.slice(-3);
  const riddlerReferences = [
    battle.initiatorRiddlerSource
      ? { source: battle.initiatorRiddlerSource, owner: battle.initiator }
      : null,
    battle.opponentRiddlerSource
      ? { source: battle.opponentRiddlerSource, owner: battle.opponent }
      : null,
  ].filter((entry): entry is { source: NonNullable<BattlePublicView['initiatorRiddlerSource']>; owner: BattlePublicView['initiator'] } => !!entry);
  const riddlerReferenceSignature = riddlerReferences
    .map(entry => `${entry.owner.id}:${entry.source.instanceId}`)
    .join('|');
  const mirrorReferences = useMemo(() => {
    const isMirrorName = (name: string | undefined): boolean => (
      (name ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '') === 'MIRROR'
    );

    const entries: Array<{
      key: string;
      ownerId: string;
      ownerDisplayName: string;
      ownerController: 'P1' | 'P2';
      copiedFromDisplayName: string;
      copiedATK: number;
      copiedDEF: number;
      source: 'main' | 'attachment' | 'riddler-source';
    }> = [];

    const pushMirrorEntry = (
      owner: BattlePublicView['initiator'],
      copiedFrom: BattlePublicView['initiator'],
      source: 'main' | 'attachment' | 'riddler-source',
    ): void => {
      const key = `${owner.id}:${source}`;
      if (entries.some(entry => entry.key === key)) {
        return;
      }
      entries.push({
        key,
        ownerId: owner.id,
        ownerDisplayName: owner.displayName,
        ownerController: owner.controller,
        copiedFromDisplayName: copiedFrom.displayName,
        copiedATK: copiedFrom.ATK,
        copiedDEF: copiedFrom.DEF,
        source,
      });
    };

    if (isMirrorName(battle.initiator.displayName)) {
      pushMirrorEntry(battle.initiator, battle.opponent, 'main');
    }
    if (isMirrorName(battle.opponent.displayName)) {
      pushMirrorEntry(battle.opponent, battle.initiator, 'main');
    }

    if (battle.initiator.attachments.some(attachment => attachment.category === 'follower' && isMirrorName(attachment.displayName))) {
      pushMirrorEntry(battle.initiator, battle.opponent, 'attachment');
    }
    if (battle.opponent.attachments.some(attachment => attachment.category === 'follower' && isMirrorName(attachment.displayName))) {
      pushMirrorEntry(battle.opponent, battle.initiator, 'attachment');
    }

    if (battle.initiatorRiddlerSource && isMirrorName(battle.initiatorRiddlerSource.displayName)) {
      pushMirrorEntry(battle.initiator, battle.opponent, 'riddler-source');
    }
    if (battle.opponentRiddlerSource && isMirrorName(battle.opponentRiddlerSource.displayName)) {
      pushMirrorEntry(battle.opponent, battle.initiator, 'riddler-source');
    }

    return entries;
  }, [battle.initiator, battle.initiatorRiddlerSource, battle.opponent, battle.opponentRiddlerSource]);
  const mirrorReferenceSignature = mirrorReferences
    .map(entry => `${entry.key}:${entry.copiedFromDisplayName}:${entry.copiedATK}/${entry.copiedDEF}`)
    .join('|');

  useEffect(() => {
    if (riddlerReferences.length === 0) {
      setRiddlerFxActive(false);
      return;
    }

    setRiddlerFxActive(true);
    const timer = window.setTimeout(() => {
      setRiddlerFxActive(false);
    }, 6200);

    return () => window.clearTimeout(timer);
  }, [battleIntroKey, riddlerReferenceSignature]);

  useEffect(() => {
    if (mirrorReferences.length === 0) {
      setMirrorFxActive(false);
      return;
    }

    setMirrorFxActive(true);
    const timer = window.setTimeout(() => {
      setMirrorFxActive(false);
    }, 5200);

    return () => window.clearTimeout(timer);
  }, [battleIntroKey, mirrorReferenceSignature]);

  useEffect(() => {
    const isJsdomTestEnv = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
    const prefersReducedMotion =
      typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (SEEN_BATTLE_INTROS.has(battleIntroKey)) {
      setCinematicPhase('main');
      setResolvingAnimationActive(false);
      setResolvePhase('idle');
      setExpandedPowerCardId(null);
      return;
    }

    if (prefersReducedMotion || isJsdomTestEnv) {
      setCinematicPhase('main');
      return;
    }

    setCinematicPhase('clash');
    setResolvingAnimationActive(false);
    setResolvePhase('idle');
    setExpandedPowerCardId(null);

    const revealTimer = window.setTimeout(() => {
      setCinematicPhase('reveal');
    }, 600);

    const holdTimer = window.setTimeout(() => {
      setCinematicPhase('hold');
    }, 900);

    const mainTimer = window.setTimeout(() => {
      SEEN_BATTLE_INTROS.add(battleIntroKey);
      setCinematicPhase('main');
    }, 1450);

    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(holdTimer);
      window.clearTimeout(mainTimer);
    };
  }, [battleIntroKey]);

  useEffect(() => {
    if (handoffRequiredFor) {
      setExpandedPowerCardId(null);
      setHistoryOpen(false);
    }
  }, [handoffRequiredFor]);

  useEffect(() => {
    if (!autoExpandCardInstanceId) {
      return;
    }
    setExpandedPowerCardId(autoExpandCardInstanceId);
  }, [autoExpandCardInstanceId]);

  useEffect(() => {
    if (!isBotMode || !canResolve || resolvingAnimationActive || cinematicPhase !== 'main') {
      return;
    }

    const timer = window.setTimeout(() => {
      beginResolveSequence();
    }, 450);

    return () => window.clearTimeout(timer);
  }, [canResolve, cinematicPhase, isBotMode, resolvingAnimationActive]);

  useEffect(() => {
    if (!resolvingAnimationActive) {
      setResolveTravel(null);
      return;
    }

    const raf = window.requestAnimationFrame(() => {
      const usedTarget = document.querySelector('[data-testid="center-used-power-pile"]') as HTMLElement | null;
      const usedStart = document.querySelector('.battle-used-fly-card.fly-1') as HTMLElement | null;

      if (!usedTarget || !usedStart) {
        return;
      }

      const usedTargetRect = usedTarget.getBoundingClientRect();
      const usedStartRect = usedStart.getBoundingClientRect();

      const usedX = (usedTargetRect.left + usedTargetRect.width / 2) - (usedStartRect.left + usedStartRect.width / 2);
      const usedY = (usedTargetRect.top + usedTargetRect.height / 2) - (usedStartRect.top + usedStartRect.height / 2);
      const graveTarget = document.querySelector('[data-testid="center-graveyard-pile"]') as HTMLElement | null;
      const graveStart = document.querySelector('.battle-loser-fly-card') as HTMLElement | null;
      let graveX = 0;
      let graveY = 0;

      if (graveTarget && graveStart) {
        const graveTargetRect = graveTarget.getBoundingClientRect();
        const graveStartRect = graveStart.getBoundingClientRect();
        graveX = (graveTargetRect.left + graveTargetRect.width / 2) - (graveStartRect.left + graveStartRect.width / 2);
        graveY = (graveTargetRect.top + graveTargetRect.height / 2) - (graveStartRect.top + graveStartRect.height / 2);
      }

      setResolveTravel({ usedX, usedY, graveX, graveY });
    });

    return () => window.cancelAnimationFrame(raf);
  }, [resolvingAnimationActive, resolvePhase, usedCardsForResolve.length]);

  const renderAttachedPowerCardsFor = (targetCharacterId: string): React.ReactNode => {
    const linkedModifiers = attachedEffectCards.filter(group => group.targets.has(targetCharacterId));

    return linkedModifiers.map((modifier, index) => {
      const clickable = !!onAttachmentClick && !!modifier.sourceCharacterId && !!modifier.attachmentInstanceId;
      const isFollowerAttachment = 'category' in modifier && modifier.category === 'follower';

      return React.createElement(
        clickable ? 'button' : 'div',
        {
          key: `${targetCharacterId}-${modifier.key}-${index}`,
          className: 'battle-attached-power-card',
          style: { '--attach-index': index } as React.CSSProperties,
          type: clickable ? 'button' : undefined,
          onClick: clickable
            ? () => onAttachmentClick(modifier.sourceCharacterId!, modifier.attachmentInstanceId!)
            : undefined,
          'data-testid': clickable
            ? `battle-attachment-action-${modifier.sourceCharacterId}-${modifier.attachmentInstanceId}`
            : `battle-attached-card-${targetCharacterId}-${index}`,
        },
        isFollowerAttachment
          ? React.createElement(CharacterCardFrame, {
              size: 'compact',
              revealed: true,
              controllerColorClass: 'player-color-blue',
              displayName: modifier.source,
              ATK: 0,
              DEF: 0,
              ability: '',
              artSrc: (modifier as { artImageUrl?: string | null }).artImageUrl ?? null,
              fullCardFaceSrc: (modifier as { fullCardFaceImageUrl?: string | null }).fullCardFaceImageUrl ?? null,
              visualMode: (modifier as { visualMode?: 'layered-art' | 'full-card-face' }).visualMode,
              isKing: false,
              isFrozen: false,
              testId: `battle-attached-card-${targetCharacterId}-${index}`,
            })
          : React.createElement(PowerCardFrame, {
              size: 'compact',
              displayName: modifier.source,
              rulesText: modifier.summary,
              artSrc: modifier.definitionId ? powerCatalogById.get(modifier.definitionId)?.artImageUrl ?? null : null,
              fullCardFaceSrc: modifier.definitionId ? powerCatalogById.get(modifier.definitionId)?.fullCardFaceImageUrl ?? null : null,
              visualMode: modifier.definitionId ? powerCatalogById.get(modifier.definitionId)?.visualMode : 'layered-art',
              state: 'selected',
              selected: true,
              testId: `battle-attached-card-${targetCharacterId}-${index}`,
            }),
      );
    });
  };

  const renderTagTeamSupportFor = (targetCharacterId: string): React.ReactNode => {
    const hasTagTeam = battle.liveModifiers.some(
      modifier => modifier.sourceDefinitionId === 'power-alpha-016' && modifier.targetCharacterId === targetCharacterId,
    );

    if (!hasTagTeam) {
      return null;
    }

    const target = boardView.boardCards.find(card => card.instanceId === targetCharacterId);
    if (!target || !target.boardPosition) {
      return null;
    }

    const behindPosition = getBackwardSpace(target.boardPosition);
    const support = boardView.boardCards.find(card => (
      card.alive
      && card.controller === target.controller
      && card.boardPosition === behindPosition
    ));

    if (!support) {
      return null;
    }

    return React.createElement(
      'div',
      {
        className: `battle-tag-team-support ${support.revealed ? '' : 'battle-tag-team-support-hidden'}`,
        'data-testid': `battle-tag-team-support-${targetCharacterId}`,
      },
      React.createElement(
        'div',
        { className: 'battle-tag-team-support-aura', 'aria-hidden': 'true' },
        React.createElement('span', { className: 'battle-tag-team-burst battle-tag-team-burst-a' }),
        React.createElement('span', { className: 'battle-tag-team-burst battle-tag-team-burst-b' }),
      ),
      React.createElement('p', { className: 'battle-tag-team-label' }, 'Tag Team'),
      React.createElement(CharacterCardFrame, {
        size: 'compact',
        revealed: support.revealed,
        controllerColorClass: support.controller === 'P1' ? 'player-color-blue' : 'player-color-red',
        displayName: support.displayName,
        ATK: support.ATK,
        DEF: support.DEF,
        ability: support.ability,
        artSrc: support.artImageUrl ?? null,
        fullCardFaceSrc: support.fullCardFaceImageUrl ?? null,
        visualMode: support.visualMode,
        isKing: support.isKing,
        isFrozen: support.isFrozen,
        statusTag: characterStatusById[support.instanceId] ?? null,
        testId: `battle-tag-team-card-${support.instanceId}`,
      }),
    );
  };

  const beginResolveSequence = (): void => {
    if (resolvingAnimationActive) {
      return;
    }
    onResolveBattleRef.current();
  };

  useEffect(() => {
    if (battle.status !== 'Resolving') {
      if (resolvingAnimationActive) {
        setResolvingAnimationActive(false);
      }
      if (resolvePhase !== 'idle') {
        setResolvePhase('idle');
      }
      return;
    }

    if (resolvingAnimationActive) {
      return;
    }

    const isJsdomTestEnv = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
    if (isJsdomTestEnv) {
      onResolveBattleRef.current();
      return;
    }

    setResolvingAnimationActive(true);
    setResolvePhase('strike');

    const graveyardTimer = window.setTimeout(() => setResolvePhase('graveyard'), 700);
    const usedTimer = hasUsedPowerThisBattle
      ? window.setTimeout(() => setResolvePhase('used'), 1300)
      : null;
    const advanceTimer = hasUsedPowerThisBattle
      ? window.setTimeout(() => setResolvePhase(canAdvanceAfterResolve ? 'advance' : 'used'), 1900)
      : window.setTimeout(() => setResolvePhase(canAdvanceAfterResolve ? 'advance' : 'graveyard'), 1500);
    const resolveTimer = window.setTimeout(() => {
      onResolveBattleRef.current();
    }, hasUsedPowerThisBattle ? (canAdvanceAfterResolve ? 2800 : 2400) : (canAdvanceAfterResolve ? 2300 : 2000));

    return () => {
      window.clearTimeout(graveyardTimer);
      if (usedTimer !== null) {
        window.clearTimeout(usedTimer);
      }
      window.clearTimeout(advanceTimer);
      window.clearTimeout(resolveTimer);
    };
  }, [battle.status, canAdvanceAfterResolve, hasUsedPowerThisBattle]);

  const leftHandPanel = useMemo(() => {
    if (isMultiplayerSeatView) {
      if (multiplayerSeat !== 'P1') {
        return React.createElement('div', { className: 'battle-opponent-column' },
          Array.from({ length: battle.powerCardHandCount.P1 }).map((_, idx) => React.createElement(PowerCardFrame, {
            key: `battle-opponent-back-P1-${idx}`,
            size: 'hand',
            state: 'back',
            testId: `battle-opponent-back-P1-${idx}`,
          })),
        );
      }

      return React.createElement(
        'div',
        { className: 'battle-private-hand', 'data-testid': 'battle-private-hand-P1' },
        privateCards.map(card => React.createElement(
          'div',
          { key: card.instanceId, className: 'battle-private-card', 'data-testid': `battle-private-card-${card.instanceId}` },
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'battle-hand-card-button',
              onClick: () => setExpandedPowerCardId(card.instanceId),
              'data-testid': `battle-card-tap-${card.instanceId}`,
            },
            React.createElement(PowerCardFrame, {
              size: 'hand',
              displayName: card.displayName,
              rulesText: card.rulesText,
              artSrc: card.artImageUrl ?? null,
              fullCardFaceSrc: card.fullCardFaceImageUrl ?? null,
              visualMode: card.visualMode ?? 'layered-art',
              state: card.isPlayable ? (expandedPowerCardId === card.instanceId ? 'selected' : 'playable') : 'disabled',
              selected: expandedPowerCardId === card.instanceId,
              testId: `battle-private-card-frame-${card.instanceId}`,
            }),
          ),
        )),
      );
    }

    if (!isBotMode) {
      const cards = revealedHandFor === 'P1' ? manualP1Cards : [];
      if (cards.length === 0) {
        const hiddenCount = manualP1Cards.length;
        return React.createElement(
          'div',
          { className: 'battle-hand-placeholder', 'data-testid': 'battle-hand-placeholder-P1' },
          React.createElement('p', null, 'Cards hidden. Press Reveal to view Player One hand.'),
          hiddenCount > 0
            ? React.createElement(
                'div',
                { className: 'battle-opponent-column', 'data-testid': 'battle-hidden-hand-P1' },
                manualP1Cards.map((card, idx) => {
                  const revealed = revealedSetP1.has(card.instanceId);
                  if (!revealed) {
                    return React.createElement(PowerCardFrame, {
                      key: `battle-hidden-back-P1-${idx}`,
                      size: 'hand',
                      state: 'back',
                      testId: `battle-hidden-back-P1-${idx}`,
                    });
                  }

                  return React.createElement(PowerCardFrame, {
                    key: `battle-hidden-revealed-P1-${card.instanceId}`,
                    size: 'hand',
                    displayName: card.displayName,
                    rulesText: card.rulesText,
                    artSrc: card.artImageUrl ?? null,
                    fullCardFaceSrc: card.fullCardFaceImageUrl ?? null,
                    visualMode: card.visualMode ?? 'layered-art',
                    state: 'playable',
                    testId: `battle-hidden-revealed-P1-${card.instanceId}`,
                  });
                }),
              )
            : null,
        );
      }

      return React.createElement(
        'div',
        { className: 'battle-private-hand', 'data-testid': 'battle-private-hand-P1' },
        cards.map(card => React.createElement(
          'div',
          { key: card.instanceId, className: 'battle-private-card', 'data-testid': `battle-private-card-${card.instanceId}` },
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'battle-hand-card-button',
              onClick: () => setExpandedPowerCardId(card.instanceId),
              'data-testid': `battle-card-tap-${card.instanceId}`,
            },
            React.createElement(PowerCardFrame, {
              size: 'hand',
              displayName: card.displayName,
              rulesText: card.rulesText,
              artSrc: card.artImageUrl ?? null,
              fullCardFaceSrc: card.fullCardFaceImageUrl ?? null,
              visualMode: card.visualMode ?? 'layered-art',
              state: card.isPlayable ? (expandedPowerCardId === card.instanceId ? 'selected' : 'playable') : 'disabled',
              selected: expandedPowerCardId === card.instanceId,
              testId: `battle-private-card-frame-${card.instanceId}`,
            }),
          ),
        )),
      );
    }

    if (handoffRequiredFor) {
      return React.createElement(
        'div',
        { className: 'battle-hand-placeholder', 'data-testid': 'battle-hand-placeholder' },
        React.createElement('p', null, 'Power cards are hidden until handoff is acknowledged.'),
      );
    }

    return React.createElement(
      'div',
      { className: 'battle-private-hand', 'data-testid': `battle-private-hand-${battle.currentPriorityPlayer}` },
      privateCards.map(card => {
        return React.createElement(
          'div',
          { key: card.instanceId, className: 'battle-private-card', 'data-testid': `battle-private-card-${card.instanceId}` },
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'battle-hand-card-button',
              onClick: () => setExpandedPowerCardId(card.instanceId),
              'data-testid': `battle-card-tap-${card.instanceId}`,
            },
            React.createElement(PowerCardFrame, {
              size: 'hand',
              displayName: card.displayName,
              rulesText: card.rulesText,
              artSrc: card.artImageUrl ?? null,
              fullCardFaceSrc: card.fullCardFaceImageUrl ?? null,
              visualMode: card.visualMode ?? 'layered-art',
              state: card.isPlayable ? (expandedPowerCardId === card.instanceId ? 'selected' : 'playable') : 'disabled',
              selected: expandedPowerCardId === card.instanceId,
              testId: `battle-private-card-frame-${card.instanceId}`,
            }),
          ),
        );
      }),
    );
  }, [battle.powerCardHandCount.P1, expandedPowerCardId, handoffRequiredFor, isBotMode, isMultiplayerSeatView, manualP1Cards, multiplayerSeat, privateCards, revealedHandFor, revealedPowerCardInstanceIds]);

  const rightHandPanel = useMemo(() => {
    if (isMultiplayerSeatView) {
      if (multiplayerSeat === 'P1') {
        return React.createElement('div', { className: 'battle-opponent-column' },
          Array.from({ length: battle.powerCardHandCount.P2 }).map((_, idx) => React.createElement(PowerCardFrame, {
            key: `battle-opponent-back-${idx}`,
            size: 'hand',
            state: 'back',
            testId: `battle-opponent-back-${idx}`,
          })),
        );
      }

      return React.createElement(
        'div',
        { className: 'battle-private-hand', 'data-testid': 'battle-private-hand-P2' },
        privateCards.map(card => React.createElement(
          'div',
          { key: card.instanceId, className: 'battle-private-card', 'data-testid': `battle-private-card-${card.instanceId}` },
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'battle-hand-card-button',
              onClick: () => setExpandedPowerCardId(card.instanceId),
              'data-testid': `battle-card-tap-${card.instanceId}`,
            },
            React.createElement(PowerCardFrame, {
              size: 'hand',
              displayName: card.displayName,
              rulesText: card.rulesText,
              artSrc: card.artImageUrl ?? null,
              fullCardFaceSrc: card.fullCardFaceImageUrl ?? null,
              visualMode: card.visualMode ?? 'layered-art',
              state: card.isPlayable ? (expandedPowerCardId === card.instanceId ? 'selected' : 'playable') : 'disabled',
              selected: expandedPowerCardId === card.instanceId,
              testId: `battle-private-card-frame-${card.instanceId}`,
            }),
          ),
        )),
      );
    }

    if (isBotMode) {
      return React.createElement('div', { className: 'battle-opponent-column' },
        manualP2Cards.map((card, idx) => {
          const revealed = revealedSetP2.has(card.instanceId);
          if (!revealed) {
            return React.createElement(PowerCardFrame, {
              key: `battle-opponent-back-${idx}`,
              size: 'hand',
              state: 'back',
              testId: `battle-opponent-back-${idx}`,
            });
          }

          return React.createElement(PowerCardFrame, {
            key: `battle-opponent-revealed-bot-${card.instanceId}`,
            size: 'hand',
            displayName: card.displayName,
            rulesText: card.rulesText,
            artSrc: card.artImageUrl ?? null,
            fullCardFaceSrc: card.fullCardFaceImageUrl ?? null,
            visualMode: card.visualMode ?? 'layered-art',
            state: 'playable',
            testId: `battle-opponent-revealed-bot-${card.instanceId}`,
          });
        }),
      );
    }

    const cards = revealedHandFor === 'P2' ? manualP2Cards : [];
    if (cards.length === 0) {
      const hiddenCount = manualP2Cards.length;
      return React.createElement(
        'div',
        { className: 'battle-hand-placeholder', 'data-testid': 'battle-hand-placeholder-P2' },
        React.createElement('p', null, 'Cards hidden. Press Reveal to view Player Two hand.'),
        hiddenCount > 0
          ? React.createElement(
              'div',
              { className: 'battle-opponent-column', 'data-testid': 'battle-hidden-hand-P2' },
              manualP2Cards.map((card, idx) => {
                const revealed = revealedSetP2.has(card.instanceId);
                if (!revealed) {
                  return React.createElement(PowerCardFrame, {
                    key: `battle-hidden-back-P2-${idx}`,
                    size: 'hand',
                    state: 'back',
                    testId: `battle-hidden-back-P2-${idx}`,
                  });
                }

                return React.createElement(PowerCardFrame, {
                  key: `battle-hidden-revealed-P2-${card.instanceId}`,
                  size: 'hand',
                  displayName: card.displayName,
                  rulesText: card.rulesText,
                  artSrc: card.artImageUrl ?? null,
                  fullCardFaceSrc: card.fullCardFaceImageUrl ?? null,
                  visualMode: card.visualMode ?? 'layered-art',
                  state: 'playable',
                  testId: `battle-hidden-revealed-P2-${card.instanceId}`,
                });
              }),
            )
          : null,
      );
    }

    return React.createElement(
      'div',
      { className: 'battle-private-hand', 'data-testid': 'battle-private-hand-P2' },
      cards.map(card => React.createElement(
        'div',
        { key: card.instanceId, className: 'battle-private-card', 'data-testid': `battle-private-card-${card.instanceId}` },
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'battle-hand-card-button',
            onClick: () => setExpandedPowerCardId(card.instanceId),
            'data-testid': `battle-card-tap-${card.instanceId}`,
          },
          React.createElement(PowerCardFrame, {
            size: 'hand',
            displayName: card.displayName,
            rulesText: card.rulesText,
            artSrc: card.artImageUrl ?? null,
            fullCardFaceSrc: card.fullCardFaceImageUrl ?? null,
            visualMode: card.visualMode ?? 'layered-art',
            state: card.isPlayable ? (expandedPowerCardId === card.instanceId ? 'selected' : 'playable') : 'disabled',
            selected: expandedPowerCardId === card.instanceId,
            testId: `battle-private-card-frame-${card.instanceId}`,
          }),
        ),
      )),
    );
  }, [battle.powerCardHandCount.P2, expandedPowerCardId, handoffRequiredFor, isBotMode, isMultiplayerSeatView, manualP2Cards, multiplayerSeat, privateCards, revealedHandFor, revealedPowerCardInstanceIds]);

  return React.createElement(
    'section',
    { className: `battle-screen ${resolvingAnimationActive ? 'battle-resolving' : ''} ${isFinalKingDuel ? 'battle-final-king-duel' : ''}`, 'data-testid': 'battle-screen' },
    React.createElement('div', { className: `battle-top-board expanded ${cinematicPhase === 'main' ? '' : 'staged-hidden'}`, 'data-testid': 'battle-embedded-board' },
      React.createElement('div', { className: 'battle-board-header' },
        React.createElement('h3', null, 'Battle Board Background'),
      ),
      React.createElement(Board, {
        view: boardView,
        selectedCardId: null,
        onCardClick: (characterId: string) => onOpenCharacterCard?.(characterId),
        readOnly: true,
        inspectAllCards: true,
        gauntletEnergizedCharacterIds,
        cardMotion,
        swapCharacterMotion,
        postBattleMotion,
        characterStatusById,
        playerColors,
      }),
    ),

    onOpenFullBoard
      ? React.createElement(
          'button',
          {
            type: 'button',
            className: 'battle-open-full-board-top',
            onClick: () => onOpenFullBoard(),
            'data-testid': 'battle-open-full-board-header',
          },
          'View Full Board',
        )
      : null,

    riddlerFxActive && riddlerReferences.length > 0
      ? React.createElement(
          'section',
          { className: 'battle-riddler-fx-overlay', 'data-testid': 'battle-riddler-fx-overlay' },
          React.createElement('div', { className: 'battle-riddler-fx-questions', 'aria-hidden': 'true' },
            Array.from({ length: 14 }).map((_, index) => React.createElement(
              'span',
              {
                key: `riddler-q-${index}`,
                className: 'battle-riddler-fx-q',
                style: {
                  '--q-delay': `${index * 70}ms`,
                  '--q-left': `${6 + ((index * 7) % 88)}%`,
                  '--q-top': `${8 + ((index * 11) % 74)}%`,
                } as React.CSSProperties,
              },
              '?',
            )),
          ),
          React.createElement(
            'div',
            { className: 'battle-riddler-fx-cards' },
            riddlerReferences.map(entry => React.createElement(
              'div',
              { key: `riddler-fx-card-${entry.owner.id}-${entry.source.instanceId}`, className: 'battle-riddler-fx-card-wrap' },
              React.createElement('p', { className: 'battle-riddler-fx-label' }, `${entry.owner.displayName}: ???`),
              React.createElement(CharacterCardFrame, {
                size: 'compact',
                revealed: true,
                controllerColorClass: entry.owner.controller === 'P1' ? p1ColorClass : p2ColorClass,
                displayName: entry.source.displayName,
                ATK: entry.source.ATK,
                DEF: entry.source.DEF,
                ability: entry.source.ability,
                statRule: entry.source.statRule,
                artSrc: entry.source.artImageUrl ?? null,
                fullCardFaceSrc: entry.source.fullCardFaceImageUrl ?? null,
                visualMode: entry.source.visualMode,
                isKing: false,
                isFrozen: false,
                statusTag: characterStatusById[entry.owner.id] ?? null,
                testId: `battle-riddler-fx-card-${entry.owner.id}`,
              }),
            )),
          ),
        )
      : null,

    mirrorFxActive && mirrorReferences.length > 0
      ? React.createElement(
          'section',
          { className: 'battle-mirror-fx-overlay', 'data-testid': 'battle-mirror-fx-overlay' },
          React.createElement(
            'div',
            { className: 'battle-mirror-fx-shards', 'aria-hidden': 'true' },
            Array.from({ length: 16 }).map((_, index) => React.createElement('span', {
              key: `mirror-shard-${index}`,
              className: 'battle-mirror-fx-shard',
              style: {
                '--mirror-shard-left': `${5 + ((index * 6.5) % 92)}%`,
                '--mirror-shard-top': `${6 + ((index * 9) % 78)}%`,
                '--mirror-shard-delay': `${index * 60}ms`,
                '--mirror-shard-rot': `${(index % 2 === 0 ? 1 : -1) * (8 + ((index * 9) % 36))}deg`,
              } as React.CSSProperties,
            })),
          ),
          React.createElement(
            'div',
            { className: 'battle-mirror-fx-cards' },
            mirrorReferences.map(entry => React.createElement(
              'article',
              {
                key: `mirror-fx-card-${entry.key}`,
                className: 'battle-mirror-fx-card',
                'data-testid': `battle-mirror-fx-card-${entry.ownerId}`,
              },
              React.createElement('p', { className: 'battle-mirror-fx-label' }, `${entry.ownerDisplayName} reflects ${entry.copiedFromDisplayName}`),
              React.createElement('p', { className: 'battle-mirror-fx-stats' }, `ATK ${entry.copiedATK} / DEF ${entry.copiedDEF}`),
              React.createElement('p', { className: 'battle-mirror-fx-source' }, entry.source === 'attachment' ? 'via follower attachment' : entry.source === 'riddler-source' ? 'via Riddler source' : 'main battler reflection'),
              React.createElement(CharacterCardFrame, {
                size: 'compact',
                revealed: true,
                controllerColorClass: entry.ownerController === 'P1' ? p1ColorClass : p2ColorClass,
                displayName: 'MIRROR',
                ATK: entry.copiedATK,
                DEF: entry.copiedDEF,
                ability: '',
                artSrc: null,
                fullCardFaceSrc: null,
                visualMode: 'layered-art',
                isKing: false,
                isFrozen: false,
                testId: `battle-mirror-fx-frame-${entry.ownerId}`,
              }),
            )),
          ),
        )
      : null,

    cinematicPhase !== 'main'
      ? React.createElement(
          'section',
          { className: `battle-cinematic-layer phase-${cinematicPhase}`, 'data-testid': 'battle-intro' },
          React.createElement('p', { className: 'battle-score-banner', 'data-testid': 'battle-score-banner' }, scoreLabel),
          React.createElement('div', { className: 'battle-cinematic-duel' },
            isBotMode
              ? renderCinematicRevealCard('Human Character', humanCard, cinematicPhase !== 'clash', battleVisualById.get(humanCard.id) ?? { artSrc: null, fullCardFaceSrc: null, visualMode: 'layered-art' }, characterStatusById[humanCard.id] ?? null)
              : renderCinematicRevealCard('Opponent', rivalCard, cinematicPhase !== 'clash', battleVisualById.get(rivalCard.id) ?? { artSrc: null, fullCardFaceSrc: null, visualMode: 'layered-art' }, characterStatusById[rivalCard.id] ?? null),
            React.createElement('div', { className: 'battle-vs-divider' }, 'VS'),
            isBotMode
              ? renderCinematicRevealCard('Bot Character', rivalCard, cinematicPhase !== 'clash', battleVisualById.get(rivalCard.id) ?? { artSrc: null, fullCardFaceSrc: null, visualMode: 'layered-art' }, characterStatusById[rivalCard.id] ?? null)
              : renderCinematicRevealCard('Your Character', humanCard, cinematicPhase !== 'clash', battleVisualById.get(humanCard.id) ?? { artSrc: null, fullCardFaceSrc: null, visualMode: 'layered-art' }, characterStatusById[humanCard.id] ?? null),
          ),
        )
      : null,

    cinematicPhase === 'main' && handoffRequiredFor && isBotMode
      ? React.createElement(
          'section',
          { className: 'battle-handoff', 'data-testid': 'battle-handoff' },
          React.createElement('h2', null, `Pass device to ${playerLabel(handoffRequiredFor)}. ${playerLabel(handoffRequiredFor)} may view their hand.`),
          React.createElement('p', null, `${playerLabel(handoffRequiredFor)}, acknowledge to continue.`),
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

    cinematicPhase === 'main'
      ? React.createElement('div', { className: 'battle-main-grid' },
        React.createElement('aside', { className: 'battle-side-column battle-side-left', 'data-testid': 'battle-inline-hand' },
          React.createElement('h3', null, isMultiplayerSeatView ? (multiplayerSeat === 'P1' ? 'Your Power Cards' : 'Opponent Power Cards') : isBotMode ? 'Human Power Cards' : 'Player One Power Cards'),
          !isBotMode && !isMultiplayerSeatView && onRevealHand
            ? React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => onRevealHand('P1'),
                  'data-testid': 'battle-reveal-P1',
                },
                revealedHandFor === 'P1' ? 'Hide' : 'Reveal',
              )
            : null,
          botPriorityPanel
            ? React.createElement(
                'div',
                { className: 'battle-sr-meta', 'data-testid': 'bot-battle-priority-panel' },
                React.createElement('p', null, botPriorityPanel.message),
              )
            : null,
          leftHandPanel,
        ),
        React.createElement('section', { className: 'battle-center-stage', 'data-testid': 'battle-hero-overlay' },
          React.createElement('div', { className: 'battle-sr-meta' },
            React.createElement('p', { className: 'battle-score-banner', 'data-testid': 'battle-score-banner' }, scoreLabel),
            React.createElement('p', { className: 'battle-line', 'data-testid': 'battle-type' }, `${humanActiveComparisonLabel} vs ${rivalActiveComparisonLabel}`),
            React.createElement('p', { className: 'battle-line', 'data-testid': 'battle-priority' }, `Current Priority: ${priorityLabel}`),
            React.createElement('p', { className: 'battle-line', 'data-testid': 'battle-ready-p1' }, `${p1ReadyLabel} Ready: ${battle.readyPlayers.P1 ? 'Yes' : 'No'}`),
            React.createElement('p', { className: 'battle-line', 'data-testid': 'battle-ready-p2' }, `${p2ReadyLabel} Ready: ${battle.readyPlayers.P2 ? 'Yes' : 'No'}`),
            React.createElement('p', { className: 'battle-effective-line', 'data-testid': 'battle-effective-preview' }, `Comparison: ${scoreLabel}`),
          ),
          React.createElement('div', { className: 'battle-duel-row' },
            renderMatchupCard(
              isBotMode ? 'Human Character' : 'Player One Character',
              humanCard,
              humanOutcome,
              'human',
              humanActiveComparisonLabel,
              humanScoreValue,
              humanCard.controller === 'P1' ? p1ColorClass : p2ColorClass,
              humanActiveComparisonLabel,
              renderAttachedPowerCardsFor(humanCard.id),
              renderTagTeamSupportFor(humanCard.id),
              battleVisualById.get(humanCard.id) ?? { artSrc: null, fullCardFaceSrc: null, visualMode: 'layered-art' },
              characterStatusById[humanCard.id] ?? null,
              onOpenCharacterCard,
              resolvingAnimationActive ? (winningController === humanCard.controller ? 'resolve-winner' : winningController ? 'resolve-loser' : 'resolve-neutral') : '',
            ),
            React.createElement('div', { className: 'battle-mid-lane' },
              React.createElement('div', { className: 'battle-vs-divider' }, 'VS'),
              sharedEffectsForRender.length > 0
                ? React.createElement(
                    'div',
                    { className: 'battle-shared-effects battle-shared-effects-inline', 'data-testid': 'battle-shared-effects' },
                    sharedEffectsForRender.map(effect => React.createElement(
                      'div',
                      { key: effect.key, className: 'battle-shared-effect-card' },
                      React.createElement(PowerCardFrame, {
                        size: 'compact',
                        displayName: effect.source,
                        rulesText: effect.summary,
                        artSrc: effect.definitionId ? powerCatalogById.get(effect.definitionId)?.artImageUrl ?? null : null,
                        fullCardFaceSrc: effect.definitionId ? powerCatalogById.get(effect.definitionId)?.fullCardFaceImageUrl ?? null : null,
                        visualMode: effect.definitionId ? powerCatalogById.get(effect.definitionId)?.visualMode : 'layered-art',
                        state: 'selected',
                        selected: true,
                        testId: `battle-shared-effect-${effect.key}`,
                      }),
                    )),
                  )
                : null,
            ),
            renderMatchupCard(
              isBotMode ? 'Bot Character' : 'Player Two Character',
              rivalCard,
              rivalOutcome,
              'bot',
              rivalActiveComparisonLabel,
              rivalScoreValue,
              rivalCard.controller === 'P1' ? p1ColorClass : p2ColorClass,
              rivalActiveComparisonLabel,
              renderAttachedPowerCardsFor(rivalCard.id),
              renderTagTeamSupportFor(rivalCard.id),
              battleVisualById.get(rivalCard.id) ?? { artSrc: null, fullCardFaceSrc: null, visualMode: 'layered-art' },
              characterStatusById[rivalCard.id] ?? null,
              onOpenCharacterCard,
              resolvingAnimationActive ? (winningController === rivalCard.controller ? 'resolve-winner' : winningController ? 'resolve-loser' : 'resolve-neutral') : '',
            ),
          ),
          riddlerReferences.length > 0
            ? React.createElement(
                'section',
                { className: 'battle-riddler-reference-row', 'data-testid': 'battle-riddler-reference-row' },
                riddlerReferences.map((entry, index) => React.createElement(
                  'div',
                  { key: `riddler-ref-${entry.owner.id}-${entry.source.instanceId}-${index}`, className: 'battle-riddler-reference-card' },
                  React.createElement('p', { className: 'battle-riddler-reference-title' }, `${entry.owner.displayName}: ? ?`),
                  React.createElement('p', { className: 'battle-riddler-reference-subtitle' }, 'Question marks swirl... source revealed'),
                  React.createElement(CharacterCardFrame, {
                    size: 'compact',
                    revealed: true,
                    controllerColorClass: entry.owner.controller === 'P1' ? p1ColorClass : p2ColorClass,
                    displayName: entry.source.displayName,
                    ATK: entry.source.ATK,
                    DEF: entry.source.DEF,
                    ability: entry.source.ability,
                    artSrc: entry.source.artImageUrl ?? null,
                    fullCardFaceSrc: entry.source.fullCardFaceImageUrl ?? null,
                    visualMode: entry.source.visualMode,
                    isKing: false,
                    isFrozen: false,
                    statusTag: characterStatusById[entry.owner.id] ?? null,
                    testId: `battle-riddler-reference-${entry.owner.id}`,
                  }),
                )),
              )
            : null,
          React.createElement('div', { className: 'battle-controls battle-controls-centered' },
            canReadyToggle && !isCurrentReady && !readyToggleLocked
              ? React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: () => onSetReady(true),
                    'data-testid': 'battle-ready-button',
                  },
                    `Ready ${priorityLabel}`,
                )
              : null,
            canReadyToggle && isCurrentReady && !readyToggleLocked
              ? React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: () => onSetReady(false),
                    'data-testid': 'battle-unready-button',
                  },
                    `Unready ${priorityLabel}`,
                )
              : null,
            canResolve
              ? React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: beginResolveSequence,
                    disabled: resolvingAnimationActive,
                    'data-testid': 'battle-resolve-button',
                  },
                  resolvingAnimationActive ? 'Resolving...' : 'Resolve Battle',
                )
              : null,
          ),
          React.createElement('div', { className: 'battle-history-toggle' },
            React.createElement(
              'button',
              {
                type: 'button',
                onClick: () => setHistoryOpen(true),
                'data-testid': 'battle-history-open',
              },
              'Battle Event History',
            ),
          ),
          React.createElement('div', { className: 'battle-events battle-sr-meta', 'data-testid': 'battle-event-history' },
            React.createElement('strong', null, 'Battle Event History'),
            React.createElement(
              'ol',
              null,
              [...battle.battleEventHistory].reverse().map((event, index) =>
                React.createElement('li', { key: `battle-hidden-event-${index}-${event}` }, event),
              ),
            ),
          ),
        ),
        React.createElement('aside', { className: 'battle-side-column battle-side-right', 'data-testid': 'battle-opponent-face-down' },
          React.createElement('h3', null, isMultiplayerSeatView ? (multiplayerSeat === 'P2' ? 'Your Power Cards' : 'Opponent Power Cards') : isBotMode ? 'Opponent Power Cards' : 'Player Two Power Cards'),
          !isBotMode && !isMultiplayerSeatView && onRevealHand
            ? React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => onRevealHand('P2'),
                  'data-testid': 'battle-reveal-P2',
                },
                revealedHandFor === 'P2' ? 'Hide' : 'Reveal',
              )
            : null,
          rightHandPanel,
        ),
      )
      : null,

    cinematicPhase === 'main' && historyOpen
      ? React.createElement(
          'section',
          { className: 'battle-history-modal', 'data-testid': 'battle-history-modal' },
          React.createElement('div', { className: 'battle-history-panel', 'data-testid': 'battle-event-history' },
            React.createElement('strong', null, 'Battle Event History'),
            React.createElement(
              'ol',
              null,
              [...battle.battleEventHistory].reverse().map((event, index) =>
                React.createElement('li', { key: `battle-event-${index}-${event}` }, event),
              ),
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                onClick: () => setHistoryOpen(false),
                'data-testid': 'battle-history-close',
              },
              'Close',
            ),
          ),
        )
      : null,

    cinematicPhase === 'main' && expandedPowerCard
      ? React.createElement(
          'section',
          { className: 'battle-card-inspector-overlay', 'data-testid': 'battle-card-inspector' },
          React.createElement('div', { className: 'battle-card-inspector', 'data-testid': 'battle-card-inspector-panel' },
            React.createElement('h3', null, 'Selected Power Card'),
            React.createElement(PowerCardFrame, {
              size: 'battle',
              displayName: expandedPowerCard.displayName,
              rulesText: expandedPowerCard.rulesText,
              artSrc: expandedPowerCard.artImageUrl ?? null,
              fullCardFaceSrc: expandedPowerCard.fullCardFaceImageUrl ?? null,
              visualMode: expandedPowerCard.visualMode ?? 'layered-art',
              state: expandedCanPlay ? 'selected' : 'disabled',
              selected: expandedCanPlay,
              testId: 'battle-inspector-card',
            }),
            expandedRequiresChoice
              ? React.createElement(
                  'div',
                  { className: 'battle-choice-row' },
                  expandedPowerCard.allowedChoices.map(option =>
                    React.createElement(
                      'button',
                      {
                        key: `${expandedPowerCard.instanceId}-inspector-${option}`,
                        type: 'button',
                        className: `battle-choice-button ${explicitExpandedChoice === option ? 'selected' : ''}`,
                        onClick: () => {
                          setSelectedChoices(prev => ({ ...prev, [expandedPowerCard.instanceId]: option }));
                        },
                      },
                      option,
                    ),
                  ),
                )
              : null,
            expandedPowerCard.disabledReason
              ? React.createElement(
                  'p',
                  { className: 'battle-card-disabled-reason' },
                  expandedPowerCard.disabledReason,
                )
              : null,
            React.createElement('div', { className: 'battle-power-overlay-actions' },
              React.createElement(
                'button',
                {
                  type: 'button',
                  disabled: !expandedCanPlay,
                  onClick: () => {
                    onPlayCard({
                      instanceId: expandedPowerCard.instanceId,
                      selectedChoice: expandedChoice,
                    });
                    setExpandedPowerCardId(null);
                  },
                  'data-testid': 'battle-inspector-play-button',
                },
                expandedCanPlay ? 'Play This Card' : 'Play This Card (disabled)',
              ),
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => setExpandedPowerCardId(null),
                  'data-testid': 'battle-inspector-close-button',
                },
                'Return To Hand',
              ),
            ),
          ),
        )
      : null,

    cinematicPhase === 'main' && isBotMode && botPowerReveal
      ? React.createElement(
          'section',
          { className: 'battle-bot-reveal-overlay', 'data-testid': 'bot-power-reveal-overlay' },
          React.createElement('div', { className: 'battle-bot-reveal-panel' },
            React.createElement('h3', null, 'Bot played a power card'),
            React.createElement(PowerCardFrame, {
              size: 'battle',
              displayName: botPowerReveal.displayName,
              rulesText: botPowerReveal.rulesText,
              artSrc: botPowerReveal.artImageUrl ?? null,
              fullCardFaceSrc: botPowerReveal.fullCardFaceImageUrl ?? null,
              visualMode: botPowerReveal.visualMode ?? 'layered-art',
              state: 'selected',
              selected: true,
              testId: 'bot-power-reveal-card',
            }),
            React.createElement('p', null, 'Review the card, then confirm to apply its effect.'),
            React.createElement(
              'button',
              {
                type: 'button',
                onClick: () => onAcknowledgeBotPowerReveal?.(),
                'data-testid': 'bot-power-reveal-ack',
              },
              'OK',
            ),
          ),
        )
      : null,

    cinematicPhase === 'main' && isMultiplayerSeatView && multiplayerPowerReveal
      ? React.createElement(
          'section',
          { className: 'battle-bot-reveal-overlay', 'data-testid': 'multiplayer-power-reveal-overlay' },
          React.createElement('div', { className: 'battle-bot-reveal-panel' },
            React.createElement('h3', null, `${multiplayerPowerReveal.actor === 'P1' ? 'Player One' : 'Player Two'} played a power card`),
            React.createElement(PowerCardFrame, {
              size: 'battle',
              displayName: multiplayerPowerReveal.displayName,
              rulesText: multiplayerPowerReveal.rulesText,
              artSrc: multiplayerPowerReveal.artImageUrl ?? null,
              fullCardFaceSrc: multiplayerPowerReveal.fullCardFaceImageUrl ?? null,
              visualMode: multiplayerPowerReveal.visualMode ?? 'layered-art',
              state: 'selected',
              selected: true,
              testId: 'multiplayer-power-reveal-card',
            }),
            React.createElement('p', null, 'Applying effect...'),
          ),
        )
      : null,

    cinematicPhase === 'main' && resolvingAnimationActive
      ? React.createElement(
          'section',
          {
            className: `battle-resolve-overlay phase-${resolvePhase}`,
            style: {
              '--used-dx': `${resolveTravel?.usedX ?? -180}px`,
              '--used-dy': `${resolveTravel?.usedY ?? -30}px`,
              '--grave-dx': `${resolveTravel?.graveX ?? -120}px`,
              '--grave-dy': `${resolveTravel?.graveY ?? 34}px`,
            } as React.CSSProperties,
            'data-testid': 'battle-resolve-overlay',
          },
          React.createElement('p', { className: 'battle-resolve-copy' },
            resolvePhase === 'strike'
              ? 'Winner strikes!'
              : resolvePhase === 'graveyard'
                ? 'Characters fade from battle...'
                : resolvePhase === 'used'
                  ? 'Used power cards fly to pile...'
                  : 'Advancing attacker to next territory...'),
          hasUsedPowerThisBattle && (resolvePhase === 'used' || resolvePhase === 'advance')
            ? React.createElement('div', { className: 'battle-used-flyby' },
                usedCardsForResolve.map((entry, index) => React.createElement(
                  'div',
                  {
                    key: `${entry.instanceId}-${index}`,
                    className: `battle-used-fly-card fly-${index + 1}`,
                  },
                  React.createElement(PowerCardFrame, {
                    size: 'compact',
                    displayName: entry.displayName,
                    rulesText: '',
                    artSrc: entry.artImageUrl ?? null,
                    fullCardFaceSrc: entry.fullCardFaceImageUrl ?? null,
                    visualMode: entry.visualMode ?? 'layered-art',
                    state: 'selected',
                    selected: true,
                    testId: `resolve-used-power-${entry.instanceId}`,
                  }),
                )),
              )
            : null,
        )
      : null,
  );
}
