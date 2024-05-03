import type { declareNode } from "../shared/declare.js"
import { implementNode } from "../shared/implement.js"
import {
	BasePropNode,
	intersectProps,
	type BasePropDeclaration
} from "./prop.js"

export const optionalImplementation = implementNode<OptionalDeclaration>({
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
	},
	intersections: {
		optional: intersectProps
	}
})

export type OptionalDeclaration = declareNode<BasePropDeclaration<"optional">>

export class OptionalNode extends BasePropNode<"optional"> {
	expression = `${this.compiledKey}?: ${this.value.expression}`
}
