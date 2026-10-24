import { isAbsolute } from "node:path"
import { parseSync, type Node } from "oxc-parser"
import { dependencyOf, printablePathOf, transformedId } from "./host.ts"
import type { ScannedModule, ScannedProgram } from "./precompile.ts"
import { walk } from "./scope.ts"

export type ImportKind = "import-statement" | "dynamic-import" | "require-call"

// a specifier's module as the bundler resolves it: its file, null where the
// bundle doesn't hold it, or undefined where the build can't read what it is
export type ScanResolution = string | null | undefined

export interface ScanHost<resolution = Promise<ScanResolution>> {
	resolve: (specifier: string, importer: string, kind: ImportKind) => resolution
	readFile: (id: string) => string | undefined
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
	while (!step.done) step = steps.next(await host.resolve(...step.value))
	return step.value
}

// as scanProgram, resolving each specifier as it's read, as --check does
export const scanProgramSync = (
	key: string,
	entries: ScanEntry[],
	host: ScanHost<ScanResolution>
): ScannedProgram | string => {
	const steps = programSteps(key, entries, host)
	let step = steps.next()
	while (!step.done) step = steps.next(host.resolve(...step.value))
	return step.value
}

// yields each import to resolve, and is passed what it resolves to
function* programSteps(
	key: string,
	entries: ScanEntry[],
	host: Omit<ScanHost<unknown>, "resolve">
): Generator<
	[specifier: string, importer: string, kind: ImportKind],
	ScannedProgram | string,
	ScanResolution
> {
	const pathOf = (id: string) =>
		isAbsolute(id) ? printablePathOf(host.cwd, id) : id
	const modules: Record<string, ScannedModule> = {}
	const targets: Record<string, Record<string, string>> = {}
	// the bundler's id for each module, which it resolves from
	const pending = new Map<string, string>()
	const add = (hostId: string) => {
		const id = host.idOf(hostId)
		if (!pending.has(id)) pending.set(id, hostId)
		return id
	}
	const given = new Map(entries.map(entry => [add(entry.id), entry.source]))
	// a module imported dynamically is a chunk of its own where a bundler splits
	const dynamicImports = new Set<string>()
	for (const [id, hostId] of pending) {
		const source = given.get(id) ?? host.readFile(hostId)
		if (source === undefined) return `${pathOf(id)} can't be read`
		modules[id] = {
			source,
			transformed: given.get(id) === undefined && host.isTransformed(hostId)
		}
		const unreadAt = (offset: number, reason: string) =>
			`${positionIn(pathOf(id), source, offset)} ${reason}`
		const imports = importsOf(id, source)
		if (!Array.isArray(imports)) return unreadAt(imports.offset, imports.reason)
		const resolved: Record<string, string> = (targets[id] = {})
		for (const [specifier, kind, offset] of imports) {
			if (runtimeSpecifier.test(specifier)) continue
			const target = yield [specifier, hostId, kind]
			if (target === undefined) {
				return unreadAt(
					offset,
					`imports "${specifier}", which doesn't resolve to a file`
				)
			}
			if (target === null || isInert(target, host)) continue
			// e.g. a Vue component, which may read a validator the build can't see
			if (!transformedId.test(target)) {
				return unreadAt(
					offset,
					`imports ${pathOf(target)}, which isn't a script it can read`
				)
			}
			resolved[specifier] = add(target)
			if (kind === "dynamic-import") dynamicImports.add(resolved[specifier])
		}
	}
	return {
		key,
		entries: [...given.keys()],
		modules,
		targets,
		dynamicImports: [...dynamicImports],
		isOneChunk: given.size === 1 && !dynamicImports.size
	}
}

// what loads no module from import.meta: a value the bundler defines, a path, a
// URL, which a module loads only through an import() the scan can't read, or
// hot, which Vite's build defines as undefined and other bundlers leave
// unimplemented, so no update it accepts runs where a bundle prunes
export const isInertMetaProperty = (name: unknown): boolean =>
	name === "env" ||
	name === "hot" ||
	name === "url" ||
	name === "resolve" ||
	name === "dirname" ||
	name === "filename"

// arktype's own, which never import the program
const runtimeSpecifier =
	/^(?:arktype|@ark\/(?:schema|util))(?:\/|$)|^~arktype\//

