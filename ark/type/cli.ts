#!/usr/bin/env node
import { spawnSync } from "node:child_process"
import {
	constants,
	copyFileSync,
	existsSync,
	lstatSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	realpathSync,
	statSync,
	unlinkSync,
	writeFileSync,
	type Stats
} from "node:fs"
import { createRequire } from "node:module"
import {
	basename,
	dirname,
	isAbsolute,
	join,
	relative,
	resolve,
	sep
} from "node:path"
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
		return JSON.parse(
			readFileSync(path, "utf8").replace(/^\uFEFF/, "")
		) as PackageManifest
	} catch {
		return undefined
	}
}

const locateProjectRoot = (startDir: string): string | undefined => {
	for (let dir = resolve(startDir); ; dir = dirname(dir)) {
		if (existsSync(join(dir, "package.json"))) return dir
		const parent = dirname(dir)
		if (parent === dir) return undefined
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
	if (arkVer) {
		const normalized = arkVer.replace(/([<>]=?|=|\^|~)\s+/g, "$1")
		if (
			/(?:^|[\s|]|workspace:)(?:[<>]=|=|\^|~)?v?2(?=$|[\s.|-])/.test(normalized)
		)
			return "v2"
	}
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

export type InstallSkillOptions = {
	allowOutside?: boolean
	cwd?: string
}

const lstatIfExists = (path: string): Stats | undefined => {
	try {
		return lstatSync(path)
	} catch (e) {
		if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined
		throw e
	}
}

const isWithinDir = (root: string, target: string): boolean => {
	const rel = relative(root, target)
	return (
		rel === "" ||
		(rel !== ".." &&
			!rel.startsWith(`..${sep}`) &&
			!rel.startsWith("../") &&
			!isAbsolute(rel))
	)
}

const resolveSafeSkillDir = (
	projectRoot: string,
	dest: string,
	explicitDir: boolean,
	allowOutside: boolean
): string => {
	const realRoot = realpathSync(projectRoot)
	// walk up via lstat so dangling symlinks are detected instead of skipped
	let cur = dest
	let stat = lstatIfExists(cur)
	while (!stat) {
		const parent = dirname(cur)
		if (parent === cur) break
		cur = parent
		stat = lstatIfExists(cur)
	}
	let resolvedAncestor: string
	if (stat?.isSymbolicLink()) {
		try {
			resolvedAncestor = realpathSync(cur)
		} catch {
			throw new Error(
				`Refusing to install skill through dangling symlink ${cur}`
			)
		}
		if (!statSync(resolvedAncestor).isDirectory()) {
			throw new Error(
				`Cannot install skill to ${dest}: ${cur} resolves to ${resolvedAncestor}, which is not a directory`
			)
		}
	} else if (stat && !stat.isDirectory()) {
		throw new Error(
			`Cannot install skill to ${dest}: ${cur} is not a directory`
		)
	} else resolvedAncestor = realpathSync(cur)

	const resolvedDest = join(resolvedAncestor, relative(cur, dest))
	if (!explicitDir && !allowOutside && !isWithinDir(realRoot, resolvedDest)) {
		throw new Error(
			`Refusing to install skill to ${dest}: resolves to ${resolvedDest}, outside project root ${realRoot} (pass --allow-outside to allow)`
		)
	}
	return resolvedDest
}

const validateSkillTree = (srcDir: string, destDir: string): void => {
	for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
		const srcPath = join(srcDir, entry.name)
		const destPath = join(destDir, entry.name)
		const destStat = lstatIfExists(destPath)
		if (destStat?.isSymbolicLink())
			throw new Error(`Refusing to write through symlink at ${destPath}`)
		if (entry.isDirectory()) {
			if (destStat && !destStat.isDirectory()) {
				throw new Error(
					`Cannot create directory at ${destPath}: path exists and is not a directory`
				)
			}
			validateSkillTree(srcPath, destPath)
		} else if (entry.isFile() && destStat && !destStat.isFile()) {
			throw new Error(
				`Cannot write file at ${destPath}: path exists and is not a regular file`
			)
		}
	}
}

const copySkillTree = (srcDir: string, destDir: string): void => {
	for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
		const srcPath = join(srcDir, entry.name)
		const destPath = join(destDir, entry.name)
		const destStat = lstatIfExists(destPath)
		if (destStat?.isSymbolicLink())
			throw new Error(`Refusing to write through symlink at ${destPath}`)
		if (entry.isDirectory()) {
			if (destStat && !destStat.isDirectory()) {
				throw new Error(
					`Cannot create directory at ${destPath}: path exists and is not a directory`
				)
			}
			if (!destStat) mkdirSync(destPath)
			copySkillTree(srcPath, destPath)
		} else if (entry.isFile()) {
			if (destStat) {
				if (!destStat.isFile()) {
					throw new Error(
						`Cannot write file at ${destPath}: path exists and is not a regular file`
					)
				}
				unlinkSync(destPath)
			}
			copyFileSync(srcPath, destPath, constants.COPYFILE_EXCL)
		}
	}
}

