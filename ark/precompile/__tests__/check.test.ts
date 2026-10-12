import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { check } from "@ark/precompile/internal/check.ts"
import { spawnSync } from "node:child_process"

const cwd = fromHere("checked")

const cliIn = (dir: string, ...args: string[]) =>
	spawnSync(
		process.execPath,
		["--conditions", "ark-ts", fromHere("..", "cli.ts"), ...args],
		{ cwd: dir, encoding: "utf8" }
	)

const cli = (...args: string[]) => cliIn(cwd, ...args)

contextualize(() => {
	it("lists sites", () => {
		attest(check([], { cwd }).lines).snap([
			"forms.ts:4:21  accepted",
			'forms.ts:10:16  type(`string <= ${limit}`) cannot be precompiled\n  `limit` is a parameter of makeField (forms.ts:9:27); its value is known only at runtime\n  Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".',
			"forms.ts:16:16  island",
			"3 sites in 2 files: 1 accepted (50.0%), 1 runtime island"
		])
	})

	it("resolves past a tsconfig it cannot load", () => {
		attest(check([], { cwd: fromHere("unloadableTsconfig") }).lines).snap([
			"site.ts:4:21  accepted",
			"1 site in 2 files: 1 accepted (100.0%)"
		])
	})

	it("applies the configuration", () => {
		attest(
			check([], { cwd: fromHere("writers"), config: "config.ts" }).lines
		).snap([
			'main.ts:6:21  type("string").narrow(isLong) can\'t be precompiled yet\n  `node.expression` (config.ts:5:38) prints the name of `isLong` (main.ts:4:16), which the build knows only by a placeholder\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
			'main.ts:8:29  Long.description reads description, which a standalone validator lacks\n  `Long` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".',
			"1 site in 2 files: 0 accepted (0.0%), 1 error outside a site"
		])
	})

	it("reports what the build refuses while writing a site", () => {
		attest(
			check([], {
				cwd: fromHere("calledHoles"),
				config: "config.ts",
				define: { "process.env.MODE": "lenient" }
			}).lines
		).snap([
			'main.ts:6:18  type("string").narrow(() => lenient) can\'t be precompiled yet\n  arktype calls `() => lenient` (main.ts:6:40)\n  Standalone builds can\'t precompile every definition yet. Build with runtime: "arktype".',
			"main.ts:8:29  accepted",
			"2 sites in 2 files: 1 accepted (50.0%)"
		])
	})

	it("rejects each site the build refuses while the config module loads or as a writer throws", () => {
		attest(
			check([], { cwd: fromHere("refused"), config: "config.ts" }).lines
		).snap([
			'config.ts:3:21  type("string") is created while the config module loads, before configure() runs\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build\'s `config` module.',
			'main.ts:6:18  type("number").configure(meta) cannot be precompiled\n  arktype reads `inner.meta.label()` while defining the type, so it must be static\n  `inner.meta.label` is a function reached through a property rather than a binding\n  Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".',
			"2 sites in 2 files: 0 accepted (0.0%)"
		])
	})

	it("rejects each site under a configuration the build can't apply", () => {
		attest(
			check([], { cwd: fromHere("unapplied"), config: "config.ts" }).lines
		).snap([
			"config.ts:3:1  configure({ onUndeclaredKey: process.argv.length > 99 ? \"de… is not static\n  `process` is a global the build does not read\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module.",
			'main.ts:4:18  type({ a: "string" }) is created under a configuration the build can\'t apply\n  configure({ onUndeclaredKey: process.argv.length > 99 ? "de… is not static (config.ts)\n  `process` is a global the build does not read\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build\'s `config` module.',
			"1 site in 2 files: 0 accepted (0.0%), 1 error outside a site"
		])
	})

	it("fails under a rate", () => {
		attest(cli("--check", "--fail-under", "50").status).equals(0)
		attest(cli("--check", "--fail-under", "60").status).equals(1)
		attest(cli("--check", "--runtime", "arktype", "forms.ts").stdout)
			.snap(`forms.ts:4:21  accepted
forms.ts:10:16  type(\`string <= \${limit}\`) cannot be precompiled
  \`limit\` is a parameter of makeField (forms.ts:9:27); its value is known only at runtime
  With runtime: "arktype", arktype defines this at runtime.
forms.ts:16:16  type(\`string <= \${limit}\`) cannot be precompiled
  \`limit\` is a parameter of makeRuntimeField (forms.ts:14:34); its value is known only at runtime
  With runtime: "arktype", arktype defines this at runtime.
3 sites in 1 file: 1 accepted (33.3%)
`)
	})

	it("fails under any rate on an error outside every site", () => {
		const dir = fromHere("unconfigured")
		attest(check([], { cwd: dir }).lines).snap([
			"config.ts:3:1  configure() is called, but the build has no `config` module\n  The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module.",
			"main.ts:4:21  accepted",
			'main.ts:6:21  JSON.stringify(User) reads toJSON, which a standalone validator lacks\n  `User` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".',
			"1 site in 2 files: 1 accepted (100.0%), 2 errors outside a site"
		])
		attest(cliIn(dir, "--check").status).equals(0)
		attest(cliIn(dir, "--check", "--fail-under", "0").status).equals(1)
	})

	it("rejects invalid arguments", () => {
		attest(
			[
				["--runtime", "strict"],
				["--fail-under", "most"],
				["--define", "MAX"],
				["--define", "MAX=five"]
			].map(args => {
				const result = cli("--check", ...args)
				return `${result.status} ${result.stderr.split("\n")[0]}`
			})
		).snap([
			"2 --runtime must be arktype (was strict)",
			"2 --fail-under must be a percentage (was most)",
			"2 --define must be <name>=<json> (was MAX)",
			"2 --define must be <name>=<json> (was MAX=five)"
		])
	})
})
