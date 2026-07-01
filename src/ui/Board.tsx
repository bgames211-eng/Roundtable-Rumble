import React from 'react';
import { type PlayerSafeCardView, type PlayerSafeGameView } from '../setup';
import type { PlayerColor } from './StartScreen';
import { CharacterCardFrame, PowerCardFrame } from './CardFrames';
import { FIRST_ALPHA_POWER_CARD_DEFINITIONS, getPowerCardDefinition } from '../powerCards';
import { loadPowerCatalog } from '../cardCatalog';
import './Board.css';

interface BoardProps {
  view: PlayerSafeGameView;
  selectedCardId: string | null;
  onCardClick: (instanceId: string) => void;
  onAttachmentClick?: (characterId: string, attachmentInstanceId: string) => void;
  actionTargets?: Partial<Record<RingPosition, 'move' | 'attack' | 'defend'>>;
  onActionTargetClick?: (action: 'move' | 'attack' | 'defend', position: RingPosition) => void;
  allowCardClickOnActionTargets?: boolean;
  allowWeaponTargetClicks?: boolean;
  portalRetargetEnabled?: boolean;
  portalSourceCharacterId?: string | null;
  actionTargetFx?: 'power-portal' | 'space-stone-portal' | 'back-it-up' | null;
  readOnly?: boolean;
  playerColors?: { P1: PlayerColor; P2: PlayerColor };
  cardMotion?: {
    characterId: string;
    type: 'move' | 'attack';
    fromPosition: RingPosition;
    toPosition: RingPosition;
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
      fromPosition: RingPosition;
      toPosition: RingPosition;
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
      fromPosition: RingPosition;
      toPosition: RingPosition;
      visualMode?: 'layered-art' | 'full-card-face';
      artImageUrl?: string;
      fullCardFaceImageUrl?: string;
    };
  } | null;
  specialCardMotion?: {
    characterId: string;
    displayName: string;
    ATK: number;
    DEF: number;
    isKing: boolean;
    isFrozen?: boolean;
    controller: 'P1' | 'P2';
    fromPosition: RingPosition;
    toPosition: RingPosition;
    visualMode?: 'layered-art' | 'full-card-face';
    artImageUrl?: string;
    fullCardFaceImageUrl?: string;
    style: 'wind' | 'rapunzel-fling' | 'nightcrawler-portal' | 'power-portal' | 'space-stone-portal' | 'back-it-up';
  } | null;
  rapunzelHairTrail?: {
    sourceCharacterId: string;
    sourcePosition: RingPosition;
    targetCharacterId: string;
    targetPosition: RingPosition;
    attachedPosition: RingPosition | null;
    phase: 'attach' | 'fling' | 'retract';
    pathPositions: RingPosition[];
  } | null;
  postBattleMotion?: {
    loser: {
      id: string;
      displayName: string;
      ATK: number;
      DEF: number;
      isKing: boolean;
      controller: 'P1' | 'P2';
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
      controller: 'P1' | 'P2';
      fromPosition: RingPosition;
      toPosition: RingPosition;
      visualMode?: 'layered-art' | 'full-card-face';
      artImageUrl?: string;
      fullCardFaceImageUrl?: string;
    } | null;
  } | null;
  kingDrawFx?: {
    controller: 'P1' | 'P2';
    position: RingPosition;
  } | null;
  revealAnimationIds?: string[];
  kingDuelRumbleIds?: string[];
  thawingCharacterIds?: string[];
  freezingCharacterIds?: string[];
  boardImploding?: boolean;
  inspectAllCards?: boolean;
  characterStatusById?: Record<string, string>;
  gauntletEnergizedCharacterIds?: string[];
}

const ringOrder = ['P1_1', 'P1_2', 'P1_3', 'P1_4', 'P1_5', 'P2_5', 'P2_4', 'P2_3', 'P2_2', 'P2_1'] as const;

type RingPosition = (typeof ringOrder)[number];

interface RingSlotLayout {
  left: string;
  top: string;
  slotRotation: number;
  cardAnchor: 'center';
  tilt: number;
}

