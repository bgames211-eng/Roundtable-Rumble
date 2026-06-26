# OFFICIAL POWER CARD REGISTRY

Source: reference/BrendanMon_Consolidated_Rulebook_Through_Gabriel_extracted.txt
Scope: finalized Power Cards in the consolidated rulebook (through Gabriel), with digital-readiness notes for current Phase 3C staged battle flow.

Legend for digital support:
- Yes: implementable in current digital architecture with bounded additional logic.
- Partial: Phase 3C flow can host it, but major mechanics are still missing.
- No: requires out-of-scope systems/mechanics not yet implemented.

## Finalized Power Cards

### Page 14

1. SUPER BAT
- Exact card text: During battle where opponent DEF is being used: subtract 4 DEF from opponent for this battle. Count: 2.
- Source page: 14
- Timing classification: Battle Phase only
- Target type: battle participant (enemy)
- Phase 3C support: Yes
- Required mechanics before digital use: battle stat modifier stack; DEF-use condition check; count/deck limits
- Alpha candidate: Yes

2. TAG TEAM
- Exact card text: During battle: if one of your characters is directly behind your battling character, add that character's relevant ATK or DEF to your battling character. Count: 2.
- Source page: 14
- Timing classification: Battle Phase only
- Target type: own character + battle participant
- Phase 3C support: Partial
- Required mechanics before digital use: board adjacency query during battle; relevant-stat resolver by battle type; stat modifier pipeline
- Alpha candidate: No

3. PHONE A FRIEND
- Exact card text: During battle: swap one of your living cards with the top card of the unused Character Card deck. The new card cannot come from the Graveyard. May be used on your King. Count: 2.
- Source page: 14
- Timing classification: Battle Phase only
- Target type: own character + deck/graveyard/other
- Phase 3C support: No
- Required mechanics before digital use: character deck mutation during battle; swap-in validation; king handling; graveyard exclusion
- Alpha candidate: No

4. WATER BOTTLE
- Exact card text: During battle where your ATK is being used: flip a water bottle. If you land it, add 4 ATK for this battle. If you land it while also playing Boom !! Bomb, both battling cards die. Count: 2.
- Source page: 14
- Timing classification: Battle Phase only
- Target type: battle participant (own)
- Phase 3C support: Partial
- Required mechanics before digital use: battle stat modifier stack; physical/minigame replacement ruling; combo interaction with Boom !! Bomb
- Alpha candidate: No

5. BOOM !! BOMB
- Exact card text: During battle: subtract 4 ATK from opponent this battle and subtract 1 DEF from your own card this battle. Count: 2.
- Source page: 14
- Timing classification: Battle Phase only
- Target type: battle participant (both)
- Phase 3C support: Yes
- Required mechanics before digital use: simultaneous dual modifiers; ATK/DEF channel support; count/deck limits
- Alpha candidate: Yes

### Page 15

6. SWAP CHARACTERS
- Exact card text: Any time, including battle: swap one living card with one opponent living card. Can be used on Kings. If swapping with a King, the card in the King spot becomes that player's new King.
- Source page: 15
- Timing classification: either phase
- Target type: own character + enemy character
- Phase 3C support: No
- Required mechanics before digital use: global swap transaction; king identity reassignment; legality in and out of battle
- Alpha candidate: No

7. MYSTERY CARD
- Exact card text: Before the turn action and before battle cards are revealed: randomly take one Character Card from the unused Character Card deck and add its relevant stat to your battling character. Count: 2.
- Source page: 15
- Timing classification: reaction / interrupt
- Target type: deck/graveyard/other + battle participant
- Phase 3C support: Partial
- Required mechanics before digital use: pre-reveal battle window; random deck reveal; relevant-stat resolver
- Alpha candidate: No

8. CHAMPION'S ADVANTAGE
- Exact card text: During battle: choose whether your card uses ATK or DEF for the action. Count: 2.
- Source page: 15
- Timing classification: Battle Phase only
- Target type: battle participant (own)
- Phase 3C support: Yes
- Required mechanics before digital use: comparison-stat override for own participant; conflict-resolution ordering
- Alpha candidate: Yes

9. BEHIND THE CURTAINS
- Exact card text: Any time: look at opponent Power Cards. You may swap one of yours with one of theirs.
- Source page: 15
- Timing classification: either phase
- Target type: deck/graveyard/other (hands)
- Phase 3C support: No
- Required mechanics before digital use: hidden-hand privacy transfer; random/choice hand swap UI
- Alpha candidate: No

10. NO SPRAY
- Exact card text: During battle, in response to an opponent Power Card: block its effects. Can cancel a Power Card played earlier in the same battle if the battle is still happening and the effect still matters. Cannot cancel Weapons or attachments equipped before battle; use Disarm for those. Count: 2.
- Source page: 15
- Timing classification: reaction / interrupt
- Target type: deck/graveyard/other (power effect)
- Phase 3C support: Partial
- Required mechanics before digital use: effect stack/chain; retroactive cancellation rules; equipped-vs-played distinction
- Alpha candidate: No

11. BACK IT UP
- Exact card text: On your turn only: move any one card as far backward as desired, if legal. May be used on a King. Cannot be played during battle.
- Source page: 15
- Timing classification: Board Phase only
- Target type: own character or enemy character (any one card)
- Phase 3C support: Partial
- Required mechanics before digital use: arbitrary backward pathing; board targeting and legality checks
- Alpha candidate: No

12. POWER UP!
- Exact card text: Any time: draw 2 Power Cards. Opponent draws 1 Power Card.
- Source page: 15
- Timing classification: either phase
- Target type: no target
- Phase 3C support: Partial
- Required mechanics before digital use: power deck draw/discard system; hand-size updates
- Alpha candidate: No

13. NO MORE
- Exact card text: During battle: no more Power Cards can be played this turn. Power Cards also cannot be played on the next individual player's turn.
- Source page: 15
- Timing classification: Battle Phase only
- Target type: no target
- Phase 3C support: Partial
- Required mechanics before digital use: global power-lock state across battle + next player turn
- Alpha candidate: No

14. BOW DOWN TO THE KING
- Exact card text: Any time: reveal your King. The top Character Card becomes your King's apprentice and attaches to the King.
- Source page: 15
- Timing classification: either phase
- Target type: own character + deck/graveyard/other
- Phase 3C support: No
- Required mechanics before digital use: apprentice attachment model; top character deck access; reveal state updates
- Alpha candidate: No

15. BREAKING BREAD
- Exact card text: Any time: assemble all bread and Breaking Bad related characters not currently in use. They become followers of your card in play.
- Source page: 15
- Timing classification: unknown or needs Brendan ruling
- Target type: deck/graveyard/other
- Phase 3C support: No
- Required mechanics before digital use: tag/taxonomy system; follower attachments; cross-zone assembly rules
- Alpha candidate: No

16. FIND IT
- Exact card text: During battle: opponent hides this card in an agreed room. It must be visible and intact. If you find it within 1 minute, add 6 ATK or DEF this battle.
- Source page: 15
- Timing classification: Battle Phase only
- Target type: battle participant (own)
- Phase 3C support: No
- Required mechanics before digital use: physical-world minigame replacement ruling; timer + success criteria
- Alpha candidate: No

