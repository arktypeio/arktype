import {
	$ark,
	hasArkKind,
	isDecidedByAllows,
	isNode,
	LazyGenericRoot,
	precompileRootUnits,
	supportedJsonSchemaTargets,
	ToJsonSchema,
	expectedOf,
	TraversalCompiler,
	type ArkErrorCode,
	type BaseErrorContext,
	type BaseNode,
	type BaseRoot,
	type BaseScope,
	type DefaultedNode,
	type GenericRoot,
	type InvokeOptions,
	type MorphNode,
	type NodeId,
	type Optional,
	type RootUnit,
	type TransformKeyOptions,
	type TransformStep,
	type UnionNode,
	type UnitMember,
	type Sequence
} from "@ark/schema"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
	arrayIndexMatcher,
	errorWritersByCode,
	rootApplyRuntime,
	writeRootApply,
	type FailureSite,
	type RootApplyParam,
	type SiteContext,
	type UnionSite
} from "@ark/schema/internal"
import {
	appendStringifiedKey,
	arkKindOf,
	constructorNameOf,
	functionNameOf,
	hashOf,
	hasDomain,
	isArray,
	isDate,
	isDateObject,
	isRegExpObject,
	isThunk,
	nameOf,
	ParseError,
	printable,
	prototypeOf,
	serializePrimitive,
	throwInternalError,
	throwParseError,
	unset
} from "@ark/util"
import { InternalTypedFn, type TypedFn } from "./fn.ts"
import type { Generic } from "./generic.ts"
import { keywords, type type } from "./keywords/keywords.ts"
import type { Module } from "./module.ts"
import type { HoleKind, IntrospectionMember } from "./runtime.ts"
import * as runtime from "./runtimeExports.ts"
import type { Scope } from "./scope.ts"

// what an issue's message is written from, of which a standalone validator bakes only its node's description
const describingKeys = ["expected", "problem", "message"] as const

type DeclarationRole =
	| "shape"
	| "keys"
	| "literal"
	| "standIn"
	| "json"
	| "jsonSchema"

// constraints a node keeps sorted by hash, which holds the names of the functions they hold, unlike props, which arktype orders by key
const sortedConstraintKeys = ["pattern", "index"] as const

const runtimePathsByValue = new Map<unknown, string>()

const indexRuntime = (value: unknown, path: string): void => {
	if (typeof value === "function") runtimePathsByValue.set(value, path)
	else if (hasDomain(value, "object")) {
		runtimePathsByValue.set(value, path)
		if (Object.getPrototypeOf(value) === Object.prototype) {
			for (const [k, v] of Object.entries(value))
				indexRuntime(v, appendStringifiedKey(path, k))
		}
	}
}

// an artifact reads what the runtime exports from it rather than copying it
for (const [name, value] of Object.entries(runtime))
	indexRuntime(value, `runtime.${name}`)

// a value the runtime holds is named by its path, since its state and the order roots reach it vary between builds
export const runtimeKeyOf = (value: object | symbol): string | undefined =>
	runtimePathsByValue.get(value) ??
	((
		typeof value === "function" &&
		Reflect.get(globalThis, functionNameOf(value)) === value
	) ?
		`globalThis.${functionNameOf(value)}`
	:	undefined)

// what an artifact exports as it is, rather than creating it in a factory
type ExportedValue = type.Any | Module | Scope<any> | Generic | TypedFn

export type Foldable = BaseRoot | ExportedValue | BaseScope | GenericRoot

export type StandaloneExport =
	| ExportedValue
	| StandaloneFactory
	| StandaloneIntrospection

export const introspectionMembers = [
	"expression",
	"description",
	"json",
	"toJSON",
	"toJsonSchema",
	"~standard.jsonSchema"
] as const

export type FoldedMember = Exclude<IntrospectionMember, "~standard.jsonSchema">

// `methods` is what a validator inherits: traverse(), from() and toString()
export const defaultMembers = [
	"assert",
	"meta",
	"~standard",
	"methods"
] as const

export type ValidatorMember =
	| (typeof defaultMembers)[number]
	| IntrospectionMember

export type ValidatorMembers = { [member in ValidatorMember]?: boolean }

export interface StandaloneIntrospection {
	member: FoldedMember
	type: BaseRoot
	data: unknown
	params: FactoryParam[]
	defaultChecks?: readonly DefaultCheck[]
	// what arktype threw writing the site's JSON Schema, which its factory throws at each call
	thrown?: unknown
}

export interface StandaloneFactory {
	// a Type, Module, Scope, Generic or TypedFn its site creates from what the factory receives
	type: ExportedValue
	params: FactoryParam[]
	// the table of a factory returning what it created before for the same holes, which those returning one Type at build share
	internedBy?: number | undefined
	defaultChecks?: readonly DefaultCheck[]
}

export type FactoryParam = HoleParam | InputParam | HelperParam | ProgressParam

// a default arktype checks against a Type where it defines it, which its factory checks where it creates it
export type DefaultCheck = [
	node: BaseRoot,
	value: unknown,
	key: PropertyKey | null
]

export interface HoleParam {
	kind: HoleKind
	label: string
	value: unknown
	// a function or symbol its site's module creates, whose facts nothing changes, unlike another module's, which a mock can replace
	isOwn?: boolean
}

export interface InputParam {
	kind: "input"
	label: string
	reads: [path: PropertyKey[], value: unknown][]
}

export interface HelperParam {
	kind: "helper"
	label: string
	file: string
	name: string
}

// how far the site's module has run, which must be past the statement setting what the site reads, as a read before then throws
export interface ProgressParam {
	kind: "progress"
	label: string
	at: number
}

// false where nothing calls configure(), which validators then don't read
export type Configured = ConfiguredModule | false | undefined

// what a factory checks is as built: what it receives, helpers too, or none
export type Checks = "types" | "helpers" | "none"

// a failure's issues: each, the first, or one at the root, "is invalid"
export type ErrorDetail = "all" | "first" | "none"

export type Optimization = "speed" | "size"

export interface ConfiguredModule {
	fingerprint: string
	path: string
}

interface SharedModule {
	readsRuntime: boolean
	imports: Record<string, string[]>
	declarations: string[]
	exports: string[]
}

export interface StandaloneOptions {
	configured?: Configured
	// a validator's members: the defaults unless false, introspection if true
	members?: ValidatorMembers | undefined
	// runs arktype writing what a validator bakes, refusing with a ParseError where the configured code it calls reads what the program can change
	bake?: (<t>(write: () => t) => t) | undefined
	// "first" returns only the first issue, "none" one root issue, "is invalid"
	errors?: ErrorDetail | undefined
	// false leaves each validator and its members unfrozen
	freeze?: boolean | undefined
	// false creates each validator as its module loads, not at its first read
	lazy?: boolean | undefined
	// "none" has a factory trust the Types it receives are those built
	checks?: Checks | undefined
	// true writes what a validation transforms into its input, which it returns
	mutatesInput?: boolean | undefined
	// "size" writes the shortest forms and shares root applies written alike
	optimize?: Optimization | undefined
	// declares what a site calls as functions, for a module an import cycle can reach before its artifact is evaluated
	hoisted?: boolean | undefined
}

interface Baking {
	members: ReadonlySet<ValidatorMember>
	write: <t>(write: () => t) => t
	firstIssue: boolean
	// else a failure is one issue at the root, so no unit returns an Apply
	detailsErrors: boolean
	freezes: boolean
	readsConfig: boolean
	// a module an import cycle reaches early creates at the first read anyway
	createsLazily: boolean
	// else held by id only where a factory takes functions from it
	checksTypes: boolean
	mutatesInput: boolean
	hoisted: boolean
	// writes the shortest forms rather than those V8 compiles and runs fastest as the artifact loads
	shortest: boolean
	// declares a unit's traversals at the top level of its module
	flattens: boolean
}

// a root apply, as a function of its unit's traversals or shape returns it
interface RootApplier {
	params: string
	apply: string
	args: string
	failure?: keyof typeof failureSources
}

// hoisted for early calls, else parenthesized unless optimized for size
const writeFunction = (
	baking: Baking,
	name: string,
	params: string,
	body: string
) =>
	baking.hoisted ? `function ${name}(${params}) {\n${body}\n}`
	: baking.shortest ? `const ${name} = (${params}) => {\n${body}\n}`
	: `const ${name} = ((${params}) => {\n${body}\n})`

const isCreatedByRuntime = (
	members: ReadonlySet<ValidatorMember>,
	baking: Baking
) =>
	// its assert calls errors.throw(), which errors "none" lacks
	baking.detailsErrors &&
	baking.freezes &&
	baking.readsConfig &&
	baking.checksTypes &&
	defaultMembers.every(member => members.has(member))

// a value built as its module is evaluated, which a bundler drops unread, else at its first read
const writeValue = (hoisted: boolean, name: string, expression: string) =>
	hoisted ?
		`var ${name}Value\nfunction ${name}() {\n\treturn (${name}Value ??= ${expression})\n}`
	:	`const ${name} = /* @__PURE__ */ (() => ${expression})()`

// how errors "none" fails, as each function's parameters and body
const failureSources = {
	invalid: [
		"data, onFail",
		`\tconst errors = new runtime.ArkErrors()
	errors._ = [{ code: "predicate", path: [], data }]
	return onFail ? onFail(errors) : errors`
	],
	// a compact validator's failure, given what else its call passes
	invalidCall: [
		"data, args, onFail",
		`\tconst errors = new runtime.ArkErrors()
	errors._ = [{ code: "predicate", path: [], data }]
	if (args.length) {
		if (args[0]) return runtime.pipedIntoUndetailed(args[0], errors)
		if (args[1] !== undefined) onFail = args[1]
	}
	return onFail ? onFail(errors) : errors`
	],
	// a pipe applies a node its Allows rejected, where any issue fails it
	applyInvalid: [
		"data, ctx",
		`\tctx.addError({ code: "predicate", path: ctx.path.slice(), data })`
	],
	// whether a node reading ctx allows data, by whether Apply adds an issue
	applyBy: [
		"allows",
		`\treturn (data, ctx) => {
		const depth = ctx.path.length
		if (allows(data, ctx)) return
		ctx.path.length = depth
		ctx.addError({ code: "predicate", path: ctx.path.slice(), data })
	}`
	]
} as const

export interface StandaloneModules {
	code: string
	// each module code imports by a ~arktype/ specifier
	modules: Record<string, string>
	// each folded factory whose function others share, as the name that function is exported by and the index a call passes it
	folds: Record<string, [name: string, index: number]>
	// each export whose call checks anything as it creates its value, so a bundler mustn't drop it
	checking: string[]
}

const runtimeImport = `import * as runtime from "arktype/runtime"`

/**
 * #### an ES module exporting a getter for each Type, Module, Scope or Generic, which creates them when one is first read, and a function creating each factory's value, which folded factories may share
 */
export const precompileStandalone = (
	exports: Record<string, StandaloneExport>,
	opts: StandaloneOptions = {}
): StandaloneModules => {
	const shared: Record<string, SharedModule> = {}
	const folds: StandaloneModules["folds"] = {}
	const checking: string[] = []
	const sections = writeArtifact(
		exports,
		opts,
		shared,
		{},
		folds,
		checking,
		false
	)
	return {
		code: writeSections([
			runtimeImport,
			...Object.values(shared).map(module => module.declarations.join("\n\n")),
			...sections
		]),
		modules: {},
		folds,
		checking
	}
}

// the units an artifact shares with others are modules of their own, so a bundler keeps one copy of each
export const precompileStandaloneModules = (
	exports: Record<string, StandaloneExport>,
	opts: StandaloneOptions = {}
): StandaloneModules => {
	const shared: Record<string, SharedModule> = {}
	const imports: Record<string, string[]> = {}
	const folds: StandaloneModules["folds"] = {}
	const checking: string[] = []
	const sections = writeArtifact(
		exports,
		opts,
		shared,
		imports,
		folds,
		checking,
		true
	)
	const modules: Record<string, string> = {}
	for (const specifier in shared) {
		const { readsRuntime, imports, declarations, exports } = shared[specifier]
		modules[specifier] = writeSections([
			[readsRuntime ? runtimeImport : "", writeImports(imports)]
				.filter(statement => statement)
				.join("\n"),
			...declarations,
			`export { ${exports.join(", ")} }`
		])
	}
	return {
		code: writeSections([
			`${runtimeImport}\n${writeImports(imports)}`,
			...sections
		]),
		modules,
		folds,
		checking
	}
}

const writeArtifact = (
	exports: Record<string, StandaloneExport>,
	opts: StandaloneOptions,
	shared: Record<string, SharedModule>,
	imports: Record<string, string[]>,
	folds: StandaloneModules["folds"],
	checking: string[],
	// whether each shared unit is a module, not declared in one scope
	isModular: boolean
): string[] => {
	const { configured } = opts
	const members = opts.members ?? {}
	const baking: Baking = {
		members: new Set([
			...defaultMembers.filter(member => members[member] !== false),
			...introspectionMembers.filter(member => members[member])
		]),
		write: opts.bake ?? (write => write()),
		firstIssue: opts.errors === "first",
		detailsErrors: opts.errors !== "none",
		freezes: opts.freeze !== false,
		readsConfig: configured !== false,
		createsLazily: opts.lazy !== false || opts.hoisted === true,
		checksTypes: opts.checks !== "none",
		mutatesInput: opts.mutatesInput === true,
		hoisted: opts.hoisted === true,
		shortest: opts.optimize === "size",
		flattens: opts.optimize === "size" && opts.hoisted !== true && isModular
	}
	const types: Record<string, ExportedValue> = {}
	const templates = new Set<unknown>()
	// each factory whose Type is folded, which reads it where the creations write it
	const folded = new Map<
		string,
		[index: number, artifact: StandaloneArtifact]
	>()
	const factories: (string | (() => string))[] = []
	const tables = new Set<number>()
	const artifactsByName = new Map<string, StandaloneArtifact>()
	// a trial write, adding nothing to the artifact, tells whether a factory's Type has code holding nothing the factory receives
	const canFold = (name: string, factory: StandaloneFactory): boolean => {
		if (
			// as unknown, since narrowing an ExportedValue to BaseRoot compares the Type and node structurally, too deep for TypeScript 6
			!hasArkKind(factory.type as unknown, "root") ||
			factory.defaultChecks?.length ||
			// runtime.rekeyed creates a template's copies with runtime.createValidator
			(!isCreatedByRuntime(baking.members, baking) &&
				keyOf(factory.type)[1].length)
		)
			return false
		const trial = new StandaloneArtifact(
			{ [name]: factory.type },
			Object.create(shared),
			{},
			baking
		)
		trial.templates.add(factory.type)
		try {
			trial.writeCreate(0, configured)
			return true
		} catch (e) {
			if (e instanceof ParseError) return false
			throw e
		}
	}
	let index = 0
	for (const [name, value] of Object.entries(exports)) {
		if (arkKindOf(value) !== undefined) {
			types[name] = value as never
			continue
		}
		if ("member" in value) {
			const artifact = new StandaloneArtifact(
				{},
				shared,
				imports,
				baking,
				value
			)
			artifactsByName.set(name, artifact)
			factories.push(
				artifact.writeIntrospection(value, index, configured),
				writeExport(name, index)
			)
		} else {
			const factory = value as StandaloneFactory
			const artifact = new StandaloneArtifact(
				{ [name]: factory.type },
				shared,
				imports,
				baking,
				factory
			)
			artifactsByName.set(name, artifact)
			artifact.receive(factory.params)
			// a factory whose Type is written once with the creations, which each call copies with what it receives
			if (canFold(name, factory)) {
				const { type } = factory
				folded.set(name, [index, artifact])
				if (keyOf(type)[1].length) templates.add(type)
				types[name] = type
				factories.push(() => writeFolded(name))
			} else {
				if (factory.internedBy !== undefined) tables.add(factory.internedBy)
				factories.push(
					artifact.writeFactory(name, index, configured),
					writeExport(name, index)
				)
			}
		}
		index++
	}
	const [creations, reads] = writeCreations(
		types,
		templates,
		folded,
		opts,
		baking,
		shared,
		imports
	)
	// folded factories alike but for the index their creation holds their Type at share one function, which a call passes that index
	const sharersByCode = new Map<string, string[]>()
	for (const [name, [, artifact]] of folded) {
		const [creation, position] = reads[name]
		if (position === undefined) continue
		const code = artifact.writeRekeying(`${creation}[index]`).join("\n")
		sharersByCode.set(code, [...(sharersByCode.get(code) ?? []), name])
	}
	for (const sharers of sharersByCode.values()) {
		if (sharers.length < 2) continue
		for (const name of sharers) folds[name] = [sharers[0], reads[name][1]!]
	}
	const writeFolded = (name: string) => {
		const [index, artifact] = folded.get(name)!
		const [creation, position] = reads[name]
		const fold = folds[name]
		// the first factory sharing a function writes it
		if (fold && fold[0] !== name) return ""
		const params = artifact.factory!.params.map((_, i) => `p${i}`)
		if (fold) params.unshift("index")
		return `${writeFunction(baking, `factory${index}`, params.join(", "), artifact.writeRekeying(fold ? `${creation}[index]` : readOf(creation, position)).join("\n\n"))}

${writeExport(name, index)}`
	}
	const sections = [
		...creations,
		// created at the first read or a factory's first call, which an import cycle can reach before the artifact's body runs
		[...tables].map(table => `var interned${table}`).join("\n"),
		...factories.map(factory =>
			typeof factory === "string" ? factory : factory()
		)
	]
	for (const [name, artifact] of artifactsByName)
		if (artifact.checksAtCreation) checking.push(name)
	return sections
}

