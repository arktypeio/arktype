import {
	arrayEquals,
	liftArray,
	throwParseError,
	type array,
	type listable,
	type mutable
} from "@ark/util"
import type { nodeOfKind, NodeSchema } from "../kinds.ts"
import type { NodeCompiler } from "../shared/compile.ts"
import type { BaseNormalizedSchema, declareNode } from "../shared/declare.ts"
import { Disjoint } from "../shared/disjoint.ts"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
import { intersectNodes } from "../shared/intersections.ts"
import {
	writeJsonSchemaMorphMessage,
	type JsonSchema
} from "../shared/jsonSchema.ts"
import { $ark, registeredReference } from "../shared/registry.ts"
import type {
	TraversalContext,
	TraverseAllows,
	TraverseApply
} from "../shared/traversal.ts"
import { hasArkKind } from "../shared/utils.ts"
import { BaseRoot, type schemaKindRightOf } from "./root.ts"
import { defineRightwardIntersections } from "./utils.ts"

export declare namespace Morph {
	export type ChildKind = schemaKindRightOf<"morph"> | "alias"

	export type ChildNode = nodeOfKind<ChildKind>

	export type ChildSchema = NodeSchema<ChildKind>

	export interface Inner {
		readonly in: ChildNode
		readonly morphs: array<Morph | BaseRoot>
		readonly declaredOut?: BaseRoot
	}

	export interface Schema extends BaseNormalizedSchema {
		readonly in: ChildSchema
		readonly morphs: listable<Morph | BaseRoot>
		readonly declaredOut?: BaseRoot
	}

	export interface Declaration
		extends declareNode<{
			kind: "morph"
			schema: Schema
			normalizedSchema: Schema
			inner: Inner
			childKind: ChildKind
		}> {}

	export type Node = MorphNode
}

const morphChildKinds: array<Morph.ChildKind> = [
	"alias",
	"intersection",
	"unit",
	"domain",
	"proto"
]

export type Morph<i = any, o = unknown> = (In: i, ctx: TraversalContext) => o

const implementation: nodeImplementationOf<Morph.Declaration> =
	implementNode<Morph.Declaration>({
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
			},
			declaredOut: {
				child: false,
				serialize: node => node.json
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

				const baseInner: Omit<mutable<Morph.Inner>, "in"> = {
					morphs: l.morphs
				}

				const declaredOut =
					l.declaredOut ?
						r.declaredOut ?
							intersectNodes(l.declaredOut, r.declaredOut, ctx)
						:	l.declaredOut
					:	r.declaredOut

				if (declaredOut) {
					// we can't treat this as a normal Disjoint since it's in the output
					// it should only happen if someone's essentially trying to create a broken type
					if (declaredOut instanceof Disjoint) return declaredOut.throw()
					else baseInner.declaredOut = declaredOut
				}

				// in case from is a union, we need to distribute the branches
				// to can be a union as any schema is allowed
				return inTersection.distribute(
					inBranch =>
						ctx.$.node("morph", {
							...baseInner,
							in: inBranch as Morph.ChildNode
						}),
					ctx.$.rootNode
				)
			},
			...defineRightwardIntersections("morph", (l, r, ctx) => {
				const inTersection = intersectNodes(l.in, r, ctx)
				return inTersection instanceof Disjoint ? inTersection : (
						inTersection.distribute(
							branch => ({
								...l.inner,
								in: branch as Morph.ChildNode
							}),
							ctx.$.rootNode
						)
					)
			})
		}
	})

export class MorphNode extends BaseRoot<Morph.Declaration> {
	serializedMorphs: string[] = this.morphs.map(registeredReference)
	compiledMorphs = `[${this.serializedMorphs}]`
	structure = this.in.structure

	lastMorph = this.inner.morphs.at(-1)
	validatedOut: BaseRoot | undefined =
		hasArkKind(this.lastMorph, "root") ?
			Object.assign(this.referencesById, this.lastMorph.out.referencesById) &&
			this.lastMorph.out
		:	undefined

	expression = `(In: ${this.in.expression}) => Out<${this.out.expression}>`

	traverseAllows: TraverseAllows = (data, ctx) =>
		this.in.traverseAllows(data, ctx)

	traverseApply: TraverseApply = (data, ctx) => {
		this.in.traverseApply(data, ctx)
		ctx.queueMorphs(this.morphs)
	}

	get shortDescription(): string {
		return this.in.shortDescription
	}

	protected innerToJsonSchema(): JsonSchema {
		return throwParseError(writeJsonSchemaMorphMessage(this.expression))
	}

	compile(js: NodeCompiler): void {
		if (js.traversalKind === "Allows") {
			js.return(js.invoke(this.in))
			return
		}
		js.line(js.invoke(this.in))
		js.line(`ctx.queueMorphs(${this.compiledMorphs})`)
	}

	override get in(): Morph.ChildNode {
		return this.inner.in
	}

	override get out(): BaseRoot {
		return (
			this.declaredOut ?? this.validatedOut ?? $ark.intrinsic.unknown.internal
		)
	}

	/** Check if the morphs of r are equal to those of this node */
	hasEqualMorphs(r: MorphNode): boolean {
		return arrayEquals(this.morphs, r.morphs, {
			isEqual: (lMorph, rMorph) =>
				lMorph === rMorph ||
				(hasArkKind(lMorph, "root") &&
					hasArkKind(rMorph, "root") &&
					lMorph.equals(rMorph))
		})
	}
}

export const Morph = {
	implementation,
	Node: MorphNode
}

export const writeMorphIntersectionMessage = (
	lDescription: string,
	rDescription: string
): string =>
	`The intersection of distinct morphs at a single path is indeterminate:
Left: ${lDescription}
Right: ${rDescription}`
