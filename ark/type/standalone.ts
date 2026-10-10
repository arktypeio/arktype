import {
	$ark,
	boundReferenceOf,
	contentNameOf,
	hasArkKind,
	isNode,
	precompileRootUnits,
	type ArkErrorCode,
	type BaseNode,
	type BaseRoot,
	type DefaultedNode,
	type NodeId,
	type NodeKind,
	type Optional,
	type RootUnit,
	type Sequence
} from "@ark/schema"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
	errorWritersByCode,
	rootApplyParams,
	rootApplyRuntime,
	writeNodeContextCopy,
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
	nameOf,
	printable,
	prototypeOf,
	serializePrimitive,
	throwInternalError,
	throwParseError
} from "@ark/util"
import { arktypeVersion } from "./entry.ts"
import type { Generic } from "./generic.ts"
import type { type } from "./keywords/keywords.ts"
import type { Module } from "./module.ts"
import type { HoleKind } from "./runtime.ts"
import * as runtime from "./runtimeExports.ts"
import type { Scope } from "./scope.ts"

const writerKeys = ["expected", "actual", "problem", "message"] as const

type DeclarationRole = "shape" | "keys" | "literal" | "config" | "unavailable"

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
type ExportedValue = type.Any | Module | Scope<any> | Generic

export type StandaloneExport = ExportedValue | StandaloneFactory

export interface StandaloneFactory {
	// a Type, or a Module, Scope or Generic arktype creates anew each time its site runs
	type: ExportedValue
	params: FactoryParam[]
	// the table of each factory whose Type arktype returns again for the same holes, shared by those returning one Type at build
	internedBy?: number | undefined
	// whether arktype creates its Type anew each time its site runs, even one its content addresses
	isCreatedEachRun?: boolean
}

