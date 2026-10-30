// prints, as a Markdown list, what the site claims from the published
// leaderboard (lib/claims.ts): the headline, the board's title and each
// category's standing. claims.ts checks its copy as it loads, so this throws,
// as the docs build does, if the copy claims a lead the standings don't back.
// The weekly rerun (.github/workflows/leaderboard.yml) runs it to open an
// issue when a claim stops holding
// node ark/docs/lib/bench/headline.ts
import { claims, draftOf } from "../claims.ts"

const shown = [
	"headline",
	"boardTitle",
	"speedAverage",
	"startupAverage",
	"sizeAverage",
	"leaveOneOut"
] as const

for (const id of shown) console.log(`- ${id}: ${draftOf(claims[id])}`)
