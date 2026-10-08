import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { check } from "@ark/precompile/internal/check.ts"
import { spawnSync } from "node:child_process"

const cwd = fromHere("checked")

const cli = (...args: string[]) =>
	spawnSync(
		process.execPath,
		["--conditions", "ark-ts", fromHere("..", "cli.ts"), ...args],
		{ cwd, encoding: "utf8" }
	)

contextualize(() => {
	it("lists sites", () => {
		attest(check([], { cwd }).lines).snap([
			"forms.ts:4:21  accepted",
			'forms.ts:10:16  type(`string <= ${limit}`) cannot be precompiled\n  `limit` is a parameter of makeField (forms.ts:9:27); its value is known only at runtime\n  Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".',
			"2 sites in 2 files: 1 accepted (50.0%)"
		])
	})

	it("fails under a rate", () => {
		attest(cli("--check", "--fail-under", "50").status).equals(0)
		attest(cli("--check", "--fail-under", "60").status).equals(1)
		attest(cli("--check", "--mode", "cache", "forms.ts").stdout)
			.snap(`forms.ts:4:21  accepted
forms.ts:10:16  type(\`string <= \${limit}\`) cannot be precompiled
  \`limit\` is a parameter of makeField (forms.ts:9:27); its value is known only at runtime
  Cache mode leaves this to arktype at runtime.
2 sites in 1 file: 1 accepted (50.0%)
`)
	})
})
