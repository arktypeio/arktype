// The scoreboard of every category the site advertises, from a stored result:
// node board.ts <result.json> <out.md>
import { readFileSync, writeFileSync } from "node:fs"
import { median, signTest } from "../stats.ts"

export const boardSizes = [11, 46, 92, 230, 1012]

const labels: Record<string, string> = {
	precompiled: "precompiled",
	smallest: "precompiled smallest",
	arktype: "plain arktype",
	zod: "zod 4.6.7",
	zodCompiled: "zod/compile",
	zod3: "zod 3",
	valibot: "valibot",
	ajv: "ajv standalone"
}

const ours = ["precompiled", "smallest"]

interface Arm {
	bytes: { gz: number }
	samples: Record<string, number[]>
}

type Unit = (n: number) => string

const kb: Unit = n => `${(n / 1e3).toFixed(1)} KB`
const giga: Unit = n =>
	n < 1e8 ? `${(n / 1e6).toFixed(1)}M` : `${(n / 1e9).toFixed(3)}G`
const nanos: Unit = n => `${n.toFixed(0)} ns`

const categories: [name: string, of: (arm: Arm) => number[], format: Unit][] = [
	["min gz", arm => [arm.bytes.gz], kb],
	["import instr", arm => arm.samples.importInstructions, giga],
	["to first validation", arm => arm.samples.firstInstructions, giga],
	["hot path", arm => arm.samples.hotNs, nanos]
]

const pOf = (l: number[], r: number[]) => (l.length > 1 ? signTest(l, r) : 0)

const pText = (p: number) => (p === 0 ? "exact" : `p ${p.toFixed(3)}`)

export const writeBoard = (resultPath: string, outPath: string) => {
	const stored: {
		commit: string
		node: string
		at: string
		rounds: number
		loads: number[]
		failed?: Record<string, string>
		arms: Record<string, Arm>
	} = JSON.parse(readFileSync(resultPath, "utf8"))
	const groups = [
		...new Set(
			Object.keys(stored.arms).map(name => name.replace(/ [^ ]+$/, ""))
		)
	]
	const armsOf = (group: string) =>
		Object.keys(labels).flatMap(library => {
			const arm = stored.arms[`${group} ${library}`]
			return arm ? [[library, arm] as const] : []
		})
	const detail: string[] = []
	// whichever bundler a row's arms went through
	const sectionOf = (groups: string[]) => {
		const summary: string[] = []
		let won = 0
		let tied = 0
		let lost = 0
		// what one build wins alone, since an app ships one
		const alone = Object.fromEntries(ours.map(build => [build, 0]))
		for (const group of groups) {
			const arms = armsOf(group)
			const cells = ["**" + group + "**"]
			const rows = new Map(arms.map(([library]) => [library, [] as string[]]))
			for (const [, of, format] of categories) {
				const ranked = [...arms].sort(
					(l, r) => median(of(l[1])) - median(of(r[1]))
				)
				const [winner, winning] = ranked[0]
				const p = pOf(of(winning), of(ranked[1][1]))
				// everything the winner can't be told from at p 0.05
				const level = ranked.filter(
					([, arm]) => arm === winning || pOf(of(winning), of(arm)) >= 0.05
				)
				const best = ranked.find(([library]) => ours.includes(library))!
				for (const build of ours) {
					const mine = arms.find(([library]) => library === build)?.[1]
					if (!mine) continue
					const beaten = arms.every(
						([library, arm]) =>
							ours.includes(library) ||
							(median(of(mine)) < median(of(arm)) &&
								pOf(of(mine), of(arm)) < 0.05)
					)
					if (beaten) alone[build]++
				}
				const leaderIsOurs = ours.includes(winner)
				const ourLevel = level.some(([library]) => ours.includes(library))
				for (const [library, arm] of arms) {
					const text = format(median(of(arm)))
					rows.get(library)!.push(
						library === winner ? `**${text}**`
						: level.some(([l]) => l === library) ? `${text} (tie)`
						: text
					)
				}
				const gap = median(of(best[1])) - median(of(winning))
				const ratio = (median(of(best[1])) / median(of(winning))).toFixed(2)
				if (leaderIsOurs && level.length === 1) {
					won++
					cells.push(
						`win ${format(median(of(winning)))}, ${labels[winner]} (${pText(p)})`
					)
				} else if (ourLevel) {
					tied++
					cells.push(
						`tie with ${level
							.filter(([library]) => library !== best[0])
							.map(([library]) => labels[library])
							.join(", ")} (${format(median(of(best[1])))})`
					)
				} else {
					lost++
					cells.push(
						`LOSS: ${labels[best[0]]} to ${labels[winner]} by ${format(gap)}, ${ratio}x (${pText(pOf(of(best[1]), of(winning)))})`
					)
				}
			}
			summary.push(`| ${cells.join(" | ")} |`)
			detail.push(
				`### ${group}\n\n| arm | ${categories.map(c => c[0]).join(" | ")} |\n|---|${categories.map(() => "---").join("|")}|\n${arms
					.map(
						([library]) =>
							`| ${labels[library]} | ${rows.get(library)!.join(" | ")} |`
					)
					.join("\n")}\n`
			)
		}
		return `${won} wins, ${tied} ties, ${lost} losses of ${won + tied + lost} cells. An app ships one build: alone, against every rival, the default wins ${alone.precompiled} cells and \`smallest\` ${alone.smallest}.

| app | ${categories.map(c => c[0]).join(" | ")} |
|---|${categories.map(() => "---").join("|")}|
${summary.join("\n")}
`
	}
	const esbuild = sectionOf(
		groups.filter(group => !group.startsWith("webpack "))
	)
	const webpack = sectionOf(
		groups.filter(group => group.startsWith("webpack "))
	)
	writeFileSync(
		outPath,
		`# Scoreboard

\`${stored.commit}\`, ${stored.at}, node ${stored.node}. ${stored.rounds} interleaved rounds in fresh processes, 1-minute load ${Math.min(...stored.loads).toFixed(1)}-${Math.max(...stored.loads).toFixed(1)}. Medians.

Each cell compares precompiled's better build (default or \`smallest\`) with the best arm. A two-sided sign test paired by round decides a tie, at p 0.05, so 9 rounds can't go below p 0.004. Bytes are exact. Instructions are perf's instructions:u in a window opening before the import. Hot path is ns per call after warm-up: \`ThreadView\` on ntwine, \`checkProject\` on generated apps. A row marked narrows has a narrow on two base Types per 46.

## esbuild

${esbuild}
## webpack, which minifies with terser

${webpack}
${
	Object.keys(stored.failed ?? {}).length ?
		`## Failed\n\nThese couldn't load or validate, so they're in no cell:\n\n${Object.entries(
			stored.failed!
		)
			.map(([name, message]) => `- ${name}: ${message}`)
			.join("\n")}\n\n`
	:	""
}## Every arm

Bold wins; (tie) can't be told from it.

${detail.join("\n")}
## Not measured

ajv validates schemas converted from arktype's rather than a hand port, and has no narrows row because JSON Schema can't express one. ntwine has no valibot or ajv port. Typia, TypeBox, Zod Mini, @ts-runtypes and ata are cited in ark/docs/lib/claims.ts but have no port of these apps. The webpack rows have only the precompiled builds, zod and valibot or zod 3.
`
	)
	console.log(`wrote ${outPath}`)
}

if (process.argv[1] === import.meta.filename)
	writeBoard(process.argv[2], process.argv[3])
