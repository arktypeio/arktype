import { printable, throwParseError, unset, type Primitive } from "@ark/util"
import type { BaseRoot } from "../roots/root.ts"
import type { declareNode } from "../shared/declare.ts"
import { ArkErrors } from "../shared/errors.ts"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
import { BaseProp, intersectProps, type Prop } from "./prop.ts"

export declare namespace Optional {
	export interface Schema extends Prop.Schema {
		default?: unknown
	}

	export interface Inner extends Prop.Inner {
		default?: unknown
	}

	export type Declaration = declareNode<
		Prop.Declaration<"optional"> & {
			schema: Schema
			normalizedSchema: Schema
			inner: Inner
		}
	>

	export type Node = OptionalNode
}

const implementation: nodeImplementationOf<Optional.Declaration> =
	implementNode<Optional.Declaration>({
		kind: "optional",
		hasAssociatedError: false,
		intersectionIsOpen: true,
		keys: {
			key: {},
			value: {
				child: true,
				parse: (schema, ctx) => ctx.$.parseSchema(schema)
			},
			default: {
				preserveUndefined: true
			}
		},
		// safe to spread here as a node will never be passed to normalize
		normalize: ({ ...schema }, $) => {
			const value = $.parseSchema(schema.value)
			schema.value = value
			if (value.defaultMeta !== unset) schema.default ??= value.defaultMeta
			return schema
		},
		defaults: {
			description: node => `${node.compiledKey}?: ${node.value.description}`
		},
		intersections: {
			optional: intersectProps
		}
	})

export class OptionalNode extends BaseProp<"optional"> {
	constructor(...args: ConstructorParameters<typeof BaseProp>) {
		super(...args)
		if ("default" in this.inner) {
			assertDefaultValueAssignability(
				this.value,
				this.inner.default,
				this.serializedKey,
				false
			)
		}
	}

	expression = `${this.compiledKey}?: ${this.value.expression}${"default" in this.inner ? ` = ${printable(this.inner.default)}` : ""}`
}

// if (parsedValue.meta) {
// 	if ("default" in parsedValue.meta) {
// 		return ctx.$.node("optional", {
// 			key: parsedKey.key,
// 			value: parsedValue,
// 			default: parsedValue.meta.default
// 		})
// 	}

// 	if (parsedValue.meta.optional) {
// 		return ctx.$.node("optional", {
// 			key: parsedKey.key,
// 			value: parsedValue
// 		})
// 	}
// }

export const Optional = {
	implementation,
	Node: OptionalNode
}

const isPrimitive = (value: unknown): value is Primitive =>
	typeof value === "object" ? value === null : typeof value !== "function"
const isSimpleSerializeable = (value: unknown): (() => unknown) | false => {
	if (value instanceof Date) return () => new Date(value)
	if (
		Array.isArray(value) &&
		Object.getPrototypeOf(value) === Array.prototype &&
		value.every(isPrimitive)
	)
		return () => value.slice()
	if (
		typeof value === "object" &&
		value !== null &&
		Object.getPrototypeOf(value) === Object.prototype &&
		Object.getOwnPropertySymbols(value).length === 0 &&
		Object.getOwnPropertyNames(value).every(k => {
			const prop = Object.getOwnPropertyDescriptor(value, k)
			return (
				prop &&
				"value" in prop &&
				isPrimitive(prop.value) &&
				prop.writable === true &&
				prop.enumerable === true &&
				prop.configurable === true
			)
		})
	)
		return () => ({ ...value })
	return false
}

export const assertDefaultValueAssignability = (
	node: BaseRoot,
	value: unknown,
	key: string | null,
	canOverrideValue: boolean
): unknown => {
	if (!isPrimitive(value) && typeof value !== "function") {
		if (!canOverrideValue) {
			throwParseError(
				writeNonPrimitiveNonFunctionDefaultValueMessage(key ?? "", value)
			)
		}
		const fn = isSimpleSerializeable(value)
		if (!fn) {
			throwParseError(
				writeNonPrimitiveNonFunctionDefaultValueMessage(key ?? "", value)
			)
		}
		value = fn
	}
	const out = node.in(typeof value === "function" ? value() : value)
	if (out instanceof ArkErrors) {
		throwParseError(
			writeUnassignableDefaultValueMessage(out.message, key ?? "")
		)
	}
	return value
}

export const writeUnassignableDefaultValueMessage = (
	message: string,
	key = ""
): string => `Default value${key && ` for key ${key}`} ${message}`

export type writeUnassignableDefaultValueMessage<
	baseDef extends string,
	defaultValue extends string
> = `Default value ${defaultValue} is not assignable to ${baseDef}`

export const writeNonPrimitiveNonFunctionDefaultValueMessage = (
	key: string,
	value: unknown
): string =>
	`Default value${key && ` for key ${key}`} is not primitive so it should be constructor function (was ${printable(value)})`
