import {
	type array,
	arrayFrom,
	type BuiltinObjectKind,
	type BuiltinObjects,
	type listable,
	type Primitive,
	registeredReference,
	throwParseError
} from "@arktype/util"
import type { of } from "../constraints/ast.js"
import type { type } from "../inference.js"
import type { Node, NodeDef, SchemaDef } from "../kinds.js"
import { BaseSchema, type schemaKindRightOf } from "../schema.js"
import type { StaticArkOption } from "../scope.js"
import { NodeCompiler } from "../shared/compile.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type { ArkErrors, ArkTypeError } from "../shared/errors.js"
import { basisKinds, implementNode } from "../shared/implement.js"
import { type inferPipe, intersectNodes } from "../shared/intersections.js"
import type {
	TraversalContext,
	TraverseAllows,
	TraverseApply
} from "../shared/traversal.js"
import { defineRightwardIntersections } from "./utils.js"

export type MorphInputKind = schemaKindRightOf<"morph">

export const morphInputKinds = [
	"intersection",
	...basisKinds
] as const satisfies readonly MorphInputKind[]

export type MorphInputNode = Node<MorphInputKind>

export type MorphInputDef = NodeDef<MorphInputKind>

export type Morph<i = any, o = unknown> = (In: i, ctx: TraversalContext) => o

export type Out<o = any> = ["=>", o]

export type MorphAst<i = any, o = any> = (In: i) => Out<o>

export interface MorphInner extends BaseMeta {
	readonly from: MorphInputNode
	readonly to?: BaseSchema
	readonly morphs: readonly Morph[]
}

export interface MorphDef extends BaseMeta {
	readonly from: MorphInputDef
	readonly to?: SchemaDef | undefined
	readonly morphs: listable<Morph>
}

export type MorphDeclaration = declareNode<{
	kind: "morph"
	def: MorphDef
	normalizedDef: MorphDef
	inner: MorphInner
	childKind: MorphInputKind
}>

export const morphImplementation = implementNode<MorphDeclaration>({
	kind: "morph",
	hasAssociatedError: false,
	keys: {
		from: {
			child: true,
			parse: (def, ctx) => ctx.$.node(morphInputKinds, def)
		},
		to: {
			child: true,
			parse: (def, ctx) => {
				if (def === undefined) return
				const to = ctx.$.schema(def)
				return to.kind === "intersection" && to.children.length === 0 ?
						// ignore unknown as an output validator
						undefined
					:	to
			}
		},
		morphs: {
			parse: arrayFrom,
			serialize: morphs => morphs.map(registeredReference)
		}
	},
	normalize: def => def,
	defaults: {
		description: node =>
			`a morph from ${node.from.description} to ${node.to?.description ?? "unknown"}`
	},
	intersections: {
		morph: (l, r, ctx) => {
			if (l.morphs.some((morph, i) => morph !== r.morphs[i]))
				// TODO: check in for union reduction
				return throwParseError("Invalid intersection of morphs")
			const from = intersectNodes(l.from, r.from, ctx)
			if (from instanceof Disjoint) return from
			const to =
				l.to ?
					r.to ?
						intersectNodes(l.to, r.to, ctx)
					:	l.to
				:	r.to
			if (to instanceof Disjoint) return to
			// in case from is a union, we need to distribute the branches
			// to can be a union as any schema is allowed
			return ctx.$.schema(
				from.branches.map(fromBranch =>
					ctx.$.node("morph", {
						morphs: l.morphs,
						from: fromBranch,
						to
					})
				)
			)
		},
		...defineRightwardIntersections("morph", (l, r, ctx) => {
			const from = intersectNodes(l.from, r, ctx)
			return (
				from instanceof Disjoint ? from
				: from.kind === "union" ?
					ctx.$.node(
						"union",
						from.branches.map(branch => ({
							...l.inner,
							from: branch
						}))
					)
				:	ctx.$.node("morph", {
						...l.inner,
						from
					})
			)
		})
	}
})