17. SUPERKICK!
- Exact card text: During battle: subtract 5 ATK or DEF from opponent this battle.
- Source page: 15
- Timing classification: Battle Phase only
- Target type: battle participant (enemy)
- Phase 3C support: Yes
- Required mechanics before digital use: selectable enemy-stat reduction for battle duration
- Alpha candidate: Yes

18. SHOVEL
- Exact card text: On your turn: revive the top card in the Graveyard and place it in any open spot. It joins your team. Cannot undo a King defeat after the game has ended.
- Source page: 15
- Timing classification: Board Phase only
- Target type: deck/graveyard/other + board space
- Phase 3C support: No
- Required mechanics before digital use: revive ownership transfer; placement targeting; post-game restriction
- Alpha candidate: No

19. PUSH-UP POWER-UP
- Exact card text: During battle: every 5 push-ups = +1 ATK or DEF this battle.
- Source page: 15
- Timing classification: Battle Phase only
- Target type: battle participant (own)
- Phase 3C support: No
- Required mechanics before digital use: physical challenge replacement ruling; quantized scaling modifier
- Alpha candidate: No

20. PORTAL
- Exact card text: On your turn only: move your card to any open spot. May be used on a King. Cannot be played during battle.
- Source page: 15
- Timing classification: Board Phase only
- Target type: own character + board space
- Phase 3C support: Partial
- Required mechanics before digital use: free relocation targeting; board-only timing enforcement
- Alpha candidate: No

21. SECOND LIFE
- Exact card text: Immediately after your card is defeated: keep it in its spot instead of sending it to the Graveyard. It permanently gains +2 ATK and +2 DEF. May be used on your King.
- Source page: 15
- Timing classification: reaction / interrupt
- Target type: own character
- Phase 3C support: Partial
- Required mechanics before digital use: defeat-interrupt window before graveyard send; permanent stat mutation
- Alpha candidate: No

### Page 16

22. SLINGSHOT
- Exact card text: Any time, including battle: equip to any character. +3 ATK / +2 DEF.
- Source page: 16
- Timing classification: either phase
- Target type: own character or enemy character
- Phase 3C support: No
- Required mechanics before digital use: attachment/equipment system; attach/detach lifecycle
- Alpha candidate: No

23. RAY GUN
- Exact card text: Any time, including battle: equip to any character. +5 ATK / +1 DEF.
- Source page: 16
- Timing classification: either phase
- Target type: own character or enemy character
- Phase 3C support: No
- Required mechanics before digital use: attachment/equipment system
- Alpha candidate: No

24. ATTACK!
- Exact card text: On your turn or during battle when your card would self-defend or interact with a card behind it: attack backward using ATK vs ATK instead of defending.
- Source page: 16
- Timing classification: either phase
- Target type: battle participant / board interaction
- Phase 3C support: No
- Required mechanics before digital use: action-type replacement engine; backward attack path semantics
- Alpha candidate: No

25. INFINITY GAUNTLET
- Exact card text: Can be equipped when not in battle. Temporarily equip to any character; move it at any time except during battle. +4 ATK / +2 DEF. With all 6 Infinity Stones, add extra +3 ATK / +3 DEF. Thanos special interaction as written above.
- Source page: 16
- Timing classification: unknown or needs Brendan ruling
- Target type: own character or enemy character
- Phase 3C support: No
- Required mechanics before digital use: moving attachment; set-bonus detection; Thanos interaction hooks
- Alpha candidate: No

26. POWER STONE
- Exact card text: During battle: add +2 ATK or +2 DEF this battle.
- Source page: 16
- Timing classification: Battle Phase only
- Target type: battle participant (own)
- Phase 3C support: Yes
- Required mechanics before digital use: choice-based temporary buff
- Alpha candidate: Yes

27. MIND STONE
- Exact card text: Any time, including battle: reveal all face-down Character Cards and both players' current Power Cards. Character Cards stay revealed. Future Power Cards may stay hidden.
- Source page: 16
- Timing classification: either phase
- Target type: no target
- Phase 3C support: Partial
- Required mechanics before digital use: global reveal state; hand privacy override then reset behavior
- Alpha candidate: No

28. REALITY STONE
- Exact card text: Any time, including battle: change any one card into the top card of its matching deck. Character -> top Character Card; Power -> top Power Card. Attachments stay attached to a changed character. If it changes a Flying Vehicle while its rider is above someone, the rider falls and dies.
- Source page: 16
- Timing classification: either phase
- Target type: own character / enemy character / deck-graveyard-other
- Phase 3C support: No
- Required mechanics before digital use: polymorph transformation engine; top-of-deck mutation; flying/falling interaction
- Alpha candidate: No

29. SOUL STONE
- Exact card text: During battle: sacrifice one living character to add +5 ATK or +5 DEF this battle. Sacrificing your King loses the game.
- Source page: 16
- Timing classification: Battle Phase only
- Target type: own character + battle participant
- Phase 3C support: Partial
- Required mechanics before digital use: sacrifice targeting and death pipeline during pending battle; king-loss immediate rule
- Alpha candidate: No

30. SPACE STONE
- Exact card text: On your turn: move your character to any open spot. That character permanently gains +2 ATK.
- Source page: 16
- Timing classification: Board Phase only
- Target type: own character + board space
- Phase 3C support: Partial
- Required mechanics before digital use: board relocation + permanent stat buff
- Alpha candidate: No

31. TIME STONE
- Exact card text: Immediately after an action is completed: reverse the most recent completed action. Return the board, cards, Graveyard, attachments, and Power Card effects to the state before that action. Cannot reverse playing Time Stone itself.
- Source page: 16
- Timing classification: reaction / interrupt
- Target type: no target
- Phase 3C support: No
- Required mechanics before digital use: full deterministic state snapshot/rollback system
- Alpha candidate: No

32. TAKE THE L
- Exact card text: Immediately after your character loses battle: draw 3 Power Cards.
- Source page: 16
- Timing classification: reaction / interrupt
- Target type: no target
- Phase 3C support: Partial
- Required mechanics before digital use: post-loss trigger window; power draw system
- Alpha candidate: No

33. SANCTUARY
- Exact card text: On your turn: place on an open spot. The first character to land there is protected for 3 turns. It cannot move, attack, self-defend, or be attacked. One turn = one individual player's actual turn.
- Source page: 16
- Timing classification: Board Phase only
- Target type: board space
- Phase 3C support: No
- Required mechanics before digital use: location card lifecycle; turn counters; movement/combat lockout states
- Alpha candidate: No

34. QUICKSAND
- Exact card text: On your turn: place on an open spot. The first character to land there is stuck for 2 turns. It cannot move, attack, or self-defend, but can still be attacked. One turn = one individual player's actual turn.
- Source page: 16
- Timing classification: Board Phase only
- Target type: board space
- Phase 3C support: No
- Required mechanics before digital use: location trap lifecycle; per-character debuff timers
- Alpha candidate: No

