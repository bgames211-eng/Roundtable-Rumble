# PHASE 2: CORE BATTLE SPEC
## Basic Turn and Battle Engine — Approved Specification

**Status:** ✅ Approved Specification — Ready for Implementation  
**Date:** 2026-06-25  
**Phase 2 Scenarios:** 84 required scenarios  
**Combined Total:** 54 Phase 1 requirements + 84 Phase 2 scenarios = 138 total  
**Prerequisite:** Phase 1 board rules engine checkpoint (commit b537412)

---

## PHASE 2 SCOPE

### Environment
- One normal board level only.
- At most one living character per board space.
- No character abilities, power cards, items, weapons, vehicles, attachments, followers, locations, Flying, Void, or bot/UI/art.

### Character Definition
Characters in Phase 2 are test-created generic entities with:
- `id`: unique identifier
- `controller`: Y or A
- `ATK`: attack stat (number)
- `DEF`: defense stat (number)
- `isKing`: boolean
- `revealed`: boolean (hidden/revealed status)
- `alive`: boolean
- `boardPosition`: BoardSpace | null

---

## GAME STATE TO DEFINE

### Core State Fields
- **Active Player:** Y or A (whose turn it is)
- **Turn Number:** integer (starts at 1)
- **Board:** living characters on board (at most one per space)
- **Graveyard:** list of defeated characters
- **Power Card Draw Count:** tally for each player (Y and A); represents how many Power Cards each player has earned (not an actual deck yet)
- **Game Status:** one of `active`, `Y wins`, `A wins`, or `draw`
- **Action/Event Log:** ordered record of all actions and their outcomes

### Turn Structure (High Level)
Each turn:
1. Validate and execute one core action by the active player.
2. Resolve all consequences of that action.
3. Check end-of-turn conditions (game over, etc.).
4. Advance turn counter and switch active player if game is still active.

### Required Board-State Invariants
Phase 2 game state must maintain these invariants at all times:

- **One Position Per Character:** Each living character has exactly one non-null `boardPosition`.
- **No Cohabitation:** No two living characters may share a `boardPosition` in Phase 2.
- **Defeated Characters Removed:** When a character is defeated, its `alive` status becomes `false` and its `boardPosition` becomes `null` in the same atomic state update.
- **Dead Characters Off Board:** A dead character (alive = false) must have `boardPosition = null`; no dead character occupies a board space.
- **No Living Character with Null Position:** No intermediate or final game state may contain a living character (alive = true) with `boardPosition = null`.
- **Atomic Attack Moves:** In an attack win, defender defeat/removal (alive = false, boardPosition = null) and attacker movement into the vacated space occur atomically; the board never temporarily contains two living characters in one space.
- **Graveyard Preservation:** The Graveyard stores defeated characters while preserving their identity, stats, controller, King status, and reveal status for future Shovel effects and game mechanics.

---

## CORE ACTIONS

### Action 1: Move Forward

**Preconditions:**
- The character is controlled by the active player.
- The character is alive.
- The forward space exists and is empty (no character present).

**Execution:**
1. Move character from current space to forward space.
2. Check if movement triggered a King Territory Draw:
   - If character is a King AND was in own territory AND is now in enemy territory:
     - Increment that player's Power Card draw count by 1.
     - Log: "King Territory Draw: [character id] awarded 1 Power Card."
3. End the action. Proceed to end-of-turn validation.

**Outcome:** Character occupies forward space; turn ends.

---

### Action 2: Attack Forward

**Preconditions:**
- The attacking character is controlled by the active player.
- The attacking character is alive.
- The forward space is occupied by an enemy character (different controller).
- That enemy character is alive.

**Execution Order:**

1. **Validate Action:** Confirm attack is legal.
2. **Reveal Characters:** Both attacker and defender become revealed.
3. **Compare Stats:**
   - Attacker uses `ATK` stat.
   - Defender uses `DEF` stat.
   - Apply tie-breaking logic (see Battle Rules below).
