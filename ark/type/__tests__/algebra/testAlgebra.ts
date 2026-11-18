import { fuzz } from "./fuzz.ts"

// the algebra fuzz over more seeds and pairs than pnpm test runs:
// pnpm testAlgebra [seeds] [pairs]
const [seeds = 4, pairs = 3000] = process.argv.slice(2).map(Number)

for (let seed = 1; seed <= seeds; seed++) {
	const { invalid, failures } = fuzz(seed, pairs)
	console.log(
		`seed ${seed}: ${pairs} pairs, ${invalid} with a side that doesn't parse`
	)
	for (const [name, messages] of Object.entries(failures)) {
		for (const message of messages) console.log(`${name}: ${message}`)
		if (messages.length) process.exitCode = 1
	}
}
