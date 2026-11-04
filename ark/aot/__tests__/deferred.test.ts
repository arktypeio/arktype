import { attest, contextualize } from "@ark/attest"
import { Precompiler, type PrecompileOptions } from "@ark/aot"
import { fromHere } from "@ark/fs"
import { precompile, type PrecompileUnpluginOptions } from "@ark/aot/unplugin"
import { build } from "esbuild"
import { join } from "node:path"
import webpack from "webpack"
import {
	memoryHost,
	normalized,
	runBundle,
	tempDir,
	writeFixture
} from "./utils.ts"

// arktype's packages resolve to their source in this repo
const conditions = ["ark-ts", "production"]

const typesOf = (count: number, from = 0) =>
	Array.from(
		{ length: count },
		(_, i) =>
			`export const T${from + i} = type({ id: "string", f${from + i}: "number" })`
	).join("\n")

const large = 70

// one directory for each program, whose path a bundle's comments print
const rootsByFiles = new WeakMap<object, string>()

const rootOf = (files: Record<string, string>) => {
	let root = rootsByFiles.get(files)
	if (!root) {
		root = writeFixture(files, tempDir("ark-deferred-", fromHere("temp")))
		rootsByFiles.set(files, root)
	}
	return root
}

const bundleOf = async (
	files: Record<string, string>,
	opts: PrecompileUnpluginOptions = {}
) => {
	const root = rootOf(files)
	const { outputFiles } = await build({
		entryPoints: [join(root, "main.ts")],
		bundle: true,
		write: false,
		format: "esm",
		conditions,
		logLevel: "silent",
		plugins: [precompile.esbuild({ conditions, cwd: root, ...opts })]
	})
	return outputFiles[0].text
}

const programOf = (count: number) => ({
	"types.ts": `import { type } from "arktype"\n${typesOf(count)}\n`,
	"main.ts": `import * as types from "./types.ts"\nfor (const t of Object.values(types)) console.log(t.allows({}))\n`
})

// Types of each form a validator is written in, read before anything calls them
const formsOf = (prefix: string) => `
export const ${prefix}Object = type({ a: "string", "b?": "number" })
export const ${prefix}Morph = type("string.numeric.parse")
export const ${prefix}Defaulted = type({ a: "string = 'x'" })
export const ${prefix}Items = type({ a: "string" }).array()
export const ${prefix}Union = type({ kind: "'a'", a: "string" }).or({ kind: "'b'", b: "number" })
export const ${prefix}Piped = type("string").pipe(s => s.length)
export const ${prefix}Narrowed = type("number").narrow(n => n % 2 === 0)
`

const forms = [
	"Object",
	"Morph",
	"Defaulted",
	"Items",
	"Union",
	"Piped",
	"Narrowed"
]

const inputs = `{
	Object: [{ a: "a" }, { a: 1 }],
	Morph: ["5", "a"],
	Defaulted: [{}, { a: 1 }],
	Items: [[{ a: "a" }], [{ a: 1 }]],
	Union: [{ kind: "b", b: 1 }, { kind: "b", b: "1" }],
	Piped: ["abc", 1],
	Narrowed: [2, 3]
}`

const surfaceProgram = {
	"types.ts": `import { type } from "arktype"
${formsOf("Called")}
${formsOf("Allowed")}
${typesOf(large)}
`,
	"main.ts": `import { type } from "arktype"
import * as types from "./types.ts"

const inputs = ${inputs}
const show = out => out instanceof type.errors ? out.summary : JSON.stringify(out)
for (const form of ${JSON.stringify(forms)}) {
	const [valid, invalid] = inputs[form]
	const called = types["Called" + form]
	const allowed = types["Allowed" + form]
	const surface = t => [typeof t, t instanceof Function, Object.getOwnPropertyNames(t).sort().join()].join(" ")
	console.log(form, surface(called), surface(allowed))
	// read before anything creates what they check with
	const allows = allowed.allows
	console.log(show(called(valid)), show(called(invalid)), called.allows(valid), called.allows(invalid))
	console.log(allows === allowed.allows, allows(valid), allows(invalid), show(allowed(valid)), allows === allowed.allows)
	console.log(show(called.assert(valid)), JSON.stringify(called["~standard"].validate(valid)))
	console.log(called === types["Called" + form], called.expression, called.json === types["Called" + form].json)
}
`
}

