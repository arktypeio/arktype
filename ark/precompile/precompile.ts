import {
	$ark,
	describeBranches,
	hasArkKind,
	writePrecompiledUnits,
	type BaseRoot,
	type ErrorDetail,
	type MutatesInput
} from "@ark/schema"
import * as arkSchema from "@ark/schema"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { fingerprintOf } from "@ark/schema/runtime"
import {
	appendStringifiedKey,
	entriesOf,
	hashOf,
	hasDomain,
	includes,
	keysOf,
	objectKindOrDomainOf,
	ParseError,
	printable,
	registeredNameOf,
	throwError,
	throwParseError
} from "@ark/util"
import { ark, configure } from "arktype"
// for configured errors and mutatesInput
import "arktype/errors"
import "arktype/mutatesInput"
import type { HoleKind } from "arktype/internal/runtime.ts"
import * as arktypeRuntime from "arktype/internal/runtimeExports.ts"
import {
	appendPath,
	defaultMembers,
	holeNamePattern,
	introspectionMembers,
	isTypedFn,
	keyOf,
	kindNameOf,
	precompileStandalone,
	precompileStandaloneModules,
	traversalKeyOf,
	writeFixConfig,
	writeUnprecompilableMessage,
	type Checks,
	type Configured,
	type Optimization,
	type ValidatorMember,
	type ValidatorMembers,
	type DefaultCheck,
	type FactoryParam,
	type Foldable,
	type StandaloneExport,
	type StandaloneFactory,
	type StandaloneIntrospection,
	type StandaloneModules,
	type StandaloneOptions,
	type ScopeAlias,
	type UnitReaders
} from "arktype/internal/standalone.ts"
import MagicString, { type SourceMap } from "magic-string"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"
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
	arkPackageSpecifier,
	contains,
	declarationStartOf,
	importsValues,
	isArk,
	isArkObject,
	isFunctionNode,
	isOnlyType,
	isRuntimeExport,
	isTypeMemberRead,
	isTypeOnly,
	memberNameOf,
	ModuleGraph,
	progressOf,
	runtimeExports,
	staticBodyOf,
	stepsOf,
	type ArkExportName,
	type FunctionNode,
	type ImportTarget
} from "./graph.ts"
import {
	allowUnsafeHint,
	arkPackageName,
	dependencyOf,
	transformedId,
	type PrecompileHost
} from "./host.ts"
import {
	createSiteState,
	findDynamic,
	Interpreter,
	isDynamic,
	type InterpreterOptions,
	ModuleNamespace,
	type Read,
	runsBeforeBody,
	type SiteState
} from "./interpreter.ts"
import { SourceModule } from "./module.ts"
import {
	exportNameOf,
	isTransparent,
	isWriteTarget,
	unwrapChain,
	operatorOf,
	unwrapExpression,
	walk,
	type Binding,
	type BindingKind
} from "./scope.ts"
import type { ShadowContract } from "./shadow.ts"
import {
	filterSites,
	findSites,
	type SiteCandidate,
	type SiteRead
} from "./sites.ts"

export type PrecompileMode = "standalone" | "cache"

export interface PrecompileOptions extends InterpreterOptions {
	cwd?: string | undefined
	/** the module calling configure(), or false if none does */
	config?: string | false | undefined
	/** inline virtual modules, for hosts without them */
	inline?: boolean | undefined
	/** what a factory checks at creation */
	checks?: Checks | undefined
	/** members a validator has besides validating */
	members?: ValidatorMembers | undefined
	/** "first" stops at the first issue, "none" says only "is invalid" */
	errors?: ErrorDetail | undefined
	freeze?: boolean | undefined
	/** false creates validators as their modules load */
	lazy?: boolean | undefined
	mutatesInput?: MutatesInput | undefined
	optimize?: Optimization | undefined
	/** also create each site with arktype and throw where they diverge */
	shadow?: boolean | undefined
	/** warn rather than fail where the output may throw at runtime */
	allowUnsafe?: boolean | undefined
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
	// virtual module sources by specifier
	modules: Record<string, string>
	// readers of each unit module that could join another's scope, for a later build
	unitReads: UnitReaders
}

// an arktype export, or "reference" for the program's own Type
export type SiteKind = ArkExportName | "reference"

export interface Site {
	kind: SiteKind
	start: number
	end: number
	line: number
	column: number
	status: "accepted" | "rejected" | "island"
	reasons: string[]
	// what a factory reproduces
	value: unknown
	// the Types cache mode precompiles
	roots: BaseRoot[]
	// thrown by its factory at creation
	parseError: ParseError | undefined
	arktypeArguments: unknown[]
	holes: Hole[]
	// functions arktype calls while defining it, e.g. a literal's narrow
	called: Hole[]
	inputs: Input[]
	helpers: Helper[]
	references: Reference[]
	// the argument of a `define` call, evaluated in its place
	definition: Node | undefined
	// defaults its factory checks at creation
	defaultChecks: DefaultCheck[]
	// Scope aliases resolved while defining it
	aliases: ScopeAlias[]
	// the statement count and binding its module must have run
	progress: [at: number, name: string] | undefined
	// start of its declaring statement, which a bundler may drop
	declarationStart: number | undefined
	// e.g. `User` and "json" for `User.json`
	introspection:
		| Pick<StandaloneIntrospection, "member" | "type" | "thrown">
		| undefined
	// e.g. `User.extends` in `User.extends(T.in)`
	unavailableRead: string | undefined
}

export interface Hole {
	file: string
	// the expression evaluated in place at runtime
	start: number
	end: number
	value: unknown
	kind: "function" | "class" | "symbol" | "opaque"
	isCalledAtDefinition: boolean
}

export interface Reference {
	start: number
	end: number
	value: unknown
	// reads an unwritten binding a site initialized
	isFixed: boolean
	// a function or symbol its own module creates
	isOwnHole: boolean
	// imported from a module that only declares and has run
	isInert: boolean
}

type FactoryImport = [specifier: string, name: string, local: string]

interface SiteFactory {
	params: FactoryParam[]
	spans: Span[]
	// e.g. the second `f` in `{ a: narrow(f), b: narrow(f) }`
	repeats: [span: Span, spanIndex: number][]
	inputs: string[]
	// whose imports the call keeps
	bindings: Binding[]
	imports: FactoryImport[]
}

const emptyFactory = (): SiteFactory => ({
	params: [],
	spans: [],
	repeats: [],
	inputs: [],
	bindings: [],
	imports: []
})

const receive = (
	factory: SiteFactory,
	passedAs: PassedInput,
	param: FactoryParam
) => {
	factory.inputs.push(passedAs.expression)
	if (passedAs.imported) factory.imports.push(passedAs.imported)
	if (passedAs.binding) factory.bindings.push(passedAs.binding)
	factory.params.push(param)
}

interface PassedInput {
	expression: string
	label: string
	binding?: Binding
	// where no binding the site sees holds the input
	imported?: FactoryImport
}

export interface Input {
	kind: "import" | "local"
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

// a package arktype runs on, which must load once
type ArkPackage = "arktype" | "@ark/schema" | "@ark/util"

interface PackageCopy {
	version: string
	// the file it was first resolved from
	importer: string
}

interface CopiesReport {
	message: string
	reasons: string[]
	hint: string
}

export const precompileModule = (
	source: string,
	id: string,
	host: PrecompileHost,
	opts?: PrecompileOptions
): PrecompiledModule => new Precompiler(host, opts).precompile(source, id)

export const assertPrecompileOptions = (opts: PrecompileOptions = {}): void => {
	const members = opts.members ?? {}
	const cache = opts.runtime === "arktype"
	if (
		opts.members !== undefined &&
		objectKindOrDomainOf(opts.members) !== "object"
	) {
		throwError(
			writeOptionValueMessage("members", printable(opts.members), "an object")
		)
	}
	for (const member in members) {
		if (
			!includes(defaultMembers, member) &&
			!includes(introspectionMembers, member)
		)
			throwError(writeUnknownMemberMessage(printable(member)))
		const kept = members[member as ValidatorMember]
		if (kept !== undefined && typeof kept !== "boolean") {
			throwError(
				writeOptionValueMessage(
					`members[${JSON.stringify(member)}]`,
					printable(kept),
					"a boolean"
				)
			)
		}
	}
	if (
		opts.config !== undefined &&
		opts.config !== false &&
		(typeof opts.config !== "string" || !opts.config)
	) {
		throwError(
			writeOptionValueMessage(
				"config",
				printable(opts.config),
				"a module path or false"
			)
		)
	}
	for (const [option, values] of entriesOf(enumOptions)) {
		const value = opts[option]
		if (value !== undefined && !includes(values, value)) {
			throwError(
				writeOptionValueMessage(
					option,
					printable(value),
					describeBranches(values.map(v => JSON.stringify(v)))
				)
			)
		}
	}
	for (const option of [...booleanOptions, "allowUnsafe"] as const) {
		if (opts[option] !== undefined && typeof opts[option] !== "boolean") {
			throwError(
				writeOptionValueMessage(option, printable(opts[option]), "a boolean")
			)
		}
	}
	if (members["~standard.jsonSchema"] && members["~standard"] === false)
		throwError(standardJsonSchemaWithoutStandardMessage)
	const standaloneOption =
		cache && standaloneOptions.find(option => opts[option] !== undefined)
	if (standaloneOption)
		throwError(writeArktypeRuntimeOptionMessage(standaloneOption))
	if (cache && opts.config === false)
		throwError(writeArktypeRuntimeOptionMessage("config: false"))
}

export class Precompiler {
	graph: ModuleGraph
	interpreter: Interpreter
	config: string | undefined
	inline: boolean
	checkHelpers: boolean
	private mode: PrecompileMode
	// false where `config` is, so configure() fails
	private configures: boolean
	private shadow: boolean
	private allowUnsafe: boolean
	// e.g. `{"members":{"meta":false}}`, so shadow mode skips the meta
	private shadowContract: string | undefined
	private members: ValidatorMembers
	// e.g. traverse, from and toString where members.methods is false
	private lackedMembers: ReadonlySet<string>
	private errors: ErrorDetail | undefined
	private mutatesInput: MutatesInput | undefined
	private standalone: StandaloneOptions
	private configuration: Configuration | undefined
	private loadedBeforeConfigure: string[] | undefined
	private configureCallsByModule = new WeakMap<SourceModule, CallExpression[]>()
	private readsByModule = new WeakMap<SourceModule, SiteRead[]>()
	private candidatesByModule = new WeakMap<SourceModule, SiteCandidate[]>()
	private inertByModule = new WeakMap<SourceModule, boolean>()
	private namesArkById: Record<string, boolean> = Object.create(null)
	// each module's import cycle (SCC), numbered as found
	private componentsById: Record<string, number> = Object.create(null)
	private exportsArkByModule = new WeakMap<SourceModule, boolean>()
	private analysesByModule = new WeakMap<SourceModule, ModuleAnalysis>()
	// why the analyses' configuration can't be applied
	private analyzedProblem: string | undefined
	private bindingsByInput = new WeakMap<Input, Binding>()
	// e.g. a Scope configured by a parameter
	private refusedContainers = new Map<unknown, [Node, SourceModule]>()
	private packagesByEntry: Record<string, [root: string, version: string]> =
		Object.create(null)
	private copiesByPackage: Record<ArkPackage, Record<string, PackageCopy>> = {
		arktype: {},
		"@ark/schema": {},
		"@ark/util": {}
	}
	private reportedDependencies = new Set<string>()
	private intrinsicUnits: Record<string, string> | undefined
	// what earlier builds' unitReads recorded across the program
	unitReaders: UnitReaders | undefined

	constructor(host: PrecompileHost, opts: PrecompileOptions = {}) {
		assertPrecompileOptions(opts)
		this.graph = new ModuleGraph(host, opts.cwd)
		this.interpreter = new Interpreter(this.graph, opts, module =>
			this.readsOf(module)
		)
		this.mode = opts.runtime === "arktype" ? "cache" : "standalone"
		this.config = opts.config || undefined
		this.configures = opts.config !== false
		this.inline = !!opts.inline
		const checks = opts.checks ?? "types"
		this.checkHelpers = this.mode === "standalone" && checks === "helpers"
		this.shadow = this.mode === "standalone" && !!opts.shadow
		this.allowUnsafe = !!opts.allowUnsafe
		this.members = opts.members ?? {}
		this.errors = opts.errors
		this.mutatesInput = opts.mutatesInput
		this.standalone = {
			members: this.members,
			errors: this.errors,
			freeze: opts.freeze !== false,
			lazy: opts.lazy !== false,
			checks,
			mutatesInput: this.mutatesInput,
			optimize: opts.optimize ?? "speed"
		}
		this.lackedMembers = new Set(
			defaultMembers.flatMap(member =>
				this.members[member] !== false ? []
				: member === "methods" ? methodMembers
				: [member]
			)
		)
		const contract: ShadowContract = {}
		if (this.members.meta === false) contract.members = { meta: false }
		if (this.mutatesInput) contract.mutatesInput = this.mutatesInput
		if (this.errors && this.errors !== "all") contract.errors = this.errors
		this.shadowContract =
			Object.keys(contract).length ? JSON.stringify(contract) : undefined
	}

