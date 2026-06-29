import { describe, expect, it } from 'vitest';
import { ALPHA_1_CHARACTER_DEFINITIONS } from './cardDefinitions';
import { FIRST_ALPHA_POWER_CARD_DEFINITIONS } from './powerCards';
import { createDefaultCharacterCatalogEntry, createDefaultPowerCatalogEntry } from './cardCatalog';

describe('Catalog Art Coverage', () => {
  it('assigns full-face defaults only when explicit character art exists', () => {
    const defaults = ALPHA_1_CHARACTER_DEFINITIONS.map(createDefaultCharacterCatalogEntry);

    expect(defaults).toHaveLength(ALPHA_1_CHARACTER_DEFINITIONS.length);
    for (const entry of defaults) {
      const hasMappedFullFace = entry.fullCardFaceImageUrl.length > 0;
      if (hasMappedFullFace) {
        expect(entry.visualMode).toBe('full-card-face');
        expect(entry.artImageUrl.length).toBeGreaterThan(0);
      } else {
        expect(entry.visualMode).toBe('layered-art');
        expect(entry.artImageUrl).toBe('');
        expect(entry.fullCardFaceImageUrl).toBe('');
      }
    }
  });

  it('assigns full-face defaults only when explicit power art exists', () => {
    const defaults = FIRST_ALPHA_POWER_CARD_DEFINITIONS.map(createDefaultPowerCatalogEntry);

    expect(defaults).toHaveLength(FIRST_ALPHA_POWER_CARD_DEFINITIONS.length);
    for (const entry of defaults) {
      const hasMappedFullFace = entry.fullCardFaceImageUrl.startsWith('/cards/power%20cards/');
      if (hasMappedFullFace) {
        expect(entry.visualMode).toBe('full-card-face');
        expect(entry.artImageUrl.length).toBeGreaterThan(0);
      } else {
        expect(entry.visualMode).toBe('layered-art');
        expect(entry.artImageUrl).toBe('');
        expect(entry.fullCardFaceImageUrl).toBe('');
      }
    }
  });
});
