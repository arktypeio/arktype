import {
	type array,
	arrayFrom,
	type BuiltinObjectKind,
	type BuiltinObjects,
	type listable,
	type Primitive,
	reference,
	throwParseError
} from "@arktype/util"
import type { of } from "../constraints/ast.js"
import type { NodeDef } from "../kinds.js"
import type { Node, SchemaDef } from "../node.js"
import type {
	RawSchema,
	RawSchemaAttachments,
	schemaKindRightOf
} from "../schema.js"
import type { StaticArkOption } from "../scope.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type { ArkTypeError } from "../shared/errors.js"
import { basisKinds, implementNode } from "../shared/implement.js"
import { intersectNodes } from "../shared/intersections.js"
import type { TraversalContext } from "../shared/traversal.js"
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
	readonly in: MorphInputNode
	readonly out: RawSchema
	readonly morphs: readonly Morph[]
}

export interface MorphDef extends BaseMeta {
	readonly in: MorphInputDef
	readonly out?: SchemaDef
	readonly morphs: listable<Morph>
}

export type MorphDeclaration = declareNode<{
	kind: "morph"
	def: MorphDef
	normalizedDef: MorphDef
	inner: MorphInner
	childKind: MorphInputKind
	attachments: MorphAttachments
}>

export interface MorphAttachments
	extends RawSchemaAttachments<MorphDeclaration> {
	serializedMorphs: array<string>
}

export const morphImplementation = implementNode<MorphDeclaration>({
	kind: "morph",
	hasAssociatedError: false,
	keys: {
		in: {
			child: true,
			parse: (def, ctx) => ctx.$.node(morphInputKinds, def)
		},
		out: {
			child: true,
			parse: (def, ctx) => ctx.$.parseRoot(def)
		},
		morphs: {
			parse: arrayFrom,
			serialize: (morphs) => morphs.map(reference)
		}
	},
	normalize: (def) => def,
	defaults: {
		description: (node) =>
			`a morph from ${node.in.description} to ${node.out.description}`
	},
	intersections: {
		morph: (l, r, ctx) => {
			if (l.morphs.some((morph, i) => morph !== r.morphs[i])) {
				// TODO: is this always a parse error? what about for union reduction etc.
				// TODO: check in for union reduction
				return throwParseError("Invalid intersection of morphs")
			}
			const inTersection = intersectNodes(l.in, r.in, ctx)
			if (inTersection instanceof Disjoint) {
				return inTersection
			}
			const outTersection = intersectNodes(l.out, r.out, ctx)
			if (outTersection instanceof Disjoint) {
				return outTersection
			}
			return ctx.$.node("morph", {
				morphs: l.morphs,
				in: inTersection,
				out: outTersection
			})
		},
		...defineRightwardIntersections("morph", (l, r, ctx) => {
			const inTersection = intersectNodes(l.in, r, ctx)
			return (
				inTersection instanceof Disjoint ? inTersection
				: inTersection.kind === "union" ?
					ctx.$.node(
						"union",
						inTersection.branches.map((branch) => ({
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
	},
	construct: (self) => {
		const serializedMorphs = self.morphs.map((morph) => reference(morph))
		return {
			serializedMorphs,
			get expression() {
				return `(In: ${this.in.expression}) => Out<${this.out.expression}>`
			},
			traverseAllows: (data, ctx) => self.in.traverseAllows(data, ctx),
			traverseApply: (data, ctx) => {
				self.morphs.forEach((morph) => ctx.queueMorph(morph))
				self.in.traverseApply(data, ctx)
			},
			compile(js: NodeCompiler): void {
				if (js.traversalKind === "Allows") {
					js.return(js.invoke(this.in))
					return
				}
				this.serializedMorphs.forEach((name) =>
					js.line(`ctx.queueMorph(${name})`)
				)
				js.line(js.invoke(this.in))
			},
			get in(): MorphInputNode {
				return this.inner.in
			},
			get out(): RawSchema {
				return this.inner.out ?? self.$.keywords.unknown
			},
			rawKeyOf(): RawSchema {
				return this.in.rawKeyOf()
			}
		}
	}
})

export interface MorphNode extends RawSchema<MorphDeclaration> {
	// ensure these types are derived from MorphInner rather than those
	// defined on RawNode
	get in(): MorphInputNode
	get out(): MorphInputNode
}

export type inferMorphOut<morph extends Morph> = Exclude<
	ReturnType<morph>,
	ArkTypeError
>

export type distillIn<t> =
	includesMorphs<t> extends true ? $distill<t, "in", "base"> : t

export type distillOut<t> =
	includesMorphs<t> extends true ? $distill<t, "out", "base"> : t

export type distillConstrainableIn<t> =
	includesMorphs<t> extends true ? $distill<t, "in", "constrainable"> : t

export type distillConstrainableOut<t> =
	includesMorphs<t> extends true ? $distill<t, "out", "constrainable"> : t

export type includesMorphs<t> =
	[t, $distill<t, "in", "base">, t, $distill<t, "out", "base">] extends (
		[$distill<t, "in", "base">, t, $distill<t, "out", "base">, t]
	) ?
		false
	:	true

type $distill<
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
			$distill<base, io, distilledKind>
		:	t
	: t extends TerminallyInferredObjectKind | Primitive ? t
	: t extends array ? distillArray<t, io, distilledKind, []>
	: {
			[k in keyof t]: $distill<t[k], io, distilledKind>
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
			[...prefix, $distill<head, io, constraints>]
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
			[$distill<last, io, constraints>, ...postfix]
		>
	:	[...{ [i in keyof t]: $distill<t[i], io, constraints> }, ...postfix]

/** Objects we don't want to expand during inference like Date or Promise */
type TerminallyInferredObjectKind =
	| StaticArkOption<"preserve">
	| BuiltinObjects[Exclude<BuiltinObjectKind, "Array">]
