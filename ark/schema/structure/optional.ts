import type { declareNode } from "../shared/declare.js"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.js"
import {
	BaseProp,
	intersectProps,
	type BasePropDeclaration,
	type BasePropInner,
	type BasePropSchema
} from "./prop.js"

export interface OptionalSchema extends BasePropSchema {
	default?: unknown
}

export interface OptionalInner extends BasePropInner {
	default?: unknown
}

export type Default<v = any> = ["=", v]

export type DefaultableAst<t = any, v = any> = (In?: t) => Default<v>

export type OptionalDeclaration = declareNode<
	BasePropDeclaration<"optional"> & {
		schema: OptionalSchema
		normalizedSchema: OptionalSchema
		inner: OptionalInner
	}
>

export const optionalImplementation: nodeImplementationOf<OptionalDeclaration> =
	implementNode<OptionalDeclaration>({
		kind: "optional",
		hasAssociatedError: false,
		intersectionIsOpen: true,
		keys: {
			key: {},
			value: {
				child: true,
				parse: (schema, ctx) => ctx.$.schema(schema)
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
	expression = `${this.compiledKey}?: ${this.value.expression}`
}
