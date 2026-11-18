// tests H1-H4 on wall.ts's passes, as the plan fixes them, under Holm at 0.05,
// and prints every pass's ratios
// node stats.ts <wall.json>
import { readFileSync } from "node:fs"
import { median } from "../stats.ts"

const { passes } = JSON.parse(readFileSync(process.argv[2], "utf8")) as {
	passes: { load: [number, number]; ns: Record<string, number> }[]
}

const choose = (n: number, k: number) => {
	let c = 1
	for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i
	return c
}

/** P(X >= k), X ~ Binomial(n, 1/2) */
const upper = (k: number, n: number) => {
	let tail = 0
	for (let i = k; i <= n; i++) tail += choose(n, i)
	return tail / 2 ** n
}

/** k of n passes favor a: two-sided, and 1 if a isn't favored */
const twoSided = (k: number, n: number) =>
	k * 2 <= n ? 1 : Math.min(1, 2 * upper(k, n))

const ratios = (a: string, b: string) => passes.map(p => p.ns[a] / p.ns[b])

type Pair = { a: string; b: string; under: number; p: number; k: number }

const pair = (a: string, b: string, under: number, sided: 1 | 2): Pair => {
	const k = ratios(a, b).filter(r => r < under).length
	return {
		a,
		b,
		under,
		k,
		p: sided === 1 ? upper(k, passes.length) : twoSided(k, passes.length)
	}
}

const vsEvery = (benchmark: string, rivals: string[]) =>
	rivals.map(rival =>
		pair(`${benchmark} arktype-b1`, `${benchmark} ${rival}`, 1, 2)
	)

const hypotheses: Record<string, Pair[]> = {
	H1: vsEvery("parseSafe", [
		"@ts-runtypes",
		"typia",
		"ata-(ahead-of-time)",
		"ata",
		"rescript-schema",
		"@sx3/gate"
	]),
	H2: vsEvery("assertLoose", [
		"ts-runtime-checks",
		"ts-auto-guard",
		"type-predicate-generator",
		"@sinclair/typebox-(ahead-of-time)",
		"typia",
		"@ts-runtypes"
	]),
	H3: [pair("sb valid dynamic", "sb valid b1", 1.05, 1)],
	H4: [
		pair("assertStrict arktype-dynamic", "assertStrict arktype-2.2.9", 0.2, 1)
	]
}

const loads = passes.flatMap(p => p.load)
console.log(
	`${passes.length} passes, 1-minute load ${Math.min(...loads).toFixed(1)}-${Math.max(...loads).toFixed(1)}\n`
)
console.log("| test | a | b | median a/b | a/b under | passes | p |")
console.log("| --- | --- | --- | ---: | ---: | ---: | ---: |")
for (const [h, pairs] of Object.entries(hypotheses)) {
	for (const { a, b, under, k, p } of pairs) {
		console.log(
			`| ${h} | ${a} | ${b} | ${median(ratios(a, b)).toFixed(3)} | ${under} | ${k}/${passes.length} | ${p.toPrecision(2)} |`
		)
	}
}

// each hypothesis's p is its largest pair's (an intersection-union test)
const ps = Object.entries(hypotheses).map(
	([h, pairs]) => [h, Math.max(...pairs.map(pair => pair.p))] as const
)
const ordered = [...ps].sort((a, b) => a[1] - b[1])
console.log("\n| hypothesis | p | Holm threshold | holds |")
console.log("| --- | ---: | ---: | --- |")
let rejecting = true
for (const [i, [h, p]] of ordered.entries()) {
	const threshold = 0.05 / (ordered.length - i)
	rejecting &&= p <= threshold
	console.log(
		`| ${h} | ${p.toPrecision(2)} | ${threshold.toPrecision(3)} | ${rejecting ? "yes" : "no"} |`
	)
}

console.log("\nper pass, a/b:")
const pairs = Object.values(hypotheses).flat()
console.log(
	`| pass | load | ${pairs.map(p => `${p.a} / ${p.b}`).join(" | ")} |`
)
console.log(`| ---: | --- | ${pairs.map(() => "---:").join(" | ")} |`)
for (const [i, pass] of passes.entries()) {
	console.log(
		`| ${i + 1} | ${pass.load.map(l => l.toFixed(1)).join("-")} | ${pairs.map(({ a, b }) => (pass.ns[a] / pass.ns[b]).toFixed(3)).join(" | ")} |`
	)
}
