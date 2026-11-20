import { spawn, spawnSync } from "node:child_process"
import { availableParallelism } from "node:os"
import { join } from "node:path"
import {
	aotTestFiles,
	defaultShardCount,
	describeUnit,
	planShards,
	readTimings,
	repoDir,
	runsOf,
	timingsPath,
	type Shard
} from "./aotShards.ts"

// runs @ark/aot's tests, or the share of them one of CI's runners takes:
//
// pnpm testAot                 every test, in shards run at once (see below)
// pnpm testAot --jobs 4        every test, in four shards run at once
// pnpm testAot --jobs 1        every test, in one mocha process
// ARK_SHARD=3/8 pnpm testAot   the third of eight shards
// pnpm testAot --list          each shard's files and weight, without running
//                              (eight shards, or ARK_SHARD's or --jobs' count)
//
// Without ARK_SHARD or --jobs, it runs half as many shards as the machine has
// cores, up to the eight CI runs, or one where CI is set. Each shard is a
// process of its own, given its own directory for the fixtures the tests write
// (ARK_AOT_TEMP, see ark/aot/__tests__/utils.ts) and for attest's cache
// (ATTEST_CACHE_DIR), so that none writes over another's. Their output is held
// until they finish, then that of each failing shard is printed whole, followed
// by every failing test by shard. Updating snapshots runs one process, as two
// shards holding slices of one file would each rewrite it.
//
// Files are weighed by timings.json and dealt heaviest first to the lightest
// shard (see aotShards.ts). Other arguments go to mocha.
//
// A shard fails if it runs longer than its budget: twice the mean weight of
// the plan's shards, in the seconds timings.json was written in, times
// ARK_SHARD_BUDGET_FACTOR (4 unless set). The factor allows for a runner
// slower than the machine that wrote the timings, GitHub's being about 2.5
// times slower than the Mac that did, so only a shard that has grown far past
// the others' share trips it. `pnpm writeAotTimings` rebalances them.

const defaultBudgetFactor = 4

const fail = (message: string): never => {
	console.error(message)
	process.exit(1)
}

const parseShard = (spec: string | undefined) => {
	if (!spec) return
	const [, index, count] = /^(\d+)\/(\d+)$/.exec(spec) ?? []
	if (!count || +index < 1 || +index > +count)
		return fail(`ARK_SHARD should be like 3/8, not "${spec}"`)
	return { index: +index, count: +count }
}

const parseBudgetFactor = (spec: string | undefined) => {
	if (!spec) return defaultBudgetFactor
	const factor = Number(spec)
	if (!(factor > 0)) {
		return fail(
			`ARK_SHARD_BUDGET_FACTOR should be a number over 0, not "${spec}"`
		)
	}
	return factor
}

// --jobs n or --jobs=n, and the arguments left for mocha
const parseJobs = (argv: string[]) => {
	const args: string[] = []
	let spec: string | undefined
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === "--jobs") spec = argv[++i] ?? ""
		else if (argv[i].startsWith("--jobs=")) spec = argv[i].slice(7)
		else args.push(argv[i])
	}
	if (spec === undefined) return { args }
	const jobs = Number(spec)
	if (!Number.isInteger(jobs) || jobs < 1)
		return fail(`--jobs should be a whole number over 0, not "${spec}"`)
	return { args, jobs }
}

const requested = parseShard(process.env.ARK_SHARD)
const budgetFactor = parseBudgetFactor(process.env.ARK_SHARD_BUDGET_FACTOR)
const { args, jobs: requestedJobs } = parseJobs(process.argv.slice(2))
const listing = args.includes("--list")
const updating =
	args.some(arg => arg === "--updateSnapshots" || arg === "--update") ||
	process.env.ATTEST_updateSnapshots === "true"

if (requested && requestedJobs) {
	fail(
		`ARK_SHARD runs one shard and --jobs every shard at once, so pass one or the other`
	)
}
if (updating && requestedJobs && requestedJobs > 1) {
	fail(
		`Updating snapshots rewrites the test files, which two shards holding slices of one would each do, so run it with --jobs 1`
	)
}

const jobs =
	requestedJobs ??
	("CI" in process.env || updating ?
		1
	:	Math.min(defaultShardCount, Math.ceil(availableParallelism() / 2)))

const count =
	requested?.count ?? (listing ? (requestedJobs ?? defaultShardCount) : jobs)
const shards = planShards({
	files: aotTestFiles(),
	timings: readTimings(),
	count
})
const meanWeight =
	shards.reduce((total, shard) => total + shard.weight, 0) / count

const describeShard = (shard: Shard, index: number) =>
	[
		`shard ${index}/${count}: ${shard.weight.toFixed(1)}s planned`,
		...shard.units.map(describeUnit),
		...runsOf(shard, shards).flatMap(run =>
			run.grep ? [`  --grep ${JSON.stringify(run.grep)}`] : []
		)
	].join("\n")

