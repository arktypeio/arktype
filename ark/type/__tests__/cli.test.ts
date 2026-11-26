import { attest, contextualize } from "@ark/attest"
import { spawnSync } from "node:child_process"
import {
	existsSync,
	lstatSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	realpathSync,
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

const arktypePkg = JSON.parse(
	readFileSync(new URL("../package.json", import.meta.url), "utf8")
) as { version: string; arkAotVersion?: string }

const aotSpec =
	arktypePkg.arkAotVersion ? `@ark/aot@${arktypePkg.arkAotVersion}` : "@ark/aot"

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

const normalize = (
	text: string,
	replacements: Record<string, string>
): string => {
	const pairs: [string, string][] = []
	for (const [label, dir] of Object.entries(replacements)) {
		const real = existsSync(dir) ? realpathSync(dir) : dir
		if (real !== dir) pairs.push([real, label])
		pairs.push([dir, label])
	}
	pairs.sort((a, b) => b[0].length - a[0].length)
	let result = text
	for (const [from, to] of pairs) result = result.split(from).join(to)
	return result.split("\\").join("/")
}

contextualize(() => {
	afterEach(() => {
		for (const dir of dirs.splice(0))
			rmSync(dir, { recursive: true, force: true })
	})

	it("prints root and subcommand help and version", () => {
		const dir = tempProject({ "package.json": "{}" })

		const help = invoke(["--help"], dir)
		attest(help.code).equals(0)
		attest(help.out).snap(`Usage: ark <command> [options]

Commands:
  aot <check|emit|declare> [...flags]             Run @ark/aot precompiler commands
  check [...flags]                                Shortcut for \`ark aot check\`
  emit [...flags]                                 Shortcut for \`ark aot emit\`
  declare [...flags]                              Shortcut for \`ark aot declare\`
  init [--force] [--no-skill] [--allow-outside]   Detect setup, write ark.json, install skill
  migrate [source] [--run] [--agent <cli>]        Generate or launch a migration prompt
          [--no-skill] [--allow-outside]
  skill [path|install] [--dir <path>]             Print path to or install the bundled skill
        [--allow-outside]

Options:
  -h, --help                                      Show help
  -v, --version                                   Show version
`)

		const initHelp = invoke(["init", "--help"], dir)
		attest(initHelp.code).equals(0)
		attest(initHelp.out).snap(
			"Usage: ark init [--force] [--no-skill] [--allow-outside]\n\nDetects your bundler/test runner, writes ark.json, and installs the bundled ArkType skill.\n"
		)

		const migrateHelp = invoke(["migrate", "--help"], dir)
		attest(migrateHelp.code).equals(0)
		attest(migrateHelp.out).snap(
			"Usage: ark migrate [zod|valibot|yup|joi|typebox|v2] [--run] [--agent claude|codex] [--no-skill] [--allow-outside]\n\nDetects your existing validator, installs the bundled ArkType skill, and prints (or launches) a migration prompt.\n"
		)

		const skillHelp = invoke(["skill", "--help"], dir)
		attest(skillHelp.code).equals(0)
		attest(skillHelp.out).snap(
			"Usage: ark skill [path|install] [--dir <path>] [--allow-outside]\n\nPrints the path to the bundled ArkType skill or installs it into your project. With --dir <path> (resolved from cwd), installs to <path>/arktype unless <path> already ends in arktype.\n"
		)

		const skillInstallHelp = invoke(["skill", "install", "--help"], dir)
		attest(skillInstallHelp.code).equals(0)
		attest(skillInstallHelp.out).equals(skillHelp.out)

		const ver = invoke(["--version"], dir)
		attest(ver.code).equals(0)
		attest(ver.out).equals(`${arktypePkg.version}\n`)
	})

	it("reports missing @ark/aot with the detected package manager", () => {
		for (const [lockfile, pm, expectedCmd] of [
			["pnpm-lock.yaml", "pnpm", `pnpm add -D ${aotSpec}`],
			["bun.lock", "bun", `bun add -d ${aotSpec}`],
			["yarn.lock", "yarn", `yarn add -D ${aotSpec}`],
			["package-lock.json", "npm", `npm i -D ${aotSpec}`]
		] as const) {
			const dir = tempProject({
				"package.json": JSON.stringify({ name: "app" }),
				[lockfile]: ""
			})
			attest(detectPackageManager(dir)).equals(pm)
			const res = invoke(["check", "src"], dir)
			attest(res.code).equals(1)
			attest(res.err).equals(
				`@ark/aot is not installed. Install it to run \`ark check\`:\n\n  ${expectedCmd}\n`
			)
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
				}
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

	it("scaffolds ark.json, detects tools, installs skill, and requires --force to overwrite", () => {
		const dir = tempProject({
			"package.json": JSON.stringify({
				name: "app",
				devDependencies: { vite: "6.0.0", vitest: "3.0.0" }
			}),
			"pnpm-lock.yaml": ""
		})
		const first = invoke(["init"], dir)
		attest(first.code).equals(0)
		attest(JSON.parse(readFileSync(join(dir, "ark.json"), "utf8"))).equals({
			precompile: {}
		})
		attest(
			existsSync(join(dir, ".agents", "skills", "arktype", "SKILL.md"))
		).equals(true)
		attest(normalize(first.out, { "<project>": dir })).equals(
			[
				"Created <project>/ark.json",
				"Installed ArkType skill to <project>/.agents/skills/arktype",
				"Detected tools: vite, vitest",
				"To precompile Types at build time, install @ark/aot:",
				`  pnpm add -D ${aotSpec}`,
				""
			].join("\n")
		)

		writeFileSync(join(dir, "ark.json"), '{"precompile":{"errors":"first"}}\n')
		const second = invoke(["init", "--no-skill"], dir)
		attest(second.code).equals(0)
		attest(normalize(second.out, { "<project>": dir })).equals(
			[
				"ark.json already exists at <project>/ark.json (pass --force to overwrite).",
				"Detected tools: vite, vitest",
				"To precompile Types at build time, install @ark/aot:",
				`  pnpm add -D ${aotSpec}`,
				""
			].join("\n")
		)
		attest(JSON.parse(readFileSync(join(dir, "ark.json"), "utf8"))).equals({
			precompile: { errors: "first" }
		})

		const third = invoke(["init", "--force", "--no-skill"], dir)
		attest(third.code).equals(0)
		attest(JSON.parse(readFileSync(join(dir, "ark.json"), "utf8"))).equals({
			precompile: {}
		})
	})

	it("leaves ark.json untouched when package.json sets ark.precompile (including UTF-8 BOM), but writes beside ark.aot", () => {
		for (const prefix of ["", "\uFEFF"]) {
			const withPrecompile = tempProject({
				"package.json":
					prefix + JSON.stringify({ name: "app", ark: { precompile: {} } }),
				"pnpm-lock.yaml": ""
			})
			const skipped = invoke(["init", "--no-skill"], withPrecompile)
			attest(skipped.code).equals(0)
			attest(existsSync(join(withPrecompile, "ark.json"))).equals(false)
			attest(normalize(skipped.out, { "<project>": withPrecompile })).equals(
				[
					'Found existing "ark" settings in <project>/package.json; leaving ark.json untouched.',
					"To precompile Types at build time, install @ark/aot:",
					`  pnpm add -D ${aotSpec}`,
					""
				].join("\n")
			)
		}

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
		attest(normalize(res.out, { "<project>": dir })).snap(
			`Installed ArkType skill to <project>/.agents/skills/arktype

Migrate this codebase from valibot to ArkType 3.
Read <project>/.agents/skills/arktype/SKILL.md and <project>/.agents/skills/arktype/references/migrating.md first, then convert schemas, types, and error handling incrementally while keeping typecheck and tests green.
`
		)
		attest(
			existsSync(join(dir, ".agents", "skills", "arktype", "SKILL.md"))
		).equals(true)

		const bad = invoke(["migrate", "unknown-lib"], dir)
		attest(bad.code).equals(1)
		attest(bad.err).snap(
			'Unknown migration source "unknown-lib". Expected one of: zod, valibot, yup, joi, typebox, v2\n'
		)
	})

	it("points ark migrate v2 at SKILL.md and upgrading.md", () => {
		const v2Dir = tempProject({
			"package.json": JSON.stringify({
				name: "app",
				dependencies: { arktype: "^2.2.9" }
			})
		})
		const v2Res = invoke(["migrate", "--no-skill"], v2Dir)
		attest(v2Res.code).equals(0)
		attest(normalize(v2Res.out, { "<bundled>": bundledSkillPath() })).snap(
			`
Migrate this codebase from ArkType 2.x to ArkType 3.
Read the "Upgrading from ArkType 2" section of <bundled>/SKILL.md and https://arktype.io/docs/upgrading.md first, then upgrade schemas, types, and error handling incrementally while keeping typecheck and tests green.
`
		)
	})

	it("prints and installs the bundled skill via ark skill", () => {
		const dir = tempProject({ "package.json": "{}" })
		const pathRes = invoke(["skill"], dir)
		attest(pathRes.code).equals(0)
		attest(pathRes.out).equals(`${bundledSkillPath()}\n`)
		attest(existsSync(join(pathRes.out.trim(), "SKILL.md"))).equals(true)

		const installRes = invoke(
			["skill", "install", "--dir", "custom-skills"],
			dir
		)
		attest(installRes.code).equals(0)
		attest(normalize(installRes.out, { "<project>": dir })).snap(
			"Installed ArkType skill to <project>/custom-skills/arktype\n"
		)
		attest(
			existsSync(join(dir, "custom-skills", "arktype", "SKILL.md"))
		).equals(true)

		// already ending in arktype does not double to arktype/arktype
		const exactRes = invoke(
			["skill", "install", "--dir", "exact-skills/arktype/"],
			dir
		)
		attest(exactRes.code).equals(0)
		attest(normalize(exactRes.out, { "<project>": dir })).snap(
			"Installed ArkType skill to <project>/exact-skills/arktype\n"
		)
		attest(existsSync(join(dir, "exact-skills", "arktype", "SKILL.md"))).equals(
			true
		)
		attest(
			existsSync(join(dir, "exact-skills", "arktype", "arktype", "SKILL.md"))
		).equals(false)

		// relative --dir resolves from cwd rather than projectRoot
		const subCwd = join(dir, "packages", "app")
		mkdirSync(subCwd, { recursive: true })
		const subRes = invoke(
			["skill", "install", "--dir", ".claude/skills"],
			subCwd
		)
		attest(subRes.code).equals(0)
		attest(normalize(subRes.out, { "<project>": dir })).snap(
			"Installed ArkType skill to <project>/packages/app/.claude/skills/arktype\n"
		)
		attest(
			existsSync(join(subCwd, ".claude", "skills", "arktype", "SKILL.md"))
		).equals(true)
		attest(
			existsSync(join(dir, ".claude", "skills", "arktype", "SKILL.md"))
		).equals(false)
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
		attest(run.stdout).equals(`${arktypePkg.version}\n`)
	})

	it("refuses writing skill files through existing or dangling symlinks", () => {
		const outside = tempProject({ "victim.txt": "SECRET\n" })
		const dir = tempProject({ "package.json": "{}" })
		const skillDir = join(dir, ".agents", "skills", "arktype")
		mkdirSync(join(skillDir, "references"), { recursive: true })

		symlinkSync(join(outside, "victim.txt"), join(skillDir, "SKILL.md"))
		const res1 = invoke(["skill", "install"], dir)
		attest(res1.code).equals(1)
		attest(normalize(res1.err, { "<project>": dir })).snap(
			"Refusing to write through symlink at <project>/.agents/skills/arktype/SKILL.md\n"
		)
		attest(readFileSync(join(outside, "victim.txt"), "utf8")).equals("SECRET\n")

		// dangling target symlink inside references/
		rmSync(join(skillDir, "SKILL.md"))
		const dangleTarget = join(outside, "dangle.md")
		symlinkSync(dangleTarget, join(skillDir, "references", "migrating.md"))
		const res2 = invoke(["migrate"], dir)
		attest(res2.code).equals(1)
		attest(normalize(res2.err, { "<project>": dir })).snap(
			"Refusing to write through symlink at <project>/.agents/skills/arktype/references/migrating.md\n"
		)
		attest(existsSync(dangleTarget)).equals(false)
		// two-pass validation should not have written SKILL.md either
		attest(existsSync(join(skillDir, "SKILL.md"))).equals(false)
	})

	it("allows in-project symlinked leaf and parent skill directories", () => {
		const dir = tempProject({ "package.json": "{}" })
		const realTarget = join(dir, "shared-skills", "arktype")
		mkdirSync(realTarget, { recursive: true })
		mkdirSync(join(dir, ".agents", "skills"), { recursive: true })
		symlinkSync(realTarget, join(dir, ".agents", "skills", "arktype"))
		const leafRes = invoke(["skill", "install"], dir)
		attest(leafRes.code).equals(0)
		attest(existsSync(join(realTarget, "SKILL.md"))).equals(true)

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
	})

	it("refuses dangling skill directory symlinks", () => {
		const outside = tempProject({})
		const dir = tempProject({ "package.json": "{}" })
		mkdirSync(join(dir, ".agents"), { recursive: true })
		symlinkSync(join(outside, "nonexistent"), join(dir, ".agents", "skills"))
		const res = invoke(["skill", "install"], dir)
		attest(res.code).equals(1)
		attest(normalize(res.err, { "<project>": dir })).snap(
			"Refusing to install skill through dangling symlink <project>/.agents/skills\n"
		)
	})

	it("requires --allow-outside for outside-project symlinked skill dirs across skill, init, and migrate", () => {
		const setupEscape = () => {
			const outside = tempProject({ "outside-skills/keep.txt": "KEEP\n" })
			const dir = tempProject({
				"package.json": JSON.stringify({
					name: "app",
					dependencies: { zod: "^3.23.0" }
				}),
				"ark.json": '{"precompile":{"errors":"first"}}\n'
			})
			mkdirSync(join(dir, ".agents"), { recursive: true })
			const outsideSkills = join(outside, "outside-skills")
			symlinkSync(outsideSkills, join(dir, ".agents", "skills"))
			return { dir, outside, outsideSkills }
		}

		const expectedRefusal =
			"Refusing to install skill to <project>/.agents/skills/arktype: resolves to <outside>/outside-skills/arktype, outside project root <project> (pass --allow-outside to allow)\n"

		// ark skill install
		const skillCase = setupEscape()
		const skillRefused = invoke(["skill", "install"], skillCase.dir)
		attest(skillRefused.code).equals(1)
		attest(
			normalize(skillRefused.err, {
				"<project>": skillCase.dir,
				"<outside>": skillCase.outside
			})
		).equals(expectedRefusal)
		attest(
			existsSync(join(skillCase.outsideSkills, "arktype", "SKILL.md"))
		).equals(false)
		const skillAllowed = invoke(
			["skill", "install", "--allow-outside"],
			skillCase.dir
		)
		attest(skillAllowed.code).equals(0)
		attest(
			existsSync(join(skillCase.outsideSkills, "arktype", "SKILL.md"))
		).equals(true)

		// ark migrate
		const migrateCase = setupEscape()
		const migrateRefused = invoke(["migrate"], migrateCase.dir)
		attest(migrateRefused.code).equals(1)
		attest(
			normalize(migrateRefused.err, {
				"<project>": migrateCase.dir,
				"<outside>": migrateCase.outside
			})
		).equals(expectedRefusal)
		attest(
			existsSync(join(migrateCase.outsideSkills, "arktype", "SKILL.md"))
		).equals(false)
		const migrateAllowed = invoke(
			["migrate", "--allow-outside"],
			migrateCase.dir
		)
		attest(migrateAllowed.code).equals(0)
		attest(
			existsSync(join(migrateCase.outsideSkills, "arktype", "SKILL.md"))
		).equals(true)

		// ark init: --force does not bypass outside-root refusal and leaves ark.json untouched when refused
		const initCase = setupEscape()
		const initForced = invoke(["init", "--force"], initCase.dir)
		attest(initForced.code).equals(1)
		attest(initForced.out).equals("")
		attest(
			normalize(initForced.err, {
				"<project>": initCase.dir,
				"<outside>": initCase.outside
			})
		).equals(expectedRefusal)
		attest(
			existsSync(join(initCase.outsideSkills, "arktype", "SKILL.md"))
		).equals(false)
		attest(
			JSON.parse(readFileSync(join(initCase.dir, "ark.json"), "utf8"))
		).equals({
			precompile: { errors: "first" }
		})

		const initAllowed = invoke(["init", "--allow-outside"], initCase.dir)
		attest(initAllowed.code).equals(0)
		attest(
			existsSync(join(initCase.outsideSkills, "arktype", "SKILL.md"))
		).equals(true)
		attest(
			JSON.parse(readFileSync(join(initCase.dir, "ark.json"), "utf8"))
		).equals({
			precompile: { errors: "first" }
		})

		// init without existing ark.json does not create ark.json when skill path is refused
		const initFreshCase = setupEscape()
		rmSync(join(initFreshCase.dir, "ark.json"))
		const initFreshRefused = invoke(["init"], initFreshCase.dir)
		attest(initFreshRefused.code).equals(1)
		attest(existsSync(join(initFreshCase.dir, "ark.json"))).equals(false)
	})

	it("reports existing ark.json and still installs skill without --force for symlinks and directories", () => {
		const outside = tempProject({
			"shared-ark.json": '{"precompile":{"errors":"none"}}\n'
		})

		// monorepo shared symlinked ark.json
		const dirShared = tempProject({
			"package.json": "{}",
			"pnpm-lock.yaml": ""
		})
		symlinkSync(join(outside, "shared-ark.json"), join(dirShared, "ark.json"))
		const resShared = invoke(["init"], dirShared)
		attest(resShared.code).equals(0)
		attest(resShared.err).equals("")
		attest(normalize(resShared.out, { "<project>": dirShared })).equals(
			[
				"ark.json already exists at <project>/ark.json (symlink).",
				"Installed ArkType skill to <project>/.agents/skills/arktype",
				"To precompile Types at build time, install @ark/aot:",
				`  pnpm add -D ${aotSpec}`,
				""
			].join("\n")
		)
		attest(
			existsSync(join(dirShared, ".agents", "skills", "arktype", "SKILL.md"))
		).equals(true)
		attest(readFileSync(join(outside, "shared-ark.json"), "utf8")).equals(
			'{"precompile":{"errors":"none"}}\n'
		)

		// dangling ark.json symlink without --force leaves target uncreated and still installs skill
		const dirDangle = tempProject({ "package.json": "{}" })
		const dangleTarget = join(outside, "created-by-init.json")
		symlinkSync(dangleTarget, join(dirDangle, "ark.json"))
		const resDangle = invoke(["init"], dirDangle)
		attest(resDangle.code).equals(0)
		attest(normalize(resDangle.out, { "<project>": dirDangle })).equals(
			[
				"ark.json already exists at <project>/ark.json (symlink).",
				"Installed ArkType skill to <project>/.agents/skills/arktype",
				"To precompile Types at build time, install @ark/aot:",
				`  pnpm add -D ${aotSpec}`,
				""
			].join("\n")
		)
		attest(existsSync(dangleTarget)).equals(false)
		attest(lstatSync(join(dirDangle, "ark.json")).isSymbolicLink()).equals(true)
		attest(
			existsSync(join(dirDangle, ".agents", "skills", "arktype", "SKILL.md"))
		).equals(true)

		// ark.json as a directory without --force reports already exists (directory) and still installs skill
		const dirIsDir = tempProject({ "package.json": "{}" })
		mkdirSync(join(dirIsDir, "ark.json"))
		const resDir = invoke(["init"], dirIsDir)
		attest(resDir.code).equals(0)
		attest(normalize(resDir.out, { "<project>": dirIsDir })).equals(
			[
				"ark.json already exists at <project>/ark.json (directory).",
				"Installed ArkType skill to <project>/.agents/skills/arktype",
				"To precompile Types at build time, install @ark/aot:",
				`  pnpm add -D ${aotSpec}`,
				""
			].join("\n")
		)
		attest(
			existsSync(join(dirIsDir, ".agents", "skills", "arktype", "SKILL.md"))
		).equals(true)
	})

	it("refuses overwriting symlinked or directory ark.json with --force", () => {
		const outside = tempProject({ "existing.txt": "KEEP\n" })

		const dirSymlink = tempProject({ "package.json": "{}" })
		symlinkSync(join(outside, "existing.txt"), join(dirSymlink, "ark.json"))
		const resSymlink = invoke(["init", "--no-skill", "--force"], dirSymlink)
		attest(resSymlink.code).equals(1)
		attest(normalize(resSymlink.err, { "<project>": dirSymlink })).snap(
			"Refusing to overwrite symlink at <project>/ark.json.\n"
		)
		attest(readFileSync(join(outside, "existing.txt"), "utf8")).equals("KEEP\n")

		const dirIsDir = tempProject({ "package.json": "{}" })
		mkdirSync(join(dirIsDir, "ark.json"))
		const resDir = invoke(["init", "--no-skill", "--force"], dirIsDir)
		attest(resDir.code).equals(1)
		attest(normalize(resDir.err, { "<project>": dirIsDir })).snap(
			"Cannot write <project>/ark.json: path is not a regular file.\n"
		)
	})
})
