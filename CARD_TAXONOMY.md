# Card Taxonomy

This document defines the card families used by Roundtable Rumble so new cards can be added without inventing a new interpretation every time.

The important split is not “regular vs special” in the abstract. The real split is:

- Character cards with only printed stats
- Character cards with an inherent stat rule
- Character cards with a special ability
- Power cards, grouped by what kind of effect they actually create

## 1. Character Card Taxonomy

### A. Regular Stat Characters

These cards have printed ATK and DEF and no special ability text.

Examples:

- BRENDAN
- LUKE
- JOHN CENA
- BATMAN
- BAXTER
- SPIDER-MAN
- HULK
- RICK GRIMES
- DARYL DIXON
- NEBULA
- GAMORA

Design rule:

- If a character only needs printed ATK and DEF, it belongs here.

### B. Inherent Stat-Rule Characters

These cards do not behave like normal stat cards because their ATK and DEF are determined by a rule, not just a fixed printed number.

Examples:

- THE MOON
- LOKI
- RIDDLER

Design rule:

- If the card’s stats are computed by a rule, separate the rule from any special ability text.
- A stat rule is part of the card’s identity, not a bonus ability.

Questions every inherent stat-rule card must answer:

- What data does the rule read from?
- When is the stat calculated?
- What happens if the source data changes during play?
- Does the rule stay active if the card is suppressed, copied, or mirrored?
- Does the rule override printed stats or supplement them?

### C. Special-Ability Characters

These cards have normal printed stats, plus a special ability that does something beyond the base stat line.

The special ability is what needs categorizing.

#### Character special-ability families

1. Passive draw engine

   - The card generates Power Cards or other resources as a passive outcome.
   - Examples: ROOMBA, ANT, MR. KRABS.

2. Activated mobility

   - The card changes its own movement or relocation options.
   - Examples: NIGHTCRAWLER, TARZAN, Q.

3. Activated board control

   - The card moves, repositions, traps, or forces other cards to move.
   - Examples: RAPUNZEL, MRS. PUFF, SAL, BOOTS, THE GOVERNOR.

4. Battle override

   - The card changes how battle is resolved, how stats are compared, or how a battle result is treated.
   - Examples: SPONGEBOB, SHAWN MICHAELS, CYCLOPS, SAUL GOODMAN, MORGAN.

5. Counter / suppression / denial

   - The card stops other cards, blocks a category of effects, or suppresses abilities.
   - Examples: UNCLE IROH, ROGUE, GARY, NO MORE-style character interactions.

6. Stat scaling / conditional stats

   - The card’s power depends on the board state, the hand, adjacent cards, or another live condition.
   - Examples: CARL GRIMES, RICK GRIMES, MERMAID MAN, GROOT, STAR-LORD, LARRY.

7. Equipment / attachment synergy

   - The card cares about attached cards, equips, vehicles, weapons, or linked pieces.
   - Examples: GENGHIS KHAN, DAVID, SHIVA, EGO THE LIVING PLANET.

8. Recruit / attach / convert

   - The card steals, attaches, recruits, transforms, or changes allegiance.
   - Examples: VENOM, LEGO BRENDAN, MINISUPERHEROESTODAY, MYSTIQUE, KAREN.

9. Reveal / inspect / search

   - The card looks at hidden information or forces a reveal/search action.
   - Examples: JEREMY JAHNS, KATARA, MIND-STYLE effects, DORA, ROCKET RACCOON.

10. Protection / replacement / death-prevention

   - The card changes what happens when it would die or when another card would die.
   - Examples: AVATAR AANG, SECOND-LIFE-style effects, SHIVA, MICHONNE.

11. One-time utility

   - The card gives a single, specific, usually once-per-game effect.
   - Examples: NUCLE-like restore effects, no-shame type effects, random utility cards.

#### Questions every special-ability character card must answer

