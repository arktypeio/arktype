import type {
	IssueFeatures,
	ValidatorMember
} from "arktype/internal/standalone.ts"
import { flatMorph } from "@ark/util"
import { isAbsolute } from "node:path"
import { parseSync, type Node, type Program } from "oxc-parser"
import { dependencyOf, fileOf, printablePathOf, transformedId } from "./host.ts"
import { langOf } from "./module.ts"
import { ModuleScopes, operatorOf, walk } from "./scope.ts"

export type ImportKind = "import-statement" | "dynamic-import" | "require-call"

// the module's file, null where the bundle doesn't hold it, undefined where the build can't tell
export type ScanResolution = string | null | undefined

export interface ScanHost<resolution = Promise<ScanResolution>> {
	resolve: (specifier: string, importer: string, kind: ImportKind) => resolution
	// the file's code, where the bundler can't load it or it's a dependency
	// read for its imports alone
	readFile?: (id: string) => string | undefined
	// the code as the bundler loads it through the plugins ahead, like a Svelte component's
	load?: (id: string) => Promise<string | undefined>
	isTransformed: (id: string) => boolean
	// the precompiler's name for a bundler's id, as Vite writes / on Windows
	idOf: (id: string) => string
	cwd: string
}

export interface ScanEntry {
	id: string
	// e.g. esbuild's stdin, which the bundler loads itself
	source?: string
}

// the modules a bundle's entries reach, or why one may reach a validator unseen
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
	while (!step.done) {
		const [kind, requests] = step.value
		step = steps.next(
			kind === "load" ? [] : requests.map(request => host.resolve(...request))
		)
	}
	return step.value
}

type ImportRequest = [specifier: string, importer: string, kind: ImportKind]

type ScanStep = ["load", ids: string[]] | ["resolve", requests: ImportRequest[]]

