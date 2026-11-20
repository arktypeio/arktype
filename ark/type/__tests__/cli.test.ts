import { attest, contextualize } from "@ark/attest"
import { spawnSync } from "node:child_process"
import {
	existsSync,
	lstatSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	symlinkSync,
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

		const v2Dir = tempProject({
			"package.json": JSON.stringify({
				name: "app",
				dependencies: { arktype: "^2.2.9" }
			})
		})
		const v2Res = invoke(["migrate", "--no-skill"], v2Dir)
		attest(v2Res.code).equals(0)
		attest(
			v2Res.out.includes("Migrate this codebase from ArkType 2.x to ArkType 3.")
		).equals(true)
		attest(v2Res.out.includes("Upgrading from ArkType 2")).equals(true)
		attest(v2Res.out.includes("https://arktype.io/docs/upgrading.md")).equals(
			true
		)
		attest(v2Res.out.includes("references/migrating.md")).equals(false)
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

	it("refuses writing skill files through symlinks (including dangling targets)", () => {
		const outside = tempProject({ "victim.txt": "SECRET\n" })
		const dir = tempProject({ "package.json": "{}" })
		const skillDir = join(dir, ".agents", "skills", "arktype")
		mkdirSync(join(skillDir, "references"), { recursive: true })

		// existing target symlink
		symlinkSync(join(outside, "victim.txt"), join(skillDir, "SKILL.md"))
		const res1 = invoke(["skill", "install"], dir)
		attest(res1.code).equals(1)
		attest(res1.err.includes("symlink")).equals(true)
		attest(readFileSync(join(outside, "victim.txt"), "utf8")).equals("SECRET\n")

		// dangling target symlink inside references/
		rmSync(join(skillDir, "SKILL.md"))
		const dangleTarget = join(outside, "dangle.md")
		symlinkSync(dangleTarget, join(skillDir, "references", "migrating.md"))
		const res2 = invoke(["init", "--no-skill"], dir)
		attest(res2.code).equals(0)
		const res3 = invoke(["migrate"], dir)
		attest(res3.code).equals(1)
		attest(res3.err.includes("symlink")).equals(true)
		attest(existsSync(dangleTarget)).equals(false)
		// two-pass validation should not have written SKILL.md either
		attest(existsSync(join(skillDir, "SKILL.md"))).equals(false)
	})

	it("allows in-project symlinked skill dirs and refuses outside-project escapes without --force", () => {
		const outside = tempProject({ "outside-skills/keep.txt": "KEEP\n" })
		const dir = tempProject({ "package.json": "{}" })

		// legitimate in-project leaf symlink
		const realTarget = join(dir, "shared-skills", "arktype")
		mkdirSync(realTarget, { recursive: true })
		mkdirSync(join(dir, ".agents", "skills"), { recursive: true })
		symlinkSync(realTarget, join(dir, ".agents", "skills", "arktype"))
		const inProjectRes = invoke(["skill", "install"], dir)
		attest(inProjectRes.code).equals(0)
		attest(existsSync(join(realTarget, "SKILL.md"))).equals(true)

		// legitimate in-project parent symlink (.claude/skills -> ../.agents/skills)
		const dirParent = tempProject({ "package.json": "{}" })
		mkdirSync(join(dirParent, "real-skills"), { recursive: true })
		mkdirSync(join(dirParent, ".claude"), { recursive: true })
		symlinkSync(
			join(dirParent, "real-skills"),
			join(dirParent, ".claude", "skills")
		)
		const parentRes = invoke(["skill", "install"], dirParent)
		attest(parentRes.code).equals(0)
		attest(
			existsSync(join(dirParent, "real-skills", "arktype", "SKILL.md"))
		).equals(true)

		// outside-project symlinked parent refused without --force, naming both paths
		const dirEscape = tempProject({ "package.json": "{}" })
		mkdirSync(join(dirEscape, ".agents"), { recursive: true })
		const outsideSkills = join(outside, "outside-skills")
		symlinkSync(outsideSkills, join(dirEscape, ".agents", "skills"))
		const escapedRes = invoke(["skill", "install"], dirEscape)
		attest(escapedRes.code).equals(1)
		attest(escapedRes.err.includes("outside project root")).equals(true)
		attest(
			escapedRes.err.includes(join(dirEscape, ".agents", "skills", "arktype"))
		).equals(true)
		attest(escapedRes.err.includes("outside-skills")).equals(true)
		attest(existsSync(join(outsideSkills, "arktype", "SKILL.md"))).equals(false)

		// allowed when --force is passed
		const forcedRes = invoke(["skill", "install", "--force"], dirEscape)
		attest(forcedRes.code).equals(0)
		attest(existsSync(join(outsideSkills, "arktype", "SKILL.md"))).equals(true)

		// dangling skill dir symlink refused
		const dirDangle = tempProject({ "package.json": "{}" })
		mkdirSync(join(dirDangle, ".agents"), { recursive: true })
		symlinkSync(
			join(outside, "nonexistent"),
			join(dirDangle, ".agents", "skills")
		)
		const dangleRes = invoke(["skill", "install"], dirDangle)
		attest(dangleRes.code).equals(1)
		attest(dangleRes.err.includes("dangling symlink")).equals(true)
	})

	it("refuses writing ark.json through symlinks or over a directory", () => {
		const outside = tempProject({ "existing.txt": "KEEP\n" })

		// dangling ark.json symlink without --force
		const dirDangle = tempProject({ "package.json": "{}" })
		const dangleTarget = join(outside, "created-by-init.json")
		symlinkSync(dangleTarget, join(dirDangle, "ark.json"))
		const resDangle = invoke(["init", "--no-skill"], dirDangle)
		attest(resDangle.code).equals(1)
		attest(resDangle.err.includes("symlink")).equals(true)
		attest(existsSync(dangleTarget)).equals(false)
		attest(lstatSync(join(dirDangle, "ark.json")).isSymbolicLink()).equals(true)

		// existing ark.json symlink with --force
		const dirForce = tempProject({ "package.json": "{}" })
		symlinkSync(join(outside, "existing.txt"), join(dirForce, "ark.json"))
		const resForce = invoke(["init", "--no-skill", "--force"], dirForce)
		attest(resForce.code).equals(1)
		attest(resForce.err.includes("symlink")).equals(true)
		attest(readFileSync(join(outside, "existing.txt"), "utf8")).equals("KEEP\n")

		// ark.json as a directory with and without --force
		const dirIsDir = tempProject({ "package.json": "{}" })
		mkdirSync(join(dirIsDir, "ark.json"))
		const resDir1 = invoke(["init", "--no-skill"], dirIsDir)
		attest(resDir1.code).equals(1)
		attest(resDir1.err.includes("not a regular file")).equals(true)
		const resDir2 = invoke(["init", "--no-skill", "--force"], dirIsDir)
		attest(resDir2.code).equals(1)
		attest(resDir2.err.includes("not a regular file")).equals(true)
	})
})
