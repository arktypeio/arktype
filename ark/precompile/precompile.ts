import {
	$ark,
	hasArkKind,
	writePrecompiledUnits,
	type BaseRoot
} from "@ark/schema"
import {
	appendStringifiedKey,
	hashOf,
	hasDomain,
	ParseError,
	registeredNameOf,
	throwError
} from "@ark/util"
import { configure } from "arktype"
import type { HoleKind } from "arktype/internal/runtime.ts"
import {
	keyOf,
	precompileStandalone,
	writeFixConfig,
	type ConfiguredModule,
	type FactoryParam,
	type StandaloneExport
} from "arktype/internal/standalone.ts"
import MagicString, { type SourceMap } from "magic-string"
import { dirname, join, relative } from "node:path"
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
import {
	dependencyOf,
	transformedExtension,
	type PrecompileHost
} from "./host.ts"
import {
	createSiteState,
	findDynamic,
	Interpreter,
	type InterpreterOptions,
	type Read,
	type SiteState,
	type UnavailableRead
} from "./interpreter.ts"
import { SourceModule } from "./module.ts"
import {
	exportNameOf,
	isTransparent,
	isWriteTarget,
	unwrapExpression,
	walk,
	type Binding,
	type BindingKind
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
	// the module whose `configure()` call sets the configuration
	config?: string | undefined
	// place what the module imports from virtual modules in the module itself, for hosts without them
	inline?: boolean | undefined
	// check at creation that each static helper a standalone validator was built with is the function its module exports, as a test runner's module mocks can replace it
	checkHelpers?: boolean | undefined
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
	status: "accepted" | "rejected" | "island"
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
	// each expression evaluating to a hole or a Type, which its factory receives in its place
	references: Reference[]
	// the argument of a call to arktype's `define`, which returns it, so a standalone build evaluates it in place of the call
	definition: Node | undefined
}

export interface Hole {
	file: string
	// the expression evaluated in place at runtime, which is in the site's source unless the hole was read through a binding
	start: number
	end: number
	// the value the build held in its place
	value: unknown
	kind: "function" | "class" | "symbol" | "opaque"
	// the parameter count compiled for, undefined when no declaration gives one
	arity: number | undefined
	description: string | undefined
	isCalledAtDefinition: boolean
	// an opaque value arktype parsed as a Standard Schema
	isDefinition: boolean
}

export interface Reference {
	start: number
	end: number
	// a hole, or a Type whose holes its factory takes from the validator it receives
	value: unknown
	// whether another module can replace it, as a test runner's module mock does
	isForeign: boolean
	// a member it reads that a standalone build's value doesn't have, so passing it throws
	unavailableRead: UnavailableRead | undefined
}

// what a site's factory receives: a hole or Type where the site evaluates it, then each input it compares
export interface SiteFactory {
	params: FactoryParam[]
	spans: Span[]
	inputs: string[]
	// each export it compares that the module doesn't import, by specifier, with the local it's imported as
	imports: [specifier: string, name: string, local: string][]
}

export interface Input {
	kind: "import" | "local" | "define"
	// for an import, the module that exports it
	file: string | undefined
	name: string
	path: PropertyKey[]
	value: unknown
}

// a function the site calls through another module's export, which a test driver checks at creation
export interface Helper {
	// the module that exports it
	file: string
	// its export name
	name: string
	// where the module declares it
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
	checkHelpers: boolean
	private configuration: Configuration | undefined
	private configureCallsByModule = new WeakMap<SourceModule, CallExpression[]>()
	// a site the mode cannot build fails a standalone build, while cache mode leaves it to runtime
	private rejectionSeverity: Diagnostic["severity"]
	private helperSitesByModule = new Map<SourceModule, Node[]>()
	private namesArkById: Record<string, boolean> = Object.create(null)
	private exportsArkByModule = new Map<SourceModule, boolean>()
	// the binding a local input reads, which its factory call receives it through
	private bindingsByInput = new WeakMap<Input, Binding>()
	private packagesByEntry: Record<string, [root: string, version: string]> =
		Object.create(null)
	private copiesByPackage: Record<ArkPackage, Record<string, PackageCopy>> = {
		arktype: {},
		"@ark/schema": {},
		"@ark/util": {}
	}
	private warnedDependencies: Record<string, true> = Object.create(null)

	constructor(host: PrecompileHost, opts?: PrecompileOptions) {
		this.graph = new ModuleGraph(host, opts?.cwd)
		this.interpreter = new Interpreter(this.graph, opts)
		this.mode = opts?.runtime === "arktype" ? "cache" : "standalone"
		this.config = opts?.config
		this.inline = !!opts?.inline
		this.checkHelpers = this.mode === "standalone" && !!opts?.checkHelpers
		this.rejectionSeverity = this.mode === "standalone" ? "error" : "warning"
	}

