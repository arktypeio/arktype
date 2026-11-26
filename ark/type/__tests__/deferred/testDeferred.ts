import { fuzz } from "./fuzz.ts"

// each program in a process building Types as they're read and in one building
// them as they're defined, which must agree:
// pnpm testDeferred [seeds] [programs] [firstSeed] [jobs]
const [seeds = 2, programs = 100, firstSeed = 1, jobs = 4] = process.argv
	.slice(2)
	.map(Number)

for (let seed = firstSeed; seed < firstSeed + seeds; seed++) {
	const result = await fuzz(seed, programs, jobs)
	console.log(
		`seed ${seed}: ${programs} programs, ${result.defined} Types defined (${result.unread} unread at their call), ${result.threw} definitions thrown, ${result.read} read, ${result.comparisons} comparisons`
	)
	for (const { index, mismatch, repro } of result.failures) {
		console.log(
			`program ${index} differs at ${mismatch.at}:\n\tread: ${mismatch.deferred}\n\tcall: ${mismatch.eager}`
		)
		if (repro) console.log(repro)
		process.exitCode = 1
	}
}
