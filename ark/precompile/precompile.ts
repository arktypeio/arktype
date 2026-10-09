import { hasArkKind, writePrecompiledUnits, type BaseRoot } from "@ark/schema"
import {
	flatMorph,
	hashOf,
	hasDomain,
	ParseError,
	registeredNameOf
} from "@ark/util"
import type { type } from "arktype"
import { precompileStandalone } from "arktype/internal/standalone.ts"
import MagicString, { type SourceMap } from "magic-string"
import { dirname, join } from "node:path"
import type {
	CallExpression,
	ImportDeclarationSpecifier,
	Node,
	Program,
	Span
} from "oxc-parser"
import { isPlainContainer } from "./builtins.ts"
import { DynamicValue } from "./dynamic.ts"
import {
	bindingOfFunction,
	contains,
	enclosingFunctionOf,
	isArkObject,
	ModuleGraph,
	runtimeExports,
	staticBodyOf,
	type ArkExportName,
	type FunctionNode,
	type ImportTarget
} from "./graph.ts"
import type { PrecompileHost } from "./host.ts"
import {
	createSiteState,
	findDynamic,
	Interpreter,
	type InterpreterOptions,
	type Read,
	type SiteState
} from "./interpreter.ts"
import { SourceModule } from "./module.ts"
import {
	exportNameOf,
	isTransparent,
	isWriteTarget,
	unwrapExpression
} from "./scope.ts"
import {
	findSites,
	isFoldedHelper,
	readsBindingOf,
	type SiteCandidate
} from "./sites.ts"

export type PrecompileMode = "standalone" | "cache"

export interface PrecompileOptions extends InterpreterOptions {
	// the directory paths in messages are relative to
	cwd?: string | undefined
	// ship arktype and precompile only the code it compiles, rather than folding every arktype expression into a validator
	runtime?: "arktype" | undefined
	// the module whose `configure()` call sets the configuration
	config?: string | undefined
	// place what the module imports from virtual modules in the module itself, for hosts without them
	inline?: boolean | undefined
}

export interface ModuleAnalysis {
	sites: Site[]
	diagnostics: Diagnostic[]
	dependencies: string[]
}

export interface PrecompiledModule {
	code: string
	// undefined when the module is unchanged
	map: SourceMap | undefined
	dependencies: string[]
	diagnostics: Diagnostic[]
	// the source of each virtual module the code imports, by specifier
	modules: Record<string, string>
}

// the arktype export at the root, or "reference" for a Type, Scope or Generic the program defines, or "helper" for a static helper
export type SiteKind = ArkExportName | "reference" | "helper"

export interface Site {
	kind: SiteKind
	start: number
	end: number
	line: number
	column: number
	status: "accepted" | "rejected"
	reasons: string[]
	// the value arktype computed, which a factory reproduces
	value: unknown
	// each Type the site's requests return, which cache mode precompiles
	roots: BaseRoot[]
	// the error the definition throws, which a factory throws when it is created
	parseError: ParseError | undefined
	holes: Hole[]
	inputs: Input[]
	helpers: Helper[]
}

export interface Hole {
	file: string
	// the expression evaluated in place at runtime, which is in the site's source unless the hole was read through a binding
	start: number
	end: number
	kind: "function" | "class" | "symbol" | "opaque"
	// the parameter count compiled for, undefined when no declaration gives one
	arity: number | undefined
	description: string | undefined
	isCalledAtDefinition: boolean
	// an opaque value arktype parsed as a Standard Schema
	isDefinition: boolean
}

export interface Input {
	kind: "import" | "local" | "define"
	// for an import, the module that exports it
	file: string | undefined
	name: string
	path: PropertyKey[]
	value: unknown
}

export interface Helper {
	file: string
	name: string
	start: number
	end: number
}

export type Rule =
	| "R1"
	| "R2"
	| "R3"
	| "R4"
	| "parse"
	| "syntax"
	| "unsupported"
	| "copies"

export interface Diagnostic {
	severity: "error" | "warning"
	rule: Rule
	file: string
	start: number
	end: number
	line: number
	column: number
	message: string
	reasons: string[]
	hint: string | undefined
}

// a package arktype runs on, whose classes and registry a program must load once
export type ArkPackage = "arktype" | "@ark/schema" | "@ark/util"

export interface PackageCopy {
	version: string
	// the file it was first resolved from
	importer: string
}

export interface CopiesReport {
	message: string
	reasons: string[]
}

export const precompileModule = (
	source: string,
	id: string,
	host: PrecompileHost,
	opts?: PrecompileOptions
): PrecompiledModule => new Precompiler(host, opts).precompile(source, id)

export class Precompiler {
	graph: ModuleGraph
	interpreter: Interpreter
	mode: PrecompileMode
	config: string | undefined
	inline: boolean
	// a site the mode cannot build fails a standalone build, while cache mode leaves it to runtime
	private rejectionSeverity: Diagnostic["severity"]
	private helperSitesByModule = new Map<SourceModule, Node[]>()
	private namesArkById: Record<string, boolean> = Object.create(null)
	private exportsArkByModule = new Map<SourceModule, boolean>()
	private packagesByEntry: Record<string, [root: string, version: string]> =
		Object.create(null)
	private copiesByPackage: Record<ArkPackage, Record<string, PackageCopy>> = {
		arktype: {},
		"@ark/schema": {},
		"@ark/util": {}
	}

