// a pruned production build of a generated app either refuses to build or
// behaves as the same app built whole: each app's modules hand validators
// around, store them and read them every way a program can, and both builds
// run the same inputs through each read. ARK_PRUNE_FUZZ=<count>[:<seed>]
// [ARK_PRUNE_FUZZ_BUNDLERS=esbuild,vite] [ARK_PRUNE_FUZZ_FAILURES=<dir>]
// [ARK_PRUNE_FUZZ_DEBUG=1] pnpm testPruneFuzz
import { fromHere } from "@ark/fs"
import { precompile, type PrecompileUnpluginOptions } from "@ark/aot/unplugin"
import { type } from "arktype"
import { build as esbuild } from "esbuild"
import fc from "fast-check"
import {
	build as viteBuild,
	defaultClientConditions,
	type InlineConfig,
	type Plugin as VitePlugin
} from "vite"
import { spawnSync } from "node:child_process"
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { gzipSync } from "node:zlib"
import {
	dataOf,
	defOf,
	morphs,
	noise,
	nodeOf,
	predicates,
	sourceOf,
	tried,
	unnamedHoles,
	type Node
} from "./grammar.ts"
import { tempDir } from "./utils.ts"

const [countArg, seedArg] = (process.env.ARK_PRUNE_FUZZ ?? "20").split(":")
const count = Number(countArg)
const initialSeed =
	seedArg === undefined ? Date.now() % 1_000_000 : Number(seedArg)
const bundlers = (process.env.ARK_PRUNE_FUZZ_BUNDLERS ?? "esbuild,vite").split(
	","
) as Bundler[]
// where an unsound app's sources, bundles and outputs are kept
const failureDir =
	process.env.ARK_PRUNE_FUZZ_FAILURES ??
	join(tmpdir(), "ark-prune-fuzz-failures")

type Bundler = "esbuild" | "vite"

// how a site derives the validator it exports
const wraps = {
	plain: (def: string) => `type(${def})`,
	pipe: (def: string) => `type(${def}).pipe(box)`,
	to: (def: string) => `type(${def}).to("unknown")`,
	narrow: (def: string) => `type(${def}).narrow(isTruthy)`,
	or: (def: string) => `type(${def}).or("null")`,
	array: (def: string) => `type(${def}).array()`,
	describe: (def: string) => `type(${def}).describe("a thing")`,
	narrowCtx: (def: string) => `type(${def}).narrow(isPositive)`,
	pipeTry: (def: string) => `type(${def}).pipe.try(parse, refuse)`,
	toTuple: (def: string) => `type(${def}).to(["unknown", "?"])`,
	scoped: (def: string) => `scope({ T: ${def} }).export().T`
}

type Wrap = keyof typeof wraps

interface Validator {
	name: string
	module: number
	node: Node
	wrap: Wrap
	isDefault: boolean
}

// how a reader module gets at a validator, as an expression naming it
interface Access {
	imports?: (v: Validator, j: number) => string[]
	// module-level statements
	setup?: (v: Validator, j: number) => string[]
	// statements inside the reader's async function
	before?: (v: Validator, j: number) => string[]
	ref: (v: Validator, j: number, other: Validator) => string
	// modules the app writes besides the types modules
	needs?: "barrel" | "reexport" | "nsexport"
}

const typesOf = (v: Validator) => `./types${v.module}.ts`

