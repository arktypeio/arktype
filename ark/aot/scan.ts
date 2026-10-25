import { isAbsolute } from "node:path"
import { parseSync, type Node } from "oxc-parser"
import { dependencyOf, fileOf, printablePathOf, transformedId } from "./host.ts"
import { langOf } from "./module.ts"
import type { ScannedModule, ScannedProgram } from "./precompile.ts"
import { walk } from "./scope.ts"

export type ImportKind = "import-statement" | "dynamic-import" | "require-call"

// a specifier's module as the bundler resolves it: its file, null where the
// bundle doesn't hold it, or undefined where the build can't read what it is
export type ScanResolution = string | null | undefined

export interface ScanHost<resolution = Promise<ScanResolution>> {
	resolve: (specifier: string, importer: string, kind: ImportKind) => resolution
	// a module's code as its file holds it, where the bundler can't load it
	// or it's a dependency's script, which the scan reads for its imports alone
	readFile?: (id: string) => string | undefined
	// a module's code as the bundler loads it, through the plugins ahead of
	// this one, or each plugin where it doesn't transform it, like a Svelte
	// component's
	load?: (id: string) => Promise<string | undefined>
	// whether the plugin precompiles a module the bundler loads
	isTransformed: (id: string) => boolean
	// the precompiler's name for a module, which a bundler may write otherwise,
	// as Vite writes / on Windows
	idOf: (id: string) => string
	// what messages print paths from
	cwd: string
}

export interface ScanEntry {
	id: string
	// e.g. esbuild's stdin, which the bundler loads itself
	source?: string
}

// the modules a bundle's entries reach, or why one may reach a validator
// through code the build can't read
export const scanProgram = async (
	key: string,
	entries: ScanEntry[],
	host: ScanHost
): Promise<ScannedProgram | string> => {
	const steps = programSteps(key, entries, host)
	let step = steps.next()
	while (!step.done) {
		const [kind, requests] = step.value
		step = steps.next(
			await Promise.all(
				kind === "load" ?
					requests.map(id => host.load!(id))
				:	requests.map(request => host.resolve(...request))
			)
		)
	}
	return step.value
}

// as scanProgram, resolving each specifier as it's read, as --check does
export const scanProgramSync = (
	key: string,
	entries: ScanEntry[],
	host: Omit<ScanHost<ScanResolution>, "load">
): ScannedProgram | string => {
	const steps = programSteps(key, entries, host)
	let step = steps.next()
	// with no load, it reads each module's file itself
	while (!step.done) {
		const [kind, requests] = step.value
		step = steps.next(
			kind === "load" ? [] : requests.map(request => host.resolve(...request))
		)
	}
	return step.value
}

type ImportRequest = [specifier: string, importer: string, kind: ImportKind]

// what the scan asks its host for at once: the modules to load, or the imports
// to resolve, each of every module it read last
type ScanStep = ["load", ids: string[]] | ["resolve", requests: ImportRequest[]]

// yields what to load or resolve, and is passed what each holds or resolves
// to, reading the modules its entries reach a layer at a time
function* programSteps(
	key: string,
	entries: ScanEntry[],
	host: Omit<ScanHost<unknown>, "resolve">
): Generator<
	ScanStep,
	ScannedProgram | string,
	(string | undefined)[] | ScanResolution[]
