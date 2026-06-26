# PHASE 3C BATTLE FLOW SPEC

Status: Draft for Brendan approval
Scope: Product and architecture specification only. No implementation changes in this phase.

## Objective

Replace immediate battle resolution behavior with a staged battle flow that supports future Power Card timing windows, preserves hidden information rules, and reuses existing battle resolution logic as the final resolver.

## Non-Goals

No TypeScript, UI, engine, tests, dependency, or Git-history changes are included in this phase.
No Power Card effects are implemented in this phase.
No changes to underlying Phase 2 battle outcome math are specified here.

## Core Flow Overview

The match operates in two high-level interaction modes:
Board Phase and Battle Pending/Resolution Flow.

A legal Attack Forward or Self-Defend action no longer resolves instantly.
A legal Attack Forward or Self-Defend action starts a pending battle flow.
Move Forward continues to resolve in Board Phase.

Battle resolution is deferred until the battle window reaches Ready To Resolve and a player explicitly clicks Resolve Battle.

## Required Phases

## 1) Board Phase

Normal board view is the default gameplay state.
Active player may select a character and take a legal core action.
Move Forward may resolve immediately as it does today.
Attack Forward and Self-Defend must transition into battle flow instead of instantly resolving.
Future board-timing Power Cards may be played here when timing rules permit.

## 2) Battle Start

Validate the selected Attack Forward or Self-Defend using existing legality logic before battle begins.
Reveal both battle participants permanently at battle start, before any final comparison is applied.
Capture and preserve immutable battle context.
Freeze normal board actions while battle is pending.
Freeze turn switching while battle is pending.

Battle priority initialization:
The initiating player gets first Power Card opportunity.

Required preserved battle context fields:
action type
acting character id
opposing character id
acting and opposing controller
acting and opposing board positions at battle start
acting and opposing comparison stat mode
acting and opposing base comparison stat values
battle start turn number
battle start event marker id or index

Required preserved priority context fields:
initiator id/controller for first priority
current priority player
consecutive pass count
battle window status enum

## 3) Battle Screen

Present a focused battle scene dedicated to the pending battle.
Render the two revealed Character Cards as public information.
Show battle type clearly: Attack Forward or Self-Defend.
Show which stat each side currently uses for comparison.
Show base stats and a future modifiers area.
Show current comparison preview and outcome preview.
Show active player and opponent indicators.
Show both Power Card hand areas with shared-screen privacy behavior.
Show battle-scoped event history.
Provide a View Board option that opens read-only board inspection while battle is pending.
Show current priority player and pass status.
Show clear message that playable Power Card identities/effects are not yet implemented in Phase 3C first implementation.

Board behavior while battle pending:
Board may be inspected.
Board may not execute normal character move, attack, defend, or turn-end actions.

## 4) Power Card Windows

Define an action-window framework that is timing-aware and future-proof.
Support four legality classes:
battle-only
board-only
either timing window
conditional legality based on targets and state

Approved battle priority and pass protocol:
The battle initiator receives first priority.
Priority alternates between players.
On each priority opportunity, that player may play exactly one legal Power Card or pass.
After a legal card play, priority passes to opponent and consecutive pass count resets to zero.
Battle window ends only after two consecutive passes.
No player may unilaterally end the battle window.

Support future card shapes:
cards targeting battle participants
cards targeting board spaces or board characters
cards modifying battle stats
cards modifying battle outcome rules
cards with no target

Critical legality rule:
UI never computes legal Power Card plays.
UI receives legal options only from engine and card-effect logic.
No Power Card effects are implemented in this phase.

Phase 3C first implementation allowance:
Staged battle screen and pass/ready-to-resolve flow may ship before real Power Card identities/effects.
Sequential Y/A pass controls may be used to demonstrate final future timing flow.

## 5) Battle Resolution

Battle does not resolve until battle Power Card window is complete.
After two consecutive passes, transition battle status to Ready To Resolve.
Show Resolve Battle action that either player may click once status is Ready To Resolve.
Do not expose final winner/deaths/movement/graveyard/turn switch before Resolve Battle is clicked.
Once Resolve Battle is triggered, call existing Phase 2 battle-resolution logic as the authoritative resolver.
Resolver remains responsible for:
death resolution
movement resolution
Graveyard updates
King Territory Draw
Final King Duel checks
event log entries
turn switching

After resolution:
clear pending battle state
return to Board Phase
render post-battle board aftermath and status

## 6) Hidden Information Rules

Both battle participants become public immediately when battle starts.
Uninvolved unrevealed board cards remain hidden.
Hidden Character Deck order remains hidden.
Battle UI receives only safe/public battle data.
No hidden or private fields may be serialized into battle-view payloads.

Manual shared-screen privacy requirement:
Do not display both players' actual Power Card hands simultaneously.
Only current priority player may view their own actual hand.
Opponent sees count and card-back/count placeholders only.
Add future Pass Device / Reveal My Hand privacy handoff screen or overlay for local manual play.
Privacy rule applies even in a single-browser local session.

## Proposed UI States

State: Start Screen
State: Board Phase Active
State: Battle Pending Intro
State: Battle Screen Active Window
State: Battle Screen View Board Overlay
State: Battle Ready To Resolve
State: Battle Resolving
State: Board Phase Aftermath
State: Game Over