interface Creation {
	indices: number[]
	values: Set<unknown>
	code: string
}

// what a creation returns, and the index it holds a value at where it creates more than one
type CreationRead = [creation: string, position: number | undefined]

const readOf = (...[creation, position]: CreationRead) =>
	position === undefined ? creation : `${creation}[${position}]`

const writeExport = (name: string, index: number) =>
	`export { factory${index} as ${JSON.stringify(name)} }`

const writeCreations = (
	types: Record<string, ExportedValue>,
	templates: ReadonlySet<unknown>,
	// a factory's Type, which only that factory reads
	folded: ReadonlyMap<string, unknown>,
	{ configured }: StandaloneOptions,
	baking: Baking,
	shared: Record<string, SharedModule>,
	imports: Record<string, string[]>
): [code: string[], reads: Record<string, CreationRead>] => {
	const names = Object.keys(types)
	const artifactOf = (indices: number[]) => {
		const artifact = new StandaloneArtifact(
			Object.fromEntries(indices.map(i => [names[i], types[names[i]]])),
			shared,
			imports,
			baking
		)
		for (const template of templates) artifact.templates.add(template)
		return artifact
	}
	const reads: Record<string, CreationRead> = {}
	let creations: Creation[] = []
	for (let i = 0; i < names.length; i++) {
		const artifact = artifactOf([i])
		const code = artifact.writeCreate(i, configured)
		const values = artifact.comparedValues
		const joined = creations.filter(creation =>
			values.some(value => creation.values.has(value))
		)
		creations = creations.filter(creation => !joined.includes(creation))
		creations.push({
			indices: [...joined.flatMap(creation => creation.indices), i].sort(
				(l, r) => l - r
			),
			values: new Set([
				...joined.flatMap(creation => [...creation.values]),
				...values
			]),
			code
		})
	}
	for (const creation of creations) {
		const [index] = creation.indices
		if (creation.indices.length > 1) {
			creation.code = artifactOf(creation.indices).writeCreate(
				index,
				configured
			)
		}
		for (const [position, i] of creation.indices.entries()) {
			reads[names[i]] = [
				baking.createsLazily ?
					`(created${index} ??= create${index}())`
				:	`created${index}`,
				creation.indices.length > 1 ? position : undefined
			]
		}
	}
	// declared as functions, which a site an import cycle reaches before the artifact is evaluated can call
	const getters = names.flatMap((name, i) => {
		if (folded.has(name)) return []
		return `${writeFunction(baking, `get${i}`, "", `\treturn ${readOf(...reads[name])}`)}\n\nexport { get${i} as ${JSON.stringify(name)} }`
	})
	return [
		[
			...creations
				.sort((l, r) => l.indices[0] - r.indices[0])
				.map(creation => creation.code),
			getters.join("\n")
		],
		reads
	]
}

const writeSections = (sections: string[]) =>
	`${sections.filter(section => section).join("\n\n")}\n`

const writeImports = (imports: Record<string, string[]>) =>
	Object.entries(imports)
		.map(
			([specifier, names]) =>
				`import { ${names.join(", ")} } from ${JSON.stringify(specifier)}`
		)
		.join("\n")

export const writeFixConfig = (configured: Configured): string =>
	configured === false ? ""
	: configured ?
		`runtime.fixConfigured(${JSON.stringify(configured.fingerprint)}, ${JSON.stringify(configured.path)})`
	:	"runtime.fixConfig()"

interface WriteDataOptions {
	// a ToJsonSchemaError's context holds the validator's own values, like a predicate or a Date bound, beside its data, which are emitted and listed here
	values?: unknown[]
}

interface Declarations {
	statements: string[]
	namesByValue: Map<unknown, string>
	valuesByRole: Record<DeclarationRole, unknown[]>
}

const createDeclarations = (): Declarations => ({
	statements: [],
	namesByValue: new Map(),
	valuesByRole: {
		shape: [],
		keys: [],
		literal: [],
		standIn: [],
		json: [],
		jsonSchema: []
	}
})

interface SharedUnit {
	unit: RootUnit
	// what it reads from other modules, which it receives as parameters
	params: string[]
	args: string[]
	imports: Record<string, string[]>
	// each of its roots its own traversals read, created with them
	shapesByName: Record<string, string>
}

export class StandaloneArtifact {
	exports: Record<string, ExportedValue>
	sharedModules: Record<string, SharedModule>
	imports: Record<string, string[]>
	holeExpressions = new Map<unknown, string>()
	labelsByHole = new Map<unknown, string>()
	classes = new Set<unknown>()
	checks: string[] = []
	validatorNamesByRoot = new Map<BaseRoot, string>()
	// a default's value is collected for the validator its morph reads, so that validator is written only if read, as a traversal writing the default inline reads none
	defaultValues = new Set<BaseRoot>()
	readRoots = new Set<BaseRoot>()
	// e.g. a default's value its morph checks, or a typed function's parameters
	runtimeReadRoots = new Set<BaseRoot>()
	unitRoots = new Set<BaseRoot>()
	// the unit holding each root in the first Type reaching it, by id, as two nodes of one id like `unknown` and `unknown.any` are one root
	unitsByHead = new Map<string, RootUnit>()
	localNamesByUnit = new Map<RootUnit, string>()
	// the unit whose values are being emitted, which names the nodes they hold
	unit: RootUnit | undefined
	writing: SharedUnit | undefined
	// each structure's propsByKey, which traversal reads only with `in`
	keyLookups = new Set<object>()
	// each pattern's own RegExp, which only traversal reads
	patternInstances = new Set<RegExp>()
	defaultsByMorph = new Map<unknown, Default>()
	defaultNamesByMorph = new Map<unknown, string>()
	objectUnits = new Set<unknown>()
	metas = new Set<object>()
	declarations = createDeclarations()
	// the JSON Schema writers reading only the runtime and what the factory receives, by their text
	sharedWriters = new Map<string, string>()
	emitting = new Set<object>()
	moduleNamesByModule = new Map<object, string>()
	namesByTypedFn = new Map<InternalTypedFn, string>()
	stringModuleNamesByRoot: Record<ComposedString, Map<BaseRoot, string>> = {
		expression: new Map(),
		description: new Map()
	}
	links: string[] = []
	modules: string[] = []
	// a literal holding a validator is declared empty and filled once validators exist
	fills: string[] = []
	// each default's morph, created once the validator applying its value exists
	defaults: string[] = []
	lateNames = new Set<string>()
	// the Types exported and those their metas hold, rather than a default's
	comparedRoots: BaseRoot[]
	// a Type written without its key's functions, which each call of its factory copies with those it receives
	templates = new Set<unknown>()
	// a default's node, which only its check reads, so its validator is keyed by its traversal
	checkedRoots: ReadonlySet<BaseRoot>
	// what a factory receives and checks, none for an artifact creating its exports once
	factory: StandaloneFactory | undefined
	// each default arktype checks where it defines the Type, which the factory checks once it creates the validators
	defaultChecks: readonly DefaultCheck[]
	// the holes of each value a factory receives, by the name holding them
	holesByName = new Map<string, readonly unknown[]>()
	baking: Baking
	// the Type whose introspection the factory returns, which declares no units
	introspected: BaseRoot | undefined

	constructor(
		exports: Record<string, ExportedValue>,
		sharedModules: Record<string, SharedModule>,
		imports: Record<string, string[]>,
		baking: Baking,
		// the factory a site calls, or the function returning a Type's introspection, which receives only what its default checks read
		called?: StandaloneFactory | StandaloneIntrospection
	) {
		this.exports = exports
		this.baking = baking
		const introspected = called && "member" in called ? called : undefined
		this.introspected = introspected?.type
		this.factory = introspected ? undefined : (called as StandaloneFactory)
		this.defaultChecks = (introspected ?? this.factory)?.defaultChecks ?? []
		this.sharedModules = sharedModules
		this.imports = imports
		for (const [name, value] of Object.entries(exports)) {
			const path = appendStringifiedKey("", name)
			this.collectExport(value, path)
		}
		const exported = new Set(this.roots)
		for (const [node] of this.defaultChecks)
			this.collectType(node.in as BaseRoot)
		this.checkedRoots = new Set(this.roots.filter(root => !exported.has(root)))
		// the runtime writes only en
		const locale = $ark.config.locale
		if (locale !== undefined && locale !== $ark.defaultConfig.locale)
			throwParseError(writeUnprecompilableMessage("a configured locale"))
		// a Type in a meta is emitted as its validator, so it needs traversals of its own
		do {
			for (const root of this.roots) {
				if (this.unitRoots.has(root)) continue
				this.unitRoots.add(root)
				for (const unit of rootUnitsOf(root, this.baking.mutatesInput)) {
					for (const head of unit.roots) {
						if (!this.unitsByHead.has(head.id))
							this.unitsByHead.set(head.id, unit)
					}
				}
			}
		} while (this.collectMetaTypes() || this.collectDefaultTypes())
		this.comparedRoots = this.roots
		for (const root of this.roots) {
			// the runtime's own onFail is the one the program configures, which only a validator's meta overrides
			if (
				root.meta.onFail === undefined &&
				root.onFail !== $ark.resolvedConfig!.onFail
			)
				throwParseError(writeUnprecompilableMessage("onFail"))
		}
		for (const unit of this.units) {
			for (const node of writtenNodesOf(unit)) {
				this.metas.add(node.meta)
				if (node.hasKind("structure")) this.keyLookups.add(node.propsByKey)
				else if (node.hasKind("pattern"))
					this.patternInstances.add(node.instance)
				else if (node.hasKind("optional") || node.hasKind("sequence"))
					collectDefaults(node, this.defaultsByMorph)
				else if (
					node.hasKind("unit") &&
					hasDomain(node.unit, "object") &&
					!isDate(node.unit)
				)
					this.objectUnits.add(node.unit)
			}
		}
	}

	get checksAtCreation(): boolean {
		return this.checks.length > 0 || this.defaultChecks.length > 0
	}

	receive(params: FactoryParam[]): void {
		const checked: [hole: unknown, kind: HoleKind, expression: string][] = []
		for (let i = 0; i < params.length; i++) {
			const param = params[i]
			if (param.kind === "input") {
				for (const [path, value] of param.reads)
					this.compareInput(`p${i}`, path, value, param.label)
			} else if (param.kind === "helper") {
				this.checks.push(
					`runtime.checkHelper(p${i}, ${JSON.stringify(param.file)}, ${JSON.stringify(param.name)}, ${JSON.stringify(param.label)})`
				)
			} else if (param.kind === "progress") {
				this.checks.push(
					`runtime.checkProgress(p${i}, ${param.at}, ${JSON.stringify(param.label)})`
				)
			} else if (this.receiveHole(param.value, `p${i}`, param.label)) {
				if (!param.isOwn) checked.push([param.value, param.kind, `p${i}`])
				if (param.kind === "class") this.classes.add(param.value)
			}
		}
		this.checkFacts(checked)
		this.refuseNameDependence()
	}

	checkFacts(
		checked: [hole: unknown, kind: HoleKind, expression: string][]
	): void {
		// arktype relates a class to every other the definition holds, including those of a Type it references, which that Type's factory didn't see
		for (const hole of this.classes) {
			if (!checked.some(([checkedHole]) => checkedHole === hole))
				checked.push([hole, "class", this.holeExpressions.get(hole)!])
		}
		const classesOf = <v>(valueOf: (hole: unknown) => v) =>
			Object.fromEntries(
				[...this.classes].map(hole => [
					this.labelsByHole.get(hole)!,
					valueOf(hole)
				])
			)
		const classesArg = `, { ${Object.entries(
			classesOf(hole => this.holeExpressions.get(hole))
		)
			.map(([label, expression]) => `${JSON.stringify(label)}: ${expression}`)
			.join(", ")} }`
		for (const [hole, kind, expression] of checked) {
			const expected = runtime.factOfHole(
				hole,
				kind,
				classesOf(hole => hole)
			)
			this.checks.push(
				`runtime.checkFacts(runtime.factOfHole(${expression}${kind === "function" ? "" : `, "${kind}"`}${kind === "class" ? classesArg : ""}), ${JSON.stringify(expected)}, ${JSON.stringify(this.labelsByHole.get(hole))})`
			)
		}
	}

	// a string that prints a hole's name is completed at creation, and an order depending on it is computed there, so compiled code may not depend on it
	refuseNameDependence(): void {
		const holesByName: Record<string, unknown> = Object.create(null)
		const printedNameOf = (hole: unknown) =>
			`runtime.printable(runtime.functionNameOf(${this.holeExpressions.get(hole)}))`
		for (const hole of this.holeExpressions.keys()) {
			if (typeof hole !== "function") continue
			const name = functionNameOf(hole)
			if (!name.includes(holeNameMarker)) {
				throwInternalError(
					`Unexpected function ${this.labelsByHole.get(hole)} not named by a placeholder`
				)
			}
			// an expression evaluated more than once creates a function each time under one placeholder, which prints the first one's name
			const first = holesByName[name]
			if (first === undefined) holesByName[name] = hole
			else if (
				this.holeExpressions.get(hole) !== this.holeExpressions.get(first)
			) {
				this.checks.push(
					`runtime.checkFacts(${printedNameOf(hole)}, ${printedNameOf(first)}, ${JSON.stringify(this.labelsByHole.get(hole))})`
				)
			}
		}
		const printed = this.units
			.flatMap(unit => unit.members.map(([, source]) => source))
			.join("\n")
			.match(holeNamePattern)
		if (printed) {
			throwParseError(
				writeUnprecompilableMessage(
					`compiled code printing the name of ${this.labelsByHole.get(this.holeNamed(printed[0])) ?? printed[0]}`
				)
			)
		}
		for (const node of this.declared) {
			const lists =
				node.hasKind("union") ?
					node.inner.ordered ?
						[]
					:	[node.branches]
				:	sortedConstraintKeys.map(
						k => (node.inner as Record<string, unknown>)[k]
					)
			for (const list of lists) {
				if (!isArray(list)) continue
				for (let i = 1; i < list.length; i++)
					this.refuseHoleOrdering(list[i - 1] as BaseNode, list[i] as BaseNode)
			}
		}
	}

	holeNamed(name: string, read = functionNameOf): unknown {
		for (const hole of this.holeExpressions.keys())
			if (typeof hole === "function" && read(hole) === name) return hole
	}

	// a hole received twice is the value the build read twice, so it's checked to be that value rather than for its facts
	receiveHole(hole: unknown, expression: string, label: string): boolean {
		const received = this.holeExpressions.get(hole)
		if (received) {
			this.checks.push(
				`runtime.checkIdentity(${expression}, ${received}, ${JSON.stringify(label)}, ${JSON.stringify(this.labelsByHole.get(hole))})`
			)
			return false
		}
		this.holeExpressions.set(hole, expression)
		this.labelsByHole.set(hole, label)
		return true
	}

	// each factory receiving a binding checks it with one function, which a bundle holds once
	receiverOf(value: Foldable, id: string, label: string): string {
		const kind = hasArkKind(value, "root") ? "" : `, "${kindNameOf(value)}"`
		const body = `runtime.holesOf(holder, ${writeId(id)}, ${JSON.stringify(label)}${kind})`
		const name = `receive${hashOf(body)}`
		const specifier = this.specifierOf(name)
		this.sharedModules[specifier] ??= {
			readsRuntime: true,
			imports: {},
			declarations: [
				writeFunction(this.baking, name, "holder", `\treturn ${body}`)
			],
			exports: [name]
		}
		this.importName(specifier, name)
		return name
	}

