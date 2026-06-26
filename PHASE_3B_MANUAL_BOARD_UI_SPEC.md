# PHASE 3B MANUAL BOARD UI SPEC

Status: Planning only. No implementation in this phase.

Purpose:
Define a local browser-based Manual Two-Player Alpha UI that uses existing Phase 3A setup, safe player view, actual Alpha 1 cards, and current game engine behavior.

Scope boundaries:
- No UI code in this phase.
- No package installation in this phase.
- No changes to current TypeScript source in this phase.
- No test changes in this phase.
- No bot behavior in this phase.
- No commit in this phase.

## 1. Exact Board Geometry and Direction

Board coordinates and display positions must be exact.

Top row (left to right):
A1 -> A2 -> A3 -> A4 -> A5

Bottom row (left to right):
Y1 -> Y2 -> Y3 -> Y4 -> Y5

Movement loop (engine truth):
Y1 -> Y2 -> Y3 -> Y4 -> Y5 -> A5 -> A4 -> A3 -> A2 -> A1 -> Y1

Required visual direction cues:
- Bottom row arrows flow left to right.
- Right edge connector clearly shows Y5 moving upward to A5.
- Top row arrows flow right to left.
- Left edge connector clearly shows A1 moving downward to Y1.
- Y3 and A3 are visibly marked as King Start spaces.

Required board diagram concept:

Top lane:
A1 <- A2 <- A3 <- A4 <- A5
|                             ^
v                             |
Y1 -> Y2 -> Y3 -> Y4 -> Y5

Visual emphasis requirements:
- Use directional arrows on every board edge and lane.
- Use lane labels: Top Lane (A) and Bottom Lane (Y).
- Use explicit badges on Y3 and A3: King Start.

## 2. Manual Alpha Functional Requirements

Start flow:
- Start screen presents first-player selection with only two options: Y or A.
- New Game uses existing standard setup with selected first player.

Core board screen must show:
- Ten board spaces: A1..A5 and Y1..Y5.
- Character Deck remaining count.
- Public central Graveyard.
- Turn number.
- Active player.
- Y and A Power Card counts.

Hidden information rules:
- Unrevealed board cards render only card back.
- Unrevealed cards must never show name, ATK, DEF, definition id, ability, or image placeholder.
- Revealed cards show name, ATK, DEF, and future image placeholder.

Action handling:
- In manual mode, user selects one active-player card.
- UI presents only legal actions for that selected card:
  - Move Forward
  - Attack Forward
  - Self-Defend
- Illegal actions must not appear usable.
- After each action, view refreshes from safe projection.
- Battle reveals are permanent in subsequent renders.

Event and game status:
- Event log must display movement, battle outcomes, King Territory Draws, skips, and game-ending outcomes.
- Game-over state must be clear and block further actions except New Game.

Out of scope in 3B manual alpha:
- Bot play.
- Real Power Card identities/effects.
- Ability buttons.
- Attachments.
- Flying.
- Void.
- Card art assets.
- Online multiplayer.
- Database.
- Payments.

## 3. Required Layout

Layout zones:
- Center: board.
- Left panel: Y player status, Power Cards, Character Deck count.
- Right panel: A player status, Power Cards, central Graveyard.
- Bottom: action controls and event log.

Readability target:
- Must be readable on a normal Mac laptop window without horizontal scrolling.
- Board and status panels remain visible while action controls and event log update.

## 4. Proposed Screen Flow

Screen 1: Start
- Title and mode label: Manual Two-Player Alpha.
- First player selector: Y or A.
- New Game button.

Screen 2: Active Match
- Board center with fixed coordinate labels.
- Left and right status panels.
- Bottom action area:
  - Selected card summary (if any)
  - Legal action buttons only
  - Skip Turn button only when no legal actions exist
- Event log timeline (latest entries visible).

Screen 3: Game Over Overlay
- Winner or draw result.
- Final state summary (turn, remaining cards, graveyard count).
- New Game and Return to Start options.

## 5. Exact Card and Board Visual States

Board space state types:
- Empty space.
- Occupied with unrevealed card.
- Occupied with revealed card.
- Occupied king card (revealed or unrevealed) on king-start-marked space.

Card visual rules:
- Unrevealed:
  - Card back only.
  - No text stats.
  - No identity marker beyond opaque instance token if needed for debug mode only (not in player-safe surface).
- Revealed:
  - Name.
  - ATK and DEF.
  - Future image placeholder area.

Selection visual rules:
- Selectable active-player cards are highlighted.
- Non-active-player cards are not selectable for action initiation.
- Selected card persists until action taken or selection cleared.