type PreparedSkillInstall = {
	dest: string
	realSrc: string
	resolvedDest: string
}

const resolveExplicitSkillTarget = (cwd: string, targetDir: string): string => {
	const resolved = resolve(cwd, targetDir)
	return basename(resolved) === "arktype" ? resolved : join(resolved, "arktype")
}

const prepareSkillInstall = (
	projectRoot: string,
	targetDir?: string,
	opts?: InstallSkillOptions
): PreparedSkillInstall => {
	const src = bundledSkillPath()
	const dest =
		targetDir !== undefined ?
			resolveExplicitSkillTarget(opts?.cwd ?? process.cwd(), targetDir)
		:	defaultSkillTarget(projectRoot)
	const resolvedDest = resolveSafeSkillDir(
		projectRoot,
		dest,
		targetDir !== undefined,
		Boolean(opts?.allowOutside)
	)
	const realSrc = realpathSync(src)
	if (
		isWithinDir(realSrc, resolvedDest) ||
		isWithinDir(resolvedDest, realSrc)
	) {
		throw new Error(
			`Refusing to install skill to ${dest}: destination overlaps bundled skill source ${realSrc}`
		)
	}
	validateSkillTree(realSrc, resolvedDest)
	return { dest, realSrc, resolvedDest }
}

const applySkillInstall = ({
	dest,
	realSrc,
	resolvedDest
}: PreparedSkillInstall): string => {
	mkdirSync(resolvedDest, { recursive: true })
	copySkillTree(realSrc, resolvedDest)
	return dest
}

export const installBundledSkill = (
	projectRoot: string,
	targetDir?: string,
	opts?: InstallSkillOptions
): string =>
	applySkillInstall(prepareSkillInstall(projectRoot, targetDir, opts))

type FoundAotPackage = {
	pkgDir: string
	manifest: PackageManifest
}

const findAotManifest = (startDir: string): FoundAotPackage | undefined => {
	for (let dir = startDir; ; dir = dirname(dir)) {
		const manifest = readManifest(dir)
		if (manifest?.name === "@ark/aot") return { pkgDir: dir, manifest }
		const parent = dirname(dir)
		if (parent === dir) return undefined
	}
}

const findAotInNodeModules = (cwd: string): FoundAotPackage | undefined => {
	for (let dir = resolve(cwd); ; dir = dirname(dir)) {
		const pkgDir = join(dir, "node_modules", "@ark", "aot")
		const manifest = readManifest(pkgDir)
		if (manifest?.name === "@ark/aot") return { pkgDir, manifest }
		const parent = dirname(dir)
		if (parent === dir) return undefined
	}
}

const findAotViaRequire = (cwd: string): FoundAotPackage | undefined => {
	const req = createRequire(join(resolve(cwd), "package.json"))
	try {
		const found = findAotManifest(dirname(req.resolve("@ark/aot")))
		if (found) return found
	} catch {
		// fall back to resolving package.json directly when root entry isn't available
	}
	try {
		const pkgPath = req.resolve("@ark/aot/package.json")
		const pkgDir = dirname(pkgPath)
		const manifest = readManifest(pkgDir)
		if (manifest) return { pkgDir, manifest }
	} catch {
		return undefined
	}
	return undefined
}

