import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import {
	precompile,
	standaloneConfigurationMessage,
	writeStandaloneDependencyMessage,
	type PrecompilePluginOptions
} from "@ark/precompile/unplugin"
import { build as esbuild } from "esbuild"
import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import {
	build as viteBuild,
	defaultClientConditions,
	defaultServerConditions,
	type InlineConfig,
	type Rolldown
} from "vite"
import { startVitest } from "vitest/node"

const app = fromHere("app")

// arktype's packages resolve to their source in this repo
const conditions = ["ark-ts"]

const viteConfig = (opts?: PrecompilePluginOptions): InlineConfig => ({
	root: app,
	configFile: false,
	logLevel: "silent",
	plugins: opts ? [precompile.vite({ ...opts, conditions })] : [],
	resolve: { conditions: [...conditions, ...defaultClientConditions] },
	ssr: {
		resolve: {
			conditions: [...conditions, ...defaultServerConditions],
			externalConditions: conditions
		}
	}
})

const bundlers = {
	vite: async (opts?: PrecompilePluginOptions) => {
		const [{ output }] = (await viteBuild({
			...viteConfig(opts),
			build: {
				write: false,
				minify: true,
				lib: { entry: "main.ts", formats: ["es"] }
			}
		})) as Rolldown.RolldownOutput[]
		return output[0].code
	},
	esbuild: async (opts?: PrecompilePluginOptions) => {
		const { outputFiles } = await esbuild({
			entryPoints: [fromHere("app", "main.ts")],
			bundle: true,
			write: false,
			format: "esm",
			minify: true,
			conditions,
			logLevel: "silent",
			plugins: opts ? [precompile.esbuild({ ...opts, conditions })] : []
		})
		return outputFiles[0].text
	}
}

const run = (js: string) =>
	spawnSync(process.execPath, ["--input-type=module"], {
		input: js,
		encoding: "utf8"
	}).stdout

const writeFixture = (files: Record<string, string>): string => {
	const root = realpathSync(mkdtempSync(join(tmpdir(), "ark-precompile-")))
	for (const path in files) {
		mkdirSync(dirname(join(root, path)), { recursive: true })
		writeFileSync(join(root, path), files[path])
	}
	return root
}

const fakePackage = (path: string, name: string, version: string) => ({
	[`${path}/package.json`]: JSON.stringify({
		name,
		version,
		type: "module",
		exports: {
			".": "./index.js",
			"./runtime": "./index.js",
			"./internal": "./index.js",
			"./*": "./*"
		}
	}),
	[`${path}/index.js`]:
		"export const type = () => {}\nexport const registerPrecompiledUnits = () => {}\n"
})

// a program whose packages import arktype, one of them from a copy of its own
const dependencies = writeFixture({
	...fakePackage("node_modules/arktype", "arktype", "2.2.0"),
	...fakePackage(
		"node_modules/arktype/node_modules/@ark/schema",
		"@ark/schema",
		"0.2.0"
	),
	...fakePackage("node_modules/@ark/schema", "@ark/schema", "0.1.0"),
	...fakePackage("node_modules/shared", "shared", "1.0.0"),
	"node_modules/shared/index.js":
		'import { type } from "arktype"\nexport const shared = typeof type\n',
	"node_modules/shared/other.js":
		'import { type } from "arktype"\nexport const other = typeof type\n',
	...fakePackage("node_modules/forked", "forked", "1.0.0"),
	...fakePackage(
		"node_modules/forked/node_modules/arktype",
		"arktype",
		"2.1.0"
	),
	"node_modules/forked/index.js":
		'import { type } from "arktype"\nexport const forked = typeof type\n',
	"shared.ts":
		'import { shared } from "shared"\nimport { other } from "shared/other.js"\nconsole.log(shared, other)\n',
	"forked.ts":
		'import { type } from "arktype"\nimport { forked } from "forked"\nexport const T = type("string")\nconsole.log(forked)\n',
	"schema.ts":
		'import "@ark/schema"\nimport { type } from "arktype"\nexport const T = type("string")\n'
})

