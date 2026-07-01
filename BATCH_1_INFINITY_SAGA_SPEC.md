# Batch 1 Infinity Saga / Stones Spec

Scope cards:

- Thanos
- Infinity Gauntlet
- Space Stone
- Mind Stone
- Soul Stone
- Time Stone
- Reality Stone
- Power Stone (already in game, treated as one of the Infinity Stones)

## Thanos (finalized)

Character text basis:

- When Thanos crosses a territory line, he collects Infinity Stones.
- With Infinity Gauntlet equipped and crossing, he can collect all stones no matter where they are.

Final rulings from user:

1. Trigger window:

- Triggers only the first time Thanos crosses a territory line in that game.
- Crossing can be forward or backward.
- Crossing can happen through normal movement, power-card movement, or ability movement.
- Trigger still applies even if Thanos is frozen and is repositioned across territory by another effect.

2. Ownership at trigger time:

- Stones go to the hand of whoever currently controls Thanos at the crossing moment.
- If Thanos is temporarily mind-controlled at that moment, stones go to that controller.
- If Thanos switches teams later, already-collected stones stay with the player who received them.

3. Stones are not attachments:

- Infinity Stones are power cards in hand/decks/piles.
- They are not permanently attached to characters.

4. Without Infinity Gauntlet equipped:

- Multi-game session:
  - Collect remaining available Infinity Stone cards from the active power deck.
  - If none are left there, search backup power deck.
- Single game:
  - Collect Infinity Stone cards from the power deck only.
  - Do not pull stones from players' hands or used power-card pile.

5. With Infinity Gauntlet equipped:

- On first crossing trigger, collect all Infinity Stone cards from anywhere.
- Anywhere includes: players' hands, used power-card pile, used session deck, backup deck, power deck, and any other card zone.

6. Gauntlet interaction edge case:

- If Infinity Gauntlet is equipped to someone else when Thanos crosses, Thanos does not auto-take Gauntlet.
- Thanos only collects stones according to the rules above.

7. Animation requirements:

- Long, epic cinematic presentation.
- Space/galaxy background with star shimmer.
- Cinematic deck flip-through.
- Stone color trails:
  - Power: purple
  - Mind: yellow
  - Time: green
  - Reality: red
  - Space: blue
  - Soul: orange
- Stones swirl onscreen for about 7 seconds, then fly into collecting player's hand.

## Pending cards in this batch

- Infinity Gauntlet (finalized)
- Space Stone (finalized)
- Mind Stone (finalized)
- Soul Stone (finalized)
- Time Stone (finalized)
- Reality Stone (finalized)
- Power Stone (finalized)

Count baseline for this batch:

- All Infinity Stones have count = 1 unless user explicitly overrides.
- Global deck fallback rule for this batch/system: if a required top-card draw deck is empty, use backup deck.

## Infinity Gauntlet (finalized)

Power card text basis:

- Temporarily equip to any character.
- Base bonus: +4 ATK / +2 DEF while equipped.
- Infinity set branch: with all 6 Infinity Stones, add extra +3 ATK / +3 DEF.

Final rulings from user:

1. Targeting / equip scope:

- Follows weapon default rules.
- May be equipped to any character: own or opponent, revealed or unrevealed.

2. Timing to play/equip:

- Can be newly played/equipped any time, including battle and regular board turn.
- User-defined global meaning: "anytime" includes both battle screen and main board view.

3. Temporary equip / moving behavior:

- Moving the Gauntlet is done by unequipping it back to hand, then replaying/equipping it to another character.
- Unequip is not allowed during battle.
- Unequip is allowed outside battle.
- This temporary-unequip pattern should be the default for future temporarily-equipped weapons unless card text says otherwise.

4. Attachment coexistence:

- Gauntlet can coexist with other attachments (same as weapon defaults).

5. Stat effect behavior:

- +4 ATK / +2 DEF behaves like other weapons: active only while equipped; removed immediately when no longer equipped.

6. +3/+3 Infinity set bonus activation:

- Bonus activates permanently if Gauntlet was equipped to Thanos when Thanos makes his qualifying territory-cross trigger.
- Bonus also activates permanently once that player has had each stone in hand at some point during that game.
- Once activated, bonus stays on Gauntlet for rest of game.

7. +3/+3 bonus recipient:

- Bonus is on the Gauntlet itself only, not team-wide.
- Whoever is wielding Gauntlet gets the bonus.

8. Mid-battle timing:

- If bonus condition is reached during battle, bonus applies immediately mid-battle.

9. Thanos interaction boundary:

- Thanos crossing does not auto-take Gauntlet from another character.
- Gauntlet holder keeps it unless manually unequipped or moved by another card effect.

10. Ownership/control interactions:

- Gauntlet follows the character it is equipped to through control/team changes.

11. Animation requirements:

- Equip animation should be cinematic.
- On equip, wielder card is electrified with Infinity Stone colors for about 5 seconds.

## Space Stone (finalized)

Power card text basis:

- On your turn: move your character to any open spot.
- That character gains +2 ATK as a persistent attachment bonus while alive.