	compareInput(
		param: string,
		path: PropertyKey[],
		value: unknown,
		root: string
	): void {
		let expression = param
		let label = root
		for (const k of path) {
			if (typeof k === "symbol") {
				return throwParseError(
					writeUnprecompilableMessage(`the symbol key of \`${label}\``)
				)
			}
			expression += `[${JSON.stringify(k)}]`
			label = appendStringifiedKey(label, k)
		}
		label = `\`${label}\``
		if (
			hasArkKind(value, "root") ||
			hasArkKind(value, "module") ||
			hasArkKind(value, "scope") ||
			hasArkKind(value, "generic")
		) {
			const [id, holes] = keyOf(value)
			const isType = hasArkKind(value, "root")
			const holesName = `holes${this.checks.length}`
			if (holes.length) this.holesByName.set(holesName, holes)
			if (this.baking.checksTypes || holes.length) {
				this.checks.push(
					`${holes.length ? `const ${holesName} = ` : ""}${this.receiverOf(value, id, label)}(${expression})`
				)
			}
			// a class a Module, Scope or Generic holds is related to the others this artifact's Types hold
			const related =
				isType ?
					[value, ...value.references]
				:	this.units.flatMap(writtenNodesOf)
			const protos = related.flatMap(node =>
				node.hasKind("proto") ? [node.proto] : []
			)
			for (let i = 0; i < holes.length; i++) {
				this.receiveHole(holes[i], `${holesName}[${i}]`, `${label}'s hole ${i}`)
				if (protos.includes(holes[i] as never)) this.classes.add(holes[i])
			}
			return
		}
		// e.g. a helper the site calls, whose module the factory keeps and which an import cycle can leave unset
		if (!path.length && typeof value === "function") {
			this.checks.push(
				`runtime.checkFunction(${expression}, ${JSON.stringify(label)})`
			)
			return
		}
		if (!hasDomain(value, "object")) {
			if (typeof value === "symbol") {
				throwParseError(
					writeUnprecompilableMessage(`${printable(value)} read from ${label}`)
				)
			}
			this.checks.push(
				`runtime.checkInput(${expression}, ${this.emit(value)}, ${JSON.stringify(label)})`
			)
			return
		}
		if (
			arkKindOf(value) !== undefined ||
			!(isPlainLiteral(value) || isDateObject(value) || isRegExpObject(value))
		) {
			throwParseError(
				writeUnprecompilableMessage(`${printable(value)} read from ${label}`)
			)
		}
		this.checks.push(
			`runtime.checkFacts(runtime.describeShape(${expression}), ${JSON.stringify(runtime.describeShape(value))}, ${JSON.stringify(label)})`
		)
		if (!isPlainLiteral(value)) return
		for (const k of Reflect.ownKeys(value)) {
			if (!isArray(value))
				this.compareInput(param, [...path, k], Reflect.get(value, k), root)
			else if (k !== "length")
				this.compareInput(param, [...path, Number(k)], value[Number(k)], root)
		}
	}

	// arktype orders two siblings by their hashes, which may first differ inside the name of a function the factory receives
	refuseHoleOrdering(l: BaseNode, r: BaseNode): void {
		let i = 0
		while (i < l.hash.length && l.hash[i] === r.hash[i]) i++
		const names = [l.hash, r.hash].map(hash => registeredNameAt(hash, i))
		const name = names.find(name => name?.includes(holeNameMarker))
		if (!name) return
		const hole = this.holeNamed(name, nameOf) ?? name
		throwParseError(
			writeUnprecompilableMessage(
				`an order that depends on the name of ${this.labelsByHole.get(hole) ?? hole}`
			)
		)
	}

	get roots(): BaseRoot[] {
		return [...this.validatorNamesByRoot.keys()]
	}

	get declared(): BaseNode[] {
		return this.units.flatMap(unit => unit.declared)
	}

	// each Type's units, after those they call
	get units(): RootUnit[] {
		return [
			...new Set(
				[...this.unitRoots].flatMap(root =>
					rootUnitsOf(root, this.baking.mutatesInput)
				)
			)
		]
	}

	get comparedValues(): unknown[] {
		return [
			...this.comparedRoots,
			...this.moduleNamesByModule.keys(),
			...this.namesByTypedFn.keys(),
			...this.declarations.valuesByRole.literal,
			...this.declarations.valuesByRole.standIn
		]
	}

	collectExport(value: unknown, path: string): void {
		if (hasArkKind(value, "root")) return this.collectType(value)
		if (hasArkKind(value, "scope") || hasArkKind(value, "generic")) return
		if (isTypedFn(value)) {
			this.collectType(value.params)
			return this.collectType(value.returns)
		}
		if (!hasArkKind(value, "module"))
			return throwParseError(writeUnprecompilableMessage(`the export ${path}`))
		for (const [k, entry] of Object.entries(value))
			this.collectExport(entry, appendStringifiedKey(path, k))
	}

	collectType(root: BaseRoot): void {
		if (this.validatorNamesByRoot.has(root)) return
		const name = `validator${this.validatorNamesByRoot.size}`
		this.validatorNamesByRoot.set(root, name)
		this.lateNames.add(name)
	}

	collectMetaTypes(): boolean {
		const typeCount = this.validatorNamesByRoot.size
		const visited = new Set<object>()
		const collect = (value: unknown): void => {
			if (!hasDomain(value, "object") || visited.has(value)) return
			visited.add(value)
			if (isNode(value)) {
				if (value.isRoot()) this.collectType(value)
			} else if (isPlainLiteral(value))
				for (const v of Object.values(value)) collect(v)
		}
		for (const unit of this.units) {
			for (const node of writtenNodesOf(unit))
				for (const v of Object.values(node.meta)) collect(v)
		}
		return this.validatorNamesByRoot.size > typeCount
	}

	// a default is checked by its value's validator, which a parent checking that value inline doesn't give traversals of its own
	collectDefaultTypes(): boolean {
		const typeCount = this.validatorNamesByRoot.size
		const collect = (value: BaseRoot) => {
			if (!this.validatorNamesByRoot.has(value)) this.defaultValues.add(value)
			this.collectType(value)
		}
		for (const unit of this.units) {
			for (const node of writtenNodesOf(unit)) {
				if (node.hasKind("optional") && node.defaultValueMorph)
					collect(node.value)
				else if (node.hasKind("sequence"))
					for (const [value] of node.defaultables ?? []) collect(value)
			}
		}
		return this.validatorNamesByRoot.size > typeCount
	}

	writeCreate(index: number, configured: Configured): string {
		this.writeSharedUnits()
		const values = Object.values(this.exports).map(value =>
			this.exportOf(value)
		)
		const statements = [
			writeFixConfig(configured),
			// without validators, what is left is the Scopes and Generics exported and the Modules holding them
			...(this.roots.length ?
				this.writeBody(unitFunction => `(${unitFunction})`)
			:	[this.declarations.statements.join("\n"), this.modules.join("\n")]),
			`return ${values.length === 1 ? values[0] : `[${values.join(", ")}]`}`
		]
		const body = statements.filter(statement => statement).join("\n\n")
		return this.baking.createsLazily ?
				`var created${index}

${writeFunction(this.baking, `create${index}`, "", body)}`
			:	`const created${index} = /* @__PURE__ */ (() => {\n${body}\n})()`
	}

	// each call creates its validator from the holes and inputs the artifact received, so it declares everything the validator holds
	writeFactory(name: string, index: number, configured: Configured): string {
		const { type, params, internedBy } = this.factory!
		this.writeSharedUnits()
		// a Module, Scope or Generic declares what it holds, which the body then writes
		const value =
			this.validatorNamesByRoot.get(type as never) ?? this.exportOf(type)
		// written before the body, which declares what they read
		const defaults = this.writeDefaultChecks(this.defaultChecks)
		const holes =
			internedBy === undefined ? undefined : (
				keyOf(type)[1].map(hole => this.holeExpressions.get(hole)!)
			)
		const body = this.writeCalledBody(index)
		body.push(...defaults.map(({ check }) => check), `return ${value}`)
		const defaultKeys =
			defaults.length ? `, [${defaults.map(({ key }) => key).join(", ")}]` : ""
		const statements = [
			writeFixConfig(configured),
			...this.checks,
			...(holes ?
				[
					`return runtime.intern((interned${internedBy} ??= runtime.internTable()), [${holes.join(", ")}], () => {\n${body.filter(statement => statement).join("\n\n")}\n}${defaultKeys})`
				]
			:	body)
		]
		return this.writeFactoryFunction(index, params, statements)
	}

	// the validator its folded code creates, keyed by the functions the call receives
	writeRekeying(read: string): string[] {
		const { type } = this.factory!
		const holes = keyOf(type as never)[1]
		// a Type holding exactly the holes of a value it receives, as one of a Scope does, is keyed by that value's
		const received = [...this.holesByName].find(
			([, received]) =>
				received.length === holes.length &&
				received.every((hole, i) => hole === holes[i])
		)?.[0]
		return [
			...this.checks,
			`return ${
				holes.length ?
					`runtime.rekeyed(${read}, ${received ?? `[${holes.map(hole => this.emit(hole)).join(", ")}]`})`
				:	read
			}`
		]
	}

	writeIntrospection(
		{ member, type, data, params, thrown }: StandaloneIntrospection,
		index: number,
		configured: Configured
	): string {
		this.receive(params)
		this.writeSharedUnits()
		// the program reads it here, so a schema the build can't write refuses the site
		const value =
			member === "toJsonSchema" ?
				this.writeJsonSchema(
					type,
					() => {
						if (thrown) throw thrown
						return data
					},
					true
				)
			: member === "expression" ? this.emitExpression(type)
			: member === "description" ? this.emitDescription(type)
			: this.readJson(type)
		const defaults = this.writeDefaultChecks(this.defaultChecks)
		// arktype checked the Type's defaults where it created it, which a site reading its introspection does at each call
		return this.writeFactoryFunction(index, params, [
			writeFixConfig(configured),
			...this.checks,
			...(defaults.length ?
				[...this.writeCalledBody(index), ...defaults.map(({ check }) => check)]
			:	this.declarations.statements),
			`return ${value}`
		])
	}

	writeFactoryFunction(
		index: number,
		params: FactoryParam[],
		statements: (string | undefined)[]
	): string {
		const units = this.localUnits.map((_, i) => `var unit${index}_${i}`)
		return `${units.join("\n")}

${writeFunction(
	this.baking,
	`factory${index}`,
	params.map((_, i) => `p${i}`).join(", "),
	statements.filter(statement => statement).join("\n\n")
)}`
	}

	// each unit is evaluated once, at the first call, which may come before the artifact's body runs
	writeCalledBody(index: number): string[] {
		return this.writeBody(
			(unitFunction, i) => `(unit${index}_${i} ??= ${unitFunction})`
		)
	}

	writeDefaultChecks(
		checks: readonly DefaultCheck[]
	): { check: string; key: string }[] {
		return checks.map(([node, defaultValue, key]) => {
			const input = node.in as BaseRoot
			// a check is answered once per key, its node's traversal, value and their functions, as unchanging narrows answer equal checks alike
			const [inputId, inputHoles] = traversalKeyOf(input)
			const [valueId, valueHoles] = encodeKey(defaultValue, undefined, false)
			const defaultKey = `[${JSON.stringify(hashOf(`${inputId} ${valueId}`))}, [${[...inputHoles, ...valueHoles].map(hole => this.emit(hole)).join(", ")}]]`
			return {
				check: `runtime.checkDefault(${this.readByRuntime(input)}, ${this.emit(defaultValue)}, ${key === null ? "null" : this.emit(key)}, ${defaultKey})`,
				key: defaultKey
			}
		})
	}

	get localUnits(): RootUnit[] {
		return this.units.filter(unit => !isSharedUnit(unit))
	}

	writeSharedUnits(): void {
		for (const unit of this.units)
			if (isSharedUnit(unit)) this.writeShared(unit)
	}

	// a hoisted artifact's modules declare what it calls as functions, so they're apart from those other artifacts build as they're evaluated
	specifierOf(name: string): string {
		return `~arktype/${this.baking.hoisted ? "hoisted/" : ""}${name}`
	}

	// a unit, shape or constant nothing can read before its module is evaluated is built as the module is
	readValue(name: string): string {
		return this.baking.hoisted ? `${name}()` : name
	}

	writeShared(unit: RootUnit): void {
		const specifier = this.specifierOf(unit.name)
		if (this.sharedModules[specifier]) return
		const declarations = this.declarations
		const writing: SharedUnit = (this.writing = {
			unit,
			params: [],
			args: [],
			imports: {},
			shapesByName: {}
		})
		this.declarations = createDeclarations()
		this.unit = unit
		const returned = returnedOf(unit, this.baking)
		const read =
			this.baking.detailsErrors ? undefined : namesReadBy(unit, returned)
		// a root its own traversals read, as in a cycle, is created with them
		const ownRoots = unit.roots.filter(root =>
			unit.refs.some(
				ref => isNode(ref) && unit.names[ref.id] === unit.names[root.id]
			)
		)
		for (const root of ownRoots) {
			writing.shapesByName[unit.names[root.id]] = this.declareConst(
				root,
				"shape",
				"{}"
			)
		}
		const refs = unit.refs.flatMap((value, i) => {
			if (read && !read.has(`r${i}`)) return []
			const { statements } = this.declarations
			const declared = statements.length
			const emitted = this.emit(value)
			if (!this.baking.flattens) return [`const r${i} = ${emitted}`]
			// a flat module reads what the runtime exports by the ref's name
			const exported = /^runtime\.([\w$]+)$/.exec(emitted)?.[1]
			if (exported) {
				this.importName("arktype/runtime", `${exported} as r${i}`)
				return []
			}
			// as it does a pattern the ref declares
			if (
				hasDomain(value, "object") &&
				isRegExpObject(value) &&
				statements.length === declared + 1
			) {
				statements[declared] =
					`const r${i}${statements[declared].slice(`const ${emitted}`.length)}`
				this.declarations.namesByValue.set(value, `r${i}`)
				return []
			}
			return [`const r${i} = ${emitted}`]
		})
		const links = ownRoots.map(root => {
			const shape = writing.shapesByName[unit.names[root.id]]
			returned.push(shape)
			return `runtime.freeze(runtime.assign(${shape}, ${this.writeShape(root, shape, unit, this.traversalsOf(root, unit))}))`
		})
		const moduleDeclarations: string[] = []
		// a unit imports another's traversals by name, so no function builds them
		if (this.baking.flattens) {
			for (const name in unit.dependencies) {
				if (read && !read.has(name)) continue
				const dependency = unitOf(unit.dependencies[name][0], unit)
				this.importName(this.specifierOf(dependency.name), name)
			}
			moduleDeclarations.push(
				...writing.params.map(
					(param, i) => `const ${param} = ${writing.args[i]}`
				),
				...this.declarations.statements,
				...refs,
				...this.declareMembers(
					unit,
					[...this.declarations.statements, ...refs, ...links, ...returned],
					isStrict(unit)
				),
				...links,
				`const ${unit.name} = [${returned.join(", ")}]`
			)
		} else {
			const [dependencyParams, dependencyArgs] = this.dependencyParamsOf(
				unit,
				read
			)
			const unitFunction = this.writeUnitFunction(
				unit,
				[...dependencyParams, ...writing.params],
				[...this.declarations.statements, ...refs],
				links,
				returned
			)
			const built = `(${unitFunction})(${[...dependencyArgs, ...writing.args].join(", ")})`
			// a function a parameter destructures can't declare "use strict"
			const build =
				isStrict(unit) ?
					`(function () {\n"use strict"\nreturn ${built}\n})`
				:	`(() => ${built})`
			moduleDeclarations.push(
				...(this.baking.hoisted ?
					[
						`var ${unit.name}Unit`,
						`function ${unit.name}() {\n${isStrict(unit) ? `\t"use strict"\n` : ""}\treturn (${unit.name}Unit ??= ${built})\n}`
					]
				:	[
						`const ${unit.name} = /* @__PURE__ */ ${isStrict(unit) ? `${build}()` : built}`
					])
			)
		}
		for (const root of unit.roots) {
			const name = unit.names[root.id]
			const shape = writing.shapesByName[name]
			moduleDeclarations.push(
				writeValue(
					this.baking.hoisted,
					`${name}Node`,
					shape ?
						`${this.readValue(unit.name)}[${returned.indexOf(shape)}]`
					:	`runtime.freeze(${this.writeShape(
							root,
							this.readValue(`${name}Node`),
							unit,
							this.traversalsOf(root, unit).map(
								traversal =>
									`${this.readValue(unit.name)}[${returned.indexOf(traversal)}]`
							)
						)})`
				)
			)
		}
		this.declarations = declarations
		this.unit = undefined
		this.writing = undefined
		this.sharedModules[specifier] = {
			readsRuntime: true,
			imports: writing.imports,
			declarations: moduleDeclarations,
			exports: [
				unit.name,
				...unit.roots.map(root => `${unit.names[root.id]}Node`),
				...(this.baking.flattens ?
					returnedOf(unit, this.baking).filter(name => name)
				:	[])
			]
		}
	}

	writeUnitFunction(
		unit: RootUnit,
		params: string[],
		prologue: string[],
		epilogue: string[],
		returned: string[]
	): string {
		const directive = declaresStrict(unit) ? `"use strict"\n` : ""
		const declarations = this.declareMembers(unit, [
			...prologue,
			...epilogue,
			...returned
		])
		return `(${params.join(", ")}) => {
${directive}${[...prologue, ...declarations, ...epilogue].join("\n")}
return [${returned.join(", ")}]
}`
	}

