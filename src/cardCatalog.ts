import type { CharacterCardDefinition } from './cardDefinitions';
import type { PowerCardDefinition } from './powerCards';
import { PUBLIC_ASSETS } from './publicAssets';

export type CardVisualMode = 'layered-art' | 'full-card-face';

export interface CharacterCatalogEntry {
  definitionId: string;
  displayName: string;
  printedATK: number;
  printedDEF: number;
  ability: string;
  visualMode: CardVisualMode;
  artImageUrl: string;
  fullCardFaceImageUrl: string;
}

export interface PowerCatalogEntry {
  definitionId: string;
  displayName: string;
  rulesText: string;
  visualMode: CardVisualMode;
  artImageUrl: string;
  fullCardFaceImageUrl: string;
}

const CHARACTER_STORAGE_KEY = 'rr-character-catalog-v2';
const POWER_STORAGE_KEY = 'rr-power-catalog-v2';
const LEGACY_CHARACTER_STORAGE_KEY = 'rr-character-catalog-v1';
const LEGACY_POWER_STORAGE_KEY = 'rr-power-catalog-v1';

function publicCardsPath(...segments: string[]): string {
  return `${import.meta.env.BASE_URL}cards/${segments.map(segment => encodeURIComponent(segment)).join('/')}`;
}

const CHARACTER_FULL_FACE_BY_DEFINITION_ID: Record<string, string> = {
  'alpha-001': publicCardsPath('characters', 'brendan.JPG'),
  'alpha-002': publicCardsPath('characters', 'Luke.JPG'),
  'alpha-003': publicCardsPath('characters', 'John Cena.JPG'),
  'alpha-004': publicCardsPath('characters', 'Batman.JPG'),
  'alpha-005': publicCardsPath('characters', 'baxter.JPG'),
  'alpha-006': publicCardsPath('characters', 'spider man.JPG'),
  'alpha-007': publicCardsPath('characters', 'keith.JPG'),
  'alpha-008': publicCardsPath('characters', 'hulk.JPG'),
  'alpha-009': publicCardsPath('characters', 'rick grimes.JPG'),
  'alpha-010': publicCardsPath('characters', 'daryl dixon.JPG'),
  'alpha-011': publicCardsPath('characters', 'nebula.JPG'),
  'alpha-012': publicCardsPath('characters', 'Gamora 1.JPG'),
  'alpha-013': publicCardsPath('characters', 'Larry The Lobster.JPG'),
  'alpha-014': publicCardsPath('characters', 'Patrick.JPG'),
  'alpha-015': publicCardsPath('characters', 'sandy cheeks.JPG'),
  'alpha-016': publicCardsPath('characters', 'toph.JPG'),
  'alpha-017': publicCardsPath('characters', 'cedi osman.JPG'),
  'alpha-018': publicCardsPath('characters', 'lego cap.JPG'),
  'alpha-019': publicCardsPath('characters', 'the penguin.JPG'),
  'alpha-020': publicCardsPath('characters', 'mr freeze.JPG'),
  'alpha-021': publicCardsPath('characters', 'bob.JPG'),
  'alpha-022': publicCardsPath('characters', 'sokka.JPG'),
  'alpha-023': publicCardsPath('characters', 'zuko.JPG'),
  'alpha-024': publicCardsPath('characters', 'genghis khan.JPG'),
  'alpha-025': publicCardsPath('characters', 'kool-aid man.JPG'),
  'alpha-026': publicCardsPath('characters', 'roomba.JPG'),
  'alpha-027': publicCardsPath('characters', 'nightcrawler.JPG'),
  'alpha-028': publicCardsPath('characters', 'rapunzel.JPG'),
  'alpha-029': publicCardsPath('characters', 'mrs puff.JPG'),
  'alpha-030': publicCardsPath('characters', 'spongebob.JPG'),
  'alpha-031': publicCardsPath('characters', 'ant.JPG'),
  'alpha-032': publicCardsPath('characters', 'carl grimes.JPG'),
  'alpha-033': publicCardsPath('characters', 'riddler.JPG'),
  'alpha-034': publicCardsPath('characters', 'uncle iroh.JPG'),
  'alpha-035': publicCardsPath('characters', 'jeremy jahns.JPG'),
  'alpha-036': publicCardsPath('characters', 'skar productions.JPG'),
  'alpha-037': publicCardsPath('characters', 'bird.JPG'),
  'alpha-038': publicCardsPath('characters', 'avatar aang.JPG'),
  'alpha-039': publicCardsPath('characters', 'thanos.JPG'),
};

