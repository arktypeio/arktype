import { arityOf, arrayEquals, isArray, type array } from "@ark/util"
import type { BaseNode } from "../node.ts"
import type { NodeCompiler } from "../shared/compile.ts"
import type { declareNode } from "../shared/declare.ts"
import { ArkErrors } from "../shared/issues.ts"
import {
	implementNode,
	type nodeImplementationOf,
	type RootKind
} from "../shared/implement.ts"
import { $ark, namedReference } from "../shared/registry.ts"
import { TransformErrors } from "../shared/transform.ts"
import {
	addErrors,
	applyMember,
	callMorph,
	pipe,
	pipeOf,
	transform,
	type Traversal,
	type TraverseAllows,
	type TraverseApply,
	type TraverseTransform
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

	export interface Declaration
		extends declareNode<{
			kind: "morph"
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
				child: true
			},
			morphs: {
				serialize: morphs =>
					morphs.map(m => (hasArkKind(m, "root") ? m.json : namedReference(m)))
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
		defaults: {
			description: node =>
				`a morph from ${node.rawIn.description} to ${node.rawOut?.description ?? "unknown"}`
		}
	})

export class MorphNode extends BaseRoot<Morph.Declaration> {
	get serializedMorphs(): string[] {
		return this.morphs.map(namedReference)
	}

	lastMorph: Morph | BaseRoot | undefined =
		this.inner.morphs[this.inner.morphs.length - 1]
	lastMorphIfNode: BaseRoot | undefined =
		hasArkKind(this.lastMorph, "root") ? this.lastMorph : undefined
	introspectableIn: BaseRoot | undefined = this.inner.in
	introspectableOut: BaseRoot | undefined =
		this.lastMorphIfNode && this.includePiped(this.lastMorphIfNode).rawOut

	// the node a morph pipes to isn't a child, so its aliases are included here
	private includePiped(node: BaseRoot): BaseRoot {
		this.includesAlias ||= node.includesAlias
		return node
	}

	override get referencedBesidesChildren(): readonly BaseNode[] {
		return this.lastMorphIfNode ? [this.lastMorphIfNode] : []
	}

	get shallowMorphs(): array<Morph> {
		// if the morph input is a union, it should not contain any other shallow morphs
		return isArray(this.inner.in?.shallowMorphs) ?
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
			this.lastMorphIfNode?.rawOut ??
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
			js.return(this.introspectableIn ? js.invoke(this.introspectableIn) : true)
			return
		}
		if (js.traversalKind === "Transform") return this.compileTransform(js)
		js.return(
			this.introspectableIn ? js.applyMember(this.introspectableIn) : true
		)
	}

	private compileTransform(js: NodeCompiler): void {
		let result = "data"
		if (this.introspectableIn?.transforms) {
			js.initializeTransform([this.introspectableIn])
				.transformKey("transformedIn", "data", [
					{ node: this.introspectableIn }
				])
				.returnIfTransformFailed()
			result = "transformedIn"
		}
		for (let i = 0; i < this.morphs.length; i++) {
			const morph = this.morphs[i]
			const morphed = `morphed${i}`
			if (hasArkKind(morph, "root")) {
				js.const(
					morphed,
					`${js.ref(pipeOf(morph))}(ctx, ${js.ref(morph)}, ${result})`
				).if(`ctx._errors !== undefined && ${morphed} === ctx._errors`, () =>
					js.return("data")
				)
			} else {
				const call =
					arityOf(morph) === 1 ?
						`${js.ref(morph)}(${result})`
					:	`${js.ref(callMorph)}(ctx, ${js.ref(morph)}, ${result})`
				js.const(morphed, call).if(
					`${morphed} instanceof ${js.ref(ArkErrors)}`,
					() =>
						js.requiresContext ?
							js.line(`${js.ref(addErrors)}(ctx, ${morphed})`).return("data")
						:	js.return(`new ${js.ref(TransformErrors)}(${morphed}, ${result})`)
				)
			}
			result = morphed
		}
		js.return(result)
	}

	traverseAllows: TraverseAllows = (data, ctx) =>
		!this.introspectableIn || this.introspectableIn.traverseAllows(data, ctx)

	traverseApply: TraverseApply = (data, ctx) => {
		if (this.introspectableIn) applyMember(this.introspectableIn, data, ctx)
	}

	traverseTransform: TraverseTransform = (data, ctx) => {
		const errorCount = ctx.currentErrorCount
		let result =
			this.introspectableIn?.transforms ?
				transform(ctx, this.introspectableIn, data)
			:	data
		if (ctx.currentErrorCount > errorCount) return data
		for (const morph of this.morphs) {
			if (hasArkKind(morph, "root")) {
				result = pipe(ctx, morph, result)
				if (ctx._errors !== undefined && result === ctx._errors) return data
				continue
			}
			const morphed =
				arityOf(morph) === 1 ?
					(morph as Morph.ContextFree)(result as never)
				:	callMorph(ctx, morph, result)
			if (morphed instanceof ArkErrors) {
				addErrors(ctx, morphed)
				return data
			}
			result = morphed
		}
		return result
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
