import {
	arrayFrom,
	registeredReference,
	throwParseError,
	type BuiltinObjectKind,
	type BuiltinObjects,
	type Primitive,
	type anyOrNever,
	type array,
	type listable,
	type show
} from "@arktype/util"
import type { of } from "../ast.js"
import type { type } from "../inference.js"
import type { Node, NodeSchema } from "../kinds.js"
import type { StaticArkOption } from "../scope.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type { ArkError, ArkErrors } from "../shared/errors.js"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.js"
import { intersectNodes, type inferPipe } from "../shared/intersections.js"
import type {
	TraversalContext,
	TraverseAllows,
	TraverseApply
} from "../shared/traversal.js"
import { hasArkKind } from "../shared/utils.js"
import type { DefaultableAst } from "../structure/optional.js"
import { BaseRoot, type Root, type schemaKindRightOf } from "./root.js"
import { defineRightwardIntersections } from "./utils.js"

export type MorphChildKind = schemaKindRightOf<"morph"> | "alias"

const morphChildKinds: array<MorphChildKind> = [
	"alias",
	"intersection",
	"unit",
	"domain",
	"proto"
]

export type MorphChildNode = Node<MorphChildKind>

export type MorphChildSchema = NodeSchema<MorphChildKind>

export type Morph<i = any, o = unknown> = (In: i, ctx: TraversalContext) => o

export type Out<o = any> = ["=>", o]

export type MorphAst<i = any, o = any> = (In: i) => Out<o>

export interface MorphInner extends BaseMeta {
	readonly in: MorphChildNode
	readonly morphs: array<Morph | Root>
}

export interface MorphSchema extends BaseMeta {
	readonly in: MorphChildSchema
	readonly morphs: listable<Morph | Root>
}

export interface MorphDeclaration
	extends declareNode<{
		kind: "morph"
		schema: MorphSchema
		normalizedSchema: MorphSchema
		inner: MorphInner
		childKind: MorphChildKind
	}> {}

export const morphImplementation: nodeImplementationOf<MorphDeclaration> =
	implementNode<MorphDeclaration>({
		kind: "morph",
		hasAssociatedError: false,
		keys: {
			in: {
				child: true,
				parse: (schema, ctx) => ctx.$.node(morphChildKinds, schema)
			},
			morphs: {
				parse: arrayFrom,
				serialize: morphs =>
					morphs.map(m =>
						hasArkKind(m, "root") ? m.json : registeredReference(m)
					)
			}
		},
		normalize: schema => schema,
		defaults: {
			description: node =>
				`a morph from ${node.in.description} to ${node.out?.description ?? "unknown"}`
		},
		intersections: {
			morph: (l, r, ctx) => {
				if (l.morphs.some((morph, i) => morph !== r.morphs[i])) {
					return throwParseError(
						writeMorphIntersectionMessage(l.expression, r.expression)
					)
				}
				const inTersection = intersectNodes(l.in, r.in, ctx)
				if (inTersection instanceof Disjoint) return inTersection

				// in case from is a union, we need to distribute the branches
				// to can be a union as any schema is allowed
				return ctx.$.schema(
					inTersection.branches.map(inBranch =>
						ctx.$.node("morph", {
							morphs: l.morphs,
							in: inBranch
						})
					)
				)
			},
			...defineRightwardIntersections("morph", (l, r, ctx) => {
				const inTersection = intersectNodes(l.in, r, ctx)
				return (
					inTersection instanceof Disjoint ? inTersection
					: inTersection.kind === "union" ?
						ctx.$.node(
							"union",
							inTersection.branches.map(branch => ({
								...l.inner,
								in: branch
							}))
						)
					:	ctx.$.node("morph", {
							...l.inner,
							in: inTersection
						})
				)
			})
		}
	})

export class MorphNode extends BaseRoot<MorphDeclaration> {
	serializedMorphs: string[] = this.morphs.map(registeredReference)
	compiledMorphs = `[${this.serializedMorphs}]`

	traverseAllows: TraverseAllows = (data, ctx) =>
		this.in.traverseAllows(data, ctx)