const accesses: Record<string, Access> = {
	named: {
		imports: v => [`import { ${v.name} } from "${typesOf(v)}"`],
		ref: v => v.name
	},
	renamed: {
		imports: (v, j) => [`import { ${v.name} as X${j} } from "${typesOf(v)}"`],
		ref: (_, j) => `X${j}`
	},
	barrel: {
		imports: v => [`import { ${v.name} } from "./barrel.ts"`],
		ref: v => v.name,
		needs: "barrel"
	},
	reexport: {
		imports: (_, j) => [`import { R${j} } from "./reexport.ts"`],
		ref: (_, j) => `R${j}`,
		needs: "reexport"
	},
	namespace: {
		imports: (v, j) => [`import * as ns${j} from "${typesOf(v)}"`],
		ref: (v, j) => `ns${j}.${v.name}`
	},
	nsexport: {
		imports: v => [`import { ns${v.module} } from "./nsexport.ts"`],
		ref: v => `ns${v.module}.${v.name}`,
		needs: "nsexport"
	},
	default: {
		imports: (v, j) =>
			v.isDefault ?
				[`import D${j} from "${typesOf(v)}"`]
			:	[`import { ${v.name} as D${j} } from "${typesOf(v)}"`],
		ref: (_, j) => `D${j}`
	},
	dynamic: {
		before: (v, j) => [
			`const { ${v.name}: Y${j} } = await import("${typesOf(v)}")`
		],
		ref: (_, j) => `Y${j}`
	},
	object: {
		imports: v => [`import { ${v.name} } from "${typesOf(v)}"`],
		setup: (v, j) => [`const holder${j} = { v: ${v.name} }`],
		ref: (_, j) => `holder${j}.v`
	},
	array: {
		imports: v => [`import { ${v.name} } from "${typesOf(v)}"`],
		setup: (v, j) => [`const list${j} = [${v.name}]`],
		ref: (_, j) => `list${j}[0]`
	},
	map: {
		imports: v => [`import { ${v.name} } from "${typesOf(v)}"`],
		setup: (v, j) => [`const map${j} = new Map([["v", ${v.name}]])`],
		ref: (_, j) => `map${j}.get("v")`
	},
	getter: {
		imports: v => [`import { ${v.name} } from "${typesOf(v)}"`],
		setup: (v, j) => [`const get${j} = () => ${v.name}`],
		ref: (_, j) => `get${j}()`
	},
	conditional: {
		imports: (v, j) => [
			`import { ${v.name} as A${j}, OTHER as B${j} } from "${typesOf(v)}"`
		],
		ref: (_, j) => `(typeof d === "string" ? A${j} : B${j})`
	},
	let: {
		imports: v => [`import { ${v.name} } from "${typesOf(v)}"`],
		setup: (v, j) => [`let L${j} = ${v.name}`],
		ref: (_, j) => `L${j}`
	},
	classField: {
		imports: v => [`import { ${v.name} } from "${typesOf(v)}"`],
		setup: (v, j) => [`class C${j} {\n\tv = ${v.name}\n}`],
		ref: (_, j) => `new C${j}().v`
	},
	defaultParam: {
		imports: v => [`import { ${v.name} } from "${typesOf(v)}"`],
		setup: (v, j) => [`const f${j} = (t = ${v.name}) => t`],
		ref: (_, j) => `f${j}()`
	},
	destructured: {
		imports: v => [`import { ${v.name} } from "${typesOf(v)}"`],
		setup: (v, j) => [`const { v: Z${j} } = { v: ${v.name} }`],
		ref: (_, j) => `Z${j}`
	}
}

type AccessName = keyof typeof accesses

// what a reader does with a validator ref and an input d, as an expression
interface Read {
	expr: (ref: string, j: number) => string
	// what it imports from arktype
	ark?: string[]
	setup?: (ref: string, j: number) => string[]
	helpers?: string[]
}

