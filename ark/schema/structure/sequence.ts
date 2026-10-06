import {
	append,
	conflatenate,
	printable,
	throwInternalError,
	throwParseError,
	WeakCache,
	type array,
	type mutable,
	type satisfy
} from "@ark/util"
import { BaseConstraint } from "../constraint.ts"
import type { RootSchema } from "../kinds.ts"
import {
	appendUniqueFlatRefs,
	flatRef,
	type BaseNode,
	type DeepNodeTransformContext,
	type DeepNodeTransformation,
	type FlatRef
} from "../node.ts"
import type { ExactLengthNode } from "../refinements/exactLength.ts"
import type { MaxLengthNode } from "../refinements/maxLength.ts"
import type { MinLengthNode } from "../refinements/minLength.ts"
import type { Morph } from "../roots/morph.ts"
import type { BaseRoot } from "../roots/root.ts"
import type { NodeCompiler } from "../shared/compile.ts"
import type { BaseNormalizedSchema, declareNode } from "../shared/declare.ts"
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
	traverseKey,
	type TraverseAllows,
	type TraverseApply,
	type TraverseTransform
} from "../shared/traversal.ts"
import {
	assertDefaultValueAssignability,
	computeDefaultValueMorph
} from "./optional.ts"

export declare namespace Sequence {
	export interface NormalizedSchema extends BaseNormalizedSchema {
		readonly prefix?: array<RootSchema>
		readonly defaultables?: array<DefaultableSchema>
		readonly optionals?: array<RootSchema>
		readonly variadic?: RootSchema
		readonly minVariadicLength?: number
		readonly postfix?: array<RootSchema>
	}

	export type Schema = NormalizedSchema | RootSchema

	export type DefaultableSchema = [schema: RootSchema, defaultValue: unknown]

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
			schema: Schema
			normalizedSchema: NormalizedSchema
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
		hasAssociatedError: false,
		collapsibleKey: "variadic",
		keys: {
			prefix: {
				child: true,
				parse: (schema, ctx) => {
					// empty affixes are omitted. an empty array should therefore
					// be specified as `{ proto: Array, length: 0 }`
					if (schema.length === 0) return undefined

					return schema.map(element => ctx.$.parseStructuralValue(element))
				}
			},
			optionals: {
				child: true,
				parse: (schema, ctx) => {
					if (schema.length === 0) return undefined

					return schema.map(element => ctx.$.parseStructuralValue(element))
				}
			},
			defaultables: {
				child: defaultables => defaultables.map(element => element[0]),
				parse: (defaultables, ctx) => {
					if (defaultables.length === 0) return undefined

					return defaultables.map(element => {
						const node = ctx.$.parseStructuralValue(element[0])
						assertDefaultValueAssignability(node, element[1], null)
						return [node, element[1]]
					})
				},
				serialize: defaults =>
					defaults.map(element => [
						element[0].collapsibleJson,
						defaultValueSerializer(element[1])
					]),
				reduceIo: (ioKind, inner, defaultables) => {
					if (ioKind === "in") {
						inner.optionals = defaultables!.map(d => d[0].rawIn)
						return
					}

					inner.prefix = defaultables!.map(d => d[0].rawOut)
					return
				}
			},
			variadic: {
				child: true,
				parse: (schema, ctx) => ctx.$.parseStructuralValue(schema)
			},
			minVariadicLength: {
				// minVariadicLength is reflected in the id of this node,
				// but not its IntersectionNode parent since it is superceded by the minLength
				// node it implies
				parse: min => (min === 0 ? undefined : min)
			},
			postfix: {
				child: true,
				parse: (schema, ctx) => {
					if (schema.length === 0) return undefined

					return schema.map(element => ctx.$.parseStructuralValue(element))
				}
			}
		},
		normalize: schema => {
			if (typeof schema === "string") return { variadic: schema }

			if (
				"variadic" in schema ||
				"prefix" in schema ||
				"defaultables" in schema ||
				"optionals" in schema ||
				"postfix" in schema ||
				"minVariadicLength" in schema
			) {
				if (schema.postfix?.length) {
					if (!schema.variadic)
						return throwParseError(postfixWithoutVariadicMessage)

					if (schema.optionals?.length || schema.defaultables?.length)
						return throwParseError(postfixAfterOptionalOrDefaultableMessage)
				}
				if (schema.minVariadicLength && !schema.variadic) {
					return throwParseError(
						"minVariadicLength may not be specified without a variadic element"
					)
				}
				// a set engine adds the length bounds a tuple implies to its intersection
				if (
					!$ark.sets &&
					(!schema.variadic ||
						schema.prefix?.length ||
						schema.postfix?.length ||
						schema.minVariadicLength)
				)
					return throwParseError(missingSetEngineMessage)
				return schema
			}
			return { variadic: schema }
		},
		defaults: {
			description: node => {
				if (node.isVariadicOnly) return `${node.variadic!.nestableExpression}[]`
				const innerDescription = node.tuple
					.map(element =>
						element.kind === "defaultables" ?
							`${element.node.nestableExpression} = ${printable(element.default)}`
						: element.kind === "optionals" ?
							`${element.node.nestableExpression}?`
						: element.kind === "variadic" ?
							`...${element.node.nestableExpression}[]`
						:	element.node.expression
					)
					.join(", ")
				return `[${innerDescription}]`
			}
		}
	})

