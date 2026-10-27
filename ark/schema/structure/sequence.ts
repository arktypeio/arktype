import {
	append,
	conflatenate,
	printable,
	throwInternalError,
	throwParseError,
	type array,
	type mutable,
	type satisfy
} from "@ark/util"
import { BaseConstraint } from "../constraint.ts"

import {
	flatRefsAt,
	ioOf,
	uniqueFlatRefs,
	type BaseNode,
	type DeepNodeTransformContext,
	type DeepNodeTransformation
} from "../node.ts"
import type { ExactLengthNode } from "../refinements/exactLength.ts"
import type { MaxLengthNode } from "../refinements/maxLength.ts"
import type { MinLengthNode } from "../refinements/minLength.ts"
import type { Morph } from "../roots/morph.ts"
import type { BaseRoot } from "../roots/root.ts"
import type { NodeCompiler } from "../shared/compile.ts"
import type { declareNode } from "../shared/declare.ts"
import {
	defaultValueSerializer,
	implementNode,
	type RootKind,
	type nodeImplementationOf
} from "../shared/implement.ts"
import { $ark } from "../shared/registry.ts"
import { missingSetEngineMessage } from "../shared/sets.ts"
import { copyOf } from "../shared/transform.ts"
import {
	applyValue,
	computeDefaultValueMorph,
	transform,
	travKey,
	type AliasDepth,
	type InternalTraversal
} from "../shared/traversal.ts"
import { elided } from "../shared/utils.ts"
import { assertDefaultValueAssignability } from "./optional.ts"

export declare namespace Sequence {
	export type DefaultableElement = [node: BaseRoot, defaultValue: unknown]

	export interface Inner {
		// a list of fixed position elements starting at index 0
		readonly prefix?: array<BaseRoot>
		// a list of optional elements with default values following prefix
		readonly defaultables?: array<DefaultableElement>
		// a list of optional elements without default values following defaultables
		readonly optionals?: array<BaseRoot>
		// the variadic element (only checked if all optional elements are present)
		readonly variadic?: BaseRoot
		readonly minVariadicLength?: number
		// a list of fixed position elements, the last being the last element of the array
		readonly postfix?: array<BaseRoot>
	}

	export interface Declaration
		extends declareNode<{
			kind: "sequence"
			inner: Inner
			prerequisite: array
			reducibleTo: "sequence"
			childKind: RootKind
		}> {}

	export type Node = SequenceNode
}

const implementation: nodeImplementationOf<Sequence.Declaration> =
	implementNode<Sequence.Declaration>({
		kind: "sequence",
		ownErr: false,
		bareKey: "variadic",
		keys: {
			prefix: {
				child: true,
				structural: true,
				reduceIo: (ioKind, inner, prefix) => {
					// before defaultables, which reduce first and are required on output
					inner.prefix = [
						...prefix!.map(node => ioOf(node, ioKind)),
						...(inner.prefix ?? [])
					]
				}
			},
			optionals: {
				child: true,
				structural: true,
				reduceIo: (ioKind, inner, optionals) => {
					// after defaultables, which reduce first and are optional on input
					inner.optionals = append(
						inner.optionals,
						optionals!.map(node => ioOf(node, ioKind))
					)
				}
			},
			defaultables: {
				child: defaultables => defaultables.map(element => element[0]),
				structural: true,
				serialize: defaults =>
					defaults.map(element => [
						element[0].bareJson,
						defaultValueSerializer(element[1])
					]),
				reduceIo: (ioKind, inner, defaultables) => {
					if (ioKind === "in") {
						inner.optionals = defaultables!.map(d => d[0]._in)
						return
					}

					inner.prefix = defaultables!.map(d => d[0]._out)
					return
				}
			},
			variadic: {
				child: true,
				structural: true
			},
			minVariadicLength: {},
			postfix: {
				child: true,
				structural: true
			}
		},
		defaults: {
			description: node => {
				if (node.isVariadicOnly) return `${elided(node.variadic!.nestedExpr)}[]`
				const innerDescription = node.tuple
					.map(element =>
						element.kind === "defaultables" ?
							`${elided(element.node.nestedExpr)} = ${printable(element.default, { ownDataOnly: true })}`
						: element.kind === "optionals" ?
							`${elided(element.node.nestedExpr)}?`
						: element.kind === "variadic" ?
							`...${elided(element.node.nestedExpr)}[]`
						:	elided(element.node.expression)
					)
					.join(", ")
				return `[${innerDescription}]`
			}
		}
	})

