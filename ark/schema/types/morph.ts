import {
	listFrom,
	throwParseError,
	type BuiltinObjectKind,
	type BuiltinObjects,
	type Primitive,
	type evaluate,
	type listable
} from "@arktype/util"
import type { Node } from "../base.js"
import type { Schema } from "../kinds.js"
import type {
	CompilationContext,
	StaticArkOption,
	TraverseAllows,
	TraverseApply
} from "../scope.js"
import type { declareNode, withBaseMeta } from "../shared/declare.js"
import {
	basisKinds,
	type BasisKind,
	type NodeImplementation
} from "../shared/define.js"
import { Disjoint } from "../shared/disjoint.js"
import type { is } from "../shared/utils.js"
import type { TraversalContext } from "../traversal/context.js"
import type { ArkResult, ArkTypeError } from "../traversal/errors.js"
import { BaseType } from "./type.js"

export type ValidatorKind = evaluate<"intersection" | BasisKind>

export type ValidatorNode = Node<ValidatorKind>

export type ValidatorDefinition = Schema<ValidatorKind>

export type Morph<i = any, o = unknown> = (In: i, ctx: TraversalContext) => o

export type Out<o = any> = ["=>", o]

export type MorphAst<i = any, o = any> = (In: i) => Out<o>

export type MorphInner = {
	readonly in: ValidatorNode
	readonly out: ValidatorNode
	readonly morph: readonly Morph[]
}

export type MorphSchema = withBaseMeta<{
	readonly in: ValidatorDefinition
	readonly out?: ValidatorDefinition
	readonly morph: listable<Morph>
}>

export type MorphDeclaration = declareNode<{
	kind: "morph"
	schema: MorphSchema
	normalizedSchema: MorphSchema
	inner: MorphInner
	intersections: {
		morph: "morph" | Disjoint
		intersection: "morph" | Disjoint
		default: "morph" | Disjoint
	}
}>

export class MorphNode<t = unknown> extends BaseType<
	t,
	MorphDeclaration,
	typeof MorphNode
> {
	// TODO: recursively extract in?
	static implementation: NodeImplementation<MorphDeclaration> = {
		keys: {
			in: {
				child: true,
				parse: (schema, ctx) =>
					ctx.$.parseTypeNode(schema, ["intersection", ...basisKinds])
			},
			out: {
				child: true,
				parse: (schema, ctx) =>
					ctx.$.parseTypeNode(schema, ["intersection", ...basisKinds])
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
		describeExpected(inner) {
			return `a morph from ${inner.in} to ${inner.out}`
		}
	}

	traverseAllows: TraverseAllows = (data, ctx) =>
		this.in.traverseAllows(data, ctx)

	traverseApply: TraverseApply = (data, ctx) =>
		this.in.traverseApply(data, ctx);

	override get in(): Node<ValidatorKind, extractIn<t>> {
		return this.inner.in
	}

	override get out(): Node<ValidatorKind, extractOut<t>> {
		return this.inner.out ?? this.$.builtin.unknown
	}

	compileBody(ctx: CompilationContext): string {
		return this.in.compileBody(ctx)
	}
}

export type inferMorphOut<out> = out extends ArkResult<infer t>
	? out extends null
		? // avoid treating any/never as CheckResult
		  out
		: t
	: Exclude<out, ArkTypeError>

export type distill<t> = includesMorphs<t> extends true
	? distillRecurse<t, "out", "base">
	: t

export type extractIn<t> = includesMorphs<t> extends true
	? distillRecurse<t, "in", "refined">
	: t

export type extractOut<t> = includesMorphs<t> extends true
	? distillRecurse<t, "out", "refined">
	: t

export type includesMorphs<t> = [
	t,
	distillRecurse<t, "in", "base">,
	t,
	distillRecurse<t, "out", "base">
] extends [
	distillRecurse<t, "in", "base">,
	t,
	distillRecurse<t, "out", "base">,
	t
]
	? false
	: true

type distillRecurse<
	t,
	io extends "in" | "out",
	refinements extends "base" | "refined"
> = t extends MorphAst<infer i, infer o>
	? io extends "in"
		? i
		: o
	: t extends is<infer base>
	  ? refinements extends "base"
			? distillRecurse<base, io, refinements>
			: t
	  : t extends TerminallyInferredObjectKind | Primitive
	    ? t
	    : { [k in keyof t]: distillRecurse<t[k], io, refinements> }

/** Objects we don't want to expand during inference like Date or Promise */
type TerminallyInferredObjectKind =
	| StaticArkOption<"preserve">
	| BuiltinObjects[Exclude<BuiltinObjectKind, "Array">]
