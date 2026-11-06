import { createHash } from "node:crypto"
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync
} from "node:fs"
import { isBuiltin } from "node:module"
import { basename, dirname, extname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import type {
	PrecompilePluginOptions,
	RenderedDiagnostics,
	TransformedModule
} from "./driver.ts"
import {
	appendSourceMap,
	arkPackageName,
	createNodeHost,
	optedInPackagesOf,
	printablePathOf,
	realPathOf,
	transformedFilterOf
} from "./host.ts"
import { writeUnreadProgramMessage } from "./messages.ts"
import { withEnvironment } from "./presets.ts"
import {
	importsOf,
	isAsset,
	runtimeSpecifier,
	scanProgram,
	type ScannedProgram,
	type ScannedUsage
} from "./scan.ts"
import {
	refuseArktypeDependencies,
	resolvePrecompileOptions,
	withSettingsFile
} from "./settings.ts"
import { checkArktypeVersion } from "./version.ts"
import { createAsyncPrecompiler } from "./worker.ts"

// Turbopack can't serve a module no file holds, and its build cache keeps what
// it listed of a directory and read of a file from one build to the next. So
// the read runs as Next loads next.config, before Turbopack starts, writing all
// a build's modules import and every module's answer: what Turbopack restores
// is then what this build's read wrote, and a file the read changed invalidates
// what reads it, as any changed source does. The units go in
// node_modules/.bin/.ark, odd as that is for modules, as a build resolves them
// from there, and Turbopack denies .next
const binOf = (root: string): string | undefined => {
	for (let dir = root; ; dir = dirname(dir)) {
		const bin = join(dir, "node_modules/.bin")
		if (existsSync(bin)) return bin
		if (dir === dirname(dir)) return
	}
}

export const isProgramUnit = (id: string): boolean =>
	/[/\\]node_modules[/\\]\.bin[/\\]\.ark[/\\]/.test(id)

// one module as a build's read wrote it, which its own loader call answers from
export interface ProgramAnswer extends RenderedDiagnostics {
	sourceHash: string
	code: string | undefined
	files: string[]
	// what each of its imports resolved to, null where that left the program
	imports: Record<string, string | null>
}

interface ProgramDone {
	// why the build writes each module on its own
	refused: string | undefined
	warnings: string[]
}

const hashOf = (text: string) =>
	createHash("sha256").update(text).digest("hex").slice(0, 24)

export const answerFileOf = (dir: string, id: string): string =>
	join(dir, `${hashOf(id)}.json`)

// where next.config's read names its directory for the loader processes
// Turbopack starts, which inherit it from the process loading next.config
const readEnv = "ARK_NEXT_READ"

const programsDirOf = (root: string) =>
	join(root, "node_modules/.cache/ark-programs")

// one for each project and option set, kept from build to build so an answer
// Turbopack's cache holds a module's output against stays the file it read
export const programDirOf = (
	root: string,
	opts: PrecompilePluginOptions
): string => join(programsDirOf(root), hashOf(JSON.stringify(opts)))

export const doneFileOf = (dir: string): string => join(dir, "done.json")

export interface ReadProgramDir {
	dir: string
	// why the build writes each module on its own
	refused: string | undefined
}

// as next.config's wrapper read it for this build
export const programOf = (
	root: string,
	opts: PrecompilePluginOptions
): ReadProgramDir => {
	const dir = programDirOf(root, opts)
	const read = process.env[readEnv]
	if (read !== dir) {
		return {
			dir,
			refused: writeUnreadProgramMessage(
				read === undefined ?
					"next.config doesn't export its config through withPrecompile, which reads the project before Turbopack starts"
				:	"next.config read it from another directory or with other loader options"
			)
		}
	}
	return {
		dir,
		...(JSON.parse(readFileSync(doneFileOf(dir), "utf8")) as Pick<
			ReadProgramDir,
			"refused"
		>)
	}
}

// whether next.config's wrapper read it for this build, under whatever options
export const isProgramRead = (): boolean => process.env[readEnv] !== undefined

// what `next build`'s config wrapper runs, as Next loads next.config
export const readProgram = async (
	root: string,
	opts: PrecompilePluginOptions,
	{ aliases = {}, problem }: ReadSettings = {}
): Promise<ReadProgramDir & ProgramDone> => {
	const dir = programDirOf(root, opts)
	mkdirSync(dir, { recursive: true })
	// another option set's, whose answers a module's cached output may name
	for (const name of readdirSync(dirname(dir))) {
		if (name !== basename(dir) && !name.startsWith("warned-"))
			rmSync(join(dirname(dir), name), { recursive: true, force: true })
	}
	const done =
		problem ?
			refusalOf(problem)
		:	await readAndWrite(root, opts, dir, treeOf(root), aliases).catch(
				(e): ProgramDone => refusalOf(`reading it threw ${String(e)}`)
			)
	// its warnings aside, which each build reports anew
	writeChanged(doneFileOf(dir), JSON.stringify({ refused: done.refused }))
	process.env[readEnv] = dir
	return { dir, ...done }
}

export interface ReadSettings {
	// turbopack.resolveAlias's, for what Turbopack resolves otherwise than Node
	aliases?: Record<string, unknown>
	// what next.config sets that the read can't see past
	problem?: string | undefined
}

const refusalOf = (reason: string): ProgramDone => ({
	refused: writeUnreadProgramMessage(reason),
	warnings: []
})

// left as it is where unchanged, so Turbopack's cache keeps what read it
const writeChanged = (path: string, text: string) => {
	if (existsSync(path) && readFileSync(path, "utf8") === text) return
	writeFileSync(path, text)
}

// what an earlier build's read wrote that this one's doesn't
const removeAllBut = (dir: string, kept: Set<string>) => {
	for (const name of readdirSync(dir)) {
		if (!kept.has(name))
			rmSync(join(dir, name), { recursive: true, force: true })
	}
}

const skippedDirs = new Set([
	"node_modules",
	"public",
	"out",
	"dist",
	"build",
	"coverage",
	"__tests__",
	"__mocks__"
])

const unbuiltFile =
	/\.d\.[cm]?ts$|\.(?:test|spec|stories|config)\.[cm]?[jt]sx?$/

const scriptFile = /\.[cm]?[jt]sx?$/

// a file some loader compiles, whose imports the read can't see
const foreignFile = /\.(?:mdx|vue|svelte|astro)$/

interface Tree {
	scripts: string[]
	foreign: string | undefined
}

// what Next.js may reach without an import the read can see
const treeOf = (root: string): Tree => {
	const tree: Tree = { scripts: [], foreign: undefined }
	const walk = (dir: string) => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			if (entry.name.startsWith(".")) continue
			const path = join(dir, entry.name)
			if (entry.isDirectory()) {
				if (!skippedDirs.has(entry.name)) walk(path)
			} else if (entry.isFile()) {
				if (scriptFile.test(entry.name)) {
					if (!unbuiltFile.test(entry.name)) tree.scripts.push(path)
				} else if (foreignFile.test(entry.name)) tree.foreign ??= path
			}
		}
	}
	walk(root)
	tree.scripts.sort()
	return tree
}