	constructor(host: PrecompileHost, opts?: PrecompileOptions) {
		this.graph = new ModuleGraph(host, opts?.cwd)
		this.interpreter = new Interpreter(this.graph, opts)
		this.mode = opts?.runtime === "arktype" ? "cache" : "standalone"
		this.config = opts?.config
		this.inline = !!opts?.inline
		this.rejectionSeverity = this.mode === "standalone" ? "error" : "warning"
	}

	analyze(source: string, id: string): ModuleAnalysis {
		return this._analyze(this.graph.add(id, source))
	}

	// whether a module may define a Type, read from its imports so most modules that can't are never parsed
	importsArk(source: string, id: string): boolean {
		if (arktypeSpecifier.test(source)) return true
		for (const targetId of this.localImportsOf(source, id)) {
			if (!this.namesArk(targetId)) continue
			const target = this.graph.moduleOf(targetId)
			if (target instanceof SourceModule && this.exportsArk(target)) return true
		}
		return false
	}

	// the modules outside node_modules a module's text imports from
	localImportsOf(source: string, id: string): string[] {
		const result: string[] = []
		for (const [, specifier] of source.matchAll(importSpecifier)) {
			const targetId = this.graph.host.resolve(specifier, id)
			if (targetId && !targetId.includes("/node_modules/"))
				result.push(targetId)
		}
		return result
	}

	// whether a module's text imports arktype or a module that does, so a module that can't reach it is never parsed
	private namesArk(id: string): boolean {
		if (id in this.namesArkById) return this.namesArkById[id]
		const reached = [id]
		for (let i = 0; i < reached.length; i++) {
			const source = this.graph.host.readFile(reached[i])
			if (source === undefined) continue
			if (arktypeSpecifier.test(source)) return (this.namesArkById[id] = true)
			for (const targetId of this.localImportsOf(source, reached[i])) {
				if (this.namesArkById[targetId]) return (this.namesArkById[id] = true)
				if (!(targetId in this.namesArkById) && !reached.includes(targetId))
					reached.push(targetId)
			}
		}
		// every module a module reaches reaches no more than it does
		for (const reachedId of reached) this.namesArkById[reachedId] = false
		return false
	}

	// whether a module exports arktype's API, a Type or a helper that defines one, assumed while it is being read
	private exportsArk(module: SourceModule): boolean {
		const cached = this.exportsArkByModule.get(module)
		if (cached !== undefined) return cached
		this.exportsArkByModule.set(module, true)
		const result =
			Object.keys(module.scopes.exportsByName).some(name =>
				this.isArkExport(this.graph.exportOf(module, name))
			) ||
			module.scopes.starExports.some(specifier => {
				const target = this.graph.resolve(specifier, module)
				return target instanceof SourceModule ?
						this.exportsArk(target)
					:	target.kind === "arktypeNamespace"
			})
		this.exportsArkByModule.set(module, result)
		return result
	}

	private isArkExport(target: ImportTarget): boolean {
		switch (target.kind) {
			case "arktype":
				return !(target.name in runtimeExports)
			case "arktypeNamespace":
				return true
			case "namespace":
				return this.exportsArk(target.module)
			case "expression":
				return this.graph.isArkExpression(target.node, target.module)
			case "binding": {
				if (this.graph.isArkBinding(target.binding, target.module)) return true
				const helper = this.graph.boundHelperOf(target.binding, target.module)
				return !!helper && this.graph.isArkHelper(...helper)
			}
			default:
				return false
		}
	}

	// each package arktype runs on that importer reaches in a copy other than one reached before
	readCopies(name: ArkPackage, importer: string): CopiesReport[] {
		const entry = this.graph.host.resolve(name, importer)
		if (!entry) return []
		const [root, version] = (this.packagesByEntry[entry] ??= this.packageOf(
			name,
			entry
		))
		const copies = this.copiesByPackage[name]
		if (copies[root]) return []
		copies[root] = { version, importer }
		const reports =
			Object.keys(copies).length > 1 ? [this.copiesReportOf(name)] : []
		// arktype's own dependencies may resolve to copies of their own
		if (name === "arktype")
			reports.push(...this.readCopies("@ark/schema", entry))
		if (name !== "@ark/util")
			reports.push(...this.readCopies("@ark/util", entry))
		return reports
	}

	private packageOf(
		name: ArkPackage,
		entry: string
	): [root: string, version: string] {
		for (
			let root = dirname(entry);
			root !== dirname(root);
			root = dirname(root)
		) {
			const manifest = this.graph.host.readFile(join(root, "package.json"))
			if (manifest === undefined) continue
			const { name: packageName, version } = JSON.parse(manifest)
			if (packageName === name) return [root, version ?? "unknown"]
		}
		return [dirname(entry), "unknown"]
	}

	private copiesReportOf(name: ArkPackage): CopiesReport {
		const copies = this.copiesByPackage[name]
		return {
			message: `${name} resolves to more than one copy`,
			reasons: Object.keys(copies).map(
				root =>
					`${copies[root].version} at ${this.graph.pathOf(root)}, reached from ${this.graph.pathOf(copies[root].importer)}`
			)
		}
	}

