import {
	$ark,
	hasArkKind,
	isDecidedByAllows,
	isNode,
	isRefinedPattern,
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
	type ErrorDetail,
	type GenericRoot,
	type IntersectionNode,
	type MutatesInput,
	type NodeId,
	type Optional,
	type RootUnit,
	type UnionNode,
	type UnitMember,
	type Sequence
} from "@ark/schema"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
	errorWritersByCode,
	rootApplyRuntime,
	rootApplyParts,
	type FailureSite,
	type RootApplyParam,
	type SiteContext,
	type UnionSite
} from "@ark/schema/internal"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { writesInPlace } from "@ark/schema/mutatesInput"
// a build writes in place as arktype/mutatesInput's marks say
import "./mutatesInput.ts"
import {
	appendStringifiedKey,
	arkKindOf,
	cached,
	constructorNameOf,
	dateGetTime,
	type Fn,
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

// issue text a standalone validator bakes only from description
const describingKeys = ["expected", "problem", "message"] as const

type DeclarationRole =
	| "shape"
	| "keys"
	| "literal"
	| "standIn"
	| "json"
	| "jsonSchema"

// constraints sorted by hash, which can include a function's name
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

for (const [name, value] of Object.entries(runtime))
	indexRuntime(value, `runtime.${name}`)

// named by path, since runtime state differs between builds
export const runtimeKeyOf = (value: object | symbol): string | undefined =>
	runtimePathsByValue.get(value) ??
	((
		typeof value === "function" &&
		Reflect.get(globalThis, functionNameOf(value)) === value
	) ?
		`globalThis.${functionNameOf(value)}`
	:	undefined)

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

// traverse(), from() and toString()
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
	thrown?: unknown
}

export interface StandaloneFactory {
	type: ExportedValue
	params: FactoryParam[]
	internedBy?: number | undefined
	defaultChecks?: readonly DefaultCheck[]
}

export type FactoryParam = HoleParam | InputParam | HelperParam | ProgressParam

export type DefaultCheck = [
	node: BaseRoot,
	value: unknown,
	key: PropertyKey | null
]

interface HoleParam {
	kind: HoleKind
	label: string
	value: unknown
	// created by the site's module, so no mock can replace it
	isOwn?: boolean
}

interface InputParam {
	kind: "input"
	label: string
	reads: [path: PropertyKey[], value: unknown][]
}

interface HelperParam {
	kind: "helper"
	label: string
	file: string
	name: string
}

interface ProgressParam {
	kind: "progress"
	label: string
	at: number
}

export type Configured = ConfiguredModule | false | undefined

export type Checks = "types" | "helpers" | "none"

export type Optimization = "speed" | "size"

interface ConfiguredModule {
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
	members?: ValidatorMembers | undefined
	// runs arktype's writers, refusing code that reads mutable state
	bake?: (<t>(write: () => t) => t) | undefined
	errors?: ErrorDetail | undefined
	freeze?: boolean | undefined
	lazy?: boolean | undefined
	// "none" trusts received Types to be the ones built
	checks?: Checks | undefined
	mutatesInput?: MutatesInput | undefined
	optimize?: Optimization | undefined
	// declare functions, so an import cycle can call them early
	hoisted?: boolean | undefined
	// export as values what a site would call a function only to read
	values?: boolean | undefined
}

interface Baking {
	members: ReadonlySet<ValidatorMember>
	write: <t>(write: () => t) => t
	firstIssue: boolean
	detailsErrors: boolean
	freezes: boolean
	readsConfig: boolean
	createsLazily: boolean
	checksTypes: boolean
	mutatesInput: MutatesInput | undefined
	hoisted: boolean
	shortest: boolean
	flattens: boolean
}

interface RootApplier {
	params: string
	apply: string
	args: string
	failure?: keyof typeof failureSources
}

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
	// assert needs errors.throw(), which errors "none" lacks
	baking.detailsErrors &&
	baking.freezes &&
	baking.readsConfig &&
	baking.checksTypes &&
	defaultMembers.every(member => members.has(member))

const writeValue = (hoisted: boolean, name: string, expression: string) =>
	hoisted ?
		`var ${name}Value\nfunction ${name}() {\n\treturn (${name}Value ??= ${expression})\n}`
	:	`const ${name} = /* @__PURE__ */ (() => ${expression})()`

// errors "none" failures as [params, body]
const failureSources = {
	invalid: [
		"data, onFail",
		`\tconst errors = new runtime.ArkErrors()
	errors._ = [{ code: "predicate", path: [], data }]
	return onFail ? onFail(errors) : errors`
	],
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
	applyInvalid: [
		"data, ctx",
		`\tctx.addError({ code: "predicate", path: ctx.path.slice(), data })`
	],
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
	modules: Record<string, string>
	// [shared function's export name, this factory's index]
	folds: Record<string, [name: string, index: number]>
	// exports that check on creation, so a bundler must keep them
	checking: string[]
	// exports a site reads rather than calls
	values: string[]
}

const runtimeImport = `import * as runtime from "arktype/runtime"`

/** an ES module of getters and factories for each export */
export const precompileStandalone = (
	exports: Record<string, StandaloneExport>,
	opts: StandaloneOptions = {}
): StandaloneModules => {
	const { sections, shared, folds, checking, values } = writeArtifact(
		exports,
		opts,
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
		checking,
		values
	}
}

export const precompileStandaloneModules = (
	exports: Record<string, StandaloneExport>,
	opts: StandaloneOptions = {}
): StandaloneModules => {
	const { sections, shared, imports, folds, checking, values } = writeArtifact(
		exports,
		opts,
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
		checking,
		values
	}
}