const POWER_FULL_FACE_BY_DEFINITION_ID: Record<string, string> = {
  'power-alpha-001': publicCardsPath('power cards', 'super bat power card.JPG'),
  'power-alpha-002': publicCardsPath('power cards', 'Boom!!Bomb power card.JPG'),
  'power-alpha-003': publicCardsPath('power cards', 'champions advantage power card.JPG'),
  'power-alpha-004': publicCardsPath('power cards', 'super kick power card.JPG'),
  'power-alpha-005': publicCardsPath('power cards', 'low blow power card.JPG'),
  'power-alpha-006': publicCardsPath('power cards', 'power stone- infinity stone- power card.JPG'),
  'power-alpha-007': publicCardsPath('power cards', 'flip the script power card.JPG'),
  'power-alpha-008': publicCardsPath('power cards', 'brick wall power card.JPG'),
  'power-alpha-009': publicCardsPath('power cards', 'kick out power card.JPG'),
  'power-alpha-010': publicCardsPath('power cards', 'mongol empire power card.JPG'),
  'power-alpha-011': publicCardsPath('power cards', 'weapons', 'pocket knife weapon power card.JPG'),
  'power-alpha-012': publicCardsPath('power cards', 'weapons', 'ray gun weapon power card.JPG'),
  'power-alpha-013': publicCardsPath('power cards', 'weapons', 'batarang weapon power card.JPG'),
  'power-alpha-014': publicCardsPath('power cards', 'weapons', 'freeze gun weapon power card.JPG'),
  'power-alpha-015': publicCardsPath('power cards', 'weapons', 'frying pan weapon power card.JPG'),
  'power-alpha-016': publicCardsPath('power cards', 'tag team power card.JPG'),
  'power-alpha-017': publicCardsPath('power cards', 'phone a friend power card.JPG'),
  'power-alpha-018': publicCardsPath('power cards', 'swap characters power card.JPG'),
  'power-alpha-019': publicCardsPath('power cards', 'behind the curtains power card.JPG'),
  'power-alpha-020': publicCardsPath('power cards', 'no spray power card.JPG'),
  'power-alpha-021': publicCardsPath('power cards', 'back it up power card.JPG'),
  'power-alpha-022': publicCardsPath('power cards', 'portal power card.JPG'),
  'power-alpha-023': publicCardsPath('power cards', 'weapons', 'infinity gauntlet weapon power card.JPG'),
  'power-alpha-024': publicCardsPath('power cards', 'mind stone power card.JPG'),
  'power-alpha-025': publicCardsPath('power cards', 'reality stone power card.JPG'),
  'power-alpha-026': publicCardsPath('power cards', 'soul stone power card 1.JPG'),
  'power-alpha-027': publicCardsPath('power cards', 'space stone power card.JPG'),
  'power-alpha-028': publicCardsPath('power cards', 'time stone power card.JPG'),
};

function isLegacySoulStoneArtPath(path: string): boolean {
  return path.includes('soul%20stone%20power%20card.JPG') || path.includes('soul stone power card.JPG');
}

