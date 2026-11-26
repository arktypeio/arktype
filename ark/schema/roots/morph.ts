import { arityOf, arrayEquals, isArray, type array, type Fn } from "@ark/util"
import type { BaseNode } from "../node.ts"
import type { NodeCompiler } from "../shared/compile.ts"
import type { declareNode, TypeMeta } from "../shared/declare.ts"
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
	saysOf,
	transform,
	type AliasDepth,
	type InternalTraversal,
	type Says,
	type Traversal
} from "../shared/traversal.ts"
import { composing, hasArkKind } from "../shared/utils.ts"
import { BaseRoot } from "./root.ts"

export declare namespace Morph {
	export interface Inner {
		/** its pipeline: the node data must allow first, if any, then each morph or node it pipes to */
		readonly morphs: array<Morph | BaseRoot>
		/** the input `_in` returns in place of its head's, e.g. a string `Date` can parse */
		readonly declaredIn?: BaseRoot
		/** the output `_out` returns in place of its tail's or `unknown` */
		readonly declaredOut?: BaseRoot
		readonly inverse?: Morph
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
		ownErr: false,
		keys: {
			morphs: {
				child: morphs => (hasArkKind(morphs[0], "root") ? [morphs[0]] : []),
				serialize: morphs =>
					morphs.map(m =>
						hasArkKind(m, "root") ? m.bareJson : namedReference(m)
					)
			},
			declaredIn: {
				child: false,
				serialize: node => node.json
			},
			declaredOut: {
				child: false,
				serialize: node => node.json
			},
			inverse: {
				serialize: namedReference
			}
		},
		// the input of a pipeline written as { in, morphs } starts it
		applyConfig: inner => {
			const { in: input, ...rest } = inner as Morph.Inner & { in?: BaseRoot }
			return input ? { ...rest, morphs: [input, ...rest.morphs] } : inner
		},
		defaults: {
			description: node =>
				`a morph from ${node._in.description} to ${node._out?.description ?? "unknown"}`
		}
	})

export class MorphNode extends BaseRoot<Morph.Declaration> {
	/** the node its pipeline starts with, which data must allow before any morph runs, its own morphs included */
	head: BaseRoot | undefined =
		hasArkKind(this.morphs[0], "root") ? this.morphs[0] : undefined
	/** the node its pipeline ends with, besides its head: the one its output is piped to */
	tail: BaseRoot | undefined = this.includePiped()
	/** what its head pipes to: its morphs and the nodes they pipe to */
	piped: array<Morph | BaseRoot> =
		this.head ? this.morphs.slice(1) : this.morphs
	// fixed at creation, as ctxMorph is
	contextFree: boolean[] = this.morphs.map(
		morph => !hasArkKind(morph, "root") && arityOf(morph) === 1
	)

	// what the error each keyword's morph raises says in place of the
	// keyword's text, passed to it as its third argument
	says: (Says | undefined)[] = this.morphs.map(morph =>
		saysOf(this.meta, morph)
	)

	private _traversedMorphs: array<Morph | BaseRoot> | undefined

	// a configured message or label is its output's errors' too: the node a
	// morph pipes to isn't a child, so configuring the morph doesn't reach it
	get travMorphs(): array<Morph | BaseRoot> {
		if (this._traversedMorphs) return this._traversedMorphs
		const { message, label } = this.meta
		if (message === undefined && label === undefined)
			return (this._traversedMorphs = this.morphs)
		const meta: TypeMeta.MappableInput.Internal = {}
		if (message !== undefined) meta.message = message
		if (label !== undefined) meta.label = label
		return (this._traversedMorphs = this.morphs.map((morph, i) =>
			i && hasArkKind(morph, "root") ? morph.configure(meta) : morph
		))
	}

	// the nodes a morph pipes to aren't children, so their aliases are included here
	private includePiped(): BaseRoot | undefined {
		for (let i = 1; i < this.morphs.length; i++) {
			const morph = this.morphs[i]
			if (hasArkKind(morph, "root")) this.hasAlias ||= morph.hasAlias
		}
		const last = this.morphs[this.morphs.length - 1]
		return this.morphs.length > 1 && hasArkKind(last, "root") ? last : undefined
	}

	private _otherRefs: readonly BaseNode[] | undefined

	override get otherRefs(): readonly BaseNode[] {
		if (this._otherRefs) return this._otherRefs
		const refs: BaseNode[] = []
		// a configured message's copy is what traversal pipes to
		const morphs = this.travMorphs
		for (let i = 1; i < this.morphs.length; i++) {
			const morph = this.morphs[i]
			if (!hasArkKind(morph, "root")) continue
			refs.push(morph)
			if (morphs[i] !== morph) refs.push(morphs[i] as BaseRoot)
		}
		return (this._otherRefs = refs)
	}