	precompile(source: string, id: string): PrecompiledModule {
		const module = this.graph.add(id, source)
		const { sites, diagnostics, dependencies } = this._analyze(module)
		for (const node of module.program.body) {
			const specifier =
				(
					node.type === "ImportDeclaration" ||
					node.type === "ExportAllDeclaration" ||
					node.type === "ExportNamedDeclaration"
				) ?
					node.source
				:	null
			const name = specifier && arkPackageSpecifier.exec(specifier.value)?.[1]
			if (!name) continue
			for (const report of this.readCopies(name as ArkPackage, id)) {
				diagnostics.push(
					this.diagnostic(
						module,
						specifier,
						"copies",
						"error",
						report.message,
						report.reasons
					)
				)
			}
		}
		const s = new MagicString(source)
		let prefix = "$ark"
		while (source.includes(prefix)) prefix += "$"
		const modules: Record<string, string> = {}
		// the local each binding the module imports from a virtual module is read through, by specifier and export name
		const imports: Record<string, Record<string, string>> = {}
		if (this.mode === "standalone")
			this.foldSites(module, sites, s, prefix, modules, imports, diagnostics)
		else {
			const roots = sites.flatMap(site => site.roots)
			if (roots.length) {
				const table = `import { registerPrecompiledUnits } from "arktype/internal"\n\nregisterPrecompiledUnits(${writePrecompiledUnits(roots)})\n`
				const specifier = `~arktype/units/${hashOf(table)}`
				modules[specifier] = table
				imports[specifier] = {}
			}
			if (this.inline) this.importKeywords(module, s)
		}
		if (this.inline) inlineModules(module, s, prefix, modules, imports)
		else {
			// imported last, so they load after the module's other imports and before its body creates a Type
			for (const specifier in imports) {
				const locals = imports[specifier]
				if (!Object.keys(locals).length) s.append(`\nimport "${specifier}"`)
				for (const name in locals) {
					s.append(
						name === "default" ?
							`\nimport ${locals[name]} from "${specifier}"`
						:	`\nimport { ${name} as ${locals[name]} } from "${specifier}"`
					)
				}
			}
		}
		return {
			code: s.toString(),
			map:
				s.hasChanged() ?
					s.generateMap({ source: id, includeContent: true, hires: "boundary" })
				:	undefined,
			dependencies,
			diagnostics,
			modules: this.inline ? {} : modules
		}
	}

	// arktype's keyword table registers before its keywords are created, if its build includes one
	private importKeywords(module: SourceModule, s: MagicString): void {
		const statement = module.program.body.find(
			statement =>
				"source" in statement && statement.source?.value === "arktype"
		)
		if (
			statement &&
			this.graph.host.resolve("arktype/internal/precompiled.js", module.id)
		) {
			s.prependLeft(
				statement.start,
				`import "arktype/internal/precompiled.js"\n`
			)
		}
	}

	private foldSites(
		module: SourceModule,
		sites: Site[],
		s: MagicString,
		prefix: string,
		modules: Record<string, string>,
		imports: Record<string, Record<string, string>>,
		diagnostics: Diagnostic[]
	): void {
		const namesBySite = new Map<Site, string>()
		const typesByName: Record<string, type.Any> = {}
		for (const site of sites) {
			if (site.status === "rejected") continue
			const reasons = this.unsupportedReasonsOf(site)
			if (reasons.length) {
				diagnostics.push(this.unsupported(module, site, reasons))
				continue
			}
			const name = nameOf(site)
			namesBySite.set(site, name)
			if (!site.parseError) typesByName[name] = site.value as never
		}
		const refusalsByName: Record<string, string> = {}
		const validators =
			Object.keys(typesByName).length ?
				writeValidators(typesByName, refusalsByName)
			:	""
		const specifier = `~arktype/${hashOf(validators)}`
		const imported = new Set<string>()
		const folded: Site[] = []
		for (const [site, name] of namesBySite) {
			if (refusalsByName[name]) {
				diagnostics.push(this.unsupported(module, site, [refusalsByName[name]]))
				continue
			}
			const local = prefix + name
			if (!imported.has(name)) {
				imported.add(name)
				if (site.parseError) {
					modules[`~arktype/${name}`] = writeParseErrorThrower(
						site.parseError.message
					)
					imports[`~arktype/${name}`] = { default: local }
				} else {
					modules[specifier] = validators
					;(imports[specifier] ??= {})[`v${name}`] = local
				}
			}
			// a ParseError is thrown where the site is evaluated, as arktype throws it
			s.overwrite(site.start, site.end, site.parseError ? `${local}()` : local)
			folded.push(site)
		}
		pruneArktypeImports(module, folded, s)
		diagnostics.sort((l, r) => l.start - r.start)
	}

	private unsupported(
		module: SourceModule,
		site: Site,
		reasons: string[]
	): Diagnostic {
		return this.diagnostic(
			module,
			site,
			"unsupported",
			"error",
			`${module.snippetOf(site)} can't be precompiled to a standalone validator yet`,
			reasons
		)
	}

	private unsupportedReasonsOf(site: Site): string[] {
		const result =
			site.parseError || hasArkKind(site.value, "root") ?
				[]
			:	["its value is not a Type"]
		for (const hole of site.holes) {
			const holeModule = this.graph.moduleOf(hole.file) as SourceModule
			result.push(
				`arktype ${hole.isCalledAtDefinition ? "calls" : "holds"} \`${holeModule.snippetOf(hole)}\` (${holeModule.positionOf(hole)})`
			)
		}
		for (const input of site.inputs) {
			result.push(
				`\`${[input.name, ...input.path.map(String)].join(".")}\` is ${
					input.kind === "import" ?
						`imported from ${this.graph.pathOf(input.file!)}`
					: input.kind === "local" ? "declared in a function around the site"
					: "a define"
				}`
			)
		}
		for (const helper of site.helpers) {
			result.push(
				`it calls the static helper \`${helper.name}\` (${(this.graph.moduleOf(helper.file) as SourceModule).positionOf(helper)})`
			)
		}
		return result
	}

