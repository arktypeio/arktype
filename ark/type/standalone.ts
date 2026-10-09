import {
	$ark,
	hasArkKind,
	isNode,
	precompileByContent,
	type ArkErrorCode,
	type BaseNode,
	type BaseRoot,
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

/**
 * #### an ES module that exports each Type as a validator running on arktype/runtime alone, and each Module as an object of them
 */
export const precompileStandalone = (
	exports: Record<string, type.Any | Module>
): string => {
	const types = new Map<type.Any, string>()
	const collectTypes = (value: unknown): void => {
		if (hasArkKind(value, "module"))
			for (const entry of Object.values(value)) collectTypes(entry)
		else if (hasArkKind(value, "generic"))
			throwParseError(writeUnprecompilableMessage("a Generic"))
		else if (!types.has(value as type.Any))
			types.set(value as type.Any, `validator${types.size}`)
	}
	for (const value of Object.values(exports)) collectTypes(value)
	const roots = [...types.keys()].map(t => t.internal)
	// the runtime writes only en
	const locale = $ark.config.locale
	if (locale !== undefined && locale !== $ark.defaultConfig.locale)
		throwParseError(writeUnprecompilableMessage("a configured locale"))
	for (const root of roots)
		if (root.onFail) throwParseError(writeUnprecompilableMessage("onFail"))
	const unit = precompileByContent(roots)
	// traversal raises these itself, and a predicate or morph can raise any code
	const raisableCodes: { [code in ArkErrorCode]?: true } = {
		intersection: true,
		predicate: true,
		union: true,
		discriminant: true,
		undeclared: true
	}
	for (const context of unit.errorContexts)
		raisableCodes[(context as { code: ArkErrorCode }).code] = true
	const runsFunctions = unit.declared.some(
		node => node.hasKind("predicate") || node.hasKind("morph")
	)
	const traversalIndexByName: Record<string, number> = {}
	const propsByKeys = new Set<object>()
	const objectUnits = new Set<unknown>()
	for (let i = 0; i < unit.declared.length; i++) {
		const node = unit.declared[i]
		traversalIndexByName[unit.names[node.id]] = i
		if (node.hasKind("structure")) propsByKeys.add(node.propsByKey)
		else if (
			node.hasKind("unit") &&
			hasDomain(node.unit, "object") &&
			!isDate(node.unit)
		)
			objectUnits.add(node.unit)
	}
	const runtimePathsByValue = new Map<unknown, string>()
	const indexRuntime = (value: unknown, path: string): void => {
		if (typeof value === "function") runtimePathsByValue.set(value, path)
		else if (hasDomain(value, "object")) {
			runtimePathsByValue.set(value, path)
			if (Object.getPrototypeOf(value) === Object.prototype)
				for (const k in value) indexRuntime(value[k as never], `${path}.${k}`)
		}
	}
	for (const name in runtime)
		indexRuntime(runtime[name as never], `runtime.${name}`)

	const declarations: string[] = []
	const links: string[] = []
	const constNamesByValue = new Map<unknown, string>()
	const emitting = new Set<object>()
	const declareConst = (value: object, expression: string): string => {
		const name = `o${constNamesByValue.size}`
		constNamesByValue.set(value, name)
		declarations.push(`const ${name} = ${expression}`)
		return name
	}

	const shapeOf = (node: BaseNode): string => {
		const declared = constNamesByValue.get(node)
		if (declared) return declared
		const name = declareConst(node, "{}")
		const traversals = `traversals[${traversalIndexByName[unit.names[node.id]]}]`
		const trackedName =
			unit.names[node.trackedId as NodeId] ??
			throwParseError(writeUnprecompilableMessage(`${node.expression}'s cycle`))
		// a discriminant's miss reads its union's description of the cases
		const discriminantDescription =
			node.hasKind("union") && node.compiledDiscriminant ?
				`,\n\tdiscriminantDescription: ${JSON.stringify(node.discriminantDescription)}`
			:	""
		links.push(`Object.assign(${name}, {
	id: ${JSON.stringify(unit.names[node.id])},
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

	const emit = (value: unknown): string => {
		if (typeof value === "symbol")
			return throwParseError(writeUnprecompilableMessage(printable(value)))
		if (!hasDomain(value, "object"))
			return Object.is(value, -0) ? "-0" : serializePrimitive(value as never)
		const runtimePath = runtimePathsByValue.get(value)
		if (runtimePath) return runtimePath
		const declared = constNamesByValue.get(value)
		if (declared) return declared
		if (isNode(value)) {
			return value.isRoot() ?
					shapeOf(value)
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
		if (objectUnits.has(value)) {
			throwParseError(
				writeUnprecompilableMessage(`the unit ${printable(value)}`)
			)
		}
		// a structure's keys are read only with `in`, so they're emitted without their props
		if (propsByKeys.has(value)) {
			const keys = Reflect.ownKeys(value)
			if (keys.some(k => typeof k === "symbol"))
				throwParseError(writeUnprecompilableMessage("a symbol key"))
			return declareConst(
				value,
				`{ __proto__: null, ${keys.map(k => `[${JSON.stringify(k)}]: 1`).join(", ")} }`
			)
		}
		if (emitting.has(value))
			return throwParseError(writeUnprecompilableMessage("a cyclic object"))
		const prototype = prototypeOf(value)
		const keys = Reflect.ownKeys(value)
		if (prototype === Date.prototype && keys.length === 0)
			return declareConst(value, `new Date(${(value as Date).getTime()})`)
		if (prototype === RegExp.prototype && keys.length === 1) {
			const { source, flags, lastIndex } = value as RegExp
			const regex = `new RegExp(${JSON.stringify(source)}, ${JSON.stringify(flags)})`
			return declareConst(
				value,
				lastIndex ?
					`Object.assign(${regex}, { lastIndex: ${lastIndex} })`
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
		emitting.add(value)
		const literal =
			isArrayLiteral ?
				`[${(value as unknown[]).map(emit).join(", ")}]`
			:	`{ ${prototype === null ? "__proto__: null, " : ""}${propKeys
					.map(k => `[${JSON.stringify(k)}]: ${emit(value[k as never])}`)
					.join(", ")} }`
		emitting.delete(value)
		return declareConst(value, isFrozen ? `Object.freeze(${literal})` : literal)
	}

	const configOf = (root: BaseRoot): string => {
		const config = root.$.resolvedConfig
		const declared = constNamesByValue.get(config)
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
				else if (runsFunctions || raisableCodes[code]) {
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
				declareConst(
					config,
					`{ ...runtime.runtimeConfig, ${configuredCodes.join(", ")} }`
				)
			:	"runtime.runtimeConfig"
	}

	const refs = unit.refs.map(emit)
	const errorContexts = unit.errorContexts.map(emit)
	const validators = [...types].map(([t, name]) => {
		const root: BaseRoot = t.internal
		const shape = shapeOf(root)
		return `const ${name} = new runtime.Validator(
	(function (${rootApplyParams.join(", ")}) {
		${writeRootApply(root, unit.names[root.id])}
	})(${shape}, ${configOf(root)}, ${Object.values(rootApplyRuntime).map(emit).join(", ")}),
	${shape},
	{ expression: ${JSON.stringify(root.expression)}, description: ${JSON.stringify(root.description)}, meta: ${emit(root.meta)} }
)`
	})
	const moduleNames = new Map<object, string>()
	const modules: string[] = []
	// a module is a plain object of validators, frozen like them
	const exportOf = (value: unknown): string => {
		if (!hasArkKind(value, "module")) return types.get(value as type.Any)!
		const declared = moduleNames.get(value)
		if (declared) return declared
		const entries = Object.entries(value).map(
			([k, entry]) => `[${JSON.stringify(k)}]: ${exportOf(entry)}`
		)
		const name = `module${moduleNames.size}`
		moduleNames.set(value, name)
		modules.push(`const ${name} = Object.freeze({ ${entries.join(", ")} })`)
		return name
	}
	const exported = Object.entries(exports).map(
		([name, value]) =>
			`export { ${exportOf(value)} as ${JSON.stringify(name)} }`
	)
	return `import * as runtime from "arktype/runtime"

runtime.assertRuntimeVersion(${JSON.stringify(arktypeVersion)})
runtime.claimEntry("arktype/runtime")

${declarations.join("\n")}

const traversals = (${unit.source})([], [${refs.join(", ")}], [${errorContexts.join(", ")}])

${links.join("\n")}

${validators.join("\n\n")}

${modules.join("\n")}

${exported.join("\n")}
`
}

export const writeUnprecompilableMessage = <value extends string>(
	value: value
): writeUnprecompilableMessage<value> =>
	`${value} can't be precompiled to a standalone validator`

export type writeUnprecompilableMessage<value extends string> =
	`${value} can't be precompiled to a standalone validator`