const RING_LAYOUT: Record<RingPosition, RingSlotLayout> = {
  P2_3: { left: '50%', top: '12%', slotRotation: 0, cardAnchor: 'center', tilt: 0 },
  P2_4: { left: '74%', top: '20%', slotRotation: 8, cardAnchor: 'center', tilt: 8 },
  P2_5: { left: '88%', top: '36%', slotRotation: 10, cardAnchor: 'center', tilt: 10 },
  P1_5: { left: '88%', top: '64%', slotRotation: -10, cardAnchor: 'center', tilt: -10 },
  P1_4: { left: '74%', top: '80%', slotRotation: -8, cardAnchor: 'center', tilt: -8 },
  P1_3: { left: '50%', top: '88%', slotRotation: 0, cardAnchor: 'center', tilt: 0 },
  P1_2: { left: '26%', top: '80%', slotRotation: 8, cardAnchor: 'center', tilt: -8 },
  P1_1: { left: '12%', top: '64%', slotRotation: 10, cardAnchor: 'center', tilt: -10 },
  P2_1: { left: '12%', top: '36%', slotRotation: -10, cardAnchor: 'center', tilt: -10 },
  P2_2: { left: '26%', top: '20%', slotRotation: -8, cardAnchor: 'center', tilt: -8 },
};

function cardAt(view: PlayerSafeGameView, position: string): PlayerSafeCardView | undefined {
  return view.boardCards.find(card => card.boardPosition === position);
}

