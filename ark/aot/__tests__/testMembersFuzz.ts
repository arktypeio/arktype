// a build either refuses a generated app or runs it as arktype does, each
// introspection member its validators' readers read baked where they read it:
// each reader gets a validator through hops across modules (re-exports,
// namespaces, holders, import(), require()) and steps in its own module, then
// reads it every way a program can. The oracle runs the app's source on
// arktype. ARK_MEMBERS_FUZZ=<count>[:<seed>[:<path>]]
// [ARK_MEMBERS_FUZZ_HOSTS=esbuild,vite,modules,webpack,node,dev,emit]
// [ARK_MEMBERS_FUZZ_FAILURES=<dir>] pnpm testMembersFuzz
import { fromHere } from "@ark/fs"
import { Precompiler } from "@ark/aot"
import { scanProgram } from "@ark/aot/internal/scan.ts"
import { precompile } from "@ark/aot/unplugin"
import { build as esbuild } from "esbuild"
import fc from "fast-check"
import { build as viteBuild, defaultClientConditions } from "vite"
import webpack from "webpack"
import { spawnSync } from "node:child_process"
import {
	cpSync,
	existsSync,
	mkdirSync,
	rmSync,
	symlinkSync,
	writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, posix } from "node:path"
import { pathToFileURL } from "node:url"
import { memoryHost, tempDir } from "./utils.ts"

const [countArg, seedArg, path] = (process.env.ARK_MEMBERS_FUZZ ?? "10").split(
	":"
)
const count = Number(countArg)
const initialSeed =
	seedArg === undefined ? Date.now() % 1_000_000 : Number(seedArg)
const allHosts = [
	"esbuild",
	"vite",
	"modules",
	"webpack",
	"node",
	"dev",
	"emit"
] as const
type Host = (typeof allHosts)[number]
const hosts = (process.env.ARK_MEMBERS_FUZZ_HOSTS?.split(",") ??
	allHosts) as Host[]
const failureDir =
	process.env.ARK_MEMBERS_FUZZ_FAILURES ??
	join(tmpdir(), "ark-members-fuzz-failures")

const bundlers = new Set<Host>(["esbuild", "vite", "modules", "webpack"])

// hosts reading one module at a time, which bake what each importer reads
const moduleAtATime = new Set<Host>(["modules", "webpack", "node", "emit"])

type Member =
	| "expression"
	| "description"
	| "json"
	| "toJSON"
	| "toJsonSchema"
	| "~standard.jsonSchema"

// each validator a types module may export, each introspecting differently
const definitions = [
	`type("'a' | 'b' | 1")`,
	`type("number").narrow(isEven)`,
	`type({ name: "string", "age?": "number" })`,
	`type("string").describe("a name")`,
	`type("string").pipe(s => s.length)`,
	`type({ id: "number.integer >= 0" }).or("null")`,
	`scope({ User: { name: "string" } }).export().User`,
	`type("string[]").atLeastLength(1)`
]

// how a module after the validator's gets it: imported by name from the
// module before, then unwrapped from what that exports
interface Link {
	specifier: string
	name: string
	unwrap: (imported: string) => string
	// what the oracle and a build load synchronously, which require() needs
	async: boolean
}

const importOf = (link: Link) =>
	link.name === "default" ?
		`import X from "${link.specifier}"`
	:	`import { ${link.name} as X } from "${link.specifier}"`

// a hop writes a module getting the validator from the link before it
interface Hop {
	extension?: ".cjs"
	write: (link: Link) => string[]
	// the link after it, given the specifier of the module it writes
	next: (link: Link, specifier: string) => Link
}

const exporting = (
	holder: (value: string) => string,
	unwrap: (imported: string) => string
): Hop => ({
	write: link => [
		importOf(link),
		"",
		`export const H = ${holder(link.unwrap("X"))}`
	],
	next: (link, specifier) => ({
		specifier,
		name: "H",
		unwrap,
		async: link.async
	})
})

const same = (imported: string) => imported