35. CHUG JUG
- Exact card text: During battle: restore your character to original ATK and DEF by canceling stat reductions affecting it this battle. Cannot restore old NUKE damage from earlier in the game.
- Source page: 16
- Timing classification: Battle Phase only
- Target type: battle participant (own)
- Phase 3C support: Partial
- Required mechanics before digital use: modifier provenance tracking (battle-only debuffs vs persistent damage)
- Alpha candidate: No

36. TRAINING ARC
- Exact card text: During battle: battle the top Character Deck card using ATK vs ATK. Each win gives +2 ATK and +2 DEF. May keep fighting. If you lose or tie at any point, gain nothing. All revealed deck cards go to the Graveyard. A Training Arc tie is a failed Training Arc, even for a King; the character does not die.
- Source page: 16
- Timing classification: Battle Phase only
- Target type: battle participant + deck/graveyard/other
- Phase 3C support: No
- Required mechanics before digital use: nested battle miniloop vs character deck; repeated reveals; conditional accumulation
- Alpha candidate: No

### Page 17

37. BOOMERANG
- Exact card text: During battle: subtract 2 ATK or DEF from opponent. If played from hand, returns to your hand after battle and may be used once per turn. If equipped to Sokka, subtract 5 instead, but attaches to Sokka.
- Source page: 17
- Timing classification: Battle Phase only
- Target type: battle participant (enemy)
- Phase 3C support: No
- Required mechanics before digital use: return-to-hand timing; once-per-turn tracking; equipment branch for Sokka
- Alpha candidate: No

38. MONGOL EMPIRE
- Exact card text: During battle: +5 ATK. If used on Genghis Khan, the +5 ATK is permanent.
- Source page: 17
- Timing classification: Battle Phase only
- Target type: battle participant (own)
- Phase 3C support: Partial
- Required mechanics before digital use: temporary buff with conditional permanent conversion by character identity
- Alpha candidate: No

39. GIDDY UP
- Exact card text: On your turn only, only if an enemy is directly in front. If the space past that enemy is open, hop over them. If not, search for an available Horse and attach it. Cannot be played during battle.
- Source page: 17
- Timing classification: Board Phase only
- Target type: own character + board space
- Phase 3C support: No
- Required mechanics before digital use: hop movement rule; horse search + attachment model
- Alpha candidate: No

40. THE FORGE
- Exact card text: On your turn: place on open spot. First character to land there may search for any Weapon and equip it. Remove The Forge.
- Source page: 17
- Timing classification: Board Phase only
- Target type: board space + deck/graveyard/other
- Phase 3C support: No
- Required mechanics before digital use: location placement/lifecycle; weapon search/equip
- Alpha candidate: No

41. POCKET KNIFE
- Exact card text: Any time, including battle: Weapon. +3 ATK / +3 DEF.
- Source page: 17
- Timing classification: either phase
- Target type: own character or enemy character
- Phase 3C support: No
- Required mechanics before digital use: weapon attachment system
- Alpha candidate: No

42. BARBED WIRE STEEL CHAIR
- Exact card text: Any time, including battle: Weapon. +3 ATK / +2 DEF.
- Source page: 17
- Timing classification: either phase
- Target type: own character or enemy character
- Phase 3C support: No
- Required mechanics before digital use: weapon attachment system
- Alpha candidate: No

43. TRIDENT
- Exact card text: Any time, including battle: Weapon. +4 ATK / +3 DEF.
- Source page: 17
- Timing classification: either phase
- Target type: own character or enemy character
- Phase 3C support: No
- Required mechanics before digital use: weapon attachment system
- Alpha candidate: No

44. LUCILLE
- Exact card text: Any time, including battle: Weapon. +5 ATK / +1 DEF. If equipped to Negan, extra +2 ATK.
- Source page: 17
- Timing classification: either phase
- Target type: own character or enemy character
- Phase 3C support: No
- Required mechanics before digital use: weapon attachment; character-conditional bonus
- Alpha candidate: No

45. AVENGERS TOWER
- Exact card text: On your turn: place on open spot. First character to land recruits 1 available Superhero character as an attachment, then remove location. Superhero = Marvel/DC heroes only; Aang does not count.
- Source page: 17
- Timing classification: Board Phase only
- Target type: board space + deck/graveyard/other
- Phase 3C support: No
- Required mechanics before digital use: location triggers; taxonomy filter for superheroes; attachment creation
- Alpha candidate: No

46. ROCK, PAPER, SCISSORS
- Exact card text: During battle: play until someone wins. Rock: +4 ATK or DEF. Paper: take 1 Power Card from opponent. Scissors: give one enemy -3 ATK or DEF permanently. Lose = nothing.
- Source page: 17
- Timing classification: Battle Phase only
- Target type: battle participant + deck/graveyard/other
- Phase 3C support: No
- Required mechanics before digital use: random/minigame replacement; multiple effect branches; permanent debuff support
- Alpha candidate: No

47. UNDERDOG UPGRADE
- Exact card text: On your turn or during battle: choose a character with printed ATK and DEF 5 or lower. It permanently gains +10 ATK / +10 DEF.
- Source page: 17
- Timing classification: either phase
- Target type: own character or enemy character
- Phase 3C support: Partial
- Required mechanics before digital use: printed-stat qualifier; permanent stat mutation
- Alpha candidate: No

48. ZOMBIE HORDE
- Exact card text: On your turn: revive the entire Graveyard as one Horde on your team. Place it on open spot. Each card grants +1 ATK / +1 DEF. The Horde loses names, abilities, and attachments; cannot be individually targeted, swapped, or King. If defeated, the whole Horde returns to Graveyard.
- Source page: 17
- Timing classification: Board Phase only
- Target type: deck/graveyard/other + board space
- Phase 3C support: No
- Required mechanics before digital use: aggregate-unit entity model; non-individual targeting rules
- Alpha candidate: No

49. LOW BLOW!
- Exact card text: During battle: subtract 4 ATK or DEF from opponent this battle.
- Source page: 17
- Timing classification: Battle Phase only
- Target type: battle participant (enemy)
- Phase 3C support: Yes
- Required mechanics before digital use: selectable enemy battle stat reduction
- Alpha candidate: Yes

50. REFRESH PAGE
- Exact card text: Any time: discard any number of your Power Cards, including Refresh Page, and draw that many new Power Cards.
- Source page: 17
- Timing classification: either phase
- Target type: no target
- Phase 3C support: No
- Required mechanics before digital use: hand discard selection; power deck draw replacement
- Alpha candidate: No

51. DISARM
- Exact card text: On your turn or during battle: remove 1 attached card from an opponent character and send it to Used Power Card pile.
- Source page: 17
- Timing classification: either phase
- Target type: enemy character
- Phase 3C support: No
- Required mechanics before digital use: attachment model + used-pile routing
- Alpha candidate: No

52. FRIENDSHIP SPEECH
- Exact card text: During battle before any character dies: cancel one battle. Both stay where they are; both players draw 1 Power Card.
- Source page: 17
- Timing classification: Battle Phase only
- Target type: no target
- Phase 3C support: Partial
- Required mechanics before digital use: battle-cancel resolution branch; post-cancel draw handling
- Alpha candidate: No

53. PLANK POWER
- Exact card text: During battle: every 15 seconds holding a plank = +1 ATK or DEF. No cap.
- Source page: 17
- Timing classification: Battle Phase only
- Target type: battle participant (own)
- Phase 3C support: No
- Required mechanics before digital use: physical challenge replacement ruling; scalable timing input
- Alpha candidate: No

