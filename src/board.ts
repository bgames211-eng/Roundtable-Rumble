import { Controller, Space } from './types';

export const BOARD_PATH: Space[] = ['P1_1','P1_2','P1_3','P1_4','P1_5','P2_5','P2_4','P2_3','P2_2','P2_1'];

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
  if (space.startsWith('P1')) return 'P1';
  if (space.startsWith('P2')) return 'P2';
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