const resolveAotCli = (cwd: string): string | undefined => {
	// Yarn PnP has no node_modules on disk; resolve through Node's module hooks
	// (avoiding NODE_PATH leaks from pnpm bin shims in non-PnP environments)
	const found =
		findAotInNodeModules(cwd) ??
		("pnp" in process.versions ? findAotViaRequire(cwd) : undefined)
	if (!found) return undefined
	const { pkgDir } = found
	const builtCli = join(pkgDir, "out", "cli.js")
	if (existsSync(builtCli)) return builtCli
	const srcCli = join(pkgDir, "cli.ts")
	if (existsSync(srcCli)) return srcCli
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

const hasArkPrecompileSetting = (
	manifest: PackageManifest | undefined
): boolean =>
	typeof manifest?.ark === "object" &&
	manifest.ark !== null &&
	Object.prototype.hasOwnProperty.call(manifest.ark, "precompile")

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
				"allow-outside": { type: "boolean", default: false },
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
			"Usage: ark init [--force] [--no-skill] [--allow-outside]\n\nDetects your bundler/test runner, writes ark.json, and installs the bundled ArkType skill.\n"
		)
		return 0
	}
	const projectRoot = locateProjectRoot(cwd)
	if (!projectRoot) {
		stderr(
			`No package.json found in ${resolve(cwd)} or any parent directory. Run \`ark init\` inside a JavaScript/TypeScript project.\n`
		)
		return 1
	}
	const manifest = readManifest(projectRoot)
	const tools = detectedToolsOf(manifest, projectRoot)
	const settingsPath = join(projectRoot, "ark.json")
	const settingsContent = `${JSON.stringify(
		{
			$schema: "./node_modules/@ark/aot/ark.schema.json",
			precompile: {}
		},
		null,
		"\t"
	)}\n`
	const hasSettings = hasArkPrecompileSetting(manifest)

	let existingSettings: Stats | undefined
	if (!hasSettings && parsed.values.force) {
		existingSettings = lstatIfExists(settingsPath)
		if (existingSettings?.isSymbolicLink()) {
			stderr(`Refusing to overwrite symlink at ${settingsPath}.\n`)
			return 1
		}
		if (existingSettings && !existingSettings.isFile()) {
			stderr(`Cannot write ${settingsPath}: path is not a regular file.\n`)
			return 1
		}
	}

	let preparedSkill: PreparedSkillInstall | undefined
	if (!parsed.values["no-skill"]) {
		try {
			preparedSkill = prepareSkillInstall(projectRoot, undefined, {
				allowOutside: Boolean(parsed.values["allow-outside"])
			})
		} catch (e) {
			stderr(`${(e as Error).message}\n`)
			return 1
		}
	}

	if (hasSettings) {
		stdout(
			`Found existing "ark" settings in ${join(projectRoot, "package.json")}; leaving ark.json untouched.\n`
		)
	} else if (parsed.values.force) {
		try {
			if (existingSettings) unlinkSync(settingsPath)
			writeFileSync(settingsPath, settingsContent, { flag: "wx" })
		} catch (e) {
			stderr(`Failed to write ${settingsPath}: ${(e as Error).message}\n`)
			return 1
		}
		stdout(`Created ${settingsPath}\n`)
	} else {
		// lstat before writing: on Windows, the "wx" flag follows a dangling
		// symlink and creates its target (possibly outside the project) instead
		// of failing with EEXIST as POSIX does. "wx" stays as the defense
		// against a file appearing between the lstat and the write.
		const reportExisting = (stat: Stats | undefined) => {
			const detail =
				stat?.isSymbolicLink() ? "symlink"
				: stat?.isDirectory() ? "directory"
				: stat && !stat.isFile() ? "not a regular file"
				: "pass --force to overwrite"
			stdout(`ark.json already exists at ${settingsPath} (${detail}).\n`)
		}
		const stat = lstatIfExists(settingsPath)
		if (stat) reportExisting(stat)
		else {
			try {
				writeFileSync(settingsPath, settingsContent, { flag: "wx" })
				stdout(`Created ${settingsPath}\n`)
			} catch (e) {
				const code = (e as NodeJS.ErrnoException).code
				if (code === "EEXIST" || code === "EISDIR")
					reportExisting(lstatIfExists(settingsPath))
				else {
					stderr(`Failed to write ${settingsPath}: ${(e as Error).message}\n`)
					return 1
				}
			}
		}
	}

	if (preparedSkill) {
		try {
			const dest = applySkillInstall(preparedSkill)
			stdout(`Installed ArkType skill to ${dest}\n`)
		} catch (e) {
			stderr(`${(e as Error).message}\n`)
			return 1
		}
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
	const skillFile = join(skillDir, "SKILL.md")
	if (source === "v2") {
		return [
			"Migrate this codebase from ArkType 2.x to ArkType 3.",
			`Read the "Upgrading from ArkType 2" section of ${skillFile} and https://arktype.io/docs/upgrading.md first, then upgrade schemas, types, and error handling incrementally while keeping typecheck and tests green.`
		].join("\n")
	}
	const fromLabel = source ?? "the existing validation library"
	const migratingFile = join(skillDir, "references", "migrating.md")
	return [
		`Migrate this codebase from ${fromLabel} to ArkType 3.`,
		`Read ${skillFile} and ${migratingFile} first, then convert schemas, types, and error handling incrementally while keeping typecheck and tests green.`
	].join("\n")
}

