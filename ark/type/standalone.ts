import {
	$ark,
	hasArkKind,
	isNode,
	precompileByContent,
	type ArkErrorCode,
	type BaseNode,
	type BaseRoot,
	type ContentUnit,
	type DefaultedNode,
	type NodeId,
	type NodeKind,
	type Optional,
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

// what an artifact exports as it is, rather than creating it in a factory
type ExportedValue = type.Any | Module | Scope<any> | Generic

export type StandaloneExport = ExportedValue | StandaloneFactory

export interface StandaloneFactory {
	type: type.Any
	params: FactoryParam[]
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

/**
 * #### an ES module exporting, for each Type, a function returning its validator, which runs on arktype/runtime alone, for each Module one returning an object of them, and for each Scope or Generic one returning a value whose members throw, all created on the first call; and for each factory a function creating its validator from what it receives
 */
export const precompileStandalone = (
	exports: Record<string, StandaloneExport>,
	configured?: ConfiguredModule,
	// where each export was defined, which a Scope or Generic it holds names when used
	sitesByName?: Record<string, string>
): string => {
	const types: Record<string, ExportedValue> = {}
	const factories: StandaloneArtifact[] = []
	for (const [name, value] of Object.entries(exports)) {
		if (arkKindOf(value) !== undefined) types[name] = value as never
		else {
			const { type, params } = value as StandaloneFactory
			factories.push(new StandaloneArtifact({ [name]: type }, params))
		}
	}
	return new StandaloneArtifact(types).write(factories, configured, sitesByName)
}

export const writeFixConfig = (
	configured: ConfiguredModule | undefined
): string =>
	`runtime.fixConfig(${configured ? `${JSON.stringify(configured.fingerprint)}, ${JSON.stringify(configured.path)}` : ""})`

export class StandaloneArtifact {
	exports: Record<string, ExportedValue>
	params: FactoryParam[] | undefined
	holeExpressions = new Map<unknown, string>()
	labelsByHole = new Map<unknown, string>()
	classes = new Set<unknown>()
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
	defaultsByMorph = new Map<unknown, Default>()
	objectUnits = new Set<unknown>()
	constNamesByValue = new Map<unknown, string>()
	declarationCounts: Record<DeclarationRole, number> = {
		shape: 0,
		keys: 0,
		literal: 0,
		config: 0,
		unavailable: 0
	}
	emitting = new Set<object>()
	moduleNamesByModule = new Map<object, string>()
	declarations: string[] = []
	links: string[] = []
	modules: string[] = []
	// a literal holding a validator is declared empty and filled once validators exist
	fills: string[] = []
	// each default's morph, created once the validator applying its value exists
	defaults: string[] = []
	lateNames = new Set<string>()

	constructor(exports: Record<string, ExportedValue>, params?: FactoryParam[]) {
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
		for (const root of this.roots) {
			// the runtime's own onFail is the one the program configures
			if (root.onFail !== $ark.resolvedConfig!.onFail)
				throwParseError(writeUnprecompilableMessage("onFail"))
		}
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
			else if (node.hasKind("optional") || node.hasKind("sequence"))
				collectDefaults(node, this.defaultsByMorph)
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
			} else {
				this.receiveHole(param.value, `p${i}`, param.label)
				checked.push([param.value, param.kind, `p${i}`])
				if (param.kind === "class") this.classes.add(param.value)
			}
		}
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
		for (const hole of this.holeExpressions.keys()) {
			if (
				typeof hole === "function" &&
				!functionNameOf(hole).startsWith(holeNamePrefix)
			) {
				throwInternalError(
					`Unexpected function ${this.labelsByHole.get(hole)} not named by a placeholder`
				)
			}
		}
		// a string that prints a hole's name is completed at creation, so neither compiled code nor an order may depend on it
		const printed = this.unit.source.match(holeNamePattern)
		if (printed) {
			throwParseError(
				writeUnprecompilableMessage(
					`compiled code printing the name of ${this.labelOfName(printed[0])}`
				)
			)
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

	holeNamed(name: string): unknown {
		for (const hole of this.holeExpressions.keys()) {
			if (typeof hole === "function" && functionNameOf(hole) === name)
				return hole
		}
	}

	labelOfName(name: string): string {
		return this.labelsByHole.get(this.holeNamed(name)) ?? name
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
			const protos = [value, ...value.references].flatMap(node =>
				node.hasKind("proto") ? [node.proto] : []
			)
			for (let i = 0; i < holes.length; i++) {
				this.receiveHole(holes[i], `${holesName}[${i}]`, `${label}'s hole ${i}`)
				if (protos.includes(holes[i] as never)) this.classes.add(holes[i])
			}
			this.checks.push(
				`${holes.length ? `const ${holesName} = ` : ""}runtime.holesOf(${expression}, ${JSON.stringify(id)}, ${JSON.stringify(
					// the names of its holes are known only once it's received
					value.expression.includes(holeNamePrefix) ?
						"the Type it was at build"
					:	`Type<${value.expression}>`
				)}, ${JSON.stringify(label)})`
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
		for (const node of this.unit.declared)
			for (const v of Object.values(node.meta)) collect(v)
		return this.validatorNamesByRoot.size > typeCount
	}

	// a site reading what the artifact exports creates it when the site is first evaluated, where arktype would fix its configuration
	write(
		factories: StandaloneArtifact[],
		configured: ConfiguredModule | undefined,
		sitesByName?: Record<string, string>
	): string {
		const names = Object.keys(this.exports)
		const sections = [
			`import * as runtime from "arktype/runtime"`,
			`runtime.assertRuntimeVersion(${JSON.stringify(arktypeVersion)})\nruntime.claimEntry("arktype/runtime")`,
			names.length ? this.writeCreate(names, configured, sitesByName) : "",
			...factories.map((factory, i) => factory.writeFactory(i, configured)),
			names
				.map(
					(name, i) =>
						`const get${i} = () => (created ??= create())[${i}]\nexport { get${i} as ${JSON.stringify(name)} }`
				)
				.join("\n")
		]
		return `${sections.filter(section => section).join("\n\n")}\n`
	}

	writeCreate(
		names: string[],
		configured: ConfiguredModule | undefined,
		sitesByName: Record<string, string> | undefined
	): string {
		const values = names.map(name => {
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
				this.writeBody(`(${this.unit.source})`)
			:	[this.declarations.join("\n"), this.modules.join("\n")]),
			`return [${values.join(", ")}]`
		]
		return `let created

const create = () => {
${statements.filter(statement => statement).join("\n\n")}
}`
	}

	// each call creates its validator from the holes and inputs it receives, so it declares everything the validator holds
	writeFactory(
		index: number,
		configured: ConfiguredModule | undefined
	): string {
		const [[name, type]] = Object.entries(this.exports)
		const statements = [
			writeFixConfig(configured),
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
			this.defaults.join("\n"),
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
				this.constNamesByValue.get(value) ??
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
				// the runtime's config holds the defaults and the writers the program configures
				if (writer === $ark.resolvedConfig![code][k]) continue
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

const keysByRoot = new WeakMap<BaseRoot, [id: string, holes: unknown[]]>()

export const keyOf = (root: BaseRoot): [id: string, holes: unknown[]] => {
	const cached = keysByRoot.get(root)
	if (cached) return cached
	const unit = precompileByContent([root])
	const defaultsByMorph = new Map<unknown, Default>()
	for (const node of unit.declared) {
		if (node.hasKind("optional") || node.hasKind("sequence"))
			collectDefaults(node, defaultsByMorph)
	}
	const holes: unknown[] = []
	// a unit keys a function or object only by where it first reaches it, so the address adds what each is
	const values: string[] = [unit.names[root.id]]
	const seen = new Set<unknown>()
	const collect = (value: unknown): void => {
		if (seen.has(value)) return
		seen.add(value)
		const defaulted = defaultsByMorph.get(value)
		if (defaulted) {
			values.push("default")
			collect(defaulted[2])
		} else if (isHole(value)) {
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

export const holeNamePrefix = "$hole_"

export const holeNamePattern = /\$hole_[\da-z]+/g

const printedHoleNamePattern =
	/valid according to (\$hole_[\da-z]+)|Function\((\$hole_[\da-z]+)\)|(\$hole_[\da-z]+)/g

export const writeUnprecompilableMessage = <value extends string>(
	value: value
): writeUnprecompilableMessage<value> =>
	`${value} can't be precompiled to a standalone validator`

export type writeUnprecompilableMessage<value extends string> =
	`${value} can't be precompiled to a standalone validator`
