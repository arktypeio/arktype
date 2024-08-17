import {
	arrayEquals,
	liftArray,
	throwParseError,
	type array,
	type listable
} from "@ark/util"
import type { nodeOfKind, NodeSchema } from "../kinds.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { BaseNormalizedSchema, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.js"
import { intersectNodes } from "../shared/intersections.js"
import {
	writeJsonSchemaMorphMessage,
	type JsonSchema
} from "../shared/jsonSchema.js"
import { $ark, registeredReference } from "../shared/registry.js"
import type {
	TraversalContext,
	TraverseAllows,
	TraverseApply
} from "../shared/traversal.js"
import { hasArkKind } from "../shared/utils.js"
import { BaseRoot, type schemaKindRightOf } from "./root.js"
import { defineRightwardIntersections } from "./utils.js"

export declare namespace Morph {
	export type ChildKind = schemaKindRightOf<"morph"> | "alias"

	export type ChildNode = nodeOfKind<ChildKind>

	export type ChildSchema = NodeSchema<ChildKind>

	export interface Inner {
		readonly in: ChildNode
		readonly morphs: array<Morph | BaseRoot>
	}

	export interface Schema extends BaseNormalizedSchema {
		readonly in: ChildSchema
		readonly morphs: listable<Morph | BaseRoot>
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
				return inTersection.distribute(
					inBranch =>
						ctx.$.node("morph", {
							morphs: l.morphs,
							in: inBranch as never
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
		return this.validatedOut ?? $ark.intrinsic.unknown.internal
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

	lastMorph = this.inner.morphs.at(-1)
	validatedOut: BaseRoot | undefined =
		hasArkKind(this.lastMorph, "root") ?
			Object.assign(this.referencesById, this.lastMorph.out.referencesById) &&
			this.lastMorph.out
		:	undefined

	expression = `(In: ${this.in.expression}) => Out<${this.out.expression}>`
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
