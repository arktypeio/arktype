import {
	$ark,
	hasArkKind,
	hashedPrefixLength,
	isDecidedByAllows,
	isNode,
	isRefinedPattern,
	madeMorphs,
	supportedJsonSchemaTargets,
	ToJsonSchema,
	type BaseNode,
	type BaseRoot,
	type NodeId,
	type RootUnit
} from "@ark/schema"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
	rootApplyRuntime,
	rootApplyParts,
	type FailureSite,
	type RootApplyParam
} from "@ark/schema/internal"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { writesInPlace } from "@ark/schema/mutatesInput"
import {
	appendStringifiedKey,
	arkKindOf,
	constructorNameOf,
	flatMorph,
	functionNameOf,
	hashOf,
	hasDomain,
	isArray,
	isDateObject,
	isRegExpObject,
	isStandardSchema,
	isThunk,
	nameOf,
	ParseError,
	printable,
	prototypeOf,
	throwInternalError,
	throwParseError,
	unset,
	type Fn
} from "@ark/util"
import type { InternalTypedFn } from "../fn.ts"
import type { HoleKind, IntrospectionMember } from "../runtime.ts"
import * as runtime from "../runtimeExports.ts"
import {
	defaultMembers,
	failureSources,
	introspectionMembers,
	invalidErrorsOf,
	isCreatedByRuntime,
	wholeReads,
	writeFixConfig,
	writeFunction,
	writeLazyRead,
	writeValue,
	type Baking,
	type Configured,
	type DefaultCheck,
	type ExportedValue,
	type FactoryParam,
	type Foldable,
	type IssueFeatures,
	type StandaloneBake,
	type StandaloneFactory,
	type StandaloneIntrospection,
	type ValidatorMember
} from "./baking.ts"
import {
	canPipe,
	creatorSourceOf,
	frozen,
	fusedApplierOf,
	madeApplierOf,
	preciseFormOf,
	writtenAttributesOf,
	type RootApplier,
	type ValidatorAttributes,
	type ValidatorForm
} from "./creators.ts"
import {
	assertReportsIssues,
	compiledForSize,
	shapedForSize,
	isChecker,
	jsonVariantOf,
	refNameOf,
	rootUnitsOf,
	unitOf
} from "./compilers.ts"
import {
	encodeKey,
	holeNameMarker,
	holeNamePattern,
	isTypedFn,
	keyOf,
	kindNameOf,
	partsOf,
	printablePrimitive,
	printedHoleNamePattern,
	registeredNameAt,
	traversalKeyOf,
	writeId,
	type ComposedString
} from "./keys.ts"
import {
	noInlineOf,
	writeDependencies,
	writeScope,
	type SharedModule,
	type UnitScope
} from "./modules.ts"
import {
	assertDescribed,
	ConfiguredWriter,
	failureSites,
	isDescribed,
	isKeyword,
	isLiteralSite,
	missingDescriptionOf,
	raisedWritersByCode,
	raisingKeys,
	writeSiteOf,
	type IssueContext,
	type Writer
} from "./sites.ts"
import {
	calledMembersOf,
	declares,
	defaultedNodeKeys,
	forwardedOf,
	holdsDefaults,
	holdsObjectMeta,
	isSharedUnit,
	isWriting,
	isVariadicArray,
	namesReadBy,
	readWritten,
	returnedOf,
	writtenByUnits,
	writtenSelectedOf,
	type CollectedDefault
} from "./units.ts"
import {
	assertBakeableJsonSchema,
	holdsLocal,
	holeNameIn,
	isPlainLiteral,
	keywordMetas,
	runtimePathsByValue,
	totalBaked,
	writeBakedLimitMessage,
	writeUnprecompilableMessage,
	type BakedLengths
} from "./values.ts"
type DeclarationRole =
	| "shape"
	| "keys"
	| "literal"
	| "made"
	| "standIn"
	| "json"
	| "jsonSchema"
	| "traversal"

// constraints sorted by hash, which can include a function's name
const sortedConstraintKeys = ["pattern", "index"] as const

interface RootApplyOptions {
	// whether the build writes the validator itself, which calls the apply
	asValidator: boolean
	// whether nothing but the call sets onFail
	unconfigured: boolean
	// whether the validator can be piped into, so its apply takes a traversal
	pipes: boolean
	// whether the validator fails only by its assert, so its apply throws
	throws?: boolean
}

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
		made: [],
		standIn: [],
		json: [],
		jsonSchema: [],
		traversal: []
	}
})

// a shared unit as it's written: what it returns and reads, and what it's passed
interface SharedUnit {
	unit: RootUnit
	returned: string[]
	read: ReadonlySet<string>
	// cyclic roots, created with their own traversals
	own: BaseRoot[]
	params: string[]
	args: string[]
	imports: Record<string, string[]>
	shapesByName: Record<string, string>
}

