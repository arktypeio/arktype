import { attest, contextualize } from "@ark/attest"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
	bodyOf,
	branchFor,
	changeText,
	claimChangesOf,
	errorOf,
	isMeaningful,
	leaderboardPath,
	leafChangesOf,
	rowChangesOf,
	standingChangesOf,
	unmentioned,
	versionRowsOf,
	type ClaimsCheck,
	type FileChange,
	type Report
} from "../bench/external/monthlyReport.ts"

const runPath = "ark/repo/bench/external/results/newest/run.json"

const runOf = (date: string, valibot: string) =>
	JSON.stringify({
		form: {
			commit: date === "2026-11-06" ? "20710020e" : "5d73f2ba0",
			date,
			installed: { valibot, "@sinclair/typebox": "0.34.52" }
		}
	})

const boardOf = (measured: string, arkType: number, extra = {}) =>
	JSON.stringify({
		measured,
		suites: [
			{
				category: "size",
				id: "form",
				label: "valibot.dev's login form",
				rows: [
					{
						id: "login|form",
						results: { ArkType: arkType, "@ts-runtypes": 1100, ...extra }
					}
				]
			}
		]
	})

const holds = (
	size: string,
	headline = "TypeScript's smallest validator."
): ClaimsCheck => ({
	ok: true,
	output: `- headline: ${headline}\n- sizeAverage: Smallest on average: ${size} against @railway-ts/pipelines' 1.256.\n`
})

const reportOf = (overrides: Partial<Report>): Report => ({
	date: "2026-12-01",
	commit: "5d73f2ba0",
	base: "main",
	branch: "bench/monthly-standings",
	suites: "size",
	runner: "ubuntu-latest",
	claimsBefore: holds("1.163"),
	claimsAfter: holds("1.152"),
	files: [
		{
			path: leaderboardPath,
			before: boardOf("2026-11-06", 1026),
			after: boardOf("2026-12-01", 998)
		},
		{
			path: runPath,
			before: runOf("2026-11-06", "1.5.0"),
			after: runOf("2026-12-01", "1.6.0")
		}
	],
	derived: { regenerated: ["ark/docs/public/llms.txt"] },
	...overrides
})