### Page 18

54. UNO REVERSE
- Exact card text: In response to opponent Power Card: if it directly targets you or your character, reverse the effect onto them instead.
- Source page: 18
- Timing classification: reaction / interrupt
- Target type: deck/graveyard/other (power effect)
- Phase 3C support: Partial
- Required mechanics before digital use: target-aware effect reversal in chain resolution
- Alpha candidate: No

55. BIG RED CAR
- Exact card text: Any time, including battle: Vehicle. +5 ATK / +3 DEF. If driven by The Wiggles, may move forward through any number of open spaces, stopping before next occupied space.
- Source page: 18
- Timing classification: either phase
- Target type: own character or enemy character
- Phase 3C support: No
- Required mechanics before digital use: vehicle attachment + driver-based movement override
- Alpha candidate: No

56. BATMOBILE
- Exact card text: Any time, including battle: Vehicle. +4 ATK / +4 DEF. If driven by Batman, once per game if Batman would lose, may move backward 1 space instead if open.
- Source page: 18
- Timing classification: either phase
- Target type: own character or enemy character
- Phase 3C support: No
- Required mechanics before digital use: vehicle attachment; once-per-game defeat replacement trigger
- Alpha candidate: No

57. INDY'S WHIP
- Exact card text: Any time, including battle: Weapon. +3 ATK / +2 DEF. If Indiana Jones uses it, once per game pull the nearest character in front as close as desired through open spaces; must stop open in front of Indiana Jones.
- Source page: 18
- Timing classification: either phase
- Target type: enemy character
- Phase 3C support: No
- Required mechanics before digital use: nearest-target selection; pull movement across open spaces
- Alpha candidate: No

58. BATARANG
- Exact card text: Any time, including battle: Weapon. +3 ATK / +1 DEF. If Batman uses it, subtract 2 DEF from his opponent during battle.
- Source page: 18
- Timing classification: either phase
- Target type: battle participant (enemy) + attachment target
- Phase 3C support: No
- Required mechanics before digital use: weapon attachment + conditional battle debuff
- Alpha candidate: No

59. FREEZE GUN
- Exact card text: Any time, including battle: Weapon. +4 ATK / +2 DEF. If Mr. Freeze uses it, once per game freeze any character. Frozen cannot move, attack, or self-defend until it breaks free; if its player's only legal move is moving it, it breaks free but does not move that turn.
- Source page: 18
- Timing classification: either phase
- Target type: own character or enemy character
- Phase 3C support: No
- Required mechanics before digital use: freeze status lifecycle + legal-action override logic
- Alpha candidate: No

60. FRYING PAN
- Exact card text: Any time, including battle: Weapon. +2 ATK / +4 DEF. If Rapunzel uses it, extra +2 ATK.
- Source page: 18
- Timing classification: either phase
- Target type: own character or enemy character
- Phase 3C support: No
- Required mechanics before digital use: weapon attachment; character-conditional bonus
- Alpha candidate: No

61. QUINJET
- Exact card text: Any time, including battle: Flying Vehicle. +3 ATK / +4 DEF. If flown by a Superhero, once per game may move forward up to 2 spaces.
- Source page: 18
- Timing classification: either phase
- Target type: own character or enemy character
- Phase 3C support: No
- Required mechanics before digital use: flying vehicle + once-per-game movement burst + taxonomy
- Alpha candidate: No

62. CAPPED!
- Exact card text: Any time: permanently attach to one enemy. That character cannot gain ATK or DEF, receive new attachments, or be equipped with new cards. Existing boosts and attachments remain. Negative effects may still be used.
- Source page: 18
- Timing classification: either phase
- Target type: enemy character
- Phase 3C support: No
- Required mechanics before digital use: persistent lock attachment; buff/prevention gates
- Alpha candidate: No

63. CLAP CATCH
- Exact card text: During battle: throw card in air and catch after clapping. 1 clap = +1, 2 = +3, 3+ = +5 ATK or DEF. Drop = nothing.
- Source page: 18
- Timing classification: Battle Phase only
- Target type: battle participant (own)
- Phase 3C support: No
- Required mechanics before digital use: physical minigame replacement ruling
- Alpha candidate: No

64. NUKE
- Exact card text: On your turn: place on any spot. All non-Kings on that spot and 2 surrounding spots are destroyed. Kings survive but permanently lose -3 ATK / -3 DEF.
- Source page: 18
- Timing classification: Board Phase only
- Target type: board space
- Phase 3C support: No
- Required mechanics before digital use: area-of-effect board targeting; multi-kill transaction; king exception
- Alpha candidate: No

65. MIND CONTROL
- Exact card text: On your turn: control one opponent character, including King, for one legal action. May battle its own teammates. Then returns.
- Source page: 18
- Timing classification: Board Phase only
- Target type: enemy character
- Phase 3C support: No
- Required mechanics before digital use: temporary controller override for one action
- Alpha candidate: No

66. FLIP THE SCRIPT
- Exact card text: During battle: each battling character swaps its own ATK and DEF for this battle. Battle type does not change.
- Source page: 18
- Timing classification: Battle Phase only
- Target type: battle participant (both)
- Phase 3C support: Yes
- Required mechanics before digital use: per-participant temporary stat swap during pending battle
- Alpha candidate: Yes

67. STEROIDS
- Exact card text: During battle: +6 ATK / +6 DEF this battle. After battle, if character survives, permanently loses -3 ATK / -3 DEF.
- Source page: 18
- Timing classification: Battle Phase only
- Target type: battle participant (own)
- Phase 3C support: Partial
- Required mechanics before digital use: delayed post-battle persistent penalty
- Alpha candidate: No

68. SNACK ATTACK
- Exact card text: During battle: opponent names a snack in the house. Bring it within 15 seconds to subtract 6 ATK or DEF from their character this battle; fail = nothing.
- Source page: 18
- Timing classification: Battle Phase only
- Target type: battle participant (enemy)
- Phase 3C support: No
- Required mechanics before digital use: physical challenge replacement ruling
- Alpha candidate: No

### Page 19

69. CLARINET
- Exact card text: Any time, including battle: Weapon. +1 ATK / +2 DEF. If Squidward uses it, extra +7 ATK / +3 DEF.
- Source page: 19
- Timing classification: either phase
- Target type: own character or enemy character
- Phase 3C support: No
- Required mechanics before digital use: weapon attachment + character-conditional bonus
- Alpha candidate: No

70. THE DEALERSHIP
- Exact card text: On your turn: place on open spot. First character to land may search for 1 Vehicle and attach it. Remove The Dealership.
- Source page: 19
- Timing classification: Board Phase only
- Target type: board space + deck/graveyard/other
- Phase 3C support: No
- Required mechanics before digital use: location placement + vehicle search/equip
- Alpha candidate: No

71. BRICK WALL
- Exact card text: During battle: +5 DEF. Cannot be used against Kool-Aid Man.
- Source page: 19
- Timing classification: Battle Phase only
- Target type: battle participant (own)
- Phase 3C support: Partial
- Required mechanics before digital use: simple DEF buff + named-character exception logic
- Alpha candidate: No

