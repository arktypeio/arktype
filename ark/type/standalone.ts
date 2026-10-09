import {
	$ark,
	hasArkKind,
	isNode,
	precompileByContent,
	type ArkErrorCode,
	type BaseNode,
	type BaseRoot,
	type ContentUnit,
	type NodeId,
	type NodeKind
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
	nameOf,
	printable,
	prototypeOf,
	serializePrimitive,
	throwInternalError,
	throwParseError
} from "@ark/util"
import { arktypeVersion } from "./entry.ts"
import type { type } from "./keywords/keywords.ts"
import type { Module } from "./module.ts"
import type { HoleKind } from "./runtime.ts"
import * as runtime from "./runtimeExports.ts"

const writerKeys = ["expected", "actual", "problem", "message"] as const

type DeclarationRole = "shape" | "keys" | "literal" | "config"

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
				indexRuntime(v, `${path}.${k}`)
		}
	}
}

// an artifact reads what the runtime exports from it rather than copying it
for (const [name, value] of Object.entries(runtime))
	indexRuntime(value, `runtime.${name}`)

export type StandaloneExport = type.Any | Module | StandaloneFactory

export interface StandaloneFactory {
	// built with each parameter's build value in its place
	type: type.Any
	params: FactoryParam[]
}

export type FactoryParam = HoleParam | InputParam | HelperParam

export interface HoleParam {
	kind: HoleKind
	// how a mismatch names it, e.g. `isEven` (src/user.ts:3:7)
	label: string
	value: unknown
}

export interface InputParam {
	kind: "input"
	label: string
	// each value the build read from it, by path
	reads: [path: PropertyKey[], value: unknown][]
}

// a function the build called while defining the Type, which a test driver registers where its module exports it
export interface HelperParam {
	kind: "helper"
	label: string
	file: string
	name: string
}

/**
 * #### an ES module that exports each Type as a validator running on arktype/runtime alone, each Module as an object of them, and each factory as a function creating one from what it receives
 */
export const precompileStandalone = (
	exports: Record<string, StandaloneExport>
): string => {
	const types: Record<string, type.Any | Module> = {}
	const factories: StandaloneArtifact[] = []
	for (const [name, value] of Object.entries(exports)) {
		if (arkKindOf(value) !== undefined) types[name] = value as never
		else {
			const { type, params } = value as StandaloneFactory
			factories.push(new StandaloneArtifact({ [name]: type }, params))
		}
	}
	return new StandaloneArtifact(types).write(factories)
}

export class StandaloneArtifact {
	exports: Record<string, type.Any | Module>
	params: FactoryParam[] | undefined
	// what a factory's code reads each hole through: a parameter, or the holes of a validator it receives
	holeExpressions = new Map<unknown, string>()
	labelsByHole = new Map<unknown, string>()
	holesByName: Record<string, unknown> = {}
	holeNamePattern: RegExp | undefined
	// a factory's statements that check what it receives before it creates anything
	checks: string[] = []
	validatorNamesByRoot = new Map<BaseRoot, string>()
	unit: ContentUnit
	// traversal raises these itself, and a predicate or morph can raise any code
	raisableCodes: { [code in NodeKind | ArkErrorCode]?: true } = {
		intersection: true,
		predicate: true,
		union: true,
		discriminant: true,
		undeclared: true
	}
	runsFunctions: boolean
	traversalIndexByName: Record<string, number> = {}
	// each structure's propsByKey, which traversal reads only with `in`
	keyLookups = new Set<object>()
	// each pattern's own RegExp, which only traversal reads
	patternInstances = new Set<RegExp>()
	objectUnits = new Set<unknown>()
	constNamesByValue = new Map<unknown, string>()
	declarationCounts: Record<DeclarationRole, number> = {
		shape: 0,
		keys: 0,
		literal: 0,
		config: 0
	}
	emitting = new Set<object>()
	moduleNamesByModule = new Map<object, string>()
	declarations: string[] = []
	links: string[] = []
	modules: string[] = []
	// a literal holding a validator is declared empty and filled once validators exist
	fills: string[] = []
	lateNames = new Set<string>()

