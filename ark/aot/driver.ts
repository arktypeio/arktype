import { readFileSync, statSync } from "node:fs"
import { resolve } from "node:path"
import type { UnitReaders } from "arktype/internal/standalone.ts"
import type { SourceMap } from "magic-string"
import { parentPort, workerData, type MessagePort } from "node:worker_threads"
import {
	appendSourceMap,
	createNodeHost,
	realPathOf,
	type NodeHostOptions
} from "./host.ts"
import {
	Precompiler,
	renderDiagnostic,
	type Diagnostic,
	type PrecompiledModule,
	type PrecompileOptions,
	type Site
} from "./precompile.ts"
import { withSettingsFile } from "./settings.ts"
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

// a host that shows one error for a module throws a module's errors together
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
	unitReaders?: UnitReaders | undefined
	// for a host that waits synchronously
	port?: MessagePort | undefined
	answered?: Int32Array | undefined
}

export type PrecompileRequest =
	| [
			kind: "transform",
			source: string,
			id: string,
			mappings?: string | undefined
	  ]
	| [kind: "check", source: string, id: string]
	| [kind: "lint", source: string, id: string]
	| [kind: "readDependency", importer: string]
	| [kind: "reset", unitReaders?: UnitReaders | undefined]
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
	unitReaders: UnitReaders
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
	let { unitReaders } = data
	const track = () => {
		const created = createTrackedPrecompiler(data.precompilerOptions)
		created.precompiler.unitReaders = unitReaders
		return created
	}
	const answer = (request: PrecompileRequest): unknown => {
		if (request[0] === "close") return
		if (request[0] === "refresh" && tracked && !isStale(tracked)) return false
		if (request[0] === "reset") unitReaders = request[1]
		if (request[0] === "reset" || request[0] === "refresh") {
			tracked = track()
			return conflictsWithThread || tracked.precompiler.needsNewThread
		}
		tracked ??= track()
		const { precompiler } = tracked
		if (request[0] === "readDependency")
			return precompiler.readDependency(request[1])
		if (request[0] === "transform") {
			return transformedModuleOf(
				precompiler,
				request[1],
				request[2],
				undefined,
				request[3]
			)
		}
		if (request[0] === "check")
			return checkedModuleOf(precompiler, request[1], request[2])
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
		else if (!hasAnswered || resolvesAsRecorded(tracked, request[2]))
			return checked
		// the rule refreshes and asks again, as a new config may need a thread
		tracked = undefined
	}
	port.on("message", (request: PrecompileRequest) => {
		try {
			port.postMessage({ result: answer(request) } satisfies PrecompileAnswer)
		} catch (e) {
			port.postMessage({ error: e } satisfies PrecompileAnswer)
		}
		if (data.answered) {
			Atomics.store(data.answered, 0, 1)
			Atomics.notify(data.answered, 0)
		}
		if (request[0] === "close") port.close()
	})
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
	// the module's local import closure, the files its precompilation may read
	files: string[]
}

const mtimeOf = (file: string) =>
	statSync(file, { throwIfNoEntry: false })?.mtimeMs ?? -1

interface TrackedPrecompiler {
	precompiler: Precompiler
	// each file the precompiler read, with its mtime when it was first read
	readTimes: Record<string, number>
	targetsByImporter: Record<string, Record<string, string | undefined>>
	opts: PrecompilePluginOptions
	hasAnswered: boolean
	importsByFile: Record<string, [mtimeMs: number, imports: string[]]>
}

const createTrackedPrecompiler = (
	opts: PrecompilePluginOptions
): TrackedPrecompiler => {
	// as the plugin, a driver, the CLI or the ESLint rule read it
	opts = withSettingsFile(opts)
	const readTimes: Record<string, number> = {}
	const targetsByImporter: TrackedPrecompiler["targetsByImporter"] =
		Object.create(null)
	const precompiler = createPrecompiler(opts)
	const { host } = precompiler.graph
	precompiler.graph.host = {
		...host,
		resolve: (specifier, importer) => {
			const targets = (targetsByImporter[importer] ??= Object.create(null))
			if (!(specifier in targets))
				targets[specifier] = host.resolve(specifier, importer)
			return targets[specifier]
		},
		readFile: file => {
			// before reading, so a write meanwhile counts as a change
			readTimes[file] ??= mtimeOf(file)
			return host.readFile(file)
		}
	}
	return {
		precompiler,
		readTimes,
		targetsByImporter,
		opts,
		hasAnswered: false,
		importsByFile: {}
	}
}

