import { throwParseError } from "@ark/util"
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
		normalize: schema => schema,
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
			const out = this.value.in(this.inner.default)
			if (out instanceof ArkErrors) {
				throwParseError(
					writeUnassignableDefaultValueMessage(this.serializedKey, out.message)
				)
			}
		}
	}

	expression = `${this.compiledKey}?: ${this.value.expression}`
}

export const Optional = {
	implementation,
	Node: OptionalNode
}

export const writeUnassignableDefaultValueMessage = <
	key extends string,
	message extends string
>(
	key: key,
	message: message
): string => `Default value for key ${key} ${message}`

export type writeUnassignableDefaultValueMessage<
	baseDef extends string,
	defaultValue extends string
> = `Default value ${defaultValue} is not assignable to ${baseDef}`