// a dependency the plugin leaves, an asset, or a module Vite writes as a
// string or as a worker, a bundle of its own, which import nothing of the
// program
const isInert = (id: string, host: Pick<ScanHost, "isTransformed">) =>
	(dependencyOf(id) !== undefined && !host.isTransformed(id)) ||
	inertExtension.test(id) ||
	inertQuery.test(id)

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

// each specifier a module loads, or where and why it loads one unnamed
const importsOf = (id: string, source: string): Import[] | UnnamedImport => {
	const { module, program, errors } = parseSync(id, source, {
		lang: langOf(id),
		sourceType: /\.c[jt]s$/.test(id) ? "commonjs" : "module"
	})
	if (errors.length)
		return unnamedAt(errors[0].labels[0]?.start ?? 0, "can't be parsed")
	const result: Import[] = []
	for (const { start, moduleRequest, entries } of module.staticImports) {
		if (entries.length && entries.every(entry => entry.isType)) continue
		result.push([moduleRequest.value, "import-statement", start])
	}
	for (const { start, entries } of module.staticExports) {
		for (const entry of entries) {
			if (entry.moduleRequest && !entry.isType)
				result.push([entry.moduleRequest.value, "import-statement", start])
		}
	}
	for (const { start, moduleRequest } of module.dynamicImports) {
		const specifier = literalIn(
			source.slice(moduleRequest.start, moduleRequest.end)
		)
		if (specifier === undefined)
			return unnamedAt(start, "imports a module by a computed specifier")
		result.push([specifier, "dynamic-import", start])
	}
	for (const { start, end } of module.importMetas) {
		// e.g. import.meta.glob(), reaching modules unseen
		const read = /^\s*\.\s*([\w$]+)/.exec(source.slice(end))
		if (!read) return unnamedAt(start, "reads import.meta whole")
		if (!isInertMetaProperty(read[1])) {
			return unnamedAt(
				start,
				`reads import.meta.${read[1]}, which may load modules it can't name`
			)
		}
	}
	let computed: UnnamedImport | undefined
	if (/\brequire\b/.test(source)) {
		walk(program as never, (node: Node) => {
			if (computed) return false
			if (node.type === "TSImportEqualsDeclaration") {
				if (node.moduleReference.type === "TSExternalModuleReference") {
					result.push([
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
					result.push([argument.value, "require-call", node.start])
				else {
					computed = unnamedAt(
						node.start,
						"calls require() by a computed specifier"
					)
				}
				return false
			} else if (node.type === "Identifier" && node.name === "require")
				computed = unnamedAt(node.start, "reads require other than to call it")
			return true
		})
	}
	return computed ?? result
}

// e.g. src/main.ts:3:1
const positionIn = (path: string, source: string, offset: number) => {
	const before = source.slice(0, offset)
	return `${path}:${before.split("\n").length}:${offset - before.lastIndexOf("\n")}`
}

const literalIn = (text: string): string | undefined =>
	/^(["'`])([^"$'\\`]*)\1$/.exec(text.trim())?.[2]

const langOf = (id: string) =>
	/\.[cm]?tsx$/.test(id) ? "tsx"
	: /\.[cm]?ts$/.test(id) ? "ts"
	: /\.jsx$/.test(id) ? "jsx"
	: "js"

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
	// what messages name paths from
	cwd: string
): string | undefined => {
	const pathOf = (id: string) =>
		isAbsolute(id) ? printablePathOf(cwd, id) : id
	for (const entry of imports.entries) {
		// import() reads its module whole, as a read of an entry's exports does
		if (
			entry === undefined ||
			!(
				scanned.entries.includes(entry) ||
				scanned.dynamicImports.includes(entry)
			)
		) {
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
	for (const [importer, target] of imports.edges) {
		if (!(target in scanned.modules)) continue
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

// e.g. "src/routes.ts:3:1 reads import.meta.glob, ...", once a build reads it
export const writeUnprunedMessage = (
	reason: string,
	fix = "Set prune: false to build them whole without this warning."
): string =>
	`prune: off, because ${reason}, so the build keeps every member of its validators. ${fix}`

export const writeUnseenMessage = (reason: string): string =>
	`A production build leaves out of its validators what no read of them needs, as it found reading the bundle's modules, but ${reason}, so a read it didn't see may need what it left out. Set prune: false to build them whole.`

export const writeUnscannedFlatMessage = (path: string): string =>
	`A production build declares the units its validators read in one function, as it found reading the bundle's modules first, but it built ${path} from code it didn't read, whose validators would read copies of them. Build again, or set prune: false to build each unit as a module of its own.`
