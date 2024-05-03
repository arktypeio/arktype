import type { BaseErrorContext, declareNode } from "../shared/declare.js"
import { compileErrorContext, implementNode } from "../shared/implement.js"
import {
	BasePropNode,
	intersectProps,
	type BasePropDeclaration
} from "./prop.js"

export interface RequiredErrorContext extends BaseErrorContext<"required"> {
	missingValueDescription: string
}

export type RequiredDeclaration = declareNode<
	BasePropDeclaration<"required"> & { errorContext: RequiredErrorContext }
>

export class RequiredNode extends BasePropNode<"required"> {
	expression = `${this.compiledKey}: ${this.value.expression}`

	errorContext = Object.freeze({
		code: "required",
		missingValueDescription: this.value.description
	} satisfies RequiredErrorContext)

	compiledErrorContext: string = compileErrorContext(this.errorContext)
}

export const requiredImplementation = implementNode<RequiredDeclaration>({
	kind: "required",
	hasAssociatedError: true,
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
		description: node => `${node.compiledKey}: ${node.value.description}`,
		expected: ctx => ctx.missingValueDescription,
		actual: () => "missing"
	},
	intersections: {
		required: intersectProps,
		optional: intersectProps
	}
})
