# Card Implementation Matrix

This matrix turns the taxonomy into a working checklist for the current game.

Status legend:

- `done` = already supported in the current digital engine
- `in-progress` = partially supported or partially wired
- `todo` = clear digital candidate, not yet built
- `blocked` = needs a mechanic or non-digital ruling we do not yet have

## Character Card Matrix

### Regular stat cards

These are the baseline cards: printed ATK + DEF, no special ability.

No special matrix work needed beyond art, stats, and deck plumbing.

### Inherent stat-rule cards

| Card | Status | What it is | What still has to be true |
|---|---|---|---|
| Riddler | done | Bottom-deck stat replacement for battle only | Must keep source-card discard timing and reveal timing stable |
| The Moon | blocked | Time-based stat rule | Needs live clock-based stat calculation and suppression handling |
| Loki | blocked | Board-state stat rule | Needs dynamic board-count stat recalculation and suppression handling |

### Special-ability families

| Family | Cards | Status | What the implementation has to answer |
|---|---|---|---|
| Passive draw engine | Roomba, Ant, Mr. Krabs, Drax | Roomba/Ant done, Mr. Krabs todo, Drax todo | What exactly counts as a trigger event, and does the draw happen on reveal, win, or delayed passive state? |
| Activated mobility | Nightcrawler, Tarzan, Q | Nightcrawler done, Tarzan todo, Q todo | Is the move a replacement, a free move, or a special pathing rule? |
| Activated board control | Rapunzel, Mrs. Puff, Sal, Boots, The Governor, Joker Brendan | Rapunzel/Mrs. Puff done, the rest todo | What cards can be targeted, how far can they move, and what happens if the preferred space is blocked? |
| Battle override | SpongeBob, Shawn Michaels, Cyclops, Saul Goodman, Morgan, Mermaid Man | SpongeBob in-progress, the rest todo | Does the card change the battle rule, the result, or just the stat being compared? |
| Counter / suppression / denial | Uncle Iroh, Rogue, Gary | Uncle Iroh done, Rogue/Gary todo | What is being suppressed: ability text, card activation, movement, or the whole category of special actions? |
| Stat scaling / conditional stats | Carl Grimes, Rick Grimes, Groot, Star-Lord, Larry, Vision, Quicksilver, Mermaid Man | Carl/Rick done, Larry done, the rest todo | What board state or condition feeds the stat, and when does the number recalculate? |
| Equipment / attachment synergy | Genghis Khan, David, Shiva, Ego the Living Planet, Horse, Iron Man | Genghis done, the rest todo | Is the effect a bonus, a permanence branch, or an attachment routing rule? |
| Recruit / convert / allegiance change | Venom, LEGO Brendan, MiniSuperHeroesToday, Mystique, Karen, The Traitor, Alexander Hamilton | todo | Does the card steal, attach, transform, or permanently change team ownership? |
| Reveal / inspect / search | Jeremy Jahns, Katara, Dora, Rocket Raccoon, Hershel, Joe, Plankton, Swiper | Jeremy done, the rest todo | What hidden zone is being inspected, and what happens to the looked-at cards afterward? |
| Protection / replacement / death-prevention | Avatar Aang, Michonne, Shiva, Murr | Aang done, Michonne done, the rest todo | Does the replacement happen before graveyard send, on defeat, or after battle resolution? |
| Army / token / side-structure creation | Thanos, Ultron, Appa, King Ezekiel, Star-Lord, Ego | todo | Does the card create new board objects, side piles, or new ownership rules? |
| One-time utility / oddball | Captain Feathersword, Donald Trump, Joe Biden, Aang-style one-shot escape effects | todo | Is the effect once per game, once per battle, or once per reveal? |

### Character matrix notes

- If a card has a printed stat line and an extra ability, the ability family is the important classification.
- If a card has a computed stat line, it belongs in the stat-rule bucket before anything else.
- If a card’s ability depends on the current board, hand, or battle state, the implementation needs a timing decision before it needs art.
- If a card says “once per game,” the first question is the reset rule, not the effect text.