72. SANTA'S SLEIGH
- Exact card text: Any time, including battle: Flying Vehicle. +2 ATK / +5 DEF. If Santa drives it, draw 1 Power Card every time Santa moves.
- Source page: 19
- Timing classification: either phase
- Target type: own character or enemy character
- Phase 3C support: No
- Required mechanics before digital use: flying vehicle attachment + on-move draw trigger
- Alpha candidate: No

73. HEISENBERG'S RV
- Exact card text: Any time, including battle: Vehicle. +3 ATK / +5 DEF. If Heisenberg drives it, once per game after revealed, look at opponent Power Cards and take 1.
- Source page: 19
- Timing classification: either phase
- Target type: own character or enemy character + deck/graveyard/other
- Phase 3C support: No
- Required mechanics before digital use: vehicle attachment + hand theft interaction
- Alpha candidate: No

74. POWER OUTAGE
- Exact card text: Permanent negative attachment. The attached revealed character cannot use its special ability. It may be played immediately as that character declares the ability to cancel it. Disarm can remove it.
- Source page: 19
- Timing classification: reaction / interrupt
- Target type: own character or enemy character
- Phase 3C support: No
- Required mechanics before digital use: character ability system + declaration interrupt window
- Alpha candidate: No

75. ROTATE & RESET
- Exact card text: Rotate the board 180 degrees. Control characters now on your side. If there is no King, choose a character on your side to become King. Both sides must have at least 1 character.
- Source page: 19
- Timing classification: unknown or needs Brendan ruling
- Target type: no target
- Phase 3C support: No
- Required mechanics before digital use: global board transform; controller reassignment; king reassignment logic
- Alpha candidate: No

76. CREDIT CARD
- Exact card text: Spend cards from the Used Power pile, each for +1 ATK or DEF in battle. Spent cards are set aside. At Locations, spend Used Power Cards for a reward costing that Location's ATK.
- Source page: 19
- Timing classification: either phase
- Target type: deck/graveyard/other
- Phase 3C support: No
- Required mechanics before digital use: used-pile economy + set-aside pile + location reward system
- Alpha candidate: No

77. TRUST THE DECK
- Exact card text: During battle, reveal the top Power Card. If legal, play it immediately. If not, your battling character gets -3 ATK / -3 DEF for that battle. Discard the revealed card.
- Source page: 19
- Timing classification: Battle Phase only
- Target type: deck/graveyard/other + battle participant
- Phase 3C support: Partial
- Required mechanics before digital use: top-of-power-deck reveal + immediate legality check + fallback debuff
- Alpha candidate: No

78. KICK-OUT!!
- Exact card text: During battle, if your character is losing, make the stat currently being used equal the opponent's equivalent stat. Battle continues.
- Source page: 19
- Timing classification: Battle Phase only
- Target type: battle participant (own)
- Phase 3C support: Partial
- Required mechanics before digital use: live comparison-state detection (currently losing) + dynamic stat equalization
- Alpha candidate: No

79. CATAPULT
- Exact card text: On landing, reveal the bottom Character Card and launch it forward using that card's ATK. The revealed card goes to the Graveyard. If it lands on a non-King, that character dies. If it lands on a King, the launched character dies. King on King is a Final Duel. If it lands on an open spot, it does not die.
- Source page: 19
- Timing classification: Board Phase only
- Target type: board space + deck/graveyard/other
- Phase 3C support: No
- Required mechanics before digital use: location trigger + launched-character simulation + king duel branch
- Alpha candidate: No

80. GYM
- Exact card text: First character to land may do 10 push-ups to draw 1 Power Card. Then remove Gym.
- Source page: 19
- Timing classification: Board Phase only
- Target type: board space
- Phase 3C support: No
- Required mechanics before digital use: location trigger + physical challenge replacement ruling + draw system
- Alpha candidate: No

81. LOOKOUT TOWER
- Exact card text: Permanent Location. A character landing there may secretly look at 1 face-down Character or 1 random opponent Power Card.
- Source page: 19
- Timing classification: Board Phase only
- Target type: board space + deck/graveyard/other
- Phase 3C support: No
- Required mechanics before digital use: location persistence + private peek UI/permissions
- Alpha candidate: No

82. SWITCH MARKET
- Exact card text: First character to land may swap places with any character. Then remove Switch Market.
- Source page: 19
- Timing classification: Board Phase only
- Target type: board space + own/enemy character
- Phase 3C support: No
- Required mechanics before digital use: location trigger + arbitrary board swap
- Alpha candidate: No

83. NEXUS TREE
- Exact card text: Place in the center as an open spot connected to every board spot. It does not change “directly” relationships for cards such as Dolph Ziggler or Barnacle Boy.
- Source page: 19
- Timing classification: Board Phase only
- Target type: board space
- Phase 3C support: No
- Required mechanics before digital use: board graph topology extension with directness exceptions
- Alpha candidate: No

### Page 20

84. BRIDGE
- Exact card text: Place between 2 directly opposite spots. It becomes an open spot connected to both and remains. Characters may land and battle across its connections normally.
- Source page: 20
- Timing classification: Board Phase only
- Target type: board space
- Phase 3C support: No
- Required mechanics before digital use: dynamic board-graph edge/space insertion
- Alpha candidate: No

85. VOID
- Exact card text: Must be played when drawn. Place on any board spot. A character landing there is sent to Void. A dying character may choose Void instead. Void cards remain alive off-board and retain reveal status. Once per turn, if you have your own character in Void, choose: pull a random Power Card from either hand into Void; throw a Power Card from Void into either hand; or battle another Void character using ATK vs ATK, ATK vs DEF, or DEF vs DEF. Loser goes to Graveyard. King in Void stays alive unless it loses a Void battle, which loses the game. Two Kings in Void use a real Final Duel.
- Source page: 20
- Timing classification: unknown or needs Brendan ruling
- Target type: board space + deck/graveyard/other
- Phase 3C support: No
- Required mechanics before digital use: mandatory-on-draw play; off-board zone and combat subsystem; hand transfer mechanics
- Alpha candidate: No

86. BLIND BULLSEYE
- Exact card text: During battle, close eyes and toss a coin/cap. Land on your battling character: +6 to selected stat this battle. Land on anyone else: that character gets permanent +3 ATK / +3 DEF. Miss all: opponent tosses, then effect ends.
- Source page: 20
- Timing classification: Battle Phase only
- Target type: battle participant / own or enemy character
- Phase 3C support: No
- Required mechanics before digital use: physical toss replacement ruling; random targeting + permanent buff support
- Alpha candidate: No

87. PENCIL
- Exact card text: One-time Power Card. Write or change 1 small detail on any revealed card or Power Card. Numbers may change only by 1. Cannot create automatic win. Pencil stays with the changed card to track the permanent change; it is not a normal Item/Weapon/Vehicle and Disarm cannot remove it.
- Source page: 20
- Timing classification: unknown or needs Brendan ruling
- Target type: deck/graveyard/other
- Phase 3C support: No
- Required mechanics before digital use: editable card text/metadata framework; persistent audit marker
- Alpha candidate: No

