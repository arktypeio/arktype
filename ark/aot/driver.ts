import { flatMorph, throwError } from "@ark/util"
import { existsSync } from "node:fs"
import { isAbsolute, resolve } from "node:path"
import type { SourceMap } from "magic-string"
import {
	parentPort,
	receiveMessageOnPort,
	workerData,
	type MessagePort
} from "node:worker_threads"
import {
	appendSourceMap,
	createNodeHost,
	printablePathOf,
	realPathOf,
	type NodeHostOptions,
	type PrecompileHost
} from "./host.ts"
import {
	AnswerCache,
	createSnapshotCheck,
	emptySnapshot,
	hashOf,
	mtimeOf,
	type Snapshot,
	type SnapshotCheck
} from "./cache.ts"
import { renderDiagnostic, type Diagnostic } from "./diagnostics.ts"
import {
	writeUnansweredResolveMessage,
	writeUnreproducedScanMessage
} from "./messages.ts"
import {
	Precompiler,
	type ArkPackage,
	type PrecompiledModule,
	type PrecompileOptions,
	type ReadProgram
} from "./precompile.ts"
import type { ScannedProgram, ScannedUsage } from "./scan.ts"
import type { Site } from "./sites.ts"
import { settingsPathsOf, withSettingsFile } from "./settings.ts"
import { isPrecompilerWorker } from "./worker.ts"

export interface PrecompilePluginOptions
	extends PrecompileOptions,
		NodeHostOptions {}

export const createPrecompiler = (
	opts?: PrecompilePluginOptions
): Precompiler => {
	const cwd = realPathOf(opts?.cwd ?? process.cwd())
	return new Precompiler(createNodeHost(opts), {
		...opts,
		cwd,
		config:
			typeof opts?.config === "string" ?
				resolve(cwd, opts.config)
			:	opts?.config
	})
}

export interface RenderedDiagnostics {
	errors: string[]
	warnings: string[]
}

const renderDiagnostics = (
	diagnostics: Diagnostic[],
	pathOf: (id: string) => string
): RenderedDiagnostics => {
	const errors: string[] = []
	const warnings: string[] = []
	for (const diagnostic of diagnostics) {
		;(diagnostic.severity === "error" ? errors : warnings).push(
			renderDiagnostic({ ...diagnostic, file: pathOf(diagnostic.file) })
		)
	}
	return { errors, warnings }
}

export interface PrecompilerWorkerData {
	precompilerOptions: PrecompilePluginOptions
	// where Node runs each dependency as published, as for --emit
	leavesDependencies?: boolean | undefined
	// for a host that waits synchronously
	port?: MessagePort | undefined
	answered?: Int32Array | undefined
	// closes as the thread stops, so a host waiting synchronously hears it
	lifeline?: MessagePort | undefined
	// asks the bundler what the precompiler can't resolve, waiting on resolved
	resolver?: MessagePort | undefined
	resolved?: Int32Array | undefined
	resolveTimeout?: number | undefined
}

export type PrecompileRequest =
	| [
			kind: "transform",
			source: string,
			id: string,
			mappings?: string | undefined,
			program?: string | undefined
	  ]
	| [kind: "scan", program: ScannedProgram]
	| [kind: "unseen", program: ScannedProgram]
	// a program holding what the loaders after the plugin built of each module
	| [kind: "unseenBuilt", program: ScannedProgram]
	| [kind: "program", program: ReadProgram]
	| [kind: "check", source: string, id: string]
	| [
			kind: "checkUnwritten",
			source: string,
			id: string,
			mappings?: string | undefined
	  ]
	| [kind: "lint", source: string, id: string]
	| [kind: "readDependency", importer: string]
	| [kind: "readDependencies", ids: string[]]
	| [kind: "reset"]
	| [kind: "refresh"]
	| [kind: "close"]

export interface InlineModule extends RenderedDiagnostics {
	// undefined when the module is unchanged
	code: string | undefined
}

export interface TransformedModule extends InlineModule {
	map: SourceMap | undefined
	dependencies: string[]
	modules: Record<string, string>
	foldedHelpers: string[]
}

export type PrecompileAnswer = { result: unknown } | { error: unknown }

export interface CheckedModule {
	sites: Pick<Site, "start" | "end" | "line" | "column" | "status">[]
	diagnostics: Diagnostic[]
}