const hops: Record<string, Hop> = {
	reexport: {
		write: link => [`export { ${link.name} as H } from "${link.specifier}"`],
		next: (link, specifier) => ({ ...link, specifier, name: "H" })
	},
	star: {
		write: link =>
			link.name === "default" ?
				[`export { default as H } from "${link.specifier}"`]
			:	[`export * from "${link.specifier}"`],
		next: (link, specifier) => ({
			...link,
			specifier,
			name: link.name === "default" ? "H" : link.name
		})
	},
	starAs: {
		write: link => [`export * as ns from "${link.specifier}"`],
		next: (link, specifier) => ({
			specifier,
			name: "ns",
			unwrap: imported => link.unwrap(`${imported}.${link.name}`),
			async: link.async
		})
	},
	namespace: {
		write: link => [
			`import * as ns from "${link.specifier}"`,
			"",
			`export const H = ${link.unwrap(`ns.${link.name}`)}`
		],
		next: (link, specifier) => ({
			specifier,
			name: "H",
			unwrap: same,
			async: link.async
		})
	},
	namespaceKey: {
		write: link => [
			`import * as ns from "${link.specifier}"`,
			"",
			`const key = "${link.name}"`,
			`export const H = ${link.unwrap("ns[key]")}`
		],
		next: (link, specifier) => ({
			specifier,
			name: "H",
			unwrap: same,
			async: link.async
		})
	},
	defaulted: {
		write: link => [importOf(link), "", `export default ${link.unwrap("X")}`],
		next: (link, specifier) => ({
			specifier,
			name: "default",
			unwrap: same,
			async: link.async
		})
	},
	object: exporting(
		v => `{ v: ${v} }`,
		h => `${h}.v`
	),
	nestedObject: exporting(
		v => `{ api: { v1: ${v} } }`,
		h => `${h}.api.v1`
	),
	array: exporting(
		v => `[${v}]`,
		h => `${h}[0]`
	),
	map: exporting(
		v => `new Map([["v", ${v}]])`,
		h => `${h}.get("v")`
	),
	thunk: exporting(
		v => `() => ${v}`,
		h => `${h}()`
	),
	getter: exporting(
		v => `{ get v() { return ${v} } }`,
		h => `${h}.v`
	),
	static: exporting(
		v => `class { static v = ${v} }`,
		h => `${h}.v`
	),
	instance: exporting(
		v => `new (class { v = ${v} })()`,
		h => `${h}.v`
	),
	factory: exporting(
		v => `{ make: () => ({ v: ${v} }) }`,
		h => `${h}.make().v`
	),
	inherited: exporting(
		v => `new (class extends (class { v = ${v} }) {})()`,
		h => `${h}.v`
	),
	privateField: exporting(
		v => `new (class { #v = ${v}; get v() { return this.#v } })()`,
		h => `${h}.v`
	),
	dynamicImport: {
		write: link => [
			`const m = await import("${link.specifier}")`,
			"",
			`export const H = ${link.unwrap(`m.${link.name}`)}`
		],
		next: (_, specifier) => ({
			specifier,
			name: "H",
			unwrap: same,
			async: true
		})
	},
	required: {
		extension: ".cjs",
		write: link => [
			`const m = require("${link.specifier}")`,
			"",
			`exports.H = ${link.unwrap(`m.${link.name}`)}`
		],
		next: (_, specifier) => ({
			specifier,
			name: "H",
			unwrap: same,
			async: false
		})
	}
}

type HopName = keyof typeof hops

// a step in the reader's module, from the expression holding the validator
// to another, given the reader's index to name what it declares
// a step of reader j taking what the reader holds, its k-th as `${j}_${k}`,
// which suffixes the names it declares, as a reader may take one step twice
interface Step {
	setup?: (value: string, id: string) => string[]
	expr: (value: string, id: string) => string
}

const steps: Record<string, Step> = {
	pass: {
		setup: (_, j) => [`const pass${j} = x => x`],
		expr: (v, j) => `pass${j}(${v})`
	},
	libPass: { expr: v => `lib.pass(${v})` },
	box: { expr: v => `({ v: ${v} }).v` },
	stored: {
		setup: (v, j) => [`const store${j} = {}`, `store${j}.v = ${v}`],
		expr: (_, j) => `store${j}.v`
	},
	array: { expr: v => `[${v}][0]` },
	at: { expr: v => `[${v}].at(0)` },
	map: {
		setup: (v, j) => [`const map${j} = new Map([["k", ${v}]])`],
		expr: (_, j) => `map${j}.get("k")`
	},
	set: { expr: v => `[...new Set([${v}])][0]` },
	weakMap: {
		setup: (v, j) => [
			`const weak${j} = new WeakMap()`,
			`const key${j} = {}`,
			`weak${j}.set(key${j}, ${v})`
		],
		expr: (_, j) => `weak${j}.get(key${j})`
	},
	field: {
		setup: (_, j) => [
			`class Field${j} {`,
			`\tconstructor(s) {`,
			`\t\tthis.s = s`,
			`\t}`,
			`}`
		],
		expr: (v, j) => `new Field${j}(${v}).s`
	},
	privateField: {
		setup: (_, j) => [
			`class Private${j} {`,
			`\t#s`,
			`\tconstructor(s) {`,
			`\t\tthis.#s = s`,
			`\t}`,
			`\tget() {`,
			`\t\treturn this.#s`,
			`\t}`,
			`}`
		],
		expr: (v, j) => `new Private${j}(${v}).get()`
	},
	callback: { expr: v => `[${v}].map(x => x)[0]` },
	libCallback: { expr: v => `lib.each([${v}], x => x)[0]` },
	dynamicKey: {
		setup: (v, j) => [
			`const k${j} = ["v", "w"][Date.now() > 0 ? 0 : 1]`,
			`const o${j} = { v: ${v}, w: null }`
		],
		expr: (_, j) => `o${j}[k${j}]`
	},
	computedHolder: {
		setup: (v, j) => [
			`const k${j} = ["v", "w"][Date.now() > 0 ? 0 : 1]`,
			`const o${j} = { [k${j}]: ${v} }`
		],
		expr: (_, j) => `o${j}.v`
	},
	spread: { expr: v => `({ ...{ v: ${v} } }).v` },
	assign: { expr: v => `Object.assign({}, { v: ${v} }).v` },
	values: { expr: v => `Object.values({ v: ${v} })[0]` },
	entries: { expr: v => `Object.entries({ v: ${v} })[0][1]` },
	fromEntries: { expr: v => `Object.fromEntries([["v", ${v}]]).v` },
	reflect: { expr: v => `Reflect.get({ v: ${v} }, "v")` },
	defined: {
		setup: (v, j) => [
			`const o${j} = {}`,
			`Object.defineProperty(o${j}, "v", { value: ${v}, enumerable: true })`
		],
		expr: (_, j) => `o${j}.v`
	},
	proxied: { expr: v => `new Proxy({ v: ${v} }, {}).v` },
	closure: {
		setup: (v, j) => [`const get${j} = () => ${v}`],
		expr: (_, j) => `get${j}()`
	},
	generator: {
		setup: (v, j) => [`function* gen${j}() {`, `\tyield ${v}`, `}`],
		expr: (_, j) => `gen${j}().next().value`
	},
	libRegistry: {
		setup: (v, j) => [`lib.register("k${j}", ${v})`],
		expr: (_, j) => `lib.lookup("k${j}")`
	},
	libGet: { expr: v => `lib.get({ v: ${v} }, "v")` },
	awaited: {
		setup: (v, j) => [`const awaited${j} = await Promise.resolve(${v})`],
		expr: (_, j) => `awaited${j}`
	},
	asyncReturn: {
		setup: (v, j) => [`const load${j} = async () => ${v}`],
		expr: (_, j) => `(await load${j}())`
	},
	conditional: { expr: v => `(Date.now() > 0 ? ${v} : null)` },
	otherwise: { expr: v => `(Date.now() > 0 && ${v})` },
	orElse: { expr: v => `(${v} || null)` },
	nullish: { expr: v => `(null ?? ${v})` },
	nullishElse: { expr: v => `(${v} ?? null)` },
	eitherHolder: { expr: v => `(Date.now() > 0 ? { v: ${v} } : { v: null }).v` },
	assigned: {
		setup: (v, j) => [`let a${j}`, `a${j} = ${v}`],
		expr: (_, j) => `a${j}`
	},
	forInAssigned: {
		setup: (v, j) => [
			`let a${j}`,
			`const o${j} = { v: ${v} }`,
			`for (const k in o${j}) a${j} = o${j}[k]`
		],
		expr: (_, j) => `a${j}`
	}
}

