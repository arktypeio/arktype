import { attest, contextualize } from "@ark/attest"
import { spawnSync } from "node:child_process"
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import {
	bundledSkillPath,
	detectMigrationSource,
	detectPackageManager,
	runCli
} from "arktype/internal/cli.ts"

const dirs: string[] = []

const tempProject = (files: Record<string, string>): string => {
	const dir = mkdtempSync(join(tmpdir(), "ark-cli-"))
	dirs.push(dir)
	for (const [rel, content] of Object.entries(files)) {
		const path = join(dir, rel)
		mkdirSync(join(path, ".."), { recursive: true })
		writeFileSync(path, content)
	}
	return dir
}

const invoke = (argv: string[], cwd: string) => {
	let out = ""
	let err = ""
	const code = runCli(argv, {
		cwd,
		stdout: text => {
			out += text
		},
		stderr: text => {
			err += text
		}
	})
	return { code, out, err }
}

contextualize(() => {
	afterEach(() => {
		for (const dir of dirs.splice(0))
			rmSync(dir, { recursive: true, force: true })
	})

	it("prints help and version", () => {
		const dir = tempProject({ "package.json": "{}" })
		const help = invoke(["--help"], dir)
		attest(help.code).equals(0)
		attest(help.out.includes("Usage: ark <command>")).equals(true)

		const ver = invoke(["--version"], dir)
		attest(ver.code).equals(0)
		attest(ver.out.trim()).satisfies(/^\d+\.\d+\.\d+/)
	})

	it("reports missing @ark/aot with the detected package manager", () => {
		for (const [lockfile, expectedCmd] of [
			["pnpm-lock.yaml", "pnpm add -D @ark/aot@"],
			["bun.lock", "bun add -d @ark/aot@"],
			["yarn.lock", "yarn add -D @ark/aot@"],
			["package-lock.json", "npm i -D @ark/aot@"]
		] as const) {
			const dir = tempProject({
				"package.json": JSON.stringify({ name: "app" }),
				[lockfile]: ""
			})
			attest(detectPackageManager(dir)).equals(
				lockfile.startsWith("pnpm") ? "pnpm"
				: lockfile.startsWith("bun") ? "bun"
				: lockfile.startsWith("yarn") ? "yarn"
				: "npm"
			)
			const res = invoke(["check", "src"], dir)
			attest(res.code).equals(1)
			attest(res.err.includes(expectedCmd)).equals(true)
		}
	})

	it("delegates check, emit, declare and aot subcommands to installed @ark/aot", () => {
		const dir = tempProject({
			"package.json": JSON.stringify({ name: "app" }),
			"node_modules/@ark/aot/package.json": JSON.stringify({
				name: "@ark/aot",
				version: "0.0.1",
				type: "module",
				exports: {
					".": { default: "./out/index.js" }
				},
				bin: { "arktype-precompile": "out/cli.js" }
			}),
			"node_modules/@ark/aot/out/index.js": "export {}\n",
			"node_modules/@ark/aot/out/cli.js":
				'import { writeFileSync } from "node:fs"; writeFileSync("args.json", JSON.stringify(process.argv.slice(2)));'
		})

		attest(invoke(["check", "src", "--fail-under", "90"], dir).code).equals(0)
		attest(JSON.parse(readFileSync(join(dir, "args.json"), "utf8"))).equals([
			"--check",
			"src",
			"--fail-under",
			"90"
		])

		attest(invoke(["aot", "declare", "--checker", "tsgo"], dir).code).equals(0)
		attest(JSON.parse(readFileSync(join(dir, "args.json"), "utf8"))).equals([
			"--declare",
			"--checker",
			"tsgo"
		])
	})

	it("scaffolds ark.json, detects tools, and installs the bundled skill on init", () => {
		const dir = tempProject({
			"package.json": JSON.stringify({
				name: "app",
				devDependencies: { vite: "6.0.0", vitest: "3.0.0" }
			})
		})
		const first = invoke(["init"], dir)
		attest(first.code).equals(0)
		attest(JSON.parse(readFileSync(join(dir, "ark.json"), "utf8"))).equals({
			precompile: {}
		})
		attest(
			existsSync(join(dir, ".agents", "skills", "arktype", "SKILL.md"))
		).equals(true)
		attest(first.out.includes("Detected tools: vite, vitest")).equals(true)

		// does not overwrite without --force
		writeFileSync(join(dir, "ark.json"), '{"precompile":{"errors":"first"}}\n')
		const second = invoke(["init", "--no-skill"], dir)
		attest(second.code).equals(0)
		attest(second.out.includes("already exists")).equals(true)
		attest(JSON.parse(readFileSync(join(dir, "ark.json"), "utf8"))).equals({
			precompile: { errors: "first" }
		})

		// overwrites with --force
		const third = invoke(["init", "--force", "--no-skill"], dir)
		attest(third.code).equals(0)
		attest(JSON.parse(readFileSync(join(dir, "ark.json"), "utf8"))).equals({
			precompile: {}
		})
	})

	it("leaves ark.json untouched when package.json sets ark.precompile, but writes it beside ark.aot", () => {
		const withPrecompile = tempProject({
			"package.json": JSON.stringify({ name: "app", ark: { precompile: {} } })
		})
		const skipped = invoke(["init", "--no-skill"], withPrecompile)
		attest(skipped.code).equals(0)
		attest(existsSync(join(withPrecompile, "ark.json"))).equals(false)
		attest(skipped.out.includes('existing "ark" settings')).equals(true)

		const withAotOptIn = tempProject({
			"package.json": JSON.stringify({ name: "lib", ark: { aot: true } })
		})
		const written = invoke(["init", "--no-skill"], withAotOptIn)
		attest(written.code).equals(0)
		attest(existsSync(join(withAotOptIn, "ark.json"))).equals(true)
		attest(
			JSON.parse(readFileSync(join(withAotOptIn, "ark.json"), "utf8"))
		).equals({
			precompile: {}
		})
	})

	it("auto-detects validator and prints migration prompt on migrate", () => {
		attest(detectMigrationSource({ dependencies: { zod: "^3.23.0" } })).equals(
			"zod"
		)
		attest(
			detectMigrationSource({ dependencies: { arktype: "^2.1.0" } })
		).equals("v2")

		const dir = tempProject({
			"package.json": JSON.stringify({
				name: "app",
				dependencies: { valibot: "^1.0.0" }
			})
		})
		const res = invoke(["migrate"], dir)
		attest(res.code).equals(0)
		attest(
			res.out.includes("Migrate this codebase from valibot to ArkType 3.")
		).equals(true)
		attest(res.out.includes("SKILL.md")).equals(true)
		attest(res.out.includes("migrating.md")).equals(true)
		attest(
			existsSync(join(dir, ".agents", "skills", "arktype", "SKILL.md"))
		).equals(true)

		const bad = invoke(["migrate", "unknown-lib"], dir)
		attest(bad.code).equals(1)
		attest(bad.err.includes('Unknown migration source "unknown-lib"')).equals(
			true
		)
	})

	it("prints and installs the bundled skill via ark skill", () => {
		const dir = tempProject({ "package.json": "{}" })
		const pathRes = invoke(["skill"], dir)
		attest(pathRes.code).equals(0)
		attest(pathRes.out.trim()).equals(bundledSkillPath())
		attest(existsSync(join(pathRes.out.trim(), "SKILL.md"))).equals(true)

		const installRes = invoke(
			["skill", "install", "--dir", "custom-skills/arktype"],
			dir
		)
		attest(installRes.code).equals(0)
		attest(
			existsSync(join(dir, "custom-skills", "arktype", "SKILL.md"))
		).equals(true)
	})

	it("ships built out/cli.js with shebang when built", () => {
		const builtCli = fileURLToPath(new URL("../out/cli.js", import.meta.url))
		if (!existsSync(builtCli)) return
		const source = readFileSync(builtCli, "utf8")
		attest(source.startsWith("#!/usr/bin/env node\n")).equals(true)
		const run = spawnSync(process.execPath, [builtCli, "--version"], {
			encoding: "utf8"
		})
		attest(run.status).equals(0)
		attest(run.stdout.trim()).satisfies(/^\d+\.\d+\.\d+/)
	})
})
