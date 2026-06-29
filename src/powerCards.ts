import type { Controller } from './gameState';

export interface PowerCardDefinition {
  definitionId: string;
  displayName: string;
  rulesText: string;
  alphaDeckCount: number;
}

export interface PowerCardInstance {
  instanceId: string;
  definitionId: string;
}

export interface UsedPowerCardEntry {
  instanceId: string;
  definitionId: string;
  controller: Controller;
  displayName: string;
  selectedChoice: 'ATK' | 'DEF' | null;
  effectSummary: string;
  visualMode?: 'layered-art' | 'full-card-face';
  artImageUrl?: string;
  fullCardFaceImageUrl?: string;
}

export type RandomFn = () => number;

// Source of truth: FIRST_ALPHA_POWER_CARD_DECK.md
export const FIRST_ALPHA_POWER_CARD_DEFINITIONS: PowerCardDefinition[] = [
  {
    definitionId: 'power-alpha-001',
    displayName: 'SUPER BAT',
    rulesText:
      'During battle where opponent DEF is being used: subtract 4 DEF from opponent for this battle.',
    alphaDeckCount: 2,
  },
  {
    definitionId: 'power-alpha-002',
    displayName: 'BOOM !! BOMB',
    rulesText:
      'During battle: subtract 4 ATK from opponent this battle and subtract 1 DEF from your own card this battle.',
    alphaDeckCount: 2,
  },
  {
    definitionId: 'power-alpha-003',
    displayName: "CHAMPION'S ADVANTAGE",
    rulesText:
      'During battle: choose whether your card uses ATK or DEF for the action.',
    alphaDeckCount: 2,
  },
  {
    definitionId: 'power-alpha-004',
    displayName: 'SUPERKICK!',
    rulesText: 'During battle: subtract 5 ATK or DEF from opponent this battle.',
    alphaDeckCount: 2,
  },
  {
    definitionId: 'power-alpha-005',
    displayName: 'LOW BLOW!',
    rulesText: 'During battle: subtract 4 ATK or DEF from opponent this battle.',
    alphaDeckCount: 2,
  },
  {
    definitionId: 'power-alpha-006',
    displayName: 'POWER STONE',
    rulesText: 'During battle: add +2 ATK or +2 DEF this battle.',
    alphaDeckCount: 1,
  },
  {
    definitionId: 'power-alpha-007',
    displayName: 'FLIP THE SCRIPT',
    rulesText:
      'During battle: each battling character swaps its own ATK and DEF for this battle. Battle type does not change.',
    alphaDeckCount: 1,
  },
  {
    definitionId: 'power-alpha-008',
    displayName: 'BRICK WALL',
    rulesText: 'During battle: +5 DEF. Cannot be used against Kool-Aid Man.',
    alphaDeckCount: 1,
  },
  {
    definitionId: 'power-alpha-009',
    displayName: 'KICK-OUT!!',
    rulesText:
      "During battle, if your character is losing, make the stat currently being used equal the opponent's equivalent stat. Battle continues.",
    alphaDeckCount: 2,
  },
  {
    definitionId: 'power-alpha-010',
    displayName: 'MONGOL EMPIRE',
    rulesText:
      'During battle: +5 ATK. If used on Genghis Khan, the +5 ATK is permanent.',
    alphaDeckCount: 1,
  },
  {
    definitionId: 'power-alpha-011',
    displayName: 'POCKET KNIFE',
    rulesText: 'Any time, including battle: Weapon. +3 ATK / +3 DEF.',
    alphaDeckCount: 1,
  },
  {
    definitionId: 'power-alpha-012',
    displayName: 'RAY GUN',
    rulesText: 'Any time, including battle: equip to any character. +5 ATK / +1 DEF.',
    alphaDeckCount: 1,
  },
  {
    definitionId: 'power-alpha-013',
    displayName: 'BATARANG',
    rulesText: 'Any time, including battle: Weapon. +3 ATK / +1 DEF.',
    alphaDeckCount: 1,
  },
  {
    definitionId: 'power-alpha-014',
    displayName: 'FREEZE GUN',
    rulesText: 'Any time, including battle: Weapon. +4 ATK / +2 DEF.',
    alphaDeckCount: 1,
  },
  {
    definitionId: 'power-alpha-015',
    displayName: 'FRYING PAN',
    rulesText: 'Any time, including battle: Weapon. +2 ATK / +4 DEF.',
    alphaDeckCount: 1,
  },
  {
    definitionId: 'power-alpha-016',
    displayName: 'TAG TEAM',
    rulesText:
      'During battle: if one of your characters is directly behind your battling character, add that character\'s relevant ATK or DEF to your battling character.',
    alphaDeckCount: 1,
  },
  {
    definitionId: 'power-alpha-017',
    displayName: 'PHONE A FRIEND',
    rulesText:
      'During battle: swap one of your living cards with the top card of the unused Character Card deck. The new card cannot come from the Graveyard. May be used on your King.',
    alphaDeckCount: 1,
  },
  {
    definitionId: 'power-alpha-018',
    displayName: 'SWAP CHARACTERS',
    rulesText:
      'Any time, including battle: swap one living card with one opponent living card. Can be used on Kings. If swapping with a King, the card in the King spot becomes that player\'s new King.',
    alphaDeckCount: 1,
  },
  {
    definitionId: 'power-alpha-019',
    displayName: 'BEHIND THE CURTAINS',
    rulesText: 'Any time: look at opponent Power Cards. You may swap one of yours with one of theirs.',
    alphaDeckCount: 1,
  },
  {
    definitionId: 'power-alpha-020',
    displayName: 'NO SPRAY',
    rulesText:
      'During battle, in response to an opponent Power Card: block its effects. Can cancel a Power Card played earlier in the same battle if the battle is still happening and the effect still matters.',
    alphaDeckCount: 1,
  },
  {
    definitionId: 'power-alpha-021',
    displayName: 'BACK IT UP',
    rulesText:
      'On your turn only: move any one card as far backward as desired, if legal. May be used on a King. Cannot be played during battle.',
    alphaDeckCount: 1,
  },
  {
    definitionId: 'power-alpha-022',
    displayName: 'PORTAL',
    rulesText:
      'On your turn only: move your card to any open spot. May be used on a King. Cannot be played during battle.',
    alphaDeckCount: 1,
  },
];