type StepName = keyof typeof steps

// a read of the validator `s`, the members arktype's answer needs
interface Read {
	expr?: (s: string, j: number) => string
	// statements of a function returning what it reads
	body?: (s: string) => string[]
	// module-level statements
	setup?: (j: number) => string[]
	needs: Member[]
	// lists its keys, which a validator doesn't share with a Type
	enumerates?: true
	// passes toJsonSchema() a fallback, which a baked schema takes only where it needs none
	fallback?: true
}

const reads: Record<string, Read> = {
	description: { expr: s => `${s}.description`, needs: ["description"] },
	expression: { expr: s => `${s}.expression`, needs: ["expression"] },
	json: { expr: s => `${s}.json`, needs: ["json"] },
	toJSON: { expr: s => `${s}.toJSON()`, needs: ["toJSON"] },
	toJsonSchema: { expr: s => `${s}.toJsonSchema()`, needs: ["toJsonSchema"] },
	toJsonSchemaTarget: {
		expr: s => `${s}.toJsonSchema({ target: "draft-07" })`,
		needs: ["toJsonSchema"]
	},
	toJsonSchemaFallback: {
		expr: s => `${s}.toJsonSchema({ fallback: ctx => ctx.base })`,
		needs: ["toJsonSchema"],
		fallback: true
	},
	standardJsonSchema: {
		expr: s =>
			`${s}["~standard"].jsonSchema.input({ target: "draft-2020-12" })`,
		needs: ["~standard.jsonSchema"]
	},
	stringify: {
		expr: s => `JSON.stringify({ schema: ${s} })`,
		needs: ["toJSON"]
	},
	string: { expr: s => `String(${s})`, needs: ["expression"] },
	template: { expr: s => `\`\${${s}}\``, needs: ["expression"] },
	concat: { expr: s => `"" + ${s}`, needs: ["expression"] },
	arrayString: { expr: s => `String([${s}])`, needs: ["expression"] },
	reflect: {
		expr: s => `Reflect.get(${s}, "expression")`,
		needs: ["expression"]
	},
	destructure: {
		expr: s =>
			`(({ description, expression }) => [description, expression])(${s})`,
		needs: ["description", "expression"]
	},
	method: {
		setup: j => [
			`class Reader${j} {`,
			`\tread(t) {`,
			`\t\treturn t.description`,
			`\t}`,
			`}`
		],
		expr: (s, j) => `new Reader${j}().read(${s})`,
		needs: ["description"]
	},
	guarded: {
		expr: s =>
			`typeof ${s}.toJsonSchema === "function" ? ${s}.toJsonSchema() : "none"`,
		needs: ["toJsonSchema"]
	},
	optional: { expr: s => `${s}?.description`, needs: ["description"] },
	computed: {
		setup: j => [
			`const member${j} = ["description", "json"][Date.now() > 0 ? 0 : 1]`
		],
		expr: (s, j) => `${s}[member${j}]`,
		needs: ["description"]
	},
	keys: { expr: s => `Object.keys(${s})`, needs: [], enumerates: true },
	forIn: {
		body: s => [
			`const keys = []`,
			`for (const k in ${s}) keys.push(k)`,
			`return keys`
		],
		needs: [],
		enumerates: true
	},
	libDescribe: { expr: s => `lib.describe(${s})`, needs: ["description"] },
	libRead: { expr: s => `lib.read(${s}, "json")`, needs: ["json"] },
	libReflect: {
		expr: s => `lib.reflect(${s}, "expression")`,
		needs: ["expression"]
	},
	libVendor: { expr: s => `lib.jsonSchemaOf(${s})`, needs: ["toJsonSchema"] },
	libOptional: {
		expr: s => `lib.describeOptional(${s})`,
		needs: ["description"]
	},
	libApply: {
		expr: s => `lib.call(${s}, "toJsonSchema")`,
		needs: ["toJsonSchema"]
	},
	libEntries: { expr: s => `lib.entries({ v: ${s} })`, needs: ["description"] },
	libSpread: { expr: s => `lib.spread({ v: ${s} })`, needs: ["expression"] },
	libServer: {
		expr: s => `new lib.Server().tool("t", ${s}).list()`,
		needs: ["~standard.jsonSchema"]
	}
}

