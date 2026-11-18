// a build whose options change between builds sharing a persistent cache must
// write what a cold build of the same options writes: each host builds one app
// under each of a sequence of options in one directory, keeping whatever cache it
// keeps there, and each build's output is compared with a cold build of the same
// options in a directory of its own.
// The options are passed to the plugin, then written to ark.json.
// [ARK_OPTIONS_CACHE_HOSTS=esbuild,vite,webpack,rspack,node,next]
// [ARK_OPTIONS_CACHE_VIA=plugin,config] pnpm testOptionsCache
import { fromHere } from "@ark/fs"
import { precompile } from "@ark/aot/unplugin"
import { rspack } from "@rspack/core"
import { build as esbuild } from "esbuild"
import { build as viteBuild, defaultClientConditions } from "vite"
import webpack from "webpack"
import { spawnSync } from "node:child_process"
import {
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync
} from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { buildOnNext, removeNextApps } from "./nextBuild.ts"
import { tempDir } from "./utils.ts"

type Host = "esbuild" | "vite" | "webpack" | "rspack" | "node" | "next"

const hosts = (process.env.ARK_OPTIONS_CACHE_HOSTS?.split(",") ?? [
	"esbuild",
	"vite",
	"webpack",
	"rspack",
	"node",
	"next"
]) as Host[]

// each changes what a validator or its errors are written as
const optionSets: Record<string, Record<string, unknown>> = {
	default: {},
	first: { errors: "first" },
	none: { errors: "none" },
	smallest: { preset: "smallest" },
	sizeSpeedErrors: { optimize: "size", optimizeErrors: "speed" },
	sizeErrors: { optimizeErrors: "size" }
}

// built in this order on one cache, so each set follows several others
const sequence = [
	"default",
	"first",
	"none",
	"smallest",
	"sizeSpeedErrors",
	"sizeErrors",
	"default",
	"smallest",
	"none",
	"first"
]

const files: Record<string, string> = {
	"package.json": `{ "type": "module" }\n`,
	"types.ts": `import { type } from "arktype"

export const isEven = (n: number) => n % 2 === 0
Object.defineProperty(isEven, "name", { value: "isEven" })

export const User = type({ name: "string", age: "number.integer >= 0", "tags?": "string[]" })
export const Shape = type({ kind: "'circle'", r: "number" }).or({ kind: "'square'", side: "number" })
export const Maybe = type({ a: "string | null", ip: "string.ip" })
export const Even = type(["number", ":", isEven])
export const Parsed = type({ n: "string.numeric.parse" })
`,
	"main.ts": `import { type } from "arktype"
import { Even, Maybe, Parsed, Shape, User } from "./types.ts"

const read = (out: unknown) =>
	out instanceof type.errors ?
		[out.count, out.summary, String(out), out.issues.map(i => [i.path, i.code])]
	:	out
const observations = [
	read(User({ name: 1, age: -1.5, tags: [1] })),
	read(User({ name: "a", age: 2 })),
	read(Shape({ kind: "square", side: "x" })),
	read(Shape(5)),
	read(Maybe({ a: 1, ip: "1.2.3" })),
	read(Even(3)),
	read(Even(4)),
	read(Parsed({ n: "12" })),
	read(Parsed({ n: "x" })),
	User.expression,
	Shape.allows({ kind: "circle", r: 1 })
]
console.log(JSON.stringify(observations))
`
}

const conditions = ["ark-ts", "production"]
const root = tempDir("ark-options-cache-")

const writeApp = (dir: string) => {
	mkdirSync(join(dir, "node_modules"), { recursive: true })
	symlinkSync(
		fromHere("..", "..", "type"),
		join(dir, "node_modules", "arktype")
	)
	for (const name in files) writeFileSync(join(dir, name), files[name])
}