4. **Determine Outcome:** winner, loser, any King advantages.
5. **Move Attacker (if won) — Atomic Board Update:** If attacker won:
   - The defeated defender is removed from its board space (boardPosition = null).
   - The attacker moves into that vacated space as one atomic update.
   - The board never temporarily or permanently contains two living characters in one space.
6. **Check King Territory Draw:**
   - If attacker is a King AND was in own territory AND is now in enemy territory (after winning move):
     - Increment attacker's player Power Card draw count by 1.
     - Log: "King Territory Draw: [attacker id] awarded 1 Power Card."
7. **Send Loser to Graveyard:** Move defeated character to Graveyard; mark as dead (if not already marked in step 5).
8. **Check King Death:** If loser was a King, that player loses immediately. Set game status to "A wins" or "Y wins" and end turn sequence.
9. **Check Final King Duel:** If game is still active and only one living character remains per side, both are Kings, perform Final King Duel (see Battle Rules).
10. **End Turn:** If game still active, proceed to end-of-turn validation.

**Outcome Scenarios:**

#### Scenario A: Attacker ATK > Defender DEF
- **Winner:** Attacker
- **Loser:** Defender dies; moves to Graveyard
- **Movement:** Attacker moves to defender's space
- **King Territory Draw:** Check and apply if King attacker crosses territory
- **Turn Status:** Ends active player's turn (unless King death or Final King Duel follows)

#### Scenario B: Attacker ATK < Defender DEF
- **Winner:** Defender
- **Loser:** Attacker dies and is removed from its original space; moved to Graveyard
- **Movement:** Attacker does not move into defender's space
- **King Territory Draw:** No draw (no territory crossing)
- **Turn Status:** Ends active player's turn (unless King death follows)

#### Scenario C: Attacker ATK = Defender DEF (Tie)
- **Tie-Breaking:** Apply King Advantage rule (see Battle Rules)
  - If exactly one character is a King, that King wins.
  - If both are Kings OR neither is a King, both die (see Battle Rules).
- **Loser(s):** Character(s) that lose per tie-break; move to Graveyard
- **Movement:** If attacker wins, attacker moves to defender's space; if tie and both die, both original spaces become empty and neither character moves
- **King Territory Draw:** Check and apply only if attacker is a King that moved into enemy territory after winning
- **Turn Status:** Ends active player's turn (unless King death or Final King Duel follows)

---

### Action 3: Self-Defend

**Preconditions:**
- The self-defending character is controlled by the active player.
- The self-defending character is alive.
- The backward space is occupied by an enemy character (different controller).
- That enemy character is alive.

**Execution Order:**