	private _analyze(module: SourceModule): ModuleAnalysis {
		if (module.parseErrors.length) {
			return {
				sites: [],
				diagnostics: module.parseErrors.map(message =>
					this.diagnostic(
						module,
						module.program,
						"syntax",
						"error",
						`${module.path} cannot be parsed: ${message}`,
						[]
					)
				),
				dependencies: [module.id]
			}
		}
		const candidates = findSites(module, this.graph, this.interpreter)
		for (const candidate of candidates)
			this.interpreter.sitesByNode.set(candidate.state.node, candidate.state)
		const settled: SiteCandidate[] = []
		const settledRangesByFn = new Map<FunctionNode | undefined, Set<string>>()
		const sites: Site[] = []
		const diagnostics: Diagnostic[] = []
		const helperSites: Node[] = []
		this.helperSitesByModule.set(module, helperSites)
		for (const candidate of candidates) {
			let settledRanges = settledRangesByFn.get(candidate.fn)
			if (!settledRanges)
				settledRangesByFn.set(candidate.fn, (settledRanges = new Set()))
			if (
				isWithin(candidate.state.node, settledRanges) ||
				!this.settle(candidate)
			)
				continue
			settled.push(candidate)
			settledRanges.add(rangeOf(candidate.state.node))
			if (isFolded(candidate, settled, this.interpreter)) continue
			if (candidate.helper) {
				if (readsBindingOf(candidate.helper, candidate.state.node, module))
					continue
				helperSites.push(candidate.state.node)
			}
			const site = this.finalize(candidate, module)
			sites.push(site)
			diagnostics.push(...this.diagnosticsOf(site, candidate, module))
		}
		diagnostics.push(...this.checkConfiguration(module))
		if (this.mode === "standalone")
			diagnostics.push(...this.checkStandalone(module, candidates))
		return {
			sites: sites.sort((l, r) => l.start - r.start),
			diagnostics: diagnostics.sort((l, r) => l.start - r.start),
			dependencies: this.graph.dependenciesOf(module.id)
		}
	}

	private settle(candidate: SiteCandidate): boolean {
		for (;;) {
			const state = this.interpreter.evaluateSite(candidate.state)
			// a call whose every request is in a static helper's own sites reaches them at runtime, and defines nothing itself
			if (
				state.requests.length &&
				state.requests.every(([node, module]) =>
					this.helperSitesOf(module).some(site => contains(site, node))
				)
			)
				return false
			// reading a member of a Type, Scope or Module makes no request, so it is not a site of its own
			if (
				candidate.kind === "reference" &&
				!state.requests.length &&
				isMemberRead(state.node, candidate.root)
			)
				return false
			const rejection = rejectionOf(state)
			const fallback = rejection && this.fallbackOf(candidate, rejection)
			if (!fallback) return true
			if (fallback === candidate.root) return false
			candidate.state = createSiteState(fallback, state.module)
			this.interpreter.sitesByNode.set(fallback, candidate.state)
		}
	}

	private helperSitesOf(module: SourceModule): Node[] {
		let result = this.helperSitesByModule.get(module)
		if (result) return result
		this.helperSitesByModule.set(module, (result = []))
		for (const candidate of findSites(module, this.graph, this.interpreter)) {
			if (
				candidate.helper &&
				this.settle(candidate) &&
				!readsBindingOf(candidate.helper, candidate.state.node, module)
			)
				result.push(candidate.state.node)
		}
		return result
	}

	// a rejected validation, or a call to a static helper that makes no request of its own, leaves its callee or argument as the site
	private fallbackOf(
		candidate: SiteCandidate,
		rejection: DynamicValue
	): Node | undefined {
		const { fallbacks, state } = candidate
		if (rejection.code === "validation") {
			const validation = rejection.node
			if (
				validation.type === "CallExpression" &&
				rejection.module === state.module
			) {
				for (let i = fallbacks.length - 1; i >= 0; i--) {
					if (contains(validation.callee, fallbacks[i]))
						return fallbacks.splice(i)[0]
				}
			}
			// e.g. a static helper that only validates its argument
			return state.requests.length ? undefined : candidate.root
		}
		const call = state.node
		const fallback = fallbacks[fallbacks.length - 1]
		return (
				call.type === "CallExpression" &&
					fallback &&
					!contains(call.callee, fallback) &&
					state.requests.every(
						([node, module]) =>
							module === state.module &&
							call.arguments.some(arg => contains(arg, node))
					)
			) ?
				fallbacks.pop()
			:	undefined
	}

