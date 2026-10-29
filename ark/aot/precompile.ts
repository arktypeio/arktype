import {
	$ark,
	hasArkKind,
	writeMissingImportMessage,
	writePrecompiledUnits,
	type BaseRoot,
	type ErrorDetail,
	type MutatesInput
} from "@ark/schema"
import * as arkSchema from "@ark/schema"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { fingerprintOf } from "@ark/schema/runtime"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { writeMissingInverseMessage } from "@ark/schema/codecs"
import {
	appendStringifiedKey,
	hashOf,
	hasDomain,
	includes,
	InternalArktypeError,
	isThunk,
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
	isPlainLiteral,
	isTypedFn,
	keyOf,
	kindNameOf,
	noIssueFeatures,
	traversalKeyOf,
	writeUnprecompilableMessage,
	type Checks,
	type Optimization,
	type ValidatorMember,
	type ValidatorMembers,
	type DefaultCheck,
	type FactoryParam,
	type Foldable,
	type IssueFeatures,
	type StandaloneExport,
	type StandaloneFactory,
	type StandaloneIntrospection,
	type StandaloneModules,
	type StandaloneOptions,
	type ScopeAlias,
	type Configured
} from "arktype/internal/standalone.ts"
import MagicString, { type SourceMap } from "magic-string"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import type {
	CallExpression,
	ImportDeclaration,
	MemberExpression,
	Node,
	Span
} from "oxc-parser"
import { isPlainContainer } from "./builtins.ts"
import { DynamicValue } from "./dynamic.ts"
import {
	arkPackageSpecifier,
	bindingOfFunction,
	contains,
	declarationStartOf,
	initializedOf,
	errorReaders,
	importsValues,
	isArk,
	isArkObject,
	isComposingMember,
	functionOfBinding,
	mayReturnArk,
	isFunctionNode,
	isObjectWrite,
	writeOf,
	isOnlyType,
	isRuntimeExport,
	isTypeMemberRead,
	isTypeOnly,
	mayBeOtherArk,
	mayHoldArk,
	memberNameOf,
	ModuleGraph,
	progressOf,
	runtimeExports,
	staticBodyOf,
	stepsOf,
	type ArkExportName,
	type FunctionNode,
	type ImportTarget,
	type StandInKind
} from "./graph.ts"
import {
	arkPackageName,
	dependencyOf,
	mapToSource,
	readsNodes,
	runsOnArktype,
	runtimeSpecifiers,
	runtimeVariantOf,
	transformedId,
	type DependencyModes,
	type PrecompileHost,
	type RuntimeVariant
} from "./host.ts"
import {
	createSiteState,
	findDynamic,
	inferredNameOf,
	Interpreter,
	isDynamic,
	type InterpreterOptions,
	ModuleNamespace,
	type Read,
	runsBeforeBody,
	type SiteState
} from "./interpreter.ts"
import { SourceModule } from "./module.ts"
import type { Preset } from "./presets.ts"
import { resolvePrecompileOptions } from "./settings.ts"
import {
	exportNameOf,
	isTransparent,
	loadedSourceOf,
	isWriteTarget,
	unwrapChain,
	operatorOf,
	unwrapExpression,
	walk,
	type Binding,
	type BindingKind
} from "./scope.ts"
import type { ShadowContract } from "./shadow.ts"
import { flattenBundle, importedNamesOf } from "./flat.ts"
import {
	writeKeptMembersMessage,
	writeUnprunedMessage,
	writeUnscannedFlatMessage,
	writeUnseenMessage
} from "./scan.ts"
import {
	linkBundle,
	prefixOf,
	type LinkedSite,
	type LinkOptions
} from "./link.ts"
import {
	passedReaderOf,
	unprecompiled,
	usedMembersOf,
	type RuntimeModule,
	type UsedMember
} from "./usage.ts"
import {
	filterSites,
	findSites,
	type SiteCandidate,
	type SiteRead
} from "./sites.ts"
import {
	cacheHint,
	configurationConflictMessage,
	configurationConflictReason,
	configuredHintOf,
	isUnstaticHelperReason,
	configuredThreadMessage,
	copiesHint,
	derivedHint,
	frozenHint,
	hintsByRule,
	writeGenericHint,
	writeHelperCallHint,
	writeOpaqueHelperHint,
	writeOpaqueParameterHint,
	islandHint,
	islandValueMessage,
	localeHint,
	markerHint,
	nodePackageHint,
	runtimeImportHint,
	dynamicImportHint,
	unresolvedHint,
	versionHint,
	writeVersionHint,
	writeConfiguredOptionHint,
	writeConflictHint,
	writeErrorReaderHint,
	writeMessageInHint,
	writeNoConfigHint,
	writeStaticHint,
	writeErrorsMismatchMessage,
	writeKeyedHint,
	writeMutatesInputMismatchMessage,
	writeSchemaExportHint,
	writeStandaloneDependencyMessage,
	writeTurbopackDependencyMessage,
	writeUnreadableConfigMessage,
	writeUnsureHint,
	writeVariantOption,
	withAllowUnsafe
} from "./messages.ts"
import {
	commaAfter,
	firstStatementOf,
	inlineModules,
	keepImportedModules,
	noValidators,
	pruneArktypeImports,
	writeConfigFixer,
	writeParseErrorThrower,
	writeUnitTable,
	writeValidators
} from "./output.ts"
import { programSizeOf } from "./runtimeSize.ts"
import { combinesChecks } from "./smaller.ts"
export * from "./messages.ts"
export * from "./presets.ts"
export * from "./settings.ts"

export type PrecompileMode = "standalone" | "cache"

export interface PrecompileOptions extends InterpreterOptions {
	cwd?: string | undefined
	/** settings for a goal, which any other setting overrides */
	preset?: Preset | undefined
	/** the module calling configure(), or false if none does */
	config?: string | false | undefined
	/** inline virtual modules, for hosts without them */
	inline?: boolean | undefined
	/** what a factory checks at creation */
	creationChecks?: Checks | undefined
	/** members a validator has besides validating */
	members?: ValidatorMembers | undefined
	/** "first" stops at the first issue, "none" says only "is invalid" */
	errors?: ErrorDetail | undefined
	freeze?: boolean | undefined
	/** false creates validators as their modules load */
	lazy?: boolean | undefined
	mutatesInput?: MutatesInput | undefined
	/** "size" writes validators smaller and slower */
	optimize?: Optimization | undefined
	/** "size" writes errors smaller and slower to read, defaulting to optimize */
	optimizeErrors?: Optimization | undefined
	/** trusts data to hold only own, enumerable keys, as JSON.parse's output does */
	jsonInput?: boolean | undefined
	/** @internal the chars a site's baked introspection may total */
	bakedLimit?: number | undefined
	/** also create each site with arktype and throw where they diverge */
	shadow?: boolean | undefined
	/** false keeps what no read in a production bundle needs */
	prune?: boolean | undefined
	/** warn rather than fail where the output may throw at runtime */
	allowUnsafe?: boolean | undefined
	/** packages that don't opt in, precompiled ("aot") or run on arktype */
	dependencies?: DependencyModes | undefined
}

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
}

type ProgramReads = Pick<
	ProgramUsage,
	"members" | "called" | "readsAllows" | "piped" | "combines" | "shapes"
>

interface ProgramUsage {
	members: ValidatorMembers
	// false where no read may leave a failure's errors unread
	called: boolean
	// false where no read takes a validator's .allows
	readsAllows: boolean
	// false where no call passes a second argument, a traversal to pipe into
	piped: boolean
	sources: Record<string, string>
	// each module as the bundle is written, linked across it
	written: Record<string, PrecompiledModule>
	// modules it no longer reads as their units are declared in one function
	replaced: ReadonlySet<string>
	// whether a size build writes the program's nodes as checkers, as is
	// smaller for the program as a whole
	combines?: boolean
	// whether its checkers write common intersections as shapes
	shapes?: boolean
}

interface ProgramPlan {
	sources: Record<string, string>
	// what each module would read, before any writes a validator
	planned: Map<string, RuntimeModule>
	precompiled: string[]
}

interface WrittenProgram {
	written: Record<string, PrecompiledModule>
	runtimes: Map<string, RuntimeModule>
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
	// the warning where it left out no member members leaves to it
	unpruned?: string | undefined
	// what its issues may hold, unless they may hold anything
	issues?: IssueFeatures | undefined
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
	// what its validators' issues may hold, where it writes any
	issues?: IssueFeatures | undefined
	// the helpers it exports whose calls the build folds, which only a precompiled module can call
	foldedHelpers: string[]
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
	// whether it initializes a variable, e.g. one a function declares
	initializes: boolean
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
	// the unwritten binding a site initialized that it reads
	fixedBy: Binding | undefined
	// a function or symbol its own module creates
	isOwnHole: boolean
	// imported from a module that only declares and has run
	isInert: boolean
	// created by a call to arktype the site makes, which its factory replaces
	isCreated: boolean
}

type FactoryImport = [specifier: string, name: string, local: string]

interface PlannedSites {
	namesBySite: Map<Site, string>
	factoriesBySite: Map<Site, SiteFactory>
	exportsByName: Record<string, StandaloneExport>
	// so far, the sites whose definitions it keeps in place
	folded: Site[]
}

interface SiteFactory {
	params: FactoryParam[]
	spans: Span[]
	// e.g. the second `f` in `{ a: narrow(f), b: narrow(f) }`
	repeats: [span: Span, spanIndex: number][]
	inputs: string[]
	// inputs set before the site runs, so reading them can't throw
	inert: string[]
	// whose imports the call keeps, by the input passing each
	bindings: [input: string, binding: Binding][]
	imports: FactoryImport[]
}

const emptyFactory = (): SiteFactory => ({
	params: [],
	spans: [],
	repeats: [],
	inputs: [],
	inert: [],
	bindings: [],
	imports: []
})

// what folding a module's sites has written so far
interface Folding {
	module: SourceModule
	s: MagicString
	prefix: string
	validators: StandaloneModules
	// modules writing the same code share it
	specifier: string
	configured: Configured
	modules: Record<string, string>
	imports: Record<string, Record<string, string>>
	inputImports: Record<string, Record<string, string>>
	imported: Set<string>
	checking: Set<string>
	// the source a site's call keeps, which still reads the bindings it holds
	kept: Span[]
	passed: Binding[]
	// those a call reads at runtime
	read: Binding[]
	readsPassedBy?: (exported: string) => boolean
	// the first droppable site, where the config is fixed
	fixedAt: number
}

const unplan = (plan: PlannedSites, site: Site): void => {
	delete plan.exportsByName[plan.namesBySite.get(site)!]
	plan.namesBySite.delete(site)
	plan.factoriesBySite.delete(site)
}

const planFactory = (
	plan: PlannedSites,
	site: Site,
	factory: SiteFactory,
	tablesByValue: Map<unknown, number>
): void => {
	const name = `f${siteNameOf(site)}`
	plan.factoriesBySite.set(site, factory)
	plan.namesBySite.set(site, name)
	if (site.introspection) {
		plan.exportsByName[name] = {
			...site.introspection,
			data: site.value,
			params: factory.params,
			defaultChecks: site.defaultChecks
		}
		return
	}
	let table = tablesByValue.get(site.value)
	if (table === undefined)
		tablesByValue.set(site.value, (table = tablesByValue.size))
	plan.exportsByName[name] = {
		type: site.value as never,
		params: factory.params,
		internedBy: table,
		defaultChecks: site.defaultChecks
	} satisfies StandaloneFactory
}

// a site's validator, or where its definition throws a ParseError, its thrower
const importFolded = (
	site: Site,
	exported: string,
	local: string,
	created: readonly string[] | undefined,
	{ validators, specifier, configured, modules, imports, prefix }: Folding
): void => {
	if (site.parseError) {
		const thrower = writeParseErrorThrower(
			site.parseError.message,
			configured,
			site.progress
		)
		const throwerSpecifier = `~arktype/${hashOf(thrower)}`
		modules[throwerSpecifier] = thrower
		imports[throwerSpecifier] = { default: local }
		return
	}
	if (!(specifier in modules)) {
		modules[specifier] = validators.code
		Object.assign(modules, validators.modules)
	}
	const locals = (imports[specifier] ??= {})
	if (created) for (const read of created) locals[read] = `${prefix}_${read}`
	else locals[exported] = local
}