const answerRequests = (
	port: MessagePort,
	data: PrecompilerWorkerData
): void => {
	let tracked: TrackedPrecompiler | undefined
	let conflictsWithThread = false
	// the request it's answering, by its place among those it was sent
	let answering = -1
	let unasked = false
	const resolveInBundler = bundlerResolverOf(
		data,
		() => answering,
		() => (unasked = true),
		// what it read before it stopped waiting may be partial
		() => (tracked = undefined)
	)
	const track = () =>
		createTrackedPrecompiler(
			data.precompilerOptions,
			resolveInBundler,
			!!data.leavesDependencies
		)
	// kept across the resets that keep the precompiler, as a rebuild asks again
	// for modules nothing changed
	let transformedById: Record<string, KeptModule> = {}
	// each program the build scanned, by the key its transforms name
	let scansByProgram: Record<string, Scan> = {}
	// the precompiler holding a scan's usage: where the cache answered it, a new
	// one scans it again for a module unlike those the cache holds, and must
	// write what the cache gave the bundler
	const scanned = (scan: Scan): TrackedPrecompiler => {
		if (scan.tracked) return viewing(scan.tracked, scan)
		const { usage, given } = scan.served!
		const written = scan.written!
		scan.served = scan.written = undefined
		const rescanned = track()
		const { precompiler } = rescanned
		const reproduces =
			JSON.stringify(precompiler.scan(scan.program)) ===
				JSON.stringify(usage) &&
			given.every(id => {
				const { source, mappings, answer } = written[id]
				return (
					JSON.stringify(
						transformedModuleOf(
							precompiler,
							source,
							id,
							undefined,
							mappings ?? undefined,
							scan.program.key
						) ?? null
					) === JSON.stringify(answer)
				)
			})
		if (!reproduces) {
			// so the next build scans it anew
			scan.cache!.delete(scan.key)
			throwError(writeUnreproducedScanMessage())
		}
		rescanned.viewKey = scan.viewKey
		return (scan.tracked = rescanned)
	}
	const answer = (request: PrecompileRequest): unknown => {
		if (request[0] === "close") return
		if (request[0] === "refresh" && tracked && !hasChanged(tracked.readTimes))
			return false
		if (request[0] === "reset" || request[0] === "refresh") {
			unasked = false
			scansByProgram = {}
			const before = tracked
			const kept = tracked && keptAcross(tracked, data.precompilerOptions)
			// e.g. as a file created since shadows what a module's import resolved
			// to, which no mtime it read shows
			if (!kept) transformedById = {}
			tracked = kept ?? track()
			const needsNewThread =
				conflictsWithThread ||
				tracked.precompiler.needsNewThread ||
				// arktype keeps what it compiled under earlier settings
				(!!before &&
					JSON.stringify(before.opts) !== JSON.stringify(tracked.opts))
			// the next request asks the bundler what reading the configuration couldn't
			if (unasked) tracked = undefined
			return needsNewThread
		}
		tracked ??= track()
		const { precompiler } = tracked
		if (request[0] === "readDependency")
			return precompiler.readDependency(request[1])
		if (request[0] === "readDependencies")
			return precompiler.readDependenciesOf(request[1])
		const cache = cacheOf(tracked)
		if (request[0] === "transform") {
			const [, source, id, mappings, program] = request
			if (program !== undefined) {
				const scan = scansByProgram[program]
				const written = scan?.written?.[id]
				if (
					written?.source === source &&
					written.mappings === (mappings ?? null)
				) {
					scan.served?.given.push(id)
					return written.answer ?? undefined
				}
				// a module the scan never reached, like one of arktype's own a
				// workspace links from its source: the scan's usage leaves it
				// whole, so where the precompiler writes nothing of it, nothing
				// the scan decided shows in its answer, which a precompiler
				// that never scanned gives alike, and a build the cache
				// answered needs no scan for it. One it writes is written by a
				// precompiler holding the scan, as the registry's state and the
				// modules the scan replaced may show in its units
				if (scan?.served && !(id in scan.program.modules)) {
					tracked.analyzed = true
					const unreached = transformedModuleOf(
						precompiler,
						source,
						id,
						undefined,
						mappings,
						program
					)
					if (!unreached || writesNothing(unreached)) return unreached
				}
				return transformedModuleOf(
					(scan ? scanned(scan) : viewing(tracked)).precompiler,
					source,
					id,
					undefined,
					mappings,
					program
				)
			}
			const previous = tracked.given[id]
			const given = (tracked.given[id] = givenOf(source, mappings))
			const kept = transformedById[id]
			if (
				kept?.source === source &&
				kept.mappings === mappings &&
				kept.viewKey === tracked.viewKey &&
				kept.mtimes.every(([file, mtime]) => mtimeOf(file) === mtime) &&
				precompiler.readCopiesOf(kept.packages, id)
			)
				return kept.transformed
			if (!precompiler.isTransformed(id)) return
			const key =
				cache &&
				keyOf(tracked.context, "transform", id, given, tracked.viewKey ?? null)
			const cached =
				key &&
				(cachedAnswerOf(tracked, cache!, key) as StoredModule | undefined)
			if (
				cached &&
				// else what it was given before may still be what its importers read
				(previous ?? given) === given &&
				precompiler.readCopiesOf(cached.packages, id)
			)
				return cached.transformed
			tracked.analyzed = true
			// a plugin ahead may give it unlike its file, as one transpiling it as
			// it loads does, which its importers then read
			if (
				precompiles(precompiler, source, id) &&
				(mappings !== undefined ||
					precompiler.graph.host.readFile(id) !== source)
			)
				tracked.unsnapshotted.given.push([id, given])
			const result = precompiledOf(
				viewing(tracked).precompiler,
				source,
				id,
				undefined,
				mappings
			)
			const transformed =
				result ?
					transformedOf(precompiler, result)
				:	unprecompiledOf(precompiler, source, id)
			// e.g. an import that can't resolve until a file is written, which no mtime shows
			if (hasDiagnostics(transformed)) return transformed
			const packages = result ? precompiler.arkPackagesOf(id) : []
			if (key) {
				store(tracked, cache!, key, {
					transformed,
					packages
				} satisfies StoredModule)
			}
			// an import may come to export a Type, which its own imports don't show
			if (!result) return transformed
			transformedById[id] = {
				source,
				mappings,
				transformed,
				packages,
				viewKey: tracked.viewKey,
				// as each was when first read, so a write meanwhile counts as a change
				mtimes: transformed.dependencies.map(file => [
					file,
					tracked!.readTimes[file] ?? mtimeOf(file)
				])
			}
			return transformed
		}
		if (request[0] === "scan") {
			const [, program] = request
			const given = Object.entries(program.modules).map(
				([id, { source, mappings }]): [string, string] => [
					id,
					(tracked!.given[id] = givenOf(source, mappings))
				]
			)
			const scan: Scan = (scansByProgram[program.key] = {
				program,
				cache,
				key: keyOf(tracked.context, "scan", { ...program, key: undefined }),
				viewKey: viewKeyOf(program),
				tracked: undefined,
				written: undefined,
				served: undefined,
				isStored: false
			})
			const cached =
				cache &&
				(cachedAnswerOf(tracked, cache, scan.key) as StoredScan | undefined)
			if (
				cached &&
				Object.entries(cached.modules).every(([id, { packages }]) =>
					precompiler.readCopiesOf(packages, id)
				)
			) {
				scan.written = writtenIn(cached)
				scan.served = { usage: cached.usage, given: [] }
				// as scanning it would, what this precompiler analyzes next
				// reads the program
				tracked.unread = program
				tracked.viewKey = scan.viewKey
				return cached.usage
			}
			// one another request's analyses preceded may write otherwise
			const isFirst = !tracked.analyzed
			tracked.analyzed = true
			scan.tracked = tracked
			tracked.unsnapshotted.given.push(...given)
			const usage = precompiler.scan(program)
			tracked.unread = undefined
			tracked.viewKey = scan.viewKey
			if (cache && isFirst && tracked.storable) {
				scan.written = modulesWrittenIn(precompiler, program)
				scan.isStored =
					Object.values(scan.written).every(
						({ answer }) => !answer || !hasDiagnostics(answer)
					) &&
					store(tracked, cache, scan.key, storedScanOf(usage, scan.written))
			}
			return usage
		}
		if (request[0] === "unseen" || request[0] === "unseenBuilt") {
			const [kind, program] = request
			const scan = scansByProgram[program.key]
			const key =
				scan?.cache && keyOf(scan.key, { ...program, key: undefined, kind })
			// stored only where nothing reads what the scan left out
			if (
				key &&
				scan.served &&
				cachedAnswerOf(tracked, scan.cache!, key) === null
			)
				return
			const scanning = scan ? scanned(scan) : viewing(tracked)
			const unseen =
				kind === "unseen" ?
					scanning.precompiler.unseenIn(program)
				:	scanning.precompiler.unseenBuiltIn(program)
			if (key && scan.isStored && unseen === undefined)
				store(scanning, scan.cache!, key, null)
			return unseen
		}
		if (request[0] === "program") {
			// read as a request first analyzes a module, so a build the cache
			// answers whole doesn't
			tracked.unread = request[1]
			tracked.viewKey = viewKeyOf(request[1])
			return
		}
		tracked.analyzed = true
		viewing(tracked)
		if (request[0] === "check")
			return checkedModuleOf(precompiler, request[1], request[2])
		if (request[0] === "checkUnwritten") {
			const [, source, id, mappings] = request
			const given = (tracked.given[id] = givenOf(source, mappings))
			// another plugin wrote it, as Svelte compiles a component, which its
			// importers then read
			if (precompiler.importsArk(source, id))
				tracked.unsnapshotted.given.push([id, given])
			return renderDiagnostics(
				precompiler.checkUnwritten(source, id, mappings),
				id => precompiler.graph.pathOf(id)
			)
		}
		precompiler.forgetCopies()
		const { hasAnswered } = tracked
		tracked.hasAnswered = true
		const checked = checkedModuleOf(
			precompiler,
			request[1],
			request[2],
			tracked
		)
		if (precompiler.conflictsWithThread) conflictsWithThread = true
		else if (
			!hasAnswered ||
			resolvesAsRecorded(tracked.opts, reachOf(tracked, request[2]))
		)
			return checked
		// the rule refreshes and asks again, as a new config may need a thread
		tracked = undefined
	}
	port.on("message", (request: PrecompileRequest) => {
		answering++
		try {
			port.postMessage({ result: answer(request) } satisfies PrecompileAnswer)
		} catch (e) {
			port.postMessage({ error: e } satisfies PrecompileAnswer)
		}
		if (data.answered) {
			Atomics.store(data.answered, 0, 1)
			Atomics.notify(data.answered, 0)
		}
		if (request[0] === "close") {
			if ("close" in port) port.close()
			// Deno's parentPort can't close, but its worker can close itself
			else (globalThis as { close?: () => void }).close?.()
		}
	})
}