	traverseApply: TraverseApply = (data, ctx) => {
		this.in.traverseApply(data, ctx)
		ctx.queueMorphs(this.morphs)
	}

	expression = `(In: ${this.in.expression}) => Out<${this.out?.expression ?? "unknown"}>`

	get shortDescription(): string {
		return this.in.shortDescription
	}

	compile(js: NodeCompiler): void {
		if (js.traversalKind === "Allows") {
			js.return(js.invoke(this.in))
			return
		}
		js.line(js.invoke(this.in))
		js.line(`ctx.queueMorphs(${this.compiledMorphs})`)
	}

	override get in(): BaseRoot {
		return this.inner.in
	}

	lastMorph = this.inner.morphs.at(-1)
	validatedOut: BaseRoot | undefined =
		hasArkKind(this.lastMorph, "root") ?
			Object.assign(this.referencesById, this.lastMorph.out.referencesById) &&
			this.lastMorph.out
		:	undefined

	override get out(): BaseRoot {
		return this.validatedOut ?? this.$.keywords.unknown.internal
	}

	rawKeyOf(): BaseRoot {
		return this.in.rawKeyOf()
	}
}

export const writeMorphIntersectionMessage = (
	lDescription: string,
	rDescription: string
) =>
	`The intersection of distinct morphs at a single path is indeterminate:
Left: ${lDescription}
Right: ${rDescription}`

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
	ArkError | ArkErrors
>

export type distillIn<t> =
	includesMorphsOrConstraints<t> extends true ? _distill<t, "in", "base"> : t

export type distillOut<t> =
	includesMorphsOrConstraints<t> extends true ? _distill<t, "out", "base"> : t

export type distillConstrainableIn<t> =
	includesMorphsOrConstraints<t> extends true ?
		_distill<t, "in", "constrainable">
	:	t

export type distillConstrainableOut<t> =
	includesMorphsOrConstraints<t> extends true ?
		_distill<t, "out", "constrainable">
	:	t

export type includesMorphsOrConstraints<t> =
	[t, _distill<t, "in", "base">, t, _distill<t, "out", "base">] extends (
		[_distill<t, "in", "base">, t, _distill<t, "out", "base">, t]
	) ?
		false
	:	true

export type includesMorphs<t> =
	[
		_distill<t, "in", "constrainable">,
		_distill<t, "out", "constrainable">
	] extends (
		[_distill<t, "out", "constrainable">, _distill<t, "in", "constrainable">]
	) ?
		false
	:	true

type _distill<
	t,
	io extends "in" | "out",
	distilledKind extends "base" | "constrainable"
> =
	t extends TerminallyInferredObjectKind | ArkEnv.preserve | Primitive ? t
	: unknown extends t ? unknown
	: t extends MorphAst<infer i, infer o> ?
		io extends "in" ?
			_distill<i, io, distilledKind>
		:	_distill<o, io, distilledKind>
	: t extends DefaultableAst<infer t> ? _distill<t, io, distilledKind>
	: t extends of<infer base, any> ?
		distilledKind extends "base" ?
			_distill<base, io, distilledKind>
		:	t
	: t extends array ? distillArray<t, io, distilledKind, []>
	: // we excluded this from TerminallyInferredObjectKind so that those types could be
	// inferred before checking morphs/defaults, which extend Function
	t extends Function ? t
	: // avoid recursing into classes with private props etc.
	{ [k in keyof t]: t[k] } extends t ?
		io extends "in" ?
			show<
				{
					[k in keyof t as k extends defaultableKeyOf<t> ? never : k]: _distill<
						t[k],
						io,
						distilledKind
					>
				} & { [k in defaultableKeyOf<t>]?: _distill<t[k], io, distilledKind> }
			>
		:	{
				[k in keyof t]: _distill<t[k], io, distilledKind>
			}
	:	t

type defaultableKeyOf<t> = {
	[k in keyof t]: [t[k]] extends [anyOrNever] ? never
	: t[k] extends DefaultableAst ? k
	: never
}[keyof t]

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
	| BuiltinObjects[Exclude<BuiltinObjectKind, "Array" | "Function">]
