#!/usr/bin/env node
import { spawnSync } from "node:child_process"
import {
	cpSync,
	existsSync,
	mkdirSync,
	readFileSync,
	realpathSync,
	writeFileSync
} from "node:fs"
import { createRequire } from "node:module"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"

export type PackageManager = "pnpm" | "bun" | "yarn" | "npm"

export type MigrationSource =
	| "zod"
	| "valibot"
	| "yup"
	| "joi"
	| "typebox"
	| "v2"

export type CliContext = {
	cwd?: string
	stdout?: (text: string) => void
	stderr?: (text: string) => void
}

type PackageManifest = {
	name?: string
	version?: string
	arkAotVersion?: string
	ark?: unknown
	bin?: string | Record<string, string>
	dependencies?: Record<string, string>
	devDependencies?: Record<string, string>
}

const here = dirname(fileURLToPath(import.meta.url))
// works both from source (ark/type/cli.ts) and built (ark/type/out/cli.js)
const arktypeRoot =
	existsSync(join(here, "package.json")) ? here : dirname(here)
const arktypeManifest: PackageManifest = JSON.parse(
	readFileSync(join(arktypeRoot, "package.json"), "utf8")
)

export const bundledSkillPath = (): string =>
	join(arktypeRoot, "skills", "arktype")

const readManifest = (dir: string): PackageManifest | undefined => {
	const path = join(dir, "package.json")
	if (!existsSync(path)) return undefined
	try {
		return JSON.parse(readFileSync(path, "utf8")) as PackageManifest
	} catch {
		return undefined
	}
}

const findProjectRoot = (startDir: string): string => {
	for (let dir = resolve(startDir); ; dir = dirname(dir)) {
		if (existsSync(join(dir, "package.json"))) return dir
		const parent = dirname(dir)
		if (parent === dir) return resolve(startDir)
	}
}

export const detectPackageManager = (startDir: string): PackageManager => {
	for (let dir = resolve(startDir); ; dir = dirname(dir)) {
		if (existsSync(join(dir, "pnpm-lock.yaml"))) return "pnpm"
		if (existsSync(join(dir, "bun.lock")) || existsSync(join(dir, "bun.lockb")))
			return "bun"
		if (existsSync(join(dir, "yarn.lock"))) return "yarn"
		if (existsSync(join(dir, "package-lock.json"))) return "npm"
		const parent = dirname(dir)
		if (parent === dir) break
	}
	const ua = process.env.npm_config_user_agent ?? ""
	if (ua.startsWith("pnpm/")) return "pnpm"
	if (ua.startsWith("bun/")) return "bun"
	if (ua.startsWith("yarn/")) return "yarn"
	return "npm"
}

export const installDevCommand = (pm: PackageManager, pkg: string): string =>
	pm === "pnpm" ? `pnpm add -D ${pkg}`
	: pm === "bun" ? `bun add -d ${pkg}`
	: pm === "yarn" ? `yarn add -D ${pkg}`
	: `npm i -D ${pkg}`

const detectedToolsOf = (
	manifest: PackageManifest | undefined,
	projectRoot: string
): string[] => {
	const deps = { ...manifest?.dependencies, ...manifest?.devDependencies }
	const tools: string[] = []
	for (const name of [
		"next",
		"vite",
		"vitest",
		"webpack",
		"esbuild",
		"rollup",
		"rspack",
		"tsup",
		"tsdown"
	])
		if (name in deps) tools.push(name)
	if (
		"bun" in deps ||
		existsSync(join(projectRoot, "bun.lock")) ||
		existsSync(join(projectRoot, "bun.lockb")) ||
		existsSync(join(projectRoot, "bunfig.toml"))
	)
		tools.push("bun")
	return tools
}

const migrationSources: readonly MigrationSource[] = [
	"zod",
	"valibot",
	"yup",
	"joi",
	"typebox",
	"v2"
]