// resolves what the precompiler can't, like Nuxt's #shared alias
type BundlerResolver = (
	specifier: string,
	importer: string
) => string | undefined

// the precompiler is synchronous, so its thread blocks on the answer
const bundlerResolverOf = (
	{
		resolver,
		resolved,
		resolveTimeout = 30_000,
		precompilerOptions
	}: PrecompilerWorkerData,
	answering: () => number,
	unasked: () => void,
	unanswered: () => void
): BundlerResolver | undefined => {
	if (!resolver || !resolved) return
	const cwd = realPathOf(precompilerOptions.cwd ?? process.cwd())
	let asked = 0
	return (specifier, importer) => {
		if (!isAbsolute(importer)) return
		const question = ++asked
		const deadline = performance.now() + resolveTimeout
		resolver.postMessage([question, answering(), specifier, importer])
		for (;;) {
			// read before draining, so an answer posted since wakes the wait
			const answers = Atomics.load(resolved, 0)
			for (
				let received = receiveMessageOnPort(resolver);
				received;
				received = receiveMessageOnPort(resolver)
			) {
				const [answered, path] = received.message as [
					number,
					string | null | undefined
				]
				// one to a question it stopped waiting for
				if (answered !== question) continue
				// null where the request it's answering can't ask the bundler
				if (path === null) unasked()
				return path ? realPathOf(path) : undefined
			}
			const left = deadline - performance.now()
			if (
				left <= 0 ||
				Atomics.wait(resolved, 0, answers, left) === "timed-out"
			) {
				unanswered()
				return throwError(
					writeUnansweredResolveMessage(
						specifier,
						printablePathOf(cwd, importer),
						resolveTimeout
					)
				)
			}
		}
	}
}