	get topMorphs(): array<Morph> {
		// if the morph input is a union, it should not contain any other shallow morphs
		return isArray(this.head?.topMorphs) ?
				[...this.head.topMorphs, ...this.piped]
			:	(this.piped as array<Morph>)
	}

	override get _in(): BaseRoot {
		return this.declaredIn ?? this.head?._in ?? $ark.kw.unknown.internal
	}

	override get _out(): BaseRoot {
		return this.declaredOut ?? this.tail?._out ?? $ark.kw.unknown.internal
	}

	declareOut(declaredOut: BaseRoot): MorphNode {
		return this.$.node("morph", {
			...this.inner,
			declaredOut
		})
	}

	get expression(): string {
		return (this.c.expression ??= composing(
			() =>
				`(In: ${this._in.expression}) => ${this.tail ? "To" : "Out"}<${this._out.expression}>`
		))
	}

	get brief(): string {
		return this._in.meta.description ?? this._in.brief
	}

	compile(js: NodeCompiler): void {
		if (js.trav === "Allows") {
			js.return(this.head ? js.inv(this.head) : true)
			return
		}
		if (js.trav === "Transform") return this.jsTf(js)
		js.return(this.head ? js.applyMember(this.head) : true)
	}

	private jsTf(js: NodeCompiler): void {
		let result = "data"
		if (this.head?.tfs) {
			js.initTf([this.head])
				.tfKey("transformedIn", "data", [{ node: this.head }])
				.retIfFailed()
			result = "transformedIn"
		}
		const morphs = this.travMorphs
		const label = this.meta.label
		for (let i = this.head ? 1 : 0; i < morphs.length; i++) {
			const morph = morphs[i]
			const morphed = `morphed${i}`
			if (hasArkKind(morph, "root")) {
				js.const(
					morphed,
					`${js.ref(pipeOf(morph))}(ctx, ${js.ref(morph)}, ${result})`
				).if(`ctx._errors !== undefined && ${morphed} === ctx._errors`, () =>
					js.return("data")
				)
			} else {
				const says = this.says[i]
				const fn = js.ref(morph)
				const call =
					this.contextFree[i] ?
						`${fn}(${result})`
					:	`${js.ref(callMorph)}(ctx, ${says ? `(In, at) => ${fn}(In, at, ${JSON.stringify(says)})` : fn}, ${result})`
				// a labeled morph names its value in what it raises, as a labeled
				// narrow does: only one passed ctx can raise
				const labeled = label !== undefined && !this.contextFree[i]
				if (labeled) js.line(`ctx.lbl = ${JSON.stringify(label)}`)
				js.const(morphed, call)
				if (labeled) js.line("ctx.lbl = undefined")
				js.if(`${morphed} instanceof ${js.ref(ArkErrors)}`, () =>
					js.needsCtx ?
						js.line(`${js.ref(addErrors)}(ctx, ${morphed})`).return("data")
					:	js.return(`new ${js.ref(TransformErrors)}(${morphed}, ${result})`)
				)
			}
			result = morphed
		}
		js.return(result)
	}

	tAllows(data: unknown, ctx: InternalTraversal | AliasDepth): boolean {
		return !this.head || this.head.tAllows(data, ctx)
	}

	tApply(data: unknown, ctx: InternalTraversal): void {
		if (this.head) applyMember(this.head, data, ctx)
	}

	tTransform(data: unknown, ctx: InternalTraversal): unknown {
		const errN = ctx.errN
		let result = this.head?.tfs ? transform(ctx, this.head, data) : data
		if (ctx.errN > errN) return data
		const morphs = this.travMorphs
		const label = this.meta.label
		for (let i = this.head ? 1 : 0; i < morphs.length; i++) {
			const morph = morphs[i]
			if (hasArkKind(morph, "root")) {
				result = pipe(ctx, morph, result)
				if (ctx._errors !== undefined && result === ctx._errors) return data
				continue
			}
			let morphed: unknown
			if (this.contextFree[i])
				morphed = (morph as Morph.ContextFree)(result as never)
			else {
				if (label !== undefined) ctx.lbl = label
				const says = this.says[i]
				morphed = callMorph(
					ctx,
					says === undefined ? morph : (In, at) => (morph as Fn)(In, at, says),
					result
				)
				if (label !== undefined) ctx.lbl = undefined
			}
			if (morphed instanceof ArkErrors) {
				addErrors(ctx, morphed)
				return data
			}
			result = morphed
		}
		return result
	}

	/** Check if the morphs of r are equal to those of this node */
	override sameMorphs(r: MorphNode): boolean {
		return (
			this.inverse === r.inverse &&
			arrayEquals(this.piped, r.piped, {
				isEqual: (lMorph, rMorph) =>
					lMorph === rMorph ||
					(hasArkKind(lMorph, "root") &&
						hasArkKind(rMorph, "root") &&
						lMorph.equals(rMorph))
			})
		)
	}
}

export const Morph = {
	impl: implementation,
	Node: MorphNode
}