function colorClassFor(player: PlayerColor | undefined): string {
  if (!player) return 'player-color-blue';
  return `player-color-${player.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function renderRingSpace(
  view: PlayerSafeGameView,
  position: (typeof ringOrder)[number],
  selectedCardId: string | null,
  onCardClick: (instanceId: string) => void,
  onAttachmentClick: ((characterId: string, attachmentInstanceId: string) => void) | undefined,
  actionTargets: Partial<Record<RingPosition, 'move' | 'attack' | 'defend'>>,
  onActionTargetClick: ((action: 'move' | 'attack' | 'defend', position: RingPosition) => void) | undefined,
  allowCardClickOnActionTargets: boolean,
  allowWeaponTargetClicks: boolean,
  portalRetargetEnabled: boolean,
  portalSourceCharacterId: string | null,
  actionTargetFx: BoardProps['actionTargetFx'],
  readOnly: boolean,
  inspectAllCards: boolean,
  characterStatusById: Record<string, string>,
  powerCatalogById: Map<string, { visualMode: 'layered-art' | 'full-card-face'; artImageUrl: string; fullCardFaceImageUrl: string }>,
  playerColors?: { P1: PlayerColor; P2: PlayerColor },
  cardMotion?: BoardProps['cardMotion'],
  swapCharacterMotion?: BoardProps['swapCharacterMotion'],
  specialCardMotion?: BoardProps['specialCardMotion'],
  revealAnimationIds: string[] = [],
  kingDuelRumbleIds: string[] = [],
  thawingCharacterIds: string[] = [],
  freezingCharacterIds: string[] = [],
  gauntletEnergizedCharacterIds: string[] = [],
): React.ReactNode {
  const card = cardAt(view, position);
  const isSelected = card?.instanceId === selectedCardId;
  const controller = card?.controller ?? (position.startsWith('P1_') ? 'P1' : 'P2');
  const gauntletEnergized = !!card && gauntletEnergizedCharacterIds.includes(card.instanceId);
  const colorClass = colorClassFor(playerColors?.[controller]);
  const layout = RING_LAYOUT[position];
  const actionTarget = actionTargets[position as RingPosition] ?? null;
  const actionTargetClickable = !readOnly && !!actionTarget && !!onActionTargetClick;
  const selectable = !readOnly && !!card && card.controller === view.activePlayer && view.gameStatus === 'active' && !actionTargetClickable;
  const inspectableOpponent = !readOnly && !!card && card.revealed && card.controller !== view.activePlayer && !actionTargetClickable;
  const inspectableAny = !!card && inspectAllCards && !actionTargetClickable;
  const selectableViaActionTarget = !!card && actionTargetClickable && allowCardClickOnActionTargets;
  const weaponTargetClickable = !!card && allowWeaponTargetClicks && card.alive && !actionTargetClickable;
  const portalRetargetClickable = !!card
    && portalRetargetEnabled
    && card.alive
    && card.controller === view.activePlayer;
  const portalSourceSelected = !!card && portalSourceCharacterId === card.instanceId;
  const cardClickable = selectable || inspectableOpponent || inspectableAny || selectableViaActionTarget || weaponTargetClickable || portalRetargetClickable;
  const actionTargetFxClass = actionTarget && actionTarget === 'move' && actionTargetFx
    ? ` action-target-${actionTargetFx}`
    : '';
  const animatedSourceHidden = !!card
    && !!cardMotion
    && card.instanceId === cardMotion.characterId
    && position === cardMotion.fromPosition;
  const specialAnimatedSourceHidden = !!card
    && !!specialCardMotion
    && card.instanceId === specialCardMotion.characterId
    && position === specialCardMotion.fromPosition;
  const swapAnimatedSourceHidden = !!card
    && !!swapCharacterMotion
    && (
      (card.instanceId === swapCharacterMotion.first.characterId && position === swapCharacterMotion.first.fromPosition)
      || (!!swapCharacterMotion.second
        && card.instanceId === swapCharacterMotion.second.characterId
        && position === swapCharacterMotion.second.fromPosition)
    );
  const revealAnimated = !!card && revealAnimationIds.includes(card.instanceId);
  const rumbleAnimated = !!card && kingDuelRumbleIds.includes(card.instanceId);
  const thawAnimated = !!card && thawingCharacterIds.includes(card.instanceId);
  const freezeAnimated = !!card && freezingCharacterIds.includes(card.instanceId);

  const handleActionTargetClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    if (actionTargetClickable && actionTarget) {
      onActionTargetClick(actionTarget, position);
    }
  };

  return React.createElement(
    'div',
    {
      key: position,
      className: `ring-space territory-${controller.toLowerCase()} ${isSelected ? 'selected' : ''} ${cardClickable || actionTargetClickable ? 'selectable' : ''} ${actionTarget ? `action-target action-target-${actionTarget}${actionTargetFxClass}` : ''}${portalRetargetClickable ? ' portal-retarget-glow' : ''}${portalSourceSelected ? ' portal-source-selected-space' : ''}`,
      style: {
        left: layout.left,
        top: layout.top,
        transform: `translate(-50%, -50%) rotate(${layout.slotRotation}deg)`,
      },
      'data-testid': `space-${position}`,
      onClick: cardClickable && card ? () => onCardClick(card.instanceId) : undefined,
      'aria-label': 'board-space',
    },
    React.createElement('div', { className: 'ring-space-square' }),
    actionTargetClickable
      ? React.createElement(
          'button',
          {
            type: 'button',
            className: 'ring-action-target-hit-area',
            onClick: handleActionTargetClick,
            'aria-label': `${actionTarget} target`,
            'data-testid': `action-target-${position}`,
          },
        )
      : null,
    card
      ? React.createElement(
          'div',
          { className: `ring-space-card anchor-${layout.cardAnchor} ${(animatedSourceHidden || specialAnimatedSourceHidden || swapAnimatedSourceHidden) ? 'motion-source-hidden' : ''} ${revealAnimated ? 'endgame-reveal-flip' : ''} ${rumbleAnimated ? 'king-duel-rumble-card' : ''}${portalSourceSelected ? ' portal-source-selected' : ''}${gauntletEnergized ? ' gauntlet-energized-card' : ''}` },
          React.createElement(CharacterCardFrame, {
            size: 'board',
            revealed: card.revealed,
            controllerColorClass: colorClass,
            displayName: card.displayName,
            ATK: card.ATK,
            DEF: card.DEF,
            ability: card.ability,
              statRule: card.statRule ?? null,
            artSrc: card.artImageUrl ?? null,
            fullCardFaceSrc: card.fullCardFaceImageUrl ?? null,
            visualMode: card.visualMode,
            isKing: card.isKing,
            isFrozen: card.isFrozen,
            isThawing: thawAnimated,
            isFreezing: freezeAnimated,
            statusTag: characterStatusById[card.instanceId] ?? null,
            selected: isSelected,
            tilt: layout.tilt,
            testId: card.revealed ? 'card-revealed' : 'card-back',
          }),
          (card.attachments?.length ?? 0) > 0
            ? React.createElement(
                'div',
                { className: 'board-attachment-stack', 'data-testid': `board-attachments-${card.instanceId}` },
                (card.attachments ?? []).map((attachment, index) => {
                  const visual = powerCatalogById.get(attachment.definitionId);
                  return React.createElement(
                    onAttachmentClick && !readOnly ? 'button' : 'div',
                    {
                      key: `${card.instanceId}-attachment-${attachment.instanceId}`,
                      className: 'board-attachment-card',
                      style: { '--attach-index': index } as React.CSSProperties,
                      type: onAttachmentClick && !readOnly ? 'button' : undefined,
                      onClick: onAttachmentClick && !readOnly
                        ? (event: React.MouseEvent) => {
                            event.stopPropagation();
                            onAttachmentClick(card.instanceId, attachment.instanceId);
                          }
                        : undefined,
                      'data-testid': `board-attachment-action-${card.instanceId}-${attachment.instanceId}`,
                    },
                    React.createElement(PowerCardFrame, {
                      size: 'compact',
                      displayName: attachment.displayName,
                      rulesText: `+${attachment.ATK} ATK / +${attachment.DEF} DEF`,
                      artSrc: visual?.artImageUrl ?? null,
                      fullCardFaceSrc: visual?.fullCardFaceImageUrl ?? null,
                      visualMode: visual?.visualMode ?? 'layered-art',
                      state: 'attached',
                      selected: false,
                      testId: `board-attachment-card-${card.instanceId}-${index}`,
                    }),
                  );
                }),
              )
            : null,
        )
      : React.createElement('div', { className: 'space-slot-empty', 'data-testid': 'empty-space' }),
    isSelected ? React.createElement('span', { className: 'selected-chip', 'data-testid': `selected-${position}` }, 'Selected card') : null,
    (position === 'P1_3' || position === 'P2_3')
      ? React.createElement('span', { className: 'king-corner', 'data-testid': `king-start-${position}` })
      : null,
  );
}

export function Board({ view, selectedCardId, onCardClick, onAttachmentClick, actionTargets = {}, onActionTargetClick, allowCardClickOnActionTargets = false, allowWeaponTargetClicks = false, portalRetargetEnabled = false, portalSourceCharacterId = null, actionTargetFx = null, readOnly = false, playerColors, cardMotion = null, swapCharacterMotion = null, specialCardMotion = null, rapunzelHairTrail = null, postBattleMotion = null, kingDrawFx = null, revealAnimationIds = [], kingDuelRumbleIds = [], thawingCharacterIds = [], freezingCharacterIds = [], boardImploding = false, inspectAllCards = false, characterStatusById = {}, gauntletEnergizedCharacterIds = [] }: BoardProps): React.ReactElement {
  const segments = ringOrder.map((position, index) => [position, ringOrder[(index + 1) % ringOrder.length]] as const);
  const animatedCard = cardMotion ? view.boardCards.find(card => card.instanceId === cardMotion.characterId) : null;
  const animatedControllerClass = animatedCard ? colorClassFor(playerColors?.[animatedCard.controller]) : 'player-color-blue';
  const powerCatalogById = new Map(loadPowerCatalog(FIRST_ALPHA_POWER_CARD_DEFINITIONS).map(entry => [entry.definitionId, entry]));
  const fromLayout = cardMotion ? RING_LAYOUT[cardMotion.fromPosition] : null;
  const toLayout = cardMotion ? RING_LAYOUT[cardMotion.toPosition] : null;
  const motionStyle = fromLayout && toLayout
    ? {
        '--motion-from-left': fromLayout.left,
        '--motion-from-top': fromLayout.top,
        '--motion-to-left': toLayout.left,
        '--motion-to-top': toLayout.top,
        '--motion-from-rotation': `${fromLayout.tilt}deg`,
        '--motion-to-rotation': `${toLayout.tilt}deg`,
      } as React.CSSProperties
    : undefined;

  const specialFromLayout = specialCardMotion ? RING_LAYOUT[specialCardMotion.fromPosition] : null;
  const specialToLayout = specialCardMotion ? RING_LAYOUT[specialCardMotion.toPosition] : null;
  const specialMotionStyle = specialFromLayout && specialToLayout
    ? {
        '--motion-from-left': specialFromLayout.left,
        '--motion-from-top': specialFromLayout.top,
        '--motion-to-left': specialToLayout.left,
        '--motion-to-top': specialToLayout.top,
        '--motion-from-rotation': `${specialFromLayout.tilt}deg`,
        '--motion-to-rotation': `${specialToLayout.tilt}deg`,
      } as React.CSSProperties
    : undefined;

  const swapFirstFromLayout = swapCharacterMotion ? RING_LAYOUT[swapCharacterMotion.first.fromPosition] : null;
  const swapFirstToLayout = swapCharacterMotion ? RING_LAYOUT[swapCharacterMotion.first.toPosition] : null;
  const swapSecondFromLayout = swapCharacterMotion?.second ? RING_LAYOUT[swapCharacterMotion.second.fromPosition] : null;
  const swapSecondToLayout = swapCharacterMotion?.second ? RING_LAYOUT[swapCharacterMotion.second.toPosition] : null;

  const swapFirstStyle = swapFirstFromLayout && swapFirstToLayout
    ? {
        '--motion-from-left': swapFirstFromLayout.left,
        '--motion-from-top': swapFirstFromLayout.top,
        '--motion-to-left': swapFirstToLayout.left,
        '--motion-to-top': swapFirstToLayout.top,
        '--motion-from-rotation': `${swapFirstFromLayout.tilt}deg`,
        '--motion-to-rotation': `${swapFirstToLayout.tilt}deg`,
      } as React.CSSProperties
    : undefined;

  const swapSecondStyle = swapSecondFromLayout && swapSecondToLayout
    ? {
        '--motion-from-left': swapSecondFromLayout.left,
        '--motion-from-top': swapSecondFromLayout.top,
        '--motion-to-left': swapSecondToLayout.left,
        '--motion-to-top': swapSecondToLayout.top,
        '--motion-from-rotation': `${swapSecondFromLayout.tilt}deg`,
        '--motion-to-rotation': `${swapSecondToLayout.tilt}deg`,
      } as React.CSSProperties
    : undefined;

  const postLoserLayout = postBattleMotion?.loser ? RING_LAYOUT[postBattleMotion.loser.fromPosition] : null;
  const postAdvanceFrom = postBattleMotion?.winnerAdvance ? RING_LAYOUT[postBattleMotion.winnerAdvance.fromPosition] : null;
  const postAdvanceTo = postBattleMotion?.winnerAdvance ? RING_LAYOUT[postBattleMotion.winnerAdvance.toPosition] : null;
  const rapunzelHairPoints = rapunzelHairTrail && rapunzelHairTrail.pathPositions.length > 1
    ? rapunzelHairTrail.pathPositions
      .map(position => {
        const layout = RING_LAYOUT[position];
        const x = Number(layout.left.replace('%', ''));
        const y = Number(layout.top.replace('%', ''));
        return `${x},${y}`;
      })
      .join(' ')
    : null;
  const rapunzelAttachedLayout = rapunzelHairTrail?.attachedPosition
    ? RING_LAYOUT[rapunzelHairTrail.attachedPosition]
    : null;
  const graveyardCardsForDisplay = postBattleMotion?.loser ? view.graveyard.slice(0, -1) : view.graveyard;
  return React.createElement(
    'section',
    { className: 'board-wrap circular-tabletop', 'data-testid': 'circular-board' },
    React.createElement(
      'div',
      { className: `ring-board ${boardImploding ? 'board-imploding' : ''}`, 'data-testid': 'ring-board' },
      React.createElement(
        'svg',
        { className: 'ring-path-overlay', viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true' },
        segments.map(([from, to], index) => {
          const fromLayout = RING_LAYOUT[from];
          const toLayout = RING_LAYOUT[to];
          const fromX = Number(fromLayout.left.replace('%', ''));
          const fromY = Number(fromLayout.top.replace('%', ''));
          const toX = Number(toLayout.left.replace('%', ''));
          const toY = Number(toLayout.top.replace('%', ''));
          const midX = (fromX + toX) / 2;
          const midY = (fromY + toY) / 2;
          const rotation = Math.atan2(toY - fromY, toX - fromX) * (180 / Math.PI);
          const isCrossing = index === 4 || index === 9;

          return React.createElement(
            React.Fragment,
            { key: `${from}-${to}` },
            React.createElement('line', {
              'data-testid': `connector-${from}`,
              x1: fromX,
              y1: fromY,
              x2: toX,
              y2: toY,
              className: `ring-path-segment ${isCrossing ? 'ring-path-crossing' : ''}`,
            }),
            React.createElement('path', {
              d: 'M -1.4 -2.2 L 2.8 0 L -1.4 2.2 Z',
              className: `ring-arrow-head-mid ${isCrossing ? 'ring-arrow-head-mid-crossing' : ''}`,
              transform: `translate(${midX} ${midY}) rotate(${rotation})`,
            }),
          );
        }),
      ),
      React.createElement('div', { className: 'territory-divider', 'data-testid': 'territory-divider' }),
      ringOrder.map(position => renderRingSpace(view, position, selectedCardId, onCardClick, onAttachmentClick, actionTargets, onActionTargetClick, allowCardClickOnActionTargets, allowWeaponTargetClicks, portalRetargetEnabled, portalSourceCharacterId, actionTargetFx, readOnly, inspectAllCards, characterStatusById, powerCatalogById, playerColors, cardMotion, swapCharacterMotion, specialCardMotion, revealAnimationIds, kingDuelRumbleIds, thawingCharacterIds, freezingCharacterIds, gauntletEnergizedCharacterIds)),
      rapunzelHairPoints
        ? React.createElement(
            'svg',
            { className: 'rapunzel-hair-overlay', viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true' },
            React.createElement('polyline', {
              points: rapunzelHairPoints,
              className: `rapunzel-hair-path rapunzel-hair-path-base rapunzel-hair-path-${rapunzelHairTrail?.phase ?? 'attach'}`,
            }),
            React.createElement('polyline', {
              points: rapunzelHairPoints,
              className: `rapunzel-hair-path rapunzel-hair-path-glint rapunzel-hair-path-${rapunzelHairTrail?.phase ?? 'attach'}`,
            }),
            rapunzelAttachedLayout
              ? React.createElement('circle', {
                  cx: Number(rapunzelAttachedLayout.left.replace('%', '')),
                  cy: Number(rapunzelAttachedLayout.top.replace('%', '')),
                  r: rapunzelHairTrail?.phase === 'fling' ? 2.2 : 1.9,
                  className: `rapunzel-hair-latch rapunzel-hair-latch-${rapunzelHairTrail?.phase ?? 'attach'}`,
                })
              : null,
          )
        : null,
      cardMotion && animatedCard && fromLayout && toLayout
        ? React.createElement(
            'div',
            {
              className: `board-card-motion board-card-motion-${cardMotion.type}`,
              style: motionStyle,
              'data-testid': `board-card-motion-${animatedCard.instanceId}`,
            },
            React.createElement(CharacterCardFrame, {
              size: 'board',
              revealed: animatedCard.revealed,
              controllerColorClass: animatedControllerClass,
              displayName: animatedCard.displayName,
              ATK: animatedCard.ATK,
              DEF: animatedCard.DEF,
              ability: animatedCard.ability,
              artSrc: animatedCard.artImageUrl ?? null,
              fullCardFaceSrc: animatedCard.fullCardFaceImageUrl ?? null,
              visualMode: animatedCard.visualMode,
              isKing: animatedCard.isKing,
              isFrozen: animatedCard.isFrozen,
              isThawing: thawingCharacterIds.includes(animatedCard.instanceId),
              isFreezing: freezingCharacterIds.includes(animatedCard.instanceId),
              testId: `board-card-motion-frame-${animatedCard.instanceId}`,
            }),
          )
        : null,
      specialCardMotion && specialFromLayout && specialToLayout
        ? React.createElement(
            'div',
            {
              className: `board-card-motion board-card-motion-special-${specialCardMotion.style}`,
              style: specialMotionStyle,
              'data-testid': `board-special-motion-${specialCardMotion.characterId}`,
            },
            React.createElement(CharacterCardFrame, {
              size: 'board',
              revealed: true,
              controllerColorClass: colorClassFor(playerColors?.[specialCardMotion.controller]),
              displayName: specialCardMotion.displayName,
              ATK: specialCardMotion.ATK,
              DEF: specialCardMotion.DEF,
              ability: '',
              artSrc: specialCardMotion.artImageUrl ?? null,
              fullCardFaceSrc: specialCardMotion.fullCardFaceImageUrl ?? null,
              visualMode: specialCardMotion.visualMode,
              isKing: specialCardMotion.isKing,
              isFrozen: specialCardMotion.isFrozen,
              testId: `board-special-motion-frame-${specialCardMotion.characterId}`,
            }),
          )
        : null,
      swapCharacterMotion && swapFirstFromLayout && swapFirstToLayout && swapFirstStyle
        ? React.createElement(
            'div',
            {
              className: `board-card-motion board-card-motion-swap board-card-motion-swap-to-${swapCharacterMotion.first.toController.toLowerCase()}${swapCharacterMotion.first.toIsKing ? ' board-card-motion-swap-to-king' : ''}`,
              style: swapFirstStyle,
              'data-testid': `board-swap-motion-${swapCharacterMotion.first.characterId}`,
            },
            React.createElement(CharacterCardFrame, {
              size: 'board',
              revealed: swapCharacterMotion.first.revealed,
              controllerColorClass: colorClassFor(playerColors?.[swapCharacterMotion.first.fromController]),
              displayName: swapCharacterMotion.first.displayName,
              ATK: swapCharacterMotion.first.ATK,
              DEF: swapCharacterMotion.first.DEF,
              ability: '',
              artSrc: swapCharacterMotion.first.artImageUrl ?? null,
              fullCardFaceSrc: swapCharacterMotion.first.fullCardFaceImageUrl ?? null,
              visualMode: swapCharacterMotion.first.visualMode,
              isKing: swapCharacterMotion.first.isKing,
              isFrozen: swapCharacterMotion.first.isFrozen,
              testId: `board-swap-motion-frame-${swapCharacterMotion.first.characterId}`,
            }),
            swapCharacterMotion.first.toIsKing
              ? React.createElement('span', { className: 'board-swap-motion-king-badge', 'aria-hidden': 'true' }, 'KING')
              : null,
          )
        : null,
      swapCharacterMotion && swapCharacterMotion.second && swapSecondFromLayout && swapSecondToLayout && swapSecondStyle
        ? React.createElement(
            'div',
            {
              className: `board-card-motion board-card-motion-swap board-card-motion-swap-to-${swapCharacterMotion.second.toController.toLowerCase()}${swapCharacterMotion.second.toIsKing ? ' board-card-motion-swap-to-king' : ''}`,
              style: swapSecondStyle,
              'data-testid': `board-swap-motion-${swapCharacterMotion.second.characterId}`,
            },
            React.createElement(CharacterCardFrame, {
              size: 'board',
              revealed: swapCharacterMotion.second.revealed,
              controllerColorClass: colorClassFor(playerColors?.[swapCharacterMotion.second.fromController]),
              displayName: swapCharacterMotion.second.displayName,
              ATK: swapCharacterMotion.second.ATK,
              DEF: swapCharacterMotion.second.DEF,
              ability: '',
              artSrc: swapCharacterMotion.second.artImageUrl ?? null,
              fullCardFaceSrc: swapCharacterMotion.second.fullCardFaceImageUrl ?? null,
              visualMode: swapCharacterMotion.second.visualMode,
              isKing: swapCharacterMotion.second.isKing,
              isFrozen: swapCharacterMotion.second.isFrozen,
              testId: `board-swap-motion-frame-${swapCharacterMotion.second.characterId}`,
            }),
            swapCharacterMotion.second.toIsKing
              ? React.createElement('span', { className: 'board-swap-motion-king-badge', 'aria-hidden': 'true' }, 'KING')
              : null,
          )
        : null,
      kingDrawFx
        ? React.createElement(
            'div',
            {
              className: `board-king-draw-pop board-king-draw-${kingDrawFx.controller.toLowerCase()}`,
              style: {
                left: RING_LAYOUT[kingDrawFx.position].left,
                top: RING_LAYOUT[kingDrawFx.position].top,
              },
              'data-testid': 'board-king-draw-pop',
            },
            '+1',
          )
        : null,
      postBattleMotion?.loser && postLoserLayout
        ? React.createElement(
            'div',
            {
              className: 'board-postbattle-loser-motion',
              style: {
                '--post-loser-left': postLoserLayout.left,
                '--post-loser-top': postLoserLayout.top,
              } as React.CSSProperties,
              'data-testid': 'board-postbattle-loser-motion',
            },
            React.createElement(CharacterCardFrame, {
              size: 'board',
              revealed: true,
              controllerColorClass: postBattleMotion.loser.controller === 'P1' ? 'player-color-blue' : 'player-color-red',
              displayName: postBattleMotion.loser.displayName,
              ATK: postBattleMotion.loser.ATK,
              DEF: postBattleMotion.loser.DEF,
              ability: '',
              artSrc: postBattleMotion.loser.artImageUrl ?? null,
              fullCardFaceSrc: postBattleMotion.loser.fullCardFaceImageUrl ?? null,
              visualMode: postBattleMotion.loser.visualMode,
              isKing: postBattleMotion.loser.isKing,
              testId: `postbattle-loser-${postBattleMotion.loser.id}`,
            }),
          )
        : null,
      postBattleMotion?.winnerAdvance && postAdvanceFrom && postAdvanceTo
        ? React.createElement(
            'div',
            {
              className: 'board-postbattle-winner-advance',
              style: {
                '--post-winner-from-left': postAdvanceFrom.left,
                '--post-winner-from-top': postAdvanceFrom.top,
                '--post-winner-to-left': postAdvanceTo.left,
                '--post-winner-to-top': postAdvanceTo.top,
                '--post-winner-from-rotation': `${postAdvanceFrom.tilt}deg`,
                '--post-winner-to-rotation': `${postAdvanceTo.tilt}deg`,
              } as React.CSSProperties,
              'data-testid': 'board-postbattle-winner-advance',
            },
            React.createElement(CharacterCardFrame, {
              size: 'board',
              revealed: true,
              controllerColorClass: postBattleMotion.winnerAdvance.controller === 'P1' ? 'player-color-blue' : 'player-color-red',
              displayName: postBattleMotion.winnerAdvance.displayName,
              ATK: postBattleMotion.winnerAdvance.ATK,
              DEF: postBattleMotion.winnerAdvance.DEF,
              ability: '',
              artSrc: postBattleMotion.winnerAdvance.artImageUrl ?? null,
              fullCardFaceSrc: postBattleMotion.winnerAdvance.fullCardFaceImageUrl ?? null,
              visualMode: postBattleMotion.winnerAdvance.visualMode,
              isKing: postBattleMotion.winnerAdvance.isKing,
              testId: `postbattle-winner-${postBattleMotion.winnerAdvance.id}`,
            }),
          )
        : null,
      React.createElement('div', { className: 'board-center-piles', 'data-testid': 'board-center-piles' },
        React.createElement('div', { className: 'center-pile graveyard-pile', 'data-testid': 'center-graveyard-pile' },
          React.createElement('span', { className: 'center-pile-title' }, 'Graveyard'),
          React.createElement('div', { className: 'center-pile-stack' },
            graveyardCardsForDisplay.slice(-5).map((card, index, arr) => React.createElement(
              'div',
              {
                key: `${card.instanceId}-${index}`,
                className: 'center-stack-card center-stack-grave',
                style: {
                  transform: `translate(${index * 4}px, ${index * 5}px) rotate(${(index - (arr.length - 1) / 2) * 1}deg)`,
                  zIndex: 4 + index,
                },
              },
              React.createElement(CharacterCardFrame, {
                size: 'compact',
                revealed: true,
                controllerColorClass: 'player-color-silver',
                displayName: card.displayName,
                ATK: card.ATK,
                DEF: card.DEF,
                ability: card.ability ?? '',
                artSrc: card.artImageUrl ?? null,
                fullCardFaceSrc: card.fullCardFaceImageUrl ?? null,
                visualMode: card.visualMode,
                isKing: false,
                testId: `center-grave-card-${card.instanceId}`,
              }),
            )),
          ),
          React.createElement('span', { className: 'center-pile-count' }, String(graveyardCardsForDisplay.length)),
        ),
        React.createElement('div', { className: 'center-pile used-power-pile', 'data-testid': 'center-used-power-pile' },
          React.createElement('span', { className: 'center-pile-title' }, 'Used Power Cards'),
          React.createElement('div', { className: 'center-pile-stack' },
            view.powerCards.usedPileDefinitionIds.slice(-5).map((definitionId, index, arr) => React.createElement(
              'div',
              {
                key: `used-power-stack-${definitionId}-${index}`,
                className: 'center-stack-card center-stack-power',
                style: {
                  transform: `translate(${index * 4}px, ${index * 5}px) rotate(${(index - (arr.length - 1) / 2) * 1}deg)`,
                  zIndex: 4 + index,
                },
              },
              React.createElement(PowerCardFrame, {
                size: 'compact',
                displayName: getPowerCardDefinition(definitionId).displayName,
                rulesText: getPowerCardDefinition(definitionId).rulesText,
                artSrc: powerCatalogById.get(definitionId)?.artImageUrl ?? null,
                fullCardFaceSrc: powerCatalogById.get(definitionId)?.fullCardFaceImageUrl ?? null,
                visualMode: powerCatalogById.get(definitionId)?.visualMode,
                state: 'used',
                testId: `center-used-power-card-${index}`,
              }),
            )),
          ),
          React.createElement('span', { className: 'center-pile-count' }, String(view.powerCards.usedPileCount)),
        ),
      ),
    ),
  );
}
