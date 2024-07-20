import {
	$ark,
	arrayEquals,
	liftArray,
	throwParseError,
	type array,
	type listable
} from "@ark/util"
import type { distillConstrainableIn } from "../ast.js"
import type { type } from "../inference.js"
import type { Node, NodeSchema } from "../kinds.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type { ArkError, ArkErrors } from "../shared/errors.js"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.js"
import { intersectNodes, type inferPipe } from "../shared/intersections.js"
import { registeredReference } from "../shared/registry.js"
import type {
	TraversalContext,
	TraverseAllows,
	TraverseApply
} from "../shared/traversal.js"
import { hasArkKind } from "../shared/utils.js"
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
				parse: liftArray,
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
				if (!l.hasEqualMorphs(r)) {
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
							in: inBranch as never
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
	structure = this.in.structure

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

	override get in(): MorphChildNode {
		return this.inner.in
	}

	override get out(): BaseRoot {
		return this.validatedOut ?? $ark.intrinsic.unknown.internal
	}

	/** Check if the morphs of r are equal to those of this node */
	hasEqualMorphs(r: MorphNode) {
		return arrayEquals(this.morphs, r.morphs, {
			isEqual: (lMorph, rMorph) =>
				lMorph === rMorph ||
				(hasArkKind(lMorph, "root") &&
					hasArkKind(rMorph, "root") &&
					lMorph.equals(rMorph))
		})
	}

	lastMorph = this.inner.morphs.at(-1)
	validatedOut: BaseRoot | undefined =
		hasArkKind(this.lastMorph, "root") ?
			Object.assign(this.referencesById, this.lastMorph.out.referencesById) &&
			this.lastMorph.out
		:	undefined

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
			pipes[0] extends type.cast<infer tPipe> ? inferPipe<t, tPipe>
			: inferMorphOut<head> extends infer out ?
				(In: distillConstrainableIn<t>) => Out<out>
			:	never,
			tail
		>
	:	t

export type inferMorphOut<morph extends Morph> = Exclude<
	ReturnType<morph>,
	ArkError | ArkErrors
>