> {
	const pathOf = (id: string) =>
		isAbsolute(id) ? printablePathOf(host.cwd, id) : id.replace(/^\0/, "")
	const modules: Record<string, ScannedModule> = {}
	const targets: Record<string, Record<string, string>> = {}
	// the bundler's id for each module, which it resolves from
	const hostIds = new Map<string, string>()
	let layer: string[] = []
	const add = (hostId: string) => {
		const id = host.idOf(hostId)
		if (!hostIds.has(id)) {
			hostIds.set(id, hostId)
			layer.push(id)
		}
		return id
	}
	const given = new Map(entries.map(entry => [add(entry.id), entry.source]))
	// a module imported dynamically is a chunk of its own where a bundler splits
	const dynamicImports = new Set<string>()
	const exposed = new Set<string>()
	// whether a dependency imports a module of the program, which it may
	// write into a chunk of its own
	let isImportedByDependency = false
	while (layer.length) {
		const read = layer.map(id => {
			const hostId = hostIds.get(id)!
			const isDependency = isLeftDependency(hostId, host)
			return {
				id,
				hostId,
				isDependency,
				// a dependency's script is read as its file holds it, for its
				// imports alone
				isLoaded:
					given.get(id) === undefined &&
					!!host.load &&
					!(isDependency && transformedId.test(hostId))
			}
		})
		layer = []
		const loading = read.filter(module => module.isLoaded)
		const loaded =
			loading.length ?
				((yield ["load", loading.map(module => module.hostId)]) as (
					| string
					| undefined
				)[])
			:	[]
		let loadedIndex = 0
		const reads = read.map(module => {
			const source =
				given.get(module.id) ??
				(module.isLoaded ?
					loaded[loadedIndex++]
				:	host.readFile?.(module.hostId))
			return {
				...module,
				source,
				...(source === undefined ?
					{ imports: [], unnamed: undefined }
				:	importsOf(module.id, source))
			}
		})
		const requests: ImportRequest[] = []
		for (const { hostId, imports } of reads) {
			for (const [specifier, kind] of imports) {
				if (!runtimeSpecifier.test(specifier))
					requests.push([specifier, hostId, kind])
			}
		}
		const resolutions =
			requests.length ? ((yield ["resolve", requests]) as ScanResolution[]) : []
		let next = 0
		for (const {
			id,
			hostId,
			source,
			isDependency,
			imports,
			unnamed
		} of reads) {
			if (source === undefined) {
				if (isDependency) continue
				return `${pathOf(id)} can't be read`
			}
			if (!isDependency) {
				modules[id] = {
					source,
					transformed: given.get(id) === undefined && host.isTransformed(hostId)
				}
			}
			const unreadAt = (offset: number, reason: string) =>
				`${positionIn(pathOf(id), source, offset)} ${reason}`
			if (unnamed && !isDependency)
				return unreadAt(unnamed.offset, unnamed.reason)
			const resolved: Record<string, string> = {}
			if (!isDependency) targets[id] = resolved
			for (const [specifier, kind, offset] of imports) {
				if (runtimeSpecifier.test(specifier)) continue
				const target = resolutions[next++]
				if (target === undefined) {
					if (isDependency) continue
					return unreadAt(
						offset,
						`imports "${specifier}", which doesn't resolve to a file`
					)
				}
				if (target === null || isAsset(target)) continue
				const isTargetDependency = isLeftDependency(target, host)
				// e.g. a Vue component, which may read a validator the build can't see
				if (!transformedId.test(target) && !host.load) {
					if (isTargetDependency) continue
					return unreadAt(
						offset,
						`imports ${pathOf(target)}, which isn't a script it can read`
					)
				}
				const targetId = add(target)
				if (isTargetDependency) continue
				if (isDependency) {
					exposed.add(targetId)
					isImportedByDependency = true
				} else resolved[specifier] = targetId
				if (kind === "dynamic-import") dynamicImports.add(targetId)
				if (!isAbsolute(targetId)) exposed.add(targetId)
			}
		}
	}
	return {
		key,
		entries: [...given.keys()],
		modules,
		targets,
		dynamicImports: [...dynamicImports],
		exposed: [...exposed],
		isOneChunk:
			given.size === 1 && !dynamicImports.size && !isImportedByDependency
	}
}

// what loads no module from import.meta: a value the bundler defines, like
// env, or a flag Nuxt defines, a path, a URL, which a module loads only
// through an import() the scan can't read, or hot or webpackHot, which a
// production build defines as undefined or leaves unimplemented, so no update
// it accepts runs where a bundle prunes
export const isInertMetaProperty = (name: unknown): boolean =>
	inertMetaProperties.has(name as never)

const inertMetaProperties = new Set([
	"env",
	"client",
	"server",
	"browser",
	"dev",
	"test",
	"nitro",
	"prerender",
	"envName",
	"url",
	"resolve",
	"dirname",
	"filename",
	"hot",
	"webpackHot"
])

// arktype's own, which never import the program
const runtimeSpecifier =
	/^(?:arktype|@ark\/(?:schema|util))(?:\/|$)|^~arktype\//

// a dependency the plugin leaves, read only for the modules of the program it
// imports, as a framework's runtime imports the app's routes, which it may
// read any way. Where it loads a module the scan can't name, it's assumed to
// be another dependency, and where it isn't, the build fails its check
const isLeftDependency = (id: string, host: Pick<ScanHost, "isTransformed">) =>
	dependencyOf(id) !== undefined && !host.isTransformed(id)

// e.g. a stylesheet, or a module Vite writes as a string or as a worker
export const isAsset = (id: string): boolean =>
	inertExtension.test(id) || inertQuery.test(id)

// with a query too, as Vite's ?inline or SVGR's ?react
const inertExtension =
	/\.(?:json|css|scss|sass|less|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|txt|wasm)(?:\?.*)?$/

const inertQuery = /\?(?:.*&)?(?:raw|url|worker|sharedworker)(?:&|$)/

type Import = [specifier: string, kind: ImportKind, offset: number]

interface UnnamedImport {
	offset: number
	reason: string
}

const unnamedAt = (offset: number, reason: string): UnnamedImport => ({
	offset,
	reason
})