const run = (args: string[], cwd: string, env: NodeJS.ProcessEnv = {}) => {
	const { stdout, stderr, status } = spawnSync(process.execPath, args, {
		cwd,
		encoding: "utf8",
		timeout: 120_000,
		env: { ...process.env, ...env }
	})
	return status === 0 ?
			stdout.trim()
		:	`exit ${status} ${/^\w*Error\b.*$/m.exec(stderr)?.[0] ?? stderr.slice(0, 300)}`
}

interface Built {
	// what it printed, or why it refused
	out: string
	// what it wrote, where it writes one bundle
	js?: string
}

const jsIn = (dir: string) =>
	readdirSync(dir, { recursive: true, encoding: "utf8" })
		.filter(file => /\.c?js$/.test(file))
		.sort()
		.map(file => readFileSync(join(dir, file), "utf8"))
		.join("\n")

const refusal = (e: unknown) =>
	`refused ${String((e as { errors?: { text?: string }[] })?.errors?.[0]?.text ?? (e as Error)?.message ?? e).slice(0, 300)}`

const bundled = async (
	host: Host,
	dir: string,
	options: Record<string, unknown>
): Promise<Built> => {
	const out = join(dir, "out")
	rmSync(out, { recursive: true, force: true })
	try {
		if (host === "esbuild") {
			await esbuild({
				entryPoints: [join(dir, "main.ts")],
				absWorkingDir: dir,
				bundle: true,
				format: "esm",
				platform: "node",
				outdir: out,
				minify: true,
				conditions,
				logLevel: "silent",
				plugins: [precompile.esbuild({ conditions, cwd: dir, ...options })]
			})
		} else if (host === "vite") {
			const { NODE_ENV } = process.env
			process.env.NODE_ENV = "production"
			try {
				await viteBuild({
					root: dir,
					configFile: false,
					logLevel: "silent",
					plugins: [
						precompile.vite({ conditions: ["ark-ts"], cwd: dir, ...options })
					],
					resolve: { conditions: ["ark-ts", ...defaultClientConditions] },
					build: {
						outDir: out,
						emptyOutDir: true,
						minify: true,
						target: "esnext",
						lib: {
							entry: join(dir, "main.ts"),
							formats: ["es" as const],
							fileName: () => "main.js"
						}
					}
				})
			} finally {
				if (NODE_ENV === undefined) delete process.env.NODE_ENV
				else process.env.NODE_ENV = NODE_ENV
			}
		} else {
			const lib = (host === "webpack" ? webpack : rspack) as typeof webpack
			const plugin = (
				host === "webpack" ?
					precompile.webpack({ cwd: dir, ...options })
				:	precompile.rspack({ cwd: dir, ...options })) as never
			const cacheDir = join(dir, ".cache-bundler")
			const compiler = lib({
				mode: "production",
				context: dir,
				entry: "./main.ts",
				target: "node",
				devtool: false,
				cache:
					host === "webpack" ?
						{ type: "filesystem", cacheDirectory: cacheDir }
					:	({
							type: "persistent",
							storage: { type: "filesystem", directory: cacheDir }
						} as never),
				output: { path: out, filename: "main.cjs" },
				resolve: { extensions: [".ts", ".js"] },
				module: {
					rules: [{ test: /\.ts$/, loader: fromHere("stripTypesLoader.ts") }]
				},
				plugins: [plugin]
			})
			const failed = await new Promise<string | undefined>(resolve =>
				compiler.run((error, stats) =>
					compiler.close(() =>
						resolve(
							error ? error.message
							: stats?.hasErrors() ? stats.toJson().errors![0].message
							: undefined
						)
					)
				)
			)
			if (failed) return { out: `refused ${failed.slice(0, 300)}` }
		}
	} catch (e) {
		return { out: refusal(e) }
	}
	const entry = readdirSync(out).find(file => /^main\.c?js$/.test(file))!
	return { out: run([join(out, entry)], dir), js: jsIn(out) }
}

type Via = "plugin" | "config"

const vias = (process.env.ARK_OPTIONS_CACHE_VIA?.split(",") ?? [
	"plugin",
	"config"
]) as Via[]