const reads: Record<string, Read> = {
	call: { expr: ref => `tell(${ref}(d))`, helpers: ["tell"] },
	callInline: {
		expr: ref => `(o => o instanceof type.errors ? o.summary : o)(${ref}(d))`,
		ark: ["type"]
	},
	issues: { expr: ref => `issuesOf(${ref}(d))`, helpers: ["issuesOf"] },
	toJSON: { expr: ref => `JSON.stringify(${ref}(d))` },
	string: { expr: ref => `String(${ref}(d))` },
	template: { expr: ref => `\`\${${ref}(d)}\`` },
	count: { expr: ref => `countOf(${ref}(d))`, helpers: ["countOf"] },
	throw: {
		expr: ref =>
			`thrown(() => { const o = ${ref}(d); return o instanceof type.errors ? o.throw() : o })`,
		ark: ["type"],
		helpers: ["thrown"]
	},
	onFail: {
		expr: ref => `${ref}(d, undefined, e => ({ handled: e.summary }))`
	},
	spread: { expr: ref => `tell(${ref}(...[d]))`, helpers: ["tell"] },
	byPath: {
		expr: ref =>
			`(o => o instanceof type.errors ? Object.fromEntries(Object.entries(byPath(o)).map(([k, e]) => [k, e.message])) : o)(${ref}(d))`,
		ark: ["type", "byPath"]
	},
	allows: { expr: ref => `${ref}.allows(d)` },
	allowsDetached: { expr: ref => `[d].filter(${ref}.allows)` },
	allowsComputed: { expr: ref => `${ref}["allows"](d)` },
	dynamicKey: {
		expr: (ref, j) => `${ref}[key${j}](d)`,
		setup: (_, j) => [`const key${j} = ["allows", "assert"][${j % 2}]`]
	},
	assert: {
		expr: ref => `thrown(() => ${ref}.assert(d))`,
		helpers: ["thrown"]
	},
	assertDetached: {
		expr: ref => `thrown(() => { const a = ${ref}.assert; return a(d) })`,
		helpers: ["thrown"]
	},
	from: { expr: ref => `thrown(() => ${ref}.from(d))`, helpers: ["thrown"] },
	traverse: { expr: ref => `tell(${ref}.traverse(d))`, helpers: ["tell"] },
	standard: { expr: ref => `${ref}["~standard"].validate(d)` },
	standardVendor: { expr: ref => `${ref}["~standard"].vendor` },
	stringified: { expr: ref => `String(${ref})` },
	expression: { expr: ref => `${ref}.expression` },
	description: { expr: ref => `${ref}.description` },
	json: { expr: ref => `JSON.stringify(${ref}.json)` },
	toJsonSchema: {
		expr: ref => `thrown(() => ${ref}.toJsonSchema())`,
		helpers: ["thrown"]
	},
	meta: { expr: ref => `${ref}.meta` },
	runtimePipe: {
		expr: ref => `thrown(() => tell(${ref}.pipe(x => x)(d)))`,
		helpers: ["thrown", "tell"]
	},
	runtimeOr: {
		expr: ref => `thrown(() => tell(${ref}.or("null")(d)))`,
		helpers: ["thrown", "tell"]
	},
	inOp: {
		expr: ref =>
			`["allows", "assert", "~standard", "meta", "from", "expression"].map(k => k in ${ref})`
	},
	keys: { expr: ref => `Object.keys(${ref}).sort()` },
	typeofRead: { expr: ref => `typeof ${ref}` },
	passedCheck: { expr: ref => `check(${ref}, d)`, helpers: ["check"] },
	passedAllows: {
		expr: ref => `checkAllows(${ref}, d)`,
		helpers: ["checkAllows"]
	},
	passedAssert: {
		expr: ref => `checkAssert(${ref}, d)`,
		helpers: ["checkAssert"]
	},
	mapCallback: {
		expr: ref => `thrown(() => [d].map(${ref}).map(tell))`,
		helpers: ["thrown", "tell"]
	},
	composed: {
		expr: (_, j) => `tell(Comp${j}({ a: d }))`,
		setup: (ref, j) => [`const Comp${j} = type({ a: ${ref} })`],
		ark: ["type"],
		helpers: ["tell"]
	},
	composedAllows: {
		expr: (_, j) => `CompA${j}.allows({ a: d })`,
		setup: (ref, j) => [`const CompA${j} = type({ a: ${ref} })`],
		ark: ["type"]
	}
}

type ReadName = keyof typeof reads

