import { Controller, Space } from './types';
import { doesKingTerritoryDrawTrigger } from './board';

export function moveKingAndCheckDraw(
  controller: Controller,
  startSpace: Space,
  endSpace: Space
): boolean {
  // Wrapper used by tests to indicate a completed relocation effect for a King
  return doesKingTerritoryDrawTrigger(controller, true, startSpace, endSpace);
}