	// whether a host transforms a module, which it does for a module the build follows
	isTransformed(id: string): boolean {
		return transformedExtension.test(id) && this.graph.isFollowed(id)
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

	// the modules the build follows a module's text to, other than arktype's packages
	localImportsOf(source: string, id: string): string[] {
		const result: string[] = []
		for (const [, specifier] of source.matchAll(importSpecifier)) {
			if (arkPackageSpecifier.test(specifier)) continue
			const targetId = this.graph.host.resolve(specifier, id)
			if (targetId && this.graph.isFollowed(targetId)) result.push(targetId)
		}
		return result
	}

	localClosureOf(
		id: string,
		importsOf = (id: string) =>
			this.localImportsOf(this.graph.host.readFile(id) ?? "", id)
	): string[] {
		const result = [id]
		for (let i = 0; i < result.length; i++) {
			for (const target of importsOf(result[i]))
				if (!result.includes(target)) result.push(target)
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

	// a dependency that doesn't opt in isn't transformed, so its arktype import is checked where it resolves
	readDependency(importer: string): { errors: string[]; warnings: string[] } {
		const [, dependency] = dependencyOf(importer) ?? []
		if (!dependency || this.graph.isFollowed(importer))
			return { errors: [], warnings: [] }
		const errors = this.readCopies("arktype", importer).map(report =>
			[
				report.message,
				...report.reasons.map(reason => `  ${reason}`),
				`  ${copiesHint}`
			].join("\n")
		)
		const warnings: string[] = []
		if (this.mode === "standalone" && !this.warnedDependencies[dependency]) {
			this.warnedDependencies[dependency] = true
			warnings.push(writeStandaloneDependencyMessage(dependency))
		}
		return { errors, warnings }
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
		this.configuration ??= this.applyConfiguration()
		const module = this.graph.add(id, source)
		const { sites, diagnostics, dependencies } = this._analyze(module)
		// every site is evaluated under the configuration
		for (const dependency of this.configuration.modules)
			if (!dependencies.includes(dependency)) dependencies.push(dependency)
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
		if (this.mode === "standalone") {
			const inputImports = this.foldSites(
				module,
				sites,
				s,
				prefix,
				modules,
				imports,
				diagnostics
			)
			this.linkIslands(module, sites, s, prefix)
			// a module mock replaces what a module exports, so each static helper a factory was built with is checked against what its own module registers
			if (this.checkHelpers) {
				const registered = Object.entries(this.registeredHelpersOf(module))
				if (registered.length) {
					// a statement starting with an identifier, since stripping a type alias before it also strips a leading semicolon
					s.append(
						`\nObject.assign((globalThis[Symbol.for("arktype.helpers")] ??= { __proto__: null }), { ${JSON.stringify(module.path)}: { __proto__: null, ${registered
							.map(([name, local]) => `${JSON.stringify(name)}: ${local}`)
							.join(", ")} } })`
					)
				}
			}
			// each export a factory compares that the module didn't import, imported after its own imports
			for (const specifier in inputImports) {
				const locals = inputImports[specifier]
				s.append(
					`\nimport { ${Object.keys(locals)
						.map(name => `${name} as ${locals[name]}`)
						.join(", ")} } from ${JSON.stringify(specifier)}`
				)
			}
			if (id === this.config) this.stampConfiguration(module, s)
		} else {
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

	// as the program applies it at runtime, before any site is evaluated
	private applyConfiguration(): Configuration {
		if (this.config === undefined) return this.checkThread([], undefined)
		const module = this.graph.moduleOf(this.config)
		if (!(module instanceof SourceModule)) {
			return throwError(
				writeUnreadableConfigMessage(this.graph.pathOf(this.config))
			)
		}
		const modules = this.localClosureOf(module.id)
		const call = this.configureCallsOf(module)[0]
		if (!call) return this.checkThread(modules, undefined)
		const fingerprint = hashOf(
			modules
				.map(id => `${this.graph.pathOf(id)}\n${this.graph.host.readFile(id)}`)
				.join("\n")
		)
		if (fingerprint === threadFingerprint)
			return { modules, fingerprint, reasons: [] }
		this.checkThread(modules, fingerprint)
		const [value, reasons] = this.evaluateConfiguration(call, module)
		if (reasons.length) return { modules, fingerprint: undefined, reasons }
		// as arktype fixes its configuration at the first Type, configure() would throw
		if ($ark.resolvedConfig) {
			return {
				modules,
				fingerprint: undefined,
				problem: "configure() is called after its argument creates a Type",
				reasons
			}
		}
		configure(value as never)
		threadFingerprint = fingerprint
		return { modules, fingerprint, reasons }
	}

	// this thread's arktype takes one configuration, before it creates a Type, which must be the build's
	private checkThread(
		modules: string[],
		fingerprint: string | undefined
	): Configuration {
		const isConfigured =
			threadFingerprint !== undefined || Object.keys($ark.config).length > 0
		if (
			fingerprint === undefined ? isConfigured : (
				isConfigured || $ark.resolvedConfig
			)
		)
			throwError(configuredThreadMessage)
		return { modules, fingerprint, reasons: [] }
	}

	private stampConfiguration(module: SourceModule, s: MagicString): void {
		const call = this.configureCallsOf(module)[0]
		const fingerprint = this.configuration!.fingerprint
		if (!call || fingerprint === undefined) return
		if (call.arguments.length)
			s.appendLeft(call.arguments[0].end, `, ${JSON.stringify(fingerprint)}`)
		else s.appendLeft(call.end - 1, `{}, ${JSON.stringify(fingerprint)}`)
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
	): Record<string, Record<string, string>> {
		const inputImports: Record<string, Record<string, string>> = {}
		const namesBySite = new Map<Site, string>()
		const factoriesBySite = new Map<Site, SiteFactory>()
		const exportsByName: Record<string, StandaloneExport> = {}
		const sitesByName: Record<string, string> = {}
		// a site replaced by its value drops what it was written with, so a site inside it, like one in a thunk defining a Scope's alias, is dropped too
		const replaced: Site[] = []
		const folded: Site[] = []
		for (const site of sites) {
			if (
				site.status !== "accepted" ||
				replaced.some(
					outer => outer.start <= site.start && site.end <= outer.end
				)
			)
				continue
			if (site.definition) {
				const call = site.definition.parent!
				s.overwrite(call.start, site.definition.start, "(")
				s.overwrite(site.definition.end, call.end, ")")
				folded.push(site)
				continue
			}
			const reasons = this.unsupportedReasonsOf(site)
			const factory =
				reasons.length || site.parseError || !hasArkKind(site.value, "root") ?
					undefined
				:	this.factoryOf(site, module, reasons, prefix)
			if (reasons.length) {
				diagnostics.push(this.unsupported(module, site, reasons))
				continue
			}
			if (site.parseError) {
				namesBySite.set(site, nameOf(site))
				continue
			}
			if (factory) {
				const name = `f${nameOf(site)}`
				factoriesBySite.set(site, factory)
				namesBySite.set(site, name)
				exportsByName[name] = {
					type: site.value as never,
					params: factory.params
				}
			} else {
				const name = `v${nameOf(site)}`
				namesBySite.set(site, name)
				exportsByName[name] = site.value as never
				sitesByName[name] = module.positionOf(site)
				replaced.push(site)
			}
		}
		const refusalsByName: Record<string, string> = {}
		const { fingerprint } = this.configuration!
		const configured =
			fingerprint === undefined ? undefined : { fingerprint, path: module.path }
		const validators =
			Object.keys(exportsByName).length ?
				writeValidators(exportsByName, sitesByName, refusalsByName, configured)
			:	""
		const specifier = `~arktype/${hashOf(validators)}`
		const imported = new Set<string>()
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
						site.parseError.message,
						configured
					)
					imports[`~arktype/${name}`] = { default: local }
				} else {
					modules[specifier] = validators
					;(imports[specifier] ??= {})[name] = local
				}
			}
			const factory = factoriesBySite.get(site)
			for (const [specifier, name, local] of factory?.imports ?? [])
				(inputImports[specifier] ??= {})[name] = local
			// a site becomes a call, so its validator is created, or its ParseError thrown, where arktype would create its Type
			if (!factory) s.overwrite(site.start, site.end, `${local}()`)
			else {
				// each parameter stays where it is written, so it is evaluated when the original evaluates it
				const replace = (start: number, end: number, text: string) =>
					start === end ?
						s.appendLeft(start, text)
					:	s.overwrite(start, end, text)
				let start = site.start
				let separator = `${local}(`
				for (const span of factory.spans) {
					replace(start, span.start, separator)
					start = span.end
					separator = ", "
				}
				const inputs = factory.inputs.map(
					(input, i) => (i ? ", " : separator) + input
				)
				replace(start, site.end, `${inputs.join("")})`)
			}
			folded.push(site)
		}
		pruneArktypeImports(module, [...folded, ...module.islands], s)
		diagnostics.sort((l, r) => l.start - r.start)
		return inputImports
	}

	// what a site's factory receives, in the order the site evaluates it, adding to reasons what it can't receive
	private factoryOf(
		site: Site,
		module: SourceModule,
		reasons: string[],
		prefix: string
	): SiteFactory | undefined {
		const [, held] = keyOf(site.value as BaseRoot)
		// a module that runs is its own, so only a helper another module exports can be a mock
		const helpers =
			this.checkHelpers ?
				site.helpers.filter(helper => helper.file !== module.id)
			:	[]
		if (!held.length && !site.inputs.length && !helpers.length) return
		const holesByValue = new Map(site.holes.map(hole => [hole.value, hole]))
		const params: FactoryParam[] = []
		const spans: Span[] = []
		// the text each hole is read through, which can evaluate to another value at runtime if another module can replace it
		const sourcesByHole = new Map<unknown, Map<string, boolean>>()
		const addSource = (hole: unknown, text: string, isForeign: boolean) => {
			const sources = sourcesByHole.get(hole) ?? new Map<string, boolean>()
			sources.set(text, (sources.get(text) ?? false) || isForeign)
			sourcesByHole.set(hole, sources)
		}
		const passed = new Set<unknown>()
		for (const reference of site.references) {
			const text = module.snippetOf(reference)
			const hole = holesByValue.get(reference.value)
			// a class an intersection dropped decided which side survived, so it's received for its lineage
			if (hole && !held.includes(hole.value) && hole.kind !== "class") {
				// e.g. `pipe.try`'s morph, which arktype calls from a function of its own
				reasons.push(
					`arktype holds \`${text}\` (${module.positionOf(reference)}) in a function of its own, which a standalone validator can't create yet`
				)
				continue
			}
			const holes = hole ? [hole.value] : keyOf(reference.value as BaseRoot)[1]
			// a Type without holes is written into the site's own code rather than received
			if (holes.length && this.isIslandValue(reference.value, site)) {
				if (!passed.has(reference.value)) reasons.push(islandValueMessage(text))
				passed.add(reference.value)
				for (const value of holes) addSource(value, text, false)
				continue
			}
			for (const value of holes) {
				addSource(
					value,
					text,
					reference.isForeign ||
						this.interpreter.sourceOf(value)?.[1] !== module
				)
			}
			if (!holes.length || passed.has(reference.value)) continue
			if (spans.length && reference.start < spans[spans.length - 1].end) {
				reasons.push(
					`\`${text}\` is read inside another value its factory receives`
				)
			}
			if (reference.unavailableRead)
				reasons.push(unavailableReadMessage(reference.unavailableRead, module))
			passed.add(reference.value)
			spans.push(reference)
			params.push(
				hole ?
					{
						kind: hole.kind as HoleKind,
						label: `\`${text}\` (${module.positionOf(reference)})`,
						value: hole.value
					}
				:	{ kind: "input", label: text, reads: [[[], reference.value]] }
			)
		}
		for (const value of held) {
			if (sourcesByHole.has(value)) continue
			// a value the build didn't stand in for is arktype's own, which the emitter refuses or writes itself
			const source = this.interpreter.sourceOf(value)
			if (!source) continue
			const [node, origin] = source
			reasons.push(
				`arktype holds \`${origin.snippetOf(node)}\` (${origin.positionOf(node)}), which the site ${holesByValue.has(value) ? "reads outside its own source" : "cannot pass to its factory"}`
			)
		}
		// equality between values another module can replace is later work
		const foreignTexts = new Set<string>()
		let foreignHoleCount = 0
		for (const sources of sourcesByHole.values()) {
			const foreign = [...sources].filter(([, isForeign]) => isForeign)
			if (!foreign.length) continue
			foreignHoleCount++
			for (const [text] of foreign) foreignTexts.add(text)
			if (sources.size > 1) {
				reasons.push(
					`${listTexts(sources.keys())} may hold different values at runtime, which the site's output depends on`
				)
			}
		}
		// the holes one validator holds are distinct, since the build of its own site proved them so
		if (foreignHoleCount > 1 && foreignTexts.size > 1) {
			reasons.push(
				`${listTexts(foreignTexts)} may hold the same value at runtime, which the site's output depends on`
			)
		}
		const readsByRoot = new Map<string, Input[]>()
		for (const input of site.inputs) {
			// a Type passed where the site reads it is compared there
			if (!input.path.length && passed.has(input.value)) continue
			const key = `${input.kind} ${input.file} ${input.name}`
			readsByRoot.set(key, [...(readsByRoot.get(key) ?? []), input])
		}
		const inputs: string[] = []
		const imports: SiteFactory["imports"] = []
		for (const reads of readsByRoot.values()) {
			const island = reads.find(input => this.isIslandValue(input.value, site))
			if (island) {
				reasons.push(
					islandValueMessage(
						[island.name, ...island.path.map(String)].join(".")
					)
				)
				continue
			}
			const unsupported = reads.find(
				input =>
					hasArkKind(input.value, "module") ||
					hasArkKind(input.value, "generic") ||
					hasArkKind(input.value, "scope")
			)
			if (unsupported) {
				reasons.push(
					`\`${[unsupported.name, ...unsupported.path.map(String)].join(".")}\` is a ${
						hasArkKind(unsupported.value, "module") ? "Module"
						: hasArkKind(unsupported.value, "generic") ? "Generic"
						: "Scope"
					}, which a factory can't compare yet`
				)
				continue
			}
			const passedAs = this.inputExpressionOf(reads[0], site, module, prefix)
			if (typeof passedAs === "string") {
				reasons.push(passedAs)
				continue
			}
			const [expression, label, imported] = passedAs
			inputs.push(expression)
			if (imported) imports.push(imported)
			params.push({
				kind: "input",
				label,
				reads: reads.map(input => [input.path, input.value])
			})
		}
		for (const helper of helpers) {
			const exporter = this.graph.moduleOf(helper.file) as SourceModule
			const label = `\`${helper.name}\` (${exporter.positionOf(helper)})`
			if (!(helper.name in this.registeredHelpersOf(exporter))) {
				reasons.push(
					`${label} is a static helper its module doesn't export through a binding, so a test driver can't register it`
				)
				continue
			}
			const passedAs = this.inputExpressionOf(
				{
					kind: "import",
					file: helper.file,
					name: helper.name,
					path: [],
					value: undefined
				},
				site,
				module,
				prefix
			)
			if (typeof passedAs === "string") {
				reasons.push(passedAs)
				continue
			}
			const [expression, , imported] = passedAs
			inputs.push(expression)
			if (imported) imports.push(imported)
			params.push({
				kind: "helper",
				label,
				file: exporter.path,
				name: helper.name
			})
		}
		return { params, spans, inputs, imports }
	}

	// the functions a test driver registers of each module for factories to check, each export by the local holding it
	private registeredHelpersOf(module: SourceModule): Record<string, string> {
		const result: Record<string, string> = {}
		for (const [name, entry] of Object.entries(module.scopes.exportsByName)) {
			if (
				entry.kind !== "binding" ||
				entry.binding.kind === "import" ||
				name === "__proto__"
			)
				continue
			const value = this.interpreter.valueOfBinding(entry.binding, module)
			if (
				hasDomain(value, "object") &&
				this.interpreter.standIns.get(value)?.kind === "function"
			)
				result[name] = entry.binding.name
		}
		return result
	}

	// a message as the program prints it, each placeholder for a function's name replaced by where the site reads the function, or else by its declaration
	private sourceNamed(
		message: string,
		site: Site,
		module: SourceModule
	): string {
		const holes = new Set([
			...site.holes.map(hole => hole.value),
			...(hasArkKind(site.value, "root") ? keyOf(site.value)[1] : [])
		])
		for (const hole of holes) {
			const standIn =
				hasDomain(hole, "object") && this.interpreter.standIns.get(hole)
			// an opaque stand-in refuses to be read, even for its name
			if (!standIn || standIn.kind === "opaque") continue
			const { name } = hole as Function
			if (!name || !message.includes(name)) continue
			const reference = site.references.find(
				reference => reference.value === hole
			)
			message = message
				.split(name)
				.join(
					reference ?
						module.snippetOf(reference)
					:	(bindingOfFunction(standIn.node, standIn.module)?.name ??
							standIn.module.snippetOf(standIn.node))
				)
		}
		return message
	}

	// a runtime island's Type is arktype's, which a factory can't take holes from or compare
	private isIslandValue(value: unknown, site: Site): boolean {
		if (!hasArkKind(value, "root")) return false
		for (const state of this.interpreter.sitesByNode.values()) {
			if (state.value === value && isInIsland(state.node, state.module))
				return true
		}
		// another module's sites are evaluated without being found, so its export is read where it's declared
		return site.inputs.some(input => {
			if (input.kind !== "import" || input.value !== value) return false
			const target = this.graph.exportOf(
				this.graph.moduleOf(input.file!) as SourceModule,
				input.name
			)
			return (
				(target.kind === "binding" &&
					isInIsland(target.binding.declaration, target.module)) ||
				(target.kind === "expression" && isInIsland(target.node, target.module))
			)
		})
	}

	// the expression a factory call receives an input root through and how a mismatch names it, or why it can't
	private inputExpressionOf(
		input: Input,
		site: Site,
		module: SourceModule,
		prefix: string
	):
		| [expression: string, label: string, imported?: SiteFactory["imports"][0]]
		| string {
		if (input.kind === "define") return [input.name, input.name]
		const isVisible = (binding: Binding) =>
			![...module.scopes.bindingsById.values()].some(
				other =>
					other !== binding &&
					other.name === binding.name &&
					other.scope.node.start <= site.start &&
					site.end <= other.scope.node.end &&
					contains(binding.scope.node, other.scope.node)
			)
		if (input.kind === "local") {
			const binding = this.bindingsByInput.get(input)!
			return isVisible(binding) ?
					[binding.name, binding.name]
				:	`\`${binding.name}\` (${module.positionOf(binding.id)}) is shadowed where the site is written, so its factory can't receive it`
		}
		let namespace: string | undefined
		for (const binding of module.scopes.bindingsById.values()) {
			if (binding.kind !== "import" || !isVisible(binding)) continue
			const target = this.graph.importOf(binding, module)
			if (target.kind === "namespace" && target.module.id === input.file)
				namespace = appendStringifiedKey(binding.name, input.name)
			else if (
				(target.kind === "binding" || target.kind === "expression") &&
				target.module.id === input.file &&
				(target.kind === "binding" ? target.name : "default") === input.name
			)
				return [binding.name, binding.name]
		}
		if (namespace) return [namespace, namespace]
		const specifier = specifierOf(module.id, input.file!)
		const local = `${prefix}i${hashOf(`${specifier} ${input.name}`)}`
		return [local, input.name, [specifier, input.name, local]]
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
			reasons.map(reason => this.sourceNamed(reason, site, module))
		)
	}