// a kept precompiler's imports must resolve as they did
const resolvesAsRecorded = (
	{ precompiler, targetsByImporter, opts }: TrackedPrecompiler,
	id: string
): boolean => {
	const host = createNodeHost(opts)
	const reached = new Set([id])
	if (precompiler.config) reached.add(precompiler.config)
	for (const importer of reached) {
		const targets = targetsByImporter[importer]
		for (const specifier in targets) {
			const target = targets[specifier]
			if (host.resolve(specifier, importer) !== target) return false
			if (target !== undefined) reached.add(target)
		}
	}
	return true
}

// a given module unlike its file, as unsaved in an editor, replaces it
const recordGiven = (
	{ precompiler, readTimes }: TrackedPrecompiler,
	source: string,
	id: string
) => {
	// no mtime equals NaN, so the next module replaces the precompiler
	if (precompiler.graph.host.readFile(id) !== source) readTimes[id] = NaN
}

// what the precompiler cached for any module may be read for the next one
const isStale = (
	{ readTimes }: TrackedPrecompiler,
	currentMtimeOf: (file: string) => number = mtimeOf
) =>
	Object.keys(readTimes).some(file => readTimes[file] !== currentMtimeOf(file))

// Turbopack has no worker, so it keeps one precompiler per option set
export const createKeyedPrecompiler = (
	opts: PrecompilePluginOptions
): ((source: string, id: string) => KeyedModule) => {
	let tracked = createTrackedPrecompiler({ ...opts, inline: true })
	return (source, id) => {
		const mtimes: Record<string, number> = {}
		const currentMtimeOf = (file: string) => (mtimes[file] ??= mtimeOf(file))
		if (isStale(tracked, currentMtimeOf))
			tracked = createTrackedPrecompiler({ ...opts, inline: true })
		if (tracked.hasAnswered) {
			const keyed = keyedModuleOf(tracked, source, id, currentMtimeOf)
			if (resolvesAsRecorded(tracked, id)) return keyed
			tracked = createTrackedPrecompiler({ ...opts, inline: true })
		}
		tracked.hasAnswered = true
		return keyedModuleOf(tracked, source, id, currentMtimeOf)
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
					precompiler.textImportsOf(readFileSync(file, "utf8"), file)
				])[1]
	})
	const transformed = transformedModuleOf(precompiler, source, id, tracked)
	for (const dependency of transformed?.dependencies ?? [])
		if (!files.includes(dependency)) files.push(dependency)
	return {
		code: transformed?.code,
		errors: transformed?.errors ?? [],
		warnings: transformed?.warnings ?? [],
		files
	}
}

const precompiledOf = (
	precompiler: Precompiler,
	source: string,
	id: string,
	tracked: TrackedPrecompiler | undefined,
	mappings?: string
): PrecompiledModule | undefined => {
	if (!precompiler.checkHelpers && !precompiler.importsArk(source, id)) return
	if (tracked) recordGiven(tracked, source, id)
	return precompiler.precompile(source, id, mappings)
}

const transformedModuleOf = (
	precompiler: Precompiler,
	source: string,
	id: string,
	tracked?: TrackedPrecompiler,
	mappings?: string
): TransformedModule | undefined => {
	if (!precompiler.isTransformed(id)) return
	const result = precompiledOf(precompiler, source, id, tracked, mappings)
	if (!result) {
		return {
			code: undefined,
			map: undefined,
			// an import may come to export a Type, which only the plugin watches
			dependencies:
				precompiler.inline ? [] : precompiler.textImportsOf(source, id),
			modules: {},
			unitReaders: {},
			errors: [],
			warnings: []
		}
	}
	return {
		code:
			result.map &&
			(precompiler.inline ?
				appendSourceMap(result.code, result.map)
			:	result.code),
		map: precompiler.inline ? undefined : result.map,
		dependencies: [
			...new Set([...result.dependencies, ...precompiler.ownManifests])
		],
		modules: result.modules,
		unitReaders: result.unitReaders,
		...renderDiagnostics(result.diagnostics, id => precompiler.graph.pathOf(id))
	}
}

if (isPrecompilerWorker) {
	const data = workerData as PrecompilerWorkerData
	answerRequests(data.port ?? parentPort!, data)
}
