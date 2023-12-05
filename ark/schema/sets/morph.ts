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
import type { BasisKind } from "../bases/basis.js"
import type { ArkConfig } from "../scope.js"
import type {
	CheckResult,
	CompilationContext,
	Problem,
	Problems
} from "../shared/compilation.js"
import type { declareNode, withAttributes } from "../shared/declare.js"
import { basisKinds, type NodeKind } from "../shared/define.js"
import { Disjoint } from "../shared/disjoint.js"
import type { Schema, reducibleKindOf } from "../shared/nodes.js"
import { BaseType } from "../type.js"

export type ValidatorKind = evaluate<"intersection" | BasisKind>

export type ValidatorNode = Node<ValidatorKind>

export type ValidatorDefinition = Schema<ValidatorKind>

export type TraversalState = {
	path: string[]
	problems: Problems
}

export type Morph<i = any, o = unknown> = (In: i, state: TraversalState) => o

export type Out<o = any> = ["=>", o]

export type MorphAst<i = any, o = any> = (In: i) => Out<o>

export type MorphInner = {
	readonly in: ValidatorNode
	readonly out: ValidatorNode
	readonly morph: readonly Morph[]
}

export type MorphSchema = withAttributes<{
	readonly in: ValidatorDefinition
	readonly out?: ValidatorDefinition
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

export class MorphNode<t = unknown> extends BaseType<t, typeof MorphNode> {
	static readonly kind = "morph"
	static declaration: MorphDeclaration
	// TODO: recursively extract in?
	static parser = this.composeParser({
		keys: {
			in: {
				child: true,
				parse: (schema, ctx) =>
					ctx.scope.parseTypeNode(schema, ["intersection", ...basisKinds])
			},
			out: {
				child: true,
				parse: (schema, ctx) =>
					ctx.scope.parseTypeNode(schema, ["intersection", ...basisKinds])
			},
			morph: {
				parse: listFrom
			}
		},
		normalize: (schema) => schema
	})

	static intersections = this.defineIntersections({
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
	})

	traverseAllows = (data: unknown, problems: Problems) =>
		this.in.traverseAllows(data, problems)

	traverseApply = (data: unknown, problems: Problems) =>
		this.in.traverseApply(data, problems)

	inCache = this.inner.in
	outCache = this.inner.out ?? this.scope.builtin.unknown

	writeDefaultDescription() {
		return `a morph from ${this.in} to ${this.out}`
	}

	compileBody(ctx: CompilationContext): string {
		return this.in.compileBody(ctx)
	}
}

export type inferMorphOut<out> = out extends CheckResult<infer t>
	? out extends null
		? // avoid treating any/never as CheckResult
		  out
		: t
	: Exclude<out, Problem>

export type ioKindOf<kind extends NodeKind> = kind extends "morph"
	? ValidatorKind
	: reducibleKindOf<kind>

export type extractIn<t> = includesMorphs<t> extends true
	? extractMorphs<t, "in">
	: t

export type extractOut<t> = includesMorphs<t> extends true
	? extractMorphs<t, "out">
	: t

export type includesMorphs<t> = [
	t,
	extractMorphs<t, "in">,
	t,
	extractMorphs<t, "out">
] extends [extractMorphs<t, "in">, t, extractMorphs<t, "out">, t]
	? false
	: true

type extractMorphs<t, io extends "in" | "out"> = t extends MorphAst<
	infer i,
	infer o
>
	? io extends "in"
		? i
		: o
	: t extends TerminallyInferredObjectKind | Primitive
	  ? t
	  : { [k in keyof t]: extractMorphs<t[k], io> }

/** Objects we don't want to expand during inference like Date or Promise */
type TerminallyInferredObjectKind =
	| ReturnType<ArkConfig["preserve"]>
	| BuiltinObjects[Exclude<BuiltinObjectKind, "Array">]
