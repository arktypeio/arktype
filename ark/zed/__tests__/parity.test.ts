import { attest, contextualize } from "@ark/attest"
import {
	checkTarget,
	formatDifference
} from "@ark/editor-conformance/highlighting/check.ts"
import { runZedTarget } from "@ark/zed/internal/conformance/zedTarget.ts"
import { writtenQueries } from "@ark/zed/internal/writeQueries.ts"
import { readFileSync } from "node:fs"

contextualize(() => {
	it("languages/arktype is written from ark/tree-sitter's queries", () => {
		for (const [file, query] of Object.entries(writtenQueries())) {
			attest(
				readFileSync(
					new URL(`../languages/arktype/${file}`, import.meta.url),
					"utf8"
				)
			).equals(query)
		}
	})

	// Zed's grammars, its queries with the upstream injections added, and its
	// rules for which capture wins, against VS Code's TextMate grammar
	it("matches the TextMate oracle except for its listed differences", async () => {
		const { spans, skipped } = await runZedTarget()
		const result = checkTarget("zed", spans)
		attest({
			skipped,
			unexpected: result.unexpected.map(formatDifference),
			stale: result.stale.map(formatDifference),
			unexplained: result.unexplained.map(formatDifference),
			missing: result.missing
		}).equals({
			skipped: [],
			unexpected: [],
			stale: [],
			unexplained: [],
			missing: []
		})
		// the first run fetches and builds Zed's grammars
	}).timeout(180_000)
})
