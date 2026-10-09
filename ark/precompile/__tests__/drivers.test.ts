import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import type { PrecompilePluginOptions } from "@ark/precompile/unplugin"
import { spawnSync } from "node:child_process"
import { pathToFileURL } from "node:url"

const app = fromHere("app")

// arktype's packages resolve to their source in this repo
const conditions = ["ark-ts"]

const node = (args: string[], opts: PrecompilePluginOptions, cwd = app) =>
	spawnSync(
		process.execPath,
		[
			"--conditions",
			"ark-ts",
			"--import",
			`data:text/javascript,import { register } from "${pathToFileURL(fromHere("..", "node.ts"))}"; register(${JSON.stringify({ ...opts, conditions, cwd })})`,
			...args
		],
		{ cwd, encoding: "utf8" }
	)

contextualize(() => {
	const expected = spawnSync(
		process.execPath,
		["--conditions", "ark-ts", "main.ts"],
		{ cwd: app, encoding: "utf8" }
	).stdout

	describe("node", () => {
		it("standalone", () => {
			attest(node(["main.ts"], {}).stdout).equals(expected)
		})

		it("cache", () => {
			attest(node(["main.ts"], { runtime: "arktype" }).stdout).equals(expected)
		})

		it("fails a test file with a rejected site", () => {
			const { status, stdout } = node(["--test", "admin.ts", "main.ts"], {})
			attest(status).equals(1)
			attest(
				stdout
					.match(/^. (?:admin|main)\.ts/gm)
					?.slice(0, 2)
					.sort()
			).equals(["✔ main.ts", "✖ admin.ts"])
			attest(
				stdout
					.slice(stdout.indexOf("Error: ") + 7, stdout.indexOf("\n    at "))
					.replace(`${app}/`, "")
			)
				.snap(`admin.ts:3:22  User.and({ role: "'admin'" }) can't be precompiled to a standalone validator yet
  \`User\` is imported from schemas.ts
  Standalone builds can't precompile every definition yet. Build with runtime: "arktype".`)
		})

		it("precompiles apart from the program", () => {
			const result = node(
				["main.ts"],
				{ runtime: "arktype", config: "config.ts" },
				fromHere("configured")
			)
			attest(result.stdout).equals("true\n")
		})
	})
})
