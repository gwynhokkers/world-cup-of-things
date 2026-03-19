---
name: Rounds, draws, delete comp
overview: Enforce at least one vote per match before closing a round, document and optionally fix draw handling, and add competition deletion (API + UI with confirmation).
todos: []
isProject: false
---

# Plan: Round voting guard, draw behaviour, delete competition

## 1. Require at least one vote per match before closing a round

**Current behaviour:** [app/pages/comp/[slug]/index.vue](app/pages/comp/[slug]/index.vue) enables "Close round" when there are matches in the current round (`canClose` only checks `currentRoundMatches.length > 0`). The backend [server/api/competitions/[id]/rounds/close.post.ts](server/api/competitions/[id]/rounds/close.post.ts) computes a winner per match from votes; if a match has zero votes, `winnerEntryId` is `null`. Next-round matches are created only from pairs of winners (`winners[i]`, `winners[i+1]`), so missing winners produce fewer or no next-round matches and the bracket breaks.

**Approach:**

- **Backend:** In `close.post.ts`, before computing winners, load vote counts for all current-round matches. If any match has zero votes, throw a 400 (e.g. "Every match in this round must have at least one vote before closing").
- **API response:** Extend the competition-by-slug (and optionally by-id) response when `status === 'open'` with a `voteCountByMatchId: Record<number, number>` for the current round only, so the client can disable "Close round" when any match has no votes without an extra request.
- **Frontend:** In [app/pages/comp/[slug]/index.vue](app/pages/comp/[slug]/index.vue), add a computed that checks that every `currentRoundMatches` entry has `(voteCountByMatchId?.[match.id] ?? 0) >= 1`. Set `canClose` to also require this condition. Optionally show a short hint when the button is disabled (e.g. "Add at least one vote to every match to close the round").

**Files to touch:**

- [server/api/competitions/[id]/rounds/close.post.ts](server/api/competitions/[id]/rounds/close.post.ts) — add vote-count check and 400 when any match has no votes.
- [server/api/competitions/by-slug/[slug].get.ts](server/api/competitions/by-slug/[slug].get.ts) — when status is `open`, query vote counts for current-round match IDs and return `voteCountByMatchId`.
- [app/pages/comp/[slug]/index.vue](app/pages/comp/[slug]/index.vue) — use `voteCountByMatchId` in `canClose` and optionally add helper text.
- [app/stores/competition.ts](app/stores/competition.ts) or types — add optional `voteCountByMatchId?: Record<number, number>` to the competition type if you want it typed (the store already stores the API payload).

---

## 2. Draws in a round

**Current behaviour:** In [server/api/competitions/[id]/rounds/close.post.ts](server/api/competitions/[id]/rounds/close.post.ts), the winner is chosen with:

```ts
Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0]
```

So the entry with the highest vote count wins. If two or more entries are tied, the winner is currently undefined (depends on sort order).

**Approach:** Resolve ties by **random selection** — when there is a tie for the highest vote count, pick the winner at random among those tied entries so it is up to chance which one wins.

**Implementation:** In the winner-selection loop: find the maximum vote count, collect all `entryId`s that have that count into an array, then set `winnerEntryId` to a single randomly chosen element (e.g. `tiedIds[Math.floor(Math.random() * tiedIds.length)]`). Add a short comment in code that ties are broken at random.

**Files to touch:**

- [server/api/competitions/[id]/rounds/close.post.ts](server/api/competitions/[id]/rounds/close.post.ts) — when selecting winner, if multiple entries share the top count, choose one at random (and add a short comment).

---

## 3. Delete competitions

**Current state:** There is no delete-competition API. Schema supports it: [server/db/schema.ts](server/db/schema.ts) has `entries` and `matches` with `onDelete: 'cascade'` from `competitions`; `votes` reference `matches` with `onDelete: 'cascade'`, so deleting a competition will remove its entries, matches, and votes.

**Approach:**

- **Ability:** Reuse `editCompetition` (owner only) for delete, or add a `deleteCompetition` ability that is the same as `editCompetition` for consistency with other destructive actions.
- **API:** Add `server/api/competitions/[id].delete.ts`: resolve competition by `id`, require auth, authorize with `editCompetition` (or `deleteCompetition`), then `db.delete(schema.competitions).where(eq(schema.competitions.id, compId))`. Return 204 or `{ ok: true }`.
- **UI:** On [app/pages/comp/[slug]/index.vue](app/pages/comp/[slug]/index.vue), for owners, add a "Delete competition" control (e.g. button or dropdown). Use a confirmation modal (e.g. "Permanently delete this competition? This cannot be undone.") then call `$fetch(\`/api/competitions/${competition.id}, { method: 'DELETE' })`, clear the store, and navigate to` /`or`/create`. Prefer a destructive/secondary button style and only show for the owner.

**Files to add/touch:**

- **New:** [server/api/competitions/[id].delete.ts](server/api/competitions/[id].delete.ts) — DELETE handler, auth + `editCompetition`, then delete competition.
- [app/pages/comp/[slug]/index.vue](app/pages/comp/[slug]/index.vue) — add delete button (owner only), confirmation dialog, and post-delete redirect.

---

## Summary


| Item               | Backend                                                | Frontend                                                  |
| ------------------ | ------------------------------------------------------ | --------------------------------------------------------- |
| One vote per match | Validate in close round; return vote counts in by-slug | Use `voteCountByMatchId` in `canClose` and optional hint  |
| Draws              | Random tie-break among tied top entries in close round | Optional: show “Winner chosen at random (tie)” in results |
| Delete competition | New `[id].delete.ts` with owner auth                   | Delete button + confirmation on comp page                 |


No schema or migration changes are required; cascade deletes already cover competitions → entries, matches → votes.