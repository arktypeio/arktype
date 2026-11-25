import { execFileSync } from "node:child_process"
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { basename, join, relative, resolve } from "node:path"
import { createOracle, defaultGrammarDir, dumpFile } from "./dumpTokens.ts"

// Writes the oracle's tokens for the extension's scratch file and core's test
// samples to core/src/test/resources/golden, which GoldenTokensTest compares
// the Kotlin engine against, so `./gradlew :core:test` guards parity without
// Node. Rerun after changing a sample or a grammar:
//
// node ./scripts/writeGoldens.ts

const jetbrainsDir = resolve(import.meta.dirname, "..")
const repoRoot = resolve(jetbrainsDir, "../..")
const samplesDir = join(jetbrainsDir, "core/src/test/resources/samples")
const goldenDir = join(jetbrainsDir, "core/src/test/resources/golden")

const sources = [
	join(repoRoot, "ark/extension/arktype.scratch.ts"),
	...readdirSync(samplesDir).map(file => join(samplesDir, file))
]

// the grammars as the Kotlin engine reads them, as Gradle's writeGrammars
// task writes them
execFileSync(
	process.execPath,
	[
		"./scripts/writeGrammars.ts",
		join(jetbrainsDir, "core/build/generated/grammars")
	],
	{ cwd: jetbrainsDir, stdio: "inherit" }
)

const tokenize = await createOracle(defaultGrammarDir)

rmSync(goldenDir, { recursive: true, force: true })
mkdirSync(goldenDir, { recursive: true })
for (const source of sources) {
	const variants = [true, false].map(ark => {
		const { error, scopes, lines } = dumpFile(tokenize, source, ark)
		if (error) throw new Error(`${source}: ${error}`)
		return { ark, scopes, lines }
	})
	const golden = { source: relative(repoRoot, source), variants }
	writeFileSync(
		join(goldenDir, `${basename(source)}.jsonl`),
		`${JSON.stringify(golden)}\n`
	)
}

console.log(
	`Wrote ${sources.length} goldens to ${relative(repoRoot, goldenDir)}`
)
