Roundtable Rumble

Test Suite: Board movement and interaction tests for Roundtable Rumble

1. Forward from Y1 goes to Y2.
2. Forward from Y2 goes to Y3.
3. Forward from Y3 goes to Y4.
4. Forward from Y4 goes to Y5.
5. Forward from Y5 goes to A5.
6. Forward from A5 goes to A4.
7. Forward from A4 goes to A3.
8. Forward from A3 goes to A2.
9. Forward from A2 goes to A1.
10. Forward from A1 goes to Y1.

11. Backward from Y1 goes to A1.
12. Backward from Y2 goes to Y1.
13. Backward from Y3 goes to Y2.
14. Backward from Y4 goes to Y3.
15. Backward from Y5 goes to Y4.
16. Backward from A5 goes to Y5.
17. Backward from A4 goes to A5.
18. Backward from A3 goes to A4.
19. Backward from A2 goes to A3.
20. Backward from A1 goes to A2.

21. A character moving forward from Y5 to A5 crosses from Y territory into A territory.
22. A character moving forward from A1 to Y1 crosses from A territory into Y territory.
23. No other normal one-space forward move is a territory crossing.
24. Territory crossing must be calculated from the board-space ownership and the moving character’s controller, never from screen direction.

25. Attack rule — positive case: an attack action from a character at Y2 can target an ENEMY at Y3 (the directly forward space); attack is allowed.
26. Attack rule — negative case: the character at Y2 cannot attack an ENEMY at Y4 (not directly forward); attack must be disallowed.

27. Self-defend rule — positive case: a character at Y3 can self-defend against an ENEMY at Y2 (directly behind); self-defend allowed.
28. Self-defend rule — negative case: a character at Y3 cannot self-defend against an ENEMY at Y1 (not directly behind); self-defend disallowed.

29. King starting positions: piece placed at Y3 is in-own-territory and its forward movement follows the same loop (Y3→Y4).
30. King starting positions: piece placed at A3 is in-own-territory and its forward movement follows the same loop (A3→A2).

31. Consistency check: for every space X, applying forward then backward returns to X (forward(X) then backward(result) == X).
32. Consistency check: for every space X, applying backward then forward returns to X (backward(X) then forward(result) == X).


Additional power-card and interaction tests:

33. A Y-side King moving from Y5 to A5 draws exactly 1 Power Card.
34. An A-side King moving from A1 to Y1 draws exactly 1 Power Card.
35. A non-King character crossing either territory boundary (Y5→A5 or A1→Y1) does not draw a Power Card.
36. A King moving within its own territory (e.g., Y3→Y4 for Y-side King) does not draw a Power Card.
37. A King moving within enemy territory does not draw an additional Power Card (i.e., crossing only triggers upon the crossing move itself).
38. A Y-side King moving backward from Y1 to A1 draws exactly 1 Power Card.
39. An A-side King moving backward from A5 to Y5 draws exactly 1 Power Card.
40. A Y-side King using a Portal from any Y space to any A space draws exactly 1 Power Card.
41. An A-side King using a Portal from any A space to any Y space draws exactly 1 Power Card.
42. A Y-side King using a teleport effect from Y territory to A territory draws exactly 1 Power Card.
43. An A-side King using a teleport effect from A territory to Y territory draws exactly 1 Power Card.
44. A King moved by an opponent's effect from own territory into enemy territory still draws exactly 1 Power Card.
45. A King moved from enemy territory back into its own territory draws no Power Card.
46. A King moved within enemy territory draws no Power Card.
47. One completed relocation effect can never award more than 1 Power Card.

48. Attack targets an ENEMY directly forward only (attacks cannot target allies or non-adjacent enemies).
49. Self-defend targets an ENEMY directly behind only (self-defend cannot target allies or non-adjacent enemies).
50. An allied character directly forward cannot be attacked through a normal attack (must be blocked by ally presence).
51. An allied character directly behind cannot be self-defended against (self-defend only applies versus ENEMY behind).

Notes:
- All tests assume "forward" and "backward" are defined exclusively by the BOARD PATH loop, not by screen orientation or player side.
- Territory crossing tests rely on static board-space ownership mapping: Y1..Y5 are Y territory; A1..A5 are A territory. Crossing is determined by the origin and destination spaces and the moving character's controller.
- Attack and self-defend tests validate adjacency along the loop: forward adjacency for attack; backward adjacency for self-defend. Targets must be ENEMY characters, not allies.