export interface NextConfigLike {
	pageExtensions?: unknown
	turbopack?: { rules?: Record<string, unknown>; resolveAlias?: unknown }
}

const pageExtensions = ["tsx", "ts", "jsx", "js"]

// what next.config sets that has a build see a module otherwise than the read:
// another loader in its rules, whose output's imports the read can't see, this
// loader with two sets of options, or pages of an extension it doesn't read.
// Else the options its rules give this loader
export const nextConfigReadOf = (
	config: NextConfigLike,
	isOwnLoader: (loader: string) => boolean
): { problem: string } | { options: PrecompilePluginOptions } => {
	if (
		config.pageExtensions !== undefined &&
		!(
			Array.isArray(config.pageExtensions) &&
			config.pageExtensions.every(extension =>
				pageExtensions.includes(extension)
			)
		)
	) {
		return {
			problem: "next.config sets pageExtensions, whose pages it can't read"
		}
	}
	const options = new Map<string, PrecompilePluginOptions>()
	for (const item of loadersIn(Object.values(config.turbopack?.rules ?? {}))) {
		const loader = typeof item === "string" ? item : item.loader
		if (typeof loader !== "string")
			return { problem: "next.config runs a loader it can't name" }
		if (!isOwnLoader(loader)) {
			return {
				problem: `next.config runs ${loader}, which may add imports it can't see`
			}
		}
		const given = (typeof item === "string" ? undefined : item.options) ?? {}
		options.set(JSON.stringify(given), given as PrecompilePluginOptions)
	}
	if (options.size > 1) {
		return {
			problem: `next.config runs the loader with ${options.size} sets of options`
		}
	}
	return { options: [...options.values()][0] ?? {} }
}

