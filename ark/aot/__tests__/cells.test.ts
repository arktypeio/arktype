import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { writeUnscannedCellsMessage } from "@ark/aot/internal/scan.ts"
import { precompile, type PrecompileUnpluginOptions } from "@ark/aot/unplugin"
import { build, transformSync, type BuildOptions } from "esbuild"
import { rollup, type Plugin as RollupPlugin } from "rollup"
import {
	build as viteBuild,
	defaultClientConditions,
	type Plugin as VitePlugin,
	type Rolldown
} from "vite"
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { runPlain, writeFixture } from "./utils.ts"

// arktype's packages resolve to their source in this repo
const conditions = ["ark-ts", "production"]

type Files = Record<string, string>

const fixture = (name: string, files: Files) =>
	writeFixture(files, fromHere("temp", "cells", name))

const esbuildBundle = async (
	root: string,
	opts: PrecompileUnpluginOptions = {},
	options: BuildOptions = {}
) => {
	const { outputFiles } = await build({
		entryPoints: [join(root, "main.ts")],
		bundle: true,
		write: false,
		format: "esm",
		conditions,
		logLevel: "silent",
		plugins: [precompile.esbuild({ cwd: root, conditions, ...opts })],
		...options
	})
	return outputFiles![0].text
}

// Vite reads its mode from NODE_ENV
const viteBundle = async (
	root: string,
	opts: PrecompileUnpluginOptions = {},
	{
		minify = false,
		plugins = []
	}: { minify?: boolean; plugins?: VitePlugin[] } = {}
) => {
	const { NODE_ENV } = process.env
	process.env.NODE_ENV = "production"
	try {
		const result = (await viteBuild({
			root,
			configFile: false,
			logLevel: "silent",
			plugins: [
				...plugins,
				precompile.vite({ cwd: root, conditions: ["ark-ts"], ...opts })
			],
			resolve: { conditions: ["ark-ts", ...defaultClientConditions] },
			build: {
				write: false,
				minify,
				lib: { entry: "main.ts", formats: ["es"] }
			}
		})) as Rolldown.RolldownOutput[]
		return result[0].output.find(chunk => chunk.type === "chunk")!.code
	} finally {
		if (NODE_ENV === undefined) delete process.env.NODE_ENV
		else process.env.NODE_ENV = NODE_ENV
	}
}

const rollupBundle = async (
	root: string,
	opts: PrecompileUnpluginOptions = {}
) => {
	const stripping: RollupPlugin = {
		name: "stripping",
		transform: (code, id) =>
			id.endsWith(".ts") ?
				transformSync(code, { loader: "ts" }).code
			:	undefined
	}
	// Rollup has no mode, so a production build says what it is
	const bundle = await rollup({
		input: join(root, "main.ts"),
		plugins: [
			precompile.rollup({
				cwd: root,
				conditions,
				prune: true,
				creationChecks: "none",
				...opts
			}),
			stripping
		],
		onwarn: () => {}
	})
	const { output } = await bundle.generate({ format: "es" })
	await bundle.close()
	return output[0].code
}

const bundlers = {
	esbuild: esbuildBundle,
	vite: viteBundle,
	rollup: rollupBundle
}

// what a bundle logs, then the error ending it, run where a dependency Rollup
// leaves out resolves
const behaviorOf = (js: string, cwd = fromHere()) => {
	const { stdout, stderr } = spawnSync(
		process.execPath,
		["--conditions", "ark-ts", "--input-type=module"],
		{ input: js, cwd, encoding: "utf8" }
	)
	return `${stdout}${stderr.match(/^\w*Error\b.*$/m)?.[0] ?? ""}`
}

