import {
	$ark,
	cachedKeyOf,
	hasArkKind,
	InternalTraversal,
	isNode,
	LazyGenericRoot,
	pipeOf,
	precompileRootUnits,
	type ArkErrorCode,
	type BaseNode,
	type BaseRoot,
	type BaseScope,
	type ContentKeyOf,
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
	printable,
	prototypeOf,
	serializePrimitive,
	throwInternalError,
	throwParseError
} from "@ark/util"
import { arktypeVersion } from "./entry.ts"
import { InternalTypedFn, type TypedFn } from "./fn.ts"
import { cachedDefinitionOf } from "./parser/definition.ts"
import type { Generic } from "./generic.ts"
import type { type } from "./keywords/keywords.ts"
import type { Module } from "./module.ts"
import type { HoleKind } from "./runtime.ts"
import * as runtime from "./runtimeExports.ts"
import type { Scope } from "./scope.ts"

const writerKeys = ["expected", "actual", "problem", "message"] as const

type DeclarationRole =
	| "shape"
	| "keys"
	| "literal"
	| "meta"
	| "config"
	| "standIn"

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

export type StandaloneExport = ExportedValue | StandaloneFactory

export interface StandaloneFactory {
	// a Type, or a Module, Scope, Generic or TypedFn arktype creates anew each time its site runs
	type: ExportedValue
	params: FactoryParam[]
	// the table of each factory whose Type arktype returns again for the same holes, shared by those returning one Type at build
	internedBy?: number | undefined
	// whether arktype creates its Type anew each time its site runs, even one it holds under an address
	isCreatedEachRun?: boolean
	defaultChecks?: readonly DefaultCheck[]
	// holes another module supplies through two or more texts, which a mock could make one function, so the factory checks they differ
	distinct?: readonly unknown[]
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

export interface ExportSite {
	// each string it passed arktype's type, which arktype's parse cache may hold its Type under
	definitions: readonly string[]
	// each Type another run or site holds too, which only an address keeps one object
	addressed?: readonly BaseRoot[]
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
	configured?: ConfiguredModule,
	sitesByName?: Record<string, ExportSite>,
	// each Module a site reads off arktype's keywords, which creates a Type only when one of its members is read
	keywordReads?: ReadonlySet<string>
): string => {
	const shared: Record<string, SharedModule> = {}
	const sections = writeArtifact(
		exports,
		configured,
		sitesByName,
		keywordReads,
		shared,
		{}
	)
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
	configured?: ConfiguredModule,
	sitesByName?: Record<string, ExportSite>,
	keywordReads?: ReadonlySet<string>
): StandaloneModules => {
	const shared: Record<string, SharedModule> = {}
	const imports: Record<string, string[]> = {}
	const sections = writeArtifact(
		exports,
		configured,
		sitesByName,
		keywordReads,
		shared,
		imports
	)
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
	configured: ConfiguredModule | undefined,
	sitesByName: Record<string, ExportSite> | undefined,
	keywordReads: ReadonlySet<string> | undefined,
	shared: Record<string, SharedModule>,
	imports: Record<string, string[]>
): string[] => {
	const types: Record<string, ExportedValue> = {}
	const factories: string[] = []
	const tables = new Set<number>()
	const definitionAddresses = definitionAddressesOf(exports, sitesByName)
	for (const [name, value] of Object.entries(exports)) {
		if (arkKindOf(value) !== undefined) types[name] = value as never
		else {
			const {
				type,
				params,
				internedBy,
				isCreatedEachRun,
				defaultChecks,
				distinct
			} = value as StandaloneFactory
			if (internedBy !== undefined) tables.add(internedBy)
			const artifact = new StandaloneArtifact(
				{ [name]: type },
				shared,
				imports,
				sitesByName,
				definitionAddresses,
				defaultChecks
			)
			if (isCreatedEachRun && hasArkKind(type, "root"))
				artifact.createdEachRun.add(type)
			factories.push(
				artifact.writeFactory(
					name,
					params,
					factories.length,
					configured,
					internedBy,
					distinct
				)
			)
		}
	}
	return [
		...writeCreations(
			types,
			configured,
			sitesByName,
			definitionAddresses,
			keywordReads,
			shared,
			imports
		),
		// created at a factory's first call, which an import cycle can reach before the artifact's body runs
		[...tables].map(table => `var interned${table}`).join("\n"),
		...factories
	]
}

interface Creation {
	indices: number[]
	values: Set<unknown>
	code: string
}

const writeCreations = (
	types: Record<string, ExportedValue>,
	configured: ConfiguredModule | undefined,
	sitesByName: Record<string, ExportSite> | undefined,
	definitionAddresses: ReadonlyMap<unknown, string>,
	keywordReads: ReadonlySet<string> | undefined,
	shared: Record<string, SharedModule>,
	imports: Record<string, string[]>
): string[] => {
	const names = Object.keys(types)
	const artifactOf = (indices: number[]) =>
		new StandaloneArtifact(
			Object.fromEntries(indices.map(i => [names[i], types[names[i]]])),
			shared,
			imports,
			sitesByName,
			definitionAddresses
		)
	const readsByIndex: Record<number, string> = {}
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
			readsByIndex[i] =
				`(created${index} ??= create${index}())${creation.indices.length > 1 ? `[${position}]` : ""}`
		}
	}
	const lazyNamesByModule = new Map<object, string>()
	// declared as functions, which a site an import cycle reaches before the artifact is evaluated can call
	const getters = names.map((name, i) => {
		const value = types[name]
		let declaration = ""
		let read = readsByIndex[i]
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
		...creations
			.sort((l, r) => l.indices[0] - r.indices[0])
			.map(creation => creation.code),
		getters.join("\n")
	]
}