	isTransformed(id: string): boolean {
		return transformedId.test(id) && this.graph.isFollowed(id)
	}

	analyze(source: string, id: string): ModuleAnalysis {
		const module = this.add(id, source)
		// analyzed under the thread's configuration
		if (threadConfiguration) this.configuration ??= this.applyConfiguration()
		const analysis = this.analysisOf(module)
		analysis.diagnostics.push(...this.checkConfigOrder(module))
		return analysis
	}

	// a config module given anew is read again
	private add(id: string, source: string, mappings?: string): SourceModule {
		const module = this.graph.add(id, source, mappings)
		if (this.configuration?.modules.includes(id)) this.configuration = undefined
		return module
	}

	// whether a module may define a Type, judged from its imports
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
		for (const targetId of this.textImportsOf(source, id)) {
			if (!this.namesArk(targetId)) continue
			const target = this.graph.moduleOf(targetId)
			if (target instanceof SourceModule && this.exportsArk(target)) return true
		}
		return false
	}

	// imports the build follows, other than arktype's
	textImportsOf(source: string, id: string): string[] {
		const result: string[] = []
		for (const [, specifier] of source.matchAll(importSpecifier)) {
			if (arkPackageSpecifier.test(specifier)) continue
			const targetId = this.graph.host.resolve(specifier, id)
			if (targetId && this.graph.isFollowed(targetId)) result.push(targetId)
		}
		return result
	}

	textClosureOf(
		id: string,
		importsOf = (id: string) =>
			this.textImportsOf(this.graph.host.readFile(id) ?? "", id)
	): string[] {
		const result = [id]
		for (let i = 0; i < result.length; i++) {
			for (const target of importsOf(result[i]))
				if (!result.includes(target)) result.push(target)
		}
		return result
	}

	// read from text, so type-only imports count
	private isOnCycle(module: SourceModule): boolean {
		let isOnCycle = false
		this.textClosureOf(module.id, id => {
			const imports = this.textImportsOf(
				id === module.id ? module.source : (this.graph.host.readFile(id) ?? ""),
				id
			)
			isOnCycle ||= imports.includes(module.id)
			return imports
		})
		return isOnCycle
	}

	// a value import, which no transpiler drops
	private isKept(node: Node, module: SourceModule): node is ImportDeclaration {
		return (
			node.type === "ImportDeclaration" &&
			node.importKind !== "type" &&
			(!node.specifiers.length ||
				node.specifiers.some(
					specifier =>
						!!module.scopes.bindingsById.get(specifier.local)?.references.length
				))
		)
	}

	// whether a module's text reaches arktype through imports
	private namesArk(id: string): boolean {
		if (id in this.namesArkById) return this.namesArkById[id]
		const reached = [id]
		for (let i = 0; i < reached.length; i++) {
			const source = this.graph.host.readFile(reached[i])
			if (source === undefined) continue
			if (arktypeSpecifier.test(source)) return (this.namesArkById[id] = true)
			for (const targetId of this.textImportsOf(source, reached[i])) {
				if (this.namesArkById[targetId]) return (this.namesArkById[id] = true)
				if (!(targetId in this.namesArkById) && !reached.includes(targetId))
					reached.push(targetId)
			}
		}
		// nothing reached reaches arktype either
		for (const reachedId of reached) this.namesArkById[reachedId] = false
		return false
	}

	// assumed true while being read, for cycles
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

	// so a lint reports each file's copies
	forgetCopies(): void {
		for (const name of Object.keys(this.copiesByPackage) as ArkPackage[])
			this.copiesByPackage[name] = {}
	}

	// copies other than those reached before
	private readCopies(name: ArkPackage, importer: string): CopiesReport[] {
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
		const own = this.ownPackageOf(name)
		if (own[0] !== root && own[1] !== version && version !== "unknown") {
			reports.push({
				message: `${name} resolves to ${version}, but @ark/precompile runs on ${own[1]}`,
				reasons: [
					`${version} at ${this.graph.pathOf(root)}, reached from ${this.graph.pathOf(importer)}`,
					`${own[1]} at ${this.graph.pathOf(own[0])}, which @ark/precompile imports`
				],
				hint: versionHint
			})
		}
		// arktype's own dependencies may resolve to copies of their own
		if (name === "arktype")
			reports.push(...this.readCopies("@ark/schema", entry))
		if (name !== "@ark/util")
			reports.push(...this.readCopies("@ark/util", entry))
		return reports
	}

	// a dependency that isn't transformed is checked here
	readDependency(importer: string): { errors: string[]; warnings: string[] } {
		const [, dependency] = dependencyOf(importer) ?? []
		if (!dependency || this.graph.isFollowed(importer))
			return { errors: [], warnings: [] }
		const errors = this.readCopies("arktype", importer).map(report =>
			[
				report.message,
				...report.reasons.map(reason => `  ${reason}`),
				`  ${report.hint}`
			].join("\n")
		)
		const warnings: string[] = []
		if (
			this.mode === "standalone" &&
			!this.reportedDependencies.has(dependency)
		) {
			this.reportedDependencies.add(dependency)
			const message = writeStandaloneDependencyMessage(dependency)
			if (this.allowUnsafe) warnings.push(message)
			else errors.push(`${message} ${allowUnsafeHint}`)
		}
		return { errors, warnings }
	}

