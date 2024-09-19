import {
	hasDomain,
	printable,
	throwParseError,
	unset,
	type Primitive
} from "@ark/util"
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
				this.serializedKey
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

export const assertDefaultValueAssignability = (
	node: BaseRoot,
	value: unknown,
	key = ""
): unknown => {
	if (hasDomain(value, "object") && typeof value !== "function")
		throwParseError(writeNonPrimitiveNonFunctionDefaultValueMessage(key))

	const out = node.in(typeof value === "function" ? value() : value)
	if (out instanceof ArkErrors)
		throwParseError(writeUnassignableDefaultValueMessage(out.message, key))

	return value
}

export const writeUnassignableDefaultValueMessage = (
	message: string,
	key = ""
): string =>
	`Default value${key && ` for key ${key}`} is not assignable: ${message}`

export type writeUnassignableDefaultValueMessage<
	baseDef extends string,
	defaultValue extends string
> = `Default value ${defaultValue} is not assignable to ${baseDef}`

export const writeNonPrimitiveNonFunctionDefaultValueMessage = (
	key: string
): string =>
	`Default value${key && ` for key ${key}`} is not primitive so it should be specified as a function like () => ({my: 'object'})`
