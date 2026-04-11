# Wist Build Plan

Status: draft pending rules confirmation.

## Goal

Build a complete browser-based online Wist game for 4 friends, including:

- room creation and joining
- realtime multiplayer play
- full rules enforcement
- scoring and multi-hand progression
- a usable interface on desktop and mobile
- tests for the game engine and critical multiplayer flows

## Execution Plan

### Phase 1: Finalize the spec

- Confirm the open rules questions in `docs/wist-rules.md`.
- Convert the draft into an implementation-ready source of truth.
- Freeze the hand flow, seat order, and scoring edge cases before coding.

### Phase 2: Choose and scaffold the stack

Default implementation choice unless local constraints suggest otherwise:

- Frontend: React + TypeScript + Vite
- Backend: Node + TypeScript
- Realtime: WebSocket-based server authority
- Shared package: pure TypeScript game engine used by both client and server
- Testing: Vitest for engine/unit tests and targeted integration tests for server/game flow

Reasoning:

- Fast to build from scratch.
- Easy to keep all rule logic centralized and deterministic.
- Clean separation between UI and rules engine.

### Phase 3: Build the shared game engine

- Define core types:
  - cards
  - seats
  - auction bids
  - hand state
  - trick state
  - scoring
- Implement deterministic rule functions:
  - deck creation and shuffle plumbing
  - auction validation and ordering
  - left-pass restart logic
  - exact-trick betting constraints
  - legal playable cards
  - trick winner resolution
  - hand scoring
  - match progression
- Add unit tests around every rule branch.

### Phase 4: Build the multiplayer server

- Create room lifecycle:
  - create room
  - join room
  - reconnect player
  - lock room when game starts
- Keep the server authoritative for:
  - dealing
  - seat/player mapping
  - validating every action
  - broadcasting state updates
- Add basic anti-footgun guards:
  - reject invalid actions
  - reject out-of-turn actions
  - support reconnect by player token

### Phase 5: Build the client

- Lobby flow:
  - create room
  - join by room code
  - show connected players and seats
  - start game when 4 players are present
- In-game UI:
  - hand display
  - auction controls
  - betting controls
  - trick table
  - current leader / turn / trump / contract display
  - trick counts and score table
  - hand and match history panel
- UX rules:
  - only legal actions are enabled
  - clear indicators for whose turn it is
  - clear summaries between hands

### Phase 6: Verification

- Engine unit tests for rules and scoring.
- Integration tests for core room/game flows.
- Manual QA against a checklist derived from the final rules doc.
- Edge-case testing:
  - all-pass then pass-left
  - no-trump auction win
  - last bettor blocked from summing to 13
  - scoring when `B < 13`, `B = 13`, and `B > 13`
  - reconnect during a hand

### Phase 7: Finish and handoff

- Clean up rough edges.
- Document local run steps.
- Leave the project in a state where you can run it and invite friends.

## Deliverables

- Working full-stack web app in this workspace.
- Rules/spec doc.
- Test suite for critical rules.
- Local run instructions.

## Risks To Control Early

- Auction details are underspecified right now.
- Score calculation must be locked before coding because it affects every hand result.
- Realtime reconnect behavior should be designed early instead of patched later.
- UI complexity will stay manageable only if the shared rules engine is authoritative and well-tested.

## Skills Assessment

I checked the skills available in this environment. None of them are directly useful for a realtime multiplayer card game build, so I do not need to add a skill before implementation. If we later want bespoke visual assets, `imagegen` could help, but it is not necessary for the core build.
