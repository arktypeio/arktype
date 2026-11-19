import { attest, contextualize } from "@ark/attest"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { planShards, runsOf, type Shard, type Timings } from "../aotShards.ts"

// which of a plan's shards run each full title of a file's tests
const shardsRunning = (file: string, shards: Shard[], titles: string[]) =>
	Object.fromEntries(
		titles.map(title => [
			title,
			shards.flatMap((shard, i) =>
				(
					runsOf(shard, shards).some(
						run =>
							run.files.includes(file) &&
							(run.grep === undefined || new RegExp(run.grep).test(title))
					)
				) ?
					[i + 1]
				:	[]
			)
		])
	)

const filesOf = (shards: Shard[]) =>
	shards.map(shard => shard.units.map(unit => unit.file))

contextualize(() => {
	it("deals the heaviest first, each to the lightest shard", () => {
		const shards = planShards({
			files: ["a", "b", "c", "d", "e"],
			timings: { a: 5, b: 9, c: 4, d: 3, e: 1 },
			count: 2
		})
		attest(filesOf(shards)).equals([
			["b", "d"],
			["a", "c", "e"]
		])
		attest(shards.map(shard => shard.weight)).equals([12, 10])
	})

	it("weighs a file without timings as the median of those with them", () => {
		const shards = planShards({
			files: ["a", "b", "c", "new"],
			// an entry for a file that's gone isn't one of them
			timings: { a: 1, b: 2, c: 30, gone: 1000 },
			count: 4
		})
		attest(shards.map(({ units: [unit] }) => [unit.file, unit.weight])).equals([
			["c", 30],
			["b", 2],
			["new", 2],
			["a", 1]
		])
	})

	it("leaves a shard empty where there are fewer files than shards", () => {
		const shards = planShards({ files: ["a"], timings: {}, count: 2 })
		attest(filesOf(shards)).equals([["a"], []])
		attest(runsOf(shards[1], shards)).equals([])
	})

	const sliced: Timings = {
		"heavy::heavy vite": 10,
		"heavy::heavy webpack (and Rspack)": 9,
		"heavy::heavy ids": 1,
		light: 2
	}

	it("runs each test of a divided file in one shard", () => {
		const shards = planShards({
			files: ["heavy", "light"],
			timings: sliced,
			count: 3
		})
		attest(shards.map(shard => runsOf(shard, shards))).snap([
			[{ files: ["heavy"], grep: "^(?:heavy vite )" }],
			[{ files: ["heavy"], grep: "^(?:heavy webpack \\(and Rspack\\) )" }],
			[
				{ files: ["light"] },
				{
					files: ["heavy"],
					grep: "^(?:heavy ids |(?!(?:heavy vite|heavy webpack \\(and Rspack\\)|heavy ids) ))"
				}
			]
		])
		attest(
			shardsRunning("heavy", shards, [
				"heavy vite builds",
				"heavy webpack (and Rspack) webpack builds",
				"heavy ids are stable",
				// a describe the timings don't have yet
				"heavy esbuild builds",
				// outside a describe, though it starts as one's title does
				"heavy vite",
				"heavy vitest runs"
			])
		).equals({
			"heavy vite builds": [1],
			"heavy webpack (and Rspack) webpack builds": [2],
			"heavy ids are stable": [3],
			"heavy esbuild builds": [3],
			"heavy vite": [3],
			"heavy vitest runs": [3]
		})
	})

	it("gives a divided file's tests outside its describes their own weight", () => {
		const shards = planShards({
			files: ["heavy"],
			timings: { "heavy::heavy vite": 3, "heavy::": 5, "heavy::heavy ids": 1 },
			count: 2
		})
		attest(shards.map(shard => runsOf(shard, shards))).snap([
			[{ files: ["heavy"], grep: "^(?:(?!(?:heavy vite|heavy ids) ))" }],
			[{ files: ["heavy"], grep: "^(?:heavy vite |heavy ids )" }]
		])
		attest(
			shardsRunning("heavy", shards, ["heavy loads", "heavy ids are stable"])
		).equals({ "heavy loads": [1], "heavy ids are stable": [2] })
	})

	it("runs a divided file whole in a shard holding all of it", () => {
		const shards = planShards({
			files: ["heavy", "light"],
			timings: sliced,
			count: 1
		})
		attest(runsOf(shards[0], shards)).equals([{ files: ["heavy", "light"] }])
	})

	it("runs a test once where one describe's title starts with another's", () => {
		const shards = planShards({
			files: ["heavy"],
			timings: {
				"heavy::heavy vite": 3,
				"heavy::heavy vite plugins": 2,
				"heavy::heavy ids": 1
			},
			count: 3
		})
		attest(
			shardsRunning("heavy", shards, [
				"heavy vite builds",
				"heavy vite plugins load",
				"heavy ids are stable"
			])
		).equals({
			"heavy vite builds": [1],
			"heavy vite plugins load": [2],
			"heavy ids are stable": [3]
		})
	})
})