// a plugin ahead of arktype's rewriting reader modules after the scan read them
const rewrites = {
	none: undefined,
	reformat: (code: string) => `${code.split("\n").join("\n\n")}\n// built\n`,
	// as a Babel plugin renames bindings
	rename: (code: string) =>
		code
			.split("\n")
			.map(line =>
				line.startsWith("import {") ?
					line.replace(/\b(V\d+)\b(?! as)/g, "$1 as $1$$r")
				:	line.replace(/(?<![\w$.])(V\d+)\b/g, "$1$$r")
			)
			.join("\n"),
	// reads a member the module didn't
	assertify: (code: string) =>
		code
			.replace(/\.allows\(d\)/g, ".assert(d)")
			.replace(/\.traverse\(d\)/g, ".assert(d)"),
	// as a code splitting plugin moves a module into a virtual one
	split: undefined
} satisfies Record<string, ((code: string) => string) | undefined>

type Rewrite = keyof typeof rewrites

interface Reader {
	target: number
	access: AccessName
	read: ReadName
	inputs: unknown[]
}

interface App {
	validators: Validator[]
	readers: Reader[]
	rewrite: Rewrite
	preset: PrecompileUnpluginOptions
}

const presets: PrecompileUnpluginOptions[] = [
	{},
	{ preset: "smallest" },
	{ errors: "none" },
	{ lazy: false }
]

// accesses the scan follows to a validator's reads, and reads a standalone
// validator has, which alone can leave members out
const followedAccesses: AccessName[] = [
	"named",
	"renamed",
	"barrel",
	"reexport",
	"namespace",
	"default",
	"conditional",
	"dynamic"
]

const followedReads: ReadName[] = [
	"call",
	"callInline",
	"issues",
	"toJSON",
	"string",
	"template",
	"count",
	"throw",
	"onFail",
	"spread",
	"allows",
	"allowsDetached",
	"allowsComputed",
	"assert",
	"assertDetached",
	"from",
	"traverse",
	"standard",
	"standardVendor",
	"meta",
	"composed",
	"composedAllows"
]

const isDefinable = (node: Node) => {
	try {
		type(defOf(node) as never)
		return true
	} catch {
		return false
	}
}

const validators: fc.Arbitrary<Validator[]> = fc
	.array(
		fc.array(
			fc.record({
				node: nodeOf([]).filter(isDefinable),
				wrap: fc.constantFrom(...(Object.keys(wraps) as Wrap[]))
			}),
			{ minLength: 1, maxLength: 3 }
		),
		{ minLength: 1, maxLength: 2 }
	)
	.chain(modules =>
		fc.boolean().map(hasDefault => {
			let i = 0
			return modules.flatMap((module, m) =>
				module.map(
					({ node, wrap }, k): Validator => ({
						name: `V${i++}`,
						module: m,
						node,
						wrap,
						isDefault: hasDefault && k === 0
					})
				)
			)
		})
	)

const inputsOf = (node: Node) =>
	fc.array(
		fc.oneof(
			{ weight: 4, arbitrary: dataOf(node, () => fc.constant(undefined)) },
			noise
		),
		{ minLength: 1, maxLength: 4 }
	)

const apps: fc.Arbitrary<App> = validators
	.chain(validators =>
		fc.record({
			validators: fc.constant(validators),
			readers: fc.array(
				fc
					.record({
						target: fc.nat(validators.length - 1),
						access: fc.oneof(
							{ weight: 3, arbitrary: fc.constantFrom(...followedAccesses) },
							fc.constantFrom(...Object.keys(accesses))
						),
						read: fc.oneof(
							{ weight: 4, arbitrary: fc.constantFrom(...followedReads) },
							fc.constantFrom(...Object.keys(reads))
						)
					})
					.chain(reader =>
						inputsOf(validators[reader.target].node).map(
							(inputs): Reader => ({ ...reader, inputs })
						)
					),
				{ minLength: 1, maxLength: 4 }
			),
			rewrite: fc.constantFrom(...(Object.keys(rewrites) as Rewrite[])),
			preset: fc.constantFrom(...presets)
		})
	)
	.map(app =>
		Object.assign(app, {
			[fc.toStringMethod]: () => sourceOfApp(app)
		})
	)