	// no traversal reads `this` or `arguments`; only Apply and Copy run rarely
	declareMembers(
		unit: RootUnit,
		readers: string[],
		isStrict = false
	): string[] {
		return calledMembersOf(unit.members, readers).map(([name, source]) => {
			// its parameters are plain names, and size drops a trailing unread ctx
			const arrow = source.replace(
				/^function\(([^)]*)\) {/,
				(signature, params: string) =>
					`(${this.baking.shortest && !/\bctx\b/.test(source.slice(signature.length)) ? params.replace(/, ctx$/, "") : params}) => {${
						// a writing traversal is strict even where a bundle's format isn't
						isStrict && !name.endsWith("Allows") ? `\n"use strict"\n` : ""
					}`
			)
			return `const ${name} = ${/(Apply|Copy)$/.test(name) ? arrow : this.compiledOnLoad(arrow)}`
		})
	}

	// V8 compiles a parenthesized function with its module, which Node's compile cache then holds, rather than parsing it again where it's first called
	compiledOnLoad(fn: string): string {
		return this.baking.shortest ? fn : `(${fn})`
	}

	traversalsOf(root: BaseRoot, unit: RootUnit): string[] {
		const name = unit.names[root.id]
		return unit.traversals[
			unit.roots.findIndex(head => unit.names[head.id] === name)
		]
	}

	read(specifier: string, name: string, param: string, arg: string): string {
		this.importName(specifier, name)
		if (!this.writing || param === arg) return arg
		if (!this.writing.params.includes(param)) {
			this.writing.params.push(param)
			this.writing.args.push(arg)
		}
		return param
	}

	importName(specifier: string, name: string): void {
		const names = ((this.writing?.imports ?? this.imports)[specifier] ??= [])
		if (!names.includes(name)) names.push(name)
	}

	dependencyParamsOf(
		unit: RootUnit,
		read?: ReadonlySet<string>
	): [params: string[], args: string[]] {
		const namesBySource: Record<string, string[]> = {}
		const params: string[] = []
		const args: string[] = []
		for (const name in unit.dependencies) {
			if (read && !read.has(name)) continue
			const dependency = unitOf(unit.dependencies[name][0], unit)
			const index = dependency.traversals.flat().indexOf(name)
			const isShared = isSharedUnit(dependency)
			if (isShared)
				this.importName(this.specifierOf(dependency.name), dependency.name)
			const source =
				isShared ?
					this.readValue(dependency.name)
				:	this.localNamesByUnit.get(dependency)!
			if (declaresStrict(unit)) {
				params.push(name)
				args.push(`${source}[${index}]`)
			} else (namesBySource[source] ??= [])[index] = name
		}
		// V8 compiles an array pattern, whose holes are the traversals a unit doesn't read, to the iterator protocol, slower to build than reading by index
		for (const source in namesBySource) {
			const names = namesBySource[source]
			params.push(
				this.baking.shortest ?
					`[${names.join(", ")}]`
				:	`{ ${Object.entries(names)
						.map(([index, name]) => `${index}: ${name}`)
						.join(", ")} }`
			)
			args.push(source)
		}
		return [params, args]
	}

	writeBody(
		wrapUnitFunction: (unitFunction: string, i: number) => string
	): string[] {
		const traversals = this.localUnits.map((unit, i) => {
			this.localNamesByUnit.set(unit, `traversals${i}`)
			const returned = returnedOf(unit, this.baking)
			const read =
				this.baking.detailsErrors ? undefined : namesReadBy(unit, returned)
			const declared = unit.refs.flatMap((_, i) =>
				read && !read.has(`r${i}`) ? [] : [i]
			)
			this.unit = unit
			const refs = declared.map(i => this.emit(unit.refs[i]))
			this.unit = undefined
			const [dependencyParams, dependencyArgs] = this.dependencyParamsOf(
				unit,
				read
			)
			const unitFunction = this.writeUnitFunction(
				unit,
				[...dependencyParams, "refs"],
				declared.map((i, position) => `const r${i} = refs[${position}]`),
				[],
				returned
			)
			const args = [...dependencyArgs, `[${refs.join(", ")}]`]
			return `const traversals${i} = ${wrapUnitFunction(unitFunction, i)}(${args.join(", ")})`
		})
		// each is written before any is dropped, as a meta can read one written after it
		const validators = [...this.validatorNamesByRoot].map(
			([root, name]) =>
				[root, `const ${name} = ${this.writeValidator(root)}`] as const
		)
		return [
			this.declarations.statements.join("\n"),
			[...this.sharedWriters]
				.map(([writer, name]) => `const ${name} = ${writer}`)
				.join("\n"),
			traversals.join("\n"),
			this.links.join("\n"),
			validators
				.filter(
					([root]) => !this.defaultValues.has(root) || this.readRoots.has(root)
				)
				.map(([, validator]) => validator)
				.join("\n\n"),
			this.defaults.join("\n"),
			this.modules.join("\n"),
			this.fills.join("\n")
		]
	}