// reads the modules its entries reach a layer at a time, yielding what to load or resolve
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
	const arkImports: Record<string, string[]> = {}
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
	// a dependency importing a module of the program may write it into a chunk of its own
	let isImportedByDependency = false
	while (layer.length) {
		const read = layer.map(id => {
			const hostId = hostIds.get(id)!
			const isDependency = isLeftDependency(hostId, host)
			return {
				id,
				hostId,
				isDependency,
				// a dependency's script is read from its file, for its imports alone
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
		for (const { id, hostId, imports } of reads) {
			for (const [specifier, kind] of imports) {
				if (!runtimeSpecifier.test(specifier))
					requests.push([specifier, hostId, kind])
				else (arkImports[id] ??= []).push(specifier)
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
		arkImports,
		dynamicImports: [...dynamicImports],
		exposed: [...exposed],
		isOneChunk:
			given.size === 1 && !dynamicImports.size && !isImportedByDependency
	}
}

// a module as a bundler built it, for a host that can read one only once it has
export interface BuiltModule {
	// its file, undefined where it has none, like what a loader generates
	id: string | undefined
	// as it reached the plugin, or as built where the plugin leaves it, null
	// where the bundle built the file from two codes
	source: string | null | undefined
	transformed: boolean
	mappings: string | undefined
	imports: BuiltImport[]
	// a transformed module as the loaders after the plugin built it, which
	// may add a read the plugin didn't see
	built?: string | undefined
}

export interface BuiltImport {
	// undefined where nothing names it, like what a bundler's plugin adds
	specifier: string | undefined
	isDynamic: boolean
	target: BuiltModule
}

// what the modules a bundler built from its entries read, or why it can't tell.
// Nothing about it is a guess at what the bundle holds, so what it can't read
// is what no module of the program reads through a name it knows
export const programAsBuilt = (
	key: string,
	entries: readonly BuiltModule[],
	host: Pick<ScanHost, "isTransformed" | "cwd">
): ScannedProgram | string => {
	const pathOf = (id: string) => printablePathOf(host.cwd, id)
	const modules: Record<string, ScannedModule> = {}
	const targets: Record<string, Record<string, string>> = {}
	const arkImports: Record<string, string[]> = {}
	const dynamicImports = new Set<string>()
	const exposed = new Set<string>()
	let isImportedByDependency = false
	const isRead = (module: BuiltModule) => isReadBuilt(module, host)
	// what each module's text imports, which a loader after the plugin may add to
	const namedBy = new Map<string, Set<string>>()
	const reached = new Set(entries)
	for (const module of reached) {
		if (isRead(module)) {
			const { id, source, transformed, mappings } = module
			if (source === undefined) return `${pathOf(id)} can't be read`
			if (
				source === null ||
				(id in modules &&
					(modules[id].source !== source ||
						modules[id].transformed !== transformed))
			)
				return `it built ${pathOf(id)} from two codes`
			if (!(id in modules)) {
				const { imports, unnamed } = importsOf(id, source)
				if (unnamed?.reason === unparsed)
					return `${positionIn(pathOf(id), source, unnamed.offset)} ${unparsed}`
				namedBy.set(id, new Set(imports.map(([specifier]) => specifier)))
				modules[id] = {
					source,
					transformed,
					mappings,
					// read again once the plugin wrote the program, for what the
					// loaders after it add
					...(module.built !== undefined &&
						module.built !== source && { built: module.built })
				}
				targets[id] = {}
			}
		}
		for (const { specifier, isDynamic, target } of module.imports) {
			if (specifier !== undefined && runtimeSpecifier.test(specifier)) {
				// a generated module's reads are as unknown as a dependency's
				const imported = (arkImports[module.id ?? ""] ??= [])
				if (!imported.includes(specifier)) imported.push(specifier)
				continue
			}
			reached.add(target)
			if (!isRead(target)) continue
			if (isDynamic) dynamicImports.add(target.id)
			if (!isRead(module)) {
				exposed.add(target.id)
				isImportedByDependency = true
				continue
			}
			if (specifier === undefined || !namedBy.get(module.id)!.has(specifier))
				exposed.add(target.id)
			if (specifier === undefined) continue
			const resolved = targets[module.id]
			if (specifier in resolved && resolved[specifier] !== target.id)
				return `${pathOf(module.id)} imports "${specifier}" as both ${pathOf(resolved[specifier])} and ${pathOf(target.id)}`
			resolved[specifier] = target.id
		}
	}
	const read = [...new Set(entries.filter(isRead).map(({ id }) => id))]
	return {
		key,
		entries: read.sort(),
		modules: sortedByKey(modules),
		targets: sortedByKey(
			flatMorph(targets, (id, resolved) => [id, sortedByKey(resolved)])
		),
		arkImports: sortedByKey(
			flatMorph(arkImports, (id, imported) => [id, imported.sort()])
		),
		dynamicImports: [...dynamicImports].sort(),
		exposed: [...exposed].sort(),
		isOneChunk:
			entries.length === 1 &&
			read.length === 1 &&
			!dynamicImports.size &&
			!isImportedByDependency
	}
}

const isReadBuilt = (
	module: BuiltModule,
	host: Pick<ScanHost, "isTransformed">
): module is BuiltModule & { id: string } =>
	module.id !== undefined && !isLeftDependency(module.id, host)

// what a define may name without a module's binding being what it reads
const definableGlobals = new Set([
	...Object.getOwnPropertyNames(globalThis),
	"window",
	"self",
	"document",
	"navigator",
	"location",
	"module",
	"exports",
	"require",
	"__dirname",
	"__filename",
	"__webpack_require__",
	"__non_webpack_require__"
])

// the first name in a define's code that isn't a global, where it can't be read
const bindingNamedIn = (code: string): string | undefined => {
	const { program, errors } = parseSync("define.js", `(${code})`)
	if (errors.length) return code
	let named: string | undefined
	const visit = (node: Node): boolean => {
		if (named !== undefined || node.type === "MetaProperty") return false
		if (node.type === "Identifier" && !definableGlobals.has(node.name))
			named = node.name
		// a name at a key reads nothing
		if (
			(node.type === "MemberExpression" || node.type === "Property") &&
			!node.computed
		) {
			walk(node.type === "Property" ? node.value : node.object, visit)
			return false
		}
		return true
	}
	walk(program, visit)
	return named
}

// why a bundler writing a define into a module may read a validator its read
// can't see, as no module's text holds that code. What names only literals and
// globals can't reach a binding, which a read at a global's key is baked for
export const unreadDefineOf = (
	defines: Record<string, unknown> | undefined
): string | undefined => {
	for (const key in defines) {
		const value = defines[key]
		const code =
			typeof value === "function" ? String(value)
			: typeof value === "string" ? value
			: undefined
		if (code !== undefined) {
			const named = bindingNamedIn(code)
			if (named !== undefined)
				return `define names ${named} in ${code}, which may read a validator where no module's text shows it`
		} else if (typeof value === "object" && value !== null) {
			// webpack's DefinePlugin.runtimeValue
			if ("fn" in value)
				return `define writes ${key} at build time, which may read a validator where no module's text shows it`
			if (!(value instanceof RegExp)) {
				const nested = unreadDefineOf(value as Record<string, unknown>)
				if (nested) return nested
			}
		}
	}
}

// a module the bundle reaches that its program doesn't hold, as a plugin may
// add one once the program's read
export const unreadBuiltOf = (
	{ modules }: ScannedProgram,
	entries: readonly BuiltModule[],
	host: Pick<ScanHost, "isTransformed">
): string | undefined => {
	const reached = new Set(entries)
	for (const module of reached) {
		if (isReadBuilt(module, host) && !(module.id in modules)) return module.id
		for (const { specifier, target } of module.imports) {
			if (specifier === undefined || !runtimeSpecifier.test(specifier))
				reached.add(target)
		}
	}
}

// the same program read in any order answers the same
const sortedByKey = <value>(o: Record<string, value>): Record<string, value> =>
	Object.fromEntries(
		Object.keys(o)
			.sort()
			.map(k => [k, o[k]])
	)

// import.meta members that load no module; hot and webpackHot are undefined or
// inert in a production build
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
export const runtimeSpecifier =
	/^(?:arktype|@ark\/(?:schema|util))(?:\/|$)|^~arktype\//

// a dependency the plugin leaves, read only for the program's modules it imports
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

const unparsed = "can't be parsed"

const unnamedAt = (offset: number, reason: string): UnnamedImport => ({
	offset,
	reason
})

// each specifier a module loads, and where and why it first loads one unnamed
export const importsOf = (
	id: string,
	source: string
): { imports: Import[]; unnamed: UnnamedImport | undefined } => {
	const parsed = parseSync(id, source, {
		lang: langOf(id),
		sourceType: /\.c[jt]s$/.test(id) ? "commonjs" : "module"
	})
	const { module, errors } = parsed
	const imports: Import[] = []
	if (errors.length) {
		return {
			imports,
			unnamed: unnamedAt(errors[0].labels[0]?.start ?? 0, unparsed)
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
	// reading .program copies the tree into JavaScript, so only where it may call require
	if (/\brequire\b/.test(source)) {
		const program = parsed.program as never as Program
		walk(program, node => {
			if (
				node.type === "TSImportEqualsDeclaration" &&
				node.moduleReference.type === "TSExternalModuleReference"
			) {
				imports.push([
					node.moduleReference.expression.value,
					"require-call",
					node.start
				])
			}
			return true
		})
		// require no binding declares, so not auth.require(...) or a key named require
		for (const { id } of new ModuleScopes(program).root.unresolved) {
			if (id.name !== "require") continue
			const [operand, call] = operatorOf(id)
			if (call?.type !== "CallExpression" || call.callee !== operand) {
				unnamed ??= unnamedAt(id.start, "reads require other than to call it")
				continue
			}
			const [argument] = call.arguments
			if (argument?.type === "Literal" && typeof argument.value === "string")
				imports.push([argument.value, "require-call", call.start])
			else {
				unnamed ??= unnamedAt(
					call.start,
					"calls require() by a computed specifier"
				)
			}
		}
	}
	return { imports, unnamed }
}

// e.g. src/main.ts:3:1
const positionIn = (path: string, source: string, offset: number) => {
	const before = source.slice(0, offset)
	return `${path}:${before.split("\n").length}:${offset - before.lastIndexOf("\n")}`
}

// a `$` not opening an expression, as in TanStack Router's `$.tsx`, is part of the name
const literalIn = (text: string): string | undefined =>
	/^(["'`])((?:[^"$'\\`]|\$(?!{))*)\1$/.exec(text.trim())?.[2]

// what the bundle holds, each as the precompiler names it
export interface Imports {
	// undefined where the build can't read it
	entries: (string | undefined)[]
	modules: (string | undefined)[]
	edges: [importer: string | undefined, target: string][]
}

// by the precompiler's name, null where the bundle loads a file under two ids unalike
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
	cwd: string
): string | undefined => {
	const pathOf = (id: string) =>
		isAbsolute(id) ? printablePathOf(cwd, id) : id
	// what any code may import whole: entries, import() targets and modules with no file
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
			// a plugin ahead rewrote it after the scan read its file, as
			// TanStack Router's code splitting does
			return loaded.has(id) ?
					writeUnseenMessage(
						`it built ${pathOf(id)} from other code than it read, as a plugin ahead of arktype's rewrote it after it read its file`,
						"List precompile.vite() right after your framework's plugin and ahead of react(), a Babel plugin or another that rewrites modules, or set prune: false to build them whole"
					)
				:	writeUnseenMessage(`another plugin loaded ${pathOf(id)}`)
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

export const writeUnprunedMessage = (
	reason: string,
	fix = "Set prune: false to build them whole without this warning."
): string =>
	`prune: off, because ${reason}, so the build keeps every member of its validators. ${fix}`

export const writeKeptMembersMessage = (
	reason: string,
	kept: readonly string[]
): string => {
	const list =
		kept.length === 1 ?
			kept[0]
		:	`${kept.slice(0, -1).join(", ")} and ${kept[kept.length - 1]}`
	const example =
		kept.includes("~standard") ?
			", like ~standard where a library validates with it,"
		:	""
	return `prune: keeping ${list}, because ${reason}. Set ${list} in members, ${kept.length === 1 ? "" : "each "}true where code reads it${example} else false, to build without this warning.`
}

// each of lost is a validator's position and why the build lost track of it
export const writeLostMessage = (lost: readonly string[]): string =>
	`precompile: baking each introspection member into ${lost.length === 1 ? "the validator" : `${lost.length} validators, like the one`} at ${lost[0]}. Set expression, description, json, toJSON, toJsonSchema and ~standard.jsonSchema in members, each false where no code reads it, to build without this warning.`

// a folded helper's call runs only where the plugin transforms it
export const unfoldedCallProblemOf = (
	foldedHelpersById: ReadonlyMap<string, string[]>,
	imports: Imports,
	isTransformed: (id: string) => boolean,
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

export const writeUnseenMessage = (
	reason: string,
	fix = "Set prune: false to build them whole"
): string =>
	`A production build leaves out of its validators what no read of them needs, as it found reading the bundle's modules, but ${reason}, so a read it didn't see may need what it left out. ${fix}.`

export const writeUnscannedFlatMessage = (path: string): string =>
	`A production build declares the units its validators read in one function, as it found reading the bundle's modules first, but it built ${path} from code it didn't read, whose validators would read copies of them. Build again, or set prune: false to build each unit as a module of its own.`

export const writeUnscannedCellsMessage = (path: string): string =>
	`A production build reads each function a module creates once from one variable, as it found reading the bundle's modules first, but another plugin rewrote ${path} after it read it, so it can't tell which function is which. List precompile.vite() right after your framework's plugin and ahead of react(), a Babel plugin or another that rewrites modules, or set prune: false to pass each validator the functions it reads.`

export const unseenFlatMessage =
	"A production build declares the units its validators read in one function, as it found reading the bundle's modules first, but the bundle it built reads a validator it found no read of, as another plugin wrote or rewrote a module after it read it, and that validator would read copies of them. List precompile.vite() right after your framework's plugin and ahead of react(), a Babel plugin or another that rewrites modules, or set prune: false to build each unit as a module of its own."

export interface ScannedProgram {
	// names the bundle, so only its transforms apply what was read
	key: string
	entries: string[]
	modules: Record<string, ScannedModule>
	// what each module's specifiers resolve to, where the bundle holds it
	targets: Record<string, Record<string, string>>
	// what each module, a dependency's too, imports of arktype's packages
	arkImports: Record<string, string[]>
	// each module import() loads, which a bundler that splits builds as an entry
	dynamicImports: string[]
	// each module with no file, like a framework's virtual module, which its
	// runtime may import unseen
	exposed: string[]
	isOneChunk?: boolean
}

export interface ScannedModule {
	source: string
	// whether the host precompiles it, as it may not an entry it's given
	transformed: boolean
	// how its lines map to its file's, where a plugin ahead of the host's transformed it
	mappings?: string | undefined
	// as the loaders after the plugin built it from source, as webpack's do
	built?: string | undefined
}

export interface ScannedUsage {
	dropped: ValidatorMember[]
	// whether a checker the bundle reads once is written where it's read
	linked: boolean
	// modules it no longer reads, as their units are declared in one function
	replaced: string[]
	// whether it wrote each module, for a transform naming the bundle to read
	written: boolean
	// each module creating a validator, which only a module reaching it may read
	holders: string[]
	// whether it left out anything a read the scan didn't see may need, so the
	// host reads the bundle as built
	verifies: boolean
	// the warning where it left out no member members leaves to it
	unpruned?: string | undefined
	// the warning where it baked every introspection member, having lost track of a read
	lost?: string | undefined
	// what each validator bakes of the introspection members members leaves to
	// it, as code reading it reads them
	baked?: string[]
	// what its issues may hold, unless they may hold anything
	issues?: IssueFeatures | undefined
}
