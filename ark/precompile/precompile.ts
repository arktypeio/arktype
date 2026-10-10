import {
	$ark,
	hasArkKind,
	writePrecompiledUnits,
	type BaseRoot
} from "@ark/schema"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { fingerprintOf } from "@ark/schema/runtime"
import {
	appendStringifiedKey,
	hashOf,
	hasDomain,
	includes,
	ParseError,
	printable,
	registeredNameOf,
	throwError,
	throwParseError
} from "@ark/util"
import { ark, configure } from "arktype"
import type { HoleKind, IntrospectionMember } from "arktype/internal/runtime.ts"
import * as arktypeRuntime from "arktype/internal/runtimeExports.ts"
import {
	appendPath,
	holeNamePattern,
	introspectionMembers,
	isAddressed,
	isTypedFn,
	keyOf,
	kindNameOf,
	precompileStandalone,
	precompileStandaloneModules,
	writeFixConfig,
	writeUnprecompilableMessage,
	type ConfiguredModule,
	type DefaultCheck,
	type ExportSite,
	type FactoryParam,
	type Foldable,
	type StandaloneExport,
	type StandaloneFactory,
	type StandaloneIntrospection,
	type StandaloneModules,
	type StandaloneOptions,
	type StandaloneVariants,
	type ThunkAlias
} from "arktype/internal/standalone.ts"
import MagicString, { type SourceMap } from "magic-string"
import { dirname, join, relative } from "node:path"
import type {
	CallExpression,
	ImportDeclaration,
	ImportDeclarationSpecifier,
	MemberExpression,
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
	isArk,
	isArkObject,
	isFunctionNode,
	isPassiveReference,
	memberNameOf,
	ModuleGraph,
	readsBindingOf,
	runtimeExports,
	staticBodyOf,
	type ArkExportName,
	type FunctionNode,
	type ImportTarget
} from "./graph.ts"
import { dependencyOf, transformedId, type PrecompileHost } from "./host.ts"
import {
	createSiteState,
	envReadOf,
	findDynamic,
	Interpreter,
	isDynamic,
	type InterpreterOptions,
	ModuleNamespace,
	type Read,
	type SiteState
} from "./interpreter.ts"
import { SourceModule } from "./module.ts"
import {
	exportNameOf,
	isTransparent,
	isWriteTarget,
	normalize,
	operatorOf,
	unwrapExpression,
	walk,
	type Binding,
	type BindingKind
} from "./scope.ts"
import {
	filterSites,
	findSites,
	isFoldedHelper,
	type SiteCandidate,
	type SiteRead
} from "./sites.ts"

export type PrecompileMode = "standalone" | "cache"

export interface PrecompileOptions extends InterpreterOptions {
	// the directory paths in messages are relative to
	cwd?: string | undefined
	// the module whose `configure()` call sets the configuration
	config?: string | undefined
	// place what the module imports from virtual modules in the module itself, for hosts without them
	inline?: boolean | undefined
	// check at creation that each static helper a factory calls is the one its module exports, which a test runner's module mock can replace
	checkHelpers?: boolean | undefined
	// what a standalone validator bakes of its Type's introspection, which it otherwise lacks
	introspection?: readonly IntrospectionMember[] | undefined
	// the most factories one site compiles for the facts the build doesn't know, like the parameter count of a function a parameter holds
	maxVariants?: number | undefined
}

export interface ModuleAnalysis {
	sites: Site[]
	diagnostics: Diagnostic[]
	dependencies: string[]
}

export interface PrecompiledModule extends ModuleAnalysis {
	code: string
	// undefined when the module is unchanged
	map: SourceMap | undefined
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
	// each receiver and argument the site called arktype with
	arktypeArguments: unknown[]
	parsedDefinitions: string[]
	holes: Hole[]
	// each function arktype calls while defining what the site creates, which it checks is a function first, as for a narrow on a literal
	called: Hole[]
	inputs: Input[]
	helpers: Helper[]
	references: Reference[]
	// the argument of a call to arktype's `define`, which returns it, so a standalone build evaluates it in place of the call
	definition: Node | undefined
	// a Module like `type.keywords.string`, which creates no Type until one of its members is read
	isKeywordRead: boolean
	// whether arktype creates what it holds anew each time it runs, like a Scope in a function, which a factory then does too
	isCreatedEachRun: boolean
	// whether arktype returns the Type it created before for the same holes, as outside a Scope created each run, which a factory then does too
	isInterned: boolean
	// each Type another run or site holds too, which arktype holds once and a factory then reads from its address
	addressed: Set<BaseRoot>
	// each default arktype checks while defining what the site creates, which the build can't and its factory does at creation
	defaultChecks: DefaultCheck[]
	// each thunk alias arktype resolves while defining it, directly or in computing what a cache returns
	thunks: ThunkAlias[]
	// the site's own variant first, when it holds a function a parameter holds
	variants: Variant[] | undefined
	// where the module statement declaring the variable it initializes starts, as a bundler can drop that statement when nothing reads the variable
	declarationStart: number | undefined
	// e.g. `User` and "json" for `User.json`, which a standalone build folds to the data arktype returns
	introspection:
		| Pick<StandaloneIntrospection, "member" | "type" | "thrown">
		| undefined
}

export interface Hole {
	file: string
	// the expression evaluated in place at runtime, which is in the site's source unless the hole was read through a binding
	start: number
	end: number
	value: unknown
	kind: "function" | "class" | "symbol" | "opaque"
	// the parameter count compiled for, undefined when no declaration gives one
	arity: number | undefined
	description: string | undefined
	isCalledAtDefinition: boolean
	// an opaque value arktype parsed as a Standard Schema
	isDefinition: boolean
	// a function or class a parameter holds, which the build knows nothing of, so its factory checks it differs from every other hole
	isParameter: boolean
}

// a factory compiled for the parameter counts of the functions parameters hold, one of which its site's factory selects at creation
export interface Variant {
	site: Site
	// each combination of counts it was compiled for, 0, 1 or 2 for 2 or more
	counts: ReadonlyMap<Binding, number>[]
}

export interface Reference {
	start: number
	end: number
	value: unknown
	// whether another module can replace it, as a test runner's module mock does
	isForeign: boolean
	// whether it reads, through a binding nothing writes, what the site initializing that binding created, which nothing can replace
	isFixed: boolean
	// whether it reads a function or symbol its module creates, through the expression creating it or a binding of it, whose facts nothing changes
	isOwnHole: boolean
}

interface SiteFactory {
	params: FactoryParam[]
	spans: Span[]
	inputs: string[]
	imports: [specifier: string, name: string, local: string][]
	distinct: unknown[]
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
	hint?: string | undefined
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
	introspection: readonly IntrospectionMember[]
	maxVariants: number
	private configuration: Configuration | undefined
	private loadedBeforeConfigure: string[] | undefined
	private configureCallsByModule = new WeakMap<SourceModule, CallExpression[]>()
	// a site the mode cannot build fails a standalone build, while cache mode leaves it to runtime
	private rejectionSeverity: Diagnostic["severity"]
	private readsByModule = new WeakMap<SourceModule, SiteRead[]>()
	private candidatesByModule = new WeakMap<SourceModule, SiteCandidate[]>()
	private helperSitesByModule = new Map<SourceModule, Node[]>()
	private namesArkById: Record<string, boolean> = Object.create(null)
	private exportsArkByModule = new Map<SourceModule, boolean>()
	private analysesByModule = new WeakMap<SourceModule, ModuleAnalysis>()
	// why the configuration the analyses were made under can't be applied, which refuses each site
	private analyzedProblem: string | undefined
	private bindingsByInput = new WeakMap<Input, Binding>()
	// e.g. a Scope configured by a parameter, whose Types a site reading it would create as the build's Scope did
	private refusedContainers = new Map<unknown, [Node, SourceModule]>()
	private packagesByEntry: Record<string, [root: string, version: string]> =
		Object.create(null)
	private copiesByPackage: Record<ArkPackage, Record<string, PackageCopy>> = {
		arktype: {},
		"@ark/schema": {},
		"@ark/util": {}
	}
	private warnedDependencies: Record<string, true> = Object.create(null)
	private intrinsicUnits: Record<string, string> | undefined

	constructor(host: PrecompileHost, opts?: PrecompileOptions) {
		this.graph = new ModuleGraph(host, opts?.cwd)
		this.interpreter = new Interpreter(this.graph, opts, module =>
			this.readsOf(module)
		)
		this.mode = opts?.runtime === "arktype" ? "cache" : "standalone"
		this.config = opts?.config
		this.inline = !!opts?.inline
		this.checkHelpers = this.mode === "standalone" && !!opts?.checkHelpers
		this.introspection = opts?.introspection ?? []
		for (const member of this.introspection) {
			if (!includes(introspectionMembers, member))
				throwError(writeUnknownIntrospectionMessage(printable(member)))
		}
		this.maxVariants = opts?.maxVariants ?? 8
		this.rejectionSeverity = this.mode === "standalone" ? "error" : "warning"
	}

	// whether a host transforms a module, which it does for a module the build follows
	isTransformed(id: string): boolean {
		return transformedId.test(id) && this.graph.isFollowed(id)
	}

	analyze(source: string, id: string): ModuleAnalysis {
		const module = this.add(id, source)
		// precompile() analyzes under the thread's configuration, and applying it again leaves it as is
		if (threadConfiguration) this.configuration ??= this.applyConfiguration()
		return this.analysisOf(module)
	}

	// the configuration is read from the versions of its modules the graph holds, so one given anew reads it again
	private add(id: string, source: string): SourceModule {
		const module = this.graph.add(id, source)
		if (this.configuration?.modules.includes(id)) this.configuration = undefined
		return module
	}

