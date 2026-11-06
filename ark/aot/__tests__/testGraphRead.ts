// webpack and Rspack read the program as they built it, so what they prune rests
// on what that read sees: each scenario reads a validator's members in a way the
// bundler itself decides, by a plugin, a loader, a context or an output format.
// A pruned build either refuses, throws that a member isn't baked, or runs as
// the same config's whole build.
// [ARK_GRAPH_READ_ONLY=<scenario prefix>,...] [ARK_GRAPH_READ_BUNDLERS=webpack,rspack]
// [ARK_GRAPH_READ_KEEP=<dir>] pnpm testGraphRead
import { fromHere } from "@ark/fs"
import { precompile } from "@ark/aot/unplugin"
import { rspack } from "@rspack/core"
import webpack from "webpack"
import { spawnSync } from "node:child_process"
import { cpSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { tempDir } from "./utils.ts"

type Bundler = "webpack" | "rspack"

interface Build {
	bundler: Bundler
	dir: string
	lib: typeof webpack
}

interface Scenario {
	files: Record<string, string>
	config?: (build: Build) => Record<string, unknown>
	// the file node runs, where it isn't the bundle's own entry
	run?: string
	only?: Bundler
	// the output's filename
	filename?: string
}

const types = `import { type } from "arktype"

const isLong = (s: string) => s.length > 2

export const V = type("string").narrow(isLong)
export const U = type({ name: "string", "age?": "number" })
`

const reader = `const read = (T: any) => {
	const out: unknown[] = []
	for (const member of [
		() => T.expression,
		() => T.description,
		() => T.json,
		() => T.toJsonSchema(),
		() => T["~standard"].jsonSchema?.input({ target: "draft-2020-12" }),
		() => String(T({ name: 1 }))
	]) {
		try {
			out.push(member())
		} catch (e) {
			out.push({ threw: String((e as Error).message) })
		}
	}
	return out
}
`

const log = `console.log(JSON.stringify(out))\n`

const reads = (of = "U") => `${reader}const out = read(${of})\n${log}`

// a program reading one member, which is what a prune could leave the others out of
const readsOne = (of = "U") =>
	`const out = [(${of} as any).expression, String((${of} as any)({ name: 1 }))]\n${log}`

const scenarios: Record<string, Scenario> = {
	// reference: a program whose reads are plain, so a prune has work to do
	plain: {
		files: {
			"main.ts": `import { U } from "./types.ts"\n${readsOne()}`
		}
	},
	providePlugin: {
		files: { "main.ts": `declare const U: any\n${readsOne()}` },
		config: ({ dir, lib }) => ({
			plugins: [
				new (lib as any).ProvidePlugin({ U: [join(dir, "types.ts"), "U"] })
			]
		})
	},
	providePluginBeside: {
		// a module importing U plainly, so the read's not all that's there
		files: {
			"main.ts": `import { U as Named } from "./types.ts"\nimport "./free.ts"\nconsole.log(String(Named({ name: "a" })))\n`,
			"free.ts": `declare const U: any\n${readsOne()}`
		},
		config: ({ dir, lib }) => ({
			plugins: [
				new (lib as any).ProvidePlugin({ U: [join(dir, "types.ts"), "U"] })
			]
		})
	},
	definePlugin: {
		files: {
			"main.ts": `import { U } from "./types.ts"\ndeclare const READ: any\nconst local: any = U\nconst out = [READ, String(local({ name: 1 }))]\n${log}`
		},
		config: ({ lib }) => ({
			plugins: [new (lib as any).DefinePlugin({ READ: "local.expression" })]
		})
	},
	library: {
		files: {
			"main.ts": `export { U, V } from "./types.ts"\n`,
			"run.cjs": `const { U } = require("./out/main.cjs")\n${reader.replace("(T: any)", "(T)").replace("out: unknown[]", "out").replace("(e as Error)", "e")}const out = read(U)\n${log}`
		},
		config: () => ({
			output: { library: { type: "commonjs2" } }
		}),
		run: "run.cjs"
	},
	outputModule: {
		files: { "main.ts": `import { U } from "./types.ts"\n${readsOne()}` },
		config: () => ({
			experiments: { outputModule: true },
			output: { module: true, chunkFormat: "module" }
		}),
		filename: "main.mjs"
	},
	commonJsLoaderOne: {
		// through one module's import, the barrel a transpiled project still has
		files: {
			"main.ts": `import { U } from "./barrel.ts"\nconst out = [(U as any).description]\n${log}`,
			"barrel.ts": `export * from "./types.ts"\n`
		},
		config: ({ dir }) => ({
			module: {
				rules: [{ test: /\.ts$/, loader: join(dir, "transpile.cjs") }]
			}
		})
	},
	commonJsLoader: {
		files: {
			"main.ts": `import { U } from "./types.ts"\nimport { use } from "./reader.ts"\nconsole.log(JSON.stringify(use()), String(U({ name: "a" })))\n`,
			"reader.ts": `import { U } from "./types.ts"\nexport const use = () => (U as any).expression\n`
		},
		config: ({ dir }) => ({
			module: {
				rules: [
					{
						test: /\.ts$/,
						use: [
							{
								loader: join(dir, "transpile.cjs"),
								options: {}
							}
						]
					}
				]
			}
		})
	},
	swcCommonJs: {
		only: "rspack",
		files: {
			"main.ts": `import { U } from "./types.ts"\nimport { use } from "./reader.ts"\nconsole.log(JSON.stringify(use()), String(U({ name: "a" })))\n`,
			"reader.ts": `import { U } from "./types.ts"\nexport const use = () => (U as any).expression\n`
		},
		config: () => ({
			module: {
				rules: [
					{
						test: /\.ts$/,
						loader: "builtin:swc-loader",
						options: {
							jsc: { parser: { syntax: "typescript" } },
							module: { type: "commonjs" }
						}
					}
				]
			}
		})
	},
	sideEffectsFree: {
		files: {
			"main.ts": `import { U } from "./barrel.ts"\n${readsOne()}`,
			"barrel.ts": `export * from "./types.ts"\nexport { U as Renamed } from "./types.ts"\n`,
			"package.json": `{ "type": "module", "sideEffects": false }\n`
		}
	},
	sideEffectsFreeStar: {
		files: {
			"main.ts": `import { U } from "./barrel.ts"\n${readsOne()}`,
			"barrel.ts": `export * from "./types.ts"\n`,
			"package.json": `{ "type": "module", "sideEffects": false }\n`
		}
	},
	sideEffectsFreeNamed: {
		files: {
			"main.ts": `import { U } from "./barrel.ts"\n${readsOne()}`,
			"barrel.ts": `export { U } from "./types.ts"\n`,
			"package.json": `{ "type": "module", "sideEffects": false }\n`
		}
	},
	sideEffectsKept: {
		files: {
			"main.ts": `import { U } from "./barrel.ts"\n${readsOne()}`,
			"barrel.ts": `export * from "./types.ts"\nexport { U as Renamed } from "./types.ts"\n`
		}
	},
	sideEffectsFreeUnused: {
		// V's module holds a setter nothing uses, but U's validator shares its units
		files: {
			"main.ts": `import { A } from "./a.ts"\nconst out = [String(A("abc")), String(A("a"))]\n${log}`,
			"a.ts": `export { A } from "./sites.ts"\n`,
			"sites.ts": `import { type } from "arktype"\nimport { isLong } from "./preds.ts"\n\nexport const A = type("string").narrow(isLong)\nexport const B = type({ b: type("string").narrow(isLong) })\n`,
			"preds.ts": `export const isLong = (s: string) => s.length > 2\n`,
			"package.json": `{ "type": "module", "sideEffects": false }\n`
		}
	},
	moduleReplaced: {
		files: {
			"main.ts": `import { use } from "./reader.ts"\nconsole.log(JSON.stringify(use()))\n`,
			"reader.ts": `import { U } from "./types.ts"\nexport const use = () => String(U({ name: "a" }))\n`,
			"reader.alt.ts": `import { U } from "./types.ts"\nexport const use = () => (U as any).expression\n`
		},
		config: ({ dir, lib }) => ({
			plugins: [
				new (lib as any).NormalModuleReplacementPlugin(
					/[/\\]reader\.ts$/,
					join(dir, "reader.alt.ts")
				)
			]
		})
	},
	requireContext: {
		files: {
			"main.ts": `declare const require: any\nconst context = require.context("./readers", false, /\\.ts$/)\nconst out = context.keys().map((key: string) => context(key).use())\n${log}`,
			"readers/one.ts": `import { U } from "../types.ts"\nexport const use = () => (U as any).expression\n`,
			"readers/two.ts": `import { U } from "../types.ts"\nexport const use = () => (U as any).description\n`
		}
	},
	webpackContext: {
		files: {
			"main.ts": `const context = (import.meta as any).webpackContext("./readers", { recursive: false, regExp: /\\.ts$/ })\nconst out = context.keys().map((key: string) => context(key).use())\n${log}`,
			"readers/one.ts": `import { U } from "../types.ts"\nexport const use = () => (U as any).expression\n`
		}
	},
	computedImport: {
		files: {
			"main.ts": `const name = ["one"][0]\nconst { use } = await import(\`./readers/\${name}.ts\`)\nconst out = [use()]\n${log}`,
			"readers/one.ts": `import { U } from "../types.ts"\nexport const use = () => (U as any).expression\n`
		},
		config: () => ({
			experiments: { topLevelAwait: true },
			module: {
				rules: [{ test: /\.ts$/, type: "javascript/esm", loader: loaderPath }]
			}
		})
	},
	externalReader: {
		files: {
			"main.ts": `import { U } from "./types.ts"\n// @ts-ignore\nimport { read } from "ext-reader"\nconsole.log(JSON.stringify(read(U)))\n`,
			"ext.cjs": `exports.read = T => [T.expression, T.description, T.json]\n`
		},
		config: ({ dir }) => ({
			externals: { "ext-reader": `commonjs ${join(dir, "ext.cjs")}` }
		})
	},
	splitChunks: {
		files: {
			"main.ts": `import { U } from "./types.ts"\nconst { use } = await import("./reader.ts")\nconsole.log(JSON.stringify(use()), String(U({ name: "a" })))\n`,
			"reader.ts": `import { U } from "./types.ts"\nexport const use = () => (U as any).expression\n`
		},
		config: () => ({
			experiments: { topLevelAwait: true },
			optimization: {
				splitChunks: { chunks: "all", minSize: 0 }
			}
		})
	},
	noConcatenate: {
		files: { "main.ts": `import { U } from "./types.ts"\n${readsOne()}` },
		config: () => ({
			optimization: {
				concatenateModules: false,
				usedExports: false,
				sideEffects: false
			}
		})
	},
	evalDevtool: {
		files: { "main.ts": `import { U } from "./types.ts"\n${readsOne()}` },
		config: () => ({ devtool: "eval" })
	},
	importsField: {
		files: {
			"main.ts": `// @ts-ignore\nimport { U } from "#types"\n${readsOne()}`,
			"package.json": `{ "type": "module", "imports": { "#types": "./types.ts" } }\n`
		}
	},
	inlineLoader: {
		files: {
			"main.ts": `// @ts-ignore\nimport { use } from "-!LOADER!./reader.ts"\nconsole.log(JSON.stringify(use()))\n`,
			"reader.ts": `import { U } from "./types.ts"\nexport const use = () => (U as any).expression\n`
		}
	},
	cjsReader: {
		files: {
			"main.ts": `import { U } from "./types.ts"\nimport { use } from "./reader.cjs"\nconsole.log(JSON.stringify(use(U)))\n`,
			"reader.cjs": `exports.use = T => T.expression\n`
		}
	},
	reexportedAsValue: {
		// what reaches main is an object holding U, read by a computed key
		files: {
			"main.ts": `import * as all from "./types.ts"\nconst key = ["U"][0] as "U"\nconst out = [(all[key] as any).expression]\n${log}`
		}
	},
	fullRead: {
		files: { "main.ts": `import { U } from "./types.ts"\n${reads()}` }
	}
}

// webpack defers what a side-effect-free module re-exports until a module asks
// for it, which the read rebuilding a written module can lose. Each way of
// reaching a validator through one, under each way of compiling it, as webpack
// reads a transpiler's output and Rspack's own swc differently from its source
const free = `{ "type": "module", "sideEffects": false }\n`
const barrelShapes: Record<string, Record<string, string>> = {
	nested: {
		"main.ts": `import { U } from "./outer.ts"\n${readsOne()}`,
		"outer.ts": `export * from "./inner.ts"\n`,
		"inner.ts": `export { U } from "./types.ts"\n`
	},
	renamed: {
		"main.ts": `import { Renamed } from "./barrel.ts"\n${readsOne("Renamed")}`,
		"barrel.ts": `export { U as Renamed } from "./types.ts"\n`
	},
	asDefault: {
		"main.ts": `import U from "./barrel.ts"\n${readsOne()}`,
		"barrel.ts": `export { U as default } from "./types.ts"\n`
	},
	starAs: {
		"main.ts": `import { ns } from "./barrel.ts"\n${readsOne("ns.U")}`,
		"barrel.ts": `export * as ns from "./types.ts"\n`
	},
	namespaceRead: {
		"main.ts": `import * as all from "./barrel.ts"\n${readsOne("all.U")}`,
		"barrel.ts": `export * from "./types.ts"\n`
	},
	wholeNamespace: {
		"main.ts": `import * as all from "./barrel.ts"\nconst out = [Object.keys(all), String((all.U as any)({ name: 1 }))]\n${log}`,
		"barrel.ts": `export * from "./types.ts"\n`
	},
	dynamic: {
		"main.ts": `import("./barrel.ts").then(({ U }) => {\n${readsOne()}})\n`,
		"barrel.ts": `export { U } from "./types.ts"\n`
	},
	staticAndDynamic: {
		"main.ts": `import { U } from "./barrel.ts"\nimport("./other.ts").then(({ V }) => {\nconst out = [(U as any).expression, String((V as any)("a"))]\n${log}})\n`,
		"barrel.ts": `export { U } from "./types.ts"\n`,
		"other.ts": `export { V } from "./types.ts"\n`
	},
	twoBarrels: {
		"main.ts": `import { U } from "./a.ts"\nimport { V } from "./b.ts"\nconst out = [(U as any).expression, String((V as any)("a"))]\n${log}`,
		"a.ts": `export { U } from "./types.ts"\n`,
		"b.ts": `export { V } from "./types.ts"\n`
	},
	// what nothing asks for stays unbuilt, beside what's asked for
	unusedBeside: {
		"main.ts": `import { U } from "./barrel.ts"\n${readsOne()}`,
		"barrel.ts": `export { U } from "./types.ts"\nexport { W } from "./unused.ts"\n`,
		"unused.ts": `import { type } from "arktype"\nexport const W = type({ w: "string" })\n`
	},
	// two modules each asked for one validator, one module asked for both
	splitAcross: {
		"main.ts": `import { A, B } from "./barrel.ts"\nconst out = [(A as any).expression, String((B as any)({ b: 1 }))]\n${log}`,
		"barrel.ts": `export { A } from "./a.ts"\nexport { B } from "./b.ts"\n`,
		"a.ts": `import { type } from "arktype"\nexport const A = type({ a: "string" })\n`,
		"b.ts": `import { type } from "arktype"\nexport const B = type({ b: "string" })\n`
	},
	cycle: {
		"main.ts": `import { U } from "./a.ts"\n${readsOne()}`,
		"a.ts": `export * from "./b.ts"\nexport const fromA = 1\n`,
		"b.ts": `export * from "./a.ts"\nexport { U } from "./types.ts"\n`
	},
	ownBeside: {
		"main.ts": `import { U, own } from "./barrel.ts"\nconst out = [own, (U as any).expression, String((U as any)({ name: 1 }))]\n${log}`,
		"barrel.ts": `export const own = 1\nexport { U } from "./types.ts"\n`
	},
	definedAndReexported: {
		"main.ts": `import { U, Own } from "./barrel.ts"\nconst out = [(Own as any).expression, String((U as any)({ name: 1 }))]\n${log}`,
		"barrel.ts": `import { type } from "arktype"\nexport const Own = type({ own: "string" })\nexport { U } from "./types.ts"\n`
	},
	readByTwo: {
		"main.ts": `import { U } from "./barrel.ts"\nimport { use } from "./reader.ts"\nconst out = [use(), String((U as any)({ name: 1 }))]\n${log}`,
		"barrel.ts": `export * from "./types.ts"\n`,
		"reader.ts": `import { U } from "./barrel.ts"\nexport const use = () => (U as any).expression\n`
	},
	packageDependency: {
		"main.ts": `import { D } from "dep"\n${readsOne("D")}`,
		"node_modules/dep/package.json": `{ "name": "dep", "type": "module", "sideEffects": false, "exports": "./index.js" }\n`,
		"node_modules/dep/index.js": `export { D } from "./types.js"\n`,
		"node_modules/dep/types.js": `import { type } from "arktype"\nexport const D = type({ name: "string" })\n`
	},
	sideEffectsListed: {
		"main.ts": `import { U } from "./barrel.ts"\n${readsOne()}`,
		"barrel.ts": `export { U } from "./types.ts"\n`,
		"package.json": `{ "type": "module", "sideEffects": ["./main.ts"] }\n`
	}
}

const barrelCompilers: Record<string, Pick<Scenario, "only" | "config">> = {
	stripped: {},
	tsEsm: {
		config: ({ dir }) => ({
			module: {
				rules: [
					{
						test: /\.ts$/,
						type: "javascript/esm",
						loader: join(dir, "transpileEsm.cjs")
					}
				]
			}
		})
	},
	tsCommonJs: {
		config: ({ dir }) => ({
			module: {
				rules: [{ test: /\.ts$/, loader: join(dir, "transpile.cjs") }]
			}
		})
	},
	swcCommonJs: {
		only: "rspack",
		config: () => ({
			module: {
				rules: [
					{
						test: /\.ts$/,
						loader: "builtin:swc-loader",
						options: {
							jsc: { parser: { syntax: "typescript" }, target: "es2022" },
							module: { type: "commonjs" }
						}
					}
				]
			}
		})
	},
	swc: {
		only: "rspack",
		config: () => ({
			module: {
				rules: [
					{
						test: /\.ts$/,
						loader: "builtin:swc-loader",
						options: {
							jsc: { parser: { syntax: "typescript" }, target: "es2022" },
							module: { type: "es6" }
						}
					}
				]
			}
		})
	}
}

for (const [shape, files] of Object.entries(barrelShapes)) {
	for (const [compiler, { only, config }] of Object.entries(barrelCompilers)) {
		for (const concatenateModules of [true, false]) {
			scenarios[
				`barrel ${shape} ${compiler} ${concatenateModules ? "concatenated" : "apart"}`
			] = {
				...(only && { only }),
				files: { "package.json": free, ...files },
				config: build => ({
					...config?.(build),
					optimization: { concatenateModules }
				})
			}
		}
	}
}

const loaderPath = fromHere("stripTypesLoader.ts")
// a project's ts-loader under module: CommonJS, which is what webpack reads then
const transpileLoader = `const { createRequire } = require("node:module")
const ts = createRequire("${fromHere("..", "package.json")}")("typescript-6")
module.exports = function (source) {
	return ts.transpileModule(source, {
		compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
	}).outputText
}
`

const transpileEsmLoader = transpileLoader.replace(
	"ts.ModuleKind.CommonJS",
	"ts.ModuleKind.ESNext"
)

const root = tempDir("ark-graph-read-")
const keep = process.env.ARK_GRAPH_READ_KEEP
const only = process.env.ARK_GRAPH_READ_ONLY?.split(",")
const bundlers = (process.env.ARK_GRAPH_READ_BUNDLERS?.split(",") ?? [
	"webpack",
	"rspack"
]) as Bundler[]

const writeApp = (name: string, scenario: Scenario): string => {
	const dir = join(root, name)
	mkdirSync(join(dir, "node_modules"), { recursive: true })
	symlinkSync(
		fromHere("..", "..", "type"),
		join(dir, "node_modules", "arktype")
	)
	const files: Record<string, string> = {
		"package.json": `{ "type": "module" }\n`,
		"types.ts": types,
		"transpile.cjs": transpileLoader,
		"transpileEsm.cjs": transpileEsmLoader,
		...scenario.files
	}
	for (const file in files) {
		mkdirSync(dirname(join(dir, file)), { recursive: true })
		writeFileSync(
			join(dir, file),
			file === "main.ts" ?
				files[file].replace("LOADER", loaderPath)
			:	files[file]
		)
	}
	return dir
}

type Outcome = { refused: string } | { out: string }

const deepMerge = (
	base: Record<string, unknown>,
	over: Record<string, unknown>
) => {
	const merged = { ...base }
	for (const key in over) {
		const [a, b] = [merged[key], over[key]]
		merged[key] =
			(
				a &&
				b &&
				typeof a === "object" &&
				typeof b === "object" &&
				!Array.isArray(a) &&
				!Array.isArray(b)
			) ?
				deepMerge(a as never, b as never)
			:	b
	}
	return merged
}

const build = async (
	bundler: Bundler,
	dir: string,
	scenario: Scenario,
	options: Record<string, unknown>,
	withPlugin = true
): Promise<Outcome> => {
	const lib = (bundler === "webpack" ? webpack : rspack) as typeof webpack
	const out = join(dir, "out")
	rmSync(out, { recursive: true, force: true })
	const filename = scenario.filename ?? "main.cjs"
	const overrides = scenario.config?.({ bundler, dir, lib }) ?? {}
	const plugin = (
		bundler === "webpack" ?
			precompile.webpack({ cwd: dir, ...options })
		:	precompile.rspack({ cwd: dir, ...options })) as never
	const config = deepMerge(
		{
			mode: "production",
			context: dir,
			entry: "./main.ts",
			target: "node",
			output: { path: out, filename, chunkFilename: "chunk-[id].cjs" },
			resolve: { extensions: [".ts", ".js", ".cjs"] },
			module: { rules: [{ test: /\.ts$/, loader: loaderPath }] }
		},
		overrides
	)
	config.plugins = [
		...((overrides.plugins as never[]) ?? []),
		...(withPlugin ? [plugin] : [])
	]
	const compiler = lib(config as never)
	const failed = await new Promise<string | undefined>((resolve, reject) => {
		const hung = setTimeout(
			() => reject(new Error(`${bundler} hung building ${dir}`)),
			300_000
		)
		compiler.run((error, stats) =>
			compiler.close(() => {
				clearTimeout(hung)
				resolve(
					error ? String(error.message)
					: stats?.hasErrors() ?
						stats
							.toJson()
							.errors!.map(e => e.message)
							.join("\n")
					:	undefined
				)
			})
		)
	}).catch((e: Error) => e.message)
	if (failed) return { refused: failed }
	const { stdout, stderr, status } = spawnSync(
		process.execPath,
		[join(dir, scenario.run ?? join("out", filename))],
		{ cwd: dir, encoding: "utf8", timeout: 120_000 }
	)
	return {
		out:
			status === 0 ? stdout : (
				`exit ${status} ${/^\w*Error\b.*$/m.exec(stderr)?.[0] ?? stderr}`
			)
	}
}

const headOf = (message: string) =>
	(
		message
			.split("\n")
			.find(line => line.trim() && !/^\s*(×|Module build failed)/.test(line)) ??
		message
	)
		.trim()
		.split(root)
		.join("")
		.slice(0, 170)

// a minifier decides which name a function keeps, if any
const normalized = (out: string) =>
	out.replace(
		/according to (?:an anonymous predicate|[\w$]+)/g,
		"according to a predicate"
	)

// a member a build left out, which it says as it's read
const isLoud = (out: string) =>
	/isn't baked|reads? \w+, which a standalone validator lacks|Type<[^>]*>|can't be precompiled/.test(
		out
	)

let unsound = 0
let crashed = 0
for (const [name, scenario] of Object.entries(scenarios)) {
	if (only && !only.some(prefix => name.startsWith(prefix))) continue
	const dir = writeApp(name, scenario)
	for (const bundler of bundlers) {
		if (scenario.only && scenario.only !== bundler) continue
		for (const preset of [{}, { preset: "smallest" as const }]) {
			const label = `${name} ${bundler}${preset.preset ? " smallest" : ""}`
			const whole = await build(bundler, dir, scenario, {
				...preset,
				prune: false
			})
			const pruned = await build(bundler, dir, scenario, preset)
			if ("refused" in pruned) {
				console.log(`${label}: refused: ${headOf(pruned.refused)}`)
				continue
			}
			if ("refused" in whole) {
				console.log(
					`${label}: whole refused, pruned ran: ${headOf(whole.refused)}`
				)
				continue
			}
			if (normalized(pruned.out) === normalized(whole.out)) {
				// the same crash whole and pruned is a bug comparing them can't see
				if (pruned.out.startsWith("exit ") && !isLoud(pruned.out)) {
					crashed++
					console.log(
						`${label}: CRASHED, as whole: ${pruned.out.slice(0, 200)}`
					)
				} else console.log(`${label}: as whole`)
				continue
			}
			if (isLoud(pruned.out)) {
				console.log(`${label}: loud: ${pruned.out.trim().slice(0, 200)}`)
				continue
			}
			// a whole build failing loudly where the pruned one reads what arktype
			// does, as the bundler alone builds it with arktype
			if (isLoud(whole.out)) {
				const plain = await build(bundler, dir, scenario, preset, false)
				if (
					"out" in plain &&
					normalized(plain.out) === normalized(pruned.out)
				) {
					console.log(`${label}: as arktype, where whole is loud`)
					continue
				}
			}
			unsound++
			console.log(
				`${label}: UNSOUND\n  whole:  ${whole.out.trim().slice(0, 400)}\n  pruned: ${pruned.out.trim().slice(0, 400)}`
			)
			if (keep) {
				const kept = join(keep, name)
				cpSync(dir, kept, {
					recursive: true,
					filter: source => !source.includes("node_modules")
				})
			}
		}
	}
	rmSync(dir, { recursive: true, force: true })
}
console.log(`${unsound} unsound, ${crashed} crashed as whole`)
rmSync(root, { recursive: true, force: true })
process.exit(unsound || crashed ? 1 : 0)