const checkedModuleOf = (
	precompiler: Precompiler,
	source: string,
	id: string,
	tracked?: TrackedPrecompiler
): CheckedModule => {
	const result =
		precompiler.isTransformed(id) ?
			precompiledOf(precompiler, source, id, tracked)
		:	undefined
	return {
		sites:
			result?.sites.map(({ start, end, line, column, status }) => ({
				start,
				end,
				line,
				column,
				status
			})) ?? [],
		diagnostics: result?.diagnostics ?? []
	}
}

export interface KeyedModule extends InlineModule {
	files: string[]
}

interface StoredKeyedModule {
	keyed: KeyedModule
	reach: Resolution[]
	packages: ArkPackage[]
}

export interface PrecompiledKeyedModule extends KeyedModule {
	// imports the precompiler couldn't resolve, which the bundler may
	unresolved: [specifier: string, importer: string][]
}

interface TrackedPrecompiler {
	precompiler: Precompiler
	// what it resolves and reads through, renewed as a reset keeps it
	host: PrecompileHost
	readTimes: Record<string, number>
	// each file as first read, undefined where it was missing
	sources: Record<string, string | undefined>
	targetsByImporter: Record<string, Record<string, string | undefined>>
	// imports that can't carry a Type it resolved to nothing without asking the bundler
	missesByImporter: Record<string, Set<string>>
	tsconfigsByImporter: Record<string, string | undefined>
	// what the build gave each module it was given, which a stored answer
	// reading the module may have read
	given: Record<string, string>
	// what it read since the snapshot its last stored answer names
	unsnapshotted: Snapshot
	snapshot: string | undefined
	// whether the answers a cache stored still hold, judged for files as they are
	holds: SnapshotCheck | undefined
	// what besides a request decides its answer: the options, whether the
	// bundler resolves what the precompiler can't, which one stored without
	// it would have asked, and whether Node runs each dependency as published,
	// as for --emit, which refuses a site reading one that opts in
	context: string
	// whether it asked the bundler, which a reset can't ask again
	asked: boolean
	// asked again for each answer a stored one had it resolve
	resolveInBundler: BundlerResolver | undefined
	// whether its answers can outlive it: it's its thread's first precompiler,
	// as arktype keeps what earlier ones compiled, was given each module as its
	// file reads, and no reset kept it across a change to a file it read, as
	// analyzing a module again after forgetting it may write it unlike a
	// precompiler that never read it
	storable: boolean
	// whether it answered a request by analyzing a module
	analyzed: boolean
	// modules resets forgot, whose analyses it may still hold
	forgotten: number
	// what its write analysis reads of the program it reads whole, if any,
	// which an answer it analyzes is stored under, as another module's write
	// decides it too
	viewKey: string | undefined
	// the program it reads once a request analyzes a module, unread as the
	// cache answered what read it
	unread: ReadProgram | undefined
	opts: PrecompilePluginOptions
	hasAnswered: boolean
	importsByFile: Record<string, [mtimeMs: number, imports: string[]]>
}

let precompilersInThread = 0

