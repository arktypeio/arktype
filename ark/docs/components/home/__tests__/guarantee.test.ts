/* eslint-disable @typescript-eslint/no-restricted-imports -- the docs aren't a
   package with entrypoints, so tests import their modules directly */
import { check } from "@ark/aot/internal/check.ts"
import { attest, contextualize } from "@ark/attest"
import {
	mkdirSync,
	mkdtempSync,
	realpathSync,
	rmSync,
	writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { diagnosticLines, refused } from "../guarantee.ts"

contextualize(function (this: Mocha.Suite) {
	// the check loads arktype and the precompiler
	this.timeout(60_000)

	it("the homepage's build error is what the precompiler reports", () => {
		// a project of its own, so the check reads no settings from above it
		const root = realpathSync.native(
			mkdtempSync(join(tmpdir(), "ark-docs-guarantee-"))
		)
		try {
			writeFileSync(join(root, "package.json"), "{}")
			mkdirSync(dirname(join(root, refused.file)), { recursive: true })
			writeFileSync(join(root, refused.file), refused.source)
			const report = check([], { cwd: root })
			attest(report.accepted).equals(0)
			// the site's error as one entry, then the count of what was accepted
			attest(report.lines[0]).equals(diagnosticLines.join("\n"))
		} finally {
			rmSync(root, { recursive: true, force: true })
		}
	})
})