// arktype's parse cache returns one Type for a definition wherever it's parsed
const definitionAddressesOf = (
	exports: Record<string, StandaloneExport>,
	sitesByName: Record<string, ExportSite> | undefined
): Map<unknown, string> => {
	const addresses = new Map<unknown, string>()
	for (const [name, exported] of Object.entries(exports)) {
		const value =
			arkKindOf(exported) === undefined ?
				(exported as StandaloneFactory).type
			:	exported
		if (!hasArkKind(value, "root") || !value.$.isBuiltin) continue
		for (const definition of sitesByName?.[name]?.definitions ?? []) {
			if (
				!addresses.has(value) &&
				cachedDefinitionOf(value.$, definition) === value
			) {
				addresses.set(
					value,
					hashOf(`${value.$.name}\ndefinition\n${definition}`)
				)
			}
		}
	}
	return addresses
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
		meta: [],
		config: [],
		standIn: []
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
	sitesByName: Record<string, ExportSite> | undefined
	definitionAddresses: ReadonlyMap<unknown, string>
	holeExpressions = new Map<unknown, string>()
	labelsByHole = new Map<unknown, string>()
	classes = new Set<unknown>()
	checks: string[] = []
	validatorNamesByRoot = new Map<BaseRoot, string>()
	unitRoots = new Set<BaseRoot>()
	// the unit holding each root in the first Type reaching it
	unitsByHead = new Map<BaseRoot, RootUnit>()
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
	// a Type arktype creates anew each time its site runs, which its factory then does too
	createdEachRun = new Set<BaseRoot>()
	// each default arktype checks where it defines the Type, which the factory checks once it creates the validators
	defaultChecks: readonly DefaultCheck[]
	// a factory's errors expose the meta of a Type it receives, not a copy
	receivedMetas = new Map<object, string>()

	constructor(
		exports: Record<string, ExportedValue>,
		sharedModules: Record<string, SharedModule>,
		imports: Record<string, string[]>,
		sitesByName?: Record<string, ExportSite>,
		definitionAddresses: ReadonlyMap<unknown, string> = new Map(),
		defaultChecks: readonly DefaultCheck[] = []
	) {
		this.exports = exports
		this.defaultChecks = defaultChecks
		this.sharedModules = sharedModules
		this.imports = imports
		this.sitesByName = sitesByName
		this.definitionAddresses = definitionAddresses
		for (const name in exports) {
			// an ES module can't export a name holding an unpaired surrogate
			if (/\p{Cs}/u.test(name)) {
				throwParseError(
					writeUnprecompilableMessage(`the export name ${JSON.stringify(name)}`)
				)
			}
		}
		for (const [name, value] of Object.entries(exports))
			this.collectExport(value, appendStringifiedKey("", name))
		for (const [node] of defaultChecks) this.collectType(node.in as BaseRoot)
		// the runtime writes only en
		const locale = $ark.config.locale
		if (locale !== undefined && locale !== $ark.defaultConfig.locale)
			throwParseError(writeUnprecompilableMessage("a configured locale"))
		// a Type in a meta is emitted as its validator, so it needs traversals of its own
		do {
			for (const root of this.roots) {
				if (this.unitRoots.has(root)) continue
				this.unitRoots.add(root)
				for (const unit of rootUnitsOf(root)) {
					for (const head of unit.roots)
						if (!this.unitsByHead.has(head)) this.unitsByHead.set(head, unit)
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
			} else if (this.receiveHole(param.value, `p${i}`, param.label)) {
				checked.push([param.value, param.kind, `p${i}`])
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
			if (!name.startsWith(holeNamePrefix)) {
				throwInternalError(
					`Unexpected function ${this.labelsByHole.get(hole)} not named by a placeholder`
				)
			}
			// an expression evaluated more than once creates a function each time under one placeholder, which prints the first one's name
			const first = holesByName[name]
			if (first === undefined) holesByName[name] = hole
			else {
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
				for (let i = 1; i < list.length; i++) {
					const hole = this.nameOrderingOf(
						(list[i - 1] as BaseNode).hash,
						(list[i] as BaseNode).hash
					)
					if (hole) {
						throwParseError(
							writeUnprecompilableMessage(
								`an order that depends on the name of ${this.labelsByHole.get(hole)}`
							)
						)
					}
				}
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
			if (isType) this.receivedMetas.set(value.meta, `${expression}.meta`)
			const holesName = `holes${this.checks.length}`
			const expected =
				!isType ? `, "${kindNameOf(value)}"`
				: value.expression.includes(holeNamePrefix) ? ""
				: `, ${this.readExpression(value)}`
			this.checks.push(
				`${holes.length ? `const ${holesName} = ` : ""}runtime.holesOf(${expression}, ${JSON.stringify(id)}, ${JSON.stringify(label)}${expected})`
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

	nameOrderingOf(l: string, r: string): unknown {
		let i = 0
		while (i < l.length && l[i] === r[i]) i++
		for (const hole of this.holeExpressions.keys()) {
			if (typeof hole !== "function") continue
			const reference = `.${nameOf(hole)}"`
			for (const hash of [l, r]) {
				for (
					let start = hash.indexOf(reference);
					start !== -1;
					start = hash.indexOf(reference, start + 1)
				)
					if (start < i && i < start + reference.length - 1) return hole
			}
		}
	}

	get roots(): BaseRoot[] {
		return [...this.validatorNamesByRoot.keys()]
	}

	get declared(): BaseNode[] {
		return this.units.flatMap(unit => unit.declared)
	}

	// each Type's units, after those they call
	get units(): RootUnit[] {
		return [...new Set([...this.unitRoots].flatMap(rootUnitsOf))]
	}

	// a value read through an address is one object without its exports being created together
	get comparedValues(): unknown[] {
		return [
			...this.comparedRoots.filter(root => !this.validatorAddressOf(root)),
			...this.moduleNamesByModule.keys(),
			...this.namesByTypedFn.keys(),
			...this.declarations.valuesByRole.literal,
			...this.declarations.valuesByRole.standIn
		]
	}

	// what another run or site holds too is one object only where each artifact reading it reads its address
	checkAddressed(): void {
		for (const name in this.exports) {
			for (const value of this.sitesByName?.[name]?.addressed ?? []) {
				if (!this.validatorAddressOf(value)) {
					throwParseError(
						writeUnprecompilableMessage("a Type another run or site holds too")
					)
				}
			}
		}
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
		this.checkAddressed()
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

	// each call creates its validator from the holes and inputs it receives, so it declares everything the validator holds
	writeFactory(
		name: string,
		params: FactoryParam[],
		index: number,
		configured: ConfiguredModule | undefined,
		internedBy?: number,
		distinct: readonly unknown[] = []
	): string {
		this.checkAddressed()
		this.receive(params)
		if (distinct.length) {
			this.checks.push(
				`runtime.checkDistinct([${distinct.map(hole => this.holeExpressions.get(hole)).join(", ")}], ${JSON.stringify(distinct.map(hole => this.labelsByHole.get(hole)))})`
			)
		}
		this.writeSharedUnits()
		const exported = this.exports[name]
		// a Module, Scope or Generic declares what it holds, which the body then writes
		const value = this.exportOf(exported)
		const body = [
			// each unit is evaluated once, at the first call, which may come before the artifact's body runs
			...this.writeBody(
				(unitFunction, i) => `(unit${index}_${i} ??= ${unitFunction})`
			),
			...this.defaultChecks.map(
				([node, defaultValue, key]) =>
					`runtime.checkDefault(${this.validatorNamesByRoot.get(node.in as BaseRoot)}, ${this.emit(defaultValue)}, ${key === null ? "null" : this.emit(key)})`
			),
			`return ${value}`
		]
		const holes =
			internedBy === undefined ? undefined : (
				keyOf(exported)[1].map(hole => this.holeExpressions.get(hole)!)
			)
		const statements = [
			writeFixConfig(configured),
			...this.checks,
			...(holes ?
				[
					`return runtime.intern((interned${internedBy} ??= runtime.internTable()), [${holes.join(", ")}], () => {\n${body.filter(statement => statement).join("\n\n")}\n})`
				]
			:	body)
		]
		const units = this.localUnits.map((_, i) => `var unit${index}_${i}`)
		return `${units.join("\n")}

function factory${index}(${params.map((_, i) => `p${i}`).join(", ")}) {
${statements.filter(statement => statement).join("\n\n")}
}

export { factory${index} as ${JSON.stringify(name)} }`
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
		for (const name in unit.dependencies) this.readDependency(unit, name)
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
		const builders = this.writeBuilders(unit.errorContexts, errorContexts)
		const returned = unit.traversals.flat()
		const links = ownRoots.map(root => {
			const shape = writing.shapesByName[unit.names[root.id]]
			returned.push(shape)
			return `runtime.freeze(runtime.assign(${shape}, ${this.writeShape(root, shape, unit, this.traversalsOf(root, unit))}))`
		})
		const unitFunction = this.writeUnitFunction(
			unit,
			writing.params,
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
			`function ${unit.name}() {\n\treturn (${unit.name}Unit ??= (${unitFunction})(${writing.args.join(", ")}))\n}`
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
		// a Transform member writes to its input, which a bundle's CommonJS or IIFE output leaves sloppy, where writing to a frozen input is ignored rather than throwing
		const directive =
			unit.declared.some(node => node.transforms) ? `"use strict"\n` : ""
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
		const names = ((this.writing?.imports ?? this.imports)[specifier] ??= [])
		if (!names.includes(name)) names.push(name)
		if (!this.writing) return arg
		if (!this.writing.params.includes(param)) {
			this.writing.params.push(param)
			this.writing.args.push(arg)
		}
		return param
	}

	readDependency(unit: RootUnit, name: string): string {
		const dependency = unitOf(unit.dependencies[name][0], unit)
		const index = dependency.traversals.flat().indexOf(name)
		return isSharedUnit(dependency) ?
				this.read(
					`~arktype/${dependency.name}`,
					dependency.name,
					name,
					`${dependency.name}()[${index}]`
				)
			:	`${this.localNamesByUnit.get(dependency)}[${index}]`
	}

	// contexts with the same keys share a function building their errors, in a module of its own
	writeBuilders(contexts: readonly object[], names: string[]): string[] {
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
				`runtime.registerErrorBuilder(${builderName}, [${built.join(", ")}])`
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
			const dependencies = Object.keys(unit.dependencies)
			const unitFunction = this.writeUnitFunction(
				unit,
				[...dependencies, "refs", "errorContexts"],
				unit.refs.map((_, i) => `const r${i} = refs[${i}]`),
				[],
				unit.traversals.flat()
			)
			const args = [
				...dependencies.map(name => this.readDependency(unit, name)),
				`[${refs.join(", ")}]`,
				`[${errorContexts.join(", ")}]`
			]
			return `const traversals${i} = ${wrapUnitFunction(unitFunction, i)}(${args.join(", ")})`
		})
		const builders = this.writeBuilders(localContexts, localContextNames)
		const validators = [...this.validatorNamesByRoot].map(([root, name]) => {
			const address = this.validatorAddressOf(root)
			return `const ${name} = ${address ? `runtime.addressed(${JSON.stringify(address)}, () => ${this.writeValidator(root)})` : this.writeValidator(root)}`
		})
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

	// a Type created anew where its site runs, or holding what its artifact creates, is created by every artifact reading it
	validatorAddressOf(root: BaseRoot): string | undefined {
		if (
			this.createdEachRun.has(root) ||
			!isAddressable(root, this.unitsByHead.get(root)!)
		)
			return
		return heldAddressOf(root) ?? this.definitionAddresses.get(root)
	}

	writeValidator(root: BaseRoot): string {
		const shape = this.shapeOf(root)
		const nodeName = this.unitsByHead.get(root)!.names[root.id]
		const [id, holes] = keyOf(root)
		const key = `,\n\t${JSON.stringify(id)}${holes.length ? `,\n\t[${holes.map(hole => this.emit(hole)).join(", ")}]` : ""}`
		return `new runtime.Validator(
	${this.emitRootApply(root, shape, nodeName)},
	${shape},
	${this.emit(pipeOf(root))},
	{ expression: ${root.expression.includes(holeNamePrefix) ? this.emitString(root.expression) : `${this.readExpression(root)}()`}, description: ${this.emitDescription(root)}, meta: ${this.emitMeta(root)} }${key}
)`
	}

	// a root's apply is passed only what its strategy reads, and a traversal no callback sees lacks the API Traversal adds for them
	emitRootApply(root: BaseRoot, shape: string, nodeName: string): string {
		const callbacks = raisableCodesOf(root) === "any"
		const config = this.configOf(root)
		// as writeRootApply's "allows" strategy, outside a cycle, with an arrow of its own so its allows call sees one root's data
		if (root.rootApplyStrategy === "allows" && !root.includesAlias) {
			return `((allows, node, config) => (data, onFail) =>
		allows(data) ? data : runtime.applyRejected(node, data, config, onFail${callbacks ? ", runtime.Traversal" : ""}))(${shape}.allows, ${shape}, ${config})`
		}
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

	// a node's meta is one object wherever its errors or its validator read it
	emitMeta(node: BaseNode): string {
		const declared =
			this.declarations.namesByValue.get(node.meta) ??
			(this.writing ? undefined : this.receivedMetas.get(node.meta))
		if (declared) return declared
		const address = metaAddressOf(node)
		if (address === undefined) return this.emitLiteral(node.meta)
		return this.declareConst(
			node.meta,
			"meta",
			`runtime.addressedMeta(${JSON.stringify(address)}, ${this.writeLiteral(node.meta)[0]})`
		)
	}

	// a Type's expression is a module of its own, so a factory checking that it receives the Type shares it with the Type's validator
	readExpression(root: BaseRoot): string {
		const name = this.stringModuleOf(root, "expression")
		return this.read(`~arktype/${name}`, name, name, name)
	}

	// a description holding those of the roots it references is composed from their modules, else written where it's read
	emitDescription(root: BaseRoot): string {
		if (root.description.includes(holeNamePrefix))
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
			const [, predicate, fn, name] = match
			const hole =
				this.holeExpressions.get(this.holeNamed(predicate ?? fn ?? name)) ??
				throwParseError(
					writeUnprecompilableMessage(
						`the name of ${predicate ?? fn ?? name}, which the validator doesn't receive`
					)
				)
			parts.push(
				predicate ? `runtime.describePredicate({ predicate: ${hole} })`
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
			this.unit ? unitOf(node, this.unit) : this.unitsByHead.get(node)!
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
		return `{
	id: ${JSON.stringify(unit.names[node.id])},
	trackedId: ${JSON.stringify(trackedName)},
	isTransformedById: ${node.isTransformedById},
	includesAlias: ${node.includesAlias},
	transforms: ${node.transforms},
	allowsRequiresContext: ${node.allowsRequiresContext},
	allowsRequiresTraversal: ${node.allowsRequiresTraversal},
	traverseAllows: ${traversals[0]},
	traverseApply: ${traversals[1]},
	traverseTransform: ${traversals[2]},
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
		const metaOwner = this.unit?.metaOwners.get(value)
		if (metaOwner) return this.emitMeta(metaOwner)
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
			`const ${name} = runtime.computeDefaultValueMorph(${this.emit(key)}, ${this.validatorNamesByRoot.get(value)}, ${this.emit(defaultValue)}, {${flags.length ? ` ${flags.join(", ")} ` : ""}})`
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
		// a callback can raise any code, on data of any kind
		if (raisable === "any" || declares(root, hasIndexSignature))
			config = `runtime.printing(${config}, runtime.printCompact)`
		// a callback can raise an error whose meta holds writers
		return raisable === "any" || declares(root, hasMetaWriter) ?
				`runtime.inEn(${config})`
			:	config
	}

	// the config of a scope whose writers differ from the program's
	scopeConfigOf(root: BaseRoot, raisable: RaisableCodes): string {
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
				else if (raisable === "any" || raisable[code]) {
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
		if (!configuredCodes.length) return "runtime.runtimeConfig"
		return (
			this.declarations.namesByValue.get(config) ??
			this.declareConst(
				config,
				"config",
				`runtime.scopeConfig({ ${configuredCodes.join(", ")} })`
			)
		)
	}
}

const { getTime } = Date.prototype

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

const isAddressable = (root: BaseRoot, unit: RootUnit): boolean =>
	isSharedUnit(unit) &&
	!keyOf(root)[1].length &&
	!holdsLocal(root.meta) &&
	!holdsLocal(root.description)

// e.g. a keyword's Type, which arktype holds once wherever a definition reaches it, so each run and artifact reads one validator
export const isAddressed = (value: unknown): value is BaseRoot =>
	hasArkKind(value, "root") &&
	isAddressable(
		value,
		rootUnitsOf(value).find(unit => unit.roots.includes(value))!
	) &&
	heldAddressOf(value) !== undefined

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

const holdsLocal = (value: unknown, seen = new Set<unknown>()): boolean => {
	if (seen.has(value)) return false
	seen.add(value)
	if (typeof value === "string") return value.includes(holeNamePrefix)
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

const addressesByNode = new WeakMap<BaseNode, string | null>()

// a builtin scope's cache or alias holds one node for every definition reaching it, whatever ran first
const heldAddressOf = (node: BaseNode): string | undefined => {
	let address = addressesByNode.get(node)
	if (address === undefined) {
		address = maybeHeldAddressOf(node) ?? null
		addressesByNode.set(node, address)
	}
	return address ?? undefined
}

const maybeHeldAddressOf = (node: BaseNode): string | undefined => {
	const { $ } = node
	if (!$.isBuiltin) return
	// a scope keys a child by its id, which a copy another scope binds shares with what it copies
	const key = cachedKeyOf(node, reference => {
		const key =
			isNode(reference) ?
				heldAddressOf(originalOf(reference))
			:	runtimeKeyOf(reference)
		return key && `${isNode(reference) ? "#" : "$"}${key}`
	})
	if (key !== undefined) return hashOf(`${$.name}\nkey\n${key}`)
	for (const name in $.resolutions)
		if ($.resolutions[name] === node) return hashOf(`${$.name}\nalias\n${name}`)
	const name = intrinsicNameOf(node)
	if (name) return hashOf(`${$.name}\nintrinsic\n${name}`)
}

// e.g. the unknown a TypedFn returns by default, a copy its scope binds once, read without binding the others
const intrinsicNameOf = (node: BaseNode): string | undefined => {
	const intrinsic: object | undefined = Object.getOwnPropertyDescriptor(
		node.$,
		"intrinsic"
	)?.value
	if (!intrinsic) return
	for (const name in intrinsic) {
		if (Object.getOwnPropertyDescriptor(intrinsic, name)!.value === node)
			return name
	}
}

const originalOf = (node: BaseNode): BaseNode => {
	while (node.boundFrom) node = node.boundFrom
	return node
}

// a copy holds the meta of what it copies
const metaAddressOf = (node: BaseNode): string | undefined =>
	holdsLocal(node.meta) ? undefined : heldAddressOf(originalOf(node))

// a meta is named by its address, so units sharing a name share their metas
const contentKeyOf: ContentKeyOf = (value, metaOwner) =>
	runtimeKeyOf(value) ?? (metaOwner && (metaAddressOf(metaOwner) ?? null))

const unitsByRoot = new WeakMap<BaseRoot, RootUnit[]>()

const rootUnitsOf = (root: BaseRoot): RootUnit[] => {
	let units = unitsByRoot.get(root)
	if (!units)
		unitsByRoot.set(root, (units = precompileRootUnits(root, contentKeyOf)))
	return units
}

// a pass can reach content-equal roots, which share a name but not a unit
const unitOf = (node: BaseNode, reader: RootUnit): RootUnit =>
	reader.unitsById[node.id]

const keysByValue = new WeakMap<object, [id: string, holes: unknown[]]>()

export const keyOf = (value: Foldable): [id: string, holes: unknown[]] =>
	hasArkKind(value, "root") ? rootKeyOf(value) : definitionKeyOf(value)

const rootKeyOf = (root: BaseRoot): [id: string, holes: unknown[]] => {
	const cached = keysByValue.get(root)
	if (cached) return cached
	const units = rootUnitsOf(root)
	const defaultsByMorph = new Map<unknown, Default>()
	for (const unit of units) {
		for (const node of unit.declared) {
			if (node.hasKind("optional") || node.hasKind("sequence"))
				collectDefaults(node, defaultsByMorph)
		}
	}
	const holes: unknown[] = []
	// a unit keys a function or object only by where it first reaches it, so the address adds what each is and where each is reached again
	const values: string[] = [units[0].names[root.id]]
	const seen = new Map<unknown, number>()
	const collect = (value: unknown): void => {
		const index = seen.get(value)
		if (index !== undefined) return void values.push(`seen ${index}`)
		seen.set(value, seen.size)
		const defaulted = defaultsByMorph.get(value)
		const runtimeKey = hasDomain(value, "object") && runtimeKeyOf(value)
		if (defaulted) {
			values.push("default")
			collect(defaulted[2])
		} else if (runtimeKey) values.push(runtimeKey)
		else if (isHole(value)) {
			holes.push(value)
			values.push("hole")
		}
		// a meta isn't part of a node's content, though what it holds is printed
		else if (!hasDomain(value, "object")) values.push(printablePrimitive(value))
		else if (isNode(value)) return
		else if (isDateObject(value)) values.push(`Date ${getTime.call(value)}`)
		else if (isRegExpObject(value)) values.push(`${value} ${value.lastIndex}`)
		else if (isPlainLiteral(value)) {
			for (const k of Reflect.ownKeys(value)) {
				collect(k)
				collect(Reflect.get(value, k))
			}
		} else values.push(printable(value))
	}
	collect([
		units.map(unit => unit.refs),
		units.map(unit => unit.errorContexts),
		root.meta
	])
	const key: [string, unknown[]] = [hashOf(values.join("\n")), holes]
	keysByValue.set(root, key)
	return key
}

// e.g. a Scope's, whose Types take what they hold from its aliases, so a factory creating a Type in it takes its holes
const definitionKeyOf = (container: object): [id: string, holes: unknown[]] => {
	const cached = keysByValue.get(container)
	if (cached) return cached
	const holes: unknown[] = []
	const values: string[] = []
	const seen = new Map<unknown, number>()
	const holeIndexOf = (hole: unknown) => {
		const index = holes.indexOf(hole)
		return index === -1 ? holes.push(hole) - 1 : index
	}
	const collect = (
		value: unknown,
		isDefinition: boolean,
		isConfig = false
	): void => {
		if (hasDomain(value, "object")) {
			const index = seen.get(value)
			if (index !== undefined) return void values.push(`seen ${index}`)
			seen.set(value, seen.size)
		}
		if (hasArkKind(value, "root")) {
			const [id, held] = rootKeyOf(value)
			values.push(`Type ${id} ${held.map(holeIndexOf)}`)
		} else if (hasArkKind(value, "module")) {
			values.push("Module")
			for (const [k, entry] of Object.entries(value)) {
				values.push(JSON.stringify(k))
				collect(entry, true)
			}
		} else if (hasArkKind(value, "scope")) {
			// a builtin scope holds only arktype's own functions, named stably
			if (value.isBuiltin) values.push(`Scope ${value.name}`)
			else {
				values.push("Scope", JSON.stringify(value.exportedNames))
				collect(scopeConfigOf(value), false, true)
				// a definition rather than what it resolves to, since resolving it here would run its default checks before the site first reading it
				for (const [k, def] of Object.entries(value.aliases)) {
					values.push(JSON.stringify(k))
					collect(def, true)
				}
			}
		} else if (hasArkKind(value, "generic")) {
			values.push("Generic")
			collect(value.paramDefs, true)
			// an hkt's body is a function arktype calls with a class, which nothing but identity tells apart from another
			if (value.hkt) incomparable.add(container)
			else collect(value.bodyDef, true)
			collect(value.$, true)
		} else if (isTypedFn(value)) {
			values.push("TypedFn")
			collect(value.params, false)
			collect(value.returns, false)
			collect(value.raw, false)
		} else if (value instanceof LazyGenericRoot) {
			values.push("Generic", JSON.stringify(value.paramsDef))
			collect(value.bodyDef, true)
		}
		// e.g. `() => User` in a Scope or a Generic's body, or a description writer in its config, which arktype calls as it resolves it
		else if ((isDefinition && isThunk(value)) || (isConfig && isHole(value)))
			incomparable.add(container)
		else if (isHole(value)) values.push(`hole ${holeIndexOf(value)}`)
		else if (!hasDomain(value, "object")) values.push(printablePrimitive(value))
		else if (isDateObject(value)) values.push(`Date ${getTime.call(value)}`)
		else if (isRegExpObject(value)) values.push(`${value} ${value.lastIndex}`)
		else if (isArray(value)) {
			// e.g. the narrow in `["string", ":", isLong]`, which arktype holds rather than parses
			const definitions =
				valueTupleHeads.includes(value[0]) ? 0
				: valueOperators.includes(value[1]) ? 1
				: value.length
			for (let i = 0; i < value.length; i++)
				collect(value[i], isDefinition && i < definitions, isConfig)
		} else if (isPlainLiteral(value)) {
			for (const k of Reflect.ownKeys(value)) {
				collect(k, false)
				collect(Reflect.get(value, k), isDefinition, isConfig)
			}
		} else values.push(printable(value))
	}
	collect(container, true)
	const key: [string, unknown[]] = [hashOf(values.join("\n")), holes]
	keysByValue.set(container, key)
	return key
}

export const isTypedFn = (value: unknown): value is InternalTypedFn =>
	value instanceof InternalTypedFn

export const kindNameOf = (value: unknown): string =>
	hasArkKind(value, "root") ? "Type"
	: hasArkKind(value, "module") ? "Module"
	: hasArkKind(value, "scope") ? "Scope"
	: hasArkKind(value, "generic") ? "Generic"
	: "TypedFn"

// a container whose key leaves out what decides what it creates, which a factory can't compare with the build's
const incomparable = new WeakSet<object>()

export const isComparable = (value: Foldable): boolean => {
	keyOf(value)
	return !incomparable.has(value)
}

const scopeConfigOf = (scope: BaseScope): unknown =>
	(scope as unknown as { scopeConfig: unknown }).scopeConfig

const printablePrimitive = (value: unknown): string =>
	Object.is(value, -0) ? "-0" : printable(value)

const valueTupleHeads: unknown[] = ["instanceof", "==="]

const valueOperators: unknown[] = [":", "=>", "=", "@"]

type ComposedString = "expression" | "description"

// a string shorter than this is written wherever it's printed, as gzip compresses its repeats about as well as a call
const minComposedLength = 64

// a root's string split around the longest strings of the roots it references, each a root of its own
const partsOf = (
	root: BaseRoot,
	kind: ComposedString
): (string | BaseRoot)[] => {
	const s = root[kind]
	const candidates = new Map<string, BaseRoot>()
	for (const node of root.references) {
		if (!node.isRoot()) continue
		const part = node[kind]
		if (
			part.length >= minComposedLength &&
			part !== s &&
			!part.includes(holeNamePrefix)
		)
			candidates.set(part, node)
	}
	const taken: [start: number, end: number, root: BaseRoot][] = []
	for (const part of [...candidates.keys()].sort(
		(l, r) => r.length - l.length
	)) {
		for (
			let start = s.indexOf(part);
			start !== -1;
			start = s.indexOf(part, start + 1)
		) {
			const end = start + part.length
			if (taken.every(([l, r]) => end <= l || r <= start))
				taken.push([start, end, candidates.get(part)!])
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

export const holeNamePrefix = "$hole_"

const holeName = `${holeNamePrefix.replace("$", "\\$")}[\\da-z]+`

export const holeNamePattern = new RegExp(holeName, "g")

const printedHoleNamePattern = new RegExp(
	`valid according to (${holeName})|Function\\((${holeName})\\)|(${holeName})`,
	"g"
)

export const writeUnprecompilableMessage = <value extends string>(
	value: value
): writeUnprecompilableMessage<value> =>
	`${value} can't be precompiled to a standalone validator`

export type writeUnprecompilableMessage<value extends string> =
	`${value} can't be precompiled to a standalone validator`
