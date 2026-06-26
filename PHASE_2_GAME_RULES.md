# PHASE 2: GAME RULES & DEVELOPER REFERENCE

**For:** Phase 2 Implementation (Game Engine, Game State, Battle System)  
**Based On:** PHASE_2_CORE_BATTLE_SPEC.md  
**Status:** Active Development Reference

---

## QUICK START

### Core Concept
Phase 2 implements a turn-based battle engine for two players (Y and A) with:
- One board loop (Y1–Y5, A1–A5)
- One King per player (must survive to win)
- Three core actions per turn: Move Forward, Attack Forward, Self-Defend
- King Territory Draw mechanic (Kings earn Power Cards by crossing from own to enemy territory)
- Final King Duel (when exactly one King per side remains)
- Double-King Tie draw condition (two Kings tie = game ends as draw)

---

## GAME STATE STRUCTURE

```typescript
interface GameState {
  activePlayer: 'Y' | 'A';
  turnNumber: number;
  characters: Character[];  // living characters only
  graveyard: Character[];   // defeated characters in order
  drawCount: { Y: number; A: number };
  gameStatus: 'active' | 'Y wins' | 'A wins' | 'draw';
  eventLog: ActionEvent[];
}

interface Character {
  id: string;
  controller: 'Y' | 'A';
  ATK: number;
  DEF: number;
  isKing: boolean;
  revealed: boolean;
  alive: boolean;
  boardPosition: BoardSpace | null;
}

type BoardSpace = 'Y1' | 'Y2' | 'Y3' | 'Y4' | 'Y5' | 'A1' | 'A2' | 'A3' | 'A4' | 'A5';
```

---

## BOARD & DIRECTIONS

**Board Loop:** Y1 → Y2 → Y3 → Y4 → Y5 → A5 → A4 → A3 → A2 → A1 → (back to Y1)

**Territories:**
- Y Territory: Y1, Y2, Y3, Y4, Y5
- A Territory: A1, A2, A3, A4, A5
- Territory Boundary: Y5 ↔ A5, A1 ↔ Y1

**Direction Functions (already defined in Phase 1):**
- `forward(space: BoardSpace): BoardSpace` — returns next space on loop
- `backward(space: BoardSpace): BoardSpace` — returns previous space on loop
- `territory(space: BoardSpace): 'Y' | 'A'` — returns Y or A

---

## CORE ACTIONS

### Move Forward
- **Actor:** Active player's living character
- **Target:** Forward space (must be empty)
- **Outcome:** Character moves to forward space
- **King Territory Draw:** If King moved from own to enemy territory, increment drawCount[controller]
- **Event Log:** "Move Forward: [char id] from [space] to [space]"

### Attack Forward
- **Actor:** Active player's living character
- **Target:** Enemy character directly forward
- **Order:**
  1. Reveal both (revealed = true)
  2. Compare: ATK vs DEF
  3. Determine winner
  4. Move attacker if won (atomic: defender removed + attacker moves)
  5. Check King Territory Draw
  6. Send defeated to Graveyard
  7. Check King Death (special Double-King Tie exception)
  8. Check Final King Duel
  9. End turn (if game still active)

**Outcomes:**
- Attacker ATK > Defender DEF: Attacker wins, defender dies, attacker moves to defender's space
- Attacker ATK < Defender DEF: Defender wins, attacker dies, attacker removed (no movement)
- ATK = DEF (Tie):
  - Exactly one King: King wins, non-King dies
  - Neither King: Both die (game continues after Final King Duel check)
  - Both Kings: Both die → game status = "draw" (END immediately, no Final King Duel, no turn switch)

### Self-Defend
- **Actor:** Active player's living character
- **Target:** Enemy character directly behind
- **Order:**
  1. Reveal both
  2. Compare: DEF vs DEF
  3. Determine winner
  4. NO Movement
  5. NO King Territory Draw
  6. Send defeated to Graveyard
  7. Check King Death
  8. Check Final King Duel
  9. End turn

