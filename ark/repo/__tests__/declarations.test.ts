import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const consumer = fromHere("declarations", "consumer.ts")

// what `tsc --declaration --emitDeclarationOnly` writes for consumer.ts,
// resolving arktype from source as the repo's own tests do
const emitConsumer = () => {
	const outDir = mkdtempSync(join(tmpdir(), "ark-declarations-"))
	try {
		const { stdout } = spawnSync(
			process.execPath,
			[
				fromHere("..", "node_modules", "typescript", "bin", "tsc"),
				consumer,
				"--declaration",
				"--emitDeclarationOnly",
				"--outDir",
				outDir,
				"--strict",
				"--skipLibCheck",
				"--target",
				"ES2022",
				"--module",
				"ESNext",
				"--moduleResolution",
				"bundler",
				"--allowImportingTsExtensions",
				"--customConditions",
				"ark-ts",
				"--ignoreConfig",
				"--lib",
				"ESNext,DOM",
				"--types",
				"node"
			],
			{ encoding: "utf8" }
		)
		return {
			diagnostics: stdout,
			declarations: readFileSync(join(outDir, "consumer.d.ts"), "utf8")
		}
	} finally {
		rmSync(outDir, { recursive: true, force: true })
	}
}

contextualize(() => {
	it("a consumer's declarations name arktype only by its root and entrypoints", () => {
		const { diagnostics, declarations } = emitConsumer()
		attest(diagnostics).equals("")
		const specifiers = [
			...new Set(
				Array.from(
					declarations.matchAll(/import\("([^"]+)"\)/g),
					match => match[1]
				)
			)
		].sort()
		// a path under arktype/internal is not semver-stable, so a library
		// publishing declarations that named one would break on a minor
		attest(specifiers.filter(s => s.startsWith("arktype/internal"))).equals([])
		// @ark/util's array is what .props returns, and @ark/schema's
		// RequiredNode what .select("required") does
		attest(specifiers).snap([
			"@ark/schema",
			"@ark/util",
			"arkregex",
			"arksets",
			"arktype"
		])
	})
})