	writeValidator(root: BaseRoot): string {
		// a folded factory's Type is written as what constructs its validator, which each call constructs with the functions it receives
		const isTemplate = this.templates.has(root)
		const members =
			this.runtimeReadRoots.has(root) ?
				new Set([...this.baking.members, ...defaultMembers])
			:	this.baking.members
		const keepsMeta = members.has("meta")
		// beyond the shortest forms, a validator is made from what the build writes
		const ownsValidator =
			!isTemplate && !this.baking.shortest && members.has("methods")
		const [applied, allows, isCompact] = this.emitRootApply(root, ownsValidator)
		// emitted before the key encodes it, so a value the build can't emit is refused for what it is
		const meta =
			!keepsMeta ? undefined
			: keywordMetas().has(root.meta) ? "runtime.emptyMeta"
			: this.emit(root.meta)
		const [id, holes] = (this.checkedRoots.has(root) ? traversalKeyOf : keyOf)(
			root
		)
		assertDescribed(root)
		const held =
			holes.length && !isTemplate ?
				`[${holes.map(hole => this.emit(hole)).join(", ")}]`
			:	undefined
		const attributes = [
			...(keepsMeta ? [`meta: ${meta}`] : []),
			...this.emitIntrospection(root)
		]
		// without its meta, a validator still fails as the meta's onFail does
		const onFail =
			!keepsMeta && root.meta.onFail ? this.emit(root.meta.onFail) : undefined
		const rootApply = () =>
			typeof applied === "string" ? applied : (
				`${this.emitApplier(applied.params, applied.apply, applied.failure)}(${applied.args})`
			)
		// for size, a creator holding the root apply takes the unit's traversals
		const fused =
			(
				this.baking.shortest &&
				typeof applied === "object" &&
				/^\[?allows\b/.test(applied.params) &&
				!isTemplate &&
				!isCreatedByRuntime(members, this.baking)
			) ?
				applied
			:	undefined
		// else a creator the build writes makes a compact root apply itself
		const made =
			(
				!fused &&
				!ownsValidator &&
				!isTemplate &&
				typeof applied === "object" &&
				// a unit wrapped to write in place still leads with its Allows
				allows ===
					`${applied.args.replace(/^runtime\.inPlace(?:Parts|Transforms)\((.+)\)$/, "$1")}[0]` &&
				!isCreatedByRuntime(members, this.baking)
			) ?
				applied
			:	undefined
		const args = [
			...(fused ? [fused.args]
			: made ?
				[this.emitApplier(made.params, made.apply, made.failure), made.args]
			: ownsValidator && !isCompact ?
				["runtime.callingRootApply", `[${allows}, ${rootApply()}]`]
			:	[rootApply(), allows]),
			...(attributes.length ? [`{ ${attributes.join(", ")} }`] : []),
			...(!this.baking.checksTypes ? []
			: held ? [writeId(id), held]
			: onFail ? [writeId(id), "undefined"]
			: [writeId(id)]),
			...(onFail ? [onFail] : [])
		]
		const created = `${
			isTemplate ? "["
			: !isCreatedByRuntime(members, this.baking) ?
				`${this.creatorOf(members, ownsValidator, fused, !!made)}(`
			: ownsValidator ? "runtime.createValidatorWith("
			: "runtime.createValidator("
		}\n\t${args.join(",\n\t")}\n${isTemplate ? "]" : ")"}`
		return held && !this.baking.checksTypes ?
				`runtime.holdHoles(${created}, ${writeId(id)}, ${held})`
			:	created
	}

	// written for what validators keep, as the runtime's grow other builds
	creatorOf(
		members: ReadonlySet<ValidatorMember>,
		ownsValidator: boolean,
		applier?: RootApplier,
		makes = false
	): string {
		const keepsMeta = members.has("meta")
		const hasAttributes =
			keepsMeta || introspectionMembers.some(member => members.has(member))
		// as runtime.createValidatorWith and runtime.createValidator make it
		const call =
			ownsValidator ?
				"make(parts, configuredOnFail)"
			:	`(data, pipedFromCtx, onFail = configuredOnFail) => pipedFromCtx ? runtime.${this.baking.detailsErrors ? "pipedInto" : "pipedIntoUndetailed"}(pipedFromCtx, rootApply(data, null)) : rootApply(data, onFail)`
		const body = [
			applier ? `const rootApply = ${applier.apply}`
			: makes ? "const rootApply = make(parts)"
			: "",
			!keepsMeta ? ""
			: this.baking.readsConfig ?
				"const configuredOnFail = attributes.meta.onFail ?? runtime.runtimeConfig.onFail"
			:	"const configuredOnFail = attributes.meta.onFail",
			`const validator = ${members.has("methods") ? `runtime.setPrototypeOf(${call}, runtime.freeze(runtime.Validator.prototype))` : call}`,
			members.has("assert") ?
				`validator.assert = ${this.frozen("(data, pipedFromCtx) => validator(data, pipedFromCtx, runtime.throwOnDefault)")}`
			:	"",
			hasAttributes ? "runtime.assign(validator, attributes)" : "",
			`validator.allows = ${this.frozen(ownsValidator || makes ? "parts[0]" : "allows")}`,
			members.has("~standard") ?
				`validator["~standard"] = ${this.frozen(`{
		vendor: "arktype",
		version: 1,
		validate: ${this.frozen(`input => {
			const out = validator(input)
			return out instanceof runtime.ArkErrors ? out : { value: out }
		}`)}${members.has("~standard.jsonSchema") ? `,\n\t\t...attributes["~standard"]` : ""}
	}`)}`
			:	"",
			this.baking.checksTypes ?
				`return runtime.holdHoles(${this.frozen("validator")}, id, holes)`
			:	`return ${this.frozen("validator")}`
		]
			.filter(statement => statement)
			.map(statement => `\t${statement}`)
			.join("\n")
		const params = [
			...(ownsValidator || makes ? ["make", "parts"]
			: applier ? [applier.params]
			: ["rootApply", "allows"]),
			...(hasAttributes ? ["attributes"] : []),
			...(this.baking.checksTypes ? ["id", "holes = []"] : []),
			...(keepsMeta ? []
			: this.baking.readsConfig ?
				["configuredOnFail = runtime.runtimeConfig.onFail"]
			:	["configuredOnFail"])
		]
		// a flat build's creator takes each traversal, another's their array
		const name = `create${hashOf(`${params.join(", ")}\n${body}`)}`
		const specifier = this.specifierOf(name)
		this.sharedModules[specifier] ??= {
			readsRuntime: true,
			imports:
				applier?.failure ?
					{ [this.declareFailure(applier.failure)]: [applier.failure] }
				:	{},
			declarations: [writeFunction(this.baking, name, params.join(", "), body)],
			exports: [name]
		}
		this.importName(specifier, name)
		return name
	}

	frozen(expression: string): string {
		return this.baking.freezes ? `runtime.freeze(${expression})` : expression
	}

	emitIntrospection(root: BaseRoot): string[] {
		const members: string[] = []
		const bakes = (member: IntrospectionMember) =>
			this.baking.members.has(member)
		if (bakes("expression"))
			members.push(`expression: ${this.emitExpression(root)}`)
		if (bakes("description"))
			members.push(`description: ${this.emitDescription(root)}`)
		if (bakes("json") || bakes("toJSON")) {
			const json = this.readJson(root)
			if (bakes("json")) members.push(`json: ${json}`)
			if (bakes("toJSON"))
				members.push(`toJSON: ${this.frozen(`() => ${json}`)}`)
		}
		// written first, so toJsonSchema can return one for the target the program passes
		const standard =
			bakes("~standard.jsonSchema") &&
			(["input", "output"] as const).map(
				io =>
					`[${supportedJsonSchemaTargets.map(target => this.emitJsonSchema(root, () => root["~standard"].jsonSchema[io]({ target }))).join(", ")}]`
			)
		if (bakes("toJsonSchema")) {
			const written = this.emitJsonSchema(root, () => root.toJsonSchema())
			// a target's schema is returned only where the validator bakes its text anyway, so taking one adds no writer
			const byTarget = supportedJsonSchemaTargets.map(
				target =>
					this.jsonSchemaNameOf(
						this.writeJsonSchemaWriter(root, () =>
							root.toJsonSchema({ target })
						)
					) ?? 0
			)
			members.push(
				`toJsonSchema: runtime.bakedJsonSchema(${written}, [${byTarget.join(", ")}])`
			)
		}
		if (standard) {
			members.push(
				`"~standard": { jsonSchema: runtime.bakedStandardJsonSchema(${standard.join(", ")}) }`
			)
		}
		return members
	}

	// arktype returns one json object per node, which every validator of it and every site reading it share, unless it prints what the artifact receives
	readJson(root: BaseRoot): string {
		const value = `runtime.deepFreeze(${this.writeData(root.json)})`
		if (holdsLocal(root.json)) {
			return (
				this.declarations.namesByValue.get(root.json) ??
				this.declareConst(root.json, "json", value)
			)
		}
		// arktype doesn't promise Types defined apart are distinct, so a node shares json with any whose text is the same
		return this.readConstant(`json${hashOf(value)}`, value)
	}

	readConstant(name: string, value: string): string {
		const specifier = this.specifierOf(name)
		this.sharedModules[specifier] ??= {
			readsRuntime: true,
			imports: {},
			declarations: [writeValue(this.baking.hoisted, name, value)],
			exports: [name]
		}
		return this.read(specifier, name, name, this.readValue(name))
	}

	readFailure(name: keyof typeof failureSources): string {
		return this.read(this.declareFailure(name), name, name, name)
	}

	declareFailure(name: keyof typeof failureSources): string {
		const specifier = this.specifierOf(name)
		const [params, body] = failureSources[name]
		this.sharedModules[specifier] ??= {
			readsRuntime: name === "invalid" || name === "invalidCall",
			imports: {},
			declarations: [writeFunction(this.baking, name, params, body)],
			exports: [name]
		}
		return specifier
	}

	// a writer is declared by its text, so each JSON Schema a validator bakes is written once however many of its members return it
	emitJsonSchema(root: BaseRoot, write: () => unknown): string {
		const values: unknown[] = []
		const writer = this.writeJsonSchemaWriter(root, write, values)
		const declared = this.jsonSchemaNameOf(writer)
		if (declared) return declared
		// of its values, only a Date is declared, beside the validator, while a hole, builtin or bigint reads the same in every call
		if (values.some(value => typeof value === "object"))
			return this.declareConst(writer, "jsonSchema", writer)
		const written = this.declarations.valuesByRole.jsonSchema
		const name = `jsonSchema${written.length}`
		written.push(writer)
		this.sharedWriters.set(writer, name)
		return name
	}

	jsonSchemaNameOf(writer: string): string | undefined {
		return (
			this.sharedWriters.get(writer) ??
			this.declarations.namesByValue.get(writer)
		)
	}

	// arktype writes its JSON Schema anew each call
	writeJsonSchemaWriter(
		root: BaseRoot,
		write: () => unknown,
		values?: unknown[]
	): string {
		return `() => ${this.writeJsonSchema(root, write, false, values)}`
	}

	// a schema the program reads only through a validator throws why the build can't write it, where it's read
	writeJsonSchema(
		root: BaseRoot,
		write: () => unknown,
		isRead: boolean,
		values: unknown[] = []
	): string {
		try {
			assertBakeableJsonSchema(root)
			let schema: unknown
			// what writing throws, unlike the build refusing to bake what a writer read
			let thrown: unknown
			const writeOnce = () => {
				try {
					return write()
				} catch (e) {
					throw (thrown = e)
				}
			}
			try {
				schema = isRead ? writeOnce() : this.baking.write(writeOnce)
			} catch (e) {
				if (e instanceof ToJsonSchema.Error)
					return `runtime.throwJsonSchemaError(${JSON.stringify(e.code)}, ${this.emitString(e.message)}, ${this.writeData(e.context, { values })})`
				// e.g. arktype's, where a view of the Type intersects what the Type keeps apart, as a defaulted key's output and an index signature
				if (e === thrown && e instanceof ParseError)
					return `runtime.throwParseError(${this.emitString(e.message)})`
				// any other error, like one a configured writer throws, makes it a schema the build can't bake
				if (e instanceof ParseError) throw e
				throwParseError(
					`${writeUnprecompilableMessage("a JSON Schema whose writing throws")}: ${String(e)}`
				)
			}
			return `(${this.writeData(schema)})`
		} catch (e) {
			if (isRead || !(e instanceof ParseError)) throw e
			return `runtime.throwUnbaked(${JSON.stringify(e.message)})`
		}
	}

	writeData(value: unknown, opts: WriteDataOptions = {}): string {
		if (
			opts.values &&
			(typeof value === "function" ||
				typeof value === "symbol" ||
				typeof value === "bigint" ||
				(hasDomain(value, "object") && isDateObject(value)))
		) {
			opts.values.push(value)
			return this.emit(value)
		}
		if (typeof value === "string") return this.emitString(value)
		if (value === undefined) return "void 0"
		if (
			value === null ||
			typeof value === "number" ||
			typeof value === "boolean"
		)
			return Object.is(value, -0) ? "-0" : String(value)
		const prototype = hasDomain(value, "object") && prototypeOf(value)
		const isArray = prototype === Array.prototype && Array.isArray(value)
		if (
			(!isArray && prototype !== Object.prototype && prototype !== null) ||
			Object.getOwnPropertySymbols(value).length
		) {
			return throwParseError(
				writeUnprecompilableMessage(
					`introspection holding ${
						prototype ?
							`an instance of ${constructorNameOf(value as object) || "an anonymous class"}`
						:	printable(value)
					}`
				)
			)
		}
		if (isArray)
			return `[${(value as unknown[]).map(v => this.writeData(v, opts)).join(", ")}]`
		const entries = Object.entries(value as object).map(
			// a __proto__ key would set an object literal's prototype
			([k, v]) =>
				`${k === "__proto__" ? `["__proto__"]` : JSON.stringify(k)}: ${this.writeData(v, opts)}`
		)
		if (prototype === null) entries.unshift("__proto__: null")
		return `{ ${entries.join(", ")} }`
	}

	// what a validator calls and the Allows it holds, its apply reading the runtime's exports with the least ctx its checks report to
	emitRootApply(
		root: BaseRoot,
		asValidator: boolean
	): [rootApply: string | RootApplier, allows: string, isCompact: boolean] {
		// a callback can read the API Traversal adds, which none of the runtime's own keywords declaring one parameter does
		const callbacks = declares(
			root,
			node =>
				node.hasKind("morph") ||
				(node.hasKind("predicate") &&
					!(
						runtimePathsByValue.has(node.predicate) && node.predicate.length < 2
					))
		)
		if (!this.baking.detailsErrors) {
			return this.emitUndetailedApply(
				root,
				callbacks ? "Traversal" : "InternalTraversal",
				asValidator
			)
		}
		// an Apply that calls back only into the runtime's keywords keeps no state but what fails, so it reports into the errors the root returns, unless a union applies its branches apart
		const reportsIssues =
			!root.includesAlias &&
			!root.includesMorph &&
			!callbacks &&
			!declares(
				root,
				node =>
					node.hasKind("union") &&
					!node.compiledDiscriminant &&
					!isDecidedByAllows(node)
			)
		const ctx =
			this.baking.firstIssue ?
				reportsIssues ? "FirstIssues"
				:	"FirstIssueTraversal"
			: reportsIssues ? "ArkErrors"
			: callbacks ? "Traversal"
			: "InternalTraversal"
		// a first-issue build's traversal drops the rest as it finalizes, which applyErrors doesn't call
		const appliesErrors = !this.baking.firstIssue || reportsIssues
		const refOf = (param: RootApplyParam) =>
			param === "Traversal" ? `runtime.${ctx}`
			: param === "config" ? "runtime.runtimeConfig"
			: param === "TransformErrors" ? param
			: param === "applyRejected" && appliesErrors ? "runtime.applyNodeErrors"
			: this.emit(rootApplyRuntime[param])
		// in place, a call transforms an object once, failing where a check does
		const inPlace =
			this.baking.mutatesInput && root.transforms && tracksWrites(root)
		const strategy = root.rootApplyStrategy
		// most root applies are one arrow, half the length of the function writeRootApply names for the JIT
		const isArrow =
			!root.includesAlias &&
			(strategy === "allows" ||
				(strategy === "transform" &&
					!root.includesMorph &&
					!(root.hasKind("union") && !root.compiledDiscriminant)))
		const transforms = strategy === "transform"
		const isCompact = isArrow && appliesErrors && !root.allowsRequiresContext
		const flat =
			isCompact && !asValidator ?
				this.flatTraversalsOf(root, transforms ? [0, 1, 2] : [0, 1])
			:	undefined
		const traversals =
			flat ? flat[0]
			: isCompact ? this.compactTraversalsOf(root)
			: undefined
		if (traversals) {
			const pattern =
				flat ? `allows, apply${transforms ? ", transform" : ""}`
				: this.baking.shortest ?
					`[allows, apply${transforms ? ", transform" : ""}]`
				:	`{ 0: allows, 1: apply${transforms ? ", 2: transform" : ""} }`
			const valid = transforms ? "transform(data)" : "data"
			const parts =
				flat ?
					(inPlace ?
						[
							flat[0],
							`runtime.appliesInPlace(${flat[1]})`,
							`runtime.transformsInPlace(${flat[2]})`
						]
					:	flat
					).join(", ")
				: inPlace ? `runtime.inPlaceParts(${traversals})`
				: traversals
			// the validator itself, declaring data alone so a call passing only data pads no parameters
			if (asValidator) {
				return [
					`((${pattern}, onFail) => ${this.compiledOnLoad(`(data, ...args) => allows(data) ? ${valid} : runtime.applyCallErrors(apply, data, args, onFail, ${refOf("Traversal")})`)})`,
					parts,
					true
				]
			}
			return [
				{
					params: pattern,
					apply: `(data, onFail) => allows(data) ? ${valid} : runtime.applyErrors(apply, data, ${refOf("config")}, onFail, ${refOf("Traversal")})`,
					args: parts
				},
				flat ? flat[0] : `${traversals}[0]`,
				false
			]
		}
		const shape = this.shapeOf(root)
		const node = inPlace ? `runtime.inPlaceNode(${shape})` : shape
		if (isArrow) {
			return [
				{
					params: "node",
					apply: `(data, onFail) => node.allows(data) ? ${transforms ? "node.traverseTransform(data)" : "data"} : ${refOf("applyRejected")}(node, data, ${refOf("config")}, onFail, ${refOf("Traversal")})`,
					args: node
				},
				`${shape}.allows`,
				false
			]
		}
		const body = writeRootApply(
			root,
			this.unitsByHead.get(root.id)!.names[root.id],
			refOf
		)
		// the class a valid result is checked against is captured, as V8 folds what a closure captures but not what it reads from the runtime's module
		const captured =
			/\bTransformErrors\b/.test(body) ?
				`const TransformErrors = ${this.emit(rootApplyRuntime.TransformErrors)}\n\t\t`
			:	""
		return [
			`(function (node) {
		${captured}${body}
	})(${node})`,
			`${shape}.allows`,
			false
		]
	}

	// where arktype's root apply reports what fails, this returns one issue
	emitUndetailedApply(
		root: BaseRoot,
		ctx: string,
		asValidator: boolean
	): [rootApply: string | RootApplier, allows: string, isCompact: boolean] {
		const strategy = root.rootApplyStrategy
		// optimized for size, the module holding the apply imports it
		const invalid = () =>
			`${this.baking.shortest ? "invalid" : this.readFailure("invalid")}(data, onFail)`
		const transforms = root.transforms
		// an undiscriminated union transforms what a branch allows, else unset
		const selects =
			strategy === "transform" &&
			root.hasKind("union") &&
			!root.compiledDiscriminant
		const captures = strategy === "transform" && root.includesMorph
		// a transform through a cycle, resolved from the root's shape
		const resolves = strategy === "contextualTransform" && root.includesAlias
		const isCompact = !root.allowsRequiresContext && !resolves
		const flat =
			isCompact && !asValidator ?
				this.flatTraversalsOf(root, transforms ? [0, 2] : [0])
			:	undefined
		const traversals =
			flat ? flat[0]
			: isCompact ? this.compactTraversalsOf(root)
			: undefined
		const shape = traversals ? undefined : this.shapeOf(root)
		const allows = traversals ? "allows" : "node.allows"
		const transform = traversals ? "transform" : "node.traverseTransform"
		const fails = [
			...(selects ? [`result === ${JSON.stringify(unset)}`] : []),
			...(captures ?
				["result !== data && result instanceof TransformErrors"]
			:	[])
		]
		const body =
			strategy === "contextualTransform" ?
				[
					...(resolves ?
						[
							"const untracked = runtime.allowsAcyclic(node, data)",
							`if (!(untracked ?? runtime.allowsInContext(node, data, runtime.runtimeConfig))) return ${invalid()}`,
							`const ctx = new runtime.${ctx}(data, runtime.runtimeConfig)`,
							"ctx.tracksTransforms = untracked === undefined",
							`const result = runtime.transformResolution(ctx, ${JSON.stringify(this.unitsByHead.get(root.id)!.names[root.id])}, data, node.traverseTransform)`
						]
					:	[
							`if (!${allows}(data)) return ${invalid()}`,
							`const ctx = new runtime.${ctx}(data, runtime.runtimeConfig)`,
							`const result = ${transform}(data, ctx)`
						]),
					`return ctx.hasError() ? ${invalid()} : result`
				]
			: fails.length ?
				[
					...(selects ? [] : [`if (!${allows}(data)) return ${invalid()}`]),
					`const result = ${transform}(data)`,
					`return ${fails.join(" || ")} ? ${invalid()} : result`
				]
			:	undefined
		const params =
			!traversals ? "node"
			: flat ?
				[
					...(selects ? [] : ["allows"]),
					...(transforms ? ["transform"] : [])
				].join(", ")
			: this.baking.shortest ?
				`[${selects ? "" : "allows"}${transforms ? ", , transform" : ""}]`
			:	`{ ${[...(selects ? [] : ["0: allows"]), ...(transforms ? ["2: transform"] : [])].join(", ")} }`
		const valid = transforms ? `${transform}(data)` : "data"
		// as in a detailed build, a call writing in place transforms an object once
		const inPlace = this.baking.mutatesInput && transforms && tracksWrites(root)
		const parts =
			!traversals ? undefined
			: flat ?
				[
					...(selects ? [] : [flat[0]]),
					...(transforms ?
						[inPlace ? `runtime.transformsInPlace(${flat[1]})` : flat[1]]
					:	[])
				].join(", ")
			: inPlace ? `runtime.inPlaceTransforms(${traversals})`
			: traversals
		// the validator itself, as a detailed build's compact root apply is
		if (asValidator && parts && !body) {
			return [
				`((${params}, onFail) => ${this.compiledOnLoad(`(data, ...args) => ${allows}(data) ? ${valid} : ${this.readFailure("invalidCall")}(data, args, onFail)`)})`,
				parts,
				true
			]
		}
		const apply =
			body ?
				`(data, onFail) => {\n\t\t${body.join("\n\t\t")}\n\t}`
			:	`(data, onFail) => ${allows}(data) ? ${valid} : ${invalid()}`
		const node =
			parts ?? (inPlace ? `runtime.inPlaceTransformNode(${shape})` : shape)
		return [
			{
				params: `${params}${captures ? ", TransformErrors" : ""}`,
				apply,
				args: `${node}${captures ? `, ${this.emit(rootApplyRuntime.TransformErrors)}` : ""}`,
				failure: "invalid"
			},
			flat ? flat[0]
			: traversals ? `${traversals}[0]`
			: `${shape}.allows`,
			false
		]
	}

	// a validator's own root apply, or for size one shared by those alike
	emitApplier(
		params: string,
		apply: string,
		failure?: keyof typeof failureSources
	): string {
		if (!this.baking.shortest)
			return `((${params}) => ${this.compiledOnLoad(apply)})`
		const body = `\treturn ${apply}`
		const name = `apply${hashOf(`${params}\n${body}`)}`
		const specifier = this.specifierOf(name)
		this.sharedModules[specifier] ??= {
			readsRuntime: true,
			imports: failure ? { [this.declareFailure(failure)]: [failure] } : {},
			declarations: [writeFunction(this.baking, name, params, body)],
			exports: [name]
		}
		return this.read(specifier, name, name, name)
	}

	// a flat build passes a root apply the traversals its unit exports
	flatTraversalsOf(root: BaseRoot, indices: number[]): string[] | undefined {
		const unit = this.unitsByHead.get(root.id)!
		if (!this.baking.flattens || !isSharedUnit(unit)) return
		const specifier = this.specifierOf(unit.name)
		const traversals = this.traversalsOf(root, unit)
		return indices.map(i =>
			this.read(specifier, traversals[i], traversals[i], traversals[i])
		)
	}

	// a root apply that is one arrow reads its root's traversals from its unit, where they come first, so its validator needs no shape
	compactTraversalsOf(root: BaseRoot): string | undefined {
		const unit = this.unitsByHead.get(root.id)!
		if (unit.traversals.flat()[0] !== this.traversalsOf(root, unit)[0]) return
		return isSharedUnit(unit) ?
				this.read(
					this.specifierOf(unit.name),
					unit.name,
					unit.name,
					this.readValue(unit.name)
				)
			:	this.localNamesByUnit.get(unit)
	}

	// a Type's expression is a module of its own, so a factory checking that it receives the Type shares it with the Type's validator
	emitExpression(root: BaseRoot): string {
		if (root.expression.includes(holeNameMarker))
			return this.emitString(root.expression)
		const name = this.stringModuleOf(root, "expression")
		return `${this.read(this.specifierOf(name), name, name, name)}()`
	}

	// a description holding those of the roots it references is composed from their modules, else written where it's read
	emitDescription(root: BaseRoot): string {
		if (root.description.includes(holeNameMarker))
			return this.emitString(root.description)
		const parts = partsOf(root, "description")
		if (parts.every(part => typeof part === "string"))
			return this.emitString(root.description)
		const name = this.writeStringModule(root, "description", parts)
		return `${this.read(this.specifierOf(name), name, name, name)}()`
	}

	stringModuleOf(root: BaseRoot, kind: ComposedString): string {
		return (
			this.stringModuleNamesByRoot[kind].get(root) ??
			this.writeStringModule(root, kind, partsOf(root, kind))
		)
	}

	// a string is composed from those of the roots it references, so one many Types print is written once
	writeStringModule(
		root: BaseRoot,
		kind: ComposedString,
		parts: (string | BaseRoot)[]
	): string {
		const imports: Record<string, string[]> = {}
		const body = parts
			.map(part => {
				if (typeof part === "string") return JSON.stringify(part)
				const name = this.stringModuleOf(part, kind)
				imports[this.specifierOf(name)] = [name]
				return `${name}()`
			})
			.join(" + ")
		const name = `${kind}${hashOf(body)}`
		this.sharedModules[this.specifierOf(name)] ??= {
			readsRuntime: false,
			imports,
			declarations: [writeFunction(this.baking, name, "", `\treturn ${body}`)],
			exports: [name]
		}
		this.stringModuleNamesByRoot[kind].set(root, name)
		return name
	}

	// a string printing a hole's name is completed at creation with arktype's own printing
	emitString(s: string): string {
		const parts: string[] = []
		let start = 0
		for (const match of s.matchAll(printedHoleNamePattern)) {
			if (match.index > start)
				parts.push(JSON.stringify(s.slice(start, match.index)))
			const [, registered, predicate, fn, name] = match
			const placeholder = registered ?? predicate ?? fn ?? name
			const hole =
				this.holeExpressions.get(this.holeNamed(placeholder)) ??
				throwParseError(
					writeUnprecompilableMessage(
						`the name of ${placeholder}, which the validator doesn't receive`
					)
				)
			parts.push(
				// the registry names a function as arktype's json refers to it
				registered ? `"$ark." + runtime.baseNameOf(${hole})`
				: predicate ? `runtime.describePredicate({ predicate: ${hole} })`
				: fn ? `"Function(" + runtime.baseNameOf(${hole}) + ")"`
				: `runtime.functionNameOf(${hole})`
			)
			start = match.index + match[0].length
		}
		if (start < s.length) parts.push(JSON.stringify(s.slice(start)))
		return parts.join(" + ") || '""'
	}

	// a Scope or Generic is an empty object, since resolving an alias or instantiating a Generic needs arktype
	exportOf(value: unknown): string {
		if (hasArkKind(value, "root")) return this.readValidator(value)!
		if (hasArkKind(value, "scope") || hasArkKind(value, "generic")) {
			const declared = this.declarations.namesByValue.get(value)
			if (declared) return declared
			return this.declareConst(
				value,
				"standIn",
				this.withHoles(value, "runtime.freeze({})")
			)
		}
		if (isTypedFn(value)) {
			let name = this.namesByTypedFn.get(value)
			if (name) return name
			name = `typedFn${this.namesByTypedFn.size}`
			this.namesByTypedFn.set(value, name)
			this.modules.push(
				`const ${name} = runtime.typedFn(${this.emit(value.raw)}, ${this.readByRuntime(value.params)}, ${this.readByRuntime(value.returns)})`
			)
			return name
		}
		if (!hasArkKind(value, "module"))
			return throwInternalError(`Unexpected export ${printable(value)}`)
		const declared = this.moduleNamesByModule.get(value)
		if (declared) return declared
		const entries = Object.entries(value).map(
			([k, entry]) => `[${JSON.stringify(k)}]: ${this.exportOf(entry)}`
		)
		const name = `module${this.moduleNamesByModule.size}`
		this.moduleNamesByModule.set(value, name)
		this.modules.push(
			`const ${name} = ${this.withHoles(value, `runtime.freeze({ ${entries.join(", ")} })`)}`
		)
		return name
	}

	// a factory reading a Module, Scope or Generic compares it with the build's and takes the holes it holds
	withHoles(value: Foldable, expression: string): string {
		const [id, holes] = keyOf(value)
		if (!this.baking.checksTypes && !holes.length) return expression
		return `runtime.holdHoles(${expression}, ${writeId(id)}${holes.length ? `, [${holes.map(hole => this.emit(hole)).join(", ")}]` : ""})`
	}

	readValidator(root: BaseRoot): string | undefined {
		this.readRoots.add(root)
		return this.validatorNamesByRoot.get(root)
	}

	readByRuntime(root: BaseRoot): string | undefined {
		this.runtimeReadRoots.add(root)
		return this.readValidator(root)
	}

	declareConst(
		value: unknown,
		role: DeclarationRole,
		expression: string
	): string {
		const values = this.declarations.valuesByRole[role]
		const name = `${role}${values.length}`
		values.push(value)
		this.declarations.namesByValue.set(value, name)
		this.declarations.statements.push(`const ${name} = ${expression}`)
		return name
	}

	shapeOf(node: BaseRoot): string {
		const unit =
			this.unit ? unitOf(node, this.unit) : this.unitsByHead.get(node.id)!
		const name = unit.names[node.id]
		const own = this.writing?.shapesByName[name]
		if (own) return own
		if (isSharedUnit(unit)) {
			const shape = this.read(
				this.specifierOf(unit.name),
				`${name}Node`,
				name,
				this.readValue(`${name}Node`)
			)
			// a hoisted shape is read through its getter once per creation
			return this.writing || !this.baking.hoisted ?
					shape
				:	(this.declarations.namesByValue.get(node) ??
						this.declareConst(node, "shape", shape))
		}
		const declared = this.declarations.namesByValue.get(node)
		if (declared) return declared
		const shape = this.declareConst(node, "shape", "{}")
		const traversals = unit.traversals.flat()
		this.links.push(
			`runtime.freeze(runtime.assign(${shape}, ${this.writeShape(
				node,
				shape,
				unit,
				this.traversalsOf(node, unit).map(
					traversal =>
						`${this.localNamesByUnit.get(unit)}[${traversals.indexOf(traversal)}]`
				)
			)}))`
		)
		return shape
	}

	writeShape(
		node: BaseRoot,
		shape: string,
		unit: RootUnit,
		traversals: string[]
	): string {
		// read only by the traversal of a node holding a cycle, as it enters the cycle's resolution
		const ids =
			node.includesAlias ?
				`\n\tid: ${JSON.stringify(unit.names[node.id])},\n\ttrackedId: ${JSON.stringify(
					unit.names[node.trackedId as NodeId] ??
						throwParseError(
							writeUnprecompilableMessage(`${node.expression}'s cycle`)
						)
				)},`
			:	""
		// a flag that is false, or a member nothing reads, is left out, which the runtime reads as undefined
		const flags = shapeFlags.flatMap(flag =>
			node[flag] ? [`\n\t${flag}: true,`] : []
		)
		// Allows and the scope holding config are read only past allows, by a cycle's resolution or a predicate reading ctx
		const traverses =
			node.includesAlias ||
			node.allowsRequiresContext ||
			node.allowsRequiresTraversal
		const transform =
			traversals[2] ? `\n\ttraverseTransform: ${traversals[2]},` : ""
		const apply =
			this.baking.detailsErrors ? traversals[1]
			: node.allowsRequiresContext && !node.includesAlias ?
				`${this.readFailure("applyBy")}(${traversals[0]})`
			:	this.readFailure("applyInvalid")
		return `{${ids}${flags.join("")}${traverses ? `\n\ttraverseAllows: ${traversals[0]},` : ""}
	traverseApply: ${apply},${transform}
	allows: ${node.allowsRequiresContext ? `data => runtime.allowsUntracked(${shape}, data) ?? runtime.allowsInContext(${shape}, data, runtime.runtimeConfig)` : traversals[0]}${traverses ? ",\n\t$: runtime.runtimeScope" : ""}
}`
	}

	emit(value: unknown): string {
		const hole = this.holeExpressions.get(value)
		if (hole) return hole
		if (typeof value === "string") return this.emitString(value)
		if (typeof value === "symbol")
			return throwParseError(writeUnprecompilableMessage(printable(value)))
		if (!hasDomain(value, "object"))
			return Object.is(value, -0) ? "-0" : serializePrimitive(value as never)
		const runtimePath = runtimePathsByValue.get(value)
		if (runtimePath) return runtimePath
		const declared = this.declarations.namesByValue.get(value)
		if (declared) return declared
		const defaulted = this.defaultsByMorph.get(value)
		if (defaulted) return this.emitDefault(value, ...defaulted)
		// a unit is compared by reference, so a copy wouldn't equal it
		if (this.objectUnits.has(value)) {
			throwParseError(
				writeUnprecompilableMessage(
					`the unit ${isNode(value) ? String(value) : printable(value)}`
				)
			)
		}
		if (isNode(value)) {
			return value.isRoot() ?
					this.shapeOf(value)
				:	throwParseError(
						writeUnprecompilableMessage(`${value.kind} ${value.expression}`)
					)
		}
		if (typeof value === "function") {
			const name = functionNameOf(value)
			return Reflect.get(globalThis, name) === value ?
					`globalThis[${JSON.stringify(name)}]`
				:	throwParseError(writeUnprecompilableMessage(printable(value)))
		}
		if (failureSites.has(value)) return this.emitSite(value)
		// a structure's keys are read only with `in`, so they're emitted without their props
		if (this.keyLookups.has(value)) {
			const keys = Reflect.ownKeys(value).map(
				k => `[${typeof k === "symbol" ? this.emit(k) : JSON.stringify(k)}]: 1`
			)
			return this.declareConst(
				value,
				"keys",
				`runtime.freeze({ __proto__: null, ${keys.join(", ")} })`
			)
		}
		if (this.emitting.has(value))
			return throwParseError(writeUnprecompilableMessage("a cyclic object"))
		if (isDateObject(value)) {
			if (Reflect.ownKeys(value).length) {
				throwParseError(
					writeUnprecompilableMessage("a Date with its own properties")
				)
			}
			return this.declareConst(value, "literal", `new Date(${value.getTime()})`)
		}
		if (isRegExpObject(value)) {
			if (Reflect.ownKeys(value).some(k => k !== "lastIndex")) {
				throwParseError(
					writeUnprecompilableMessage("a RegExp with its own properties")
				)
			}
			// a RegExp's source is escaped to be written as a literal, which creates one RegExp each time it's evaluated as the constructor would
			const regex = `/${value.source}/${value.flags}`
			// no program can reach a pattern's own, whose lastIndex arktype resets before each test
			if (this.patternInstances.has(value))
				return this.declareConst(value, "literal", regex)
			return this.declareConst(
				value,
				"literal",
				value.lastIndex ?
					`runtime.assign(${regex}, { lastIndex: ${value.lastIndex} })`
				:	regex
			)
		}
		return (
			(this.metas.has(value) && this.readMeta(value)) || this.emitLiteral(value)
		)
	}

	// content-equal metas are frozen, so they share one
	readMeta(meta: object): string | undefined {
		if (!Reflect.ownKeys(meta).length) return "runtime.emptyMeta"
		const literal = this.writeSharedLiteral(meta)
		return literal && this.readConstant(`meta${hashOf(literal)}`, literal)
	}

	// a module can't read what the artifact receives or declares
	writeSharedLiteral(value: unknown): string | undefined {
		if (typeof value === "string")
			return value.includes(holeNameMarker) ? undefined : JSON.stringify(value)
		if (!hasDomain(value, "object")) {
			return (
				typeof value === "symbol" ? undefined
				: Object.is(value, -0) ? "-0"
				: serializePrimitive(value as never)
			)
		}
		if (
			typeof value === "function" ||
			isNode(value) ||
			isDateObject(value) ||
			isRegExpObject(value) ||
			this.objectUnits.has(value) ||
			this.emitting.has(value)
		)
			return
		let isShared = true
		const [literal] = this.writeLiteral(
			value,
			element => this.writeSharedLiteral(element) ?? ((isShared = false), "")
		)
		return isShared ? `runtime.freeze(${literal})` : undefined
	}

	// the morph arktype creates for a default, called through a function since traversals are created before the validator it applies
	emitDefault(
		morph: unknown,
		key: PropertyKey,
		value: BaseRoot,
		defaultValue: unknown
	): string {
		// every traversal reaching a default shares its morph, as arktype's node holds one, whose guard keeps a value it fills in from being defaulted again
		let name = this.defaultNamesByMorph.get(morph)
		if (name) return `(data, ctx) => ${name}(data, ctx)`
		this.collectType(value)
		name = `default${this.defaults.length}`
		this.defaultNamesByMorph.set(morph, name)
		const flags = defaultedNodeKeys.filter(k => value[k]).map(k => `${k}: true`)
		const isThunkInput =
			typeof defaultValue === "function" && isThunk(defaultValue)
		// the morph traverses the value only to transform what it writes
		const validator =
			isThunkInput || value.includesTransform || value.includesAlias ?
				this.readByRuntime(value)
			:	this.readValidator(value)
		this.defaults.push(
			`const ${name} = runtime.computeDefaultValueMorph(${this.emit(key)}, ${validator}, ${this.emit(defaultValue)}, {${flags.length ? ` ${flags.join(", ")} ` : ""}}${typeof defaultValue === "function" ? `, ${isThunkInput}` : ""})`
		)
		return `(data, ctx) => ${name}(data, ctx)`
	}

	emitSite(site: object): string {
		// a discriminant's site holds the path it's read at
		if (Array.isArray(site))
			return `[${site.map(k => this.emit(k)).join(", ")}]`
		if ("code" in site) {
			const { code, description } = site as SiteContext
			return `runtime.siteOf(${this.emit(code)}${description === undefined ? "" : `, ${this.emit(description)}`})`
		}
		return `{ ${Object.entries(site)
			.map(
				([k, v]) =>
					`${k}: ${hasDomain(v, "object") ? this.emitSite(v) : this.emit(v)}`
			)
			.join(", ")} }`
	}

	emitLiteral(value: object): string {
		const [literal, elements] = this.writeLiteral(value)
		if (!elements.some(element => this.lateNames.has(element)))
			return this.declareConst(value, "literal", `runtime.freeze(${literal})`)
		const prototype = prototypeOf(value)
		// assigning a __proto__ key to an object would set its prototype
		if (
			prototype === Object.prototype &&
			Object.getOwnPropertyNames(value).includes("__proto__")
		) {
			throwParseError(
				writeUnprecompilableMessage("a __proto__ key beside a Type")
			)
		}
		const name = this.declareConst(
			value,
			"literal",
			Array.isArray(value) ? "[]"
			: prototype === null ? "{ __proto__: null }"
			: "{}"
		)
		this.lateNames.add(name)
		this.fills.push(`runtime.freeze(runtime.assign(${name}, ${literal}))`)
		return name
	}

	writeLiteral(
		value: object,
		emitElement = (element: unknown) => this.emitElement(element)
	): [literal: string, elements: string[]] {
		const prototype = prototypeOf(value)
		const isArray = prototype === Array.prototype && Array.isArray(value)
		if (!isArray && prototype !== Object.prototype && prototype !== null) {
			return throwParseError(
				writeUnprecompilableMessage(
					`an instance of ${constructorNameOf(value) || "an anonymous class"}`
				)
			)
		}
		const symbol = Object.getOwnPropertySymbols(value)[0]
		if (symbol) {
			throwParseError(
				writeUnprecompilableMessage(`the symbol key ${printable(symbol)}`)
			)
		}
		const descriptors = Object.getOwnPropertyDescriptors(value)
		const keys = Object.getOwnPropertyNames(value).filter(
			k => !isArray || k !== "length"
		)
		// an array is copied as its elements, so a hole or another property would be lost
		if (
			isArray &&
			(keys.length !== descriptors.length.value ||
				keys.some((k, i) => k !== `${i}`))
		) {
			throwParseError(
				writeUnprecompilableMessage("an array with holes or other properties")
			)
		}
		// a literal is copied as its enumerable data properties
		for (const k of keys) {
			if (!("value" in descriptors[k])) {
				throwParseError(
					writeUnprecompilableMessage(`the accessor ${JSON.stringify(k)}`)
				)
			}
			if (!descriptors[k].enumerable) {
				throwParseError(
					writeUnprecompilableMessage(
						`the non-enumerable property ${JSON.stringify(k)}`
					)
				)
			}
		}
		this.emitting.add(value)
		const elements = keys.map(k => emitElement(descriptors[k].value))
		this.emitting.delete(value)
		const entries = keys.map((k, i) => `[${JSON.stringify(k)}]: ${elements[i]}`)
		if (prototype === null) entries.unshift("__proto__: null")
		const literal =
			isArray ? `[${elements.join(", ")}]`
			: entries.length ? `{ ${entries.join(", ")} }`
			: "{}"
		return [literal, elements]
	}

	// a Type a literal holds is data, so it's emitted as its validator rather than its shape
	emitElement(value: unknown): string {
		return isNode(value) && value.isRoot() && !this.objectUnits.has(value) ?
				(this.readValidator(value) ??
					throwInternalError(
						`Unexpected Type ${value.expression} outside a meta`
					))
			:	this.emit(value)
	}
}

// a standalone validator's issues are written from what its nodes describe, so other text configured for them can't be precompiled
const assertDescribed = (root: BaseRoot): void => {
	const config = root.$.resolvedConfig
	const raisable = raisableCodesOf(root)
	let code: ArkErrorCode
	for (code in errorWritersByCode) {
		if (raisable !== "any" && !raisable.has(code)) continue
		for (const k of describingKeys) {
			if (config[code][k] !== $ark.defaultConfig[code][k]) {
				throwParseError(
					writeUnprecompilableMessage(`a configured ${code} ${k}`)
				)
			}
		}
	}
	for (const unit of rootUnitsOf(root)) {
		for (const node of writtenNodesOf(unit)) {
			for (const k of describingKeys) {
				const writer = node.meta[k]
				if (
					k === "expected" ? typeof writer === "function" : writer !== undefined
				) {
					throwParseError(
						writeUnprecompilableMessage(
							`\`${node.expression}\`'s configured ${k}`
						)
					)
				}
			}
		}
	}
}

