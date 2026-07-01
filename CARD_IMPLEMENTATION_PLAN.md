# Existing Card Categorization Matrix

This document categorizes the cards already in the game.

It is not a new-card plan.

The goal is to make the current roster easy to reason about before any new cards are added.

## 1. Character Cards

### A. Baseline stat characters

These are the plain ATK / DEF cards with no special ability text.

Representative examples already in the roster:

- Brendan
- Luke
- John Cena
- Batman
- Baxter
- Spider-Man
- Hulk
- Rick Grimes
- Daryl Dixon
- Nebula
- Gamora
- Larry
- Patrick
- Sandy Cheeks
- Toph
- Cedi Osman
- Lego Cap / Captain America
- The Penguin
- Mr. Freeze
- Bob
- Sokka
- Zuko
- Kool-Aid Man
- Bird
- Michonne
- Pearl
- Henry Octopus
- Dorothy Dinosaur

### B. Unfinalized stat-set cards

These cards are already part of the roster, but their printed stats are not finalized yet.

| Card | Category | Note |
|---|---|---|
| Mantis | Unfinalized stat-set card | Ability exists; stats not finalized |
| Carol | Unfinalized stat-set card | Ability exists; stats not finalized |
| Gabriel | Unfinalized stat-set card | Ability exists; stats not finalized |

### C. Inherent stat-rule cards

These cards use a rule to determine ATK and DEF rather than just a normal printed stat line.

| Card | Category | Rule summary |
|---|---|---|
| Riddler | Inherent stat rule | Reveals the bottom Character Card and uses that card’s battle stats for the battle |
| The Moon | Inherent stat rule | ATK/DEF are based on the current time |
| Loki | Inherent stat rule | ATK/DEF are based on board counts |

### D. Special-ability character families

These cards have normal printed stats plus a special ability.

| Family | Cards already in the game | What ties them together |
|---|---|---|
| Passive draw engine | Roomba, Ant, Mr. Krabs, Drax | The ability generates Power Cards under a trigger condition |
| Activated mobility | Nightcrawler, Tarzan, Q | The ability changes how the card moves or teleports |
| Activated board control | Rapunzel, Mrs. Puff, Sal, Boots, The Governor, Joker Brendan | The ability moves or repositions cards on the board |
| Battle override | SpongeBob, Shawn Michaels, Cyclops, Saul Goodman, Morgan, Mermaid Man | The ability changes battle math, battle results, or battle rules |
| Counter / suppression / denial | Uncle Iroh, Rogue, Gary | The ability stops or suppresses another action or ability |
| Stat scaling / conditional stats | Carl Grimes, Rick Grimes, Groot, Star-Lord, Larry, Vision, Quicksilver, Mermaid Man | The card’s power depends on a live condition or board state |
| Equipment / attachment synergy | Genghis Khan, David, Shiva, Ego the Living Planet, Horse, Iron Man | The card cares about attachments, weapons, vehicles, or linked pieces |
| Recruit / convert / allegiance change | Venom, Lego Brendan, MiniSuperHeroesToday, Mystique, Karen, The Traitor, Alexander Hamilton | The ability steals, recruits, transforms, or changes team ownership |
| Reveal / inspect / search | Jeremy Jahns, Katara, Dora, Rocket Raccoon, Hershel, Joe, Plankton, Swiper | The ability looks at hidden information or searches hidden zones |
| Protection / replacement / death-prevention | Avatar Aang, Michonne, Shiva, Murr | The ability prevents death, replaces defeat, or changes the defeat outcome |
| Army / token / side-structure creation | Thanos, Ultron, Appa, King Ezekiel, Star-Lord, Ego | The card creates or manages a wider structure, side pile, or token-like board state |
| One-time utility / oddball | Captain Feathersword, Donald Trump, Joe Biden | The ability is a single discrete effect with a special trigger or limitation |

### E. Character-specific notes

- If the card has a printed stat line and a special ability, the ability family is the important category.
- If the card’s stats are computed by a rule, it belongs in the inherent stat-rule bucket first.
- If the ability depends on timing, target legality, or hidden information, that is the next question after family classification.

## 2. Power Cards

Power cards are grouped by what they do, not just by the words on the card.

| Family | Cards already in the game | What ties them together |
|---|---|---|
| Battle stat modifiers | Super Bat, Boom !! Bomb, Superkick!, Low Blow!, Power Stone, Brick Wall, Mongol Empire | They directly add or subtract ATK / DEF during battle |
| Battle comparison overrides | Champion's Advantage, Flip the Script, Kick-Out!! | They change which stat is used or how the comparison resolves |
| Reactions / counters / interrupts | No Spray, No More | They respond to another effect already in motion and can block or cancel it |
| Replacement / substitution effects | Phone a Friend, Second Life, Attack! | They replace one action or outcome with another |
| Board movement / relocation | Back It Up, Portal | They move a character or card on the board |
| Swap cards | Swap Characters, Behind the Curtains | They exchange living cards, hands, or hidden card positions |
| Equipment / attachments | Slingshot, Ray Gun, Pocket Knife, Batarang, Freeze Gun, Frying Pan, Infinity Gauntlet | They attach to a character and stay with that character until removed or changed |
| Draw / search / inspect / hand disruption | Power Up!, Mind Stone, Find It | They reveal hidden information, search a deck, or change hand flow |
| Battle utility / physical cards | Water Bottle, Push-Up Power-Up | They are battle-side utility cards that need a special play flow |
| Board-state assembly / conversion | Breaking Bread, Bow Down to the King, Shovel | They create followers, apprentices, revivals, or other larger board structures |

### Power-card notes

- If a card mainly changes battle math, it belongs in battle stat modifiers or comparison overrides.
- If a card mainly interrupts another card, it belongs in reaction / counter / interrupt.
- If a card mainly changes ownership, movement, or attachments, the category should reflect that first.
- If a card touches hidden information, the first implementation question is privacy and timing, not animation.

## 3. What This Categorization Is For

The point of the matrix is to answer three questions for any existing card:

1. What family does it belong to?
2. What engine behavior does it reuse?
3. What kind of rule ambiguity would block it?

That makes the current roster easier to expand later without mixing unrelated rule families together.