// the functions a types module's sites name, declared as grammar.ts prints them
const functions = [
	...Object.entries({ ...morphs, ...tried, ...predicates }).map(
		([name, fn]) =>
			`const ${name} = ${unnamedHoles.has(name) ? `[${fn.toString()}][0]` : fn.toString()}`
	),
	`const emptyArray = () => []`
]

const helperSources: Record<string, string> = {
	tell: `export const tell = o => o instanceof type.errors ? { summary: o.summary } : { value: o }`,
	issuesOf: `export const issuesOf = o => o instanceof type.errors ? o.issues.map(i => ({ code: i.code, path: i.path, expected: i.expected, problem: i.problem, message: i.message, data: i.data })) : { value: o }`,
	countOf: `export const countOf = o => o instanceof type.errors ? o.count : { value: o }`,
	thrown: `export const thrown = f => {
	try {
		return { value: f() }
	} catch (e) {
		return { thrown: String(e), errors: e?.arkErrors ? e.arkErrors.summary : undefined }
	}
}`,
	check: `export const check = (t, d) => tell(t(d))`,
	checkAllows: `export const checkAllows = (t, d) => t.allows(d)`,
	checkAssert: `export const checkAssert = (t, d) => thrown(() => t.assert(d))`,
	obs: `export const obs = f => {
	try {
		return { ok: f() }
	} catch (e) {
		return { threw: String(e) }
	}
}`,
	show: `export const show = v =>
	JSON.stringify(v, (_, x) =>
		typeof x === "bigint" ? \`\${x}n\`
		: typeof x === "function" ? "function"
		: typeof x === "symbol" ? String(x)
		: typeof x === "number" && !Number.isFinite(x) ? String(x)
		: x === undefined ? "undefined"
		: Object.is(x, -0) ? "-0"
		: x instanceof Date ? \`Date(\${x.getTime()})\`
		: x instanceof Map ? [...x]
		: x instanceof Set ? [...x]
		: x instanceof Error ? \`Error(\${x.message})\`
		: x
	)`
}

