import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import {
	precompile,
	standaloneConfigurationMessage,
	type PrecompilePluginOptions
} from "@ark/precompile/unplugin"
import { build as esbuild } from "esbuild"
import { spawnSync } from "node:child_process"
import {
	build as vite,
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
		const [{ output }] = (await vite({
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
		const [{ output }] = (await vite({
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