if (listing) {
	console.log(
		shards.map((shard, i) => describeShard(shard, i + 1)).join("\n\n")
	)
	console.log(`\nmean ${meanWeight.toFixed(1)}s`)
	process.exit(0)
}

type ShardResult = {
	index: number
	failed: boolean
	output: string
}

// a shard in a process of its own, its output held for the summary
const runChild = (index: number, start: number) =>
	new Promise<ShardResult>(resolve => {
		const child = spawn(process.execPath, [import.meta.filename, ...args], {
			cwd: repoDir,
			env: {
				...process.env,
				ARK_SHARD: `${index}/${count}`,
				ARK_AOT_TEMP: join(repoDir, "ark/aot/__tests__/temp", `shard${index}`),
				ATTEST_CACHE_DIR: join(repoDir, ".attest", `shard${index}`)
			},
			stdio: ["ignore", "pipe", "pipe"]
		})
		let output = ""
		child.stdout.on("data", data => (output += data))
		child.stderr.on("data", data => (output += data))
		child.on("error", error => (output += `${error.stack}\n`))
		child.on("close", code => {
			const failed = code !== 0
			console.log(
				`shard ${index}/${count} ${failed ? "failed" : "passed"} at ${((performance.now() - start) / 1000).toFixed(1)}s`
			)
			resolve({ index, failed, output })
		})
	})

// the full titles mocha lists after "n failing", each on one line
const failuresIn = (output: string) => {
	const failures: string[] = []
	let title: string[] | undefined
	let listing = false
	for (const line of output.split("\n")) {
		if (/^\s*\d+ failing/.test(line)) listing = true
		else if (!listing) continue
		else if (title) {
			title.push(line.trim())
			if (line.endsWith(":")) {
				failures.push(title.join(" ").slice(0, -1))
				title = undefined
			}
		} else {
			const [, first] = /^ {2}\d+\) (.*)$/.exec(line) ?? []
			if (first === undefined) continue
			if (first.endsWith(":")) failures.push(first.slice(0, -1))
			else title = [first]
		}
	}
	return failures
}

if (!requested && count > 1) {
	console.log(
		`running ${count} shards at once, each printing its output when it fails`
	)
	const start = performance.now()
	const results = await Promise.all(
		shards.map((_, i) => runChild(i + 1, start))
	)
	const failed = results.filter(result => result.failed)
	for (const { index, output } of failed) {
		console.log(
			`\n${"=".repeat(20)} shard ${index}/${count} ${"=".repeat(20)}\n${output}`
		)
	}
	const elapsed = ((performance.now() - start) / 1000).toFixed(1)
	if (!failed.length) {
		console.log(`\n${count} shards passed in ${elapsed}s`)
		process.exit(0)
	}
	console.log(`\n${failed.length} of ${count} shards failed in ${elapsed}s:`)
	for (const { index, output } of failed) {
		const failures = failuresIn(output)
		// a shard can fail with no test failing, as one over its budget does
		const lines =
			failures.length ? failures : output.trim().split("\n").slice(-1)
		console.log(`shard ${index}/${count}:`)
		for (const line of lines) console.log(`  ${line}`)
	}
	process.exit(1)
}

const index = requested?.index ?? 1
const shard = shards[index - 1]

console.log(describeShard(shard, index))

const start = performance.now()
let failed = false
for (const run of runsOf(shard, shards)) {
	const result = spawnSync(
		"pnpm",
		[
			"testFiles",
			...run.files,
			"--skipTypes",
			...(run.grep ? ["--grep", run.grep] : []),
			...args
		],
		// cmd.exe would read a grep's | and ^, so shard on POSIX
		{ cwd: repoDir, stdio: "inherit", shell: process.platform === "win32" }
	)
	if (result.error) throw result.error
	if (result.status !== 0) failed = true
}
const elapsed = (performance.now() - start) / 1000

console.log(`shard ${index}/${count} ran ${elapsed.toFixed(1)}s`)

if (failed) process.exit(1)

const budget = 2 * meanWeight * budgetFactor
if (elapsed > budget) {
	// a shard's units are in the order they were dealt
	const heaviest = shard.units.slice(0, 5).map(describeUnit).join("\n")
	fail(
		`Shard ${index}/${count}'s tests passed, but took ${elapsed.toFixed(1)}s, over its budget of ${budget.toFixed(1)}s (twice the mean planned shard, ${meanWeight.toFixed(1)}s, times ARK_SHARD_BUDGET_FACTOR=${budgetFactor}), so ${timingsPath} no longer describes them. Run \`pnpm writeAotTimings\` and commit it to rebalance the shards. Its heaviest as planned:\n${heaviest}`
	)
}