	private packageOf(
		name: string,
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

	// each package.json naming a version the output depends on, so a cache keyed
	// by what a module read drops it after an upgrade
	get ownManifests(): string[] {
		return [
			...(["arktype", "@ark/schema", "@ark/util"] as const).map(
				name => this.ownPackageOf(name)[0]
			),
			this.packageOf("@ark/precompile", fileURLToPath(import.meta.url))[0]
		].map(root => join(root, "package.json"))
	}

	// the copy the precompiler builds with, which its validators are written for
	private ownPackageOf(name: ArkPackage): [root: string, version: string] {
		return (ownPackagesByName[name] ??= this.packageOf(
			name,
			fileURLToPath(import.meta.resolve(name))
		))
	}

	private copiesReportOf(name: ArkPackage): CopiesReport {
		const copies = this.copiesByPackage[name]
		return {
			hint: copiesHint,
			message: `${name} resolves to more than one copy`,
			reasons: Object.keys(copies).map(
				root =>
					`${copies[root].version} at ${this.graph.pathOf(root)}, reached from ${this.graph.pathOf(copies[root].importer)}`
			)
		}
	}

	// `mappings` maps the source to its file's, as a transpiling host's map does
	precompile(source: string, id: string, mappings?: string): PrecompiledModule {
		const module = this.add(id, source, mappings)
		this.configuration ??= this.applyConfiguration()
		const { sites, diagnostics } = this.analysisOf(module)
		diagnostics.push(...this.checkConfigOrder(module))
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
						report.message,
						report.reasons,
						report.hint
					)
				)
			}
		}
		const s = new MagicString(source)
		let prefix = "$ark"
		while (source.includes(prefix)) prefix += "$"
		const modules: Record<string, string> = {}
		const unitReads: UnitReaders = {}
		// locals for virtual modules' exports, by specifier
		const imports: Record<string, Record<string, string>> = {}
		if (this.mode === "standalone") {
			const inputImports = this.foldSites(
				module,
				sites,
				s,
				prefix,
				modules,
				unitReads,
				imports,
				diagnostics
			)
			this.linkIslands(module, sites, s, prefix)
			this.markProgress(module, sites, s, prefix)
			// registered so factories can check against module mocks
			if (this.checkHelpers) {
				const registered = Object.entries(this.registeredHelpersOf(module))
				if (registered.length) {
					// leads with an identifier: stripping a type alias drops a ";"
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
			const roots = sites.flatMap(site => [
				...site.roots,
				...exportedRootsOf(site.value)
			])
			if (roots.length) {
				// arktype's builtin scopes, exported with the first Type
				const intrinsicUnits = (this.intrinsicUnits ??= writePrecompiledUnits(
					Object.values($ark.intrinsic).filter(value =>
						hasArkKind(value, "root")
					)
				))
				const intrinsicTable = writeUnitTable(intrinsicUnits)
				const intrinsicSpecifier = `~arktype/units/${hashOf(intrinsicTable)}`
				modules[intrinsicSpecifier] = intrinsicTable
				imports[intrinsicSpecifier] = {}
				// one module per unit, which Types share
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
		if (this.inline)
			inserted = inlineModules(module, s, prefix, modules, imports)
		else {
			for (const specifier in imports) {
				const locals = imports[specifier]
				if (!Object.keys(locals).length) inserted += `\nimport "${specifier}"`
				for (const name in locals) {
					inserted +=
						name === "default" ?
							`\nimport ${locals[name]} from "${specifier}"`
						:	`\nimport { ${name} as ${locals[name]} } from "${specifier}"`
				}
			}
		}
		// imported beside arktype, so they run where it does
		const arktypeImport = this.arktypeImportOf(module)
		if (inserted) {
			if (arktypeImport) {
				const lineEnd = source.indexOf("\n", arktypeImport.end)
				const rest = source.slice(
					arktypeImport.end,
					lineEnd === -1 ? undefined : lineEnd
				)
				// minified code can continue the import's line
				s.prependLeft(
					arktypeImport.end,
					rest.trim() ? `${inserted}\n` : inserted
				)
			} else s.append(inserted)
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
			modules: this.inline ? {} : modules,
			unitReads
		}
	}

	// e.g. a site in `f` reading `Base`, which a cycle can reach first
	private markProgress(
		module: SourceModule,
		sites: Site[],
		s: MagicString,
		prefix: string
	): void {
		const marked = new Set<number>()
		for (const site of sites) {
			if (site.status === "accepted" && site.progress)
				marked.add(site.progress[0])
		}
		if (!marked.size) return
		s.prependLeft(
			firstStatementOf(module.program).start,
			`var ${prefix}m = 0;\n`
		)
		const steps = [...stepsOf(module).keys()]
		const sitesByRange = rangesOf(sites)
		// shared across runs of steps that neither throw nor call out
		const runEnds: number[] = []
		for (let at = steps.length; at > 0; at--) {
			runEnds[at] =
				at < steps.length && this.isInertStep(steps[at], sitesByRange) ?
					runEnds[at + 1]
				:	at
		}
		for (const end of new Set([...marked].map(at => runEnds[at]))) {
			const text = `${prefix}m = ${end};`
			const step = steps[end - 1]
			const declaration = step.parent!
			if (
				step.type === "VariableDeclarator" &&
				declaration.type === "VariableDeclaration" &&
				declaration.declarations[declaration.declarations.length - 1] !== step
			) {
				// e.g. `const A = a(), B = b()`, split after A
				const comma = commaAfter(s.original, step.end)
				s.overwrite(
					comma,
					comma + 1,
					`;\n${text}\n${declaration.parent!.type === "ExportNamedDeclaration" ? "export " : ""}${declaration.kind} `
				)
			} else {
				let statement = step
				while (statement.parent !== module.program)
					statement = statement.parent!
				s.appendLeft(statement.end, `\n${text}`)
			}
		}
	}

	// so a fold throws before `Base` is set, as arktype would
	private receiveReadFirst(
		site: Site,
		binding: Binding,
		declaring: SourceModule,
		reader: string
	): string | undefined {
		// a test driver registers helpers once their module ran
		if (
			this.checkHelpers &&
			site.helpers.some(helper => helper.file === declaring.id)
		)
			return
		if (!binding.exportNames.length)
			return `\`${reader}\` can run before \`${binding.name}\` (${declaring.positionOf(binding.id)}) is set; export \`${binding.name}\` so the site can receive it`
		const input: Input = {
			kind: "import",
			file: declaring.id,
			name: binding.exportNames[0],
			path: [],
			value: this.interpreter.valueOfBinding(binding, declaring)
		}
		if (!site.inputs.some(existing => isCoveredBy(input, existing)))
			site.inputs.push(input)
	}

	// whether a cycle can call the module's sites first
	private isReachedEarly(module: SourceModule): boolean {
		const arktypeImport = this.arktypeImportOf(module)
		return module.program.body.some(statement => {
			if (arktypeImport && statement.start > arktypeImport.start) return false
			const specifier =
				statement.type === "ImportDeclaration" ?
					statement.importKind !== "type" && statement.source.value
				: (
					statement.type === "ExportAllDeclaration" ||
					statement.type === "ExportNamedDeclaration"
				) ?
					statement.source?.value
				:	undefined
			if (!specifier || arkPackageSpecifier.test(specifier)) return false
			const targetId = this.graph.host.resolve(specifier, module.id)
			return (
				!!targetId &&
				this.graph.isFollowed(targetId) &&
				this.componentOf(targetId) === this.componentOf(module.id)
			)
		})
	}

	// Tarjan's algorithm, iteratively
	private componentOf(root: string): number {
		const components = this.componentsById
		if (root in components) return components[root]
		// past every component found so far
		let found = Object.keys(components).length
		let visited = 0
		const indices: Record<string, number> = Object.create(null)
		const lows: Record<string, number> = Object.create(null)
		const stack: string[] = []
		const frames: [id: string, targets: string[]][] = []
		const visit = (id: string) => {
			indices[id] = lows[id] = visited++
			stack.push(id)
			frames.push([
				id,
				this.textImportsOf(this.graph.host.readFile(id) ?? "", id)
			])
		}
		visit(root)
		while (frames.length) {
			const [id, targets] = frames[frames.length - 1]
			const target = targets.pop()
			if (target !== undefined) {
				if (target in components) continue
				if (target in indices) lows[id] = Math.min(lows[id], indices[target])
				else visit(target)
				continue
			}
			frames.pop()
			if (frames.length) {
				const parent = frames[frames.length - 1][0]
				lows[parent] = Math.min(lows[parent], lows[id])
			}
			if (lows[id] !== indices[id]) continue
			let member: string
			do components[(member = stack.pop()!)] = found
			while (member !== id)
			found++
		}
		return components[root]
	}

	private definesArk(binding: Binding, module: SourceModule): boolean {
		return this.graph.definesArk({
			kind: "binding",
			module,
			binding,
			name: binding.name
		})
	}

	private arktypeImportOf(module: SourceModule): ImportDeclaration | undefined {
		return module.program.body.find(
			(statement): statement is ImportDeclaration =>
				statement.type === "ImportDeclaration" &&
				statement.importKind !== "type" &&
				(statement.source.value === "arktype" ||
					statement.specifiers.some(specifier => {
						const binding = module.scopes.bindingsById.get(specifier.local)
						return !!binding && this.definesArk(binding, module)
					}))
		)
	}

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
				// configure() would throw after the first Type
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
			// e.g. the config module transpiled by an earlier plugin
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
		// so a later configure() throws, as after the first Type
		void ark.internal.resolvedConfig
		return configuration
	}

	get conflictsWithThread(): boolean {
		return this.configuration?.problem === configurationConflictMessage
	}

	// a baked schema can't see the program change what its writer reads
	private bake<t>(write: () => t): t {
		let result: [{ value: t } | { thrown: unknown }, { reads: Read[] }]
		try {
			// baked only where what it read can't change
			result = this.interpreter.traceOf(() => {
				try {
					return { value: write() }
				} catch (e) {
					if (e instanceof DynamicValue) throw e
					return { thrown: e }
				}
			})
		} catch (e) {
			if (!(e instanceof DynamicValue)) throw e
			return throwParseError(
				`${writeUnprecompilableMessage("a JSON Schema whose configured writer the build can't evaluate")}: ${chainOf(e).join(": ")}`
			)
		}
		const [written, { reads }] = result
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
		if ("thrown" in written) throw written.thrown
		return written.value
	}

	private dependenciesOfArtifact(module: SourceModule): string[] {
		const modules = [
			// includes modules read for earlier imports
			...this.graph.dependenciesOf(module.id),
			...this.configuration!.modules
		]
		return [
			...new Set([
				...modules,
				...modules.flatMap(id => this.graph.host.tsconfigOf?.(id) ?? [])
			])
		]
	}

	// arktype takes one configuration per thread
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

	// a host may give other text than the file's
	private filesOf(id: string): string[] {
		const sourcesById: Record<string, string | undefined> = {}
		return this.textClosureOf(id, reached => {
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
		unitReads: UnitReaders,
		imports: Record<string, Record<string, string>>,
		diagnostics: Diagnostic[]
	): Record<string, Record<string, string>> {
		const inputImports: Record<string, Record<string, string>> = {}
		const namesBySite = new Map<Site, string>()
		const factoriesBySite = new Map<Site, SiteFactory>()
		const exportsByName: Record<string, StandaloneExport> = {}
		// sites arktype returned one Type for share a table
		const tablesByValue = new Map<unknown, number>()
		// e.g. a site in a Scope thunk, inside text a call replaces
		const replaced: [site: Site, spans: readonly Span[]][] = []
		const folded: Site[] = []
		for (const site of sites) {
			if (
				site.status !== "accepted" ||
				replaced.some(
					([outer, spans]) =>
						contains(outer, site) && !spans.some(span => contains(span, site))
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
			try {
				reasons = this.unsupportedReasonsOf(site, module)
				if (!reasons.length && !site.parseError)
					factory = this.factoryOf(site, module, reasons, prefix)
			} catch (e) {
				reasons = reasonsOf(e)
			}
			if (reasons.length) {
				diagnostics.push(this.refuseWritten(module, site, reasons))
				continue
			}
			// checked at each call, as a factory is
			if (site.introspection) factory ??= emptyFactory()
			else if (site.parseError) {
				namesBySite.set(site, nameOf(site))
				// checks progress before throwing, as a factory does
				if (site.progress) {
					factoriesBySite.set(site, {
						...emptyFactory(),
						inputs: [`${prefix}m`]
					})
				}
				replaced.push([site, []])
				continue
			}
			if (factory) {
				const name = `f${nameOf(site)}`
				factoriesBySite.set(site, factory)
				namesBySite.set(site, name)
				replaced.push([site, factory.spans])
				if (site.introspection) {
					exportsByName[name] = {
						...site.introspection,
						data: site.value,
						params: factory.params,
						defaultChecks: site.defaultChecks
					}
					continue
				}
				let table = tablesByValue.get(site.value)
				if (table === undefined)
					tablesByValue.set(site.value, (table = tablesByValue.size))
				exportsByName[name] = {
					type: site.value as never,
					params: factory.params,
					internedBy: table,
					defaultChecks: site.defaultChecks
				} satisfies StandaloneFactory
			} else {
				const name = `v${nameOf(site)}`
				namesBySite.set(site, name)
				exportsByName[name] = site.value as never
				replaced.push([site, []])
			}
		}
		const refusalsByName: Record<string, string[]> = {}
		const { fingerprint, problem } = this.configuration!
		const configured =
			!this.configures ? false
			: fingerprint === undefined || problem ? undefined
			: { fingerprint, path: module.path }
		const validators =
			Object.keys(exportsByName).length ?
				writeValidators(
					exportsByName,
					{
						...this.standalone,
						configured,
						bake: write => this.bake(write),
						hoisted: this.isReachedEarly(module),
						// shadow mode calls what it compares
						values: !this.shadow,
						readers: this.unitReaders
					},
					refusalsByName,
					this.inline
				)
			:	noValidators
		const checking = new Set(validators.checking)
		// modules writing the same code share it
		const specifier = `~arktype/${hashOf(validators.code)}`
		const imported = new Set<string>()
		// the source a site's call keeps, which still reads the bindings it holds
		const kept: Span[] = []
		const passed: Binding[] = []
		let fixedAt = Infinity
		for (const [site, name] of namesBySite) {
			if (refusalsByName[name]) {
				diagnostics.push(this.refuseWritten(module, site, refusalsByName[name]))
				continue
			}
			// a folded factory may call a function it shares, passing its index
			const [exported, index] = validators.folds[name] ?? [name]
			const local = prefix + exported
			if (!imported.has(exported)) {
				imported.add(exported)
				if (site.parseError) {
					const thrower = writeParseErrorThrower(
						site.parseError.message,
						configured,
						site.progress
					)
					const throwerSpecifier = `~arktype/${hashOf(thrower)}`
					modules[throwerSpecifier] = thrower
					imports[throwerSpecifier] = { default: local }
				} else {
					if (!(specifier in modules)) {
						modules[specifier] = validators.code
						Object.assign(modules, validators.modules)
						Object.assign(unitReads, validators.reads)
					}
					;(imports[specifier] ??= {})[exported] = local
				}
			}
			const factory = factoriesBySite.get(site)
			for (const [specifier, name, local] of factory?.imports ?? [])
				(inputImports[specifier] ??= {})[name] = local
			kept.push(...(factory?.spans ?? []))
			passed.push(...(factory?.bindings ?? []))
			// droppable with its variable unless it throws or checks
			const isPure =
				site.declarationStart !== undefined &&
				!site.parseError &&
				!site.introspection?.thrown &&
				!checking.has(name)
			if (isPure) fixedAt = Math.min(fixedAt, site.declarationStart!)
			const isValue = validators.values.includes(name)
			const call = `${isPure ? "/* @__PURE__ */ " : ""}${
				this.shadow ?
					this.shadowCallOf(site, module, factory, local, index, prefix)
				:	`${local}(${index ?? ""}`
			}`
			if (!factory?.spans.length && !factory?.inputs.length)
				s.overwrite(site.start, site.end, isValue ? local : `${call})`)
			else {
				// parameters stay in place, so they evaluate in order, even for a value
				const replace = (start: number, end: number, text: string) =>
					start === end ?
						s.appendLeft(start, text)
					:	s.overwrite(start, end, text)
				let start = site.start
				let separator =
					isValue ? "("
					: index === undefined && !this.shadow ? call
					: `${call}, `
				for (const span of factory.spans) {
					replace(start, span.start, separator)
					start = span.end
					separator = ", "
				}
				const inputs = factory.inputs.map(
					(input, i) => (i ? ", " : separator) + input
				)
				replace(
					start,
					site.end,
					`${inputs.join("")}${isValue ? `, ${local}` : ""})`
				)
			}
			folded.push(site)
		}
		// fixed at the first droppable site, as arktype does at its first Type
		if (fixedAt !== Infinity && configured !== false) {
			const fixer = writeConfigFixer(configured)
			const fixerSpecifier = `~arktype/${hashOf(fixer)}`
			modules[fixerSpecifier] = fixer
			imports[fixerSpecifier] = { default: `${prefix}fixConfig` }
			s.appendLeft(fixedAt, `${prefix}fixConfig()\n`)
		}
		if (this.shadow) {
			// first, so it loads beside whichever runtime is imported
			if (folded.length) {
				s.prependLeft(
					firstStatementOf(module.program).start,
					this.shadowContract ?
						`import { shadowUnder as ${prefix}shadowUnder } from "@ark/precompile/shadow"\nfunction ${prefix}shadow(...args) { return ${prefix}shadowUnder(${this.shadowContract}, ...args) }\n`
					:	`import { shadow as ${prefix}shadow } from "@ark/precompile/shadow"\n`
				)
			}
		} else {
			// linkIslands leaves configure()'s import to the runtime
			const linked = module.islands.filter(
				island =>
					!this.configureCallsOf(module).some(call => contains(island, call))
			)
			pruneArktypeImports(module, [...folded, ...linked], s)
		}
		keepImportedModules(module, folded, kept, passed, s)
		diagnostics.push(...this.checkRuntimeImports(module, sites))
		diagnostics.sort((l, r) => l.start - r.start)
		return inputImports
	}

	// arktype receives each span through a parameter, evaluated once
	private shadowCallOf(
		site: Site,
		module: SourceModule,
		factory: SiteFactory | undefined,
		local: string,
		index: number | undefined,
		prefix: string
	): string {
		const spans = factory?.spans ?? []
		const callbacks = (factory?.params ?? []).flatMap((param, i) =>
			param.kind === "function" ? [i] : []
		)
		const parameterSpans = [
			...spans.map((span, i): [Span, number] => [span, i]),
			...(factory?.repeats ?? []).filter(
				([repeat]) => !spans.some(span => contains(span, repeat))
			)
		].sort(([l], [r]) => l.start - r.start)
		let original = ""
		let start = site.start
		for (const [span, i] of parameterSpans) {
			original += `${module.textOf({ start, end: span.start })}${prefix}h${i}`
			start = span.end
		}
		original += module.textOf({ start, end: site.end })
		const params = spans.map((_, i) => `${prefix}h${i}`)
		const create = index === undefined ? local : `${local}.bind(null, ${index})`
		return `${prefix}shadow(${JSON.stringify(`${module.positionOf(site)}  ${module.snippetOf(site)}`)}, ${create}, (${params.join(", ")}) => (${original}), [${callbacks.join(", ")}]`
	}

	// an arktype import that arktype/runtime lacks fails to link
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
					?.references.find(({ id }) => !spans.some(span => contains(span, id)))
				if (!read) continue
				result.push(
					this.diagnostic(
						module,
						read.id,
						"R4",
						`\`${module.textOf(read.id)}\` is arktype's, which arktype/runtime doesn't export, so a standalone build can't load this module`,
						[],
						runtimeImportHint
					)
				)
			}
		}
		return result
	}

	// only another module's export can be a mock
	private mockableHelpersOf(site: Site, module: SourceModule): Helper[] {
		return this.checkHelpers ?
				site.helpers.filter(helper => helper.file !== module.id)
			:	[]
	}

	// throws for what the build can't key, refusing the site
	private assertKeyable(site: Site): void {
		if (site.status !== "accepted" || !isFoldable(site.value)) return
		keyOf(site.value)
		for (const [node] of site.defaultChecks) keyOf(node.in as BaseRoot)
	}

	// e.g. a narrow an intersection reduced to `never` dropped
	private droppedHolesOf(site: Site): Set<unknown> {
		const dropped = new Set<unknown>()
		// a Scope or Generic holds its definitions, not what they reduce to
		const value = site.introspection?.type ?? site.value
		if (!hasArkKind(value, "root") && !hasArkKind(value, "module"))
			return dropped
		const held = [
			...keyOf(value)[1],
			...site.defaultChecks.flatMap(
				([node]) => traversalKeyOf(node.in as BaseRoot)[1]
			)
		]
		// e.g. `pipe.try` holding its morph
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
		const created = createdBy(site)
		if (!created) return
		const [, holes] = keyOf(created)
		const dropped = this.droppedHolesOf(site)
		const helpers = this.mockableHelpersOf(site, module)
		if (
			!holes.length &&
			!site.inputs.length &&
			!site.defaultChecks.length &&
			!site.progress &&
			// one its module creates in place is always the same
			!site.references.some(
				reference => dropped.has(reference.value) && !reference.isOwnHole
			) &&
			!helpers.length
		)
			return
		// a default's check reads functions the value may drop
		const held = [
			...new Set([
				...holes,
				...site.defaultChecks.flatMap(
					([node]) => traversalKeyOf(node.in as BaseRoot)[1]
				)
			])
		]
		const factory = emptyFactory()
		const passed = this.receiveReferences(
			site,
			module,
			held,
			dropped,
			factory,
			reasons
		)
		this.receiveInputs(site, module, prefix, passed, factory, reasons)
		for (const helper of helpers)
			this.receiveHelper(helper, site, module, prefix, factory, reasons)
		if (site.progress) {
			factory.inputs.push(`${prefix}m`)
			factory.params.push({
				kind: "progress",
				label: site.progress[1],
				at: site.progress[0]
			})
		}
		return factory
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
		const read = new Set<unknown>()
		const passed = new Set<unknown>()
		// one value read through two texts is passed through each
		const spansByValue = new Map<unknown, Map<string, number>>()
		// read only to check, passed only if the program can change it
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
			// a dropped class decided which branch survived
			if (
				hole &&
				!held.includes(hole.value) &&
				hole.kind !== "class" &&
				!dropped.has(hole.value)
			) {
				// e.g. `pipe.try`'s morph, which arktype calls from a function of its own
				reasons.push(
					`arktype holds ${labelOf(module, reference)} in a function of its own, which a standalone validator can't create yet`
				)
				continue
			}
			const holes = hole ? [hole.value] : keyOf(reference.value as Foldable)[1]
			if (
				(site.introspection || (hole && dropped.has(hole.value))) &&
				!holes.some(value => calledByChecks.has(value)) &&
				(hole ? reference.isOwnHole : !this.mustRun(reference, module))
			) {
				for (const value of holes) unchecked.add(value)
				continue
			}
			// a Type without holes is written into the site
			if (holes.length && this.isIslandValue(reference.value, site)) {
				if (!passed.has(reference.value)) reasons.push(islandValueMessage(text))
				passed.add(reference.value)
				for (const value of holes) read.add(value)
				continue
			}
			for (const value of holes) read.add(value)
			if (!holes.length) continue
			const spanByText =
				spansByValue.get(reference.value) ?? new Map<string, number>()
			if (spanByText.has(text)) {
				factory.repeats.push([reference, spanByText.get(text)!])
				continue
			}
			if (
				factory.spans.length &&
				reference.start < factory.spans[factory.spans.length - 1].end
			) {
				reasons.push(
					`\`${text}\` is read inside another value its factory receives`
				)
			}
			passed.add(reference.value)
			spansByValue.set(
				reference.value,
				spanByText.set(text, factory.spans.length)
			)
			factory.spans.push(reference)
			factory.params.push(
				hole ?
					{
						kind: hole.kind as HoleKind,
						label: labelOf(module, reference),
						value: hole.value,
						isOwn: reference.isOwnHole
					}
				:	{ kind: "input", label: text, reads: [[[], reference.value]] }
			)
		}
		for (const value of held) {
			if (read.has(value) || unchecked.has(value)) continue
			// arktype's own value, which the emitter handles
			const source = this.interpreter.sourceOf(value)
			if (!source) continue
			const [node, origin] = source
			reasons.push(
				`arktype holds ${labelOf(origin, node)}, which the site ${holesByValue.has(value) ? "reads outside its own source" : "cannot pass to its factory"}`
			)
		}
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
				reasons.push(islandValueMessage(textOfInput(island)))
				continue
			}
			const passedAs = this.inputExpressionOf(reads[0], site, module, prefix)
			if (typeof passedAs === "string") {
				reasons.push(passedAs)
				continue
			}
			receive(factory, passedAs, {
				kind: "input",
				label: passedAs.label,
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
		receive(factory, passedAs, {
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
			if (this.standInOf(value)?.kind === "function")
				result[name] = entry.binding.name
		}
		return result
	}

	private standInOf(value: unknown) {
		return hasDomain(value, "object") ?
				this.interpreter.standIns.get(value)
			:	undefined
	}

	// a hole the site's text lacks is named by its declaration
	private sourceNamed(
		message: string,
		site: Site,
		module: SourceModule
	): string {
		return message.replace(holeNamePattern, name => {
			const standIn = this.interpreter.standInsByName.get(name)
			if (!standIn) return name
			const reference = site.references.find(
				reference => this.standInOf(reference.value) === standIn
			)
			return reference ?
					module.snippetOf(reference)
				:	(this.interpreter.nameOf(standIn) ??
						standIn.module.snippetOf(standIn.node))
		})
	}

	// a factory can't receive a runtime island's Type
	private isIslandValue(value: unknown, site: Site): boolean {
		if (!hasArkKind(value, "root")) return false
		for (const state of this.interpreter.sitesByNode.values()) {
			if (state.value === value && isInIsland(state.node, state.module))
				return true
		}
		// another module's export is read where it's declared
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
	): PassedInput | string {
		const isVisible = (binding: Binding) =>
			![...module.scopes.bindingsById.values()].some(
				other =>
					other !== binding &&
					other.name === binding.name &&
					contains(other.scope.node, site) &&
					contains(binding.scope.node, other.scope.node)
			)
		if (input.kind === "local") {
			const binding = this.bindingsByInput.get(input)!
			return isVisible(binding) ?
					{ expression: binding.name, label: binding.name, binding }
				:	`\`${binding.name}\` (${module.positionOf(binding.id)}) is shadowed where the site is written, so its factory can't receive it`
		}
		let namespace: PassedInput | undefined
		for (const binding of module.scopes.bindingsById.values()) {
			if (
				binding.kind !== "import" ||
				!isVisible(binding) ||
				!this.isKept(binding.declaration.parent!, module)
			)
				continue
			const target = this.graph.importOf(binding, module)
			if (target.kind === "namespace" && target.module.id === input.file) {
				const expression = appendStringifiedKey(binding.name, input.name)
				namespace = { expression, label: expression, binding }
			} else if (
				(target.kind === "binding" || target.kind === "expression") &&
				target.module.id === input.file &&
				(target.kind === "binding" ? target.name : "default") === input.name
			)
				return { expression: binding.name, label: binding.name, binding }
		}
		if (namespace) return namespace
		// e.g. `h` imported where a cycle can run this before h.ts
		if (
			!module.program.body.some(
				statement =>
					this.isKept(statement, module) &&
					this.graph.host.resolve(statement.source.value, module.id) ===
						input.file
			) &&
			this.isOnCycle(module)
		)
			return `importing \`${input.name}\` from ${this.graph.pathOf(input.file!)} here could run it earlier than the program does, as ${module.path} is on an import cycle`
		const specifier = specifierOf(module.id, input.file!)
		const local = `${prefix}i${hashOf(`${specifier} ${input.name}`)}`
		return {
			expression: local,
			label: input.name,
			imported: [specifier, input.name, local]
		}
	}

	private refusal(
		module: SourceModule,
		site: Site,
		rule: "R1" | "R2" | "unsupported",
		reasons = site.reasons
	): Diagnostic {
		return this.diagnostic(
			module,
			site,
			rule,
			`${module.snippetOf(site)} ${rule === "unsupported" ? "can't be precompiled yet" : "cannot be precompiled"}`,
			reasons.map(reason => this.sourceNamed(reason, site, module)),
			configuredHintOf(reasons)
		)
	}

	// so returned sites agree with diagnostics
	private refuseWritten(
		module: SourceModule,
		site: Site,
		reasons: string[]
	): Diagnostic {
		const diagnostic = this.refusal(module, site, "unsupported", reasons)
		refuse(site, reasons)
		return diagnostic
	}

	private refuseThrown(
		module: SourceModule,
		site: Site,
		e: unknown
	): Diagnostic {
		refuse(site, reasonsOf(e))
		return this.refusal(module, site, "R1")
	}

	// a factory compares by definition, which misses what calls return
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
				.map((input): [unknown, string] => [input.value, textOfInput(input)])
		]
		const result: string[] = []
		const seen = new Set<unknown>()
		for (const [value, text] of reads) {
			if (seen.has(value)) continue
			seen.add(value)
			if (!isFoldable(value)) continue
			const [, holes, refusal, thunks] = keyOf(value)
			if (refusal) {
				result.push(
					`\`${appendPath(text, refusal[0])}\` ${refusal[1]}, so a factory can't compare it`
				)
				continue
			}
			// e.g. `aAndB: () => $.type("a&b")`
			const resolved = thunks.find(([scope, alias]) =>
				site.aliases.some(
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
				const standIn = this.standInOf(hole)
				if (
					standIn &&
					(standIn.isCalled || standIn.isCalledIndirectly) &&
					!(
						hasArkKind(value, "root") && !this.resolvesCaller(value, hole, site)
					)
				) {
					result.push(
						`arktype calls ${this.interpreter.labelOf(standIn)} while defining what \`${hasArkKind(value, "root") ? appendPath(text, "$") : text}\` creates, so a factory can't compare it`
					)
					break
				}
			}
		}
		return result
	}

	// only a resolved Scope alias can hold a call's result unchecked
	private resolvesCaller(type: BaseRoot, hole: unknown, site: Site): boolean {
		if (traversalKeyOf(type)[1].includes(hole)) return false
		const holders = Object.keys(type.$.aliases).filter(alias =>
			this.interpreter.holesIn(type.$.aliases[alias]).has(hole)
		)
		return (
			!holders.length ||
			site.aliases.some(([$, alias]) => $ === type.$ && holders.includes(alias))
		)
	}

	// configured errors and mutatesInput must match the build's
	private configuredReasonsOf(site: Site): string[] {
		const value = createdBy(site)
		if (this.mode !== "standalone" || !value) return []
		const roots =
			hasArkKind(value, "scope") ? exportedRootsOf(value) : rootsIn(value)
		const builtErrors = this.errors ?? "all"
		const errors = roots
			.map(root => root.$.config.errors)
			.find(errors => errors !== undefined && errors !== builtErrors)
		const builtMutatesInput = this.mutatesInput ?? false
		const mutatesInput = roots
			.map(root => root.$.config.mutatesInput)
			.find(
				mutatesInput =>
					mutatesInput !== undefined && mutatesInput !== builtMutatesInput
			)
		const result: string[] = []
		if (errors) result.push(writeErrorsMismatchMessage(errors, builtErrors))
		if (mutatesInput !== undefined) {
			result.push(
				writeMutatesInputMismatchMessage(mutatesInput, builtMutatesInput)
			)
		}
		return result
	}

	private unsupportedReasonsOf(site: Site, module: SourceModule): string[] {
		const result =
			site.parseError || isFoldable(site.value) || site.introspection ?
				[]
			:	["its value is not a Type, Module, Scope, Generic or TypedFn"]
		if (result.length && site.unavailableRead) {
			result.push(
				`it reads \`${site.unavailableRead}\`, which a standalone validator lacks`
			)
		}
		// a thrower checks nothing, though the error can depend on any read
		for (const hole of site.holes) {
			const isReceived = !hole.isCalledAtDefinition && hole.kind !== "opaque"
			if (isReceived && !site.parseError) continue
			const holeModule = this.graph.moduleOf(hole.file) as SourceModule
			result.push(
				`arktype ${hole.isCalledAtDefinition ? "calls" : "holds"} ${labelOf(holeModule, hole)}`
			)
		}
		result.push(...this.incomparableReasonsOf(site, module))
		result.push(...this.configuredReasonsOf(site))
		if (site.parseError) {
			const holes = this.interpreter.holesIn(site.arktypeArguments)
			for (const hole of site.holes) holes.delete(hole.value)
			for (const hole of holes) {
				const standIn = this.standInOf(hole)
				const source = this.interpreter.sourceOf(hole)
				result.push(
					`arktype is passed a value holding ${
						standIn ? this.interpreter.labelOf(standIn)
						: source ? labelOf(source[1], source[0])
						: `\`${String(hole)}\``
					}`
				)
			}
			// a placeholder reached arktype by an unrecorded route
			if (
				!site.holes.length &&
				!holes.size &&
				site.parseError.message.search(holeNamePattern) !== -1
			) {
				result.push(
					"its ParseError prints the name of a function the build knows only by a placeholder"
				)
			}
			for (const input of site.inputs) {
				result.push(
					`\`${textOfInput(input)}\` is ${
						input.kind === "import" ?
							`imported from ${this.graph.pathOf(input.file!)}`
						:	"declared in a function around the site"
					}`
				)
			}
			for (const helper of this.checkHelpers ? site.helpers : []) {
				result.push(
					`it calls the static helper \`${helper.name}\` (${(this.graph.moduleOf(helper.file) as SourceModule).positionOf(helper)})`
				)
			}
		}
		return result
	}

	// reanalyzing would evaluate over values arktype already changed
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
						`${module.path} cannot be parsed: ${message}`
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
		const diagnostics: Diagnostic[] = []
		const configureStart = this.configureStartOf(module)
		// where the module first reports a configuration it can't apply
		let unappliedAt: string | undefined
		for (const candidate of candidates) {
			let settledRanges = settledRangesByFn.get(candidate.fn)
			if (!settledRanges)
				settledRangesByFn.set(candidate.fn, (settledRanges = new Set()))
			if (isWithin(candidate.state.node, settledRanges)) continue
			try {
				if (!(candidate.isSite ??= this.settle(candidate))) continue
				// settling can move the candidate to a fallback inside it
				const node = candidate.state.node
				settled.push(candidate)
				settledRanges.add(rangeOf(node))
				if (isFolded(candidate, settled, this.interpreter)) continue
				const site = this.finalize(candidate, module)
				if (
					site.status === "rejected" &&
					isFoldable(candidate.state.value) &&
					!hasArkKind(candidate.state.value, "root")
				)
					this.refusedContainers.set(candidate.state.value, [node, module])
				if (this.mode === "standalone") this.assertKeyable(site)
				if (
					site.status !== "rejected" &&
					!candidate.fn &&
					site.start < configureStart
				) {
					const message = `${module.snippetOf(node)} is created while the config module loads, before configure() runs`
					diagnostics.push(this.diagnostic(module, node, "R3", message))
					// cache mode leaves it to arktype, which creates it as the program does
					if (this.mode === "standalone") {
						sites.push(refuse(site, [message]))
						continue
					}
				}
				const configuration = this.configuration
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
					// the module's first such site says why, and the rest point to it
					diagnostics.push(
						this.diagnostic(
							module,
							node,
							"R3",
							message,
							unappliedAt ?
								[`for the reasons given at ${unappliedAt}`]
							:	refusal,
							unappliedAt ? false : configuration.hint
						)
					)
					unappliedAt ??= module.positionOf(node)
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
				diagnostics.push(this.refuseThrown(module, site, e))
			}
		}
		for (const [site, candidate] of candidatesBySite) {
			try {
				diagnostics.push(...this.diagnosticsOf(site, candidate, module))
			} catch (e) {
				diagnostics.push(this.refuseThrown(module, site, e))
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

	// registered first, so each site runs once however it's reached
	private readsOf(module: SourceModule): SiteRead[] {
		const cached = this.readsByModule.get(module)
		if (cached) return cached
		const reads = findSites(module, this.graph, this.mode === "standalone")
		this.readsByModule.set(module, reads)
		for (const { candidate } of reads) {
			if (candidate)
				this.interpreter.sitesByNode.set(candidate.state.node, candidate.state)
		}
		return reads
	}

	private candidatesOf(module: SourceModule): SiteCandidate[] {
		const cached = this.candidatesByModule.get(module)
		if (cached) return cached
		const candidates = filterSites(
			this.readsOf(module),
			module,
			this.interpreter
		)
		this.candidatesByModule.set(module, candidates)
		return candidates
	}

	private settle(candidate: SiteCandidate): boolean {
		const type = this.typeEndOf(candidate)
		if (type) {
			candidate.state = type
			candidate.fallbacks = candidate.fallbacks.filter(node =>
				contains(type.node, node)
			)
			this.interpreter.sitesByNode.set(type.node, type)
		}
		while (true) {
			const state = this.interpreter.evaluateSite(candidate.state)
			// reading a member a validator has makes no request
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

	// e.g. `$.type("b")` in `$.type("b").assert(data)`
	private typeEndOf({ ends, state }: SiteCandidate): SiteState | undefined {
		for (const end of ends) {
			const evaluated = this.interpreter.evaluateSite(
				this.interpreter.sitesByNode.get(end) ??
					createSiteState(end, state.module)
			)
			if (hasArkKind(evaluated.value, "root")) return evaluated
		}
	}

	// `"sideEffects": false` lets a bundler drop the declaring module
	private mustRun(reference: Reference, module: SourceModule): boolean {
		return (
			this.interpreter.isCheckedAtCreation(reference.value) ||
			(!reference.isInert &&
				this.interpreter
					.modulesDeclaring(reference.value)
					.some(declaring => declaring !== module))
		)
	}

	// e.g. a Type imported from a module that only declares Types
	private isInertRead(
		value: unknown,
		from: SourceModule | undefined,
		module: SourceModule,
		runsFirst: boolean
	): boolean {
		return (
			!!from &&
			!runsFirst &&
			this.interpreter
				.modulesDeclaring(value)
				.every(declaring => declaring === module || declaring === from) &&
			this.isInert(from)
		)
	}

	// imports no values and runs only creations that can't throw
	private isInert(module: SourceModule): boolean {
		const cached = this.inertByModule.get(module)
		if (cached !== undefined) return cached
		this.inertByModule.set(module, false)
		if (importsValues(module)) return false
		const sitesByRange = rangesOf(this.analysisOf(module).sites)
		const result = module.program.body.every(statement =>
			this.isInertStep(statement, sitesByRange)
		)
		this.inertByModule.set(module, result)
		return result
	}

	// e.g. `export const User = type(...)`
	private isInertStep(step: Node, sitesByRange: Map<string, Site>): boolean {
		const isInertValue = (node: Node | null | undefined): boolean => {
			if (!node) return true
			const value = unwrapExpression(node)
			return (
				value.type === "Literal" ||
				(value.type === "TemplateLiteral" && !value.expressions.length) ||
				isFunctionNode(value) ||
				this.isInertSite(sitesByRange.get(rangeOf(value)))
			)
		}
		if (step.type === "VariableDeclarator")
			return step.id.type === "Identifier" && isInertValue(step.init)
		const declaration =
			(
				step.type === "ExportNamedDeclaration" ||
				step.type === "ExportDefaultDeclaration"
			) ?
				step.declaration
			:	step
		if (!declaration) return true
		switch (declaration.type) {
			case "ImportDeclaration":
			case "ExportAllDeclaration":
			case "FunctionDeclaration":
			case "TSTypeAliasDeclaration":
			case "TSInterfaceDeclaration":
			case "TSDeclareFunction":
				return true
			case "ExpressionStatement":
				return !!declaration.directive
			case "VariableDeclaration":
				return declaration.declarations.every(declarator =>
					this.isInertStep(declarator, sitesByRange)
				)
			default:
				return (
					step.type === "ExportDefaultDeclaration" && isInertValue(declaration)
				)
		}
	}

	private isInertSite(site: Site | undefined): boolean {
		return (
			site?.status === "accepted" &&
			!site.parseError &&
			!site.progress &&
			!site.inputs.length &&
			!site.defaultChecks.length &&
			!this.interpreter.isCheckedAtCreation(site.value)
		)
	}

	// e.g. `a.ts` for `User` or `a.User` imported from "./a.ts"
	private importedFromOf(
		node: Node,
		module: SourceModule
	): SourceModule | undefined {
		node = unwrapExpression(node)
		while (node.type === "MemberExpression")
			node = unwrapExpression(node.object)
		const binding = module.scopes.referencesById.get(node)?.binding
		const declaration = binding?.kind === "import" && binding.declaration.parent
		if (declaration && declaration.type === "ImportDeclaration") {
			const target = this.graph.resolve(declaration.source.value, module)
			if (target instanceof SourceModule) return target
		}
	}

	// a rejected validation leaves its callee or argument as the site
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
			return
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
			holes: [],
			called: [],
			inputs: [],
			helpers: [],
			references: [],
			definition: undefined,
			defaultChecks: [],
			aliases: [],
			declarationStart: declarationStartOf(node),
			introspection: undefined,
			unavailableRead: undefined,
			progress: undefined
		}
	}

	private finalize(candidate: SiteCandidate, module: SourceModule): Site {
		const { state } = candidate
		const site = this.siteOf(candidate, module)
		if (this.mode === "standalone" && isInIsland(state.node, module)) {
			site.status = "island"
			return site
		}
		const checks = new Set<DefaultCheck>()
		// a thunk alias is a pair, and a check a triple
		for (const reached of state.reached) {
			if (reached.length === 2) site.aliases.push(reached)
			else checks.add(reached)
		}
		const dynamic = rejectionOf(state)
		if (dynamic) return refuseDynamic(site, dynamic)
		if (state.error instanceof ParseError) {
			// e.g. an island's, whose thrower couldn't check what it reads
			if (this.interpreter.parseErrorSites.get(state.error) !== state) {
				return refuseDynamic(
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
			// arktype checks a default where it first creates its node
			site.defaultChecks = [...checks]
			// e.g. a Generic aliased `define`, whose instantiation is a Type
			if (!isFoldable(state.value))
				site.definition = this.definitionOf(state.node, module)
			if (this.mode === "standalone") {
				site.introspection = state.introspection
				const read = state.unavailableReads.find(
					read => !isOnlyType(this.graph.kindOf(read, module))
				)
				if (read) site.unavailableRead = module.snippetOf(read)
			}
		}
		for (const [value, [read]] of state.readsByValue) {
			const refused = this.refusedContainers.get(value)
			if (!refused) continue
			return refuseDynamic(
				site,
				new DynamicValue(
					module,
					read,
					`\`${module.snippetOf(read)}\` is the ${kindNameOf(value)} at ${refused[1].positionOf(refused[0])}, which the build refuses`
				)
			)
		}
		for (const [binding, declaring] of state.trace.readFirst) {
			if (declaring !== module) continue
			const at = progressOf(binding, module)
			if (at > (site.progress?.[0] ?? 0)) site.progress = [at, binding.name]
		}
		const runsFirst = runsBeforeBody(state.node, module)
		const importerOf = (root: Read["root"]) =>
			root.kind === "export" && root.importer === module ?
				(this.graph.moduleOf(root.file) as SourceModule)
			:	undefined
		const introspected = site.introspection?.type
		for (const read of state.trace.reads) {
			// introspection needs the Type only where a mock can replace it
			if (
				read.value === introspected &&
				!read.path.length &&
				!this.checkHelpers &&
				!this.interpreter.isCheckedAtCreation(introspected) &&
				this.isInertRead(introspected, importerOf(read.root), module, runsFirst)
			)
				continue
			const input = this.inputOf(read, candidate, module)
			if (input instanceof DynamicValue) return refuseDynamic(site, input)
			if (!site.inputs.some(existing => isCoveredBy(input, existing)))
				site.inputs.push(input)
		}
		for (const value of state.holes) {
			const isCalled = !site.parseError && !isHeld(value, this.interpreter)
			const hole = this.holeOf(value, candidate, module)
			if (!isCalled) {
				if (hole instanceof DynamicValue) return refuseDynamic(site, hole)
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
			// a bundler can drop the helper's module, or a cycle run the site first
			if (
				!this.checkHelpers &&
				!this.isInertRead(value, importerOf(root), module, runsFirst)
			) {
				site.inputs.push({
					kind: "import",
					file: root.file,
					name: root.name,
					path: [],
					value
				})
			}
		}
		for (const [binding, declaring, reader] of state.trace.readFirst) {
			if (declaring === module) continue
			const unchecked = this.receiveReadFirst(site, binding, declaring, reader)
			if (unchecked) {
				return refuseDynamic(
					site,
					new DynamicValue(module, state.node, unchecked)
				)
			}
		}
		for (const [value, reads] of state.readsByValue) {
			if (
				isDynamic(value) ||
				(!hasArkKind(value, "root") &&
					![...site.holes, ...site.called].some(hole => hole.value === value) &&
					!(isFoldable(value) && keyOf(value)[1].length))
			)
				continue
			const isImportInput = site.inputs.some(
				input => input.kind === "import" && input.value === value
			)
			for (const node of reads) {
				const read = unwrapExpression(node)
				site.references.push({
					start: node.start,
					end: node.end,
					value,
					isFixed:
						!isImportInput &&
						read.type === "Identifier" &&
						this.isCreatedBy(
							module.scopes.referencesById.get(read)?.binding,
							value
						),
					isOwnHole: this.interpreter.isOwnHole(node, value, module),
					isInert: this.isInertRead(
						value,
						this.importedFromOf(node, module),
						module,
						runsFirst
					)
				})
			}
		}
		site.references.sort((l, r) => l.start - r.start)
		return site
	}

	// e.g. `$` in `const $ = scope(…)`
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

	// e.g. `$.define({ a: "string" })`, kept if it reads no arktype
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
			readsArk ||= !!binding && this.definesArk(binding, module)
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
				// a Scope parses an alias only once a definition resolves it
				(
					hasArkKind(candidate.state.value, "scope") &&
					this.interpreter.holesIn(candidate.state.value).has(value)
				) ?
					`the build can't tell how a Scope holds \`${origin.snippetOf(node)}\` before arktype resolves its aliases`
				:	`arktype holds \`${origin.snippetOf(node)}\` as a value rather than a definition, so it must be static`,
				standIn.dynamic
			)
		}
		return {
			file: origin.id,
			start: node.start,
			end: node.end,
			value,
			kind: standIn?.kind ?? "symbol",
			isCalledAtDefinition: !!(standIn?.isCalled || standIn?.isCalledIndirectly)
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
			return [
				this.refusal(
					module,
					site,
					rejection?.hasCode("unsupported") ? "unsupported"
					: rejection?.hasCode("callback") ? "R2"
					: "R1"
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
					`${module.snippetOf(node)} throws a ParseError`,
					[this.sourceNamed(site.parseError.message, site, module)],
					// arktype throws it too, so it fails with runtime: "arktype" as well
					this.allowUnsafe ?
						hintsByRule.parse
					:	`${hintsByRule.parse} ${allowUnsafeHint}`,
					this.allowUnsafe ? "warning" : "error"
				)
			)
		}
		if (this.mode !== "standalone") return result
		for (const value of candidate.state.holes) {
			const standIn = this.standInOf(value)
			if (!standIn?.isDefinition || !standIn.dynamic) continue
			const source = candidate.state.readsByValue.get(standIn.dynamic)?.[0]
			const [node, origin] =
				source ? [source, module] : [standIn.node, standIn.module]
			result.push(
				this.diagnostic(
					origin,
					node,
					"R4",
					`\`${origin.snippetOf(node)}\` is not static, so the site accepts it only as a Standard Schema that is not a Type`,
					chainOf(standIn.dynamic),
					undefined,
					"warning"
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

	private importClosureOf(id: string): string[] {
		return this.textClosureOf(id, reached =>
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
				result.push([target, isTypeOnly(statement)])
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

	// an import loading a module that creates a Type before the config module
	private checkConfigOrder(module: SourceModule): Diagnostic[] {
		const config = this.config
		if (
			config === undefined ||
			module.id === config ||
			!this.importClosureOf(module.id).includes(config)
		)
			return []
		const loaded = new Set([module.id])
		// each module an import loads, in the order the program runs them
		const load = (id: string, order: string[]) => {
			if (loaded.has(id)) return
			loaded.add(id)
			for (const [target, isErased] of this.importsOf(id))
				if (!isErased) load(target, order)
			order.push(id)
		}
		for (const statement of module.program.body) {
			const specifier = "source" in statement && statement.source?.value
			if (!specifier || isTypeOnly(statement)) continue
			const target = this.graph.host.resolve(specifier, module.id)
			if (!target || !this.graph.isFollowed(target)) continue
			const order: string[] = []
			load(target, order)
			const configured = order.indexOf(config)
			// what the config module loads itself is reported there
			const creating = order
				.slice(0, configured === -1 ? undefined : configured)
				.find(
					id =>
						!this.importClosureOf(config).includes(id) &&
						this.createsTypeAtLoad(id)
				)
			if (creating) {
				return [
					this.diagnostic(
						module,
						statement,
						"R3",
						`${module.snippetOf(statement)} loads ${this.graph.pathOf(creating)}, which creates a Type, before the config module ${this.graph.pathOf(config)} runs configure()`,
						[
							`unless the program loaded ${this.graph.pathOf(config)} earlier, creating the Type throws`
						],
						this.unsafeHintOf(
							`Import ${this.graph.pathOf(config)} first, before any module that creates a Type.`
						),
						this.unsafeSeverity
					)
				]
			}
			if (configured !== -1) return []
		}
		return []
	}

	private createsTypeAtLoad(id: string): boolean {
		const module = this.graph.moduleOf(id)
		return (
			module instanceof SourceModule &&
			this.isTransformed(id) &&
			this.importsArk(module.source, id) &&
			this.analysisOf(module).sites.some(
				site =>
					site.status === "accepted" && site.declarationStart !== undefined
			)
		)
	}

	// a module importing this one back may run before or after it
	private loadedBefore(id: string): string[] {
		const loadedImportsOf = (from: string) =>
			this.importsOf(from).flatMap(([target, isErased]) =>
				isErased ? [] : [target]
			)
		const result: string[] = []
		for (const target of loadedImportsOf(id)) {
			if (!this.importClosureOf(target).includes(id))
				result.push(...this.textClosureOf(target, loadedImportsOf))
		}
		return result
	}

	private checkConfiguration(module: SourceModule): Diagnostic[] {
		const result: Diagnostic[] = []
		const calls = this.configureCallsOf(module)
		for (let i = 0; i < calls.length; i++) {
			const misplaced =
				!this.configures ?
					"configure() is called, but the build's `config` is false"
				: this.config === undefined ?
					"configure() is called, but the build has no `config` module"
				: this.config !== module.id ?
					`configure() is called outside the config module ${this.graph.pathOf(this.config)}`
				: i > 0 ? "configure() is called more than once"
				: undefined
			const { problem, reasons, hint } =
				misplaced ?
					{
						problem: misplaced,
						reasons: [],
						hint:
							!this.configures ?
								"Remove the call, or name its module as the build's `config`."
							: this.config === undefined ?
								`Name this module as the build's config: { config: ${JSON.stringify(module.path)} }`
							:	undefined
					}
				:	(this.configuration ??
					this.evaluateConfiguration(
						calls[i],
						module,
						this.importClosureOf(module.id)
					))
			if (problem) {
				result.push(
					this.diagnostic(module, calls[i], "R3", problem, reasons, hint)
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
		// the build applies it before any site, so it must run once at load
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
		const objects = new Set<unknown>()
		const addReason = (reason: string) =>
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
				const standIn = this.standInOf(v)
				if (
					k === "description" &&
					standIn &&
					!(standIn.closure && staticBodyOf(standIn.closure.node))
				) {
					addReason(
						`the description writer at ${standIn.module.positionOf(standIn.node)} must be a static helper, since arktype calls it while defining types`
					)
				}
				// only registered symbols match between the build and the program
				if (typeof k === "symbol" && Symbol.keyFor(k) === undefined) {
					const [node, origin] = this.interpreter.sourcesBySymbol.get(k) ?? [
						call,
						module
					]
					addReason(
						`the symbol key ${String(k)} at ${origin.positionOf(node)} must be a string or one Symbol.for() returns, since the runtime can't match another with the build's`
					)
				}
				visit(v)
			}
		}
		if (!dynamic) {
			visit(value.value)
			// configure() returns a copy holding the same writers and keys
			visit(this.interpreter.configurationOf(call, value.value))
			result.push(...this.writeReasonsIn(objects, value.trace.reads, modules))
		}
		return {
			value: value.value,
			problem:
				result.length ? `${module.snippetOf(call)} is not static` : undefined,
			reasons: result,
			hint: dynamic || !result.length ? undefined : false
		}
	}

	// a write after configure() reaches the program but not the build
	private writeReasonsIn(
		objects: Set<unknown>,
		reads: Read[],
		ids: string[]
	): string[] {
		const result = new Set<string>()
		// from the argument's own reads, not other sites'
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
						`${labelOf(module, write)} writes what the configuration holds: declare the value in the call instead`
					)
				}
			}
		}
		return [...result]
	}

	// a Type member read off an import the build can't follow, which may be
	// a bundler's alias to a Type or a virtual module's value, once per import
	private unresolvedReadsOf(module: SourceModule): Diagnostic[] {
		const result: Diagnostic[] = []
		const warned = new Set<string>()
		if (
			!module.program.body.some(
				statement =>
					statement.type === "ImportDeclaration" &&
					this.isUnresolved(statement.source.value, module)
			)
		)
			return result
		walk(module.program, node => {
			if (
				isInIsland(node, module) ||
				(node.type.startsWith("TS") && !isTransparent(node))
			)
				return false
			if (node.type !== "MemberExpression" || isWriteTarget(node)) return true
			const read = memberNameOf(node)
			if (
				typeof read !== "string" ||
				!isTypeMemberRead(read, this.lackedMembers)
			)
				return true
			const specifier = this.unresolvedImportOf(node.object, module)
			if (specifier === undefined || warned.has(specifier)) return true
			warned.add(specifier)
			result.push(
				this.diagnostic(
					module,
					node,
					"R4",
					`${module.snippetOf(node)} reads ${read}, which a standalone validator lacks`,
					[
						`\`${module.snippetOf(node.object)}\` comes from \`${specifier}\`, which the build can't resolve, so it may be a Type, which the standalone runtime replaces with a validator`
					],
					this.unsafeHintOf(unresolvedHint),
					this.unsafeSeverity
				)
			)
			return true
		})
		return result
	}

	// the import a read's object comes from, if the build can't resolve it
	private unresolvedImportOf(
		object: Node,
		module: SourceModule
	): string | undefined {
		// e.g. `z` for `z.string().optional`
		let root = unwrapChain(object)
		while (root.type === "MemberExpression" || root.type === "CallExpression") {
			root = unwrapChain(
				root.type === "MemberExpression" ? root.object : root.callee
			)
		}
		const declaration =
			module.scopes.referencesById.get(root)?.binding?.declaration
		const specifier =
			declaration?.parent?.type === "ImportDeclaration" ?
				declaration.parent.source.value
			:	undefined
		return specifier !== undefined && this.isUnresolved(specifier, module) ?
				specifier
			:	undefined
	}

	private isUnresolved(specifier: string, module: SourceModule): boolean {
		return (
			!arkPackageSpecifier.test(specifier) &&
			this.graph.host.resolve(specifier, module.id) === undefined
		)
	}

	private checkStandalone(
		module: SourceModule,
		candidates: SiteCandidate[],
		settled: SiteCandidate[]
	): Diagnostic[] {
		const result: Diagnostic[] = []
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
				this.writeInto(reference.id, module, isArkObject) ?? []
			if (!write) continue
			written.add(reference.id)
			writes.add(write)
			result.push(
				this.diagnostic(
					module,
					write,
					"R4",
					`${module.snippetOf(write)} writes to ${isDirect ? "an arktype value" : "what an arktype value holds"}, which throws at runtime`,
					[
						`\`${module.snippetOf(value!)}\` is an arktype value, which the standalone runtime freezes with what it holds`
					],
					frozenHint
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
			if (target.kind !== "arktype" && target.kind !== "arktypeNamespace")
				continue
			const [name, read] = this.graph.arkExportOf(reference, module) ?? []
			const parent = read?.parent
			// a re-export is checked at each use instead
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
			result.push(
				this.diagnostic(
					module,
					id,
					"R4",
					`\`${binding.name}\` is used outside a precompiled site`
				)
			)
		}
		const settledValues = new Map(
			settled.map(candidate => [
				rangeOf(candidate.state.node),
				candidate.state.value
			])
		)
		const unavailable: [
			node: Node,
			read: string | undefined,
			object: Node,
			isUnsureRead?: true
		][] = []
		walk(module.program, node => {
			if (
				settledValues.has(rangeOf(node)) ||
				isInIsland(node, module) ||
				// e.g. `interface A extends B.C {}`, which only types
				(node.type.startsWith("TS") && !isTransparent(node))
			)
				return false
			const read =
				!(node.type === "MemberExpression" && isWriteTarget(node)) &&
				!writes.has(node) &&
				this.graph.unavailableReadOf(node, module, this.lackedMembers)
			if (read && !this.isDeclaredInIsland(read[1], module))
				unavailable.push([node, ...read])
			return true
		})
		// arktype's own packages are the runtime a standalone build ships
		const isArkPackage = arkPackageName.test(
			this.graph.packageNameOf(module.id) ?? ""
		)
		for (const [node, read, object, isUnsureRead] of unavailable) {
			const objectRange = rangeOf(unwrapChain(object))
			const settledValue = settledValues.get(objectRange)
			// a computed site is sure, so a member the options drop is read off a Type
			const isUnsure =
				isUnsureRead &&
				!(
					hasArkKind(settledValue, "root") &&
					read !== undefined &&
					this.lackedMembers.has(read)
				)
			// a chain is reported where it first reads one
			if (
				(isUnsure && (isArkPackage || settledValues.has(objectRange))) ||
				unavailable.some(
					([inner]) => inner !== node && contains(node, inner)
				) ||
				this.members[read as ValidatorMember] === true
			)
				continue
			const dropped =
				read === undefined || !this.lackedMembers.has(read) ? undefined
				: includes(methodMembers, read) ? "methods"
				: read
			result.push(
				this.diagnostic(
					module,
					node,
					"R4",
					read === undefined ?
						`${module.snippetOf(node)} reflects on a Type, whose properties a standalone validator doesn't share`
					:	`${module.snippetOf(node)} reads ${read}, which a standalone validator lacks`,
					[
						isUnsure ?
							`the build can't tell where \`${module.snippetOf(object)}\` comes from, so it may be a Type, which the standalone runtime replaces with a validator`
						: dropped ?
							`the build's \`members\` option sets ${JSON.stringify(dropped)} false, so no validator has ${read}`
						:	`\`${module.snippetOf(object)}\` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read`
					],
					isUnsure ?
						writeUnsureHint(
							dropped ?
								`leave members[${JSON.stringify(dropped)}] unset`
							:	'build with runtime: "arktype"'
						)
					: dropped ?
						`Leave members[${JSON.stringify(dropped)}] unset if the program reads it.`
					:	undefined
				)
			)
		}
		result.push(...this.unresolvedReadsOf(module))
		for (const statement of module.program.body) {
			if (statement.type !== "ImportDeclaration" || isArkPackage) continue
			const source = statement.source.value
			const isLocale = localeSpecifier.test(source)
			if (!isLocale && !nodePackageSpecifier.test(source)) continue
			for (const specifier of statement.specifiers) {
				const name =
					source === "@ark/schema" && specifier.type === "ImportSpecifier" ?
						exportNameOf(specifier.imported)
					:	undefined
				// e.g. `Traversal`, shared unless errors "none" copies the runtime
				if (
					name !== undefined &&
					this.errors !== "none" &&
					sharedSchemaExports.includes(name)
				)
					continue
				const binding = module.scopes.bindingsById.get(specifier.local)
				for (const reference of binding?.references ?? []) {
					if (isInIsland(reference.id, module)) continue
					result.push(
						name !== undefined && name in runtimeExports ?
							this.diagnostic(
								module,
								reference.id,
								"R4",
								`\`${binding!.name}\` is @ark/schema's, not the standalone runtime's`,
								[
									`what a standalone validator creates isn't an instance of @ark/schema's ${name}`
								],
								writeSchemaExportHint(name)
							)
						:	this.diagnostic(
								module,
								reference.id,
								"R4",
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

	// e.g. `T` declared in a `// @ark-runtime` definition
	private isDeclaredInIsland(node: Node, module: SourceModule): boolean {
		node = unwrapChain(node)
		const binding =
			node.type === "Identifier" ?
				module.scopes.referencesById.get(node)?.binding
			:	undefined
		return !!binding && isInIsland(binding.declaration, module)
	}

	// the write a reference starts and the value it writes to or through
	private writeInto(
		id: Node,
		module: SourceModule,
		isWritten: (value: unknown) => boolean
	): [write: Node, value: Node, isDirect: boolean] | undefined {
		// reads since the last call, any of which may be arktype's
		const objects: Node[] = [id]
		for (let node = id; ; node = node.parent!) {
			const parent = node.parent!
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

	// what a runtime island reaches must run on arktype too
	private checkIslands(module: SourceModule): Diagnostic[] {
		if (this.errors === "none") {
			return module.islands.map(island =>
				this.diagnostic(
					module,
					island,
					"R4",
					`a runtime island returns arktype's errors, which aren't instances of type.errors under errors: "none"`,
					[
						"a build whose errors say only that data is invalid gives its validators a runtime of their own"
					],
					`Precompile the definition, or build without errors: "none".`
				)
			)
		}
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
						!isRuntimeExport(name!) &&
						!this.graph.leavesArk(child, origin)
					) {
						result.push(
							this.diagnostic(
								origin,
								arkRead,
								"R4",
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
				// e.g. `schemas.User`, `schemas` a namespace import
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
					// e.g. `User(data)` or `User.assert(data)`, which a validator runs
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

	// islands read arktype's exports from arktype itself
	private linkIslands(
		module: SourceModule,
		sites: Site[],
		s: MagicString,
		prefix: string
	): void {
		const namespace = `${prefix}$island`
		const arktype = `${prefix}$arktype`
		let isLinked = false
		let isArktypeLinked = false
		for (const reference of module.scopes.references) {
			const id = reference.id
			if (
				!isInIsland(id, module) ||
				sites.some(site => site.status === "accepted" && contains(site, id))
			)
				continue
			const [name, read] = this.graph.arkExportOf(reference, module) ?? []
			// the runtime's configure() configures islands too
			if (this.configureCallsOf(module).some(call => call.callee === read))
				continue
			const node = read ?? id
			let linked: string
			if (read) {
				linked = `${namespace}.${name}`
				isLinked = true
			} else if (
				!reference.isWrite &&
				this.isArktypeNamespace(reference.binding, module)
			) {
				// e.g. `ark` in `export const lib = ark`
				linked = arktype
				isArktypeLinked = true
			} else continue
			const parent = node.parent
			s.overwrite(
				node.start,
				node.end,
				parent?.type === "Property" && parent.shorthand ?
					`${module.textOf(node)}: ${linked}`
				:	linked
			)
		}
		if (isLinked || isArktypeLinked) {
			s.prependLeft(
				firstStatementOf(module.program).start,
				`import "arktype/internal/island.js"\n` +
					(isLinked ?
						`import * as ${namespace} from "arktype/internal"\n`
					:	"") +
					(isArktypeLinked ?
						`import * as ${arktype} from "arktype/internal/arktype.js"\n`
					:	"")
			)
		}
	}

	private isArktypeNamespace(
		binding: Binding | undefined,
		module: SourceModule
	): boolean {
		if (binding?.kind !== "import") return false
		const target = this.graph.importOf(binding, module)
		return target.kind === "arktypeNamespace" && target.specifier === "arktype"
	}

	// what may throw at runtime fails unless allowUnsafe is set
	private get unsafeSeverity(): Diagnostic["severity"] {
		return this.mode === "cache" || this.allowUnsafe ? "warning" : "error"
	}

	private unsafeHintOf(hint: string): string {
		return this.unsafeSeverity === "error" ? `${hint} ${allowUnsafeHint}` : hint
	}

	private diagnostic(
		module: SourceModule,
		span: Span,
		rule: Rule,
		message: string,
		reasons: string[] = [],
		hint?: string | false,
		severity: Diagnostic["severity"] = (
			this.mode === "cache" && rule !== "syntax" && rule !== "copies"
		) ?
			"warning"
		:	"error"
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
				: this.mode === "cache" && rule !== "copies" && rule !== "parse" ?
					cacheHint
				:	(hint ?? hintsByRule[rule]) || undefined
		}
	}
}

export const writeUnknownMemberMessage = <member extends string>(
	member: member
): writeUnknownMemberMessage<member> =>
	`members has ${member}, which isn't one of ${[...defaultMembers, ...introspectionMembers].map(name => JSON.stringify(name)).join(", ")}`

export type writeUnknownMemberMessage<member extends string> =
	`members has ${member}, which isn't one of ${string}`

const methodMembers = ["traverse", "from", "toString"] as const

const booleanOptions = ["freeze", "lazy"] as const

const enumOptions = {
	checks: ["types", "helpers", "none"],
	errors: ["all", "first", "none"],
	mutatesInput: [false, true, "always"],
	optimize: ["speed", "size"]
} as const

// options runtime: "arktype" doesn't take
const standaloneOptions = [
	"members",
	...booleanOptions,
	...keysOf(enumOptions)
] as const

export const writeOptionValueMessage = <
	option extends string,
	value extends string,
	expected extends string
>(
	option: option,
	value: value,
	expected: expected
): writeOptionValueMessage<option, value, expected> =>
	`${option} is ${value}, which isn't ${expected}`

export type writeOptionValueMessage<
	option extends string,
	value extends string,
	expected extends string
> = `${option} is ${value}, which isn't ${expected}`

export const standardJsonSchemaWithoutStandardMessage =
	'members bakes "~standard.jsonSchema" into "~standard", which it sets false'

export type standardJsonSchemaWithoutStandardMessage =
	typeof standardJsonSchemaWithoutStandardMessage

export const writeArktypeRuntimeOptionMessage = <option extends string>(
	option: option
): writeArktypeRuntimeOptionMessage<option> =>
	`${option} chooses what a standalone build writes, which runtime: "arktype" doesn't`

export type writeArktypeRuntimeOptionMessage<option extends string> =
	`${option} chooses what a standalone build writes, which runtime: "arktype" doesn't`

export const renderDiagnostic = (diagnostic: Diagnostic): string =>
	[
		`${diagnostic.file}:${diagnostic.line}:${diagnostic.column}  ${diagnostic.message}`,
		...diagnostic.reasons.map(reason => `  ${reason}`),
		...(diagnostic.hint ? [`  ${diagnostic.hint}`] : [])
	].join("\n")

interface Configuration {
	modules: string[]
	// hash of its modules' paths and text, if configure() is called
	version: string | undefined
	// the same for their files, which a host may transpile
	files: string | undefined
	// what the program's configure() checks it received
	fingerprint: string | undefined
	// why configure() can't be applied
	problem: string | undefined
	reasons: string[]
	// false where the reasons say how to fix them
	hint?: string | false | undefined
}

let threadConfiguration: Configuration | undefined

// arktype can't change its configuration once set
const holdsOtherConfiguration = (files: string | undefined): boolean =>
	threadConfiguration ?
		threadConfiguration.files !== files
	:	Object.keys($ark.config).length > 0 ||
		(files !== undefined && $ark.resolvedConfig !== undefined)

const writeUnreadableConfigMessage = (path: string) =>
	`the config module ${path} can't be read`

export const configuredThreadMessage =
	"arktype in this thread holds a configuration other than the build's, which it can't change once set, so the build must restart in a thread of its own"

export type configuredThreadMessage = typeof configuredThreadMessage

const configurationConflictMessage =
	"configure() is given other values than arktype in this thread already applied"

const configurationConflictReason =
	"a module the configuration reads was given anew, as when a plugin ahead of arktype's transforms it, and arktype can't change its configuration once set"

export const writeStandaloneDependencyMessage = <name extends string>(
	name: name
): writeStandaloneDependencyMessage<name> =>
	`${name} imports arktype, which a standalone build resolves to arktype/runtime, where defining a Type throws. Have it publish its source with "arktype": { "precompile": true } in its package.json, so this build precompiles it.`

export type writeStandaloneDependencyMessage<name extends string> =
	`${name} imports arktype, which a standalone build resolves to arktype/runtime, where defining a Type throws. Have it publish its source with "arktype": { "precompile": true } in its package.json, so this build precompiles it.`

const ownPackagesByName: Partial<
	Record<ArkPackage, [root: string, version: string]>
> = {}

const versionHint =
	"A precompiled validator is written for the arktype it was built with. Install one version of each, so @ark/precompile imports what the program does."

const copiesHint =
	"Types and errors from one copy aren't recognized by another. Install one version of each, e.g. with your package manager's dedupe or overrides."

const writeUnsureHint = (fix: string) =>
	`If it isn't a Type, annotate it with its type. If it is, ${fix}.`

const hintsByRule: Record<Exclude<Rule, "syntax">, string> = {
	R1: `Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".`,
	R2: "arktype runs this callback while defining the type, so the build computes its result. Make it a static helper: one expression or one `return` in the static subset.",
	R3: "The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module.",
	R4: `Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".`,
	unsupported: `Standalone builds can't precompile every definition yet. Build with runtime: "arktype".`,
	parse: "Fix the definition, or it throws the same ParseError at runtime.",
	copies: copiesHint
}

const cacheHint = 'With runtime: "arktype", arktype defines this at runtime.'

const frozenHint = `Keep what you attach in an object of your own, or build with runtime: "arktype".`

const unresolvedHint =
	"If a bundler alias resolves it, add the alias to tsconfig.json's `paths` or name that tsconfig as the build's `tsconfig`, so the build can check it."

const islandHint = `A runtime island runs on arktype, as must what it reads. Mark that definition // @ark-runtime too, or build with runtime: "arktype".`

const runtimeImportHint = `Read it only in a definition the build precompiles or one marked // @ark-runtime, or build with runtime: "arktype".`

const nodePackageHint = `Read arktype's nodes in a definition marked // @ark-runtime, or build with runtime: "arktype".`

const writeSchemaExportHint = (name: string) =>
	`Import ${name} from arktype, which a standalone build resolves to its runtime${name === "ArkErrors" ? ", or read type.errors" : ""}.`

const localeHint = `Write errors in a locale in a definition marked // @ark-runtime, or build with runtime: "arktype".`

const localeSpecifier = /^(?:arktype|@ark\/type)\/locales(?:\/|$)/

// packages reading arktype's nodes, which validators lack
const nodePackageSpecifier =
	/^(?:(?:arksets|@ark\/(?:json-schema|fast-check)|(?:arktype|@ark\/(?:type|schema))\/internal)(?:\/|$)|@ark\/schema$)/

// @ark/schema exports the runtime shares (not ArkErrors)
const sharedSchemaExports = Object.keys(runtimeExports).filter(
	name =>
		(arkSchema as Record<string, unknown>)[name] ===
		(arktypeRuntime as Record<string, unknown>)[name]
)

const arktypeSpecifier =
	/\b(?:from|import)\s*["'](?:arktype(?:\/config)?|arkregex|@ark\/(?:type|regex))["']/

const importSpecifier = /\b(?:from|import)\s*["']([^"']+)["']/g

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

// the assignment, update or `delete` a target is part of
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

export const specifierOf = (importer: string, file: string): string => {
	const path = relative(dirname(importer), file).split("\\").join("/")
	return path.startsWith(".") ? path : `./${path}`
}

const writeErrorsMismatchMessage = (
	configured: ErrorDetail,
	built: ErrorDetail
): string =>
	`arktype is configured with errors: "${configured}", where the build's errors are "${built}"`

const writeMutatesInputMismatchMessage = (
	configured: MutatesInput,
	built: MutatesInput
): string =>
	`arktype is configured with mutatesInput: ${printable(configured)}, where the build's mutatesInput is ${printable(built)}`

// text a standalone validator can't write as arktype does
const textHints: [pattern: RegExp, hint: string][] = [
	[
		/^a scope's configured/,
		`A standalone validator writes text configured for a code only from configure(). Configure it there, or on each Type with .configure(), or build with runtime: "arktype".`
	],
	[
		/^a configured predicate \w+ that a narrow or morph raises/,
		`A standalone validator writes what a narrow or morph raises from what it passes to ctx.reject(). Pass the text there, or build with runtime: "arktype".`
	],
	[
		/writer, which reads each branch's errors/,
		`A standalone validator keeps no union branch's errors. Configure the text as a string, or build with runtime: "arktype".`
	]
]

const configuredHintOf = (reasons: string[]): string | undefined => {
	const option = reasons
		.map(reason => /^arktype is configured with (\w+)/.exec(reason)?.[1])
		.find(option => option !== undefined)
	if (option !== undefined)
		return `A standalone validator returns what arktype does as the program configures it. Build with the ${option} arktype is configured with.`
	return textHints.find(([pattern]) =>
		reasons.some(reason => pattern.test(reason))
	)?.[1]
}

const isFoldable = (value: unknown): value is Foldable =>
	hasArkKind(value, "root") ||
	hasArkKind(value, "module") ||
	hasArkKind(value, "scope") ||
	hasArkKind(value, "generic") ||
	isTypedFn(value)

// the Type, for a site reading its introspection
const createdBy = (site: Site): Foldable | undefined =>
	isFoldable(site.value) ? site.value : site.introspection?.type

const exportedRootsOf = (value: unknown): BaseRoot[] => {
	let module = value
	if (hasArkKind(value, "scope")) {
		try {
			module = value.export()
		} catch {
			// a scope whose export throws defines no Type
			return []
		}
	}
	return hasArkKind(module, "module") ? rootsIn(module) : []
}

const rootsIn = (value: unknown): BaseRoot[] =>
	[...arkObjectsIn(value)].filter(member => hasArkKind(member, "root"))

// e.g. a Module and each Type it holds
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

// a cyclic Type's hash holds registry counters, so name by position
const nameOf = (site: Site) =>
	hashOf(
		site.parseError ?
			[site.parseError.message, ...(site.progress ?? [])].join("\n")
		:	`${site.start}`
	)

const noValidators: StandaloneModules = {
	code: "",
	modules: {},
	folds: {},
	checking: [],
	values: [],
	reads: {}
}

// one bad export refuses a whole artifact, so retry each alone
const writeValidators = (
	exportsByName: Record<string, StandaloneExport>,
	opts: StandaloneOptions,
	refusalsByName: Record<string, string[]>,
	inline: boolean
): StandaloneModules => {
	const write = (names: string[]): StandaloneModules => {
		const exports = Object.fromEntries(
			names.map(name => [name, exportsByName[name]])
		)
		return (inline ? precompileStandalone : precompileStandaloneModules)(
			exports,
			opts
		)
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
		// e.g. every export under a configured locale
		return writable.length ? write(writable) : noValidators
	}
}

// fixes the configuration as a failed definition does
const writeParseErrorThrower = (
	message: string,
	configured: Configured,
	progress: Site["progress"]
) =>
	`import * as runtime from "arktype/runtime"\n\nfunction throwParseError(${progress ? "progress" : ""}) {\n\t${progress ? `runtime.checkProgress(progress, ${progress[0]}, ${JSON.stringify(progress[1])})\n\t` : ""}${writeFixConfig(configured)}\n\tthrow new runtime.ParseError(${JSON.stringify(message)})\n}\n\nexport { throwParseError as default }\n`

// the runtime's own where nothing was fingerprinted
const writeConfigFixer = (configured: Configured) =>
	configured ?
		`import * as runtime from "arktype/runtime"\n\nfunction fixConfig() {\n\t${writeFixConfig(configured)}\n}\n\nexport { fixConfig as default }\n`
	:	`import { fixConfig } from "arktype/runtime"\n\nexport { fixConfig as default }\n`

const writeUnitTable = (units: Record<string, string>) =>
	`import { registerPrecompiledUnits } from "arktype/internal/precompiled.js"\n\nregisterPrecompiledUnits({ ${Object.entries(
		units
	)
		.map(([key, unit]) => `${JSON.stringify(key)}: ${unit}`)
		.join(", ")} })\n`

// each module runs in a function atop its importer
const inlineModules = (
	module: SourceModule,
	s: MagicString,
	prefix: string,
	modules: Record<string, string>,
	imports: Record<string, Record<string, string>>
): string => {
	const importsBySource: Record<string, InlinedImport> = {}
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
				const imported = (importsBySource[statement.source.value] ??= {
					namespace: `${prefix}$${Object.keys(importsBySource).length}`,
					isPassed: false,
					locals: {}
				})
				// imported by name, so a bundler can drop the exports none read
				const localOf = (name: string) =>
					(imported.locals[name] ??= `${imported.namespace}$${name}`)
				for (const binding of statement.specifiers) {
					if (binding.type !== "ImportNamespaceSpecifier") {
						params.push(binding.local.name)
						args.push(
							localOf(
								binding.type === "ImportSpecifier" ?
									exportNameOf(binding.imported)
								:	"default"
							)
						)
						continue
					}
					const members = membersReadOf(inlined, binding.local.name)
					if (members) {
						for (const { start, end, property } of members)
							body.overwrite(start, end, localOf(property.name))
						continue
					}
					imported.isPassed = true
					params.push(binding.local.name)
					args.push(imported.namespace)
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
		const call = `((${params.join(", ")}) => {\n${body.toString().trim()}\n${names.length ? `return { ${names.map(name => `${JSON.stringify(name)}: ${localsByName[name]}`).join(", ")} }\n` : ""}})(${args.join(", ")})`
		if (!names.length) {
			declarations += `;${call};\n`
			continue
		}
		// declared, so a cycle can call them before the body runs
		const exports = `${prefix}$exports${loaders}`
		const load = `${prefix}$load${loaders++}`
		declarations += `var ${exports};\nfunction ${load}() {\nreturn (${exports} ??= ${call})\n}\n${names
			.map(
				name =>
					`function ${locals[name]}(...args) {\nreturn ${load}()[${JSON.stringify(name)}](...args)\n}\n`
			)
			.join("")}${load}();\n`
	}
	if (!declarations) return ""
	s.prependLeft(firstStatementOf(module.program).start, declarations)
	return Object.entries(importsBySource)
		.map(([source, { namespace, isPassed, locals }]) => {
			const from = JSON.stringify(source)
			const named = Object.entries(locals).map(
				([name, local]) => `${name} as ${local}`
			)
			let written = isPassed ? `\nimport * as ${namespace} from ${from}` : ""
			if (named.length)
				written += `\nimport { ${named.join(", ")} } from ${from}`
			return written || `\nimport ${from}`
		})
		.join("")
}

interface InlinedImport {
	namespace: string
	// whether a module reads the namespace other than by its members
	isPassed: boolean
	locals: Record<string, string>
}

type StaticMember = Extract<MemberExpression, { computed: false }>

// a namespace only read as `ns.name`, or undefined
const membersReadOf = (
	module: SourceModule,
	local: string
): StaticMember[] | undefined => {
	const members: StaticMember[] = []
	for (const { id } of module.scopes.root.bindings[local].references) {
		const member = id.parent
		if (
			member?.type !== "MemberExpression" ||
			member.computed ||
			member.object !== id
		)
			return
		members.push(member)
	}
	return members
}

const rangesOf = (sites: Site[]) =>
	new Map(sites.map(site => [rangeOf(site), site]))

// a comment between declarators can hold a comma
const commaAfter = (source: string, from: number): number => {
	for (let i = from; ; i++) {
		if (source[i] === ",") return i
		if (source.startsWith("//", i)) i = source.indexOf("\n", i)
		else if (source.startsWith("/*", i)) i = source.indexOf("*/", i) + 1
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

const declaredBindingKinds = {
	const: 1,
	let: 1,
	var: 1,
	function: 1,
	class: 1
} satisfies Partial<Record<BindingKind, 1>>

// an import only folded sites read becomes `import "arktype"`
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

// TypeScript drops imports only folded sites read, so re-add them bare
const keepImportedModules = (
	module: SourceModule,
	folded: Span[],
	kept: Span[],
	passed: Binding[],
	s: MagicString
) => {
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
		const bindings = values.flatMap(
			specifier => module.scopes.bindingsById.get(specifier.local) ?? []
		)
		const references = bindings.flatMap(binding => binding.references)
		if (
			references.length &&
			references.every(
				({ id }) =>
					folded.some(span => contains(span, id)) &&
					!kept.some(span => contains(span, id))
			) &&
			!bindings.some(binding => passed.includes(binding))
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
		?.references.some(({ id }) => !sites.some(site => contains(site, id)))

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

const refuseDynamic = (site: Site, dynamic: DynamicValue): Site =>
	refuse(site, chainOf(dynamic))

// e.g. `export default configure(...)`
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

// e.g. a configured writer calling a function in a site's meta
const reasonsOf = (e: unknown): string[] =>
	e instanceof DynamicValue ? chainOf(e)
	: e instanceof Error ? [e.message]
	: [String(e)]

const isMemberRead = (node: Node, root: Node): boolean => {
	node = unwrapExpression(node)
	while (node !== root) {
		if (node.type !== "MemberExpression") return false
		node = unwrapExpression(node.object)
	}
	return true
}

const rangeOf = (span: Span) => `${span.start}:${span.end}`

// AST nodes nest, so an ancestor's range suffices
const isWithin = (node: Node, ranges: Set<string>): boolean => {
	for (let n: Node | null | undefined = node; n; n = n.parent)
		if (ranges.has(rangeOf(n))) return true
	return false
}

const textOfInput = (input: Input) =>
	[input.name, ...input.path.map(String)].join(".")

const labelOf = (module: SourceModule, span: Span) =>
	`\`${module.snippetOf(span)}\` (${module.positionOf(span)})`

const isCoveredBy = (input: Input, existing: Input) =>
	input.kind === existing.kind &&
	input.file === existing.file &&
	input.name === existing.name &&
	existing.path.length <= input.path.length &&
	existing.path.every((k, i) => input.path[i] === k)

// a site in a function an enclosing site calls at build is folded
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

// a function arktype only calls while defining a type isn't part of it
const isHeld = (hole: unknown, interpreter: Interpreter) =>
	!hasDomain(hole, "object") ||
	!interpreter.standIns.get(hole)!.isCalled ||
	registeredNameOf(hole) !== undefined
