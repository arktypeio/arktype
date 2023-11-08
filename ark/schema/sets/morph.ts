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
import { Disjoint } from "../disjoint.js"
import type { Problem } from "../io/problems.js"
import type { CheckResult, TraversalState } from "../io/traverse.js"
import { type DiscriminableSchema, type Node, type Schema } from "../nodes.js"
import { BaseRoot } from "../root.js"
import {
	IntersectionNode,
	type IntersectionSchema,
	type parseIntersectionSchema,
	type validateIntersectionSchema
} from "./intersection.js"

export type ValidatorKind = "intersection" | BasisKind

export type ValidatorNode = Node<ValidatorKind>

export type ValidatorSchema = Schema<ValidatorKind>

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
	: schema extends IntersectionSchema
	? parseIntersectionSchema<schema>
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
		default: "morph" | Disjoint
	}
}>

export class MorphNode<t = unknown> extends BaseRoot<MorphDeclaration, t> {
	static readonly kind = "morph"
	static readonly declaration: MorphDeclaration

	static definition = this.define({
		kind: "morph",
		keys: {
			in: {
				children: (In) => In
			},
			out: {
				children: (out) => out
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
				const inTersection = l.in.intersect(r.in)
				if (inTersection instanceof Disjoint) {
					return inTersection
				}
				const outTersection = l.out.intersect(r.out)
				if (outTersection instanceof Disjoint) {
					return outTersection
				}
				return new MorphNode({
					morph: l.morph,
					in: inTersection,
					out: outTersection
				})
			},
			intersection: (l, r) => {
				const inTersection = l.in.intersect(r)
				return inTersection instanceof Disjoint
					? inTersection
					: new MorphNode({
							...l.inner,
							in: inTersection
					  })
			},
			default: (l, r) => {
				const constrainedInput = l.in.intersect(r)
				return constrainedInput instanceof Disjoint
					? constrainedInput
					: new MorphNode({
							...l.inner,
							in: constrainedInput
					  })
			}
		},
		parseSchema: (schema) => {
			return {
				in: schema.in ? parseValidatorSchema(schema.in) : builtins().unknown,
				out: schema.out ? parseValidatorSchema(schema.out) : builtins().unknown,
				morph:
					typeof schema.morph === "function" ? [schema.morph] : schema.morph
			}
		},
		compileCondition: (inner) => inner.in.condition,
		writeDefaultDescription: (inner) => ""
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