	// whether a module may define a Type or, in a standalone build, read arktype's nodes, from its imports so most modules that can't are never parsed
	importsArk(source: string, id: string): boolean {
		if (arktypeSpecifier.test(source)) return true
		if (this.mode === "standalone") {
			for (const [, specifier] of source.matchAll(importSpecifier)) {
				if (
					nodePackageSpecifier.test(specifier) ||
					localeSpecifier.test(specifier)
				)
					return true
			}
		}
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
			case "binding":
				return this.graph.definesArk(target)
			default:
				return false
		}
	}

	// so a lint reports the copies its file reaches, as linting it alone would
	forgetCopies(): void {
		for (const name of Object.keys(this.copiesByPackage) as ArkPackage[])
			this.copiesByPackage[name] = {}
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
		const module = this.add(id, source)
		this.configuration ??= this.applyConfiguration()
		const { sites, diagnostics } = this.analysisOf(module)
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
			// a module mock replaces what a module exports, so the functions it exports are registered for factories to check
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
				// a program's first Type exports arktype's builtin scopes, whose roots then bind units like its own
				const intrinsicUnits = (this.intrinsicUnits ??= writePrecompiledUnits(
					Object.values($ark.intrinsic).filter(value =>
						hasArkKind(value, "root")
					)
				))
				const intrinsicTable = writeUnitTable(intrinsicUnits)
				const intrinsicSpecifier = `~arktype/units/${hashOf(intrinsicTable)}`
				modules[intrinsicSpecifier] = intrinsicTable
				imports[intrinsicSpecifier] = {}
				// a unit is a module of its own, so the modules whose Types call it share it
				const units = writePrecompiledUnits(roots)
				for (const key in units) {
					if (key in intrinsicUnits) continue
					const specifier = `~arktype/units/${key}`
					modules[specifier] = writeUnitTable({ [key]: units[key] })
					imports[specifier] = {}
				}
			}
		}
		let inserted = ""
		const insertImport = (text: string) => {
			inserted += text
		}
		if (this.inline)
			inlineModules(module, s, prefix, modules, imports, insertImport)
		else {
			for (const specifier in imports) {
				const locals = imports[specifier]
				if (!Object.keys(locals).length) insertImport(`\nimport "${specifier}"`)
				for (const name in locals) {
					insertImport(
						name === "default" ?
							`\nimport ${locals[name]} from "${specifier}"`
						:	`\nimport { ${name} as ${locals[name]} } from "${specifier}"`
					)
				}
			}
		}
		// imported where the module imports arktype, so they're evaluated where arktype is, in an import cycle too
		const arktypeImport = this.arktypeImportOf(module)
		if (inserted && !arktypeImport) s.append(inserted)
		else if (inserted && arktypeImport) {
			const lineEnd = source.indexOf("\n", arktypeImport.end)
			const rest = source.slice(
				arktypeImport.end,
				lineEnd === -1 ? undefined : lineEnd
			)
			// minified code can continue the import's line with a site or the configuration's fixer, which the imports precede
			s.prependLeft(arktypeImport.end, rest.trim() ? `${inserted}\n` : inserted)
		}
		return {
			code: s.toString(),
			map:
				s.hasChanged() ?
					s.generateMap({ source: id, includeContent: true, hires: "boundary" })
				:	undefined,
			sites,
			dependencies: this.dependenciesOfArtifact(module),
			diagnostics,
			modules: this.inline ? {} : modules
		}
	}

	private arktypeImportOf(module: SourceModule): ImportDeclaration | undefined {
		return module.program.body.find(
			(statement): statement is ImportDeclaration =>
				statement.type === "ImportDeclaration" &&
				statement.importKind !== "type" &&
				(statement.source.value === "arktype" ||
					statement.specifiers.some(specifier => {
						const binding = module.scopes.bindingsById.get(specifier.local)
						return (
							!!binding &&
							this.graph.definesArk({
								kind: "binding",
								module,
								binding,
								name: binding.name
							})
						)
					}))
		)
	}

	// as the program applies it at runtime, before any site is evaluated
	private applyConfiguration(): Configuration {
		const { module, modules, call, version, files } = this.readConfiguration()
		const applied = threadConfiguration
		if (applied && applied.version === version) return applied
		if (holdsOtherConfiguration(files)) throwError(configuredThreadMessage)
		const evaluated =
			module && call && this.evaluateConfiguration(call, module, modules)
		const problem =
			evaluated &&
			(evaluated.problem ??
				// as arktype fixes its configuration at the first Type, configure() would throw
				(!applied && $ark.resolvedConfig ?
					"configure() is called after its argument creates a Type"
				:	undefined))
		const configuration: Configuration = {
			modules,
			version,
			files,
			fingerprint:
				evaluated && !problem ?
					fingerprintOf(evaluated.value ?? {})
				:	undefined,
			problem,
			reasons: evaluated ? evaluated.reasons : [],
			hint: evaluated?.hint
		}
		if (applied) {
			// e.g. the config module as a plugin ahead of arktype's transpiled it, which configures what its file does
			return problem || configuration.fingerprint === applied.fingerprint ?
					configuration
				:	{
						...configuration,
						fingerprint: undefined,
						problem: configurationConflictMessage,
						reasons: [configurationConflictReason]
					}
		}
		if (evaluated) {
			threadConfiguration = configuration
			if (!problem) configure(evaluated.value as never)
		}
		// so a later configure() in the thread throws, as it does after arktype's first Type
		void ark.internal.resolvedConfig
		return configuration
	}

	get conflictsWithThread(): boolean {
		return this.configuration?.problem === configurationConflictMessage
	}

	// a baked schema isn't written again, so it would keep the build's value of anything a configured writer reads that the program can change
	private bake<t>(write: () => t): t {
		let result: [t, { reads: Read[] }]
		try {
			result = this.interpreter.traceOf(write)
		} catch (e) {
			if (!(e instanceof DynamicValue)) throw e
			return throwParseError(
				`${writeUnprecompilableMessage("a JSON Schema whose configured writer the build can't evaluate")}: ${chainOf(e).join(": ")}`
			)
		}
		const [value, { reads }] = result
		if (reads.length) {
			const { root, path } = reads[0]
			const label = path.reduce<string>(
				(label, key) => appendStringifiedKey(label, key),
				root.kind === "binding" ? root.binding.name : root.name
			)
			throwParseError(
				writeUnprecompilableMessage(
					`a JSON Schema whose configured writer reads \`${label}\`, which the program can change,`
				)
			)
		}
		return value
	}

	private dependenciesOfArtifact(module: SourceModule): string[] {
		const modules = [
			// the graph records an import each time it follows one, so a module it read for an earlier one is here too
			...this.graph.dependenciesOf(module.id),
			// every site is evaluated under the configuration
			...this.configuration!.modules
		]
		return [
			...new Set([
				...modules,
				...modules.flatMap(id => this.graph.host.tsconfigOf?.(id) ?? [])
			])
		]
	}

	// arktype takes one configuration per thread, so a build whose configuration's files changed restarts in a new one
	get needsNewThread(): boolean {
		return holdsOtherConfiguration(this.readConfiguration().files)
	}

	private readConfiguration() {
		if (this.config === undefined) {
			return {
				module: undefined,
				modules: [],
				call: undefined,
				version: undefined,
				files: undefined
			}
		}
		const module = this.graph.moduleOf(this.config)
		if (!(module instanceof SourceModule)) {
			return throwError(
				writeUnreadableConfigMessage(this.graph.pathOf(this.config))
			)
		}
		const modules = this.importClosureOf(module.id)
		const call = this.configureCallsOf(module)[0]
		return {
			module,
			modules,
			call,
			version:
				call &&
				hashOf(
					modules
						.map(id => `${this.graph.pathOf(id)}\n${this.sourceOf(id)}`)
						.join("\n")
				),
			files: call && hashOf(this.filesOf(module.id).join("\n"))
		}
	}

	// a host can give the build other text than a file's, as a plugin ahead of arktype's transpiles it
	private filesOf(id: string): string[] {
		const sourcesById: Record<string, string | undefined> = {}
		return this.localClosureOf(id, reached => {
			const source = (sourcesById[reached] = this.graph.host.readFile(reached))
			if (source === undefined) return []
			const module = new SourceModule(
				reached,
				source,
				this.graph.pathOf(reached)
			)
			return this.importsIn(module).map(([target]) => target)
		}).map(reached => `${this.graph.pathOf(reached)}\n${sourcesById[reached]}`)
	}

	private sourceOf(id: string): string | undefined {
		const module = this.graph.moduleOf(id)
		return module instanceof SourceModule ?
				module.source
			:	this.graph.host.readFile(id)
	}

	private stampConfiguration(module: SourceModule, s: MagicString): void {
		const call = this.configureCallsOf(module)[0]
		const { fingerprint, problem } = this.configuration!
		if (!call || fingerprint === undefined || problem) return
		if (call.arguments.length)
			s.appendLeft(call.arguments[0].end, `, ${JSON.stringify(fingerprint)}`)
		else s.appendLeft(call.end - 1, `{}, ${JSON.stringify(fingerprint)}`)
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
		const sitesByName: Record<string, ExportSite> = {}
		const keywordReads = new Set<string>()
		// sites arktype returned one Type for share a table, as they share it in the program
		const tablesByValue = new Map<unknown, number>()
		// e.g. a site in a thunk defining a Scope's alias, dropped with the rest of the text its factory replaces
		const replaced: [site: Site, spans: readonly Span[]][] = []
		const folded: Site[] = []
		for (const site of sites) {
			if (
				site.status !== "accepted" ||
				replaced.some(
					([outer, spans]) =>
						covers(outer, site) && !spans.some(span => covers(span, site))
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
			let reasons: string[]
			let factory: SiteFactory | undefined
			let variants: SiteFactory[] = []
			try {
				reasons = this.unsupportedReasonsOf(site, module)
				if (!reasons.length && !site.parseError) {
					factory =
						this.factoryOf(site, module, reasons, prefix) ??
						(site.isCreatedEachRun ?
							{ params: [], spans: [], inputs: [], imports: [], distinct: [] }
						:	undefined)
					if (factory && site.variants) {
						variants = this.variantFactoriesOf(
							site,
							factory,
							module,
							reasons,
							prefix
						)
					}
				}
			} catch (e) {
				reasons = reasonsOf(e)
			}
			if (reasons.length) {
				diagnostics.push(this.refuseWritten(module, site, reasons))
				continue
			}
			if (site.introspection) {
				// a site reading what another module exports checks it at each call, as a factory does
				factory ??= {
					params: [],
					spans: [],
					inputs: [],
					imports: [],
					distinct: []
				}
				const name = `f${nameOf(site)}`
				factoriesBySite.set(site, factory)
				namesBySite.set(site, name)
				exportsByName[name] = {
					...site.introspection,
					data: site.value,
					params: factory.params,
					defaultChecks: site.defaultChecks
				}
				sitesByName[name] = exportSiteOf(site)
				replaced.push([site, factory.spans])
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
				let table = tablesByValue.get(site.value)
				if (site.isInterned && table === undefined)
					tablesByValue.set(site.value, (table = tablesByValue.size))
				const exportOf = (
					factory: SiteFactory,
					variant: Site
				): StandaloneFactory => ({
					type: variant.value as never,
					params: factory.params,
					internedBy: site.isInterned ? table : undefined,
					isCreatedEachRun: site.isCreatedEachRun,
					defaultChecks: variant.defaultChecks,
					distinct: factory.distinct,
					selected:
						site.variants &&
						factory.params.flatMap(param =>
							param.kind === "function" && this.selectsVariant(param.value) ?
								[param.value]
							:	[]
						)
				})
				exportsByName[name] =
					site.variants ?
						this.variantsExportOf(
							site.variants,
							variants.map((factory, i) =>
								exportOf(factory, site.variants![i].site)
							)
						)
					:	exportOf(factory, site)
				sitesByName[name] = exportSiteOf(site)
				replaced.push([site, factory.spans])
			} else {
				const name = `v${nameOf(site)}`
				namesBySite.set(site, name)
				exportsByName[name] = site.value as never
				sitesByName[name] = exportSiteOf(site)
				if (site.isKeywordRead) keywordReads.add(name)
				replaced.push([site, []])
			}
		}
		const refusalsByName: Record<string, string[]> = {}
		const { fingerprint, problem } = this.configuration!
		const configured =
			fingerprint === undefined || problem ?
				undefined
			:	{ fingerprint, path: module.path }
		const validators =
			Object.keys(exportsByName).length ?
				writeValidators(
					exportsByName,
					{
						configured,
						sitesByName,
						keywordReads,
						introspection: this.introspection,
						bake: write => this.bake(write)
					},
					refusalsByName,
					this.inline
				)
			:	{ code: "", modules: {} }
		const specifier = `~arktype/${hashOf(validators.code)}`
		const imported = new Set<string>()
		// the source a site's call keeps, which still reads the bindings it holds
		const kept: Span[] = []
		const passed: string[] = []
		let fixedAt = Infinity
		for (const [site, name] of namesBySite) {
			if (refusalsByName[name]) {
				diagnostics.push(this.refuseWritten(module, site, refusalsByName[name]))
				continue
			}
			const local = prefix + name
			if (!imported.has(name)) {
				imported.add(name)
				if (site.parseError) {
					const thrower = writeParseErrorThrower(
						site.parseError.message,
						configured
					)
					const throwerSpecifier = `~arktype/${hashOf(thrower)}`
					modules[throwerSpecifier] = thrower
					imports[throwerSpecifier] = { default: local }
				} else {
					if (!(specifier in modules)) {
						modules[specifier] = validators.code
						Object.assign(modules, validators.modules)
					}
					;(imports[specifier] ??= {})[name] = local
				}
			}
			const factory = factoriesBySite.get(site)
			for (const [specifier, name, local] of factory?.imports ?? [])
				(inputImports[specifier] ??= {})[name] = local
			kept.push(...(factory?.spans ?? []))
			passed.push(...(factory?.inputs ?? []))
			// a bundler can drop a variable's site with the variable when nothing reads it, unless it throws
			const isPure =
				site.declarationStart !== undefined &&
				!site.parseError &&
				!site.introspection?.thrown
			// a keyword Module creates no Type until one of its members is read
			if (isPure && !site.isKeywordRead)
				fixedAt = Math.min(fixedAt, site.declarationStart!)
			// a site becomes a call, so its validator is created, or its ParseError thrown, where arktype would create its Type
			const call = isPure ? `/* @__PURE__ */ ${local}(` : `${local}(`
			if (!factory?.spans.length && !factory?.inputs.length)
				s.overwrite(site.start, site.end, `${call})`)
			else {
				// each parameter stays where it is written, so it is evaluated when the original evaluates it
				const replace = (start: number, end: number, text: string) =>
					start === end ?
						s.appendLeft(start, text)
					:	s.overwrite(start, end, text)
				let start = site.start
				let separator = call
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
		// the configuration is fixed where the first site a bundler can drop would fix it, as arktype fixes it creating the first Type
		if (fixedAt !== Infinity) {
			const fixer = writeConfigFixer(configured)
			const fixerSpecifier = `~arktype/${hashOf(fixer)}`
			modules[fixerSpecifier] = fixer
			imports[fixerSpecifier] = { default: `${prefix}fixConfig` }
			s.appendLeft(fixedAt, `${prefix}fixConfig()\n`)
		}
		pruneArktypeImports(module, [...folded, ...module.islands], s)
		keepImportedModules(module, folded, kept, passed, s)
		diagnostics.push(...this.checkRuntimeImports(module, sites))
		diagnostics.sort((l, r) => l.start - r.start)
		return inputImports
	}

	// e.g. `scope` in a static helper whose every call is a site, which keeps its import of an export arktype/runtime lacks
	private checkRuntimeImports(
		module: SourceModule,
		sites: Site[]
	): Diagnostic[] {
		const result: Diagnostic[] = []
		const spans = [...sites, ...module.islands]
		for (const statement of module.program.body) {
			if (
				statement.type !== "ImportDeclaration" ||
				statement.source.value !== "arktype" ||
				statement.importKind === "type"
			)
				continue
			for (const specifier of statement.specifiers) {
				if (
					specifier.type !== "ImportSpecifier" ||
					specifier.importKind === "type" ||
					exportNameOf(specifier.imported) in arktypeRuntime
				)
					continue
				const read = module.scopes.bindingsById
					.get(specifier.local)
					?.references.find(
						({ id }) =>
							!spans.some(span => span.start <= id.start && id.end <= span.end)
					)
				if (!read) continue
				result.push(
					this.diagnostic(
						module,
						read.id,
						"R4",
						"error",
						`\`${module.textOf(read.id)}\` is arktype's, which arktype/runtime doesn't export, so a standalone build can't load this module`,
						[],
						runtimeImportHint
					)
				)
			}
		}
		return result
	}

	// a module that runs is its own, so only a helper another module exports can be a mock
	private mockableHelpersOf(site: Site, module: SourceModule): Helper[] {
		return this.checkHelpers ?
				site.helpers.filter(helper => helper.file !== module.id)
			:	[]
	}

	private isFactory(site: Site, module: SourceModule): boolean {
		const created = createdBy(site)
		if (!created) return false
		const dropped = this.droppedHolesOf(site)
		return (
			keyOf(created)[1].length > 0 ||
			site.inputs.length > 0 ||
			site.defaultChecks.length > 0 ||
			// one its module creates and reads in place is the same function however the program runs
			site.references.some(
				reference => dropped.has(reference.value) && !reference.isOwnHole
			) ||
			this.mockableHelpersOf(site, module).length > 0
		)
	}

	// e.g. a narrow or a default's thunk an intersection reduced to `never` drops, whose kind and parameters arktype checked as it parsed them
	private droppedHolesOf(site: Site): Set<unknown> {
		const dropped = new Set<unknown>()
		// a Scope or Generic holds the definitions it reads, while a Type or Module holds what they reduce to
		const value = site.introspection?.type ?? site.value
		if (!hasArkKind(value, "root") && !hasArkKind(value, "module"))
			return dropped
		const held = [
			value,
			...site.defaultChecks.map(([node]) => node.in as BaseRoot)
		].flatMap(value => keyOf(value)[1])
		// a function arktype created can hold one the site read, as `pipe.try` holds its morph
		if (
			held.some(
				value =>
					typeof value === "function" && !this.interpreter.standIns.has(value)
			)
		)
			return dropped
		for (const hole of [...site.holes, ...site.called]) {
			if (hole.kind === "function" && !held.includes(hole.value))
				dropped.add(hole.value)
		}
		return dropped
	}

	private factoryOf(
		site: Site,
		module: SourceModule,
		reasons: string[],
		prefix: string
	): SiteFactory | undefined {
		if (!this.isFactory(site, module)) return
		// a default's check reads the functions of a node the value can drop
		const held = [
			...new Set(
				[
					createdBy(site)!,
					...site.defaultChecks.map(([node]) => node.in as BaseRoot)
				].flatMap(value => keyOf(value)[1])
			)
		]
		const helpers = this.mockableHelpersOf(site, module)
		const factory: SiteFactory = {
			params: [],
			spans: [],
			inputs: [],
			imports: [],
			distinct: []
		}
		const passed = this.receiveReferences(
			site,
			module,
			held,
			this.droppedHolesOf(site),
			factory,
			reasons
		)
		this.receiveInputs(site, module, prefix, passed, factory, reasons)
		for (const helper of helpers)
			this.receiveHelper(helper, site, module, prefix, factory, reasons)
		return factory
	}

	// each variant's factory receives what the site's does, so the site's call passes each the same values
	private variantFactoriesOf(
		site: Site,
		factory: SiteFactory,
		module: SourceModule,
		reasons: string[],
		prefix: string
	): SiteFactory[] {
		const result = [factory]
		for (const { site: variant } of site.variants!.slice(1)) {
			reasons.push(...this.unsupportedReasonsOf(variant, module))
			const variantFactory = this.factoryOf(variant, module, reasons, prefix)
			if (reasons.length) return []
			if (
				!variantFactory ||
				variantFactory.params.length !== factory.params.length ||
				variantFactory.params.some(
					(param, i) =>
						param.kind !== factory.params[i].kind ||
						param.label !== factory.params[i].label
				) ||
				variantFactory.inputs.join() !== factory.inputs.join()
			) {
				reasons.push(
					`its variants for the parameter counts of the functions parameters hold receive different values`
				)
				return []
			}
			result.push(variantFactory)
		}
		return result
	}

	private selectsVariant(hole: unknown): boolean {
		const standIn = this.interpreter.standIns.get(hole as object)
		return !!standIn?.parameter && !standIn.isDefinition
	}

	// the factory a site's call reaches selects the variant compiled for the facts of the functions its parameters hold
	private variantsExportOf(
		variants: Variant[],
		factories: StandaloneFactory[]
	): StandaloneVariants {
		const selecting: number[] = []
		const parameters: Binding[] = []
		const { params } = factories[0]
		for (let i = 0; i < params.length; i++) {
			const param = params[i]
			const parameter =
				param.kind === "function" &&
				this.interpreter.standIns.get(param.value as object)?.parameter
			if (!parameter || parameters.includes(parameter)) continue
			selecting.push(i)
			parameters.push(parameter)
		}
		const variantsByCounts: number[] = Array(3 ** parameters.length).fill(-1)
		for (let i = 0; i < variants.length; i++) {
			for (const counts of variants[i].counts) {
				variantsByCounts[
					parameters.reduce(
						(index, parameter) => index * 3 + counts.get(parameter)!,
						0
					)
				] = i
			}
		}
		return { variants: factories, selecting, variantsByCounts }
	}

	private receiveReferences(
		site: Site,
		module: SourceModule,
		held: unknown[],
		dropped: ReadonlySet<unknown>,
		factory: SiteFactory,
		reasons: string[]
	): Set<unknown> {
		const holesByValue = new Map(
			[...site.holes, ...site.called].map(hole => [hole.value, hole])
		)
		// the text each hole is read through, which can evaluate to another value at runtime if another module can replace it
		const sourcesByHole = new Map<unknown, Map<string, boolean>>()
		const addSource = (hole: unknown, text: string, isForeign: boolean) => {
			const sources = sourcesByHole.get(hole) ?? new Map<string, boolean>()
			sources.set(text, (sources.get(text) ?? false) || isForeign)
			sourcesByHole.set(hole, sources)
		}
		const passed = new Set<unknown>()
		// one value read through two texts is passed through each, since the program can change one but not the other
		const textsByPassed = new Map<unknown, Set<string>>()
		// what a site needs only to check, since its validator doesn't hold it or it reads only introspection, and needn't receive where nothing the program does changes that check and no default's check calls or is identified by it
		const unchecked = new Set<unknown>()
		const calledByChecks = new Set(
			site.defaultChecks.flatMap(([node]) => keyOf(node.in as BaseRoot)[1])
		)
		for (const reference of site.references) {
			const text = module.snippetOf(reference)
			const hole = holesByValue.get(reference.value)
			// e.g. beside `pipe.try`'s morph, where nothing the site reads is dropped
			if (hole && site.called.includes(hole) && !dropped.has(hole.value))
				continue
			// a class an intersection dropped decided which side survived, so it's received for its lineage
			if (
				hole &&
				!held.includes(hole.value) &&
				hole.kind !== "class" &&
				!dropped.has(hole.value)
			) {
				// e.g. `pipe.try`'s morph, which arktype calls from a function of its own
				reasons.push(
					`arktype holds \`${text}\` (${module.positionOf(reference)}) in a function of its own, which a standalone validator can't create yet`
				)
				continue
			}
			const holes = hole ? [hole.value] : keyOf(reference.value as Foldable)[1]
			if (
				(site.introspection || (hole && dropped.has(hole.value))) &&
				!holes.some(value => calledByChecks.has(value)) &&
				(hole ?
					reference.isOwnHole
				:	!this.interpreter.isCheckedAtCreation(reference.value))
			) {
				for (const value of holes) unchecked.add(value)
				continue
			}
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
			const texts = textsByPassed.get(reference.value) ?? new Set<string>()
			if (!holes.length || texts.has(text)) continue
			if (
				factory.spans.length &&
				reference.start < factory.spans[factory.spans.length - 1].end
			) {
				reasons.push(
					`\`${text}\` is read inside another value its factory receives`
				)
			}
			passed.add(reference.value)
			textsByPassed.set(reference.value, texts.add(text))
			factory.spans.push(reference)
			factory.params.push(
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
			if (sourcesByHole.has(value) || unchecked.has(value)) continue
			// a value the build didn't stand in for is arktype's own, which the emitter refuses or writes itself
			const source = this.interpreter.sourceOf(value)
			if (!source) continue
			const [node, origin] = source
			reasons.push(
				`arktype holds \`${origin.snippetOf(node)}\` (${origin.positionOf(node)}), which the site ${holesByValue.has(value) ? "reads outside its own source" : "cannot pass to its factory"}`
			)
		}
		const functions = [...sourcesByHole.keys()].filter(
			hole => typeof hole === "function"
		)
		// a parameter may hold any function, even another the site holds, which arktype relates to it by identity
		factory.distinct =
			site.holes.some(hole => hole.isParameter) && functions.length > 1 ?
				functions
			:	foreignHolesOf(sourcesByHole)
		return passed
	}

	private receiveInputs(
		site: Site,
		module: SourceModule,
		prefix: string,
		passed: Set<unknown>,
		factory: SiteFactory,
		reasons: string[]
	): void {
		const readsByRoot = new Map<string, Input[]>()
		for (const input of site.inputs) {
			// a Type passed where the site reads it is compared there
			if (!input.path.length && passed.has(input.value)) continue
			const key = `${input.kind} ${input.file} ${input.name}`
			readsByRoot.set(key, [...(readsByRoot.get(key) ?? []), input])
		}
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
			const passedAs = this.inputExpressionOf(reads[0], site, module, prefix)
			if (typeof passedAs === "string") {
				reasons.push(passedAs)
				continue
			}
			const [expression, label, imported] = passedAs
			factory.inputs.push(expression)
			if (imported) factory.imports.push(imported)
			factory.params.push({
				kind: "input",
				label,
				reads: reads.map(input => [input.path, input.value])
			})
		}
	}

	private receiveHelper(
		helper: Helper,
		site: Site,
		module: SourceModule,
		prefix: string,
		factory: SiteFactory,
		reasons: string[]
	): void {
		const exporter = this.graph.moduleOf(helper.file) as SourceModule
		const label = `\`${helper.name}\` (${exporter.positionOf(helper)})`
		if (!(helper.name in this.registeredHelpersOf(exporter))) {
			reasons.push(
				`${label} is a static helper its module doesn't export through a binding, so a test driver can't register it`
			)
			return
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
			return
		}
		const [expression, , imported] = passedAs
		factory.inputs.push(expression)
		if (imported) factory.imports.push(imported)
		factory.params.push({
			kind: "helper",
			label,
			file: exporter.path,
			name: helper.name
		})
	}

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

	// a function only a Type the site references holds has no text in the site, so it's named by its declaration
	private sourceNamed(
		message: string,
		site: Site,
		module: SourceModule
	): string {
		return message.replace(holeNamePattern, name => {
			const standIn = this.interpreter.standInsByName.get(name)
			if (!standIn) return name
			const reference = site.references.find(
				reference =>
					hasDomain(reference.value, "object") &&
					this.interpreter.standIns.get(reference.value) === standIn
			)
			return reference ?
					module.snippetOf(reference)
				:	(this.interpreter.declaredNameOf(standIn) ??
						standIn.module.snippetOf(standIn.node))
		})
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

	// so the sites a build returns agree with its diagnostics, as a check reports both
	private refuseWritten(
		module: SourceModule,
		site: Site,
		reasons: string[]
	): Diagnostic {
		site.status = "rejected"
		site.reasons = reasons
		return this.unsupported(module, site, reasons)
	}

	private refuseThrown(
		module: SourceModule,
		node: Node,
		site: Site,
		e: unknown
	): Diagnostic {
		refuse(site, reasonsOf(e))
		return this.diagnostic(
			module,
			node,
			"R1",
			this.rejectionSeverity,
			`${module.snippetOf(node)} cannot be precompiled`,
			site.reasons
		)
	}

	// a factory compares a container it receives by definition, which leaves out what a function arktype calls while defining what it creates returns
	private incomparableReasonsOf(site: Site, module: SourceModule): string[] {
		const reads: [value: unknown, text: string][] = [
			...site.references
				.filter(reference => !reference.isFixed)
				.map((reference): [unknown, string] => [
					reference.value,
					module.snippetOf(reference)
				]),
			...site.inputs
				.filter(
					input =>
						input.kind === "import" ||
						input.path.length ||
						!this.isCreatedBy(this.bindingsByInput.get(input), input.value)
				)
				.map((input): [unknown, string] => [
					input.value,
					[input.name, ...input.path.map(String)].join(".")
				])
		]
		const result: string[] = []
		const seen = new Set<unknown>()
		for (const [value, text] of reads) {
			if (seen.has(value)) continue
			seen.add(value)
			if (!isFoldable(value)) continue
			const [, holes, refusal, thunks] = keyOf(value)
			if (refusal) {
				result.push(`\`${text}\` ${refusal}, so a factory can't compare it`)
				continue
			}
			// e.g. `aAndB: () => $.type("a&b")`, the docs' way to use a Type's methods in a Scope, which decides only what a site resolving it creates
			const resolved = thunks.find(([scope, alias]) =>
				site.thunks.some(
					([resolvedScope, resolvedAlias]) =>
						resolvedScope === scope && resolvedAlias === alias
				)
			)
			if (resolved) {
				result.push(
					`\`${appendPath(text, resolved[2])}\`'s alias \`${resolved[1]}\` is a thunk the site resolves, so a factory can't compare what it returns`
				)
				continue
			}
			for (const hole of holes) {
				const standIn =
					hasDomain(hole, "object") && this.interpreter.standIns.get(hole)
				if (standIn && (standIn.isCalled || standIn.isCalledIndirectly)) {
					result.push(
						`arktype calls ${this.interpreter.labelOf(standIn)} while defining what \`${text}\` creates, so a factory can't compare it`
					)
					break
				}
			}
		}
		return result
	}

	private unsupportedReasonsOf(site: Site, module: SourceModule): string[] {
		const result =
			site.parseError || isFoldable(site.value) || site.introspection ?
				[]
			:	["its value is not a Type, Module, Scope, Generic or TypedFn"]
		// a ParseError's thrower checks nothing the site reads, though the error can depend on any of it
		for (const hole of site.holes) {
			const isReceived = !hole.isCalledAtDefinition && hole.kind !== "opaque"
			if (isReceived && !site.parseError) continue
			const holeModule = this.graph.moduleOf(hole.file) as SourceModule
			result.push(
				`arktype ${hole.isCalledAtDefinition ? "calls" : "holds"} \`${holeModule.snippetOf(hole)}\` (${holeModule.positionOf(hole)})`
			)
		}
		result.push(...this.incomparableReasonsOf(site, module))
		if (site.parseError) {
			const holes = this.interpreter.holesIn(site.arktypeArguments)
			for (const hole of site.holes) holes.delete(hole.value)
			for (const hole of holes) {
				const standIn =
					hasDomain(hole, "object") && this.interpreter.standIns.get(hole)
				const source = this.interpreter.sourceOf(hole)
				result.push(
					`arktype is passed a value holding ${
						standIn ? this.interpreter.labelOf(standIn)
						: source ?
							`\`${source[1].snippetOf(source[0])}\` (${source[1].positionOf(source[0])})`
						:	`\`${String(hole)}\``
					}`
				)
			}
			// what arktype printed a placeholder for reached it by a route the build didn't record
			if (
				!site.holes.length &&
				!holes.size &&
				site.parseError.message.search(holeNamePattern) !== -1
			) {
				result.push(
					"its ParseError prints the name of a function the build knows only by a placeholder"
				)
			}
		}
		for (const input of site.parseError ? site.inputs : []) {
			result.push(
				`\`${[input.name, ...input.path.map(String)].join(".")}\` is ${
					input.kind === "import" ?
						`imported from ${this.graph.pathOf(input.file!)}`
					: input.kind === "local" ? "declared in a function around the site"
					: "a define"
				}`
			)
		}
		for (const helper of site.parseError && this.checkHelpers ?
			site.helpers
		:	[]) {
			result.push(
				`it calls the static helper \`${helper.name}\` (${(this.graph.moduleOf(helper.file) as SourceModule).positionOf(helper)})`
			)
		}
		return result
	}

	// a second analysis would evaluate its sites again over values the first created and arktype changed, as a scope its first export resolved
	private analysisOf(module: SourceModule): ModuleAnalysis {
		const problem =
			this.configuration?.problem &&
			[this.configuration.problem, ...this.configuration.reasons].join("\n")
		if (problem !== this.analyzedProblem) {
			this.analysesByModule = new WeakMap()
			this.analyzedProblem = problem
		}
		let analysis = this.analysesByModule.get(module)
		if (!analysis)
			this.analysesByModule.set(module, (analysis = this._analyze(module)))
		return {
			sites: analysis.sites.map(site => ({ ...site })),
			diagnostics: [...analysis.diagnostics],
			dependencies: analysis.dependencies
		}
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
		const candidates = this.candidatesOf(module)
		const settled: SiteCandidate[] = []
		const settledRangesByFn = new Map<FunctionNode | undefined, Set<string>>()
		const sites: Site[] = []
		const candidatesBySite = new Map<Site, SiteCandidate>()
		const sameWithinRun = new Set<Site>()
		const diagnostics: Diagnostic[] = []
		const helperSites: Node[] = []
		this.helperSitesByModule.set(module, helperSites)
		const configureStart = this.configureStartOf(module)
		for (const candidate of candidates) {
			let settledRanges = settledRangesByFn.get(candidate.fn)
			if (!settledRanges)
				settledRangesByFn.set(candidate.fn, (settledRanges = new Set()))
			if (isWithin(candidate.state.node, settledRanges)) continue
			try {
				if (!this.settle(candidate)) continue
				// settling can move the candidate to a fallback inside it
				const node = candidate.state.node
				settled.push(candidate)
				settledRanges.add(rangeOf(node))
				if (isFolded(candidate, settled, this.interpreter)) continue
				if (candidate.helper) {
					if (readsBindingOf(candidate.helper, node, module)) continue
					helperSites.push(node)
				}
				const site = this.finalize(candidate, module)
				if (
					site.status === "rejected" &&
					isFoldable(candidate.state.value) &&
					!hasArkKind(candidate.state.value, "root")
				)
					this.refusedContainers.set(candidate.state.value, [node, module])
				if (
					this.mode === "standalone" &&
					this.checkRuns(site, candidate, module)
				)
					sameWithinRun.add(site)
				if (
					site.status !== "rejected" &&
					!candidate.fn &&
					!site.isKeywordRead &&
					site.start < configureStart
				) {
					const message = `${module.snippetOf(node)} is created while the config module loads, before configure() runs`
					diagnostics.push(
						this.diagnostic(
							module,
							node,
							"R3",
							this.rejectionSeverity,
							message,
							[]
						)
					)
					// cache mode leaves the site to arktype, which creates it as the program does
					if (this.mode === "standalone") {
						sites.push(refuse(site, [message]))
						continue
					}
				}
				const configuration = this.configuration
				// the build evaluated it without the configuration the program applies
				if (
					configuration?.problem &&
					this.mode === "standalone" &&
					site.status === "accepted"
				) {
					const message = `${module.snippetOf(node)} is created under a configuration the build can't apply`
					const refusal = [
						`${configuration.problem} (${this.graph.pathOf(this.config!)})`,
						...configuration.reasons
					]
					diagnostics.push(
						this.diagnostic(
							module,
							node,
							"R3",
							"error",
							message,
							refusal,
							configuration.hint
						)
					)
					sites.push(refuse(site, [message, ...refusal]))
					continue
				}
				sites.push(site)
				candidatesBySite.set(site, candidate)
			} catch (e) {
				const node = candidate.state.node
				// covering what it contains, as a settled site does
				settledRanges.add(rangeOf(node))
				const site = this.siteOf(candidate, module)
				sites.push(site)
				diagnostics.push(this.refuseThrown(module, node, site, e))
			}
		}
		if (this.mode === "standalone")
			this.checkShared(candidatesBySite, sameWithinRun, module)
		for (const [site, candidate] of candidatesBySite) {
			try {
				diagnostics.push(...this.diagnosticsOf(site, candidate, module))
			} catch (e) {
				diagnostics.push(
					this.refuseThrown(module, candidate.state.node, site, e)
				)
			}
		}
		diagnostics.push(...this.checkConfiguration(module))
		if (this.mode === "standalone") {
			diagnostics.push(
				...this.checkStandalone(module, candidates, settled),
				...this.checkIslands(module)
			)
		}
		return {
			sites: sites.sort((l, r) => l.start - r.start),
			diagnostics: diagnostics.sort((l, r) => l.start - r.start),
			dependencies: this.graph.dependenciesOf(module.id)
		}
	}

	// a module's sites are registered before anything in it is evaluated, so each runs once however it is first reached
	private readsOf(module: SourceModule): SiteRead[] {
		let reads = this.readsByModule.get(module)
		if (reads) return reads
		this.readsByModule.set(
			module,
			(reads = findSites(module, this.graph, this.mode === "standalone").filter(
				read => !this.callsConfigure(read.root, module)
			))
		)
		for (const { candidate } of reads) {
			if (candidate)
				this.interpreter.sitesByNode.set(candidate.state.node, candidate.state)
		}
		return reads
	}

	// e.g. `setup()` with `setup = () => configure(...)`, which is refused where it calls configure()
	private callsConfigure(node: Node, module: SourceModule): boolean {
		const helper =
			node.type === "CallExpression" && this.graph.helperOf(node.callee, module)
		return (
			!!helper &&
			this.configureCallsOf(helper[1]).some(call => contains(helper[0], call))
		)
	}

	private candidatesOf(module: SourceModule): SiteCandidate[] {
		let candidates = this.candidatesByModule.get(module)
		if (!candidates) {
			candidates = filterSites(this.readsOf(module), module, this.interpreter)
			this.candidatesByModule.set(module, candidates)
		}
		return candidates
	}

	private settle(candidate: SiteCandidate): boolean {
		return (candidate.isSite ??= this.settleOnce(candidate))
	}

	private settleOnce(candidate: SiteCandidate): boolean {
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
			// reading a member a standalone value has, like a Module's alias, makes no request, so it is not a site of its own
			if (
				candidate.kind === "reference" &&
				!state.requests.length &&
				!state.unavailableReads.length &&
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
		for (const candidate of this.candidatesOf(module)) {
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
		if (
			call.type !== "CallExpression" ||
			!state.requests.every(
				([node, module]) =>
					module === state.module &&
					call.arguments.some(arg => contains(arg, node))
			)
		)
			return
		const fallback = fallbacks[fallbacks.length - 1]
		if (fallback && !contains(call.callee, fallback)) return fallbacks.pop()
		// e.g. a helper calling a function the build can't interpret, which leaves sites in its arguments to settle themselves
		return candidate.kind === "helper" && rejection.isOpaque ?
				candidate.root
			:	undefined
	}

	private siteOf(candidate: SiteCandidate, module: SourceModule): Site {
		const { node } = candidate.state
		const [line, column] = module.lineAndColumnOf(node.start)
		return {
			kind: candidate.kind,
			start: node.start,
			end: node.end,
			line,
			column,
			status: "accepted",
			reasons: [],
			value: undefined,
			roots: [],
			parseError: undefined,
			arktypeArguments: candidate.state.arktypeArguments,
			parsedDefinitions: candidate.state.parsedDefinitions,
			holes: [],
			called: [],
			inputs: [],
			helpers: [],
			references: [],
			definition: undefined,
			isKeywordRead: false,
			isCreatedEachRun: false,
			isInterned: false,
			addressed: new Set(),
			defaultChecks: [],
			thunks: [],
			declarationStart: declarationStartOf(node),
			introspection: undefined,
			variants: undefined
		}
	}

	private finalize(
		candidate: SiteCandidate,
		module: SourceModule,
		isVariant = false
	): Site {
		const { state } = candidate
		const site = this.siteOf(candidate, module)
		site.isKeywordRead =
			hasArkKind(state.value, "module") &&
			this.isKeywordRead(state.node, module)
		if (this.mode === "standalone" && isInIsland(state.node, module)) {
			site.status = "island"
			return site
		}
		const dynamic = rejectionOf(state)
		if (dynamic) return rejectSite(site, dynamic)
		const checks = new Set<DefaultCheck>()
		// a thunk alias is a pair, and a check a triple
		for (const reached of state.reached) {
			if (reached.length === 2) site.thunks.push(reached)
			else checks.add(reached)
		}
		if (state.error instanceof ParseError) {
			// e.g. an island's or a declaration's, which the site's thrower would throw without checking what it depends on
			if (this.interpreter.parseErrorSites.get(state.error) !== state) {
				return rejectSite(
					site,
					new DynamicValue(
						module,
						state.node,
						`\`${module.snippetOf(state.node)}\` reads a definition that throws a ParseError`
					)
				)
			}
			site.parseError = state.error
		} else {
			site.value = state.value
			site.roots = state.roots
			// arktype checks a default where it first creates its node, so a site checks those it creates and those computing what a cache returns it did
			site.defaultChecks = [...checks]
			// e.g. a Generic aliased `define`, whose instantiation is a Type
			if (!isFoldable(state.value))
				site.definition = this.definitionOf(state.node, module)
			if (this.mode === "standalone") site.introspection = state.introspection
		}
		for (const [value, [read]] of state.readsByValue) {
			const refused = this.refusedContainers.get(value)
			if (!refused) continue
			return rejectSite(
				site,
				new DynamicValue(
					module,
					read,
					`\`${module.snippetOf(read)}\` is the ${kindNameOf(value)} at ${refused[1].positionOf(refused[0])}, which the build refuses`
				)
			)
		}
		for (const read of state.trace.reads) {
			const input = this.inputOf(read, candidate, module)
			if (input instanceof DynamicValue) return rejectSite(site, input)
			if (!site.inputs.some(existing => isCoveredBy(input, existing)))
				site.inputs.push(input)
		}
		// what a site reading an imported Type's introspection returns doesn't depend on the Type at runtime, which only a module mock replaces, unless the Type's creation checks what the program can change, which runs only if the site receives it
		const type = site.introspection?.type
		if (
			type &&
			!this.checkHelpers &&
			!this.interpreter.isCheckedAtCreation(type)
		) {
			site.inputs = site.inputs.filter(
				input =>
					input.kind !== "import" ||
					input.path.length > 0 ||
					input.value !== type
			)
		}
		for (const value of state.holes) {
			const isCalled = !site.parseError && !isHeld(value, this.interpreter)
			const hole = this.holeOf(value, candidate, module)
			if (!isCalled) {
				if (hole instanceof DynamicValue) return rejectSite(site, hole)
				site.holes.push(hole)
			} else if (!(hole instanceof DynamicValue) && hole.kind === "function")
				site.called.push(hole)
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
		for (const [read, reads] of state.readsByValue) {
			// a parameter's value is the hole arktype held in its place
			const value = isDynamic(read) ? this.parameterHoleOf(read, site) : read
			if (value === undefined) continue
			if (
				!hasArkKind(value, "root") &&
				![...site.holes, ...site.called].some(hole => hole.value === value) &&
				!(isFoldable(value) && keyOf(value)[1].length)
			)
				continue
			const isImportInput = site.inputs.some(
				input => input.kind === "import" && input.value === value
			)
			for (const node of reads) {
				const isForeign = isImportInput || this.isImported(node, module)
				const read = unwrapExpression(node)
				site.references.push({
					start: node.start,
					end: node.end,
					value,
					isForeign,
					isFixed:
						!isForeign &&
						read.type === "Identifier" &&
						this.isCreatedBy(
							module.scopes.referencesById.get(read)?.binding,
							value
						),
					isOwnHole: this.interpreter.isOwnHole(node, value, module)
				})
			}
		}
		site.references.sort((l, r) => l.start - r.start)
		if (this.mode === "standalone" && !isVariant && !site.parseError) {
			const variants = this.variantsOf(candidate, module, site)
			if (typeof variants === "string") return refuse(site, [variants])
			site.variants = variants
		}
		return site
	}

	// arktype tells a function of 1 parameter from others, so a site holding one a parameter holds is compiled for each count
	private variantsOf(
		candidate: SiteCandidate,
		module: SourceModule,
		site: Site
	): Variant[] | string | undefined {
		const parameters = [
			...new Set(
				site.holes.flatMap(hole =>
					hole.isParameter && hole.kind === "function" ?
						[this.interpreter.standIns.get(hole.value as object)!.parameter!]
					:	[]
				)
			)
		].filter(
			parameter => this.readsOfParameter(candidate.state, parameter).length
		)
		if (!parameters.length) return
		const variants: Variant[] = []
		for (const counts of countsOf(parameters.length)) {
			const arities = new Map(parameters.map((p, i) => [p, counts[i]]))
			const state =
				counts.every(count => count === 1) ?
					candidate.state
				:	this.interpreter.evaluateVariant(candidate.state.node, module, arities)
			const variantSite =
				state === candidate.state ?
					site
				:	this.finalize({ ...candidate, state }, module, true)
			// e.g. a default of 1 parameter, which arktype throws a ParseError for, so the factory throws for one
			if (variantSite.status !== "accepted" || variantSite.parseError) continue
			const held = new Map<Binding, number>()
			let isConsistent = true
			for (const hole of variantSite.holes) {
				const standIn = this.interpreter.standIns.get(hole.value as object)
				if (!standIn?.parameter || !arities.has(standIn.parameter)) continue
				// e.g. a Type the site reads holding the function it was created with, which this variant didn't create again
				if (standIn.arity !== arities.get(standIn.parameter))
					isConsistent = false
				held.set(standIn.parameter, standIn.arity!)
			}
			if (!isConsistent || held.size !== parameters.length) continue
			const [id] = keyOf(variantSite.value as Foldable)
			const existing = variants.find(
				variant => keyOf(variant.site.value as Foldable)[0] === id
			)
			if (existing) existing.counts.push(arities)
			else if (variants.length === this.maxVariants)
				return `the parameter counts of the functions ${listTexts(parameters.map(parameter => parameter.name))} hold need more than ${this.maxVariants} variants (maxVariants)`
			else variants.push({ site: variantSite, counts: [arities] })
		}
		return variants
	}

	private parameterHoleOf(read: DynamicValue, site: Site): unknown {
		const parameter = this.interpreter.parameterOf(read)
		return (
			parameter &&
			site.holes.find(
				hole =>
					hole.isParameter &&
					this.interpreter.standIns.get(hole.value as object)?.parameter ===
						parameter
			)?.value
		)
	}

	private readsOfParameter(state: SiteState, parameter: Binding): Node[] {
		const result: Node[] = []
		for (const [read, reads] of state.readsByValue) {
			if (isDynamic(read) && this.interpreter.parameterOf(read) === parameter)
				result.push(...reads)
		}
		return result.sort((l, r) => l.start - r.start)
	}

	// e.g. `$` in `const $ = scope(…)`, which holds what that site creates however the program runs
	private isCreatedBy(binding: Binding | undefined, value: unknown): boolean {
		const declaration = binding?.declaration
		return (
			!!binding &&
			binding.kind !== "import" &&
			!binding.writes.length &&
			declaration?.type === "VariableDeclarator" &&
			declaration.id === binding.id &&
			!!declaration.init &&
			this.interpreter.sitesByNode.get(unwrapExpression(declaration.init))
				?.value === value
		)
	}

	// a site in a function or a loop runs again, and creates anew each Scope, Module or Generic, and each Type arktype doesn't intern
	private checkRuns(
		site: Site,
		candidate: SiteCandidate,
		module: SourceModule
	): boolean {
		const node = candidate.state.node
		if (site.status !== "accepted" || !isFoldable(site.value)) return false
		const isFactory = this.isFactory(site, module)
		const regions = repeatedRegionsOf(node)
		if (!isFactory && !regions.length) return false
		// outermost first, since a callback reads the same Scope each time it runs when the function calling it creates the Scope
		const outer = this.interpreter.evaluateAgain(
			node,
			module,
			regions[regions.length - 1] ?? node
		)
		if (outer.value === site.value) {
			site.isInterned = isFactory
			return false
		}
		if (!regions.length) return false
		const again =
			regions.length === 1 ?
				outer
			:	this.interpreter.evaluateAgain(node, module, regions[0])
		// neither a getter nor a factory is the same within one run but new across runs
		if (again.value === site.value) return true
		const created = arkObjectsIn(again.value)
		const kept = [...arkObjectsIn(site.value)].filter(value =>
			created.has(value)
		)
		const addressed = kept.filter(isAddressed)
		// e.g. a Module whose Types are the same each run, which a factory creating it anew reads from their addresses
		if (
			again.error === undefined ? addressed.length === kept.length : isFactory
		) {
			site.isCreatedEachRun = true
			for (const value of addressed) site.addressed.add(value)
			return false
		}
		const snippet = module.snippetOf(node)
		rejectSite(
			site,
			new DynamicValue(
				module,
				node,
				again.error === undefined ?
					`\`${snippet}\` creates a new ${kindNameOf(site.value)} each time it runs, though a ${kindNameOf(kept.find(value => !isAddressed(value)))} it holds is the same each time`
				:	`\`${snippet}\` runs more than once, and the build can't evaluate it again`
			)
		)
		return false
	}

	// each site arktype recreates is its own factory, so none can share what it creates with another, as two exports of one Scope in a function do
	private checkShared(
		candidatesBySite: Map<Site, SiteCandidate>,
		sameWithinRun: Set<Site>,
		module: SourceModule
	): void {
		const holdersByValue = new Map<unknown, Site>()
		const sharedBySite = new Map<Site, [value: unknown, holder: Site][]>()
		const share = (site: Site, value: unknown, holder: Site) => {
			const shared = sharedBySite.get(site)
			if (shared) shared.push([value, holder])
			else sharedBySite.set(site, [[value, holder]])
		}
		const sites = [...candidatesBySite.keys()]
		for (const site of sites) {
			// a site inside another, like one in a Scope's thunk, is part of it
			if (
				sites.some(
					outer =>
						outer !== site && outer.start <= site.start && site.end <= outer.end
				)
			)
				continue
			if (sameWithinRun.has(site)) {
				const node = candidatesBySite.get(site)!.state.node
				rejectSite(
					site,
					new DynamicValue(
						module,
						node,
						`\`${module.snippetOf(node)}\` is the same each time its innermost function or loop runs, but new each time an enclosing one runs`
					)
				)
			}
			let values: Set<unknown>
			try {
				values = arkObjectsIn(site.value)
			} catch (e) {
				refuse(site, reasonsOf(e))
				continue
			}
			for (const value of values) {
				const holder = holdersByValue.get(value)
				if (!holder) holdersByValue.set(value, site)
				else {
					share(site, value, holder)
					share(holder, value, site)
				}
			}
		}
		for (const [site, shared] of sharedBySite) {
			for (const [value, holder] of shared) {
				if (!site.isCreatedEachRun && !holder.isCreatedEachRun) continue
				// e.g. a keyword's Type, which each factory reads from where every artifact holds it
				if (isAddressed(value)) {
					site.addressed.add(value)
					continue
				}
				if (!site.isCreatedEachRun) continue
				const node = candidatesBySite.get(site)!.state.node
				rejectSite(
					site,
					new DynamicValue(
						module,
						node,
						`\`${module.snippetOf(node)}\` creates a new ${kindNameOf(site.value)} each time it runs, sharing a ${kindNameOf(value)} with the site at ${module.positionOf(holder)}`
					)
				)
				break
			}
		}
	}

	private isKeywordRead(node: Node, module: SourceModule): boolean {
		let first: MemberExpression | undefined
		let second: MemberExpression | undefined
		node = unwrapExpression(node)
		while (node.type === "MemberExpression") {
			second = first
			first = node
			node = unwrapExpression(node.object)
		}
		const reference = module.scopes.referencesById.get(node)
		const [name, read] =
			(reference && this.graph.arkExportOf(reference, module)) ?? []
		// a namespace import's first member names the export
		const next = read === node ? first : second
		return (
			name === "keywords" ||
			(name === "type" && !!next && memberNameOf(next) === "keywords")
		)
	}

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
				isArk(this.graph.kindOf(callee.object, module))
			:	!!reference &&
				this.graph.arkExportOf(reference, module)?.[0] === "define"
		if (!isDefine || definition.type === "SpreadElement") return
		let readsArk = false
		walk(definition, child => {
			const binding =
				child.type === "Identifier" ?
					module.scopes.referencesById.get(child)?.binding
				:	undefined
			readsArk ||=
				!!binding &&
				this.graph.definesArk({
					kind: "binding",
					module,
					binding,
					name: binding.name
				})
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
			(standIn?.dynamic && readsByValue.get(standIn.dynamic)?.[0]) ??
			(standIn?.parameter &&
				this.readsOfParameter(candidate.state, standIn.parameter)[0])
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
		const parameterKind =
			standIn?.parameter && !standIn.isDefinition ?
				parameterKindOf(value, candidate.state.value)
			:	undefined
		if (standIn?.kind === "opaque" && !standIn.isDefinition && !parameterKind) {
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
			kind: parameterKind ?? standIn?.kind ?? "symbol",
			arity: standIn?.arity,
			description: standIn ? undefined : (value as symbol).description,
			isCalledAtDefinition: !!(
				standIn?.isCalled || standIn?.isCalledIndirectly
			),
			isDefinition: !!standIn?.isDefinition,
			isParameter: !!parameterKind
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
		if (
			site.parseError &&
			!(
				this.mode === "standalone" &&
				this.unsupportedReasonsOf(site, module).length
			)
		) {
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

	// parsed, unlike localClosureOf, so it holds every module the interpreter can follow
	private importClosureOf(id: string): string[] {
		return this.localClosureOf(id, reached =>
			this.importsOf(reached).map(([target]) => target)
		)
	}

	private importsOf(id: string): [target: string, isErased: boolean][] {
		const module = this.graph.moduleOf(id)
		return module instanceof SourceModule ? this.importsIn(module) : []
	}

	private importsIn(
		module: SourceModule
	): [target: string, isErased: boolean][] {
		const result: [string, boolean][] = []
		for (const statement of module.program.body) {
			const specifier = "source" in statement && statement.source?.value
			if (!specifier || arkPackageSpecifier.test(specifier)) continue
			const target = this.graph.host.resolve(specifier, module.id)
			if (target && this.graph.isFollowed(target))
				result.push([target, isErased(statement, module)])
		}
		return result
	}

	private configureStartOf(module: SourceModule): number {
		const config =
			this.config === undefined ? undefined : this.graph.moduleOf(this.config)
		if (!(config instanceof SourceModule)) return -Infinity
		const call = this.configureCallsOf(config)[0]
		if (!call) return -Infinity
		if (config === module) return call.start
		this.loadedBeforeConfigure ??= this.loadedBefore(config.id)
		return this.loadedBeforeConfigure.includes(module.id) ? Infinity : -Infinity
	}

	// a module that imports this one back may run before or after it, as the program's entry decides
	private loadedBefore(id: string): string[] {
		const loadedImportsOf = (from: string) =>
			this.importsOf(from).flatMap(([target, isErased]) =>
				isErased ? [] : [target]
			)
		const result: string[] = []
		for (const target of loadedImportsOf(id)) {
			if (!this.importClosureOf(target).includes(id))
				result.push(...this.localClosureOf(target, loadedImportsOf))
		}
		return result
	}

	private checkConfiguration(module: SourceModule): Diagnostic[] {
		const result: Diagnostic[] = []
		const calls = this.configureCallsOf(module)
		for (let i = 0; i < calls.length; i++) {
			const misplaced =
				this.config === undefined ?
					"configure() is called, but the build has no `config` module"
				: this.config !== module.id ?
					`configure() is called outside the config module ${this.graph.pathOf(this.config)}`
				: i > 0 ? "configure() is called more than once"
				: undefined
			const { problem, reasons, hint } =
				misplaced ?
					{ problem: misplaced, reasons: [], hint: undefined }
				:	(this.configuration ??
					this.evaluateConfiguration(
						calls[i],
						module,
						this.importClosureOf(module.id)
					))
			if (problem) {
				result.push(
					this.diagnostic(
						module,
						calls[i],
						"R3",
						this.rejectionSeverity,
						problem,
						reasons,
						hint
					)
				)
			}
		}
		return result
	}

	private evaluateConfiguration(
		call: CallExpression,
		module: SourceModule,
		modules: string[]
	): Pick<Configuration, "problem" | "reasons" | "hint"> & { value: unknown } {
		// the program may run a call elsewhere later or not at all, though the build applies it before any site
		if (!runsOnceAtLoad(call)) {
			return {
				value: undefined,
				problem:
					"configure() must be called once, unconditionally, at the config module's top level",
				reasons: []
			}
		}
		const argument = call.arguments[0]
		if (!argument) return { value: undefined, problem: undefined, reasons: [] }
		const value = this.interpreter.evaluateSite(
			createSiteState(argument, module)
		)
		const dynamic = rejectionOf(value)
		const result = dynamic ? chainOf(dynamic) : []
		const define = this.defineReadIn(modules)
		if (define) {
			result.push(
				`${define} is a build define the configuration reads, and nothing compares its runtime value with the build's`
			)
		}
		const objects = new Set<unknown>()
		// a node kind's meta is copied into what configure() returns, which holds the same writers and keys
		const refuse = (reason: string) =>
			result.includes(reason) || result.push(reason)
		const visit = (o: unknown) => {
			if (typeof o !== "object" || o === null || objects.has(o)) return
			objects.add(o)
			if (o instanceof ModuleNamespace) {
				result.push(
					"a namespace import used as a value is not in the static subset: import what it exports by name, or declare an object it exports in the call"
				)
			}
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
					refuse(
						`the description writer at ${standIn.module.positionOf(standIn.node)} must be a static helper, since arktype calls it while defining types`
					)
				}
				// the runtime prints every symbol the registry doesn't name alike, so it can't tell the program's from the build's
				if (typeof k === "symbol" && Symbol.keyFor(k) === undefined) {
					const [node, origin] = this.interpreter.sourcesBySymbol.get(k) ?? [
						call,
						module
					]
					refuse(
						`the symbol key ${String(k)} at ${origin.positionOf(node)} must be a string or one Symbol.for() returns, since the runtime can't match another with the build's`
					)
				}
				visit(v)
			}
		}
		if (!dynamic) {
			visit(value.value)
			// the program can write through what configure() returns too, which holds what it received
			visit(this.interpreter.configuredBy(call, value.value))
			result.push(...this.writeReasonsIn(objects, value.trace.reads, modules))
		}
		return {
			value: value.value,
			problem:
				result.length ? `${module.snippetOf(call)} is not static` : undefined,
			reasons: result,
			// each reason but an unknown value's or a define's says how to fix it
			hint: dynamic || define || !result.length ? undefined : ""
		}
	}

	// arktype reads a keyword's meta when the keyword is first created, so a write after configure() can reach the program but not the build
	private writeReasonsIn(
		objects: Set<unknown>,
		reads: Read[],
		ids: string[]
	): string[] {
		const result = new Set<string>()
		// read from what the argument read, so no other site's evaluation decides it
		for (const { root, value } of reads) {
			const [name, path] =
				root.kind === "export" ? [root.name, this.graph.pathOf(root.file)]
				: root.kind === "binding" && root.binding.exportNames.length ?
					[root.binding.name, root.module.path]
				:	[]
			if (path && objects.has(value)) {
				result.add(
					`\`${name}\` is exported from ${path}, so another module can write what the configuration holds: declare it in the call instead`
				)
			}
		}
		for (const id of ids) {
			const module = this.graph.moduleOf(id)
			if (!(module instanceof SourceModule)) continue
			for (const reference of module.scopes.references) {
				if (!reference.binding || reference.isWrite) continue
				const [write] =
					this.writeInto(reference.id, module, o => objects.has(o)) ?? []
				if (write) {
					result.add(
						`\`${module.snippetOf(write)}\` (${module.positionOf(write)}) writes what the configuration holds: declare the value in the call instead`
					)
				}
			}
		}
		return [...result]
	}

	// arktype may call any of the configuration's code, like a description writer, while defining a Type
	private defineReadIn(ids: string[]): string | undefined {
		const { define } = this.interpreter.opts
		if (!define) return
		for (const id of ids) {
			const module = this.graph.moduleOf(id)
			if (!(module instanceof SourceModule)) continue
			let result: string | undefined
			walk(module.program, node => {
				const name =
					node.type === "MemberExpression" ? envReadOf(node, module) : undefined
				if (name !== undefined && name in define)
					result ??= `\`${name}\` (${module.positionOf(node)})`
				return result === undefined
			})
			if (result) return result
		}
	}

	private checkStandalone(
		module: SourceModule,
		candidates: SiteCandidate[],
		settled: SiteCandidate[]
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
		const writes = new Set<Node>()
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
			writes.add(write)
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
			const id = reference.id
			if (target.kind !== "arktype" && target.kind !== "arktypeNamespace") {
				if (
					this.passesFoldedHelper(id, target, module) &&
					!isWithin(id, candidateRanges)
				) {
					result.push(
						this.diagnostic(
							module,
							id,
							"R4",
							"error",
							`\`${binding.name}\` is a helper the build folds at each call, so passing it runs its definition at runtime`,
							[]
						)
					)
				}
				continue
			}
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
				this.graph.leavesArk(id, module) ||
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
		const settledRanges = new Set(
			settled.map(candidate => rangeOf(candidate.state.node))
		)
		const unavailable: [node: Node, read: string | undefined, object: Node][] =
			[]
		walk(module.program, node => {
			if (
				settledRanges.has(rangeOf(node)) ||
				isInIsland(node, module) ||
				// e.g. `interface A extends B.C {}`, which only types
				(node.type.startsWith("TS") && !isTransparent(node)) ||
				(isFunctionNode(node) && this.isOnlyFolded(node, settledRanges, module))
			)
				return false
			const read =
				!(node.type === "MemberExpression" && isWriteTarget(node)) &&
				!writes.has(node) &&
				this.graph.unavailableReadOf(node, module)
			if (read && !this.isDeclaredInIsland(read[1], module))
				unavailable.push([node, ...read])
			return true
		})
		for (const [node, read, object] of unavailable) {
			// a chain is reported where it first reads one
			if (
				unavailable.some(
					([inner]) => inner !== node && contains(node, inner)
				) ||
				this.introspection.includes(read as never)
			)
				continue
			result.push(
				this.diagnostic(
					module,
					node,
					"R4",
					"error",
					read === undefined ?
						`${module.snippetOf(node)} reflects on a Type, whose properties a standalone validator doesn't share`
					:	`${module.snippetOf(node)} reads ${read}, which a standalone validator lacks`,
					[
						`\`${module.snippetOf(object)}\` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read`
					]
				)
			)
		}
		for (const statement of module.program.body) {
			if (
				statement.type !== "ImportDeclaration" ||
				arkPackageName.test(this.graph.packageNameOf(module.id) ?? "")
			)
				continue
			const source = statement.source.value
			const isLocale = localeSpecifier.test(source)
			if (!isLocale && !nodePackageSpecifier.test(source)) continue
			for (const specifier of statement.specifiers) {
				// e.g. `ArkErrors`, which the standalone runtime shares
				if (
					source === "@ark/schema" &&
					specifier.type === "ImportSpecifier" &&
					exportNameOf(specifier.imported) in runtimeExports
				)
					continue
				const binding = module.scopes.bindingsById.get(specifier.local)
				for (const reference of binding?.references ?? []) {
					if (isInIsland(reference.id, module)) continue
					result.push(
						this.diagnostic(
							module,
							reference.id,
							"R4",
							"error",
							`\`${binding!.name}\` is used outside a runtime island`,
							isLocale ?
								[
									`${source} writes arktype's errors in a locale, which needs the description writers of arktype's nodes, so a standalone validator writes its errors only in en`
								]
							:	[
									`${source} reads the nodes arktype creates, which a standalone build replaces with validators`
								],
							isLocale ? localeHint : nodePackageHint
						)
					)
				}
			}
		}
		return result
	}

	// e.g. `field` in `[5].map(field)`, whose module skips its body as it folds each call to it
	private passesFoldedHelper(
		id: Node,
		target: ImportTarget,
		module: SourceModule
	): boolean {
		if (
			(target.kind !== "binding" && target.kind !== "expression") ||
			(id.parent?.type === "CallExpression" && id.parent.callee === id) ||
			isPassiveReference(id, module)
		)
			return false
		const helper = this.graph.helperOf(id, module)
		return (
			!!helper && isFoldedHelper(...helper) && this.graph.definesArk(target)
		)
	}

	// e.g. `withId` when each `withId(A)` is a site, so its body never runs
	private isOnlyFolded(
		fn: FunctionNode,
		settledRanges: Set<string>,
		module: SourceModule
	): boolean {
		return (
			isFoldedHelper(fn, module) &&
			bindingOfFunction(fn, module)!.references.every(
				reference =>
					isWithin(reference.id, settledRanges) ||
					isPassiveReference(reference.id, module)
			)
		)
	}

	// e.g. `T` with `const T = type(...)` marked `// @ark-runtime`, which is arktype's own Type
	private isDeclaredInIsland(node: Node, module: SourceModule): boolean {
		node = normalize(node)
		const binding =
			node.type === "Identifier" ?
				module.scopes.referencesById.get(node)?.binding
			:	undefined
		return !!binding && isInIsland(binding.declaration, module)
	}

	// a write a reference starts, and the arktype value it writes to or through, e.g. to its `meta`
	private arkWriteOf(
		id: Node,
		module: SourceModule
	): [write: Node, value: Node, isDirect: boolean] | undefined {
		return this.writeInto(id, module, isArkObject)
	}

	private writeInto(
		id: Node,
		module: SourceModule,
		isWritten: (value: unknown) => boolean
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
					if (isWritten(state.value))
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
						!this.graph.leavesArk(child, origin)
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
				// e.g. `schemas.User` or `(schemas as typeof schemas).User`, with `schemas` a namespace import
				const [operand, member] = operatorOf(child)
				const exported =
					target.kind === "namespace" &&
					member?.type === "MemberExpression" &&
					member.object === operand &&
					this.graph.namespaceMemberOf(member, origin)
				if (exported) {
					read = member
					target = exported
				}
				if (target.kind !== "binding" && target.kind !== "expression")
					return true
				const declaration =
					target.kind === "binding" ? target.binding.declaration : target.node
				if (isInIsland(declaration, target.module)) return true
				if (
					isArk(
						target.kind === "binding" ?
							this.graph.bindingKindOf(target.binding, target.module)
						:	this.graph.kindOf(target.node, target.module)
					)
				) {
					// e.g. `User(data)` or `User.assert(data)`, which a standalone validator runs
					if (
						!(
							read.parent?.type === "CallExpression" &&
							read.parent.callee === read
						) &&
						!this.graph.leavesArk(child, origin)
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

export const writeUnknownIntrospectionMessage = <member extends string>(
	member: member
): writeUnknownIntrospectionMessage<member> =>
	`introspection lists ${member}, which isn't one of ${introspectionMembers.map(member => JSON.stringify(member)).join(", ")}`

export type writeUnknownIntrospectionMessage<member extends string> =
	`introspection lists ${member}, which isn't one of ${string}`

export const renderDiagnostic = (diagnostic: Diagnostic): string =>
	[
		`${diagnostic.file}:${diagnostic.line}:${diagnostic.column}  ${diagnostic.message}`,
		...diagnostic.reasons.map(reason => `  ${reason}`),
		...(diagnostic.hint ? [`  ${diagnostic.hint}`] : [])
	].join("\n")

interface Configuration {
	modules: string[]
	// a hash of the paths and text of the modules it's read from, if the config module calls configure()
	version: string | undefined
	// the same for their files, which a host can give otherwise, as a plugin ahead of arktype's transpiles one
	files: string | undefined
	// the values configure() receives, which the program's configure() checks
	fingerprint: string | undefined
	// why the configure() call can't be applied, reported where the config module is precompiled
	problem: string | undefined
	reasons: string[]
	// "" where the reasons say how to fix them, as the rule's hint would
	hint?: string | undefined
}

let threadConfiguration: Configuration | undefined

// arktype can't change its configuration once set
const holdsOtherConfiguration = (files: string | undefined): boolean =>
	threadConfiguration ?
		threadConfiguration.files !== files
	:	Object.keys($ark.config).length > 0 ||
		(files !== undefined && $ark.resolvedConfig !== undefined)

export const writeUnreadableConfigMessage = <path extends string>(
	path: path
): writeUnreadableConfigMessage<path> =>
	`the config module ${path} can't be read`

export type writeUnreadableConfigMessage<path extends string> =
	`the config module ${path} can't be read`

export const configuredThreadMessage =
	"arktype in this thread holds a configuration other than the build's, which it can't change once set, so the build must restart in a thread of its own"

export type configuredThreadMessage = typeof configuredThreadMessage

export const configurationConflictMessage =
	"configure() is given other values than arktype in this thread already applied"

export type configurationConflictMessage = typeof configurationConflictMessage

const configurationConflictReason =
	"a module the configuration reads was given anew, as when a plugin ahead of arktype's transforms it, and arktype can't change its configuration once set"

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

// arktype's locales, which write the errors of arktype's Types
const localeSpecifier = /^(?:arktype|@ark\/type)\/locales(?:\/|$)/

// packages that create or read arktype's nodes, which a standalone validator doesn't have
const nodePackageSpecifier =
	/^(?:(?:arksets|@ark\/(?:json-schema|fast-check)|(?:arktype|@ark\/(?:type|schema))\/internal)(?:\/|$)|@ark\/schema$)/

// arktype's own packages, which read their nodes by design wherever a workspace links their source
const arkPackageName = /^(?:arktype|arkregex|arksets|@ark\/.+)$/

// esbuild and tsc erase an import whose names are only used as types, which the scope analysis gives no reference, and a re-export of only types
const isErased = (statement: Node, module: SourceModule): boolean =>
	statement.type === "ImportDeclaration" ?
		statement.specifiers.length > 0 &&
		!statement.specifiers.some(
			specifier =>
				module.scopes.bindingsById.get(specifier.local)?.references.length
		)
	: statement.type === "ExportNamedDeclaration" ?
		statement.exportKind === "type" ||
		(statement.specifiers.length > 0 &&
			statement.specifiers.every(specifier => specifier.exportKind === "type"))
	:	statement.type === "ExportAllDeclaration" && statement.exportKind === "type"

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

export const specifierOf = (importer: string, file: string): string => {
	const path = relative(dirname(importer), file).split("\\").join("/")
	return path.startsWith(".") ? path : `./${path}`
}

// a mock can make two holes another module supplies one function, which the factory checks
const foreignHolesOf = (
	sourcesByHole: Map<unknown, Map<string, boolean>>
): unknown[] => {
	const foreignTexts = new Set<string>()
	const holes: unknown[] = []
	for (const [hole, sources] of sourcesByHole) {
		const foreign = [...sources].filter(([, isForeign]) => isForeign)
		if (!foreign.length) continue
		holes.push(hole)
		for (const [text] of foreign) foreignTexts.add(text)
	}
	// the holes one validator holds are distinct, since the build of its own site proved them so
	return holes.length > 1 && foreignTexts.size > 1 ? holes : []
}

const covers = (span: Span, site: Site) =>
	span.start <= site.start && site.end <= span.end

const isFoldable = (value: unknown): value is Foldable =>
	hasArkKind(value, "root") ||
	hasArkKind(value, "module") ||
	hasArkKind(value, "scope") ||
	hasArkKind(value, "generic") ||
	isTypedFn(value)

// the value whose holes a site's factory receives, which for a site reading a Type's introspection is the Type
const createdBy = (site: Site): Foldable | undefined =>
	isFoldable(site.value) ? site.value : site.introspection?.type

// e.g. a Module and each Type it holds, which a program can compare by identity
const arkObjectsIn = (value: unknown, result = new Set<unknown>()) => {
	if (!isFoldable(value) || result.has(value)) return result
	result.add(value)
	if (hasArkKind(value, "module"))
		for (const member of Object.values(value)) arkObjectsIn(member, result)
	if (isTypedFn(value)) {
		arkObjectsIn(value.params, result)
		arkObjectsIn(value.returns, result)
	}
	return result
}

// each combination of the counts arktype tells apart, 1 first, since a site evaluated as written assumes it
const countsOf = (length: number): number[][] =>
	length === 0 ?
		[[]]
	:	countsOf(length - 1).flatMap(counts =>
			[1, 0, 2].map(count => [...counts, count])
		)

const listTexts = (texts: readonly string[]) =>
	texts.length === 1 ?
		`\`${texts[0]}\``
	:	`${texts
			.slice(0, -1)
			.map(text => `\`${text}\``)
			.join(", ")} and \`${texts[texts.length - 1]}\``

// a parameter holds a class or function only where arktype holds it as one, rather than as a value it prints, like an example
const parameterKindOf = (
	hole: unknown,
	value: unknown
): "class" | "function" | undefined => {
	const nodes = [
		...arkObjectsIn(value),
		...(hasArkKind(value, "scope") ? Object.values(value.resolutions) : [])
	].flatMap(root =>
		hasArkKind(root, "root") ? [root, ...root.references] : []
	)
	if (nodes.some(node => node.hasKind("proto") && node.proto === hole))
		return "class"
	if (
		[...arkObjectsIn(value)].some(fn => isTypedFn(fn) && fn.raw === hole) ||
		nodes.some(
			node =>
				(node.hasKind("predicate") && node.inner.predicate === hole) ||
				(node.hasKind("morph") && node.inner.morphs.includes(hole as never)) ||
				(node.hasKind("optional") && node.inner.default === hole) ||
				(node.hasKind("sequence") &&
					!!node.inner.defaultables?.some(([, value]) => value === hole))
		)
	)
		return "function"
}

// e.g. a callback's body and the function calling it, innermost first
const repeatedRegionsOf = (node: Node): Node[] => {
	const result: Node[] = []
	for (
		let child = node, parent = node.parent;
		parent;
		child = parent, parent = parent.parent
	) {
		if (isFunctionNode(parent)) result.push(parent)
		else if (
			parent.type === "WhileStatement" ||
			parent.type === "DoWhileStatement" ||
			(parent.type === "ForStatement" && child !== parent.init) ||
			((parent.type === "ForInStatement" || parent.type === "ForOfStatement") &&
				child !== parent.right) ||
			(parent.type === "PropertyDefinition" &&
				!parent.static &&
				child === parent.value)
		)
			result.push(child)
	}
	return result
}

const exportSiteOf = (site: Site): ExportSite => ({
	definitions: site.parsedDefinitions,
	addressed: [...site.addressed]
})

// a ParseError is named by its message, so equal sites share a thrower, and anything else by its site, since a cyclic Type's hash holds registry counters
const nameOf = (site: Site) =>
	hashOf(site.parseError?.message ?? `${site.start}`)

// precompileStandalone refuses a whole artifact for one export it can't emit, so each is tried alone to refuse only those
const writeValidators = (
	exportsByName: Record<string, StandaloneExport>,
	opts: StandaloneOptions,
	refusalsByName: Record<string, string[]>,
	inline: boolean
): StandaloneModules => {
	// a host without virtual modules places the units an artifact shares in it
	const write = (names: string[]): StandaloneModules => {
		const exports = Object.fromEntries(
			names.map(name => [name, exportsByName[name]])
		)
		return inline ?
				{ code: precompileStandalone(exports, opts), modules: {} }
			:	precompileStandaloneModules(exports, opts)
	}
	try {
		return write(Object.keys(exportsByName))
	} catch {
		const writable = Object.keys(exportsByName).filter(name => {
			try {
				write([name])
				return true
			} catch (e) {
				refusalsByName[name] = reasonsOf(e)
				return false
			}
		})
		// every export is refused, as under a configured locale
		return writable.length ? write(writable) : { code: "", modules: {} }
	}
}

// a thrower fixes the configuration as arktype's failed definition does
const writeParseErrorThrower = (
	message: string,
	configured: ConfiguredModule | undefined
) =>
	`import * as runtime from "arktype/runtime"\n\nfunction throwParseError() {\n\t${writeFixConfig(configured)}\n\tthrow new runtime.ParseError(${JSON.stringify(message)})\n}\n\nexport { throwParseError as default }\n`

const writeConfigFixer = (configured: ConfiguredModule | undefined) =>
	`import * as runtime from "arktype/runtime"\n\nfunction fixConfig() {\n\t${writeFixConfig(configured)}\n}\n\nexport { fixConfig as default }\n`

// each module runs in a function at the top of its importer, passed its imports and the globals the importer shadows
const writeUnitTable = (units: Record<string, string>) =>
	`import { registerPrecompiledUnits } from "arktype/internal/precompiled.js"\n\nregisterPrecompiledUnits({ ${Object.entries(
		units
	)
		.map(([key, unit]) => `${JSON.stringify(key)}: ${unit}`)
		.join(", ")} })\n`

const inlineModules = (
	module: SourceModule,
	s: MagicString,
	prefix: string,
	modules: Record<string, string>,
	imports: Record<string, Record<string, string>>,
	insertImport: (text: string) => void
) => {
	const namespacesBySource: Record<string, string> = {}
	let declarations = ""
	let loaders = 0
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
		if (!names.length) {
			declarations += `;${call};\n`
			continue
		}
		// each local is a function declaration, which a site an import cycle reaches before the module's body runs can call
		const exports = `${prefix}$exports${loaders}`
		const load = `${prefix}$load${loaders++}`
		declarations += `var ${exports};\nfunction ${load}() {\nreturn (${exports} ??= ${call})\n}\n${names
			.map(
				name =>
					`function ${locals[name]}(...args) {\nreturn ${load}()[${JSON.stringify(name)}](...args)\n}\n`
			)
			.join("")}${load}();\n`
	}
	if (!declarations) return
	s.prependLeft(firstStatementOf(module.program).start, declarations)
	for (const source in namespacesBySource) {
		insertImport(
			`\nimport * as ${namespacesBySource[source]} from ${JSON.stringify(source)}`
		)
	}
}

const firstStatementOf = (program: Program) =>
	program.body.find(
		statement =>
			statement.type !== "ExpressionStatement" || !statement.directive
	)!

const islandValueMessage = (text: string) =>
	`\`${text}\` is a runtime island's Type, which a precompiled site can't receive`

const isInIsland = (node: Node, module: SourceModule) =>
	module.islands.some(island => contains(island, node))

// only a statement's first variable, so nothing the statement runs comes before its site
const declarationStartOf = (node: Node): number | undefined => {
	const declarator = node.parent
	if (declarator?.type !== "VariableDeclarator" || declarator.init !== node)
		return
	const declaration = declarator.parent
	if (
		declaration?.type !== "VariableDeclaration" ||
		declaration.declarations[0] !== declarator
	)
		return
	const statement =
		declaration.parent?.type === "ExportNamedDeclaration" ?
			declaration.parent
		:	declaration
	return statement.parent?.type === "Program" ? statement.start : undefined
}

const declaredBindingKinds = {
	const: 1,
	let: 1,
	var: 1,
	function: 1,
	class: 1
} satisfies Partial<Record<BindingKind, 1>>

const islandHint = `A runtime island runs on arktype, as must what it reads. Mark that definition // @ark-runtime too, or build with runtime: "arktype".`

const runtimeImportHint = `Read it only in a definition the build precompiles or one marked // @ark-runtime, or build with runtime: "arktype".`

const nodePackageHint = `Read arktype's nodes in a definition marked // @ark-runtime, or build with runtime: "arktype".`

const localeHint = `Write errors in a locale in a definition marked // @ark-runtime, or build with runtime: "arktype".`

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
		if (kept.length < statement.specifiers.length) {
			s.overwrite(
				statement.start,
				statement.source.end,
				writeImport(kept, module)
			)
		}
	}
}

// TypeScript drops an import whose bindings nothing reads, as when only folded sites read them, so the module it imports runs only through an import of its own
const keepImportedModules = (
	module: SourceModule,
	folded: Span[],
	kept: Span[],
	passed: string[],
	s: MagicString
) => {
	const isWithin = (id: Span, spans: Span[]) =>
		spans.some(span => span.start <= id.start && id.end <= span.end)
	for (const statement of module.program.body) {
		if (
			statement.type !== "ImportDeclaration" ||
			statement.source.value === "arktype" ||
			statement.importKind === "type"
		)
			continue
		const values = statement.specifiers.filter(
			specifier =>
				specifier.type !== "ImportSpecifier" || specifier.importKind !== "type"
		)
		const references = values.flatMap(
			specifier =>
				module.scopes.bindingsById.get(specifier.local)?.references ?? []
		)
		const isPassed = ({ local: { name } }: ImportDeclarationSpecifier) =>
			passed.some(
				input =>
					input === name ||
					input.startsWith(`${name}.`) ||
					input.startsWith(`${name}[`)
			)
		if (
			references.length &&
			references.every(
				({ id }) => isWithin(id, folded) && !isWithin(id, kept)
			) &&
			!values.some(isPassed)
		) {
			s.appendLeft(
				statement.end,
				`\nimport ${module.textOf({ start: statement.source.start, end: statement.end })}`
			)
		}
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

const refuse = (site: Site, reasons: string[]): Site => {
	site.status = "rejected"
	site.reasons = reasons
	site.value = undefined
	site.roots = []
	site.holes = []
	site.called = []
	site.inputs = []
	site.references = []
	return site
}

const rejectSite = (site: Site, dynamic: DynamicValue): Site =>
	refuse(site, chainOf(dynamic))

// e.g. `configure(...)`, `export const config = configure(...)` or `export default configure(...)`, which the program runs once as it loads
const runsOnceAtLoad = (call: Node): boolean => {
	let statement = operatorOf(call)[1]
	if (statement?.type === "UnaryExpression" && statement.operator === "void")
		statement = operatorOf(statement)[1]
	if (statement?.type === "VariableDeclarator") statement = statement.parent
	if (statement?.parent?.type === "ExportNamedDeclaration")
		statement = statement.parent
	return (
		statement?.parent?.type === "Program" &&
		(statement.type === "ExpressionStatement" ||
			statement.type === "VariableDeclaration" ||
			statement.type === "ExportNamedDeclaration" ||
			statement.type === "ExportDefaultDeclaration")
	)
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

// e.g. a configured writer calling a function a site holds in its meta, which only fails once the site is written
const reasonsOf = (e: unknown): string[] =>
	e instanceof DynamicValue ? chainOf(e)
	: e instanceof Error ? [e.message]
	: [String(e)]

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