export const detectMigrationSource = (
	manifest: PackageManifest | undefined
): MigrationSource | undefined => {
	const deps = { ...manifest?.dependencies, ...manifest?.devDependencies }
	if ("zod" in deps) return "zod"
	if ("valibot" in deps) return "valibot"
	if ("yup" in deps) return "yup"
	if ("joi" in deps) return "joi"
	if ("@sinclair/typebox" in deps || "typebox" in deps) return "typebox"
	const arkVer = deps.arktype
	if (arkVer && /(?:^|[\s<=>^~])2\./.test(arkVer)) return "v2"
	return undefined
}

const defaultSkillTarget = (projectRoot: string): string => {
	if (
		existsSync(join(projectRoot, ".claude")) &&
		!existsSync(join(projectRoot, ".agents"))
	)
		return join(projectRoot, ".claude", "skills", "arktype")
	return join(projectRoot, ".agents", "skills", "arktype")
}

export const installBundledSkill = (
	projectRoot: string,
	targetDir?: string
): string => {
	const src = bundledSkillPath()
	const dest =
		targetDir ?
			resolve(projectRoot, targetDir)
		:	defaultSkillTarget(projectRoot)
	mkdirSync(dirname(dest), { recursive: true })
	cpSync(src, dest, { recursive: true, force: true })
	return dest
}

const resolveAotCli = (cwd: string): string | undefined => {
	try {
		const req = createRequire(join(resolve(cwd), "package.json"))
		const pkgPath = req.resolve("@ark/aot/package.json")
		const pkgDir = dirname(pkgPath)
		const manifest = JSON.parse(
			readFileSync(pkgPath, "utf8")
		) as PackageManifest
		const bin =
			typeof manifest.bin === "string" ?
				manifest.bin
			:	manifest.bin?.["arktype-precompile"]
		if (bin && existsSync(join(pkgDir, bin))) return join(pkgDir, bin)
		const srcCli = join(pkgDir, "cli.ts")
		if (existsSync(srcCli)) return srcCli
	} catch {
		return undefined
	}
	return undefined
}

const aotSubcommands = new Set(["check", "emit", "declare"])

const runAot = (
	subcommand: string,
	rest: string[],
	cwd: string,
	stderr: (text: string) => void
): number => {
	const cliPath = resolveAotCli(cwd)
	if (!cliPath) {
		const pm = detectPackageManager(cwd)
		const spec =
			arktypeManifest.arkAotVersion ?
				`@ark/aot@${arktypeManifest.arkAotVersion}`
			:	"@ark/aot"
		stderr(
			`@ark/aot is not installed. Install it to run \`ark ${subcommand}\`:\n\n  ${installDevCommand(pm, spec)}\n`
		)
		return 1
	}
	const result = spawnSync(
		process.execPath,
		[cliPath, `--${subcommand}`, ...rest],
		{ cwd, stdio: "inherit" }
	)
	return result.status ?? 1
}

const runInit = (
	args: string[],
	cwd: string,
	stdout: (text: string) => void,
	stderr: (text: string) => void
): number => {
	let parsed: ReturnType<typeof parseArgs>
	try {
		parsed = parseArgs({
			args,
			options: {
				force: { type: "boolean", default: false },
				"no-skill": { type: "boolean", default: false },
				help: { type: "boolean", short: "h", default: false }
			},
			allowPositionals: false
		})
	} catch (e) {
		stderr(`${(e as Error).message}\n`)
		return 1
	}
	if (parsed.values.help) {
		stdout(
			"Usage: ark init [--force] [--no-skill]\n\nDetects your bundler/test runner, writes ark.json, and installs the bundled ArkType skill.\n"
		)
		return 0
	}
	const projectRoot = findProjectRoot(cwd)
	const manifest = readManifest(projectRoot)
	const tools = detectedToolsOf(manifest, projectRoot)
	const settingsPath = join(projectRoot, "ark.json")

	if (manifest?.ark !== undefined) {
		stdout(
			`Found existing "ark" settings in ${join(projectRoot, "package.json")}; leaving ark.json untouched.\n`
		)
	} else if (existsSync(settingsPath) && !parsed.values.force) {
		stdout(
			`ark.json already exists at ${settingsPath} (pass --force to overwrite).\n`
		)
	} else {
		writeFileSync(
			settingsPath,
			`${JSON.stringify({ precompile: {} }, null, "\t")}\n`
		)
		stdout(`Created ${settingsPath}\n`)
	}

	if (!parsed.values["no-skill"]) {
		const dest = installBundledSkill(projectRoot)
		stdout(`Installed ArkType skill to ${dest}\n`)
	}

	if (tools.length) stdout(`Detected tools: ${tools.join(", ")}\n`)
	if (!resolveAotCli(projectRoot)) {
		const pm = detectPackageManager(projectRoot)
		const spec =
			arktypeManifest.arkAotVersion ?
				`@ark/aot@${arktypeManifest.arkAotVersion}`
			:	"@ark/aot"
		stdout(
			`To precompile Types at build time, install @ark/aot:\n  ${installDevCommand(pm, spec)}\n`
		)
	}
	return 0
}

