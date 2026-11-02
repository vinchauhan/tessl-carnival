---
name: add-midway-character
description: Add a character who walks around the Tessl Carnival midway, such as a juggling clown, a mascot or a balloon seller, following the clown and visitor pattern. Use when asked to add a character, person, performer or anyone else who moves around the carnival map.
---

# Add a midway character

Characters live on the midway map, not in a game, so they go in `src/midway/`
and never in `src/games/`. The juggling clown is the pattern to copy: read
`createClown`, `updateClown` and `drawClown` first.

## Steps

1. **Movement goes in `world.ts`** as plain functions, so Vitest can run them.
   A character is a `Walker` (or extends it, as `Visitor` does). Give it a
   `create<Name>(map, random)` and an `update<Name>(map, character, dt, random)`
   that picks where to go with `findPath` and moves with `followPath`. Take
   `random` as an argument rather than calling `Math.random`, so tests can pass
   `seededRandom`.
   - `strollTiles(map)` keeps a character on the paths, like the visitors.
   - `openTiles(map)` lets it go anywhere that isn't blocked, like the clown.
2. **Test it in `world.test.ts`.** Run the update for a few simulated minutes
   with `seededRandom` and check that the character never stands on a blocked
   tile and really moves.
3. **Drawing goes in `render.ts`** as a `draw<Name>(ctx, character, t)`. Start
   from `person(...)` with a `Look`, then add what makes the character itself
   on top: hats, props, face paint. Use colours from `palette` (in
   `palette.ts`), never hex strings in `render.ts`. Keep it plain 2D canvas: a
   few ovals, polygons and strokes per frame.
4. **Wire it up in `midway.ts`:** create it next to the visitors, update it in
   the loop next to `updateVisitor`, and push it into `drawables` with
   `depth: x + y` so it sorts behind and in front of scenery correctly. Make
   its `box` tall enough to cover anything it draws above its head, or it will
   pop out of view at the screen edge.
5. **Run `npm run format` and `npm run check`.**

## Rules

- No change to `src/carnival/` or `src/games/` is needed for a character.
- A character never blocks the player: walkers pass through each other.
