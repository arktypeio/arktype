// Runs arktype.nvim's suite in a real headless Neovim:
//
//   node ark/neovim/test/test.ts [--grep <substring>] [--fuzz <count>] [--seed <n>]
//
// It writes the fixtures the Lua specs read (the conformance cases, plus
// random messages and patterns with the outputs V8 gives for them) to
// test/temp, installs the host parsers through a pinned nvim-treesitter into
// test/.deps (once), runs test/run.lua with `nvim --clean`, then checks the
// highlights it dumped against the TextMate oracle with
// ark/editor-conformance/highlighting/check.ts.
//
// Needs `nvim` (0.11+), `git`, a C compiler and the `tree-sitter` CLI.
import { spawnSync } from "node:child_process"
import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync
} from "node:fs"
import { join } from "node:path"
import { compareReference, reportReference } from "./compareReference.ts"
import { inline, rewrite, type ErrorLensRule } from "./errorLens.ts"
import { fuzzCases } from "./fuzzDiagnostics.ts"
import { fuzzRegexCases } from "./fuzzRegex.ts"

const testDir = import.meta.dirname
const pluginDir = join(testDir, "..")
const repoDir = join(pluginDir, "..", "..")
const dataDir = join(testDir, "temp")
const depsDir = join(testDir, ".deps")
const conformanceDir =
	process.env.ARKTYPE_CONFORMANCE_DIR ??
	join(repoDir, "ark", "editor-conformance")
const grammarDir =
	process.env.ARKTYPE_GRAMMAR_DIR ?? join(repoDir, "ark", "tree-sitter")

// nvim-treesitter's main branch, which pins every parser's revision
const nvimTreesitterRevision = "52773f0d13a0c11d0c3ef33c14ab6ecc1c17148b"
const hostParsers = [
	"typescript",
	"tsx",
	"javascript",
	"svelte",
	"vue",
	"astro",
	"html",
	"css",
	"markdown",
	"markdown_inline"
]

const args = process.argv.slice(2)
const grepIndex = args.indexOf("--grep")
const grep = grepIndex === -1 ? undefined : args[grepIndex + 1]
const option = (name: string, fallback: number) => {
	const index = args.indexOf(name)
	return index === -1 ? fallback : Number(args[index + 1])
}
const fuzzCount = option("--fuzz", 20_000)
const seed = option("--seed", 1)

rmSync(dataDir, { recursive: true, force: true })
mkdirSync(dataDir, { recursive: true })

const writeData = (name: string, data: unknown) =>
	writeFileSync(join(dataDir, name), JSON.stringify(data))

const manifest = JSON.parse(
	readFileSync(join(repoDir, "ark", "extension", "package.json"), "utf8")
)
const rules: ErrorLensRule[] =
	manifest.contributes.configurationDefaults["errorLens.replace"]

type ConformanceCase = {
	name: string
	input: string
	output: string
	rule: number | null
	display: string
}

const conformancePath = join(conformanceDir, "diagnostics", "cases.json")
const conformance: ConformanceCase[] =
	existsSync(conformancePath) ?
		JSON.parse(readFileSync(conformancePath, "utf8"))
	:	[]
for (const testCase of conformance) {
	// the fixtures are the spec; this only guards against a stale oracle
	const oracle = rewrite(testCase.input, rules)
	if (
		oracle.output !== testCase.output ||
		oracle.rule !== testCase.rule ||
		inline(oracle.output) !== testCase.display
	) {
		throw new Error(
			`conformance case ${testCase.name} disagrees with V8: ${JSON.stringify(oracle)}`
		)
	}
}
writeData(
	"conformanceCases.json",
	conformance.map(testCase => ({ ...testCase, inline: testCase.display }))
)
writeData(
	"fuzzDiagnostics.json",
	fuzzCases(rules, fuzzCount, seed).map(testCase => ({
		...testCase,
		inline: inline(testCase.output)
	}))
)
writeData("fuzzRegex.json", fuzzRegexCases(fuzzCount, seed))

const run = (command: string, args: string[], cwd?: string) => {
	const result = spawnSync(command, args, { stdio: "inherit", cwd })
	if (result.error) throw result.error
	if (result.status !== 0)
		throw new Error(`${command} ${args.join(" ")} exited with ${result.status}`)
}

const treesitterDir = join(depsDir, "nvim-treesitter")
const revisionFile = join(depsDir, "nvim-treesitter.revision")
const installedRevision =
	existsSync(revisionFile) ? readFileSync(revisionFile, "utf8").trim() : ""
if (installedRevision !== nvimTreesitterRevision) {
	rmSync(depsDir, { recursive: true, force: true })
	mkdirSync(treesitterDir, { recursive: true })
	run("git", ["init", "-q"], treesitterDir)
	run(
		"git",
		[
			"fetch",
			"-q",
			"--depth",
			"1",
			"https://github.com/nvim-treesitter/nvim-treesitter",
			nvimTreesitterRevision
		],
		treesitterDir
	)
	run("git", ["checkout", "-q", "FETCH_HEAD"], treesitterDir)
	run("nvim", [
		"--clean",
		"--headless",
		"-l",
		join(testDir, "installParsers.lua"),
		depsDir,
		...hostParsers
	])
	writeFileSync(revisionFile, nvimTreesitterRevision)
}

const sync = spawnSync(
	"node",
	[join(pluginDir, "scripts", "syncQueries.ts"), "--check"],
	{ stdio: "inherit" }
)
if (sync.error) throw sync.error

const nvim = spawnSync(
	"nvim",
	["--clean", "--headless", "-l", join(testDir, "run.lua")],
	{
		stdio: "inherit",
		env: {
			...process.env,
			ARKTYPE_TEST_DATA: dataDir,
			ARKTYPE_TEST_DEPS: depsDir,
			ARKTYPE_CONFORMANCE_DIR: conformanceDir,
			...(grep ? { ARKTYPE_TEST_GREP: grep } : {})
		}
	}
)
if (nvim.error) throw nvim.error
let failed = nvim.status !== 0 || sync.status !== 0

const highlightsDir = join(dataDir, "highlights")
if (existsSync(highlightsDir)) {
	console.log("\nhighlights against the TextMate oracle:")
	const check = spawnSync(
		"node",
		[
			join(conformanceDir, "highlighting", "check.ts"),
			"--target",
			"neovim",
			"--actual",
			highlightsDir,
			...args.filter(arg => arg === "--code" || arg === "--write-differences")
		],
		{ stdio: "inherit" }
	)
	if (check.error) throw check.error
	if (check.status !== 0) failed = true

	const referenceDir = join(dataDir, "tree-sitter")
	const dump = spawnSync(
		"node",
		[join(grammarDir, "test", "dump.ts"), referenceDir],
		{ stdio: ["ignore", "ignore", "inherit"] }
	)
	if (dump.error) throw dump.error
	if (dump.status !== 0) failed = true
	else {
		console.log("\nhighlights against the reference tree-sitter target:")
		const matches = reportReference(
			compareReference(highlightsDir, referenceDir),
			join(testDir, "referenceDifferences.json")
		)
		if (!matches) failed = true
	}
}
process.exit(failed ? 1 : 0)
