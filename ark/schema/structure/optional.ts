import type { declareNode } from "../shared/declare.js"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.js"
import { BaseProp, type BasePropDeclaration } from "./prop.js"

export type OptionalDeclaration = declareNode<BasePropDeclaration<"optional">>

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
			}
		},
		normalize: schema => schema,
		defaults: {
			description: node => `${node.compiledKey}?: ${node.value.description}`
		}
	})

export class OptionalNode extends BaseProp<"optional"> {
	expression = `${this.compiledKey}?: ${this.value.expression}`
}
