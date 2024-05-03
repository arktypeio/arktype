import type { BaseErrorContext, declareNode } from "../shared/declare.js"
import {
	compileErrorContext,
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.js"
import { BaseProp, type BasePropDeclaration } from "./prop.js"

export interface RequiredErrorContext extends BaseErrorContext<"required"> {
	missingValueDescription: string
}

export type RequiredDeclaration = declareNode<
	BasePropDeclaration<"required"> & { errorContext: RequiredErrorContext }
>

export class RequiredNode extends BaseProp<"required"> {
	expression = `${this.compiledKey}: ${this.value.expression}`

	errorContext: RequiredErrorContext = Object.freeze({
		code: "required",
		missingValueDescription: this.value.description
	})

	compiledErrorContext: string = compileErrorContext(this.errorContext)
}

export const requiredImplementation: nodeImplementationOf<RequiredDeclaration> =
	implementNode<RequiredDeclaration>({
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
		}
	})
