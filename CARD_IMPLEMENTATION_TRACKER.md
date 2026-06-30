# Card Implementation Tracker

Status legend: `todo` | `in-progress` | `done` | `blocked`

## Requested Characters

| Character | Status | Notes |
|---|---|---|
| Riddler | done | uses bottom character-deck card stats each battle; consumed source card goes to graveyard |
| Roomba | done | added to character pool; revealed movement draw implemented |
| Genghis Khan | done | added to character pool; MONGOL EMPIRE branch already supported |
| Kool-Aid Man | done | added to character pool; BRICK WALL legality already checks name |
| Ant | done | added to character pool; battle-win draw implemented |
| Jeremy Jahns | done | character-view top-3 power-card reveal/select-1; other 2 shuffled back |
| Nightcrawler | done | added to character pool; teleport move ability implemented |
| Skar Productions | done | post-battle prompt to reclaim one played power card |
| SpongeBob | in-progress | added to character pool; Mrs. Puff auto-win branch implemented; vehicle clauses still pending |
| Mrs. Puff | done | added to character pool; once-per-game puff special implemented |
| Carl Grimes | done | passive +2 ATK/DEF applies to both Rick and Carl only while both are alive and revealed; label auto-shows and auto-removes |
| Cedi Osman | done | added to character pool |
| Bird | done | added to character pool; no ability text for now |
| LEGO Cap / Captain America | done | added to character pool |
| The Penguin | done | added to character pool |
| Mr. Freeze | done | added to character pool |
| Bob | done | added to character pool |
| Sokka | done | added to character pool |
| Avatar Aang | done | optional post-battle escape flow with permanent stat penalty label |
| Uncle Iroh | done | character-view 30s counter window that cancels opponent power cards |
| Zuko | done | added to character pool |
| Rapunzel | done | added to character pool; once-per-game pull special implemented |

## Requested Power Cards

| Power Card | Status | Notes |
|---|---|---|
| Tag Team | done | battle legality + directly-behind relevant-stat bonus implemented |
| Phone a Friend | done | battle deck swap-in implemented with target selection support in engine and bot options |
| Swap Characters | done | board targeting + swap execution + king-transfer flow implemented |
| Behind the Curtains | done | board hand-inspection modal + optional one-for-one hand swap implemented |
| No Spray | done | battle reaction implemented to cancel latest cancelable opponent in-battle card effect |
| Back It Up | done | board targeting + backward relocation flow implemented |
| Portal | done | board targeting + open-space relocation flow implemented |

## Requested Weapon Power Cards

| Weapon Card | Status | Notes |
|---|---|---|
| Freeze Gun | in-progress | stats attachment + manual one-time Mr. Freeze special trigger implemented; dedicated equipped-card click UX polish still pending |
| Ray Gun | done | weapon stat attachment implemented |
| Pocket Knife | done | weapon stat attachment implemented |
| Batarang | done | weapon stats + always-on Batman -2 DEF battle effect implemented; opponent-target equip supported |
| Frying Pan | done | weapon stats + Rapunzel bonus ATK implemented |

## Implemented Rule Milestones

- Unlimited attachment stack enabled for characters.
- Weapon equip supports targeting own battler or opponent battler.
- Attachment stat bonuses persist while attached.
- Frozen status blocks Move/Attack/Self-Defend.
- Start-of-turn break-free rule implemented for the "only blocked frozen move" case.
- Break-free visual thaw animation (ice shatter/melt) added on card unfreeze.
- Attachment mini-card rendering added to board and battle views.
- Frozen visual overlay added on cards.
- Freeze Gun special behavior set to cancel-only (no reverse behavior is planned for No Spray).
