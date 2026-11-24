import { execFileSync } from "node:child_process"
import { parseArgs } from "node:util"

// Suggests extra nightly/on-demand CI suites for a PR based on the folders it
// modifies, and optionally posts or updates a single sticky comment on the PR.
//
// Usage:
//   node ark/repo/suggestCiSuites.ts --files ark/aot/emit.ts ...
//   node ark/repo/suggestCiSuites.ts --pr <number> --repo <owner/repo> [--post]

type SuiteId =
	| "aot:full"
	| "ci:environments"
	| "ci:history"
	| "ci:ts"
	| "ci:compat"
	| "ci:neovim"

type SuiteSpec = {
	id: SuiteId
	name: string
	description: string
	matches: (file: string) => string | undefined
}

const prefixMatch =
	(prefixes: string[]) =>
	(file: string): string | undefined =>
		prefixes.find(prefix => file === prefix || file.startsWith(prefix))

export const suites: SuiteSpec[] = [
	{
		id: "aot:full",
		name: "Full AOT derived suites",
		description:
			"`testDifferential`, `testCache`, `testPerturbation`, `testPrograms`",
		matches: prefixMatch([
			"ark/aot/",
			"ark/type/standalone/",
			"ark/type/runtime",
			"ark/type/checkers.ts",
			"ark/type/mutatesInput.ts",
			"ark/type/island.ts",
			"ark/schema/"
		])
	},
	{
		id: "ci:environments",
		name: "Runtime environments",
		description: "Precompiled program in Deno, Bun, Chrome, Firefox",
		matches: prefixMatch([
			"ark/aot/",
			"ark/type/standalone/",
			"ark/type/runtime"
		])
	},
	{
		id: "ci:history",
		name: "History independence",
		description: "`pnpm testHistory --jobs 4`",
		matches: prefixMatch([
			"ark/type/",
			"ark/schema/",
			"ark/sets/",
			"ark/regex/",
			"ark/fast-check/",
			"ark/util/"
		])
	},
	{
		id: "ci:ts",
		name: "Full TypeScript matrix",
		description: "TS 5.1–7.0 consumer checks, `node10`, `attest@6.0.3`",
		matches: prefixMatch([
			"ark/type/",
			"ark/schema/",
			"ark/sets/",
			"ark/regex/",
			"ark/attest/",
			"ark/util/",
			"ark/repo/tsCompat/",
			"ark/repo/testTsVersions.ts",
			"tsconfig.json"
		])
	},
	{
		id: "ci:compat",
		name: "OS & Node compatibility",
		description: "Windows, macOS, Node `lts/-1` & `latest`",
		matches: prefixMatch([
			"ark/repo/build.ts",
			"ark/repo/bundle.ts",
			"ark/repo/dtsGen.ts",
			"ark/repo/testBuild.ts",
			"ark/fs/",
			"ark/attest/",
			"package.json",
			"pnpm-lock.yaml",
			".github/"
		])
	},
	{
		id: "ci:neovim",
		name: "Neovim parity",
		description:
			"`pnpm testNeovim`: arktype.nvim against the VS Code extension's highlighting and inline errors",
		matches: prefixMatch([
			"ark/neovim/",
			"ark/tree-sitter/",
			"ark/editor-conformance/",
			"ark/extension/"
		])
	}
]

const marker = "<!-- arktype-ci-suites -->"

export type SuiteSuggestion = {
	suite: SuiteSpec
	matched: string[]
}

export const suggestSuites = (files: string[]): SuiteSuggestion[] => {
	const result: SuiteSuggestion[] = []
	for (const suite of suites) {
		const matched = new Set<string>()
		for (const file of files) {
			const hit = suite.matches(file)
			if (hit) matched.add(hit)
		}
		if (matched.size) result.push({ suite, matched: [...matched].sort() })
	}
	return result
}

