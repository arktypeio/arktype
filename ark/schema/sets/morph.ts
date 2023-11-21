import {
	listFrom,
	throwParseError,
	type Constructor,
	type evaluate,
	type exactMessageOnError,
	type extend,
	type listable
} from "@arktype/util"
import type { BasisKind, parseBasis } from "../bases/basis.js"
import type { NonEnumerableDomain } from "../bases/domain.js"
import type { Problem } from "../io/problems.js"
import type { CheckResult, TraversalState } from "../io/traverse.js"
import type { declareNode, withAttributes } from "../shared/declare.js"
import { basisKinds, defineNode } from "../shared/define.js"
import { Disjoint } from "../shared/disjoint.js"
import type { Node, NormalizedSchema, Schema } from "../shared/node.js"
import type {
	IntersectionSchema,
	parseIntersectionSchema,
	validateIntersectionSchema
} from "./intersection.js"
import type { SetAttachments } from "./set.js"

export type ValidatorKind = evaluate<"intersection" | BasisKind>

export type ValidatorNode = Node<ValidatorKind>

export type ValidatorSchema = Schema<ValidatorKind>

export type validateValidator<schema> = [schema] extends [
	NonEnumerableDomain | Constructor
]
	? schema
	: schema extends NormalizedSchema<BasisKind>
	  ? exactMessageOnError<schema, NormalizedSchema<keyof schema & BasisKind>>
	  : schema extends IntersectionSchema
	    ? validateIntersectionSchema<schema>
	    : ValidatorSchema

export type parseValidatorSchema<schema> = schema extends Schema<BasisKind>
	? parseBasis<schema>
	: schema extends IntersectionSchema
	  ? parseIntersectionSchema<schema>
	  : Node<ValidatorKind>

export type Morph<i = any, o = unknown> = (In: i, state: TraversalState) => o

export type Out<o = any> = ["=>", o]

export type MorphInner = withAttributes<{
	readonly in: ValidatorNode
	readonly out?: ValidatorNode
	readonly morph: readonly Morph[]
}>

export type MorphSchema = withAttributes<{
	readonly in: ValidatorSchema
	readonly out?: ValidatorSchema
	readonly morph: listable<Morph>
}>

export type MorphAttachments = extend<
	SetAttachments,
	{
		inCache: ValidatorNode
		outCache: ValidatorNode
	}
>

export type MorphDeclaration = declareNode<{
	kind: "morph"
	schema: MorphSchema
	inner: MorphInner
	intersections: {
		morph: "morph" | Disjoint
		intersection: "morph" | Disjoint
		default: "morph" | Disjoint
	}
	attach: MorphAttachments
}>

// TODO: recursively extract in
export const MorphImplementation = defineNode({
	kind: "morph",
	keys: {
		in: {
			parse: (schema, ctx) =>
				ctx.cls.parseRootFromKinds(["intersection", ...basisKinds], schema)
		},
		out: {
			parse: (schema, ctx) =>
				ctx.cls.parseRootFromKinds(["intersection", ...basisKinds], schema)
		},
		morph: {
			parse: listFrom
		}
	},
	normalize: (schema) => schema,
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
			return {
				morph: l.morph,
				in: inTersection,
				out: outTersection
			}
		},
		intersection: (l, r) => {
			const inTersection = l.in.intersect(r)
			return inTersection instanceof Disjoint
				? inTersection
				: {
						...l.inner,
						in: inTersection
				  }
		},
		default: (l, r) => {
			const constrainedInput = l.in.intersect(r)
			return constrainedInput instanceof Disjoint
				? constrainedInput
				: {
						...l.inner,
						in: constrainedInput
				  }
		}
	},
	writeDefaultDescription: (node) =>
		`a morph from ${node.inner.in} to ${node.inner.out}`,
	attach: (node) => ({
		compile: () => `return true`,
		inCache: node.inner.in,
		outCache: node.inner.out ?? node.cls.builtins.unknown
	})
})

export type inferMorphOut<out> = out extends CheckResult<infer t>
	? out extends null
		? // avoid treating any/never as CheckResult
		  out
		: t
	: Exclude<out, Problem>

export type validateMorphSchema<schema> = {
	[k in keyof schema]: k extends "in" | "out"
		? validateValidator<schema[k]>
		: k extends keyof MorphSchema
		  ? MorphSchema[k]
		  : `'${k & string}' is not a valid morph schema key`
}

export type parseMorphSchema<schema> = schema extends MorphSchema
	? Node<
			"morph",
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