	constructor(
		exports: Record<string, type.Any | Module>,
		params?: FactoryParam[]
	) {
		this.exports = exports
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
		this.unit = precompileByContent(this.roots)
		// a Type in a meta is emitted as its validator, so the unit needs its traversals
		while (this.collectMetaTypes()) this.unit = precompileByContent(this.roots)
		for (const root of this.roots)
			if (root.onFail) throwParseError(writeUnprecompilableMessage("onFail"))
		for (const context of this.unit.errorContexts)
			this.raisableCodes[context.code] = true
		this.runsFunctions = this.unit.declared.some(
			node => node.hasKind("predicate") || node.hasKind("morph")
		)
		for (let i = 0; i < this.unit.declared.length; i++) {
			const node = this.unit.declared[i]
			this.traversalIndexByName[this.unit.names[node.id]] = i
			if (node.hasKind("structure")) this.keyLookups.add(node.propsByKey)
			else if (node.hasKind("pattern")) this.patternInstances.add(node.instance)
			else if (
				node.hasKind("unit") &&
				hasDomain(node.unit, "object") &&
				!isDate(node.unit)
			)
				this.objectUnits.add(node.unit)
		}
		this.params = params
		if (params) this.receive(params)
	}

	// a factory checks the facts its code depends on in each hole, and compares each input with what the build read
	receive(params: FactoryParam[]): void {
		// a class's lineage is described by which of the others it extends
		const classIndices = params.flatMap((param, i) =>
			param.kind === "class" ? [i] : []
		)
		const classesOf = <v>(valueOf: (i: number) => v) =>
			Object.fromEntries(
				classIndices.map(i => [params[i].label, valueOf(i)] as const)
			)
		for (let i = 0; i < params.length; i++) {
			const param = params[i]
			if (param.kind === "input") {
				for (const [path, value] of param.reads)
					this.compareInput(`p${i}`, path, value, param.label)
				continue
			}
			if (param.kind === "helper") {
				this.checks.push(
					`runtime.checkHelper(p${i}, ${JSON.stringify(param.file)}, ${JSON.stringify(param.name)}, ${JSON.stringify(param.label)})`
				)
				continue
			}
			this.receiveHole(param.value, `p${i}`, param.label)
			const expected = runtime.describeHole(
				param.value,
				param.kind,
				classesOf(j => (params[j] as HoleParam).value)
			)
			const classesArg =
				param.kind === "class" ?
					`, { ${Object.entries(classesOf(j => `p${j}`))
						.map(([label, param]) => `${JSON.stringify(label)}: ${param}`)
						.join(", ")} }`
				:	""
			this.checks.push(
				`runtime.checkFacts(runtime.describeHole(p${i}, "${param.kind}"${classesArg}), ${JSON.stringify(expected)}, ${JSON.stringify(param.label)})`
			)
		}
		for (const hole of this.holeExpressions.keys()) {
			const name = typeof hole === "function" && functionNameOf(hole)
			if (name) this.holesByName[name] = hole
		}
		const names = Object.keys(this.holesByName)
		if (!names.length) return
		this.holeNamePattern = holeNamePatternOf(names)
		// a string that prints a hole's name is completed at creation, so neither compiled code nor an order may depend on it
		for (const name of names) {
			if (this.unit.source.includes(name)) {
				throwParseError(
					writeUnprecompilableMessage(
						`compiled code printing the name of ${this.labelsByHole.get(this.holesByName[name])}`
					)
				)
			}
		}
		for (const node of this.unit.declared) {
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

	receiveHole(hole: unknown, expression: string, label: string): void {
		if (this.holeExpressions.has(hole)) return
		this.holeExpressions.set(hole, expression)
		this.labelsByHole.set(hole, label)
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
			for (let i = 0; i < holes.length; i++)
				this.receiveHole(holes[i], `${holesName}[${i}]`, `${label}'s hole ${i}`)
			this.checks.push(
				`${holes.length ? `const ${holesName} = ` : ""}runtime.holesOf(${expression}, ${JSON.stringify(id)}, ${JSON.stringify(`Type<${value.expression}>`)}, ${JSON.stringify(label)})`
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

	// the hole whose name decides which of two hashes sorts first, if one does
	nameOrderingOf(l: string, r: string): unknown {
		let i = 0
		while (i < l.length && l[i] === r[i]) i++
		for (const hole of Object.values(this.holesByName)) {
			const reference = `.${nameOf(hole as Function)}"`
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

	collectExport(value: unknown, path: string): void {
		if (hasArkKind(value, "root")) return this.collectType(value)
		if (!hasArkKind(value, "module")) {
			return throwParseError(
				writeUnprecompilableMessage(
					hasArkKind(value, "generic") ?
						`the Generic ${path}`
					:	`the export ${path}`
				)
			)
		}
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
		for (const node of this.unit.declared)
			for (const v of Object.values(node.meta)) collect(v)
		return this.validatorNamesByRoot.size > typeCount
	}

	write(factories: StandaloneArtifact[]): string {
		const exported = Object.entries(this.exports).map(
			([name, value]) =>
				`export { ${this.exportOf(value)} as ${JSON.stringify(name)} }`
		)
		const sections = [
			`import * as runtime from "arktype/runtime"`,
			`runtime.assertRuntimeVersion(${JSON.stringify(arktypeVersion)})\nruntime.claimEntry("arktype/runtime")`,
			...(this.roots.length ? this.writeBody(`(${this.unit.source})`) : []),
			...factories.map((factory, i) => factory.writeFactory(i)),
			exported.join("\n")
		]
		return `${sections.filter(section => section).join("\n\n")}\n`
	}

	// each call creates its validator from the holes and inputs it receives, so it declares everything the validator holds
	writeFactory(index: number): string {
		const [[name, type]] = Object.entries(this.exports)
		const statements = [
			...this.checks,
			...this.writeBody(`unit${index}`),
			`return ${this.exportOf(type)}`
		]
		return `const unit${index} = ${this.unit.source}

const factory${index} = (${this.params!.map((_, i) => `p${i}`).join(", ")}) => {
${statements.filter(statement => statement).join("\n\n")}
}

export { factory${index} as ${JSON.stringify(name)} }`
	}

	writeBody(unit: string): string[] {
		const refs = this.unit.refs.map(value => this.emit(value))
		const errorContexts = this.unit.errorContexts.map(context =>
			this.emit(context)
		)
		const contextNamesByCopy: Record<string, string[]> = {}
		for (let i = 0; i < errorContexts.length; i++) {
			const copy = writeNodeContextCopy(this.unit.errorContexts[i])
			;(contextNamesByCopy[copy] ??= []).push(errorContexts[i])
		}
		const copies = Object.entries(contextNamesByCopy).map(
			([copy, names]) =>
				`runtime.copyNodeContexts((e, input) => {\n${copy}}, [${names.join(", ")}])`
		)
		const validators = [...this.validatorNamesByRoot].map(([root, name]) =>
			this.writeValidator(root, name)
		)
		return [
			this.declarations.join("\n"),
			copies.join("\n"),
			`const traversals = ${unit}([], [${refs.join(", ")}], [${errorContexts.join(", ")}])`,
			this.links.join("\n"),
			validators.join("\n\n"),
			this.modules.join("\n"),
			this.fills.join("\n")
		]
	}

	writeValidator(root: BaseRoot, name: string): string {
		const shape = this.shapeOf(root)
		const nodeName = this.unit.names[root.id]
		const [id, holes] = keyOf(root)
		const key = `,\n\t${JSON.stringify(id)}${holes.length ? `,\n\t[${holes.map(hole => this.emit(hole)).join(", ")}]` : ""}`
		return `const ${name} = new runtime.Validator(
	(function (${rootApplyParams.join(", ")}) {
		${writeRootApply(root, nodeName)}
	})(${shape}, ${this.configOf(root)}, ${Object.values(rootApplyRuntime)
		.map(value => this.emit(value))
		.join(", ")}),
	${shape},
	{ expression: ${this.emitString(root.expression)}, description: ${this.emitString(root.description)}, meta: ${this.emit(root.meta)} }${key}
)`
	}

	// a hole's name is known only at creation, so a string printing one is completed then with arktype's own printing
	emitString(s: string): string {
		return writeNamedString(
			s,
			this.holeNamePattern,
			name => this.holeExpressions.get(this.holesByName[name])!
		)
	}

	// a module is a plain object of validators, frozen like them
	exportOf(value: unknown): string {
		if (hasArkKind(value, "root")) return this.validatorNamesByRoot.get(value)!
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
			`const ${name} = runtime.freeze({ ${entries.join(", ")} })`
		)
		return name
	}

	declareConst(
		value: object,
		role: DeclarationRole,
		expression: string
	): string {
		const name = `${role}${this.declarationCounts[role]++}`
		this.constNamesByValue.set(value, name)
		this.declarations.push(`const ${name} = ${expression}`)
		return name
	}

	shapeOf(node: BaseNode): string {
		const declared = this.constNamesByValue.get(node)
		if (declared) return declared
		const name = this.declareConst(node, "shape", "{}")
		const traversals = `traversals[${this.traversalIndexByName[this.unit.names[node.id]]}]`
		const trackedName =
			this.unit.names[node.trackedId as NodeId] ??
			throwParseError(writeUnprecompilableMessage(`${node.expression}'s cycle`))
		// a discriminant's miss reads its union's description of the cases
		const discriminantDescription =
			node.hasKind("union") && node.compiledDiscriminant ?
				`,\n\tdiscriminantDescription: ${JSON.stringify(node.discriminantDescription)}`
			:	""
		this.links.push(`runtime.freeze(runtime.assign(${name}, {
	id: ${JSON.stringify(this.unit.names[node.id])},
	trackedId: ${JSON.stringify(trackedName)},
	isTransformedById: ${node.isTransformedById},
	includesAlias: ${node.includesAlias},
	transforms: ${node.transforms},
	allowsRequiresContext: ${node.allowsRequiresContext},
	allowsRequiresTraversal: ${node.allowsRequiresTraversal},
	traverseAllows: ${traversals}[0],
	traverseApply: ${traversals}[1],
	traverseTransform: ${traversals}[2],
	allows: ${node.allowsRequiresContext ? `data => runtime.allowsUntracked(${name}, data) ?? runtime.allowsInContext(${name}, data, runtime.runtimeConfig)` : `${traversals}[0]`},
	$: runtime.runtimeScope${discriminantDescription}
}))`)
		return name
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
		const declared = this.constNamesByValue.get(value)
		if (declared) return declared
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

	emitLiteral(value: object): string {
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
		if (!elements.some(element => this.lateNames.has(element)))
			return this.declareConst(value, "literal", `runtime.freeze(${literal})`)
		// assigning a __proto__ key to an object would set its prototype
		if (prototype === Object.prototype && keys.includes("__proto__")) {
			throwParseError(
				writeUnprecompilableMessage("a __proto__ key beside a Type")
			)
		}
		const name = this.declareConst(
			value,
			"literal",
			isArray ? "[]"
			: prototype === null ? "{ __proto__: null }"
			: "{}"
		)
		this.lateNames.add(name)
		this.fills.push(`runtime.freeze(runtime.assign(${name}, ${literal}))`)
		return name
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
		const declared = this.constNamesByValue.get(config)
		if (declared) return declared
		const configuredCodes: string[] = []
		let code: ArkErrorCode
		for (code in errorWritersByCode) {
			const writers: string[] = []
			for (const k of writerKeys) {
				const writer = config[code][k]
				if (writer === $ark.defaultConfig[code][k]) continue
				if (typeof writer === "string")
					writers.push(`${k}: ${JSON.stringify(writer)}`)
				else if (this.runsFunctions || this.raisableCodes[code]) {
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
		return configuredCodes.length ?
				this.declareConst(
					config,
					"config",
					`runtime.freeze({ ...runtime.runtimeConfig, ${configuredCodes.join(", ")} })`
				)
			:	"runtime.runtimeConfig"
	}
}

const { getTime } = Date.prototype

const getSource = Object.getOwnPropertyDescriptor(
	RegExp.prototype,
	"source"
)!.get!

// an object can have a builtin's prototype without being one, which only the builtin's methods can tell
const isBrandedBy = (value: object, method: () => unknown): boolean => {
	try {
		method.call(value)
		return true
	} catch {
		return false
	}
}

const isDateObject = (value: object): value is Date =>
	prototypeOf(value) === Date.prototype && isBrandedBy(value, getTime)

const isRegExpObject = (value: object): value is RegExp =>
	prototypeOf(value) === RegExp.prototype && isBrandedBy(value, getSource)

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

const keysByRoot = new WeakMap<BaseRoot, [id: string, holes: unknown[]]>()

// what any artifact keys a root's validator by: its content address, and the holes it holds in the order its code reads them
export const keyOf = (root: BaseRoot): [id: string, holes: unknown[]] => {
	const cached = keysByRoot.get(root)
	if (cached) return cached
	const unit = precompileByContent([root])
	const holes: unknown[] = []
	// a unit names a node by its content, keying a function or object only by where the unit first reaches it, so the address adds what each is
	const values: string[] = [unit.names[root.id]]
	const seen = new Set<unknown>()
	const collect = (value: unknown): void => {
		if (seen.has(value)) return
		seen.add(value)
		if (isHole(value)) {
			holes.push(value)
			values.push("hole")
		} else if (typeof value === "function" && !isNode(value))
			values.push(runtimePathsByValue.get(value) ?? functionNameOf(value))
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
	collect([unit.refs, unit.errorContexts, root.meta])
	const key: [string, unknown[]] = [hashOf(values.join("\n")), holes]
	keysByRoot.set(root, key)
	return key
}

const escapeRegex = (s: string) => s.replace(/[$()*+.?[\\\]^{|}]/g, "\\$&")

// how a string prints each hole named in it: as a predicate's description, a function's name in `Function(...)`, or its name alone
export const holeNamePatternOf = (names: string[]): RegExp => {
	const alternatives = names.map(escapeRegex).join("|")
	return new RegExp(
		`valid according to (${alternatives})|Function\\((${alternatives})\\)|(${alternatives})`,
		"g"
	)
}

// a string printing holes' names, as an expression completing it with arktype's own printing once the holes are received
export const writeNamedString = (
	s: string,
	pattern: RegExp | undefined,
	expressionOf: (name: string) => string
): string => {
	if (!pattern) return JSON.stringify(s)
	const parts: string[] = []
	let start = 0
	for (const match of s.matchAll(pattern)) {
		if (match.index > start)
			parts.push(JSON.stringify(s.slice(start, match.index)))
		const [, predicate, fn, name] = match
		const hole = expressionOf(predicate ?? fn ?? name)
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

export const writeUnprecompilableMessage = <value extends string>(
	value: value
): writeUnprecompilableMessage<value> =>
	`${value} can't be precompiled to a standalone validator`

export type writeUnprecompilableMessage<value extends string> =
	`${value} can't be precompiled to a standalone validator`
