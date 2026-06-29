export interface CharacterAbilityMetadata {
  trigger: 'passive' | 'activated' | 'conditional-battle';
  effectType:
    | 'draw-engine'
    | 'counter'
    | 'movement-control'
    | 'mobility'
    | 'combat-override'
    | 'stat-scaling'
    | 'equipment-synergy'
    | 'other';
  strategicValue: 'low' | 'medium' | 'high' | 'premium';
  riskIfExposed?: 'low' | 'medium' | 'high';
}

function normalizeName(name: string | undefined): string {
  return (name ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

const METADATA_BY_NORMALIZED_NAME: Record<string, CharacterAbilityMetadata> = {
  ROOMBA: {
    trigger: 'passive',
    effectType: 'draw-engine',
    strategicValue: 'high',
    riskIfExposed: 'high',
  },
  NIGHTCRAWLER: {
    trigger: 'activated',
    effectType: 'mobility',
    strategicValue: 'high',
    riskIfExposed: 'medium',
  },
  RAPUNZEL: {
    trigger: 'activated',
    effectType: 'movement-control',
    strategicValue: 'medium',
    riskIfExposed: 'medium',
  },
  MRSPUFF: {
    trigger: 'activated',
    effectType: 'movement-control',
    strategicValue: 'medium',
    riskIfExposed: 'medium',
  },
  SPONGEBOB: {
    trigger: 'conditional-battle',
    effectType: 'combat-override',
    strategicValue: 'medium',
    riskIfExposed: 'low',
  },
  ANT: {
    trigger: 'conditional-battle',
    effectType: 'draw-engine',
    strategicValue: 'medium',
    riskIfExposed: 'medium',
  },
  CARLGRIMES: {
    trigger: 'passive',
    effectType: 'stat-scaling',
    strategicValue: 'high',
    riskIfExposed: 'medium',
  },
  RICKGRIMES: {
    trigger: 'passive',
    effectType: 'stat-scaling',
    strategicValue: 'high',
    riskIfExposed: 'medium',
  },
  GENGHISKHAN: {
    trigger: 'passive',
    effectType: 'equipment-synergy',
    strategicValue: 'medium',
    riskIfExposed: 'low',
  },
  UNCLEIROH: {
    trigger: 'activated',
    effectType: 'counter',
    strategicValue: 'premium',
    riskIfExposed: 'high',
  },
};

export function getCharacterAbilityMetadata(displayName: string | undefined): CharacterAbilityMetadata | null {
  const normalized = normalizeName(displayName);
  return METADATA_BY_NORMALIZED_NAME[normalized] ?? null;
}

export function abilityStrategicScore(displayName: string | undefined): number {
  const metadata = getCharacterAbilityMetadata(displayName);
  if (!metadata) {
    return 0;
  }

  if (metadata.strategicValue === 'premium') {
    return 4;
  }
  if (metadata.strategicValue === 'high') {
    return 3;
  }
  if (metadata.strategicValue === 'medium') {
    return 2;
  }
  return 1;
}
