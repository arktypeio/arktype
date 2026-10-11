import {
	$ark,
	hasArkKind,
	InternalTraversal,
	isNode,
	LazyGenericRoot,
	pipeOf,
	precompileJointUnits,
	precompileRootUnits,
	supportedJsonSchemaTargets,
	ToJsonSchema,
	type ArkErrorCode,
	type BaseNode,
	type BaseRoot,
	type BaseScope,
	type DefaultedNode,
	type GenericRoot,
	type NodeId,
	type Optional,
	type RootUnit,
	type Sequence
} from "@ark/schema"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
	errorWritersByCode,
	rootApplyRuntime,
	writeErrorBuilder,
	writeRootApply
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
	throwParseError
} from "@ark/util"
import { arktypeVersion } from "./entry.ts"
import { InternalTypedFn, type TypedFn } from "./fn.ts"
import type { Generic } from "./generic.ts"
import type { type } from "./keywords/keywords.ts"
import type { Module } from "./module.ts"
import type { HoleKind, IntrospectionMember } from "./runtime.ts"
import * as runtime from "./runtimeExports.ts"
import type { Scope } from "./scope.ts"

const writerKeys = ["expected", "actual", "problem", "message"] as const

type DeclarationRole =
	| "shape"
	| "keys"
	| "literal"
	| "config"
	| "standIn"
	| "json"

// constraints a node keeps sorted by hash, which holds the names of the functions they hold
const sortedConstraintKeys = [
	"pattern",
	"required",
	"optional",
	"index"
] as const

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
	| StandaloneVariants
	| StandaloneIntrospection

export const introspectionMembers = [
	"json",
	"toJSON",
	"toJsonSchema",
	"~standard.jsonSchema"
] as const

export type FoldedMember = Exclude<IntrospectionMember, "~standard.jsonSchema">

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
	// a Type, or a Module, Scope, Generic or TypedFn arktype creates anew each time its site runs
	type: ExportedValue
	params: FactoryParam[]
	// the table of each factory whose Type arktype returns again for the same holes, shared by those returning one Type at build
	internedBy?: number | undefined
	defaultChecks?: readonly DefaultCheck[]
	// holes another module supplies through two or more texts, or a parameter holds, which the factory checks are distinct
	distinct?: readonly unknown[]
	// holes whose facts selected this variant, which its factory doesn't check again
	selected?: readonly unknown[] | undefined
}

// a factory compiled for each value of the facts the build doesn't know, like the parameter count of a function a parameter holds
export interface StandaloneVariants {
	variants: StandaloneFactory[]
	// the params whose parameter counts select a variant
	selecting: number[]
	// the variant for each combination of those counts, read as digits 0, 1 and 2 or more
	variantsByCounts: number[]
}

export type FactoryParam = HoleParam | InputParam | HelperParam

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
	configured?: ConfiguredModule | undefined
	// each Module a site reads off arktype's keywords, which creates a Type only when one of its members is read
	keywordReads?: ReadonlySet<string> | undefined
	// what each validator bakes of its Type's introspection, which it otherwise lacks
	introspection?: readonly IntrospectionMember[] | undefined
	// runs arktype writing what a validator bakes, refusing with a ParseError where the configured code it calls reads what the program can change
	bake?: (<t>(write: () => t) => t) | undefined
}

interface Baking {
	members: ReadonlySet<IntrospectionMember>
	write: <t>(write: () => t) => t
}

export interface StandaloneModules {
	code: string
	// each module code imports by a ~arktype/ specifier
	modules: Record<string, string>
}

const runtimeImport = `import * as runtime from "arktype/runtime"`

const entryCheck = `runtime.assertRuntimeVersion(${JSON.stringify(arktypeVersion)})\nruntime.claimEntry("arktype/runtime")`

/**
 * #### an ES module exporting a getter for each Type, Module, Scope or Generic, which creates them when one is first read, and a function creating each factory's value
 */
export const precompileStandalone = (
	exports: Record<string, StandaloneExport>,
	opts: StandaloneOptions = {}
): string => {
	const shared: Record<string, SharedModule> = {}
	const sections = writeArtifact(exports, opts, shared, {})
	return writeSections([
		runtimeImport,
		entryCheck,
		...Object.values(shared).map(module => module.declarations.join("\n\n")),
		...sections
	])
}

// the units an artifact shares with others are modules of their own, so a bundler keeps one copy of each
export const precompileStandaloneModules = (
	exports: Record<string, StandaloneExport>,
	opts: StandaloneOptions = {}
): StandaloneModules => {
	const shared: Record<string, SharedModule> = {}
	const imports: Record<string, string[]> = {}
	const sections = writeArtifact(exports, opts, shared, imports)
	// imported first, so the runtime's version is checked before anything is created
	const entry = writeSections([runtimeImport, entryCheck])
	const entrySpecifier = `~arktype/entry${hashOf(entry)}`
	const modules: Record<string, string> = { [entrySpecifier]: entry }
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
			`import ${JSON.stringify(entrySpecifier)}\n${runtimeImport}\n${writeImports(imports)}`,
			...sections
		]),
		modules
	}
}