Final rulings from user:

1. Targeting:

- Can only be played on your own character (text-locked by "your character").

2. Timing and action economy:

- Board phase only.
- Not playable in battle/reaction windows.
- Behaves like Portal for relocation pattern, but is an attachment-based bonus card.
- Playing Space Stone does not consume your turn action; player must still make a legal action afterward.

3. Destination:

- Any open spot on the ring is legal.

4. King interaction:

- Can target Kings.
- If relocation crosses territory border in any direction, king-cross draw rule applies (including animations).

5. Frozen interaction:

- Space Stone can move a frozen character.
- Portal can move a frozen character.
- Back It Up cannot move a frozen character.

6. Attachment and persistence:

- Space Stone is attached to the character as a power card attachment.
- Bonus persists while that character is alive in that game.
- Detaches on character death.
- If character is revived later, Space Stone is not reattached automatically.

7. Quantity rule:

- There is only 1 Space Stone.
- User default rule for new cards in this batch: card count defaults to 1 unless user says otherwise.

8. Thanos first-cross interaction:

- Space Stone movement can trigger Thanos first-cross stone-collection logic.
- Portal and Back It Up movement can also trigger Thanos first-cross logic.

9. Session scope:

- Space Stone bonus applies only within current game.
- It does not persist across games in multi-game sessions.

10. Animation requirements:

- Use Portal-style movement presentation.
- Portal visuals should be dark blue for Space Stone effect.

## Mind Stone (finalized)

Power card text basis:

- Any time, including battle.
- Reveal all face-down Character Cards and both players' current Power Cards.
- Character Cards revealed by this effect stay revealed for rest of current game.
- Future-drawn Power Cards remain hidden unless revealed by another effect.

Final rulings from user:

1. Timing:

- Can be played any time.
- Turn ownership/timing does not restrict play.

2. Power-card reveal scope:

- Reveals only cards in both players' hands at that current moment.
- Those specific currently-held cards remain revealed for rest of current game.
- New Power Cards drawn after Mind Stone resolves remain hidden/unrevealed.

3. Character reveal scope:

- Character Cards currently on the board at Mind Stone resolution become revealed.
- They stay revealed for rest of current game only.

4. Session scope:

- Mind Stone effects apply only to current game.
- No persistence into later games in same session.

5. BTC interaction:

- Behind the Curtains still works normally.
- BTC can inspect/swap newly drawn cards after Mind Stone (those post-Mind-Stone cards are still hidden by default).

6. On-reveal abilities:

- Any on-reveal abilities from cards revealed by Mind Stone should trigger.

7. Counter priority and hidden-info safety:

- If responder has a valid counter (for example NO SPRAY in hand and/or revealed Iroh counter path), counter prompts must appear and resolve before Mind Stone reveal executes.
- This counter-before-reveal safety pattern should apply to future counter cards too, to prevent irreversible hidden-information leakage.

8. Multiplayer seat privacy behavior:

- In multiplayer, Mind Stone temporarily overrides seat privacy for the cards it reveals at resolve time.
- It does not auto-reveal cards that enter the game later.

9. Animation requirements:

- When played and not countered, transition to full-board view including power cards.
- Whole screen slowly flashes yellow.
- All affected cards flip to reveal if not already revealed.
- Then return to prior screen and continue play.

## Soul Stone (finalized)

Power card text basis:

- During battle: sacrifice one living character to add +5 ATK or +5 DEF this battle.
- Sacrificing your King loses the game.

Final rulings from user:

1. Sacrifice target ownership:

- Can sacrifice only your own living characters.

2. Legal sacrifice targets:

- Cannot sacrifice either battling main character.
- Legal targets are allied main board characters (revealed or unrevealed) that are alive.
- Cannot sacrifice attachments or followers.

3. Battle flow and UI:

- Follows normal during-battle power-card flow from battle screen.
- Player selects Soul Stone and plays card.
- Flow moves to full-board view for legal target pick.
- Clicking legal character opens character view with confirmation.
- On confirm, selected character dies and goes to graveyard.
- Then return to battle screen with Soul Stone modifier applied.

4. Attachment cleanup on sacrificed character:

- If sacrificed character had attachments:
  - attached power cards go to used power-card pile
  - attached characters go to graveyard

5. Buff target:

- +5 ATK or +5 DEF applies to your currently battling main character for duration of that battle only.

6. Battler sacrifice restriction:

- Current battling character cannot be selected as sacrifice target.

7. King sacrifice hard-fail:

- If player sacrifices their King, game ends immediately and that player loses.
- Bot rule: bot should never choose a king sacrifice line.

8. Counter ordering and hidden-info safety:

- Opponent counters must resolve before sacrifice completes.
- This prevents accidental reveal/death side effects from happening before a valid counter negates Soul Stone.

9. Death typing and graveyard behavior:

- Sacrifice is treated like regular battle death handling for graveyard flow.
- Graveyard animation should play for sacrificed card after confirmation.

10. Session behavior:

- Normal current-game-only behavior; no special cross-game session carryover.

11. Animation requirements:

- Dark/orange soul siphon from sacrificed card.
- Soul energy transfers into current battling character.
- Cinematic duration about 7 seconds.

## Time Stone (finalized)

Power card text basis:

- Immediately after an action is completed: reverse the most recent completed action.
- Restore board/cards/graveyard/attachments/power effects to state before that action.
- Cannot reverse playing Time Stone itself.

Final rulings from user:

1. Activation targeting model:

- No separate response timer window.
- Time Stone always applies to whatever is currently the previous action in the battle event log or game event log.
- Before confirming play, power-card view must display the exact most recent action text that will be reversed.

2. Eligible action scope:

- Included actions: normal move, attack, self-defend, any power-card play and resolution, character special abilities, battle resolve step.
- No excluded action types.

3. Chain behavior:

- Nested/stacked rewind semantics are allowed.
- Time Stone can reverse an action that was itself part of a previous interrupt/rewind-modified line.

4. Hidden information rollback:

- Rewind fully restores prior hidden/visible state (re-hide if previously hidden).

5. Draw/search/shuffle rollback:

- Rewind restores exact prior hand contents and exact prior deck order/state.

6. Death/graveyard rollback:

- Rewind restores characters, attachments, graveyard and related state exactly to pre-action snapshot.

7. Game-over boundary:

- If king dies and game-over is reached, Time Stone cannot be used to reverse it.

8. Quantity:

- Only 1 Time Stone.

9. Multiplayer behavior:

- Rewind applies to both players' shared game state to before that action.

10. Animation requirements:

- Green time vortex.
- Reversed motion trails.
- Board rewind tick-back effect.
- Cinematic duration about 7 seconds.

11. Rewinding a power-card play:

- If Time Stone rewinds a power card being played, that power card returns to the original player's hand.

## Reality Stone (finalized)

Power card text basis:

- Any time, including battle.
- Change any one card into the top card of its matching deck.
- Character -> top Character Card; Power -> top Power Card.
- Attachments stay attached to changed character.
- If a Flying Vehicle is changed while rider is above someone, rider falls and dies.

Final rulings from user:

1. Target scope:

- Can target any card on either team.

2. Zone scope:

- "Any card" is literal.
- All cards should be targetable/clickable with card-view inspection while Reality Stone is being resolved.
- Includes cards in graveyard, used power-card pile, and top card in a deck.

3. Top-card transform source:

- Character target transforms into top card of Character deck.
- Power target transforms into top card of Power deck.

4. Empty-deck fallback:

- If required deck is empty, use backup deck.
- This backup fallback applies as a global rule for deck-draw effects unless explicitly overridden.

5. Attachment behavior:

- Attachments stay attached to transformed characters.

6. Reveal-state continuity:

- Transformed card keeps the reveal state of the original target.

7. On-reveal triggers:

- If transformed result is in revealed state, on-reveal abilities trigger immediately.

8. King transformation:

- If a King is transformed, the resulting transformed character is that player's King.

9. Counter ordering:

- Counter prompts resolve before Reality Stone transformation executes.

10. Flying vehicle clause:

- Keep the rider-falls-and-dies handling as specified for future flying-vehicle support.

11. Time Stone interaction:

- Time Stone can fully rewind Reality Stone transformation results.

12. Animation requirements:

- Red reality-warp distortion.
- Card glitch/morph sequence.
- Board ripple.
- Cinematic duration about 7 seconds.

## Power Stone (Infinity integration finalized)

Power card text basis:

- During battle: add +2 ATK or +2 DEF this battle.

Final rulings from user:

1. Count:

- Power Stone count is 1.

2. Core gameplay effect:

- Keep the existing +2 ATK / +2 DEF during-battle effect.

3. Infinity hand-history tracking:

- If a player has Power Stone in hand at any point in a game, that permanently counts toward Gauntlet "had each stone in hand" condition for that player in that game.
- Brief possession still counts (drawn then immediately moved/stolen/discarded).

4. Thanos collection linkage:

- If Thanos collection pulls Power Stone into hand, that immediately counts for hand-history condition.

5. Mind Stone interaction:

- Mind Stone reveal of Power Stone follows normal Mind Stone behavior only (no special extra effect).

6. Time Stone rewind interaction:

- If Power Stone play is rewound, Power Stone returns to original player's hand and its temporary +2 battle modifier is removed with the rewind.

7. Ownership/swaps and history credit:

- If Power Stone moves between players' hands (for example BTC swap), each player who held it in hand receives hand-history credit.

8. Visual identity:

- No extra Infinity badge/tag required in visible UI.
- Internal tracking metadata for stone identity is allowed.

9. Animation requirements:

- Purple blast/surge effect around the card when played.
- Duration about 5 seconds.

## Batch 1 Status

All Batch 1 cards finalized at design-rules level:

- Thanos
- Infinity Gauntlet
- Space Stone
- Mind Stone
- Soul Stone
- Time Stone
- Reality Stone
- Power Stone (Infinity integration)