const filesOf = (app: App): Record<string, string> => {
	const files: Record<string, string> = {}
	const modules = new Set(app.validators.map(v => v.module))
	for (const m of modules) {
		const own = app.validators.filter(v => v.module === m)
		files[`types${m}.ts`] = [
			`import { scope, type } from "arktype"`,
			...functions,
			...own.map(
				v =>
					`export const ${v.name} = ${wraps[v.wrap](sourceOf(defOf(v.node)))}`
			),
			// a second validator a conditional chooses between
			`export const OTHER = type("string")`,
			...own.filter(v => v.isDefault).map(v => `export default ${v.name}`),
			""
		].join("\n")
	}
	const needs = new Set(app.readers.map(r => accesses[r.access].needs))
	if (needs.has("barrel")) {
		files["barrel.ts"] = [...modules]
			.map(m => `export * from "./types${m}.ts"`)
			.join("\n")
	}
	if (needs.has("nsexport")) {
		files["nsexport.ts"] = [...modules]
			.map(m => `export * as ns${m} from "./types${m}.ts"`)
			.join("\n")
	}
	if (needs.has("reexport")) {
		files["reexport.ts"] = app.readers
			.map((r, j) =>
				r.access === "reexport" ?
					`export { ${app.validators[r.target].name} as R${j} } from "${typesOf(app.validators[r.target])}"`
				:	""
			)
			.filter(Boolean)
			.join("\n")
	}
	files["helpers.ts"] = [
		`import { type } from "arktype"`,
		...Object.values(helperSources),
		""
	].join("\n")
	for (const [j, r] of app.readers.entries()) {
		const v = app.validators[r.target]
		const access = accesses[r.access]
		const read = reads[r.read]
		const other = app.validators.find(o => o !== v) ?? v
		const ref = access.ref(v, j, other)
		const ark = new Set(read.ark ?? [])
		const helpers = new Set(["obs", ...(read.helpers ?? [])])
		files[`reader${j}.ts`] = [
			...(ark.size ? [`import { ${[...ark].join(", ")} } from "arktype"`] : []),
			`import { ${[...helpers].join(", ")} } from "./helpers.ts"`,
			...(access.imports?.(v, j) ?? []),
			...(access.setup?.(v, j) ?? []),
			...(read.setup?.(ref, j) ?? []),
			`export const run${j} = async () => {`,
			...(access.before?.(v, j) ?? []).map(line => `\t${line}`),
			`\tconst inputs = [${r.inputs.map(sourceOf).join(", ")}]`,
			`\treturn inputs.map(d => obs(() => ${read.expr(ref, j)}))`,
			`}`,
			""
		].join("\n")
	}
	files["main.ts"] = [
		`import { show } from "./helpers.ts"`,
		...app.readers.map((_, j) => `import { run${j} } from "./reader${j}.ts"`),
		`const runs = { ${app.readers.map((_, j) => `run${j}`).join(", ")} }`,
		`const results = {}`,
		`for (const name in runs) {`,
		`\ttry {`,
		`\t\tresults[name] = await runs[name]()`,
		`\t} catch (e) {`,
		`\t\tresults[name] = { threw: String(e) }`,
		`\t}`,
		`}`,
		`console.log(show(results))`,
		""
	].join("\n")
	files["package.json"] = JSON.stringify({
		name: "prune-fuzz-app",
		type: "module",
		private: true
	})
	return files
}

const sourceOfApp = (app: App) => {
	const files = filesOf(app)
	return [
		`// rewrite: ${app.rewrite}, preset: ${JSON.stringify(app.preset)}`,
		...Object.entries(files)
			.filter(([name]) => name !== "helpers.ts" && name !== "package.json")
			.map(([name, text]) => `// ${name}\n${text}`)
	].join("\n")
}

// apps live outside the repo, as a project of their own resolving arktype
// through a link to this repo's package, so no suite cleans them and no
// typecheck reads them
const root = tempDir("ark-prune-fuzz-")
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
	for (const name in files) writeFileSync(join(dir, name), files[name])
	return dir
}

interface Built {
	refused?: string
	warnings: string[]
	// the bundle's chunks, concatenated
	js: string
	out: string
}

const conditions = ["ark-ts", "production"]

const isReaderId = (id: string) => /[/\\]reader\d+\.ts$/.test(id)

// the plugins ahead of arktype's, rewriting reader modules
const vitePluginsOf = (dir: string, rewrite: Rewrite): VitePlugin[] => {
	if (rewrite === "none") return []
	if (rewrite === "split") {
		return [
			{
				name: "splitting",
				enforce: "pre",
				resolveId: (id, importer) =>
					/^\.\/reader\d+\.ts\?split$/.test(id) && importer ?
						join(dir, id.slice(2))
					:	undefined,
				load: id =>
					/[/\\]reader\d+\.ts\?split$/.test(id) ?
						readFileSync(id.slice(0, -"?split".length), "utf8")
					:	undefined,
				transform: (_, id) =>
					isReaderId(id) ?
						`export * from "./${id.slice(id.lastIndexOf("/") + 1)}?split"\n`
					:	undefined
			}
		]
	}
	const rewriter = rewrites[rewrite]!
	return [
		{
			name: rewrite,
			enforce: "pre",
			transform: (code, id) => (isReaderId(id) ? rewriter(code) : undefined)
		}
	]
}