const writeArtifact = (
	exports: Record<string, StandaloneExport>,
	opts: StandaloneOptions,
	shared: Record<string, SharedModule>,
	imports: Record<string, string[]>
): string[] => {
	const { configured } = opts
	const baking: Baking = {
		members: new Set(opts.introspection),
		write: opts.bake ?? (write => write())
	}
	const types: Record<string, ExportedValue> = {}
	const templates = new Set<BaseRoot>()
	const folded = new Set<string>()
	// a factory whose Type is folded reads it where the creations write it
	const factories: (string | ((reads: Record<string, string>) => string))[] = []
	const tables = new Set<number>()
	// a trial write, adding nothing to the artifact, tells whether a factory's Type has code holding nothing the factory receives
	const canFold = (
		name: string,
		factory: StandaloneFactory | StandaloneVariants
	): factory is StandaloneFactory & { type: type.Any & BaseRoot } => {
		if (
			isVariants(factory) ||
			!hasArkKind(factory.type, "root") ||
			factory.defaultChecks?.length
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
			factories.push(artifact.writeIntrospection(value, index, configured))
		} else {
			const factory = value as StandaloneFactory | StandaloneVariants
			const variants = isVariants(factory) ? factory.variants : [factory]
			const artifact = new StandaloneArtifact(
				{ [name]: variants[0].type },
				shared,
				imports,
				baking,
				factory
			)
			artifact.receiveAll()
			// a factory whose Type is written once with the creations, which each call copies with what it receives
			if (canFold(name, factory)) {
				const { type } = factory
				folded.add(name)
				if (keyOf(type)[1].length) templates.add(type)
				types[name] = type
				const at = index
				factories.push(reads => artifact.writeRekeying(at, reads[name]))
			} else {
				for (const { internedBy } of variants)
					if (internedBy !== undefined) tables.add(internedBy)
				factories.push(artifact.writeFactory(name, index, configured))
			}
		}
		factories.push(`export { factory${index} as ${JSON.stringify(name)} }`)
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
	return [
		...creations,
		// created at a factory's first call, which an import cycle can reach before the artifact's body runs
		[...tables].map(table => `var interned${table}`).join("\n"),
		...factories.map(factory =>
			typeof factory === "string" ? factory : factory(reads)
		)
	]
}

interface Creation {
	indices: number[]
	values: Set<unknown>
	code: string
}

const writeCreations = (
	types: Record<string, ExportedValue>,
	templates: ReadonlySet<BaseRoot>,
	// a factory's Type, which only that factory reads
	folded: ReadonlySet<string>,
	{ configured, keywordReads }: StandaloneOptions,
	baking: Baking,
	shared: Record<string, SharedModule>,
	imports: Record<string, string[]>
): [code: string[], reads: Record<string, string>] => {
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
	const reads: Record<string, string> = {}
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
			reads[names[i]] =
				`(created${index} ??= create${index}())${creation.indices.length > 1 ? `[${position}]` : ""}`
		}
	}
	const lazyNamesByModule = new Map<object, string>()
	// declared as functions, which a site an import cycle reaches before the artifact is evaluated can call
	const getters = names.flatMap((name, i) => {
		if (folded.has(name)) return []
		const value = types[name]
		let declaration = ""
		let read = reads[name]
		if (keywordReads?.has(name) && hasArkKind(value, "module")) {
			let lazyName = lazyNamesByModule.get(value)
			if (!lazyName) {
				lazyName = `lazy${i}`
				lazyNamesByModule.set(value, lazyName)
				declaration = `var ${lazyName}\n\n`
			}
			read = `(${lazyName} ??= runtime.lazyModule(${JSON.stringify(moduleMembersOf(value))}, () => ${read}))`
		}
		return `${declaration}function get${i}() {\n\treturn ${read}\n}\n\nexport { get${i} as ${JSON.stringify(name)} }`
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

const isVariants = (value: StandaloneExport): value is StandaloneVariants =>
	arkKindOf(value) === undefined && "variants" in value

const writeSections = (sections: string[]) =>
	`${sections.filter(section => section).join("\n\n")}\n`

const writeImports = (imports: Record<string, string[]>) =>
	Object.entries(imports)
		.map(
			([specifier, names]) =>
				`import { ${names.join(", ")} } from ${JSON.stringify(specifier)}`
		)
		.join("\n")

const moduleMembersOf = (module: object): runtime.ModuleMembers => {
	const result: runtime.ModuleMembers = {}
	for (const [k, member] of Object.entries(module))
		result[k] = hasArkKind(member, "module") ? moduleMembersOf(member) : true
	return result
}

export const writeFixConfig = (
	configured: ConfiguredModule | undefined
): string =>
	`runtime.fixConfig(${configured ? `${JSON.stringify(configured.fingerprint)}, ${JSON.stringify(configured.path)}` : ""})`

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
		config: [],
		standIn: [],
		json: []
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
	declarations = createDeclarations()
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
	templates = new Set<BaseRoot>()
	// a default's node, which only its check reads, so its validator is keyed by its traversal
	checkedRoots: ReadonlySet<BaseRoot>
	// what a factory receives and checks for each variant it can create, none for an artifact creating its exports once
	variants: readonly StandaloneFactory[]
	variantTypes: ReadonlySet<unknown>
	// how a factory of more than one variant selects the one a call creates
	selection: StandaloneVariants | undefined
	// the units of the variants' Types, which declare the nodes they share once
	jointUnits: RootUnit[] | undefined
	// what creates each variant's validator, which only a call selecting it runs
	variantStatements = new Map<BaseRoot, string[]>()
	// each default arktype checks where it defines the Type, which the factory checks once it creates the validators
	defaultChecks: readonly DefaultCheck[]
	// the holes of each value a factory receives, by the name holding them
	holesByName = new Map<string, readonly unknown[]>()
	baking: Baking
	// each JSON Schema a validator bakes, written once however many of its members return it
	jsonSchemaNamesByText: Record<string, string> = {}

	constructor(
		exports: Record<string, ExportedValue>,
		sharedModules: Record<string, SharedModule>,
		imports: Record<string, string[]>,
		baking: Baking,
		// the factory a site calls, or its variants, or the function returning a Type's introspection, which receives only what its default checks read
		called?: StandaloneFactory | StandaloneVariants | StandaloneIntrospection
	) {
		this.exports = exports
		this.baking = baking
		const introspected = called && "member" in called ? called : undefined
		const received = introspected ? undefined : called
		this.selection = received && isVariants(received) ? received : undefined
		this.variants =
			this.selection?.variants ??
			(received ? [received as StandaloneFactory] : [])
		this.defaultChecks =
			introspected?.defaultChecks ??
			this.variants.flatMap(variant => variant.defaultChecks ?? [])
		const types = this.variants.map(({ type }) => type)
		this.variantTypes = new Set(types)
		const selection = this.selection
		// each variant holds its own stand-in for a selecting parameter's function, which a call receives as one, so a node holding it is written once where its code is the same
		const selectedKeys = new Map(
			selection?.variants.flatMap(({ params }) =>
				selection.selecting.map(i => [
					(params[i] as HoleParam).value,
					`selected ${i}`
				])
			)
		)
		this.jointUnits =
			selection && types.every(type => hasArkKind(type, "root")) ?
				precompileJointUnits(
					types as BaseRoot[],
					value => selectedKeys.get(value) ?? runtimeKeyOf(value)
				)
			:	undefined
		this.sharedModules = sharedModules
		this.imports = imports
		for (const name in exports) {
			// an ES module can't export a name holding an unpaired surrogate
			if (/\p{Cs}/u.test(name)) {
				throwParseError(
					writeUnprecompilableMessage(`the export name ${JSON.stringify(name)}`)
				)
			}
		}
		for (const [name, value] of Object.entries(exports)) {
			const path = appendStringifiedKey("", name)
			this.collectExport(value, path)
			for (const { type } of this.variants.slice(1))
				this.collectExport(type, path)
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
				for (const unit of this.unitsOf(root)) {
					for (const head of unit.roots) {
						if (!this.unitsByHead.has(head.id))
							this.unitsByHead.set(head.id, unit)
					}
				}
			}
		} while (this.collectMetaTypes())
		this.comparedRoots = this.roots
		for (const root of this.roots) {
			// the runtime's own onFail is the one the program configures, which only a validator's meta overrides
			if (
				root.meta.onFail === undefined &&
				root.onFail !== $ark.resolvedConfig!.onFail
			)
				throwParseError(writeUnprecompilableMessage("onFail"))
		}
		for (const node of this.declared) {
			if (node.hasKind("structure")) this.keyLookups.add(node.propsByKey)
			else if (node.hasKind("pattern")) this.patternInstances.add(node.instance)
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

	receiveAll(): void {
		const [{ params, distinct = [], selected }, ...others] = this.variants
		this.receive(
			params,
			selected,
			others.map(variant => variant.params)
		)
		if (distinct.length) {
			this.checks.push(
				`runtime.checkDistinct([${distinct.map(hole => this.holeExpressions.get(hole)).join(", ")}], ${JSON.stringify(distinct.map(hole => this.labelsByHole.get(hole)))})`
			)
		}
	}

	receive(
		params: FactoryParam[],
		selected: readonly unknown[] = [],
		variants: readonly FactoryParam[][] = []
	): void {
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
			} else if (this.receiveHole(param.value, `p${i}`, param.label)) {
				if (!selected.includes(param.value))
					checked.push([param.value, param.kind, `p${i}`])
				if (param.kind === "class") this.classes.add(param.value)
			}
		}
		// another variant holds its own stand-in for a function selecting it, which the factory receives where it receives the first's
		for (const variant of variants) {
			for (const [i, param] of variant.entries()) {
				if ("value" in param && !this.holeExpressions.has(param.value)) {
					this.holeExpressions.set(param.value, `p${i}`)
					this.labelsByHole.set(param.value, param.label)
				}
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
			const expected = runtime.describeHole(
				hole,
				kind,
				classesOf(hole => hole)
			)
			this.checks.push(
				`runtime.checkFacts(runtime.describeHole(${expression}, "${kind}"${kind === "class" ? classesArg : ""}), ${JSON.stringify(expected)}, ${JSON.stringify(this.labelsByHole.get(hole))})`
			)
		}
	}

	// a string that prints a hole's name is completed at creation, so neither compiled code nor an order may depend on it
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
					this.checkOrder(list[i - 1] as BaseNode, list[i] as BaseNode)
			}
		}
	}

	holeNamed(name: string): unknown {
		for (const hole of this.holeExpressions.keys()) {
			if (typeof hole === "function" && functionNameOf(hole) === name)
				return hole
		}
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
		const imports: Record<string, string[]> = {}
		let expected = ""
		if (!hasArkKind(value, "root")) expected = `, "${kindNameOf(value)}"`
		else if (!value.expression.includes(holeNameMarker)) {
			const name = this.stringModuleOf(value, "expression")
			imports[`~arktype/${name}`] = [name]
			expected = `, ${name}`
		}
		const body = `runtime.holesOf(holder, ${JSON.stringify(id)}, ${JSON.stringify(label)}${expected})`
		const name = `receive${hashOf(body)}`
		this.sharedModules[`~arktype/${name}`] ??= {
			readsRuntime: true,
			imports,
			declarations: [`function ${name}(holder) {\n\treturn ${body}\n}`],
			exports: [name]
		}
		this.importName(`~arktype/${name}`, name)
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
			this.checks.push(
				`${holes.length ? `const ${holesName} = ` : ""}${this.receiverOf(value, id, label)}(${expression})`
			)
			// a class a Module, Scope or Generic holds is related to the others this artifact's Types hold
			const related = isType ? [value, ...value.references] : this.declared
			const protos = related.flatMap(node =>
				node.hasKind("proto") ? [node.proto] : []
			)
			for (let i = 0; i < holes.length; i++) {
				this.receiveHole(holes[i], `${holesName}[${i}]`, `${label}'s hole ${i}`)
				if (protos.includes(holes[i] as never)) this.classes.add(holes[i])
			}
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

	// where two siblings' hashes first differ inside the names of what they hold, the factory checks the names it receives sort as the build's did
	checkOrder(l: BaseNode, r: BaseNode): void {
		let i = 0
		while (i < l.hash.length && l.hash[i] === r.hash[i]) i++
		const sides = [l.hash, r.hash].map(hash => {
			const name = registeredNameAt(hash, i)
			if (name === undefined) return
			const marker = name.indexOf(holeNameMarker)
			if (marker === -1) {
				const base = name.replace(/\$\d+$/, "")
				return { base, expression: JSON.stringify(base), label: "" }
			}
			const hole = [...this.holeExpressions.keys()].find(
				hole => typeof hole === "function" && nameOf(hole) === name
			)
			return {
				base: name.slice(0, marker),
				expression: this.holeExpressions.get(hole) ?? "",
				label: this.labelsByHole.get(hole) ?? name
			}
		})
		const [left, right] = sides
		const holes = sides.filter(side => side?.label)
		if (!holes.length) return
		// arktype prints siblings printing alike but for their names once where the names are equal, which text written before the names are known can't
		const isAlike = (["expression", "description"] as const).every(
			k =>
				l[k].replace(holeNamePattern, "") === r[k].replace(holeNamePattern, "")
		)
		// a name holding "$" can sort against another by its registration count, as no declaration tells
		const unordered =
			holes.find(side => !side!.base || !side!.expression) ??
			(!left || !right || `${right.base}"` < `${left.base}"` ?
				holes[0]
			:	undefined)
		if (unordered) {
			throwParseError(
				writeUnprecompilableMessage(
					`an order that depends on the name of ${unordered.label}`
				)
			)
		}
		if (isAlike && left!.base === right!.base) {
			throwParseError(
				writeUnprecompilableMessage(
					`siblings printing alike but for the name of ${holes[0]!.label}`
				)
			)
		}
		const check = `runtime.checkOrder(${left!.expression}, ${right!.expression}, ${JSON.stringify([left!.label, right!.label])}${isAlike ? ", true" : ""})`
		if (!this.checks.includes(check)) this.checks.push(check)
	}

	get roots(): BaseRoot[] {
		return [...this.validatorNamesByRoot.keys()]
	}

	get declared(): BaseNode[] {
		return this.units.flatMap(unit => unit.declared)
	}

	// each Type's units, after those they call
	get units(): RootUnit[] {
		return [...new Set([...this.unitRoots].flatMap(root => this.unitsOf(root)))]
	}

	// a variant's validator, which no other value reads
	isVariantRoot(root: BaseRoot): boolean {
		return (
			!!this.selection &&
			this.variantTypes.has(root) &&
			!this.defaultChecks.some(([node]) => node.in === root)
		)
	}

	unitsOf(root: BaseRoot): RootUnit[] {
		return this.jointUnits && this.variantTypes.has(root) ?
				this.jointUnits
			:	rootUnitsOf(root)
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
		for (const node of this.declared)
			for (const v of Object.values(node.meta)) collect(v)
		return this.validatorNamesByRoot.size > typeCount
	}

	writeCreate(index: number, configured: ConfiguredModule | undefined): string {
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
		return `var created${index}

function create${index}() {
${statements.filter(statement => statement).join("\n\n")}
}`
	}

	// each call creates its validator from the holes and inputs the artifact received, so it declares everything the validator holds
	writeFactory(
		name: string,
		index: number,
		configured: ConfiguredModule | undefined
	): string {
		const [{ params, internedBy }] = this.variants
		this.writeSharedUnits()
		// a Module, Scope or Generic declares what it holds, which the body then writes
		const values = this.variants.map(({ type }, i) =>
			this.exportOf(i ? type : this.exports[name])
		)
		// written before the body, which declares what they read
		const defaults = this.variants.map(variant =>
			this.writeDefaultChecks(variant.defaultChecks ?? [])
		)
		const holes =
			internedBy === undefined ? undefined : (
				[
					...new Set(
						this.variants.flatMap(({ type }) =>
							keyOf(type)[1].map(hole => this.holeExpressions.get(hole)!)
						)
					)
				]
			)
		const selection = this.selection
		const body = this.writeCalledBody(index)
		if (selection) {
			// a call creates only the variant it selects
			const created = this.variants.map(({ type }, i) => [
				...(this.variantStatements.get(type as never) ?? []),
				...defaults[i].map(({ check }) => check),
				`return ${values[i]}`
			])
			// a name a variant declares exists only where a call selects it
			const shared = body.join("\n")
			for (const statement of [...this.variantStatements.values()].flat()) {
				const name = /^const (\w+) =/.exec(statement)?.[1]
				if (name && new RegExp(`\\b${name}\\b`).test(shared))
					throwInternalError(`Unexpected read of a variant's ${name}`)
			}
			body.push(
				`switch (variant) {\n${created.map((statements, i) => `case ${i}: {\n${statements.join("\n")}\n}`).join("\n")}\n}`
			)
		} else
			body.push(...defaults[0].map(({ check }) => check), `return ${values[0]}`)
		const keys = defaults.map(
			checks => `[${checks.map(({ key }) => key).join(", ")}]`
		)
		const defaultKeys =
			!defaults.some(checks => checks.length) ? ""
			: selection ? `, [${keys.join(", ")}][variant]`
			: `, ${keys[0]}`
		const statements = [
			selection &&
				`const variant = runtime.selectVariant([${selection.selecting.map(i => `p${i}`).join(", ")}], ${JSON.stringify(selection.variantsByCounts)}, ${JSON.stringify(selection.selecting.map(i => params[i].label))})`,
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
	writeRekeying(index: number, read: string): string {
		const [{ type, params }] = this.variants
		const holes = keyOf(type as never)[1]
		// a Type holding exactly the holes of a value it receives, as one of a Scope does, is keyed by that value's
		const received = [...this.holesByName].find(
			([, received]) =>
				received.length === holes.length &&
				received.every((hole, i) => hole === holes[i])
		)?.[0]
		return this.writeFactoryFunction(index, params, [
			...this.checks,
			`return ${
				holes.length ?
					`runtime.rekeyed(${read}, ${received ?? `[${holes.map(hole => this.emit(hole)).join(", ")}]`})`
				:	read
			}`
		])
	}

	writeIntrospection(
		{ member, type, data, params, thrown }: StandaloneIntrospection,
		index: number,
		configured: ConfiguredModule | undefined
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
			:	this.readJson(type)
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

function factory${index}(${params.map((_, i) => `p${i}`).join(", ")}) {
${statements.filter(statement => statement).join("\n\n")}
}`
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
			const raisable = raisableCodesOf(input)
			const config = this.scopeConfigOf(input, raisable)
			// a narrow whose answer never changes answers an equal check alike, so a check is keyed by its node's traversal, the configuration it reads, its value and the functions they hold
			const [inputId, inputHoles] = traversalKeyOf(input)
			const [valueId, valueHoles] = encodeKey(defaultValue, undefined, false)
			const writers = configuredWritersOf(input, raisable)
			const defaultKey = `[${JSON.stringify(hashOf(`${inputId} ${valueId}${writers && ` ${writers}`}`))}, [${[...inputHoles, ...valueHoles].map(hole => this.emit(hole)).join(", ")}]]`
			return {
				check: `runtime.checkDefault(${this.validatorNamesByRoot.get(input)}, ${this.emit(defaultValue)}, ${key === null ? "null" : this.emit(key)}, ${defaultKey}${config === "runtime.runtimeConfig" ? "" : `, ${config}`})`,
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

	// a shared unit is created by a function declaration, which an import cycle can call before its module is evaluated
	writeShared(unit: RootUnit): void {
		const specifier = `~arktype/${unit.name}`
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
		const [dependencyParams, dependencyArgs] = this.dependencyParamsOf(unit)
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
		const refs = unit.refs.map(
			(value, i) => `const r${i} = ${this.emit(value)}`
		)
		const errorContexts = unit.errorContexts.map(context => this.emit(context))
		const builders = this.writeBuilders(
			unit.errorContexts,
			errorContexts,
			"errorContexts"
		)
		const returned = unit.traversals.flat()
		const links = ownRoots.map(root => {
			const shape = writing.shapesByName[unit.names[root.id]]
			returned.push(shape)
			return `runtime.freeze(runtime.assign(${shape}, ${this.writeShape(root, shape, unit, this.traversalsOf(root, unit))}))`
		})
		const unitFunction = this.writeUnitFunction(
			unit,
			[...dependencyParams, ...writing.params],
			[
				...this.declarations.statements,
				...refs,
				`const errorContexts = [${errorContexts.join(", ")}]`,
				...builders
			],
			links,
			returned
		)
		const moduleDeclarations = [
			`var ${unit.name}Unit`,
			`function ${unit.name}() {\n${isStrict(unit) ? `\t"use strict"\n` : ""}\treturn (${unit.name}Unit ??= (${unitFunction})(${[...dependencyArgs, ...writing.args].join(", ")}))\n}`
		]
		for (const root of unit.roots) {
			const name = unit.names[root.id]
			const shape = writing.shapesByName[name]
			moduleDeclarations.push(
				shape ?
					`function ${name}Node() {\n\treturn ${unit.name}()[${returned.indexOf(shape)}]\n}`
				:	`var ${name}Shape\nfunction ${name}Node() {\n\treturn (${name}Shape ??= runtime.freeze(${this.writeShape(
						root,
						`${name}Node()`,
						unit,
						this.traversalsOf(root, unit).map(
							traversal => `${unit.name}()[${returned.indexOf(traversal)}]`
						)
					)}))\n}`
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
				...unit.roots.map(root => `${unit.names[root.id]}Node`)
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
		return `function (${params.join(", ")}) {
${directive}${[...prologue, ...unit.members.map(([name, source]) => `const ${name} = ${source}`), ...epilogue].join("\n")}
return [${returned.join(", ")}]
}`
	}

	traversalsOf(root: BaseRoot, unit: RootUnit): string[] {
		const name = unit.names[root.id]
		return unit.traversals[
			unit.roots.findIndex(head => unit.names[head.id] === name)
		]
	}

	read(specifier: string, name: string, param: string, arg: string): string {
		this.importName(specifier, name)
		if (!this.writing) return arg
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

	dependencyParamsOf(unit: RootUnit): [params: string[], args: string[]] {
		const namesBySource: Record<string, string[]> = {}
		const params: string[] = []
		const args: string[] = []
		for (const name in unit.dependencies) {
			const dependency = unitOf(unit.dependencies[name][0], unit)
			const index = dependency.traversals.flat().indexOf(name)
			const isShared = isSharedUnit(dependency)
			if (isShared)
				this.importName(`~arktype/${dependency.name}`, dependency.name)
			const source =
				isShared ?
					`${dependency.name}()`
				:	this.localNamesByUnit.get(dependency)!
			if (declaresStrict(unit)) {
				params.push(name)
				args.push(`${source}[${index}]`)
			} else (namesBySource[source] ??= [])[index] = name
		}
		// a traversal the unit doesn't read is a hole, which join writes as ""
		for (const source in namesBySource) {
			params.push(`[${namesBySource[source].join(", ")}]`)
			args.push(source)
		}
		return [params, args]
	}

	// contexts with the same keys share a function building their errors, in a module of its own
	writeBuilders(
		contexts: readonly object[],
		names: string[],
		contextsName?: string
	): string[] {
		const namesByBuilder: Record<string, string[]> = {}
		for (let i = 0; i < contexts.length; i++) {
			const builder = writeErrorBuilder(contexts[i])
			const builderName = `build${hashOf(builder)}`
			this.sharedModules[`~arktype/${builderName}`] ??= {
				readsRuntime: false,
				imports: {},
				declarations: [
					`function ${builderName}(context, path, data) {\n${builder}}`
				],
				exports: [builderName]
			}
			const built = (namesByBuilder[
				this.read(
					`~arktype/${builderName}`,
					builderName,
					builderName,
					builderName
				)
			] ??= [])
			if (!built.includes(names[i])) built.push(names[i])
		}
		return Object.entries(namesByBuilder).map(
			([builderName, built]) =>
				`runtime.registerErrorBuilder(${builderName}, ${contextsName && built.length === names.length ? contextsName : `[${built.join(", ")}]`})`
		)
	}

	writeBody(
		wrapUnitFunction: (unitFunction: string, i: number) => string
	): string[] {
		const localContexts: object[] = []
		const localContextNames: string[] = []
		const traversals = this.localUnits.map((unit, i) => {
			this.localNamesByUnit.set(unit, `traversals${i}`)
			this.unit = unit
			const refs = unit.refs.map(value => this.emit(value))
			const errorContexts = unit.errorContexts.map(context =>
				this.emit(context)
			)
			this.unit = undefined
			localContexts.push(...unit.errorContexts)
			localContextNames.push(...errorContexts)
			const [dependencyParams, dependencyArgs] = this.dependencyParamsOf(unit)
			const unitFunction = this.writeUnitFunction(
				unit,
				[...dependencyParams, "refs", "errorContexts"],
				unit.refs.map((_, i) => `const r${i} = refs[${i}]`),
				[],
				unit.traversals.flat()
			)
			const args = [
				...dependencyArgs,
				`[${refs.join(", ")}]`,
				`[${errorContexts.join(", ")}]`
			]
			return `const traversals${i} = ${wrapUnitFunction(unitFunction, i)}(${args.join(", ")})`
		})
		const builders = this.writeBuilders(localContexts, localContextNames)
		const validators: string[] = []
		// what depends on every validator, written once they exist
		const lateLength = () =>
			this.defaults.length + this.modules.length + this.fills.length
		for (const [root, name] of this.validatorNamesByRoot) {
			const { statements, namesByValue } = this.declarations
			const declared = statements.length
			const linked = this.links.length
			const named = namesByValue.size
			const late = lateLength()
			const validator = `const ${name} = ${this.writeValidator(root)}`
			if (!this.isVariantRoot(root) || lateLength() !== late) {
				validators.push(validator)
				continue
			}
			// what only a variant's validator declares, like its shape, is created where a call selects it, and declared again if another reads it
			for (const value of [...namesByValue.keys()].slice(named))
				namesByValue.delete(value)
			this.variantStatements.set(root, [
				...statements.splice(declared),
				...this.links.splice(linked),
				validator
			])
		}
		return [
			this.declarations.statements.join("\n"),
			builders.join("\n"),
			traversals.join("\n"),
			this.links.join("\n"),
			validators.join("\n\n"),
			this.defaults.join("\n"),
			this.modules.join("\n"),
			this.fills.join("\n")
		]
	}

	writeValidator(root: BaseRoot): string {
		const shape = this.shapeOf(root)
		const nodeName = this.unitsByHead.get(root.id)!.names[root.id]
		const [id, holes] = (this.checkedRoots.has(root) ? traversalKeyOf : keyOf)(
			root
		)
		// a folded factory's Type is written as what constructs its validator, which each call constructs with the functions it receives
		const isTemplate = this.templates.has(root)
		const key = `,\n\t${JSON.stringify(id)}${holes.length && !isTemplate ? `,\n\t[${holes.map(hole => this.emit(hole)).join(", ")}]` : ""}`
		return `${isTemplate ? "[" : "new runtime.Validator("}
	${this.emitRootApply(root, shape, nodeName)},
	${shape},
	${this.emit(pipeOf(root))},
	{ expression: ${root.expression.includes(holeNameMarker) ? this.emitString(root.expression) : `${this.readExpression(root)}()`}, description: ${this.emitDescription(root)}, meta: ${this.emit(root.meta)}${this.emitIntrospection(root)} }${key}
${isTemplate ? "]" : ")"}`
	}

	emitIntrospection(root: BaseRoot): string {
		const members: string[] = []
		const bakes = (member: IntrospectionMember) =>
			this.baking.members.has(member)
		if (bakes("json") || bakes("toJSON")) {
			const json = this.readJson(root)
			if (bakes("json")) members.push(`json: ${json}`)
			if (bakes("toJSON")) members.push(`toJSON: runtime.freeze(() => ${json})`)
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
					this.jsonSchemaNamesByText[
						this.writeJsonSchemaWriter(root, () =>
							root.toJsonSchema({ target })
						)
					] ?? 0
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
		return members.map(member => `, ${member}`).join("")
	}

	// arktype returns one json object per node, which every validator of it and every site reading it share, unless it prints what the artifact receives
	readJson(root: BaseRoot): string {
		const value = this.writeData(root.json)
		if (holdsLocal(root.json)) {
			return (
				this.declarations.namesByValue.get(root.json) ??
				this.declareConst(root.json, "json", value)
			)
		}
		// arktype doesn't promise Types defined apart are distinct, so a node shares json with any whose text is the same
		const name = `json${hashOf(value)}`
		this.sharedModules[`~arktype/${name}`] ??= {
			readsRuntime: false,
			imports: {},
			declarations: [`const ${name} = ${value}`],
			exports: [name]
		}
		return this.read(`~arktype/${name}`, name, name, name)
	}

	emitJsonSchema(root: BaseRoot, write: () => unknown): string {
		const writer = this.writeJsonSchemaWriter(root, write)
		let name = this.jsonSchemaNamesByText[writer]
		if (!name) {
			name = `jsonSchema${Object.keys(this.jsonSchemaNamesByText).length}`
			this.jsonSchemaNamesByText[writer] = name
			this.declarations.statements.push(`const ${name} = ${writer}`)
		}
		return name
	}

	// arktype writes its JSON Schema anew each call
	writeJsonSchemaWriter(root: BaseRoot, write: () => unknown): string {
		return `() => ${this.writeJsonSchema(root, () => this.baking.write(write), false)}`
	}

	// a schema the program reads only through a validator throws why the build can't write it, where it's read
	writeJsonSchema(
		root: BaseRoot,
		write: () => unknown,
		isRead: boolean
	): string {
		try {
			assertBakeableJsonSchema(root)
			let schema: unknown
			try {
				schema = write()
			} catch (e) {
				if (e instanceof ToJsonSchema.Error)
					return `runtime.throwJsonSchemaError(${JSON.stringify(e.code)}, ${this.emitString(e.message)}, ${this.writeData(e.context, true)})`
				if (isSymbolConversion(e)) return "runtime.serializeSymbol()"
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

	// a ToJsonSchemaError's context holds the validator's own values, like a predicate or a Date bound, beside its data
	writeData(value: unknown, holdsValues = false): string {
		if (
			holdsValues &&
			(typeof value === "function" ||
				typeof value === "symbol" ||
				typeof value === "bigint" ||
				(hasDomain(value, "object") && isDateObject(value)))
		)
			return this.emit(value)
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
			return `[${(value as unknown[]).map(v => this.writeData(v, holdsValues)).join(", ")}]`
		const entries = Object.entries(value as object).map(
			// a __proto__ key would set an object literal's prototype
			([k, v]) =>
				`${k === "__proto__" ? `["__proto__"]` : JSON.stringify(k)}: ${this.writeData(v, holdsValues)}`
		)
		if (prototype === null) entries.unshift("__proto__: null")
		return `{ ${entries.join(", ")} }`
	}

	// a root's apply is passed only what its strategy reads, and a traversal no callback sees lacks the API Traversal adds for them
	emitRootApply(root: BaseRoot, shape: string, nodeName: string): string {
		const callbacks = raisableCodesOf(root) === "any"
		const config = this.configOf(root)
		const apply = writeRootApply(root, nodeName)
		const read = Object.entries(rootApplyRuntime).filter(([param]) =>
			new RegExp(`\\b${param}\\b`).test(apply)
		)
		const params = read.map(([param]) => `, ${param}`).join("")
		const args = read
			.map(
				([, value]) =>
					`, ${this.emit(value === rootApplyRuntime.Traversal && !callbacks ? InternalTraversal : value)}`
			)
			.join("")
		return `(function (node, config${params}) {
		${apply}
	})(${shape}, ${config}${args})`
	}

	// a Type's expression is a module of its own, so a factory checking that it receives the Type shares it with the Type's validator
	readExpression(root: BaseRoot): string {
		const name = this.stringModuleOf(root, "expression")
		return this.read(`~arktype/${name}`, name, name, name)
	}

	// a description holding those of the roots it references is composed from their modules, else written where it's read
	emitDescription(root: BaseRoot): string {
		if (root.description.includes(holeNameMarker))
			return this.emitString(root.description)
		const parts = partsOf(root, "description")
		if (parts.every(part => typeof part === "string"))
			return this.emitString(root.description)
		const name = this.writeStringModule(root, "description", parts)
		return `${this.read(`~arktype/${name}`, name, name, name)}()`
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
				imports[`~arktype/${name}`] = [name]
				return `${name}()`
			})
			.join(" + ")
		const name = `${kind}${hashOf(body)}`
		this.sharedModules[`~arktype/${name}`] ??= {
			readsRuntime: false,
			imports,
			declarations: [`function ${name}() {\n\treturn ${body}\n}`],
			exports: [name]
		}
		this.stringModuleNamesByRoot[kind].set(root, name)
		return name
	}

	// a hole's name is known only at creation, so a string printing one is completed then with arktype's own printing
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
		if (hasArkKind(value, "root")) return this.validatorNamesByRoot.get(value)!
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
				`const ${name} = runtime.typedFn(${this.emit(value.raw)}, ${this.exportOf(value.params)}, ${this.exportOf(value.returns)})`
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
		return `runtime.holdHoles(${expression}, ${JSON.stringify(id)}${holes.length ? `, [${holes.map(hole => this.emit(hole)).join(", ")}]` : ""})`
	}

	declareConst(
		value: object,
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
		if (this.writing && isSharedUnit(unit)) {
			return this.read(
				`~arktype/${unit.name}`,
				`${name}Node`,
				name,
				`${name}Node()`
			)
		}
		const declared = this.declarations.namesByValue.get(node)
		if (declared) return declared
		if (isSharedUnit(unit)) {
			return this.declareConst(
				node,
				"shape",
				this.read(`~arktype/${unit.name}`, `${name}Node`, name, `${name}Node()`)
			)
		}
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
		const trackedName =
			unit.names[node.trackedId as NodeId] ??
			throwParseError(writeUnprecompilableMessage(`${node.expression}'s cycle`))
		// a discriminant's miss reads its union's description of the cases
		const discriminantDescription =
			node.hasKind("union") && node.compiledDiscriminant ?
				`,\n\tdiscriminantDescription: ${JSON.stringify(node.discriminantDescription)}`
			:	""
		// a flag that is false, or a traversal the node lacks, is left out, which the runtime reads as undefined
		const flags = shapeFlags.flatMap(flag =>
			node[flag] ? [`\n\t${flag}: true,`] : []
		)
		const transform =
			traversals[2] ? `\n\ttraverseTransform: ${traversals[2]},` : ""
		return `{
	id: ${JSON.stringify(unit.names[node.id])},
	trackedId: ${JSON.stringify(trackedName)},${flags.join("")}
	traverseAllows: ${traversals[0]},
	traverseApply: ${traversals[1]},${transform}
	allows: ${node.allowsRequiresContext ? `data => runtime.allowsUntracked(${shape}, data) ?? runtime.allowsInContext(${shape}, data, runtime.runtimeConfig)` : traversals[0]},
	$: runtime.runtimeScope${discriminantDescription}
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
			return this.declareConst(
				value,
				"literal",
				`runtime.freeze(new Date(${value.getTime()}))`
			)
		}
		if (isRegExpObject(value)) {
			if (Reflect.ownKeys(value).some(k => k !== "lastIndex")) {
				throwParseError(
					writeUnprecompilableMessage("a RegExp with its own properties")
				)
			}
			const regex = `new RegExp(${JSON.stringify(value.source)}, ${JSON.stringify(value.flags)})`
			const initialized =
				value.lastIndex ?
					`runtime.assign(${regex}, { lastIndex: ${value.lastIndex} })`
				:	regex
			// V8 skips its fast test for a non-extensible RegExp, and no program can reach a pattern's own
			if (this.patternInstances.has(value))
				return this.declareConst(value, "literal", initialized)
			// its methods write lastIndex, so it's kept from growing rather than frozen
			return this.declareConst(
				value,
				"literal",
				`runtime.preventExtensions(${initialized})`
			)
		}
		return this.emitLiteral(value)
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
		this.defaults.push(
			`const ${name} = runtime.computeDefaultValueMorph(${this.emit(key)}, ${this.validatorNamesByRoot.get(value)}, ${this.emit(defaultValue)}, {${flags.length ? ` ${flags.join(", ")} ` : ""}}${typeof defaultValue === "function" ? `, ${isThunk(defaultValue)}` : ""})`
		)
		return `(data, ctx) => ${name}(data, ctx)`
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

	writeLiteral(value: object): [literal: string, elements: string[]] {
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
		const elements = keys.map(k => this.emitElement(descriptors[k].value))
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
				(this.validatorNamesByRoot.get(value) ??
					throwInternalError(
						`Unexpected Type ${value.expression} outside a meta`
					))
			:	this.emit(value)
	}

	// a validator's config, which registers en's writers of each code it can raise
	configOf(root: BaseRoot): string {
		const raisable = raisableCodesOf(root)
		const writers =
			raisable === "any" ?
				"runtime.allErrorWriters"
			:	`{ ${Object.keys(raisable)
					.map(code => `${code}: runtime.${code}Writers`)
					.join(", ")} }`
		let config = `runtime.raising(${this.scopeConfigOf(root, raisable)}, ${writers})`
		// a callback of the program's can raise any code, on data of any kind
		if (declares(root, node => holdsCallback(node) || hasIndexSignature(node)))
			config = `runtime.printing(${config}, runtime.printCompact)`
		return declares(root, node => hasMetaWriter(node) || holdsCallback(node)) ?
				`runtime.inEn(${config})`
			:	config
	}

	// the config of a scope whose writers differ from the program's
	scopeConfigOf(root: BaseRoot, raisable: RaisableCodes): string {
		const writers = configuredWritersOf(root, raisable)
		if (!writers) return "runtime.runtimeConfig"
		const config = root.$.resolvedConfig
		return (
			this.declarations.namesByValue.get(config) ??
			this.declareConst(config, "config", `runtime.scopeConfig({ ${writers} })`)
		)
	}
}

// the error writers a root's Scope configures beyond the runtime's, which its validator traverses with
const configuredWritersOf = (
	root: BaseRoot,
	raisable: RaisableCodes
): string => {
	const config = root.$.resolvedConfig
	const configuredCodes: string[] = []
	let code: ArkErrorCode
	for (code in errorWritersByCode) {
		const writers: string[] = []
		for (const k of writerKeys) {
			const writer = config[code][k]
			// the runtime's config holds the defaults and the writers the program configures
			if (writer === $ark.resolvedConfig![code][k]) continue
			if (typeof writer === "string")
				writers.push(`${k}: ${JSON.stringify(writer)}`)
			// grouping errors at a path can raise an intersection in any validator
			else if (
				raisable === "any" ||
				raisable[code] ||
				code === "intersection"
			) {
				throwParseError(
					writeUnprecompilableMessage(`a configured ${code} ${k}`)
				)
			}
		}
		if (writers.length) {
			configuredCodes.push(
				`${code}: [runtime.${code}Writers, { ${writers.join(", ")} }]`
			)
		}
	}
	return configuredCodes.join(", ")
}

const { getTime } = Date.prototype

export const isJsonSchemaError = (e: unknown): boolean =>
	e instanceof ToJsonSchema.Error || isSymbolConversion(e)

// each engine words the TypeError of printing a symbol its own way, so the runtime raises it again rather than bake the build's
const isSymbolConversion = (e: unknown): boolean => {
	if (!(e instanceof TypeError)) return false
	try {
		serializePrimitive(Symbol() as never)
	} catch (conversion) {
		return e.message === (conversion as TypeError).message
	}
	return false
}

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

type RaisableCodes = "any" | { [code in ArkErrorCode]?: true }

const raisableCodesByRoot = new WeakMap<BaseRoot, RaisableCodes>()

// what a Type's traversal can raise other than an intersection, which grouping errors at a path can always raise
const raisableCodesOf = (root: BaseRoot): RaisableCodes => {
	let codes = raisableCodesByRoot.get(root)
	if (codes) return codes
	// a predicate or morph can raise any code
	if (
		declares(root, node => node.hasKind("predicate") || node.hasKind("morph"))
	)
		codes = "any"
	else {
		codes = {}
		for (const unit of rootUnitsOf(root)) {
			for (const context of unit.errorContexts)
				codes[context.code as ArkErrorCode] = true
			// traversal raises these itself
			for (const node of unit.declared) {
				if (node.hasKind("union"))
					codes[node.compiledDiscriminant ? "discriminant" : "union"] = true
				else if (node.hasKind("structure") && node.undeclared === "reject")
					codes.undeclared = true
			}
		}
	}
	raisableCodesByRoot.set(root, codes)
	return codes
}

const sharedByUnit = new WeakMap<RootUnit, boolean>()

// a Transform member writes to its input, which a bundle's CommonJS or IIFE output leaves sloppy, where writing to a frozen input is ignored rather than throwing
const isStrict = (unit: RootUnit): boolean =>
	unit.declared.some(node => node.transforms)

// a shared unit's function is strict as the function declaring the unit is, so only a local unit's declares it, and can't destructure its parameters
const declaresStrict = (unit: RootUnit): boolean =>
	isStrict(unit) && !isSharedUnit(unit)

const isSharedUnit = (unit: RootUnit): boolean => {
	let shared = sharedByUnit.get(unit)
	if (shared === undefined) {
		// a unit reading its own roots, as in a cycle, is decided by what else it reads
		sharedByUnit.set(unit, true)
		const reads = [
			...Object.values(unit.dependencies).map(([node]) => node),
			...unit.refs.filter(ref => isNode(ref) && ref.isRoot())
		] as BaseNode[]
		// a node a unit refers to directly is its root's shape, rather than a validator
		shared =
			!unit.identityNamed.has(unit.roots[0].id) &&
			!unit.refs.some(ref => !isNode(ref) && holdsLocal(ref)) &&
			!unit.errorContexts.some(context => holdsLocal(context)) &&
			reads.every(node => isSharedUnit(unitOf(node, unit)))
		sharedByUnit.set(unit, shared)
	}
	return shared
}

const declares = (
	root: BaseRoot,
	predicate: (node: BaseNode) => boolean
): boolean => rootUnitsOf(root).some(unit => unit.declared.some(predicate))

// a key an index signature checks may be checked by another prop, whose errors
// are grouped into an intersection on data of any kind
const hasIndexSignature = (node: BaseNode): boolean =>
	node.hasKind("structure") && node.index !== undefined

const hasMetaWriter = (node: BaseNode): boolean =>
	writerKeys.some(k => typeof node.meta[k] === "function")

// a function arktype doesn't own can raise an error whose meta holds writers
const holdsCallback = (node: BaseNode): boolean =>
	node.hasKind("predicate") ?
		isHole(node.predicate)
	:	node.hasKind("morph") && node.morphs.some(isHole)

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

const unitsByRoot = new WeakMap<BaseRoot, RootUnit[]>()

const rootUnitsOf = (root: BaseRoot): RootUnit[] => {
	let units = unitsByRoot.get(root)
	if (!units)
		unitsByRoot.set(root, (units = precompileRootUnits(root, runtimeKeyOf)))
	return units
}

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

// a default check reads a node's traversal, which doesn't depend on the Scope its methods parse in
export const traversalKeyOf = (root: BaseRoot): Key => rootKeyOf(root, false)

const rootKeyOf = (root: BaseRoot, isScoped = true): Key => {
	const units = rootUnitsOf(root)
	const defaultsByMorph = new Map<unknown, Default>()
	for (const unit of units) {
		for (const node of unit.declared) {
			if (node.hasKind("optional") || node.hasKind("sequence"))
				collectDefaults(node, defaultsByMorph)
		}
	}
	// a unit keys a function or object only by where it first reaches it, so the key adds what each is and where each is reached again
	return encodeKey(
		{
			name: units[0].names[root.id],
			refs: units.map(unit => unit.refs),
			errorContexts: units.map(unit => unit.errorContexts),
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

// the registered name a hash holds at an index, which arktype writes as `"$ark.name"`
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