const builtOn = async (
	host: Host,
	dir: string,
	tag: string,
	set: Record<string, unknown>,
	warm: boolean,
	via: Via
): Promise<Built> => {
	writeFileSync(
		join(dir, "ark.json"),
		JSON.stringify(via === "config" ? { precompile: set } : {})
	)
	const options = via === "plugin" ? set : {}
	if (host === "node") {
		return {
			out: run(
				[
					"--conditions",
					"ark-ts",
					"--import",
					`data:text/javascript,import { register } from "${pathToFileURL(fromHere("..", "node.ts"))}"; register(${JSON.stringify({ conditions: ["ark-ts"], ...options })})`,
					"main.ts"
				],
				dir,
				{ NODE_ENV: "production" }
			)
		}
	}
	if (host === "next") {
		// with Turbopack's build cache on, as Next has it
		const built = buildOnNext(dir, tag, ["main"], options as never, { warm })
		return built.refused ?
				{ out: `refused ${built.refused.slice(0, 300)}` }
			:	{ out: run([built.runners.main], dir), js: built.js }
	}
	return bundled(host, dir, options)
}

let failures = 0
const distinctByHost: Record<
	string,
	{ outputs: Set<string>; bundles: Set<string> }
> = {}
for (const host of hosts) {
	for (const via of vias) {
		const warmDir = join(root, host, via, "warm")
		writeApp(warmDir)
		const cold: Record<string, Built> = {}
		for (const [i, name] of sequence.entries()) {
			const options = optionSets[name]
			const warm = await builtOn(
				host,
				warmDir,
				`optcache-${host}-${via}-warm`,
				options,
				i > 0,
				via
			)
			if (!cold[name]) {
				const coldDir = join(root, host, via, `cold-${name}`)
				writeApp(coldDir)
				cold[name] = await builtOn(
					host,
					coldDir,
					`optcache-${host}-${via}-cold-${name}`,
					options,
					false,
					via
				)
			}
			const distinct = (distinctByHost[host] ??= {
				outputs: new Set(),
				bundles: new Set()
			})
			distinct.outputs.add(cold[name].out)
			if (cold[name].js !== undefined) distinct.bundles.add(cold[name].js)
			// a refusal or a crash says nothing of the cache, so it fails the round
			const outputs =
				warm.out === cold[name].out && !/^(refused|exit) /.test(warm.out)
			// Next names its chunks by hashes of what it built where, so only their
			// length says what was written there
			const bytes =
				warm.js === undefined || cold[name].js === undefined ? "n/a"
				: host === "next" ?
					Math.abs(warm.js.length - cold[name].js.length) < 64 ?
						"same length"
					:	`differ by ${warm.js.length - cold[name].js.length}`
				: warm.js === cold[name].js ? "same"
				: "differ"
			const ok = outputs && !bytes.startsWith("differ")
			// which options' cold build a stale one wrote instead
			const like =
				ok || warm.js === undefined ?
					""
				:	Object.keys(cold)
						.filter(other =>
							host === "next" ?
								Math.abs(warm.js!.length - (cold[other].js?.length ?? 0)) < 64
							:	warm.js === cold[other].js
						)
						.join(" or ")
			if (!ok) failures++
			console.log(
				`${host} ${via} ${i}:${name}: ${ok ? "as cold" : "DIFFERS"} (output ${outputs ? "same" : "differs"}, bytes ${bytes}${like ? `, as cold ${like}` : ""})${
					outputs ? "" : (
						`\n  warm: ${warm.out.slice(0, 400)}\n  cold: ${cold[name].out.slice(0, 400)}`
					)
				}`
			)
		}
	}
}
console.log(`${failures} differing from cold`)
// a round says something only where the options change what's written
for (const [host, distinct] of Object.entries(distinctByHost)) {
	console.log(
		`${host}: ${distinct.outputs.size} outputs, ${distinct.bundles.size} bundles of ${Object.keys(optionSets).length} options cold`
	)
}
rmSync(root, { recursive: true, force: true })
if (hosts.includes("next")) removeNextApps()
process.exit(failures ? 1 : 0)
