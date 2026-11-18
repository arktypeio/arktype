import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

// how @ark/aot's tests are divided among CI's runners. testAotShard.ts runs a
// shard of this plan and writeAotTimings.ts writes the weights it reads

export const repoDir: string = fileURLToPath(new URL("../..", import.meta.url))

const aotTestsDir = "ark/aot/__tests__"

// seconds each file took where the timings were written, keyed by its path
// from the repo root. Only ratios matter, so a runner's speed doesn't.
//
// A file too heavy for one shard has entries for top-level describes instead,
// keyed `<file>::<titles>`, where titles is what mocha's full title of each of
// the describe's tests starts with, e.g.
// "ark/aot/__tests__/prune.test.ts::prune vite". `<file>::` is the rest of its
// tests.
export type Timings = Record<string, number>

export const timingsPath = `${aotTestsDir}/timings.json`

// the shards pr.yml's `aot` job runs, which is also how heavy a file may be
// before writeAotTimings records it by describe
export const defaultShardCount = 8

const sliceSeparator = "::"

// a whole file, or the tests of one whose full titles start with `titles`
export type ShardUnit = {
	file: string
	weight: number
	titles?: string
	// also runs each test of the file that no slice's titles start, so that one
	// outside the timings' describes still runs in exactly one shard. Where
	// titles is "", those are all it runs
	unlisted?: true
}

export type Shard = {
	units: ShardUnit[]
	weight: number
}

export type ShardPlanInput = {
	files: readonly string[]
	timings: Timings
	count: number
}

// one mocha process: files run whole, or one file's tests matching grep
export type ShardRun = {
	files: string[]
	grep?: string
}

// what `pnpm testAot` runs
export const aotTestFiles = (): string[] => [
	...readdirSync(new URL(`../../${aotTestsDir}`, import.meta.url))
		.filter(name => name.endsWith(".test.ts"))
		.sort()
		.map(name => `${aotTestsDir}/${name}`),
	"ark/docs/components/playground/__tests__/precompile.test.ts"
]

export const readTimings = (): Timings =>
	JSON.parse(
		readFileSync(new URL(`../../${timingsPath}`, import.meta.url), "utf8")
	) as Timings

const median = (values: number[]) => {
	if (!values.length) return 1
	const sorted = [...values].sort((l, r) => l - r)
	const mid = sorted.length >> 1
	return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const slicesOf = (file: string, timings: Timings): ShardUnit[] => {
	const slices = Object.entries(timings)
		.filter(([key]) => key.startsWith(file + sliceSeparator))
		.map(
			([key, weight]): ShardUnit => ({
				file,
				weight,
				titles: key.slice(file.length + sliceSeparator.length)
			})
		)
	// nothing to divide
	if (slices.length < 2) return []
	// without an entry for them, the lightest takes what the timings don't list
	const unlisted =
		slices.find(slice => slice.titles === "") ??
		slices.reduce((lightest, slice) =>
			slice.weight < lightest.weight ? slice : lightest
		)
	unlisted.unlisted = true
	return slices
}

const unitKey = (unit: ShardUnit) =>
	unit.titles === undefined ?
		unit.file
	:	`${unit.file}${sliceSeparator}${unit.titles}`

// heaviest first, each to the lightest shard so far. A file the timings don't
// have weighs the median, so a new one needs no entry
export const planShards = ({
	files,
	timings,
	count
}: ShardPlanInput): Shard[] => {
	const fallback = median(
		files.flatMap(file => (file in timings ? [timings[file]] : []))
	)
	const units = files.flatMap((file): ShardUnit[] => {
		const slices = slicesOf(file, timings)
		return slices.length ? slices : (
				[{ file, weight: timings[file] ?? fallback }]
			)
	})
	const shards = Array.from(
		{ length: count },
		(): Shard => ({
			units: [],
			weight: 0
		})
	)
	const heaviestFirst = [...units].sort(
		(l, r) => r.weight - l.weight || (unitKey(l) < unitKey(r) ? -1 : 1)
	)
	for (const unit of heaviestFirst) {
		const lightest = shards.reduce((lightest, shard) =>
			shard.weight < lightest.weight ? shard : lightest
		)
		lightest.units.push(unit)
		lightest.weight += unit.weight
	}
	return shards
}

const escapeRegex = (text: string) =>
	text.replace(/[$()*+./?[\\\]^{|}]/g, "\\$&")

// a pattern for mocha's --grep matching the full titles of a file's slices in
// one shard, given every slice the file has
const grepOf = (held: ShardUnit[], all: ShardUnit[]) => {
	const titled = (units: ShardUnit[]) =>
		units.flatMap(unit => (unit.titles ? [unit.titles] : []))
	const noneOf = (titles: string[]) =>
		titles.length ? `(?!(?:${titles.map(escapeRegex).join("|")}) )` : ""
	const alternatives = titled(held).map(
		titles =>
			// where one slice's titles start with another's, as "prune vite
			// plugins" does with "prune vite", a test is the longer one's
			noneOf(titled(all).filter(longer => longer.startsWith(`${titles} `))) +
			`${escapeRegex(titles)} `
	)
	if (held.some(unit => unit.unlisted)) alternatives.push(noneOf(titled(all)))
	return `^(?:${alternatives.join("|")})`
}

// the mocha processes a shard takes: one for the files it runs whole, and one
// for each file it holds some slices of
export const runsOf = (shard: Shard, shards: readonly Shard[]): ShardRun[] => {
	const whole: string[] = []
	const sliced: ShardRun[] = []
	const files = [...new Set(shard.units.map(unit => unit.file))]
	for (const file of files) {
		const held = shard.units.filter(unit => unit.file === file)
		const all = shards.flatMap(({ units }) =>
			units.filter(unit => unit.file === file)
		)
		if (held.length === all.length) whole.push(file)
		else sliced.push({ files: [file], grep: grepOf(held, all) })
	}
	return whole.length ? [{ files: whole }, ...sliced] : sliced
}

export const describeUnit = (unit: ShardUnit): string =>
	`${unit.weight.toFixed(1).padStart(7)}s  ${unitKey(unit)}${
		!unit.unlisted ? ""
		: unit.titles ? " (and what its timings don't list)"
		: " (what its timings don't list)"
	}`
