import { createHash } from "node:crypto"
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	renameSync,
	rmSync,
	statSync,
	writeFileSync
} from "node:fs"
import { createRequire, isBuiltin } from "node:module"
import { dirname, extname, join, relative } from "node:path"
import { setTimeout as sleep } from "node:timers/promises"
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
	throwBuildError,
	transformedFilterOf
} from "./host.ts"
import {
	writeUnfinishedProgramMessage,
	writeUnreadProgramMessage
} from "./messages.ts"
import {
	importsOf,
	isAsset,
	runtimeSpecifier,
	scanProgram,
	type ScannedProgram,
	type ScannedUsage
} from "./scan.ts"
import { checkArktypeVersion } from "./version.ts"
import { createAsyncPrecompiler } from "./worker.ts"

// Turbopack can't serve a module no file holds, and keeps what it first lists
// of a directory for the whole build. So whatever its modules import must be
// on disk before the first of them is answered, which is why a build reads its
// program up front. The files go in node_modules/.bin/.ark, odd as that is for
// modules, as it's the one place a build probed could resolve them from: there
// as the build starts, and never listed by Turbopack. node_modules/.cache fails
// on a new install, which lacks it, and Turbopack denies .next
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
	// what it read from outside the tree that names it, by file
	outside: Record<string, string>
}

export interface LoaderResolve {
	(context: string, request: string): Promise<string>
}

const hashOf = (text: string) =>
	createHash("sha256").update(text).digest("hex").slice(0, 24)

const answerFileOf = (dir: string, id: string) =>
	join(dir, `${hashOf(id)}.json`)

// each process of the pool asks once
const programs: Record<string, Promise<ReadProgramDir>> = {}

export interface ReadProgramDir extends ProgramDone {
	dir: string
	// the process that read it reports what it found
	isReader: boolean
}

export const programOf = (
	root: string,
	opts: PrecompilePluginOptions,
	resolve: LoaderResolve
): Promise<ReadProgramDir> =>
	(programs[`${root}\0${JSON.stringify(opts)}`] ??= awaitProgram(
		root,
		opts,
		resolve
	))

// every process of a build shares its parent, and a build starts by clearing
// .next, so a build reads its project once and the next reads it again, the
// precompiler's cache answering what didn't change
const buildKeyOf = (
	root: string,
	opts: PrecompilePluginOptions,
	tree: Tree
) => {
	const hash = createHash("sha256").update(JSON.stringify(opts))
	try {
		hash.update(`${statSync(join(root, ".next/package.json")).mtimeMs}`)
	} catch {
		// where distDir moved it, a build is known by what it reads
	}
	for (const id of tree.scripts) hash.update(id).update(readFileSync(id))
	return `${process.ppid}-${hash.digest("hex").slice(0, 24)}`
}

const isOutsideUnchanged = ({ outside }: ProgramDone) => {
	for (const id in outside) {
		if (!existsSync(id) || hashOf(readFileSync(id, "utf8")) !== outside[id])
			return false
	}
	return true
}

const programsDirOf = (root: string) =>
	join(root, "node_modules/.cache/ark-programs")

export const programDirOf = (
	root: string,
	opts: PrecompilePluginOptions
): string => join(programsDirOf(root), buildKeyOf(root, opts, treeOf(root)))

// as long as a read of the largest project would take, to fail what would hang
const readTimeoutMs = 30 * 60_000

const awaitProgram = async (
	root: string,
	opts: PrecompilePluginOptions,
	resolve: LoaderResolve
): Promise<ReadProgramDir> => {
	const tree = treeOf(root)
	const base = programsDirOf(root)
	const dir = join(base, buildKeyOf(root, opts, tree))
	const done = join(dir, "done.json")
	const lock = join(dir, "reading")
	const refusedBy = (e: unknown): ProgramDone => ({
		refused: writeUnreadProgramMessage(`reading it threw ${String(e)}`),
		warnings: [],
		outside: {}
	})
	try {
		mkdirSync(dir, { recursive: true })
	} catch (e) {
		return { dir, isReader: true, ...refusedBy(e) }
	}
	const startedAt = Date.now()
	while (Date.now() - startedAt < readTimeoutMs) {
		if (existsSync(done)) {
			const read = JSON.parse(readFileSync(done, "utf8")) as ProgramDone
			if (isOutsideUnchanged(read)) return { dir, isReader: false, ...read }
			rmSync(done, { force: true })
		}
		let isReader = true
		try {
			mkdirSync(lock)
		} catch {
			isReader = false
		}
		if (!isReader) {
			if (!isHolderAlive(lock)) rmSync(lock, { recursive: true, force: true })
			await sleep(20)
			continue
		}
		// it may have finished as this process looked
		if (existsSync(done)) {
			rmSync(lock, { recursive: true, force: true })
			continue
		}
		writeFileSync(join(lock, "pid"), `${process.pid}`)
		removeFinishedPrograms(base, dir)
		const read = await readAndWrite(root, opts, resolve, dir, tree).catch(
			refusedBy
		)
		writeAtomically(done, JSON.stringify(read))
		rmSync(lock, { recursive: true, force: true })
		return { dir, isReader: true, ...read }
	}
	return throwBuildError(writeUnfinishedProgramMessage(readTimeoutMs / 60_000))
}

const isAlive = (pid: number) => {
	try {
		process.kill(pid, 0)
		return true
	} catch {
		return false
	}
}

