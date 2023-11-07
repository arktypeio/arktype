import {
	type AbstractableConstructor,
	type exactMessageOnError,
	type listable,
	type mutable,
	throwParseError
} from "@arktype/util"
import { BaseNode, type declareNode, type withAttributes } from "../base.js"
import {
	type BasisKind,
	maybeParseBasis,
	type parseBasis
} from "../bases/basis.js"
import { type NonEnumerableDomain } from "../bases/domain.js"
import { builtins } from "../builtins.js"
import { type ConstraintKind } from "../constraints/constraint.js"
import { Disjoint } from "../disjoint.js"
import type { Problem } from "../io/problems.js"
import type { CheckResult, TraversalState } from "../io/traverse.js"
import { type DiscriminableSchema, type Node, type Schema } from "../nodes.js"
import { BaseRoot, type rootRightOf } from "../root.js"
import type {
	IntersectionNode,
	IntersectionSchema,
	validateIntersectionSchema
} from "./intersection.js"

export type ValidatorNode = Node<rootRightOf<"morph">>

export type ValidatorSchema<
	basis extends Schema<BasisKind> = Schema<BasisKind>
> = basis | IntersectionSchema<basis>

export type validateValidatorSchema<schema> = schema extends
	| NonEnumerableDomain
	| AbstractableConstructor
	? schema
	: schema extends DiscriminableSchema<BasisKind>
	? exactMessageOnError<schema, DiscriminableSchema<keyof schema & BasisKind>>
	: schema extends IntersectionSchema
	? validateIntersectionSchema<schema>
	: ValidatorSchema

export type parseValidatorSchema<schema> = schema extends Schema<BasisKind>
	? parseBasis<schema>
	: schema extends ValidatorSchema<infer basis>
	? Schema<BasisKind> extends basis
		? // basis will be un-narrowed if the the intersection has no constraints i.e. node({})
		  IntersectionNode<unknown>
		: keyof schema & ConstraintKind extends never
		? // if there are no constraint keys, reduce to the basis node
		  parseBasis<basis>
		: IntersectionNode<parseBasis<basis>["infer"]>
	: Node<"intersection" | BasisKind>

export const parseValidatorSchema = (schema: ValidatorSchema): ValidatorNode =>
	maybeParseBasis(schema) ??
	BaseNode.classesByKind.intersection.parse(schema as IntersectionSchema)

export type Morph<i = any, o = unknown> = (In: i, state: TraversalState) => o

export type Out<o = any> = ["=>", o]

export type MorphInner = withAttributes<{
	readonly in: ValidatorNode
	readonly out: ValidatorNode
	readonly morph: readonly Morph[]
}>

export type MorphSchema = withAttributes<{
	readonly in?: ValidatorSchema
	readonly out?: ValidatorSchema
	readonly morph: listable<Morph>
}>

export type MorphDeclaration = declareNode<{
	kind: "morph"
	schema: MorphSchema
	inner: MorphInner
	intersections: {
		morph: "morph" | Disjoint
		intersection: "morph" | Disjoint
		rule: "morph" | Disjoint
	}
}>

export class MorphNode<t = unknown> extends BaseRoot<MorphDeclaration, t> {
	static readonly kind = "morph"
	static readonly declaration: MorphDeclaration

	static definition = this.define({
		kind: "morph",
		keys: {
			in: {
				children: (In) => [In],
				io: "in"
			},
			out: {
				children: (out) => [out],
				io: "out"
			},
			morph: {}
		},
		intersections: {
			morph: (l, r) => {
				if (l.morph.some((morph, i) => morph !== r.morph[i])) {
					// TODO: is this always a parse error? what about for union reduction etc.
					// TODO: check in for union reduction
					return throwParseError(`Invalid intersection of morphs`)
				}
				const result: mutable<MorphInner> = {
					morph: l.morph,
					in: builtins().unknown,
					out: builtins().unknown
				}
				if (l.in) {
					if (r.in) {
						const inTersection = l.in.intersect(r.in)
						if (inTersection instanceof Disjoint) {
							return inTersection
						}
						result.in = inTersection
					} else {
						result.in = l.in
					}
				} else if (r.in) {
					result.in = r.in
				}
				if (l.out) {
					if (r.out) {
						const outTersection = l.out.intersect(r.out)
						if (outTersection instanceof Disjoint) {
							return outTersection
						}
						result.out = outTersection
					} else {
						result.out = l.out
					}
				} else if (r.out) {
					result.out = r.out
				}
				return result
			},
			intersection: (l, r) => {
				const inTersection = l.in?.intersect(r) ?? r
				return inTersection instanceof Disjoint
					? inTersection
					: {
							...l.inner,
							in: inTersection
					  }
			},
			rule: (l, r) => {
				const input = l.in ?? builtins().unknown
				const constrainedInput = input.intersect(r)
				return constrainedInput instanceof Disjoint
					? constrainedInput
					: {
							...l.inner,
							in: constrainedInput
					  }
			}
		},
		parseSchema: (schema) => {
			const inner = {} as mutable<MorphInner>
			inner.morph =
				typeof schema.morph === "function" ? [schema.morph] : schema.morph
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
		children: (inner): ValidatorNode[] =>
			inner.in
				? inner.out
					? [inner.in, inner.out]
					: [inner.in]
				: inner.out
				? [inner.out]
				: []
	})
}

export type inferMorphOut<out> = out extends CheckResult<infer t>
	? out extends null
		? // avoid treating any/never as CheckResult
		  out
		: t
	: Exclude<out, Problem>

export type validateMorphSchema<schema> = {
	[k in keyof schema]: k extends "in" | "out"
		? validateValidatorSchema<schema[k]>
		: k extends keyof MorphSchema
		? MorphSchema[k]
		: `'${k & string}' is not a valid morph schema key`
}

export type parseMorphSchema<schema> = schema extends MorphSchema
	? MorphNode<
			(
				In: schema["in"] extends {}
					? parseValidatorSchema<schema["in"]>["infer"]
					: unknown
			) => schema["out"] extends {}
				? Out<parseValidatorSchema<schema["out"]>["infer"]>
				: schema["morph"] extends
						| Morph<any, infer o>
						| readonly [...unknown[], Morph<any, infer o>]
				? Out<inferMorphOut<o>>
				: never
	  >
	: never
