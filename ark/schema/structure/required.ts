import { unset } from "@ark/util"
import type { BaseErrorContext, declareNode } from "../shared/declare.ts"
import type { ArkErrorContextInput } from "../shared/errors.ts"
import {
	compileErrorContext,
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
import { BaseProp, intersectProps, type Prop } from "./prop.ts"

export declare namespace Required {
	export interface ErrorContext extends BaseErrorContext<"required"> {
		missingValueDescription: string
	}

	export interface Schema extends Prop.Schema {}

	export interface Inner extends Prop.Inner {}

	export type Declaration = declareNode<
		Prop.Declaration<"required"> & {
			schema: Schema
			normalizedSchema: Schema
			inner: Inner
			errorContext: ErrorContext
			reducibleTo: "optional"
		}
	>

	export type Node = RequiredNode
}

const implementation: nodeImplementationOf<Required.Declaration> =
	implementNode<Required.Declaration>({
		kind: "required",
		hasAssociatedError: true,
		intersectionIsOpen: true,
		keys: {
			key: {},
			value: {
				child: true,
				parse: (schema, ctx) => ctx.$.parseSchema(schema)
			}
		},
		normalize: schema => schema,
		reduce: (inner, $) => {
			if (inner.value.defaultMeta !== unset) {
				return $.node("optional", {
					...inner,
					default: inner.value.defaultMeta
				})
			}
			if (inner.value.optionalMeta) return $.node("optional", inner)
		},
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

export class RequiredNode extends BaseProp<"required"> {
	expression = `${this.compiledKey}: ${this.value.expression}`

	errorContext: ArkErrorContextInput<"required"> = Object.freeze({
		code: "required",
		missingValueDescription: this.value.shortDescription,
		relativePath: [this.key]
	})

	compiledErrorContext: string = compileErrorContext(this.errorContext)
}

export const Required = {
	implementation,
	Node: RequiredNode
}