	private finalize(candidate: SiteCandidate, module: SourceModule): Site {
		const { state } = candidate
		const [line, column] = module.lineAndColumnOf(state.node.start)
		const site: Site = {
			kind: candidate.kind,
			start: state.node.start,
			end: state.node.end,
			line,
			column,
			status: "accepted",
			reasons: [],
			value: undefined,
			roots: [],
			parseError: undefined,
			holes: [],
			inputs: [],
			helpers: state.trace.helpers.map(([node, helperModule]) => ({
				file: helperModule.id,
				name: bindingOfFunction(node, helperModule)?.name ?? "default",
				start: node.start,
				end: node.end
			}))
		}
		const dynamic = rejectionOf(state)
		if (dynamic) return rejectSite(site, dynamic)
		if (state.error instanceof ParseError) site.parseError = state.error
		else {
			site.value = state.value
			site.roots = state.roots
		}
		for (const read of state.trace.reads) {
			const input = this.inputOf(read, candidate, module)
			if (input instanceof DynamicValue) return rejectSite(site, input)
			if (!site.inputs.some(existing => isCoveredBy(input, existing)))
				site.inputs.push(input)
		}
		for (const value of state.holes) {
			if (!isHeld(value, this.interpreter)) continue
			const hole = this.holeOf(value, candidate, module)
			if (hole instanceof DynamicValue) return rejectSite(site, hole)
			site.holes.push(hole)
		}
		site.holes.sort((l, r) => l.start - r.start)
		return site
	}

	private inputOf(
		read: Read,
		candidate: SiteCandidate,
		module: SourceModule
	): Input | DynamicValue {
		const { root, path, value } = read
		if (root.kind === "define")
			return { kind: "define", file: undefined, name: root.name, path, value }
		if (root.kind === "export")
			return { kind: "import", file: root.file, name: root.name, path, value }
		const { binding } = root
		if (
			root.module === module &&
			contains(binding.scope.node, candidate.state.node)
		)
			return { kind: "local", file: undefined, name: binding.name, path, value }
		if (binding.exportNames.length) {
			return {
				kind: "import",
				file: root.module.id,
				name: binding.exportNames[0],
				path,
				value
			}
		}
		return new DynamicValue(
			module,
			candidate.state.node,
			`the site reads \`${binding.name}\` (${root.module.positionOf(binding.id)}), which its module cannot import, so the site cannot compare it at creation`
		)
	}

	private holeOf(
		value: unknown,
		candidate: SiteCandidate,
		module: SourceModule
	): Hole | DynamicValue {
		const standIn =
			typeof value === "symbol" ? undefined : (
				this.interpreter.standIns.get(value as object)!
			)
		const sourcesByValue = candidate.state.sourcesByValue
		const source =
			sourcesByValue.get(value) ??
			(standIn?.dynamic && sourcesByValue.get(standIn.dynamic))
		if (!source && standIn?.closure?.env) {
			return new DynamicValue(
				standIn.module,
				standIn.node,
				`the function at ${standIn.module.positionOf(standIn.node)} is created by each call to a static helper, so the precompiled site cannot reach it`
			)
		}
		const [node, origin] =
			source ? [source, module]
			: standIn ? [standIn.node, standIn.module]
			: this.interpreter.sourcesBySymbol.get(value as symbol)!
		if (standIn?.kind === "opaque" && !standIn.isDefinition) {
			return new DynamicValue(
				origin,
				node,
				`arktype holds \`${origin.snippetOf(node)}\` as a value rather than a definition, so it must be static`,
				standIn.dynamic
			)
		}
		return {
			file: origin.id,
			start: node.start,
			end: node.end,
			kind: standIn?.kind ?? "symbol",
			arity: standIn?.arity,
			description: standIn ? undefined : (value as symbol).description,
			isCalledAtDefinition: !!standIn?.isCalled,
			isDefinition: !!standIn?.isDefinition
		}
	}

	private diagnosticsOf(
		site: Site,
		candidate: SiteCandidate,
		module: SourceModule
	): Diagnostic[] {
		const node = candidate.state.node
		if (site.status === "rejected") {
			return [
				this.diagnostic(
					module,
					node,
					isCallback(rejectionOf(candidate.state)) ? "R2" : "R1",
					this.rejectionSeverity,
					`${module.snippetOf(node)} cannot be precompiled`,
					site.reasons
				)
			]
		}
		const result: Diagnostic[] = []
		if (site.parseError) {
			result.push(
				this.diagnostic(
					module,
					node,
					"parse",
					"warning",
					`${module.snippetOf(node)} throws a ParseError`,
					[site.parseError.message]
				)
			)
		}
		if (this.mode !== "standalone") return result
		for (const value of candidate.state.holes) {
			const standIn =
				hasDomain(value, "object") ?
					this.interpreter.standIns.get(value)
				:	undefined
			if (!standIn?.isDefinition || !standIn.dynamic) continue
			const source = candidate.state.sourcesByValue.get(standIn.dynamic)
			const [node, origin] =
				source ? [source, module] : [standIn.node, standIn.module]
			result.push(
				this.diagnostic(
					origin,
					node,
					"R4",
					"warning",
					`\`${origin.snippetOf(node)}\` is not static, so the site accepts it only as a Standard Schema that is not a Type`,
					chainOf(standIn.dynamic)
				)
			)
		}
		return result
	}

	private checkConfiguration(module: SourceModule): Diagnostic[] {
		const result: Diagnostic[] = []
		let calls = 0
		for (const reference of module.scopes.references) {
			const [name, read] = this.graph.arkExportOf(reference, module) ?? []
			const call = read?.parent
			if (
				name !== "configure" ||
				call?.type !== "CallExpression" ||
				call.callee !== read
			)
				continue
			calls++
			const problem =
				this.config === undefined ?
					"configure() is called, but the build has no `config` module"
				: this.config !== module.id ?
					`configure() is called outside the config module ${this.graph.pathOf(this.config)}`
				: calls > 1 ? "configure() is called more than once"
				: undefined
			const reasons = problem ? [] : this.configurationProblemsOf(call, module)
			if (problem || reasons.length) {
				result.push(
					this.diagnostic(
						module,
						call,
						"R3",
						this.rejectionSeverity,
						problem ?? `${module.snippetOf(call)} is not static`,
						reasons
					)
				)
			}
		}
		return result
	}