export class SequenceNode extends BaseConstraint<Sequence.Declaration> {
	constructor(...args: ConstructorParameters<typeof BaseConstraint>) {
		super(...args)
		this.costly = true
		if (this.inner.postfix) {
			if (!this.inner.variadic) throwParseError(postfixWithoutVariadicMessage)
			if (this.inner.optionals || this.inner.defaultables)
				throwParseError(postfixAfterOptionalOrDefaultableMessage)
		}
		if (this.inner.minVariadicLength && !this.inner.variadic) {
			throwParseError(
				"minVariadicLength may not be specified without a variadic element"
			)
		}
		// a set engine adds the length bounds a tuple implies to its intersection
		if (
			!$ark.sets &&
			(!this.inner.variadic ||
				this.inner.prefix ||
				this.inner.postfix ||
				this.inner.minVariadicLength)
		)
			throwParseError(missingSetEngineMessage)
		if (this.inner.defaultables) {
			for (const [node, value] of this.inner.defaultables)
				assertDefaultValueAssignability(node, value, null, this)
		}
		// a function default can fail as it's applied, like a morph
		this.hasMorph ||= !!this.defaultables?.some(
			([, defaultValue]) => typeof defaultValue === "function"
		)
		this.ctxMorph ||= this.defaultMorphs.some(morph => morph.length === 2)
	}

	implied: BaseRoot = $ark.intrinsic.Array.internal

	tuple: SequenceTuple = sequenceInnerToTuple(this.inner)

	/** how many prefix elements it has */
	preLen: number = this.prefix?.length ?? 0
	/** how many defaultable elements it has */
	defLen: number = this.defaultables?.length ?? 0
	/** how many postfix elements it has */
	postLen: number = this.postfix?.length ?? 0
	/** its defaultable and optional elements, in order */
	maybes: BaseRoot[] = []
	/** its elements before its variadic element, with their kinds */
	leading: array<PrevariadicSequenceElement> = this.tuple.filter(
		(el): el is PrevariadicSequenceElement => {
			if (el.kind === "defaultables" || el.kind === "optionals") {
				// populate maybes while filtering leading
				this.maybes.push(el.node)
				return true
			}

			return el.kind === "prefix"
		}
	)

	/** its variadic element, if any, then its postfix elements */
	trail: array<BaseRoot> = conflatenate(
		this.variadic && [this.variadic],
		this.postfix
	)

	protected override initFlatRefs(): void {
		this.cache.flatRefs = uniqueFlatRefs([
			...this.leading.flatMap((element, i) => flatRefsAt(`${i}`, element.node)),
			...this.trail.flatMap(element =>
				// a postfix index can't be directly represented as a type
				// key, so we just use the same matcher for variadic
				flatRefsAt($ark.intrinsic.nonNegativeIntegerString.internal, element)
			)
		])
		this.cache.flatMorphs = []
	}

	isVariadicOnly: boolean = this.leading.length + this.postLen === 0
	minVariadicLength: number = this.inner.minVariadicLength ?? 0
	minLength: number = this.preLen + this.minVariadicLength + this.postLen
	/** the minLength node its length implies, if any */
	minNode: MinLengthNode | null =
		this.minLength === 0 ?
			null
			// cast is safe here as the only time this would not be a
			// MinLengthNode would be when minLength is 0
		:	(this.$.node("minLength", { rule: this.minLength }) as never)
	maxLength: number | null = this.variadic ? null : this.tuple.length
	/** the maxLength or exactLength node its length implies, if any */
	maxNode: MaxLengthNode | ExactLengthNode | null =
		this.maxLength === null ?
			null
		:	this.$.node("maxLength", { rule: this.maxLength })
	impliedBy: array<MaxLengthNode | MinLengthNode | ExactLengthNode> =
		this.minNode ?
			this.maxNode ?
				[this.minNode, this.maxNode]
			:	[this.minNode]
		: this.maxNode ? [this.maxNode]
		: []

	defaultMorphs: Morph[] =
		this.defaultables?.map(([node, defaultValue], i) =>
			computeDefaultValueMorph(this.preLen + i, node, defaultValue)
		) ?? []