type ReadName = keyof typeof reads

const lib = `const registry = {}

export const pass = x => x
export const register = (key, value) => {
	registry[key] = value
}
export const lookup = key => registry[key]
export const get = (o, k) => o[k]
export const each = (list, f) => list.map(f)
export const describe = s => s.description
export const read = (s, k) => s[k]
export const reflect = (s, k) => Reflect.get(s, k)
export const jsonSchemaOf = s => {
	const std = s["~standard"]
	if (std.vendor === "arktype") return s.toJsonSchema()
	return std.jsonSchema.input({ target: "draft-07" })
}
export const describeOptional = s => s?.description ?? "none"
export const call = (s, m) => s[m].call(s)
export const entries = o => Object.entries(o).map(([k, v]) => [k, v.description])
export const spread = o => ({ ...o }).v.expression

export class Server {
	tools = []
	tool(name, schema) {
		this.tools.push({ name, schema })
		return this
	}
	list() {
		return this.tools.map(({ name, schema }) => ({
			name,
			input: schema["~standard"].jsonSchema.input({ target: "draft-2020-12" })
		}))
	}
}
`

interface Reader {
	target: number
	hops: HopName[]
	steps: StepName[]
	read: ReadName
}

interface App {
	definitions: number[]
	// whether the validators are a dependency's, which opts in
	packaged: boolean
	readers: Reader[]
}

const nameArb = <names extends string>(record: Record<names, unknown>) =>
	fc.constantFrom(...(Object.keys(record) as names[]))

const readerArb = fc.record({
	target: fc.nat({ max: 2 }),
	hops: fc.array(nameArb(hops), { maxLength: 3 }),
	steps: fc.array(nameArb(steps), { maxLength: 2 }),
	read: nameArb(reads)
})

const apps: fc.Arbitrary<App> = fc
	.record({
		definitions: fc.array(fc.nat({ max: definitions.length - 1 }), {
			minLength: 3,
			maxLength: 3
		}),
		packaged: fc.nat({ max: 3 }).map(n => n === 0),
		readers: fc.array(readerArb, { minLength: 1, maxLength: 4 })
	})
	.filter(
		// Node can't require() a module another reader is loading by import()
		({ readers }) =>
			!readers.some(reader => reader.hops.includes("dynamicImport")) ||
			!readers.some(reader => reader.hops.includes("required"))
	)

const packageName = "schemas"

const typesSource = (app: App) =>
	[
		`import { scope, type } from "arktype"`,
		"",
		`const isEven = n => n % 2 === 0`,
		`Object.defineProperty(isEven, "name", { value: "isEven" })`,
		"",
		...app.definitions.map((d, i) => `export const V${i} = ${definitions[d]}`),
		""
	].join("\n")

// the first line declaring a validator, as a decision names it
const firstValidatorLine = 6

// a require() can't load a module awaiting, so an app requires none past one
const hopsOf = (reader: Reader): HopName[] => {
	const result: HopName[] = []
	let async = false
	for (const hop of reader.hops) {
		if (hop === "required" && async) continue
		if (hop === "dynamicImport") async = true
		result.push(hop)
	}
	return result
}