function hasWindow(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readJson<T>(key: string): T | null {
  if (!hasWindow()) {
    return null;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeVisualMode(mode: unknown, fullCardFaceImageUrl: string): CardVisualMode {
  if (mode === 'full-card-face' && fullCardFaceImageUrl.trim().length > 0) {
    return 'full-card-face';
  }
  return 'layered-art';
}

function isBrendanDefinition(definitionId: string): boolean {
  return definitionId === 'alpha-001';
}

function isGamoraDefinition(definitionId: string): boolean {
  return definitionId === 'alpha-012';
}

export function createDefaultCharacterCatalogEntry(definition: CharacterCardDefinition): CharacterCatalogEntry {
  const defaultFullCardFaceImageUrl = CHARACTER_FULL_FACE_BY_DEFINITION_ID[definition.definitionId] ?? '';
  return {
    definitionId: definition.definitionId,
    displayName: definition.displayName,
    printedATK: definition.printedATK,
    printedDEF: definition.printedDEF,
    ability: definition.ability ?? '',
    visualMode: defaultFullCardFaceImageUrl ? 'full-card-face' : 'layered-art',
    artImageUrl: defaultFullCardFaceImageUrl,
    fullCardFaceImageUrl: defaultFullCardFaceImageUrl,
  };
}

export function createDefaultPowerCatalogEntry(definition: PowerCardDefinition): PowerCatalogEntry {
  const defaultFullCardFaceImageUrl = POWER_FULL_FACE_BY_DEFINITION_ID[definition.definitionId] ?? '';
  return {
    definitionId: definition.definitionId,
    displayName: definition.displayName,
    rulesText: definition.rulesText,
    visualMode: defaultFullCardFaceImageUrl ? 'full-card-face' : 'layered-art',
    artImageUrl: defaultFullCardFaceImageUrl,
    fullCardFaceImageUrl: defaultFullCardFaceImageUrl,
  };
}

function normalizeCharacterEntry(
  fallback: CharacterCatalogEntry,
  raw: Partial<CharacterCatalogEntry> & { imageUrl?: string },
): CharacterCatalogEntry {
  const supportsBuiltInFullFace = !!CHARACTER_FULL_FACE_BY_DEFINITION_ID[fallback.definitionId];
  const normalizeStoredCharacterImage = (value: string): string => (
    value.trim().length > 0 && value.trim() !== PUBLIC_ASSETS.genericCharacterFace ? value.trim() : ''
  );
  const rawArtImageUrl = normalizeStoredCharacterImage(raw.artImageUrl ?? raw.imageUrl ?? '');
  const rawFullCardFaceImageUrl = normalizeStoredCharacterImage(raw.fullCardFaceImageUrl ?? '');
  const artImageUrl = supportsBuiltInFullFace
    ? (rawArtImageUrl.length > 0 ? rawArtImageUrl : (fallback.artImageUrl ?? '').trim())
    : '';
  const fullCardFaceImageUrl = supportsBuiltInFullFace
    ? (rawFullCardFaceImageUrl.length > 0
      ? rawFullCardFaceImageUrl
      : (fallback.fullCardFaceImageUrl ?? '').trim())
    : '';
  const shouldPreferFallbackFullFace = fullCardFaceImageUrl.length > 0
    && rawArtImageUrl.length === 0
    && rawFullCardFaceImageUrl.length === 0;

  const normalized: CharacterCatalogEntry = {
    ...fallback,
    displayName: (raw.displayName ?? fallback.displayName).trim(),
    printedATK: Number.isFinite(raw.printedATK as number) ? Number(raw.printedATK) : fallback.printedATK,
    printedDEF: Number.isFinite(raw.printedDEF as number) ? Number(raw.printedDEF) : fallback.printedDEF,
    ability: (raw.ability ?? fallback.ability ?? '').trim(),
    visualMode: supportsBuiltInFullFace
      ? (shouldPreferFallbackFullFace
        ? 'full-card-face'
        : normalizeVisualMode(raw.visualMode ?? fallback.visualMode, fullCardFaceImageUrl))
      : 'layered-art',
    artImageUrl,
    fullCardFaceImageUrl,
  };

  // Keep Brendan pre-configured with full-face art even when older saved state still has layered mode.
  if (isBrendanDefinition(fallback.definitionId)) {
    return {
      ...normalized,
      visualMode: 'full-card-face',
      fullCardFaceImageUrl: PUBLIC_ASSETS.brendanFullFace,
    };
  }

  // Keep Gamora locked to the shipped full-face art if stale local catalog data exists.
  if (isGamoraDefinition(fallback.definitionId)) {
    return {
      ...normalized,
      visualMode: 'full-card-face',
      artImageUrl: CHARACTER_FULL_FACE_BY_DEFINITION_ID['alpha-012'] ?? normalized.artImageUrl,
      fullCardFaceImageUrl: CHARACTER_FULL_FACE_BY_DEFINITION_ID['alpha-012'] ?? normalized.fullCardFaceImageUrl,
    };
  }

  return normalized;
}

function normalizePowerEntry(
  fallback: PowerCatalogEntry,
  raw: Partial<PowerCatalogEntry> & { imageUrl?: string },
): PowerCatalogEntry {
  const supportsBuiltInFullFace = !!POWER_FULL_FACE_BY_DEFINITION_ID[fallback.definitionId];
  let rawArtImageUrl = (raw.artImageUrl ?? raw.imageUrl ?? '').trim();
  let rawFullCardFaceImageUrl = (raw.fullCardFaceImageUrl ?? '').trim();

  if (fallback.definitionId === 'power-alpha-026') {
    if (isLegacySoulStoneArtPath(rawArtImageUrl)) {
      rawArtImageUrl = '';
    }
    if (isLegacySoulStoneArtPath(rawFullCardFaceImageUrl)) {
      rawFullCardFaceImageUrl = '';
    }
  }

  const artImageUrl = supportsBuiltInFullFace
    ? (rawArtImageUrl.length > 0 ? rawArtImageUrl : (fallback.artImageUrl ?? '').trim())
    : '';
  const fullCardFaceImageUrl = supportsBuiltInFullFace
    ? (rawFullCardFaceImageUrl.length > 0
      ? rawFullCardFaceImageUrl
      : (fallback.fullCardFaceImageUrl ?? '').trim())
    : '';
  const shouldPreferFallbackFullFace = fullCardFaceImageUrl.length > 0
    && rawArtImageUrl.length === 0
    && rawFullCardFaceImageUrl.length === 0;

  return {
    ...fallback,
    displayName: (raw.displayName ?? fallback.displayName).trim(),
    rulesText: (raw.rulesText ?? fallback.rulesText).trim(),
    visualMode: supportsBuiltInFullFace
      ? (shouldPreferFallbackFullFace
        ? 'full-card-face'
        : normalizeVisualMode(raw.visualMode ?? fallback.visualMode, fullCardFaceImageUrl))
      : 'layered-art',
    artImageUrl,
    fullCardFaceImageUrl,
  };
}

function readCatalogArray<T>(primaryKey: string, legacyKey: string): T[] | null {
  const stored = readJson<T[]>(primaryKey) ?? readJson<T[]>(legacyKey);
  return Array.isArray(stored) ? stored : null;
}

export function loadCharacterCatalog(definitions: CharacterCardDefinition[]): CharacterCatalogEntry[] {
  const defaults = definitions.map(createDefaultCharacterCatalogEntry);
  const stored = readCatalogArray<Partial<CharacterCatalogEntry> & { imageUrl?: string }>(CHARACTER_STORAGE_KEY, LEGACY_CHARACTER_STORAGE_KEY);

  if (!stored) {
    return defaults;
  }

  const byDefinitionId = new Map(stored.map(entry => [entry.definitionId, entry]));
  return defaults.map(defaultEntry => normalizeCharacterEntry(defaultEntry, byDefinitionId.get(defaultEntry.definitionId) ?? {}));
}

export function loadPowerCatalog(definitions: PowerCardDefinition[]): PowerCatalogEntry[] {
  const defaults = definitions.map(createDefaultPowerCatalogEntry);
  const stored = readCatalogArray<Partial<PowerCatalogEntry> & { imageUrl?: string }>(POWER_STORAGE_KEY, LEGACY_POWER_STORAGE_KEY);

  if (!stored) {
    return defaults;
  }

  const byDefinitionId = new Map(stored.map(entry => [entry.definitionId, entry]));
  return defaults.map(defaultEntry => normalizePowerEntry(defaultEntry, byDefinitionId.get(defaultEntry.definitionId) ?? {}));
}

export function saveCharacterCatalog(entries: CharacterCatalogEntry[]): void {
  writeJson(CHARACTER_STORAGE_KEY, entries);
}

export function savePowerCatalog(entries: PowerCatalogEntry[]): void {
  writeJson(POWER_STORAGE_KEY, entries);
}

export function getCharacterCatalogEntry(definitionId: string, definitions: CharacterCardDefinition[]): CharacterCatalogEntry {
  return loadCharacterCatalog(definitions).find(entry => entry.definitionId === definitionId) ?? createDefaultCharacterCatalogEntry(
    definitions.find(definition => definition.definitionId === definitionId) ?? definitions[0],
  );
}

export function getPowerCatalogEntry(definitionId: string, definitions: PowerCardDefinition[]): PowerCatalogEntry {
  return loadPowerCatalog(definitions).find(entry => entry.definitionId === definitionId) ?? createDefaultPowerCatalogEntry(
    definitions.find(definition => definition.definitionId === definitionId) ?? definitions[0],
  );
}