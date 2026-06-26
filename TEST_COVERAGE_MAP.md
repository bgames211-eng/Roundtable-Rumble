# Test Coverage Map: BOARD_TESTS.md Requirements

**Last Updated:** 2026-06-25  
**Total Requirements:** 51 explicit + 3 implicit (52-54) = 54 total  
**Coverage Status:** ✅ All 54 covered

---

## Coverage by Requirement

### Group 1: Forward Movement (1-10)

| Req | Requirement | Test Coverage | Type |
|-----|-------------|----------------|------|
| 1 | Forward from Y1 goes to Y2 | Test: "forwards around the loop (1-10)" @ line 15 | Grouped |
| 2 | Forward from Y2 goes to Y3 | Test: "forwards around the loop (1-10)" @ line 16 | Grouped |
| 3 | Forward from Y3 goes to Y4 | Test: "forwards around the loop (1-10)" @ line 17 | Grouped |
| 4 | Forward from Y4 goes to Y5 | Test: "forwards around the loop (1-10)" @ line 18 | Grouped |
| 5 | Forward from Y5 goes to A5 | Test: "forwards around the loop (1-10)" @ line 19 | Grouped |
| 6 | Forward from A5 goes to A4 | Test: "forwards around the loop (1-10)" @ line 20 | Grouped |
| 7 | Forward from A4 goes to A3 | Test: "forwards around the loop (1-10)" @ line 21 | Grouped |
| 8 | Forward from A3 goes to A2 | Test: "forwards around the loop (1-10)" @ line 22 | Grouped |
| 9 | Forward from A2 goes to A1 | Test: "forwards around the loop (1-10)" @ line 23 | Grouped |
| 10 | Forward from A1 goes to Y1 | Test: "forwards around the loop (1-10)" @ line 24 | Grouped |

### Group 2: Backward Movement (11-20)

| Req | Requirement | Test Coverage | Type |
|-----|-------------|----------------|------|
| 11 | Backward from Y1 goes to A1 | Test: "backwards around the loop (11-20)" @ line 29 | Grouped |
| 12 | Backward from Y2 goes to Y1 | Test: "backwards around the loop (11-20)" @ line 30 | Grouped |
| 13 | Backward from Y3 goes to Y2 | Test: "backwards around the loop (11-20)" @ line 31 | Grouped |
| 14 | Backward from Y4 goes to Y3 | Test: "backwards around the loop (11-20)" @ line 32 | Grouped |
| 15 | Backward from Y5 goes to Y4 | Test: "backwards around the loop (11-20)" @ line 33 | Grouped |
| 16 | Backward from A5 goes to Y5 | Test: "backwards around the loop (11-20)" @ line 34 | Grouped |
| 17 | Backward from A4 goes to A5 | Test: "backwards around the loop (11-20)" @ line 35 | Grouped |
| 18 | Backward from A3 goes to A4 | Test: "backwards around the loop (11-20)" @ line 36 | Grouped |
| 19 | Backward from A2 goes to A3 | Test: "backwards around the loop (11-20)" @ line 37 | Grouped |
| 20 | Backward from A1 goes to A2 | Test: "backwards around the loop (11-20)" @ line 38 | Grouped |

### Group 3: Territory Crossing (21-24)

| Req | Requirement | Test Coverage | Type |
|-----|-------------|----------------|------|
| 21 | Y5→A5 is a territory crossing | Test: "Y5->A5 and A1->Y1 are crossings and others are not" @ line 44-45 | Grouped |
| 22 | A1→Y1 is a territory crossing | Test: "Y5->A5 and A1->Y1 are crossings and others are not" @ line 46-47 | Grouped |
| 23 | No other normal one-space forward move is a territory crossing | Test: "Y5->A5 and A1->Y1 are crossings and others are not" @ line 50 | Grouped |
| 24 | Territory crossing determined by ownership & controller, not screen direction | Test: "Y5->A5 and A1->Y1 are crossings and others are not" @ line 43-50 | Grouped |

### Group 4: Attack & Self-Defend Adjacency (25-28)

| Req | Requirement | Test Coverage | Type |
|-----|-------------|----------------|------|
| 25 | Attack Y2→Y3 (ENEMY forward) allowed | Test: "can attack directly forward only and self-defend directly behind only" @ line 53 | Grouped |
| 26 | Attack Y2→Y4 (not directly forward) disallowed | Test: "can attack directly forward only and self-defend directly behind only" @ line 54 | Grouped |
| 27 | Self-defend Y3 vs Y2 (ENEMY behind) allowed | Test: "can attack directly forward only and self-defend directly behind only" @ line 56 | Grouped |
| 28 | Self-defend Y3 vs Y1 (not directly behind) disallowed | Test: "can attack directly forward only and self-defend directly behind only" @ line 57 | Grouped |

### Group 5: King Starting Positions (29-30)

| Req | Requirement | Test Coverage | Type |
|-----|-------------|----------------|------|
| 29 | King at Y3 in own territory; forward = Y4 | Test: "kings start in Y3 and A3 and follow loop" @ line 62-63 | Grouped |
| 30 | King at A3 in own territory; forward = A2 | Test: "kings start in Y3 and A3 and follow loop" @ line 64-65 | Grouped |

### Group 6: Consistency Checks (31-32)