// a callback can raise any code
const raisableCodesOf = (root: BaseRoot): "any" | Set<ArkErrorCode> => {
	if (
		declares(root, node => node.hasKind("predicate") || node.hasKind("morph"))
	)
		return "any"
	const codes = new Set<ArkErrorCode>()
	for (const unit of rootUnitsOf(root)) {
		for (const ref of unit.refs) {
			if (!failureSites.has(ref as object)) continue
			const site = ref as FailureSite
			if (site.code) codes.add(site.code)
			if (site.value) codes.add(site.value.code)
			if (site.missing) codes.add(site.missing.code)
		}
		for (const node of unit.declared) {
			if (node.hasKind("union") && node.compiledDiscriminant)
				codes.add("discriminant")
			else if (node.hasKind("structure") && node.undeclared === "reject")
				codes.add("undeclared")
		}
	}
	return codes
}

const { getTime } = Date.prototype

// arktype calls a default's thunk again each time it writes a schema holding the default
const assertBakeableJsonSchema = (root: BaseRoot): void => {
	if (root.references.some(callsDefaultThunk)) {
		throwParseError(
			writeUnprecompilableMessage("a JSON Schema calling a default's thunk")
		)
	}
}

const shapeFlags = [
	"isTransformedById",
	"includesAlias",
	"transforms",
	"allowsRequiresContext",
	"allowsRequiresTraversal"
] as const

const callsDefaultThunk = (node: BaseNode): boolean =>
	node.hasKind("optional") ? typeof node.inner.default === "function"
	: node.hasKind("sequence") ?
		!!node.defaultables?.some(([, value]) => typeof value === "function")
	:	false

const isPlainLiteral = (value: object): boolean => {
	const prototype = prototypeOf(value)
	return (
		prototype === Object.prototype ||
		prototype === null ||
		prototype === Array.prototype
	)
}

const isHole = (value: unknown): boolean =>
	typeof value === "symbol" ||
	(typeof value === "function" &&
		!isNode(value) &&
		!runtimePathsByValue.has(value) &&
		Reflect.get(globalThis, functionNameOf(value)) !== value)