const outputOf = (outDir: string): string => {
	if (!existsSync(outDir)) return ""
	return readdirSync(outDir)
		.filter(name => name.endsWith(".js"))
		.sort()
		.map(name => readFileSync(join(outDir, name), "utf8"))
		.join("\n")
}

const buildWith = async (
	bundler: Bundler,
	dir: string,
	app: App,
	opts: PrecompileUnpluginOptions,
	tag: string
): Promise<Built> => {
	const out = join(dir, `out-${bundler}-${tag}`)
	rmSync(out, { recursive: true, force: true })
	const warnings: string[] = []
	try {
		if (bundler === "esbuild") {
			const result = await esbuild({
				entryPoints: [join(dir, "main.ts")],
				absWorkingDir: dir,
				bundle: true,
				splitting: true,
				format: "esm",
				target: "esnext",
				platform: "node",
				outdir: out,
				minify: true,
				conditions,
				logLevel: "silent",
				plugins: [precompile.esbuild({ conditions, ...opts })]
			})
			warnings.push(...result.warnings.map(w => w.text))
		} else {
			const { NODE_ENV } = process.env
			process.env.NODE_ENV = "production"
			try {
				const config: InlineConfig = {
					root: dir,
					configFile: false,
					logLevel: "silent",
					plugins: [
						...vitePluginsOf(dir, app.rewrite),
						precompile.vite({ conditions: ["ark-ts"], ...opts })
					],
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
							fileName: () => "main.js"
						},
						rollupOptions: {
							onwarn: warning => warnings.push(warning.message)
						}
					}
				}
				const result = await viteBuild(config)
				if (!existsSync(join(out, "main.js"))) {
					const outputs = (Array.isArray(result) ? result : [result]).flatMap(
						r => ("output" in r ? r.output.map(o => o.fileName) : [])
					)
					return {
						refused: `harness: vite wrote no main.js, only ${JSON.stringify(outputs)}`,
						warnings,
						js: "",
						out
					}
				}
			} finally {
				if (NODE_ENV === undefined) delete process.env.NODE_ENV
				else process.env.NODE_ENV = NODE_ENV
			}
		}
	} catch (e) {
		// a build's error, with its stack, where a message says too little
		if (process.env.ARK_PRUNE_FUZZ_DEBUG) console.error(e)
		const message =
			e && typeof e === "object" && "errors" in e && Array.isArray(e.errors) ?
				e.errors.map((error: { text: string }) => error.text).join("\n")
			:	String((e as Error).message ?? e)
		// an error without a message still refused
		return { refused: message || `threw ${String(e)}`, warnings, js: "", out }
	}
	return { warnings, js: outputOf(out), out }
}

// a predicate's description reads its function's name as the build minified
// it, which differs between two bundles of the same program
const minifiedNames = /valid according to [\w$]+/g

const runOut = (out: string) => {
	const { stdout, stderr, status } = spawnSync(
		process.execPath,
		[join(out, "main.js")],
		{ encoding: "utf8", timeout: 60_000 }
	)
	const result =
		status === 0 ? stdout : (
			`exit ${status}\n${stdout}\n${stderr.split("\n").find(line => /Error|error/.test(line)) ?? stderr.slice(0, 500)}`
		)
	return result.replace(minifiedNames, "valid according to fn")
}

const headOf = (message: string) =>
	message.split("\n")[0].replace(/\s+/g, " ").slice(0, 160)

interface Tally {
	invalid: Record<string, number>
	refused: Record<string, number>
	kept: number
	pruned: number
	unsound: number
	bytesSaved: number
}

const tallies: Record<Bundler, Tally> = {
	esbuild: {
		invalid: {},
		refused: {},
		kept: 0,
		pruned: 0,
		unsound: 0,
		bytesSaved: 0
	},
	vite: {
		invalid: {},
		refused: {},
		kept: 0,
		pruned: 0,
		unsound: 0,
		bytesSaved: 0
	}
}

