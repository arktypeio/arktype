import { type mutable } from "@arktype/util"
import { type declareNode, type withAttributes } from "../base.js"
import { type Disjoint } from "../disjoint.js"
import { BaseRoot } from "../root.js"
import { type MorphNode, type MorphSchema } from "./morph.js"

export type MatchInner = withAttributes<{
	readonly match: readonly MorphNode[]
}>

export type MatchSchema = withAttributes<{
	readonly match: readonly MorphSchema[]
}>

export type MatchDeclaration = declareNode<{
	kind: "match"
	schema: MatchSchema
	inner: MatchInner
	intersections: {
		match: "match" | Disjoint
	}
}>

export class MatchNode<t = unknown> extends BaseRoot<MatchDeclaration, t> {
	static readonly kind = "match"
	static readonly declaration: MatchDeclaration

	static definition = this.define({
		kind: "match",
		keys: {
			match: "morph"
		},
		intersections: {
			match: (l, r) => {
				return l
			}
		},
		parseSchema: (schema) => {
			const inner = {} as mutable<MatchInner>
			inner.match =
				typeof schema.match === "function" ? [schema.match] : schema.match
			if (schema.in) {
				inner.in = parseValidatorSchema(schema.in)
			}
			if (schema.out) {
				inner.out = parseValidatorSchema(schema.out)
			}
			return inner
		},
		compileCondition: (inner) => inner.in?.condition ?? "true",
		writeDefaultDescription: (inner) => "",
		children: (inner) => inner.match.map((entry) => entry[0])
	})
}