88. ERASER
- Exact card text: Removes or erases a small detail on any revealed card or Power Card. Numbers may only change down by 1. May remove Pencil to undo Pencil's change.
- Source page: 20
- Timing classification: unknown or needs Brendan ruling
- Target type: deck/graveyard/other
- Phase 3C support: No
- Required mechanics before digital use: mutable card-text framework + Pencil linkage
- Alpha candidate: No

89. KATANA
- Exact card text: Weapon. +3 ATK / +2 DEF. If equipped to Michonne, add extra +3 ATK / +3 DEF.
- Source page: 20
- Timing classification: unknown or needs Brendan ruling
- Target type: own character or enemy character
- Phase 3C support: No
- Required mechanics before digital use: weapon attachment + character-conditional bonus
- Alpha candidate: No

90. HULKBUSTER
- Exact card text: Permanent attachment, used as a Weapon or Flying Vehicle. +4 ATK / +4 DEF. Automatically defeats Hulk. If Iron Man equips it, gain extra +2 ATK / +2 DEF.
- Source page: 20
- Timing classification: unknown or needs Brendan ruling
- Target type: own character or enemy character
- Phase 3C support: No
- Required mechanics before digital use: dual-type attachment model; named auto-win interaction
- Alpha candidate: No

91. MJOLNIR
- Exact card text: Weapon. +4 ATK / +4 DEF. Gives Flying to a worthy character.
- Source page: 20
- Timing classification: unknown or needs Brendan ruling
- Target type: own character or enemy character
- Phase 3C support: No
- Required mechanics before digital use: weapon + flying grant + worthiness qualifier definition
- Alpha candidate: No

92. STORMBREAKER
- Exact card text: Weapon. +4.5 ATK / +2 DEF. Gives Flying.
- Source page: 20
- Timing classification: unknown or needs Brendan ruling
- Target type: own character or enemy character
- Phase 3C support: No
- Required mechanics before digital use: fractional stat support (+4.5) ruling in digital math + flying grant
- Alpha candidate: No

93. AANG GLIDER
- Exact card text: +1 ATK / +3 DEF; if Aang equips it, +3 ATK / +1 DEF instead. GLIDING: When moving forward, may pass any number of characters directly in front and land on the first open spot after them.
- Source page: 20
- Timing classification: unknown or needs Brendan ruling
- Target type: own character
- Phase 3C support: No
- Required mechanics before digital use: equipment model + forward-pass movement override
- Alpha candidate: No

94. SLING RING
- Exact card text: Permanent Item. Instead of normal movement, move the equipped character to any open spot OR move 1 character to any open spot directly next to that character.
- Source page: 20
- Timing classification: Board Phase only
- Target type: own character + board space
- Phase 3C support: No
- Required mechanics before digital use: movement-mode replacement and adjacency placement operations
- Alpha candidate: No

95. CLOAK OF LEVITATION
- Exact card text: Permanent Item. Gives Flying. If Dr. Strange equips it, +3 ATK / +3 DEF.
- Source page: 20
- Timing classification: unknown or needs Brendan ruling
- Target type: own character
- Phase 3C support: No
- Required mechanics before digital use: item attachment + flying + character-conditional buff
- Alpha candidate: No

96. CAPTAIN FEATHERSWORD'S SWORD
- Exact card text: Weapon. +2 ATK / +2 DEF. If Captain Feathersword equips it, +5 ATK / +5 DEF; Tickles draw 2 Power Cards.
- Source page: 20
- Timing classification: unknown or needs Brendan ruling
- Target type: own character
- Phase 3C support: No
- Required mechanics before digital use: weapon attachment + named interaction (Tickles) + draw effects
- Alpha candidate: No

97. BACKPACK
- Exact card text: Permanent Item. During battle, draw 1 Power Card. If Dora equips it, draw 2 and keep 1.
- Source page: 20
- Timing classification: Battle Phase only
- Target type: own character
- Phase 3C support: No
- Required mechanics before digital use: item attachment + battle draw + selective keep/discard
- Alpha candidate: No

### Page 21

98. MAP
- Exact card text: Permanent Item. When equipped, search the Power Card Deck for a Location and place it on an open spot; shuffle. Equipped character may move forward or backward normally. Dora may move 2 spaces if possible.
- Source page: 21
- Timing classification: Board Phase only
- Target type: own character + board space + deck/graveyard/other
- Phase 3C support: No
- Required mechanics before digital use: deck search; location placement; movement rule modification
- Alpha candidate: No

99. KRYPTONITE
- Exact card text: Item. Equip to any character. During battle, opposing character gets -3 ATK / -3 DEF and cannot use a special ability. If opposing character is Superman, Superman automatically loses. If equipped to Superman, Superman gets -5 ATK / -5 DEF and cannot use this item effect.
- Source page: 21
- Timing classification: either phase
- Target type: own character or enemy character + battle participant
- Phase 3C support: No
- Required mechanics before digital use: item attachment + named-character auto-loss + ability lockout
- Alpha candidate: No

100. FEBREZE
- Exact card text: Item. During each battle choose one: +2 ATK or +2 DEF to equipped character, OR -2 ATK or -2 DEF to opposing character for that battle.
- Source page: 21
- Timing classification: Battle Phase only
- Target type: battle participant (own or enemy)
- Phase 3C support: No
- Required mechanics before digital use: item attachment + per-battle choice effect routing
- Alpha candidate: No

101. MILANO
- Exact card text: Flying Vehicle. +3 ATK / +5 DEF. A Guardian equipped with Milano may move up to 3 spaces instead of moving normally.
- Source page: 21
- Timing classification: Board Phase only
- Target type: own character
- Phase 3C support: No
- Required mechanics before digital use: flying vehicle attachment + faction taxonomy + move override
- Alpha candidate: No

102. YAKA ARROW
- Exact card text: Weapon - 5 ATK / 5 DEF. Yondu only. May attack any revealed character. If target is not directly next to Yondu, use only Yaka Arrow stats. After winning alone, may attack again.
- Source page: 21
- Timing classification: either phase
- Target type: enemy character
- Phase 3C support: No
- Required mechanics before digital use: weapon-only bearer restriction; non-adjacent targeting; chained attack action
- Alpha candidate: No

## Copy Count and Alpha Inclusion Matrix (All Finalized Power Cards)

Notes:
- Official printed copy count = only what is explicitly printed in the extracted source text.
- Proposed Alpha inclusion count = recommendation for the first digital alpha deck preset.
- If official count is missing in source text, it is marked as Needs Brendan ruling.