const bump = (record: Record<string, number>, key: string) =>
	(record[key] = (record[key] ?? 0) + 1)

const failures: string[] = []
mkdirSync(failureDir, { recursive: true })

const keepFailure = (
	app: App,
	dir: string,
	bundler: Bundler,
	whole: Built,
	pruned: Built,
	wholeOut: string,
	prunedOut: string
) => {
	const kept = join(failureDir, `${Date.now()}-${bundler}`)
	mkdirSync(kept, { recursive: true })
	const files = filesOf(app)
	for (const name in files) writeFileSync(join(kept, name), files[name])
	writeFileSync(join(kept, "app.txt"), sourceOfApp(app))
	writeFileSync(join(kept, "whole.out.txt"), wholeOut)
	writeFileSync(join(kept, "pruned.out.txt"), prunedOut)
	writeFileSync(join(kept, "whole.js"), whole.js)
	writeFileSync(join(kept, "pruned.js"), pruned.js)
	writeFileSync(
		join(kept, "warnings.txt"),
		`whole:\n${whole.warnings.join("\n")}\n\npruned:\n${pruned.warnings.join("\n")}\n`
	)
	failures.push(kept)
	return kept
}

// whether both builds of an app behave alike, or the pruned one refused
const check = async (app: App): Promise<boolean> => {
	const dir = writeApp(app)
	let sound = true
	for (const bundler of bundlers) {
		const tally = tallies[bundler]
		const whole = await buildWith(
			bundler,
			dir,
			app,
			{ ...app.preset, prune: false },
			"whole"
		)
		if (whole.refused) {
			bump(tally.invalid, headOf(whole.refused))
			continue
		}
		const pruned = await buildWith(bundler, dir, app, app.preset, "pruned")
		if (pruned.refused) {
			bump(tally.refused, headOf(pruned.refused))
			continue
		}
		const saved = gzipSync(whole.js).length - gzipSync(pruned.js).length
		if (pruned.warnings.some(w => w.startsWith("prune:"))) tally.kept++
		else tally.pruned++
		tally.bytesSaved += saved
		const wholeOut = runOut(whole.out)
		const prunedOut = runOut(pruned.out)
		if (wholeOut !== prunedOut) {
			tally.unsound++
			sound = false
			const kept = keepFailure(
				app,
				dir,
				bundler,
				whole,
				pruned,
				wholeOut,
				prunedOut
			)
			console.error(`\nUNSOUND (${bundler}): kept in ${kept}`)
		}
	}
	if (sound) rmSync(dir, { recursive: true, force: true })
	return sound
}

const started = Date.now()
let seed = initialSeed
let remaining = count
while (remaining > 0) {
	const runs = remaining
	const result = await fc.check(
		fc.asyncProperty(apps, app => check(app)),
		{ numRuns: runs, seed, endOnFailure: true }
	)
	if (!result.failed) break
	console.error(
		`seed ${seed} run ${result.numRuns}: counterexample\n${sourceOfApp(result.counterexample![0])}`
	)
	remaining -= result.numRuns
	seed++
}

for (const bundler of bundlers) {
	const t = tallies[bundler]
	console.log(
		`\n${bundler}: ${t.pruned} pruned, ${t.kept} kept whole, ${t.unsound} unsound, ${t.bytesSaved} B gzipped saved in all`
	)
	console.log(
		`  refused: ${Object.entries(t.refused)
			.map(([k, n]) => `\n    ${n}x ${k}`)
			.join("")}`
	)
	console.log(
		`  invalid: ${Object.entries(t.invalid)
			.map(([k, n]) => `\n    ${n}x ${k}`)
			.join("")}`
	)
}
console.log(
	`\n${count} apps from seed ${initialSeed} in ${Math.round((Date.now() - started) / 1000)}s${failures.length ? `\n${failures.length} unsound, kept in:\n${failures.join("\n")}` : ""}`
)
process.exit(failures.length ? 1 : 0)
