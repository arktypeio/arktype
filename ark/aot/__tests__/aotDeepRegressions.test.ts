import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { precompile, type PrecompileUnpluginOptions } from "@ark/aot/unplugin"
import { build as esbuild } from "esbuild"
import { mkdirSync, symlinkSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import {
	createServer,
	defaultClientConditions,
	defaultServerConditions,
	normalizePath,
	type InlineConfig
} from "vite"
import { startVitest } from "vitest/node"
import { run, writeFixture } from "./utils.ts"

const conditions = ["ark-ts"]

const nodePaths = [fromHere("..", "node_modules")]

const withNodeEnv = async <t>(env: string, run: () => Promise<t>) => {
	const { NODE_ENV } = process.env
	process.env.NODE_ENV = env
	try {
		return await run()
	} finally {
		if (NODE_ENV === undefined) delete process.env.NODE_ENV
		else process.env.NODE_ENV = NODE_ENV
	}
}

const bundleEsbuild = async (
	root: string,
	entry: string,
	opts: PrecompileUnpluginOptions = {},
	esbuildOpts: Parameters<typeof esbuild>[0] = {}
): Promise<string> => {
	const resolvedConditions = esbuildOpts.conditions ?? conditions
	const { outputFiles } = await esbuild({
		entryPoints: [join(root, entry)],
		absWorkingDir: root,
		bundle: true,
		format: "esm",
		platform: "node",
		write: false,
		conditions: resolvedConditions,
		nodePaths,
		plugins: [
			precompile.esbuild({
				cwd: root,
				conditions: resolvedConditions,
				...opts
			})
		],
		...esbuildOpts
	})
	return outputFiles![0].text
}

const viteConfig = (
	opts: PrecompileUnpluginOptions,
	root: string
): InlineConfig => ({
	root,
	configFile: false,
	logLevel: "silent",
	plugins: [precompile.vite({ ...opts, conditions })],
	resolve: { conditions: [...conditions, ...defaultClientConditions] },
	ssr: {
		resolve: {
			conditions: [...conditions, ...defaultServerConditions],
			externalConditions: conditions
		}
	}
})

contextualize(function (this: Mocha.Suite) {
	this.timeout(60_000)

	it("D2 & D4: standalone errors support summaryIn() and errors: none sets expected: 'valid'", async () => {
		const detailedRoot = writeFixture({
			"package.json": `{"type":"module"}`,
			"main.ts": `import { type } from "arktype"
const T = type({ a: "string" })
const out = T({ a: 1 })
if (!(out instanceof type.errors)) throw new Error("expected errors")
let invalidLocaleError = ""
try {
	out.summaryIn("de" as never)
} catch (e) {
	invalidLocaleError = (e as Error).message
}
console.log(JSON.stringify({
	summary: out.summary,
	summaryIn: out.summaryIn(),
	summaryInUndefined: out.summaryIn(undefined),
	invalidLocaleError
}))
`
		})
		// Use built (published) runtime variants so all 4 standalone error classes
		// (issues, issuesLean, issuesNone, issuesNoneLean) are exercised directly
		for (const opts of [
			{ optimizeErrors: "speed" },
			{ optimize: "size", optimizeErrors: "size" }
		] as const) {
			const code = await bundleEsbuild(detailedRoot, "main.ts", opts, {
				conditions: []
			})
			attest(JSON.parse(run(code))).equals({
				summary: "a must be a string",
				summaryIn: "a must be a string",
				summaryInUndefined: "a must be a string",
				invalidLocaleError: "Expected a Locale object"
			})
		}

		const noneRoot = writeFixture({
			"package.json": `{"type":"module"}`,
			"config.ts": `import "arktype/errors"
import { configure } from "arktype/config"
configure({ errors: "none" })
`,
			"main.ts": `import "./config.ts"
import { type } from "arktype"
const T = type({ a: "string" })
const out = T({ a: 1 })
if (!(out instanceof type.errors)) throw new Error("expected errors")
const std = T["~standard"].validate({ a: 1 }) as { issues: readonly { expected?: unknown; message: string }[] }
console.log(JSON.stringify({
	summary: out.summary,
	summaryIn: out.summaryIn(),
	expected: out.issues[0].expected,
	message: out.issues[0].message,
	stdExpected: std.issues[0].expected,
	json: out.toJSON()
}))
`
		})
		for (const opts of [
			{ errors: "none", config: "./config.ts", optimizeErrors: "speed" },
			{ errors: "none", config: "./config.ts", optimizeErrors: "size" }
		] as const) {
			const code = await bundleEsbuild(noneRoot, "main.ts", opts, {
				conditions: []
			})
			attest(JSON.parse(run(code))).equals({
				summary: "is invalid",
				summaryIn: "is invalid",
				expected: "valid",
				message: "is invalid",
				stdExpected: "valid",
				json: [
					{
						code: "predicate",
						path: [],
						expected: "valid",
						message: "is invalid"
					}
				]
			})
		}
	})

	it("D3: precompiled type.instanceOf(UserClass).or('null') validates instances and null at runtime", async () => {
		const root = writeFixture({
			"package.json": `{"type":"module"}`,
			"main.ts": `import { type } from "arktype"
class Local { x = 1 }
export const A = type.instanceOf(Local).or("null")
const inst = new Local()
const badObj = A({})
const badNum = A(1)
console.log(JSON.stringify({
	instOk: A(inst) === inst,
	nullOk: A(null) === null,
	badObjSummary: badObj instanceof type.errors ? badObj.summary : "",
	badNumSummary: badNum instanceof type.errors ? badNum.summary : ""
}))
`
		})
		const code = await bundleEsbuild(root, "main.ts")
		attest(JSON.parse(run(code))).equals({
			instOk: true,
			nullOk: true,
			badObjSummary: "must be an instance of Local",
			badNumSummary: "must be an object or null"
		})
	})

	it("B1: precompiled default and named JSON imports validate cleanly at runtime", async () => {
		const root = writeFixture({
			"package.json": `{"type":"module"}`,
			"data.json": `{"values":["a","b"],"kind":"string"}`,
			"main.ts": `import { type } from "arktype"
import data from "./data.json" with { type: "json" }
import { kind, values } from "./data.json"
export const E = type.enumerated(...data.values)
export const K = type({ k: kind })
export const N = type.enumerated(...values)
console.log(JSON.stringify({
	eOk: E("a"),
	eBad: E("c") instanceof type.errors,
	kOk: K({ k: "hi" }),
	kBad: K({ k: 1 }) instanceof type.errors,
	nOk: N("b")
}))
`
		})
		const code = await bundleEsbuild(root, "main.ts")
		attest(JSON.parse(run(code))).equals({
			eOk: "a",
			eBad: true,
			kOk: { k: "hi" },
			kBad: true,
			nOk: "b"
		})
	})

	it("B2: Vite with hmr: false re-precompiles importers of a changed module", async () => {
		const limitSource = (n: number) => `export const L = ${n}\n`
		const root = writeFixture({
			"limit.ts": limitSource(5),
			"main.ts": `import { type } from "arktype"
import { L } from "./limit.ts"
export const N = type(\`number <= \${L}\`)
export const check = (v: number) => !(N(v) instanceof type.errors)
`
		})
		mkdirSync(join(root, "node_modules"))
		symlinkSync(
			fromHere("..", "..", "type"),
			join(root, "node_modules/arktype")
		)
		const config = viteConfig({}, root)
		const server = await withNodeEnv("development", () =>
			createServer({
				...config,
				server: { hmr: false },
				resolve: { ...config.resolve, preserveSymlinks: true },
				ssr: { resolve: { ...config.ssr!.resolve, externalConditions: [] } }
			})
		)
		try {
			const before = (await server.ssrLoadModule("/main.ts")).check(9)
			const file = join(root, "limit.ts")
			writeFileSync(file, limitSource(9))
			const limitMod = server.environments.ssr.moduleGraph.getModuleById(
				normalizePath(file)
			)!
			server.watcher.emit("change", file)
			for (let waited = 0; limitMod.transformResult; waited += 10) {
				if (waited > 10_000) throw new Error("limit.ts was never invalidated")
				await new Promise(resolve => setTimeout(resolve, 10))
			}
			const after = (await server.ssrLoadModule("/main.ts")).check(9)
			attest([before, after]).equals([false, true])
		} finally {
			await server.close()
		}
	})

	it("B2: Vitest watch re-precompiles importers of a changed Type", async () => {
		const shapeSource = (fieldType: string) =>
			`import { type } from "arktype"\nexport const Shape = type({ a: "${fieldType}" })\n`
		const root = writeFixture({
			"b.ts": shapeSource("string"),
			"main.ts": `import { type } from "arktype"
import { Shape } from "./b.ts"
export const U = type({ inner: Shape })
`,
			"main.test.ts": `import { expect, test } from "vitest"
import { type } from "arktype"
import { U } from "./main.ts"
test("validates", () => {
	const out = U({ inner: { a: 42 } })
	expect(out instanceof type.errors ? out.summary : "ok").toBe("ok")
})
`
		})
		mkdirSync(join(root, "node_modules"))
		symlinkSync(
			fromHere("..", "..", "type"),
			join(root, "node_modules/arktype")
		)
		const { NODE_ENV } = process.env
		const previousExitCode = process.exitCode
		process.env.NODE_ENV = "test"
		let runs = 0
		let resolveRerun: (() => void) | undefined
		const rerunDone = new Promise<void>(resolve => {
			resolveRerun = resolve
		})
		const vitest = await startVitest(
			[],
			{
				root,
				config: false,
				include: ["main.test.ts"],
				watch: true,
				reporters: [
					{
						onTestRunEnd() {
							runs++
							if (runs >= 2) resolveRerun?.()
						}
					}
				],
				testTimeout: 30_000
			},
			viteConfig({}, root)
		)
		try {
			// Initial run fails because Shape expects string, not 42
			const initialTask = vitest.state.getFiles()[0]?.tasks[0]
			attest(initialTask?.result?.state).equals("fail")
			attest(initialTask?.result?.errors?.[0]?.message).equals(
				"expected 'inner.a must be a string' to be 'ok' // Object.is equality"
			)
			const bFile = join(root, "b.ts")
			writeFileSync(bFile, shapeSource("number"))
			vitest.vite.watcher.emit("change", bFile)
			let timer: ReturnType<typeof setTimeout> | undefined
			try {
				await Promise.race([
					rerunDone,
					new Promise<never>((_, reject) => {
						timer = setTimeout(
							() => reject(new Error("Vitest watch rerun timed out")),
							20_000
						)
					})
				])
			} finally {
				clearTimeout(timer)
			}
			// After editing b.ts to expect number, main.ts re-precompiled cleanly and test passes
			const rerunTask = vitest.state.getFiles()[0]?.tasks[0]
			attest(rerunTask?.result?.state).equals("pass")
			attest(vitest.state.getCountOfFailedTests()).equals(0)
		} finally {
			await vitest.close()
			// Vitest watch attaches a stdin listener and sets process.exitCode on failures
			process.stdin.pause()
			process.stdin.unref()
			process.exitCode = previousExitCode
			if (NODE_ENV === undefined) delete process.env.NODE_ENV
			else process.env.NODE_ENV = NODE_ENV
		}
	})

	it("B3: esbuild plugin respects build.initialOptions.loader for JSX in .js", async () => {
		const root = writeFixture({
			"package.json": `{"type":"module"}`,
			"main.js": `import { type } from "arktype"
export const User = type({ name: "string" })
export const View = () => <div>{User.expression}</div>
`
		})
		for (const prune of [false, true]) {
			const code = await bundleEsbuild(
				root,
				"main.js",
				{ prune, members: { expression: true } },
				{
					loader: { ".js": "jsx" },
					jsx: "automatic",
					external: ["react/jsx-runtime"]
				}
			)
			attest(code.includes("{ name: string }")).equals(true)
		}
	})

	it("B4: esbuild plugin handles UTF-8 BOM in project and dependency package.json", async () => {
		const root = writeFixture({
			"package.json": `\uFEFF${JSON.stringify({
				name: "bom-bundle",
				type: "module",
				dependencies: { "bom-dep": "1.0.0", "bad-dep": "1.0.0" }
			})}`,
			"node_modules/bom-dep/package.json": `\uFEFF${JSON.stringify({
				name: "bom-dep",
				type: "module"
			})}`,
			"node_modules/bad-dep/package.json": `{not valid json`,
			"main.ts": `import { type } from "arktype"
const User = type({ name: "string" })
console.log(JSON.stringify(User({ name: "ada" })))
`
		})
		const originalWarn = console.warn
		const warnings: string[] = []
		console.warn = (...args: unknown[]) => warnings.push(args.join(" "))
		let code: string
		try {
			code = await bundleEsbuild(root, "main.ts")
		} finally {
			console.warn = originalWarn
		}
		attest(JSON.parse(run(code))).equals({ name: "ada" })
		attest(warnings.some(w => w.includes("bad-dep"))).equals(true)
	})
})