- Is the ability passive, activated, conditional, or triggered by an event?
- What exact event starts it?
- Does it trigger before battle, during battle, after battle, on reveal, on move, or on defeat?
- Who controls it: only the owner, or can an opponent ever use it?
- What is the target, if any?
- Does it affect the card itself, another character, a Power Card, the board, or the game state?
- Is the effect temporary, permanent, or replacement-based?
- Does it stack with itself or with other cards?
- What are the legality rules if no valid target exists?
- What are the counter rules?
- Does the bot need to auto-resolve it?
- What is the UI presentation when the card is revealed or when the ability is used?

## 2. Power Card Taxonomy

Power cards are not one category. They fall into effect families based on what they actually do.

### A. Battle stat modifiers

These cards add, subtract, or redirect ATK and DEF during a battle.

Examples:

- SUPER BAT
- BOOM !! BOMB
- SUPERKICK!
- LOW BLOW!
- POWER STONE
- BRICK WALL
- MONGOL EMPIRE

### B. Battle comparison overrides

These cards change which stat is used or change the comparison rule itself.

Examples:

- CHAMPION'S ADVANTAGE
- FLIP THE SCRIPT
- KICK-OUT!!

### C. Reactions / counters / interrupts

These cards respond to something already happening and block, cancel, or interrupt it.

Examples:

- NO SPRAY
- NO MORE

### D. Replacement / substitution effects

These cards replace one action with another action or replace one card with another card.

Examples:

- PHONE A FRIEND
- SECOND LIFE
- ATTACK!

### E. Board movement / relocation

These cards move characters on the board.

Examples:

- BACK IT UP
- PORTAL

### F. Swap cards

These cards exchange living cards, hands, or other hidden card positions.

Examples:

- SWAP CHARACTERS
- BEHIND THE CURTAINS

### G. Equipment / attachments

These cards attach to a character and modify that character while attached.

Examples:

- SLINGSHOT
- RAY GUN
- POCKET KNIFE
- BATARANG
- FREEZE GUN
- FRYING PAN
- INFINITY GAUNTLET

### H. Draw / search / inspect / hand disruption

These cards change hidden information or card flow.

Examples:

- POWER UP!
- MIND STONE
- FIND IT
- JEREMY JAHNS-style inspection cards

### I. Battle utility / one-shot physical cards

These cards create a battle-side utility effect that is still best treated as its own family.

Examples:

- WATER BOTTLE
- PUSH-UP POWER-UP

### J. Board-state assembly / conversion

These cards pull cards into a larger structure or convert card ownership/placement.

Examples:

- BREAKING BREAD
- BOW DOWN TO THE KING
- SHOVEL

#### Questions every power card must answer

- When can it be played?
- Is it battle-only, turn-only, anytime, or a reaction?
- What is the target?
- Does it affect one card, two cards, both battlers, a hand, the deck, the graveyard, or the board?
- Is the result temporary, permanent, or attached to another card?
- Can it be canceled or responded to?
- Does it stack with other cards?
- What happens if the target is illegal or unavailable?
- Does it alter hidden information?
- Does the bot need to auto-use it, evaluate it, or avoid it?
- What is the resolution order if multiple effects happen in the same battle?

## 3. Standard Card-Spec Checklist

Every future card should answer these before implementation:

### Character card checklist

- Display name
- Printed ATK
- Printed DEF
- Special ability text, if any
- Inherent stat rule, if any
- Trigger type
- Effect family
- Target rules
- Timing window
- Ownership rules
- Duration or permanence
- Counter rules
- AI behavior
- UI prompt behavior
- Edge cases
- Test cases

### Power card checklist

- Display name
- Rules text
- Timing class
- Effect family
- Target rules
- Resolution order
- Duration
- Cancel rules
- Stacking rules
- Hidden-information rules
- AI behavior
- UI prompt behavior
- Edge cases
- Test cases

## 4. Practical Rule For New Cards

If a new card needs a new rule family, ask first whether it is actually one of the existing families above.

If it is not, define the new family before coding the card.

That keeps the system stable and keeps future card additions from turning into one-off exceptions.