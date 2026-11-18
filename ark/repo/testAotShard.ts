import { spawnSync } from "node:child_process"
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
// pnpm testAot                 every test, in one mocha process
// ARK_SHARD=3/8 pnpm testAot   the third of eight shards
// pnpm testAot --list          each shard's files and weight, without running
//                              (eight shards, or ARK_SHARD's count)
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

const requested = parseShard(process.env.ARK_SHARD)
const budgetFactor = parseBudgetFactor(process.env.ARK_SHARD_BUDGET_FACTOR)
const args = process.argv.slice(2)
const listing = args.includes("--list")

const count = requested?.count ?? (listing ? defaultShardCount : 1)
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
