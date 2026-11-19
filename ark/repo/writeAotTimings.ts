import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"
import {
	aotTestFiles,
	defaultShardCount,
	repoDir,
	timingsPath,
	type Timings
} from "./aotShards.ts"

// writes ark/aot/__tests__/timings.json, the weights CI's shards are planned
// from, by running @ark/aot's tests once: pnpm writeAotTimings
//
// The run loads this module again as a mocha root hook plugin, which times
// each test with the hooks before it. A file that took more than a shard's
// share of the whole is written as an entry for each of its heavier top-level
// describes and one for the rest of it, so that testAotShard.ts can divide it.

// seconds by file, then by the titles of the test's root and top-level
// describes, "" for a test outside one
type Measured = Record<string, Record<string, number>>

const outPath = process.env.ARK_AOT_TIMINGS_OUT

const measured: Measured = {}
let last = 0

export const mochaHooks: Mocha.RootHookObject =
	outPath ?
		{
			beforeAll: () => {
				last = performance.now()
			},
			// everything since the last test ended is this test's: its suites'
			// before hooks and its own. A suite's after hooks fall to the test
			// that follows
			afterEach(this: Mocha.Context) {
				const test = this.currentTest!
				const file = relative(repoDir, test.file!).split(sep).join("/")
				const path = test.titlePath()
				const titles = path.length > 2 ? path.slice(0, 2).join(" ") : ""
				const now = performance.now()
				const byTitles = (measured[file] ??= {})
				byTitles[titles] = (byTitles[titles] ?? 0) + (now - last) / 1000
				last = now
			},
			afterAll: () => writeFileSync(outPath, JSON.stringify(measured))
		}
	:	{}

const round = (seconds: number) => Math.max(0.1, Math.round(seconds * 10) / 10)

const sum = (values: number[]) => values.reduce((total, n) => total + n, 0)

const timingsOf = (measured: Measured): Timings => {
	const totals = Object.entries(measured).map(
		([file, byTitles]) => [file, sum(Object.values(byTitles))] as const
	)
	const share = sum(totals.map(([, total]) => total)) / defaultShardCount
	const timings: Timings = {}
	for (const [file, total] of totals) {
		// each slice a shard holds costs it a process that loads the file, so a
		// describe under a twentieth of a share stays with the file's tests
		// outside one
		const slices = Object.entries(measured[file]).filter(
			([titles, seconds]) => titles && seconds >= share / 20
		)
		if (total > share && slices.length) {
			const sliced = sum(slices.map(([, seconds]) => seconds))
			for (const [titles, seconds] of slices)
				timings[`${file}::${titles}`] = round(seconds)
			timings[`${file}::`] = round(total - sliced)
		} else timings[file] = round(total)
	}
	return timings
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const tempDir = mkdtempSync(join(tmpdir(), "ark-aot-timings-"))
	const out = join(tempDir, "measured.json")
	try {
		const { status, error } = spawnSync(
			"pnpm",
			[
				"testFiles",
				...aotTestFiles(),
				"--skipTypes",
				"--require",
				"./ark/repo/writeAotTimings.ts"
			],
			{
				cwd: repoDir,
				stdio: "inherit",
				shell: process.platform === "win32",
				env: { ...process.env, ARK_AOT_TIMINGS_OUT: out }
			}
		)
		if (error) throw error
		// a failing test's time isn't what it takes
		if (status !== 0) {
			console.error(`Tests failed, so ${timingsPath} was left as it was.`)
			process.exit(1)
		}
		const timings = timingsOf(JSON.parse(readFileSync(out, "utf8")) as Measured)
		writeFileSync(
			join(repoDir, timingsPath),
			JSON.stringify(timings, null, "\t") + "\n"
		)
		console.log(
			`Wrote ${Object.keys(timings).length} entries to ${timingsPath}`
		)
	} finally {
		rmSync(tempDir, { recursive: true, force: true })
	}
}
