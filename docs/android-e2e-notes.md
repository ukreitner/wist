# Android E2E Notes

## Environment

- Android branch is checked out in a separate worktree at `wist-android`.
- Installed local Android tooling with Homebrew:
  - `openjdk`
  - `android-commandlinetools`
  - `android-platform-tools`
- Created a workspace-local SDK shim at `.android-sdk`.
- Created a workspace-local AVD named `wist-pixel-8`.
- Booting and device bridge are working with the emulator attached as `emulator-5554`.

## Findings So Far

- The Android app is an Expo/React Native prototype under `packages/android`.
- First live device run reached Expo Go successfully.
- The first two real runtime blockers were:
  - Metro resolved the workspace root `react@19.2.5` instead of the app-local `react@19.1.0`.
  - After fixing that, Metro still failed to resolve `scheduler` from the hoisted `react-native` install in the monorepo.
- Both blockers are now resolved on device.
- A full manual emulator pass now works through:
  - `Home -> Lobby -> Pass -> Auction -> Betting -> Play -> Scorecard`
- The cycle back from `Scorecard` to the next `Auction` screen also works.
- Real-device flow mismatch found:
  - On the play screen, the user must `tap card -> Play Card ->`.
  - The existing flow file was updated to match that two-step interaction.
- Gameplay rule check confirmed:
  - The betting screen disables `1` when it would make the total exactly `13`.

## Fixes Applied

- Added `packages/android/metro.config.js` to pin `react` to the app-local install, resolve `react-native` from the hoisted workspace install, and map `scheduler` from `react-native/node_modules`.
- Added a shared demo-state layer so room code, nickname, host state, and seat labels stay consistent across screens.
- Updated screens to use the shared demo state so room/player labels stay consistent across the whole game loop.
- Verified the latest working state in Expo Go on the local `wist-pixel-8` emulator.

## Next Steps

- Commit the Android app improvements and notes as a checkpoint.
- If we want fully automated mobile e2e next, wire the validated flow into a runner that can target Expo Go or a dev client reliably.