// parameters stay in place, so they evaluate in order, even for a value
const spliceSite = (
	s: MagicString,
	site: Span,
	spans: readonly Span[],
	inputs: string[],
	opener: string,
	closer: string
): void => {
	const replace = (start: number, end: number, text: string) =>
		start === end ? s.appendLeft(start, text) : s.overwrite(start, end, text)
	let start = site.start
	let separator = opener
	for (const span of spans) {
		replace(start, span.start, separator)
		start = span.end
		separator = ", "
	}
	const read = inputs.map((input, i) => (i ? ", " : separator) + input)
	replace(start, site.end, `${read.join("")}${closer}`)
}
const receive = (
	factory: SiteFactory,
	passedAs: PassedInput,
	param: FactoryParam
) => {
	factory.inputs.push(passedAs.expression)
	if (passedAs.imported) factory.imports.push(passedAs.imported)
	if (passedAs.binding)
		factory.bindings.push([passedAs.expression, passedAs.binding])
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

// each shape's runtime and what each call of it saves, gzipped bytes measured
// on bundles of 10 to 1000 schemas
const shapeCosts = {
	stringRange: [48, 0.37],
	integerRange: [64, 0.76],
	arrayOf: [56, 0.47],
	nullable: [25, 1.76]
}

const shapesPayIn = (
	written: Record<string, Pick<PrecompiledModule, "modules">>
): boolean => {
	const modules: Record<string, string> = {}
	for (const id in written) Object.assign(modules, written[id].modules)
	const text = Object.values(modules).join("\n")
	let saved = 0
	for (const [shape, [runtime, call]] of Object.entries(shapeCosts)) {
		const calls = text.split(`runtime.${shape}(`).length - 1
		if (calls) saved += calls * call - runtime
	}
	return saved > 0
}

// declaring about this many units as validators repays a validator exposing allows, gzipped
const unitsExposingAllowsPays = 6

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
	// those and the introspection members it doesn't bake, which a read off
	// what may be a Type can't fold
	private unsureLackedMembers: ReadonlySet<string>
	private errors: ErrorDetail | undefined
	private variant: RuntimeVariant | undefined
	private mutatesInput: MutatesInput | undefined
	private standalone: StandaloneOptions
	private configuration: Configuration | undefined
	private loadedBeforeConfigure: string[] | undefined
	private configureCallsByModule = new WeakMap<SourceModule, CallExpression[]>()
	private readsByModule = new WeakMap<SourceModule, SiteRead[]>()
	private readCandidatesByModule = new WeakMap<SourceModule, SiteCandidate[]>()
	private candidatesByModule = new WeakMap<SourceModule, SiteCandidate[]>()
	private calledParamsByFn = new WeakMap<
		FunctionNode,
		CalledParam | undefined
	>()
	private inertByModule = new WeakMap<SourceModule, boolean>()
	private namesArkById: Record<string, boolean> = Object.create(null)
	private valueSpecifiersById: Record<
		string,
		[source: string, specifiers: ReadonlySet<string> | undefined]
	> = Object.create(null)
	// each module's import cycle (SCC), numbered as found
	private componentsById: Record<string, number> = Object.create(null)
	private exportsArkByModule = new WeakMap<SourceModule, boolean>()
	private analysesByModule = new WeakMap<SourceModule, ModuleAnalysis>()
	// why the analyses' configuration can't be applied
	private analyzedProblem: string | undefined
	private bindingsByInput = new WeakMap<Input, Binding>()
	// e.g. a Scope configured by a parameter
	private refusedContainers = new Map<unknown, [Node, SourceModule]>()
	// a Scope or Generic another module's refused site reads, left to arktype
	// as its module is written
	private dynamicStandIns = new Map<
		unknown,
		[reader: Span, module: SourceModule, name: string]
	>()
	// each replaced by a stand-in a module already written holds
	private writtenStandIns = new Map<unknown, [Site, SourceModule]>()
	// each module's reads off what may be a Scope or Generic, refused without a site
	private scopeReadsByModule = new WeakMap<SourceModule, ScopeRead[]>()
	// modules being analyzed, which a refused site reaching their functions doesn't reenter
	private analyzing = new Set<SourceModule>()
	// each warning that a site accepts a Standard Schema, by span, which
	// writing it may still refuse
	private schemaWarningSpans = new WeakMap<Diagnostic, Span>()
	private packagesByEntry: Record<string, [root: string, version: string]> =
		Object.create(null)
	private copiesByPackage: Record<ArkPackage, Record<string, PackageCopy>> = {
		arktype: {},
		"@ark/schema": {},
		"@ark/util": {}
	}
	private reportedDependencies = new Set<string>()
	private intrinsicUnits: Record<string, string> | undefined
	private runtimesById: Record<string, RuntimeModule> = Object.create(null)
	private usagesByProgram = new Map<string, ProgramUsage>()

	constructor(host: PrecompileHost, opts: PrecompileOptions = {}) {
		opts = resolvePrecompileOptions(opts)
		this.graph = new ModuleGraph(host, opts.cwd, opts.dependencies)
		this.interpreter = new Interpreter(this.graph, opts, module =>
			this.readsOf(module)
		)
		this.mode = opts.runtime === "arktype" ? "cache" : "standalone"
		this.config = opts.config || undefined
		this.configures = opts.config !== false
		this.inline = !!opts.inline
		const checks = opts.creationChecks ?? "types"
		this.checkHelpers = this.mode === "standalone" && checks === "helpers"
		this.shadow = this.mode === "standalone" && !!opts.shadow
		this.allowUnsafe = !!opts.allowUnsafe
		this.members = opts.members ?? {}
		this.errors = opts.errors
		this.variant = runtimeVariantOf(opts)
		this.mutatesInput = opts.mutatesInput
		this.standalone = {
			members: this.members,
			errors: this.errors,
			freeze: opts.freeze !== false,
			lazy: opts.lazy !== false,
			checks,
			mutatesInput: this.mutatesInput,
			optimize: opts.optimize ?? "speed",
			jsonInput: opts.jsonInput,
			bakedLimit: opts.bakedLimit
		}
		this.lackedMembers = new Set(
			defaultMembers.flatMap(member =>
				this.members[member] !== false ? []
				: member === "methods" ? methodMembers
				: [member]
			)
		)
		this.unsureLackedMembers = new Set([
			...this.lackedMembers,
			...introspectionMembers.filter(member => !this.members[member])
		])
		const contract: ShadowContract = {}
		if (this.members.meta === false) contract.members = { meta: false }
		if (this.mutatesInput) contract.mutatesInput = this.mutatesInput
		if (this.errors && this.errors !== "all") contract.errors = this.errors
		this.shadowContract =
			Object.keys(contract).length ? JSON.stringify(contract) : undefined
	}

	// what a bundle's issues may hold, where no runtime or other build's validator can add any
	private issuesOf(
		program: ScannedProgram,
		written: Record<string, PrecompiledModule>
	): IssueFeatures | undefined {
		for (const id in program.arkImports) {
			if (
				readsNodes(id) ||
				runsOnArktype(id, this.graph.dependencies) ||
				program.arkImports[id].some(
					specifier =>
						!runtimeSpecifiers.includes(specifier) &&
						!specifier.startsWith("@ark/util")
				)
			)
				return
		}
		const issues: IssueFeatures = { ...noIssueFeatures }
		for (const id in written) {
			const held = written[id].issues
			if (!held) continue
			for (const k in issues) {
				const feature = k as keyof IssueFeatures
				issues[feature] ||= held[feature]
			}
		}
		return issues
	}

	// what a bundle's validators are read for, so its next transforms leave out what no read needs
	scan(program: ScannedProgram): ScannedUsage {
		this.usagesByProgram.delete(program.key)
		const unwritten: ScannedUsage = {
			dropped: [],
			linked: false,
			replaced: [],
			written: false,
			holders: []
		}
		if (this.mode !== "standalone") return unwritten
		const plan = this.planProgram(program)
		if (typeof plan === "string") return { ...unwritten, unpruned: plan }
		const { planned, precompiled } = plan
		const used = this.usedIn(program, planned)
		const unpruned =
			typeof used === "string" ? this.keptMembersMessageOf(used) : undefined
		const dropped =
			typeof used === "string" ?
				[]
			:	defaultMembers.filter(
					member => this.members[member] === undefined && !used.has(member)
				)
		const isRead = (read: UsedMember) =>
			typeof used === "string" || used.has(read)
		const called = isRead("call")
		const readsAllows = isRead("allows")
		const piped = isRead("piped")
		const isWhole = !dropped.length && called && readsAllows && piped
		// a size build's units are already module constants
		const flattens =
			!!program.isOneChunk &&
			!this.inline &&
			this.standalone.optimize === "speed"
		// a program read whole is written too, as its issues may hold less than any
		const usage: ProgramUsage = {
			members: {
				...this.members,
				...Object.fromEntries(dropped.map(member => [member, false]))
			},
			called,
			readsAllows,
			piped,
			sources: plan.sources,
			written: {},
			replaced: new Set()
		}
		this.usagesByProgram.set(program.key, usage)
		const wrote = this.writeSmaller(program, plan, usage)
		if (!wrote) {
			this.usagesByProgram.delete(program.key)
			return unwritten
		}
		// as written, a validator may be read in a way the plan didn't see, as
		// where a factory checks a Type it's passed
		const usedAsWritten = isWhole ? used : this.usedIn(program, wrote.runtimes)
		const isReadAsWritten = (read: UsedMember) =>
			typeof usedAsWritten === "string" || usedAsWritten.has(read)
		if (
			dropped.some(isReadAsWritten) ||
			(!called && isReadAsWritten("call")) ||
			(!readsAllows && isReadAsWritten("allows")) ||
			(!piped && isReadAsWritten("piped"))
		) {
			this.usagesByProgram.delete(program.key)
			return {
				...unwritten,
				unpruned:
					typeof usedAsWritten === "string" ?
						this.keptMembersMessageOf(usedAsWritten)
					:	writeUnprunedMessage(
							"its precompiled code reads more of a validator than the program does"
						)
			}
		}
		const linked =
			this.inline || this.standalone.lazy ?
				false
			:	this.linkProgram(program, plan, usage, wrote)
		const { written, runtimes } = wrote
		const replaced =
			flattens ?
				this.flattenWritten(written, plan.sources, program, runtimes)
			:	undefined
		usage.written = written
		if (replaced) usage.replaced = new Set(replaced)
		return {
			dropped,
			linked,
			replaced: replaced ?? [],
			written: true,
			holders: precompiled.filter(id => {
				const runtime = planned.get(id)!
				return runtime.validators.length > 0 || runtime.holdsOther
			}),
			unpruned,
			issues: this.issuesOf(program, written)
		}
	}

	// what each module would read, before any writes a validator, or why one fails to precompile
	private planProgram(program: ScannedProgram): ProgramPlan | string {
		const plan: ProgramPlan = {
			sources: {},
			planned: new Map(),
			precompiled: []
		}
		for (const id in program.modules) {
			const { source, transformed, mappings } = program.modules[id]
			plan.sources[id] = source
			if (
				transformed &&
				this.isTransformed(id) &&
				this.importsArk(source, id)
			) {
				const runtime = this.plannedRuntimeOf(source, id, mappings)
				// a bundle building the module as read fails, reporting why
				if (!runtime) {
					return writeUnprunedMessage(
						`${this.graph.pathOf(id)} fails to precompile`
					)
				}
				plan.planned.set(id, runtime)
				plan.precompiled.push(id)
			} else plan.planned.set(id, unprecompiled(this.graph.add(id, source)))
		}
		return plan
	}

	private writeProgram(
		program: ScannedProgram,
		{ sources, planned, precompiled }: ProgramPlan
	): WrittenProgram | undefined {
		const written: Record<string, PrecompiledModule> = {}
		const runtimes = new Map(planned)
		for (const id of precompiled) {
			written[id] = this.precompile(
				sources[id],
				id,
				program.modules[id].mappings,
				program.key
			)
			runtimes.set(id, this.runtimesById[id])
			if (written[id].diagnostics.some(d => d.severity === "error")) return
		}
		return { written, runtimes }
	}

	// a write the program doesn't keep leaves the runtimes of the one it does
	private restoreRuntimes(
		{ runtimes }: WrittenProgram,
		{ precompiled }: ProgramPlan
	): void {
		for (const [id, runtime] of runtimes)
			if (precompiled.includes(id)) this.runtimesById[id] = runtime
	}

	// checkers or compiled nodes, whichever the program is smaller written as
	private writeSmaller(
		program: ScannedProgram,
		plan: ProgramPlan,
		usage: ProgramUsage
	): WrittenProgram | undefined {
		const decides = combinesChecks(this.standalone)
		if (decides) usage.combines = true
		const wrote = this.writeProgram(program, plan)
		if (!wrote || !decides) return wrote
		usage.combines = false
		const compiled = this.writeProgram(program, plan)
		if (
			compiled &&
			programSizeOf(compiled.written) < programSizeOf(wrote.written)
		)
			return compiled
		usage.combines = true
		this.restoreRuntimes(wrote, plan)
		return wrote
	}

	// links the program's units across its modules, writing it again where
	// exposing allows or writing shapes repays the runtime it reads
	private linkProgram(
		program: ScannedProgram,
		plan: ProgramPlan,
		usage: ProgramUsage,
		wrote: WrittenProgram
	): boolean {
		const { sources } = plan
		// a size build's units, where the bundle is one chunk, are one module
		const isOneChunk =
			!!program.isOneChunk && this.standalone.optimize === "size"
		let link = this.linkWritten(wrote.written, sources, {
			exposesAllows: usage.readsAllows,
			isOneChunk
		})
		// a unit a site creates its validator from is declared as that
		// validator where validators expose allows
		if (link.unexposed >= unitsExposingAllowsPays && usage.combines) {
			usage.readsAllows = true
			const exposed = this.writeProgram(program, plan)
			if (exposed) {
				Object.assign(wrote, exposed)
				link = this.linkWritten(wrote.written, sources, {
					exposesAllows: true,
					isOneChunk
				})
			} else {
				usage.readsAllows = false
				this.restoreRuntimes(wrote, plan)
			}
		}
		// checkers write common intersections as shapes where enough do to
		// repay the runtime they read
		if (isOneChunk && usage.combines) {
			usage.shapes = true
			const shaped = this.writeProgram(program, plan)
			const shapedLink =
				shaped &&
				this.linkWritten(shaped.written, sources, {
					exposesAllows: usage.readsAllows,
					isOneChunk
				})
			if (shaped && shapedLink && shapesPayIn(shaped.written)) {
				Object.assign(wrote, shaped)
				link = shapedLink
			} else {
				usage.shapes = false
				this.restoreRuntimes(wrote, plan)
			}
		}
		return link.changed
	}

	// why a bundle, read as built, may read what its scan left out: a module a
	// plugin ahead rewrote passes if it reads the same
	unseenIn(program: ScannedProgram): string | undefined {
		const usage = this.usagesByProgram.get(program.key)
		if (!usage) return
		const runtimes = new Map<string, RuntimeModule>()
		for (const id in program.modules) {
			const { source, transformed, mappings } = program.modules[id]
			// as the host emitted it, whether as the scan wrote it or whole
			const emitted = this.runtimesById[id]
			if (emitted?.module.source === source) {
				runtimes.set(id, emitted)
				continue
			}
			if (
				transformed &&
				this.isTransformed(id) &&
				this.importsArk(source, id)
			) {
				const runtime = this.plannedRuntimeOf(source, id, mappings)
				if (!runtime) {
					return writeUnseenMessage(
						`${this.graph.pathOf(id)}, as it built it, fails to precompile`
					)
				}
				runtimes.set(id, runtime)
			} else runtimes.set(id, unprecompiled(this.graph.add(id, source)))
		}
		const used = this.usedIn(program, runtimes)
		const unseen = (read: string) =>
			writeUnseenMessage(
				`the bundle it built reads more than the modules it read: ${read}. Another plugin wrote or rewrote a module after it read it`,
				"List precompile.vite() right after your framework's plugin and ahead of react(), a Babel plugin or another that rewrites modules, or set prune: false to build them whole"
			)
		const dropped = defaultMembers.filter(
			member =>
				usage.members[member] === false && this.members[member] === undefined
		)
		// a read it can't follow may need any member, where it left one out
		if (typeof used === "string") {
			return (
					dropped.length || !usage.called || !usage.readsAllows || !usage.piped
				) ?
					unseen(used)
				:	undefined
		}
		const read = dropped.find(member => used.has(member))
		if (read) return unseen(`a module reads ${read} of a validator`)
		if (!usage.called && used.has("call"))
			return unseen("a module calls a validator")
		if (!usage.readsAllows && used.has("allows"))
			return unseen("a module reads a validator's allows")
		if (!usage.piped && used.has("piped"))
			return unseen("a module passes a validator a traversal")
	}

	// a member members sets is the same whatever the program reads
	private keptMembersMessageOf(reason: string): string | undefined {
		const kept = defaultMembers.filter(
			member => this.members[member] === undefined
		)
		return kept.length ? writeKeptMembersMessage(reason, kept) : undefined
	}

	private usedIn(
		program: ScannedProgram,
		modules: ReadonlyMap<string, RuntimeModule>
	): Set<UsedMember> | string {
		return usedMembersOf({
			entries: new Set(program.entries),
			exposed: new Set(program.exposed),
			modules,
			resolve: (specifier, importer) => program.targets[importer]?.[specifier]
		})
	}

	// what a module's precompiled code would read at runtime, or undefined where it fails
	private plannedRuntimeOf(
		source: string,
		id: string,
		mappings: string | undefined
	): RuntimeModule | undefined {
		const module = this.add(id, source, mappings)
		this.configuration ??= this.applyConfiguration()
		const { sites, diagnostics } = this.analysisOf(module)
		const prefix = prefixOf(source, id)
		const { namesBySite, factoriesBySite, folded } = this.planSites(
			module,
			sites,
			new MagicString(source),
			prefix,
			diagnostics
		)
		if (diagnostics.some(d => d.severity === "error")) return
		const kept: Span[] = []
		const read: Binding[] = []
		const inputs: Record<string, string[]> = {}
		// a factory checks a Type it's passed only with creationChecks set
		const readsPassed = this.standalone.checks !== "none"
		for (const site of namesBySite.keys()) {
			folded.push(site)
			const factory = factoriesBySite.get(site)
			if (!factory) continue
			kept.push(...factory.spans)
			if (readsPassed)
				for (const [, binding] of factory.bindings) read.push(binding)
			for (const [specifier, name] of factory.imports)
				(inputs[specifier] ??= []).push(name)
		}
		return runtimeModuleOf(module, folded, kept, read, inputs)
	}

	private linkWritten(
		written: Record<string, PrecompiledModule>,
		sources: Record<string, string>,
		opts: LinkOptions
	): { changed: boolean; unexposed: number } {
		const sites: Record<string, LinkedSite> = {}
		const modules: Record<string, string> = {}
		for (const id in written) {
			sites[id] = { source: sources[id], code: written[id].code }
			Object.assign(modules, written[id].modules)
		}
		const linked = linkBundle(sites, modules, opts)
		if (!linked) return { changed: false, unexposed: 0 }
		let changed = false
		for (const id in written) {
			const { code, map } = linked.sites[id]
			if (code === written[id].code) continue
			changed = true
			const precompiled = written[id].map!
			written[id] = {
				...written[id],
				code,
				map: {
					...precompiled,
					mappings: mapToSource(map!, precompiled, sources[id]).mappings
				} as never
			}
		}
		for (const id in written) {
			const reached = reachedModulesOf(written[id].code, linked.modules)
			if (
				Object.keys(reached).some(
					specifier => reached[specifier] !== written[id].modules[specifier]
				)
			)
				changed = true
			written[id] = { ...written[id], modules: reached }
		}
		return { changed, unexposed: linked.unexposed }
	}

	// declares the units a one-chunk bundle reads in one function, if it pays
	private flattenWritten(
		written: Record<string, PrecompiledModule>,
		sources: Record<string, string>,
		program: ScannedProgram,
		runtimes: ReadonlyMap<string, RuntimeModule>
	): string[] | undefined {
		const sites: Record<string, string> = {}
		const modules: Record<string, string> = {}
		for (const id in written) {
			sites[id] = written[id].code
			Object.assign(modules, written[id].modules)
		}
		const flat = flattenBundle(
			sites,
			modules,
			importedNamesOf(
				[...runtimes.values()].map(runtime => runtime.module),
				[...program.entries, ...program.exposed],
				(specifier, importer) => program.targets[importer]?.[specifier]
			)
		)
		if (!flat) return
		for (const id in written) {
			const { code, map } = flat.sites[id]
			const precompiled = written[id].map
			written[id] = {
				...written[id],
				code,
				map:
					map && precompiled ?
						({
							...precompiled,
							mappings: mapToSource(map, precompiled, sources[id]).mappings
						} as never)
					:	precompiled,
				modules: reachedModulesOf(code, flat.modules)
			}
		}
		return flat.replaced
	}

	private usageIn(
		program: string | undefined,
		id: string,
		source: string
	): ProgramReads {
		const usage =
			program === undefined ? undefined : this.usagesByProgram.get(program)
		// the host fails a bundle holding a module unlike its scan read it
		return usage?.sources[id] === source ?
				usage
			:	{ members: this.members, called: true, readsAllows: true, piped: true }
	}

	// a module as its bundle's scan wrote it, if it's unchanged since
	private writtenIn(
		program: string | undefined,
		id: string,
		source: string
	): PrecompiledModule | undefined {
		const usage =
			program === undefined ? undefined : this.usagesByProgram.get(program)
		const written = usage?.written[id]
		return written && usage.sources[id] === source ?
				{
					...written,
					sites: written.sites.map(site => ({ ...site })),
					diagnostics: [...written.diagnostics]
				}
			:	undefined
	}

	isTransformed(id: string): boolean {
		return transformedId.test(id) && this.graph.isFollowed(id)
	}

	// some refusals surface only while it writes validators
	analyze(source: string, id: string): ModuleAnalysis {
		const { sites, diagnostics, dependencies } = this.precompile(source, id)
		return { sites, diagnostics, dependencies }
	}

	// its sites and diagnostics before validators are written
	analyzeSites(source: string, id: string): ModuleAnalysis {
		const module = this.add(id, source)
		// analyzed under the thread's configuration
		if (threadConfiguration) this.configuration ??= this.applyConfiguration()
		const analysis = this.analysisOf(module)
		analysis.diagnostics.push(...this.checkConfigOrder(module))
		return analysis
	}

	// a module another plugin writes, like a compiled Svelte component, is read but not precompiled
	checkUnwritten(source: string, id: string, mappings?: string): Diagnostic[] {
		if (this.mode !== "standalone" || !this.importsArk(source, id)) return []
		const module = this.add(id, source, mappings)
		this.configuration ??= this.applyConfiguration()
		const { sites, diagnostics } = this.analysisOf(module)
		for (const site of sites) {
			if (site.status === "island") continue
			diagnostics.push(
				this.diagnostic(
					module,
					site,
					"unsupported",
					`${module.snippetOf(site)} can't be precompiled in a module another plugin writes`,
					[
						`the build reads ${module.path} only once another plugin has written it, so it can't write a validator there`
					],
					unwrittenHint
				)
			)
		}
		return diagnostics
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
			const targetId = this.graph.host.resolve(specifier, id, () => {
				const specifiers = this.valueSpecifiersOf(source, id)
				return !specifiers || specifiers.has(specifier)
			})
			if (targetId && this.graph.isFollowed(targetId)) result.push(targetId)
		}
		return result
	}

	// what a module's text may import a value from, unlike an `import type`, or
	// undefined where it doesn't parse
	private valueSpecifiersOf(
		source: string,
		id: string
	): ReadonlySet<string> | undefined {
		const cached = this.valueSpecifiersById[id]
		if (cached?.[0] === source) return cached[1]
		const module = new SourceModule(id, source, this.graph.pathOf(id))
		let specifiers: Set<string> | undefined
		if (!module.parseErrors.length) {
			specifiers = new Set()
			walk(module.program, node => {
				const specifier =
					node.type === "ImportDeclaration" ?
						this.isKept(node, module) && node.source.value
					: node.type === "ExportNamedDeclaration" ?
						!!node.source &&
						node.exportKind !== "type" &&
						(!node.specifiers.length ||
							node.specifiers.some(
								specifier => specifier.exportKind !== "type"
							)) &&
						node.source.value
					: node.type === "ExportAllDeclaration" ?
						node.exportKind !== "type" && node.source.value
					:	loadedSpecifierOf(node)
				if (typeof specifier === "string") specifiers!.add(specifier)
				return true
			})
		}
		this.valueSpecifiersById[id] = [source, specifiers]
		return specifiers
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
				message: `${name} resolves to ${version}, but @ark/aot runs on ${own[1]}`,
				reasons: [
					`${version} at ${this.graph.pathOf(root)}, reached from ${this.graph.pathOf(importer)}`,
					`${own[1]} at ${this.graph.pathOf(own[0])}, which @ark/aot imports`
				],
				// a dependency's copy is deduped, not matched
				hint:
					name === "arktype" && !dependencyOf(importer) ?
						this.versionHintOf(root, version)
					:	versionHint
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
	readDependency(
		importer: string,
		host?: "Turbopack"
	): { errors: string[]; warnings: string[] } {
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
			!readsNodes(importer) &&
			!runsOnArktype(importer, this.graph.dependencies) &&
			!this.reportedDependencies.has(dependency) &&
			!this.graph.readsOnlyRuntime(importer)
		) {
			this.reportedDependencies.add(dependency)
			const message =
				host ?
					writeTurbopackDependencyMessage(dependency)
				:	writeStandaloneDependencyMessage(dependency)
			// what it reads off arktype throws at runtime, so the hint isn't allowUnsafe
			if (this.allowUnsafe) warnings.push(message)
			else errors.push(message)
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

	// each package.json naming a version the output depends on, so a cache
	// keyed by reads drops it after an upgrade
	get ownManifests(): string[] {
		return [
			...(["arktype", "@ark/schema", "@ark/util"] as const).map(
				name => this.ownPackageOf(name)[0]
			),
			this.packageOf("@ark/aot", fileURLToPath(import.meta.url))[0]
		].map(root => join(root, "package.json"))
	}

	// the @ark/aot released with a program's arktype, which arktype's package.json names
	private versionHintOf(root: string, version: string): string {
		const { arkAotVersion } = JSON.parse(
			this.graph.host.readFile(join(root, "package.json"))!
		)
		return arkAotVersion ?
				writeVersionHint(version, arkAotVersion)
			:	versionHint
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
	precompile(
		source: string,
		id: string,
		mappings?: string,
		// the bundle a scan read, whose validators lack what no read needs
		program?: string
	): PrecompiledModule {
		const written = this.writtenIn(program, id, source)
		if (written) return written
		const precompiled = this.precompileUnscanned(source, id, mappings, program)
		const usage =
			program === undefined ? undefined : this.usagesByProgram.get(program)
		// its units would be copies of those the bundle reads from one
		// function, which another validator could tell apart
		if (
			usage &&
			Object.keys(precompiled.modules).some(specifier =>
				usage.replaced.has(specifier)
			)
		) {
			precompiled.diagnostics.push({
				severity: "error",
				rule: "unsupported",
				file: id,
				start: 0,
				end: 0,
				line: 1,
				column: 0,
				message: writeUnscannedFlatMessage(this.graph.pathOf(id)),
				reasons: [],
				hint: undefined
			})
		}
		return precompiled
	}

	private precompileUnscanned(
		source: string,
		id: string,
		mappings: string | undefined,
		program: string | undefined
	): PrecompiledModule {
		const module = this.add(id, source, mappings)
		this.configuration ??= this.applyConfiguration()
		const { sites, diagnostics } = this.analysisOf(module)
		diagnostics.push(...this.checkConfigOrder(module))
		diagnostics.push(...this.copyDiagnosticsOf(module))
		const s = new MagicString(source)
		const prefix = prefixOf(source, id)
		const modules: Record<string, string> = {}
		// locals for virtual modules' exports, by specifier
		const imports: Record<string, Record<string, string>> = {}
		let issues: IssueFeatures | undefined
		if (this.mode === "standalone") {
			issues = this.writeStandalone(
				module,
				sites,
				s,
				prefix,
				modules,
				imports,
				diagnostics,
				this.usageIn(program, id, source)
			)
		} else this.writeCachedUnits(sites, modules, imports)
		this.insertImports(module, s, prefix, modules, imports)
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
			issues,
			foldedHelpers:
				this.mode === "standalone" ?
					this.foldedHelpersOf(module).map(([name]) => name)
				:	[]
		}
	}

	// each import of an arktype package the build found more than one copy of
	private copyDiagnosticsOf(module: SourceModule): Diagnostic[] {
		const result: Diagnostic[] = []
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
			if (!name || !(name in this.copiesByPackage)) continue
			for (const report of this.readCopies(name as ArkPackage, module.id)) {
				result.push(
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
		return result
	}

	// folds the module's sites into validators, then links its islands and
	// marks its progress; returns the issue features its errors can hold
	private writeStandalone(
		module: SourceModule,
		sites: Site[],
		s: MagicString,
		prefix: string,
		modules: Record<string, string>,
		imports: Record<string, Record<string, string>>,
		diagnostics: Diagnostic[],
		reads: ProgramReads
	): IssueFeatures {
		const [inputImports, written] = this.foldSites(
			module,
			sites,
			s,
			prefix,
			modules,
			imports,
			diagnostics,
			reads
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
		if (module.id === this.config) this.stampConfiguration(module, s)
		// an island's errors are arktype's, which may hold anything
		return module.islands.length ? anyIssues : written
	}

	// cache mode's units: one module per unit, which Types share, beside
	// arktype's builtin scopes
	private writeCachedUnits(
		sites: Site[],
		modules: Record<string, string>,
		imports: Record<string, Record<string, string>>
	): void {
		const roots = sites.flatMap(site => [
			...site.roots,
			...exportedRootsOf(site.value)
		])
		if (!roots.length) return
		// arktype's builtin scopes, exported with the first Type
		const intrinsicUnits = (this.intrinsicUnits ??= writePrecompiledUnits(
			Object.values($ark.kw).filter(value => hasArkKind(value, "root"))
		))
		const intrinsicTable = writeUnitTable(intrinsicUnits)
		const intrinsicSpecifier = `~arktype/units/${hashOf(intrinsicTable)}`
		modules[intrinsicSpecifier] = intrinsicTable
		imports[intrinsicSpecifier] = {}
		const units = writePrecompiledUnits(roots)
		for (const key in units) {
			if (key in intrinsicUnits) continue
			const specifier = `~arktype/units/${key}`
			modules[specifier] = writeUnitTable({ [key]: units[key] })
			imports[specifier] = {}
		}
	}

	// the virtual modules' imports, inlined or imported beside arktype so they run where it does
	private insertImports(
		module: SourceModule,
		s: MagicString,
		prefix: string,
		modules: Record<string, string>,
		imports: Record<string, Record<string, string>>
	): void {
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
		if (!inserted) return
		const arktypeImport = this.arktypeImportOf(module)
		if (!arktypeImport) return void s.append(inserted)
		const lineEnd = module.source.indexOf("\n", arktypeImport.end)
		const rest = module.source.slice(
			arktypeImport.end,
			lineEnd === -1 ? undefined : lineEnd
		)
		// minified code can continue the import's line
		s.prependLeft(arktypeImport.end, rest.trim() ? `${inserted}\n` : inserted)
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
				(!applied && $ark.cfg ?
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
						reasons: [configurationConflictReason],
						hint: writeConflictHint(this.graph.pathOf(this.config!))
					}
		}
		if (evaluated) {
			threadConfiguration = configuration
			if (!problem) configure(evaluated.value as never)
		}
		// so a later configure() throws, as after the first Type
		void ark.internal.cfg
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

	private planSites(
		module: SourceModule,
		sites: Site[],
		s: MagicString,
		prefix: string,
		diagnostics: Diagnostic[]
	): PlannedSites {
		const plan: PlannedSites = {
			namesBySite: new Map(),
			factoriesBySite: new Map(),
			exportsByName: {},
			folded: []
		}
		// sites arktype returned one Type for share a table
		const tablesByValue = new Map<unknown, number>()
		// e.g. a site in a Scope thunk, inside text a call replaces
		const replaced: [site: Site, spans: readonly Span[]][] = []
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
				plan.folded.push(site)
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
				this.refusePlanned(module, site, reasons, diagnostics)
				continue
			}
			// checked at each call, as a factory is
			if (site.introspection) factory ??= emptyFactory()
			else if (site.parseError) {
				plan.namesBySite.set(site, siteNameOf(site))
				// checks progress before throwing, as a factory does
				if (site.progress) {
					plan.factoriesBySite.set(site, {
						...emptyFactory(),
						inputs: [`${prefix}m`]
					})
				}
				replaced.push([site, []])
				continue
			}
			if (factory) {
				planFactory(plan, site, factory, tablesByValue)
				replaced.push([site, factory.spans])
			} else {
				const name = `v${siteNameOf(site)}`
				plan.namesBySite.set(site, name)
				plan.exportsByName[name] = site.value as never
				replaced.push([site, []])
			}
		}
		// a stand-in a site refused here reads is left to arktype with it
		for (const site of this.refuseStandInsRead(module, sites, diagnostics))
			unplan(plan, site)
		return plan
	}

	private refusePlanned(
		module: SourceModule,
		site: Site,
		reasons: string[],
		diagnostics: Diagnostic[]
	): void {
		// its ParseError fails the build already, unless allowUnsafe
		if (
			this.allowUnsafe ||
			!site.parseError ||
			!isEncodingError(site.parseError)
		)
			diagnostics.push(this.refuseWritten(module, site, reasons))
		// a site it refuses accepts nothing as a Standard Schema
		for (let i = diagnostics.length - 1; i >= 0; i--) {
			const span = this.schemaWarningSpans.get(diagnostics[i])
			if (span?.start === site.start && span.end === site.end)
				diagnostics.splice(i, 1)
		}
	}

	private foldSites(
		module: SourceModule,
		sites: Site[],
		s: MagicString,
		prefix: string,
		modules: Record<string, string>,
		imports: Record<string, Record<string, string>>,
		diagnostics: Diagnostic[],
		reads: ProgramReads
	): [
		inputImports: Record<string, Record<string, string>>,
		issues: IssueFeatures
	] {
		const plan = this.planSites(module, sites, s, prefix, diagnostics)
		const { namesBySite, factoriesBySite, folded } = plan
		const configured = this.configuredOf(module)
		const validators = this.writePlanned(
			module,
			sites,
			plan,
			configured,
			reads,
			diagnostics
		)
		for (const site of namesBySite.keys()) {
			if (standInKindOf(site.value))
				this.writtenStandIns.set(site.value, [site, module])
		}
		const folding: Folding = {
			module,
			s,
			prefix,
			validators,
			specifier: `~arktype/${hashOf(validators.code)}`,
			configured,
			modules,
			imports,
			inputImports: {},
			imported: new Set(),
			checking: new Set(validators.checking),
			kept: [],
			passed: [],
			read: [],
			fixedAt: Infinity
		}
		for (const [site, name] of namesBySite) {
			this.foldSite(site, name, factoriesBySite.get(site), folding)
			folded.push(site)
		}
		const { inputImports, kept, passed, read, fixedAt } = folding
		// fixed at the first droppable site, as arktype does at its first Type
		if (fixedAt !== Infinity && configured !== false) {
			const fixer = writeConfigFixer(configured)
			const fixerSpecifier = `~arktype/${hashOf(fixer)}`
			modules[fixerSpecifier] = fixer
			imports[fixerSpecifier] = { default: `${prefix}fixConfig` }
			s.appendLeft(fixedAt, `${prefix}fixConfig()\n`)
		}
		this.replaceArktypeImports(module, s, prefix, folded)
		keepImportedModules(module, folded, kept, passed, s)
		this.runtimesById[module.id] = runtimeModuleOf(
			module,
			folded,
			kept,
			read,
			Object.fromEntries(
				Object.entries(inputImports).map(([specifier, locals]) => [
					specifier,
					Object.keys(locals)
				])
			)
		)
		this.checkRuntimeImports(module, sites, diagnostics)
		diagnostics.sort((l, r) => l.start - r.start)
		return [inputImports, validators.issues]
	}

	// the config a module's validators are stamped with, where the build configures one
	private configuredOf(module: SourceModule): Configured {
		const { fingerprint, problem } = this.configuration!
		return (
			!this.configures ? false
			: fingerprint === undefined || problem ? undefined
			: {
					fingerprint,
					path: module.path,
					config: specifierOf(module.id, this.config!)
				}
		)
	}

	// written again without a stand-in a site the writer refuses reads
	private writePlanned(
		module: SourceModule,
		sites: Site[],
		plan: PlannedSites,
		configured: Configured,
		{ members, called, readsAllows, piped, combines, shapes }: ProgramReads,
		diagnostics: Diagnostic[]
	): StandaloneModules {
		const { namesBySite, exportsByName } = plan
		for (;;) {
			const refusalsByName: Record<string, string[]> = {}
			const validators =
				Object.keys(exportsByName).length ?
					writeValidators(
						exportsByName,
						{
							...this.standalone,
							members,
							called,
							readsAllows,
							piped,
							combines,
							shapes,
							configured,
							bake: write => this.bake(write),
							hoisted: this.isReachedEarly(module),
							// shadow mode calls what it compares
							values: !this.shadow,
							readOnLoad: [...namesBySite]
								.filter(([site]) => site.declarationStart !== undefined)
								.map(([, name]) => name)
						},
						refusalsByName,
						this.inline
					)
				:	noValidators
			for (const [site, name] of namesBySite) {
				if (!refusalsByName[name]) continue
				diagnostics.push(this.refuseWritten(module, site, refusalsByName[name]))
				unplan(plan, site)
			}
			const refused = this.refuseStandInsRead(module, sites, diagnostics)
			if (!refused.length) return validators
			for (const site of refused) unplan(plan, site)
		}
	}

	private foldSite(
		site: Site,
		name: string,
		factory: SiteFactory | undefined,
		folding: Folding
	): void {
		const { module, s, prefix, validators, configured } = folding
		// a folded factory may call a function it shares, passing its index
		const [exported, index] = validators.folds[name] ?? [name]
		// e.g. a size build's validator, created where it's read
		const created = validators.calls[name]
		const local =
			created ?
				`/* @__PURE__ */ ${prefix}_${created[0]}(${created
					.slice(1)
					.map(read => `${prefix}_${read}`)
					.join(", ")})`
			:	prefix + exported
		if (!folding.imported.has(exported)) {
			folding.imported.add(exported)
			importFolded(site, exported, local, created, folding)
		}
		const isValue = !!created || validators.values.includes(name)
		// a value's site reads only the inputs arktype's could throw reading
		const inputs =
			factory?.inputs.filter(
				input => !isValue || !factory.inert.includes(input)
			) ?? []
		for (const [specifier, name, local] of factory?.imports ?? []) {
			if (inputs.includes(local))
				(folding.inputImports[specifier] ??= {})[name] = local
		}
		folding.kept.push(...(factory?.spans ?? []))
		// a value's inputs evaluate in place, and a factory may ignore its own
		const readsPassed =
			!isValue &&
			!!factory?.bindings.length &&
			(folding.readsPassedBy ??= passedReaderOf(validators.code))(exported)
		for (const [input, binding] of factory?.bindings ?? []) {
			folding.passed.push(binding)
			if (readsPassed && inputs.includes(input)) folding.read.push(binding)
		}
		// droppable with its variable unless it throws or checks; a function's
		// only where it fixes no config and reads nothing
		const isPure =
			!site.parseError &&
			!site.introspection?.thrown &&
			!folding.checking.has(name) &&
			(site.declarationStart !== undefined ||
				(site.initializes &&
					configured === false &&
					!factory?.spans.length &&
					!inputs.length))
		if (isPure && site.declarationStart !== undefined)
			folding.fixedAt = Math.min(folding.fixedAt, site.declarationStart)
		const call = `${isPure ? "/* @__PURE__ */ " : ""}${
			this.shadow ?
				this.shadowCallOf(site, module, factory, local, index, prefix)
			:	`${local}(${index ?? ""}`
		}`
		if (!factory?.spans.length && !inputs.length)
			s.overwrite(site.start, site.end, isValue ? local : `${call})`)
		else {
			spliceSite(
				s,
				site,
				factory?.spans ?? [],
				inputs,
				isValue ? "("
				: index === undefined && !this.shadow ? call
				: `${call}, `,
				isValue ? `, ${local})` : ")"
			)
		}
	}

	// a shadow build loads its comparer first, beside whichever runtime is imported
	private replaceArktypeImports(
		module: SourceModule,
		s: MagicString,
		prefix: string,
		folded: Site[]
	): void {
		if (this.shadow) {
			if (folded.length) {
				s.prependLeft(
					firstStatementOf(module.program).start,
					this.shadowContract ?
						`import { shadowUnder as ${prefix}shadowUnder } from "@ark/aot/shadow"\nfunction ${prefix}shadow(...args) { return ${prefix}shadowUnder(${this.shadowContract}, ...args) }\n`
					:	`import { shadow as ${prefix}shadow } from "@ark/aot/shadow"\n`
				)
			}
			return
		}
		// linkIslands leaves configure()'s import to the runtime
		const linked = module.islands.filter(
			island =>
				!this.configureCallsOf(module).some(call => contains(island, call))
		)
		pruneArktypeImports(module, [...folded, ...linked], s)
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
		sites: Site[],
		diagnostics: Diagnostic[]
	): void {
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
					exportNameOf(specifier.imported) in arktypeRuntime ||
					// reported at each call
					exportNameOf(specifier.imported) in errorReaders
				)
					continue
				const read = module.scopes.bindingsById
					.get(specifier.local)
					?.references.find(({ id }) => !spans.some(span => contains(span, id)))
				if (!read) continue
				// reported by the analysis as used outside a site, reported once here
				const outside = `\`${specifier.local.name}\` is used outside a precompiled site`
				for (let i = diagnostics.length - 1; i >= 0; i--)
					if (diagnostics[i].message === outside) diagnostics.splice(i, 1)
				diagnostics.push(
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
		// e.g. a Standard Schema's morph, holding its validate
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

	// what a Scope's definitions hold for arktype to call as an alias resolves,
	// so not yet known as called
	private thunksOf(site: Site): unknown[] {
		if (!hasArkKind(site.value, "scope")) return []
		return thunksIn(this.interpreter.definitionsByScope.get(site.value))
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
		const thunks = this.thunksOf(site)
		for (const reference of site.references) {
			const text = module.snippetOf(reference)
			const hole = holesByValue.get(reference.value)
			// e.g. beside a Standard Schema's morph, where nothing the site reads is dropped
			if (hole && site.called.includes(hole) && !dropped.has(hole.value))
				continue
			// a standalone Scope never calls one, as its key doesn't hold them
			if (hole && !held.includes(hole.value) && thunks.includes(hole.value))
				continue
			// a dropped class decided which branch survived
			if (
				hole &&
				!held.includes(hole.value) &&
				hole.kind !== "class" &&
				!dropped.has(hole.value)
			) {
				reasons.push(
					site.arktypeArguments.some(arg => holdsValidate(arg, hole.value)) ?
						writeUnprecompilableMessage(
							`the Standard Schema holding ${labelOf(module, reference)}`
						)
					:	`${labelOf(module, reference)} is wrapped in a function arktype creates, which a standalone validator can't create yet`
				)
				continue
			}
			const holes = hole ? [hole.value] : keyOf(reference.value as Foldable)[1]
			// a Type holding a Standard Schema holds the morph arktype wrapped its
			// validate in, which no site received, so it can't be passed or baked
			if (
				!hole &&
				holes.some(
					value =>
						typeof value === "function" && !this.interpreter.standIns.has(value)
				)
			) {
				reasons.push(
					writeUnprecompilableMessage(`the Standard Schema \`${text}\` holds`)
				)
				continue
			}
			if (
				(site.introspection || (hole && dropped.has(hole.value))) &&
				!holes.some(value => calledByChecks.has(value)) &&
				(hole ?
					reference.isOwnHole
				:	reference.isCreated || !this.mustRun(reference, module))
			) {
				for (const value of holes) unchecked.add(value)
				continue
			}
			// a Type without holes is written into the site
			if (
				holes.length &&
				this.isIslandValue(
					reference.value,
					site,
					reference.fixedBy && [reference.fixedBy, module]
				)
			) {
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
		const supplied = new Set<unknown>()
		for (const input of site.inputs) {
			if (input.path.length || !passed.has(input.value))
				this.suppliedHolesOf(input.value, supplied)
		}
		for (const value of held) {
			if (read.has(value) || unchecked.has(value) || supplied.has(value))
				continue
			// arktype's own value, which the emitter handles
			const source = this.interpreter.sourceOf(value)
			if (!source) continue
			const [node, origin] = source
			reasons.push(
				`the site's value holds ${labelOf(origin, node)}, which ${holesByValue.has(value) ? "it reads outside its own source" : "its factory can't receive"}`
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
			const island = reads.find(input =>
				this.isIslandValue(input.value, site, this.originOf(input, module))
			)
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
			if (this.isSetBefore(reads[0], site, module))
				factory.inert.push(passedAs.expression)
		}
	}

	// imported where no cycle runs the module first, or declared above a site its top level runs
	private isSetBefore(input: Input, site: Site, module: SourceModule): boolean {
		const binding =
			input.kind === "local" ? this.bindingsByInput.get(input) : undefined
		if (!binding || binding.kind === "import") return !this.isOnCycle(module)
		return (
			site.declarationStart !== undefined &&
			binding.scope === module.scopes.root &&
			(binding.kind === "var" ||
				binding.kind === "function" ||
				((binding.kind === "const" ||
					binding.kind === "let" ||
					binding.kind === "class") &&
					binding.declaration.end <= site.start))
		)
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

	// the holes a factory reads from an input, as compareInput does: a Type's,
	// and a literal's functions
	private suppliedHolesOf(
		value: unknown,
		holes: Set<unknown>,
		seen = new Set<unknown>()
	): Set<unknown> {
		if (!hasDomain(value, "object") || seen.has(value)) return holes
		seen.add(value)
		if (
			hasArkKind(value, "root") ||
			hasArkKind(value, "module") ||
			hasArkKind(value, "scope") ||
			hasArkKind(value, "generic")
		)
			for (const hole of keyOf(value)[1]) holes.add(hole)
		else if (typeof value === "function") {
			if (this.standInOf(value)?.kind === "function") holes.add(value)
		} else if (isPlainLiteral(value)) {
			for (const k of Reflect.ownKeys(value))
				this.suppliedHolesOf(Reflect.get(value, k), holes, seen)
		}
		return holes
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
	private isIslandValue(
		value: unknown,
		site: Site,
		origin: [Binding, SourceModule] | undefined
	): boolean {
		if (!hasArkKind(value, "root")) return false
		// a binding a site initialized holds that site's Type, not one equal to it
		if (origin && this.isCreatedBy(origin[0], value))
			return isInIsland(origin[0].declaration, origin[1])
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

	private originOf(
		input: Input,
		module: SourceModule
	): [Binding, SourceModule] | undefined {
		if (input.path.length) return
		if (input.kind === "local")
			return [this.bindingsByInput.get(input)!, module]
		const target = this.graph.exportOf(
			this.graph.moduleOf(input.file!) as SourceModule,
			input.name
		)
		return target.kind === "binding" ?
				[target.binding, target.module]
			:	undefined
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
		const importing: PassedInput[] = []
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
			) {
				importing.push({
					expression: binding.name,
					label: binding.name,
					binding
				})
			}
		}
		// the binding the site names, where another imports the value too, as
		// through a re-export, so a mock of what the site reads reaches it
		if (importing.length) {
			return (
				importing.find(({ binding }) =>
					binding!.references.some(({ id }) => contains(site, id))
				) ?? importing[0]
			)
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
		reasons = site.reasons,
		// why it's refused, whose innermost value the hint names
		dynamic?: DynamicValue
	): Diagnostic {
		const keyed = keyedMethodOf(site)
		return this.diagnostic(
			module,
			site,
			rule,
			`${module.snippetOf(site)} ${rule === "unsupported" ? "can't be precompiled yet" : "cannot be precompiled"}`,
			reasons.map(reason => this.sourceNamed(reason, site, module)),
			keyed && rule === "unsupported" ?
				writeKeyedHint(module.snippetOf(site), this.keyHoldingOf(site, module))
			:	(configuredHintOf(reasons) ??
					(rule === "R1" && dynamic ?
						writeStaticHint(innermostSnippetOf(dynamic, site, module))
					:	undefined))
		)
	}

	// e.g. `plan` for `const Plan = T.default("free")` read as `{ plan: Plan }`
	private keyHoldingOf(site: Site, module: SourceModule): string | undefined {
		let key: string | undefined
		walk(module.program, node => {
			if (key !== undefined) return false
			if (
				node.type !== "VariableDeclarator" ||
				node.init?.start !== site.start ||
				node.init.end !== site.end
			)
				return true
			const property = module.scopes.bindingsById
				.get(node.id)
				?.references.find(
					({ id }) => id.parent?.type === "Property" && id.parent.value === id
				)?.id.parent
			if (property?.type === "Property" && !property.computed)
				key = module.snippetOf(property.key)
			return false
		})
		return key
	}

	// so returned sites agree with diagnostics
	private refuseWritten(
		module: SourceModule,
		site: Site,
		reasons: string[]
	): Diagnostic {
		const diagnostic = this.refusal(
			module,
			site,
			reasons.some(isUnstaticHelperReason) ? "R1" : "unsupported",
			reasons
		)
		refuse(site, reasons)
		return diagnostic
	}

	private refuseThrown(
		module: SourceModule,
		site: Site,
		e: unknown
	): Diagnostic {
		refuse(site, reasonsOf(e))
		return this.refusal(
			module,
			site,
			"R1",
			site.reasons,
			e instanceof DynamicValue ? e : undefined
		)
	}

	// a factory compares by definition, which misses what calls return
	private incomparableReasonsOf(site: Site, module: SourceModule): string[] {
		const reads: [value: unknown, text: string][] = [
			...site.references
				.filter(reference => !reference.fixedBy)
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

	// errors and mutatesInput a Scope configures must match the build's
	private configuredReasonsOf(site: Site): string[] {
		const value = createdBy(site)
		if (this.mode !== "standalone" || !value) return []
		const roots =
			hasArkKind(value, "scope") ? exportedRootsOf(value) : rootsIn(value)
		const builtErrors = this.errors ?? "all"
		const errors = roots
			.map(root => root.$.config.errors)
			.find(
				errors =>
					errors !== undefined &&
					errors !== builtErrors &&
					errors !== $ark.config.errors
			)
		const builtMutatesInput = this.mutatesInput ?? false
		const mutatesInput = roots
			.map(root => root.$.config.mutatesInput)
			.find(
				mutatesInput =>
					mutatesInput !== undefined &&
					mutatesInput !== builtMutatesInput &&
					mutatesInput !== $ark.config.mutatesInput
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
		const keyed = keyedMethodOf(site)
		const result =
			site.parseError || isFoldable(site.value) || site.introspection ? []
			: keyed ?
				[
					`.${keyed}() gives the definition of an object's key, not a Type, so it's precompiled where an object holds it`
				]
			:	["its value is not a Type, Module, Scope, Generic or TypedFn"]
		if (result.length && site.unavailableRead && !keyed) {
			result.push(
				`it reads \`${site.unavailableRead}\`, which a standalone validator lacks`
			)
		}
		// a thrower checks nothing, though the error can depend on any read
		for (const hole of site.holes) {
			const isReceived = !hole.isCalledAtDefinition && hole.kind !== "opaque"
			if (isReceived && !site.parseError) continue
			const holeModule = this.graph.moduleOf(hole.file) as SourceModule
			const label = labelOf(holeModule, hole)
			if (hole.isCalledAtDefinition) result.push(`arktype calls ${label}`)
			else if (hole.kind !== "opaque")
				result.push(`${label} is read by a definition that throws a ParseError`)
			else {
				const dynamic = this.standInOf(hole.value)?.dynamic
				result.push(
					`${label} ${dynamic ? "is not static, so the site holds it" : "is held"} as a Standard Schema, which a standalone validator can't receive yet`,
					...(dynamic ? chainOf(dynamic) : [])
				)
			}
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
		if (!analysis) {
			this.analyzing.add(module)
			try {
				this.analysesByModule.set(module, (analysis = this._analyze(module)))
			} finally {
				this.analyzing.delete(module)
			}
		}
		return {
			sites: analysis.sites.map(site => ({ ...site })),
			diagnostics: [...analysis.diagnostics],
			dependencies: analysis.dependencies
		}
	}

	private _analyze(module: SourceModule): ModuleAnalysis {
		if (module.parseErrors.length) return this.unparsedAnalysisOf(module)
		const candidates = this.candidatesOf(module)
		const settled: SiteCandidate[] = []
		const settledRangesByFn = new Map<FunctionNode | undefined, Set<string>>()
		const candidatesBySite = new Map<Site, SiteCandidate>()
		const analyzing: Analyzing = {
			module,
			sites: [],
			diagnostics: [],
			configureStart: this.configureStartOf(module)
		}
		const { sites, diagnostics } = analyzing
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
				const refused = this.refuseAnalyzed(site, candidate, analyzing)
				if (refused) {
					sites.push(refused)
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
		if (this.mode === "standalone") {
			this.scopeReadsByModule.set(
				module,
				scopeReadsOf(module, candidates, this.graph)
			)
			this.refuseStandInsRead(module, sites, diagnostics)
		}
		diagnostics.push(...this.checkConfiguration(module))
		let quiet: FunctionNode[] = []
		if (this.mode === "standalone") {
			quiet = this.quietFunctionsOf(module, sites)
			diagnostics.push(
				...this.checkStandalone(module, candidates, settled),
				...this.checkIslands(module, sites),
				...this.checkDynamicImports(module),
				...this.checkHelperReads(module, sites, quiet)
			)
		}
		// nothing runs what they hold unless the build reports it
		const isQuiet = (span: Span) => quiet.some(fn => contains(fn, span))
		return {
			sites: sites
				.filter(site => site.status === "accepted" || !isQuiet(site))
				.sort((l, r) => l.start - r.start),
			diagnostics: diagnostics
				.filter(
					diagnostic => diagnostic.file !== module.id || !isQuiet(diagnostic)
				)
				.sort((l, r) => l.start - r.start),
			dependencies: this.graph.dependenciesOf(module.id)
		}
	}

	private unparsedAnalysisOf(module: SourceModule): ModuleAnalysis {
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

	// a finalized site the build still refuses: a stand-in passed to code it
	// can't see, or a Type created before configure() runs or under a
	// configuration it can't apply
	private refuseAnalyzed(
		site: Site,
		candidate: SiteCandidate,
		analyzing: Analyzing
	): Site | undefined {
		const { module, diagnostics } = analyzing
		const node = candidate.state.node
		const unseen =
			this.mode === "standalone" &&
			site.status === "accepted" &&
			standInKindOf(candidate.state.value)
		if (
			unseen &&
			this.graph.reachesUnseen(node, module, this.isReadableExport)
		) {
			const reasons = [
				`it's passed to code the build can't see, which may read what a precompiled ${unseen} lacks`
			]
			diagnostics.push(this.refusal(module, site, "unsupported", reasons))
			return refuse(site, reasons)
		}
		if (
			site.status !== "rejected" &&
			!candidate.fn &&
			site.start < analyzing.configureStart
		) {
			const message = `${module.snippetOf(node)} is created while the config module loads, before configure() runs`
			diagnostics.push(this.diagnostic(module, node, "R3", message))
			// cache mode leaves it to arktype, which creates it as the program does
			if (this.mode === "standalone") return refuse(site, [message])
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
					analyzing.unappliedAt ?
						[`for the reasons given at ${analyzing.unappliedAt}`]
					:	refusal,
					analyzing.unappliedAt ? false : configuration.hint
				)
			)
			analyzing.unappliedAt ??= module.positionOf(node)
			return refuse(site, [message, ...refusal])
		}
	}

	// a precompiled Scope or Generic lacks its members, so a rejected site
	// reading it is left to arktype with it
	private refuseStandInsRead(
		module: SourceModule,
		sites: Site[],
		diagnostics: Diagnostic[]
	): Site[] {
		const standIns = new Map<unknown, Site>()
		for (const site of sites) {
			if (site.status === "accepted" && standInKindOf(site.value))
				standIns.set(site.value, site)
		}
		const refused: Site[] = []
		const leave = (
			read: Site,
			reader: Span,
			from: SourceModule,
			name: string
		) => {
			const reasons = [
				`${from.snippetOf(reader)} (${from.positionOf(reader)}) reads \`${name}\` but isn't precompiled, so arktype must define \`${name}\` for it`
			]
			diagnostics.push(
				this.diagnostic(
					module,
					read,
					"unsupported",
					`${module.snippetOf(read)} is left to arktype`,
					reasons,
					false
				)
			)
			refused.push(refuse(read, reasons))
		}
		for (const [value, read] of standIns) {
			const reader = this.dynamicStandIns.get(value)
			if (reader) leave(read, ...reader)
		}
		const readers: Span[] = [
			...sites.filter(site => site.status === "rejected"),
			...(this.scopeReadsByModule.get(module) ?? []).map(([node]) =>
				spanOfScopeRead(node)
			)
		]
		for (const site of readers) {
			for (const [binding, value, isHeld] of this.standInsReachedBy(
				site,
				module,
				sites
			)) {
				const read = standIns.get(value)
				if (read) {
					if (read.status !== "rejected")
						leave(read, site, module, binding.name)
				} else if (!this.writtenStandIns.has(value)) {
					// a Scope this module's refused site defines is arktype's
					// already, so recording it refuses nothing
					this.dynamicStandIns.set(value, [site, module, binding.name])
				} else {
					this.reportWrittenStandInRead(
						site,
						module,
						binding.name,
						value,
						isHeld,
						diagnostics
					)
				}
			}
		}
		return refused
	}

	// a refused site reads a Scope or Generic a module already precompiled
	private reportWrittenStandInRead(
		site: Span,
		module: SourceModule,
		name: string,
		value: unknown,
		isHeld: boolean,
		diagnostics: Diagnostic[]
	): void {
		const [source, origin] = this.writtenStandIns.get(value)!
		const message = `${module.snippetOf(site)} reads \`${name}\`, which the build replaced with an object that lacks its members`
		// reported once, as each pass over the module's sites finds it
		if (diagnostics.some(d => d.start === site.start && d.message === message))
			return
		diagnostics.push(
			this.diagnostic(
				module,
				site,
				"unsupported",
				message,
				[
					`\`${name}\` ${isHeld ? "holds" : "is"} ${origin.snippetOf(source)} (${origin.positionOf(source)}), a ${standInKindOf(value)} precompiled before ${module.snippetOf(site)} was refused`
				],
				`Put // @ark-runtime on the line before ${origin.snippetOf(source)}, so arktype defines it at runtime, or build with runtime: "arktype".`,
				"error"
			)
		)
	}

	// each Scope or Generic a refused site may read, with the binding the site
	// names: the value of each binding referenced inside it, whatever a
	// container it holds holds, and the same through the declarations of the
	// local bindings those read, as `chosen` in `const chosen = flag ? H.alt :
	// H.$` reads `H`, whose value holds both
	private standInsReachedBy(
		site: Span,
		module: SourceModule,
		sites: Site[]
	): [named: Binding, value: unknown, isHeld: boolean][] {
		const result: [Binding, unknown, boolean][] = []
		const bindings = new Set<Binding>()
		const values = new Set<unknown>()
		// the span of a function reached, whose sites a call creates
		const spans: [Span, SourceModule, named?: Binding][] = [[site, module]]
		const visit = (value: unknown, named: Binding, isHeld: boolean) => {
			if (values.has(value)) return
			values.add(value)
			if (standInKindOf(value)) result.push([named, value, isHeld])
			else if (isPlainContainer(value)) {
				for (const key of Reflect.ownKeys(value))
					visit(Reflect.get(value, key), named, true)
			} else if (typeof value === "function") {
				const source = this.interpreter.sourceOf(value)
				if (source) spans.push([source[0], source[1], named])
			}
		}
		// e.g. `ns.held.s` for `import * as ns`, whose exports the binding's value doesn't hold
		const modules = new Set<SourceModule>()
		const visitExports = (exporting: SourceModule, named: Binding) => {
			if (modules.has(exporting)) return
			modules.add(exporting)
			for (const name in exporting.scopes.exportsByName) {
				const target = this.graph.exportOf(exporting, name)
				if (target.kind === "binding" || target.kind === "expression")
					visit(this.interpreter.exportValue(target).value, named, true)
				else if (target.kind === "namespace") visitExports(target.module, named)
			}
			for (const specifier of exporting.scopes.starExports) {
				const target = this.graph.resolve(specifier, exporting)
				if (target instanceof SourceModule) visitExports(target, named)
			}
		}
		while (spans.length) {
			const [span, from, through] = spans.pop()!
			// e.g. `scope(...)` in `const make = () => scope(...)`, for `make().type(...)`
			const sitesWithin =
				from === module ? sites : (
					(this.analysesByModule.get(from)?.sites ??
					(this.analyzing.has(from) ?
						[]
					:	this.analyzeSites(from.source, from.id).sites))
				)
			for (const inner of sitesWithin) {
				if (
					inner.status === "accepted" &&
					inner.start >= span.start &&
					inner.end <= span.end &&
					through
				)
					visit(inner.value, through, true)
			}
			if (from !== module) continue
			for (const { binding, id } of module.scopes.references) {
				if (
					!binding ||
					id.start < span.start ||
					id.end > span.end ||
					bindings.has(binding)
				)
					continue
				bindings.add(binding)
				const named = through ?? binding
				visit(
					this.interpreter.valueOfBinding(binding, module),
					named,
					named !== binding
				)
				if (binding.kind === "import") {
					const target = this.graph.importOf(binding, module)
					if (target.kind === "namespace") visitExports(target.module, named)
				} else if (binding.kind !== "param")
					spans.push([binding.declaration, module, named])
			}
		}
		return result
	}

	// a helper whose calls the build folds, and each function the program
	// reaches only through sites, which run what they read only at build
	private quietFunctionsOf(
		module: SourceModule,
		sites: Site[]
	): FunctionNode[] {
		const quiet: FunctionNode[] = []
		const unread: [FunctionNode, Binding][] = []
		for (const binding of module.scopes.bindingsById.values()) {
			const fn = functionOfBinding(binding, module)
			if (!fn) continue
			if (this.calledParamOf(fn, module)) quiet.push(fn)
			else if (!binding.exportNames.length) unread.push([fn, binding])
		}
		for (let grew = true; grew; ) {
			grew = false
			for (const [fn, binding] of unread) {
				if (
					quiet.includes(fn) ||
					!binding.references.every(reference =>
						isReachedOnlyAtBuild(reference.id, sites, quiet)
					)
				)
					continue
				quiet.push(fn)
				grew = true
			}
		}
		return quiet
	}

	// e.g. `[10, 20].map(text)`, which calls text where the build can't fold it
	private checkHelperReads(
		module: SourceModule,
		sites: Site[],
		quiet: FunctionNode[]
	): Diagnostic[] {
		const result: Diagnostic[] = []
		const report = (read: Node, fn: FunctionNode, called: CalledParam) => {
			const name = inferredNameOf(fn)
			result.push(
				this.diagnostic(
					module,
					read,
					"R1",
					`\`${module.snippetOf(read)}\` is read outside a call the build precompiles`,
					[
						`${called.module.snippetOf(called.read)} (${called.module.positionOf(called.read)}) reads \`${called.param.name}\`, a parameter of ${inferredNameOf(called.param.declaration as FunctionNode) || "a function"}, so the build precompiles it at each call to ${name}`
					],
					writeHelperCallHint(name)
				)
			)
		}
		for (const reference of module.scopes.references) {
			const binding = reference.binding
			if (
				!binding ||
				reference.isWrite ||
				(binding.kind !== "import" && !functionOfBinding(binding, module))
			)
				continue
			let read: Node = reference.id
			const [operand, parent] = operatorOf(read)
			const target =
				binding.kind === "import" ?
					this.graph.importOf(binding, module)
				:	undefined
			if (target?.kind === "namespace") {
				if (parent?.type === "MemberExpression" && parent.object === operand)
					read = parent
				// e.g. `Object.values(fields)`, reading each helper it exports
				else if (read.parent?.type !== "ExportSpecifier") {
					const [helper] = this.foldedHelpersOf(target.module)
					if (helper && !isReachedOnlyAtBuild(read, sites, quiet))
						report(read, helper[1], helper[2])
					continue
				}
			}
			const fn = this.graph.functionOf(read, module)
			const called = fn && this.calledParamOf(...fn)
			if (
				called &&
				read.parent?.type !== "ExportSpecifier" &&
				!isReachedOnlyAtBuild(read, sites, quiet)
			)
				report(read, fn[0], called)
		}
		// e.g. `import("./fields.ts")`, whose namespace holds each helper
		walk(module.program, node => {
			const source = loadedSpecifierOf(node)
			const target =
				typeof source === "string" ?
					this.graph.resolve(source, module)
				:	undefined
			const [helper] =
				target instanceof SourceModule ? this.foldedHelpersOf(target) : []
			if (helper && !isReachedOnlyAtBuild(node, sites, quiet))
				report(node, helper[1], helper[2])
			return true
		})
		return result
	}

	// e.g. `text` for `export const text = (max: number) => type(...)`, which
	// an unprecompiled module can't call
	private foldedHelpersOf(
		module: SourceModule,
		seen = new Set<SourceModule>()
	): [name: string, fn: FunctionNode, called: CalledParam][] {
		seen.add(module)
		const result: [string, FunctionNode, CalledParam][] = []
		for (const name in module.scopes.exportsByName) {
			const target = this.graph.exportOf(module, name)
			const fn =
				target.kind === "binding" &&
				functionOfBinding(target.binding, target.module)
			const called = fn && this.calledParamOf(fn, target.module)
			if (called) result.push([name, fn, called])
		}
		for (const specifier of module.scopes.starExports) {
			const target = this.graph.resolve(specifier, module)
			if (!(target instanceof SourceModule) || seen.has(target)) continue
			for (const helper of this.foldedHelpersOf(target, seen)) {
				if (
					helper[0] !== "default" &&
					!(helper[0] in module.scopes.exportsByName)
				)
					result.push(helper)
			}
		}
		return result
	}

	// registered first, so each site runs once however it's reached
	private readsOf(module: SourceModule): SiteRead[] {
		const cached = this.readsByModule.get(module)
		if (cached) return cached
		const reads = findSites(module, this.graph, this.mode === "standalone")
		this.readsByModule.set(module, reads)
		for (const { candidate } of reads) {
			if (candidate && !candidate.callee)
				this.interpreter.sitesByNode.set(candidate.state.node, candidate.state)
		}
		return reads
	}

	// with calls to helpers, which are sites only where the helper needs them
	private readCandidatesOf(module: SourceModule): SiteCandidate[] {
		const cached = this.readCandidatesByModule.get(module)
		if (cached) return cached
		const candidates = filterSites(
			this.readsOf(module),
			module,
			this.interpreter
		)
		this.readCandidatesByModule.set(module, candidates)
		return candidates
	}

	private candidatesOf(module: SourceModule): SiteCandidate[] {
		const cached = this.candidatesByModule.get(module)
		if (cached) return cached
		const candidates = this.readCandidatesOf(module).filter(
			candidate => !candidate.callee || this.foldsCallsTo(candidate)
		)
		this.candidatesByModule.set(module, candidates)
		return candidates
	}

	private foldsCallsTo(call: SiteCandidate): boolean {
		if (!this.calledParamOf(...call.callee!)) return false
		this.interpreter.sitesByNode.set(call.state.node, call.state)
		return true
	}

	// e.g. `max` in `const text = (max: number) => type(`string <= ${max}`)`,
	// known only at each call, so each is folded
	private calledParamOf(
		fn: FunctionNode,
		module: SourceModule
	): CalledParam | undefined {
		if (this.calledParamsByFn.has(fn)) return this.calledParamsByFn.get(fn)
		// a helper reaching itself is judged by its other reads
		this.calledParamsByFn.set(fn, undefined)
		// a declaration's kind is its binding's
		const binding = bindingOfFunction(fn, module)
		if (
			this.mode !== "standalone" ||
			!staticBodyOf(fn) ||
			// a runtime island, which arktype defines at each call
			module.islands.some(island => contains(fn, island)) ||
			!mayReturnArk(
				binding ?
					this.graph.bindingKindOf(binding, module)
				:	this.graph.kindOf(fn, module)
			)
		)
			return
		let result: CalledParam | undefined
		const candidates = this.readCandidatesOf(module)
		for (const candidate of candidates) {
			if (
				!contains(fn, candidate.state.node) ||
				(candidate.callee && !this.foldsCallsTo(candidate))
			)
				continue
			if (!(candidate.isSite ??= this.settle(candidate))) continue
			const param = paramOf(rejectionOf(candidate.state))
			if (param) {
				result = { module, read: candidate.state.node, param }
				break
			}
		}
		// e.g. `T.or("null")` in `<t>(T: Type<t>) => T.or("null")`
		walk(fn, node => {
			if (
				result ||
				candidates.some(candidate => contains(candidate.state.node, node))
			)
				return false
			const [read, object, isUnsure] =
				(node.type === "MemberExpression" &&
					!isWriteTarget(node) &&
					this.graph.unavailableReadOf(
						node,
						module,
						this.unsureLackedMembers
					)) ||
				[]
			const id = object && unwrapChain(object)
			const binding =
				id?.type === "Identifier" ?
					module.scopes.byId.get(id)?.binding
				:	undefined
			if (
				typeof read === "string" &&
				isComposingMember(read) &&
				binding?.kind === "param" &&
				binding.declaration === fn &&
				!isInIsland(node, module) &&
				// arktype's own packages are the runtime, as checkStandalone reads them
				!(
					isUnsure &&
					arkPackageName.test(this.graph.packageNameOf(module.id) ?? "")
				)
			)
				result = { module, read: node, param: binding }
			return !result
		})
		this.calledParamsByFn.set(fn, result)
		return result
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
		const binding = module.scopes.byId.get(node)?.binding
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
			initializes: !!initializedOf(node),
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
		const dynamic = this.receiveValue(site, state, module)
		if (dynamic) return refuseDynamic(site, dynamic)
		const runsFirst = runsBeforeBody(state.node, module)
		const unreadable = this.receiveReads(site, candidate, module, runsFirst)
		if (unreadable) return refuseDynamic(site, unreadable)
		this.receiveHelpers(site, state, module, runsFirst)
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
		this.collectReferences(site, state, module, runsFirst)
		return site
	}

	// what the site evaluated to, or why the build refuses it
	private receiveValue(
		site: Site,
		state: SiteState,
		module: SourceModule
	): DynamicValue | undefined {
		const checks = new Set<DefaultCheck>()
		// a thunk alias is a pair, and a check a triple
		for (const reached of state.reached) {
			if (reached.length === 2) site.aliases.push(reached)
			else checks.add(reached)
		}
		const dynamic = rejectionOf(state)
		if (dynamic) return dynamic
		if (state.error instanceof ParseError) {
			// e.g. an island's, whose thrower couldn't check what it reads
			if (this.interpreter.parseErrorSites.get(state.error) !== state) {
				return new DynamicValue(
					module,
					state.node,
					`\`${module.snippetOf(state.node)}\` reads a definition that throws a ParseError`
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
			return new DynamicValue(
				module,
				read,
				`\`${module.snippetOf(read)}\` is the ${kindNameOf(value)} at ${refused[1].positionOf(refused[0])}, which the build refuses`
			)
		}
		for (const [binding, declaring] of state.trace.readFirst) {
			if (declaring !== module) continue
			const at = progressOf(binding, module)
			if (at > (site.progress?.[0] ?? 0)) site.progress = [at, binding.name]
		}
	}

	// the module a read's root is imported from, where the site's module imports it
	private importerOf(
		root: Read["root"],
		module: SourceModule
	): SourceModule | undefined {
		return root.kind === "export" && root.importer === module ?
				(this.graph.moduleOf(root.file) as SourceModule)
			:	undefined
	}

	// the site's inputs and holes, or the read that keeps it from having them
	private receiveReads(
		site: Site,
		candidate: SiteCandidate,
		module: SourceModule,
		runsFirst: boolean
	): DynamicValue | undefined {
		const { state } = candidate
		const introspected = site.introspection?.type
		for (const read of state.trace.reads) {
			// introspection needs the Type only where a mock can replace it
			if (
				read.value === introspected &&
				!read.path.length &&
				!this.checkHelpers &&
				!this.interpreter.isCheckedAtCreation(introspected) &&
				this.isInertRead(
					introspected,
					this.importerOf(read.root, module),
					module,
					runsFirst
				)
			)
				continue
			const input = this.inputOf(read, candidate, module)
			if (input instanceof DynamicValue) return input
			if (!site.inputs.some(existing => isCoveredBy(input, existing)))
				site.inputs.push(input)
		}
		for (const value of state.holes) {
			const isCalled = !site.parseError && !isHeld(value, this.interpreter)
			const hole = this.holeOf(value, candidate, module)
			if (!isCalled) {
				if (hole instanceof DynamicValue) return hole
				site.holes.push(hole)
			} else if (!(hole instanceof DynamicValue) && hole.kind === "function")
				site.called.push(hole)
		}
		site.holes.sort((l, r) => l.start - r.start)
	}

	// each exported function the site read, which a mock can replace
	private receiveHelpers(
		site: Site,
		state: SiteState,
		module: SourceModule,
		runsFirst: boolean
	): void {
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
				!this.isInertRead(
					value,
					this.importerOf(root, module),
					module,
					runsFirst
				)
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
	}

	// each read of a value the site's call must still see
	private collectReferences(
		site: Site,
		state: SiteState,
		module: SourceModule,
		runsFirst: boolean
	): void {
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
					fixedBy: this.fixedByOf(read, value, isImportInput, module),
					isOwnHole: this.interpreter.isOwnHole(node, value, module),
					isInert: this.isInertRead(
						value,
						this.importedFromOf(node, module),
						module,
						runsFirst
					),
					isCreated: state.requests.some(
						([request, declaring]) =>
							declaring === module && contains(read, request)
					)
				})
			}
		}
		site.references.sort((l, r) => l.start - r.start)
	}

	// e.g. `$` in `const $ = scope(…)`
	private fixedByOf(
		read: Node,
		value: unknown,
		isImportInput: boolean,
		module: SourceModule
	): Binding | undefined {
		if (isImportInput || read.type !== "Identifier") return
		const binding = module.scopes.byId.get(read)?.binding
		return this.isCreatedBy(binding, value) ? binding : undefined
	}

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
			callee.type === "Identifier" ? module.scopes.byId.get(callee) : undefined
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
					module.scopes.byId.get(child)?.binding
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
				:	`\`${origin.snippetOf(node)}\` is passed as a value rather than a definition, so it must be static`,
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
					: "R1",
					site.reasons,
					rejection
				)
			]
		}
		const result: Diagnostic[] = []
		if (
			site.parseError &&
			!(
				this.mode === "standalone" &&
				!isEncodingError(site.parseError) &&
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
					:	withAllowUnsafe(hintsByRule.parse),
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
			const warning = this.diagnostic(
				origin,
				node,
				"R4",
				`\`${origin.snippetOf(node)}\` is not static, so the site accepts it only as a Standard Schema that is not a Type`,
				chainOf(standIn.dynamic),
				this.opaqueHintOf(standIn.dynamic, candidate.state.node, module),
				"warning"
			)
			this.schemaWarningSpans.set(warning, { start: site.start, end: site.end })
			result.push(warning)
		}
		return result
	}

	// a parameter that may be a Type is better a Generic's
	private opaqueHintOf(
		dynamic: DynamicValue,
		site: Node,
		module: SourceModule
	): string {
		let link: DynamicValue | undefined = dynamic
		while (link && link.code !== "parameter") link = link.cause
		const param = link && parameterOf(link.node, link.module)
		if (!param?.fn) return writeOpaqueHelperHint(chainOf(dynamic))
		return writeOpaqueParameterHint(
			param.fn,
			param.binding.name,
			link!.module === module ?
				genericSiteDefinitionOf(site, param.binding, module)
			:	undefined
		)
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
			const target = this.graph.host.resolve(
				specifier,
				module.id,
				() => !isTypeOnly(statement)
			)
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
							: this.config === undefined ? writeNoConfigHint(module.path)
							: undefined
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
			} else if (this.mode === "standalone")
				result.push(...this.checkConfiguredOptions(module, calls[i]))
		}
		return result
	}

	// errors and mutatesInput configure() sets, reported once at the call
	private checkConfiguredOptions(
		module: SourceModule,
		call: CallExpression
	): Diagnostic[] {
		const result: Diagnostic[] = []
		const built = {
			errors: this.errors ?? "all",
			mutatesInput: this.mutatesInput ?? false
		}
		const imported = this.importClosureOf(module.id).flatMap(id => {
			const reached = this.graph.moduleOf(id)
			return reached instanceof SourceModule ?
					reached.program.body.flatMap(statement =>
						statement.type === "ImportDeclaration" ?
							[statement.source.value]
						:	[]
					)
				:	[]
		})
		for (const option of ["errors", "mutatesInput"] as const) {
			const configured = $ark.config[option]
			if (configured === undefined) continue
			if (configured !== built[option]) {
				result.push(
					this.diagnostic(
						module,
						call,
						"R3",
						option === "errors" ?
							writeErrorsMismatchMessage(configured as never, built.errors)
						:	writeMutatesInputMismatchMessage(
								configured as never,
								built.mutatesInput
							),
						[],
						writeConfiguredOptionHint(option, printable(configured))
					)
				)
			}
			if (
				configured !== "all" &&
				configured !== false &&
				!imported.includes(`arktype/${option}`)
			) {
				result.push(
					this.diagnostic(
						module,
						call,
						"R3",
						writeMissingImportMessage(option, printable(configured)),
						[],
						`Import "arktype/${option}" in the config module, as arktype throws creating a Type without it.`
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

	// a Type member read off an import the build can't follow, like a bundler's
	// alias, once per import
	private unresolvedReadsOf(module: SourceModule): Diagnostic[] {
		const result: Diagnostic[] = []
		const warned = new Set<string>()
		// only a kept import binds what a read reads, so an `import type` isn't resolved
		if (
			!module.program.body.some(
				statement =>
					this.isKept(statement, module) &&
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
		const declaration = module.scopes.byId.get(root)?.binding?.declaration
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
		const written = new Set<Node>()
		const writes = new Set<Node>()
		const result = this.frozenWriteDiagnosticsOf(module, written, writes)
		result.push(...this.strayImportDiagnosticsOf(module, candidates, written))
		const settledValues = new Map(
			settled.map(candidate => [
				rangeOf(candidate.state.node),
				candidate.state.value
			])
		)
		const unavailable = this.unavailableReadsIn(module, settledValues, writes)
		// arktype's own packages are the runtime a standalone build ships
		const isArkPackage = arkPackageName.test(
			this.graph.packageNameOf(module.id) ?? ""
		)
		result.push(...this.scopeReadDiagnosticsOf(module, candidates))
		for (const read of unavailable) {
			const diagnostic = this.unavailableReadDiagnosticOf(
				read,
				unavailable,
				settledValues,
				isArkPackage,
				module
			)
			if (diagnostic) result.push(diagnostic)
		}
		result.push(...this.unresolvedReadsOf(module))
		result.push(...this.importedEscapesOf(module))
		if (!isArkPackage) result.push(...this.nodePackageDiagnosticsOf(module))
		return result
	}

	// a write into an arktype value, which the standalone runtime freezes
	private frozenWriteDiagnosticsOf(
		module: SourceModule,
		written: Set<Node>,
		writes: Set<Node>
	): Diagnostic[] {
		const result: Diagnostic[] = []
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
		return result
	}

	// an arktype import used outside a precompiled site
	private strayImportDiagnosticsOf(
		module: SourceModule,
		candidates: SiteCandidate[],
		written: Set<Node>
	): Diagnostic[] {
		const result: Diagnostic[] = []
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
				// a function of errors reads data, which a validator returns
				(this.graph.leavesArk(id, module) && !(name && name in errorReaders)) ||
				isInIsland(id, module)
			)
				continue
			if (isWithin(id, candidateRanges)) continue
			result.push(
				name && name in errorReaders ?
					this.errorReaderDiagnostic(module, name, read!)
				:	this.diagnostic(
						module,
						id,
						"R4",
						`\`${binding.name}\` is used outside a precompiled site`
					)
			)
		}
		return result
	}

	private unavailableReadsIn(
		module: SourceModule,
		settledValues: Map<string, unknown>,
		writes: Set<Node>
	): UnavailableRead[] {
		const unavailable: UnavailableRead[] = []
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
				this.graph.unavailableReadOf(node, module, this.unsureLackedMembers)
			if (read && !this.isDeclaredInIsland(read[1], module))
				unavailable.push([node, ...read])
			return true
		})
		return unavailable
	}

	private scopeReadDiagnosticsOf(
		module: SourceModule,
		candidates: SiteCandidate[]
	): Diagnostic[] {
		const result: Diagnostic[] = []
		for (const [node, read, kind] of this.scopeReadsByModule.get(module) ??
			scopeReadsOf(module, candidates, this.graph)) {
			const span = spanOfScopeRead(node)
			result.push(
				this.diagnostic(
					module,
					span,
					"unsupported",
					`${module.snippetOf(span)} can't be precompiled yet`,
					[
						node.type === "CallExpression" ?
							`\`${module.snippetOf(node.callee)}\` may be a ${kind}, which a standalone build replaces with an object that can't be called`
						:	`\`${module.snippetOf(node.object)}\` may be a ${kind}, which a standalone build replaces with an object that lacks \`${read}\``
					],
					node.type === "CallExpression" ?
						`Assign it to a const and instantiate that, which the build precompiles, or build with runtime: "arktype".`
					:	`Assign it to a const and read \`${read}\` off that, which the build precompiles, or build with runtime: "arktype".`
				)
			)
		}
		return result
	}

	private unavailableReadDiagnosticOf(
		[node, read, object, isUnsureRead]: UnavailableRead,
		unavailable: UnavailableRead[],
		settledValues: Map<string, unknown>,
		isArkPackage: boolean,
		module: SourceModule
	): Diagnostic | undefined {
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
			unavailable.some(([inner]) => inner !== node && contains(node, inner)) ||
			this.members[read as ValidatorMember] === true
		)
			return
		const dropped =
			read === undefined || !this.lackedMembers.has(read) ? undefined
			: includes(methodMembers, read) ? "methods"
			: read
		// derived from a Scope, Module or Generic, which an annotation doesn't narrow
		const isDerived =
			isUnsure && !dropped && mayBeOtherArk(this.graph.kindOf(object, module))
		// e.g. `T.or("null")` in `<t>(T: Type<t>) => ...`, which a Generic writes
		const param =
			(
				!isDerived &&
				!dropped &&
				typeof read === "string" &&
				isComposingMember(read)
			) ?
				parameterOf(object, module)
			:	undefined
		// a callback, like `map`'s, isn't one a Generic can replace
		const generic = param?.fn ? param : undefined
		return this.diagnostic(
			module,
			node,
			"R4",
			read === undefined ?
				`${module.snippetOf(node)} reflects on a Type, whose properties a standalone validator doesn't share`
			:	`${module.snippetOf(node)} reads ${read}, which a standalone validator lacks`,
			[
				isDerived ?
					`\`${module.snippetOf(object)}\` is read off what may be an arktype value, so it may be a Type, which the standalone runtime replaces with a validator`
				: generic && isUnsure ?
					`\`${generic.binding.name}\` is a parameter of ${generic.fn}, so it may be a Type, which the standalone runtime replaces with a validator`
				: isUnsure ?
					`the build can't tell where \`${module.snippetOf(object)}\` comes from, so it may be a Type, which the standalone runtime replaces with a validator`
				: dropped ?
					`the build's \`members\` option sets ${JSON.stringify(dropped)} false, so no validator has ${read}`
				:	`\`${module.snippetOf(object)}\` is a Type, which the standalone runtime replaces with a validator, and no precompiled site covers the read`
			],
			isDerived ? derivedHint
			: generic ?
				writeGenericHint(
					generic.fn,
					generic.binding.name,
					genericDefinitionOf(node, module),
					!isUnsure || generic.isAnnotated,
					isUnsure ?
						annotationSnippetOf(
							this.graph.unreadAnnotationOf(object, module),
							module
						)
					:	undefined
				)
			: isUnsure ?
				writeUnsureHint(
					dropped ? `leave members[${JSON.stringify(dropped)}] unset`
					: includes(introspectionMembers, read) ?
						`set members[${JSON.stringify(read)}] true, or build with runtime: "arktype"`
					:	'build with runtime: "arktype"',
					annotationSnippetOf(
						this.graph.unreadAnnotationOf(object, module),
						module
					)
				)
			: dropped ?
				`Leave members[${JSON.stringify(dropped)}] unset if the program reads it.`
			:	undefined
		)
	}

	// an import of @ark/schema or a locale, which only a runtime island can read
	private nodePackageDiagnosticsOf(module: SourceModule): Diagnostic[] {
		const result: Diagnostic[] = []
		for (const statement of module.program.body) {
			if (statement.type !== "ImportDeclaration") continue
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
								// a class, unlike a function like firstIssue
								/^[A-Z]/.test(name) ?
									[
										`what a standalone validator creates isn't an instance of @ark/schema's ${name}`
									]
								:	[],
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

	// e.g. `flatProblemsByPath(out)`, which the program can write from `out.issues`
	private errorReaderDiagnostic(
		module: SourceModule,
		name: string,
		read: Node
	): Diagnostic {
		const [callee, call] = operatorOf(read)
		const isCall = call?.type === "CallExpression" && call.callee === callee
		const errors =
			isCall && call.arguments.length ? module.snippetOf(call.arguments[0])
			: name === "messageIn" ? "issue"
			: "errors"
		return this.diagnostic(
			module,
			isCall ? call : read,
			"R4",
			isCall ?
				`${module.snippetOf(call)} calls ${name}, which arktype/runtime doesn't export`
			:	`\`${module.snippetOf(read)}\` is arktype's, which arktype/runtime doesn't export`,
			[],
			name === "messageIn" ?
				writeMessageInHint(errors)
			:	writeErrorReaderHint(name, errors)
		)
	}

	// e.g. `each($)` with `$` a Scope another module's build precompiles
	private importedEscapesOf(module: SourceModule): Diagnostic[] {
		const result: Diagnostic[] = []
		for (const reference of module.scopes.references) {
			const binding = reference.binding
			if (binding?.kind !== "import" || reference.isWrite) continue
			let node: Node = reference.id
			let target = this.graph.importOf(binding, module)
			const [operand, operator] = operatorOf(node)
			if (
				target.kind === "namespace" &&
				operator?.type === "MemberExpression" &&
				operator.object === operand
			) {
				const member = this.graph.namespaceMemberOf(operator, module)
				if (member) [node, target] = [operator, member]
			}
			const [kind, held] = this.importedStandInOf(target) ?? []
			if (
				kind &&
				this.graph.reachesUnseen(node, module, this.isReadableExport, held)
			) {
				const reasons = [
					`it's passed to code the build can't see, which may read what a precompiled ${kind} lacks`
				]
				result.push(
					this.diagnostic(
						module,
						node,
						"unsupported",
						`${module.snippetOf(node)} can't be precompiled yet`,
						reasons,
						configuredHintOf(reasons)
					)
				)
			}
		}
		return result
	}

	// the stand-in an export is or holds, as a namespace holds its module's
	private importedStandInOf(
		target: ImportTarget
	): [kind: StandInKind, held: boolean] | undefined {
		if (target.kind === "namespace") {
			for (const name in target.module.scopes.exportsByName) {
				const [kind] =
					this.importedStandInOf(this.graph.exportOf(target.module, name)) ?? []
				if (kind) return [kind, true]
			}
			return
		}
		if (target.kind !== "binding" && target.kind !== "expression") return
		const declaration =
			target.kind === "binding" ? target.binding.declaration : target.node
		const kind =
			target.kind === "binding" ?
				this.graph.bindingKindOf(target.binding, target.module)
			:	this.graph.kindOf(target.node, target.module)
		if (
			!this.isTransformed(target.module.id) ||
			isInIsland(declaration, target.module) ||
			!(mayBeOtherArk(kind) || mayHoldArk(kind))
		)
			return
		const { value } = this.interpreter.exportValue(target)
		const standIn = standInKindOf(value)
		if (standIn) return [standIn, false]
		const held = heldStandInOf(value)
		if (held) return [held, true]
	}

	// where an importer can't, its exporter refuses a Scope reaching the export
	private isReadableExport = (exported: ImportTarget): boolean =>
		(exported.kind === "binding" || exported.kind === "expression") &&
		!findDynamic(this.interpreter.exportValue(exported).value)

	// e.g. `T` declared in a `// @ark-runtime` definition
	private isDeclaredInIsland(node: Node, module: SourceModule): boolean {
		node = unwrapChain(node)
		const binding =
			node.type === "Identifier" ?
				module.scopes.byId.get(node)?.binding
			:	undefined
		return !!binding && isInIsland(binding.declaration, module)
	}

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
						createSiteState(objects[i], module, { readsLiterals: true })
					)
					if (isWritten(state.value))
						return [write, objects[i], i === objects.length - 1]
				}
				return
			}
			objects.push(parent)
		}
	}

	// e.g. `(await import("arktype")).type`, loading arktype/runtime with no
	// definition to precompile
	private checkDynamicImports(module: SourceModule): Diagnostic[] {
		const result: Diagnostic[] = []
		walk(module.program, node => {
			if (loadedSpecifierOf(node) === "arktype" && !isDiscarded(node)) {
				result.push(
					this.diagnostic(
						module,
						node,
						"R4",
						`${module.snippetOf(node)} loads arktype, which a standalone build replaces with arktype/runtime`,
						[],
						dynamicImportHint
					)
				)
			}
			return true
		})
		return result
	}

	// what a runtime island reaches must run on arktype too
	private checkIslands(module: SourceModule, sites: Site[]): Diagnostic[] {
		const result = module.strayMarkers.map(marker =>
			this.diagnostic(
				module,
				marker,
				"R4",
				"`// @ark-runtime` marks nothing",
				[],
				markerHint
			)
		)
		if (this.variant) {
			result.push(...this.variantIslandDiagnosticsOf(module))
			return result
		}
		const islands: IslandVisit = {
			module,
			result,
			visited: new Set(),
			reaches: false
		}
		for (const island of module.islands) {
			if (
				sites.some(site => site.status === "accepted" && contains(site, island))
			) {
				result.push(
					this.diagnostic(
						module,
						island,
						"R4",
						`\`${module.snippetOf(island)}\` is marked // @ark-runtime inside a definition the build precompiles`,
						[],
						markerHint
					)
				)
				continue
			}
			islands.reaches = sites.some(
				site => site.status === "island" && contains(island, site)
			)
			this.visitIsland(island, module, [], islands)
			if (!islands.reaches) {
				result.push(
					this.diagnostic(
						module,
						island,
						"R4",
						`\`${module.snippetOf(island)}\` is marked // @ark-runtime but doesn't use arktype`,
						[],
						markerHint
					)
				)
			}
		}
		return result
	}

	// a build writing its errors for size or as none gives its validators a
	// runtime of their own, which an island's errors aren't from
	private variantIslandDiagnosticsOf(module: SourceModule): Diagnostic[] {
		const option = writeVariantOption(this.variant!)
		return module.islands.map(island =>
			this.diagnostic(
				module,
				island,
				"R4",
				`a runtime island returns arktype's errors, which aren't instances of type.errors under ${option}`,
				[
					this.variant === "lean" ?
						"a build writing its errors for size gives its validators a runtime of their own"
					:	"a build whose errors say only that data is invalid gives its validators a runtime of their own"
				],
				this.variant === "lean" ?
					'Precompile the definition, or build with optimizeErrors: "speed".'
				:	`Precompile the definition, or build without ${option}.`
			)
		)
	}

	// what an island reads, through each binding it reaches, reporting
	// arktype's values read outside one
	private visitIsland(
		node: Node,
		origin: SourceModule,
		reasons: string[],
		islands: IslandVisit
	): void {
		walk(node, child => {
			const reference =
				child.type === "Identifier" ? origin.scopes.byId.get(child) : undefined
			const binding = reference?.binding
			if (!binding || reference.isWrite || contains(node, binding.declaration))
				return true
			const [name, arkRead] = this.graph.arkExportOf(reference, origin) ?? []
			if (arkRead) {
				islands.reaches = true
				if (
					!isInIsland(arkRead, origin) &&
					!isRuntimeExport(name!) &&
					!this.graph.leavesArk(child, origin)
				) {
					islands.result.push(
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
			const [read, target] = this.islandReadOf(child, binding, origin)
			if (target.kind !== "binding" && target.kind !== "expression") {
				if (target.kind !== "json") islands.reaches = true
				return true
			}
			const declaration =
				target.kind === "binding" ? target.binding.declaration : target.node
			if (isInIsland(declaration, target.module)) {
				islands.reaches = true
				return true
			}
			if (
				isArk(
					target.kind === "binding" ?
						this.graph.bindingKindOf(target.binding, target.module)
					:	this.graph.kindOf(target.node, target.module)
				)
			) {
				islands.reaches = true
				// e.g. `User(data)` or `User.assert(data)`, which a validator runs
				if (
					!(
						read.parent?.type === "CallExpression" &&
						read.parent.callee === read
					) &&
					!this.graph.leavesArk(child, origin)
				) {
					islands.result.push(
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
				target.kind === "binding" &&
				!(target.binding.kind in declaredBindingKinds)
			)
				return true
			// what an earlier island visited reported what it reaches
			if (islands.visited.has(declaration)) {
				islands.reaches = true
				return true
			}
			islands.visited.add(declaration)
			const step = `\`${origin.snippetOf(read)}\` (${target.module.positionOf(target.kind === "binding" ? target.binding.id : declaration)})`
			this.visitIsland(
				declaration,
				target.module,
				reasons.length ?
					[`${reasons[0]}, ${step}`]
				:	[
						`the runtime island at ${islands.module.positionOf(node)} reaches it through ${step}`
					],
				islands
			)
			return true
		})
	}

	// what an island's reference reads: its binding, or e.g. `schemas.User` for
	// `schemas` a namespace import
	private islandReadOf(
		child: Node,
		binding: Binding,
		origin: SourceModule
	): [read: Node, target: ImportTarget] {
		const target: ImportTarget =
			binding.kind === "import" ?
				this.graph.importOf(binding, origin)
			:	{ kind: "binding", module: origin, binding, name: binding.name }
		const [operand, member] = operatorOf(child)
		const exported =
			target.kind === "namespace" &&
			member?.type === "MemberExpression" &&
			member.object === operand &&
			this.graph.namespaceMemberOf(member, origin)
		return exported ? [member, exported] : [child, target]
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
		return this.unsafeSeverity === "error" ? withAllowUnsafe(hint) : hint
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

// e.g. "default" for `T.default("free")`, a key's definition a validator lacks
const keyedMethodOf = (site: Site): string | undefined =>
	Array.isArray(site.value) ?
		/\.(default|optional)$/.exec(site.unavailableRead ?? "")?.[1]
	:	undefined

const methodMembers = ["traverse", "from", "toString"] as const

const unwrittenHint =
	'Move it into a .ts or .js module of its own that this one imports, which the build precompiles, or build with runtime: "arktype".'

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
		(files !== undefined && $ark.cfg !== undefined)

const ownPackagesByName: Partial<
	Record<ArkPackage, [root: string, version: string]>
> = {}

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

// a missing inverse, which a Type's definition alone decides, whatever the build reads
const isEncodingError = (e: Error) =>
	e.message.startsWith(writeMissingInverseMessage(""))

// e.g. "./a.ts" for `import("./a.ts")`, `require("./a.ts")` or `import a = require("./a.ts")`
const loadedSpecifierOf = (node: Node): unknown => {
	// a require() may be one createRequire() returns
	const source =
		loadedSourceOf(node) ??
		((
			node.type === "TSImportEqualsDeclaration" &&
			node.importKind !== "type" &&
			node.moduleReference.type === "TSExternalModuleReference"
		) ?
			node.moduleReference.expression
		:	undefined)
	return source?.type === "Literal" ? source.value : undefined
}

// e.g. `await import("arktype")` as a statement, loading a module only to run it
const isDiscarded = (node: Node): boolean => {
	let [, parent] = operatorOf(node)
	while (
		parent?.type === "AwaitExpression" ||
		(parent?.type === "UnaryExpression" && parent.operator === "void")
	)
		[, parent] = operatorOf(parent)
	return parent?.type === "ExpressionStatement"
}

// e.g. `from "arktype"`, `import("arktype")` or `require("arktype")`
const arktypeSpecifier =
	/\b(?:from|import\s*\(?|require\s*\()\s*["'](?:(?:arktype|@ark\/type)(?:\/(?:config|codecs))?|arkregex|@ark\/regex)["']/

const importSpecifier = /\b(?:from|import)\s*["']([^"']+)["']/g

export const specifierOf = (importer: string, file: string): string => {
	const path = relative(dirname(importer), file).split("\\").join("/")
	return path.startsWith(".") ? path : `./${path}`
}

const virtualSpecifier = /"(~arktype\/[^"]+)"/g

const reachedModulesOf = (
	code: string,
	modules: Record<string, string>
): Record<string, string> => {
	const reached: Record<string, string> = {}
	const pending = [code]
	for (const read of pending) {
		for (const [, specifier] of read.matchAll(virtualSpecifier)) {
			if (specifier in reached || !(specifier in modules)) continue
			reached[specifier] = modules[specifier]
			pending.push(reached[specifier])
		}
	}
	return reached
}

const createsValidator = (site: Site) =>
	!site.introspection && !site.parseError && hasArkKind(site.value, "root")

const runtimeModuleOf = (
	module: SourceModule,
	folded: Site[],
	kept: Span[],
	read: Binding[],
	inputs: Record<string, string[]>
): RuntimeModule => ({
	module,
	folded,
	kept: [
		...kept,
		...folded.flatMap(site => (site.definition ? [site.definition] : []))
	],
	passed: read,
	inputs,
	validators: folded.filter(site => createsValidator(site)),
	holdsOther: folded.some(
		site =>
			!createsValidator(site) &&
			!site.introspection &&
			!site.parseError &&
			isFoldable(site.value)
	)
})

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
const siteNameOf = (site: Site) =>
	hashOf(
		site.parseError ?
			[site.parseError.message, ...(site.progress ?? [])].join("\n")
		:	`${site.start}`
	)

const rangesOf = (sites: Site[]) =>
	new Map(sites.map(site => [rangeOf(site), site]))

const isInIsland = (node: Node, module: SourceModule) =>
	module.islands.some(island => contains(island, node))

const declaredBindingKinds = {
	const: 1,
	let: 1,
	var: 1,
	function: 1,
	class: 1
} satisfies Partial<Record<BindingKind, 1>>

// a member read off a Type a standalone validator lacks, or off what may be one
type UnavailableRead = [
	node: Node,
	read: string | undefined,
	object: Node,
	isUnsureRead?: true
]

// a module's sites and diagnostics as they're analyzed
interface Analyzing {
	module: SourceModule
	sites: Site[]
	diagnostics: Diagnostic[]
	configureStart: number
	// where the module first reports a configuration it can't apply
	unappliedAt?: string
}

// the islands of one module being checked, and whether the one being visited reaches arktype
interface IslandVisit {
	module: SourceModule
	result: Diagnostic[]
	visited: Set<Node>
	reaches: boolean
}

// a member read off what may be a Scope or Generic, or a call of what may be a Generic
type ScopeRead = [
	node: MemberExpression | CallExpression,
	read: string | undefined,
	kind: StandInKind
]

// e.g. `chosen.type(...)` for `const chosen = flag ? H.alt : H.$`, outside any site
const scopeReadsOf = (
	module: SourceModule,
	candidates: SiteCandidate[],
	graph: ModuleGraph
): ScopeRead[] => {
	const candidateRanges = new Set(
		candidates.map(candidate => rangeOf(candidate.state.node))
	)
	const reads: ScopeRead[] = []
	walk(module.program, node => {
		if (
			isInIsland(node, module) ||
			(node.type.startsWith("TS") && !isTransparent(node))
		)
			return false
		if (isWithin(node, candidateRanges)) return true
		const read = graph.scopeReadOf(node, module)
		if (read) reads.push([node as MemberExpression, ...read])
		else if (graph.genericCallOf(node, module))
			reads.push([node as CallExpression, undefined, "Generic"])
		return true
	})
	return reads
}

// e.g. `getPlaces().type(...)`, reported as the call
const spanOfScopeRead = (node: MemberExpression | CallExpression): Span => {
	if (node.type === "CallExpression") return node
	const [callee, call] = operatorOf(node)
	return call?.type === "CallExpression" && call.callee === callee ? call : node
}

const standInKindOf = (value: unknown): StandInKind | undefined =>
	hasArkKind(value, "scope") ? "Scope"
	: hasArkKind(value, "generic") ? "Generic"
	: undefined

// e.g. `{ s: $ }`
const heldStandInOf = (
	value: unknown,
	seen = new Set<unknown>()
): StandInKind | undefined => {
	if (!isPlainContainer(value) || seen.has(value)) return
	seen.add(value)
	for (const key of Reflect.ownKeys(value)) {
		const held = Reflect.get(value, key)
		const kind = standInKindOf(held) ?? heldStandInOf(held, seen)
		if (kind) return kind
	}
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

// a parameter a helper reads where the build refuses it, as each call passes it
interface CalledParam {
	module: SourceModule
	read: Node
	param: Binding
}

// e.g. `max` for "`max` is a parameter of text ..."
const paramOf = (rejection: DynamicValue | undefined): Binding | undefined => {
	for (let link = rejection; link; link = link.cause) {
		if (link.code === "parameter")
			return link.module.scopes.byId.get(link.node)?.binding
	}
}

// a read the output keeps runs only if the build folds it or reports it
const isReachedOnlyAtBuild = (
	node: Node,
	sites: Site[],
	quiet: FunctionNode[]
): boolean =>
	quiet.some(fn => contains(fn, node)) ||
	sites.some(
		site =>
			contains(site, node) &&
			(site.status === "rejected" ||
				(site.status === "accepted" &&
					!site.references.some(reference => contains(reference, node)) &&
					!(site.definition && contains(site.definition, node))))
	)

const rejectionOf = (state: SiteState): DynamicValue | undefined =>
	state.error instanceof DynamicValue ? state.error
	: state.error === undefined ? findDynamic(state.value)
	: undefined

// e.g. `T` in `<t>(T: Type<t>) => T.or("null")`, with the function's name
const parameterOf = (
	node: Node,
	module: SourceModule
): { binding: Binding; fn: string; isAnnotated: boolean } | undefined => {
	const id = unwrapChain(node)
	const binding =
		id.type === "Identifier" ? module.scopes.byId.get(id)?.binding : undefined
	if (binding?.kind !== "param") return
	return {
		binding,
		fn: inferredNameOf(binding.declaration as FunctionNode),
		isAnnotated: !!(binding.id as { typeAnnotation?: unknown }).typeAnnotation
	}
}

// e.g. "BeforeNavigate" for `nav: BeforeNavigate`
const annotationSnippetOf = (
	annotation: Node | undefined,
	module: SourceModule
): string | undefined =>
	annotation &&
	module.snippetOf(
		annotation.type === "TSTypeAnnotation" ?
			annotation.typeAnnotation
		:	annotation
	)

// e.g. "t | null" for `T.or("null")`, if the call is that simple
const genericDefinitionOf = (
	read: Node,
	module: SourceModule
): string | undefined => {
	if (read.type !== "MemberExpression") return
	const [callee, call] = operatorOf(read)
	if (call?.type !== "CallExpression" || call.callee !== callee) return
	const name = memberNameOf(read)
	const [arg, ...rest] = call.arguments
	if (name === "array") return arg ? undefined : '"t[]"'
	const operator =
		name === "or" ? "|"
		: name === "and" ? "&"
		: undefined
	if (!operator || !arg || rest.length || arg.type === "SpreadElement") return
	if (arg.type === "Literal" && typeof arg.value === "string") {
		const operand =
			operator === "&" && arg.value.includes("|") ? `(${arg.value})` : arg.value
		return JSON.stringify(`t ${operator} ${operand}`)
	}
	const text = module.snippetOf(arg)
	return text.endsWith("…") ? undefined : `["t", "${operator}", ${text}]`
}

// e.g. `{ value: "t" }` for `type({ value: T })`, if each read is a whole definition
const genericSiteDefinitionOf = (
	site: Node,
	param: Binding,
	module: SourceModule
): string | undefined => {
	if (
		site.type !== "CallExpression" ||
		site.arguments.length !== 1 ||
		!/(?:^|\.)type$/.test(module.textOf(site.callee))
	)
		return
	const [arg] = site.arguments
	let text = module.textOf(arg)
	const reads = param.references
		.map(reference => reference.id)
		.filter(id => contains(arg, id))
		.sort((l, r) => r.start - l.start)
	for (const id of reads) {
		const parent = id.parent
		const isDefinition =
			id === arg ||
			parent?.type === "ArrayExpression" ||
			(parent?.type === "Property" && parent.value === id && !parent.shorthand)
		if (!isDefinition) return
		text = `${text.slice(0, id.start - arg.start)}"t"${text.slice(id.end - arg.start)}`
	}
	return text.includes("\n") || text.length > 60 ? undefined : text
}

// e.g. `Math.random()` for `type({ a: Math.random() > 0.5 ? "string" : "number" })`,
// or its binding where too long
const innermostSnippetOf = (
	dynamic: DynamicValue,
	site: Span,
	module: SourceModule
): string | undefined => {
	const snippets: string[] = []
	for (let link: DynamicValue | undefined = dynamic; link; link = link.cause) {
		// e.g. `process.env.MAX` for `process`, or `Math.random()` for its callee
		let node = link.node
		for (;;) {
			const [operand, operator] = operatorOf(node)
			if (
				(operator?.type === "MemberExpression" &&
					operator.object === operand &&
					!operator.computed) ||
				(operator?.type === "CallExpression" && operator.callee === operand)
			)
				node = operator
			else break
		}
		// the site itself, as where it throws, is no value to replace
		if (link.module === module && contains(node, site)) continue
		snippets.unshift(link.module.snippetOf(node))
	}
	return snippets.find(snippet => !snippet.endsWith("…")) ?? snippets[0]
}

const chainOf = (dynamic: DynamicValue): string[] => {
	const result: string[] = []
	for (let link: DynamicValue | undefined = dynamic; link; link = link.cause)
		result.push(link.message)
	return result
}

// what arktype's own errors, like an island's, may hold
const anyIssues: IssueFeatures = {
	reportsIndices: true,
	bracketsKeys: true,
	writesText: true,
	readsKeySites: true,
	runsArktype: true
}

// e.g. a configured writer calling a function in a site's meta
export const reasonsOf = (e: unknown): string[] =>
	e instanceof DynamicValue ? chainOf(e)
	: e instanceof InternalArktypeError ?
		[
			`${e.message}, which is a bug in the build: please report it at https://github.com/arktypeio/arktype/issues`
		]
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

const thunksIn = (
	value: unknown,
	thunks: unknown[] = [],
	seen = new Set<unknown>()
): unknown[] => {
	if (isThunk(value)) thunks.push(value)
	else if (isPlainContainer(value) && !seen.has(value)) {
		seen.add(value)
		for (const v of Object.values(value)) thunksIn(v, thunks, seen)
	}
	return thunks
}

const holdsValidate = (
	value: unknown,
	fn: unknown,
	seen = new Set<unknown>()
): boolean => {
	if (!isPlainContainer(value) || seen.has(value)) return false
	seen.add(value)
	const standard = Reflect.get(value, "~standard")
	return (
		(isPlainContainer(standard) && Reflect.get(standard, "validate") === fn) ||
		Object.values(value).some(v => holdsValidate(v, fn, seen))
	)
}

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