type Default = [key: PropertyKey, value: BaseRoot, defaultValue: unknown]

const defaultedNodeKeys = [
	"includesTransform",
	"includesAlias",
	"allowsRequiresContext",
	"includesContextualMorph",
	"transforms"
] as const satisfies (keyof DefaultedNode)[]

const collectDefaults = (
	node: Optional.Node | Sequence.Node,
	defaultsByMorph: Map<unknown, Default>
): void => {
	if (node.hasKind("optional")) {
		if (node.defaultValueMorph) {
			defaultsByMorph.set(node.defaultValueMorph, [
				node.key,
				node.value,
				node.inner.default
			])
		}
		return
	}
	for (let i = 0; i < node.defaultValueMorphs.length; i++) {
		const [value, defaultValue] = node.defaultables![i]
		defaultsByMorph.set(node.defaultValueMorphs[i], [
			node.prefixLength + i,
			value,
			defaultValue
		])
	}
}

// a unit keeps only the traversals something calls, as a parent can check a node in its own body
const calledMembersOf = (
	members: readonly UnitMember[],
	readers: readonly string[]
): UnitMember[] => {
	const sourcesByName = new Map(members)
	const called = new Set<string>()
	const read = (text: string) => {
		for (const name of text.match(/[\w$]+/g) ?? []) {
			if (called.has(name) || !sourcesByName.has(name)) continue
			called.add(name)
			read(sourcesByName.get(name)!)
		}
	}
	for (const reader of readers) read(reader)
	return members.filter(([name]) => called.has(name))
}

// each root's Allows, Apply and Transform, but no Apply for errors "none"
const returnedOf = (unit: RootUnit, baking: Baking): string[] =>
	baking.detailsErrors ?
		unit.traversals.flat()
	:	unit.traversals.flatMap(([allows, , ...transform]) => [
			allows,
			"",
			...transform
		])

// what a unit returning no Apply declares, as the Apply read the rest
const namesReadBy = (unit: RootUnit, returned: string[]): Set<string> =>
	new Set(
		calledMembersOf(unit.members, returned).flatMap(
			([, source]) => source.match(/[\w$]+/g) ?? []
		)
	)

const sharedByUnit = new WeakMap<RootUnit, boolean>()

let collectedKeywordMetas: Set<object> | undefined

// a keyword Type's validator bakes none of the keyword's meta
export const keywordMetas = (): Set<object> => {
	if (collectedKeywordMetas) return collectedKeywordMetas
	const metas = new Set<object>()
	const collect = (module: object): void => {
		for (const value of Object.values(module)) {
			if (hasArkKind(value, "module")) collect(value)
			else if (hasArkKind(value, "root")) metas.add(value.meta)
		}
	}
	collect(keywords)
	return (collectedKeywordMetas = metas)
}

// a Transform member writes to its input, which a bundle's CommonJS or IIFE output leaves sloppy, where writing to a frozen input is ignored rather than throwing
const isStrict = (unit: RootUnit): boolean =>
	unit.declared.some(node => node.transforms)

// a shared unit's function is strict as the function declaring the unit is, so only a local unit's declares it, and can't destructure its parameters
const declaresStrict = (unit: RootUnit): boolean =>
	isStrict(unit) && !isSharedUnit(unit)

// the units a unit reads as it's built: those whose traversals it calls, and those whose roots it refers to, as shapes rather than validators
const readUnitsOf = (unit: RootUnit): RootUnit[] =>
	[
		...Object.values(unit.dependencies).map(([node]) => node),
		...unit.refs.filter(ref => isNode(ref) && ref.isRoot())
	].map(node => unitOf(node as BaseNode, unit))

const isSharedUnit = (unit: RootUnit): boolean => {
	let shared = sharedByUnit.get(unit)
	if (shared === undefined) {
		// a unit reading its own roots, as in a cycle, is decided by what else it reads
		sharedByUnit.set(unit, true)
		shared =
			!unit.identityNamed.has(unit.roots[0].id) &&
			!unit.refs.some(ref => !isNode(ref) && holdsLocal(ref)) &&
			readUnitsOf(unit).every(isSharedUnit)
		sharedByUnit.set(unit, shared)
	}
	return shared
}

// a unit writes the checks of nodes it doesn't declare too, like a leaf its parent checks inline
const writtenNodesOf = (unit: RootUnit): BaseNode[] => [
	...unit.declared,
	...unit.roots.flatMap(root => root.references)
]

const declares = (
	root: BaseRoot,
	predicate: (node: BaseNode) => boolean
): boolean => rootUnitsOf(root).some(unit => unit.declared.some(predicate))

const holdsLocal = (value: unknown, seen = new Set<unknown>()): boolean => {
	if (seen.has(value)) return false
	seen.add(value)
	if (typeof value === "string") return value.includes(holeNameMarker)
	if (isHole(value)) return true
	if (!hasDomain(value, "object") || isNode(value) || !isPlainLiteral(value))
		return false
	return Reflect.ownKeys(value).some(k => {
		const v = Reflect.get(value, k)
		return (
			holdsLocal(k, seen) || (isNode(v) && v.isRoot()) || holdsLocal(v, seen)
		)
	})
}

// a site only traversal reads, so a standalone build writes it as it is rather than as a value a program could reach
const failureSites = new WeakSet<object>()

const issueSite = <site extends object>(site: site): site => {
	failureSites.add(site)
	return site
}

const undeclaredSite = issueSite({ code: "undeclared" })

const issueSitesByContext = new WeakMap<
	object,
	{ alone?: object; required?: object }
>()

const requiredIssue = { code: "required" } as const

// a standalone issue holds only the code and description of what failed, so the sites agreeing on those share one
const issueSiteOf = (site: FailureSite | UnionSite): object => {
	const { value, missing } = site as {
		value?: BaseErrorContext
		missing?: BaseErrorContext
	}
	const context = value ?? (missing ? requiredIssue : site)
	const variants = issueSitesByContext.get(context) ?? {}
	issueSitesByContext.set(context, variants)
	const variant = missing ? "required" : "alone"
	if (variants[variant]) return variants[variant]
	const issueContext = value && {
		code: value.code,
		description: expectedOf(value.meta, value.description)
	}
	return (variants[variant] = issueSite(
		missing ?
			issueContext ? { value: issueContext, missing: requiredIssue }
			:	runtime.requiredSite
		:	(issueContext ?? {
				code: "union",
				description: (site as UnionSite).description
			})
	))
}

// a standalone validator raises issues, which hold none of its nodes' error contexts
class StandaloneCompiler extends TraversalCompiler {
	// a node checked by one expression is written in the body that would call it, where the JIT, which compiles each node's own traversal anyway, would only grow its unit
	override invoke(node: BaseNode, opts?: InvokeOptions): string {
		this.reach(node)
		const expression =
			(
				(opts?.kind ?? this.traversalKind) !== this.traversalKind ||
				(opts?.arg ?? this.data) !== this.data
			) ?
				undefined
			: node.hasKind("structure") ?
				// a structure sharing transformed keys applies them in a call of its own
				this.traversalKind === "Apply" && node.sharesTransformedKeys ?
					undefined
				:	node.compileConjunction(this)
			:	node.compileExpression?.(this)
		return expression === undefined ?
				super.invoke(node, opts)
			:	`(${expression})`
	}

	override site(node: BaseNode): string {
		return this.ref(issueSiteOf(node.failureSite))
	}

	// a union's issue reads only what the union describes, at its discriminant where it has one, so its branches aren't run again
	override unionFails(
		node: UnionNode,
		value?: string,
		path?: PropertyKey[]
	): string {
		if (!path) return `!${this.error(node)}`
		const context: SiteContext = {
			code: "discriminant",
			description: expectedOf(
				node.discriminantMeta,
				node.discriminantDescription
			)
		}
		const site = issueSite(path.length ? { value: context, path } : context)
		return `!ctx.failsAt(${this.ref(site)}, ${value})`
	}

	override undeclaredFails(): string {
		return `ctx.failsAt(${this.ref(undeclaredSite)}, data, k)`
	}
}

// the node each unit last wrote a traversal of
const lastWritten = new WeakMap<object, NodeId>()

// writing in place, a place reaching a written object reuses or throws
class MutatingCompiler extends StandaloneCompiler {
	// whether the next transform invoked is of a value data holds
	private entersValue = false
	private referenced: NodeId | undefined
	// a Transform's node, whose Apply its unit wrote just before
	private readonly node: BaseNode | undefined
	// a strip copies what it writes, as a build without mutatesInput does
	private readonly copies: boolean

	constructor(...args: ConstructorParameters<typeof StandaloneCompiler>) {
		super(...args)
		const id =
			this.traversalKind === "Transform" ?
				lastWritten.get(this.linkage)
			:	undefined
		this.node = id === undefined ? undefined : this.linkage.referencesById[id]
		this.copies = !!this.node && copiesWrites(this.node)
	}

	override referenceToId(id: NodeId, opts?: InvokeOptions): string {
		this.referenced = id
		return super.referenceToId(id, opts)
	}

	// a unit names the node it declares last, just before writing it
	override write(name?: string, indent?: number): string {
		if (this.node && this.node.id !== this.referenced)
			throwInternalError(`Unexpected traversal of ${this.referenced}`)
		lastWritten.set(this.linkage, this.referenced!)
		return super.write(name, indent)
	}

	// the output is the input, neither copied nor given what a copy dropped
	override if(condition: string, then: (self: this) => this): this {
		return (
				!this.copies &&
					(condition === "out === data" || condition === "out !== data")
			) ?
				this
			:	super.if(condition, then)
	}

	override ref(value: object | symbol): string {
		// a sequence names its copy before it writes, which never happens in place
		if (value === runtime.copyOf && !this.copies) return "copyOf"
		// a Type piped a morph's output transforms what it holds anew
		if (value === runtime.pipe) return super.ref(runtime.pipeInPlace)
		if (value === runtime.pipeTransformed)
			return super.ref(runtime.pipeTransformedInPlace)
		return super.ref(value)
	}

	override invoke(node: BaseNode, opts?: InvokeOptions): string {
		if ((opts?.kind ?? this.traversalKind) !== "Transform")
			return super.invoke(node, opts)
		// a value that can't be an object, or one a strip copies, isn't written
		const isValue =
			this.entersValue &&
			(node.includesAlias ||
				((node.rawIn as BaseRoot).overlaps($ark.intrinsic.object.internal) &&
					!copiesWrites(node)))
		this.entersValue = false
		// a structure a cycle can reach again throws where it does
		const isWritten = node.hasKind("structure") && node.includesAlias
		if (!isValue && !isWritten) return super.invoke(node, opts)
		this.reach(node)
		const arg = opts?.arg ?? this.data
		const reference = this.referenceToId(node.id, opts)
		const ctx =
			this.requiresContextFor(node, "Transform") ? `, ${this.ctx}` : ""
		if (isWritten)
			return `${this.ref(runtime.writesInPlace)}(${reference}, ${arg}${ctx})`
		if (node.isTransformedById)
			return `${this.ref(runtime.transformResolutionOnce)}(${this.ctx}, "${this.nameOf(node.id)}", ${arg}, ${reference})`
		return `${this.ref(node.includesAlias ? runtime.transformCyclicOnce : runtime.transformOnce)}(${reference}, ${arg}${ctx})`
	}

	// a step rejecting the last output reads the value, which a write changed
	override transformKey(
		name: string,
		input: string,
		steps: readonly TransformStep[],
		opts?: TransformKeyOptions
	): this {
		if (
			steps
				.slice(0, -1)
				.some(({ node }) =>
					node.references.some(
						reference =>
							(reference.hasKind("structure") ||
								reference.hasKind("sequence") ||
								reference.hasKind("alias")) &&
							reference.transforms
					)
				)
		)
			throwParseError(inPlaceKeyMessage)
		// its first step enters the value, each next the last output or the value
		this.entersValue = input !== this.data
		super.transformKey(name, input, steps, opts)
		this.entersValue = false
		return this
	}
}

// a strip copies an object it writes, but for elements its sequence writes
const copiesWrites = (node: BaseNode): boolean => {
	const structure =
		node.hasKind("intersection") ? node.structure
		: node.hasKind("structure") ? node
		: undefined
	return (
		structure?.undeclared === "delete" &&
		!(structure.sequence?.transforms && !structure.slicesSequence)
	)
}

const canBeObject = (node: BaseRoot): boolean =>
	node.overlaps($ark.intrinsic.object.internal)

// whether checking a value reads into an object it holds
const readsHeld = (branch: BaseRoot): boolean => {
	const checked = branch.rawIn
	return (
		checked.includesAlias ||
		(checked.hasKind("intersection") &&
			checked.inner.predicate !== undefined) ||
		checked.flatRefs.some(
			({ path, node }) =>
				path.length > 1 ||
				(canBeObject(node) && !node.branches.every(b => b.isBasis()))
		)
	)
}

// whether a union picks the branch it transforms by reading into an object
const selectsByHeld = (node: UnionNode): boolean => {
	const discriminant = node.compiledDiscriminant
	if (!discriminant) return node.branches.some(readsHeld)
	return (
		discriminant.path.length > 1 ||
		Object.values(discriminant.cases).some(
			v => v !== true && v.transforms && v.hasKind("union") && selectsByHeld(v)
		)
	)
}

// no morph or union may read into an object a place before it can write
const assertReadsUnwritten = (root: BaseRoot): void => {
	const scanned = new Map<BaseNode, number>()
	// clean where nothing in the call can have been written yet
	const scan = (node: BaseNode, unwritten: boolean, clean: boolean): void => {
		const state =
			clean ? 2
			: unwritten ? 1
			: 0
		const previous = scanned.get(node)
		if (!node.transforms || (previous !== undefined && previous <= state))
			return
		scanned.set(node, state)
		if (node.hasKind("alias")) return scan(node.resolution, unwritten, clean)
		if (node.hasKind("union")) {
			if (!unwritten && selectsByHeld(node)) throwParseError(inPlaceReadMessage)
			for (const branch of node.branches) scan(branch, unwritten, clean)
			return
		}
		if (node.hasKind("structure")) {
			// a structure writes nothing before the first prop it transforms
			const first =
				node.index?.some(index => index.value.transforms) ?
					undefined
				:	node.props.find(prop => prop.value.transforms)
			for (const child of node.children) {
				if (child === first) scan(first.value, unwritten, clean)
				else scan(child, false, false)
			}
			return
		}
		if (!node.hasKind("morph")) {
			const isIntersection = node.hasKind("intersection")
			for (const child of node.children)
				scan(child, unwritten && isIntersection, clean && isIntersection)
			return
		}
		const input = node.inner.in
		if (input) scan(input, unwritten, clean)
		let received =
			(unwritten && !input?.transforms) ||
			!canBeObject(input ? input.rawOut : node.rawIn)
		clean &&= !input?.transforms
		for (const morph of node.morphs) {
			const isType = hasArkKind(morph, "root")
			if (!received && (!isType || canBeObject(morph.rawIn)))
				throwParseError(inPlaceReadMessage)
			if (!isType) {
				// a program's function can return any object its closure holds
				if (!runtimePathsByValue.has(morph)) received = clean
				continue
			}
			scan(morph, received, clean)
			received = (received && !morph.transforms) || !canBeObject(morph.rawOut)
			clean &&= !morph.transforms
		}
	}
	scan(root, true, true)
}

const everyKey = Symbol("every key")
const everyIndex = Symbol("every index")

// the keys of the object at a place that a node there writes or checks
const keysAt = (
	node: BaseNode,
	writes: boolean,
	keys = new Set<PropertyKey>(),
	seen = new Set<BaseNode>()
): Set<PropertyKey> => {
	if (seen.has(node)) return keys
	seen.add(node)
	if (node.hasKind("alias")) return keysAt(node.resolution, writes, keys, seen)
	if (node.hasKind("union")) {
		for (const branch of node.branches) keysAt(branch, writes, keys, seen)
		return keys
	}
	if (node.hasKind("morph")) {
		if (node.inner.in) keysAt(node.inner.in, writes, keys, seen)
		// a Type piped before any function receives the same object
		for (const morph of node.inner.morphs) {
			if (!hasArkKind(morph, "root")) break
			keysAt(morph, writes, keys, seen)
		}
		return keys
	}
	if (!node.hasKind("intersection")) return keys
	// a predicate can read any key
	if (!writes && node.inner.predicate) keys.add(everyKey)
	const structure = node.structure
	// a strip writes only a copy
	if (!structure || (writes && copiesWrites(node))) return keys
	for (const prop of structure.props) {
		if (!writes || prop.value.transforms || prop.hasDefault())
			keys.add(prop.key)
	}
	if (structure.index?.some(index => !writes || index.value.transforms))
		keys.add(everyKey)
	if (structure.sequence && (!writes || structure.sequence.transforms))
		keys.add(everyIndex)
	if (structure.undeclared === (writes ? "delete" : "reject"))
		keys.add(everyKey)
	return keys
}