const writeArtifact = (
	exports: Record<string, StandaloneExport>,
	opts: StandaloneOptions,
	isModular: boolean
) => {
	const shared: Record<string, SharedModule> = {}
	const imports: Record<string, string[]> = {}
	const folds: StandaloneModules["folds"] = {}
	const checking: string[] = []
	const { configured } = opts
	// read early, a lazy or hoisted creation must be called
	const values: string[] | undefined =
		isModular && opts.values && opts.lazy === false && !opts.hoisted ?
			[]
		:	undefined
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
		mutatesInput: opts.mutatesInput,
		hoisted: opts.hoisted === true,
		shortest: opts.optimize === "size",
		flattens: opts.optimize === "size" && opts.hoisted !== true && isModular
	}
	const types: Record<string, ExportedValue> = {}
	const templates = new Set<unknown>()
	const folded = new Map<
		string,
		[index: number, artifact: StandaloneArtifact]
	>()
	const factories: (string | (() => string))[] = []
	const tables = new Set<number>()
	const artifactsByName = new Map<string, StandaloneArtifact>()
	// a trial write: foldable if its code holds nothing received
	const canFold = (name: string, factory: StandaloneFactory): boolean => {
		if (
			// as unknown: narrowing to BaseRoot is too deep for TypeScript
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
			trial.writeCreateBody(configured)
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
		imports,
		values
	)
	// a factory checking nothing it's passed is read as what it returns
	const valueOf = (name: string): string | undefined => {
		if (!values) return
		const read = readOf(...reads[name])
		const [returned, ...checks] = folded.get(name)![1].writeRekeying(read)
		return !checks.length && returned === `return ${read}` ? read : undefined
	}
	// folds differing only by index share one function
	const sharersByCode = new Map<string, string[]>()
	for (const [name, [, artifact]] of folded) {
		const [creation, position] = reads[name]
		if (position === undefined || valueOf(name) !== undefined) continue
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
		if (fold && fold[0] !== name) return ""
		const value = valueOf(name)
		if (value !== undefined) {
			values!.push(name)
			return /^[\w$]+$/.test(value) ?
					`export { ${value} as ${JSON.stringify(name)} }`
				:	`const factory${index} = ${value}\n\n${writeExport(name, index)}`
		}
		const params = artifact.factory!.params.map((_, i) => `p${i}`)
		if (fold) params.unshift("index")
		return `${writeFunction(baking, `factory${index}`, params.join(", "), artifact.writeRekeying(fold ? `${creation}[index]` : readOf(creation, position)).join("\n\n"))}

${writeExport(name, index)}`
	}
	const sections = [
		...creations,
		// an import cycle can reach a factory before this runs
		[...tables].map(table => `var interned${table}`).join("\n"),
		...factories.map(factory =>
			typeof factory === "string" ? factory : factory()
		)
	]
	for (const [name, artifact] of artifactsByName)
		if (artifact.checksAtCreation) checking.push(name)
	return { sections, shared, imports, folds, checking, values: values ?? [] }
}

interface Creation {
	indices: number[]
	values: Set<unknown>
	body: string
}

const writeCreation = (baking: Baking, index: number, body: string) =>
	baking.createsLazily ?
		`var created${index}\n\n${writeFunction(baking, `create${index}`, "", body)}`
	:	`const created${index} = /* @__PURE__ */ (() => {\n${body}\n})()`

type CreationRead = [creation: string, position: number | undefined]

const readOf = (...[creation, position]: CreationRead) =>
	position === undefined ? creation : `${creation}[${position}]`

const writeExport = (name: string, index: number) =>
	`export { factory${index} as ${JSON.stringify(name)} }`

const writeCreations = (
	types: Record<string, ExportedValue>,
	templates: ReadonlySet<unknown>,
	folded: ReadonlyMap<string, unknown>,
	{ configured }: StandaloneOptions,
	baking: Baking,
	shared: Record<string, SharedModule>,
	imports: Record<string, string[]>,
	values: string[] | undefined
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
		const body = artifact.writeCreateBody(configured)
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
			body
		})
	}
	const code: string[] = []
	for (const creation of creations.sort(
		(l, r) => l.indices[0] - r.indices[0]
	)) {
		const [index] = creation.indices
		const isShared = creation.indices.length > 1
		const body =
			isShared ?
				artifactOf(creation.indices).writeCreateBody(configured)
			:	creation.body
		const isInlined = baking.createsLazily && !isShared
		code.push(
			isInlined ? `var created${index}` : writeCreation(baking, index, body)
		)
		for (const [position, i] of creation.indices.entries()) {
			reads[names[i]] = [
				isInlined ? `(created${index} ??= (() => {\n${body}\n})())`
				: baking.createsLazily ? `(created${index} ??= create${index}())`
				: `created${index}`,
				isShared ? position : undefined
			]
		}
	}
	const getters = names.flatMap((name, i) => {
		if (folded.has(name)) return []
		const read = readOf(...reads[name])
		values?.push(name)
		return values && /^[\w$]+$/.test(read) ?
				`export { ${read} as ${JSON.stringify(name)} }`
			:	`${values ? `const get${i} = ${read}` : writeFunction(baking, `get${i}`, "", `\treturn ${read}`)}\n\nexport { get${i} as ${JSON.stringify(name)} }`
	})
	return [[...code, getters.join("\n")], reads]
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
	// collects the functions, Dates and bigints a schema holds
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
	params: string[]
	args: string[]
	imports: Record<string, string[]>
	shapesByName: Record<string, string>
}

class StandaloneArtifact {
	exports: Record<string, ExportedValue>
	sharedModules: Record<string, SharedModule>
	imports: Record<string, string[]>
	holeExpressions = new Map<unknown, string>()
	holeLabels = new Map<unknown, string>()
	classes = new Set<unknown>()
	checks: string[] = []
	validatorNames = new Map<BaseRoot, string>()
	defaultValues = new Set<BaseRoot>()
	readRoots = new Set<BaseRoot>()
	runtimeReadRoots = new Set<BaseRoot>()
	unitRoots = new Set<BaseRoot>()
	// keyed by +inPlace and id, as nodes sharing an id share a unit
	unitsByHead = new Map<string, RootUnit>()
	localNamesByUnit = new Map<RootUnit, string>()
	unit: RootUnit | undefined
	writing: SharedUnit | undefined
	// read only with `in`
	keyLookups = new Set<object>()
	patternInstances = new Set<RegExp>()
	defaultsByMorph = new Map<unknown, Default>()
	defaultNames = new Map<unknown, string>()
	objectUnits = new Set<unknown>()
	metas = new Set<object>()
	declarations = createDeclarations()
	sharedWriters = new Map<string, string>()
	emitting = new Set<object>()
	moduleNames = new Map<object, string>()
	typedFnNames = new Map<InternalTypedFn, string>()
	stringModules: Record<ComposedString, Map<BaseRoot, string>> = {
		expression: new Map(),
		description: new Map()
	}
	links: string[] = []
	modules: string[] = []
	fills: string[] = []
	defaults: string[] = []
	lateNames = new Set<string>()
	comparedRoots: BaseRoot[]
	// written without holes; each factory call rekeys it
	templates = new Set<unknown>()
	checkedRoots: ReadonlySet<BaseRoot>
	factory: StandaloneFactory | undefined
	defaultChecks: readonly DefaultCheck[]
	holesByName = new Map<string, readonly unknown[]>()
	baking: Baking
	introspected: BaseRoot | undefined