	private unsupportedReasonsOf(site: Site): string[] {
		const receivesNothing =
			!hasArkKind(site.value, "root") && isFoldable(site.value)
		const result =
			site.parseError || isFoldable(site.value) ?
				[]
			:	["its value is not a Type, Module, Scope or Generic"]
		// only a Type's site folds to a factory receiving what it reads, so a Module's, Scope's or Generic's can't read what could change at runtime
		const unreceived = (verb: string) =>
			receivesNothing ? `, which only a Type's factory can ${verb} yet` : ""
		// a ParseError's thrower checks nothing the site reads, though the error can depend on any of it
		for (const hole of site.holes) {
			const isReceived = !hole.isCalledAtDefinition && hole.kind !== "opaque"
			if (isReceived && !receivesNothing && !site.parseError) continue
			const holeModule = this.graph.moduleOf(hole.file) as SourceModule
			result.push(
				`arktype ${hole.isCalledAtDefinition ? "calls" : "holds"} \`${holeModule.snippetOf(hole)}\` (${holeModule.positionOf(hole)})${isReceived ? unreceived("receive") : ""}`
			)
		}
		for (const input of site.parseError || receivesNothing ? site.inputs : []) {
			result.push(
				`\`${[input.name, ...input.path.map(String)].join(".")}\` is ${
					input.kind === "import" ?
						`imported from ${this.graph.pathOf(input.file!)}`
					: input.kind === "local" ? "declared in a function around the site"
					: "a define"
				}${unreceived("compare")}`
			)
		}
		for (const helper of (
			(site.parseError || receivesNothing) && this.checkHelpers
		) ?
			site.helpers
		:	[]) {
			result.push(
				`it calls the static helper \`${helper.name}\` (${(this.graph.moduleOf(helper.file) as SourceModule).positionOf(helper)})${unreceived("check")}`
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
		if (this.mode === "standalone") {
			diagnostics.push(
				...this.checkStandalone(module, candidates),
				...this.checkIslands(module)
			)
		}
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
			helpers: [],
			references: [],
			definition: undefined
		}
		if (this.mode === "standalone" && isInIsland(state.node, module)) {
			site.status = "island"
			return site
		}
		const dynamic = rejectionOf(state)
		if (dynamic) return rejectSite(site, dynamic)
		if (state.error instanceof ParseError) site.parseError = state.error
		else {
			site.value = state.value
			site.roots = state.roots
			// e.g. a Generic aliased `define`, whose instantiation is a Type
			if (!isFoldable(state.value))
				site.definition = this.definitionOf(state.node, module)
		}
		for (const read of state.trace.reads) {
			const input = this.inputOf(read, candidate, module)
			if (input instanceof DynamicValue) return rejectSite(site, input)
			if (!site.inputs.some(existing => isCoveredBy(input, existing)))
				site.inputs.push(input)
		}
		for (const value of state.holes) {
			if (!site.parseError && !isHeld(value, this.interpreter)) continue
			const hole = this.holeOf(value, candidate, module)
			if (hole instanceof DynamicValue) return rejectSite(site, hole)
			site.holes.push(hole)
		}
		site.holes.sort((l, r) => l.start - r.start)
		for (const { root, value } of state.trace.exportedFunctions) {
			const node = this.interpreter.standIns.get(value as object)?.closure?.node
			if (
				root.kind !== "export" ||
				!node ||
				!state.trace.helpers.some(([helper]) => helper === node) ||
				site.helpers.some(
					helper => helper.file === root.file && helper.name === root.name
				)
			)
				continue
			const entry = (this.graph.moduleOf(root.file) as SourceModule).scopes
				.exportsByName[root.name]
			const declaration =
				entry.kind === "binding" ? entry.binding.id
				: entry.kind === "expression" ? entry.node
				: node
			site.helpers.push({
				file: root.file,
				name: root.name,
				start: declaration.start,
				end: declaration.end
			})
		}
		for (const [value, reads] of state.readsByValue) {
			if (
				!hasArkKind(value, "root") &&
				!site.holes.some(hole => hole.value === value)
			)
				continue
			const isImportInput = site.inputs.some(
				input => input.kind === "import" && input.value === value
			)
			for (const node of reads) {
				site.references.push({
					start: node.start,
					end: node.end,
					value,
					isForeign: isImportInput || this.isImported(node, module),
					unavailableRead: state.unavailableReads.find(read =>
						contains(node, read.node)
					)
				})
			}
		}
		site.references.sort((l, r) => l.start - r.start)
		return site
	}

	// whether a reference reads an import, directly or through its members
	private isImported(node: Node, module: SourceModule): boolean {
		node = unwrapExpression(node)
		while (node.type === "MemberExpression")
			node = unwrapExpression(node.object)
		return module.scopes.referencesById.get(node)?.binding?.kind === "import"
	}

	// e.g. `$.define({ a: "string" })`, whose argument can stay in its place only if it reads nothing arktype must define
	private definitionOf(node: Node, module: SourceModule): Node | undefined {
		const call = unwrapExpression(node)
		if (call.type !== "CallExpression" || call.arguments.length !== 1) return
		const [definition] = call.arguments
		const callee = unwrapExpression(call.callee)
		const reference =
			callee.type === "Identifier" ?
				module.scopes.referencesById.get(callee)
			:	undefined
		const isDefine =
			callee.type === "MemberExpression" ?
				!callee.computed &&
				callee.property.name === "define" &&
				this.graph.isArkExpression(callee.object, module)
			:	!!reference &&
				this.graph.arkExportOf(reference, module)?.[0] === "define"
		if (!isDefine || definition.type === "SpreadElement") return
		let readsArk = false
		walk(definition, child => {
			const binding =
				child.type === "Identifier" ?
					module.scopes.referencesById.get(child)?.binding
				:	undefined
			const helper = binding && this.graph.boundHelperOf(binding, module)
			readsArk ||=
				!!binding &&
				(this.graph.isArkBinding(binding, module) ||
					(!!helper && this.graph.isArkHelper(...helper)))
			return !readsArk
		})
		return readsArk ? undefined : definition
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
		) {
			const input: Input = {
				kind: "local",
				file: undefined,
				name: binding.name,
				path,
				value
			}
			this.bindingsByInput.set(input, binding)
			return input
		}
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
		const { readsByValue } = candidate.state
		const source =
			readsByValue.get(value)?.[0] ??
			(standIn?.dynamic && readsByValue.get(standIn.dynamic)?.[0])
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
			value,
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
		if (site.status === "island") return []
		const node = candidate.state.node
		if (site.status === "rejected") {
			const rejection = rejectionOf(candidate.state)
			if (rejection?.hasCode("placeholder"))
				return [this.unsupported(module, site, site.reasons)]
			return [
				this.diagnostic(
					module,
					node,
					rejection?.hasCode("callback") ? "R2" : "R1",
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
					[this.sourceNamed(site.parseError.message, site, module)]
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
			const source = candidate.state.readsByValue.get(standIn.dynamic)?.[0]
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

	private configureCallsOf(module: SourceModule): CallExpression[] {
		const cached = this.configureCallsByModule.get(module)
		if (cached) return cached
		const result: CallExpression[] = []
		for (const reference of module.scopes.references) {
			const [name, read] = this.graph.arkExportOf(reference, module) ?? []
			const call = read?.parent
			if (
				name === "configure" &&
				call?.type === "CallExpression" &&
				call.callee === read
			)
				result.push(call)
		}
		this.configureCallsByModule.set(module, result)
		return result
	}

	private checkConfiguration(module: SourceModule): Diagnostic[] {
		const result: Diagnostic[] = []
		const calls = this.configureCallsOf(module)
		for (let i = 0; i < calls.length; i++) {
			const call = calls[i]
			const problem =
				this.config === undefined ?
					"configure() is called, but the build has no `config` module"
				: this.config !== module.id ?
					`configure() is called outside the config module ${this.graph.pathOf(this.config)}`
				: i > 0 ? "configure() is called more than once"
				: this.configuration?.problem
			const reasons =
				problem ?
					[]
				:	(this.configuration?.reasons ??
					this.evaluateConfiguration(call, module)[1])
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

	private evaluateConfiguration(
		call: CallExpression,
		module: SourceModule
	): [value: unknown, problems: string[]] {
		const argument = call.arguments[0]
		if (!argument) return [undefined, []]
		const value = this.interpreter.evaluateSite(
			createSiteState(argument, module)
		)
		const dynamic = rejectionOf(value)
		if (dynamic) return [undefined, chainOf(dynamic)]
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
		return [value.value, result]
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
			if (
				!reference.binding ||
				reference.isWrite ||
				isInIsland(reference.id, module)
			)
				continue
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
				this.graph.isRuntimeUse(id, module) ||
				isInIsland(id, module)
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

	// a runtime island runs on arktype, as must every definition it reaches, which the build would otherwise precompile
	private checkIslands(module: SourceModule): Diagnostic[] {
		const result: Diagnostic[] = []
		const visited = new Set<Node>()
		const visit = (node: Node, origin: SourceModule, reasons: string[]) =>
			walk(node, child => {
				const reference =
					child.type === "Identifier" ?
						origin.scopes.referencesById.get(child)
					:	undefined
				const binding = reference?.binding
				if (
					!binding ||
					reference.isWrite ||
					contains(node, binding.declaration)
				)
					return true
				const [name, arkRead] = this.graph.arkExportOf(reference, origin) ?? []
				if (arkRead) {
					if (
						!isInIsland(arkRead, origin) &&
						!(name! in runtimeExports) &&
						!this.graph.isRuntimeUse(child, origin)
					) {
						result.push(
							this.diagnostic(
								origin,
								arkRead,
								"R4",
								"error",
								`\`${origin.snippetOf(arkRead)}\` is arktype/runtime's outside a runtime island`,
								reasons,
								islandHint
							)
						)
					}
					return true
				}
				let read: Node = child
				let target: ImportTarget =
					binding.kind === "import" ?
						this.graph.importOf(binding, origin)
					:	{ kind: "binding", module: origin, binding, name: binding.name }
				// e.g. `schemas.User`, with `schemas` a namespace import
				if (
					target.kind === "namespace" &&
					child.parent?.type === "MemberExpression" &&
					child.parent.object === child &&
					!child.parent.computed
				) {
					read = child.parent
					target = this.graph.exportOf(
						target.module,
						child.parent.property.name
					)
				}
				if (target.kind !== "binding" && target.kind !== "expression")
					return true
				const declaration =
					target.kind === "binding" ? target.binding.declaration : target.node
				if (isInIsland(declaration, target.module)) return true
				if (
					target.kind === "binding" ?
						this.graph.isArkBinding(target.binding, target.module)
					:	this.graph.isArkExpression(target.node, target.module)
				) {
					// e.g. `User(data)` or `User.assert(data)`, which a standalone validator runs
					if (
						!(
							read.parent?.type === "CallExpression" &&
							read.parent.callee === read
						) &&
						!this.graph.isRuntimeUse(child, origin)
					) {
						result.push(
							this.diagnostic(
								origin,
								read,
								"R4",
								"error",
								`\`${origin.snippetOf(read)}\` is a precompiled validator, which a runtime island can only validate with`,
								reasons,
								islandHint
							)
						)
					}
					return true
				}
				if (
					(target.kind === "binding" &&
						!(target.binding.kind in declaredBindingKinds)) ||
					visited.has(declaration)
				)
					return true
				visited.add(declaration)
				const step = `\`${origin.snippetOf(read)}\` (${target.module.positionOf(target.kind === "binding" ? target.binding.id : declaration)})`
				visit(
					declaration,
					target.module,
					reasons.length ?
						[`${reasons[0]}, ${step}`]
					:	[
							`the runtime island at ${module.positionOf(node)} reaches it through ${step}`
						]
				)
				return true
			})
		for (const island of module.islands) visit(island, module, [])
		return result
	}

	// a runtime island reads arktype's exports from arktype, imported after the module allowing it beside arktype/runtime
	private linkIslands(
		module: SourceModule,
		sites: Site[],
		s: MagicString,
		prefix: string
	): void {
		const namespace = `${prefix}$island`
		let isLinked = false
		for (const reference of module.scopes.references) {
			const id = reference.id
			if (
				!isInIsland(id, module) ||
				sites.some(
					site =>
						site.status === "accepted" &&
						site.start <= id.start &&
						id.end <= site.end
				)
			)
				continue
			const [name, read] = this.graph.arkExportOf(reference, module) ?? []
			if (!read) continue
			const parent = read.parent
			s.overwrite(
				read.start,
				read.end,
				parent?.type === "Property" && parent.shorthand ?
					`${module.textOf(read)}: ${namespace}.${name}`
				:	`${namespace}.${name}`
			)
			isLinked = true
		}
		if (isLinked) {
			s.prependLeft(
				firstStatementOf(module.program).start,
				`import "arktype/internal/island.js"\nimport * as ${namespace} from "arktype/internal"\n`
			)
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

interface Configuration {
	modules: string[]
	fingerprint: string | undefined
	// why the configure() call can't be applied, reported where the config module is precompiled
	problem?: string
	reasons: string[]
}

// another precompiler in the thread may share the configuration one applied
let threadFingerprint: string | undefined

export const writeUnreadableConfigMessage = <path extends string>(
	path: path
): writeUnreadableConfigMessage<path> =>
	`the config module ${path} can't be read`

export type writeUnreadableConfigMessage<path extends string> =
	`the config module ${path} can't be read`

export const configuredThreadMessage =
	"arktype in this thread holds a configuration other than the build's, which it can't change once set, so the build must restart in a thread of its own"

export type configuredThreadMessage = typeof configuredThreadMessage

export const writeStandaloneDependencyMessage = <name extends string>(
	name: name
): writeStandaloneDependencyMessage<name> =>
	`${name} imports arktype, which a standalone build resolves to arktype/runtime, where defining a Type throws`

export type writeStandaloneDependencyMessage<name extends string> =
	`${name} imports arktype, which a standalone build resolves to arktype/runtime, where defining a Type throws`

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

// a relative specifier for a file, which a bundler resolves as the module did
const specifierOf = (importer: string, file: string) => {
	const path = relative(dirname(importer), file).split("\\").join("/")
	return path.startsWith(".") ? path : `./${path}`
}

const listTexts = (texts: Iterable<string>) =>
	[...texts].map(text => `\`${text}\``).join(" and ")

const isFoldable = (value: unknown) =>
	hasArkKind(value, "root") ||
	hasArkKind(value, "module") ||
	hasArkKind(value, "scope") ||
	hasArkKind(value, "generic")

// a ParseError is named by its message, so equal sites share a thrower, and anything else by its site, since a cyclic Type's hash holds registry counters
const nameOf = (site: Site) =>
	hashOf(site.parseError?.message ?? `${site.start}`)

// precompileStandalone refuses a whole artifact for one export it can't emit, so on a refusal each is emitted alone to find it
const writeValidators = (
	exportsByName: Record<string, StandaloneExport>,
	sitesByName: Record<string, string>,
	refusalsByName: Record<string, string>,
	configured: ConfiguredModule | undefined
): string => {
	try {
		return precompileStandalone(exportsByName, configured, sitesByName)
	} catch {
		const emitted = { ...exportsByName }
		for (const name in exportsByName) {
			try {
				precompileStandalone({ [name]: exportsByName[name] })
			} catch (e) {
				refusalsByName[name] = (e as Error).message
				delete emitted[name]
			}
		}
		// every export is refused when the whole artifact is, as under a configured locale
		return Object.keys(emitted).length ?
				precompileStandalone(emitted, configured, sitesByName)
			:	""
	}
}

// a thrower fixes the configuration as arktype's failed definition does
const writeParseErrorThrower = (
	message: string,
	configured: ConfiguredModule | undefined
) =>
	`import * as runtime from "arktype/runtime"\n\nconst throwParseError = () => {\n\t${writeFixConfig(configured)}\n\tthrow new runtime.ParseError(${JSON.stringify(message)})\n}\n\nexport { throwParseError as default }\n`

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
	s.prependLeft(firstStatementOf(module.program).start, declarations)
	for (const source in namespacesBySource) {
		s.append(
			`\nimport * as ${namespacesBySource[source]} from ${JSON.stringify(source)}`
		)
	}
}

const firstStatementOf = (program: Program) =>
	program.body.find(
		statement =>
			statement.type !== "ExpressionStatement" || !statement.directive
	)!

const unavailableReadMessage = (read: UnavailableRead, module: SourceModule) =>
	`\`${module.snippetOf(read.node)}\` is read at runtime, where a standalone ${read.replacedBy} has no \`${String(read.key)}\``

const islandValueMessage = (text: string) =>
	`\`${text}\` is a runtime island's Type, which a precompiled site can't receive`

const isInIsland = (node: Node, module: SourceModule) =>
	module.islands.some(island => contains(island, node))

const declaredBindingKinds = {
	const: 1,
	let: 1,
	var: 1,
	function: 1,
	class: 1
} satisfies Partial<Record<BindingKind, 1>>

const islandHint = `A runtime island runs on arktype, as must what it reads. Mark that definition // @ark-runtime too, or build with runtime: "arktype".`

// an import only folded sites read becomes `import "arktype"`, so the runtime loads where arktype would have
const pruneArktypeImports = (
	module: SourceModule,
	folded: Span[],
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
	sites: Span[],
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
	site.references = []
	return site
}

const rejectionOf = (state: SiteState): DynamicValue | undefined =>
	state.error instanceof DynamicValue ? state.error
	: state.error === undefined ? findDynamic(state.value)
	: undefined

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