// each specifier a module loads, and where and why it first loads one unnamed
const importsOf = (
	id: string,
	source: string
): { imports: Import[]; unnamed: UnnamedImport | undefined } => {
	// whose program is read only where it may call require, as reading it
	// copies the whole tree into JavaScript
	const parsed = parseSync(id, source, {
		lang: langOf(id),
		sourceType: /\.c[jt]s$/.test(id) ? "commonjs" : "module"
	})
	const { module, errors } = parsed
	const imports: Import[] = []
	if (errors.length) {
		return {
			imports,
			unnamed: unnamedAt(errors[0].labels[0]?.start ?? 0, "can't be parsed")
		}
	}
	let unnamed: UnnamedImport | undefined
	for (const { start, moduleRequest, entries } of module.staticImports) {
		if (entries.length && entries.every(entry => entry.isType)) continue
		imports.push([moduleRequest.value, "import-statement", start])
	}
	for (const { start, entries } of module.staticExports) {
		for (const entry of entries) {
			if (entry.moduleRequest && !entry.isType)
				imports.push([entry.moduleRequest.value, "import-statement", start])
		}
	}
	for (const { start, moduleRequest } of module.dynamicImports) {
		const specifier = literalIn(
			source.slice(moduleRequest.start, moduleRequest.end)
		)
		if (specifier !== undefined)
			imports.push([specifier, "dynamic-import", start])
		else
			unnamed ??= unnamedAt(start, "imports a module by a computed specifier")
	}
	for (const { start, end } of module.importMetas) {
		// e.g. import.meta.glob(), reaching modules unseen
		const read = /^\s*\.\s*([\w$]+)/.exec(source.slice(end))
		if (!read) unnamed ??= unnamedAt(start, "reads import.meta whole")
		else if (!isInertMetaProperty(read[1])) {
			unnamed ??= unnamedAt(
				start,
				`reads import.meta.${read[1]}, which may load modules it can't name`
			)
		}
	}
	if (/\brequire\b/.test(source)) {
		walk(parsed.program as never, (node: Node) => {
			if (node.type === "TSImportEqualsDeclaration") {
				if (node.moduleReference.type === "TSExternalModuleReference") {
					imports.push([
						node.moduleReference.expression.value,
						"require-call",
						node.start
					])
				}
			} else if (node.type === "CallExpression") {
				if (node.callee.type !== "Identifier" || node.callee.name !== "require")
					return true
				const [argument] = node.arguments
				if (argument?.type === "Literal" && typeof argument.value === "string")
					imports.push([argument.value, "require-call", node.start])
				else {
					unnamed ??= unnamedAt(
						node.start,
						"calls require() by a computed specifier"
					)
				}
				return false
			} else if (node.type === "Identifier" && node.name === "require")
				unnamed ??= unnamedAt(node.start, "reads require other than to call it")
			return true
		})
	}
	return { imports, unnamed }
}

// e.g. src/main.ts:3:1
const positionIn = (path: string, source: string, offset: number) => {
	const before = source.slice(0, offset)
	return `${path}:${before.split("\n").length}:${offset - before.lastIndexOf("\n")}`
}

