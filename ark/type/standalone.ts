import {
	$ark,
	hasArkKind,
	isNode,
	precompileByContent,
	type ArkErrorCode,
	type BaseNode,
	type BaseRoot,
	type ContentUnit,
	type NodeId
} from "@ark/schema"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
	errorWritersByCode,
	rootApplyParams,
	rootApplyRuntime,
	writeRootApply
} from "@ark/schema/internal"
import {
	functionNameOf,
	hasDomain,
	isDate,
	printable,
	prototypeOf,
	serializePrimitive,
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
		if (Object.getPrototypeOf(value) === Object.prototype)
			for (const k in value) indexRuntime(value[k as never], `${path}.${k}`)
	}
}

// an artifact reads what the runtime exports from it rather than copying it
for (const name in runtime)
	indexRuntime(runtime[name as never], `runtime.${name}`)

/**
 * #### an ES module that exports each Type as a validator running on arktype/runtime alone, and each Module as an object of them
 */
export const precompileStandalone = (
	exports: Record<string, type.Any | Module>
): string => new StandaloneArtifact(exports).write()

export class StandaloneArtifact {
	exports: Record<string, type.Any | Module>
	validatorNamesByType = new Map<type.Any, string>()
	unit: ContentUnit
	// traversal raises these itself, and a predicate or morph can raise any code
	raisableCodes: { [code in ArkErrorCode]?: true } = {
		intersection: true,
		predicate: true,
		union: true,
		discriminant: true,
		undeclared: true
	}
	runsFunctions: boolean
	traversalIndexByName: Record<string, number> = {}
	propsByKeys = new Set<object>()
	objectUnits = new Set<unknown>()
	constNamesByValue = new Map<unknown, string>()
	emitting = new Set<object>()
	moduleNamesByModule = new Map<object, string>()
	declarations: string[] = []
	links: string[] = []
	modules: string[] = []

	constructor(exports: Record<string, type.Any | Module>) {
		this.exports = exports
		for (const value of Object.values(exports)) this.collectTypes(value)
		const roots = [...this.validatorNamesByType.keys()].map(t => t.internal)
		// the runtime writes only en
		const locale = $ark.config.locale
		if (locale !== undefined && locale !== $ark.defaultConfig.locale)
			throwParseError(writeUnprecompilableMessage("a configured locale"))
		for (const root of roots)
			if (root.onFail) throwParseError(writeUnprecompilableMessage("onFail"))
		this.unit = precompileByContent(roots)
		for (const context of this.unit.errorContexts)
			this.raisableCodes[(context as { code: ArkErrorCode }).code] = true
		this.runsFunctions = this.unit.declared.some(
			node => node.hasKind("predicate") || node.hasKind("morph")
		)
		for (let i = 0; i < this.unit.declared.length; i++) {
			const node = this.unit.declared[i]
			this.traversalIndexByName[this.unit.names[node.id]] = i
			if (node.hasKind("structure")) this.propsByKeys.add(node.propsByKey)
			else if (
				node.hasKind("unit") &&
				hasDomain(node.unit, "object") &&
				!isDate(node.unit)
			)
				this.objectUnits.add(node.unit)
		}
	}

	collectTypes(value: unknown): void {
		if (hasArkKind(value, "module"))
			for (const entry of Object.values(value)) this.collectTypes(entry)
		else if (hasArkKind(value, "generic"))
			throwParseError(writeUnprecompilableMessage("a Generic"))
		else if (!this.validatorNamesByType.has(value as type.Any)) {
			this.validatorNamesByType.set(
				value as type.Any,
				`validator${this.validatorNamesByType.size}`
			)
		}
	}

	write(): string {
		const refs = this.unit.refs.map(value => this.emit(value))
		const errorContexts = this.unit.errorContexts.map(context =>
			this.emit(context)
		)
		const validators = [...this.validatorNamesByType].map(([t, name]) =>
			this.writeValidator(t.internal, name)
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
		if (!hasArkKind(value, "module"))
			return this.validatorNamesByType.get(value as type.Any)!
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
		this.links.push(`runtime.assign(${name}, {
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
	$: { resolvedConfig: runtime.runtimeConfig }${discriminantDescription}
})`)
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
			return globalThis[name as never] === value ?
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
		if (this.propsByKeys.has(value)) {
			const keys = Reflect.ownKeys(value)
			if (keys.some(k => typeof k === "symbol"))
				throwParseError(writeUnprecompilableMessage("a symbol key"))
			return this.declareConst(
				value,
				`{ __proto__: null, ${keys.map(k => `[${JSON.stringify(k)}]: 1`).join(", ")} }`
			)
		}
		if (this.emitting.has(value))
			return throwParseError(writeUnprecompilableMessage("a cyclic object"))
		const prototype = prototypeOf(value)
		const keys = Reflect.ownKeys(value)
		if (prototype === Date.prototype && keys.length === 0)
			return this.declareConst(value, `new Date(${(value as Date).getTime()})`)
		if (prototype === RegExp.prototype && keys.length === 1) {
			const { source, flags, lastIndex } = value as RegExp
			const regex = `new RegExp(${JSON.stringify(source)}, ${JSON.stringify(flags)})`
			return this.declareConst(
				value,
				lastIndex ?
					`runtime.assign(${regex}, { lastIndex: ${lastIndex} })`
				:	regex
			)
		}
		const isArrayLiteral = prototype === Array.prototype
		const isFrozen = Object.isFrozen(value)
		const propKeys = isArrayLiteral ? keys.filter(k => k !== "length") : keys
		// a literal has its value's prototype and frozenness, and only enumerable data properties
		const isReproducible =
			(isArrayLiteral ?
				propKeys.length === (value as unknown[]).length &&
				propKeys.every((k, i) => k === `${i}`)
			:	prototype === Object.prototype || prototype === null) &&
			(isFrozen || Object.isExtensible(value)) &&
			propKeys.every(k => {
				const descriptor = Object.getOwnPropertyDescriptor(value, k)!
				return (
					typeof k === "string" &&
					descriptor.enumerable &&
					"value" in descriptor &&
					(isFrozen || (descriptor.writable && descriptor.configurable))
				)
			})
		if (!isReproducible) {
			throwParseError(
				writeUnprecompilableMessage(`${printable(value)}'s properties`)
			)
		}
		this.emitting.add(value)
		const literal =
			isArrayLiteral ?
				`[${(value as unknown[]).map(v => this.emit(v)).join(", ")}]`
			:	`{ ${prototype === null ? "__proto__: null, " : ""}${propKeys
					.map(k => `[${JSON.stringify(k)}]: ${this.emit(value[k as never])}`)
					.join(", ")} }`
		this.emitting.delete(value)
		return this.declareConst(
			value,
			isFrozen ? `runtime.freeze(${literal})` : literal
		)
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
					`${code}: { ...runtime.runtimeConfig.${code}, ${writers.join(", ")} }`
				)
			}
		}
		return configuredCodes.length ?
				this.declareConst(
					config,
					`{ ...runtime.runtimeConfig, ${configuredCodes.join(", ")} }`
				)
			:	"runtime.runtimeConfig"
	}
}

export const writeUnprecompilableMessage = <value extends string>(
	value: value
): writeUnprecompilableMessage<value> =>
	`${value} can't be precompiled to a standalone validator`

export type writeUnprecompilableMessage<value extends string> =
	`${value} can't be precompiled to a standalone validator`
