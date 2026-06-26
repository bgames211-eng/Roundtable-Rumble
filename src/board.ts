import { Controller, Space } from './types';

export const BOARD_PATH: Space[] = ['Y1','Y2','Y3','Y4','Y5','A5','A4','A3','A2','A1'];

export function getForwardSpace(space: Space): Space {
  const idx = BOARD_PATH.indexOf(space);
  if (idx === -1) throw new Error(`Unknown space: ${space}`);
  return BOARD_PATH[(idx + 1) % BOARD_PATH.length];
}

export function getBackwardSpace(space: Space): Space {
  const idx = BOARD_PATH.indexOf(space);
  if (idx === -1) throw new Error(`Unknown space: ${space}`);
  return BOARD_PATH[(idx - 1 + BOARD_PATH.length) % BOARD_PATH.length];
}

export function getTerritory(space: Space): Controller {
  if (space.startsWith('Y')) return 'Y';
  if (space.startsWith('A')) return 'A';
  throw new Error(`Unknown space territory: ${space}`);
}

export function isEnemyTerritory(controller: Controller, space: Space): boolean {
  return getTerritory(space) !== controller;
}

export function doesKingTerritoryDrawTrigger(
  controller: Controller,
  isKing: boolean,
  startSpace: Space,
  endSpace: Space
): boolean {
  if (!isKing) return false;
  const startTerr = getTerritory(startSpace);
  const endTerr = getTerritory(endSpace);
  return startTerr === controller && endTerr !== controller;
}

export function canNormalAttack(
  attackerSpace: Space,
  attackerController: Controller,
  targetSpace: Space,
  targetController: Controller
): boolean {
  if (attackerController === targetController) return false;
  return targetSpace === getForwardSpace(attackerSpace);
}

export function canSelfDefend(
  defenderSpace: Space,
  defenderController: Controller,
  targetSpace: Space,
  targetController: Controller
): boolean {
  if (defenderController === targetController) return false;
  return targetSpace === getBackwardSpace(defenderSpace);
}