const literalIn = (text: string): string | undefined =>
	/^(["'`])([^"$'\\`]*)\1$/.exec(text.trim())?.[2]

// the modules a bundle holds, and each import of one, from what it bundled,
// each as the precompiler names it
export interface Imports {
	// undefined where the build can't read it
	entries: (string | undefined)[]
	// each the plugin may have loaded
	modules: (string | undefined)[]
	edges: [importer: string | undefined, target: string][]
}

// each module's source as the plugin loaded it, by the precompiler's name for
// it, null where the bundle loads its file under two ids unalike
export type LoadedSources = Map<string, string | null>

export const addLoaded = (
	loaded: LoadedSources,
	id: string,
	source: string
): void => {
	loaded.set(id, !loaded.has(id) || loaded.get(id) === source ? source : null)
}

// why the bundle may hold a read its scan didn't see, if it may
export const unseenProblemOf = (
	scanned: ScannedProgram,
	imports: Imports,
	loaded: LoadedSources,
	// each module creating a validator
	holders: ReadonlySet<string>,
	// what messages name paths from
	cwd: string
): string | undefined => {
	const pathOf = (id: string) =>
		isAbsolute(id) ? printablePathOf(cwd, id) : id
	// what any code may import, as their exports are read whole: entries,
	// what import() loads, and modules with no file
	const whole = new Set([
		...scanned.entries,
		...scanned.dynamicImports,
		...scanned.exposed
	])
	for (const entry of imports.entries) {
		if (entry === undefined || !(whole.has(entry) || isAsset(entry))) {
			return writeUnseenMessage(
				`it built ${entry === undefined ? "an entry" : pathOf(entry)} as an entry`
			)
		}
	}
	for (const id of imports.modules) {
		// e.g. esbuild's stdin, which the bundler reads as the scan did
		if (id === undefined || !scanned.modules[id]?.transformed) continue
		if (loaded.get(id) !== scanned.modules[id].source) {
			return writeUnseenMessage(
				loaded.has(id) ?
					`it built ${pathOf(id)} from other code than it read`
				:	`another plugin loaded ${pathOf(id)}`
			)
		}
	}
	const reaching = reachingOf(scanned, holders)
	for (const [importer, target] of imports.edges) {
		// e.g. a framework's runtime importing the app's generated config
		if (!reaching.has(target) || whole.has(target)) continue
		if (
			importer === undefined ||
			!Object.values(scanned.targets[importer] ?? {}).includes(target)
		) {
			return writeUnseenMessage(
				`${importer === undefined ? "a module it can't read" : pathOf(importer)} imports ${pathOf(target)}`
			)
		}
	}
}

// each module a validator may be imported through: one creating it, or one
// importing a module it may be imported through
const reachingOf = (
	scanned: ScannedProgram,
	holders: ReadonlySet<string>
): Set<string> => {
	const importersByTarget = new Map<string, string[]>()
	for (const importer in scanned.targets) {
		for (const target of Object.values(scanned.targets[importer])) {
			const importers = importersByTarget.get(target)
			if (importers) importers.push(importer)
			else importersByTarget.set(target, [importer])
		}
	}
	const reaching = new Set(holders)
	for (const id of reaching) {
		for (const importer of importersByTarget.get(id) ?? [])
			reaching.add(importer)
	}
	return reaching
}

// e.g. "src/routes.ts:3:1 reads import.meta.glob, ...", where the build
// can't read the bundle, so it writes it as prune: false would
export const writeUnprunedMessage = (
	reason: string,
	fix = "Set prune: false to build them whole without this warning."
): string =>
	`prune: off, because ${reason}, so the build keeps every member of its validators. ${fix}`

// where the build reads the bundle but not what a read of its validators
// needs, so it keeps each member members leaves to it
export const writeKeptMembersMessage = (
	reason: string,
	kept: readonly string[]
): string => {
	const list =
		kept.length === 1 ?
			kept[0]
		:	`${kept.slice(0, -1).join(", ")} and ${kept[kept.length - 1]}`
	return `prune: keeping ${list}, because ${reason}. Set ${list} in members, ${kept.length === 1 ? "" : "each "}false where no code reads it, to build without this warning.`
}

// a call to a helper whose calls the build folds runs only where the plugin
// transforms it, so neither code it leaves nor code outside the bundle can call it
export const unfoldedCallProblemOf = (
	foldedHelpersById: ReadonlyMap<string, string[]>,
	imports: Imports,
	isTransformed: (id: string) => boolean,
	// what messages name paths from
	cwd: string
): string | undefined => {
	const pathOf = (id: string) =>
		isAbsolute(id) ? printablePathOf(cwd, fileOf(id)) : id
	for (const entry of imports.entries) {
		const [helper] =
			(entry !== undefined && foldedHelpersById.get(fileOf(entry))) || []
		if (helper) return writeEntryHelperMessage(pathOf(entry!), helper)
	}
	for (const [importer, target] of imports.edges) {
		const [helper] = foldedHelpersById.get(fileOf(target)) ?? []
		if (helper && (importer === undefined || !isTransformed(importer))) {
			return writeUntransformedHelperMessage(
				importer === undefined ? "a module it can't read" : pathOf(importer),
				pathOf(target),
				helper
			)
		}
	}
}

export const writeUntransformedHelperMessage = (
	importer: string,
	exporter: string,
	helper: string
): string =>
	`${exporter} exports ${helper}, a helper the build precompiles at each call, but ${importer} imports it and isn't a module the plugin transforms, so a call to ${helper} there would throw at runtime. Call ${helper} in a module the plugin transforms, like a .ts file, and import what it returns, or move ${helper} to a module ${importer} doesn't import.`

export const writeEntryHelperMessage = (
	entry: string,
	helper: string
): string =>
	`${entry} exports ${helper}, a helper the build precompiles at each call, but it's an entry, so code outside the bundle may call ${helper}, which would throw at runtime. Export what ${helper} returns instead.`

export const writeUnseenMessage = (reason: string): string =>
	`A production build leaves out of its validators what no read of them needs, as it found reading the bundle's modules, but ${reason}, so a read it didn't see may need what it left out. Set prune: false to build them whole.`

export const writeUnscannedFlatMessage = (path: string): string =>
	`A production build declares the units its validators read in one function, as it found reading the bundle's modules first, but it built ${path} from code it didn't read, whose validators would read copies of them. Build again, or set prune: false to build each unit as a module of its own.`