	private configurationProblemsOf(
		call: CallExpression,
		module: SourceModule
	): string[] {
		const value = this.interpreter.evaluateSite(
			createSiteState(call.arguments[0] ?? call, module)
		)
		const dynamic = rejectionOf(value)
		if (dynamic) return chainOf(dynamic)
		const result: string[] = []
		const visit = (o: unknown) => {
			if (!isPlainContainer(o)) return
			for (const k of Reflect.ownKeys(o)) {
				const v = Reflect.get(o, k)
				const standIn =
					hasDomain(v, "object") ? this.interpreter.standIns.get(v) : undefined
				if (
					k === "description" &&
					standIn &&
					!(standIn.closure && staticBodyOf(standIn.closure.node))
				) {
					result.push(
						`the description writer at ${standIn.module.positionOf(standIn.node)} must be a static helper, since arktype calls it while defining types`
					)
				}
				visit(v)
			}
		}
		visit(value.value)
		return result
	}

	private checkStandalone(
		module: SourceModule,
		candidates: SiteCandidate[]
	): Diagnostic[] {
		const result: Diagnostic[] = []
		if (candidates.length && !isStrict(module.program)) {
			result.push(
				this.diagnostic(
					module,
					module.program.body[0] ?? module.program,
					"R4",
					"error",
					`${module.path} is not strict mode code`,
					[
						"the standalone runtime freezes arktype values, and outside strict mode a write to a frozen value is ignored rather than throwing"
					],
					strictHint
				)
			)
		}
		const written = new Set<Node>()
		for (const reference of module.scopes.references) {
			if (!reference.binding || reference.isWrite) continue
			const [write, value, isDirect] =
				this.arkWriteOf(reference.id, module) ?? []
			if (!write) continue
			written.add(reference.id)
			result.push(
				this.diagnostic(
					module,
					write,
					"R4",
					"error",
					`${module.snippetOf(write)} writes to ${isDirect ? "an arktype value" : "what an arktype value holds"}, which throws at runtime`,
					[
						`\`${module.snippetOf(value!)}\` is an arktype value, which the standalone runtime freezes with what it holds`
					],
					writeHint
				)
			)
		}
		const candidateRanges = new Set(
			candidates.map(candidate => rangeOf(candidate.state.node))
		)
		for (const reference of module.scopes.references) {
			const binding = reference.binding
			if (
				binding?.kind !== "import" ||
				reference.isWrite ||
				written.has(reference.id)
			)
				continue
			const target = this.graph.importOf(binding, module)
			if (target.kind !== "arktype" && target.kind !== "arktypeNamespace")
				continue
			const id = reference.id
			const [name, read] = this.graph.arkExportOf(reference, module) ?? []
			const parent = read?.parent
			// a re-export forwards the binding, and each use of it is checked where it occurs
			if (
				id.parent?.type === "ExportSpecifier" ||
				id.parent?.type === "ExportDefaultDeclaration" ||
				(name && name in runtimeExports) ||
				(name === "configure" &&
					parent?.type === "CallExpression" &&
					parent.callee === read) ||
				this.graph.isRuntimeUse(id, module)
			)
				continue
			if (isWithin(id, candidateRanges)) continue
			const fn = enclosingFunctionOf(id)
			if (fn && isFoldedHelper(fn, module)) continue
			result.push(
				this.diagnostic(
					module,
					id,
					"R4",
					"error",
					`\`${binding.name}\` is used outside a precompiled site`,
					[]
				)
			)
		}
		return result
	}

	// a write a reference starts, and the arktype value it writes to or through, e.g. to its `meta`
	private arkWriteOf(
		id: Node,
		module: SourceModule
	): [write: Node, value: Node, isDirect: boolean] | undefined {
		// the reads since the last call, each of which may be an arktype value
		const objects: Node[] = [id]
		let node = id
		for (let parent = node.parent!; ; node = parent, parent = node.parent!) {
			if (isTransparent(parent)) continue
			let write: Node | undefined
			if (parent.type === "MemberExpression" && parent.object === node) {
				if (isWriteTarget(parent)) write = writeOf(parent)
			} else if (parent.type === "CallExpression" && parent.callee === node)
				objects.length = 0
			else if (
				parent.type === "CallExpression" &&
				parent.arguments[0] === node &&
				isObjectWrite(parent.callee, module)
			)
				write = parent
			else return
			if (write) {
				for (let i = objects.length - 1; i >= 0; i--) {
					const state = this.interpreter.evaluateSite(
						createSiteState(objects[i], module)
					)
					if (isArkObject(state.value))
						return [write, objects[i], i === objects.length - 1]
				}
				return
			}
			objects.push(parent)
		}
	}

	private diagnostic(
		module: SourceModule,
		span: Span,
		rule: Rule,
		severity: Diagnostic["severity"],
		message: string,
		reasons: string[],
		hint?: string
	): Diagnostic {
		const [line, column] = module.lineAndColumnOf(span.start)
		return {
			severity,
			rule,
			file: module.id,
			start: span.start,
			end: span.end,
			line,
			column,
			message,
			reasons,
			hint:
				rule === "syntax" ? undefined
				: this.mode === "cache" && rule !== "copies" ? cacheHint
				: (hint ?? hintsByRule[rule])
		}
	}
}

