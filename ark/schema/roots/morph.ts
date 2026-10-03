import { arrayEquals, liftArray, type array, type listable } from "@ark/util"
import type { RootSchema } from "../kinds.ts"
import type { BaseNode } from "../node.ts"
import type { NodeCompiler } from "../shared/compile.ts"
import type { BaseNormalizedSchema, declareNode } from "../shared/declare.ts"
import { isArkErrorResult } from "../shared/errors.ts"
import {
	implementNode,
	type nodeImplementationOf,
	type RootKind
} from "../shared/implement.ts"
import { $ark, registeredReference } from "../shared/registry.ts"
import {
	applyResolution,
	TransformErrors,
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
	get serializedMorphs(): string[] {
		return this.morphs.map(registeredReference)
	}

	lastMorph: Morph | BaseRoot | undefined =
		this.inner.morphs[this.inner.morphs.length - 1]
	lastMorphIfNode: BaseRoot | undefined =
		hasArkKind(this.lastMorph, "root") ? this.lastMorph : undefined
	introspectableIn: BaseRoot | undefined = this.inner.in
	introspectableOut: BaseRoot | undefined =
		this.lastMorphIfNode && this.addPipedReferences(this.lastMorphIfNode).rawOut

	// an alias the piped node references is among the morph's references too
	private addPipedReferences(node: BaseRoot): BaseRoot {
		if (this._referencesById)
			Object.assign(this._referencesById, node.referencesById)
		else if (node.includesAlias) {
			this.includesAlias = true
			this.copyReferences(true)
		}
		return node
	}

	protected override get referencedBesidesChildren(): readonly BaseNode[] {
		return this.lastMorphIfNode ? [this.lastMorphIfNode] : []
	}

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
		if (this.introspectableIn) js.invokeMember(this.introspectableIn)
		js.line(`ctx.queueMorphs([${this.morphs.map(morph => js.ref(morph))}])`)
	}

	private compileTransform(js: NodeCompiler): void {
		let result = "data"
		if (this.introspectableIn?.transforms) {
			js.initializeTransform([this.introspectableIn])
				.transformKey("transformedIn", "data", this.introspectableIn)
				.returnIfTransformFailed()
			result = "transformedIn"
		}
		for (let i = 0; i < this.morphs.length; i++) {
			const morph = this.morphs[i]
			const morphed = `morphed${i}`
			if (hasArkKind(morph, "root")) {
				js.const(morphed, `ctx.pipe(${js.ref(morph)}, ${result})`).if(
					`${morphed} === ctx.errors`,
					() => js.return("data")
				)
			} else {
				const args = morph.length === 1 ? result : `${result}, ctx`
				if (morph.length !== 1) js.line(`ctx.receive(${result})`)
				js.const(morphed, `${js.ref(morph)}(${args})`).if(
					`${js.ref(isArkErrorResult)}(${morphed})`,
					() =>
						js.requiresContext ?
							js
								.line(`ctx.receive(${result})`)
								.line(`ctx.addMorphErrors(${morphed})`)
								.return("data")
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
		const input = this.introspectableIn
		if (input?.includesAlias)
			applyResolution(input.id, input.traverseApply, data, ctx)
		else input?.traverseApply(data, ctx)
		ctx.queueMorphs(this.morphs)
	}

	traverseTransform: TraverseTransform = (data, ctx) => {
		const errorCount = ctx.currentErrorCount
		let result =
			this.introspectableIn?.transforms ?
				ctx.transform(this.introspectableIn, data)
			:	data
		if (ctx.currentErrorCount > errorCount) return data
		for (const morph of this.morphs) {
			if (hasArkKind(morph, "root")) {
				result = ctx.pipe(morph, result)
				if (result === ctx.errors) return data
				continue
			}
			ctx.receive(result)
			const morphed = morph(
				result as never,
				(morph.length === 1 ? undefined : ctx) as never
			)
			if (isArkErrorResult(morphed)) {
				ctx.addMorphErrors(morphed)
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