export class MorphNode extends BaseSchema<MorphDeclaration> {
	serializedMorphs: string[] = (this.json as any).morphs
	compiledMorphs = `[${this.serializedMorphs}]`
	outValidator = this.to?.traverseApply ?? null
	outValidatorReference: string =
		this.to ?
			new NodeCompiler("Apply").reference(this.to, { bind: "this" })
		:	"null"

	traverseAllows: TraverseAllows = (data, ctx) =>
		this.from.traverseAllows(data, ctx)
	traverseApply: TraverseApply = (data, ctx) => {
		ctx.queueMorphs(this.morphs, this.outValidator)
		this.from.traverseApply(data, ctx)
	}

	expression = `(In: ${this.from.expression}) => Out<${this.to?.expression ?? "unknown"}>`

	compile(js: NodeCompiler): void {
		if (js.traversalKind === "Allows") {
			js.return(js.invoke(this.from))
			return
		}
		js.line(
			`ctx.queueMorphs(${this.compiledMorphs}, ${this.outValidatorReference})`
		)
		js.line(js.invoke(this.from))
	}

	getIo(kind: "in" | "out"): BaseSchema {
		return kind === "in" ?
				this.from
			:	(this.to?.out as BaseSchema) ?? this.$.keywords.unknown.raw
	}

	rawKeyOf(): BaseSchema {
		return this.from.rawKeyOf()
	}
}

export type inferPipes<t, pipes extends Morph[]> =
	pipes extends [infer head extends Morph, ...infer tail extends Morph[]] ?
		inferPipes<
			head extends type.cast<infer tPipe> ? inferPipe<t, tPipe>
			:	(In: distillConstrainableIn<t>) => Out<inferMorphOut<head>>,
			tail
		>
	:	t

export type inferMorphOut<morph extends Morph> = Exclude<
	ReturnType<morph>,
	ArkTypeError | ArkErrors
>

export type distillIn<t> =
	includesMorphs<t> extends true ? _distill<t, "in", "base"> : t

export type distillOut<t> =
	includesMorphs<t> extends true ? _distill<t, "out", "base"> : t

export type distillConstrainableIn<t> =
	includesMorphs<t> extends true ? _distill<t, "in", "constrainable"> : t

export type distillConstrainableOut<t> =
	includesMorphs<t> extends true ? _distill<t, "out", "constrainable"> : t

export type includesMorphs<t> =
	[t, _distill<t, "in", "base">, t, _distill<t, "out", "base">] extends (
		[_distill<t, "in", "base">, t, _distill<t, "out", "base">, t]
	) ?
		false
	:	true

type _distill<
	t,
	io extends "in" | "out",
	distilledKind extends "base" | "constrainable"
> =
	unknown extends t ? unknown
	: t extends MorphAst<infer i, infer o> ?
		io extends "in" ?
			i
		:	o
	: t extends of<infer base, any> ?
		distilledKind extends "base" ?
			_distill<base, io, distilledKind>
		:	t
	: t extends TerminallyInferredObjectKind | Primitive ? t
	: t extends array ? distillArray<t, io, distilledKind, []>
	: {
			[k in keyof t]: _distill<t[k], io, distilledKind>
		}

type distillArray<
	t extends array,
	io extends "in" | "out",
	constraints extends "base" | "constrainable",
	prefix extends array
> =
	t extends readonly [infer head, ...infer tail] ?
		distillArray<
			tail,
			io,
			constraints,
			[...prefix, _distill<head, io, constraints>]
		>
	:	[...prefix, ...distillPostfix<t, io, constraints>]

type distillPostfix<
	t extends array,
	io extends "in" | "out",
	constraints extends "base" | "constrainable",
	postfix extends array = []
> =
	t extends readonly [...infer init, infer last] ?
		distillPostfix<
			init,
			io,
			constraints,
			[_distill<last, io, constraints>, ...postfix]
		>
	:	[...{ [i in keyof t]: _distill<t[i], io, constraints> }, ...postfix]

/** Objects we don't want to expand during inference like Date or Promise */
type TerminallyInferredObjectKind =
	| StaticArkOption<"preserve">
	| BuiltinObjects[Exclude<BuiltinObjectKind, "Array">]