type LoaderItem = string | { loader: string; options?: unknown }

// a rule's loaders, as `{ loaders: [] }`, `[]` or a list of either
const loadersIn = (rules: unknown[]): LoaderItem[] =>
	rules.flatMap(rule =>
		Array.isArray(rule) ? loadersIn(rule)
		: typeof rule === "string" ? [rule]
		: typeof rule !== "object" || rule === null ? []
		: "loader" in rule ? [rule as LoaderItem]
		: "loaders" in rule && Array.isArray(rule.loaders) ? loadersIn(rule.loaders)
		: []
	)

const directive =
	/^(?:\s|\/\/.*|\/\*[\S\s]*?\*\/)*["']use (?:client|server)["']/

const routeFile = /[/\\](?:src[/\\])?(?:app|pages)[/\\]/

// a project's entries: what nothing it holds imports, and what only a framework
// imports for itself, which reads a module's exports but never writes them
const withRoots = (
	scanned: ScannedProgram,
	root: string,
	scripts: string[]
): ScannedProgram => {
	const imported = new Set(
		Object.values(scanned.targets).flatMap(targets => Object.values(targets))
	)
	const isFrameworks = (id: string) =>
		routeFile.test(`/${relative(root, id)}`) ||
		directive.test(scanned.modules[id]?.source ?? "")
	const entries = scripts.filter(id => !imported.has(id) || isFrameworks(id))
	const reached = new Set<string>()
	const reach = (id: string) => {
		if (reached.has(id)) return
		reached.add(id)
		for (const target of Object.values(scanned.targets[id] ?? {})) reach(target)
	}
	for (const id of entries) reach(id)
	// a cycle nothing outside it imports
	for (const id of scripts) {
		if (reached.has(id)) continue
		entries.push(id)
		reach(id)
	}
	return { ...scanned, entries: entries.sort(), isOneChunk: false }
}

const unitsOf = (written: Record<string, TransformedModule | undefined>) => {
	const units: Record<string, string> = {}
	for (const id in written) Object.assign(units, written[id]?.modules)
	return units
}

const unitNameOf = (specifier: string) =>
	`${specifier.slice("~arktype/".length).replace(/\//g, "-")}.js`

const unitSpecifier = /"(~arktype\/[^"]+)"/g

// its imports of the units, from wherever it sits
const withUnitFiles = (
	code: string,
	from: string,
	unitsDir: string,
	units: Record<string, string>
) =>
	code.replace(unitSpecifier, (whole, specifier: string) => {
		if (!(specifier in units)) return whole
		const path = relative(from, join(unitsDir, unitNameOf(specifier))).replace(
			/\\/g,
			"/"
		)
		return JSON.stringify(path.startsWith(".") ? path : `./${path}`)
	})