const createTrackedPrecompiler = (
	opts: PrecompilePluginOptions,
	resolveInBundler?: BundlerResolver,
	leavesDependencies = false
): TrackedPrecompiler => {
	opts = withSettingsFile(opts)
	const precompiler = createPrecompiler(opts)
	precompiler.graph.leavesDependencies = leavesDependencies
	const tracked: TrackedPrecompiler = {
		precompiler,
		host: precompiler.graph.host,
		readTimes: {},
		sources: {},
		targetsByImporter: Object.create(null),
		missesByImporter: {},
		tsconfigsByImporter: {},
		given: {},
		unsnapshotted: emptySnapshot(undefined),
		snapshot: undefined,
		holds: undefined,
		context: keyOf(opts, !!resolveInBundler, leavesDependencies),
		asked: false,
		resolveInBundler,
		storable: ++precompilersInThread === 1,
		analyzed: false,
		forgotten: 0,
		viewKey: undefined,
		unread: undefined,
		opts,
		hasAnswered: false,
		importsByFile: {}
	}
	const { readTimes, sources, targetsByImporter, tsconfigsByImporter } = tracked
	precompiler.graph.host = {
		resolve: (specifier, importer, isValueImport) => {
			const targets = (targetsByImporter[importer] ??= Object.create(null))
			if (specifier in targets) return targets[specifier]
			const target = tracked.host.resolve(specifier, importer)
			if (target === undefined && resolveInBundler) {
				// an import that can't carry a Type isn't asked, nor is the miss kept
				if (isValueImport?.() === false) {
					const misses = (tracked.missesByImporter[importer] ??= new Set())
					if (!misses.has(specifier)) {
						misses.add(specifier)
						tracked.unsnapshotted.resolutions.push([importer, specifier, null])
					}
					return
				}
				tracked.asked = true
				const asked = resolveInBundler(specifier, importer)
				tracked.unsnapshotted.asked.push([importer, specifier, asked ?? null])
				return (targets[specifier] = asked)
			}
			tracked.unsnapshotted.resolutions.push([
				importer,
				specifier,
				target ?? null
			])
			return (targets[specifier] = target)
		},
		readFile: file => {
			// before reading, so a write meanwhile counts as a change
			readTimes[file] ??= mtimeOf(file)
			const source = tracked.host.readFile(file)
			if (!(file in sources)) {
				sources[file] = source
				tracked.unsnapshotted.reads.push([
					file,
					source === undefined ? null : hashOf(source)
				])
			}
			// written as it builds, so what it answers may read either
			else if (source !== sources[file]) tracked.storable = false
			return source
		},
		tsconfigOf: importer => {
			if (!(importer in tsconfigsByImporter)) {
				const tsconfig = tracked.host.tsconfigOf?.(importer)
				tsconfigsByImporter[importer] = tsconfig
				tracked.unsnapshotted.tsconfigs.push([importer, tsconfig ?? null])
			}
			return tsconfigsByImporter[importer]
		}
	}
	return tracked
}

const keyOf = (...parts: unknown[]): string => hashOf(JSON.stringify(parts))

const givenOf = (source: string, mappings: string | undefined) =>
	keyOf(source, mappings ?? null)

// what the write analysis reads of a program read whole: each module, as a
// write in one decides what a site in another answers, and what loads them
const viewKeyOf = ({
	modules,
	targets,
	exposed,
	dynamicImports
}: ReadProgram): string =>
	keyOf("program", modules, targets, exposed, dynamicImports)

// the precompiler, having read the program its analyses read whole: the
// scan's a request names, or one it was given unread
const viewing = (
	tracked: TrackedPrecompiler,
	scan?: Scan
): TrackedPrecompiler => {
	// e.g. as a scan of another program read its own since
	if (scan && tracked.viewKey !== scan.viewKey) {
		tracked.unread = scan.program
		tracked.viewKey = scan.viewKey
	}
	if (tracked.unread) {
		tracked.precompiler.readProgram(tracked.unread)
		tracked.unread = undefined
	}
	return tracked
}

// a cache in node_modules/.cache/ark, unless the project can't keep one
const cachesByCwd: Record<string, AnswerCache | null> = {}

const cacheOf = ({ precompiler }: TrackedPrecompiler) => {
	const cwd = precompiler.graph.cwd!
	if (!(cwd in cachesByCwd)) {
		try {
			cachesByCwd[cwd] = new AnswerCache(cwd)
		} catch {
			cachesByCwd[cwd] = null
		}
	}
	return cachesByCwd[cwd] ?? undefined
}

// an answer stored for what a key names whose snapshot still holds
const cachedAnswerOf = (
	tracked: TrackedPrecompiler,
	cache: AnswerCache,
	key: string
): unknown =>
	cache.get(key, snapshot =>
		(tracked.holds ??= createSnapshotCheck(
			cache,
			tracked.host,
			tracked.resolveInBundler
		))(snapshot, tracked.given)
	)

// an answer outlives the build where nothing but what it read and resolved
// decided it
const store = (
	tracked: TrackedPrecompiler,
	cache: AnswerCache,
	key: string,
	answer: unknown
): boolean => {
	if (!tracked.storable) return false
	const { unsnapshotted } = tracked
	if (
		tracked.snapshot === undefined ||
		unsnapshotted.reads.length ||
		unsnapshotted.resolutions.length ||
		unsnapshotted.asked.length ||
		unsnapshotted.tsconfigs.length ||
		unsnapshotted.given.length
	) {
		tracked.snapshot = cache.addSnapshot(unsnapshotted)
		tracked.unsnapshotted = emptySnapshot(tracked.snapshot)
	}
	cache.set(key, answer, tracked.snapshot)
	return true
}