const filesOf = (app: App): Record<string, string> => {
	const files: Record<string, string> = {}
	if (app.packaged) {
		files[`node_modules/${packageName}/package.json`] = JSON.stringify({
			name: packageName,
			type: "module",
			exports: "./index.js",
			ark: { aot: true }
		})
		files[`node_modules/${packageName}/index.js`] = typesSource(app)
	} else files["types.ts"] = typesSource(app)
	files["node_modules/lib/package.json"] = JSON.stringify({
		name: "lib",
		type: "module",
		exports: "./index.js"
	})
	files["node_modules/lib/index.js"] = lib
	files["helpers.ts"] = [
		`export const obs = async f => {`,
		`\ttry {`,
		`\t\treturn { ok: await f() }`,
		`\t} catch (e) {`,
		`\t\treturn { threw: String(e) }`,
		`\t}`,
		`}`,
		""
	].join("\n")
	for (const [j, reader] of app.readers.entries()) {
		let link: Link = {
			specifier: app.packaged ? packageName : "./types.ts",
			name: `V${reader.target}`,
			unwrap: same,
			async: false
		}
		for (const [k, name] of hopsOf(reader).entries()) {
			const hop = hops[name]
			const file = `r${j}h${k}${hop.extension ?? ".ts"}`
			files[file] = [...hop.write(link), ""].join("\n")
			link = hop.next(link, `./${file}`)
		}
		const lines: string[] = []
		let value = link.unwrap("X")
		for (const [k, name] of reader.steps.entries()) {
			// a step putting what an await reads in a function awaits it first
			if (value.includes("await ")) {
				lines.push(`const v${j}_${k} = ${value}`)
				value = `v${j}_${k}`
			}
			const step = steps[name]
			lines.push(...(step.setup?.(value, `${j}_${k}`) ?? []))
			value = step.expr(value, `${j}_${k}`)
		}
		const read = reads[reader.read]
		const usesLib =
			reader.steps.some(name => name.startsWith("lib")) ||
			reader.read.startsWith("lib")
		files[`reader${j}.ts`] = [
			`import { obs } from "./helpers.ts"`,
			...(usesLib ? [`import * as lib from "lib"`] : []),
			importOf(link),
			"",
			...lines,
			...(read.setup?.(j) ?? []),
			`const s = ${value}`,
			read.body ?
				[
					`export const run = () =>`,
					`\tobs(() => {`,
					...read.body("s").map(line => `\t\t${line}`),
					`\t})`
				].join("\n")
			:	`export const run = () => obs(() => ${read.expr!("s", j)})`,
			""
		].join("\n")
	}
	files["main.ts"] = [
		...app.readers.map(
			(_, j) => `import { run as run${j} } from "./reader${j}.ts"`
		),
		"",
		`console.log(JSON.stringify(await Promise.all([${app.readers.map((_, j) => `run${j}()`).join(", ")}]), null, 1))`,
		""
	].join("\n")
	files["package.json"] = JSON.stringify({
		name: "members-fuzz-app",
		type: "module",
		private: true,
		dependencies: {
			arktype: "*",
			lib: "*",
			...(app.packaged && { [packageName]: "*" })
		}
	})
	files["tsconfig.json"] = JSON.stringify({
		compilerOptions: {
			target: "ES2022",
			module: "NodeNext",
			allowJs: true,
			rewriteRelativeImportExtensions: true,
			strict: false,
			skipLibCheck: true,
			types: [],
			rootDir: ".",
			outDir: "out-emit"
		},
		include: ["*.ts", "*.cjs"]
	})
	return files
}

const sourceOfApp = (app: App) =>
	Object.entries(filesOf(app))
		.filter(
			([name]) =>
				!name.startsWith("node_modules/lib/") &&
				!name.endsWith(".json") &&
				name !== "helpers.ts"
		)
		.map(([name, text]) => `// ${name}\n${text}`)
		.join("\n")

// apps live outside the repo, linking arktype to this repo's package
const root = tempDir("ark-members-fuzz-")
let appCount = 0

const writeApp = (app: App): string => {
	const dir = join(root, `${appCount++}`)
	rmSync(dir, { recursive: true, force: true })
	mkdirSync(join(dir, "node_modules"), { recursive: true })
	symlinkSync(
		fromHere("..", "..", "type"),
		join(dir, "node_modules", "arktype")
	)
	const files = filesOf(app)
	for (const name in files) {
		mkdirSync(dirname(join(dir, name)), { recursive: true })
		writeFileSync(join(dir, name), files[name])
	}
	return dir
}

const conditions = ["ark-ts", "production"]

const run = (args: string[], cwd: string, env: Record<string, string> = {}) => {
	const { stdout, stderr, status } = spawnSync(process.execPath, args, {
		cwd,
		encoding: "utf8",
		timeout: 120_000,
		env: { ...process.env, ...env }
	})
	return status === 0 ? stdout : `exit ${status}\n${stdout}\n${stderr}`
}

// runs a bundle, printing a crash as its error alone: Node cuts what it prints
// after the first 146 KB, which a minified bundle's line alone may take
const runBundle = (file: string, dir: string) =>
	run(
		[
			"--import",
			"data:text/javascript,for (const event of ['uncaughtException', 'unhandledRejection']) process.on(event, e => { console.error(String(e)); process.exit(1) })",
			file
		],
		dir
	)

// what a host's build of the app logs, or why it refused
type Outcome = { refused: string } | { out: string }

const messageOf = (e: unknown): string =>
	e && typeof e === "object" && "errors" in e && Array.isArray(e.errors) ?
		e.errors
			.map(
				(error: { text?: string; message?: string }) =>
					error.text ?? error.message
			)
			.join("\n")
	:	String((e as Error)?.message ?? e)

// each bundler's build without arktype's plugin, which tells its own
// miscompilations from the plugin's
const esbuildOutcome = async (
	dir: string,
	prune: boolean,
	plugin: boolean
): Promise<Outcome> => {
	const out = join(
		dir,
		!plugin ? "out-esbuild-plain"
		: prune ? "out-esbuild"
		: "out-modules"
	)
	try {
		await esbuild({
			entryPoints: [join(dir, "main.ts")],
			absWorkingDir: dir,
			bundle: true,
			format: "esm",
			target: "esnext",
			platform: "node",
			outdir: out,
			minify: true,
			conditions,
			logLevel: "silent",
			// a CommonJS module's require
			banner: {
				js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);'
			},
			plugins:
				plugin ?
					[
						precompile.esbuild({
							conditions,
							cwd: dir,
							...(!prune && { prune: false })
						})
					]
				:	[]
		})
	} catch (e) {
		return { refused: messageOf(e) }
	}
	return { out: runBundle(join(out, "main.js"), dir) }
}