const buildDependency = async (
	entry: string,
	opts: PrecompilePluginOptions = {}
) => {
	const result = await esbuild({
		entryPoints: [join(dependencies, entry)],
		absWorkingDir: dependencies,
		bundle: true,
		write: false,
		format: "esm",
		logLevel: "silent",
		plugins: [precompile.esbuild({ ...opts, cwd: dependencies })]
	}).catch((e: { errors: { text: string }[] }) => e)
	return [
		...result.errors.map(e => e.text),
		...("warnings" in result ? result.warnings.map(w => w.text) : [])
	].map(text => text.split(`${dependencies}/`).join(""))
}

// written while parsing a definition, which a standalone build never does
const parserMessage = "is unresolvable"

contextualize(() => {
	const expected = spawnSync(
		process.execPath,
		["--conditions", "ark-ts", fromHere("app", "main.ts")],
		{ encoding: "utf8" }
	).stdout

	it("runs without the plugin", () => {
		attest(JSON.parse(expected)).snap([
			{
				name: "Ada",
				email: "ada@example.com",
				age: 36,
				tags: ["math"],
				plan: "free"
			},
			'age must be an integer (was 36.5)\nemail must be an email address (was "ada")\nname must be non-empty\ntags must be at most length 3 (was 4)',
			'plan must be "free" or "pro" (was "team")\nrole must be "admin" or "member" (was "owner")',
			"value at [1].age must be non-negative (was -1)",
			{
				kind: "create",
				user: {
					name: "Ada",
					email: "ada@example.com",
					age: 36,
					tags: ["math"],
					plan: "free"
				}
			},
			{ kind: "delete", id: "c4a760a8-dbcf-4e14-9f39-645a8e933d74" },
			'id must be a UUID (was "1234")',
			'kind must be "delete" or "create" (was "update")'
		])
	})

	for (const [name, bundle] of Object.entries(bundlers)) {
		it(`${name} standalone`, async () => {
			const withArktype = await bundle()
			const standalone = await bundle({})
			attest(run(standalone)).equals(expected)
			attest([
				withArktype.includes(parserMessage),
				standalone.includes(parserMessage)
			]).equals([true, false])
		})

		it(`${name} cache`, async () => {
			attest(run(await bundle({ runtime: "arktype" }))).equals(expected)
		})
	}

	it("reads a module that defines a Type from an imported one", async () => {
		const message = await esbuild({
			entryPoints: [fromHere("app", "admin.ts")],
			bundle: true,
			write: false,
			logLevel: "silent",
			plugins: [precompile.esbuild({ cwd: app, conditions })]
		}).then(
			() => "",
			(e: Error) => e.message
		)
		attest(message.slice(message.indexOf("User.and")))
			.snap(`User.and({ role: "'admin'" }) can't be precompiled to a standalone validator yet
  \`User\` is imported from schemas.ts
  Standalone builds can't precompile every definition yet. Build with runtime: "arktype".`)
	})

	it("registers arktype's keyword table before arktype loads", async () => {
		// arktype and its keyword table resolve to files that print when they load
		const root = fromHere("keywordTable")
		const plugin = { runtime: "arktype" } as const
		const { outputFiles } = await esbuild({
			entryPoints: [fromHere("keywordTable", "main.ts")],
			bundle: true,
			write: false,
			format: "esm",
			logLevel: "silent",
			plugins: [precompile.esbuild(plugin)]
		})
		const [{ output }] = (await viteBuild({
			root,
			configFile: false,
			logLevel: "silent",
			plugins: [precompile.vite(plugin)],
			build: { write: false, lib: { entry: "main.ts", formats: ["es"] } }
		})) as Rolldown.RolldownOutput[]
		attest([run(outputFiles[0].text), run(output[0].code)]).snap([
			"config\nkeywords\narktype\nstring\n",
			"config\nkeywords\narktype\nstring\n"
		])
	})

	it("warns once for each dependency importing arktype in standalone mode", async () => {
		attest(await buildDependency("shared.ts")).equals([
			writeStandaloneDependencyMessage("shared")
		])
		attest(await buildDependency("shared.ts", { runtime: "arktype" })).equals(
			[]
		)
	})

	it("fails for a second copy of arktype", async () => {
		const vite = (runtime?: "arktype") =>
			viteBuild({
				root: dependencies,
				configFile: false,
				logLevel: "silent",
				plugins: [precompile.vite({ runtime, cwd: dependencies })],
				build: { write: false, lib: { entry: "forked.ts", formats: ["es"] } }
			}).then(
				() => "",
				(e: Error) => e.message
			)
		const report = `arktype resolves to more than one copy
  2.2.0 at node_modules/arktype, reached from forked.ts
  2.1.0 at node_modules/forked/node_modules/arktype, reached from node_modules/forked/index.js`
		for (const runtime of [undefined, "arktype"] as const) {
			const errors = await buildDependency("forked.ts", { runtime })
			attest(errors.some(text => text.includes(report))).equals(true)
			attest((await vite(runtime)).includes(report)).equals(true)
		}
	})

	it("fails for a second copy of a package arktype runs on", async () => {
		attest(
			(await buildDependency("schema.ts")).filter(text =>
				text.includes("more than one copy")
			)
		).snap([
			"schema.ts:2:22  @ark/schema resolves to more than one copy\n  0.1.0 at node_modules/@ark/schema, reached from schema.ts\n  0.2.0 at node_modules/arktype/node_modules/@ark/schema, reached from node_modules/arktype/index.js\n  Types and errors from one copy aren't recognized by another. Install one version of each, e.g. with your package manager's dedupe or overrides."
		])
	})

	it("reports what the standalone runtime's frozen values reject", async () => {
		const root = writeFixture({
			"write.ts":
				'import { type } from "arktype"\nexport const T = type("string")\n;(T as any).note = 1\n',
			"sloppy.cts":
				'import { type } from "arktype"\nexport const T = type("string")\n'
		})
		const errorsOf = (entry: string) =>
			esbuild({
				entryPoints: [join(root, entry)],
				bundle: true,
				write: false,
				logLevel: "silent",
				plugins: [precompile.esbuild({ cwd: root, conditions })]
			}).then(
				() => [],
				(e: { errors: { text: string }[] }) =>
					e.errors.map(error => error.text.split(`${root}/`).join(""))
			)
		attest([await errorsOf("write.ts"), await errorsOf("sloppy.cts")]).snap([
			[
				'write.ts:3:2  (T as any).note = 1 writes to an arktype value, which throws at runtime\n  `T` is an arktype value, which the standalone runtime freezes with what it holds\n  Keep what you attach in an object of your own, or build with runtime: "arktype".'
			],
			[
				'sloppy.cts:1:1  sloppy.cts is not strict mode code\n  the standalone runtime freezes arktype values, and outside strict mode a write to a frozen value is ignored rather than throwing\n  Add "use strict" at the top of the module, or make it an ES module.'
			]
		])
	})

	it("configure in standalone mode", () => {
		attest(() => precompile.vite({ config: "config.ts" })).throws(
			standaloneConfigurationMessage
		)
	})

	it("vitest", async () => {
		for (const runtime of [undefined, "arktype"] as const) {
			const vitest = await startVitest(
				[],
				{
					root: app,
					config: false,
					watch: false,
					reporters: [],
					env: { ARKTYPE_RUNTIME: runtime ?? "" }
				},
				viteConfig({ runtime })
			)
			await vitest.close()
			attest(vitest.state.getCountOfFailedTests()).equals(0)
		}
	}).timeout(60000)
})