// a program a scan read, and what the cache answered for it
interface Scan {
	program: ScannedProgram
	cache: AnswerCache | undefined
	key: string
	// what the write analysis reads of the program
	viewKey: string
	// the precompiler holding its usage, once one scanned it
	tracked: TrackedPrecompiler | undefined
	// each module the scan wrote, as the cache holds them, which a transform
	// given the same module reads
	written: Record<string, ProgramModule> | undefined
	// the usage the cache answered with, and each module it gave the bundler
	served: { usage: ScannedUsage; given: string[] } | undefined
	// whether the scan was stored, so what reads its usage may be
	isStored: boolean
}

interface ProgramModule {
	source: string
	mappings: string | null
	answer: TransformedModule | null
	packages: ArkPackage[]
}

interface StoredModule {
	transformed: TransformedModule
	// arktype's, whose copies precompiling it read, which an answer the cache
	// gives reads again
	packages: ArkPackage[]
}

// a scan with every module it wrote, so a build reads them all from one
interface StoredScan {
	usage: ScannedUsage
	modules: Record<string, ProgramModule>
	// the virtual modules they write, each once, as many share one, which
	// their modules name by its place
	texts: string[]
}

// each module of a program, as transforms naming it would answer
const modulesWrittenIn = (
	precompiler: Precompiler,
	program: ScannedProgram
): Record<string, ProgramModule> => {
	const written: Record<string, ProgramModule> = {}
	for (const id in program.modules) {
		const { source, mappings, transformed } = program.modules[id]
		if (!transformed) continue
		written[id] = {
			source,
			mappings: mappings ?? null,
			packages: packagesOf(precompiler, source, id),
			answer:
				transformedModuleOf(
					precompiler,
					source,
					id,
					undefined,
					mappings,
					program.key
				) ?? null
		}
	}
	return written
}

const storedScanOf = (
	usage: ScannedUsage,
	written: Record<string, ProgramModule>
): StoredScan => {
	const texts: string[] = []
	const places = new Map<string, string>()
	const placeOf = (text: string) => {
		if (!places.has(text)) places.set(text, String(texts.push(text) - 1))
		return places.get(text)!
	}
	const modules = flatMorph(written, (id, module) => [
		id,
		withModules(module, placeOf)
	])
	return { usage, modules, texts }
}

const writtenIn = ({
	modules,
	texts
}: StoredScan): Record<string, ProgramModule> =>
	flatMorph(modules, (id, module) => [
		id,
		withModules(module, place => texts[+place])
	])

const withModules = (
	module: ProgramModule,
	map: (text: string) => string
): ProgramModule => ({
	...module,
	answer: module.answer && {
		...module.answer,
		modules: flatMorph(module.answer.modules, (specifier, text) => [
			specifier,
			map(text)
		])
	}
})

const hasDiagnostics = (transformed: TransformedModule) =>
	transformed.errors.length > 0 || transformed.warnings.length > 0

// a module as its file reads, with no unit a registry's state or a scan's
// usage could have written otherwise
const writesNothing = (transformed: TransformedModule) =>
	transformed.code === undefined &&
	Object.keys(transformed.modules).length === 0 &&
	transformed.foldedHelpers.length === 0 &&
	!hasDiagnostics(transformed)

// the precompiler a reset keeps, having forgotten the modules whose files
// changed, unless a change may reach past them, as a new resolution, setting
// or package does, or it may hold more it forgot than it reads
const keptAcross = (
	tracked: TrackedPrecompiler,
	opts: PrecompilePluginOptions,
	// what the bundler resolved, as the precompiler learned it
	resolveLearned?: (specifier: string, importer: string) => string | undefined
): TrackedPrecompiler | undefined => {
	const { precompiler, readTimes } = tracked
	if (
		(tracked.asked && !resolveLearned) ||
		tracked.forgotten > Object.keys(readTimes).length ||
		JSON.stringify(withSettingsFile(opts)) !== JSON.stringify(tracked.opts)
	)
		return
	const host = createNodeHost(tracked.opts)
	const resolvesAs = (specifier: string, importer: string, target?: string) =>
		(host.resolve(specifier, importer) ??
			resolveLearned?.(specifier, importer)) === target
	for (const importer in tracked.targetsByImporter) {
		const targets = tracked.targetsByImporter[importer]
		for (const specifier in targets)
			if (!resolvesAs(specifier, importer, targets[specifier])) return
	}
	for (const importer in tracked.missesByImporter) {
		for (const specifier of tracked.missesByImporter[importer])
			if (!resolvesAs(specifier, importer)) return
	}
	for (const importer in tracked.tsconfigsByImporter) {
		if (host.tsconfigOf?.(importer) !== tracked.tsconfigsByImporter[importer])
			return
	}
	const changed = Object.keys(readTimes).filter(
		file => readTimes[file] !== mtimeOf(file)
	)
	const forgotten = precompiler.forget(changed)
	if (!forgotten) return
	tracked.forgotten += forgotten.length
	for (const file of changed) {
		delete readTimes[file]
		delete tracked.sources[file]
		delete tracked.given[file]
	}
	tracked.host = host
	tracked.holds = undefined
	if (changed.length) tracked.storable = false
	// a build reads its own program, if any
	precompiler.readProgram(undefined)
	tracked.viewKey = tracked.unread = undefined
	return tracked
}