export type FactoryParam = HoleParam | InputParam | HelperParam

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
	// where each export was defined, which a Scope or Generic it holds names when used
	sitesByName?: Record<string, string>,
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
	sitesByName?: Record<string, string>,
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
		const { imports, declarations, exports } = shared[specifier]
		modules[specifier] = writeSections([
			[
				declarations.some(declaration => declaration.includes("runtime.")) ?
					runtimeImport
				:	"",
				writeImports(imports)
			]
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
	sitesByName: Record<string, string> | undefined,
	keywordReads: ReadonlySet<string> | undefined,
	shared: Record<string, SharedModule>,
	imports: Record<string, string[]>
): string[] => {
	const types: Record<string, ExportedValue> = {}
	const factories: string[] = []
	const tables = new Set<number>()
	for (const [name, value] of Object.entries(exports)) {
		if (arkKindOf(value) !== undefined) types[name] = value as never
		else {
			const { type, params, internedBy, isCreatedEachRun } =
				value as StandaloneFactory
			if (internedBy !== undefined) tables.add(internedBy)
			const artifact = new StandaloneArtifact({ [name]: type }, shared, imports)
			if (isCreatedEachRun && hasArkKind(type, "root"))
				artifact.createdEachCall.add(type)
			factories.push(
				artifact.writeFactory(
					name,
					params,
					factories.length,
					configured,
					sitesByName?.[name],
					internedBy
				)
			)
		}
	}
	if (tables.size) {
		factories.unshift(
			[...tables]
				.map(table => `const interned${table} = runtime.internTable()`)
				.join("\n")
		)
	}
	return [
		...writeCreations(
			types,
			configured,
			sitesByName,
			keywordReads,
			shared,
			imports
		),
		...factories
	]
}

interface Creation {
	indices: number[]
	values: Set<unknown>
	code: string
}

// a site reading an export creates it when first evaluated, where arktype would fix its configuration, along with the exports sharing a value it creates
const writeCreations = (
	types: Record<string, ExportedValue>,
	configured: ConfiguredModule | undefined,
	sitesByName: Record<string, string> | undefined,
	keywordReads: ReadonlySet<string> | undefined,
	shared: Record<string, SharedModule>,
	imports: Record<string, string[]>
): string[] => {
	const names = Object.keys(types)
	const artifactOf = (indices: number[]) =>
		new StandaloneArtifact(
			Object.fromEntries(indices.map(i => [names[i], types[names[i]]])),
			shared,
			imports
		)
	const readsByIndex: Record<number, string> = {}
	// a validator a module of its own creates is read from it once the site has fixed the configuration
	const addressed = new Set<number>()
	let creations: Creation[] = []
	for (let i = 0; i < names.length; i++) {
		const artifact = artifactOf([i])
		const value = types[names[i]]
		if (hasArkKind(value, "root") && artifact.isAddressed(value)) {
			artifact.writeSharedUnits()
			readsByIndex[i] = artifact.readValidator(value)
			addressed.add(i)
			continue
		}
		const code = artifact.writeCreate(i, configured, sitesByName)
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
				configured,
				sitesByName
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
		const fix = addressed.has(i) ? `\t${writeFixConfig(configured)}\n` : ""
		return `${declaration}function get${i}() {\n${fix}\treturn ${read}\n}\n\nexport { get${i} as ${JSON.stringify(name)} }`
	})
	return [
		...creations
			.sort((l, r) => l.indices[0] - r.indices[0])
			.map(creation => creation.code),
		getters.join("\n")
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
		unavailable: []
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
	// the unit holding each root in the first Type reaching it
	unitsByHead = new Map<BaseRoot, RootUnit>()
	sharedByUnit = new Map<RootUnit, boolean>()
	localNamesByUnit = new Map<RootUnit, string>()
	// the unit whose values are being emitted, which names the nodes they hold
	unit: RootUnit | undefined
	writing: SharedUnit | undefined
	// each structure's propsByKey, which traversal reads only with `in`
	keyLookups = new Set<object>()
	// each pattern's own RegExp, which only traversal reads
	patternInstances = new Set<RegExp>()
	defaultsByMorph = new Map<unknown, Default>()
	objectUnits = new Set<unknown>()
	declarations = createDeclarations()
	emitting = new Set<object>()
	moduleNamesByModule = new Map<object, string>()
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
	createdEachCall = new Set<BaseRoot>()

	constructor(
		exports: Record<string, ExportedValue>,
		sharedModules: Record<string, SharedModule>,
		imports: Record<string, string[]>
	) {
		this.exports = exports
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
		for (const [name, value] of Object.entries(exports))
			this.collectExport(value, appendStringifiedKey("", name))
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
			// the runtime's own onFail is the one the program configures
			if (root.onFail !== $ark.resolvedConfig!.onFail)
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
		if (hasArkKind(value, "root")) {
			const [id, holes] = keyOf(value)
			const holesName = `holes${this.checks.length}`
			const expected =
				value.expression.includes(holeNamePrefix) ?
					""
				:	`, ${this.readExpression(value.expression)}`
			this.checks.push(
				`${holes.length ? `const ${holesName} = ` : ""}runtime.holesOf(${expression}, ${JSON.stringify(id)}, ${JSON.stringify(label)}${expected})`
			)
			const protos = [value, ...value.references].flatMap(node =>
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

	// what creating the exports makes that a program can compare, other than what a module of its own creates
	get comparedValues(): unknown[] {
		return [
			...this.comparedRoots.filter(root => !this.isAddressed(root)),
			...this.moduleNamesByModule.keys(),
			...this.declarations.valuesByRole.literal,
			...this.declarations.valuesByRole.unavailable
		]
	}

	// a unit is shared when its name addresses it, holding no value keyed by identity or a program's scope, what it holds is the same wherever it's created, and so are the units it reads
	isShared(unit: RootUnit): boolean {
		let shared = this.sharedByUnit.get(unit)
		if (shared === undefined) {
			// a unit reading its own roots, as in a cycle, is decided by what else it reads
			this.sharedByUnit.set(unit, true)
			const reads = [
				...Object.values(unit.dependencies).map(([node]) => node),
				...unit.refs.filter(ref => isNode(ref) && ref.isRoot())
			] as BaseNode[]
			// a node a unit refers to directly is its root's shape, rather than a validator
			shared =
				!unit.identityNamed.has(unit.roots[0].id) &&
				!unit.refs.some(ref => !isNode(ref) && this.holdsLocal(ref)) &&
				!unit.errorContexts.some(context => this.holdsLocal(context)) &&
				reads.every(node => this.isShared(unitOf(node, unit)))
			this.sharedByUnit.set(unit, shared)
		}
		return shared
	}

	// a hole or a Type a literal holds is created with the artifact
	holdsLocal(value: unknown, seen = new Set<unknown>()): boolean {
		if (seen.has(value)) return false
		seen.add(value)
		if (typeof value === "string") return value.includes(holeNamePrefix)
		if (isHole(value)) return true
		if (!hasDomain(value, "object") || isNode(value) || !isPlainLiteral(value))
			return false
		return Reflect.ownKeys(value).some(k => {
			const v = Reflect.get(value, k)
			return (
				this.holdsLocal(k, seen) ||
				(isNode(v) && v.isRoot()) ||
				this.holdsLocal(v, seen)
			)
		})
	}

	collectExport(value: unknown, path: string): void {
		if (hasArkKind(value, "root")) return this.collectType(value)
		if (hasArkKind(value, "scope") || hasArkKind(value, "generic")) return
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

	writeCreate(
		index: number,
		configured: ConfiguredModule | undefined,
		sitesByName: Record<string, string> | undefined
	): string {
		this.writeSharedUnits()
		const values = Object.keys(this.exports).map(name => {
			const site = sitesByName?.[name]
			return this.exportOf(
				this.exports[name],
				site ? "" : appendStringifiedKey("", name),
				site
			)
		})
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
		site?: string,
		internedBy?: number
	): string {
		this.receive(params)
		this.writeSharedUnits()
		const exported = this.exports[name]
		// a Module, Scope or Generic declares what it holds, which the body then writes
		const value = this.exportOf(exported, "", site)
		const body = [
			// each unit is evaluated once, at the first call, which may come before the artifact's body runs
			...this.writeBody(
				(unitFunction, i) => `(unit${index}_${i} ??= ${unitFunction})`
			),
			`return ${value}`
		]
		const keys =
			internedBy === undefined || !hasArkKind(exported, "root") ?
				undefined
			:	keyOf(exported)[1].map(hole => this.holeExpressions.get(hole))
		const statements = [
			writeFixConfig(configured),
			...this.checks,
			...(keys?.every(key => key !== undefined) ?
				[
					`return runtime.intern(interned${internedBy}, [${keys.join(", ")}], () => {\n${body.filter(statement => statement).join("\n\n")}\n})`
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
		return this.units.filter(unit => !this.isShared(unit))
	}

	writeSharedUnits(): void {
		for (const unit of this.units)
			if (this.isShared(unit)) this.writeShared(unit)
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
		const copies = this.writeCopies(unit.errorContexts, errorContexts)
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
				...copies
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

	// what a unit reads from another module, which a shared unit receives as a parameter
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
		return this.isShared(dependency) ?
				this.read(
					`~arktype/${dependency.name}`,
					dependency.name,
					name,
					`${dependency.name}()[${index}]`
				)
			:	`${this.localNamesByUnit.get(dependency)}[${index}]`
	}

	// contexts with the same keys share a function copying them, in a module of its own
	writeCopies(contexts: readonly object[], names: string[]): string[] {
		const namesByCopy: Record<string, string[]> = {}
		for (let i = 0; i < contexts.length; i++) {
			const copy = writeNodeContextCopy(contexts[i])
			const copyName = `copy${hashOf(copy)}`
			this.sharedModules[`~arktype/${copyName}`] ??= {
				imports: {},
				declarations: [`function ${copyName}(e, input) {\n${copy}}`],
				exports: [copyName]
			}
			const copied = (namesByCopy[
				this.read(`~arktype/${copyName}`, copyName, copyName, copyName)
			] ??= [])
			if (!copied.includes(names[i])) copied.push(names[i])
		}
		return Object.entries(namesByCopy).map(
			([copyName, copied]) =>
				`runtime.copyNodeContexts(${copyName}, [${copied.join(", ")}])`
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
		const copies = this.writeCopies(localContexts, localContextNames)
		const validators = [...this.validatorNamesByRoot].map(([root, name]) =>
			this.isAddressed(root) && !this.createdEachCall.has(root) ?
				`const ${name} = ${this.readValidator(root)}`
			:	`const ${name} = ${this.writeValidator(root)}`
		)
		return [
			this.declarations.statements.join("\n"),
			copies.join("\n"),
			traversals.join("\n"),
			this.links.join("\n"),
			validators.join("\n\n"),
			this.defaults.join("\n"),
			this.modules.join("\n"),
			this.fills.join("\n")
		]
	}

	// a validator its content addresses is a module of its own, so every module creating it gets one object, as arktype's Type is
	isAddressed(root: BaseRoot): boolean {
		return (
			this.isShared(this.unitsByHead.get(root)!) &&
			!keyOf(root)[1].length &&
			!this.holdsLocal(root.meta) &&
			!this.holdsLocal(root.description)
		)
	}

	readValidator(root: BaseRoot): string {
		return this.readCreated("validator", () => this.writeValidator(root))
	}

	// a value a module of its own creates when first read, so every module reading it gets one object
	readCreated(kind: string, write: () => string, context = ""): string {
		const { declarations, imports, writing, unit } = this
		this.declarations = createDeclarations()
		this.imports = {}
		this.writing = undefined
		this.unit = undefined
		const created = write()
		const { statements } = this.declarations
		const moduleImports = this.imports
		this.declarations = declarations
		this.imports = imports
		this.writing = writing
		this.unit = unit
		const value =
			statements.length ?
				`(function () {\n${statements.join("\n")}\nreturn ${created}\n})()`
			:	created
		const name = `${kind}${hashOf(`${context}${value}`)}`
		this.sharedModules[`~arktype/${name}`] ??= {
			imports: moduleImports,
			declarations: [
				`var ${name}Value`,
				`function ${name}() {\n\treturn (${name}Value ??= ${value})\n}`
			],
			exports: [name]
		}
		return `${this.read(`~arktype/${name}`, name, name, name)}()`
	}

	writeValidator(root: BaseRoot): string {
		const shape = this.shapeOf(root)
		const nodeName = this.unitsByHead.get(root)!.names[root.id]
		const [id, holes] = keyOf(root)
		const key = `,\n\t${JSON.stringify(id)}${holes.length ? `,\n\t[${holes.map(hole => this.emit(hole)).join(", ")}]` : ""}`
		return `new runtime.Validator(
	(function (${rootApplyParams.join(", ")}) {
		${writeRootApply(root, nodeName)}
	})(${shape}, ${this.configOf(root)}, ${Object.values(rootApplyRuntime)
		.map(value => this.emit(value))
		.join(", ")}),
	${shape},
	{ expression: ${root.expression.includes(holeNamePrefix) ? this.emitString(root.expression) : `${this.readExpression(root.expression)}()`}, description: ${this.emitString(root.description)}, meta: ${this.emitMeta(root, this.unitsByHead.get(root)!)} }${key}
)`
	}

	// a node's meta is one object wherever its errors or its validator read it, so one a builtin node holds is a module of its own
	emitMeta(node: BaseNode, unit: RootUnit): string {
		const declared = this.declarations.namesByValue.get(node.meta)
		if (declared) return declared
		const ownerName =
			this.holdsLocal(node.meta) ? undefined : metaOwnerNameOf(node, unit)
		if (ownerName === undefined) return this.emitLiteral(node.meta)
		return this.readCreated(
			"meta",
			() => `runtime.freeze(${this.writeLiteral(node.meta)[0]})`,
			`${ownerName}\n`
		)
	}

	// a Type's expression is a module of its own, so a factory checking that it receives the Type shares it with the Type's validator
	readExpression(expression: string): string {
		const name = `expression${hashOf(expression)}`
		this.sharedModules[`~arktype/${name}`] ??= {
			imports: {},
			declarations: [
				`function ${name}() {\n\treturn ${JSON.stringify(expression)}\n}`
			],
			exports: [name]
		}
		return this.read(`~arktype/${name}`, name, name, name)
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

	// a module is a plain object of validators, frozen like them
	exportOf(value: unknown, path = "", site?: string): string {
		if (hasArkKind(value, "root")) return this.validatorNamesByRoot.get(value)!
		if (hasArkKind(value, "scope") || hasArkKind(value, "generic")) {
			const kind = hasArkKind(value, "scope") ? "Scope" : "Generic"
			const label = `the ${kind}${path && ` ${path}`}${site ? ` at ${site}` : ""}`
			return (
				this.declarations.namesByValue.get(value) ??
				this.declareConst(
					value,
					"unavailable",
					`runtime.unavailable${kind}(${JSON.stringify(label)})`
				)
			)
		}
		if (!hasArkKind(value, "module"))
			return throwInternalError(`Unexpected export ${printable(value)}`)
		const declared = this.moduleNamesByModule.get(value)
		if (declared) return declared
		const entries = Object.entries(value).map(
			([k, entry]) =>
				`[${JSON.stringify(k)}]: ${this.exportOf(entry, appendStringifiedKey(path, k), site)}`
		)
		const name = `module${this.moduleNamesByModule.size}`
		this.moduleNamesByModule.set(value, name)
		this.modules.push(
			`const ${name} = runtime.freeze({ ${entries.join(", ")} })`
		)
		return name
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
		if (this.writing && this.isShared(unit)) {
			return this.read(
				`~arktype/${unit.name}`,
				`${name}Node`,
				name,
				`${name}Node()`
			)
		}
		const declared = this.declarations.namesByValue.get(node)
		if (declared) return declared
		if (this.isShared(unit)) {
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
		const metaNode = this.unit && metaNodesOf(this.unit).get(value)
		if (metaNode) return this.emitMeta(metaNode, this.unit!)
		const defaulted = this.defaultsByMorph.get(value)
		if (defaulted) return this.emitDefault(...defaulted)
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
		key: PropertyKey,
		value: BaseRoot,
		defaultValue: unknown
	): string {
		this.collectType(value)
		const name = `default${this.defaults.length}`
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

	configOf(root: BaseRoot): string {
		const config = root.$.resolvedConfig
		const raisable = raisableCodesOf(root)
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
					`${code}: runtime.freeze({ ...runtime.runtimeConfig.${code}, ${writers.join(", ")} })`
				)
			}
		}
		if (!configuredCodes.length) return "runtime.runtimeConfig"
		return (
			this.declarations.namesByValue.get(config) ??
			this.declareConst(
				config,
				"config",
				`runtime.freeze({ ...runtime.runtimeConfig, ${configuredCodes.join(", ")} })`
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

const metaNodesByPass = new WeakMap<object, Map<unknown, BaseNode>>()

// a context can hold another node's meta, like a required key's value's
const metaNodesOf = (unit: RootUnit): Map<unknown, BaseNode> => {
	let metaNodes = metaNodesByPass.get(unit.unitsById)
	if (!metaNodes) {
		metaNodes = new Map()
		for (const passUnit of new Set(Object.values(unit.unitsById))) {
			for (const node of passUnit.declared)
				if (!metaNodes.has(node.meta)) metaNodes.set(node.meta, node)
		}
		metaNodesByPass.set(unit.unitsById, metaNodes)
	}
	return metaNodes
}

const ownerNamesByNode = new WeakMap<BaseNode, string | undefined>()

// the content name of the builtin node holding a meta, which a node another scope binds shares with its reference, as every program does
const metaOwnerNameOf = (
	node: BaseNode,
	unit: RootUnit
): string | undefined => {
	if (node.$.isBuiltin && !unit.identityNamed.has(node.id))
		return unit.names[node.id]
	let owner: BaseNode | undefined = node
	while (owner && !owner.$.isBuiltin) owner = boundReferenceOf(owner)
	if (owner?.meta !== node.meta) return
	if (!ownerNamesByNode.has(owner))
		ownerNamesByNode.set(owner, contentNameOf(owner, runtimeKeyOf))
	return ownerNamesByNode.get(owner)
}

type RaisableCodes = "any" | { [code in NodeKind | ArkErrorCode]?: true }

const raisableCodesByRoot = new WeakMap<BaseRoot, RaisableCodes>()

// what a Type's traversal can raise, so a configured writer it can't emit is refused only for a Type raising its code
const raisableCodesOf = (root: BaseRoot): RaisableCodes => {
	let codes = raisableCodesByRoot.get(root)
	if (codes) return codes
	const units = rootUnitsOf(root)
	// a predicate or morph can raise any code
	if (
		units.some(unit =>
			unit.declared.some(
				node => node.hasKind("predicate") || node.hasKind("morph")
			)
		)
	)
		codes = "any"
	else {
		// traversal raises these itself
		codes = {
			intersection: true,
			predicate: true,
			union: true,
			discriminant: true,
			undeclared: true
		}
		for (const unit of units)
			for (const context of unit.errorContexts) codes[context.code] = true
	}
	raisableCodesByRoot.set(root, codes)
	return codes
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

const keysByRoot = new WeakMap<BaseRoot, [id: string, holes: unknown[]]>()

export const keyOf = (root: BaseRoot): [id: string, holes: unknown[]] => {
	const cached = keysByRoot.get(root)
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
	// a unit keys a function or object only by where it first reaches it, so the address adds what each is
	const values: string[] = [units[0].names[root.id]]
	const seen = new Set<unknown>()
	const collect = (value: unknown): void => {
		if (seen.has(value)) return
		seen.add(value)
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
		else if (!hasDomain(value, "object"))
			values.push(typeof value === "symbol" ? "symbol" : printable(value))
		else if (isNode(value)) return
		else if (isDateObject(value)) values.push(`Date ${getTime.call(value)}`)
		else if (isRegExpObject(value)) values.push(String(value))
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
	keysByRoot.set(root, key)
	return key
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