export const renderDiagnostic = (diagnostic: Diagnostic): string =>
	[
		`${diagnostic.file}:${diagnostic.line}:${diagnostic.column}  ${diagnostic.message}`,
		...diagnostic.reasons.map(reason => `  ${reason}`),
		...(diagnostic.hint ? [`  ${diagnostic.hint}`] : [])
	].join("\n")

export const copiesHint =
	"Types and errors from one copy aren't recognized by another. Install one version of each, e.g. with your package manager's dedupe or overrides."

const hintsByRule: Record<Exclude<Rule, "syntax">, string> = {
	R1: `Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".`,
	R2: "arktype runs this callback while defining the type, so the build computes its result. Make it a static helper: one expression or one `return` in the static subset.",
	R3: "The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module.",
	R4: `Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".`,
	unsupported: `Standalone builds can't precompile every definition yet. Build with runtime: "arktype".`,
	parse: "The precompiled site throws the same ParseError when it is created.",
	copies: copiesHint
}

const arkPackageSpecifier = /^(arktype|@ark\/schema|@ark\/util)(?:\/|$)/

const arktypeSpecifier =
	/\b(?:from|import)\s*["'](?:arktype(?:\/config)?|arkregex|@ark\/(?:type|regex))["']/

const importSpecifier = /\b(?:from|import)\s*["']([^"']+)["']/g

const cacheHint = 'With runtime: "arktype", arktype defines this at runtime.'

const writeHint = `Keep what you attach in an object of your own, or build with runtime: "arktype".`

const writersByGlobal: Record<string, string[]> = {
	Object: ["assign", "defineProperty", "defineProperties", "setPrototypeOf"],
	Reflect: ["set", "defineProperty", "deleteProperty", "setPrototypeOf"]
}

// e.g. `Object.assign`, when `Object` is the global
const isObjectWrite = (callee: Node, module: SourceModule): boolean => {
	callee = unwrapExpression(callee)
	return (
		callee.type === "MemberExpression" &&
		!callee.computed &&
		callee.object.type === "Identifier" &&
		!module.scopes.referencesById.get(callee.object)?.binding &&
		!!writersByGlobal[callee.object.name]?.includes(callee.property.name)
	)
}

// the assignment, update or `delete` a write target is part of, or the target itself in a loop's head
const writeOf = (target: Node): Node => {
	const parent = target.parent!
	switch (parent.type) {
		case "AssignmentExpression":
		case "UpdateExpression":
		case "UnaryExpression":
			return parent
		case "ForInStatement":
		case "ForOfStatement":
			return target
	}
	return writeOf(parent)
}

const strictHint = `Add "use strict" at the top of the module, or make it an ES module.`

// an ES module is strict, and a script or CommonJS module only with a "use strict" directive
const isStrict = (program: Program): boolean =>
	program.sourceType === "module" ||
	program.body.some(
		statement =>
			statement.type === "ExpressionStatement" &&
			statement.directive === "use strict"
	)

// named by content, so equal sites share a validator
const nameOf = (site: Site) =>
	hashOf(site.parseError?.message ?? (site.value as BaseRoot).hash)

// precompileStandalone refuses a whole artifact for one Type it can't emit, so on a refusal each is emitted alone to find it
const writeValidators = (
	typesByName: Record<string, type.Any>,
	refusalsByName: Record<string, string>
): string => {
	const types = flatMorph(typesByName, (name, t) => [`v${name}`, t])
	try {
		return precompileStandalone(types)
	} catch {
		for (const name in typesByName) {
			try {
				precompileStandalone({ [name]: typesByName[name] })
			} catch (e) {
				refusalsByName[name] = (e as Error).message
				delete types[`v${name}`]
			}
		}
		return precompileStandalone(types)
	}
}

const writeParseErrorThrower = (message: string) =>
	`import { ParseError } from "arktype/runtime"\n\nconst throwParseError = () => {\n\tthrow new ParseError(${JSON.stringify(message)})\n}\n\nexport { throwParseError as default }\n`

// each module runs in a function at the top of its importer, passed its imports and the globals the importer shadows
const inlineModules = (
	module: SourceModule,
	s: MagicString,
	prefix: string,
	modules: Record<string, string>,
	imports: Record<string, Record<string, string>>
) => {
	const namespacesBySource: Record<string, string> = {}
	let declarations = ""
	for (const specifier in imports) {
		const inlined = new SourceModule(specifier, modules[specifier], specifier)
		const body = new MagicString(inlined.source)
		const params: string[] = []
		const args: string[] = []
		const localsByName: Record<string, string> = {}
		for (const statement of inlined.program.body) {
			if (statement.type === "ImportDeclaration") {
				const namespace = (namespacesBySource[statement.source.value] ??=
					`${prefix}$${Object.keys(namespacesBySource).length}`)
				for (const binding of statement.specifiers) {
					const name =
						binding.type === "ImportSpecifier" ?
							exportNameOf(binding.imported)
						:	"default"
					params.push(
						binding.type === "ImportNamespaceSpecifier" ?
							binding.local.name
						:	`{ ${JSON.stringify(name)}: ${binding.local.name} }`
					)
					args.push(namespace)
				}
			} else if (statement.type === "ExportNamedDeclaration") {
				for (const binding of statement.specifiers) {
					localsByName[exportNameOf(binding.exported)] = exportNameOf(
						binding.local
					)
				}
			} else continue
			body.remove(statement.start, statement.end)
		}
		for (const { id, binding } of inlined.scopes.root.unresolved) {
			if (
				binding ||
				!(id.name in module.scopes.root.bindings) ||
				params.includes(id.name)
			)
				continue
			params.push(id.name)
			args.push(`globalThis.${id.name}`)
		}
		const locals = imports[specifier]
		const names = Object.keys(locals)
		const objectOf = (valueOf: (name: string) => string) =>
			`{ ${names.map(name => `${JSON.stringify(name)}: ${valueOf(name)}`).join(", ")} }`
		const call = `((${params.join(", ")}) => {\n${body.toString().trim()}\n${names.length ? `return ${objectOf(name => localsByName[name])}\n` : ""}})(${args.join(", ")})`
		declarations +=
			names.length ?
				`const ${objectOf(name => locals[name])} = ${call};\n`
			:	`;${call};\n`
	}
	if (!declarations) return
	const first = module.program.body.find(
		statement =>
			statement.type !== "ExpressionStatement" || !statement.directive
	)!
	s.prependLeft(first.start, declarations)
	for (const source in namespacesBySource) {
		s.append(
			`\nimport * as ${namespacesBySource[source]} from ${JSON.stringify(source)}`
		)
	}
}

// an import only folded sites read becomes `import "arktype"`, so the runtime loads where arktype would have
const pruneArktypeImports = (
	module: SourceModule,
	folded: Site[],
	s: MagicString
) => {
	for (const statement of module.program.body) {
		if (
			statement.type !== "ImportDeclaration" ||
			statement.source.value !== "arktype" ||
			statement.importKind === "type"
		)
			continue
		const kept = statement.specifiers.filter(specifier =>
			isReadOutside(specifier, folded, module)
		)
		if (kept.length < statement.specifiers.length)
			s.overwrite(statement.start, statement.end, writeImport(kept, module))
	}
}

const isReadOutside = (
	specifier: ImportDeclarationSpecifier,
	sites: Site[],
	module: SourceModule
) =>
	!!module.scopes.bindingsById
		.get(specifier.local)
		?.references.some(
			({ id }) =>
				!sites.some(site => site.start <= id.start && id.end <= site.end)
		)

const writeImport = (
	specifiers: ImportDeclarationSpecifier[],
	module: SourceModule
) => {
	const clauses: string[] = []
	const named: string[] = []
	for (const specifier of specifiers) {
		if (specifier.type === "ImportSpecifier")
			named.push(module.textOf(specifier))
		else clauses.push(module.textOf(specifier))
	}
	if (named.length) clauses.push(`{ ${named.join(", ")} }`)
	return clauses.length ?
			`import ${clauses.join(", ")} from "arktype"`
		:	`import "arktype"`
}

const rejectSite = (site: Site, dynamic: DynamicValue): Site => {
	site.status = "rejected"
	site.reasons = chainOf(dynamic)
	site.value = undefined
	site.roots = []
	site.holes = []
	site.inputs = []
	return site
}

const rejectionOf = (state: SiteState): DynamicValue | undefined =>
	state.error instanceof DynamicValue ? state.error
	: state.error === undefined ? findDynamic(state.value)
	: undefined

const isCallback = (dynamic: DynamicValue | undefined): boolean => {
	for (let link = dynamic; link; link = link.cause)
		if (link.code === "callback") return true
	return false
}

const chainOf = (dynamic: DynamicValue): string[] => {
	const result: string[] = []
	for (let link: DynamicValue | undefined = dynamic; link; link = link.cause)
		result.push(link.message)
	return result
}

const isMemberRead = (node: Node, root: Node): boolean => {
	for (node = unwrapExpression(node); node !== root; ) {
		if (node.type !== "MemberExpression") return false
		node = unwrapExpression(node.object)
	}
	return true
}

const rangeOf = (node: Node) => `${node.start}:${node.end}`

// AST nodes nest, so a node is within a range exactly when it or an ancestor spans it
const isWithin = (node: Node, ranges: Set<string>): boolean => {
	for (let n: Node | null | undefined = node; n; n = n.parent)
		if (ranges.has(rangeOf(n))) return true
	return false
}

const isCoveredBy = (input: Input, existing: Input) =>
	input.kind === existing.kind &&
	input.file === existing.file &&
	input.name === existing.name &&
	existing.path.length <= input.path.length &&
	existing.path.every((k, i) => input.path[i] === k)

// a site inside a function written in an enclosing site, which calls it at build, is folded into it
const isFolded = (
	candidate: SiteCandidate,
	candidates: SiteCandidate[],
	interpreter: Interpreter
) =>
	!!candidate.fn &&
	candidates.some(
		outer =>
			outer !== candidate &&
			outer.state.interpreted.has(candidate.fn!) &&
			contains(outer.state.node, candidate.fn!) &&
			!outer.state.holes.some(
				hole =>
					hasDomain(hole, "object") &&
					interpreter.standIns.get(hole)?.node === candidate.fn &&
					isHeld(hole, interpreter)
			)
	)

// a function arktype only calls while defining a type is not part of the type
const isHeld = (hole: unknown, interpreter: Interpreter) =>
	!hasDomain(hole, "object") ||
	!interpreter.standIns.get(hole)!.isCalled ||
	registeredNameOf(hole) !== undefined
