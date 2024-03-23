import {
	listFrom,
	reference,
	throwParseError,
	type BuiltinObjectKind,
	type BuiltinObjects,
	type List,
	type Primitive,
	type listable
} from "@arktype/util"
import type { Node } from "../base.js"
import type { of } from "../constraints/ast.js"
import type { Schema } from "../kinds.js"
import type { StaticArkOption } from "../scope.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type { ArkResult, ArkTypeError } from "../shared/errors.js"
import { basisKinds, type nodeImplementationOf } from "../shared/implement.js"
import type {
	TraversalContext,
	TraverseAllows,
	TraverseApply
} from "../shared/traversal.js"
import {
	BaseType,
	defineRightwardIntersections,
	type Type,
	type typeKindRightOf
} from "./type.js"

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
	readonly morphs: readonly Morph[]
}

export interface MorphSchema extends BaseMeta {
	readonly in: MorphChildDefinition
	readonly out?: MorphChildDefinition
	readonly morphs: listable<Morph>
}

export type MorphDeclaration = declareNode<{
	kind: "morph"
	schema: MorphSchema
	normalizedSchema: MorphSchema
	inner: MorphInner
	childKind: MorphChildKind
}>

export class MorphNode<t = any, $ = any> extends BaseType<
	t,
	MorphDeclaration,
	$
> {
	// TODO: recursively extract in?
	static implementation: nodeImplementationOf<MorphDeclaration> =
		this.implement({
			hasAssociatedError: false,
			keys: {
				in: {
					child: true,
					parse: (schema, ctx) =>
						ctx.$.node(schema, { allowedKinds: morphChildKinds })
				},
				out: {
					child: true,
					parse: (schema, ctx) =>
						ctx.$.node(schema, { allowedKinds: morphChildKinds })
				},
				morphs: {
					parse: listFrom,
					serialize: (morphs) => morphs.map(reference)
				}
			},
			normalize: (schema) => schema,
			defaults: {
				description(node) {
					return `a morph from ${node.in.description} to ${node.out.description}`
				}
			},
			intersections: {
				morph: (l, r, $) => {
					if (l.morphs.some((morph, i) => morph !== r.morphs[i])) {
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
					return $.node("morph", {
						morphs: l.morphs,
						in: inTersection,
						out: outTersection
					})
				},
				...defineRightwardIntersections("morph", (l, r, $) => {
					const inTersection = l.in.intersect(r)
					return inTersection instanceof Disjoint
						? inTersection
						: inTersection.kind === "union"
						? $.node(
								"union",
								inTersection.branches.map((branch) => ({
									...l.inner,
									in: branch
								}))
						  )
						: $.node("morph", {
								...l.inner,
								in: inTersection
						  })
				})
			}
		})

	readonly expression = `(In: ${this.in.expression}) => Out<${this.out.expression}>`

	readonly serializedMorphs = this.morphs.map((morph) => reference(morph))

	traverseAllows: TraverseAllows = (data, ctx) =>
		this.in.traverseAllows(data, ctx)

	traverseApply: TraverseApply = (data, ctx) => {
		this.morphs.forEach((morph) => ctx.queueMorph(morph))
		this.in.traverseApply(data, ctx)
	}

	compile(js: NodeCompiler): void {
		if (js.traversalKind === "Allows") {
			js.return(js.invoke(this.in))
			return
		}
		this.serializedMorphs.forEach((name) => js.line(`ctx.queueMorph(${name})`))
		js.line(js.invoke(this.in))
	}

	override get in(): Node<MorphChildKind, extractIn<t>> {
		return this.inner.in
	}

	override get out(): Node<MorphChildKind, extractOut<t>> {
		return this.inner.out ?? this.$.keywords.unknown
	}

	rawKeyOf(): Type {
		return this.in.rawKeyOf()
	}
}

export type inferMorphOut<out> = out extends ArkResult<unknown, infer innerOut>
	? out extends null
		? // avoid treating any/never as ArkResult
		  out
		: innerOut
	: Exclude<out, ArkTypeError>

export type distill<
	t,
	io extends "in" | "out",
	constraints extends "base" | "constrained"
> = distillRecurse<t, io, constraints> extends infer result
	? [t, result] extends [result, t]
		? t
		: result
	: never

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
	: t extends of<infer base>
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
