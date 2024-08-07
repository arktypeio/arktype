import { InternalPrimitiveConstraint } from "../constraint.js"
import type { BaseRoot } from "../roots/root.js"
import type {
	BaseErrorContext,
	BaseNormalizedSchema,
	declareNode
} from "../shared/declare.js"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.js"
import { $ark } from "../shared/registry.js"

export namespace Pattern {
	export interface NormalizedSchema extends BaseNormalizedSchema {
		readonly rule: string
		readonly flags?: string
	}

	export interface Inner {
		readonly rule: string
		readonly flags?: string
	}

	export type Schema = NormalizedSchema | string | RegExp

	export interface ErrorContext extends BaseErrorContext<"pattern">, Inner {}

	export interface Declaration
		extends declareNode<{
			kind: "pattern"
			schema: Schema
			normalizedSchema: NormalizedSchema
			inner: Inner
			intersectionIsOpen: true
			prerequisite: string
			errorContext: ErrorContext
		}> {}

	export type Node = PatternNode
}

const implementation: nodeImplementationOf<Pattern.Declaration> =
	implementNode<Pattern.Declaration>({
		kind: "pattern",
		collapsibleKey: "rule",
		keys: {
			rule: {},
			flags: {}
		},
		normalize: schema =>
			typeof schema === "string" ? { rule: schema }
			: schema instanceof RegExp ?
				schema.flags ?
					{ rule: schema.source, flags: schema.flags }
				:	{ rule: schema.source }
			:	schema,
		hasAssociatedError: true,
		intersectionIsOpen: true,
		defaults: {
			description: node => `matched by ${node.rule}`
		},
		intersections: {
			// for now, non-equal regex are naively intersected:
			// https://github.com/arktypeio/arktype/issues/853
			pattern: () => null
		}
	})

export class PatternNode extends InternalPrimitiveConstraint<Pattern.Declaration> {
	readonly instance: RegExp = new RegExp(this.rule, this.flags)
	readonly expression: string = `${this.instance}`
	traverseAllows: (string: string) => boolean = this.instance.test.bind(
		this.instance
	)

	readonly compiledCondition: string = `${this.expression}.test(data)`
	readonly compiledNegation: string = `!${this.compiledCondition}`
	readonly impliedBasis: BaseRoot = $ark.intrinsic.string.internal
}

export const Pattern = {
	implementation,
	Node: PatternNode
}