**Outcomes:**
- Self-Defender DEF > Enemy DEF: Self-Defender wins, enemy dies
- Self-Defender DEF < Enemy DEF: Enemy wins, self-defender dies
- DEF = DEF (Tie):
  - Exactly one King: King wins, non-King dies
  - Neither King: Both die (game continues)
  - Both Kings: Both die → game status = "draw" (END immediately)

---

## SPECIAL RULES

### King Territory Draw
- **Trigger:** King changes position from own territory to enemy territory
- **Effect:** drawCount[controller]++
- **Applies To:** Any completed relocation (Move Forward, winning Attack Forward)
- **NOT Triggered By:** Self-Defend (no movement), losing attacks (no movement), defeat (no movement)
- **Atomic:** Exactly 1 draw per relocation, never cumulative

### King Death
- **Trigger:** A King is defeated and added to Graveyard
- **Effect:** Opposing player wins immediately; game status = "Y wins" or "A wins"
- **Exception:** Does NOT apply to Double-King Tie (both Kings die → "draw" status instead)

### Double-King Tie
- **Trigger:** Both Kings tie in normal battle (not Final King Duel)
- **Effect:** Both die → game status = "draw" immediately
- **Special:** Do NOT process as two separate King deaths; do NOT run Final King Duel afterward; do NOT switch active player; END action resolution immediately
- **Event Log:** "Double-King Tie: both Kings died; game ends in draw."

### Final King Duel
- **Trigger:** Game is active AND exactly one living character per side AND both are Kings
- **When:** Immediately after initialization OR after any action resolves
- **Comparison:** Y King ATK vs A King ATK
- **Outcome:**
  - Y ATK > A ATK: Y wins → "Y wins"
  - A ATK > Y ATK: A wins → "A wins"
  - ATK = ATK: Draw → "draw"
- **NO Tie Advantage:** Both Kings survive a tied Final King Duel in terms of mechanics, but the game status becomes "draw"

### Graveyard Order (Simultaneous Deaths)
- **Attack Forward Tie:** Attacker first, then Defender
- **Self-Defend Tie:** Self-Defender first, then Enemy Behind
- **Top Card:** Most recently added = top of Graveyard (for future Shovel effects)

### No Legal Action
- **Condition:** Active player has no legal Move Forward, Attack Forward, or Self-Defend
- **Effect:** Skip turn
- **Event Log:** "[Player] had no legal core action; turn skipped."
- **Continue:** Increment turn, switch active player, game remains active

---

## REQUIRED EVENT ORDER (Step-by-Step)

1. **Validate Action** — preconditions met?
2. **Reveal Battle Participants** — both become revealed if battle
3. **Resolve Battle Comparison** — compare stats, apply tie-breaking
4. **Move Winning Attacker** — if won, move atomically (defender removed + attacker moves)
5. **Trigger King Territory Draw** — if King changed from own to enemy territory, increment drawCount
6. **Send Defeated to Graveyard** — append already-defeated characters in order
7. **Resolve King Death or Double-King Tie**
   - IF both Kings tied and both died: game status = "draw", END resolution immediately
   - ELSE IF exactly one King died: opposing player wins, END turn sequence
   - ELSE continue to step 8
8. **Check Final King Duel**
   - IF active game AND one char per side AND both Kings: resolve duel, update status
   - IF status now non-active: END resolution
9. **End Active Player's Turn** — if still active: increment turn, switch player, log entry

---

## BOARD-STATE INVARIANTS (Always Maintained)

1. **One Position Per Living Character:** `character.alive === true` → `character.boardPosition !== null`
2. **No Cohabitation:** No two `alive === true` characters share same `boardPosition`
3. **No Living Character with Null Position:** Never `alive === true && boardPosition === null`
4. **Dead Characters Nullified:** `character.alive === false` → `character.boardPosition === null`
5. **Atomic Attack Updates:** Defender removed and attacker move occur together; board never has two living characters in same space
6. **All Characters Accounted For:** `characters.length + graveyard.length` = total characters ever created