export class SequenceNode extends BaseConstraint<Sequence.Declaration> {
	constructor(...args: ConstructorParameters<typeof BaseConstraint>) {
		super(...args)
		this.includesContextualMorph ||= this.defaultValueMorphs.some(
			morph => morph.length === 2
		)
	}

	impliedBasis: BaseRoot = $ark.intrinsic.Array.internal

	tuple: SequenceTuple = sequenceInnerToTuple(this.inner)

	prefixLength: number = this.prefix?.length ?? 0
	defaultablesLength: number = this.defaultables?.length ?? 0
	postfixLength: number = this.postfix?.length ?? 0
	defaultablesAndOptionals: BaseRoot[] = []
	prevariadic: array<PrevariadicSequenceElement> = this.tuple.filter(
		(el): el is PrevariadicSequenceElement => {
			if (el.kind === "defaultables" || el.kind === "optionals") {
				// populate defaultablesAndOptionals while filtering prevariadic
				this.defaultablesAndOptionals.push(el.node)
				return true
			}

			return el.kind === "prefix"
		}
	)

	variadicOrPostfix: array<BaseRoot> = conflatenate(
		this.variadic && [this.variadic],
		this.postfix
	)

	protected override initializeFlatRefs(): void {
		const flatRefs: FlatRef[] = []

		appendUniqueFlatRefs(
			flatRefs,
			this.prevariadic.flatMap((element, i) =>
				append(
					element.node.flatRefs.map(ref =>
						flatRef([`${i}`, ...ref.path], ref.node)
					),
					flatRef([`${i}`], element.node)
				)
			)
		)

		appendUniqueFlatRefs(
			flatRefs,
			this.variadicOrPostfix.flatMap(element =>
				// a postfix index can't be directly represented as a type
				// key, so we just use the same matcher for variadic
				append(
					element.flatRefs.map(ref =>
						flatRef(
							[$ark.intrinsic.nonNegativeIntegerString.internal, ...ref.path],
							ref.node
						)
					),
					flatRef([$ark.intrinsic.nonNegativeIntegerString.internal], element)
				)
			)
		)

		this._flatRefs = flatRefs
		this._flatMorphs = []
	}

	isVariadicOnly: boolean = this.prevariadic.length + this.postfixLength === 0
	minVariadicLength: number = this.inner.minVariadicLength ?? 0
	minLength: number =
		this.prefixLength + this.minVariadicLength + this.postfixLength
	minLengthNode: MinLengthNode | null =
		this.minLength === 0 ?
			null
			// cast is safe here as the only time this would not be a
			// MinLengthNode would be when minLength is 0
		:	(this.$.node("minLength", this.minLength) as never)
	maxLength: number | null = this.variadic ? null : this.tuple.length
	maxLengthNode: MaxLengthNode | ExactLengthNode | null =
		this.maxLength === null ? null : this.$.node("maxLength", this.maxLength)
	impliedSiblings: array<MaxLengthNode | MinLengthNode | ExactLengthNode> =
		this.minLengthNode ?
			this.maxLengthNode ?
				[this.minLengthNode, this.maxLengthNode]
			:	[this.minLengthNode]
		: this.maxLengthNode ? [this.maxLengthNode]
		: []

	defaultValueMorphs: Morph[] = getDefaultableMorphs(this)

	optionalize(): SequenceNode {
		const { prefix, defaultables, ...inner } = this.inner
		// without a prefix, every element is already optional. bailing here
		// preserves defaultables, which would otherwise have to be flattened
		// into optionals to maintain their position relative to the prefix.
		if (!prefix) return this

		return this.$.node("sequence", {
			...inner,
			optionals: conflatenate(prefix, this.defaultablesAndOptionals)
		})
	}

	require(): SequenceNode {
		const { defaultables, optionals, ...inner } = this.inner
		return this.$.node("sequence", {
			...inner,
			prefix: conflatenate(this.prefix, this.defaultablesAndOptionals)
		})
	}

