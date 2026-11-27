import { attest, contextualize } from "@ark/attest"
import {
	checkTarget,
	formatDifference,
	readExpected,
	readSource
} from "@ark/editor-conformance/highlighting/check.ts"
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { Language, Parser, Query } from "web-tree-sitter"
import { isBuildCurrent } from "tree-sitter-arktype/scripts/stamp.ts"
import { staleHelixFiles } from "tree-sitter-arktype/scripts/writeHelix.ts"
import { createLayers } from "tree-sitter-arktype/test/layers.ts"
import {
	defaultAliases,
	defaultHosts,
	defaultLanguages,
	ecmaInjections,
	helixTargetOptions,
	runTarget,
	treeSitterCli
} from "tree-sitter-arktype/test/target.ts"

const modules = (path: string) =>
	fileURLToPath(new URL(`../node_modules/${path}`, import.meta.url))

contextualize(() => {
	it("src/ and the .wasm are built from the current grammar", () => {
		attest(isBuildCurrent()).equals(true)
	})

	it("invokes tree-sitter-cli via node rather than a POSIX .bin shim", () => {
		attest(treeSitterCli.endsWith("cli.js")).equals(true)
		const version = execFileSync(
			process.execPath,
			[treeSitterCli, "--version"],
			{ encoding: "utf8" }
		)
		attest(version.trim().startsWith("tree-sitter ")).equals(true)
	})

	const summarize = (result: ReturnType<typeof checkTarget>) => ({
		unexpected: result.unexpected.map(formatDifference),
		stale: result.stale.map(formatDifference),
		unexplained: result.unexplained.map(formatDifference),
		missing: result.missing,
		staleSkips: result.staleSkips.map(s => s.fixture)
	})

	const passing = {
		unexpected: [],
		stale: [],
		unexplained: [],
		missing: [],
		staleSkips: []
	}

	it("matches the TextMate oracle except for its listed differences", async () => {
		const { spans } = await runTarget()
		attest(summarize(checkTarget("tree-sitter", spans))).equals(passing)
	}).timeout(60_000)

	it("matches it in Helix's form too", async () => {
		attest(staleHelixFiles()).equals([])
		const { spans } = await runTarget(helixTargetOptions())
		attest(summarize(checkTarget("helix", spans))).equals(passing)
	}).timeout(60_000)

	// editors disagree on which of two captures of one node wins, so
	// highlights.scm must never give a node two, or nest one capture in another
	it("never captures a node twice or inside another capture", async () => {
		const highlight = await createLayers({
			languages: defaultLanguages(),
			aliases: defaultAliases
		})
		const overlaps: string[] = []
		for (const fixture of readExpected().keys()) {
			const host = defaultHosts[fixture.split(".").pop()!]
			if (!host) continue
			const source = readSource(fixture)
			const captures = highlight(source, host)
				.filter(c => c.language === "arktype")
				.sort((a, b) => a.start - b.start || b.end - a.end)
			for (let i = 1; i < captures.length; i++) {
				const [outer, inner] = [captures[i - 1], captures[i]]
				// a nested definition call is highlighted in its parent's layer and
				// again in its own, which the host injects separately, with the
				// same captures
				if (
					inner.start === outer.start &&
					inner.end === outer.end &&
					inner.name === outer.name
				)
					continue
				if (inner.start < outer.end) {
					overlaps.push(
						`${fixture}: ${JSON.stringify(source.slice(outer.start, outer.end))} @${outer.name} and ${JSON.stringify(source.slice(inner.start, inner.end))} @${inner.name}`
					)
				}
			}
		}
		attest(overlaps).equals([])
	}).timeout(60_000)

	it("compiles ecma/injections.scm for TypeScript, TSX and JavaScript", async () => {
		await Parser.init()
		const query = readFileSync(ecmaInjections, "utf8")
		const compiled: string[] = []
		for (const wasm of [
			"tree-sitter-typescript/tree-sitter-typescript.wasm",
			"tree-sitter-typescript/tree-sitter-tsx.wasm",
			"tree-sitter-javascript/tree-sitter-javascript.wasm"
		]) {
			const language = await Language.load(readFileSync(modules(wasm)))
			compiled.push(`${new Query(language, query).patternCount()} patterns`)
		}
		attest(compiled).equals(["3 patterns", "3 patterns", "3 patterns"])
	})
})