	optionalize(): SequenceNode {
		const { prefix, defaultables, ...inner } = this.inner
		// without a prefix, every element is already optional. bailing here
		// preserves defaultables, which would otherwise have to be flattened
		// into optionals to maintain their position relative to the prefix.
		if (!prefix) return this

		return this.$.node("sequence", {
			...inner,
			optionals: conflatenate(prefix, this.maybes)
		})
	}

	require(): SequenceNode {
		const { defaultables, optionals, ...inner } = this.inner
		return this.$.node("sequence", {
			...inner,
			prefix: conflatenate(this.prefix, this.maybes)
		})
	}

	/** the element that checks `data[index]` */
	protected atIndex(data: array, index: number): SequenceElement {
		if (index < this.leading.length) return this.tuple[index]
		const firstPostfixIndex = data.length - this.postLen
		if (index >= firstPostfixIndex)
			return { kind: "postfix", node: this.postfix![index - firstPostfixIndex] }
		return {
			kind: "variadic",
			node:
				this.variadic ??
				throwInternalError(
					`Unexpected attempt to access index ${index} on ${this}`
				)
		}
	}

	// minLength/maxLength should be checked by Intersection before either traversal
	traverseAllows(data: array, ctx: InternalTraversal | AliasDepth): boolean {
		for (let i = 0; i < data.length; i++)
			if (!this.atIndex(data, i).node.traverseAllows(data[i], ctx)) return false

		return true
	}

	traverseApply(data: array, ctx: InternalTraversal): void {
		const errN = ctx.errN
		let i = 0
		for (; i < data.length; i++) {
			travKey(
				i,
				() => applyValue(this.atIndex(data, i).node, data[i], ctx),
				ctx
			)
			// bail out of subsequent elements in fail-fast mode (e.g. inside a
			// union branch) so we don't traverse an element whose basis has
			// already failed - see https://github.com/arktypeio/arktype/issues/1458
			if (ctx.failFast && ctx.errN > errN) return
		}
	}

	private _element: BaseRoot | undefined
	get element(): BaseRoot {
		return (this._element ??= this.$.node("union", {
			branches: this.children
		}))
	}

	traverseTransform(data: array, ctx: InternalTraversal): unknown {
		return this.transformElements(data, ctx, false)
	}

	transformElements(
		data: array,
		ctx: InternalTraversal,
		slices: boolean
	): array {
		let out = data as unknown[]
		for (let i = 0; i < data.length; i++) {
			const node = this.atIndex(data, i).node
			if (!node.transforms) continue
			const element = data[i]
			const transformed = travKey(i, () => transform(ctx, node, element), ctx)
			if (Object.is(transformed, element)) continue
			if (out === data && (slices || !ctx.inPlace)) {
				out =
					slices ? Array.prototype.slice.call(data) : (copyOf(data) as never)
			}
			out[i] = transformed
		}
		return out
	}

	// minLength/maxLength compilation should be handled by Intersection
	compile(js: NodeCompiler): void {
		if (js.trav === "Transform") return this.jsTransform(js)
		// like Structure, bail out of subsequent elements in fail-fast mode
		// (e.g. inside a union branch) so we don't traverse an element whose
		// basis has already failed - see
		// https://github.com/arktypeio/arktype/issues/1458
		this.jsElements(js, (keyExpr, node) =>
			js.travKey(keyExpr, `data[${keyExpr}]`, node)
		)

		js.return(true)
	}

	private jsTransform(js: NodeCompiler): void {
		js.initTf(this.children).let("out", "data")
		this.jsElementTransforms(js, false)
		js.retIfFailed().return("out")
	}

	/** writes the transforms of data's elements */
	jsElementTransforms(js: NodeCompiler, slices: boolean): NodeCompiler {
		// an array written in place is never copied
		const copy =
			js.inPlace && !slices ? undefined
			: slices ? "Array.prototype.slice.call(data)"
			: `${js.ref(copyOf)}(data)`
		let i = 0
		this.jsElements(js, (keyExpr, node) => {
			const element = `element${i}`
			const transformed = `transformed${i++}`
			return js
				.const(element, `data[${keyExpr}]`)
				.tfKey(transformed, element, [{ node }], {
					keyExpr,
					onChange: () =>
						(copy ? js.if("out === data", () => js.set("out", copy)) : js).line(
							`out[${keyExpr}] = ${transformed}`
						)
				})
		})
		return js
	}