	protected elementAtIndex(data: array, index: number): SequenceElement {
		if (index < this.prevariadic.length) return this.tuple[index]
		const firstPostfixIndex = data.length - this.postfixLength
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
	traverseAllows: TraverseAllows<array> = (data, ctx) => {
		for (let i = 0; i < data.length; i++) {
			if (!this.elementAtIndex(data, i).node.traverseAllows(data[i], ctx))
				return false
		}

		return true
	}

	traverseApply: TraverseApply<array> = (data, ctx) => {
		const errorCount = ctx.currentErrorCount
		let i = 0
		for (; i < data.length; i++) {
			traverseKey(
				i,
				() => applyValue(this.elementAtIndex(data, i).node, data[i], ctx),
				ctx
			)
			// bail out of subsequent elements in fail-fast mode (e.g. inside a
			// union branch) so we don't traverse an element whose basis has
			// already failed - see https://github.com/arktypeio/arktype/issues/1458
			if (ctx.failFast && ctx.currentErrorCount > errorCount) return
		}
	}

	private _element: BaseRoot | undefined
	get element(): BaseRoot {
		return (this._element ??= this.$.node("union", this.children))
	}

	traverseTransform: TraverseTransform<array> = (data, ctx) => {
		let out = data as unknown[]
		for (let i = 0; i < data.length; i++) {
			const node = this.elementAtIndex(data, i).node
			if (!node.transforms) continue
			const element = data[i]
			const transformed = traverseKey(
				i,
				() => ctx.transform(node, element),
				ctx
			)
			if (Object.is(transformed, element)) continue
			if (out === data) out = copyOf(data) as never
			out[i] = transformed
		}
		return out
	}

	// minLength/maxLength compilation should be handled by Intersection
	compile(js: NodeCompiler): void {
		if (js.traversalKind === "Transform") return this.compileTransform(js)
		// like Structure, bail out of subsequent elements in fail-fast mode
		// (e.g. inside a union branch) so we don't traverse an element whose
		// basis has already failed - see
		// https://github.com/arktypeio/arktype/issues/1458
		if (js.traversalKind === "Apply") js.initializeErrorCount()

		this.compileElements(js, (keyExpression, node) => {
			js.traverseKey(keyExpression, `data[${keyExpression}]`, node)
			return js.traversalKind === "Apply" ? js.returnIfFailFast() : js
		})

		if (js.traversalKind === "Allows") js.return(true)
	}

	private compileTransform(js: NodeCompiler): void {
		js.initializeTransform(this.children).let("out", "data")
		let i = 0
		this.compileElements(js, (keyExpression, node) => {
			const element = `element${i}`
			const transformed = `transformed${i++}`
			return js
				.const(element, `data[${keyExpression}]`)
				.transformKey(transformed, element, [{ node }], {
					keyExpression,
					onChange: () =>
						js
							.if("out === data", () =>
								js.set("out", `${js.ref(copyOf)}(data)`)
							)
							.line(`out[${keyExpression}] = ${transformed}`)
				})
		})
		js.returnIfTransformFailed().return("out")
	}

	private compileElements(
		js: NodeCompiler,
		compileElement: (keyExpression: string, node: BaseRoot) => NodeCompiler
	): void {
		// a transform skips each element that would return its input
		const reaches = (node: BaseRoot) =>
			js.traversalKind !== "Transform" || node.transforms

		if (this.prefix) {
			for (const [i, node] of this.prefix.entries())
				if (reaches(node)) compileElement(`${i}`, node)
		}

		for (const [i, node] of this.defaultablesAndOptionals.entries()) {
			const dataIndex = `${i + this.prefixLength}`
			if (js.traversalKind === "Transform") {
				if (node.transforms) {
					js.if(`${dataIndex} < data.length`, () =>
						compileElement(dataIndex, node)
					)
				}
				continue
			}
			js.if(`${dataIndex} >= data.length`, () =>
				js.traversalKind === "Allows" ? js.return(true) : js.return()
			)
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
				this.prevariadic.length
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

const defaultableMorphsCache = new WeakCache<Morph[]>()

const getDefaultableMorphs = (node: Sequence.Node): Morph[] => {
	if (!node.defaultables) return []

	const morphs: Morph[] = []
	let cacheKey = "["

	const lastDefaultableIndex = node.prefixLength + node.defaultablesLength - 1

	for (let i = node.prefixLength; i <= lastDefaultableIndex; i++) {
		const [elementNode, defaultValue] = node.defaultables[i - node.prefixLength]
		morphs.push(computeDefaultValueMorph(i, elementNode, defaultValue))
		cacheKey += `${i}: ${elementNode.id} = ${defaultValueSerializer(defaultValue)}, `
	}

	cacheKey += "]"

	const cached = defaultableMorphsCache.get(cacheKey)
	if (cached) return cached

	return (
			node.defaultables.some(
				([element]) => element.includesTransform || element.includesAlias
			)
		) ?
			defaultableMorphsCache.pin(cacheKey, morphs)
		:	defaultableMorphsCache.set(cacheKey, morphs)
}

export const Sequence = {
	implementation,
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
