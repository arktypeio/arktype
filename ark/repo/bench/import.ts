// imports arktype's build, so run `pnpm build` first

import { flatMorph } from "@ark/util"
import { spawnSync } from "node:child_process"

const processesPerLibrary = 20

const moltar = {
	arktype: `const { type } = await import("arktype")
		mark()
		const T = type({ number: "number", negNumber: "number", maxNumber: "number", string: "string", longString: "string", boolean: "boolean", deeplyNested: { foo: "string", num: "number", bool: "boolean" } })
		if (T(data) instanceof type.errors) throw new Error("invalid")`,
	zod: `const { z } = await import("zod")
		mark()
		const T = z.object({ number: z.number(), negNumber: z.number(), maxNumber: z.number(), string: z.string(), longString: z.string(), boolean: z.boolean(), deeplyNested: z.object({ foo: z.string(), num: z.number(), bool: z.boolean() }) })
		if (!T.safeParse(data).success) throw new Error("invalid")`,
	valibot: `const v = await import("valibot")
		mark()
		const T = v.object({ number: v.number(), negNumber: v.number(), maxNumber: v.number(), string: v.string(), longString: v.string(), boolean: v.boolean(), deeplyNested: v.object({ foo: v.string(), num: v.number(), bool: v.boolean() }) })
		if (!v.safeParse(T, data).success) throw new Error("invalid")`
}

type Library = keyof typeof moltar

type Sample = { import: number; firstParse: number; heap: number }

const child = (body: string) => `
const data = { number: 1, negNumber: -1, maxNumber: Number.MAX_VALUE, string: "string", longString: "Lorem ipsum", boolean: true, deeplyNested: { foo: "bar", num: 1, bool: false } }
const marks = [performance.now()]
const mark = () => marks.push(performance.now())
${body}
mark()
globalThis.gc()
console.log(JSON.stringify({ import: marks[1] - marks[0], firstParse: marks[2] - marks[1], heap: process.memoryUsage().heapUsed / 2 ** 20 }))`

const env = { ...process.env }
// the repo's ts runner resolves arktype to its sources through NODE_OPTIONS
delete env.NODE_OPTIONS
delete env.NODE_COMPILE_CACHE

const run = (library: Library): Sample => {
	const result = spawnSync(
		process.execPath,
		["--expose-gc", "--input-type=module", "--eval", child(moltar[library])],
		{ cwd: import.meta.dirname, env, encoding: "utf8" }
	)
	if (result.status !== 0) throw new Error(result.stderr)
	return JSON.parse(result.stdout)
}

const libraries = Object.keys(moltar) as Library[]
const samples = flatMorph(libraries, (i, library) => [library, [] as Sample[]])

for (let i = 0; i < processesPerLibrary; i++) {
	for (let j = 0; j < libraries.length; j++) {
		const library = libraries[(i + j) % libraries.length]
		samples[library].push(run(library))
	}
}

const median = (values: number[]) => {
	const sorted = values.sort((l, r) => l - r)
	const middleIndex = sorted.length >> 1
	const result =
		sorted.length % 2 ?
			sorted[middleIndex]
		:	(sorted[middleIndex - 1] + sorted[middleIndex]) / 2
	return Number(result.toFixed(2))
}

console.table(
	flatMorph(samples, (library, librarySamples) => [
		library,
		{
			"import (ms)": median(librarySamples.map(s => s.import)),
			"define + first parse (ms)": median(
				librarySamples.map(s => s.firstParse)
			),
			"heap (MiB)": median(librarySamples.map(s => s.heap))
		}
	])
)
