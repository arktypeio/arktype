// writes ark/docs/lib/bench/scoreboard.json, what lib/claims.ts states about
// whole apps, from a stored board (measure.ts board): each app's medians and,
// for each precompiled build against each other arm, the two-sided sign test
// paired by round that the board's cells use
// node scoreboard.ts results/<commit>.json
import { readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { format, resolveConfig } from "prettier"
import { median, signTest } from "../stats.ts"

interface Arm {
	bytes: { gz: number }
	samples: Record<string, number[]>
}

const stored: {
	commit: string
	node: string
	at: string
	rounds: number
	loads: number[]
	failed?: Record<string, string>
	ntwine?: { repo: string; migration: string | null }
	arms: Record<string, Arm>
} = JSON.parse(readFileSync(resolve(process.argv[2]), "utf8"))

const builds = ["precompiled", "smallest"]

const counts = {
	import: "importInstructions",
	first: "firstInstructions",
	hot: "hotNs"
}

const rows = [
	...new Set(Object.keys(stored.arms).map(name => name.replace(/ \S+$/, "")))
].map(group => {
	const [, host = "esbuild", app, narrows] =
		/^(?:(webpack|turbopack) )?(\S+)( narrows)?$/.exec(group)!
	const arms = Object.fromEntries(
		Object.entries(stored.arms)
			.filter(([name]) => name.replace(/ \S+$/, "") === group)
			.map(([name, arm]) => [name.slice(group.length + 1), arm])
	)
	return {
		host,
		app,
		narrows: !!narrows,
		arms: Object.fromEntries(
			Object.entries(arms).map(([library, arm]) => [
				library,
				{
					gz: arm.bytes.gz,
					...Object.fromEntries(
						Object.entries(counts).map(([metric, key]) => [
							metric,
							median(arm.samples[key])
						])
					)
				}
			])
		),
		p: Object.fromEntries(
			builds
				.filter(build => build in arms)
				.map(build => [
					build,
					Object.fromEntries(
						Object.entries(arms)
							.filter(([library]) => library !== build)
							.map(([library, arm]) => [
								library,
								Object.fromEntries(
									Object.entries(counts).map(([metric, key]) => [
										metric,
										signTest(arms[build].samples[key], arm.samples[key])
									])
								)
							])
					)
				])
		)
	}
})

const out = join(
	import.meta.dirname,
	"..",
	"..",
	"..",
	"docs",
	"lib",
	"bench",
	"scoreboard.json"
)
writeFileSync(
	out,
	await format(
		JSON.stringify({
			commit: stored.commit,
			node: stored.node,
			at: stored.at,
			rounds: stored.rounds,
			loads: [Math.min(...stored.loads), Math.max(...stored.loads)],
			failed: Object.keys(stored.failed ?? {}),
			// a board written before measure.ts recorded it read the migration from a checkout
			ntwine: stored.ntwine ?? { repo: null, migration: null },
			rows
		}),
		{ ...(await resolveConfig(out)), filepath: out }
	)
)
console.log(`wrote ${out}`)