const buildMigrationPrompt = (
	source: MigrationSource | undefined,
	skillDir: string
): string => {
	const fromLabel =
		source === "v2" ? "ArkType 2.x"
		: source ? source
		: "the existing validation library"
	const skillFile = join(skillDir, "SKILL.md")
	const migratingFile = join(skillDir, "references", "migrating.md")
	return [
		`Migrate this codebase from ${fromLabel} to ArkType 3.`,
		`Read ${skillFile} and ${migratingFile} first, then convert schemas, types, and error handling incrementally while keeping typecheck and tests green.`
	].join("\n")
}

const findAgentBinary = (preferred?: string): string | undefined => {
	const candidates = preferred ? [preferred] : ["claude", "codex"]
	for (const cmd of candidates) {
		const probe = spawnSync(cmd, ["--version"], { stdio: "ignore" })
		if (probe.status === 0) return cmd
	}
	return undefined
}

const runMigrate = (
	args: string[],
	cwd: string,
	stdout: (text: string) => void,
	stderr: (text: string) => void
): number => {
	let parsed: ReturnType<typeof parseArgs>
	try {
		parsed = parseArgs({
			args,
			options: {
				run: { type: "boolean", default: false },
				agent: { type: "string" },
				"no-skill": { type: "boolean", default: false },
				help: { type: "boolean", short: "h", default: false }
			},
			allowPositionals: true
		})
	} catch (e) {
		stderr(`${(e as Error).message}\n`)
		return 1
	}
	if (parsed.values.help) {
		stdout(
			`Usage: ark migrate [${migrationSources.join("|")}] [--run] [--agent claude|codex] [--no-skill]\n\nDetects your existing validator, installs the bundled ArkType skill, and prints (or launches) a migration prompt.\n`
		)
		return 0
	}
	const projectRoot = findProjectRoot(cwd)
	const manifest = readManifest(projectRoot)
	const argSource = parsed.positionals[0]
	let source: MigrationSource | undefined
	if (argSource !== undefined) {
		if (!migrationSources.includes(argSource as MigrationSource)) {
			stderr(
				`Unknown migration source "${argSource}". Expected one of: ${migrationSources.join(", ")}\n`
			)
			return 1
		}
		source = argSource as MigrationSource
	} else source = detectMigrationSource(manifest)

	const skillDir =
		parsed.values["no-skill"] ?
			bundledSkillPath()
		:	installBundledSkill(projectRoot)

	if (!parsed.values["no-skill"])
		stdout(`Installed ArkType skill to ${skillDir}\n`)

	const prompt = buildMigrationPrompt(source, skillDir)

	if (parsed.values.run || parsed.values.agent) {
		const requested =
			typeof parsed.values.agent === "string" ? parsed.values.agent : undefined
		const bin = findAgentBinary(requested)
		if (!bin) {
			stderr(
				requested ?
					`Agent CLI "${requested}" not found on PATH.\n`
				:	`Neither "claude" nor "codex" was found on PATH. Run the prompt below in your coding agent:\n\n${prompt}\n`
			)
			return 1
		}
		const result = spawnSync(bin, [prompt], {
			cwd: projectRoot,
			stdio: "inherit"
		})
		return result.status ?? 1
	}

	stdout(`\n${prompt}\n`)
	return 0
}

