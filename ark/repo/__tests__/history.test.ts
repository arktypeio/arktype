import { attest, contextualize } from "@ark/attest"
import { spawnSync } from "node:child_process"

contextualize(() => {
	it("flags only units whose observations depend on history", () => {
		const { status, stdout } = spawnSync(
			process.execPath,
			[
				"--conditions",
				"ark-ts",
				"ark/repo/testHistory.ts",
				"ark/repo/__tests__/history/dependent.ts",
				"ark/repo/__tests__/history/independent.ts",
				"--seed",
				"1"
			],
			{ encoding: "utf8" }
		)
		attest(status).equals(1)
		attest(stdout.match(/^(✗| {2}\w+ differs).*/gm)).snap([
			"✗ ark/repo/__tests__/history/dependent.ts › calls",
			"  twice differs at 0 › calls › ark/repo/__tests__/history/dependent.ts:88 noteFirstRun",
			"✗ ark/repo/__tests__/history/dependent.ts › output",
			"  twice differs at 2 › output › 1"
		])
	})
})
