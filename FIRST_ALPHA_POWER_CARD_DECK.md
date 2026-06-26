# FIRST ALPHA POWER CARD DECK

This document defines the approved digital First Alpha Deck.

Alpha inclusion counts below are approved digital Alpha Deck counts and are not necessarily official physical print counts.

## First Digital Alpha Deck

Total deck size: 19 card instances

- SUPER BAT x2
- BOOM !! BOMB x2
- CHAMPION'S ADVANTAGE x2
- SUPERKICK! x2
- LOW BLOW! x2
- POWER STONE x1
- FLIP THE SCRIPT x2
- BRICK WALL x2
- KICK-OUT!! x2
- MONGOL EMPIRE x2

## Card Definitions (Alpha-Only)

### SUPER BAT
- Exact card text: During battle where opponent DEF is being used: subtract 4 DEF from opponent for this battle. Count: 2.
- Alpha inclusion count: 2
- Timing: Battle Phase only
- Target: battle participant (enemy)
- Required mechanics: battle stat modifier stack; DEF-use condition check

### BOOM !! BOMB
- Exact card text: During battle: subtract 4 ATK from opponent this battle and subtract 1 DEF from your own card this battle. Count: 2.
- Alpha inclusion count: 2
- Timing: Battle Phase only
- Target: battle participant (both)
- Required mechanics: simultaneous dual-stat modifier application

### CHAMPION'S ADVANTAGE
- Exact card text: During battle: choose whether your card uses ATK or DEF for the action. Count: 2.
- Alpha inclusion count: 2
- Timing: Battle Phase only
- Target: battle participant (own)
- Required mechanics: comparison-stat override per battle window

### SUPERKICK!
- Exact card text: During battle: subtract 5 ATK or DEF from opponent this battle.
- Alpha inclusion count: 2
- Timing: Battle Phase only
- Target: battle participant (enemy)
- Required mechanics: selectable enemy stat reduction for battle duration

### LOW BLOW!
- Exact card text: During battle: subtract 4 ATK or DEF from opponent this battle.
- Alpha inclusion count: 2
- Timing: Battle Phase only
- Target: battle participant (enemy)
- Required mechanics: selectable enemy stat reduction for battle duration

### POWER STONE
- Exact card text: During battle: add +2 ATK or +2 DEF this battle.
- Alpha inclusion count: 1
- Timing: Battle Phase only
- Target: battle participant (own)
- Required mechanics: selectable own-side temporary buff

### FLIP THE SCRIPT
- Exact card text: During battle: each battling character swaps its own ATK and DEF for this battle. Battle type does not change.
- Alpha inclusion count: 2
- Timing: Battle Phase only
- Target: battle participant (both)
- Required mechanics: effective-stat swap operation for both participants

### BRICK WALL
- Exact card text: During battle: +5 DEF. Cannot be used against Kool-Aid Man.
- Alpha inclusion count: 2
- Timing: Battle Phase only
- Target: battle participant (own)
- Required mechanics: battle DEF buff with named-character legality exception

### KICK-OUT!!
- Exact card text: During battle, if your character is losing, make the stat currently being used equal the opponent's equivalent stat. Battle continues.
- Alpha inclusion count: 2
- Timing: Battle Phase only
- Target: battle participant (own)
- Required mechanics: live losing-state legality gate; comparison-value equalization at play time

### MONGOL EMPIRE
- Exact card text: During battle: +5 ATK. If used on Genghis Khan, the +5 ATK is permanent.
- Alpha inclusion count: 2
- Timing: Battle Phase only
- Target: battle participant (own)
- Required mechanics: temporary ATK buff and conditional permanent-stat branch for Genghis Khan

## Locked Rules

- Battle effects resolve in the exact order played.
- Standard plus/minus modifiers stack cumulatively.
- Modifiers remain attached to their named ATK or DEF stat for the battle unless a card explicitly changes that.
- Reactions and interrupts are excluded from this Alpha.

### FLIP THE SCRIPT
- Swap each battling character's current effective ATK and DEF values at the moment played.
- Later cards modify the resulting stat labels.
- A second Flip the Script swaps the current effective values again.
- Battle type does not change.

### KICK-OUT!!
- Legal only while its controller is currently losing.
- Sets the controller's currently used comparison stat equal to the opponent's current corresponding comparison value at that moment.
- Later cards may still alter either side's values.
- A resulting tie uses normal tie rules.

### MONGOL EMPIRE
- Include the Genghis Khan permanence branch.
- Requires persistent-stat-modifier support.

### BRICK WALL
- Include the Kool-Aid Man exception as an engine legality exception.

Approved for implementation planning.

Mechanics needed before coding:
- Ordered battle effect queue and deterministic application order.
- Temporary battle modifier stack keyed by stat label (ATK/DEF).
- Comparison-stat override and equalization operations.
- Effective-stat swap operation supporting repeated swaps.
- Live legality checks based on current comparison state (for KICK-OUT!!).
- Character-conditional rule hooks (Genghis Khan permanence, Kool-Aid Man exception).
- Persistent stat-modifier storage for MONGOL EMPIRE's permanence branch.
