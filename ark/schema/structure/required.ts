import type { BaseErrorContext, declareNode } from "../shared/declare.js"
import type { ArkErrorContextInput } from "../shared/errors.js"
import {
	compileErrorContext,
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

export interface RequiredErrorContext extends BaseErrorContext<"required"> {
	missingValueDescription: string
}

export interface RequiredSchema extends BasePropSchema {}

export interface RequiredInner extends BasePropInner {}

export type RequiredDeclaration = declareNode<
	BasePropDeclaration<"required"> & {
		schema: RequiredSchema
		normalizedSchema: RequiredSchema
		inner: RequiredInner
		errorContext: RequiredErrorContext
	}
>

export class RequiredNode extends BaseProp<"required"> {
	expression = `${this.compiledKey}: ${this.value.expression}`

	errorContext: ArkErrorContextInput<"required"> = Object.freeze({
		code: "required",
		missingValueDescription: this.value.shortDescription,
		relativePath: [this.key]
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
		},
		intersections: {
			required: intersectProps,
			optional: intersectProps
		}
	})
