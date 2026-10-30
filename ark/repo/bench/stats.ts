import { spawnSync } from "node:child_process"
import { availableParallelism } from "node:os"

export const quantile = (values: readonly number[], q: number): number => {
	const sorted = [...values].sort((l, r) => l - r)
	const position = (sorted.length - 1) * q
	const lowerIndex = Math.floor(position)
	return (
		sorted[lowerIndex] +
		(sorted[Math.ceil(position)] - sorted[lowerIndex]) * (position - lowerIndex)
	)
}

export const median = (values: readonly number[]): number =>
	quantile(values, 0.5)

// the median, then the interquartile range
export const summarize = (
	values: readonly number[],
	format: (value: number) => string
): string =>
	`${format(median(values))} (${format(quantile(values, 0.25))}-${format(quantile(values, 0.75))})`

// two-sided sign test over samples paired by round, ignoring ties
export const signTest = (
	l: readonly number[],
	r: readonly number[]
): number => {
	let lWins = 0
	let rWins = 0
	for (let i = 0; i < l.length; i++) {
		if (l[i] < r[i]) lWins++
		else if (l[i] > r[i]) rWins++
	}
	const n = lWins + rWins
	let tail = 0
	let choose = 1
	for (let k = 0; k <= Math.min(lWins, rWins); k++) {
		tail += choose
		choose = (choose * (n - k)) / (k + 1)
	}
	return Math.min(1, (2 * tail) / 2 ** n)
}

const lowestOf = (entries: [string, readonly number[]][]) =>
	entries.reduce((l, r) => (median(r[1]) < median(l[1]) ? r : l))

// where the faster standalone build stands against the best other library, by median
export const standingOf = (
	samplesByLibrary: Record<string, readonly number[]>,
	format: (value: number) => string
): Record<string, string> => {
	const entries = Object.entries(samplesByLibrary)
	const [build, ours] = lowestOf(
		entries.filter(([library]) => library.startsWith("standalone"))
	)
	const [best, bestSamples] = lowestOf(
		entries.filter(([library]) => !library.startsWith("standalone"))
	)
	const gap = median(ours) / median(bestSamples)
	const p = ours.length > 1 ? signTest(ours, bestSamples) : 0
	return {
		standalone: `${format(median(ours))} (${build})`,
		"best other": `${format(median(bestSamples))} (${best})`,
		gap: `${gap.toFixed(2)}x`,
		p: ours.length > 1 ? p.toFixed(3) : "exact",
		standing:
			p >= 0.05 ? "tied"
			: gap < 1 ? "first"
			: "behind"
	}
}

const canPin =
	process.platform === "linux" &&
	spawnSync("taskset", ["--version"]).status === 0

// BENCH_CORE picks the core benchmark processes are pinned to
export const pinned = (args: string[]): string[] =>
	canPin ?
		[
			"taskset",
			"--cpu-list",
			process.env.BENCH_CORE ?? `${availableParallelism() - 1}`,
			...args
		]
	:	args
