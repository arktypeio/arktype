import {
	listFrom,
	throwParseError,
	type BuiltinObjectKind,
	type BuiltinObjects,
	type List,
	type Primitive,
	type listable
} from "@arktype/util"
import type { Node } from "../base.js"
import type { is } from "../constraints/is.js"
import type { Schema } from "../kinds.js"
import type { StaticArkOption } from "../scope.js"
import type { NodeCompiler } from "../shared/compile.js"
import type {
	TraversalContext,
	TraverseAllows,
	TraverseApply
} from "../shared/context.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type { ArkResult, ArkTypeError } from "../shared/errors.js"
import {
	basisKinds,
	type TypeIntersection,
	type nodeImplementationOf
} from "../shared/implement.js"
import { BaseType, type typeKindRightOf } from "./type.js"

export type MorphChildKind = typeKindRightOf<"morph">

export const morphChildKinds = [
	"intersection",
	...basisKinds
] as const satisfies readonly MorphChildKind[]

export type MorphChildNode = Node<MorphChildKind>

export type MorphChildDefinition = Schema<MorphChildKind>

export type Morph<i = any, o = unknown> = (In: i, ctx: TraversalContext) => o

export type Out<o = any> = ["=>", o]

export type MorphAst<i = any, o = any> = (In: i) => Out<o>

export interface MorphInner extends BaseMeta {
	readonly in: MorphChildNode
	readonly out: MorphChildNode
	readonly morph: readonly Morph[]
}

export interface MorphSchema extends BaseMeta {
	readonly in: MorphChildDefinition
	readonly out?: MorphChildDefinition
	readonly morph: listable<Morph>
}

export type MorphDeclaration = declareNode<{
	kind: "morph"
	schema: MorphSchema
	normalizedSchema: MorphSchema
	inner: MorphInner
	composition: "composite"
	childKind: MorphChildKind
}>

const intersectRightward: TypeIntersection<"morph"> = (morph, r) => {
	const inTersection = morph.in.intersect(r)
	return inTersection instanceof Disjoint
		? inTersection
		: {
				...morph.inner,
				in: inTersection
		  }
}

export class MorphNode<t = unknown> extends BaseType<
	t,
	MorphDeclaration,
	typeof MorphNode
> {
	// TODO: recursively extract in?
	static implementation: nodeImplementationOf<MorphDeclaration> =
		this.implement({
			hasAssociatedError: false,
			keys: {
				in: {
					child: true,
					parse: (schema, ctx) =>
						ctx.$.parseTypeNode(schema, { allowedKinds: morphChildKinds })
				},
				out: {
					child: true,
					parse: (schema, ctx) =>
						ctx.$.parseTypeNode(schema, { allowedKinds: morphChildKinds })
				},
				morph: {
					parse: listFrom
				}
			},
			normalize: (schema) => schema,
			defaults: {
				description(inner) {
					return `a morph from ${inner.in} to ${inner.out}`
				}
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
					return {
						morph: l.morph,
						in: inTersection,
						out: outTersection
					}
				},
				unit: intersectRightward,
				intersection: intersectRightward,
				domain: intersectRightward,
				proto: intersectRightward
			}
		})

	traverseAllows: TraverseAllows = (data, ctx) =>
		this.in.traverseAllows(data, ctx)

	traverseApply: TraverseApply = (data, ctx) =>
		this.in.traverseApply(data, ctx);

	override get in(): Node<MorphChildKind, extractIn<t>> {
		return this.inner.in
	}

	override get out(): Node<MorphChildKind, extractOut<t>> {
		return this.inner.out ?? this.$.builtin.unknown
	}

	compile(js: NodeCompiler) {
		this.in.compile(js)
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
	? distillRecurse<t, "in", "constrained">
	: t

export type extractOut<t> = includesMorphs<t> extends true
	? distillRecurse<t, "out", "constrained">
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
	constraints extends "base" | "constrained"
> = unknown extends t
	? unknown
	: t extends MorphAst<infer i, infer o>
	? io extends "in"
		? i
		: o
	: t extends is<infer base>
	? constraints extends "base"
		? distillRecurse<base, io, constraints>
		: t
	: t extends TerminallyInferredObjectKind | Primitive
	? t
	: t extends List
	? distillArray<t, io, constraints, []>
	: { [k in keyof t]: distillRecurse<t[k], io, constraints> }

type distillArray<
	t extends List,
	io extends "in" | "out",
	constraints extends "base" | "constrained",
	prefix extends List
> = t extends readonly [infer head, ...infer tail]
	? distillArray<
			tail,
			io,
			constraints,
			[...prefix, distillRecurse<head, io, constraints>]
	  >
	: [...prefix, ...distillPostfix<t, io, constraints>]

type distillPostfix<
	t extends List,
	io extends "in" | "out",
	constraints extends "base" | "constrained",
	postfix extends List = []
> = t extends readonly [...infer init, infer last]
	? distillPostfix<
			init,
			io,
			constraints,
			[distillRecurse<last, io, constraints>, ...postfix]
	  >
	: [...{ [i in keyof t]: distillRecurse<t[i], io, constraints> }, ...postfix]

/** Objects we don't want to expand during inference like Date or Promise */
type TerminallyInferredObjectKind =
	| StaticArkOption<"preserve">
	| BuiltinObjects[Exclude<BuiltinObjectKind, "Array">]