// what GitHub would notify: an @name outside a code span or block
const mentions = (markdown: string) =>
	markdown
		.replace(/```[\S\s]*?```/g, "")
		.replace(/`[^\n`]*`/g, "")
		.match(/@[\w-]+/g) ?? []

contextualize(() => {
	it("a rerun that only restamps its date and commit isn't a change", () => {
		const restamped: FileChange[] = [
			{
				path: leaderboardPath,
				before: boardOf("2026-11-06", 1026),
				after: boardOf("2026-12-01", 1026)
			},
			{
				path: runPath,
				before: runOf("2026-11-06", "1.5.0"),
				after: runOf("2026-12-01", "1.5.0")
			}
		]
		attest(isMeaningful(restamped)).equals(false)
	})

	it("a new release is a change though no result moved", () => {
		attest(
			isMeaningful([
				{
					path: runPath,
					before: runOf("2026-11-06", "1.5.0"),
					after: runOf("2026-12-01", "1.6.0")
				}
			])
		).equals(true)
	})

	it("a file the rerun wrote for the first time is a change", () => {
		attest(
			isMeaningful([{ path: "results/newest/moltar-counts.json", after: "{}" }])
		).equals(true)
	})

	it("names an array's elements, so one added doesn't shift the rest", () => {
		attest(
			leafChangesOf(
				{
					series: [
						{ apps: "mixed", seed: 1, rows: [{ types: 10, default: 4418 }] }
					]
				},
				{
					series: [
						{ apps: "graph", seed: 1, rows: [{ types: 10, default: 9 }] },
						{ apps: "mixed", seed: 1, rows: [{ types: 10, default: 4395 }] }
					]
				}
			)
		).snap([
			{ path: ["series", "graph 1", "apps"], after: "graph" },
			{ path: ["series", "graph 1", "seed"], after: 1 },
			{ path: ["series", "graph 1", "rows", "10", "types"], after: 10 },
			{ path: ["series", "graph 1", "rows", "10", "default"], after: 9 },
			{
				path: ["series", "mixed 1", "rows", "10", "default"],
				before: 4418,
				after: 4395
			}
		])
	})

	it("reports a value that's gone, and an emptied list as one value", () => {
		attest(
			leafChangesOf({ a: { b: 1 }, reps: [1, 2] }, { a: {}, reps: [] })
		).snap([
			{ path: ["a"], after: {} },
			{ path: ["reps"], after: [] },
			{ path: ["a", "b"], before: 1 },
			{ path: ["reps", "0"], before: 1 },
			{ path: ["reps", "1"], before: 2 }
		])
	})

	it("lists each result that moved, appeared or left the leaderboard", () => {
		attest(
			rowChangesOf(
				boardOf("2026-11-06", 1026, { Joi: 54732 }),
				boardOf("2026-12-01", 998, { Valibot: 1520 })
			).map(({ library, before, after }) => ({ library, before, after }))
		).snap([
			{ library: "ArkType", before: 1026, after: 998 },
			{ library: "Valibot", before: undefined, after: 1520 },
			{ library: "Joi", before: 54732, after: undefined }
		])
	})

	it("states a change as a difference and a percentage of the before", () => {
		attest(changeText(1026, 998)).snap("-28 (-2.7%)")
		attest(changeText(208.9415115, 212.6845525)).snap("+3.743 (+1.8%)")
		attest(changeText(0, 16)).snap("+16")
		attest(changeText(undefined, 16)).snap("new")
		attest(changeText(16, undefined)).snap("removed")
		attest(changeText("1.5.0", "1.6.0")).snap("")
	})

	it("pairs versions by suite, with a suite or package only one run has", () => {
		attest(
			versionRowsOf(
				JSON.stringify({ sury: { installed: { zod: "4.6.7" } } }),
				JSON.stringify({
					sury: { installed: { zod: "4.7.0", valibot: "1.6.0" } },
					moltar: { installed: { typia: "15.3.0" } }
				})
			)
		).snap([
			{ suite: "sury", package: "zod", before: "4.6.7", after: "4.7.0" },
			{ suite: "sury", package: "valibot", before: undefined, after: "1.6.0" },
			{ suite: "moltar", package: "typia", before: undefined, after: "15.3.0" }
		])
	})

	it("lists a library whose place or average moved, not one that kept both", () => {
		const printed = (first: string, second: string) =>
			`size (form, sbSize; 2 rows)\n  1. ${first}\n  2. ${second} [3/4 suites]\n  3. Superstruct 1.464\n    form (1): ajv 1.000, ArkType 1.097\n`
		attest(
			standingChangesOf(
				printed("ajv 1.326", "ArkType 1.333"),
				printed("ArkType 1.324", "ajv 1.326")
			)
		).snap([
			{
				category: "size",
				library: "ArkType",
				after: { place: 1, score: "1.324" },
				before: { place: 2, score: "1.333" }
			},
			{
				category: "size",
				library: "ajv",
				after: { place: 2, score: "1.326" },
				before: { place: 1, score: "1.326" }
			}
		])
	})

	it("says first which rival a suite couldn't build at its newest release", () => {
		const held = JSON.stringify({
			sb: {
				installed: { typia: "15.2.2" },
				held: { typia: { newest: "15.4.1", kept: "15.2.2" } }
			}
		})
		const body = bodyOf(
			reportOf({
				files: [
					{
						path: runPath,
						before: JSON.stringify({ sb: { installed: { typia: "15.2.2" } } }),
						after: held
					}
				]
			})
		)
		attest(body.split("### Versions\n\n")[1].split("\n\n")[0]).snap(
			"- `typia`: newest 15.4.1 not buildable in sb, kept 15.2.2"
		)
		// a hold is news the month it starts, though no version or number moved
		attest(
			isMeaningful([
				{
					path: runPath,
					before: JSON.stringify({ sb: { installed: { typia: "15.2.2" } } }),
					after: held
				}
			])
		).equals(true)
	})

	it("compares claims by id, and a run that threw lists none", () => {
		attest(claimChangesOf(holds("1.163"), holds("1.152"))).snap([
			{
				id: "sizeAverage",
				before:
					"Smallest on average: 1.163 against @railway-ts/pipelines' 1.256.",
				after:
					"Smallest on average: 1.152 against @railway-ts/pipelines' 1.256."
			}
		])
		attest(
			claimChangesOf(holds("1.163"), { ok: false, output: "Error: x" }).map(
				change => [change.id, change.after]
			)
		).snap([
			["headline", undefined],
			["sizeAverage", undefined]
		])
	})

	it("keeps a thrown error's message without its frame or stack", () => {
		attest(
			errorOf(
				"file:///repo/ark/docs/lib/claims.ts:990\n\t\tthrow new Error(\n\t\t      ^\n\nError: headline claims ArkType is best on speed\n    at assertLeads (file:///repo/ark/docs/lib/claims.ts:990:9)\n\nNode.js v24.14.1\n"
			)
		).snap("Error: headline claims ArkType is best on speed")
	})

	it("puts a scoped package in a code span, once", () => {
		attest(
			unmentioned(
				"@ts-runtypes 1.1, `@sx3/gate` and @railway-ts/pipelines' 1.2"
			)
		).snap("`@ts-runtypes` 1.1, `@sx3/gate` and `@railway-ts/pipelines`' 1.2")
	})

	it("one branch for the default branch, another for each other base", () => {
		attest(branchFor("main", "main")).snap("bench/monthly-standings")
		attest(branchFor("featherduster", "main")).snap(
			"bench/monthly-standings-featherduster"
		)
	})

	it("the body states versions, numbers and claims, and mentions nobody", () => {
		const body = bodyOf(reportOf({}))
		attest(mentions(body)).equals([])
		attest(body.split("\n### Not rerun")[0])
			.snap(`The monthly rerun of the benchmarks a GitHub-hosted runner measures faithfully: ArkType at \`5d73f2ba0\` (\`main\`) and each rival at its newest release, measured on 2026-12-01 on \`ubuntu-latest\`. Nothing is published until this is merged. Closing it discards the run; next month's opens another if its numbers differ from \`main\`'s.

CI hasn't run here: a pull request opened with the workflow's token triggers no other workflow. Close and reopen it, or push to \`bench/monthly-standings\`, to run the checks.

### Versions

| suite | package | before | after |
| --- | --- | --- | --- |
| form | \`valibot\` | 1.5.0 | 1.6.0 |

<details><summary>Every install</summary>

| suite | package | before | after |
| --- | --- | --- | --- |
| form | \`valibot\` | 1.5.0 | 1.6.0 |
| form | \`@sinclair/typebox\` | 0.34.52 | 0.34.52 |

</details>

### Numbers that changed

The leaderboard's results (\`ark/docs/lib/bench/leaderboard.json\`), where each rival keeps the better of its installs:

| category | suite | result | library | before | after | change |
| --- | --- | --- | --- | --- | --- | --- |
| size | valibot.dev's login form | \`login\\|form\` | \`ArkType\` | 1026 | 998 | -28 (-2.7%) |

### Claims

Every claim holds on the new numbers, as before. Of those \`ark/docs/lib/bench/headline.ts\` lists, this one reads differently:

- \`sizeAverage\`
  - before: Smallest on average: 1.163 against \`@railway-ts/pipelines\`' 1.256.
  - after: Smallest on average: 1.152 against \`@railway-ts/pipelines\`' 1.256.

<details><summary>Every claim, after</summary>

- headline: TypeScript's smallest validator.
- sizeAverage: Smallest on average: 1.152 against \`@railway-ts/pipelines\`' 1.256.

</details>
`)
	})

	it("a headline that changes comes first", () => {
		const body = bodyOf(
			reportOf({
				claimsAfter: holds("1.662", "TypeScript's fastest validator.")
			})
		)
		attest(body.split("\n\n")[0]).snap(`> [!CAUTION]
> **The site's headline changes on these numbers.**
> - \`headline\`: "TypeScript's smallest validator." becomes "TypeScript's fastest validator."`)
	})

	it("a claim that throws comes first, with its error and no generated text", () => {
		const body = bodyOf(
			reportOf({
				claimsAfter: {
					ok: false,
					output:
						"Error: headline claims ArkType is best on size, but @sx3/gate is"
				},
				derived: { regenerated: [], skipped: "Not written again." }
			})
		)
		attest(mentions(body)).equals([])
		attest(body.split("\n\n")[0]).snap(`> [!CAUTION]
> **A claim on the site no longer holds.** \`ark/docs/lib/claims.ts\` throws on these numbers, so the docs build fails on this branch until its copy changes. The error is under "Claims".`)
		attest(
			body.includes("Error: headline claims ArkType is best on size")
		).equals(true)
		attest(body.split("### Generated text\n\n")[1]).snap("Not written again.")
	})

	it("says what a hosted run left out, and less of a run that counted", () => {
		const left = (suites: Report["suites"]) =>
			bodyOf(reportOf({ suites }))
				.split("### Not rerun\n\n")[1]
				.split("\n\n### ")[0]
				.split("\n")
				.flatMap(line => /^- \*\*(.+?)\*\*/.exec(line)?.[1] ?? [])
		attest(left("size")).snap([
			"Speed",
			"Startup",
			"The homepage's speed and cold-start rows",
			"Size at scale"
		])
		attest(left("all")).snap([
			"Startup",
			"The homepage's speed and cold-start rows",
			"Size at scale"
		])
	})

	it("a body past GitHub's limit leaves its raw tables to the artifact", () => {
		const big = Object.fromEntries(
			Array.from({ length: 3000 }, (_, i) => [`arm ${i}`, [i, i + 1, i + 2]])
		)
		const body = bodyOf(
			reportOf({
				files: [
					...reportOf({}).files,
					...[..."abcdefghijkl"].map(name => ({
						path: `results/newest/${name}-counts.json`,
						after: JSON.stringify(big)
					}))
				]
			})
		)
		attest(body.length < 65536).equals(true)
		attest(body.includes("| size | valibot.dev's login form |")).equals(true)
		attest(body.includes("a-counts.json")).equals(false)
		attest(body.endsWith("they're in the run's artifact.")).equals(true)
	})
})