export type AgentCommand = {
	command: string
	args: string[]
}

const winShimJsPattern = /["']%(?:~dp0|dp0%)[/\\]?([^\n\r"']+?\.[cm]?js)["']/gi
const winShimExePattern = /["']%(?:~dp0|dp0%)[/\\]?([^\n\r"']+?\.exe)["']/gi
const winRunnableExts = new Set([".exe", ".com", ".cmd", ".bat"])

export const unwrapWindowsCmdShim = (
	shimPath: string,
	nodeExecPath = process.execPath
): AgentCommand | undefined => {
	let text: string
	try {
		text = readFileSync(shimPath, "utf8")
	} catch {
		return undefined
	}
	const dir = dirname(shimPath)
	const resolveTarget = (raw: string) =>
		resolve(dir, ...raw.split(/[/\\]+/).filter(Boolean))
	for (const match of text.matchAll(winShimJsPattern)) {
		const target = resolveTarget(match[1])
		if (statSync(target, { throwIfNoEntry: false })?.isFile())
			return { command: nodeExecPath, args: [target] }
	}
	for (const match of text.matchAll(winShimExePattern)) {
		const target = resolveTarget(match[1])
		if (basename(target).toLowerCase() === "node.exe") continue
		if (statSync(target, { throwIfNoEntry: false })?.isFile())
			return { command: target, args: [] }
	}
	return undefined
}

