# Wist Rules Draft

Status: draft based on the initial user description on April 9, 2026.

This document captures the current agreed rules plus the open questions that need confirmation before implementation.

## Core Setup

- Players: 4 human players.
- Deck: standard 52-card deck.
- Hand size: 13 cards per player.
- Game type: trick-taking game with an auction to determine trump, followed by exact trick betting and hand scoring.

## Hand Flow

Each hand proceeds in this order:

1. Shuffle and deal 13 cards to each player.
2. Run the auction to determine the contract winner and trump suit.
3. If the auction fully passes, use the special "pass 3 cards to the left" rule and then auction again.
4. Once a contract is won, run the exact-trick betting round.
5. Play 13 tricks.
6. Score the hand.
7. Start the next hand with rotated starting positions if the final rules confirm seat rotation.

## Auction / Bidding Phase

### Allowed bids

- A bid is a pair `(tricks, suit)`.
- Minimum tricks in the auction is 5.
- Valid suits are:
  - Clubs
  - Diamonds
  - Hearts
  - Spades
  - No Trump

### Bid ordering

Auction order is lexicographic by trick count first, then suit order:

- `Clubs < Diamonds < Hearts < Spades < No Trump`
- Example:
  - `5H < 5S < 6D`
  - `5S < 5NT < 6C`

That means a legal new bid must be strictly higher than the current highest bid by this ordering.

### Auction ending condition

- The auction continues until one player has made the highest bid and every other player has passed afterward.
- The player with the highest surviving bid wins the auction.
- The winning bid determines the trump suit.

### Trump from the winning bid

- If the winning bid is in a suit, that suit is trump.
- If the winning bid is `No Trump`, the hand has no trump suit.

## Special All-Pass Rule

If the auction fully passes without any bid:

1. Every player selects 3 cards from hand.
2. All players pass those 3 cards simultaneously to the player on their left.
3. A new auction begins on the new hands.

Current interpretation of the user rule:

- This left-pass restart can happen at most 2 times.
- If the auction fully passes again after the second left-pass restart, the hand is abandoned and the cards are reshuffled for a fresh deal.

This needs final confirmation because the wording could also mean "after two all-pass events, reshuffle immediately."

## Exact-Trick Betting Phase

After the auction winner is known:

1. The auction winner declares their exact-trick bet first.
2. Their exact-trick bet must be at least as large as their winning auction bid.
3. Betting then continues around the table one player at a time.
4. The final player to bet may not choose a value that makes the total bets equal exactly 13.

Current interpretation:

- The betting round is separate from the auction.
- The auction winner's betting minimum is constrained by the winning contract.
- Other players may bet any integer number of tricks from 0 to 13, except for the final player's "cannot total 13" restriction.

This needs confirmation if non-winning players are also supposed to respect any auction bids they made earlier.

## Trick Play

### Opening lead

- The auction winner leads the first trick.

### Follow-suit rule

- Players must follow the led suit if they can.
- If a player cannot follow suit, they may play any card.

### Trick winner

- If one or more trump cards were played, the highest trump wins the trick.
- Otherwise, the highest card in the led suit wins the trick.
- The winner of a trick leads the next trick.

### No-trump hands

- In a no-trump hand, no suit has trump priority.
- The highest card in the led suit wins each trick.

## Card Rank Order

This is still unresolved in the user description.

Implementation needs the exact rank order for:

- `2 3 4 5 6 7 8 9 10 J Q K A` with Ace high
- or some other ordering

The phrase "largest number wins" suggests standard high-card ordering, but face-card behavior still needs confirmation.

## Scoring

Let:

- `b` = the player's exact-trick bet for the hand
- `t` = the number of tricks the player actually took
- `B` = the sum of all four players' bets for the hand
- `d = |t - b|`

The scoring rule currently specified is:

- If all four players miss their exact-trick bet (`b != t` for everyone), every score delta is `0`
- If `b = t = 0`, score `2`
- If `b = t > 0`, score `b + 2`
- If `b != t`:
  - When `B < 13` and the player took too few tricks (`t < b`), score `-2d`
  - When `B > 13` and the player took too many tricks (`t > b`), score `-2d`
  - Otherwise, score `-d`

Equivalent interpretation:

- Missing "against the table imbalance" is punished double.
- If the table underbid the hand (`B < 13`), under-taking is the doubled mistake.
- If the table overbid the hand (`B > 13`), over-taking is the doubled mistake.
- If `B = 13`, all misses score `-d`.

## Open Questions To Confirm

1. Who acts first in the auction for each hand?
2. Does dealer rotate each hand, and if so, who leads the auction relative to dealer?
3. Is the all-pass restart exactly:
   - all pass once -> pass 3 left -> re-auction
   - all pass twice total -> pass 3 left again -> re-auction
   - all pass a third time -> reshuffle
4. During the left-pass restart, do players choose any 3 cards freely and pass them simultaneously?
5. In the betting round, are only the auction winner's bet minimums constrained, or must every player's final bet also be at least their own latest auction bid if they had made one?
6. What exact card rank order should I implement?
7. Are there any special rules for revoke/misplay handling, or should I just enforce legal moves in the UI so illegal plays cannot happen?
8. How should seating/start-player work in the online game:
   - host chooses seats
   - join order determines seats
   - random seats each game
9. Do you want a multi-hand match with cumulative scoring, and if so, what ends the match:
   - fixed number of hands
   - target score
   - manual stop
10. Should I support spectators or only exactly 4 active players?

## Product Assumptions Unless You Change Them

If not overridden, the implementation plan will assume:

- Browser-based online game.
- Private room code + nickname join flow.
- Exactly 4 active players, no bots.
- Realtime shared state with server authority.
- Mobile and desktop playable.
- Illegal plays prevented by the client/server rules engine.
- Match continues across multiple hands until players choose to end it.