type Resolution = [importer: string, specifier: string, target: string | null]

// what each module a module's imports reach resolved its imports to, and the config
const reachOf = (
	{ precompiler, targetsByImporter }: TrackedPrecompiler,
	id: string
): Resolution[] => {
	const result: Resolution[] = []
	const reached = new Set([id])
	if (precompiler.config) reached.add(precompiler.config)
	for (const importer of reached) {
		const targets = targetsByImporter[importer]
		for (const specifier in targets) {
			const target = targets[specifier]
			result.push([importer, specifier, target ?? null])
			if (target !== undefined) reached.add(target)
		}
	}
	return result
}

// re-resolved by a new host, which sees each file created since
const resolvesAsRecorded = (
	opts: PrecompilePluginOptions,
	reach: Resolution[],
	resolveInBundler?: BundlerResolver
): boolean => {
	const host = createNodeHost(opts)
	return reach.every(
		([importer, specifier, target]) =>
			(host.resolve(specifier, importer) ??
				resolveInBundler?.(specifier, importer) ??
				null) === target
	)
}

// a given module unlike its file, as unsaved in an editor, replaces it
const recordGiven = (
	tracked: TrackedPrecompiler,
	source: string,
	id: string
) => {
	if (tracked.precompiler.graph.host.readFile(id) === source) return
	// no mtime equals NaN, so the next module replaces the precompiler
	tracked.readTimes[id] = NaN
	tracked.storable = false
}

// whether a file changed since it was read, as what the precompiler cached
// for any module may be read for the next one
const hasChanged = (
	mtimes: Record<string, number>,
	currentMtimeOf: (file: string) => number = mtimeOf
) => Object.keys(mtimes).some(file => mtimes[file] !== currentMtimeOf(file))

export interface KeyedPrecompiler {
	precompile(source: string, id: string): PrecompiledKeyedModule
	// a dependency the build doesn't precompile, as a bundler checks one importing arktype
	readDependency(importer: string): RenderedDiagnostics
	// what the bundler resolved each unresolved import to, true where one resolved
	learn(
		resolved: [specifier: string, importer: string, path: string | undefined][]
	): boolean
}

// Turbopack has no worker, so it keeps one precompiler per option set
export const createKeyedPrecompiler = (
	opts: PrecompilePluginOptions
): KeyedPrecompiler => {
	// what Turbopack resolves where the precompiler can't; a miss is asked again
	const learnedByImporter: Record<string, Record<string, string>> = {}
	const unresolved = new Map<string, [specifier: string, importer: string]>()
	const resolveLearned: BundlerResolver = (specifier, importer) => {
		const learned = learnedByImporter[importer]?.[specifier]
		if (learned === undefined && isAbsolute(importer))
			unresolved.set(`${importer}\0${specifier}`, [specifier, importer])
		return learned
	}
	const inlineOpts = { ...opts, inline: true }
	const track = () => createTrackedPrecompiler(inlineOpts, resolveLearned)
	let tracked = track()
	const precompile = (source: string, id: string): KeyedModule => {
		const mtimes: Record<string, number> = {}
		const currentMtimeOf = (file: string) => (mtimes[file] ??= mtimeOf(file))
		if (hasChanged(tracked.readTimes, currentMtimeOf)) {
			tracked =
				keptAcross(
					tracked,
					inlineOpts,
					(specifier, importer) => learnedByImporter[importer]?.[specifier]
				) ?? track()
		}
		if (tracked.holds && hasChanged(tracked.holds.mtimes, currentMtimeOf))
			tracked.holds = undefined
		const cache = cacheOf(tracked)
		const key = cache && keyOf(tracked.context, "keyed", id, source)
		const cached =
			key &&
			(cachedAnswerOf(tracked, cache!, key) as StoredKeyedModule | undefined)
		// as it re-resolves what it resolved for an answer it held
		if (
			cached &&
			(!tracked.hasAnswered ||
				resolvesAsRecorded(tracked.opts, cached.reach, resolveLearned)) &&
			tracked.precompiler.readCopiesOf(cached.packages, id)
		) {
			tracked.hasAnswered = true
			return cached.keyed
		}
		let keyed: KeyedModule | undefined
		if (tracked.hasAnswered) {
			keyed = keyedModuleOf(tracked, source, id, currentMtimeOf)
			if (
				!resolvesAsRecorded(tracked.opts, reachOf(tracked, id), resolveLearned)
			) {
				keyed = undefined
				tracked = track()
			}
		}
		if (!keyed) {
			tracked.hasAnswered = true
			keyed = keyedModuleOf(tracked, source, id, currentMtimeOf)
		}
		// with what it resolved, which a later process checks as this one does,
		// unless Turbopack resolved some, which a later process hasn't learned
		if (
			key &&
			!tracked.asked &&
			!keyed.errors.length &&
			!keyed.warnings.length
		) {
			store(tracked, cache!, key, {
				keyed,
				reach: reachOf(tracked, id),
				packages: packagesOf(tracked.precompiler, source, id)
			} satisfies StoredKeyedModule)
		}
		return keyed
	}
	return {
		precompile: (source, id) => ({
			...precompile(source, id),
			unresolved: [...unresolved.values()]
		}),
		readDependency: importer =>
			tracked.precompiler.readDependency(importer, "Turbopack"),
		learn: resolved => {
			let learned = false
			for (const [specifier, importer, path] of resolved) {
				unresolved.delete(`${importer}\0${specifier}`)
				if (!path) continue
				;(learnedByImporter[importer] ??= Object.create(null))[specifier] =
					realPathOf(path)
				learned = true
			}
			if (learned) tracked = track()
			return learned
		}
	}
}