| Card Name | Official Printed Copy Count | Proposed Alpha Inclusion Count |
|---|---:|---:|
| SUPER BAT | 2 | 2 |
| TAG TEAM | 2 | 0 |
| PHONE A FRIEND | 2 | 0 |
| WATER BOTTLE | 2 | 0 |
| BOOM !! BOMB | 2 | 2 |
| SWAP CHARACTERS | Needs Brendan ruling (not printed) | 0 |
| MYSTERY CARD | 2 | 0 |
| CHAMPION'S ADVANTAGE | 2 | 2 |
| BEHIND THE CURTAINS | Needs Brendan ruling (not printed) | 0 |
| NO SPRAY | 2 | 0 |
| BACK IT UP | Needs Brendan ruling (not printed) | 0 |
| POWER UP! | Needs Brendan ruling (not printed) | 0 |
| NO MORE | Needs Brendan ruling (not printed) | 0 |
| BOW DOWN TO THE KING | Needs Brendan ruling (not printed) | 0 |
| BREAKING BREAD | Needs Brendan ruling (not printed) | 0 |
| FIND IT | Needs Brendan ruling (not printed) | 0 |
| SUPERKICK! | Needs Brendan ruling (not printed) | 2 |
| SHOVEL | Needs Brendan ruling (not printed) | 0 |
| PUSH-UP POWER-UP | Needs Brendan ruling (not printed) | 0 |
| PORTAL | Needs Brendan ruling (not printed) | 0 |
| SECOND LIFE | Needs Brendan ruling (not printed) | 0 |
| SLINGSHOT | Needs Brendan ruling (not printed) | 0 |
| RAY GUN | Needs Brendan ruling (not printed) | 0 |
| ATTACK! | Needs Brendan ruling (not printed) | 0 |
| INFINITY GAUNTLET | Needs Brendan ruling (not printed) | 0 |
| POWER STONE | Needs Brendan ruling (not printed) | 2 |
| MIND STONE | Needs Brendan ruling (not printed) | 0 |
| REALITY STONE | Needs Brendan ruling (not printed) | 0 |
| SOUL STONE | Needs Brendan ruling (not printed) | 0 |
| SPACE STONE | Needs Brendan ruling (not printed) | 0 |
| TIME STONE | Needs Brendan ruling (not printed) | 0 |
| TAKE THE L | Needs Brendan ruling (not printed) | 0 |
| SANCTUARY | Needs Brendan ruling (not printed) | 0 |
| QUICKSAND | Needs Brendan ruling (not printed) | 0 |
| CHUG JUG | Needs Brendan ruling (not printed) | 0 |
| TRAINING ARC | Needs Brendan ruling (not printed) | 0 |
| BOOMERANG | Needs Brendan ruling (not printed) | 0 |
| MONGOL EMPIRE | Needs Brendan ruling (not printed) | 2 |
| GIDDY UP | Needs Brendan ruling (not printed) | 0 |
| THE FORGE | Needs Brendan ruling (not printed) | 0 |
| POCKET KNIFE | Needs Brendan ruling (not printed) | 0 |
| BARBED WIRE STEEL CHAIR | Needs Brendan ruling (not printed) | 0 |
| TRIDENT | Needs Brendan ruling (not printed) | 0 |
| LUCILLE | Needs Brendan ruling (not printed) | 0 |
| AVENGERS TOWER | Needs Brendan ruling (not printed) | 0 |
| ROCK, PAPER, SCISSORS | Needs Brendan ruling (not printed) | 0 |
| UNDERDOG UPGRADE | Needs Brendan ruling (not printed) | 0 |
| ZOMBIE HORDE | Needs Brendan ruling (not printed) | 0 |
| LOW BLOW! | Needs Brendan ruling (not printed) | 2 |
| REFRESH PAGE | Needs Brendan ruling (not printed) | 0 |
| DISARM | Needs Brendan ruling (not printed) | 0 |
| FRIENDSHIP SPEECH | Needs Brendan ruling (not printed) | 0 |
| PLANK POWER | Needs Brendan ruling (not printed) | 0 |
| UNO REVERSE | Needs Brendan ruling (not printed) | 0 |
| BIG RED CAR | Needs Brendan ruling (not printed) | 0 |
| BATMOBILE | Needs Brendan ruling (not printed) | 0 |
| INDY'S WHIP | Needs Brendan ruling (not printed) | 0 |
| BATARANG | Needs Brendan ruling (not printed) | 0 |
| FREEZE GUN | Needs Brendan ruling (not printed) | 0 |
| FRYING PAN | Needs Brendan ruling (not printed) | 0 |
| QUINJET | Needs Brendan ruling (not printed) | 0 |
| CAPPED! | Needs Brendan ruling (not printed) | 0 |
| CLAP CATCH | Needs Brendan ruling (not printed) | 0 |
| NUKE | Needs Brendan ruling (not printed) | 0 |
| MIND CONTROL | Needs Brendan ruling (not printed) | 0 |
| FLIP THE SCRIPT | Needs Brendan ruling (not printed) | 2 |
| STEROIDS | Needs Brendan ruling (not printed) | 0 |
| SNACK ATTACK | Needs Brendan ruling (not printed) | 0 |
| CLARINET | Needs Brendan ruling (not printed) | 0 |
| THE DEALERSHIP | Needs Brendan ruling (not printed) | 0 |
| BRICK WALL | Needs Brendan ruling (not printed) | 2 |
| SANTA'S SLEIGH | Needs Brendan ruling (not printed) | 0 |
| HEISENBERG'S RV | Needs Brendan ruling (not printed) | 0 |
| POWER OUTAGE | Needs Brendan ruling (not printed) | 0 |
| ROTATE & RESET | Needs Brendan ruling (not printed) | 0 |
| CREDIT CARD | Needs Brendan ruling (not printed) | 0 |
| TRUST THE DECK | Needs Brendan ruling (not printed) | 0 |
| KICK-OUT!! | Needs Brendan ruling (not printed) | 2 |
| CATAPULT | Needs Brendan ruling (not printed) | 0 |
| GYM | Needs Brendan ruling (not printed) | 0 |
| LOOKOUT TOWER | Needs Brendan ruling (not printed) | 0 |
| SWITCH MARKET | Needs Brendan ruling (not printed) | 0 |
| NEXUS TREE | Needs Brendan ruling (not printed) | 0 |
| BRIDGE | Needs Brendan ruling (not printed) | 0 |
| VOID | Needs Brendan ruling (not printed) | 0 |
| BLIND BULLSEYE | Needs Brendan ruling (not printed) | 0 |
| PENCIL | Needs Brendan ruling (not printed) | 0 |
| ERASER | Needs Brendan ruling (not printed) | 0 |
| KATANA | Needs Brendan ruling (not printed) | 0 |
| HULKBUSTER | Needs Brendan ruling (not printed) | 0 |
| MJOLNIR | Needs Brendan ruling (not printed) | 0 |
| STORMBREAKER | Needs Brendan ruling (not printed) | 0 |
| AANG GLIDER | Needs Brendan ruling (not printed) | 0 |
| SLING RING | Needs Brendan ruling (not printed) | 0 |
| CLOAK OF LEVITATION | Needs Brendan ruling (not printed) | 0 |
| CAPTAIN FEATHERSWORD'S SWORD | Needs Brendan ruling (not printed) | 0 |
| BACKPACK | Needs Brendan ruling (not printed) | 0 |
| MAP | Needs Brendan ruling (not printed) | 0 |
| KRYPTONITE | Needs Brendan ruling (not printed) | 0 |
| FEBREZE | Needs Brendan ruling (not printed) | 0 |
| MILANO | Needs Brendan ruling (not printed) | 0 |
| YAKA ARROW | Needs Brendan ruling (not printed) | 0 |

## Separate Section: Unfinished, Excluded, or Unclear