const POWER_CARD_DEFINITION_MAP = new Map(
  FIRST_ALPHA_POWER_CARD_DEFINITIONS.map(definition => [definition.definitionId, definition]),
);

export function getPowerCardDefinition(definitionId: string): PowerCardDefinition {
  const definition = POWER_CARD_DEFINITION_MAP.get(definitionId);
  if (!definition) {
    throw new Error(`Unknown power card definition: ${definitionId}`);
  }
  return definition;
}

function buildPowerInstanceId(oneBasedIndex: number): string {
  return `power-${String(oneBasedIndex).padStart(3, '0')}`;
}

export function buildFirstAlphaPowerCardDeck(): PowerCardInstance[] {
  const deck: PowerCardInstance[] = [];
  let instanceCounter = 1;

  for (const definition of FIRST_ALPHA_POWER_CARD_DEFINITIONS) {
    for (let i = 0; i < definition.alphaDeckCount; i += 1) {
      deck.push({
        instanceId: buildPowerInstanceId(instanceCounter),
        definitionId: definition.definitionId,
      });
      instanceCounter += 1;
    }
  }

  return deck;
}

export function shufflePowerCardInstances(
  instances: PowerCardInstance[],
  randomFn: RandomFn,
): PowerCardInstance[] {
  const shuffled = [...instances];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const randomValue = randomFn();
    if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
      throw new Error('Random function must return a finite number in [0, 1).');
    }
    const j = Math.floor(randomValue * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function countPowerCardsByController(
  powerCardHands: { P1: PowerCardInstance[]; P2: PowerCardInstance[] },
): { P1: number; P2: number } {
  return {
    P1: powerCardHands.P1.length,
    P2: powerCardHands.P2.length,
  };
}

export function getPrivateHandForPlayer(
  powerCardHands: { P1: PowerCardInstance[]; P2: PowerCardInstance[] },
  player: Controller,
): PowerCardInstance[] {
  return [...powerCardHands[player]];
}