export class StandaloneArtifact {
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
	unitsRead: [rootCount: number, units: RootUnit[]] | undefined
	writtenRead: [rootCount: number, nodes: BaseNode[]] | undefined
	// keyed by variant and id, as nodes sharing an id share a unit
	unitsByHead = new Map<string, RootUnit>()
	localNamesByUnit = new Map<RootUnit, string>()
	unit: RootUnit | undefined
	writing: SharedUnit | undefined
	// read only with `in`
	keyLookups: ReadonlySet<object>
	patternInstances: ReadonlySet<RegExp>
	defaultsByMorph: ReadonlyMap<unknown, CollectedDefault>
	defaultNames = new Map<unknown, string>()
	objectUnits: ReadonlySet<unknown>
	metas: ReadonlySet<object>
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
	writtenValidators = new Map<string, string>()
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
				const variant = this.variantOf(root)
				for (const unit of this.unitsOf(root)) {
					for (const head of unit.roots) {
						const key = `${variant}${head.id}`
						if (!this.unitsByHead.has(key)) this.unitsByHead.set(key, unit)
					}
				}
			}
		} while (this.collectMetaTypes() || this.collectDefaultTypes())
		this.comparedRoots = this.roots
		for (const root of this.roots) {
			// only a meta may override the configured onFail
			if (root.meta.onFail === undefined && root.onFail !== $ark.cfg!.onFail)
				throwParseError(writeUnprecompilableMessage("onFail"))
		}
		// what one root's units write is read once for every artifact writing it
		const [root] = this.unitRoots
		const units = this.unitRoots.size === 1 ? this.unitsOf(root) : undefined
		let written = units && writtenByUnits.get(units)
		if (!written) {
			written = readWritten(this.units, this.writtenNodes)
			if (units) writtenByUnits.set(units, written)
		}
		let feature: keyof IssueFeatures
		for (feature in written.issues)
			if (written.issues[feature]) this.baking.issues[feature] = true
		this.metas = written.metas
		this.keyLookups = written.keyLookups
		this.patternInstances = written.patternInstances
		this.defaultsByMorph = written.defaultsByMorph
		this.objectUnits = written.objectUnits
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
					this.compareInput(`p${i}`, path, value, param.label, checked)
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
				node.is("union") ?
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
		const args = `${writeId(id)}, ${JSON.stringify(label)}${kind}`
		const name = `receive${hashOf(`runtime.holesOf(holder, ${args})`)}`
		this.importName(
			this.share(
				name,
				// a hoisted receiver is declared, so an import cycle can call it early
				this.baking.hoisted ?
					writeFunction(
						this.baking,
						name,
						"holder",
						`\treturn runtime.holesOf(holder, ${args})`
					)
				:	`const ${name} = /* @__PURE__ */ runtime.receiverOf(${args})`
			),
			name
		)
		return name
	}

	compareInput(
		param: string,
		path: PropertyKey[],
		value: unknown,
		root: string,
		checked: [hole: unknown, kind: HoleKind, expression: string][]
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
			const related = isType ? [value, ...value.references] : this.writtenNodes
			const protos = related.flatMap(node =>
				node.is("proto") ? [node.proto] : []
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
		// e.g. a config's message, read through an object the site is passed
		if (
			typeof value === "function" &&
			functionNameOf(value).includes(holeNameMarker)
		) {
			if (this.receiveHole(value, expression, label))
				checked.push([value, "function", expression])
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
		// arktype validates one with a morph of its own, calling its validate
		if (isStandardSchema(value)) {
			throwParseError(
				writeUnprecompilableMessage(`the Standard Schema ${label}`)
			)
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
			if (!isArray(value)) {
				this.compareInput(
					param,
					[...path, k],
					Reflect.get(value, k),
					root,
					checked
				)
			} else if (k !== "length") {
				this.compareInput(
					param,
					[...path, Number(k)],
					value[Number(k)],
					root,
					checked
				)
			}
		}
	}

	// sibling order by hash can depend on a hole's name
	refuseHoleOrdering(l: BaseNode, r: BaseNode): void {
		let i = 0
		while (i < l.hash.length && l.hash[i] === r.hash[i]) i++
		const name =
			// past a long hash's prefix, a digest of all of its JSON orders it
			(
				i >= hashedPrefixLength &&
				!(l.hash.endsWith("}") && r.hash.endsWith("}"))
			) ?
				(holeNameIn(l.json) ?? holeNameIn(r.json))
			:	[l.hash, r.hash]
					.map(hash => registeredNameAt(hash, i))
					.find(name => name?.includes(holeNameMarker))
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

	get readsOnlyAllows(): boolean {
		return (
			!this.baking.called &&
			!this.baking.members.has("assert") &&
			!this.baking.members.has("~standard")
		)
	}

	variantOf(root: BaseRoot): number {
		const variant =
			(writesInPlace(root, this.baking.mutatesInput) ? 1
			: this.baking.detailsErrors && this.baking.shortest ? 2
			: 0) +
			3 * +this.baking.firstIssue +
			6 * +this.baking.shortest
		const compiled =
			variant !== 8 ? variant
			: !this.baking.combines || this.baking.compiledInputs.has(root.hash) ?
				// read only for allows, a validator writes no issues
				this.readsOnlyAllows ?
					0
				:	compiledForSize
			: this.baking.shapes ? shapedForSize
			: variant
		return this.baking.jsonInput ? jsonVariantOf(compiled) : compiled
	}

	unitsOf(root: BaseRoot): RootUnit[] {
		return rootUnitsOf(root, this.variantOf(root))
	}

	headUnitOf(root: BaseRoot): RootUnit {
		return this.unitsByHead.get(`${this.variantOf(root)}${root.id}`)!
	}

	// each node the units write, once: what their roots reference
	get writtenNodes(): BaseNode[] {
		if (this.writtenRead?.[0] !== this.unitRoots.size) {
			const written = new Set<BaseNode>()
			// roots written with all they reference
			const covered = new Set<BaseNode>()
			const cover = (root: BaseRoot) => {
				if (covered.has(root)) return
				const reached = root.selectReferences(isAny)
				// refsById can hold a node sharing another root's id
				const coversRoots = !reached.some(node => node.hasAlias)
				for (const node of reached) {
					written.add(node)
					if (coversRoots && node.isRoot()) covered.add(node)
				}
				covered.add(root)
			}
			// the roots units were written for first, as they reach the others
			for (const root of this.unitRoots) cover(root)
			for (const unit of this.units) {
				for (const node of unit.declared) written.add(node)
				for (const root of unit.roots) cover(root)
			}
			this.writtenRead = [this.unitRoots.size, [...written]]
		}
		return this.writtenRead[1]
	}

	writtenSelected(selects: (node: BaseNode) => boolean): BaseNode[] {
		return [...this.unitRoots].flatMap(root =>
			writtenSelectedOf(this.unitsOf(root), selects)
		)
	}

	get declared(): BaseNode[] {
		return this.units.flatMap(unit => unit.declared)
	}

	// unitRoots only grows
	get units(): RootUnit[] {
		if (this.unitsRead?.[0] !== this.unitRoots.size) {
			this.unitsRead = [
				this.unitRoots.size,
				[...new Set([...this.unitRoots].flatMap(root => this.unitsOf(root)))]
			]
		}
		return this.unitsRead[1]
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
		for (const node of this.writtenSelected(holdsObjectMeta))
			for (const v of Object.values(node.meta)) collect(v)
		return this.validatorNames.size > typeCount
	}

	// a default inlined by its parent still needs a validator
	collectDefaultTypes(): boolean {
		const typeCount = this.validatorNames.size
		const collect = (value: BaseRoot) => {
			if (!this.validatorNames.has(value)) this.defaultValues.add(value)
			this.collectType(value)
		}
		for (const node of this.writtenSelected(holdsDefaults)) {
			if (node.is("optional") && node.defMorph) collect(node.value)
			else if (node.is("sequence"))
				for (const [value] of node.defaultables ?? []) collect(value)
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

	// each export's validator as [callee, ...args], creatable from the imports alone
	writeCalls(configured: Configured): string[][] | undefined {
		if (writeFixConfig(configured) || !this.roots.length) return
		this.writeSharedUnits()
		const names = Object.values(this.exports).map(value =>
			hasArkKind(value, "root") ? this.readValidator(value) : undefined
		)
		this.writeBody(unitFunction => `(${unitFunction})`)
		if (
			this.writtenValidators.size !== names.length ||
			this.declarations.statements.length ||
			this.sharedWriters.size ||
			this.localUnits.length ||
			this.links.length ||
			this.defaults.length ||
			this.modules.length ||
			this.fills.length
		)
			return
		const imported = new Set(Object.values(this.imports).flat())
		const calls: string[][] = []
		for (const name of names) {
			const call = /^([\w$]+)\(\s*((?:[\w$]+,\s*)*[\w$]+)?\s*\)$/.exec(
				(name && this.writtenValidators.get(name)) ?? ""
			)
			const reads = call && [call[1], ...(call[2]?.split(/,\s*/) ?? [])]
			if (!reads?.every(read => imported.has(read))) return
			calls.push(reads)
		}
		return calls
	}

	writeFactory(index: number, configured: Configured): string {
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
					`return runtime.intern(${writeLazyRead(`interned${internedBy}`, "runtime.internTable()")}, [${holes.join(", ")}], () => {\n${body.filter(statement => statement).join("\n\n")}\n}${defaultKeys})`
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
		const value = this.baked(member, () =>
			member === "toJsonSchema" ?
				this.writeJsonSchema(
					type,
					() => {
						if (thrown) throw thrown
						return data
					},
					{ isRead: true }
				)
			: member === "expression" ? this.emitExpression(type)
			: member === "description" ? this.emitDescription(type)
			: this.readJson(type)
		)
		this.assertBakedWithin()
		const defaults = this.writeDefaultChecks(this.defaultChecks)
		return this.writeFactoryFunction(index, params, configured, [
			...(defaults.length ?
				[...this.writeCalledBody(index), ...defaults.map(({ check }) => check)]
			:	this.declarations.statements),
			`return ${value}`
		])
	}

	// a function baking members into the validator it's passed, or into each
	// of a module namespace's
	writeBake({ bakes, members }: StandaloneBake, index: number): string {
		const bake = (root: BaseRoot, read: string) =>
			`runtime.bake(${read}, { ${this.emitIntrospection(root, new Set(members)).join(", ")} })`
		const [param, baked] =
			hasArkKind(bakes, "root") ?
				["validator", `return ${bake(bakes, "validator")}`]
			:	[
					"namespace",
					`// a cycle may load it before the module exporting them
try {
${Object.entries(bakes)
	.map(([name, root]) => bake(root, `namespace[${JSON.stringify(name)}]`))
	.join("\n")}
} catch {}
return namespace`
				]
		return writeFunction(
			this.baking,
			`factory${index}`,
			param,
			[
				this.declarations.statements.join("\n"),
				[...this.sharedWriters]
					.map(([writer, name]) => `const ${name} = ${writer}`)
					.join("\n"),
				baked
			]
				.filter(statement => statement)
				.join("\n\n")
		)
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
		return this.writeBody((unitFunction, i) =>
			writeLazyRead(`unit${index}_${i}`, unitFunction)
		)
	}

	writeDefaultChecks(
		checks: readonly DefaultCheck[]
	): { check: string; key: string }[] {
		return checks.map(([node, defaultValue, key]) => {
			const input = node.in as BaseRoot
			// keyed by traversal, value and their holes
			const [inputId, inputHoles] = traversalKeyOf(input)
			const [valueId, valueHoles] = encodeKey(defaultValue, undefined, "value")
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
		const returned = returnedOf(unit, this.baking)
		const writing: SharedUnit = (this.writing = {
			unit,
			returned,
			read: namesReadBy(unit, returned),
			own: unit.roots.filter(root =>
				unit.refs.some(
					ref => isNode(ref) && unit.names[ref.id] === unit.names[root.id]
				)
			),
			params: [],
			args: [],
			imports: {},
			shapesByName: {}
		})
		this.declarations = createDeclarations()
		this.unit = unit
		for (const root of writing.own) {
			writing.shapesByName[unit.names[root.id]] = this.declareConst(
				root,
				"shape",
				"{}"
			)
		}
		const refs = this.writeSharedRefs(writing)
		const links = writing.own.map(root => {
			const shape = writing.shapesByName[unit.names[root.id]]
			returned.push(shape)
			return `runtime.freeze(runtime.assign(${shape}, ${this.writeShape(root, shape, unit, this.traversalsOf(root, unit))}))`
		})
		const [moduleDeclarations, scope] =
			this.baking.flattens ?
				[this.writeFlatUnit(writing, refs, links)]
			:	this.writeScopedUnit(writing, refs, links)
		moduleDeclarations.push(...this.writeUnitNodes(writing))
		if (scope) {
			for (const root of unit.roots) {
				const name = unit.names[root.id]
				scope.nodes[name] = `runtime.freeze(${this.writeShape(
					root,
					name,
					unit,
					this.traversalsOf(root, unit)
				)})`
			}
		}
		this.declarations = declarations
		this.unit = undefined
		this.writing = undefined
		this.sharedModules[specifier] = {
			readsRuntime: true,
			imports: writing.imports,
			declarations: moduleDeclarations,
			scope,
			exports: [
				unit.name,
				...unit.roots.map(root => `${unit.names[root.id]}Node`),
				...(this.baking.flattens ?
					returnedOf(unit, this.baking).filter(name => name)
				:	[])
			]
		}
	}

	// the refs a unit's members read, declared unless received or imported
	writeSharedRefs(writing: SharedUnit): string[] {
		const { unit, read } = writing
		return unit.refs.flatMap((value, i) => {
			const name = refNameOf(unit.name, i)
			if (!read.has(name)) return []
			const { statements } = this.declarations
			const declared = statements.length
			const emitted = this.emitRef(value)
			const exported = /^runtime\.([\w$]+)$/.exec(emitted)?.[1]
			if (!this.baking.flattens) {
				const received =
					exported ? emitted
					: isLiteralSite(value, emitted) ? this.readSite(emitted)
					: undefined
				if (received === undefined) return [`const ${name} = ${emitted}`]
				// a unit's function receives what the runtime and other units share
				writing.params.push(name)
				writing.args.push(received)
				return []
			}
			// a flat module reads what the runtime exports by the ref's name
			if (exported) {
				this.importName("arktype/runtime", `${exported} as ${name}`)
				return []
			}
			// as it does a pattern the ref declares
			if (
				hasDomain(value, "object") &&
				isRegExpObject(value) &&
				statements.length === declared + 1
			) {
				statements[declared] =
					`const ${name}${statements[declared].slice(`const ${emitted}`.length)}`
				this.declarations.namesByValue.set(value, name)
				return []
			}
			return [`const ${name} = ${emitted}`]
		})
	}

	// a flat module declares its traversals at the top level, importing what it reads
	writeFlatUnit(
		writing: SharedUnit,
		refs: string[],
		links: string[]
	): string[] {
		const { unit, returned, read } = writing
		for (const name in unit.dependencies) {
			if (!read.has(name)) continue
			const dependency = unitOf(unit.dependencies[name][0], unit)
			this.importName(this.specifierOf(dependency.name), name)
		}
		return [
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
		]
	}

	// a scoped unit's traversals are returned by one call, passed what they read
	writeScopedUnit(
		writing: SharedUnit,
		refs: string[],
		links: string[]
	): [declarations: string[], scope: UnitScope | undefined] {
		const { unit, returned, read } = writing
		const dependencies = this.dependenciesOf(unit, read)
		const [dependencyParams, dependencyArgs] = writeDependencies(
			dependencies,
			this.baking.shortest
		)
		const params = [...dependencyParams, ...writing.params]
		const prologue = [...this.declarations.statements, ...refs]
		const statements = [
			...prologue,
			...this.declareMembers(unit, [...prologue, ...links, ...returned]),
			...links
		]
		const array =
			params.length || prologue.length || links.length ?
				undefined
			:	this.writeUnitArray(unit, returned)
		const template =
			!array &&
			!params.length &&
			!links.length &&
			!Object.keys(writing.imports).length &&
			this.writeTemplateCall(unit, prologue, returned)
		const built =
			array ??
			(template ||
				`(${writeScope(
					// a minifier dissolves a call with no parameters into its caller
					params.length || this.baking.shortest ? params : ["...$"],
					statements,
					returned
				)})(${[...dependencyArgs, ...writing.args].join(", ")})`)
		const scope: UnitScope | undefined =
			this.baking.hoisted || links.length || template ?
				undefined
			:	{
					name: unit.name,
					dependencies,
					params: writing.params,
					args: writing.args,
					statements,
					returned,
					nodes: {},
					declaresOnlyRefs: !this.declarations.statements.length
				}
		return [
			this.baking.hoisted ?
				[
					`var ${unit.name}Unit`,
					`function ${unit.name}() {\n\treturn ${writeLazyRead(`${unit.name}Unit`, built)}\n}`
				]
			:	[
					`const ${unit.name} = ${array ? "" : `${template ? "" : noInlineOf(this.baking.shortest)}/* @__PURE__ */ `}${built}`
				],
			scope
		]
	}

	// each root's node: a cyclic root's shape, or one built from its traversals
	writeUnitNodes(writing: SharedUnit): string[] {
		const { unit, returned } = writing
		return unit.roots.map(root => {
			const name = unit.names[root.id]
			const shape = writing.shapesByName[name]
			return writeValue(
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
		})
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
		// a site's description is passed, so units differing by theirs share it
		const descriptions: string[] = []
		const shared = body.replace(
			/(runtime\.(?:siteOf|keySiteOf)\("(?:[^"\\]|\\.)*", |runtime\.requiredSiteOf\()("(?:[^"\\]|\\.)*")\)/g,
			(_, call: string, description: string) => {
				if (!descriptions.includes(description)) descriptions.push(description)
				return `${call}d${descriptions.indexOf(description)})`
			}
		)
		const named = [
			...params.map(param => param.split(unit.name).join("template")),
			...descriptions.map((_, i) => `d${i}`)
		]
		args.push(...descriptions)
		const name = `template${hashOf(`${named} ${shared}`)}`
		this.importName(
			this.share(
				name,
				writeFunction(this.baking, name, named.join(", "), shared),
				{},
				shared.includes("runtime.")
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
		return writeScope(
			params,
			[...prologue, ...declarations, ...epilogue],
			returned
		)
	}

	// traversals reading no other name of their unit need no scope
	writeUnitArray(unit: RootUnit, returned: string[]): string | undefined {
		const sourcesByName = new Map(
			this.declareMembers(unit, returned).map(declaration => {
				const [, name, source] = /^const ([\w$]+) = ([\S\s]*)$/.exec(
					declaration
				)!
				return [name, source]
			})
		)
		for (const source of sourcesByName.values())
			if (source.match(/[\w$]+/g)!.some(name => sourcesByName.has(name))) return
		const sources = returned.map(name => (name ? sourcesByName.get(name) : ""))
		if (sources.includes(undefined)) return
		return `[${sources.join(", ")}]`
	}

	// traversals read neither `this` nor `arguments`
	declareMembers(unit: RootUnit, readers: string[]): string[] {
		const called = calledMembersOf(unit.members, readers)
		const forwarded = forwardedOf(called)
		// an Allows shares its params' text with an Apply, unless only .allows is read
		const dropsCtx =
			this.baking.shortest ||
			(!this.baking.called &&
				!this.baking.members.has("assert") &&
				!this.baking.members.has("~standard"))
		const declarations = called.flatMap(([name, source]) => {
			if (forwarded.has(name)) return []
			// plain params; size and writing traversals drop a trailing unread ctx
			const arrow = source.replace(
				/^function\(([^)]*)\) {/,
				(signature, params: string) =>
					`(${(dropsCtx || isWriting(name)) && !/\bctx\b/.test(source.slice(signature.length)) ? params.replace(/, ctx$/, "") : params}) => {${
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

	// a module's only validator compiles as it loads, others at their first call
	validatorOnLoad(fn: string): string {
		return this.baking.compilesValidators ? this.compiledOnLoad(fn) : fn
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
		read: ReadonlySet<string>
	): [params: string[], args: string[]] {
		return writeDependencies(
			this.dependenciesOf(unit, read),
			this.baking.shortest
		)
	}

	// each array of traversals the unit reads, by the names read at its indices
	dependenciesOf(
		unit: RootUnit,
		read: ReadonlySet<string>
	): Record<string, string[]> {
		const namesBySource: Record<string, string[]> = {}
		for (const name in unit.dependencies) {
			if (!read.has(name)) continue
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
		return namesBySource
	}

	writeBody(
		wrapUnitFunction: (unitFunction: string, i: number) => string
	): string[] {
		const traversals = this.localUnits.map((unit, i) => {
			this.localNamesByUnit.set(unit, `traversals${i}`)
			const returned = returnedOf(unit, this.baking)
			const read = namesReadBy(unit, returned)
			const declared = unit.refs.flatMap((_, i) =>
				read.has(refNameOf(unit.name, i)) ? [i] : []
			)
			this.unit = unit
			const refs = declared.map(i => this.emitRef(unit.refs[i]))
			this.unit = undefined
			const [dependencyParams, dependencyArgs] = this.dependencyParamsOf(
				unit,
				read
			)
			// minifiers inline a call passing an array, not a rest parameter
			const unitFunction = this.writeUnitFunction(
				unit,
				[...dependencyParams, "...refs"],
				declared.map(
					(i, position) =>
						`const ${refNameOf(unit.name, i)} = refs[${position}]`
				),
				[],
				returned
			)
			const args = [...dependencyArgs, ...refs]
			return `const traversals${i} = ${noInlineOf(this.baking.shortest)}${wrapUnitFunction(unitFunction, i)}(${args.join(", ")})`
		})
		// written before filtering, as a meta can read a later one
		const validators = [...this.validatorNames].map(
			([root, name]) => [root, name, this.writeValidator(root)] as const
		)
		this.writtenValidators = new Map(
			validators
				.filter(
					([root]) => !this.defaultValues.has(root) || this.readRoots.has(root)
				)
				.map(([, name, validator]) => [name, validator])
		)
		return [
			this.declarations.statements.join("\n"),
			[...this.sharedWriters]
				.map(([writer, name]) => `const ${name} = ${writer}`)
				.join("\n"),
			traversals.join("\n"),
			this.links.join("\n"),
			[...this.writtenValidators]
				.map(([name, validator]) => `const ${name} = ${validator}`)
				.join("\n\n"),
			this.defaults.join("\n"),
			this.modules.join("\n"),
			this.fills.join("\n")
		]
	}

	writeValidator(root: BaseRoot): string {
		const form = this.validatorFormOf(root)
		const { members, reads, isTemplate, ownsValidator, unconfigured } = form
		const [applied, allows, isCompact] = this.emitRootApply(root, {
			asValidator: ownsValidator,
			unconfigured,
			pipes: form.pipes,
			// a validator nothing calls fails only by its assert
			throws:
				!isTemplate &&
				!ownsValidator &&
				preciseFormOf(this.baking, members, unconfigured, reads) === "object"
		})
		const { id, held, meta, attributes, onFail } = this.attributesOf(root, form)
		const fused = fusedApplierOf(this.baking, form, applied)
		const made = fused ? undefined : madeApplierOf(form, applied, allows)
		const written = writtenAttributesOf(
			this.baking,
			form,
			attributes,
			meta,
			onFail
		)
		const createsWith = !isTemplate && ownsValidator && form.byRuntime
		const rootApply = () =>
			typeof applied === "string" ? applied : (
				`${this.emitApplier(applied)}(${applied.args})`
			)
		const args = [
			...(fused ? [fused.args]
			: made ? [this.emitApplier(made), made.args]
			: ownsValidator && !isCompact ?
				[
					form.pipes ?
						"runtime.callingRootApply"
					:	"([, rootApply]) => (data, _, onFail) => rootApply(data, onFail)",
					`[${allows}, ${rootApply()}]`
				]
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
			: !form.byRuntime ? `${this.creatorOf(form, fused, made !== undefined)}(`
			: createsWith ? "runtime.createValidatorWith("
			: "runtime.createValidator("
		}\n\t${args.join(",\n\t")}\n${isTemplate ? "]" : ")"}`
		return held && !this.baking.checksTypes ?
				`runtime.holdHoles(${created}, ${writeId(id)}, ${held})`
			:	created
	}

	validatorFormOf(root: BaseRoot): ValidatorForm {
		const isTemplate = this.templates.has(root)
		const isRuntimeRead = this.runtimeReadRoots.has(root)
		const baked = this.baking.bakedByRoot.get(root)?.members ?? []
		const members =
			isRuntimeRead || baked.length ?
				new Set([
					...this.baking.members,
					...baked,
					...(isRuntimeRead ? defaultMembers : [])
				])
			:	this.baking.members
		const ownsValidator =
			!isTemplate && !this.baking.shortest && members.has("methods")
		const unconfigured = !this.baking.readsConfig && !root.meta.onFail
		return {
			members,
			reads: isRuntimeRead ? wholeReads : this.baking,
			isTemplate,
			ownsValidator,
			unconfigured,
			pipes: canPipe(this.baking, members, unconfigured),
			byRuntime: isCreatedByRuntime(members, this.baking)
		}
	}

	attributesOf(root: BaseRoot, form: ValidatorForm): ValidatorAttributes {
		const keepsMeta = form.members.has("meta")
		// emit meta before keying so an unemittable value is named
		const meta =
			!keepsMeta ? undefined
			: keywordMetas().has(root.meta) ? "runtime.emptyMeta"
			: this.emit(root.meta)
		const [id, holes] = (this.checkedRoots.has(root) ? traversalKeyOf : keyOf)(
			root
		)
		assertDescribed(root)
		return {
			id,
			held:
				holes.length && !form.isTemplate ?
					`[${holes.map(hole => this.emit(hole)).join(", ")}]`
				:	undefined,
			meta,
			attributes: [
				...(keepsMeta ? [`meta: ${meta}`] : []),
				...this.emitIntrospection(root, form.members as Set<ValidatorMember>)
			],
			// without its meta, a validator still fails as the meta's onFail does
			onFail:
				!keepsMeta && root.meta.onFail ? this.emit(root.meta.onFail) : undefined
		}
	}
	creatorOf(
		form: ValidatorForm,
		applier: RootApplier | undefined,
		makes: boolean
	): string {
		const [params, body] = creatorSourceOf(this.baking, form, applier, makes)
		const name = `create${hashOf(`${params}\n${body}`)}`
		this.importName(
			this.share(
				name,
				writeFunction(this.baking, name, params, body),
				this.failureImports(applier?.failure)
			),
			name
		)
		return name
	}

	emitIntrospection(root: BaseRoot, baked: Set<ValidatorMember>): string[] {
		const members = this.bakedMembersOf(root, baked)
		const decided = introspectionMembers.filter(
			member => baked.has(member) && !this.baking.members.has(member)
		)
		if (
			totalBaked(this.bakedLengths) > this.baking.bakedLimit &&
			decided.length &&
			this.baking.bakedByRoot.get(root)?.lost
		) {
			// what it bakes having lost track of what reads it is left out
			// rather than fail the build, so reading it throws
			this.bakedLengths = {}
			for (const member of decided) baked.delete(member)
			return this.emitIntrospection(root, baked)
		}
		this.assertBakedWithin()
		return members
	}

	private bakedMembersOf(
		root: BaseRoot,
		baked: ReadonlySet<ValidatorMember>
	): string[] {
		const members: string[] = []
		const bakes = (member: IntrospectionMember) => baked.has(member)
		if (bakes("expression"))
			members.push(`expression: ${this.emitExpression(root)}`)
		if (bakes("description"))
			members.push(`description: ${this.emitDescription(root)}`)
		if (bakes("json") || bakes("toJSON")) {
			const json = this.baked(bakes("json") ? "json" : "toJSON", () =>
				this.readJson(root)
			)
			if (bakes("json")) members.push(`json: ${json}`)
			if (bakes("toJSON"))
				members.push(`toJSON: ${frozen(this.baking, `() => ${json}`)}`)
		}
		const standard =
			bakes("~standard.jsonSchema") &&
			this.baked("~standard.jsonSchema", () =>
				(["input", "output"] as const).map(
					io =>
						`[${supportedJsonSchemaTargets.map(target => this.emitJsonSchema(root, () => root["~standard"].jsonSchema[io]({ target }))).join(", ")}]`
				)
			)
		if (bakes("toJsonSchema")) {
			const written = this.baked("toJsonSchema", () =>
				this.emitJsonSchema(root, () => root.toJsonSchema())
			)
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
				`toJsonSchema: runtime.bakedJsonSchema(${written}, [${byTarget.join(", ")}]${this.writesWithoutFallback(root) ? ", 1" : ""})`
			)
		}
		if (standard) {
			members.push(
				`"~standard": { jsonSchema: runtime.bakedStandardJsonSchema(${standard.join(", ")}) }`
			)
		}
		return members
	}

	// the chars each introspection member of the Type being written bakes
	private bakedLengths: BakedLengths = {}
	private bakingMember: IntrospectionMember | undefined

	private baked<t>(member: IntrospectionMember, write: () => t): t {
		const outer = this.bakingMember
		this.bakingMember = member
		try {
			return write()
		} finally {
			this.bakingMember = outer
		}
	}

	private assertBakedWithin(): void {
		const lengths = this.bakedLengths
		this.bakedLengths = {}
		if (totalBaked(lengths) > this.baking.bakedLimit)
			throwParseError(writeBakedLimitMessage(lengths, this.baking.bakedLimit))
	}

	private countBaked(text: string): void {
		if (this.bakingMember === undefined) return
		this.bakedLengths[this.bakingMember] =
			(this.bakedLengths[this.bakingMember] ?? 0) + text.length
	}

	// a fallback a call passes, as hono-openapi does, changes nothing where none writes
	writesWithoutFallback(root: BaseRoot): boolean {
		let fellBack = false
		const fallback = flatMorph(
			root.$.cfg.toJsonSchema.fallback,
			(code, handler: Fn) => [
				code,
				(ctx: object) => {
					fellBack = true
					return handler(ctx)
				}
			]
		) as ToJsonSchema.HandlerByCode
		try {
			this.baking.write(() => {
				root.toJsonSchema({ fallback })
				for (const target of supportedJsonSchemaTargets)
					root.toJsonSchema({ target, fallback })
			})
		} catch {
			return false
		}
		return !fellBack
	}

	// nodes share json unless it prints a hole
	readJson(root: BaseRoot): string {
		const value = `runtime.deepFreeze(${this.writeData(root.json)})`
		this.countBaked(value)
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

	// a site written once for every unit reading it
	readSite(emitted: string): string {
		const name = `site${hashOf(emitted)}`
		// an object is parenthesized to be an arrow's value, not its body
		const value = emitted[0] === "{" ? `(${emitted})` : emitted
		this.importName(
			this.share(name, writeValue(this.baking.hoisted, name, value)),
			name
		)
		return this.readValue(name)
	}

	readFailure(name: keyof typeof failureSources): string {
		return this.read(this.declareFailure(name), name)
	}

	declareFailure(name: keyof typeof failureSources): string {
		const [params, body] = failureSources[name]
		return this.share(
			name,
			writeFunction(
				this.baking,
				name,
				params,
				typeof body === "string" ? body : (
					body(invalidErrorsOf(this.baking.defersIssues))
				),
				name === "applyBy"
			),
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
		this.countBaked(writer)
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
		return `() => ${this.writeJsonSchema(root, write, { values })}`
	}

	// a schema read only via a validator throws where it's read
	writeJsonSchema(
		root: BaseRoot,
		write: () => unknown,
		{
			isRead = false,
			values = []
		}: { isRead?: boolean; values?: unknown[] | undefined }
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
		opts: RootApplyOptions
	): [rootApply: string | RootApplier, allows: string, isCompact: boolean] {
		const { asValidator, unconfigured, throws } = opts
		const callbacks = declares(
			root,
			node =>
				node.is("morph") || (node.is("predicate") && !isKeyword(node.predicate))
		)
		if (!this.baking.detailsErrors) {
			return this.emitUndetailedApply(
				root,
				callbacks ? "Traversal" : "InternalTraversal",
				opts
			)
		}
		// callbacks only into runtime keywords report into ArkErrors
		const reportsIssues =
			!root.hasAlias &&
			!root.hasMorph &&
			!callbacks &&
			!declares(
				root,
				node =>
					node.is("union") && !node.discriminant && !isDecidedByAllows(node)
			) &&
			// errors count their issues, not a branch's
			!this.unitsOf(root).some(unit =>
				unit.members.some(([, source]) => source.includes("ctx.errN"))
			)
		if (reportsIssues) assertReportsIssues(this.unitsOf(root))
		const ctx =
			this.baking.firstIssue ?
				reportsIssues ? "FirstIssues"
				:	"FirstIssueTraversal"
			: reportsIssues ? "ArkErrors"
			: callbacks ? "Traversal"
			: "InternalTraversal"
		// first-issue traversals drop the rest when finalized
		const appliesErrors = !this.baking.firstIssue || reportsIssues
		// for speed, issues reported into ArkErrors are found once read
		const unreads = reportsIssues && this.baking.defersIssues
		const [callErrors, elementErrors] =
			unreads ?
				["runtime.unreadCallErrors", "runtime.unreadElements"]
			:	["runtime.applyCallErrors", "runtime.applyElements"]
		const refOf = (param: RootApplyParam) =>
			param === "Traversal" ?
				ctx === "Traversal" || ctx === "FirstIssueTraversal" ?
					this.emitRaisingTraversal(ctx)
				:	`runtime.${ctx}`
			: param === "config" ? "runtime.runtimeConfig"
			: param === "TransformErrors" ? param
			: param === "applyRejected" ?
				appliesErrors ? "runtime.applyNodeErrors"
				:	"runtime.applyRejected"
			:	this.emit(rootApplyRuntime[param])
		const strategy = root.applyMode
		// a checker transforms by its t, so each is created alike
		const checks = isChecker(root, this.variantOf(root))
		// an undiscriminated union's Transform finds its branch; a checker's t trusts its Allows
		const isArrow =
			!root.hasAlias &&
			(strategy === "allows" ||
				(strategy === "transform" &&
					!root.hasMorph &&
					(checks || !(root.is("union") && !root.discriminant))))
		const tfs = strategy === "transform" && !checks
		const [flat, traversals] =
			isArrow && appliesErrors && !root.allowsCtx ?
				this.compactPartsOf(root, tfs ? [0, 1, 2] : [0, 1], asValidator)
			:	[]
		if (traversals) {
			const Ctx =
				!unreads ? refOf("Traversal")
				: this.baking.firstIssue ? "runtime.UnreadFirstIssues"
				: "runtime.UnreadArkErrors"
			const local = !Ctx.startsWith("runtime.")
			// a unified root applies by its Allows
			const apply = this.appliedIndexOf(root) ? "apply" : "allows"
			const pattern =
				flat ?
					[
						...new Set(flat.map((_, i) => ["allows", apply, "transform"][i]))
					].join(", ")
				: this.baking.shortest ?
					`[allows${
						apply === "apply" ? ", apply"
						: tfs ? ","
						: ""
					}${tfs ? ", transform" : ""}]`
				:	`{ 0: allows${apply === "apply" ? ", 1: apply" : ""}${tfs ? ", 2: transform" : ""} }`
			const valid =
				checks ? "allows.t?.(data) ?? data"
				: tfs ? "transform(data)"
				: "data"
			const parts = flat ? [...new Set(flat)].join(", ") : traversals
			const elements = asValidator && !tfs && this.elementTraversalsOf(root)
			if (elements) {
				const args = `[${traversals}[0], ${traversals}[${this.appliedIndexOf(root)}], ${elements}]`
				return [
					this.emitApplier({
						// a minifier inlines a const read once, but not a default
						params: `{ 1: apply, 2: allowsElement, 3: applyElement }, onFail, rejectedIn = data => {
	for (let i = 0; i < data.length; i++) if (!allowsElement(data[i])) return i
}`,
						apply: `(data, ...args) => {
	if (!Array.isArray(data)) return ${callErrors}(apply, data, args, onFail, ${Ctx})
	const i = rejectedIn(data)
	return i === undefined ? data : ${elementErrors}(allowsElement, applyElement, i, data, args, onFail, ${Ctx})
}`,
						args,
						local
					}),
					args,
					true
				]
			}
			if (asValidator) {
				return [
					this.emitApplier({
						params: `${pattern}${unconfigured ? "" : ", onFail"}`,
						apply: `(data, ...args) => allows(data) ? ${valid} : ${callErrors}(${apply}, data, args, ${unconfigured ? "null" : "onFail"}, ${Ctx})`,
						args: parts,
						local
					}),
					parts,
					true
				]
			}
			return [
				{
					params: pattern,
					apply: `(data, onFail) => allows(data) ? ${valid} : ${
						unreads ? `runtime.unreadErrors(${apply}, data, onFail, ${Ctx})`
						: reportsIssues && !this.baking.shortest ?
							throws && Ctx === "runtime.ArkErrors" ?
								`runtime.throwIssues(${apply}, data)`
							:	`runtime.foundErrors(${apply}, data, onFail, ${Ctx})`
						: reportsIssues ?
							`runtime.applyIssues(${apply}, data, onFail${this.baking.firstIssue ? `, ${Ctx}` : ""})`
						:	`runtime.applyErrors(${apply}, data, ${refOf("config")}, onFail, ${Ctx})`
					}`,
					args: parts,
					local
				},
				flat ? flat[0] : `${traversals}[0]`,
				false
			]
		}
		const shape = this.shapeOf(root)
		if (isArrow) {
			const Traversal = refOf("Traversal")
			return [
				{
					params: "node",
					apply: `(data, onFail) => node.allows(data) ? ${tfs ? "node.tTransform(data)" : "data"} : ${refOf("applyRejected")}(node, data, ${refOf("config")}, onFail, ${Traversal})`,
					args: shape,
					local: !Traversal.startsWith("runtime.")
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
		{ asValidator, unconfigured, pipes }: RootApplyOptions
	): [rootApply: string | RootApplier, allows: string, isCompact: boolean] {
		const strategy = root.applyMode
		const invalid = "invalid(data, onFail)"
		const tfs = root.tfs
		// an undiscriminated union transforms what a branch allows, else unset
		const selects =
			strategy === "transform" && root.is("union") && !root.discriminant
		const captures = strategy === "transform" && root.hasMorph
		// a transform through a cycle, resolved from the root's shape
		const resolves = strategy === "contextualTransform" && root.hasAlias
		const [flat, traversals] =
			!root.allowsCtx && !resolves ?
				this.compactPartsOf(root, tfs ? [0, 2] : [0], asValidator)
			:	[]
		const shape = traversals ? undefined : this.shapeOf(root)
		const allows = traversals ? "allows" : "node.allows"
		const transform = traversals ? "transform" : "node.tTransform"
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
							`if (!(untracked ?? runtime.allowsInContext(node, data, runtime.runtimeConfig))) return ${invalid}`,
							`const ctx = new runtime.${ctx}(data, runtime.runtimeConfig)`,
							"ctx.isTree = untracked === undefined",
							`const result = runtime.transformResolution(ctx, ${JSON.stringify(this.headUnitOf(root).names[root.id])}, data, node.tTransform)`
						]
					:	[
							`if (!${allows}(data)) return ${invalid}`,
							`const ctx = new runtime.${ctx}(data, runtime.runtimeConfig)`,
							`const result = ${transform}(data, ctx)`
						]),
					`return ctx.hasError() ? ${invalid} : result`
				]
			: fails.length ?
				[
					...(selects ? [] : [`if (!${allows}(data)) return ${invalid}`]),
					`const result = ${transform}(data)`,
					`return ${fails.join(" || ")} ? ${invalid} : result`
				]
			:	undefined
		const params =
			!traversals ? "node"
			: flat ?
				[...(selects ? [] : ["allows"]), ...(tfs ? ["transform"] : [])].join(
					", "
				)
			: this.baking.shortest ?
				`[${selects ? "" : "allows"}${tfs ? ", , transform" : ""}]`
			:	`{ ${[...(selects ? [] : ["0: allows"]), ...(tfs ? ["2: transform"] : [])].join(", ")} }`
		const valid = tfs ? `${transform}(data)` : "data"
		const parts =
			!traversals ? undefined
			: flat ?
				[...(selects ? [] : [flat[0]]), ...(tfs ? [flat[1]] : [])].join(", ")
			:	traversals
		if (asValidator && parts && !body) {
			return [
				this.emitApplier({
					params: `${params}${unconfigured ? "" : ", onFail"}`,
					apply:
						pipes ?
							`(data, ...args) => ${allows}(data) ? ${valid} : invalidCall(data, args${unconfigured ? "" : ", onFail"})`
						:	`(data, _, onFail) => ${allows}(data) ? ${valid} : ${invalid}`,
					failure: pipes ? "invalidCall" : "invalid",
					args: parts
				}),
				parts,
				true
			]
		}
		const apply =
			body ?
				`(data, onFail) => {\n\t\t${body.join("\n\t\t")}\n\t}`
			:	`(data, onFail) => ${allows}(data) ? ${valid} : ${invalid}`
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

	// hashed with its args unless shortest: V8 can't inline an Allows call several roots share
	emitApplier({
		params,
		apply,
		failure,
		local,
		args
	}: Omit<RootApplier, "args"> & { args?: string }): string {
		if (local) return `((${params}) => ${this.validatorOnLoad(apply)})`
		const body = `\treturn ${this.validatorOnLoad(apply)}`
		const name = `apply${hashOf(
			`${params}\n${body}${this.baking.shortest || args === undefined ? "" : `\n${args}`}`
		)}`
		return this.read(
			this.share(
				name,
				writeFunction(this.baking, name, params, body),
				this.failureImports(failure)
			),
			name
		)
	}

	// where a root's unit array holds its Apply: with its Allows, if unified
	appliedIndexOf(root: BaseRoot): number {
		const [allows, apply] = this.traversalsOf(root, this.headUnitOf(root))
		return allows === apply ? 0 : 1
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
			!this.unitsByHead.has(`${this.variantOf(element)}${element.id}`)
		)
			return
		const traversals = this.compactTraversalsOf(element)
		return (
			traversals &&
			`${traversals}[0], ${traversals}[${this.appliedIndexOf(element)}]`
		)
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

	// a bare placeholder is a class's or predicate's name, fn where anonymous
	emitString(s: string): string {
		const parts: string[] = []
		let start = 0
		for (const match of s.matchAll(printedHoleNamePattern)) {
			if (match.index > start)
				parts.push(JSON.stringify(s.slice(start, match.index)))
			const [, registered, predicate, fn, name] = match
			const placeholder = registered ?? predicate ?? fn ?? name
			const named = this.holeNamed(placeholder)
			const hole =
				this.holeExpressions.get(named) ??
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
				: this.classes.has(named) ? `runtime.functionNameOf(${hole})`
				: `runtime.baseNameOf(${hole})`
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
			node.hasAlias ?
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
		const traverses = node.hasAlias || node.allowsCtx || node.checksCtx
		const transform = traversals[2] ? `\n\ttTransform: ${traversals[2]},` : ""
		const apply =
			this.baking.detailsErrors ? traversals[1]
			: node.allowsCtx && !node.hasAlias ?
				`${this.readFailure("applyBy")}(${traversals[0]})`
			:	this.readFailure("applyInvalid")
		return `{${ids}${flags.join("")}${traverses ? `\n\ttAllows: ${traversals[0]},` : ""}
	tApply: ${apply},${transform}
	allows: ${node.allowsCtx ? `data => runtime.allowsUntracked(${shape}, data) ?? runtime.allowsInContext(${shape}, data, runtime.runtimeConfig)` : traversals[0]}${traverses ? ",\n\t$: runtime.runtimeScope" : ""}
}`
	}

	// what a traversal reads, where size checks a URL by the parser alone
	emitRef(value: unknown): string {
		return this.baking.shortest && value === runtime.isParsableUrl ?
				"runtime.canParseUrl"
			:	this.emit(value)
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
		const made = madeMorphs.get(value as never)
		if (made) {
			return this.declareConst(
				value,
				"made",
				`${this.emit(made[0])}(${made[1].map(arg => this.emit(arg)).join(", ")})`
			)
		}
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
			isThunkInput || value.alters || value.hasAlias ?
				this.readByRuntime(value)
			:	this.readValidator(value)
		this.defaults.push(
			`const ${name} = runtime.computeDefaultValueMorph(${this.emit(key)}, ${validator}, ${this.emit(defaultValue)}, {${flags.length ? ` ${flags.join(", ")} ` : ""}}${typeof defaultValue === "function" ? `, ${isThunkInput}` : ""})`
		)
		return `(data, ctx) => ${name}(data, ctx)`
	}

	emitWriters(writers: readonly Writer[]): string {
		return `[${writers
			.map(writer =>
				writer instanceof ConfiguredWriter ?
					`runtime.configuredWriterOf(${JSON.stringify(writer.code)}, ${JSON.stringify(writer.k)})`
				: writer === undefined ? "void 0"
				: this.emit(writer)
			)
			.join(", ")}]`
	}

	// a callback's traversal, writing the program's text for codes it raises
	emitRaisingTraversal(ctx: "Traversal" | "FirstIssueTraversal"): string {
		const written = raisedWritersByCode()
		if (!written.length) return `runtime.${ctx}`
		const key = raisingKeys[ctx]
		return (
			this.declarations.namesByValue.get(key) ??
			this.declareConst(
				key,
				"traversal",
				`/* @__PURE__ */ runtime.raisingTraversalOf(runtime.${ctx}, { ${written
					.map(
						([code, writers, keeps]) =>
							`${code}: [${this.emitWriters(writers)}, ${keeps}]`
					)
					.join(", ")} })`
			)
		)
	}

	emitSite(site: object): string {
		// a discriminant's site holds the path it's read at
		if (Array.isArray(site))
			return `[${site.map(k => this.emit(k)).join(", ")}]`
		if ("code" in site) {
			const { code, description, written } = site as IssueContext
			if (!written)
				return writeSiteOf(site as IssueContext, s => this.emitString(s))
			return `runtime.writtenSiteOf(${this.emit(code)}, ${description === undefined ? "void 0" : this.emitString(description)}, ${this.emit(written.context)}, ${this.emitWriters(written.writers)}${written.keeps ? `, ${written.keeps}` : ""})`
		}
		const missing = missingDescriptionOf(site)
		if (missing !== undefined) {
			const { v: value } = site as FailureSite
			if (!value) return `runtime.requiredSiteOf(${this.emitString(missing)})`
			if (isDescribed(value as IssueContext)) {
				return writeSiteOf(
					value as IssueContext,
					s => this.emitString(s),
					"keySiteOf",
					missing
				)
			}
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

const shapeFlags = [
	"tfsById",
	"hasAlias",
	"tfs",
	"allowsCtx",
	"checksCtx"
] as const

const isAny = (): boolean => true