const setsCell = (js: string) => /\bsethole\w+\(/.test(js)

// each log of a validator's result
const log = `const tell = out => console.log(out instanceof type.errors ? out.summary : JSON.stringify(out))\n`

const named = `import { type } from "arktype"

const isLong = (s: string) => s.length > 2

export const Name = type("string").narrow(isLong)
`

// behaves as it does passing each validator its holes, reading the holes it
// should from a variable
const itBehavesAsWhole = (
	name: string,
	files: Files,
	{ cells, opts }: { cells: boolean; opts?: PrecompileUnpluginOptions }
) =>
	it(name, async () => {
		const root = fixture(name.replace(/\W+/g, "-"), files)
		const js = await esbuildBundle(root, opts)
		const whole = await esbuildBundle(root, { prune: false, ...opts })
		attest(setsCell(js)).equals(cells)
		attest(setsCell(whole)).equals(false)
		attest(behaviorOf(js)).equals(behaviorOf(whole))
	})

const declaredUnits = (js: string) => js.match(/\w+Allows = /g)?.length

contextualize(function (this: Mocha.Suite) {
	// each case bundles, which a loaded machine slows past mocha's default
	this.timeout(120_000)

	describe("what it saves", () => {
		const app = (name: string) => ({
			"name.ts": `import { type } from "arktype"\n\nexport const Name = ${name}\n`,
			"a.ts": `import { type } from "arktype"\nimport { Name } from "./name.ts"\n\nexport const A = type({ name: Name, id: "string" })\n`,
			"b.ts": `import { type } from "arktype"\nimport { A } from "./a.ts"\nimport { Name } from "./name.ts"\n\nexport const B = type({ name: Name, a: A })\nexport const C = type({ name: Name, a: A })\n`,
			"main.ts": `import { type } from "arktype"\nimport { B, C } from "./b.ts"\n\n${log}tell(B({ name: "x", a: { name: "abc", id: "i" } }))\ntell(C({ name: "abc", a: { name: "abc", id: "i" } }))\n`
		})

		it("runs a narrow on an array's elements as often as arktype does", async () => {
			const root = fixture("narrowed-elements", {
				"main.ts": `import { type } from "arktype"

const isLong = (s: string) => {
	globalThis.calls.push(s)
	return s.length > 2
}
const Long = type("string").narrow(isLong)
const Longs = Long.array()
// read by what the build can't follow, each keeps its methods
export const types = [Long, Longs]
for (const data of [["abc", "abcd"], ["abc", "x", "abcd", "y"]]) {
	globalThis.calls = []
	Longs(data)
	console.log(globalThis.calls.join())
}
`
			})
			const js = await esbuildBundle(root)
			attest(setsCell(js)).equals(true)
			attest(behaviorOf(js)).equals(runPlain(root))
			attest(behaviorOf(js)).snap(`abc,abcd
abc,x,abc,x,abcd,y
`)
		})

		it("declares what's above a narrow once, as what's above a keyword, besides the narrow's own", async () => {
			const narrowed = await esbuildBundle(
				fixture("narrowed", app(`type("string").narrow(s => s.length > 2)`))
			)
			const unheld = await esbuildBundle(
				fixture("unheld", app(`type("string > 2")`))
			)
			attest(declaredUnits(narrowed)).equals(declaredUnits(unheld)! + 1)
			attest(behaviorOf(narrowed))
				.snap(`name must be valid according to an anonymous predicate
{"name":"abc","a":{"name":"abc","id":"i"}}
`)
		})
	})

	describe("what a bundler drops", () => {
		const lib = {
			"lib/package.json": `{ "sideEffects": false }`,
			"lib/name.ts": `import { type } from "arktype"

export const Name = type("string").narrow(s => s.length > 2)
export const Unread = type("string").narrow(s => s.includes("UNREAD_TEXT"))
`,
			"lib/user.ts": `import { type } from "arktype"
import { Name } from "./name.ts"

export const User = type({ name: Name })
`,
			"lib/index.ts": `export * from "./name.ts"\nexport * from "./user.ts"\n`
		}
		const read = fixture("sideEffects", {
			...lib,
			"main.ts": `import { User } from "./lib/index.ts"

console.log(String(User({ name: "x" })))
console.log(JSON.stringify(User({ name: "abc" })))
`
		})
		const expected = `name must be valid according to an anonymous predicate
{"name":"abc"}
`
		for (const [name, bundle] of Object.entries(bundlers)) {
			it(`${name} keeps what sets a cell only a module marked free of side effects reads, dropping one unread`, async () => {
				const js = await bundle(read)
				attest(setsCell(js)).equals(true)
				attest(behaviorOf(js, read)).equals(expected)
				attest(js.includes("UNREAD_TEXT")).equals(false)
			})
		}

		it("a minifier inlining what it can keeps what sets a cell", async () => {
			attest(
				behaviorOf(await esbuildBundle(read, {}, { minify: true }))
			).equals(expected)
			attest(behaviorOf(await viteBundle(read, {}, { minify: true }))).equals(
				expected
			)
		})

		it("keeps a cell's site where a Type in its own module is what's read", async () => {
			const js = await esbuildBundle(
				fixture("sameModule", {
					"main.ts": `import { type } from "arktype"

const Name = type("string").narrow(s => s.length > 2)
const User = type({ name: Name })

console.log(String(User({ name: "x" })))
`
				})
			)
			attest(behaviorOf(js)).snap(
				"name must be valid according to an anonymous predicate\n"
			)
		})

		it("reads either of two sites setting one cell, whichever it keeps", async () => {
			const js = await esbuildBundle(
				fixture("twoSites", {
					"main.ts": `import { type } from "arktype"

const isLong = (s: unknown) => String(s).length > 2

const Unread = type("string").narrow(isLong)
const Read = type("number").narrow(isLong)

console.log(String(Read(1)))
`
				})
			)
			attest(setsCell(js)).equals(true)
			attest(behaviorOf(js)).snap("must be valid according to isLong\n")
		})
	})

	describe("import cycles", () => {
		const cycle = (first: string) => ({
			"a.ts": `import { type } from "arktype"
import { Reader } from "./b.ts"

export const Name = type("string").narrow(s => s.length > 2)
export const readerAtA = Reader
`,
			"b.ts": `import { type } from "arktype"
import { Name } from "./a.ts"

export const Reader = type({ name: Name })
`,
			"main.ts": `import { ${first === "a" ? "readerAtA as Read" : "Reader as Read"} } from "./${first}.ts"

console.log(String(Read({ name: "x" })))
`
		})
		for (const [name, bundle] of Object.entries(bundlers)) {
			it(`${name} throws as whole where a site reads a Type whose site hasn't run`, async () => {
				const root = fixture(`cycleUnset${name}`, cycle("a"))
				const js = await bundle(root)
				const whole = await bundle(root, { prune: false })
				attest(behaviorOf(js, root)).equals(behaviorOf(whole, root))
				attest(behaviorOf(js, root).includes("Error")).equals(true)
			})

			it(`${name} reads as whole where the Type's site ran first`, async () => {
				const root = fixture(`cycleSet${name}`, cycle("b"))
				const js = await bundle(root)
				const whole = await bundle(root, { prune: false })
				attest(behaviorOf(js, root)).equals(behaviorOf(whole, root))
				attest(behaviorOf(js, root)).snap(
					"name must be valid according to an anonymous predicate\n"
				)
			})
		}

		it("names what's undefined as a factory's check would", async () => {
			const js = await esbuildBundle(fixture("cycleMessage", cycle("a")))
			attest(behaviorOf(js)).snap(
				"Error: `Name` is undefined, but was precompiled as the Type it was at build"
			)
		})
	})

	describe("a module running twice", () => {
		// each run's narrow reads its own limit, so two runs can't share a function
		const limited = `import { type } from "arktype"

const limit = ((globalThis as any).limit = ((globalThis as any).limit ?? 0) + 2)

export const Long = type("string").narrow(s => s.length > limit)
`
		const twice = (first: string, second: string) => ({
			"m.ts": limited,
			"main.ts": `import { type } from "arktype"
import { Long as First } from "${first}"
import { Long as Second } from "${second}"

${log}tell(First("abc"))
tell(Second("abc"))
`
		})
		const queried = fixture("queried", twice("./m.ts?v=1", "./m.ts?v=2"))

		it("esbuild keeps two queries' runs apart", async () => {
			const js = await esbuildBundle(queried)
			attest(setsCell(js)).equals(false)
			attest(behaviorOf(js)).snap(`"abc"
must be valid according to an anonymous predicate
`)
		})

		it("vite refuses a site in a queried module, as it does whole", async () => {
			const errorOf = (opts: PrecompileUnpluginOptions) =>
				viteBundle(queried, opts).then(
					() => "",
					(e: Error) => e.message
				)
			attest((await errorOf({})).includes("another plugin writes")).equals(true)
			attest(
				(await errorOf({ prune: false })).includes("another plugin writes")
			).equals(true)
		})

		it("keeps a package duplicated at two paths apart", async () => {
			const longerThan = (min: number) => `import { type } from "arktype"

export const Long = type("string").narrow(s => s.length > ${min})
`
			const root = fixture("duplicated", {
				"one/m.ts": longerThan(2),
				"two/m.ts": longerThan(4),
				"main.ts": twice("./one/m.ts", "./two/m.ts")["main.ts"]
			})
			const js = await esbuildBundle(root)
			attest(setsCell(js)).equals(true)
			attest(behaviorOf(js)).snap(`"abc"
must be valid according to an anonymous predicate
`)
		})

		// each run alive, as a chunk imported again under a URL leaves them
		const bothRuns = (
			first: string,
			second: string
		) => `const first = await import("${first}")
const second = await import("${second}")
console.log(String(first.Long("abc")))
console.log(String(second.Long("abc")))
console.log(String(first.Long("abc")))
`
		const eachRunsOwnLimit = `abc
must be valid according to an anonymous predicate
abc
`
		const inESM = { "package.json": `{ "type": "module" }\n` }

		it("keeps each entry of a build that doesn't split apart", async () => {
			const root = fixture("entries", {
				...inESM,
				"m.ts": limited,
				"one.ts": `export { Long } from "./m.ts"\n`,
				"two.ts": `export { Long } from "./m.ts"\n`
			})
			await build({
				entryPoints: [join(root, "one.ts"), join(root, "two.ts")],
				bundle: true,
				outdir: join(root, "out"),
				format: "esm",
				conditions,
				logLevel: "silent",
				plugins: [precompile.esbuild({ cwd: root, conditions })]
			})
			attest(behaviorOf(bothRuns("./out/one.js", "./out/two.js"), root)).equals(
				eachRunsOwnLimit
			)
		})

		const reloaded = async (name: string, narrowed: string) => {
			const root = fixture(name, {
				...inESM,
				"m.ts": narrowed,
				"main.ts": `export const load = () => import("./m.ts")\n`
			})
			await build({
				entryPoints: [join(root, "main.ts")],
				bundle: true,
				splitting: true,
				outdir: join(root, "out"),
				chunkNames: "[name]",
				format: "esm",
				conditions,
				logLevel: "silent",
				plugins: [precompile.esbuild({ cwd: root, conditions })]
			})
			return root
		}

		it("a chunk imported again under a URL reads what its run set", async () => {
			const root = await reloaded("reloaded", limited)
			attest(setsCell(readFileSync(join(root, "out/m.js"), "utf8"))).equals(
				false
			)
			attest(
				behaviorOf(bothRuns("./out/m.js?first", "./out/m.js?second"), root)
			).equals(eachRunsOwnLimit)
		})

		it("a chunk imported again under a URL can't change what no run differs in", async () => {
			const root = await reloaded(
				"reloaded-same",
				`import { type } from "arktype"

export const Long = type("string").narrow(s => s.length > 4)
`
			)
			attest(setsCell(readFileSync(join(root, "out/m.js"), "utf8"))).equals(
				true
			)
			attest(
				behaviorOf(bothRuns("./out/m.js?first", "./out/m.js?second"), root)
			).equals(`must be valid according to an anonymous predicate
must be valid according to an anonymous predicate
must be valid according to an anonymous predicate
`)
		})

		itBehavesAsWhole(
			"two queries' runs of what no run differs in",
			{
				"m.ts": `import { type } from "arktype"

export const Long = type("string").narrow(s => s.length > 2)
`,
				"main.ts": `import { Long as First } from "./m.ts?v=1"
import { Long as Second } from "./m.ts?v=2"

console.log(String(First("abc")), String(Second("x")))
`
			},
			{ cells: true }
		)
	})

	// each function a module of one program, so what each read decides is told
	// apart in one build
	describe("what a function reads, which two runs of its module mustn't differ in", () => {
		const reads: Record<string, [isSame: boolean, source: string]> = {
			"a constant computed from literals": [
				true,
				`const limit = 2 ** 1
const check = (s: string) => s.length > limit`
			],
			"a constant another module exports": [
				true,
				`import { MAX } from "./limits.ts"
const check = (s: string) => s.length > MAX`
			],
			"a regex holding nothing it matched": [
				true,
				`const pattern = /abc/u
const check = (s: string) => pattern.test(s)`
			],
			"a regex holding where it last matched": [
				false,
				`const pattern = /a/g
const check = (s: string) => pattern.test(s)`
			],
			"a list nothing writes": [
				true,
				`const allowed = ["abc"] as const
const check = (s: string) => allowed.includes(s as never)`
			],
			"a list its module writes": [
				false,
				`const allowed = ["abc"]
const check = (s: string) => allowed.includes(s)
allowed.push("x")`
			],
			"a list another module writes": [
				false,
				`import { written } from "./limits.ts"
const check = (s: string) => written.includes(s)`
			],
			"a list passed where the build doesn't follow": [
				false,
				`const allowed = ["abc"]
const check = (s: string) => allowed.includes(s)
;(globalThis as any).seen?.(allowed)`
			],
			"a table of sets nothing writes": [
				true,
				`const allowed: Record<string, ReadonlySet<string>> = { a: new Set(["abc"]) }
const check = (s: string) => {
	const set = allowed.a
	return set.has(s)
}`
			],
			"a table of sets one is added to": [
				false,
				`const allowed: Record<string, Set<string>> = { a: new Set(["abc"]) }
const check = (s: string) => allowed.a.add(s).size > 9`
			],
			"an encoder": [
				true,
				`const encoder = new TextEncoder()
const check = (s: string) => encoder.encode(s).byteLength > 2`
			],
			"a function reading what's the same": [
				true,
				`const limit = 2
function isLong(s: string) {
	return s.length > limit
}
const check = (s: string) => isLong(s)`
			],
			"a function reading state": [
				false,
				`let calls = 0
function isLong(s: string) {
	return ++calls < 9 && s.length > 2
}
const check = (s: string) => isLong(s)`
			],
			"functions reading each other": [
				true,
				`function even(n: number): boolean {
	return n === 0 || odd(n - 1)
}
function odd(n: number): boolean {
	return n !== 0 && even(n - 1)
}
const check = (s: string) => odd(s.length)`
			],
			// `first` reads nothing but `second`, which is decided after it
			"functions reading each other, one reading state": [
				false,
				`let state = true
function first(s: string): boolean {
	return s.length > 9 || second(s)
}
function second(s: string): boolean {
	return state || first(s)
}
const check = (s: string) => first(s)`
			],
			"state it holds on itself": [
				false,
				`function check(s: string): boolean {
	check.calls = (check.calls ?? 0) + 1
	return check.calls < 9
}
check.calls = 0`
			],
			"a function read as more than a call": [
				false,
				`const isLong = (s: string) => s.length > 2
const check = (s: string) => [s].every(isLong)`
			],
			"a value only running decides": [
				false,
				`const limit = Math.random() < 2 ? 1 : 2
const check = (s: string) => s.length > limit`
			],
			"a class": [
				false,
				`class Limit {
	max = 2
}
const check = (s: string) => s.length > new Limit().max`
			],
			"where its text was loaded from": [
				false,
				`const check = (s: string) => import.meta.url.length > 0`
			],
			"a Type holding what's the same": [
				true,
				`const Inner = type("string").narrow(s => s.length > 2)
const check = (s: string) => Inner.allows(s)`
			],
			"a Type holding what a run decides": [
				false,
				`const limit = Math.random() < 2 ? 1 : 2
const Inner = type("string").narrow(s => s.length > limit)
const check = (s: string) => Inner.allows(s)`
			]
		}
		const names = Object.keys(reads)
		const root = fixture("reads", {
			"limits.ts": `export const MAX = 2 * 1\nexport const written = ["abc"]\n`,
			"writes.ts": `import { written } from "./limits.ts"\n\nwritten.push("x")\n`,
			"main.ts": `import "./writes.ts"
${names.map((_, i) => `import { Read as Read${i} } from "./read${i}.ts"`).join("\n")}

${names.map((_, i) => `console.log(${i}, String(Read${i}("abc")), String(Read${i}("x")))`).join("\n")}
`,
			...Object.fromEntries(
				names.map((name, i) => [
					`read${i}.ts`,
					`import { type } from "arktype"
${reads[name][1]}
export const Read = type("string").narrow(check)
`
				])
			)
		})
		let js = ""
		before(async () => {
			js = await esbuildBundle(root)
		})

		it("behaves as whole", async () => {
			attest(behaviorOf(js)).equals(
				behaviorOf(await esbuildBundle(root, { prune: false }))
			)
		})

		for (const [i, name] of names.entries()) {
			it(`${reads[name][0] ? "holds" : "doesn't hold"} one reading ${name}`, () => {
				// esbuild numbers each module's `check` from the second
				attest(
					new RegExp(`sethole\\w+\\(check${i ? i + 1 : ""}\\)`).test(js)
				).equals(reads[name][0])
			})
		}
	})

	describe("what no variable can hold", () => {
		itBehavesAsWhole(
			"a site in a function reading what its call closes over",
			{
				"main.ts": `import { type } from "arktype"

const atLeast = (min: number) => type("number").narrow(n => n >= min)
const One = atLeast(1)
const Two = atLeast(2)

console.log(String(One(1)), String(Two(1)))
`
			},
			{ cells: false }
		)

		itBehavesAsWhole(
			"a site in a loop",
			{
				"main.ts": `import { type } from "arktype"

const all = []
for (const min of [1, 2]) all.push(type("number").narrow(n => n >= min))

console.log(all.map(T => String(T(1))).join())
`
			},
			{ cells: false }
		)

		itBehavesAsWhole(
			"a function read off an object",
			{
				"main.ts": `import { type } from "arktype"

const checks = { isLong: (s: string) => s.length > 2 }
const Name = type("string").narrow(checks.isLong)

console.log(String(Name("x")))
`
			},
			{ cells: false }
		)

		itBehavesAsWhole(
			"a function renamed once a site has read it",
			{
				"main.ts": `import { type } from "arktype"

const isLong = (s: string) => s.length > 2
const Name = type("string").narrow(isLong)
Object.defineProperty(isLong, "name", { value: "renamed" })

console.log(String(Name("x")))
`
			},
			{ cells: false }
		)

		itBehavesAsWhole(
			"an exported function another module may rename",
			{
				"check.ts": `export const isLong = (s: string) => s.length > 2\n`,
				"rename.ts": `import { isLong } from "./check.ts"\n\nObject.defineProperty(isLong, "name", { value: "renamed" })\n`,
				"main.ts": `import { type } from "arktype"
import "./rename.ts"
import { isLong } from "./check.ts"

const Name = type("string").narrow(isLong)

console.log(String(Name("x")))
`
			},
			{ cells: false }
		)
	})

	describe("what a variable holds", () => {
		itBehavesAsWhole(
			"a function another module exports, called and read by sites",
			{
				"check.ts": `export const isLong = (s: string) => s.length > 2\nexport const isLonger = (s: string) => isLong(s) && s.length > 3\n`,
				"main.ts": `import { type } from "arktype"
import { isLong, isLonger } from "./check.ts"

const Name = type("string").narrow(isLong)
const Other = type("string").narrow(isLonger)

console.log(String(Name("x")), String(Other("abc")))
`
			},
			{ cells: true }
		)

		itBehavesAsWhole(
			"a Type holding one beside a function no variable holds",
			{
				"name.ts": named,
				"main.ts": `import { type } from "arktype"
import { Name } from "./name.ts"

const withMin = (min: number) =>
	type({ name: Name, n: type("number").narrow(n => n >= min) })

const T = withMin(2)

console.log(String(T({ name: "x", n: 1 })))
console.log(JSON.stringify(T({ name: "abc", n: 2 })))
`
			},
			{ cells: true }
		)

		itBehavesAsWhole(
			"a morph and a narrow read from one Type",
			{
				"main.ts": `import { type } from "arktype"

const size = (s: string) => s.length
const isLong = (s: string) => s.length > 2

const T = type({ name: type("string").narrow(isLong).pipe(size) })

console.log(JSON.stringify(T({ name: "abc" })), String(T({ name: "x" })))
`
			},
			{ cells: true }
		)

		itBehavesAsWhole(
			"a site in a function reading a function its module creates",
			{
				"name.ts": named,
				"main.ts": `import { type } from "arktype"
import { Name } from "./name.ts"

const isShort = (s: string) => s.length < 2
const user = () => type({ name: Name, short: type("string").narrow(isShort) })

console.log(String(user()({ name: "x", short: "abc" })))
`
			},
			{ cells: true }
		)

		itBehavesAsWhole(
			"a Scope's aliases and its export",
			{
				"main.ts": `import { scope, type } from "arktype"

const $ = scope({
	name: type("string").narrow(s => s.length > 2),
	user: { name: "name" },
	"team?": "user[]"
})
const { user, name } = $.export()
const Other = $.type({ lead: "user" })

console.log(String(user({ name: "x" })), String(name("x")))
console.log(String(Other({ lead: { name: "x" } })))
`
			},
			{ cells: true }
		)

		itBehavesAsWhole(
			"a Module's member read by another site",
			{
				"main.ts": `import { type } from "arktype"

const m = type.module({ name: type("string").narrow(s => s.length > 2) })
const T = type({ n: m.name })

console.log(String(T({ n: "x" })))
`
			},
			{ cells: true }
		)

		itBehavesAsWhole(
			"a Generic instantiated with one",
			{
				"name.ts": named,
				"main.ts": `import { type } from "arktype"
import { Name } from "./name.ts"

const Box = type("<t>", { value: "t" })
const T = Box(Name)

console.log(String(T({ value: "x" })))
`
			},
			{ cells: true }
		)

		itBehavesAsWhole(
			"a default its thunk reads",
			{
				"main.ts": `import { type } from "arktype"

const isLong = (s: string) => s.length > 2
const T = type({
	names: ["string[]", "=", () => []],
	other: type("string").narrow(isLong)
})

console.log(JSON.stringify(T({ other: "abc" })), String(T({ other: "x" })))
`
			},
			{ cells: true }
		)

		itBehavesAsWhole(
			"a default above it, in a Type two sites read",
			{
				"name.ts": named,
				"main.ts": `import { type } from "arktype"
import { Name } from "./name.ts"

const T = type({ name: Name.default("abc") })
const U = type({ t: T, v: T })

console.log(JSON.stringify(U({ t: {}, v: {} })), String(U({ t: { name: "x" }, v: {} })))
`
			},
			{ cells: true }
		)

		itBehavesAsWhole(
			"a message a config holds beside it",
			{
				"main.ts": `import { type } from "arktype"

const isLong = (s: string) => s.length > 2
const message = (ctx: { data: unknown }) => "bad " + ctx.data
const T = type("string").narrow(isLong).configure({ message })

console.log(String(T("x")))
`
			},
			{ cells: true }
		)

		itBehavesAsWhole(
			"a function renamed before any site reads it",
			{
				"main.ts": `import { type } from "arktype"

const isLong = (s: string) => s.length > 2
Object.defineProperty(isLong, "name", { value: "renamed" })
const Name = type("string").narrow(isLong)

console.log(String(Name("x")))
`
			},
			{ cells: true }
		)

		it("prints the name a minifier leaves, as passing it does", async () => {
			const root = fixture("minifiedName", {
				"main.ts": `import { type } from "arktype"

const isLong = (s: string) => s.length > 2
const T = type({ name: type("string").narrow(isLong) })

console.log(String(T({ name: "x" })))
`
			})
			const mangled = (js: string) =>
				behaviorOf(js).replace(
					/according to \S+/,
					"according to a mangled name"
				)
			const options = { minify: true }
			attest(mangled(await esbuildBundle(root, {}, options))).snap(
				"name must be valid according to a mangled name\n"
			)
			attest(
				behaviorOf(await esbuildBundle(root, {}, options)).includes("isLong")
			).equals(false)
		})

		itBehavesAsWhole(
			"a name it prints",
			{
				"main.ts": `import { type } from "arktype"

function isLong(s: string) {
	return s.length > 2
}
const T = type({ name: type("string").narrow(isLong) })

console.log(String(T({ name: "x" })))
`
			},
			{ cells: true }
		)

		for (const opts of [
			{ preset: "smallest" },
			{ optimize: "size" },
			{ lazy: false }
		] as PrecompileUnpluginOptions[]) {
			itBehavesAsWhole(
				`a program read with ${JSON.stringify(opts)}`,
				{
					"name.ts": named,
					"main.ts": `import { type } from "arktype"
import { Name } from "./name.ts"

const User = type({ name: Name, "alias?": Name })
const Team = type({ lead: User, members: User.array() })

console.log(String(Team({ lead: { name: "x" }, members: [{ name: "y", alias: "z" }] })))
console.log(Team.allows({ lead: { name: "abc" }, members: [] }))
`
				},
				{ cells: true, opts }
			)
		}
	})

	describe("what a validator holds of its id", () => {
		const root = fixture("comparedIds", {
			"containers.ts": `import { type } from "arktype"
export const H = { a: type("string") }
export const Other = type("number")
`,
			"main.ts": `import { type } from "arktype"
import { H, Other } from "./containers.ts"

const T = type({ x: H.a })
console.log(T.allows({ x: "a" }), Other.allows(1))
`
		})

		it("is nothing where no read compares it", async () => {
			const js = await esbuildBundle(root)
			attest(behaviorOf(js)).equals("true true\n")
			attest(/^var Other = [^"]*$/m.test(js)).equals(true)
		})

		it("is compared where a read of a holder does", async () => {
			const js = await esbuildBundle(root)
			// a write the build couldn't see, as code it doesn't read may make
			const written = js.replace(/^var T = /m, "H.a = Other\n$&")
			attest(behaviorOf(written)).equals(
				"Error: `H.a` is another Type, but was precompiled as the Type it was at build"
			)
		})
	})

	describe("a configured program", () => {
		const root = fixture("configuredInPlace", {
			"config.ts": `import { configure } from "arktype/config"

configure({ onUndeclaredKey: "delete" })
`,
			"main.ts": `import "./config.ts"
import { type } from "arktype"

export const T = type({ a: "string" })
export const Unread = type({ b: "number" })
console.log(JSON.stringify(T({ a: "a", c: 1 })))
`
		})
		const opts = { config: "config.ts" }

		for (const [name, preset] of Object.entries({
			default: {},
			smallest: { preset: "smallest" as const }
		})) {
			it(`creates a Type after its module fixes the config, in a ${name} build`, async () => {
				const js = await esbuildBundle(root, { ...opts, ...preset })
				attest(
					/^var T = (?:\/\* @__PURE__ \*\/ )?create\w+\(/m.test(js)
				).equals(true)
				attest(js.indexOf("fixConfigured(") < js.indexOf("var T = ")).equals(
					true
				)
				attest(behaviorOf(js)).equals(
					behaviorOf(await esbuildBundle(root, { ...opts, prune: false }))
				)
			})
		}
	})

	describe("a default holding a cycle", () => {
		itBehavesAsWhole(
			"shares its morph where the cycle's the same, and not where it isn't",
			{
				"main.ts": `import { scope, type } from "arktype"

const makeTrees = () => []
const { Tree } = scope({ Tree: { name: "string", "children?": "Tree[]" } }).export()
const { Tree: Other } = scope({ Tree: { name: "number", "children?": "Tree[]" } }).export()
const A = type({ trees: Tree.array().default(makeTrees) })
const B = type({ trees: Tree.array().default(makeTrees) })
const C = type({ trees: Other.array().default(makeTrees) })
const D = type({ trees: Tree.array().default(() => []) })
console.log(JSON.stringify([A({}), B({}), C({}), D({})]))
console.log(String(A({ trees: [{ name: 1 }] })), String(C({ trees: [{ name: "a" }] })))
`
			},
			{ cells: true }
		)

		itBehavesAsWhole(
			"tells apart the narrows of cycles of the same shape",
			{
				"main.ts": `import { scope, type } from "arktype"

const isLong = (s: string) => s.length > 2
const isShort = (s: string) => s.length < 2
const makeTrees = () => []
const long = type("string").narrow(isLong)
const short = type("string").narrow(isShort)
const { Tree: Long } = scope({ Name: long, Tree: { name: "Name", "children?": "Tree[]" } }).export()
const { Tree: Short } = scope({ Name: short, Tree: { name: "Name", "children?": "Tree[]" } }).export()
const A = type({ trees: Long.array().default(makeTrees) })
const B = type({ trees: Short.array().default(makeTrees) })
console.log(String(A({ trees: [{ name: "abc" }] })), String(B({ trees: [{ name: "abc" }] })))
console.log(String(A({ trees: [{ name: "a" }] })), String(B({ trees: [{ name: "a" }] })))
`
			},
			{ cells: true }
		)
	})

	it("drops a site what it checks only compares for", async () => {
		const js = await esbuildBundle(
			fixture("comparesOnly", {
				"containers.ts": `import { type } from "arktype"
export const H = { a: type("string"), b: type("number") }
`,
				"main.ts": `import { type } from "arktype"
import { H } from "./containers.ts"

const Unread = type({ dropped: H.a })
const Read = type({ kept: H.b })
console.log(Read.allows({ kept: 1 }))
`
			})
		)
		attest(js.includes("dropped")).equals(false)
		attest(js.includes("kept")).equals(true)
	})

	describe("what reads its node", () => {
		const onFail = `import { configure } from "arktype/config"

configure({ onFail: errors => \`failed: \${errors.summary}\` })
`

		for (const [name, opts, config] of [
			["default", {}, ""],
			["smallest", { preset: "smallest" as const }, ""],
			["configured", { config: "config.ts" }, onFail]
		] as const) {
			itBehavesAsWhole(
				`behaves as whole, in a ${name} build`,
				{
					"config.ts": config,
					"main.ts": `${config && 'import "./config.ts"\n'}import { type, scope } from "arktype"

const Contextual = type("string").narrow((s, ctx) => s.length > 2 || ctx.mustBe("long"))
const Morphed = type("string").pipe(s => s.length)
const Throws = type("string").pipe.try(s => JSON.parse(s))
const { Cyclic } = scope({ Cyclic: { "next?": "Cyclic", n: "number = 1" } }).export()
const tell = (out: unknown) => console.log(out instanceof type.errors ? out.summary : JSON.stringify(out))
tell(Contextual("abc"))
tell(Contextual("a"))
tell(Morphed("abc"))
tell(Morphed(1))
tell(Throws("{"))
tell(Cyclic({ next: {} }))
tell(Cyclic({ next: { n: "a" } }))
tell([Contextual, Morphed, Cyclic].map(T => T.allows("abc")))
`
				},
				{ cells: true, opts }
			)
		}
	})

	describe("a module a plugin ahead of arktype's rewrote after the scan read it", () => {
		const rewriting = (rewrite: (code: string) => string): VitePlugin => ({
			name: "rewriting",
			enforce: "pre",
			transform: (code, id) =>
				id.endsWith("/name.ts") ? rewrite(code) : undefined
		})
		const root = fixture("rewritten", {
			"name.ts": named,
			"main.ts": `import { type } from "arktype"
import { Name } from "./name.ts"

const User = type({ name: Name })

console.log(String(User({ name: "x" })))
`
		})

		it("sets the cell its function took", async () => {
			const js = await viteBundle(
				root,
				{},
				{ plugins: [rewriting(code => code.split("\n").join("\n\n"))] }
			)
			attest(setsCell(js)).equals(true)
			attest(behaviorOf(js)).snap("name must be valid according to isLong\n")
		})

		it("fails where it can't tell which function is which", async () => {
			const message = await viteBundle(
				root,
				{},
				{
					plugins: [
						rewriting(code => code.replace("isLong)", "s => s.length > 2)"))
					]
				}
			).then(
				() => "",
				(e: Error) => e.message
			)
			attest(message.includes(writeUnscannedCellsMessage("name.ts"))).equals(
				true
			)
		})

		it("fails where a function no longer reads only its argument", async () => {
			const message = await viteBundle(
				root,
				{},
				{
					plugins: [
						rewriting(code =>
							code.replace(
								"(s: string) => s.length > 2",
								"function (s: string) { return arguments.length > 1 && s.length > 2 }"
							)
						)
					]
				}
			).then(
				() => "",
				(e: Error) => e.message
			)
			attest(message.includes(writeUnscannedCellsMessage("name.ts"))).equals(
				true
			)
		})
	})
})
