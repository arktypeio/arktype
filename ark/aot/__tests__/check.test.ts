import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { check } from "@ark/aot/internal/check.ts"
import { spawnSync } from "node:child_process"
import { runCli, writeFixture } from "./utils.ts"

const cwd = fromHere("checked")

contextualize(() => {
	it("fails a site that throws a ParseError", () => {
		const root = writeFixture({
			"main.ts": `import { type } from "arktype"\nexport const A = type("string & number")\nexport const B = type("string")\n`
		})
		attest(check([], { cwd: root }).lines).snap([
			'main.ts:2:18  type("string & number") throws a ParseError\n  Intersection of string and number results in an unsatisfiable type\n  Fix the definition, or it throws the same ParseError at runtime. Set allowUnsafe: true to build anyway, with a warning.',
			"main.ts:3:18  accepted",
			"2 sites in 1 file: 1 accepted (50.0%)"
		])
		attest(check([], { cwd: root, allowUnsafe: true }).lines).snap([
			'main.ts:2:18  type("string & number") throws a ParseError\n  Intersection of string and number results in an unsatisfiable type\n  Fix the definition, or it throws the same ParseError at runtime.',
			"main.ts:2:18  accepted",
			"main.ts:3:18  accepted",
			"2 sites in 1 file: 2 accepted (100.0%)"
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
			'main.ts:6:18  type("string").narrow(() => lenient) can\'t be precompiled yet\n  arktype calls `() => lenient` (main.ts:6:40)\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
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
				'config.ts:4:1  arktype is configured with errors: "first", where the build\'s errors are "all"\n  Build with errors: "first" too, as a standalone validator returns what arktype does as the program configures it.',
				"main.ts:4:21  accepted",
				'scoped.ts:5:18  scope({ U: { b: "number" } }, { errors: "none" }) can\'t be precompiled yet\n  arktype is configured with errors: "none", where the build\'s errors are "all"\n  A standalone validator returns what arktype does as the program configures it. Build with the errors arktype is configured with.',
				"2 sites in 3 files: 1 accepted (50.0%), 1 error outside a site"
			],
			[
				"main.ts:4:21  accepted",
				'scoped.ts:5:18  scope({ U: { b: "number" } }, { errors: "none" }) can\'t be precompiled yet\n  arktype is configured with errors: "none", where the build\'s errors are "first"\n  A standalone validator returns what arktype does as the program configures it. Build with the errors arktype is configured with.',
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
				"config.ts:4:1  arktype is configured with mutatesInput: true, where the build's mutatesInput is false\n  Build with mutatesInput: true too, as a standalone validator returns what arktype does as the program configures it.",
				"main.ts:4:21  accepted",
				'scoped.ts:5:18  scope({ U: { b: "string.trim" } }, { mutatesInput: "always"… can\'t be precompiled yet\n  arktype is configured with mutatesInput: "always", where the build\'s mutatesInput is false\n  A standalone validator returns what arktype does as the program configures it. Build with the mutatesInput arktype is configured with.',
				"2 sites in 3 files: 1 accepted (50.0%), 1 error outside a site"
			],
			[
				"main.ts:4:21  accepted",
				'scoped.ts:5:18  scope({ U: { b: "string.trim" } }, { mutatesInput: "always"… can\'t be precompiled yet\n  arktype is configured with mutatesInput: "always", where the build\'s mutatesInput is true\n  A standalone validator returns what arktype does as the program configures it. Build with the mutatesInput arktype is configured with.',
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
forms.ts:10:16  type(\`string <= \${limit}\`) cannot be precompiled
  \`limit\` is a parameter of makeField (forms.ts:9:27); its value is known only at runtime
  With runtime: "arktype", arktype defines this at runtime.
forms.ts:16:16  type(\`string <= \${limit}\`) cannot be precompiled
  \`limit\` is a parameter of makeRuntimeField (forms.ts:14:34); its value is known only at runtime
  With runtime: "arktype", arktype defines this at runtime.
3 sites in 1 file: 1 accepted (33.3%)
`)
	})

	it("fails on an error outside every site", () => {
		const dir = fromHere("unconfigured")
		attest(check([], { cwd: dir }).lines).snap([
			'config.ts:3:1  configure() is called, but the build has no `config` module\n  Name this module as the build\'s config: { config: "config.ts" }',
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
			'forms.ts:16:2  a runtime island returns arktype\'s errors, which aren\'t instances of type.errors under errors: "none"\n  a build whose errors say only that data is invalid gives its validators a runtime of their own\n  Precompile the definition, or build without errors: "none".',
			'forms.ts:16:2  a runtime island returns arktype\'s errors, which aren\'t instances of type.errors under optimizeErrors: "size"\n  a build writing its errors for size gives its validators a runtime of their own\n  Precompile the definition, or build with optimizeErrors: "speed".'
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
			"1 the config module missing.ts can't be read",
			'2 creationChecks must be "helpers", "none" or "types" (was "bogus")',
			'2 creationChecks chooses what a standalone build writes, which runtime: "arktype" doesn\'t'
		])
	})
})