| Req | Requirement | Test Coverage | Type |
|-----|-------------|----------------|------|
| 31 | Forward then backward returns same space | Test: "forward then backward returns same space" @ line 70-71 | Grouped |
| 32 | Backward then forward returns same space | Test: "forward then backward returns same space" @ line 71 | Grouped |

### Group 7: King Territory Draw - Core Tests (33-47, 52-54)

| Req | Requirement | Test Coverage | Type |
|-----|-------------|----------------|------|
| 33 | Y King Y5→A5 forward draws 1 | Test: "King crossing via forward draws (33,34)" @ line 76 | Grouped |
| 34 | A King A1→Y1 forward draws 1 | Test: "King crossing via forward draws (33,34)" @ line 77 | Grouped |
| 35 | Non-King Y5→A5 or A1→Y1 no draw | Test: "non-king crossing does not draw (35)" @ line 81 | Grouped |
| 36 | King within own territory no draw | Test: "king moving within own or enemy territory does not draw (36,37)" @ line 85 | Grouped |
| 37 | King within enemy territory no extra draw | Test: "king moving within own or enemy territory does not draw (36,37)" @ line 86 | Grouped |
| 38 | Y King Y1→A1 backward draws 1 | Test: "backward king moves crossing draws" @ line 105-106 | Grouped |
| 39 | A King A5→Y5 backward draws 1 | Test: "backward king moves crossing draws" @ line 107 | Grouped |
| 40 | Y King Portal Y→A draws 1 | Test: "portal and teleport style moves trigger when crossing from own->enemy" @ line 111 | Grouped |
| 41 | A King Portal A→Y draws 1 | Test: "portal and teleport style moves trigger when crossing from own->enemy" @ line 112 | Grouped |
| 42 | Y King teleport Y→A draws 1 | Test: "portal and teleport style moves trigger when crossing from own->enemy" @ line 111 | Grouped |
| 43 | A King teleport A→Y draws 1 | Test: "portal and teleport style moves trigger when crossing from own->enemy" @ line 112 | Grouped |
| 44 | King moved by opponent Y→A draws 1 | Test: "king moved by opponent effect into enemy territory still draws" @ line 116-117 | Grouped |
| 45 | King moved A→own territory no draw | Test: "king moved from enemy back into own draws no card" @ line 121-122 | Grouped |
| 46 | King moved within enemy territory no draw | Test: "king moved within enemy territory draws no card" @ line 126-127 | Grouped |
| 47 | One relocation ≤ 1 card award | Test: "one relocation effect cannot award more than 1 card (single evaluation)" @ line 131-135 | Grouped |
| 52 | King defeats enemy moves into enemy draws 1 | Test: "king defeats enemy and moves into enemy draws exactly 1 (52,53)" @ line 90-91 | Grouped |
| 53 | King defeats enemy (other side) draws 1 | Test: "king defeats enemy and moves into enemy draws exactly 1 (52,53)" @ line 92 | Grouped |
| 54 | King loses/ties attack, no move, no draw | Test: "king attacks across border but loses or ties does not move and draws no card (54)" @ line 96 | Grouped |

### Group 8: Attack/Self-Defend Target Rules (48-51)

| Req | Requirement | Test Coverage | Type |
|-----|-------------|----------------|------|
| 48 | Attack targets ENEMY directly forward only | Test: "attack targets ENEMY directly forward only" @ line 140-141 | Grouped |
| 49 | Self-defend targets ENEMY directly behind only | Test: "self-defend targets ENEMY directly behind only" @ line 145-146 | Grouped |
| 50 | Allied forward cannot be attacked | Test: "allied forward cannot be attacked and allied behind cannot be self-defended" @ line 150 | Grouped |
| 51 | Allied behind cannot be self-defended | Test: "allied forward cannot be attacked and allied behind cannot be self-defended" @ line 151 | Grouped |

---

## Summary Statistics

- **Total Requirements:** 54 (51 explicit in BOARD_TESTS.md + 3 implicit referenced in tests)
- **Individual Tests:** 0
- **Grouped Tests:** 54 (all requirements tested within grouped test suites)
- **Uncovered Requirements:** 0
- **Coverage:** 100%

## Notes

### Implicit Requirements (52-54)
Requirements 52, 53, and 54 are referenced in test names but not explicitly numbered in BOARD_TESTS.md:
- **Req 52-53:** Referenced in test "king defeats enemy and moves into enemy draws exactly 1 (52,53)"
- **Req 54:** Referenced in test "king attacks across border but loses or ties does not move and draws no card (54)"

These requirements are inferred from the test implementations and represent edge cases for the King Territory Draw mechanic.

### Coverage Type Distribution
- **Grouped Tests:** All 54 requirements are tested as assertions within larger grouped test suites
- **Dedicated Tests:** None of the requirements have a dedicated isolated test

### Test File Organization
All tests are contained in `src/board.test.ts` within 8 describe blocks:
1. Board path basic movement (1-10)
2. Backward movement (11-20)
3. Territory crossing explicit checks (21-24)
4. Attack and self-defend adjacency (25-28)
5. King starting positions (29-30)
6. Consistency checks (31-32)
7. King Territory Draw core tests (33-37, 52-54 and additions)
8. Attack/self-defend target rules (38-41, 48-51)
