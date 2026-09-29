import { arrayEquals, liftArray, type array, type listable } from "@ark/util"
import type { RootSchema } from "../kinds.ts"
import type { NodeCompiler } from "../shared/compile.ts"
import type { BaseNormalizedSchema, declareNode } from "../shared/declare.ts"
import {
	implementNode,
	type nodeImplementationOf,
	type RootKind
} from "../shared/implement.ts"
import { $ark, registeredReference } from "../shared/registry.ts"
import type {
	Traversal,
	TraverseAllows,
	TraverseApply
} from "../shared/traversal.ts"
import { hasArkKind } from "../shared/utils.ts"
import { BaseRoot } from "./root.ts"

export declare namespace Morph {
	export interface Inner {
		readonly in?: BaseRoot
		readonly morphs: array<Morph | BaseRoot>
		readonly declaredIn?: BaseRoot
		readonly declaredOut?: BaseRoot
	}

	export interface Schema extends BaseNormalizedSchema {
		readonly in?: RootSchema
		readonly morphs: listable<Morph | BaseRoot>
		readonly declaredIn?: BaseRoot
		readonly declaredOut?: BaseRoot
	}

	export interface Declaration
		extends declareNode<{
			kind: "morph"
			schema: Schema
			normalizedSchema: Schema
			inner: Inner
			childKind: RootKind
		}> {}

	export type Node = MorphNode

	export type In<morph extends Morph> = morph extends Morph<infer i> ? i : never

	export type Out<morph extends Morph> =
		morph extends Morph<never, infer o> ? o : never

	export type ContextFree<i = never, o = unknown> = (In: i) => o
}

export type Morph<i = never, o = unknown> = (In: i, ctx: Traversal) => o

const implementation: nodeImplementationOf<Morph.Declaration> =
	implementNode<Morph.Declaration>({
		kind: "morph",
		hasAssociatedError: false,
		keys: {
			in: {
				child: true,
				parse: (schema, ctx) => ctx.$.parseSchema(schema)
			},
			morphs: {
				parse: liftArray,
				serialize: morphs =>
					morphs.map(m =>
						hasArkKind(m, "root") ? m.json : registeredReference(m)
					)
			},
			declaredIn: {
				child: false,
				serialize: node => node.json
			},
			declaredOut: {
				child: false,
				serialize: node => node.json
			}
		},
		normalize: schema => schema,
		defaults: {
			description: node =>
				`a morph from ${node.rawIn.description} to ${node.rawOut?.description ?? "unknown"}`
		}
	})

export class MorphNode extends BaseRoot<Morph.Declaration> {
	serializedMorphs: string[] = this.morphs.map(registeredReference)
	compiledMorphs = `[${this.serializedMorphs}]`

	lastMorph: Morph | BaseRoot | undefined =
		this.inner.morphs[this.inner.morphs.length - 1]
	lastMorphIfNode: BaseRoot | undefined =
		hasArkKind(this.lastMorph, "root") ? this.lastMorph : undefined
	introspectableIn: BaseRoot | undefined = this.inner.in
	introspectableOut: BaseRoot | undefined =
		this.lastMorphIfNode ?
			Object.assign(this.referencesById, this.lastMorphIfNode.referencesById) &&
			this.lastMorphIfNode.rawOut
		:	undefined

	get shallowMorphs(): array<Morph> {
		// if the morph input is a union, it should not contain any other shallow morphs
		return Array.isArray(this.inner.in?.shallowMorphs) ?
				[...this.inner.in.shallowMorphs, ...this.morphs]
			:	this.morphs
	}

	override get rawIn(): BaseRoot {
		return (
			this.declaredIn ?? this.inner.in?.rawIn ?? $ark.intrinsic.unknown.internal
		)
	}

	override get rawOut(): BaseRoot {
		return (
			this.declaredOut ??
			this.introspectableOut ??
			$ark.intrinsic.unknown.internal
		)
	}

	declareIn(declaredIn: BaseRoot): MorphNode {
		return this.$.node("morph", {
			...this.inner,
			declaredIn
		})
	}

	declareOut(declaredOut: BaseRoot): MorphNode {
		return this.$.node("morph", {
			...this.inner,
			declaredOut
		})
	}

	expression = `(In: ${this.rawIn.expression}) => ${this.lastMorphIfNode ? "To" : "Out"}<${this.rawOut.expression}>`

	get defaultShortDescription(): string {
		return this.rawIn.meta.description ?? this.rawIn.defaultShortDescription
	}

	compile(js: NodeCompiler): void {
		if (js.traversalKind === "Allows") {
			if (!this.introspectableIn) return
			js.return(js.invoke(this.introspectableIn))
			return
		}
		if (this.introspectableIn) js.line(js.invoke(this.introspectableIn))
		js.line(`ctx.queueMorphs([${this.morphs.map(morph => js.ref(morph))}])`)
	}

	traverseAllows: TraverseAllows = (data, ctx) =>
		!this.introspectableIn || this.introspectableIn.traverseAllows(data, ctx)

	traverseApply: TraverseApply = (data, ctx) => {
		if (this.introspectableIn) this.introspectableIn.traverseApply(data, ctx)
		ctx.queueMorphs(this.morphs)
	}

	/** Check if the morphs of r are equal to those of this node */
	override hasEqualMorphs(r: MorphNode): boolean {
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