export const resolveWindowsAgentCandidates = (
	cmd: string,
	env: NodeJS.ProcessEnv = process.env,
	nodeExecPath = process.execPath
): AgentCommand[] => {
	const rawPathExt = (env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD")
		.split(";")
		.map(ext => ext.trim().toLowerCase())
		.filter(ext => winRunnableExts.has(ext))
	const exts = rawPathExt.length ? rawPathExt : [".exe", ".com", ".cmd", ".bat"]
	const lowerCmd = cmd.toLowerCase()
	const hasExt = [...winRunnableExts].some(ext => lowerCmd.endsWith(ext))
	const paths: string[] = []
	if (cmd.includes("/") || cmd.includes("\\")) {
		const base = resolve(cmd)
		if (hasExt) paths.push(base)
		else for (const ext of exts) paths.push(`${base}${ext}`)
	} else {
		const pathEntries = (env.PATH ?? env.Path ?? "")
			.split(";")
			.map(entry => entry.trim().replace(/^"(.*)"$/, "$1"))
			.filter(Boolean)
		for (const dir of pathEntries) {
			if (hasExt) paths.push(join(dir, cmd))
			else for (const ext of exts) paths.push(join(dir, `${cmd}${ext}`))
		}
	}
	const commands: AgentCommand[] = []
	for (const candidate of paths) {
		if (!statSync(candidate, { throwIfNoEntry: false })?.isFile()) continue
		if (/\.(?:cmd|bat)$/i.test(candidate)) {
			const unwrapped = unwrapWindowsCmdShim(candidate, nodeExecPath)
			if (unwrapped) commands.push(unwrapped)
		} else commands.push({ command: candidate, args: [] })
	}
	return commands
}

const findAgentBinary = (preferred?: string): AgentCommand | undefined => {
	const candidates = preferred ? [preferred] : ["claude", "codex"]
	for (const cmd of candidates) {
		const commands: AgentCommand[] =
			process.platform === "win32" ?
				resolveWindowsAgentCandidates(cmd)
			:	[{ command: cmd, args: [] }]
		for (const resolved of commands) {
			const probe = spawnSync(
				resolved.command,
				[...resolved.args, "--version"],
				{ stdio: "ignore" }
			)
			if (probe.status === 0) return resolved
		}
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
				"allow-outside": { type: "boolean", default: false },
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
			`Usage: ark migrate [${migrationSources.join("|")}] [--run] [--agent claude|codex] [--no-skill] [--allow-outside]\n\nDetects your existing validator, installs the bundled ArkType skill, and prints (or launches) a migration prompt.\n`
		)
		return 0
	}
	const foundRoot = locateProjectRoot(cwd)
	if (!parsed.values["no-skill"] && !foundRoot) {
		stderr(
			`No package.json found in ${resolve(cwd)} or any parent directory. Run \`ark migrate\` inside a project, or pass --no-skill.\n`
		)
		return 1
	}
	const projectRoot = foundRoot ?? resolve(cwd)
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

	let skillDir: string
	if (parsed.values["no-skill"]) skillDir = bundledSkillPath()
	else {
		try {
			skillDir = installBundledSkill(projectRoot, undefined, {
				allowOutside: Boolean(parsed.values["allow-outside"])
			})
		} catch (e) {
			stderr(`${(e as Error).message}\n`)
			return 1
		}
		stdout(`Installed ArkType skill to ${skillDir}\n`)
	}

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
		const result = spawnSync(bin.command, [...bin.args, prompt], {
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
				"allow-outside": { type: "boolean", default: false },
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
			"Usage: ark skill [path|install] [--dir <path>] [--allow-outside]\n\nPrints the path to the bundled ArkType skill or installs it into your project. With --dir <path> (resolved from cwd), installs to <path>/arktype unless <path> already ends in arktype.\n"
		)
		return 0
	}
	const action = parsed.positionals[0] ?? "path"
	if (action === "path") {
		stdout(`${bundledSkillPath()}\n`)
		return 0
	}
	if (action === "install") {
		const target =
			typeof parsed.values.dir === "string" ? parsed.values.dir : undefined
		const foundRoot = locateProjectRoot(cwd)
		if (target === undefined && !foundRoot) {
			stderr(
				`No package.json found in ${resolve(cwd)} or any parent directory. Run \`ark skill install\` inside a project, or pass --dir <path>.\n`
			)
			return 1
		}
		const projectRoot = foundRoot ?? resolve(cwd)
		try {
			const dest = installBundledSkill(projectRoot, target, {
				allowOutside: Boolean(parsed.values["allow-outside"]),
				cwd
			})
			stdout(`Installed ArkType skill to ${dest}\n`)
			return 0
		} catch (e) {
			stderr(`${(e as Error).message}\n`)
			return 1
		}
	}
	stderr(`Unknown skill action "${action}". Expected "path" or "install".\n`)
	return 1
}

const usage = `Usage: ark <command> [options]

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