	constructor(
		exports: Record<string, ExportedValue>,
		sharedModules: Record<string, SharedModule>,
		imports: Record<string, string[]>,
		baking: Baking,
		// the factory or introspection a site calls
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
		do {
			for (const root of this.roots) {
				if (this.unitRoots.has(root)) continue
				this.unitRoots.add(root)
				const inPlace = this.inPlace(root)
				for (const unit of rootUnitsOf(root, inPlace)) {
					for (const head of unit.roots) {
						const key = `${+inPlace}${head.id}`
						if (!this.unitsByHead.has(key)) this.unitsByHead.set(key, unit)
					}
				}
			}
		} while (this.collectMetaTypes() || this.collectDefaultTypes())
		this.comparedRoots = this.roots
		for (const root of this.roots) {
			// only a meta may override the configured onFail
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
		// relate classes from referenced Types this factory didn't see
		for (const hole of this.classes) {
			if (!checked.some(([checkedHole]) => checkedHole === hole))
				checked.push([hole, "class", this.holeExpressions.get(hole)!])
		}
		const classesOf = <v>(valueOf: (hole: unknown) => v) =>
			Object.fromEntries(
				[...this.classes].map(hole => [
					this.holeLabels.get(hole)!,
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
				`runtime.checkFacts(runtime.factOfHole(${expression}${kind === "function" ? "" : `, "${kind}"`}${kind === "class" ? classesArg : ""}), ${JSON.stringify(expected)}, ${JSON.stringify(this.holeLabels.get(hole))})`
			)
		}
	}

	// a printed hole name resolves at creation; code can't depend on it
	refuseNameDependence(): void {
		const holesByName: Record<string, unknown> = Object.create(null)
		const printedNameOf = (hole: unknown) =>
			`runtime.printable(runtime.functionNameOf(${this.holeExpressions.get(hole)}))`
		for (const hole of this.holeExpressions.keys()) {
			if (typeof hole !== "function") continue
			const name = functionNameOf(hole)
			if (!name.includes(holeNameMarker)) {
				throwInternalError(
					`Unexpected function ${this.holeLabels.get(hole)} not named by a placeholder`
				)
			}
			// one placeholder can name several functions; check they match
			const first = holesByName[name]
			if (first === undefined) holesByName[name] = hole
			else if (
				this.holeExpressions.get(hole) !== this.holeExpressions.get(first)
			) {
				this.checks.push(
					`runtime.checkFacts(${printedNameOf(hole)}, ${printedNameOf(first)}, ${JSON.stringify(this.holeLabels.get(hole))})`
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
					`compiled code printing the name of ${this.holeLabels.get(this.holeNamed(printed[0])) ?? printed[0]}`
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

	// a hole received twice is checked by identity
	receiveHole(hole: unknown, expression: string, label: string): boolean {
		const received = this.holeExpressions.get(hole)
		if (received) {
			this.checks.push(
				`runtime.checkIdentity(${expression}, ${received}, ${JSON.stringify(label)}, ${JSON.stringify(this.holeLabels.get(hole))})`
			)
			return false
		}
		this.holeExpressions.set(hole, expression)
		this.holeLabels.set(hole, label)
		return true
	}

	receiverOf(value: Foldable, id: string, label: string): string {
		const kind = hasArkKind(value, "root") ? "" : `, "${kindNameOf(value)}"`
		const body = `runtime.holesOf(holder, ${writeId(id)}, ${JSON.stringify(label)}${kind})`
		const name = `receive${hashOf(body)}`
		this.importName(
			this.share(
				name,
				writeFunction(this.baking, name, "holder", `\treturn ${body}`)
			),
			name
		)
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
			// relate a Module's, Scope's or Generic's classes to ours
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
		// e.g. a helper an import cycle left unset
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

	// sibling order by hash can depend on a hole's name
	refuseHoleOrdering(l: BaseNode, r: BaseNode): void {
		let i = 0
		while (i < l.hash.length && l.hash[i] === r.hash[i]) i++
		const names = [l.hash, r.hash].map(hash => registeredNameAt(hash, i))
		const name = names.find(name => name?.includes(holeNameMarker))
		if (!name) return
		const hole = this.holeNamed(name, nameOf) ?? name
		throwParseError(
			writeUnprecompilableMessage(
				`an order that depends on the name of ${this.holeLabels.get(hole) ?? hole}`
			)
		)
	}

	get roots(): BaseRoot[] {
		return [...this.validatorNames.keys()]
	}

	inPlace(root: BaseRoot): boolean {
		return writesInPlace(root, this.baking.mutatesInput)
	}

	headUnitOf(root: BaseRoot): RootUnit {
		return this.unitsByHead.get(`${+this.inPlace(root)}${root.id}`)!
	}

	get declared(): BaseNode[] {
		return this.units.flatMap(unit => unit.declared)
	}

	get units(): RootUnit[] {
		return [
			...new Set(
				[...this.unitRoots].flatMap(root =>
					rootUnitsOf(root, this.inPlace(root))
				)
			)
		]
	}

	get comparedValues(): unknown[] {
		return [
			...this.comparedRoots,
			...this.moduleNames.keys(),
			...this.typedFnNames.keys(),
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
		if (this.validatorNames.has(root)) return
		const name = `validator${this.validatorNames.size}`
		this.validatorNames.set(root, name)
		this.lateNames.add(name)
	}

	collectMetaTypes(): boolean {
		const typeCount = this.validatorNames.size
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
		return this.validatorNames.size > typeCount
	}

	// a default inlined by its parent still needs a validator
	collectDefaultTypes(): boolean {
		const typeCount = this.validatorNames.size
		const collect = (value: BaseRoot) => {
			if (!this.validatorNames.has(value)) this.defaultValues.add(value)
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
		return this.validatorNames.size > typeCount
	}

	writeCreateBody(configured: Configured): string {
		this.writeSharedUnits()
		const values = Object.values(this.exports).map(value =>
			this.exportOf(value)
		)
		const statements = [
			writeFixConfig(configured),
			// no validators: only Scopes, Generics and their Modules
			...(this.roots.length ?
				this.writeBody(unitFunction => `(${unitFunction})`)
			:	[this.declarations.statements.join("\n"), this.modules.join("\n")]),
			`return ${values.length === 1 ? values[0] : `[${values.join(", ")}]`}`
		]
		return statements.filter(statement => statement).join("\n\n")
	}

	writeFactory(name: string, index: number, configured: Configured): string {
		const { type, params, internedBy } = this.factory!
		this.writeSharedUnits()
		const value = this.validatorNames.get(type as never) ?? this.exportOf(type)
		const defaults = this.writeDefaultChecks(this.defaultChecks)
		const holes =
			internedBy === undefined ? undefined : (
				keyOf(type)[1].map(hole => this.holeExpressions.get(hole)!)
			)
		const body = this.writeCalledBody(index)
		body.push(...defaults.map(({ check }) => check), `return ${value}`)
		const defaultKeys =
			defaults.length ? `, [${defaults.map(({ key }) => key).join(", ")}]` : ""
		return this.writeFactoryFunction(
			index,
			params,
			configured,
			holes ?
				[
					`return runtime.intern((interned${internedBy} ??= runtime.internTable()), [${holes.join(", ")}], () => {\n${body.filter(statement => statement).join("\n\n")}\n}${defaultKeys})`
				]
			:	body
		)
	}

	writeRekeying(read: string): string[] {
		const { type } = this.factory!
		const holes = keyOf(type as never)[1]
		// holes matching a received value's are keyed by that value
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
		return this.writeFactoryFunction(index, params, configured, [
			...(defaults.length ?
				[...this.writeCalledBody(index), ...defaults.map(({ check }) => check)]
			:	this.declarations.statements),
			`return ${value}`
		])
	}

	writeFactoryFunction(
		index: number,
		params: FactoryParam[],
		configured: Configured,
		statements: string[]
	): string {
		const units = this.localUnits.map((_, i) => `var unit${index}_${i}`)
		return `${units.join("\n")}

${writeFunction(
	this.baking,
	`factory${index}`,
	params.map((_, i) => `p${i}`).join(", "),
	[writeFixConfig(configured), ...this.checks, ...statements]
		.filter(statement => statement)
		.join("\n\n")
)}`
	}

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
			// keyed by traversal, value and their holes
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

	specifierOf(name: string): string {
		return `~arktype/${this.baking.hoisted ? "hoisted/" : ""}${name}`
	}

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
		// a cyclic root is created with its own traversals
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
				...this.declareMembers(unit, [
					...this.declarations.statements,
					...refs,
					...links,
					...returned
				]),
				...links,
				`const ${unit.name} = [${returned.join(", ")}]`
			)
		} else {
			const [dependencyParams, dependencyArgs] = this.dependencyParamsOf(
				unit,
				read
			)
			const params = [...dependencyParams, ...writing.params]
			const prologue = [...this.declarations.statements, ...refs]
			const built =
				(!params.length &&
					!links.length &&
					!Object.keys(writing.imports).length &&
					this.writeTemplateCall(unit, prologue, returned)) ||
				`(${this.writeUnitFunction(
					unit,
					// a minifier dissolves a call with no parameters into its caller
					params.length || this.baking.shortest ? params : ["...$"],
					prologue,
					links,
					returned
				)})(${[...dependencyArgs, ...writing.args].join(", ")})`
			moduleDeclarations.push(
				...(this.baking.hoisted ?
					[
						`var ${unit.name}Unit`,
						`function ${unit.name}() {\n\treturn (${unit.name}Unit ??= ${built})\n}`
					]
				:	[`const ${unit.name} = /* @__PURE__ */ ${built}`])
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

	// units differing only by their patterns share a template they pass them to
	writeTemplateCall(
		unit: RootUnit,
		prologue: string[],
		returned: string[]
	): string | undefined {
		const params: string[] = []
		const args: string[] = []
		const statements: string[] = []
		const declared: string[] = []
		for (const statement of prologue) {
			const [, name, value] = /^const (\w+) = ([^]*)$/.exec(statement) ?? []
			if (!name) return
			// a ref to a pattern the unit declares is passed the pattern
			if (params.includes(value) && /^literal\d+$/.test(value))
				params[params.indexOf(value)] = name
			else if (declared.some(read => new RegExp(`\\b${read}\\b`).test(value)))
				statements.push(statement)
			else {
				params.push(name)
				args.push(value)
			}
			declared.push(name)
		}
		if (!args.some(arg => arg.startsWith("/"))) return
		const body = [
			...statements,
			...this.declareMembers(unit, [...statements, ...returned]),
			`return [${returned.join(", ")}]`
		]
			.join("\n")
			.split(unit.name)
			.join("template")
		if (/\bliteral\d+\b/.test(body)) return
		const name = `template${hashOf(`${params} ${body}`)}`
		this.importName(
			this.share(
				name,
				writeFunction(this.baking, name, params.join(", "), body),
				{},
				body.includes("runtime.")
			),
			name
		)
		return `${name}(${args.join(", ")})`
	}

	writeUnitFunction(
		unit: RootUnit,
		params: string[],
		prologue: string[],
		epilogue: string[],
		returned: string[]
	): string {
		const declarations = this.declareMembers(unit, [
			...prologue,
			...epilogue,
			...returned
		])
		return `(${params.join(", ")}) => {
${[...prologue, ...declarations, ...epilogue].join("\n")}
return [${returned.join(", ")}]
}`
	}

	// traversals read neither `this` nor `arguments`
	declareMembers(unit: RootUnit, readers: string[]): string[] {
		const called = calledMembersOf(unit.members, readers)
		const forwarded = forwardedOf(called)
		const declarations = called.flatMap(([name, written]) => {
			if (forwarded.has(name)) return []
			const source = this.baking.shortest ? unlooped(written) : written
			// plain params; size and writing traversals drop a trailing unread ctx
			const arrow = source.replace(
				/^function\(([^)]*)\) {/,
				(signature, params: string) =>
					`(${(this.baking.shortest || isWriting(name)) && !/\bctx\b/.test(source.slice(signature.length)) ? params.replace(/, ctx$/, "") : params}) => {${
						// a writing traversal is strict even where a bundle's format isn't
						isWriting(name) ? `\n"use strict"\n` : ""
					}`
			)
			return `const ${name} = ${/(Apply|Copy)$/.test(name) ? arrow : this.compiledOnLoad(arrow)}`
		})
		for (const [name, target] of forwarded)
			declarations.push(`const ${name} = ${target}`)
		return declarations
	}

	compiledOnLoad(fn: string): string {
		return this.baking.shortest ? fn : `(${fn})`
	}

	traversalsOf(root: BaseRoot, unit: RootUnit): string[] {
		const name = unit.names[root.id]
		return unit.traversals[
			unit.roots.findIndex(head => unit.names[head.id] === name)
		]
	}

	read(specifier: string, name: string, param = name, arg = param): string {
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
			namesBySource[source] ??= []
			namesBySource[source][index] = name
		}
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
			// minifiers inline a call passing an array, not a rest parameter
			const unitFunction = this.writeUnitFunction(
				unit,
				[...dependencyParams, "...refs"],
				declared.map((i, position) => `const r${i} = refs[${position}]`),
				[],
				returned
			)
			const args = [...dependencyArgs, ...refs]
			return `const traversals${i} = ${wrapUnitFunction(unitFunction, i)}(${args.join(", ")})`
		})
		// written before filtering, as a meta can read a later one
		const validators = [...this.validatorNames].map(
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
		const isTemplate = this.templates.has(root)
		const members =
			this.runtimeReadRoots.has(root) ?
				new Set([...this.baking.members, ...defaultMembers])
			:	this.baking.members
		const keepsMeta = members.has("meta")
		// unless shortest, the build writes the validator itself
		const ownsValidator =
			!isTemplate && !this.baking.shortest && members.has("methods")
		const [applied, allows, isCompact] = this.emitRootApply(root, ownsValidator)
		// emit meta before keying so an unemittable value is named
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
		const made =
			(
				!fused &&
				!ownsValidator &&
				!isTemplate &&
				typeof applied === "object" &&
				allows === `${applied.args}[0]` &&
				!isCreatedByRuntime(members, this.baking)
			) ?
				applied
			:	undefined
		const written = attributes.length ? [`{ ${attributes.join(", ")} }`] : []
		const createsWith =
			!isTemplate && ownsValidator && isCreatedByRuntime(members, this.baking)
		const args = [
			...(fused ? [fused.args]
			: made ?
				[this.emitApplier(made.params, made.apply, made.failure), made.args]
			: ownsValidator && !isCompact ?
				["runtime.callingRootApply", `[${allows}, ${rootApply()}]`]
			:	[rootApply(), allows]),
			...(createsWith ?
				[
					writeId(id),
					...(held ? [...written, held]
					: written[0] === "{ meta: runtime.emptyMeta }" ? []
					: written)
				]
			:	[
					...written,
					...(!this.baking.checksTypes ? []
					: held ? [writeId(id), held]
					: onFail ? [writeId(id), "undefined"]
					: [writeId(id)])
				]),
			...(onFail ? [onFail] : [])
		]
		const created = `${
			isTemplate ? "["
			: !isCreatedByRuntime(members, this.baking) ?
				`${this.creatorOf(members, ownsValidator, fused, !!made)}(`
			: createsWith ? "runtime.createValidatorWith("
			: "runtime.createValidator("
		}\n\t${args.join(",\n\t")}\n${isTemplate ? "]" : ")"}`
		return held && !this.baking.checksTypes ?
				`runtime.holdHoles(${created}, ${writeId(id)}, ${held})`
			:	created
	}

	creatorOf(
		members: ReadonlySet<ValidatorMember>,
		ownsValidator: boolean,
		applier?: RootApplier,
		makes = false
	): string {
		const keepsMeta = members.has("meta")
		const hasAttributes =
			keepsMeta || introspectionMembers.some(member => members.has(member))
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
		const name = `create${hashOf(`${params.join(", ")}\n${body}`)}`
		this.importName(
			this.share(
				name,
				writeFunction(this.baking, name, params.join(", "), body),
				this.failureImports(applier?.failure)
			),
			name
		)
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
		const standard =
			bakes("~standard.jsonSchema") &&
			(["input", "output"] as const).map(
				io =>
					`[${supportedJsonSchemaTargets.map(target => this.emitJsonSchema(root, () => root["~standard"].jsonSchema[io]({ target }))).join(", ")}]`
			)
		if (bakes("toJsonSchema")) {
			const written = this.emitJsonSchema(root, () => root.toJsonSchema())
			// only targets whose text is already baked
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

	// nodes share json unless it prints a hole
	readJson(root: BaseRoot): string {
		const value = `runtime.deepFreeze(${this.writeData(root.json)})`
		if (holdsLocal(root.json)) {
			return (
				this.declarations.namesByValue.get(root.json) ??
				this.declareConst(root.json, "json", value)
			)
		}
		return this.readConstant(`json${hashOf(value)}`, value)
	}

	share(
		name: string,
		declaration: string,
		imports: Record<string, string[]> = {},
		readsRuntime = true
	): string {
		const specifier = this.specifierOf(name)
		this.sharedModules[specifier] ??= {
			readsRuntime,
			imports,
			declarations: [declaration],
			exports: [name]
		}
		return specifier
	}

	readConstant(name: string, value: string): string {
		return this.read(
			this.share(name, writeValue(this.baking.hoisted, name, value)),
			name,
			name,
			this.readValue(name)
		)
	}

	readFailure(name: keyof typeof failureSources): string {
		return this.read(this.declareFailure(name), name)
	}

	declareFailure(name: keyof typeof failureSources): string {
		const [params, body] = failureSources[name]
		return this.share(
			name,
			writeFunction(this.baking, name, params, body),
			{},
			name === "invalid" || name === "invalidCall"
		)
	}

	failureImports(
		failure: keyof typeof failureSources | undefined
	): Record<string, string[]> {
		return failure ? { [this.declareFailure(failure)]: [failure] } : {}
	}

	emitJsonSchema(root: BaseRoot, write: () => unknown): string {
		const values: unknown[] = []
		const writer = this.writeJsonSchemaWriter(root, write, values)
		const declared = this.jsonSchemaNameOf(writer)
		if (declared) return declared
		// only a Date needs a declaration beside the validator
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

	writeJsonSchemaWriter(
		root: BaseRoot,
		write: () => unknown,
		values?: unknown[]
	): string {
		return `() => ${this.writeJsonSchema(root, write, false, values)}`
	}

	// a schema read only via a validator throws where it's read
	writeJsonSchema(
		root: BaseRoot,
		write: () => unknown,
		isRead: boolean,
		values: unknown[] = []
	): string {
		try {
			assertBakeableJsonSchema(root)
			let schema: unknown
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
				// e.g. a defaulted key intersected with an index signature
				if (e === thrown && e instanceof ParseError)
					return `runtime.throwParseError(${this.emitString(e.message)})`
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
			return printablePrimitive(value)
		const prototype = hasDomain(value, "object") && prototypeOf(value)
		const isPlainArray = prototype === Array.prototype && Array.isArray(value)
		if (
			(!isPlainArray && prototype !== Object.prototype && prototype !== null) ||
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
		if (isPlainArray)
			return `[${(value as unknown[]).map(v => this.writeData(v, opts)).join(", ")}]`
		const entries = Object.entries(value as object).map(
			// a __proto__ key would set an object literal's prototype
			([k, v]) =>
				`${k === "__proto__" ? `["__proto__"]` : JSON.stringify(k)}: ${this.writeData(v, opts)}`
		)
		if (prototype === null) entries.unshift("__proto__: null")
		return `{ ${entries.join(", ")} }`
	}

	emitRootApply(
		root: BaseRoot,
		asValidator: boolean
	): [rootApply: string | RootApplier, allows: string, isCompact: boolean] {
		const callbacks = declares(
			root,
			node =>
				node.hasKind("morph") ||
				(node.hasKind("predicate") && !isKeyword(node.predicate))
		)
		if (!this.baking.detailsErrors) {
			return this.emitUndetailedApply(
				root,
				callbacks ? "Traversal" : "InternalTraversal",
				asValidator
			)
		}
		// callbacks only into runtime keywords report into ArkErrors
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
			) &&
			// errors count their issues, not a branch's
			!rootUnitsOf(root).some(unit =>
				unit.members.some(([, source]) =>
					source.includes("ctx.currentErrorCount")
				)
			)
		const ctx =
			this.baking.firstIssue ?
				reportsIssues ? "FirstIssues"
				:	"FirstIssueTraversal"
			: reportsIssues ? "ArkErrors"
			: callbacks ? "Traversal"
			: "InternalTraversal"
		// first-issue traversals drop the rest when finalized
		const appliesErrors = !this.baking.firstIssue || reportsIssues
		const refOf = (param: RootApplyParam) =>
			param === "Traversal" ? `runtime.${ctx}`
			: param === "config" ? "runtime.runtimeConfig"
			: param === "TransformErrors" ? param
			: param === "applyRejected" && appliesErrors ? "runtime.applyNodeErrors"
			: this.emit(rootApplyRuntime[param])
		const strategy = root.rootApplyStrategy
		const isArrow =
			!root.includesAlias &&
			(strategy === "allows" ||
				(strategy === "transform" &&
					!root.includesMorph &&
					!(root.hasKind("union") && !root.compiledDiscriminant)))
		const transforms = strategy === "transform"
		const [flat, traversals] =
			isArrow && appliesErrors && !root.allowsRequiresContext ?
				this.compactPartsOf(root, transforms ? [0, 1, 2] : [0, 1], asValidator)
			:	[]
		if (traversals) {
			const pattern =
				flat ? `allows, apply${transforms ? ", transform" : ""}`
				: this.baking.shortest ?
					`[allows, apply${transforms ? ", transform" : ""}]`
				:	`{ 0: allows, 1: apply${transforms ? ", 2: transform" : ""} }`
			const valid = transforms ? "transform(data)" : "data"
			const parts = flat ? flat.join(", ") : traversals
			const elements =
				asValidator && !transforms && this.elementTraversalsOf(root)
			if (elements) {
				const Ctx = refOf("Traversal")
				return [
					// a minifier inlines a const read once, but not a default
					`(({ 1: apply, 2: allowsElement, 3: applyElement }, onFail, rejectedIn = data => {
	for (let i = 0; i < data.length; i++) if (!allowsElement(data[i])) return i
}) => ${this.compiledOnLoad(`(data, ...args) => {
	if (!Array.isArray(data)) return runtime.applyCallErrors(apply, data, args, onFail, ${Ctx})
	const i = rejectedIn(data)
	return i === undefined ? data : runtime.applyElements(allowsElement, applyElement, i, data, args, onFail, ${Ctx})
}`)})`,
					`[${traversals}[0], ${traversals}[1], ${elements}[0], ${elements}[1]]`,
					true
				]
			}
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
		if (isArrow) {
			return [
				{
					params: "node",
					apply: `(data, onFail) => node.allows(data) ? ${transforms ? "node.traverseTransform(data)" : "data"} : ${refOf("applyRejected")}(node, data, ${refOf("config")}, onFail, ${refOf("Traversal")})`,
					args: shape
				},
				`${shape}.allows`,
				false
			]
		}
		const [reads, body] = rootApplyParts(
			root,
			this.headUnitOf(root).names[root.id],
			refOf
		)
		const captured =
			/\bTransformErrors\b/.test(body) ?
				`const TransformErrors = ${this.emit(rootApplyRuntime.TransformErrors)}\n\t\t`
			:	""
		// read as defaults, since minifiers inline a call that only takes node
		return [
			`(function (${["node", ...reads].join(", ")}) {
		${captured}${body}
	})(${shape})`,
			`${shape}.allows`,
			false
		]
	}

	emitUndetailedApply(
		root: BaseRoot,
		ctx: string,
		asValidator: boolean
	): [rootApply: string | RootApplier, allows: string, isCompact: boolean] {
		const strategy = root.rootApplyStrategy
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
		const [flat, traversals] =
			!root.allowsRequiresContext && !resolves ?
				this.compactPartsOf(root, transforms ? [0, 2] : [0], asValidator)
			:	[]
		const shape = traversals ? undefined : this.shapeOf(root)
		const allows = traversals ? "allows" : "node.allows"
		const transform = traversals ? "transform" : "node.traverseTransform"
		const fails = [
			...(selects ? [`result === ${JSON.stringify(unset)}`] : []),
			...(captures ?
				[
					'result !== data && typeof result === "function" && result instanceof TransformErrors'
				]
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
							`const result = runtime.transformResolution(ctx, ${JSON.stringify(this.headUnitOf(root).names[root.id])}, data, node.traverseTransform)`
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
		const parts =
			!traversals ? undefined
			: flat ?
				[...(selects ? [] : [flat[0]]), ...(transforms ? [flat[1]] : [])].join(
					", "
				)
			:	traversals
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
		const node = parts ?? shape
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

	emitApplier(
		params: string,
		apply: string,
		failure?: keyof typeof failureSources
	): string {
		if (!this.baking.shortest)
			return `((${params}) => ${this.compiledOnLoad(apply)})`
		const body = `\treturn ${apply}`
		const name = `apply${hashOf(`${params}\n${body}`)}`
		return this.read(
			this.share(
				name,
				writeFunction(this.baking, name, params, body),
				this.failureImports(failure)
			),
			name
		)
	}

	compactPartsOf(
		root: BaseRoot,
		indices: number[],
		asValidator: boolean
	): [flat?: string[] | undefined, traversals?: string | undefined] {
		const flat = asValidator ? undefined : this.flatTraversalsOf(root, indices)
		return [flat, flat ? flat[0] : this.compactTraversalsOf(root)]
	}

	flatTraversalsOf(root: BaseRoot, indices: number[]): string[] | undefined {
		const unit = this.headUnitOf(root)
		if (!this.baking.flattens || !isSharedUnit(unit)) return
		const specifier = this.specifierOf(unit.name)
		const traversals = this.traversalsOf(root, unit)
		return indices.map(i => this.read(specifier, traversals[i]))
	}

	// traversals of the element a root array's validator loops over
	elementTraversalsOf(root: BaseRoot): string | undefined {
		if (!isVariadicArray(root)) return
		const element = root.structure!.sequence!.variadic!
		if (
			isRefinedPattern(element) ||
			!this.unitsByHead.has(`${+this.inPlace(element)}${element.id}`)
		)
			return
		return this.compactTraversalsOf(element)
	}

	compactTraversalsOf(root: BaseRoot): string | undefined {
		const unit = this.headUnitOf(root)
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

	// shared so a factory's check and the validator use one module
	emitExpression(root: BaseRoot): string {
		if (root.expression.includes(holeNameMarker))
			return this.emitString(root.expression)
		const name = this.stringModuleOf(root, "expression")
		return `${this.read(this.specifierOf(name), name)}()`
	}

	// composed from referenced roots' modules where possible
	emitDescription(root: BaseRoot): string {
		if (root.description.includes(holeNameMarker))
			return this.emitString(root.description)
		const parts = partsOf(root, "description")
		if (parts.every(part => typeof part === "string"))
			return this.emitString(root.description)
		const name = this.writeStringModule(root, "description", parts)
		return `${this.read(this.specifierOf(name), name)}()`
	}

	stringModuleOf(root: BaseRoot, kind: ComposedString): string {
		return (
			this.stringModules[kind].get(root) ??
			this.writeStringModule(root, kind, partsOf(root, kind))
		)
	}

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
		this.share(
			name,
			writeFunction(this.baking, name, "", `\treturn ${body}`),
			imports,
			false
		)
		this.stringModules[kind].set(root, name)
		return name
	}

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

	// resolving or instantiating needs arktype, so an empty object
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
			let name = this.typedFnNames.get(value)
			if (name) return name
			name = `typedFn${this.typedFnNames.size}`
			this.typedFnNames.set(value, name)
			this.modules.push(
				`const ${name} = runtime.typedFn(${this.emit(value.raw)}, ${this.readByRuntime(value.params)}, ${this.readByRuntime(value.returns)})`
			)
			return name
		}
		if (!hasArkKind(value, "module"))
			return throwInternalError(`Unexpected export ${printable(value)}`)
		const declared = this.moduleNames.get(value)
		if (declared) return declared
		const entries = Object.entries(value).map(
			([k, entry]) => `[${JSON.stringify(k)}]: ${this.exportOf(entry)}`
		)
		const name = `module${this.moduleNames.size}`
		this.moduleNames.set(value, name)
		this.modules.push(
			`const ${name} = ${this.withHoles(value, `runtime.freeze({ ${entries.join(", ")} })`)}`
		)
		return name
	}

	withHoles(value: Foldable, expression: string): string {
		const [id, holes] = keyOf(value)
		if (!this.baking.checksTypes && !holes.length) return expression
		return `runtime.holdHoles(${expression}, ${writeId(id)}${holes.length ? `, [${holes.map(hole => this.emit(hole)).join(", ")}]` : ""})`
	}

	readValidator(root: BaseRoot): string | undefined {
		this.readRoots.add(root)
		return this.validatorNames.get(root)
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
		const unit = this.unit ? unitOf(node, this.unit) : this.headUnitOf(node)
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
		// read only when entering a cycle's resolution
		const ids =
			node.includesAlias ?
				`\n\tid: ${JSON.stringify(unit.names[node.id])},\n\ttrackedId: ${JSON.stringify(
					unit.names[node.trackedId as NodeId] ??
						throwParseError(
							writeUnprecompilableMessage(`${node.expression}'s cycle`)
						)
				)},`
			:	""
		const flags = shapeFlags.flatMap(flag =>
			node[flag] ? [`\n\t${flag}: true,`] : []
		)
		// read past allows only by a cycle or a ctx-reading predicate
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
		if (!hasDomain(value, "object")) return printablePrimitive(value)
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
		// keys read only with `in`, so emitted without their props
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
			const regex = `/${value.source}/${value.flags}`
			// a pattern's own RegExp: arktype resets its lastIndex
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

	readMeta(meta: object): string | undefined {
		if (!Reflect.ownKeys(meta).length) return "runtime.emptyMeta"
		const literal = this.writeSharedLiteral(meta)
		return literal && this.readConstant(`meta${hashOf(literal)}`, literal)
	}

	writeSharedLiteral(value: unknown): string | undefined {
		if (typeof value === "string")
			return value.includes(holeNameMarker) ? undefined : JSON.stringify(value)
		if (!hasDomain(value, "object"))
			return typeof value === "symbol" ? undefined : printablePrimitive(value)
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

	// called through a function, as validators come after traversals
	emitDefault(
		morph: unknown,
		key: PropertyKey,
		value: BaseRoot,
		defaultValue: unknown
	): string {
		// one morph per default, whose guard prevents double defaulting
		let name = this.defaultNames.get(morph)
		if (name) return `(data, ctx) => ${name}(data, ctx)`
		this.collectType(value)
		name = `default${this.defaults.length}`
		this.defaultNames.set(morph, name)
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
		if ("fails" in site)
			return `runtime.failing(${this.emitSite(site.fails as object)})`
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
		const isPlainArray = prototype === Array.prototype && Array.isArray(value)
		if (!isPlainArray && prototype !== Object.prototype && prototype !== null) {
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
			k => !isPlainArray || k !== "length"
		)
		// an array is copied by index, so holes or extra keys would be lost
		if (
			isPlainArray &&
			(keys.length !== descriptors.length.value ||
				keys.some((k, i) => k !== `${i}`))
		) {
			throwParseError(
				writeUnprecompilableMessage("an array with holes or other properties")
			)
		}
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
			isPlainArray ? `[${elements.join(", ")}]`
			: entries.length ? `{ ${entries.join(", ")} }`
			: "{}"
		return [literal, elements]
	}

	emitElement(value: unknown): string {
		return isNode(value) && value.isRoot() && !this.objectUnits.has(value) ?
				(this.readValidator(value) ??
					throwInternalError(
						`Unexpected Type ${value.expression} outside a meta`
					))
			:	this.emit(value)
	}
}

// issues are written from node descriptions, so refuse other text
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
			if ("fails" in site) codes.add("union")
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

// arktype calls a default's thunk each time it writes the schema
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

// a traversal only calling another of its unit is that one
const forwardedOf = (members: readonly UnitMember[]): Map<string, string> => {
	const sourcesByName = new Map(members)
	const targetsByName = new Map<string, string>()
	for (const [name, source] of members) {
		const [, target, passesCtx] =
			/^function\(data, ctx\) {\s*return ([\w$]+)\(data(, ctx)?\)\s*}$/.exec(
				source
			) ?? []
		const targetSource = sourcesByName.get(target)
		// a structure transforming its sequence keeps the call into it
		if (
			targetSource &&
			!targetSource.includes("transformedSequence") &&
			(passesCtx ||
				!/\bctx\b/.test(targetSource.slice("function(data, ctx)".length)))
		)
			targetsByName.set(name, target)
	}
	const forwarded = new Map<string, string>()
	for (const [name, first] of targetsByName) {
		let target = first
		for (let i = 0; i < targetsByName.size && targetsByName.has(target); i++)
			target = targetsByName.get(target)!
		if (!targetsByName.has(target)) forwarded.set(name, target)
	}
	return forwarded
}

const returnedOf = (unit: RootUnit, baking: Baking): string[] =>
	baking.detailsErrors ?
		unit.traversals.flat()
	:	unit.traversals.flatMap(([allows, , ...transform]) => [
			allows,
			"",
			...transform
		])

const namesReadBy = (unit: RootUnit, returned: string[]): Set<string> =>
	new Set(
		calledMembersOf(unit.members, returned).flatMap(
			([, source]) => source.match(/[\w$]+/g) ?? []
		)
	)

// a keyword Type's validator bakes none of the keyword's meta
export const keywordMetas: () => Set<object> = cached(() => {
	const metas = new Set<object>()
	const collect = (module: object): void => {
		for (const value of Object.values(module)) {
			if (hasArkKind(value, "module")) collect(value)
			else if (hasArkKind(value, "root")) metas.add(value.meta)
		}
	}
	collect(keywords)
	return metas
})

// strict even where a bundle's CJS or IIFE output isn't
const isWriting = (member: string): boolean =>
	member.endsWith("Transform") || member.endsWith("Copy")

// units this one reads: called traversals and referenced shapes
const readUnitsOf = (unit: RootUnit): RootUnit[] =>
	[
		...Object.values(unit.dependencies).map(([node]) => node),
		...unit.refs.filter(ref => isNode(ref) && ref.isRoot())
	].map(node => unitOf(node as BaseNode, unit))

// an array of only a variadic element
const isVariadicArray = (root: BaseRoot): root is IntersectionNode =>
	root.hasKind("intersection") &&
	root.basis?.hasKind("proto") === true &&
	root.basis.proto === Array &&
	Object.keys(root.inner).length === 2 &&
	Object.keys(root.structure?.inner ?? {}).join() === "sequence" &&
	Object.keys(root.structure!.sequence!.inner).join() === "variadic"

const sharedByUnit = new WeakMap<RootUnit, boolean>()

const isSharedUnit = (unit: RootUnit): boolean => {
	let shared = sharedByUnit.get(unit)
	if (shared === undefined) {
		// a cyclic unit is decided by what else it reads
		sharedByUnit.set(unit, true)
		shared =
			!unit.identityNamed.has(unit.roots[0].id) &&
			!unit.refs.some(ref => !isNode(ref) && holdsLocal(ref)) &&
			readUnitsOf(unit).every(isSharedUnit)
		sharedByUnit.set(unit, shared)
	}
	return shared
}

// includes nodes a parent checks inline
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

// sites only traversal reads, emitted as-is
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

// issues hold only code and description, so equal sites share
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

// runtime keywords with one param never read Traversal
const isKeyword = (predicate: unknown): boolean =>
	runtimePathsByValue.has(predicate) && (predicate as Fn).length < 2

// a case returning what the next one does falls through to it, by line so
// no line terminator a string holds is taken for one
const sharedReturnCase = /^( +case [^]*): return ([^]*)$/

const casesFallingThrough = (body: string): string => {
	const lines = body.split("\n")
	for (let i = 0; i < lines.length - 1; i++) {
		const [, label, returned] = sharedReturnCase.exec(lines[i]) ?? []
		const next = sharedReturnCase.exec(lines[i + 1])
		if (
			label &&
			next &&
			next[2] === returned &&
			/^ */.exec(next[1])![0] === /^ */.exec(label)![0]
		)
			lines[i] = `${label}:`
	}
	return lines.join("\n")
}

const countedCheck =
	/^( +)const errorCount = ctx\.currentErrorCount\n +if \(!(r\d+)\(data, ctx\) && ctx\.currentErrorCount === errorCount\) {\n +return (!.+)\n +}\n +return !ctx\.failFast \|\| ctx\.currentErrorCount === errorCount\n$/

class StandaloneCompiler extends TraversalCompiler {
	override site(node: BaseNode): string {
		return this.ref(issueSiteOf(node.failureSite))
	}

	// a keyword check adds no issues itself, so its Apply needn't count them
	override get body(): string {
		const body = casesFallingThrough(super.body)
		const counted = countedCheck.exec(body)
		if (!counted) return body
		const [, indent, check, fail] = counted
		for (const [value, name] of this.refs!) {
			if (name === check && isKeyword(value))
				return `${indent}return ${check}(data, ctx) || ${fail}\n`
		}
		return body
	}

	// read at the discriminant so branches don't rerun
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

	// a rejected union value reports the union's issue, not its Apply
	override failingApplyOf(value: BaseNode): string | undefined {
		if (
			!value.hasKind("union") ||
			value.compiledDiscriminant ||
			value.includesAlias
		)
			return
		const site = issueSiteOf(value.failureSite)
		let failing = failingBySite.get(site)
		if (!failing)
			failingBySite.set(site, (failing = issueSite({ fails: site })))
		return this.ref(failing)
	}
}

const failingBySite = new WeakMap<object, object>()

// size writes the checks an Allows loops over as the returns they stand for
const unlooped = (source: string): string =>
	source.replace(
		/ {4}for \(;;\) {\n([\S\s]*)\n {8}return true\n {4}}\n {4}return false\n }$/,
		(_, checks: string) =>
			`${checks.replace(/^ {4}/gm, "").replace(/^( +)break$/gm, "$1return false")}\n    return true\n }`
	)

class InPlaceCompiler extends StandaloneCompiler {
	override readonly inPlace = true
}

// in-place roots have their own units
const unitsByRoot = [
	new WeakMap<BaseRoot, RootUnit[]>(),
	new WeakMap<BaseRoot, RootUnit[]>()
]

const rootUnitsOf = (root: BaseRoot, inPlace = false): RootUnit[] => {
	const cached = unitsByRoot[+inPlace]
	let units = cached.get(root)
	if (!units) {
		cached.set(
			root,
			(units = precompileRootUnits(root, {
				compiler: inPlace ? InPlaceCompiler : StandaloneCompiler,
				keyOf: runtimeKeyOf
			}))
		)
	}
	return units
}

// a pass can reach content-equal roots, which share a name but not a unit
const unitOf = (node: BaseNode, reader: RootUnit): RootUnit =>
	reader.unitsById[node.id]

// an alias defined by a thunk; a site resolving it is refused
export type ScopeAlias = [scope: BaseScope, alias: string]

export type Key = [
	id: string,
	holes: unknown[],
	// [path, reason] of what can't be compared
	refusal: [path: string, reason: string] | undefined,
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

// 8 hash chars tell a received value from another
const writeId = (id: string): string => JSON.stringify(id.slice(0, 8))

// traversal only: independent of the Scope methods parse in
export const traversalKeyOf = (root: BaseRoot): Key => rootKeyOf(root, false)

const rootKeyOf = (root: BaseRoot, isScoped = true): Key => {
	const units = rootUnitsOf(root)
	const defaultsByMorph = new Map<unknown, Default>()
	for (const unit of units) {
		for (const node of writtenNodesOf(unit)) {
			if (node.hasKind("optional") || node.hasKind("sequence"))
				collectDefaults(node, defaultsByMorph)
		}
	}
	// add each function or object's kind and repeat positions
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

// equal keys differ only in which functions they hold
const encodeKey = (
	start: unknown,
	defaultsByMorph?: ReadonlyMap<unknown, Default>,
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
				// the definition, as resolving it would run default checks early
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
			// an hkt body is a function only identity tells apart
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
		else if (isDateObject(value)) values.push(`Date ${dateGetTime.call(value)}`)
		else if (isRegExpObject(value)) values.push(`${value} ${value.lastIndex}`)
		else if (isArray(value)) {
			values.push(`[${value.length}`)
			// e.g. the narrow in `["string", ":", isLong]`, held, not parsed
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

// a Generic alias is a function too, but isn't a thunk
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

// shorter strings are written inline
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

// two hashes can first differ inside a "$ark.name" reference
const registeredNameAt = (hash: string, i: number): string | undefined => {
	const start = hash.lastIndexOf('"', i - 1) + 1
	const reference = /^\$ark\d*\.([\w$]+)"/.exec(hash.slice(start))
	return reference && i > start + reference[0].indexOf(".") ?
			reference[1]
		:	undefined
}

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