const isHolderAlive = (lock: string) => {
	try {
		return isAlive(Number(readFileSync(join(lock, "pid"), "utf8")))
	} catch {
		// the holder hasn't written it yet, or has just finished
		return true
	}
}

const removeFinishedPrograms = (base: string, own: string) => {
	for (const name of readdirSync(base)) {
		const path = join(base, name)
		if (path !== own && !isAlive(Number(name.split("-")[0])))
			rmSync(path, { recursive: true, force: true })
	}
}

const writeAtomically = (path: string, text: string) => {
	const temp = `${path}.${process.pid}.tmp`
	writeFileSync(temp, text)
	renameSync(temp, path)
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

// it imports arktype, which each process answering from a read needn't load
const readConfigRules = () =>
	createRequire(import.meta.url)(
		`./pluginCalls${extname(import.meta.url)}`
	) as typeof import("./pluginCalls.ts")

const nextConfigFiles = [
	"next.config.js",
	"next.config.mjs",
	"next.config.ts",
	"next.config.mts",
	"next.config.cjs"
]

// what next.config may do that the read can't see. It's read rather than run,
// as only Next.js's own process expects to run it
const nextConfigProblemOf = (root: string): string | undefined => {
	const name = nextConfigFiles.find(name => existsSync(join(root, name)))
	if (!name) return
	const source = readFileSync(join(root, name), "utf8")
	if (source.includes("turbopackFileSystemCacheForBuild"))
		return `${name} sets turbopackFileSystemCacheForBuild, which keeps a module's output past a change to a module that reads it`
	if (source.includes("pageExtensions"))
		return `${name} sets pageExtensions, whose pages it can't read`
	return readConfigRules().turbopackRulesProblemOf(join(root, name), source)
}

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
	resolve: LoaderResolve,
	dir: string,
	{ scripts, foreign }: Tree
): Promise<ProgramDone> => {
	const refusal = (reason: string): ProgramDone => ({
		refused: writeUnreadProgramMessage(reason),
		warnings: [],
		outside: {}
	})
	checkArktypeVersion()
	const problem = nextConfigProblemOf(root)
	if (problem) return refusal(problem)
	if (foreign) {
		return refusal(
			`${printablePathOf(root, foreign)} may import what it can't see`
		)
	}
	const bin = binOf(root)
	if (!bin) return refusal("no node_modules/.bin can hold its modules")
	// a unit imports arktype's runtime from there, which must be the program's
	const [fromUnits, fromRoot] = await Promise.all(
		[dirname(dirname(bin)), root].map(from =>
			resolve(from, "arktype/runtime").catch(() => undefined)
		)
	)
	if (fromUnits !== fromRoot)
		return refusal(`${printablePathOf(root, bin)} resolves another arktype`)
	const unitsDir = join(bin, ".ark", hashOf(root))
	const transformedFilter = transformedFilterOf(
		optedInPackagesOf(root, opts.dependencies)
	)
	const isTransformed = (id: string) =>
		transformedFilter.include.test(id) && !transformedFilter.exclude.test(id)
	const host = createNodeHost(opts)
	let queried: string | undefined
	const scanned = await scanProgram(
		"next",
		scripts.map(id => ({ id })),
		{
			resolve: async (specifier, importer) => {
				if (isBuiltin(specifier)) return null
				// not by Turbopack first, as it would answer for the layer of whichever
				// module asked first, where each module's call checks its own
				const resolved =
					host.resolve(specifier, importer) ??
					(await resolve(dirname(importer), specifier).catch(() => undefined))
				if (resolved === undefined) return
				const file = realPathOf(resolved.split("?")[0])
				// Turbopack builds a queried module apart, its validators held once
				if (`${specifier}${resolved}`.includes("?") && !isAsset(resolved)) {
					queried ??= `${printablePathOf(root, importer)} imports "${specifier}" with a query`
					return null
				}
				return file
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
	if (typeof scanned === "string") return refusal(scanned)
	if (queried) return refusal(queried)
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
	const bundlerResolve = (specifier: string, importer: string) =>
		resolve(dirname(importer), specifier).then(realPathOf, () => undefined)
	try {
		const usage = (await send(
			["scan", program],
			bundlerResolve
		)) as ScannedUsage
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
					bundlerResolve
				)) as TransformedModule | undefined
			})
		)
		const units = unitsOf(written)
		// what an earlier read of the project wrote, nothing the modules read
		rmSync(unitsDir, { recursive: true, force: true })
		mkdirSync(unitsDir, { recursive: true })
		for (const specifier in units) {
			writeFileSync(
				join(unitsDir, unitNameOf(specifier)),
				withUnitFiles(units[specifier], unitsDir, unitsDir, units)
			)
		}
		const inTree = new Set(scripts)
		const outside: Record<string, string> = {}
		for (const id in program.modules) {
			const { source } = program.modules[id]
			if (!inTree.has(id)) outside[id] = hashOf(source)
			const module = written[id]
			const targets = program.targets[id] ?? {}
			const imports: Record<string, string | null> = {}
			for (const [specifier] of importsOf(id, source).imports) {
				if (!runtimeSpecifier.test(specifier))
					imports[specifier] = targets[specifier] ?? null
			}
			writeFileSync(
				answerFileOf(dir, id),
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
		return { refused: undefined, warnings, outside }
	} finally {
		void send(["close"])
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