const readAndWrite = async (
	root: string,
	opts: PrecompilePluginOptions,
	dir: string,
	{ scripts, foreign }: Tree,
	aliases: Record<string, unknown>
): Promise<ProgramDone> => {
	checkArktypeVersion()
	if (foreign) {
		return refusalOf(
			`${printablePathOf(root, foreign)} may import what it can't see`
		)
	}
	const bin = binOf(root)
	if (!bin) return refusalOf("no node_modules/.bin can hold its modules")
	const host = createNodeHost(opts)
	// a unit imports arktype's runtime from there, which must be the program's
	const [fromUnits, fromRoot] = [dirname(dirname(bin)), root].map(from =>
		host.resolve("arktype/runtime", join(from, "index.js"))
	)
	if (fromUnits !== fromRoot)
		return refusalOf(`${printablePathOf(root, bin)} resolves another arktype`)
	const unitsDir = join(bin, ".ark", hashOf(root))
	const transformedFilter = transformedFilterOf(
		optedInPackagesOf(root, opts.dependencies)
	)
	const isTransformed = (id: string) =>
		transformedFilter.include.test(id) && !transformedFilter.exclude.test(id)
	let queried: string | undefined
	// as Turbopack resolves, which loads next.config after this does: each
	// module's loader call checks each of its imports in its own layer
	const resolveFile = (specifier: string, importer: string) => {
		const aliased = aliasOf(aliases, specifier)
		const resolved =
			aliased === undefined ?
				host.resolve(specifier, importer)
			:	host.resolve(aliased, join(root, "next.config.js"))
		return resolved && realPathOf(resolved.split("?")[0])
	}
	const scanned = await scanProgram(
		"next",
		scripts.map(id => ({ id })),
		{
			resolve: async (specifier, importer) => {
				if (isBuiltin(specifier)) return null
				const query = specifier.indexOf("?")
				const resolved = resolveFile(
					query === -1 ? specifier : specifier.slice(0, query),
					importer
				)
				// what Next serves of its own, holding no validator
				if (resolved === undefined)
					return nextOwnModules.has(specifier) ? null : undefined
				// Turbopack builds a queried module apart, its validators held once
				if (query !== -1 && !isAsset(resolved)) {
					queried ??= `${printablePathOf(root, importer)} imports "${specifier}" with a query`
					return null
				}
				return resolved
			},
			readFile: id => {
				try {
					return readFileSync(id, "utf8")
				} catch {
					return undefined
				}
			},
			isTransformed,
			idOf: id => id,
			cwd: root
		}
	)
	if (typeof scanned === "string") return refusalOf(scanned)
	if (queried) return refusalOf(queried)
	const program = withRoots(scanned, root, scripts)
	// what a module writes is a few imports, its validators created in the units.
	// Each keeps its methods, whose getters throw for a member it lacks, as a
	// module Next generates may import one where the read can't see
	const send = createAsyncPrecompiler({
		precompilerOptions: {
			...opts,
			defers: false,
			members: { methods: true, ...opts.members }
		}
	})
	const sentResolve = async (specifier: string, importer: string) =>
		resolveFile(specifier, importer)
	try {
		const usage = (await send(["scan", program], sentResolve)) as ScannedUsage
		const warnings = [usage.unpruned, usage.lost].filter(
			warning => warning !== undefined
		)
		const written: Record<string, TransformedModule | undefined> = {}
		await Promise.all(
			Object.keys(program.modules).map(async id => {
				const { source, transformed } = program.modules[id]
				if (!transformed) return
				written[id] = (await send(
					[
						"transform",
						source,
						id,
						undefined,
						// a module failing to precompile fails it as it's built, as
						// a bundle's does, each module written on its own meanwhile
						usage.written ? program.key : undefined
					],
					sentResolve
				)) as TransformedModule | undefined
			})
		)
		const units = unitsOf(written)
		mkdirSync(unitsDir, { recursive: true })
		const unitNames = new Set<string>()
		for (const specifier in units) {
			const name = unitNameOf(specifier)
			unitNames.add(name)
			writeChanged(
				join(unitsDir, name),
				withUnitFiles(units[specifier], unitsDir, unitsDir, units)
			)
		}
		removeAllBut(unitsDir, unitNames)
		const answerNames = new Set([basename(doneFileOf(dir))])
		for (const id in program.modules) {
			const { source } = program.modules[id]
			const module = written[id]
			const targets = program.targets[id] ?? {}
			const imports: Record<string, string | null> = {}
			for (const [specifier] of importsOf(id, source).imports) {
				if (!runtimeSpecifier.test(specifier))
					imports[specifier] = targets[specifier] ?? null
			}
			const answer = answerFileOf(dir, id)
			answerNames.add(basename(answer))
			writeChanged(
				answer,
				JSON.stringify({
					sourceHash: hashOf(source),
					code:
						module?.code &&
						appendSourceMap(
							withUnitFiles(module.code, dirname(id), unitsDir, units),
							module.map
						),
					errors: module?.errors ?? [],
					warnings: module?.warnings ?? [],
					files: module?.dependencies ?? [],
					imports
				} satisfies ProgramAnswer)
			)
		}
		removeAllBut(dir, answerNames)
		return { refused: undefined, warnings }
	} finally {
		void send(["close"])
	}
}