Per-state behavior summary:
Start Screen initializes match only.
Board Phase Active supports legal board actions and board-window card opportunities.
Battle Pending Intro confirms context lock and revealed participants.
Battle Screen Active Window supports legal battle-window card opportunities and one-card-or-pass priority interaction.
Battle Screen View Board Overlay allows board inspection only while battle remains pending, and in future may support engine-approved targeting mode for a currently legal card.
Battle Ready To Resolve appears only after two consecutive passes and enables explicit Resolve Battle.
Battle Resolving invokes existing Phase 2 resolver.
Board Phase Aftermath restores normal board interaction.
Game Over disables all further actions.

## Engine-State Data Needed For Pending Battle

Required new conceptual state object: pending battle.

Required fields:
battle id
status enum for battle sub-phase
action type
initiator character id
defender character id
initiator controller
defender controller
initiator board position at start
defender board position at start
initiator base comparison stat
defender base comparison stat
initiator current effective comparison stat
defender current effective comparison stat
initiator reveal status locked true
defender reveal status locked true
battle event history list
battle priority tracker
current priority player
consecutive pass count
battle window pass tracker
legal power actions for current actor as computed by engine
legal completion actions as computed by engine
ready-to-resolve boolean/status
snapshot hash or version token to prevent stale client actions

Required battle status enum values (conceptual):
WindowOpen
ReadyToResolve
Resolving
Resolved

Optional extension fields for future:
source chain references for modifier provenance
stack/queue of unresolved battle effects
targeting context cache for legal-action prompts

## Action Contracts Between UI And Engine

Board Phase request types:
select board character
request legal board actions
execute Move Forward
execute Attack Forward start-battle transition
execute Self-Defend start-battle transition
request legal board-window power-card actions

Battle flow request types:
request battle public view
request legal battle-window actions
execute legal power-card action placeholder contract
execute pass action for current priority player
execute resolve action when battle is Ready To Resolve
request read-only board view during pending battle

Staged battle API contract (new functions):
startBattle
getBattlePublicView
passBattlePriority
resolvePendingBattle

Resolver contract:
resolvePendingBattle must call or reuse existing Phase 2 instant battle resolver as authoritative final outcome path.
Existing Phase 2 instant resolver functions remain unchanged for existing engine tests.

All legality and transition authority remains in engine.
UI is a renderer and dispatcher only.

## Automated Test Plan

Unit tests for state transitions:
Board Phase Attack Forward enters pending battle and does not resolve instantly.
Board Phase Self-Defend enters pending battle and does not resolve instantly.
Move Forward still resolves in Board Phase.
Pending battle freezes normal board action execution.
Pending battle freezes turn switching.
Battle participants become revealed at battle start.
Uninvolved hidden cards remain hidden.
Initiator receives first priority.
Priority alternates one-card-or-pass across players.
Pass streak resets after legal card play.
Two consecutive passes transition to Ready To Resolve.
Battle completion condition gates resolver execution.
No final outcome is applied before Resolve Battle action.
Resolver call path reuses existing Phase 2 logic and outcomes.
resolvePendingBattle produces same results as current Phase 2 resolver when no Power Cards are played.

Integration tests for public view safety:
Battle screen payload excludes hidden deck order.
Battle screen payload excludes unrevealed uninvolved card identity/stats.
Local shared-screen view never exposes both actual Power Card hands at once.
View Board during battle is read-only for normal character actions.
View Board may only enter future targeting mode for currently legal engine-approved card interactions.
Legal Power Card options are engine-provided only.

UI tests for interaction flow:
Attack Forward opens Battle Screen with correct participants and labels.
Self-Defend opens Battle Screen with correct participants and labels.
Battle screen shows stat mode, base stats, modifiers area, comparison preview, priority player, and pass status.
Battle event history updates during pending battle flow.
Both-pass flow transitions to Ready To Resolve and then shows Resolve Battle control.
No winner/deaths/movement/graveyard/turn-switch display before Resolve Battle click.
Post-resolution returns to Board Phase with aftermath visible.

Regression tests:
Existing Phase 2 battle result scenarios still pass through final resolver.
Existing King Territory Draw and Final King Duel behavior remains unchanged after resolver call.
Existing Phase 2 battle outcome tests remain valid without rewriting around staged UI flow.

## Migration Plan

Goal: Reuse current instant engine actions as final resolver while inserting battle staging in front.

Step 1: Introduce pending battle state and sub-phase enum.
Step 2: Split current Attack Forward and Self-Defend action path into two parts.
Step 3: Part A becomes start-battle transition that validates action and captures context.
Step 4: Part B remains the existing Phase 2 resolver logic and executes only after battle window completion.
Step 5: Add staged APIs startBattle, getBattlePublicView, passBattlePriority, resolvePendingBattle.
Step 6: Keep Move Forward on existing immediate path.
Step 7: Maintain existing event log semantics; add battle-window events without changing final outcome semantics.
Step 8: Add public-view projector for battle payload with strict hidden-info filtering.
Step 9: Implement pass/ready-to-resolve flow and explicit Resolve Battle trigger.
Step 10: Add regression coverage confirming final outcomes are unchanged when no Power Cards are played.

Compatibility intent:
When no Power Cards are used, final battle outcomes should match current instant behavior after delayed resolution.
This preserves Phase 2 correctness while enabling future timing windows.

## Power Card Alpha Gate

Do not select the first digital 8-12 Power Cards in this document.
Require future OFFICIAL_POWER_CARD_REGISTRY.md approval before selecting the first digital Power Card alpha set.
Do not invent Power Card text, timing, or targeting rules in this phase document.

## Approval Gate

No Phase 3C implementation work should begin until Brendan approves this revised specification.