export const formatComment = (
	files: string[],
	repo = "arktypeio/arktype"
): { body: string; suggestedCount: number } => {
	const suggested = suggestSuites(files)
	const suggestedIds = new Set(suggested.map(s => s.suite.id))
	const others = suites.filter(s => !suggestedIds.has(s.id))
	const workflowUrl = `https://github.com/${repo}/actions/workflows/nightly.yml`

	const lines: string[] = [
		marker,
		"Extra CI suites run nightly on `main` and on demand for PRs.",
		""
	]

	if (suggested.length) {
		lines.push("### Suggested for this PR")
		lines.push("| Suite | Command / Label | Touched |")
		lines.push("| --- | --- | --- |")
		for (const { suite, matched } of suggested) {
			const paths = matched
				.slice(0, 3)
				.map(p => `\`${p}\``)
				.join(", ")
			const more = matched.length > 3 ? ` +${matched.length - 3}` : ""
			lines.push(`| ${suite.name} | \`/run ${suite.id}\` | ${paths}${more} |`)
		}
		lines.push("")
		lines.push(
			`Run all suggested: \`/run ${suggested.map(s => s.suite.id).join(" ")}\``
		)
		lines.push("")
	} else {
		lines.push("No extra suites suggested for the files touched in this PR.")
		lines.push("")
	}

	lines.push("<details>")
	lines.push("<summary>Other available suites & manual dispatch</summary>")
	lines.push("")
	lines.push("| Suite | Command / Label | What it runs |")
	lines.push("| --- | --- | --- |")
	for (const suite of others) {
		lines.push(
			`| ${suite.name} | \`/run ${suite.id}\` | ${suite.description} |`
		)
	}
	lines.push("| Everything | `/run all` | All suites above (label `ci:all`) |")
	lines.push("")
	lines.push(
		`Comment \`/run <suite...>\` (maintainers), add the label directly, or trigger from the [nightly workflow](${workflowUrl}).`
	)
	lines.push("</details>")

	return { body: lines.join("\n"), suggestedCount: suggested.length }
}

const gh = (args: string[], input?: string) =>
	execFileSync("gh", args, {
		encoding: "utf8",
		input,
		maxBuffer: 2e7
	}).trim()

const { values: opts, positionals } = parseArgs({
	options: {
		files: { type: "string", multiple: true },
		pr: { type: "string" },
		repo: { type: "string", default: "arktypeio/arktype" },
		post: { type: "boolean", default: false }
	},
	allowPositionals: true
})

let files: string[] = [...(opts.files ?? []), ...positionals]
if (!files.length && opts.pr) {
	const raw = gh([
		"api",
		"--paginate",
		`repos/${opts.repo}/pulls/${opts.pr}/files`,
		"--jq",
		".[].filename"
	])
	files = raw ? raw.split("\n").filter(Boolean) : []
}

const { body, suggestedCount } = formatComment(files, opts.repo)

if (!opts.post) {
	console.log(body)
	process.exit(0)
}

if (!opts.pr) {
	console.error("--pr is required with --post")
	process.exit(1)
}

const existingId = gh([
	"api",
	"--paginate",
	`repos/${opts.repo}/issues/${opts.pr}/comments`,
	"--jq",
	`.[] | select(.body | contains("${marker}")) | .id`
])
	.split("\n")
	.find(Boolean)

if (!suggestedCount && !existingId) {
	console.log("No extra suites suggested and no existing comment; skipping.")
	process.exit(0)
}

if (existingId) {
	gh(
		[
			"api",
			"--method",
			"PATCH",
			`repos/${opts.repo}/issues/comments/${existingId}`,
			"-F",
			"body=@-"
		],
		body
	)
	console.log(`Updated comment ${existingId} on ${opts.repo}#${opts.pr}`)
} else {
	gh(
		[
			"api",
			"--method",
			"POST",
			`repos/${opts.repo}/issues/${opts.pr}/comments`,
			"-F",
			"body=@-"
		],
		body
	)
	console.log(`Posted comment on ${opts.repo}#${opts.pr}`)
}