	/** writes the checks of data's elements */
	private jsElements(
		js: NodeCompiler,
		compileElement: (keyExpr: string, node: BaseRoot) => NodeCompiler
	): void {
		// a transform skips each element that would return its input
		const reaches = (node: BaseRoot) =>
			js.trav !== "Transform" || node.transforms

		if (this.prefix) {
			for (const [i, node] of this.prefix.entries())
				if (reaches(node)) compileElement(`${i}`, node)
		}

		for (const [i, node] of this.maybes.entries()) {
			const dataIndex = `${i + this.preLen}`
			if (js.trav === "Transform") {
				if (node.transforms) {
					js.if(`${dataIndex} < data.length`, () =>
						compileElement(dataIndex, node)
					)
				}
				continue
			}
			js.if(`${dataIndex} >= data.length`, () => js.return(true))
			compileElement(dataIndex, node)
		}

		const variadic = this.variadic
		const postfix = this.postfix ?? []
		if (!variadic || (!reaches(variadic) && !postfix.some(reaches))) return
		if (postfix.length)
			js.const("firstPostfixIndex", `data.length - ${postfix.length}`)
		if (reaches(variadic)) {
			js.for(
				`i < ${postfix.length ? "firstPostfixIndex" : "data.length"}`,
				() => compileElement("i", variadic),
				this.leading.length
			)
		}
		for (const [i, node] of postfix.entries())
			if (reaches(node)) compileElement(`firstPostfixIndex + ${i}`, node)
	}

	protected override _transform(
		mapper: DeepNodeTransformation,
		ctx: DeepNodeTransformContext
	): BaseNode | null {
		ctx.path.push($ark.intrinsic.nonNegativeIntegerString.internal)
		const result = super._transform(mapper, ctx)
		ctx.path.pop()
		return result
	}

	// this depends on tuple so needs to come after it
	expression: string = this.description
}

export const Sequence = {
	impl: implementation,
	Node: SequenceNode
}

const sequenceInnerToTuple = (inner: Sequence.Inner): SequenceTuple => {
	const tuple: mutable<SequenceTuple> = []
	if (inner.prefix)
		for (const node of inner.prefix) tuple.push({ kind: "prefix", node })
	if (inner.defaultables) {
		for (const [node, defaultValue] of inner.defaultables)
			tuple.push({ kind: "defaultables", node, default: defaultValue })
	}

	if (inner.optionals)
		for (const node of inner.optionals) tuple.push({ kind: "optionals", node })
	if (inner.variadic) tuple.push({ kind: "variadic", node: inner.variadic })
	if (inner.postfix)
		for (const node of inner.postfix) tuple.push({ kind: "postfix", node })
	return tuple
}

export const postfixAfterOptionalOrDefaultableMessage =
	"A postfix required element cannot follow an optional or defaultable element"

export type postfixAfterOptionalOrDefaultableMessage =
	typeof postfixAfterOptionalOrDefaultableMessage

export const postfixWithoutVariadicMessage =
	"A postfix element requires a variadic element"

export type postfixWithoutVariadicMessage = typeof postfixWithoutVariadicMessage

export type SequenceElement =
	| PrevariadicSequenceElement
	| VariadicSequenceElement
	| PostfixSequenceElement

export type SequenceElementKind = satisfy<
	keyof Sequence.Inner,
	SequenceElement["kind"]
>

export type PrevariadicSequenceElement =
	| PrefixSequenceElement
	| DefaultableSequenceElement
	| OptionalSequenceElement

export type PrefixSequenceElement = {
	kind: "prefix"
	node: BaseRoot
}

export type OptionalSequenceElement = {
	kind: "optionals"
	node: BaseRoot
}

export type PostfixSequenceElement = {
	kind: "postfix"
	node: BaseRoot
}

export type VariadicSequenceElement = {
	kind: "variadic"
	node: BaseRoot
}

export type DefaultableSequenceElement = {
	kind: "defaultables"
	node: BaseRoot
	default: unknown
}

export type SequenceTuple = array<SequenceElement>
