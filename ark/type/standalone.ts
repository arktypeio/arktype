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
	writeRootApply
} from "@ark/schema/internal"
import {
	appendStringifiedKey,
	constructorNameOf,
	functionNameOf,
	hasDomain,
	isDate,
	printable,
	prototypeOf,
	serializePrimitive,
	throwInternalError,
	throwParseError
} from "@ark/util"
import { arktypeVersion } from "./entry.ts"
import type { type } from "./keywords/keywords.ts"
import type { Module } from "./module.ts"
import * as runtime from "./runtime.ts"

const writerKeys = ["expected", "actual", "problem", "message"] as const

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

/**
 * #### an ES module that exports each Type as a validator running on arktype/runtime alone, and each Module as an object of them
 */
export const precompileStandalone = (
	exports: Record<string, type.Any | Module>
): string => new StandaloneArtifact(exports).write()

export class StandaloneArtifact {
	exports: Record<string, type.Any | Module>
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
	objectUnits = new Set<unknown>()
	constNamesByValue = new Map<unknown, string>()
	emitting = new Set<object>()
	moduleNamesByModule = new Map<object, string>()
	declarations: string[] = []
	links: string[] = []
	modules: string[] = []
	// a literal holding a validator is declared empty and filled once validators exist
	fills: string[] = []
	lateNames = new Set<string>()

	constructor(exports: Record<string, type.Any | Module>) {
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
			else if (
				node.hasKind("unit") &&
				hasDomain(node.unit, "object") &&
				!isDate(node.unit)
			)
				this.objectUnits.add(node.unit)
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

	write(): string {
		const refs = this.unit.refs.map(value => this.emit(value))
		const errorContexts = this.unit.errorContexts.map(context =>
			this.emit(context)
		)
		const validators = [...this.validatorNamesByRoot].map(([root, name]) =>
			this.writeValidator(root, name)
		)
		const exported = Object.entries(this.exports).map(
			([name, value]) =>
				`export { ${this.exportOf(value)} as ${JSON.stringify(name)} }`
		)
		return `import * as runtime from "arktype/runtime"

runtime.assertRuntimeVersion(${JSON.stringify(arktypeVersion)})
runtime.claimEntry("arktype/runtime")

${this.declarations.join("\n")}

const traversals = (${this.unit.source})([], [${refs.join(", ")}], [${errorContexts.join(", ")}])

${this.links.join("\n")}

${validators.join("\n\n")}

${this.modules.join("\n")}

${this.fills.join("\n")}

${exported.join("\n")}
`
	}

	writeValidator(root: BaseRoot, name: string): string {
		const shape = this.shapeOf(root)
		return `const ${name} = new runtime.Validator(
	(function (${rootApplyParams.join(", ")}) {
		${writeRootApply(root, this.unit.names[root.id])}
	})(${shape}, ${this.configOf(root)}, ${Object.values(rootApplyRuntime)
		.map(value => this.emit(value))
		.join(", ")}),
	${shape},
	{ expression: ${JSON.stringify(root.expression)}, description: ${JSON.stringify(root.description)}, meta: ${this.emit(root.meta)} }
)`
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

	declareConst(value: object, expression: string): string {
		const name = `o${this.constNamesByValue.size}`
		this.constNamesByValue.set(value, name)
		this.declarations.push(`const ${name} = ${expression}`)
		return name
	}

	shapeOf(node: BaseNode): string {
		const declared = this.constNamesByValue.get(node)
		if (declared) return declared
		const name = this.declareConst(node, "{}")
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
		if (typeof value === "symbol")
			return throwParseError(writeUnprecompilableMessage(printable(value)))
		if (!hasDomain(value, "object"))
			return Object.is(value, -0) ? "-0" : serializePrimitive(value as never)
		const runtimePath = runtimePathsByValue.get(value)
		if (runtimePath) return runtimePath
		const declared = this.constNamesByValue.get(value)
		if (declared) return declared
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
		// a unit is compared by reference, so a copy wouldn't equal it
		if (this.objectUnits.has(value)) {
			throwParseError(
				writeUnprecompilableMessage(`the unit ${printable(value)}`)
			)
		}
		// a structure's keys are read only with `in`, so they're emitted without their props
		if (this.keyLookups.has(value)) {
			const keys = Reflect.ownKeys(value)
			if (keys.some(k => typeof k === "symbol"))
				throwParseError(writeUnprecompilableMessage("a symbol key"))
			return this.declareConst(
				value,
				`runtime.freeze({ __proto__: null, ${keys.map(k => `[${JSON.stringify(k)}]: 1`).join(", ")} })`
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
			// its methods write lastIndex, so it's kept from growing rather than frozen
			return this.declareConst(
				value,
				`runtime.preventExtensions(${value.lastIndex ? `runtime.assign(${regex}, { lastIndex: ${value.lastIndex} })` : regex})`
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
		const literal =
			isArray ?
				`[${elements.join(", ")}]`
			:	`{ ${prototype === null ? "__proto__: null, " : ""}${keys
					.map((k, i) => `[${JSON.stringify(k)}]: ${elements[i]}`)
					.join(", ")} }`
		if (!elements.some(element => this.lateNames.has(element)))
			return this.declareConst(value, `runtime.freeze(${literal})`)
		// assigning a __proto__ key to an object would set its prototype
		if (prototype === Object.prototype && keys.includes("__proto__")) {
			throwParseError(
				writeUnprecompilableMessage("a __proto__ key beside a Type")
			)
		}
		const name = this.declareConst(
			value,
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
		return isNode(value) && value.isRoot() ?
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

export const writeUnprecompilableMessage = <value extends string>(
	value: value
): writeUnprecompilableMessage<value> =>
	`${value} can't be precompiled to a standalone validator`

export type writeUnprecompilableMessage<value extends string> =
	`${value} can't be precompiled to a standalone validator`
