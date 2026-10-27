import { throwError } from "@ark/util"
import { readFileSync, statSync } from "node:fs"
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
	type NodeHostOptions
} from "./host.ts"
import { writeUnansweredResolveMessage } from "./messages.ts"
import {
	Precompiler,
	renderDiagnostic,
	type Diagnostic,
	type PrecompiledModule,
	type PrecompileOptions,
	type ScannedProgram,
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
	// for a host that waits synchronously
	port?: MessagePort | undefined
	answered?: Int32Array | undefined
	// closes as the thread stops, so a host waiting synchronously hears it
	lifeline?: MessagePort | undefined
	// asks the bundler what the precompiler can't resolve, waiting on resolved
	resolver?: MessagePort | undefined
	resolved?: Int32Array | undefined
	// how long it waits for an answer, in milliseconds
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
	| [kind: "check", source: string, id: string]
	| [
			kind: "checkUnwritten",
			source: string,
			id: string,
			mappings?: string | undefined
	  ]
	| [kind: "lint", source: string, id: string]
	| [kind: "readDependency", importer: string]
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
	// whether it couldn't ask the bundler for that request
	let unasked = false
	const resolveInBundler = bundlerResolverOf(
		data,
		() => answering,
		() => (unasked = true),
		// what it read before it stopped waiting may be partial
		() => (tracked = undefined)
	)
	const track = () =>
		createTrackedPrecompiler(data.precompilerOptions, resolveInBundler)
	// kept across resets, as a rebuild asks again for modules nothing changed
	const transformedById: Record<string, KeptModule> = {}
	const answer = (request: PrecompileRequest): unknown => {
		if (request[0] === "close") return
		if (request[0] === "refresh" && tracked && !isStale(tracked)) return false
		if (request[0] === "reset" || request[0] === "refresh") {
			unasked = false
			tracked = track()
			const needsNewThread =
				conflictsWithThread || tracked.precompiler.needsNewThread
			// the next request asks the bundler what reading the configuration
			// couldn't, like an import through an alias only the bundler names
			if (unasked) tracked = undefined
			return needsNewThread
		}
		tracked ??= track()
		const { precompiler } = tracked
		if (request[0] === "readDependency")
			return precompiler.readDependency(request[1])
		if (request[0] === "transform") {
			const [, source, id, mappings, program] = request
			// a bundle's scan decides what its modules leave out
			if (program !== undefined) {
				return transformedModuleOf(
					precompiler,
					source,
					id,
					undefined,
					mappings,
					program
				)
			}
			const kept = transformedById[id]
			if (
				kept?.source === source &&
				kept.mappings === mappings &&
				kept.mtimes.every(([file, mtime]) => mtimeOf(file) === mtime)
			)
				return kept.transformed
			if (!precompiler.isTransformed(id)) return
			const result = precompiledOf(precompiler, source, id, undefined, mappings)
			if (!result) return unprecompiledOf(precompiler, source, id)
			const transformed = transformedOf(precompiler, result)
			// e.g. an import that can't resolve until a file is written, which
			// no mtime here would show
			if (transformed.errors.length || transformed.warnings.length)
				return transformed
			transformedById[id] = {
				source,
				mappings,
				transformed,
				// as each was when first read, so a write meanwhile counts as a change
				mtimes: transformed.dependencies.map(file => [
					file,
					tracked!.readTimes[file] ?? mtimeOf(file)
				])
			}
			return transformed
		}
		if (request[0] === "scan") return precompiler.scan(request[1])
		if (request[0] === "check")
			return checkedModuleOf(precompiler, request[1], request[2])
		if (request[0] === "checkUnwritten") {
			return renderDiagnostics(
				precompiler.checkUnwritten(request[1], request[2], request[3]),
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
		else if (!hasAnswered || resolvesAsRecorded(tracked, request[2]))
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

// what the bundler resolves where the precompiler can't, like an alias only
// the bundler's config names, as Nuxt's #shared
type BundlerResolver = (
	specifier: string,
	importer: string
) => string | undefined

// the precompiler is synchronous, so its thread waits for the bundler's
// answer, failing the request where none comes, as where resolving waits on
// the precompiler in turn
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
	// the module's local import closure, the files its precompilation may read
	files: string[]
}

export interface PrecompiledKeyedModule extends KeyedModule {
	// imports the precompiler couldn't resolve, which the bundler may
	unresolved: [specifier: string, importer: string][]
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
	opts: PrecompilePluginOptions,
	resolveInBundler?: BundlerResolver
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
		resolve: (specifier, importer, isValueImport) => {
			const targets = (targetsByImporter[importer] ??= Object.create(null))
			if (specifier in targets) return targets[specifier]
			const target = host.resolve(specifier, importer)
			// the bundler isn't asked for an import that can't carry a Type, nor
			// is the miss kept, so a value import of it still asks
			if (
				target === undefined &&
				resolveInBundler &&
				isValueImport?.() === false
			)
				return
			return (targets[specifier] =
				target ?? resolveInBundler?.(specifier, importer))
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
	id: string,
	resolveInBundler?: BundlerResolver
): boolean => {
	const host = createNodeHost(opts)
	const reached = new Set([id])
	if (precompiler.config) reached.add(precompiler.config)
	for (const importer of reached) {
		const targets = targetsByImporter[importer]
		for (const specifier in targets) {
			const target = targets[specifier]
			if (
				(host.resolve(specifier, importer) ??
					resolveInBundler?.(specifier, importer)) !== target
			)
				return false
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

export interface KeyedPrecompiler {
	precompile(source: string, id: string): PrecompiledKeyedModule
	// a dependency the build doesn't precompile, as a bundler checks one importing arktype
	readDependency(importer: string): RenderedDiagnostics
	// what the bundler resolved each unresolved import to, true where one
	// resolved, so a module precompiled before may read it otherwise
	learn(
		resolved: [specifier: string, importer: string, path: string | undefined][]
	): boolean
}

// Turbopack has no worker, so it keeps one precompiler per option set
export const createKeyedPrecompiler = (
	opts: PrecompilePluginOptions
): KeyedPrecompiler => {
	// what Turbopack resolves where the precompiler can't. What it can't
	// either is asked again, as a module written since may resolve it
	const res: Record<string, Record<string, string>> = {}
	// what it hasn't been asked yet, which a module precompiled meanwhile may
	// read too
	const unresolved = new Map<string, [specifier: string, importer: string]>()
	const resolveLearned: BundlerResolver = (specifier, importer) => {
		const learned = res[importer]?.[specifier]
		if (learned === undefined && isAbsolute(importer))
			unresolved.set(`${importer}\0${specifier}`, [specifier, importer])
		return learned
	}
	const track = () =>
		createTrackedPrecompiler({ ...opts, inline: true }, resolveLearned)
	let tracked = track()
	const precompile = (source: string, id: string): KeyedModule => {
		const mtimes: Record<string, number> = {}
		const currentMtimeOf = (file: string) => (mtimes[file] ??= mtimeOf(file))
		if (isStale(tracked, currentMtimeOf)) tracked = track()
		if (tracked.hasAnswered) {
			const keyed = keyedModuleOf(tracked, source, id, currentMtimeOf)
			if (resolvesAsRecorded(tracked, id, resolveLearned)) return keyed
			tracked = track()
		}
		tracked.hasAnswered = true
		return keyedModuleOf(tracked, source, id, currentMtimeOf)
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
				;(res[importer] ??= Object.create(null))[specifier] = realPathOf(path)
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
					precompiler.textImportsOf(readFileSync(file, "utf8"), file)
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

const precompiledOf = (
	precompiler: Precompiler,
	source: string,
	id: string,
	tracked: TrackedPrecompiler | undefined,
	mappings?: string,
	program?: string
): PrecompiledModule | undefined => {
	if (!precompiler.checkHelpers && !precompiler.importsArk(source, id)) return
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
		...new Set([...result.dependencies, ...precompiler.ownManifests])
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
	dependencies: precompiler.inline ? [] : precompiler.textImportsOf(source, id),
	modules: {},
	foldedHelpers: [],
	errors: [],
	warnings: []
})

// a module's precompiled code, with the mtime of each file it was read from
interface KeptModule {
	source: string
	mappings: string | undefined
	transformed: TransformedModule
	mtimes: [file: string, mtimeMs: number][]
}

if (isPrecompilerWorker) {
	const data = workerData as PrecompilerWorkerData
	answerRequests(data.port ?? parentPort!, data)
}