const keyedModuleOf = (
	tracked: TrackedPrecompiler,
	source: string,
	id: string,
	currentMtimeOf: (file: string) => number
): KeyedModule => {
	const { precompiler, importsByFile } = tracked
	const files = precompiler.textClosureOf(id, file => {
		if (file === id) return precompiler.textImportsOf(source, id)
		const mtime = currentMtimeOf(file)
		if (mtime === -1) return []
		const cached = importsByFile[file]
		return cached?.[0] === mtime ?
				cached[1]
			:	(importsByFile[file] = [
					mtime,
					precompiler.textImportsOf(
						precompiler.graph.host.readFile(file) ?? "",
						file
					)
				])[1]
	})
	const transformed = transformedModuleOf(precompiler, source, id, tracked)
	for (const dependency of transformed?.dependencies ?? [])
		if (!files.includes(dependency)) files.push(dependency)
	return {
		code:
			transformed?.code && appendSourceMap(transformed.code, transformed.map),
		errors: transformed?.errors ?? [],
		warnings: transformed?.warnings ?? [],
		files
	}
}

const precompiles = (precompiler: Precompiler, source: string, id: string) =>
	precompiler.checkHelpers || precompiler.importsArk(source, id)

// arktype's packages whose copies precompiling a module read
const packagesOf = (
	precompiler: Precompiler,
	source: string,
	id: string
): ArkPackage[] =>
	precompiler.isTransformed(id) && precompiles(precompiler, source, id) ?
		precompiler.arkPackagesOf(id)
	:	[]

const precompiledOf = (
	precompiler: Precompiler,
	source: string,
	id: string,
	tracked: TrackedPrecompiler | undefined,
	mappings?: string,
	program?: string
): PrecompiledModule | undefined => {
	if (!precompiles(precompiler, source, id)) return
	if (tracked) recordGiven(tracked, source, id)
	return precompiler.precompile(source, id, mappings, program)
}

const transformedModuleOf = (
	precompiler: Precompiler,
	source: string,
	id: string,
	tracked?: TrackedPrecompiler,
	mappings?: string,
	program?: string
): TransformedModule | undefined => {
	if (!precompiler.isTransformed(id)) return
	const result = precompiledOf(
		precompiler,
		source,
		id,
		tracked,
		mappings,
		program
	)
	return result ?
			transformedOf(precompiler, result)
		:	unprecompiledOf(precompiler, source, id)
}

const transformedOf = (
	precompiler: Precompiler,
	result: PrecompiledModule
): TransformedModule => ({
	code: result.map && result.code,
	map: result.map,
	dependencies: [
		...new Set([
			...result.dependencies,
			...precompiler.ownManifests,
			...settingsFilesOf(precompiler)
		])
	],
	modules: result.modules,
	foldedHelpers: result.foldedHelpers,
	...renderDiagnostics(result.diagnostics, id => precompiler.graph.pathOf(id))
})

const unprecompiledOf = (
	precompiler: Precompiler,
	source: string,
	id: string
): TransformedModule => ({
	code: undefined,
	map: undefined,
	// an import may come to export a Type, which only the plugin watches
	dependencies: [
		...(precompiler.inline ? [] : precompiler.textImportsOf(source, id)),
		...settingsFilesOf(precompiler)
	],
	modules: {},
	foldedHelpers: [],
	errors: [],
	warnings: []
})

// a module's answer depends on the settings it was written under, but a
// bundler watching a file missing from disk drops it after each build
const settingsFilesOf = (precompiler: Precompiler): string[] =>
	settingsPathsOf(precompiler.graph.cwd!).filter(file => existsSync(file))

interface KeptModule extends StoredModule {
	source: string
	mappings: string | undefined
	viewKey: string | undefined
	mtimes: [file: string, mtimeMs: number][]
}

if (isPrecompilerWorker) {
	const data = workerData as PrecompilerWorkerData
	answerRequests(data.port ?? parentPort!, data)
}