---

## IMPLEMENTATION CHECKLIST

### GameState Module
- [ ] Create immutable game state
- [ ] Initialization function (place Kings at Y3/A3, all others on board, check Final King Duel)
- [ ] Helper functions: `isAlive()`, `getCharacter()`, `getTerritory()`, `forwardSpace()`, `backwardSpace()`

### Action Validators
- [ ] Move Forward preconditions
- [ ] Attack Forward preconditions
- [ ] Self-Defend preconditions
- [ ] Legal action detection (for skip turn)

### Battle System
- [ ] Stat comparison (ATK vs DEF, DEF vs DEF)
- [ ] Tie-breaking logic (King Advantage, Double-King Tie detection)
- [ ] Battle outcome determination

### Action Executors
- [ ] Move Forward execution (with King Territory Draw)
- [ ] Attack Forward execution (with atomic board update, King Territory Draw, Graveyard)
- [ ] Self-Defend execution (with Graveyard)
- [ ] Turn skipping

### Game State Updates
- [ ] King Territory Draw increment
- [ ] Character defeat (alive = false, boardPosition = null)
- [ ] Graveyard append (in order)
- [ ] Active player switch
- [ ] Turn counter increment
- [ ] Game status update (active, Y wins, A wins, draw)

### End-Game Conditions
- [ ] King Death detection
- [ ] Double-King Tie detection (special case in step 7)
- [ ] Final King Duel trigger and resolution
- [ ] Turn skipping when no legal action

### Event Logging
- [ ] All actions logged with details
- [ ] Battle outcomes logged
- [ ] King Territory Draws logged
- [ ] King deaths logged
- [ ] Final King Duels logged
- [ ] Double-King Tie logged

### Tests (84 Scenarios)
- [ ] Move Forward tests (A: 1-9, 5b)
- [ ] Attack Forward tests (B: 10-27)
- [ ] Self-Defend tests (C: 28-44)
- [ ] King Death tests (D: 45-47)
- [ ] Final King Duel tests (E: 48-53b)
- [ ] Graveyard tests (F: 54-56)
- [ ] Power Card Draw tests (G: 57-61)
- [ ] Game Status & Turn tests (H: 62-68)
- [ ] Action Validation tests (I: 69-71)
- [ ] Event Log tests (J: 72-75)
- [ ] Board-State Invariant tests (K: 76-80)
- [ ] Event Order & End-Game tests (L: 81-82)

---

## TESTING STRATEGY

1. **Test Naming:** Use format `[P2-01]`, `[P2-05b]`, `[P2-84]` for obvious mapping to spec
2. **Each Scenario:** Create dedicated named test for each Phase 2 scenario
3. **Setup:** Create characters, place on board, initialize game state
4. **Action:** Execute Move Forward / Attack Forward / Self-Defend
5. **Verification:** Assert outcome (winner, graveyard, positions, draw count, status, event log)
6. **Invariants:** After every action, verify board-state invariants maintained
7. **Preserve Phase 1:** Keep all existing Phase 1 tests passing

---

## IMMUTABILITY PATTERN

**All functions return new GameState; never mutate incoming state:**

```typescript
function moveCharacterForward(state: GameState, characterId: string): GameState {
  // 1. Find character
  // 2. Validate precondition
  // 3. Create new characters array with character moved
  // 4. Check King Territory Draw, create new drawCount
  // 5. Create new eventLog
  // 6. Return new GameState { ...state, characters, drawCount, eventLog }
}
```

---

## IMPORTS FROM PHASE 1

Use from src/board.ts:
- `getForward(space: BoardSpace): BoardSpace`
- `getBackward(space: BoardSpace): BoardSpace`
- `getTerritory(space: BoardSpace): 'Y' | 'A'`

Do NOT alter Phase 1 board logic.

---

**End of PHASE_2_GAME_RULES.md**
