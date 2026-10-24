import { isAbsolute } from "node:path"
import { parseSync, type Node } from "oxc-parser"
import { dependencyOf, printablePathOf, transformedId } from "./host.ts"
import type { ScannedModule, ScannedProgram } from "./precompile.ts"
import { walk } from "./scope.ts"

export type ImportKind = "import-statement" | "dynamic-import" | "require-call"

// a specifier's module as the bundler resolves it: its file, null where the
// bundle doesn't hold it, or undefined where the build can't read what it is
export type ScanResolution = string | null | undefined

export interface ScanHost {
	resolve: (
		specifier: string,
		importer: string,
		kind: ImportKind
	) => Promise<ScanResolution>
	readFile: (id: string) => string | undefined
	// whether the plugin precompiles a module the bundler loads
	isTransformed: (id: string) => boolean
	// the precompiler's name for a module, which a bundler may write otherwise,
	// as Vite writes / on Windows
	idOf: (id: string) => string
}

export interface ScanEntry {
	id: string
	// e.g. esbuild's stdin, which the bundler loads itself
	source?: string
}

// the modules a bundle's entries reach, or undefined where one may reach a
// validator through code the build can't read
export const scanProgram = async (
	key: string,
	entries: ScanEntry[],
	host: ScanHost
): Promise<ScannedProgram | undefined> => {
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
	let importsDynamically = false
	for (const [id, hostId] of pending) {
		const source = given.get(id) ?? host.readFile(hostId)
		if (source === undefined) return
		modules[id] = {
			source,
			transformed: given.get(id) === undefined && host.isTransformed(hostId)
		}
		const imports = importsOf(id, source)
		if (!imports) return
		const resolved: Record<string, string> = (targets[id] = {})
		for (const [specifier, kind] of imports) {
			if (runtimeSpecifier.test(specifier)) continue
			const target = await host.resolve(specifier, hostId, kind)
			if (target === undefined) return
			if (target === null || isInert(target, host)) continue
			// e.g. a Vue component, which may read a validator the build can't see
			if (!transformedId.test(target)) return
			if (kind === "dynamic-import") importsDynamically = true
			resolved[specifier] = add(target)
		}
	}
	return {
		key,
		entries: [...given.keys()],
		modules,
		targets,
		isOneChunk: given.size === 1 && !importsDynamically
	}
}

// arktype's own, which never import the program
const runtimeSpecifier =
	/^(?:arktype|@ark\/(?:schema|util))(?:\/|$)|^~arktype\//

// a dependency the plugin leaves, or an asset, which import nothing of the program
const isInert = (id: string, host: ScanHost) =>
	(dependencyOf(id) !== undefined && !host.isTransformed(id)) ||
	inertExtension.test(id)

const inertExtension =
	/\.(?:json|css|scss|sass|less|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|txt|wasm)$/

// each specifier a module loads, or undefined where one is computed
const importsOf = (
	id: string,
	source: string
): [specifier: string, kind: ImportKind][] | undefined => {
	const { module, program, errors } = parseSync(id, source, {
		lang: langOf(id),
		sourceType: /\.c[jt]s$/.test(id) ? "commonjs" : "module"
	})
	if (errors.length) return
	const result: [string, ImportKind][] = []
	for (const { moduleRequest, entries } of module.staticImports) {
		if (entries.length && entries.every(entry => entry.isType)) continue
		result.push([moduleRequest.value, "import-statement"])
	}
	for (const { entries } of module.staticExports) {
		for (const entry of entries) {
			if (entry.moduleRequest && !entry.isType)
				result.push([entry.moduleRequest.value, "import-statement"])
		}
	}
	let isComputed = false
	for (const { moduleRequest } of module.dynamicImports) {
		const specifier = literalIn(
			source.slice(moduleRequest.start, moduleRequest.end)
		)
		if (specifier === undefined) return
		result.push([specifier, "dynamic-import"])
	}
	for (const { end } of module.importMetas) {
		// e.g. import.meta.glob() or a worker's URL, reaching modules unseen
		if (!/^\s*\.\s*(?:env|dirname|filename)\b/.test(source.slice(end))) return
	}
	if (/\brequire\b/.test(source)) {
		walk(program as never, (node: Node) => {
			if (node.type === "TSImportEqualsDeclaration") {
				if (node.moduleReference.type === "TSExternalModuleReference")
					result.push([node.moduleReference.expression.value, "require-call"])
			} else if (node.type === "CallExpression") {
				if (node.callee.type !== "Identifier" || node.callee.name !== "require")
					return true
				const [argument] = node.arguments
				const specifier =
					argument?.type === "Literal" && typeof argument.value === "string" ?
						argument.value
					:	undefined
				if (specifier === undefined) isComputed = true
				else result.push([specifier, "require-call"])
				return false
			} else if (node.type === "Identifier" && node.name === "require")
				isComputed = true
			return true
		})
	}
	return isComputed ? undefined : result
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
		if (entry === undefined || !scanned.entries.includes(entry)) {
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

export const writeUnseenMessage = (reason: string): string =>
	`A production build leaves out of its validators what no read of them needs, as it found reading the bundle's modules, but ${reason}, so a read it didn't see may need what it left out. Set prune: false to build them whole.`

export const writeUnscannedFlatMessage = (path: string): string =>
	`A production build declares the units its validators read in one function, as it found reading the bundle's modules first, but it built ${path} from code it didn't read, whose validators would read copies of them. Build again, or set prune: false to build each unit as a module of its own.`
