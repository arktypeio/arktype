import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { check } from "@ark/aot/internal/check.ts"
import { spawnSync } from "node:child_process"
import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { runCli, tempDir, writeFixture } from "./utils.ts"

const cwd = fromHere("checked")

contextualize(function (this: Mocha.Suite) {
	// most tests run the CLI, a fresh process that loads arktype and the precompiler
	this.timeout(60_000)

	it("fails a site that throws a ParseError", () => {
		const root = writeFixture({
			"main.ts": `import { type } from "arktype"\nexport const A = type("string & number")\nexport const B = type("string")\n`
		})
		attest(check([], { cwd: root }).lines).snap([
			'main.ts:2:18  type("string & number") throws a ParseError\n  Intersection of string and number results in an unsatisfiable type\n  Fix the definition, which throws the same ParseError at runtime, or set allowUnsafe: true to build anyway, with a warning.',
			"main.ts:3:18  accepted",
			"2 sites in 1 file: 1 accepted (50.0%)"
		])
		attest(check([], { cwd: root, allowUnsafe: true }).lines).snap([
			'main.ts:2:18  type("string & number") throws a ParseError\n  Intersection of string and number results in an unsatisfiable type\n  Fix the definition, which throws the same ParseError at runtime.',
			"main.ts:2:18  accepted",
			"main.ts:3:18  accepted",
			"2 sites in 1 file: 2 accepted (100.0%)"
		])
	})

	it("checks a fixture as its own project under a directory reading options", () => {
		// as a temp dir holding a package.json and a config calling the plugin
		const parent = writeFixture({
			"package.json": `{ "dependencies": { "puppeteer": "1" } }`,
			"base.ts": `import { precompile } from "@ark/aot/unplugin"\nexport const configOf = opts => ({ plugins: [precompile.vite({ ...opts })] })\n`
		})
		const root = writeFixture(
			{
				"main.ts": `import { type } from "arktype"\nexport const A = type("string")\n`
			},
			tempDir("ark-precompile-", parent)
		)
		attest(check([], { cwd: root }).lines).snap([
			"main.ts:2:18  accepted",
			"1 site in 1 file: 1 accepted (100.0%)"
		])
	})

	it("reads a module whose only arktype import is arktype/codecs", () => {
		const root = writeFixture({
			"main.ts": `import { codec } from "arktype/codecs"\nexport const EpochMs = codec("number.integer", "Date", {\n\tdecode: n => new Date(n),\n\tencode: d => d.getTime()\n})\n`
		})
		attest(check([], { cwd: root }).lines).snap([
			"main.ts:2:24  accepted",
			"1 site in 1 file: 1 accepted (100.0%)"
		])
	})

	it("skips what a build wrote, at any depth", () => {
		const site = `import { type } from "arktype"\nexport const A = type("string")\n`
		const root = writeFixture({
			"main.ts": site,
			"dist/main.js": site,
			"out/main.js": site,
			"build/nested/main.js": site,
			"src/build/main.ts": site
		})
		attest(check([], { cwd: root }).lines).snap([
			"main.ts:2:18  accepted",
			"1 site in 1 file: 1 accepted (100.0%)"
		])
	})

	it("resolves past a tsconfig it cannot load", () => {
		attest(check([], { cwd: fromHere("unloadableTsconfig") }).lines).snap([
			"site.ts:4:21  accepted",
			"1 site in 2 files: 1 accepted (100.0%)"
		])
	})

	it("reports refusals while writing a site", () => {
		attest(
			check([], {
				cwd: fromHere("calledHoles"),
				config: "config.ts"
			}).lines
		).snap([
			"main.ts:6:18  type(\"string\").narrow(() => lenient) can't be precompiled yet\n  arktype calls `() => lenient` (main.ts:6:40)\n  Standalone builds can't precompile every definition yet. Put // @ark-runtime on the line before it, so arktype defines it at runtime.",
			"main.ts:8:29  accepted",
			"2 sites in 2 files: 1 accepted (50.0%)"
		])
	})

	it("refuses text a standalone validator can't write", () => {
		attest(
			check([], { cwd: fromHere("unwritten"), config: "config.ts" }).lines
		).snap([
			'main.ts:5:23  scope( { T: "string" }, { domain: { message: "no" } } ).exp… can\'t be precompiled yet\n  a scope\'s configured domain message can\'t be precompiled to a standalone validator\n  A standalone validator writes text configured for a code only from configure(). Configure it there, or on each Type with .configure(), or build with runtime: "arktype".',
			'main.ts:9:25  type("string").narrow(isLong) can\'t be precompiled yet\n  a configured predicate message that a narrow or morph raises can\'t be precompiled to a standalone validator\n  A standalone validator writes what a narrow or morph raises from what it passes to ctx.reject(). Pass the text there, or build with runtime: "arktype".',
			"main.ts:10:22  type(\"string | number\").configure({ message: ctx => `${ctx.… can't be precompiled yet\n  `number | string`'s message writer, which reads each branch's errors can't be precompiled to a standalone validator\n  A standalone validator keeps no union branch's errors. Configure the text as a string, or build with runtime: \"arktype\".",
			"3 sites in 2 files: 0 accepted (0.0%)"
		])
	})

	it("rejects configured errors other than the build's", () => {
		attest(
			([undefined, "first"] as const).map(
				errors =>
					check([], {
						cwd: fromHere("firstConfigured"),
						config: "config.ts",
						errors
					}).lines
			)
		).snap([
			[
				'config.ts:4:1  arktype is configured with errors: "first", where the build\'s errors are "all"\n  Build with the errors arktype is configured with, in ark.json: { "precompile": { "errors": "first" } }',
				"main.ts:4:21  accepted",
				'scoped.ts:5:18  scope({ U: { b: "number" } }, { errors: "none" }) can\'t be precompiled yet\n  arktype is configured with errors: "none", where the build\'s errors are "all"\n  Build with the errors arktype is configured with, in ark.json: { "precompile": { "errors": "none" } }, or leave errors out of the Scope\'s configuration.',
				"2 sites in 3 files: 1 accepted (50.0%), 1 error outside a site"
			],
			[
				"main.ts:4:21  accepted",
				'scoped.ts:5:18  scope({ U: { b: "number" } }, { errors: "none" }) can\'t be precompiled yet\n  arktype is configured with errors: "none", where the build\'s errors are "first"\n  Build with the errors arktype is configured with, in ark.json: { "precompile": { "errors": "none" } }, or leave errors out of the Scope\'s configuration.',
				"2 sites in 3 files: 1 accepted (50.0%)"
			]
		])
	})

	it("requires the import arktype requires for a configured errors", () => {
		attest(
			check([], {
				cwd: fromHere("unimported"),
				config: "config.ts",
				errors: "first"
			}).lines
		).snap([
			'config.ts:3:1  errors: "first" requires import "arktype/errors"\n  Import "arktype/errors" in the config module, as arktype throws creating a Type without it.',
			"main.ts:4:18  accepted",
			"1 site in 2 files: 1 accepted (100.0%), 1 error outside a site"
		])
	})

	it("rejects other configured mutatesInput", () => {
		attest(
			([undefined, true] as const).map(
				mutatesInput =>
					check([], {
						cwd: fromHere("mutatingConfigured"),
						config: "config.ts",
						mutatesInput
					}).lines
			)
		).snap([
			[
				'config.ts:4:1  arktype is configured with mutatesInput: true, where the build\'s mutatesInput is false\n  Build with the mutatesInput arktype is configured with, in ark.json: { "precompile": { "mutatesInput": true } }',
				"main.ts:4:21  accepted",
				'scoped.ts:5:18  scope({ U: { b: "string.trim" } }, { mutatesInput: "always"… can\'t be precompiled yet\n  arktype is configured with mutatesInput: "always", where the build\'s mutatesInput is false\n  Build with the mutatesInput arktype is configured with, in ark.json: { "precompile": { "mutatesInput": "always" } }, or leave mutatesInput out of the Scope\'s configuration.',
				"2 sites in 3 files: 1 accepted (50.0%), 1 error outside a site"
			],
			[
				"main.ts:4:21  accepted",
				'scoped.ts:5:18  scope({ U: { b: "string.trim" } }, { mutatesInput: "always"… can\'t be precompiled yet\n  arktype is configured with mutatesInput: "always", where the build\'s mutatesInput is true\n  Build with the mutatesInput arktype is configured with, in ark.json: { "precompile": { "mutatesInput": "always" } }, or leave mutatesInput out of the Scope\'s configuration.',
				"2 sites in 3 files: 1 accepted (50.0%)"
			]
		])
	})

	it("refuses a Node too old for it", () => {
		const { status, stderr } = spawnSync(
			process.execPath,
			[
				"--conditions",
				"ark-ts",
				"--import",
				'data:text/javascript,Object.defineProperty(process.versions, "node", { value: "22.11.0" })',
				fromHere("..", "cli.ts"),
				"--check"
			],
			{ cwd, encoding: "utf8" }
		)
		attest([status, stderr]).equals([
			1,
			"arktype-precompile needs Node 22.12 or later (this is 22.11.0)\n"
		])
	})

	it("fails where a build would, or under a rate", () => {
		attest(runCli(cwd, "--check").status).equals(1)
		attest(runCli(cwd, "--check", "--fail-under", "50").status).equals(0)
		attest(runCli(cwd, "--check", "--fail-under", "60").status).equals(1)
		const cached = runCli(cwd, "--check", "--runtime", "arktype", "forms.ts")
		// a build with runtime: "arktype" only warns
		attest(cached.status).equals(0)
		attest(cached.stdout).snap(`forms.ts:4:21  accepted
forms.ts:11:16  type(\`string <= \${limit}\`) cannot be precompiled
  \`limit\` is a parameter of makeField (forms.ts:9:27); its value is known only at runtime
  With runtime: "arktype", arktype defines this at runtime.
forms.ts:17:16  type(\`string <= \${limit}\`) cannot be precompiled
  \`limit\` is a parameter of makeRuntimeField (forms.ts:15:34); its value is known only at runtime
  With runtime: "arktype", arktype defines this at runtime.
3 sites in 1 file: 1 accepted (33.3%)
`)
	})

	it("warns as a production bundle would where it can't prune", () => {
		const root = writeFixture({
			"types.ts": `import { type } from "arktype"\nexport const User = type({ name: "string" })\n`,
			"main.ts": `import { User } from "./types.ts"\nconst pages = import.meta.glob("./pages/*.ts")\nUser({})\n`,
			"types.test.ts": `import { User } from "./types.ts"\nconsole.log(User)\n`
		})
		const { NODE_ENV } = process.env
		process.env.NODE_ENV = "production"
		try {
			attest(check([], { cwd: root }).lines).snap([
				"types.ts:2:21  accepted",
				"prune: off, because main.ts:2:15 reads import.meta.glob, which may load modules it can't name, so the build keeps every member of its validators. Set prune: false to build them whole without this warning.",
				"1 site in 3 files: 1 accepted (100.0%)"
			])
			// a test isn't in the bundle
			writeFileSync(
				join(root, "main.ts"),
				`import { User } from "./types.ts"\nUser({})\n`
			)
			attest(check([], { cwd: root }).lines).snap([
				"types.ts:2:21  accepted",
				"1 site in 3 files: 1 accepted (100.0%)"
			])
		} finally {
			if (NODE_ENV === undefined) delete process.env.NODE_ENV
			else process.env.NODE_ENV = NODE_ENV
		}
	})

	it("names the components only the build checks", () => {
		const root = writeFixture({
			"src/types.ts": `import { type } from "arktype"\nexport const User = type({ name: "string" })\n`,
			"src/Form.svelte": `<script>\n\timport { User } from "./types.ts"\n</script>\n\n<p>{User({}) instanceof Error}</p>\n`,
			"src/Page.vue": `<script setup>\nimport Form from "./Form.vue"\n</script>\n`,
			"src/Static.astro": `<p>no imports</p>\n`
		})
		attest(check(["src/**/*.ts"], { cwd: root }).lines).snap([
			"src/types.ts:2:21  accepted",
			"src/Form.svelte and 1 other component aren't checked here, as the build checks a component once its framework compiles it",
			"1 site in 1 file: 1 accepted (100.0%)"
		])
		attest(
			check([], { cwd: root, runtime: "arktype" }).lines.some(line =>
				line.includes("component")
			)
		).equals(false)
	})

	it("fails on an error outside every site", () => {
		const dir = fromHere("unconfigured")
		attest(check([], { cwd: dir }).lines).snap([
			'config.ts:3:1  configure() is called, but the build has no `config` module\n  Name this module as the build\'s config in ark.json: { "precompile": { "config": "./config.ts" } }',
			"main.ts:4:21  accepted",
			'main.ts:6:21  JSON.stringify(User) reads toJSON, which a standalone validator lacks\n  `User` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".',
			"1 site in 2 files: 1 accepted (100.0%), 2 errors outside a site"
		])
		attest(runCli(dir, "--check", "--fail-under", "0").status).equals(1)
	})

	it("runtime islands under --errors none or --optimize-errors size", () => {
		attest(
			[
				["--errors", "none"],
				["--optimize-errors", "size"]
			].flatMap(args =>
				runCli(cwd, "--check", ...args)
					.stdout.split(/\n(?! )/)
					.filter(line => line.includes("runtime island returns"))
			)
		).snap([
			'forms.ts:17:2  a runtime island returns arktype\'s errors, which aren\'t instances of type.errors under errors: "none"\n  a build whose errors say only that data is invalid gives its validators a runtime of their own\n  Precompile the definition, or build without errors: "none".',
			'forms.ts:17:2  a runtime island returns arktype\'s errors, which aren\'t instances of type.errors under optimizeErrors: "size"\n  a build writing its errors for size gives its validators a runtime of their own\n  Precompile the definition, or build with optimizeErrors: "speed".'
		])
	})

	it("reads a directory a pattern matches as the scripts it holds", () => {
		const root = writeFixture({
			"package.json": "{}",
			"src/main.ts": `import { type } from "arktype"\n\nexport const User = type({ name: "string" })\n`,
			"src/forms/login.ts": `import { type } from "arktype"\n\nexport const Login = type({ email: "string.email" })\n`,
			"src/styles.css": "body {}\n",
			"src/types.d.ts": "export {}\n"
		})
		const expected = [
			"src/forms/login.ts:3:22  accepted",
			"src/main.ts:3:21  accepted",
			"2 sites in 2 files: 2 accepted (100.0%)"
		]
		attest(check(["src/**"], { cwd: root }).lines).equals(expected)
		attest(check(["src"], { cwd: root }).lines).equals(expected)
		attest(check(["src", "src/**/*.ts"], { cwd: root }).lines).equals(expected)
	})

	it("reads the options a plugin call passes", () => {
		const root = writeFixture({
			"package.json": "{}",
			"vite.config.ts": `import { precompile } from "@ark/aot/unplugin"\nimport { defineConfig } from "vite"\n\nexport default defineConfig({\n\tplugins: [precompile.vite({ config: "src/config.ts", include: /src/ })]\n})\n`,
			"src/config.ts": `import { configure } from "arktype/config"\n\nconfigure({ onUndeclaredKey: "delete" })\n`,
			"src/main.ts": `import "./config.ts"\nimport { type } from "arktype"\n\nexport const User = type({ name: "string" })\n`
		})
		attest(check(["src/**/*.ts"], { cwd: root }).lines).snap([
			"vite.config.ts:5:12  precompile.vite() sets config, so --check does too",
			"src/main.ts:4:21  accepted",
			"1 site in 2 files: 1 accepted (100.0%)"
		])
	})

	it("fails where a plugin call's options can't be read", () => {
		const root = writeFixture({
			"package.json": "{}",
			"build.ts": `import { precompile } from "@ark/aot/unplugin"\nimport { build } from "esbuild"\n\nconst config = "config.ts"\nawait build({ plugins: [precompile.esbuild({ config, errors: "first" })] })\n`,
			"vitest.config.ts": `import { precompile } from "@ark/aot/unplugin"\n\nexport default { plugins: [precompile.vite({ errors: "all" })] }\n`,
			"config.ts": `import "arktype/errors"\nimport { configure } from "arktype/config"\n\nconfigure({ errors: "first" })\n`
		})
		const result = runCli(root, "--check", "config.ts")
		attest(`${result.status} ${result.stderr}`).snap(
			'1 build.ts:5:25  --check can\'t read the `config` precompile.esbuild() is passed, so it can\'t check what the build does\n  Set config in ark.json (or package.json\'s "ark" key), as { "precompile": { "config": ... } }, which precompile.esbuild() reads too, or pass it to --check as --config.\n'
		)
		attest(() =>
			check(["config.ts"], { cwd: root, config: "config.ts" })
		).throws.snap(
			"Error: vitest.config.ts:3:28  precompile.vite() sets errors other than precompile.esbuild() at build.ts:5:25, so --check can't tell which build to check\n  Pass the one to check as --errors, or set it once in ark.json (or package.json's \"ark\" key)."
		)
		attest(
			check(["config.ts"], { cwd: root, config: "config.ts", errors: "first" })
				.lines
		).snap(["0 sites in 1 file: 0 accepted (100.0%)"])
	})

	it("checks a build whose prune it can't read, as Nuxt's documented config sets it", () => {
		const root = writeFixture({
			"package.json": "{}",
			"nuxt.config.ts": `import { precompile } from "@ark/aot/unplugin"\n\nexport default defineNuxtConfig({\n\tnitro: {\n\t\trollupConfig: {\n\t\t\tplugins: [precompile.rollup({ prune: process.env.NODE_ENV === "production" })]\n\t\t}\n\t}\n})\n`,
			"main.ts": `import { type } from "arktype"\n\nexport const User = type({ name: "string" })\n`
		})
		attest(check(["main.ts"], { cwd: root }).lines).snap([
			"main.ts:3:21  accepted",
			"1 site in 1 file: 1 accepted (100.0%)"
		])
	})

	it("reports the config load order a plugin call's config fails", () => {
		const root = writeFixture({
			"package.json": "{}",
			"vite.config.ts": `import { precompile } from "@ark/aot/unplugin"\n\nexport default { plugins: [precompile.vite({ config: "src/config.ts" })] }\n`,
			"src/config.ts": `import { configure } from "arktype/config"\n\nconfigure({ onUndeclaredKey: "delete" })\n`,
			"src/schemas.ts": `import { type } from "arktype"\n\nexport const User = type({ name: "string" })\n`,
			"src/main.ts": `import { User } from "./schemas.ts"\nimport "./config.ts"\n\nconsole.log(User({ name: "a", extra: 1 }))\n`
		})
		attest(check(["src/**/*.ts"], { cwd: root }).lines).snap([
			"vite.config.ts:3:28  precompile.vite() sets config, so --check does too",
			'src/main.ts:1:1  import { User } from "./schemas.ts" loads src/schemas.ts, which creates a Type, before the config module src/config.ts runs configure()\n  unless the program loaded src/config.ts earlier, creating the Type throws\n  Import src/config.ts first, before any module that creates a Type, or set allowUnsafe: true to build anyway, with a warning.',
			"src/schemas.ts:3:21  accepted",
			"1 site in 3 files: 1 accepted (100.0%), 1 error outside a site"
		])
	})

	it("reads a plugin or loader required, namespaced or imported by import()", () => {
		const linesOf = (file: string, source: string) => {
			const root = writeFixture({
				"package.json": "{}",
				[file]: source,
				"config.ts": `import "arktype/errors"\nimport { configure } from "arktype/config"\n\nconfigure({ errors: "first" })\n`
			})
			try {
				return check(["config.ts"], { cwd: root }).lines[0]
			} catch (e) {
				return String(e)
			}
		}
		const options = `{ config: "config.ts", errors: "first" }`
		attest([
			linesOf(
				"webpack.config.cjs",
				`const { precompile } = require("@ark/aot/unplugin")\n\nmodule.exports = { plugins: [precompile.webpack(${options})] }\n`
			),
			linesOf(
				"next.config.js",
				`const aot = require("@ark/aot/unplugin")\n\nmodule.exports = { webpack: config => [aot.precompile.webpack(${options})] }\n`
			),
			linesOf(
				"vite.config.ts",
				`import * as aot from "@ark/aot/unplugin"\n\nexport default { plugins: [aot.precompile.vite(${options})] }\n`
			),
			linesOf(
				"vite.config.ts",
				`export default async () => {\n\tconst { precompile } = await import("@ark/aot/unplugin")\n\treturn { plugins: [precompile.vite(${options})] }\n}\n`
			),
			linesOf(
				"next.config.js",
				`module.exports = {\n\tturbopack: { rules: { "*.ts": { loaders: [{ loader: require.resolve("@ark/aot/turbopack"), options: ${options} }] } } }\n}\n`
			),
			// a call it can't follow stops it rather than checking another build
			linesOf(
				"vite.config.ts",
				`import { precompile } from "@ark/aot/unplugin"\n\nconst plugins = [precompile.vite]\n\nexport default { plugins: [plugins[0](${options})] }\n`
			)
		]).snap([
			"webpack.config.cjs:3:30  precompile.webpack() sets config, errors, so --check does too",
			"next.config.js:3:40  aot.precompile.webpack() sets config, errors, so --check does too",
			"vite.config.ts:3:28  aot.precompile.vite() sets config, errors, so --check does too",
			"vite.config.ts:3:21  precompile.vite() sets config, errors, so --check does too",
			"next.config.js:2:44  the @ark/aot/turbopack loader sets config, errors, so --check does too",
			'Error: vite.config.ts:1:1  --check can\'t read the options the plugin is passed, so it can\'t check what the build does\n  Set the options in ark.json (or package.json\'s "ark" key), as { "precompile": { ... } }, which the plugin reads too, or pass each to --check as a flag.'
		])
	})

	it("rejects invalid arguments", () => {
		attest(
			[
				["--runtime", "strict"],
				["--fail-under", "most"],
				["--members", "assert"],
				["--mutates-input", "yes"],
				["--config", "missing.ts"],
				["--creation-checks", "bogus"],
				["--runtime", "arktype", "--creation-checks", "types"]
			].map(args => {
				const result = runCli(cwd, "--check", ...args)
				return `${result.status} ${result.stderr.split("\n")[0]}`
			})
		).snap([
			'2 runtime must be "arktype" (was "strict")',
			"2 --fail-under must be a percentage (was most)",
			"2 --members must be JSON (was assert)",
			'2 mutatesInput must be "always", false or true (was "yes")',
			"1 the config module missing.ts can't be read. Name a module that exists as the build's config.",
			'2 creationChecks must be "helpers", "none" or "types" (was "bogus")',
			'2 creationChecks chooses what a standalone build writes, which runtime: "arktype" doesn\'t. Remove runtime: "arktype" to precompile, or remove creationChecks.'
		])
	})
})
