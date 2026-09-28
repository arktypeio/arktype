const ascending = (values: readonly number[]) =>
	[...values].sort((l, r) => l - r)

/** linearly interpolated quantile of an ascending array (R's default, type 7) */
const quantile = (sorted: readonly number[], q: number): number => {
	const i = (sorted.length - 1) * q
	const lower = Math.floor(i)
	const upper = Math.ceil(i)
	return sorted[lower] + (sorted[upper] - sorted[lower]) * (i - lower)
}

export const median = (values: readonly number[]): number =>
	quantile(ascending(values), 0.5)

export type Summary = {
	n: number
	min: number
	q1: number
	median: number
	q3: number
}

export const summarize = (values: readonly number[]): Summary => {
	const sorted = ascending(values)
	return {
		n: sorted.length,
		min: sorted[0],
		q1: quantile(sorted, 0.25),
		median: quantile(sorted, 0.5),
		q3: quantile(sorted, 0.75)
	}
}

export type MannWhitney = {
	/** U for the first sample: pairs (a, b) with a > b, counting ties as half */
	u: number
	/** two-sided */
	p: number
}

/**
 * Two-sided Mann–Whitney U test by normal approximation, with the variance
 * corrected for ties and a continuity correction. Matches R's
 * `wilcox.test(a, b, exact = FALSE)` and scipy's
 * `mannwhitneyu(a, b, method="asymptotic")`.
 *
 * The approximation is rough below ~8 samples per side, and no p-value below
 * `minimumP(n1, n2)` is attainable at all.
 */
export const mannWhitney = (
	a: readonly number[],
	b: readonly number[]
): MannWhitney => {
	const n1 = a.length
	const n2 = b.length
	const n = n1 + n2
	if (n1 === 0 || n2 === 0) return { u: Number.NaN, p: Number.NaN }

	const pooled = [
		...a.map(value => ({ value, fromA: true })),
		...b.map(value => ({ value, fromA: false }))
	].sort((l, r) => l.value - r.value)

	let rankSumA = 0
	let tieTerm = 0
	for (let start = 0; start < n; ) {
		let end = start
		while (end + 1 < n && pooled[end + 1].value === pooled[start].value) end++
		// tied values share the mean of their 1-based ranks
		const rank = (start + end) / 2 + 1
		const ties = end - start + 1
		tieTerm += ties ** 3 - ties
		for (let i = start; i <= end; i++) if (pooled[i].fromA) rankSumA += rank
		start = end + 1
	}

	const u = rankSumA - (n1 * (n1 + 1)) / 2
	const variance =
		((n1 * n2) / 12) * (n + 1 - (n > 1 ? tieTerm / (n * (n - 1)) : 0))
	if (variance <= 0) return { u, p: 1 }
	const z = Math.max(0, Math.abs(u - (n1 * n2) / 2) - 0.5) / Math.sqrt(variance)
	return { u, p: Math.min(1, erfc(z / Math.SQRT2)) }
}

/** the smallest p `mannWhitney` can report for samples of these sizes */
export const minimumP = (n1: number, n2: number): number =>
	mannWhitney(
		Array.from({ length: n1 }, (_, i) => i),
		Array.from({ length: n2 }, (_, i) => n1 + i)
	).p

/**
 * 95% confidence interval for B's change relative to A, as fractions (-0.1 is
 * 10% lower): the Hodges–Lehmann interval over all pairwise log ratios, with
 * bounds taken from the same normal approximation to U. It assumes B differs
 * from A by a scale factor.
 *
 * Undefined when the samples are too small for an interval at this level or
 * contain nonpositive values.
 */
export const changeInterval = (
	a: readonly number[],
	b: readonly number[]
): [lower: number, upper: number] | undefined => {
	if (a.some(v => v <= 0) || b.some(v => v <= 0)) return
	const pairs = a.length * b.length
	// 1-based rank of the lower bound among the sorted pairwise log ratios
	const k = Math.floor(
		pairs / 2 - 1.959964 * Math.sqrt((pairs * (a.length + b.length + 1)) / 12)
	)
	if (k < 1) return
	const logRatios: number[] = []
	for (const x of a) for (const y of b) logRatios.push(Math.log(y / x))
	logRatios.sort((l, r) => l - r)
	return [Math.exp(logRatios[k - 1]) - 1, Math.exp(logRatios[pairs - k]) - 1]
}

/**
 * Complementary error function (Numerical Recipes' erfcc, fractional error
 * below 1.2e-7 everywhere, so small p-values stay accurate).
 */
const erfc = (x: number): number => {
	const t = 1 / (1 + 0.5 * Math.abs(x))
	const y =
		t *
		Math.exp(
			-x * x -
				1.26551223 +
				t *
					(1.00002368 +
						t *
							(0.37409196 +
								t *
									(0.09678418 +
										t *
											(-0.18628806 +
												t *
													(0.27886807 +
														t *
															(-1.13520398 +
																t *
																	(1.48851587 +
																		t * (-0.82215223 + t * 0.17087277))))))))
		)
	return x >= 0 ? y : 2 - y
}
