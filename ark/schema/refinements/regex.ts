import { RawPrimitiveConstraint } from "../constraint.js"
import type { BaseRoot, RawRootDeclaration } from "../roots/root.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.js"

export interface RegexInner extends BaseMeta {
	readonly rule: string
	readonly flags?: string
}

export type NormalizedRegexSchema = RegexInner

export type RegexSchema = NormalizedRegexSchema | string | RegExp

export interface RegexDeclaration
	extends declareNode<{
		kind: "regex"
		schema: RegexSchema
		normalizedSchema: NormalizedRegexSchema
		inner: RegexInner
		intersectionIsOpen: true
		prerequisite: string
		errorContext: RegexInner
	}> {}

export const regexImplementation: nodeImplementationOf<RegexDeclaration> =
	implementNode<RegexDeclaration>({
		kind: "regex",
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
		intersections: {
			// for now, non-equal regex are naively intersected
			regex: () => null
		},
		defaults: {
			description: node => `matched by ${node.rule}`
		}
	})

export class RegexNode extends RawPrimitiveConstraint<RegexDeclaration> {
	readonly instance: RegExp = new RegExp(this.rule, this.flags)
	readonly expression: string = `${this.instance}`
	traverseAllows: (string: string) => boolean = this.instance.test.bind(
		this.instance
	)

	readonly compiledCondition: string = `${this.expression}.test(data)`
	readonly compiledNegation: string = `!${this.compiledCondition}`
	readonly impliedBasis: BaseRoot = this.$.keywords.string.raw
}