// each module's code and the modules it writes
const answersOf = (
	files: Record<string, string>,
	order: string[],
	opts?: PrecompileOptions
) => {
	const precompiler = new Precompiler(memoryHost(files), opts)
	return Object.fromEntries(
		order.map(id => {
			const { code, modules } = precompiler.precompile(files[id], id)
			return [
				id,
				{ code: normalized(code ?? files[id]), modules: modules ?? {} }
			]
		})
	)
}

const shared = `export const Shared = type({ a: "string", b: "number" })`

// a large module beside small ones, one reached early through an import cycle,
// all writing the same unit in the shape of their module
const mixed = {
	"/large.ts": `import { type } from "arktype"
import { Small } from "./small.ts"
${shared}
export const Reads = type({ small: Small })
${typesOf(large)}
`,
	"/small.ts": `import { type } from "arktype"
${shared}
export const Small = type({ shared: Shared })
`,
	"/early.ts": `import { late } from "./late.ts"
import { type } from "arktype"
${shared}
export const Early = type({ shared: Shared })
export const readsLate = () => late
`,
	"/late.ts": `import { Early } from "./early.ts"
export const late = () => Early
`
}

const webpackRun = async (
	files: Record<string, string>,
	opts: PrecompileUnpluginOptions
) => {
	const root = rootOf(files)
	const compiler = webpack({
		mode: "production",
		context: root,
		entry: "./main.ts",
		target: "node",
		output: { path: join(root, "out"), filename: "main.cjs" },
		// each run's cache is its own, as a build's options are
		cache: false,
		resolve: { extensions: [".ts", ".js", ".cjs"] },
		plugins: [precompile.webpack({ cwd: root, ...opts }) as never]
	})
	const errors = await new Promise<string | undefined>(resolve =>
		compiler.run((error, stats) =>
			compiler.close(() =>
				resolve(
					error ? error.message
					: stats?.hasErrors() ?
						stats
							.toJson()
							.errors!.map(e => e.message)
							.join("\n")
					:	undefined
				)
			)
		)
	)
	if (errors) throw new Error(errors)
	return runBundle(
		`import { createRequire } from "node:module"\ncreateRequire(${JSON.stringify(`${root}/`)})("./out/main.cjs")`
	)
}

