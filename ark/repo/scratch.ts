import { shell } from "@ark/fs"

const times: number[] = []

for (let i = 0; i < 10; i++) {
	const start = performance.now()
	shell("pnpm attest stats")
	const end = performance.now()
	console.log(end - start)
	times.push(end - start)
}

console.log(times.reduce((a, b) => a + b, 0) / times.length)
