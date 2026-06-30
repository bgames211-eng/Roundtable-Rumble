import { afterEach, describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { chooseBotBattleDecision, chooseBotBoardDecision, chooseBotCurtainsSwap, getBackItUpTempoPenalty } from './bot';
import { initializeGameState, type Character, type Controller } from './gameState';
import type { BotLegalActionDescriptor } from './botView';

afterEach(() => {
  cleanup();
});

function createChar(
  id: string,
  controller: Controller,
  ATK: number,
  DEF: number,
  isKing: boolean,
  boardPosition: Character['boardPosition'],
  displayName: string,
  revealed = false,
): Character {
  return {
    id,
    controller,
    ATK,
    DEF,
    isKing,
    boardPosition,
    revealed,
    alive: true,
    displayName,
  };
}

describe('Phase 5 Bot', () => {
  const action = (
    type: BotLegalActionDescriptor['type'],
    characterId: string,
    knownBattleOutcomeForBot: BotLegalActionDescriptor['knownBattleOutcomeForBot'],
    overrides: Partial<BotLegalActionDescriptor> = {},
  ): BotLegalActionDescriptor => ({
    type,
    characterId,
    knownBattleOutcomeForBot,
    actorIsKing: false,
    actorRevealed: true,
    actorBoardPosition: 'P2_2',
    actorKnownATK: 5,
    actorKnownDEF: 5,
    targetCharacterId: null,
    targetIsKing: null,
    targetRevealed: null,
    targetBoardPosition: null,
    crossesIntoEnemyTerritory: false,
    mayGainPowerCardDraw: false,
    opponentKnownWinningReplies: 0,
    exposesOwnKingToKnownWinningReply: false,
    actorAbilityStrategicScore: 0,
    targetAbilityStrategicScore: null,
    targetKnownATK: null,
    targetKnownDEF: null,
    ...overrides,
  });

  it('start screen exposes human vs bot mode using P1/P2 naming', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId('mode-bot'));
    expect(screen.getByTestId('mode-bot')).toHaveAttribute('aria-pressed', 'true');
  });

  it('bot board decision prefers move over non-winning battle', () => {
    const decision = chooseBotBoardDecision({
      botController: 'P2',
      activePlayer: 'P2',
      turnNumber: 3,
      gameStatus: 'active',
      publicView: {} as never,
      pendingBattle: null,
      hasLegalAction: true,
      ownPowerCardHand: [],
      legalActions: [
        action('attack', 'a-1', null),
        action('move', 'a-2', null),
      ],
    });

    expect(decision.kind).toBe('action');
    if (decision.kind === 'action') {
      expect(decision.action.type).toBe('move');
      expect(decision.explanation.length).toBeGreaterThan(0);
      expect(decision.alternativesConsidered).toBe(2);
    }
  });

  it('easy mode defaults to strongest action when not in mistake window', () => {
    const view = {
      botController: 'P2' as const,
      activePlayer: 'P2' as const,
      turnNumber: 8,
      gameStatus: 'active' as const,
      publicView: {} as never,
      pendingBattle: null,
      hasLegalAction: true,
      ownPowerCardHand: [],
      legalActions: [
        action('attack', 'a-win', 'win'),
        action('move', 'a-move', null),
        action('defend', 'a-draw', 'draw'),
      ],
    };

    const easyDecision = chooseBotBoardDecision(view, 'Easy');
    const standardDecision = chooseBotBoardDecision(view, 'Standard');

    expect(easyDecision.kind).toBe('action');
    expect(standardDecision.kind).toBe('action');

    if (easyDecision.kind === 'action' && standardDecision.kind === 'action') {
      expect(easyDecision.action.type).toBe('attack');
      expect(standardDecision.action.type).toBe('attack');
    }
  });

  it('easy mode has tiny mistake chance path that can pick weaker top-band action', () => {
    const view = {
      botController: 'P2' as const,
      activePlayer: 'P2' as const,
      turnNumber: 8,
      gameStatus: 'active' as const,
      publicView: {} as never,
      pendingBattle: null,
      hasLegalAction: true,
      ownPowerCardHand: [],
      legalActions: [
        action('attack', 'best', 'win'),
        action('move', 'weaker', null),
        action('defend', 'third', 'draw'),
        action('move', 'fourth', null),
      ],
    };

    const decision = chooseBotBoardDecision(view, 'Easy', () => 0.01);
    expect(decision.kind).toBe('action');
    if (decision.kind === 'action') {
      expect(decision.action.characterId).toBe('fourth');
    }
  });

  it('hard mode avoids risky king attack when a safer winning defend exists', () => {
    const decision = chooseBotBoardDecision({
      botController: 'P2',
      activePlayer: 'P2',
      turnNumber: 12,
      gameStatus: 'active',
      publicView: {} as never,
      pendingBattle: null,
      hasLegalAction: true,
      ownPowerCardHand: [],
      legalActions: [
        action('attack', 'king-attacker', 'win', {
          actorIsKing: true,
          targetCharacterId: 'p1-front',
          targetRevealed: true,
        }),
        action('defend', 'king-defender', 'win', {
          actorIsKing: true,
          targetCharacterId: 'p1-behind',
          targetRevealed: true,
        }),
      ],
    }, 'Hard');

    expect(decision.kind).toBe('action');
    if (decision.kind === 'action') {
      expect(decision.action.type).toBe('defend');
    }
  });

  it('hard mode prefers safer move when alternative move exposes king to known winning replies', () => {
    const decision = chooseBotBoardDecision({
      botController: 'P2',
      activePlayer: 'P2',
      turnNumber: 10,
      gameStatus: 'active',
      publicView: {} as never,
      pendingBattle: null,
      hasLegalAction: true,
      ownPowerCardHand: [],
      legalActions: [
        action('move', 'safe-move', null, {
          actorIsKing: true,
          opponentKnownWinningReplies: 0,
          exposesOwnKingToKnownWinningReply: false,
        }),
        action('move', 'risky-move', null, {
          actorIsKing: true,
          opponentKnownWinningReplies: 2,
          exposesOwnKingToKnownWinningReply: true,
        }),
      ],
    }, 'Hard');

    expect(decision.kind).toBe('action');
    if (decision.kind === 'action') {
      expect(decision.action.characterId).toBe('safe-move');
    }
  });

  it('hard mode prefers winning attack on high-value revealed ability target over low-value target', () => {
    const decision = chooseBotBoardDecision({
      botController: 'P2',
      activePlayer: 'P2',
      turnNumber: 15,
      gameStatus: 'active',
      publicView: {} as never,
      pendingBattle: null,
      hasLegalAction: true,
      ownPowerCardHand: [],
      legalActions: [
        action('attack', 'atk-high', 'win', {
          targetCharacterId: 'p1-high-value',
          targetRevealed: true,
          targetAbilityStrategicScore: 4,
        }),
        action('attack', 'atk-low', 'win', {
          targetCharacterId: 'p1-low-value',
          targetRevealed: true,
          targetAbilityStrategicScore: 0,
        }),
      ],
    }, 'Hard');

    expect(decision.kind).toBe('action');
    if (decision.kind === 'action') {
      expect(decision.action.characterId).toBe('atk-high');
    }
  });

  it('hard mode avoids king known-losing defend when safer move option exists', () => {
    const decision = chooseBotBoardDecision({
      botController: 'P2',
      activePlayer: 'P2',
      turnNumber: 9,
      gameStatus: 'active',
      publicView: {} as never,
      pendingBattle: null,
      hasLegalAction: true,
      ownPowerCardHand: [],
      legalActions: [
        action('defend', 'king-defend-loss', 'loss', {
          actorIsKing: true,
          targetCharacterId: 'p1-penguin',
          targetRevealed: true,
        }),
        action('move', 'safe-other-unit', null, {
          actorIsKing: false,
        }),
      ],
    }, 'Hard');

    expect(decision.kind).toBe('action');
    if (decision.kind === 'action') {
      expect(decision.action.characterId).toBe('safe-other-unit');
    }
  });

  it('hard mode avoids Mrs Puff-style weak self-defend into a 10 DEF target', () => {
    const decision = chooseBotBoardDecision({
      botController: 'P2',
      activePlayer: 'P2',
      turnNumber: 9,
      gameStatus: 'active',
      publicView: {} as never,
      pendingBattle: null,
      hasLegalAction: true,
      ownPowerCardHand: [],
      legalActions: [
        action('defend', 'mrs-puff-line', null, {
          actorIsKing: false,
          actorKnownATK: 1,
          actorKnownDEF: 2,
          targetCharacterId: 'armored-target',
          targetRevealed: true,
          targetKnownATK: 2,
          targetKnownDEF: 10,
        }),
        action('move', 'safe-move', null, {
          actorIsKing: false,
        }),
      ],
    }, 'Hard');

    expect(decision.kind).toBe('action');
    if (decision.kind === 'action') {
      expect(decision.action.type).toBe('move');
      expect(decision.action.characterId).toBe('safe-move');
    }
  });

  it('hard mode avoids non-winning defend into a target with higher DEF than ATK', () => {
    const decision = chooseBotBoardDecision({
      botController: 'P2',
      activePlayer: 'P2',
      turnNumber: 10,
      gameStatus: 'active',
      publicView: {} as never,
      pendingBattle: null,
      hasLegalAction: true,
      ownPowerCardHand: [],
      legalActions: [
        action('defend', 'turtle-line', null, {
          actorIsKing: false,
          actorKnownATK: 4,
          actorKnownDEF: 6,
          targetCharacterId: 'hard-target',
          targetRevealed: true,
          targetKnownATK: 4,
          targetKnownDEF: 8,
        }),
        action('move', 'advance-line', null, {
          actorIsKing: false,
        }),
      ],
    }, 'Hard');

    expect(decision.kind).toBe('action');
    if (decision.kind === 'action') {
      expect(decision.action.type).toBe('move');
      expect(decision.action.characterId).toBe('advance-line');
    }
  });

  it('hard mode prefers attack target with better math margin when outcomes are unknown', () => {
    const decision = chooseBotBoardDecision({
      botController: 'P2',
      activePlayer: 'P2',
      turnNumber: 10,
      gameStatus: 'active',
      publicView: {} as never,
      pendingBattle: null,
      hasLegalAction: true,
      ownPowerCardHand: [],
      legalActions: [
        action('attack', 'atk-high-def', null, {
          actorKnownATK: 6,
          targetCharacterId: 'target-high-def',
          targetRevealed: true,
          targetKnownDEF: 8,
        }),
        action('attack', 'atk-low-def', null, {
          actorKnownATK: 6,
          targetCharacterId: 'target-low-def',
          targetRevealed: true,
          targetKnownDEF: 4,
        }),
      ],
    }, 'Hard');

    expect(decision.kind).toBe('action');
    if (decision.kind === 'action') {
      expect(decision.action.characterId).toBe('atk-low-def');
    }
  });

  it('hard mode avoids repeating defend loops when a move alternative exists', () => {
    const decision = chooseBotBoardDecision({
      botController: 'P2',
      activePlayer: 'P2',
      turnNumber: 11,
      gameStatus: 'active',
      publicView: {} as never,
      pendingBattle: null,
      hasLegalAction: true,
      ownPowerCardHand: [],
      recentBotActionType: 'defend',
      legalActions: [
        action('defend', 'loop-defend', null, {
          actorIsKing: false,
          actorKnownDEF: 8,
          targetCharacterId: 'def-target',
          targetRevealed: true,
          targetKnownATK: 6,
          targetKnownDEF: 7,
        }),
        action('move', 'break-loop-move', null, {
          actorIsKing: false,
        }),
      ],
    }, 'Hard');

    expect(decision.kind).toBe('action');
    if (decision.kind === 'action') {
      expect(decision.action.type).toBe('move');
      expect(decision.action.characterId).toBe('break-loop-move');
    }
  });

  it('Back It Up applies a tempo penalty to one-step non-king retreats', () => {
    expect(getBackItUpTempoPenalty(false, true, 'Hard')).toBeGreaterThan(0);
    expect(getBackItUpTempoPenalty(false, true, 'Hard')).toBe(140);
    expect(getBackItUpTempoPenalty(true, true, 'Hard')).toBe(0);
    expect(getBackItUpTempoPenalty(false, false, 'Hard')).toBe(0);
  });

  it('hard mode prefers king-hunt unknown attack over uncertain non-king defend', () => {
    const decision = chooseBotBoardDecision({
      botController: 'P2',
      activePlayer: 'P2',
      turnNumber: 14,
      gameStatus: 'active',
      publicView: {} as never,
      pendingBattle: null,
      hasLegalAction: true,
      ownPowerCardHand: [],
      legalActions: [
        action('attack', 'hunter', null, {
          actorIsKing: false,
          targetCharacterId: 'p1-king-front',
          targetIsKing: true,
          targetRevealed: false,
        }),
        action('defend', 'holder', null, {
          actorIsKing: false,
          targetCharacterId: 'p1-backline',
          targetIsKing: false,
          targetRevealed: false,
        }),
      ],
    }, 'Hard');

    expect(decision.kind).toBe('action');
    if (decision.kind === 'action') {
      expect(decision.action.type).toBe('attack');
      expect(decision.action.characterId).toBe('hunter');
    }
  });

  it('standard mode prefers defend when attacking a high-DEF king is non-winning', () => {
    const decision = chooseBotBoardDecision({
      botController: 'P2',
      activePlayer: 'P2',
      turnNumber: 16,
      gameStatus: 'active',
      publicView: {} as never,
      pendingBattle: null,
      hasLegalAction: true,
      ownPowerCardHand: [],
      legalActions: [
        action('attack', 'frontline', null, {
          actorIsKing: false,
          targetCharacterId: 'p1-king',
          targetIsKing: true,
          targetRevealed: true,
          targetKnownATK: 5,
          targetKnownDEF: 10,
        }),
        action('defend', 'frontline', null, {
          actorIsKing: false,
          targetCharacterId: 'p1-backline',
          targetIsKing: false,
          targetRevealed: false,
        }),
      ],
    }, 'Standard');

    expect(decision.kind).toBe('action');
    if (decision.kind === 'action') {
      expect(decision.action.type).toBe('defend');
    }
  });

  it('hard mode prefers non-king unknown attack over passive unknown defend when no move exists', () => {
    const decision = chooseBotBoardDecision({
      botController: 'P2',
      activePlayer: 'P2',
      turnNumber: 11,
      gameStatus: 'active',
      publicView: {} as never,
      pendingBattle: null,
      hasLegalAction: true,
      ownPowerCardHand: [],
      legalActions: [
        action('attack', 'frontline-attacker', null, {
          actorIsKing: false,
          targetCharacterId: 'p1-hidden-front',
          targetRevealed: false,
        }),
        action('defend', 'frontline-defender', null, {
          actorIsKing: false,
          targetCharacterId: 'p1-hidden-behind',
          targetRevealed: false,
        }),
      ],
    }, 'Hard');

    expect(decision.kind).toBe('action');
    if (decision.kind === 'action') {
      expect(decision.action.type).toBe('attack');
      expect(decision.action.characterId).toBe('frontline-attacker');
    }
  });

  it('bot battle decision chooses pass when already projected to win', () => {
    const decision = chooseBotBattleDecision('P2', {
      winner: 'P2',
      initiatorComparisonValue: 5,
      opponentComparisonValue: 8,
      winningMargin: 3,
    }, []);

    expect(decision.kind).toBe('pass');
    if (decision.kind === 'pass') {
      expect(decision.explanation.length).toBeGreaterThan(0);
    }
  });

  it('hard battle mode passes when only still-losing improvement exists in non-king battle', () => {
    const decision = chooseBotBattleDecision(
      'P2',
      {
        winner: 'P1',
        initiatorComparisonValue: 11,
        opponentComparisonValue: 7,
        winningMargin: 4,
      },
      [
        {
          input: { instanceId: 'card-a' },
          displayName: 'POWER STONE',
          definitionId: 'power-alpha-006',
          projectedResult: {
            winner: 'P1',
            initiatorComparisonValue: 10,
            opponentComparisonValue: 8,
            winningMargin: 2,
          },
        },
      ],
      'Hard',
    );

    expect(decision.kind).toBe('pass');
  });

  it('hard battle mode can spend on still-losing improvement when bot battler is king', () => {
    const decision = chooseBotBattleDecision({
      botController: 'P2',
      currentResult: {
        winner: 'P1',
        initiatorComparisonValue: 11,
        opponentComparisonValue: 7,
        winningMargin: 4,
      },
      candidates: [
        {
          input: { instanceId: 'card-a' },
          displayName: 'POWER STONE',
          definitionId: 'power-alpha-006',
          projectedResult: {
            winner: 'P1',
            initiatorComparisonValue: 10,
            opponentComparisonValue: 8,
            winningMargin: 2,
          },
        },
      ],
      difficulty: 'Hard',
      botBattlerIsKing: true,
    });

    expect(decision.kind).toBe('play');
    if (decision.kind === 'play') {
      expect(decision.input.instanceId).toBe('card-a');
    }
  });

  it('hard battle mode avoids wasting Ray Gun when line remains losing with minimal swing', () => {
    const decision = chooseBotBattleDecision(
      'P2',
      {
        winner: 'P1',
        initiatorComparisonValue: 12,
        opponentComparisonValue: 7,
        winningMargin: 5,
      },
      [
        {
          input: { instanceId: 'ray-gun-on-ally', targetCharacterId: 'ally-1' },
          displayName: 'RAY GUN',
          definitionId: 'power-alpha-012',
          projectedResult: {
            winner: 'P1',
            initiatorComparisonValue: 11,
            opponentComparisonValue: 7,
            winningMargin: 4,
          },
        },
      ],
      'Hard',
    );

    expect(decision.kind).toBe('pass');
  });

  it('hard battle mode rejects Mongol Empire in a DEF self-defend line', () => {
    const decision = chooseBotBattleDecision({
      botController: 'P2',
      currentResult: {
        winner: 'P1',
        initiatorComparisonValue: 8,
        opponentComparisonValue: 6,
        winningMargin: 2,
      },
      candidates: [
        {
          input: { instanceId: 'mongol-empire' },
          displayName: 'MONGOL EMPIRE',
          definitionId: 'power-alpha-010',
          projectedResult: {
            winner: 'P2',
            initiatorComparisonValue: 8,
            opponentComparisonValue: 7,
            winningMargin: 1,
          },
          actingComparisonLabel: 'DEF',
          opponentComparisonLabel: 'DEF',
        },
        {
          input: { instanceId: 'brick-wall' },
          displayName: 'BRICK WALL',
          definitionId: 'power-alpha-008',
          projectedResult: {
            winner: 'P2',
            initiatorComparisonValue: 8,
            opponentComparisonValue: 7,
            winningMargin: 1,
          },
          actingComparisonLabel: 'DEF',
          opponentComparisonLabel: 'DEF',
        },
      ],
      difficulty: 'Hard',
    });

    expect(decision.kind).toBe('play');
    if (decision.kind === 'play') {
      expect(decision.definitionId).toBe('power-alpha-008');
      expect(decision.input.instanceId).toBe('brick-wall');
    }
  });

  it('hard battle mode uses Phone a Friend in imminent king-loss line instead of passing', () => {
    const decision = chooseBotBattleDecision({
      botController: 'P2',
      currentResult: {
        winner: 'P1',
        initiatorComparisonValue: 11,
        opponentComparisonValue: 7,
        winningMargin: 4,
      },
      candidates: [
        {
          input: { instanceId: 'phone-friend', targetCharacterId: 'p2-king' },
          displayName: 'PHONE A FRIEND',
          definitionId: 'power-alpha-017',
          projectedResult: {
            winner: 'P1',
            initiatorComparisonValue: 10,
            opponentComparisonValue: 7,
            winningMargin: 3,
          },
        },
      ],
      difficulty: 'Hard',
      imminentKingLoss: true,
    });

    expect(decision.kind).toBe('play');
    if (decision.kind === 'play') {
      expect(decision.definitionId).toBe('power-alpha-017');
    }
  });

  it('standard battle mode saves last premium card in non-king losing line', () => {
    const decision = chooseBotBattleDecision({
      botController: 'P2',
      currentResult: {
        winner: 'P1',
        initiatorComparisonValue: 9,
        opponentComparisonValue: 4,
        winningMargin: 5,
      },
      candidates: [
        {
          input: { instanceId: 'kick-out-last', selectedChoice: 'ATK' },
          displayName: 'KICK-OUT!!',
          definitionId: 'power-alpha-009',
          projectedResult: {
            winner: 'P1',
            initiatorComparisonValue: 9,
            opponentComparisonValue: 7,
            winningMargin: 2,
          },
        },
      ],
      difficulty: 'Standard',
      imminentKingLoss: false,
      botBattlerIsKing: false,
      remainingBattleHandCount: 1,
    });

    expect(decision.kind).toBe('pass');
  });

  it('standard battle mode can spend last premium card when bot battler is king', () => {
    const decision = chooseBotBattleDecision({
      botController: 'P2',
      currentResult: {
        winner: 'P1',
        initiatorComparisonValue: 9,
        opponentComparisonValue: 4,
        winningMargin: 5,
      },
      candidates: [
        {
          input: { instanceId: 'kick-out-king', selectedChoice: 'ATK' },
          displayName: 'KICK-OUT!!',
          definitionId: 'power-alpha-009',
          projectedResult: {
            winner: 'draw',
            initiatorComparisonValue: 9,
            opponentComparisonValue: 9,
            winningMargin: 0,
          },
        },
      ],
      difficulty: 'Standard',
      imminentKingLoss: false,
      botBattlerIsKing: true,
      remainingBattleHandCount: 1,
    });

    expect(decision.kind).toBe('play');
    if (decision.kind === 'play') {
      expect(decision.definitionId).toBe('power-alpha-009');
    }
  });

  it('standard battle mode avoids KICK-OUT king-tie trap when non-king would still lose', () => {
    const decision = chooseBotBattleDecision({
      botController: 'P2',
      currentResult: {
        winner: 'P1',
        initiatorComparisonValue: 9,
        opponentComparisonValue: 4,
        winningMargin: 5,
      },
      candidates: [
        {
          input: { instanceId: 'kickout-last', selectedChoice: 'ATK' },
          displayName: 'KICK-OUT!!',
          definitionId: 'power-alpha-009',
          projectedResult: {
            winner: 'P1',
            initiatorComparisonValue: 9,
            opponentComparisonValue: 9,
            winningMargin: 0,
          },
        },
      ],
      difficulty: 'Standard',
      botBattlerIsKing: false,
      opponentBattlerIsKing: true,
      remainingBattleHandCount: 1,
    });

    expect(decision.kind).toBe('pass');
  });

  it('hard battle mode avoids wasting Freeze Gun into king tie-loss line', () => {
    const decision = chooseBotBattleDecision({
      botController: 'P2',
      currentResult: {
        winner: 'P1',
        initiatorComparisonValue: 9,
        opponentComparisonValue: 4,
        winningMargin: 5,
      },
      candidates: [
        {
          input: { instanceId: 'freeze-gun-1', targetCharacterId: 'p2-battler' },
          displayName: 'FREEZE GUN',
          definitionId: 'power-alpha-014',
          projectedResult: {
            winner: 'P1',
            initiatorComparisonValue: 9,
            opponentComparisonValue: 9,
            winningMargin: 0,
          },
        },
      ],
      difficulty: 'Hard',
      botBattlerIsKing: false,
      opponentBattlerIsKing: true,
      remainingBattleHandCount: 2,
    });

    expect(decision.kind).toBe('pass');
  });

  it('standard battle mode conserves equipment on non-winning non-emergency line', () => {
    const decision = chooseBotBattleDecision({
      botController: 'P2',
      currentResult: {
        winner: 'P1',
        initiatorComparisonValue: 11,
        opponentComparisonValue: 6,
        winningMargin: 5,
      },
      candidates: [
        {
          input: { instanceId: 'freeze-gun-standard', targetCharacterId: 'p2-battler' },
          displayName: 'FREEZE GUN',
          definitionId: 'power-alpha-014',
          projectedResult: {
            winner: 'P1',
            initiatorComparisonValue: 11,
            opponentComparisonValue: 9,
            winningMargin: 2,
          },
        },
      ],
      difficulty: 'Standard',
      imminentKingLoss: false,
      botBattlerIsKing: false,
    });

    expect(decision.kind).toBe('pass');
  });

  it('hard battle mode allows equipment when king loss is imminent and line improves', () => {
    const decision = chooseBotBattleDecision({
      botController: 'P2',
      currentResult: {
        winner: 'P1',
        initiatorComparisonValue: 12,
        opponentComparisonValue: 6,
        winningMargin: 6,
      },
      candidates: [
        {
          input: { instanceId: 'freeze-gun-king-save', targetCharacterId: 'p2-king' },
          displayName: 'FREEZE GUN',
          definitionId: 'power-alpha-014',
          projectedResult: {
            winner: 'P1',
            initiatorComparisonValue: 12,
            opponentComparisonValue: 10,
            winningMargin: 2,
          },
        },
      ],
      difficulty: 'Hard',
      imminentKingLoss: true,
      botBattlerIsKing: true,
    });

    expect(decision.kind).toBe('play');
    if (decision.kind === 'play') {
      expect(decision.definitionId).toBe('power-alpha-014');
    }
  });

  it('hard battle mode can spend equipment in king-emergency lines when it meaningfully improves survival odds', () => {
    const decision = chooseBotBattleDecision({
      botController: 'P2',
      currentResult: {
        winner: 'P1',
        initiatorComparisonValue: 12,
        opponentComparisonValue: 7,
        winningMargin: 5,
      },
      candidates: [
        {
          input: { instanceId: 'freeze-gun-lose', targetCharacterId: 'p2-king' },
          displayName: 'FREEZE GUN',
          definitionId: 'power-alpha-014',
          projectedResult: {
            winner: 'P1',
            initiatorComparisonValue: 11,
            opponentComparisonValue: 8,
            winningMargin: 3,
          },
        },
      ],
      difficulty: 'Hard',
      imminentKingLoss: true,
      botBattlerIsKing: true,
      remainingBattleHandCount: 1,
    });

    expect(decision.kind).toBe('play');
    if (decision.kind === 'play') {
      expect(decision.definitionId).toBe('power-alpha-014');
    }
  });

  it('hard battle mode can still spend equipment when it creates a winning line', () => {
    const decision = chooseBotBattleDecision({
      botController: 'P2',
      currentResult: {
        winner: 'P1',
        initiatorComparisonValue: 10,
        opponentComparisonValue: 7,
        winningMargin: 3,
      },
      candidates: [
        {
          input: { instanceId: 'freeze-gun-win', targetCharacterId: 'p2-battler' },
          displayName: 'FREEZE GUN',
          definitionId: 'power-alpha-014',
          projectedResult: {
            winner: 'P2',
            initiatorComparisonValue: 10,
            opponentComparisonValue: 11,
            winningMargin: 1,
          },
        },
      ],
      difficulty: 'Hard',
      botBattlerIsKing: false,
      remainingBattleHandCount: 1,
    });

    expect(decision.kind).toBe('play');
    if (decision.kind === 'play') {
      expect(decision.definitionId).toBe('power-alpha-014');
    }
  });

  it('standard battle mode allows non-king draw trade when it removes top revealed threat', () => {
    const decision = chooseBotBattleDecision({
      botController: 'P2',
      currentResult: {
        winner: 'P1',
        initiatorComparisonValue: 9,
        opponentComparisonValue: 4,
        winningMargin: 5,
      },
      candidates: [
        {
          input: { instanceId: 'draw-trade' },
          displayName: 'POWER STONE',
          definitionId: 'power-alpha-006',
          projectedResult: {
            winner: 'draw',
            initiatorComparisonValue: 9,
            opponentComparisonValue: 9,
            winningMargin: 0,
          },
        },
      ],
      difficulty: 'Standard',
      botBattlerIsKing: false,
      opponentBattlerIsKing: false,
      ownBattlerThreatScore: 8,
      opponentBattlerThreatScore: 23,
      opponentBattlerIsTopRevealedThreat: true,
      opponentPowerCardCount: 3,
      remainingBattleHandCount: 1,
    });

    expect(decision.kind).toBe('play');
  });

  it('standard battle mode declines non-king draw trade when threat removal is low value', () => {
    const decision = chooseBotBattleDecision({
      botController: 'P2',
      currentResult: {
        winner: 'P1',
        initiatorComparisonValue: 9,
        opponentComparisonValue: 4,
        winningMargin: 5,
      },
      candidates: [
        {
          input: { instanceId: 'draw-trade-low' },
          displayName: 'POWER STONE',
          definitionId: 'power-alpha-006',
          projectedResult: {
            winner: 'draw',
            initiatorComparisonValue: 9,
            opponentComparisonValue: 9,
            winningMargin: 0,
          },
        },
      ],
      difficulty: 'Standard',
      botBattlerIsKing: false,
      opponentBattlerIsKing: false,
      ownBattlerThreatScore: 15,
      opponentBattlerThreatScore: 14,
      opponentBattlerIsTopRevealedThreat: false,
      opponentPowerCardCount: 1,
      remainingBattleHandCount: 2,
    });

    expect(decision.kind).toBe('pass');
  });

  it('standard battle mode conserves cards in early non-king still-losing lines', () => {
    const decision = chooseBotBattleDecision({
      botController: 'P2',
      currentResult: {
        winner: 'P1',
        initiatorComparisonValue: 10,
        opponentComparisonValue: 6,
        winningMargin: 4,
      },
      candidates: [
        {
          input: { instanceId: 'power-stone-early' },
          displayName: 'POWER STONE',
          definitionId: 'power-alpha-006',
          projectedResult: {
            winner: 'P1',
            initiatorComparisonValue: 10,
            opponentComparisonValue: 8,
            winningMargin: 2,
          },
        },
      ],
      difficulty: 'Standard',
      botBattlerIsKing: false,
      imminentKingLoss: false,
      remainingBattleHandCount: 3,
    });

    expect(decision.kind).toBe('pass');
  });

  it('easy battle mode passes when only small non-winning improvements exist', () => {
    const decision = chooseBotBattleDecision(
      'P2',
      {
        winner: 'P1',
        initiatorComparisonValue: 11,
        opponentComparisonValue: 7,
        winningMargin: 4,
      },
      [
        {
          input: { instanceId: 'card-b' },
          displayName: 'POWER STONE',
          definitionId: 'power-alpha-006',
          projectedResult: {
            winner: 'P1',
            initiatorComparisonValue: 10,
            opponentComparisonValue: 8,
            winningMargin: 2,
          },
        },
      ],
      'Easy',
    );

    expect(decision.kind).toBe('pass');
  });

  it('hard battle mode passes when only still-losing non-king improvements exist', () => {
    const decision = chooseBotBattleDecision(
      'P2',
      {
        winner: 'P1',
        initiatorComparisonValue: 12,
        opponentComparisonValue: 7,
        winningMargin: 5,
      },
      [
        {
          input: { instanceId: 'high-impact' },
          displayName: 'KICK-OUT!!',
          definitionId: 'power-alpha-001',
          projectedResult: {
            winner: 'P1',
            initiatorComparisonValue: 11,
            opponentComparisonValue: 7,
            winningMargin: 4,
          },
        },
        {
          input: { instanceId: 'low-impact' },
          displayName: 'FLIP THE SCRIPT',
          definitionId: 'power-alpha-022',
          projectedResult: {
            winner: 'P1',
            initiatorComparisonValue: 11,
            opponentComparisonValue: 7,
            winningMargin: 4,
          },
        },
      ],
      'Hard',
    );

    expect(decision.kind).toBe('pass');
  });

  it('never plays SWAP CHARACTERS in battle when projected line is still losing', () => {
    const decision = chooseBotBattleDecision({
      botController: 'P2',
      currentResult: {
        winner: 'P1',
        initiatorComparisonValue: 12,
        opponentComparisonValue: 6,
        winningMargin: 6,
      },
      candidates: [
        {
          input: { instanceId: 'swap-losing' },
          displayName: 'SWAP CHARACTERS',
          definitionId: 'power-alpha-018',
          projectedResult: {
            winner: 'P1',
            initiatorComparisonValue: 11,
            opponentComparisonValue: 8,
            winningMargin: 3,
          },
        },
      ],
      difficulty: 'Hard',
      // Even in king emergency context, losing SWAP lines are invalid.
      botBattlerIsKing: true,
      imminentKingLoss: true,
      remainingBattleHandCount: 1,
    });

    expect(decision.kind).toBe('pass');
  });

  it('standard battle mode prefers lower-impact winning card when both secure comparable wins', () => {
    const decision = chooseBotBattleDecision(
      'P2',
      {
        winner: 'P1',
        initiatorComparisonValue: 9,
        opponentComparisonValue: 7,
        winningMargin: 2,
      },
      [
        {
          input: { instanceId: 'high-win' },
          displayName: 'KICK-OUT!!',
          definitionId: 'power-alpha-001',
          projectedResult: {
            winner: 'P2',
            initiatorComparisonValue: 10,
            opponentComparisonValue: 13,
            winningMargin: 3,
          },
        },
        {
          input: { instanceId: 'low-win' },
          displayName: 'POWER STONE',
          definitionId: 'power-alpha-006',
          projectedResult: {
            winner: 'P2',
            initiatorComparisonValue: 10,
            opponentComparisonValue: 12,
            winningMargin: 2,
          },
        },
      ],
      'Standard',
    );

    expect(decision.kind).toBe('play');
    if (decision.kind === 'play') {
      expect(decision.input.instanceId).toBe('low-win');
    }
  });

  it('hard battle mode prefers counter-stable win over fragile higher-margin win', () => {
    const decision = chooseBotBattleDecision(
      {
        botController: 'P2',
        currentResult: {
          winner: 'P1',
          initiatorComparisonValue: 10,
          opponentComparisonValue: 8,
          winningMargin: 2,
        },
        candidates: [
          {
            input: { instanceId: 'fragile-win' },
            displayName: 'POWER STONE',
            definitionId: 'power-alpha-006',
            projectedResult: {
              winner: 'P2',
              initiatorComparisonValue: 10,
              opponentComparisonValue: 13,
              winningMargin: 3,
            },
            opponentBestCounterMarginForBot: -1,
            opponentReplyOptionCount: 2,
          },
          {
            input: { instanceId: 'stable-win' },
            displayName: 'SUPER BAT',
            definitionId: 'power-alpha-021',
            projectedResult: {
              winner: 'P2',
              initiatorComparisonValue: 10,
              opponentComparisonValue: 11,
              winningMargin: 1,
            },
            opponentBestCounterMarginForBot: 1,
            opponentReplyOptionCount: 2,
          },
        ],
        difficulty: 'Hard',
      },
    );

    expect(decision.kind).toBe('play');
    if (decision.kind === 'play') {
      expect(decision.input.instanceId).toBe('stable-win');
    }
  });

  it('hard battle mode uses deeper rejoinder margin when immediate counter profile is tied', () => {
    const decision = chooseBotBattleDecision({
      botController: 'P2',
      currentResult: {
        winner: 'P1',
        initiatorComparisonValue: 10,
        opponentComparisonValue: 8,
        winningMargin: 2,
      },
      candidates: [
        {
          input: { instanceId: 'deep-good' },
          displayName: 'POWER STONE',
          definitionId: 'power-alpha-006',
          projectedResult: {
            winner: 'P2',
            initiatorComparisonValue: 10,
            opponentComparisonValue: 11,
            winningMargin: 1,
          },
          opponentBestCounterMarginForBot: 0,
          opponentBestCounterAfterBotBestRejoinderMarginForBot: 1,
        },
        {
          input: { instanceId: 'deep-bad' },
          displayName: 'POWER STONE',
          definitionId: 'power-alpha-006',
          projectedResult: {
            winner: 'P2',
            initiatorComparisonValue: 10,
            opponentComparisonValue: 11,
            winningMargin: 1,
          },
          opponentBestCounterMarginForBot: 0,
          opponentBestCounterAfterBotBestRejoinderMarginForBot: -1,
        },
      ],
      difficulty: 'Hard',
    });

    expect(decision.kind).toBe('play');
    if (decision.kind === 'play') {
      expect(decision.input.instanceId).toBe('deep-good');
    }
  });

  it('battle card conservation uses definition metadata rather than display-name text', () => {
    const decision = chooseBotBattleDecision(
      'P2',
      {
        winner: 'P1',
        initiatorComparisonValue: 9,
        opponentComparisonValue: 8,
        winningMargin: 1,
      },
      [
        {
          input: { instanceId: 'premium-by-def' },
          displayName: 'UNRELATED LABEL A',
          definitionId: 'power-alpha-009',
          projectedResult: {
            winner: 'P2',
            initiatorComparisonValue: 9,
            opponentComparisonValue: 10,
            winningMargin: 1,
          },
        },
        {
          input: { instanceId: 'medium-by-def' },
          displayName: 'UNRELATED LABEL B',
          definitionId: 'power-alpha-006',
          projectedResult: {
            winner: 'P2',
            initiatorComparisonValue: 9,
            opponentComparisonValue: 10,
            winningMargin: 1,
          },
        },
      ],
      'Standard',
    );

    expect(decision.kind).toBe('play');
    if (decision.kind === 'play') {
      expect(decision.input.instanceId).toBe('medium-by-def');
    }
  });

  it('hard battle mode prefers better expected deep stability when worst-case ties', () => {
    const decision = chooseBotBattleDecision({
      botController: 'P2',
      currentResult: {
        winner: 'P1',
        initiatorComparisonValue: 12,
        opponentComparisonValue: 9,
        winningMargin: 3,
      },
      candidates: [
        {
          input: { instanceId: 'expected-better' },
          displayName: 'POWER STONE',
          definitionId: 'power-alpha-006',
          projectedResult: {
            winner: 'P2',
            initiatorComparisonValue: 12,
            opponentComparisonValue: 13,
            winningMargin: 1,
          },
          opponentBestCounterAfterBotBestRejoinderMarginForBot: 1,
          opponentExpectedCounterAfterBotBestRejoinderMarginForBot: 1,
        },
        {
          input: { instanceId: 'expected-worse' },
          displayName: 'POWER STONE',
          definitionId: 'power-alpha-006',
          projectedResult: {
            winner: 'P2',
            initiatorComparisonValue: 12,
            opponentComparisonValue: 13,
            winningMargin: 1,
          },
          opponentBestCounterAfterBotBestRejoinderMarginForBot: 1,
          opponentExpectedCounterAfterBotBestRejoinderMarginForBot: -1,
        },
      ],
      difficulty: 'Hard',
    });

    expect(decision.kind).toBe('play');
    if (decision.kind === 'play') {
      expect(decision.input.instanceId).toBe('expected-better');
    }
  });

  it('bot curtains decision swaps lowest own for highest opponent when gain clears threshold', () => {
    const decision = chooseBotCurtainsSwap(
      [
        { instanceId: 'btc', definitionId: 'power-alpha-019' },
        { instanceId: 'own-low', definitionId: 'power-alpha-999' },
        { instanceId: 'own-mid', definitionId: 'power-alpha-008' },
      ],
      [
        { instanceId: 'opp-high', definitionId: 'power-alpha-016' },
        { instanceId: 'opp-low', definitionId: 'power-alpha-006' },
      ],
      'btc',
      'Standard',
    );

    expect(decision.shouldPlay).toBe(true);
    expect(decision.ownSwapCardInstanceId).toBe('own-low');
    expect(decision.opponentSwapCardInstanceId).toBe('opp-high');
  });

  it('bot curtains decision skips when strategic gain is below difficulty threshold', () => {
    const decision = chooseBotCurtainsSwap(
      [
        { instanceId: 'btc', definitionId: 'power-alpha-019' },
        { instanceId: 'own-mid', definitionId: 'power-alpha-008' },
      ],
      [
        { instanceId: 'opp-mid', definitionId: 'power-alpha-010' },
      ],
      'btc',
      'Easy',
    );

    expect(decision.shouldPlay).toBe(false);
  });

  it('bot curtains decision skips when the only opponent target is a premium card', () => {
    const decision = chooseBotCurtainsSwap(
      [
        { instanceId: 'btc', definitionId: 'power-alpha-019' },
        { instanceId: 'own-low', definitionId: 'power-alpha-006' },
      ],
      [
        { instanceId: 'opp-premium', definitionId: 'power-alpha-009' },
      ],
      'btc',
      'Hard',
    );

    expect(decision.shouldPlay).toBe(false);
    expect(decision.explanation).toContain('premium cards worth protecting');
  });

  it('bot board turn runs automatically in bot mode when P2 is active', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING'),
        createChar('p2-mover', 'P2', 6, 6, false, 'P2_2', 'P2-MOVER', true),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING', true),
      ]);
      return { ...base, activePlayer: 'P2' };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('mode-bot'));
    await user.click(screen.getByTestId('new-game-button'));

    await waitFor(() => {
      expect(screen.queryByTestId('bot-board-status')).not.toBeInTheDocument();
      expect(screen.queryByTestId('take-bot-turn-button')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('bot battle turn auto-acts and exposes no manual bot action button', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-att', 'P1', 7, 4, false, 'P1_3', 'P1-ATT', true),
        createChar('p2-def', 'P2', 8, 9, false, 'P1_4', 'P2-DEF', true),
        createChar('p1-king', 'P1', 8, 8, true, 'P1_1', 'P1-KING', true),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING', true),
      ]);
      return {
        ...base,
        activePlayer: 'P1',
        powerCardHands: {
          P1: [],
          P2: [{ instanceId: 'power-a-only', definitionId: 'power-alpha-006' }],
        },
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('mode-bot'));
    await user.click(screen.getByTestId('new-game-button'));

    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));
    if (screen.queryByTestId('battle-handoff-acknowledge')) {
      await user.click(screen.getByTestId('battle-handoff-acknowledge'));
    }
    await user.click(screen.getByTestId('battle-ready-button'));

    expect(await screen.findByTestId('bot-battle-priority-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('take-bot-battle-action')).not.toBeInTheDocument();

    const revealAck = await screen.findByTestId('bot-power-reveal-ack').catch(() => null);
    if (revealAck) {
      await user.click(revealAck);
    }

    await waitFor(() => {
      expect(screen.queryByTestId('bot-battle-priority-panel')).not.toBeInTheDocument();
    }, { timeout: 6000 });
  });

  it('bot battle turn does not play last-card KICK-OUT into non-king vs king tie trap', async () => {
    const user = userEvent.setup();
    const setup = (): ReturnType<typeof initializeGameState> => {
      const base = initializeGameState([
        createChar('p1-king-att', 'P1', 8, 10, true, 'P1_3', 'P1-KING', true),
        createChar('p2-def', 'P2', 5, 4, false, 'P1_4', 'P2-DEF', true),
        createChar('p1-extra', 'P1', 6, 6, false, 'P1_1', 'P1-EXTRA', true),
        createChar('p2-king', 'P2', 8, 8, true, 'P2_3', 'P2-KING', true),
      ]);
      return {
        ...base,
        activePlayer: 'P1',
        powerCardHands: {
          P1: [],
          P2: [{ instanceId: 'power-a-kickout', definitionId: 'power-alpha-009' }],
        },
      };
    };

    render(<App createGameState={setup} />);
    await user.click(screen.getByTestId('mode-bot'));
    await user.click(screen.getByTestId('new-game-button'));

    await user.click(screen.getByTestId('space-P1_3'));
    await user.click(screen.getByTestId('action-attack'));
    if (screen.queryByTestId('battle-handoff-acknowledge')) {
      await user.click(screen.getByTestId('battle-handoff-acknowledge'));
    }
    await user.click(screen.getByTestId('battle-ready-button'));

    expect(await screen.findByTestId('bot-battle-priority-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('bot-power-reveal-ack')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId('bot-power-reveal-ack')).not.toBeInTheDocument();
    }, { timeout: 2500 });
  });
});
