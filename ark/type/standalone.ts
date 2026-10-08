import {
	$ark,
	isNode,
	precompileByContent,
	type ArkErrorCode,
	type BaseNode,
	type BaseRoot,
	type NodeId
} from "@ark/schema"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
	rootApplyParams,
	rootApplyRuntime,
	writeRootApply
} from "@ark/schema/internal"
import {
	hasDomain,
	isArray,
	printable,
	serializePrimitive,
	throwError
} from "@ark/util"
import type { type } from "./keywords/keywords.ts"
import * as runtime from "./runtime.ts"

const writerKeys = ["expected", "actual", "problem", "message"] as const

/**
 * #### an ES module that exports each Type as a validator running on arktype/runtime alone
 */
export const precompileStandalone = (
	types: Record<string, type.Any>
): string => {
	const roots = Object.values(types).map(t => t.internal)
	// the runtime writes only en
	const locale = $ark.config.locale
	if (locale !== undefined && locale !== $ark.defaultConfig.locale)
		throwError(writeUnprecompilableMessage("a configured locale"))
	for (const root of roots) {
		const config = root.$.resolvedConfig
		for (const code in $ark.defaultConfig) {
			for (const k of writerKeys) {
				const writer = (config[code as ArkErrorCode] as never)?.[k]
				if (writer !== $ark.defaultConfig[code as ArkErrorCode]?.[k as never])
					throwError(writeUnprecompilableMessage(`a configured ${code} ${k}`))
			}
		}
		if (root.onFail) throwError(writeUnprecompilableMessage("onFail"))
	}
	const unit = precompileByContent(roots)
	const memberNames = [...new Set(Object.values(unit.names))]
	const propsByKeys = new Set<object>()
	const objectUnits = new Set<unknown>()
	const reached = new Set<BaseNode>()
	const collect = (node: BaseNode): void => {
		for (const reference of node.references) {
			if (reached.has(reference)) continue
			reached.add(reference)
			if (reference.hasKind("structure")) propsByKeys.add(reference.propsByKey)
			else if (
				reference.hasKind("unit") &&
				hasDomain(reference.unit, "object") &&
				!(reference.unit instanceof Date)
			)
				objectUnits.add(reference.unit)
			else if (reference.hasKind("alias")) collect(reference.resolution)
		}
	}
	for (const root of roots) collect(root)
	const runtimeNamesByValue = new Map<unknown, string>()
	const indexRuntime = (value: unknown, path: string): void => {
		if (typeof value === "function") runtimeNamesByValue.set(value, path)
		else if (hasDomain(value, "object")) {
			runtimeNamesByValue.set(value, path)
			if (Object.getPrototypeOf(value) === Object.prototype)
				for (const k in value) indexRuntime(value[k as never], `${path}.${k}`)
		}
	}
	for (const name in runtime) indexRuntime(runtime[name as never], name)

	const imports = new Set([
		"assertAbiVersion",
		"claimEntry",
		"runtimeConfig",
		"Validator"
	])
	const declarations: string[] = []
	const links: string[] = []
	const constNamesByValue = new Map<unknown, string>()
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
		const traversals = `traversals[${memberNames.indexOf(unit.names[node.id])}]`
		const trackedName =
			unit.names[node.trackedId as NodeId] ??
			throwError(writeUnprecompilableMessage(`${node.expression}'s cycle`))
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
	allows: ${node.allowsRequiresContext ? `data => allowsUntracked(${name}, data) ?? allowsInContext(${name}, data, runtimeConfig)` : `${traversals}[0]`},
	$: { resolvedConfig: runtimeConfig }${discriminantDescription}
})`)
		return name
	}

	const emit = (value: unknown): string => {
		if (typeof value === "symbol")
			return throwError(writeUnprecompilableMessage(printable(value)))
		if (!hasDomain(value, "object"))
			return Object.is(value, -0) ? "-0" : serializePrimitive(value as never)
		const runtimeName = runtimeNamesByValue.get(value)
		if (runtimeName) {
			imports.add(runtimeName.split(".")[0])
			return runtimeName
		}
		const declared = constNamesByValue.get(value)
		if (declared) return declared
		if (isNode(value)) {
			return value.isRoot() ?
					shapeOf(value)
				:	throwError(
						writeUnprecompilableMessage(`${value.kind} ${value.expression}`)
					)
		}
		if (typeof value === "function") {
			return globalThis[value.name as never] === value ?
					value.name
				:	throwError(writeUnprecompilableMessage(printable(value)))
		}
		// a unit is compared by reference, so a copy wouldn't equal it
		if (objectUnits.has(value))
			throwError(writeUnprecompilableMessage(`the unit ${printable(value)}`))
		// a structure's keys are read only with `in`, so they're emitted without their props
		if (propsByKeys.has(value as object)) {
			const keys = Reflect.ownKeys(value as object)
			if (keys.some(k => typeof k === "symbol"))
				throwError(writeUnprecompilableMessage("a symbol key"))
			return declareConst(
				value as object,
				`{ __proto__: null, ${keys.map(k => `[${JSON.stringify(k)}]: 1`).join(", ")} }`
			)
		}
		if (value instanceof Date)
			return declareConst(value, `new Date(${value.getTime()})`)
		if (value instanceof RegExp) {
			return declareConst(
				value,
				`new RegExp(${JSON.stringify(value.source)}, ${JSON.stringify(value.flags)})`
			)
		}
		if (isArray(value)) {
			if (Object.getPrototypeOf(value) !== Array.prototype)
				throwError(writeUnprecompilableMessage(printable(value)))
			return declareConst(value, `[${value.map(emit).join(", ")}]`)
		}
		const prototype = typeof value === "object" && Object.getPrototypeOf(value)
		if (
			prototype !== Object.prototype ||
			Object.getOwnPropertySymbols(value).length
		)
			return throwError(writeUnprecompilableMessage(printable(value)))
		const entries = Object.entries(value).map(
			([k, v]) =>
				`${k === "__proto__" ? `["__proto__"]` : JSON.stringify(k)}: ${emit(v)}`
		)
		const literal = `{ ${entries.join(", ")} }`
		return declareConst(
			value,
			Object.isFrozen(value) ? `Object.freeze(${literal})` : literal
		)
	}

	const refs = unit.refs.map(emit)
	const errorContexts = unit.errorContexts.map(emit)
	const exports = Object.entries(types).map(([name, t], i) => {
		const root: BaseRoot = t.internal
		const shape = shapeOf(root)
		return `const validator${i} = new Validator(
	(function (${rootApplyParams.join(", ")}) {
		${writeRootApply(root, unit.names[root.id])}
	})(${shape}, runtimeConfig, ${Object.values(rootApplyRuntime).map(emit).join(", ")}),
	${shape},
	{ expression: ${JSON.stringify(root.expression)}, description: ${JSON.stringify(root.description)}, meta: ${emit(root.meta)} }
)
export { validator${i} as ${JSON.stringify(name)} }`
	})
	for (const name of ["allowsInContext", "allowsUntracked"]) imports.add(name)
	return `import { ${[...imports].sort().join(", ")} } from "arktype/runtime"

assertAbiVersion(${runtime.abiVersion})
claimEntry("arktype/runtime")

${declarations.join("\n")}

const traversals = (${unit.source})([], [${refs.join(", ")}], [${errorContexts.join(", ")}])

${links.join("\n")}

${exports.join("\n\n")}
`
}

export const writeUnprecompilableMessage = <value extends string>(
	value: value
): writeUnprecompilableMessage<value> =>
	`${value} can't be precompiled to a standalone validator`

export type writeUnprecompilableMessage<value extends string> =
	`${value} can't be precompiled to a standalone validator`