### Explicitly excluded / not yet finalized in source text
- Daryl's Crossbow
- Benatar
- Anti-Flying Power Card
- Any unfinalized or not-yet-set content listed in rulebook exclusions

### Finalized but currently unclear for digital timing/targeting/rules (needs Brendan ruling before coding)
- BREAKING BREAD (taxonomy and assembly boundaries)
- INFINITY GAUNTLET (exact equip/move timing boundaries)
- ROTATE & RESET (global controller/king reassignment edge cases)
- VOID (mandatory-on-draw + off-board subsystem details)
- PENCIL / ERASER (mutable card text model and permanence boundaries)
- KATANA, HULKBUSTER, MJOLNIR, STORMBREAKER, AANG GLIDER, CLOAK OF LEVITATION, CAPTAIN FEATHERSWORD'S SWORD (timing labels not explicitly printed in extracted section)
- Any physically-performed challenge cards needing digital replacements: FIND IT, PUSH-UP POWER-UP, PLANK POWER, CLAP CATCH, SNACK ATTACK, BLIND BULLSEYE, WATER BOTTLE

## Approved First Digital Power Card Alpha Deck

Status: Approved

### Approved exact first Alpha Deck size
- 20 total physical card instances

### Approved Alpha decklist (complete)
- SUPER BAT x2
- BOOM !! BOMB x2
- CHAMPION'S ADVANTAGE x2
- SUPERKICK! x2
- LOW BLOW! x2
- POWER STONE x2
- FLIP THE SCRIPT x2
- BRICK WALL x2
- KICK-OUT!! x2
- MONGOL EMPIRE x2

### Approved Alpha implementation tracking (10 cards)

| Card Name | Official Physical Print Count | Alpha Inclusion Count | Alpha Status | Implementation Status | Format | Timing |
|---|---:|---:|---|---|---|---|
| SUPER BAT | 2 | 2 | Approved for First Digital Alpha | Planned | Battle-focused Alpha | Battle Phase only |
| BOOM !! BOMB | 2 | 2 | Approved for First Digital Alpha | Planned | Battle-focused Alpha | Battle Phase only |
| CHAMPION'S ADVANTAGE | 2 | 2 | Approved for First Digital Alpha | Planned | Battle-focused Alpha | Battle Phase only |
| SUPERKICK! | Needs Brendan ruling (not printed) | 2 | Approved for First Digital Alpha | Planned | Battle-focused Alpha | Battle Phase only |
| LOW BLOW! | Needs Brendan ruling (not printed) | 2 | Approved for First Digital Alpha | Planned | Battle-focused Alpha | Battle Phase only |
| POWER STONE | Needs Brendan ruling (not printed) | 2 | Approved for First Digital Alpha | Planned | Battle-focused Alpha | Battle Phase only |
| FLIP THE SCRIPT | Needs Brendan ruling (not printed) | 2 | Approved for First Digital Alpha | Planned | Battle-focused Alpha | Battle Phase only |
| BRICK WALL | Needs Brendan ruling (not printed) | 2 | Approved for First Digital Alpha | Planned | Battle-focused Alpha | Battle Phase only |
| KICK-OUT!! | Needs Brendan ruling (not printed) | 2 | Approved for First Digital Alpha | Planned | Battle-focused Alpha | Battle Phase only |
| MONGOL EMPIRE | Needs Brendan ruling (not printed) | 2 | Approved for First Digital Alpha | Planned | Battle-focused Alpha | Battle Phase only |

### Viable later, but requires additional subsystem work

| Card Name | Official Copy Count | Proposed Alpha Inclusion Count | Timing | Reason |
|---|---:|---:|---|---|
| TAG TEAM | 2 | 0 | Battle Phase only | Needs behind-adjacency + relevant-stat helper logic |
| MYSTERY CARD | 2 | 0 | reaction / interrupt | Needs pre-reveal battle timing window + random deck stat transfer |
| NO SPRAY | 2 | 0 | reaction / interrupt | Reaction/interrupt stack not implemented in first alpha |
| PORTAL | Needs Brendan ruling | 0 | Board Phase only | Needs board-target relocation subsystem |
| SECOND LIFE | Needs Brendan ruling | 0 | reaction / interrupt | Reaction/interrupt stack not implemented in first alpha |
| POWER UP! | Needs Brendan ruling | 0 | either phase | Needs real Power deck draw/discard pipeline |
| DISARM | Needs Brendan ruling | 0 | either phase | Needs attachment/equipment subsystem |
| FRIENDSHIP SPEECH | Needs Brendan ruling | 0 | Battle Phase only | Needs battle-cancel branch and draw integration |
| TRUST THE DECK | Needs Brendan ruling | 0 | Battle Phase only | Needs reveal-top-power-card and immediate-play legality resolver |
| SHOVEL | Needs Brendan ruling | 0 | Board Phase only | Needs graveyard revive + placement subsystem |
| SANCTUARY | Needs Brendan ruling | 0 | Board Phase only | Needs location placement and turn-based lock status |
| QUICKSAND | Needs Brendan ruling | 0 | Board Phase only | Needs location trap/debuff timers |

## Approved First Digital Alpha Rules

### General battle modifier rule
- Power Cards resolve in the exact order they are played.
- Standard plus/minus modifiers stack cumulatively.
- Modifiers stay attached to their named ATK or DEF stat for the duration of that battle unless a card explicitly says otherwise.
- Reaction/interrupt cards are excluded from the first Alpha because response-stack rules are not implemented yet.

### FLIP THE SCRIPT
- When played, each battling character swaps their current effective ATK and DEF values at that exact moment.
- Future cards modify the stat label as it exists after the swap.
- A second FLIP THE SCRIPT swaps the current effective values again.
- The battle type itself does not change.

### KICK-OUT!!
- It may be played only while its controller is currently losing the battle.
- It sets the controller’s currently used comparison stat equal to the opponent’s current corresponding comparison value at that exact moment.
- Later Power Cards may still change either side’s values.
- A resulting tie uses normal battle tie rules, including King Tie Advantage where applicable.

### MONGOL EMPIRE
- Include Genghis Khan’s printed permanence branch in Alpha v1.
- The implementation must not ignore the special Genghis Khan rule.
- Mark this as requiring persistent-stat-modifier support.

### BRICK WALL
- Include the Kool-Aid Man exception in Alpha v1.
- Mark it as an explicit engine legality exception, not flavor text.

## Future Expansion Structure

- New Character batches can be added to OFFICIAL_CARD_REGISTRY.md and then added to future selectable character pools.
- New Power Card batches can be added to OFFICIAL_POWER_CARD_REGISTRY.md and then added to future deck presets.
- Each card can be tagged as: supported now, requires mechanic, needs ruling, or excluded from current format.
- Future Session Mode is not being implemented now, but should eventually sit above normal matches and track used/unavailable cards across multiple games in one session.

## Remaining Brendan Decisions Before Coding

1. Confirm official physical print counts for cards where count is not explicitly printed in the extracted text.
2. Confirm whether any non-approved card should be added to (or swapped into) the first 20-card Alpha deck preset.
3. Confirm any additional edge-case ordering rules beyond the approved stacking/swap/equalization rules above.
