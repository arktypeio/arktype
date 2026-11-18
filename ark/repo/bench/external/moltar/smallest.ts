// the "smallest" preset (b2) on moltar's four cases, beside the default build
// (b1) and moltar's own Valibot and Zod cases (cases/valibot.ts and
// cases/zod.ts at 499f3fb) on ark/repo's Valibot and Zod 4. Each process runs
// cjs/child.ts's call shape on moltar's data without a clone of moltar's.
// After build.ts, write the arms count.ts reads, then count them:
// NODE24=<node 24 binary> node moltar/smallest.ts
// COUNT_ARMS=out/smallestArms.json node count.ts <out.json> 3
// count.ts runs each as node moltar/smallest.ts <arm> <case> <k>
import {
	mkdirSync,
	openSync,
	readSync,
	writeFileSync,
	writeSync
} from "node:fs"
import { createRequire } from "node:module"
import { join } from "node:path"
import type { ZodObject } from "zod"
import type { Arm } from "../arms.ts"

type Cases = Record<string, (data: unknown) => unknown>

const here = import.meta.dirname
const [arm, benchmark, k] = process.argv.slice(2)

const arktypeCases = (build: string): Cases => {
	const { t, tSafe, tStrict } = createRequire(import.meta.url)(
		join(here, "out", `${build}.cjs`)
	)
	// as cjs/cases.ts registers them
	return {
		parseSafe: data => tSafe.assert(data),
		parseStrict: data => tStrict.assert(data),
		assertLoose: data => {
			if (t.allows(data)) return true
			throw new Error("Invalid")
		},
		assertStrict: data => {
			if (tStrict.allows(data)) return true
			throw new Error("Invalid")
		}
	}
}

const valibotCases = async (): Promise<Cases> => {
	const { boolean, number, object, parse, strictObject, string } = await import(
		"valibot"
	)
	const entries = {
		number: number(),
		negNumber: number(),
		maxNumber: number(),
		string: string(),
		longString: string(),
		boolean: boolean()
	}
	const nested = { foo: string(), num: number(), bool: boolean() }
	const loose = object({ ...entries, deeplyNested: object(nested) })
	const strict = strictObject({
		...entries,
		deeplyNested: strictObject(nested)
	})
	const options = { abortEarly: true }
	return {
		parseSafe: data => parse(loose, data, options),
		parseStrict: data => parse(strict, data, options),
		assertLoose: data => {
			parse(loose, data, options)
			return true
		},
		assertStrict: data => {
			parse(strict, data, options)
			return true
		}
	}
}

const zodCases = async (): Promise<Cases> => {
	const z = await import("zod")
	const shapeOf = (deeplyNested: ZodObject) => ({
		number: z.number(),
		negNumber: z.number(),
		maxNumber: z.number(),
		string: z.string(),
		longString: z.string(),
		boolean: z.boolean(),
		deeplyNested
	})
	const nested = () =>
		z.object({ foo: z.string(), num: z.number(), bool: z.boolean() })
	const safe = z.object(shapeOf(nested()))
	const strict = z.object(shapeOf(nested().strict())).strict()
	const loose = z.object(shapeOf(nested().passthrough())).passthrough()
	return {
		parseSafe: data => safe.parse(data),
		parseStrict: data => strict.parse(data),
		assertLoose: data => {
			loose.parse(data)
			return true
		},
		assertStrict: data => {
			strict.parse(data)
			return true
		}
	}
}

const armCases: Record<string, () => Cases | Promise<Cases>> = {
	"arktype-b1": () => arktypeCases("b1"),
	"arktype-b2": () => arktypeCases("b2"),
	valibot: valibotCases,
	zod: zodCases
}

if (!arm) {
	const count: Record<string, Arm> = {}
	for (const benchmark of [
		"parseSafe",
		"parseStrict",
		"assertLoose",
		"assertStrict"
	]) {
		for (const name in armCases) {
			count[`${benchmark} ${name}`] = {
				cwd: here,
				node: process.env.NODE24 ?? "node",
				args: [join(here, "smallest.ts"), name, benchmark]
			}
		}
	}
	mkdirSync(join(here, "..", "out"), { recursive: true })
	writeFileSync(
		join(here, "..", "out", "smallestArms.json"),
		JSON.stringify({ count }, null, 1)
	)
	process.exit()
}

// benchmarks/parseSafe.ts's, whose nested object isn't frozen, read as the
// CommonJS ts-node emits for moltar reads it: from its module's exports, which
// write it twice (void 0, then the data), so V8 can't fold it into a constant.
// Read from a const, the default build's assertLoose counts 20, not 69
const parseSafe: { validateData: unknown } = { validateData: undefined }
parseSafe.validateData = Object.freeze({
	number: 1,
	negNumber: -1,
	maxNumber: Number.MAX_VALUE,
	string: "string",
	longString:
		"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Vivendum intellegat et qui, ei denique consequuntur vix. Semper aeterno percipit ut his, sea ex utinam referrentur repudiandae. No epicuri hendrerit consetetur sit, sit dicta adipiscing ex, in facete detracto deterruisset duo. Quot populo ad qui. Sit fugit nostrum et. Ad per diam dicant interesset, lorem iusto sensibus ut sed. No dicam aperiam vis. Pri posse graeco definitiones cu, id eam populo quaestio adipiscing, usu quod malorum te. Ex nam agam veri, dicunt efficiantur ad qui, ad legere adversarium sit. Commune platonem mel id, brute adipiscing duo an. Vivendum intellegat et qui, ei denique consequuntur vix. Offendit eleifend moderatius ex vix, quem odio mazim et qui, purto expetendis cotidieque quo cu, veri persius vituperata ei nec. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
	boolean: true,
	deeplyNested: {
		foo: "bar",
		num: 1,
		bool: false
	}
})

// moltar's Benchmark, whose run() a loop function calls, as in cjs/child.ts
class Case {
	sink: unknown
	fn: (data: unknown) => unknown
	constructor(fn: (data: unknown) => unknown) {
		this.fn = fn
	}
	run() {
		this.sink = this.fn(parseSafe.validateData)
	}
}

const c = new Case((await armCases[arm]())[benchmark])
const fn = () => c.run()
const cycle = (count: number) => {
	while (count--) fn()
}
const n = 2_000_000
const per = 10_000
const warmFrom = process.cpuUsage().user
while (process.cpuUsage().user - warmFrom < 1e6) cycle(per)
const ctl = openSync(process.env.PERF_CTL!, "w")
const ack = openSync(process.env.PERF_ACK!, "r")
const perf = (command: string) => {
	writeSync(ctl, `${command}\n`)
	readSync(ack, Buffer.alloc(5))
}
const cycles = (Number(k) * n) / per
perf("enable")
for (let i = 0; i < cycles; i++) cycle(per)
perf("disable")
console.log(JSON.stringify({ n }))
process.exit()