contextualize(function (this: Mocha.Suite) {
	// each case bundles a large program, which a loaded machine slows past mocha's default
	this.timeout(120_000)

	it("creates a one-chunk program's validators at their first call from 70", async () => {
		const small = programOf(large - 1)
		attest(await bundleOf(small)).equals(
			await bundleOf(small, { defers: false })
		)
		const program = programOf(large)
		attest(await bundleOf(program)).equals(
			await bundleOf(program, { defers: true })
		)
		attest(
			(await bundleOf(program)) === (await bundleOf(program, { defers: false }))
		).equals(false)
	})

	for (const opts of [{ lazy: false }, { optimize: "size" }] as const) {
		it(`writes a large ${JSON.stringify(opts)} program as it would a small one`, async () => {
			const program = programOf(large)
			attest(await bundleOf(program, opts)).equals(
				await bundleOf(program, { ...opts, defers: false })
			)
		})
	}

	it("leaves each form's identity, surface and answers as an eager build's", async () => {
		const eagerBundle = await bundleOf(surfaceProgram, { defers: false })
		const deferredBundle = await bundleOf(surfaceProgram)
		attest(deferredBundle === eagerBundle).equals(false)
		const eager = runBundle(eagerBundle)
		const deferred = runBundle(deferredBundle)
		attest(eager.stderr).equals("")
		attest(deferred.stderr).equals(eager.stderr)
		attest(deferred.stdout).equals(eager.stdout)
		attest(deferred.stdout.split("\n").length).equals(forms.length * 5 + 1)
	})

	it("reads a hole through what a site passes as its module loads", async () => {
		const program = {
			"types.ts": `import { type } from "arktype"
export const config = { message: () => "as loaded" }
export const Configured = type("string").configure(config)
${typesOf(large)}
`,
			"main.ts": `import { type } from "arktype"
import { Configured } from "./types.ts"
const out = Configured(5)
console.log(out instanceof type.errors ? out.summary : out)
`
		}
		// a write the build can't see, or it would refuse the site
		const written = (js: string) => {
			const after = js.replace(
				"var out =",
				'config.message = () => "written later";\nvar out ='
			)
			attest(after === js).equals(false)
			return runBundle(after).stdout
		}
		attest(written(await bundleOf(program))).equals("as loaded\n")
		attest(written(await bundleOf(program, { defers: false }))).equals(
			"as loaded\n"
		)
	})

	it("checks what a site reads as its module loads, before any first call", async () => {
		const program = {
			"key.ts": `export const key = "a"\n`,
			"types.ts": `import { type } from "arktype"
import { key } from "./key.ts"
export const Keyed = type({ [key]: "string" })
${typesOf(large)}
`,
			"main.ts": `import { Keyed } from "./types.ts"
console.log("loaded", Keyed({ a: "a" }))
`
		}
		const js = await bundleOf(program)
		attest(runBundle(js).stdout.startsWith("loaded")).equals(true)
		// what the build read differs where the program runs
		const changed = js.replace(/var key = "a"/, 'var key = "b"')
		attest(changed === js).equals(false)
		const { status, stdout } = runBundle(changed)
		attest(status).equals(1)
		attest(stdout).equals("")
	})

	it("writes each module where one module is read at a time by its count alone", () => {
		const ids = Object.keys(mixed).reverse()
		const answers = answersOf(mixed, ids)
		attest(answers).equals(answersOf(mixed, [...ids].reverse()) as never)
		const eager = answersOf(mixed, ids, { defers: false })
		attest(answers["/small.ts"]).equals(eager["/small.ts"])
		attest(answers["/early.ts"]).equals(eager["/early.ts"])
		attest(
			JSON.stringify(answers["/large.ts"]) ===
				JSON.stringify(eager["/large.ts"])
		).equals(false)
	})

	it("writes a unit once for each shape reading it", () => {
		const answers = answersOf(mixed, Object.keys(mixed))
		const written: Record<string, string> = {}
		for (const { modules } of Object.values(answers)) {
			for (const [specifier, text] of Object.entries(modules)) {
				attest(written[specifier] ?? text).equals(text)
				written[specifier] = text
			}
		}
		const specifiers = Object.keys(written)
		attest(specifiers.some(s => s.startsWith("~arktype/deferred/"))).equals(
			true
		)
		attest(specifiers.some(s => s.startsWith("~arktype/hoisted/"))).equals(true)
	})

	it("agrees with itself across modules of each shape on a host reading one at a time", async () => {
		const files = {
			"large.ts": mixed["/large.ts"],
			"small.ts": mixed["/small.ts"],
			"main.ts": `import { Reads, Shared, T0 } from "./large.ts"
import { Small } from "./small.ts"
const valid = { a: "a", b: 1 }
console.log(Reads({ small: { shared: valid } }), Small({ shared: valid }), Shared(valid))
console.log(Reads({ small: { shared: { a: 1 } } }).summary, Small({ shared: {} }).summary)
console.log(T0({ id: "a", f0: 0 }), Reads.allows({}), Small.allows({ shared: valid }))
`
		}
		const mixedRun = await webpackRun(files, {})
		const eagerRun = await webpackRun(files, { defers: false })
		attest(mixedRun.stderr).equals("")
		attest(mixedRun.stdout).equals(eagerRun.stdout)
		attest(mixedRun.stdout.includes("must be")).equals(true)
	})
})
