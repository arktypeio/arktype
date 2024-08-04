import { $ark } from "@ark/util"
import { InternalPrimitiveConstraint } from "../constraint.js"
import type { BaseRoot } from "../roots/root.js"
import type {
	BaseMeta,
	BaseNormalizedSchema,
	declareNode
} from "../shared/declare.js"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.js"

export interface NormalizedPatternSchema extends BaseNormalizedSchema {
	readonly rule: string
	readonly flags?: string
}

export interface PatternInner extends NormalizedPatternSchema {
	readonly meta?: BaseMeta
}

export type PatternSchema = NormalizedPatternSchema | string | RegExp

export interface PatternDeclaration
	extends declareNode<{
		kind: "pattern"
		schema: PatternSchema
		normalizedSchema: NormalizedPatternSchema
		inner: PatternInner
		intersectionIsOpen: true
		prerequisite: string
		errorContext: PatternInner
	}> {}

export const patternImplementation: nodeImplementationOf<PatternDeclaration> =
	implementNode<PatternDeclaration>({
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

export class PatternNode extends InternalPrimitiveConstraint<PatternDeclaration> {
	readonly instance: RegExp = new RegExp(this.rule, this.flags)
	readonly expression: string = `${this.instance}`
	traverseAllows: (string: string) => boolean = this.instance.test.bind(
		this.instance
	)

	readonly compiledCondition: string = `${this.expression}.test(data)`
	readonly compiledNegation: string = `!${this.compiledCondition}`
	readonly impliedBasis: BaseRoot = $ark.intrinsic.string.internal
}