const viteOutcome = async (dir: string, plugin: boolean): Promise<Outcome> => {
	const out = join(dir, plugin ? "out-vite" : "out-vite-plain")
	const { NODE_ENV } = process.env
	process.env.NODE_ENV = "production"
	try {
		await viteBuild({
			root: dir,
			configFile: false,
			logLevel: "silent",
			plugins:
				plugin ? [precompile.vite({ conditions: ["ark-ts"], cwd: dir })] : [],
			resolve: { conditions: ["ark-ts", ...defaultClientConditions] },
			build: {
				write: true,
				outDir: out,
				emptyOutDir: true,
				minify: true,
				target: "esnext",
				lib: {
					entry: join(dir, "main.ts"),
					formats: ["es"],
					fileName: (_, name) => `${name}.js`
				}
			}
		})
	} catch (e) {
		return { refused: messageOf(e) }
	} finally {
		if (NODE_ENV === undefined) delete process.env.NODE_ENV
		else process.env.NODE_ENV = NODE_ENV
	}
	return { out: runBundle(join(out, "main.js"), dir) }
}

// webpack reads arktype's built output, as it doesn't strip types
const webpackOutcome = async (
	dir: string,
	plugin: boolean
): Promise<Outcome> => {
	const out = join(dir, plugin ? "out-webpack" : "out-webpack-plain")
	const compiler = webpack({
		mode: "production",
		context: dir,
		entry: "./main.ts",
		target: "node",
		output: { path: out, filename: "main.cjs" },
		resolve: { extensions: [".ts", ".js", ".cjs"] },
		plugins: plugin ? [precompile.webpack({ cwd: dir }) as never] : []
	})
	const errors = await new Promise<string | undefined>(resolve =>
		compiler.run((error, stats) =>
			compiler.close(() =>
				resolve(
					error ? messageOf(error)
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
	if (errors) return { refused: errors }
	return { out: runBundle(join(out, "main.cjs"), dir) }
}

const driver = (dir: string, production: boolean): Outcome => {
	const out = run(
		[
			"--conditions",
			"ark-ts",
			"--import",
			`data:text/javascript,import { register } from "${pathToFileURL(fromHere("..", "node.ts"))}"; register(${JSON.stringify({ conditions: ["ark-ts"], cwd: dir })})`,
			"main.ts"
		],
		dir,
		{ NODE_ENV: production ? "production" : "development" }
	)
	// the driver fails a module it refuses as it loads
	const refused = /^exit \d+\n\n[\S\s]*?(\S+\.ts:\d+:\d+ {2}[^\n]+)/.exec(out)
	return refused ? { refused: refused[1] } : { out }
}

const tsc = fromHere(
	"..",
	"..",
	"..",
	"node_modules",
	"typescript",
	"bin",
	"tsc"
)

// as `tsc && arktype-precompile --emit` builds it
const emitOutcome = (dir: string): Outcome => {
	const emitted = spawnSync(
		process.execPath,
		[tsc, "-p", join(dir, "tsconfig.json"), "--noCheck", "--noResolve"],
		{ cwd: dir, encoding: "utf8", timeout: 120_000 }
	)
	if (emitted.status !== 0)
		return { refused: `harness: tsc failed\n${emitted.stdout}` }
	const cli = spawnSync(
		process.execPath,
		["--conditions", "ark-ts", fromHere("..", "cli.ts"), "--emit"],
		{ cwd: dir, encoding: "utf8", timeout: 120_000 }
	)
	if (cli.status !== 0) return { refused: cli.stderr || cli.stdout }
	return {
		out: run(["--conditions", "ark-ts", join(dir, "out-emit", "main.js")], dir)
	}
}

const outcomeOf = (
	host: Host,
	dir: string,
	plugin = true
): Promise<Outcome> | Outcome =>
	host === "esbuild" ? esbuildOutcome(dir, true, plugin)
	: host === "modules" ? esbuildOutcome(dir, false, plugin)
	: host === "vite" ? viteOutcome(dir, plugin)
	: host === "webpack" ? webpackOutcome(dir, plugin)
	: host === "node" ? driver(dir, true)
	: host === "dev" ? driver(dir, false)
	: emitOutcome(dir)

// what each reader observed, or undefined where the app failed as a whole
const observationsOf = (out: string): unknown[] | undefined => {
	try {
		return JSON.parse(out)
	} catch {
		return
	}
}

// a registered function's name differs between builds
const normalized = (observation: unknown) =>
	JSON.stringify(observation)?.replace(/\$ark\.\w+?\$?\d+/g, "$ark.fn")

const unbakedMessage = /isn't baked into this validator/
const fallbackMessage = /takes only a target it was built with/

type Verdict =
	| "sound"
	| "unsound"
	| "unbakedThroughCommonJs"
	| "fallbackUnbaked"
	| "enumerated"
	| "bundler"

// a reader's mismatch, as one the build is known to leave loud or to differ
const mismatchOf = (
	reader: Reader,
	host: Host,
	observed: unknown,
	expected: unknown
): Exclude<Verdict, "sound"> => {
	const threw = (observed as { threw?: string } | undefined)?.threw ?? ""
	const read = reads[reader.read]
	if (
		moduleAtATime.has(host) &&
		hopsOf(reader).includes("required") &&
		(unbakedMessage.test(threw) ||
			// toString's backstop, as converting it reads expression
			JSON.stringify(observed) ===
				JSON.stringify(expected)?.replace(/Type<[^"]*>/g, "Type"))
	)
		return "unbakedThroughCommonJs"
	if (read.fallback && fallbackMessage.test(threw)) return "fallbackUnbaked"
	if (read.enumerates) return "enumerated"
	return "unsound"
}

interface Tally {
	sound: number
	unsound: number
	unbakedThroughCommonJs: number
	fallbackUnbaked: number
	enumerated: number
	bundler: number
	refused: Record<string, number>
}

const tallies = Object.fromEntries(
	hosts.map(host => [
		host,
		{
			sound: 0,
			unsound: 0,
			unbakedThroughCommonJs: 0,
			fallbackUnbaked: 0,
			enumerated: 0,
			bundler: 0,
			refused: {}
		} satisfies Tally
	])
) as Record<Host, Tally>

const bump = (record: Record<string, number>, key: string) =>
	(record[key] = (record[key] ?? 0) + 1)

// a refusal's first line saying something
const headOf = (message: string) => {
	const lines = message.split("\n").filter(line => line.trim())
	const line = lines.find(
		l => !/^(threw )?Error: Build failed|^\[plugin |^exit \d+$/.test(l.trim())
	)
	return (line ?? lines[0] ?? JSON.stringify(message))
		.replace(/\s+/g, " ")
		.slice(0, 160)
}

const failures: string[] = []
mkdirSync(failureDir, { recursive: true })

const keepFailure = (
	app: App,
	host: Host,
	expected: string,
	out: string
): string => {
	const kept = join(failureDir, `${Date.now()}-${host}`)
	const files = filesOf(app)
	for (const name in files) {
		mkdirSync(dirname(join(kept, name)), { recursive: true })
		writeFileSync(join(kept, name), files[name])
	}
	writeFileSync(join(kept, "expected.txt"), expected)
	writeFileSync(join(kept, `${host}.txt`), out)
	failures.push(kept)
	return kept
}

// what a production bundle bakes into each validator: members baked,
// the members its readers need and how it decided
interface Overbake {
	baked: number
	needed: number
	over: number
	apps: number
	steps: Record<string, number>
}

const overbake: Overbake = { baked: 0, needed: 0, over: 0, apps: 0, steps: {} }

const tallyOverbake = async (app: App) => {
	const files: Record<string, string> = {}
	for (const [name, text] of Object.entries(filesOf(app)))
		files[`/${name}`] = text
	const isOwn = (id: string) =>
		!id.startsWith("/node_modules/") ||
		id.startsWith(`/node_modules/${packageName}/`)
	const scanned = await scanProgram("fuzz", [{ id: "/main.ts" }], {
		resolve: async (specifier, importer) => {
			const id =
				specifier.startsWith(".") ?
					posix.join(posix.dirname(importer), specifier)
				:	`/node_modules/${specifier}/index.js`
			return id in files ? id : undefined
		},
		readFile: id => files[id],
		isTransformed: isOwn,
		idOf: id => id,
		cwd: "/"
	})
	if (typeof scanned === "string") return
	const usage = new Precompiler(memoryHost(files), { cwd: "/" }).scan(scanned)
	if (!usage.baked) return
	overbake.apps++
	const types =
		app.packaged ? `node_modules/${packageName}/index.js` : "types.ts"
	for (const decision of usage.baked) {
		const match = /^(\S+):(\d+):\d+ bakes (.+) \((\w+)/.exec(decision)
		if (!match || match[1] !== types) continue
		const [, , line, members, step] = match
		const target = Number(line) - firstValidatorLine
		const baked = members === "nothing" ? [] : members.split(", ")
		const needed = new Set(
			app.readers
				.filter(reader => reader.target === target)
				.flatMap(reader => reads[reader.read].needs)
		)
		overbake.baked += baked.length
		overbake.needed += needed.size
		overbake.over += baked.filter(member => !needed.has(member as never)).length
		bump(overbake.steps, step)
	}
}

const describeReader = (reader: Reader) =>
	`hops ${hopsOf(reader).join(",") || "-"}, steps ${reader.steps.join(",") || "-"}, read ${reader.read}`

// the error a run of a build crashed with
const errorOf = (out: string) => /^\w*Error\b.*$/m.exec(out)?.[0]

// whether each host's build of an app refuses it or runs it as arktype does
const check = async (app: App): Promise<boolean> => {
	const dir = writeApp(app)
	const expected = run(["--conditions", "ark-ts", "main.ts"], dir)
	const expectedObservations = observationsOf(expected)
	// an app arktype itself can't run says nothing of a build
	if (!expectedObservations) {
		console.error(
			`harness: the oracle failed\n${expected}\n${sourceOfApp(app)}`
		)
		rmSync(dir, { recursive: true, force: true })
		return true
	}
	await tallyOverbake(app)
	let sound = true
	for (const host of hosts) {
		const tally = tallies[host]
		const outcome = await outcomeOf(host, dir)
		if ("refused" in outcome) {
			bump(tally.refused, headOf(outcome.refused))
			continue
		}
		const observations = observationsOf(outcome.out)
		const verdicts: Verdict[] =
			observations ?
				app.readers.map((reader, j) =>
					normalized(observations[j]) === normalized(expectedObservations[j]) ?
						"sound"
					:	mismatchOf(reader, host, observations[j], expectedObservations[j])
				)
			:	["unsound"]
		// what the bundler alone builds otherwise than Node runs it isn't the plugin's
		if (verdicts.includes("unsound") && bundlers.has(host)) {
			const plain = await outcomeOf(host, dir, false)
			const plainObservations = "out" in plain && observationsOf(plain.out)
			if (!observations) {
				// a crash it builds alone too, like webpack's emptying a module a
				// CommonJS module requires
				if (
					"out" in plain &&
					!plainObservations &&
					errorOf(plain.out) === errorOf(outcome.out)
				)
					verdicts[0] = "bundler"
			} else if (plainObservations) {
				for (const [j, v] of verdicts.entries()) {
					if (
						v === "unsound" &&
						normalized(plainObservations[j]) === normalized(observations[j])
					)
						verdicts[j] = "bundler"
				}
			}
		}
		const verdict: Verdict =
			verdicts.includes("unsound") ? "unsound" : (
				(verdicts.find(v => v !== "sound") ?? "sound")
			)
		tally[verdict]++
		for (const [j, v] of verdicts.entries()) {
			if (v === "enumerated")
				console.error(`ENUMERATED (${host}): ${describeReader(app.readers[j])}`)
		}
		if (verdict === "unsound") {
			sound = false
			console.error(
				`\nUNSOUND (${host}): kept in ${keepFailure(app, host, expected, outcome.out)}`
			)
		}
	}
	if (sound) rmSync(dir, { recursive: true, force: true })
	return sound
}

// ARK_MEMBERS_FUZZ_REPLAY=<dir> runs a kept app through each host again
const replayed = process.env.ARK_MEMBERS_FUZZ_REPLAY
if (replayed) {
	const dir = join(root, "replay")
	cpSync(replayed, dir, {
		recursive: true,
		filter: source => !source.endsWith(".txt")
	})
	if (!existsSync(join(dir, "node_modules", "lib"))) {
		mkdirSync(join(dir, "node_modules", "lib"), { recursive: true })
		writeFileSync(join(dir, "node_modules", "lib", "index.js"), lib)
		writeFileSync(
			join(dir, "node_modules", "lib", "package.json"),
			JSON.stringify({ name: "lib", type: "module", exports: "./index.js" })
		)
	}
	symlinkSync(
		fromHere("..", "..", "type"),
		join(dir, "node_modules", "arktype")
	)
	const expected = run(["--conditions", "ark-ts", "main.ts"], dir)
	console.log(`oracle:\n${expected}`)
	for (const host of hosts) {
		const outcome = await outcomeOf(host, dir)
		console.log(
			"refused" in outcome ? `${host} refused: ${headOf(outcome.refused)}`
			: outcome.out === expected ? `${host}: as the oracle`
			: `${host}:\n${outcome.out}`
		)
		if ("out" in outcome && outcome.out !== expected && bundlers.has(host)) {
			const plain = await outcomeOf(host, dir, false)
			console.log(
				`${host} without arktype's plugin:\n${
					"refused" in plain ? plain.refused
					: plain.out === outcome.out ? "the same"
					: observationsOf(plain.out) ? plain.out
					: (errorOf(plain.out) ?? plain.out)
				}`
			)
		}
	}
	rmSync(root, { recursive: true, force: true })
	process.exit()
}

const started = Date.now()
let seed = initialSeed
let remaining = count
while (remaining > 0) {
	const result = await fc.check(
		fc.asyncProperty(apps, app => check(app)),
		{ numRuns: remaining, seed, endOnFailure: true, ...(path && { path }) }
	)
	if (!result.failed) break
	console.error(
		`seed ${seed} run ${result.numRuns}: counterexample\n${sourceOfApp(result.counterexample![0])}\n${result.counterexample![0].readers.map(describeReader).join("\n")}`
	)
	if (result.error) console.error(result.errorInstance ?? result.error)
	remaining -= result.numRuns
	seed++
}

for (const host of hosts) {
	const t = tallies[host]
	console.log(
		`${host}: ${t.sound} sound, ${t.unsound} unsound, ${t.unbakedThroughCommonJs} unbaked through CommonJS, ${t.fallbackUnbaked} fallbacks unbaked, ${t.enumerated} enumerated, ${t.bundler} as the bundler alone builds them, refused: ${JSON.stringify(t.refused)}`
	)
}
console.log(
	`baked (scanned): ${overbake.baked} members, ${overbake.needed} needed, ${overbake.over} over, in ${overbake.apps} apps, decided by ${JSON.stringify(overbake.steps)}`
)
console.log(
	`${count} apps from seed ${initialSeed} in ${Math.round((Date.now() - started) / 1000)}s${failures.length ? `\n${failures.length} unsound, kept in:\n${failures.join("\n")}` : ""}`
)
rmSync(root, { recursive: true, force: true })
process.exit(failures.length ? 1 : 0)