// what Next resolves of its own where a project hasn't installed it
const nextOwnModules = new Set(["server-only", "client-only"])

// turbopack.resolveAlias's target for an import, as `{ "@/": "./src/" }` or
// `{ lib: "./src/lib.ts" }`, resolved from the project
const aliasOf = (
	aliases: Record<string, unknown>,
	specifier: string
): string | undefined => {
	for (const from in aliases) {
		const to = aliases[from]
		if (typeof to !== "string") continue
		if (specifier === from) return to
		if (from.endsWith("/") && specifier.startsWith(from))
			return to + specifier.slice(from.length)
		if (from.endsWith("/*") && specifier.startsWith(from.slice(0, -1)))
			return to.replace(/\*$/, "") + specifier.slice(from.length - 1)
	}
}

// a module the read holds, or undefined where it left it; what doesn't match is
// the build reaching a validator the read didn't see
export const programAnswerOf = (
	{ dir }: ReadProgramDir,
	id: string
): ProgramAnswer | undefined => {
	const path = answerFileOf(dir, id)
	return existsSync(path) ?
			(JSON.parse(readFileSync(path, "utf8")) as ProgramAnswer)
		:	undefined
}

// arktype's own, which a linked install resolves out of node_modules, and the
// read doesn't follow as its modules never import a program's
export const isArkFile = (id: string): boolean => {
	for (let dir = dirname(id); ; dir = dirname(dir)) {
		const manifest = join(dir, "package.json")
		if (existsSync(manifest)) {
			return arkPackageName.test(
				(JSON.parse(readFileSync(manifest, "utf8")) as { name?: string })
					.name ?? ""
			)
		}
		if (dir === dirname(dir)) return false
	}
}

export const isSourceRead = (answer: ProgramAnswer, source: string): boolean =>
	answer.sourceHash === hashOf(source)

export const isInProgram = ({ dir }: ReadProgramDir, id: string): boolean =>
	existsSync(answerFileOf(dir, id))

// with ark.json's, where prune: true would be ignored
export const resolvedOptionsOf = (
	set: PrecompilePluginOptions,
	production: boolean
): PrecompilePluginOptions => {
	refuseArktypeDependencies(set, "Turbopack")
	return resolvePrecompileOptions(
		withEnvironment(
			// Next loads a route's modules at its first request, none written as one
			production ? { defers: "large", ...set } : set,
			{ production, testing: false }
		)
	)
}

export const readsWith = (opts: PrecompilePluginOptions): boolean =>
	opts.prune !== false && opts.runtime !== "arktype" && !opts.shadow

// the read withPrecompile runs, under the options next.config gives the loader,
// as each loader process resolves them
export const readProjectWith = async (
	root: string,
	config: NextConfigLike,
	given?: PrecompilePluginOptions
): Promise<{
	refused: string | undefined
	warnings: string[]
	opts: PrecompilePluginOptions
}> => {
	const read = nextConfigReadOf(config, isOwnLoader)
	const opts = resolvedOptionsOf(
		withSettingsFile(given ?? ("options" in read ? read.options : {})),
		true
	)
	if (!readsWith(opts)) return { refused: undefined, warnings: [], opts }
	const { refused, warnings } = await readProgram(root, opts, {
		aliases: (config.turbopack?.resolveAlias ?? {}) as Record<string, unknown>,
		problem: "problem" in read ? read.problem : undefined
	})
	return { refused, warnings, opts }
}

const ownLoader = "@ark/aot/turbopack"

// the loader's module, as a rule may name it by its path
const loaderFile = fileURLToPath(
	new URL(`./turbopack${extname(import.meta.url)}`, import.meta.url)
)

const isOwnLoader = (loader: string) =>
	loader === ownLoader ||
	(existsSync(loader) && realPathOf(loader) === realPathOf(loaderFile))
