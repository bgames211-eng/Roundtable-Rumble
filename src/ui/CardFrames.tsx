import React from 'react';
import './CardFrames.css';
import type { CardVisualMode } from '../cardCatalog';
import { PUBLIC_ASSETS } from '../publicAssets';

export type CardFrameSize = 'board' | 'battle' | 'hand' | 'compact';

interface CharacterCardFrameProps {
  size?: CardFrameSize;
  revealed: boolean;
  controllerColorClass: string;
  displayName?: string;
  ATK?: number;
  DEF?: number;
  ability?: string | null;
  statRule?: string | null;
  artSrc?: string | null;
  fullCardFaceSrc?: string | null;
  visualMode?: CardVisualMode;
  isKing?: boolean;
  isFrozen?: boolean;
  isThawing?: boolean;
  selected?: boolean;
  tilt?: number;
  testId?: string;
}

interface PowerCardFrameProps {
  size?: CardFrameSize;
  displayName?: string;
  rulesText?: string;
  artSrc?: string | null;
  fullCardFaceSrc?: string | null;
  visualMode?: CardVisualMode;
  state?: 'back' | 'playable' | 'selected' | 'attached' | 'used' | 'disabled' | 'private';
  selected?: boolean;
  controllerColorClass?: string;
  testId?: string;
}

export function CharacterCardFrame({
  size = 'board',
  revealed,
  controllerColorClass,
  displayName,
  ATK,
  DEF,
  ability,
  statRule,
  artSrc,
  fullCardFaceSrc,
  visualMode = 'layered-art',
  isKing = false,
  isFrozen = false,
  isThawing = false,
  selected = false,
  tilt = 0,
  testId,
}: CharacterCardFrameProps): React.ReactElement {
  const [fullFaceImageFailed, setFullFaceImageFailed] = React.useState(false);
  const [backImageFailed, setBackImageFailed] = React.useState(false);
  const shouldRenderFullCardFace = revealed && visualMode === 'full-card-face' && !!fullCardFaceSrc && !fullFaceImageFailed;
  const shouldRenderCharacterBackImage = !revealed && !backImageFailed;
  const normalizedName = (displayName ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const displayQuestionStats = normalizedName === 'RIDDLER';
  const atkDisplay = displayQuestionStats ? '?' : (ATK ?? '—');
  const defDisplay = displayQuestionStats ? '?' : (DEF ?? '—');
  const className = [
    'physical-card',
    'character-card-frame',
    `character-card-${size}`,
    `card-visual-${shouldRenderFullCardFace ? 'full-card-face' : 'layered-art'}`,
    controllerColorClass,
    revealed ? 'character-revealed' : 'character-hidden',
    isKing ? 'king-card' : '',
    selected ? 'selected-card' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return React.createElement(
    'div',
    {
      className,
      style: tilt !== 0 ? { transform: `rotate(${tilt}deg)` } : undefined,
      'data-testid': testId,
    },
    React.createElement(
      'div',
      { className: 'card-art-area' },
      shouldRenderFullCardFace
        ? React.createElement('img', {
            className: 'card-full-face-image',
            src: fullCardFaceSrc ?? '',
            alt: '',
            'aria-hidden': 'true',
            onError: () => setFullFaceImageFailed(true),
          })
        : artSrc
        ? React.createElement('img', { className: 'card-art-image', src: artSrc, alt: '', 'aria-hidden': 'true' })
        : React.createElement('div', { className: 'card-art-placeholder' }, revealed ? 'ART' : ''),
    ),
    revealed
      ? !shouldRenderFullCardFace
        ? React.createElement(
            React.Fragment,
            null,
            React.createElement('div', { className: 'character-nameplate' }, displayName ?? 'Unknown'),
            React.createElement('div', { className: 'card-divider' }),
            React.createElement('div', { className: 'stat-row stat-row-atk' }, React.createElement('span', null, 'ATK'), React.createElement('span', null, atkDisplay)),
            React.createElement('div', { className: 'stat-row stat-row-def' }, React.createElement('span', null, 'DEF'), React.createElement('span', null, defDisplay)),
            React.createElement('div', { className: 'ability-box' }, ability ?? ''),
            statRule
              ? React.createElement('div', { className: 'ability-box' }, statRule)
              : null,
          )
        : null
      : React.createElement(
          'div',
          { className: 'character-back-logo-only' },
          shouldRenderCharacterBackImage
            ? React.createElement('img', {
                className: 'character-back-image',
                src: PUBLIC_ASSETS.characterBack,
                alt: '',
                'aria-hidden': 'true',
                onError: () => setBackImageFailed(true),
              })
            : React.createElement('span', { className: 'character-back-logo' }, 'RR'),
        ),
    isKing ? React.createElement('span', { className: 'king-sleeve', 'aria-hidden': 'true' }) : null,
    (isFrozen || isThawing)
      ? React.createElement(
          'span',
          {
            className: `frozen-overlay ${isThawing ? 'frozen-overlay-thawing' : ''}`,
            'aria-hidden': 'true',
          },
        )
      : null,
  );
}

export function PowerCardFrame({
  size = 'hand',
  displayName,
  rulesText,
  artSrc,
  fullCardFaceSrc,
  visualMode = 'layered-art',
  state = 'private',
  controllerColorClass = 'player-color-blue',
  selected = false,
  testId,
}: PowerCardFrameProps): React.ReactElement {
  const isBackView = state === 'back' || state === 'private';
  const [fullFaceImageFailed, setFullFaceImageFailed] = React.useState(false);
  const [backImageFailed, setBackImageFailed] = React.useState(false);
  const shouldRenderFullCardFace = !isBackView && visualMode === 'full-card-face' && !!fullCardFaceSrc && !fullFaceImageFailed;
  const shouldRenderPowerBackImage = isBackView && !backImageFailed;

  const className = [
    'physical-card',
    'power-card-frame',
    `power-card-${size}`,
    `card-visual-${shouldRenderFullCardFace ? 'full-card-face' : 'layered-art'}`,
    controllerColorClass,
    `power-state-${state}`,
    selected ? 'selected-card' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return React.createElement(
    'div',
    { className, 'data-testid': testId },
    React.createElement(
      'div',
      { className: 'card-art-area' },
      shouldRenderFullCardFace
        ? React.createElement('img', {
            className: 'card-full-face-image',
            src: fullCardFaceSrc ?? '',
            alt: '',
            'aria-hidden': 'true',
            onError: () => setFullFaceImageFailed(true),
          })
        : artSrc
        ? React.createElement('img', { className: 'card-art-image', src: artSrc, alt: '', 'aria-hidden': 'true' })
        : React.createElement(
            'div',
            { className: 'card-art-placeholder' },
            isBackView && shouldRenderPowerBackImage
              ? React.createElement('img', {
                  className: 'power-back-image',
                  src: PUBLIC_ASSETS.powerBack,
                  alt: '',
                  'aria-hidden': 'true',
                  onError: () => setBackImageFailed(true),
                })
              : isBackView
                ? 'RR power card'
                : 'ART',
          ),
    ),
    !isBackView && !shouldRenderFullCardFace
      ? React.createElement(
          React.Fragment,
          null,
          React.createElement('div', { className: 'power-nameplate' }, displayName ?? 'Power Card'),
          React.createElement('div', { className: 'card-divider' }),
          React.createElement('div', { className: 'power-rules' }, rulesText ?? ''),
        )
      : null,
  );
}