const isIndex = (key: PropertyKey): boolean =>
	key === "length" || (typeof key === "string" && arrayIndexMatcher.test(key))

const writesRead = (
	written: Set<PropertyKey>,
	read: Set<PropertyKey>
): boolean =>
	written.has(everyKey) ||
	read.has(everyKey) ||
	(written.has(everyIndex) &&
		(read.has(everyIndex) || [...read].some(isIndex))) ||
	(read.has(everyIndex) && [...written].some(isIndex)) ||
	[...written].some(key => read.has(key))

// each node checking a place the input can hold an object at
const placesOf = (
	root: BaseRoot,
	pipes: [morph: MorphNode, piped: BaseRoot][] = []
): Set<BaseRoot> => {
	const places = new Set<BaseRoot>()
	const visited = new Set<BaseNode>()
	const enter = (node: BaseRoot): void => {
		if (places.has(node)) return
		places.add(node)
		visit(node)
	}
	const visit = (node: BaseNode): void => {
		if (visited.has(node)) return
		visited.add(node)
		if (node.hasKind("alias")) return visit(node.resolution)
		if (node.hasKind("union")) {
			for (const branch of node.branches) visit(branch)
			return
		}
		if (node.hasKind("morph")) {
			if (node.inner.in) visit(node.inner.in)
			let received = node.inner.in
			let returned = false
			let created = false
			for (const morph of node.inner.morphs) {
				if (!hasArkKind(morph, "root")) {
					// arktype's function receiving no object returns a new one
					created =
						runtimePathsByValue.has(morph) &&
						(created || (!!received && !canBeObject(received.rawOut)))
					returned = true
					received = undefined
					continue
				}
				received = morph
				// a function can return any object the input holds
				if (!returned) visit(morph)
				else {
					if (!created) pipes.push([node, morph])
					enter(morph)
				}
			}
			return
		}
		if (!node.hasKind("intersection") || !node.structure) return
		const { props, index, sequence } = node.structure
		for (const prop of props) enter(prop.value)
		for (const signature of index ?? []) enter(signature.value)
		for (const element of sequence?.prevariadic ?? []) enter(element.node)
		for (const element of sequence?.variadicOrPostfix ?? []) enter(element)
	}
	enter(root)
	return places
}

type PlaceKeys = [place: BaseRoot, input: BaseRoot, keys: Set<PropertyKey>]

// no place only checking or copying an object may hold one another writes
const assertChecksUnwritten = (root: BaseRoot): void => {
	const reads: PlaceKeys[] = []
	const writes: PlaceKeys[] = []
	const pipes: [MorphNode, BaseRoot][] = []
	for (const place of placesOf(root, pipes)) {
		if (!place.transforms) {
			if (canBeObject(place)) reads.push([place, place, keysAt(place, false)])
			continue
		}
		const resolved = place.hasKind("alias") ? place.resolution : place
		for (const branch of resolved.branches) {
			if (copiesWrites(branch))
				reads.push([place, branch.rawIn, keysAt(branch, false)])
			else writes.push([place, branch.rawIn, keysAt(branch, true)])
		}
	}
	// a place transforms what it receives by one branch
	for (const [writer, written, writtenKeys] of writes) {
		if (!writtenKeys.size) continue
		for (const [reader, read, readKeys] of reads) {
			if (
				reader !== writer &&
				readKeys.size &&
				writesRead(writtenKeys, readKeys) &&
				written.overlaps(read)
			)
				throwParseError(inPlaceCheckMessage)
		}
	}
	// a Type piped after a function records anew, so writes once, at the root
	for (const [morph, piped] of pipes) {
		const nested: [MorphNode, BaseRoot][] = []
		const inner = placesOf(piped, nested)
		if (
			writes.some(([place, , keys]) => keys.size && inner.has(place)) &&
			(!root.branches.includes(morph) || nested.some(([m]) => m === morph))
		)
			throwParseError(inPlacePipeMessage)
	}
}

// a build writing in place has units of its own, differing only in code
const unitsByRoot = [
	new WeakMap<BaseRoot, RootUnit[]>(),
	new WeakMap<BaseRoot, RootUnit[]>()
]

const rootUnitsOf = (root: BaseRoot, mutatesInput = false): RootUnit[] => {
	const cached = unitsByRoot[+mutatesInput]
	let units = cached.get(root)
	if (!units) {
		if (mutatesInput) {
			assertReadsUnwritten(root)
			assertChecksUnwritten(root)
		}
		cached.set(
			root,
			(units = precompileRootUnits(root, {
				compiler: mutatesInput ? MutatingCompiler : StandaloneCompiler,
				keyOf: runtimeKeyOf
			}))
		)
	}
	return units
}

// what a call records of its writes, which each call starts anew
const recordsWrites: readonly unknown[] = [
	runtime.transformOnce,
	runtime.transformCyclicOnce,
	runtime.transformResolutionOnce,
	runtime.writesInPlace
]

// a call records its writes where a place can reach what another wrote
const tracksWrites = (root: BaseRoot): boolean =>
	rootUnitsOf(root, true).some(unit =>
		unit.refs.some(ref => recordsWrites.includes(ref))
	)

// a pass can reach content-equal roots, which share a name but not a unit
const unitOf = (node: BaseNode, reader: RootUnit): RootUnit =>
	reader.unitsById[node.id]

// a Scope's alias defined by a thunk, keyed only by where it is, so a site resolving it is refused
export type ScopeAlias = [scope: BaseScope, alias: string]

export type Key = [
	id: string,
	holes: unknown[],
	// the path to what can't be compared and why, e.g. "configures `domain.description` with a function, whose results decide what it creates"
	refusal: [path: string, reason: string] | undefined,
	// with the path from the keyed value to the Scope holding each
	thunks: readonly [...ScopeAlias, path: string][]
]

const keysByValue = new WeakMap<object, Key>()

export const keyOf = (value: Foldable): Key => {
	let key = keysByValue.get(value)
	if (!key) {
		keysByValue.set(
			value,
			(key = hasArkKind(value, "root") ? rootKeyOf(value) : encodeKey(value))
		)
	}
	return key
}

// an id only tells the value a factory receives from another it could be given, for which 8 of its hash's characters, about 41 bits, are enough
const writeId = (id: string): string => JSON.stringify(id.slice(0, 8))

// a default check reads a node's traversal, which doesn't depend on the Scope its methods parse in
export const traversalKeyOf = (root: BaseRoot): Key => rootKeyOf(root, false)

const rootKeyOf = (root: BaseRoot, isScoped = true): Key => {
	const units = rootUnitsOf(root)
	const defaultsByMorph = new Map<unknown, Default>()
	// a parent can check a prop in its own body, so the unit declares no node holding its default
	for (const unit of units) {
		for (const node of writtenNodesOf(unit)) {
			if (node.hasKind("optional") || node.hasKind("sequence"))
				collectDefaults(node, defaultsByMorph)
		}
	}
	// a unit keys a function or object only by where it first reaches it, so the key adds what each is and where each is reached again
	return encodeKey(
		{
			name: units[0].names[root.id],
			refs: units.map(unit => unit.refs),
			meta: root.meta,
			// where its methods, like `and` and `or`, parse their arguments
			...(isScoped && { $: root.$ })
		},
		defaultsByMorph
	)
}

// writes each value's kind and each composite's length, so values differing anywhere but in which functions they hold write different keys
const encodeKey = (
	start: unknown,
	// a root's, whose nodes its units' names key
	defaultsByMorph?: ReadonlyMap<unknown, Default>,
	// whether a function in it is a thunk arktype calls rather than a value it holds
	isDefinition = !defaultsByMorph
): Key => {
	const values: string[] = []
	const holes: unknown[] = []
	const seen = new Map<unknown, number>()
	const thunks: [...ScopeAlias, path: string][] = []
	let refusal: Key[2]
	const refuse = (reason: string) => void (refusal ??= ["", reason])
	const holeIndexOf = (hole: unknown) => {
		const index = holes.indexOf(hole)
		return index === -1 ? holes.push(hole) - 1 : index
	}
	const writeKeyOf = (kind: string, value: Foldable, path: string) => {
		const [id, held, nested, nestedThunks] = keyOf(value)
		values.push(`${kind} ${id} ${held.map(holeIndexOf)}`)
		if (nested) refusal ??= [appendPath(path, nested[0]), nested[1]]
		for (const [scope, alias, at] of nestedThunks)
			thunks.push([scope, alias, appendPath(path, at)])
	}
	const at = (path: string) => (path ? ` at \`${path}\`` : "")
	const write = (
		value: unknown,
		path: string,
		isDefinition: boolean,
		isConfig = false
	): void => {
		if (hasDomain(value, "object")) {
			const index = seen.get(value)
			if (index !== undefined) return void values.push(`seen ${index}`)
			seen.set(value, seen.size)
		}
		const defaulted = defaultsByMorph?.get(value)
		const runtimeKey = hasDomain(value, "object") && runtimeKeyOf(value)
		if (defaulted) {
			values.push("default")
			write(defaulted[2], path, false)
		} else if (runtimeKey) values.push(`runtime ${runtimeKey}`)
		else if (isNode(value)) {
			if (defaultsByMorph || !value.isRoot()) values.push("node")
			else writeKeyOf("Type", value, path)
		} else if (hasArkKind(value, "module")) {
			const entries = Object.entries(value)
			values.push(`Module ${entries.length}`)
			for (const [k, entry] of entries) {
				values.push(JSON.stringify(k))
				write(entry, appendStringifiedKey(path, k), true)
			}
		} else if (hasArkKind(value, "scope")) {
			// a builtin scope holds only arktype's own functions, named stably
			if (value.isBuiltin) values.push(`Scope ${value.name}`)
			// e.g. a Type's, which each Type of the Scope shares
			else if (value !== start) writeKeyOf("Scope", value, path)
			else {
				const aliases = Object.entries(value.aliases)
				values.push(
					`Scope ${JSON.stringify(value.exportedNames)} ${aliases.length}`
				)
				write(value.scopeConfig, "", false, true)
				// a definition rather than what it resolves to, since resolving it here would run its default checks before the site first reading it
				for (const [k, def] of aliases) {
					values.push(JSON.stringify(k))
					if (isThunkAlias(def)) {
						values.push("thunk")
						thunks.push([value, k, ""])
					} else write(def, appendStringifiedKey(path, k), true)
				}
			}
		} else if (hasArkKind(value, "generic")) {
			values.push("Generic")
			write(value.paramDefs, path, true)
			// an hkt's body is a function arktype calls with a class, which nothing but identity tells apart from another
			if (value.hkt) {
				refuse(
					`has an hkt body${at(path)}, whose results decide what it creates`
				)
			} else write(value.bodyDef, path, true)
			write(value.$, appendStringifiedKey(path, "$"), true)
			// a Generic bound into another Scope parses its arguments there
			write(value.arg$, appendStringifiedKey(path, "arg$"), true)
		} else if (isTypedFn(value)) {
			values.push("TypedFn")
			write(value.params, path, false)
			write(value.returns, path, false)
			write(value.raw, path, false)
		} else if (value instanceof LazyGenericRoot) {
			values.push(`Generic ${JSON.stringify(value.paramsDef)}`)
			write(value.bodyDef, path, true)
		} else if (isDefinition && isThunk(value))
			refuse(`holds a thunk${at(path)}, whose result decides what it creates`)
		// e.g. a description writer, which arktype calls as it creates each Type
		else if (isConfig && isHole(value)) {
			refuse(
				`configures \`${path}\` with a function, whose results decide what it creates`
			)
		} else if (isHole(value)) values.push(`hole ${holeIndexOf(value)}`)
		else if (!hasDomain(value, "object")) values.push(printablePrimitive(value))
		else if (isDateObject(value)) values.push(`Date ${getTime.call(value)}`)
		else if (isRegExpObject(value)) values.push(`${value} ${value.lastIndex}`)
		else if (isArray(value)) {
			values.push(`[${value.length}`)
			// e.g. the narrow in `["string", ":", isLong]`, which arktype holds rather than parses
			const definitions =
				valueTupleHeads.includes(value[0]) ? 0
				: valueOperators.includes(value[1]) ? 1
				: value.length
			for (let i = 0; i < value.length; i++) {
				write(
					value[i],
					appendStringifiedKey(path, i),
					isDefinition && i < definitions,
					isConfig
				)
			}
		} else if (isPlainLiteral(value)) {
			const keys = Reflect.ownKeys(value)
			values.push(`{${keys.length}`)
			for (const k of keys) {
				write(k, path, false)
				write(
					Reflect.get(value, k),
					typeof k === "symbol" ? path : appendStringifiedKey(path, k),
					isDefinition,
					isConfig
				)
			}
		} else
			refuse(`holds ${printable(value)}${at(path)}, which its key can't encode`)
	}
	write(start, "", isDefinition)
	return [hashOf(values.join("\n")), holes, refusal, thunks]
}

export const appendPath = (path: string, rest: string): string =>
	!path ? rest
	: !rest ? path
	: rest[0] === "[" ? path + rest
	: `${path}.${rest}`

// arktype holds a Generic alias as a function too, which it calls with arguments rather than to resolve it
const isThunkAlias = (def: unknown): boolean =>
	isThunk(def) &&
	!hasArkKind(def, "generic") &&
	!(def instanceof LazyGenericRoot)

export const isTypedFn = (value: unknown): value is InternalTypedFn =>
	value instanceof InternalTypedFn

export const kindNameOf = (value: unknown): string =>
	hasArkKind(value, "root") ? "Type"
	: hasArkKind(value, "module") ? "Module"
	: hasArkKind(value, "scope") ? "Scope"
	: hasArkKind(value, "generic") ? "Generic"
	: "TypedFn"

const printablePrimitive = (value: unknown): string =>
	Object.is(value, -0) ? "-0" : printable(value)

const valueTupleHeads: unknown[] = ["instanceof", "==="]

const valueOperators: unknown[] = [":", "=>", "=", "@"]

type ComposedString = "expression" | "description"

// a string shorter than this is written wherever it's printed, as gzip compresses its repeats about as well as a call
const minComposedLength = 64

const partsOf = (
	root: BaseRoot,
	kind: ComposedString
): (string | BaseRoot)[] => {
	const s = root[kind]
	const candidates: Record<string, BaseRoot> = Object.create(null)
	for (const node of root.references) {
		if (!node.isRoot()) continue
		const part = node[kind]
		if (
			part.length >= minComposedLength &&
			part !== s &&
			!part.includes(holeNameMarker)
		)
			candidates[part] = node
	}
	const taken: [start: number, end: number, root: BaseRoot][] = []
	for (const part of Object.keys(candidates).sort(
		(l, r) => r.length - l.length
	)) {
		for (
			let start = s.indexOf(part);
			start !== -1;
			start = s.indexOf(part, start + 1)
		) {
			const end = start + part.length
			if (
				taken.every(
					([takenStart, takenEnd]) => end <= takenStart || takenEnd <= start
				)
			)
				taken.push([start, end, candidates[part]])
		}
	}
	const parts: (string | BaseRoot)[] = []
	let at = 0
	for (const [start, end, part] of taken.sort(([l], [r]) => l - r)) {
		if (start > at) parts.push(s.slice(at, start))
		parts.push(part)
		at = end
	}
	if (at < s.length) parts.push(s.slice(at))
	return parts
}

export const holeNameMarker = "$hole_"

// arktype writes a function in a hash as `"$ark.name"`, so the index two hashes first differ at may fall inside its name
const registeredNameAt = (hash: string, i: number): string | undefined => {
	const start = hash.lastIndexOf('"', i - 1) + 1
	const reference = /^\$ark\d*\.([\w$]+)"/.exec(hash.slice(start))
	return reference && i > start + reference[0].indexOf(".") ?
			reference[1]
		:	undefined
}

// led by the name the build expects of its function
const holeName = `[\\w$]*${holeNameMarker.replace("$", "\\$")}[\\da-z]+`

export const holeNamePattern = new RegExp(holeName, "g")

const printedHoleNamePattern = new RegExp(
	`\\$ark\\.(${holeName})|valid according to (${holeName})|Function\\((${holeName})\\)|(${holeName})`,
	"g"
)

export const writeUnprecompilableMessage = <value extends string>(
	value: value
): writeUnprecompilableMessage<value> =>
	`${value} can't be precompiled to a standalone validator`

export type writeUnprecompilableMessage<value extends string> =
	`${value} can't be precompiled to a standalone validator`

export const inPlaceKeyMessage = writeUnprecompilableMessage(
	"with mutatesInput, a key transformed in place before another constraint transforms it"
)

export const inPlaceReadMessage = writeUnprecompilableMessage(
	"with mutatesInput, a morph or union reading an object a transform before it may have written"
)

export const inPlaceCheckMessage = writeUnprecompilableMessage(
	"with mutatesInput, a check or copy of an object a transform at another place may write"
)

export const inPlacePipeMessage = writeUnprecompilableMessage(
	"with mutatesInput, a Type piped after a function transforming an object beside another transform"
)