### Pending stat-set cards

| Card | Status | Note |
|---|---|---|
| Mantis | todo | Ability exists but stats are not finalized yet |
| Carol | todo | Ability exists but stats are not finalized yet |
| Gabriel | todo | Ability exists but stats are not finalized yet |

## Power Card Matrix

### Battle stat modifiers

| Family | Cards | Status | What the implementation has to answer |
|---|---|---|---|
| Battle stat modifiers | Super Bat, Boom !! Bomb, Power Stone, Brick Wall, Mongol Empire, Low Blow! | Super Bat, Boom !! Bomb, Power Stone, Mongol Empire done in alpha flow; Brick Wall and Low Blow! todo | Is this a buff, debuff, mixed modifier, or legality exception? |

### Battle comparison overrides

| Family | Cards | Status | What the implementation has to answer |
|---|---|---|---|
| Comparison overrides | Champion's Advantage, Flip the Script, Kick-Out!! | Champion's Advantage and Kick-Out!! supported in alpha path, Flip the Script todo | Does the card change the stat, the comparison, or the battle result after the comparison? |

### Reactions / counters / interrupts

| Family | Cards | Status | What the implementation has to answer |
|---|---|---|---|
| Reactions / counters / interrupts | No Spray, No More | No Spray done, No More todo | Can it cancel a card already played, a card about to resolve, or the whole turn? |

### Replacement / substitution effects

| Family | Cards | Status | What the implementation has to answer |
|---|---|---|---|
| Replacement / substitution | Phone a Friend, Second Life, Attack! | Phone a Friend done, the rest todo | What action is being replaced, and when does the replacement window open? |

### Board movement / relocation

| Family | Cards | Status | What the implementation has to answer |
|---|---|---|---|
| Board movement / relocation | Back It Up, Portal | Both done | Is the move free, forced, any-distance, or path-limited? |

### Swap cards

| Family | Cards | Status | What the implementation has to answer |
|---|---|---|---|
| Swap cards | Swap Characters, Behind the Curtains | Both done | Is the swap between living board cards, hidden hands, or both, and how do kings transfer? |

### Equipment / attachments

| Family | Cards | Status | What the implementation has to answer |
|---|---|---|---|
| Equipment / attachments | Slingshot, Ray Gun, Pocket Knife, Batarang, Freeze Gun, Frying Pan, Infinity Gauntlet | Weapons mostly done, Freeze Gun in-progress, Infinity Gauntlet todo | Is the attachment always-on, battle-only, movable, or limited by equip rules? |

### Draw / search / inspect / hand disruption

| Family | Cards | Status | What the implementation has to answer |
|---|---|---|---|
| Draw / search / inspect / hand disruption | Power Up!, Mind Stone, Find It | mostly todo | Does the card reveal hidden info, search a deck, or simply change hand size? |

### Battle utility / physical cards

| Family | Cards | Status | What the implementation has to answer |
|---|---|---|---|
| Battle utility / physical cards | Water Bottle, Push-Up Power-Up | todo | Does the game need a digital substitute, a timer, or a pure UI prompt? |

### Board-state assembly / conversion

| Family | Cards | Status | What the implementation has to answer |
|---|---|---|---|
| Assembly / conversion / lockout | Breaking Bread, Bow Down to the King, Shovel | todo | Does the card create followers, apprentices, revivals, or global state locks? |

### Power card matrix notes

- If the effect is only a stat nudge in battle, keep it in the battle modifier bucket.
- If the effect changes what “battle” means, it belongs in comparison override or replacement.
- If the effect touches hidden information, the first implementation question is privacy, not animation.
- If the effect touches attachments, the first implementation question is lifecycle: equip, detach, persist, or destroy.

## Best next implementation order

1. Finish the family rows that already have a nearly complete digital path: the remaining battle modifiers, comparison overrides, and a few supported character families.
2. Then fill the “close but not done” character families: passive draw, mobility, board control, reveal/search, and convert/attach.
3. Leave the physical-world or out-of-scope cards for last, because they need a separate interaction rule before they need code.