## 6. Selection and Action Button Behavior

Selection logic:
- Click active-player card to select.
- Clicking selected card again clears selection.
- Selecting a different valid active-player card switches selection.

Action button logic:
- Buttons are generated from legal actions for selected card only.
- If selected card has no legal actions, show no action buttons for that card.
- If active player has no legal actions globally, show Skip Turn as primary action.
- Action click executes engine action, then refreshes state and player-safe projection.

Post-action updates:
- Recompute safe view.
- Recompute selectable cards and legal actions.
- Append new event log items.
- If game status is not active, show game-over UI state.

## 7. Hidden Information Protection Model

UI data-source rule:
- Primary render model must come from safe player view only.
- Unrevealed identity data must not be consumed by display components.

Protection requirements:
- No direct read of unrevealed card name/stats/definition from UI render layer.
- No serialization of hidden deck order to UI props/state.
- Character Deck shown only as remaining count.

Debug separation:
- Developer-only full-state inspection must be isolated from player-facing UI model.
- Debug panel, if added later, must be explicitly gated and not used by board rendering components.

## 8. Safe View Data vs Developer Full-State Data

Data used by player-safe UI:
- activePlayer
- turnNumber
- gameStatus
- king spot markers
- drawCount
- powerCardHandCount
- board cards with revealed gating
- graveyard public cards
- characterDeck remaining count only

Data reserved for developer-only full-state access:
- Hidden character deck order and identities
- Unrevealed board identity metadata
- Internal engine-only fields and references

Architecture guardrail:
- UI container receives safe view as render input.
- Action dispatcher may reference full state to execute engine transitions.
- After transition, render input is regenerated safe view.

## 9. Proposed Minimal Technical Approach (for later implementation only)

Approach summary:
- Add a lightweight browser UI layer that wraps existing setup and engine modules.
- Keep game rules and engine logic unchanged.
- Add a thin state coordinator for manual actions and safe-view rendering.

Proposed future package set (do not install now):
- react
- react-dom
- vite
- @vitejs/plugin-react
- @testing-library/react
- @testing-library/user-event
- @testing-library/jest-dom
- jsdom

Proposed code organization (future):
- src/ui/app-shell for layout and routing between Start and Match.
- src/ui/board for board grid and directional connectors.
- src/ui/panels for Y panel, A panel, graveyard, counts.
- src/ui/actions for selection and legal action controls.
- src/ui/log for event timeline rendering.
- src/ui/state for manual match coordinator that calls setup and engine functions.

## 10. Automated Test Plan (UI-facing projection and action selection)

A. Projection integrity tests
- Verify unrevealed cards render as card back only.
- Verify revealed cards show name, ATK, DEF, placeholder.
- Verify deck order/identity is never present in rendered model.
- Verify king spot markers always visible on Y3 and A3.

B. Action availability tests
- For selected active-player card, assert only legal action buttons are shown.
- Assert illegal actions are absent or disabled-unusable.
- Assert selecting non-active-player card does not expose action buttons.
- Assert Skip Turn appears only when no legal actions exist for active player.

C. Transition update tests
- After Move Forward, board and event log update correctly.
- After Attack Forward and Self-Defend, reveal state persists.
- After king territory crossing, both drawCount and powerCardHandCount updates are reflected.
- After game-end condition, actions are blocked and game-over state appears.

D. Regression alignment tests
- Compare UI-derived action lists against engine legal-action function output.
- Verify safe-view-only render path with no hidden data leaks in component props.

## 11. Open Visual Decisions Requiring Brendan Approval

1. Board style direction:
- Minimal tactical grid vs card-table visual theme.

2. Card-back design:
- Neutral back pattern and label style for unrevealed cards.

3. Arrow styling:
- Thick static lane arrows vs per-space directional arrows.

4. King Start marking style:
- Border ring, crown badge, or both.

5. Event log density:
- Compact single-line entries vs expanded entries with structured details.

6. Selection emphasis:
- Glow ring vs border color + icon marker.

7. Status panel priority:
- Emphasize active player panel by scale, color, or both.

8. Graveyard presentation:
- Stacked list vs scrollable card row.

9. Placeholder image treatment for revealed cards:
- Fixed icon tile vs neutral silhouette tile.

10. Color palette accessibility target:
- Confirm contrast preference for extended laptop play sessions.

## 12. Definition of Ready for Phase 3B Implementation

Implementation may begin only after Brendan approves:
- Board visual direction treatment and lane markings.
- Card-back and revealed-card style.
- Event log presentation style.
- Action control placement details.
- Final package list for UI implementation.