1. **Validate Action:** Confirm self-defend is legal.
2. **Reveal Characters:** Both self-defender and attacker become revealed.
3. **Compare Stats:**
   - Self-defender uses `DEF` stat.
   - Attacker uses `DEF` stat (attacker's defensive capability is its DEF, not ATK).
   - Apply tie-breaking logic (see Battle Rules below).
4. **Determine Outcome:** winner, loser, any King advantages.
5. **NO Movement:** Self-Defend never moves any character (even if self-defender wins).
6. **NO King Territory Draw:** Because no movement occurs, no territory crossing can occur.
7. **Send Loser to Graveyard:** Move defeated character to Graveyard; mark as dead.
8. **Check King Death:** If loser was a King, that player loses immediately. Set game status to "A wins" or "Y wins" and end turn sequence.
9. **Check Final King Duel:** If game is still active and only one living character remains per side, both are Kings, perform Final King Duel (see Battle Rules).
10. **End Turn:** If game still active, proceed to end-of-turn validation.

**Outcome Scenarios:**

#### Scenario A: Self-Defender DEF > Attacker DEF
- **Winner:** Self-Defender
- **Loser:** Attacker (enemy) dies; moves to Graveyard
- **Movement:** None
- **King Territory Draw:** None (no movement)
- **Turn Status:** Ends active player's turn (unless King death or Final King Duel follows)

#### Scenario B: Self-Defender DEF < Attacker DEF
- **Winner:** Attacker (enemy)
- **Loser:** Self-Defender dies; moves to Graveyard
- **Movement:** None
- **King Territory Draw:** None (no movement)
- **Turn Status:** Ends active player's turn (unless King death follows)

#### Scenario C: Self-Defender DEF = Attacker DEF (Tie)
- **Tie-Breaking:** Apply King Advantage rule (see Battle Rules)
  - If exactly one character is a King, that King wins.
  - If both are Kings OR neither is a King, both die (see Battle Rules).
- **Loser(s):** Character(s) that lose per tie-break; move to Graveyard
- **Movement:** None
- **King Territory Draw:** None (no movement)
- **Turn Status:** Ends active player's turn (unless King death or Final King Duel follows)

---

## BATTLE RULES

### Tie Resolution

#### Exactly One Character Is a King
**Condition:** Comparison results in a tie, and exactly one battling character is a King.

**Resolution:**
- **The King wins the tie.**
- The non-King character dies and is moved to the Graveyard.
- The King survives and, in an Attack Forward, moves to the defeated character's space.
- The King may trigger King Territory Draw if it moved from own to enemy territory.

#### Neither Character Is a King
**Condition:** Comparison results in a tie, and neither character is a King.

**Resolution:**
- **Both characters die.**
- Both are moved to the Graveyard in order (attacker/self-defender first, defender/enemy second; see Graveyard Order section).
- After both non-Kings enter the Graveyard, continue the required event order:
  - Check King death (will find none if no King participated in battle).
  - Check whether the Final King Duel must happen (may be triggered if this tie removed all other characters).
  - Only then switch active player and proceed to next turn.

#### Both Characters Are Kings
**Condition:** Comparison results in a tie, and both battling characters are Kings.

**Resolution:**
- **Both Kings die.**
- Both are moved to the Graveyard in order (attacker/self-defender first, defender/enemy second; see Graveyard Order section).
- Game status is set to **"draw"** immediately.
- Do not process either player's King death as a win for the other player.
- Do not trigger a Final King Duel afterward.
- Game ends.



### King Death
**Trigger:** A King character reaches `alive = false` (is added to the Graveyard).

**Effect:**
- The King's controller loses immediately.
- Set game status to "A wins" (if A's King survives) or "Y wins" (if Y's King survives).
- Game is no longer active.
- No further actions are allowed.

### Final King Duel
**Trigger Condition:** Final King Duel triggers whenever an active game state has exactly one living character per side and both living characters are Kings. This includes immediately after game initialization and after any action finishes resolving.

**Duel Mechanics:**
- Y King ATK vs. A King ATK (compare Y King's ATK against A King's ATK).
- Highest ATK wins (no stat modifier).
- Tie in ATK = **draw** (no King Tie Advantage in this phase; both Kings survive the draw).

**Outcome:**
- **Y King ATK > A King ATK:** Y wins immediately. Set game status to "Y wins."
- **A King ATK > Y King ATK:** A wins immediately. Set game status to "A wins."
- **Y King ATK = A King ATK:** Draw condition met. Set game status to "draw."

**Turn Sequence:**
- The Final King Duel is resolved immediately when triggered.
- If a winner is determined, the game ends.
- If the result is a draw, the game ends.

### King Territory Draw
**Universal Rule:** Whenever a King changes position from its own territory to enemy territory, draw exactly 1 Power Card.

**Trigger Conditions:**
- A King character completes a relocation (position changes from one board space to another).
- The origin space is in the King's own territory.
- The destination space is in enemy territory.
- **NOT triggered by Self-Defend** (this action never moves the self-defending character).

**Applicable Actions in Phase 2:**
- Move Forward: King moves one space forward into enemy territory.
- Attack Forward (winning): King defeats defender and moves to defender's space, which is in enemy territory.

**Future-Proofing:**
This rule applies to any present or future completed relocation effect, including backward movement, Portal, teleporting, opponent-caused movement, and winning an attack. The draw is always exactly 1 per relocation and occurs exactly once per movement.

**Effect:**
- Increment the King's controller Power Card draw count by 1.
- Log entry: "King Territory Draw: [character id] awarded 1 Power Card."

**Note:** Each physical movement that crosses territory triggers exactly one draw (not cumulative per turn, but once per movement).

### Graveyard
**Definition:** A central list of all defeated characters, in the order they died.

**Conditions for Entry:**
- Character `alive` changed from `true` to `false`.
- Character was moved to Graveyard by an action outcome.
- Character's `boardPosition` becomes `null` upon entry.

**Graveyard Order (For Future Shovel Effects):**
When multiple characters die in the same action (e.g., a tie where both die):
- **Attack Forward simultaneous tie:** Attacker enters the central Graveyard first, defender enters second.
- **Self-Defend simultaneous tie:** Self-defender enters the Graveyard first, enemy behind enters second.
- **Top Card:** The most recently added character is the top Graveyard card for future Shovel behavior and resurrection effects.

---

## REQUIRED EVENT ORDER (Exact Sequence)

Every action follows this sequence. **Do not deviate.**

1. **Validate Action**
   - Is the action legal? (preconditions met)
   - If not, reject and do not proceed.

2. **Reveal Battle Participants (if applicable)**
   - If the action involves a battle (Attack Forward, Self-Defend), both participants become `revealed = true`.
   - If the action is Move Forward, reveal is not required.

3. **Resolve Battle Comparison (if applicable)**
   - Compare stats (ATK vs. DEF or DEF vs. DEF).
   - Apply tie-breaking logic.
   - Determine winner and loser(s).

4. **Move a Winning Attacker (if applicable)**
   - In Attack Forward: if attacker won, move attacker to defender's space.
   - In Self-Defend: no movement.
   - In Move Forward: move character to forward space (no battle).

5. **Trigger King Territory Draw (if applicable)**
   - Check if a King's space changed from own territory to enemy territory.
   - If yes, increment Power Card draw count.
   - Log the draw event.

6. **Send Defeated Characters to Graveyard**
   - Characters already marked as defeated during this action have `alive = false` and `boardPosition = null`.
   - Append these already-defeated characters to the Graveyard list in the required order (see Graveyard Order).
   - No game state ever contains a living character with `boardPosition = null`.

7. **Resolve King Death or Double-King Tie**
   - **Special Exception — Double-King Tie:** If both battling participants were Kings and tied (both died):
     - Set game status to "draw".
     - Log: "Double-King Tie: both Kings died; game ends in draw."
     - Do not award either player a King-death win.
     - Do not run the Final King Duel.
     - Do not switch the active player.
     - **End action resolution immediately. Do not proceed to steps 8 or 9.**
   - **Otherwise — King Death Check:** Scan the Graveyard for this turn's additions.
     - If exactly one King is now dead, the opposing player wins.
     - Set game status to "A wins" (if Y's King died) or "Y wins" (if A's King died).
     - **Do not proceed to step 8; end the turn sequence.**
   - **Otherwise continue to Step 8.**

8. **Check Whether the Final King Duel Must Happen**
   - Is game status still `active`?
   - Are there exactly one living character per side?
   - Are both living characters Kings?
   - If all yes, perform Final King Duel immediately (using duel mechanics above).
   - Update game status accordingly.
   - **If status changed to non-active ("Y wins", "A wins", or "draw"), do not proceed to step 9; end action resolution.**

9. **End the Active Player's Turn**
   - If game is still `active` (not ended by King death or Final King Duel):
     - Increment turn counter.
     - Switch active player (Y ↔ A).
     - Action log entry: "Turn [new turn number]: Active player is now [new player]."

---

## OPEN DECISIONS — DO NOT GUESS

**These questions must be answered and approved before Phase 2 development begins.**

### 1. When an Attacker Loses an Attack Forward Battle, Confirm Whether the Attacker Dies.
**Question:** In Attack Forward, when the attacker's ATK < defender's DEF (attacker loses):
- Does the attacker die and move to the Graveyard?
- Or does the attacker remain alive on the board?

**Approved Decision:** ☑ Attacker dies | Attacker survives | Other

**Ruling:** When an attacker loses an Attack Forward battle, the attacker dies and is sent to the central Graveyard.

---

### 2. If Two Kings Tie Outside the Final King Duel, What Exactly Happens?
**Question:** In a regular Attack Forward or Self-Defend, if both battling characters are Kings and the stats tie:
- Do both Kings die immediately (triggering a draw or double loss)?
- Does one King survive per player (seems contradictory)?
- Is there a special King-vs-King rule outside the Final King Duel context?

**Approved Decision:** ☑ Both Kings die (draw/loss) | Both Kings survive | Other

**Ruling:**
- Both Kings die and are sent to the central Graveyard.
- Both characters are added to the Graveyard: attacker (or self-defender) first, defender second.
- Game status is set to "draw" immediately.
- Do not process either player's King death as a win for the other player.
- Do not trigger a Final King Duel after both Kings die in a tie.

---

### 3. Is There One Central Graveyard or One Graveyard Per Player?
**Question:** 
- One shared Graveyard containing all defeated characters from both sides?
- One Graveyard per player (Y Graveyard and A Graveyard)?

**Approved Decision:** ☑ Central Graveyard | One per player | Other

**Ruling:** There is one central Graveyard containing all defeated characters from both controllers, ordered by the sequence in which they died.

---

### 4. If Two Characters Die Simultaneously in a Tie, What Order Do They Enter the Graveyard for Future Shovel Effects?
**Question:** In a tie where both characters die (e.g., neither is a King, or both are Kings):
- Does the attacker (or self-defender) enter first?
- Does the defender enter first?
- Does it matter?

**Approved Decision:** ☑ Attacker first | Defender first | Doesn't matter | Other

**Ruling:**
- In Attack Forward ties: attacker enters the Graveyard first, defender enters second.
- In Self-Defend ties: self-defender enters the Graveyard first, enemy behind enters second.
- Therefore, the second-entered character is the top Graveyard card for future Shovel behavior.

---

### 5. What Happens When the Active Player Has No Legal Core Action at All: Skip Turn, Lose, or Another Rule?
**Question:** If the active player has no legal Move Forward, Attack Forward, or Self-Defend actions available:
- Skip the turn and proceed to the next player's turn?
- The player with no legal action loses immediately?
- Another rule?

**Approved Decision:** ☑ Skip turn | Player loses | Other

**Ruling:**
- If the active player has no legal core action (Move Forward, Attack Forward, or Self-Defend), skip that player's turn.
- Log: "[Player] had no legal core action; turn skipped."
- Increment the turn counter.
- Switch active player to the opponent.
- Do not declare a loss or draw merely because one player had no legal action in one turn.

---

### 6. Should a Final King Duel Trigger Immediately at Game Setup If Both Players Began With Only Kings, or Only After a Normal Action Leaves Only the Two Kings?
**Question:** Game setup scenario:
- If the board is initialized with only two Kings (one per side) and no other characters:
- Does Final King Duel resolve before Turn 1 action, or only if a normal action leaves this state?

**Approved Decision:** ☑ Trigger at setup | Trigger only after action | Other

**Ruling:** Final King Duel triggers immediately whenever game state has exactly one living character per side and both are Kings, including immediately after test-game initialization/setup. The duel resolves before any Turn 1 action, using King ATK comparison.

---

## PHASE 2 AUTOMATED TESTS

### Test Categories

#### A. Move Forward Action Tests
1. **Move Forward: Empty Space** — Character moves forward to empty space; turn ends.
2. **Move Forward: Occupied Space (Blocked)** — Character cannot move forward if space is occupied; action rejected.
3. **Move Forward: Forward Neighbor Exists** — Every valid board space has exactly one legal forward neighbor on the loop.
4. **Move Forward: Inactive Player Cannot Move** — Only active player's characters can move; others' move requests rejected.
5. **Move Forward: Dead Character Cannot Move** — Character with `alive = false` cannot move.
5b. **Move Forward: Hidden Character Can Move** — A face-down (unrevealed) living character may move normally; reveal is not required for movement.
6. **Move Forward: Y King Y5 → A5 Draws Card** — Y King moves from Y territory to A territory; draw count incremented.
7. **Move Forward: A King A1 → Y1 Draws Card** — A King moves from A territory to Y territory; draw count incremented.
8. **Move Forward: Non-King Crossing Does Not Draw** — Non-King moves Y5 → A5; no draw.
9. **Move Forward: Movement Within Same Territory No Draw** — King moves Y3 → Y4; no draw.

#### B. Attack Forward Action Tests
10. **Attack Forward: Valid Target** — Attacker targets enemy directly forward; action valid.
11. **Attack Forward: Not Directly Forward** — Target is not directly forward; action rejected.
12. **Attack Forward: Forward Neighbor Exists** — Every valid board space has exactly one legal forward neighbor on the loop.
13. **Attack Forward: Friendly Forward** — Forward space has ally; attack rejected.
14. **Attack Forward: Empty Forward** — Forward space is empty; attack rejected.
15. **Attack Forward: Attacker Wins (ATK > DEF)** — Attacker ATK > Defender DEF; attacker moves to defender's space, defender dies.
16. **Attack Forward: Attacker Loses (ATK < DEF)** — Attacker ATK < Defender DEF; attacker dies, does not move.
17. **Attack Forward: Tie, Neither King** — Both characters tie, neither is King; both die, draw condition not met (game continues).
18. **Attack Forward: Tie, Attacker Is King** — Attacker is King, defender is not, stats tie; King wins, non-King dies.
19. **Attack Forward: Tie, Defender Is King** — Defender is King, attacker is not, stats tie; King wins, non-King dies.
20. **Attack Forward: Tie, Both Are Kings** — Both Kings tie in battle; both die, game ends in draw (or double loss).
21. **Attack Forward: King Attacker Wins, Crosses Territory** — King attacker defeats non-King, moves into enemy space; draw count incremented.
22. **Attack Forward: King Attacker Wins, No Territory Crossing** — King attacker defeats non-King in same territory; no draw.
23. **Attack Forward: Attacker Dies, No Graveyard Draw** — Losing attacker dies; no King Territory Draw applied.
24. **Attack Forward: Both Reveal Before Comparison** — Attack action reveals both attacker and defender.
25. **Attack Forward: Inactive Player Cannot Attack** — Only active player's characters can attack.
26. **Attack Forward: Dead Attacker Cannot Attack** — Dead character cannot initiate attack.
27. **Attack Forward: Dead Defender Cannot Be Attacked** — Cannot attack a dead character.

#### C. Self-Defend Action Tests
28. **Self-Defend: Valid Target** — Self-defender targets enemy directly behind; action valid.
29. **Self-Defend: Not Directly Behind** — Target is not directly behind; action rejected.
30. **Self-Defend: Backward Neighbor Exists** — Every valid board space has exactly one legal backward neighbor on the loop.
31. **Self-Defend: Friendly Behind** — Behind space has ally; self-defend rejected.
32. **Self-Defend: Empty Behind** — Behind space is empty; self-defend rejected.
33. **Self-Defend: Self-Defender Wins (DEF > DEF)** — Self-Defender DEF > Attacker DEF; enemy dies, self-defender stays in place.
34. **Self-Defend: Self-Defender Loses (DEF < DEF)** — Self-Defender DEF < Attacker DEF; self-defender dies, attacker stays in place.
35. **Self-Defend: Tie, Neither King** — Both tie, neither is King; both die.
36. **Self-Defend: Tie, Self-Defender Is King** — Self-Defender is King, enemy is not, stats tie; King wins, non-King dies.
37. **Self-Defend: Tie, Enemy Is King** — Enemy is King, self-defender is not, stats tie; King wins, self-defender dies.
38. **Self-Defend: Tie, Both Are Kings** — Both Kings tie; both die, game ends in draw (or double loss).
39. **Self-Defend: No Movement** — Self-Defend never moves any character, even if self-defender wins.
40. **Self-Defend: No King Territory Draw** — Self-Defend never draws a King Territory Card (no movement).
41. **Self-Defend: Both Reveal Before Comparison** — Self-defend action reveals both participants.
42. **Self-Defend: Inactive Player Cannot Self-Defend** — Only active player's characters can self-defend.
43. **Self-Defend: Dead Self-Defender Cannot Defend** — Dead character cannot self-defend.
44. **Self-Defend: Dead Enemy Cannot Be Defended Against** — Cannot defend against a dead character.

#### D. King Death Condition Tests
45. **King Death: Y King Dies** — Y King moved to Graveyard; Y loses; game status = "A wins."
46. **King Death: A King Dies** — A King moved to Graveyard; A loses; game status = "Y wins."
47. **King Death: Ends Game Immediately** — When a King dies, no further actions are allowed; turn sequence ends.

#### E. Final King Duel Tests
48. **Final King Duel: Triggered** — Only one living character per side, both Kings; duel is resolved.
49. **Final King Duel: Y King ATK > A King ATK** — Y King ATK higher; Y wins; game status = "Y wins."
50. **Final King Duel: A King ATK > Y King ATK** — A King ATK higher; A wins; game status = "A wins."
51. **Final King Duel: Tie (Y King ATK = A King ATK)** — Both Kings tie in duel; game status = "draw."
52. **Final King Duel: Not Triggered Until Exactly One Char Per Side** — Before exactly one King per side, duel does not trigger.
53. **Final King Duel: Not Triggered If Both Are Not Kings** — If one character is not a King, duel is not triggered (different end-game rule).
53b. **Final King Duel: Trigger at Setup** — When initialized with exactly one living King per side and no other living characters, Final King Duel resolves immediately.

#### F. Graveyard Tests
54. **Graveyard: Character Added When Dead** — Defeated character added to Graveyard; marked `alive = false`.
55. **Graveyard: Order Preserved** — Characters added to Graveyard in order of defeat.
56. **Graveyard: Tie Death Order** — Two characters die in same tie; added to Graveyard in defined order.

#### G. Power Card Draw Count Tests
57. **Power Card Count: Initial** — Both players start with draw count = 0.
58. **Power Card Count: Y King Draws** — Y King crosses territory; Y's draw count incremented.
59. **Power Card Count: A King Draws** — A King crosses territory; A's draw count incremented.
60. **Double-King Tie: No Territory Draw on Simultaneous Death** — If two Kings tie and both die without movement, neither receives a King Territory Draw.
61. **Power Card Count: No Draw on Defeat** — Defeated King does not draw; only moving King draws.

#### H. Game Status & Turn Tests
62. **Game Status: Active** — Game initialized as `active`.
63. **Game Status: Y Wins** — Set when A King dies or A loses Final King Duel.
64. **Game Status: A Wins** — Set when Y King dies or Y loses Final King Duel.
65. **Game Status: Draw** — Set when Final King Duel results in ATK tie or other draw condition.
66. **Turn Counter: Increments** — Turn counter starts at 1; increments after each action.
67. **Active Player: Switches** — Active player switches Y → A → Y after each turn.
68. **Active Player: Not Switched If Game Ends** — If game status becomes non-active, active player does not switch.

#### I. Action Validation Tests
69. **Action Rejected: Empty Board** — No characters on board; no valid actions.
70. **Action Rejected: No Legal Action** — Active player has no legal Move Forward, Attack Forward, or Self-Defend; depends on open decision #5.
71. **Action Rejected: Uncontrolled Character** — Character is not controlled by active player; cannot act.

#### J. Event Log Tests
72. **Event Log: Action Recorded** — Every action recorded in event log with details.
73. **Event Log: Battle Outcome Recorded** — Battle winners, losers, and outcomes recorded.
74. **Event Log: King Death Recorded** — King death events recorded with game end.
75. **Event Log: King Territory Draw Recorded** — Draw events recorded with character id and count.

#### K. Board-State Invariant Tests
76. **Attack Win: No Cohabitation** — Attack win never leaves two living characters on the defender's former space; atomic board update enforced.
77. **Defeated Attacker Position** — A defeated attacker has `boardPosition = null` after losing an attack; attacker removed from board.
78. **Defeated Defender Position** — A defeated defender has `boardPosition = null` after losing an attack; defender removed from board.
79. **Non-King Tie: Both Positions Null** — Both characters in a non-King tie have `boardPosition = null` and both original spaces are empty.
80. **Comprehensive Board-State Invariants** — After every resolved action, verify all invariants: no duplicate living positions, every living character has one non-null boardPosition, every dead character has boardPosition = null; no living character may have boardPosition = null at any point.

#### L. Event Order and End-Game Transition Tests
81. **Non-King Tie Triggers Final King Duel** — A non-King tie that removes the final non-Kings from both sides immediately triggers Final King Duel before turn switching; duel resolves and game ends.
82. **Double-King Tie Draw Protection** — A double-King tie ends as a draw immediately and does not incorrectly change into "Y wins" or "A wins" during King-death processing; game status = "draw" and action resolution ends.

---

## DOCUMENT STATUS

**✅ Final Approval Status: APPROVED**

**Specification Completeness:**
- [x] Game state definition approved and finalized
- [x] Core action specifications (Move Forward, Attack Forward, Self-Defend) approved and finalized
- [x] Battle rules (ties, King advantages, King death, Final King Duel) approved and finalized
- [x] Required event order approved and finalized (steps 7-8 clarified to prevent conflicts)
- [x] All 6 Open Decisions answered, approved, and recorded
- [x] Board-state invariants defined and documented
- [x] Attack Forward mechanics clarified (atomic board update, cohabitation prevention)
- [x] Graveyard order rules finalized and recorded
- [x] Test list complete (82 tests) and approved

**Corrections Applied:**
- [x] Correction A: Move Forward preconditions updated (removed "revealed")
- [x] Correction B: King Territory Draw rule generalized for future actions
- [x] Correction C: Tie resolution cases explicitly distinguished
- [x] Correction D: Test 60 updated (Double-King tie with no draw)
- [x] Correction E: Loop topology tests updated
- [x] Correction F: Attack Forward loss wording clarified
- [x] Correction G: Setup test added for immediate Final King Duel
- [x] Correction H: Graveyard rule finalized (no longer open decision)
- [x] Correction I: Board-state invariants added
- [x] Correction J: Attack Forward atomic board update clarified
- [x] Correction K: Attack Forward tie board behavior clarified
- [x] Correction L: Board-state invariant tests added (5 new tests)
- [x] Correction M: Final King Duel trigger wording finalized
- [x] Correction N: Non-King tie resolution wording clarified
- [x] Correction O: Required Event Order steps 7-8 rewritten to prevent conflicts
- [x] Correction P: Special exception for Double-King Tie added to step 7
- [x] Correction Q: Event Order and End-Game Transition tests added (2 new tests)

**Total Scenarios: 84 (Phase 2 only)**
**Combined Requirements: 54 Phase 1 requirements + 84 Phase 2 scenarios = 138 total**

**Note on Test Count:**
Phase 2 implements 84 named test scenarios (tests 1–82 plus 5b, 53b, 81–82 in the specification above). When npm test runs, the actual Vitest test count may differ from 84 depending on test granularity and structure. The specification defines 84 required Phase 2 scenarios to verify; the Vitest implementation creates a named test for each scenario.

**Ready for Phase 2 Development:**
1. Create PHASE_2_GAME_RULES.md (development reference, based on this spec).
2. Begin Phase 2 implementation: game state, action validators, battle resolver, turn manager.
3. Implement 84 Phase 2 scenarios as dedicated named Vitest tests.
4. Run full test suite (54 Phase 1 requirements + 84 Phase 2 scenarios).
5. Verify all board-state invariants.
6. Create Phase 2 Git checkpoint.

---

**End of PHASE_2_CORE_BATTLE_SPEC.md**