const runSkill = (
	args: string[],
	cwd: string,
	stdout: (text: string) => void,
	stderr: (text: string) => void
): number => {
	let parsed: ReturnType<typeof parseArgs>
	try {
		parsed = parseArgs({
			args,
			options: {
				dir: { type: "string" },
				help: { type: "boolean", short: "h", default: false }
			},
			allowPositionals: true
		})
	} catch (e) {
		stderr(`${(e as Error).message}\n`)
		return 1
	}
	if (parsed.values.help) {
		stdout(
			"Usage: ark skill [path|install] [--dir <path>]\n\nPrints the path to the bundled ArkType skill or installs it into your project.\n"
		)
		return 0
	}
	const action = parsed.positionals[0] ?? "path"
	if (action === "path") {
		stdout(`${bundledSkillPath()}\n`)
		return 0
	}
	if (action === "install") {
		const projectRoot = findProjectRoot(cwd)
		const target =
			typeof parsed.values.dir === "string" ? parsed.values.dir : undefined
		const dest = installBundledSkill(projectRoot, target)
		stdout(`Installed ArkType skill to ${dest}\n`)
		return 0
	}
	stderr(`Unknown skill action "${action}". Expected "path" or "install".\n`)
	return 1
}

const usage = `Usage: ark <command> [options]

Commands:
  aot <check|emit|declare> [...flags]   Run @ark/aot precompiler commands
  check [...flags]                      Shortcut for \`ark aot check\`
  emit [...flags]                       Shortcut for \`ark aot emit\`
  declare [...flags]                    Shortcut for \`ark aot declare\`
  init [--force] [--no-skill]           Detect setup, write ark.json, install skill
  migrate [source] [--run]              Generate or launch a migration prompt
  skill [path|install] [--dir <path>]   Print path to or install the bundled skill

Options:
  -h, --help                            Show help
  -v, --version                         Show version
`

export const runCli = (argv: string[], ctx: CliContext = {}): number => {
	const cwd = ctx.cwd ?? process.cwd()
	const stdout = ctx.stdout ?? (text => process.stdout.write(text))
	const stderr = ctx.stderr ?? (text => process.stderr.write(text))
	const [cmd, ...rest] = argv

	if (!cmd || cmd === "-h" || cmd === "--help") {
		stdout(usage)
		return 0
	}
	if (cmd === "-v" || cmd === "--version") {
		stdout(`${arktypeManifest.version ?? "unknown"}\n`)
		return 0
	}
	if (aotSubcommands.has(cmd)) return runAot(cmd, rest, cwd, stderr)
	if (cmd === "aot") {
		const [sub, ...subRest] = rest
		if (!sub || sub === "-h" || sub === "--help") {
			stdout("Usage: ark aot <check|emit|declare> [...flags]\n")
			return 0
		}
		if (!aotSubcommands.has(sub)) {
			stderr(
				`Unknown aot subcommand "${sub}". Expected check, emit, or declare.\n`
			)
			return 1
		}
		return runAot(sub, subRest, cwd, stderr)
	}
	if (cmd === "init") return runInit(rest, cwd, stdout, stderr)
	if (cmd === "migrate") return runMigrate(rest, cwd, stdout, stderr)
	if (cmd === "skill") return runSkill(rest, cwd, stdout, stderr)

	stderr(`Unknown command "${cmd}".\n\n${usage}`)
	return 1
}

const isMain = (): boolean => {
	const entry = process.argv[1]
	if (!entry) return false
	try {
		return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url))
	} catch {
		return false
	}
}

if (isMain()) process.exit(runCli(process.argv.slice(2)))
