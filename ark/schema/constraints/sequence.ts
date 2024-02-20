import {
	append,
	isArray,
	range,
	throwInternalError,
	throwParseError
} from "@arktype/util"
import { BaseNode, type TypeNode, type TypeSchema } from "../base.js"
import type { MutableInner } from "../kinds.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type {
	NodeKeyImplementation,
	TypeKind,
	nodeImplementationOf
} from "../shared/implement.js"
import type { TraverseAllows, TraverseApply } from "../traversal/context.js"
import type { BaseConstraint, FoldInput } from "./constraint.js"

export interface BaseSequenceSchema extends BaseMeta {
	readonly prefix?: readonly TypeSchema[]
	readonly variadic?: TypeSchema
}

export interface NormalizedPostfixableSequenceSchema
	extends BaseSequenceSchema {
	readonly optionals?: undefined
	// variadic is required for postfix
	readonly variadic: TypeSchema
	readonly postfix?: readonly TypeSchema[]
}

export interface NormalizedOptionalizableSequenceSchema
	extends BaseSequenceSchema {
	readonly optionals?: readonly TypeSchema[]
	readonly postfix?: undefined
}

export type NormalizedSequenceSchema =
	| NormalizedPostfixableSequenceSchema
	| NormalizedOptionalizableSequenceSchema

export type SequenceSchema = NormalizedSequenceSchema | TypeSchema

export interface SequenceInner extends BaseMeta {
	// a list of fixed position elements starting at index 0
	readonly prefix?: readonly TypeNode[]
	// a list of optional elements following prefix
	readonly optionals?: readonly TypeNode[]
	// the variadic element (only checked if all optional elements are present)
	readonly variadic?: TypeNode
	// a list of fixed position elements, the last being the last element of the array
	readonly postfix?: readonly TypeNode[]
}

export type SequenceDeclaration = declareNode<{
	kind: "sequence"
	schema: SequenceSchema
	normalizedSchema: NormalizedSequenceSchema
	inner: SequenceInner
	composition: "composite"
	prerequisite: readonly unknown[]
	childKind: TypeKind
	disjoinable: true
}>

const fixedSequenceKeyDefinition: NodeKeyImplementation<
	SequenceDeclaration,
	"prefix" | "postfix" | "optionals"
> = {
	child: true,
	// TODO: figure out fixed []
	parse: (schema, ctx) =>
		schema.length === 0
			? // omit empty affixes
			  undefined
			: schema.map((element) => ctx.$.parseTypeNode(element))
}

export class SequenceNode
	extends BaseNode<readonly unknown[], SequenceDeclaration, typeof SequenceNode>
	implements BaseConstraint<"sequence">
{
	static implementation: nodeImplementationOf<SequenceDeclaration> =
		this.implement({
			hasAssociatedError: false,
			collapseKey: "variadic",
			keys: {
				prefix: fixedSequenceKeyDefinition,
				optionals: fixedSequenceKeyDefinition,
				variadic: {
					child: true,
					parse: (schema, ctx) => ctx.$.parseTypeNode(schema)
				},
				postfix: fixedSequenceKeyDefinition
			},
			normalize: (schema) => {
				if (typeof schema === "string") {
					return { variadic: schema }
				}
				if (
					"variadic" in schema ||
					"prefix" in schema ||
					"optionals" in schema ||
					"postfix" in schema
				) {
					if (schema.postfix?.length) {
						if (!schema.variadic) {
							return throwParseError(postfixWithoutVariadicMessage)
						}
						if ((schema.optionals as any)?.length) {
							return throwParseError(postfixFollowingOptionalMessage)
						}
					}
					return schema
				}
				return { variadic: schema }
			},
			reduce: (inner, scope) => {
				if (!inner.postfix && !inner.optionals) {
					return
				}
				const fixed = inner.prefix?.slice() ?? []
				const optionals = inner.optionals?.slice() ?? []
				const postfix = inner.postfix?.slice() ?? []
				if (inner.variadic) {
					// optional elements equivalent to the variadic parameter are redundant
					while (optionals.at(-1)?.equals(inner.variadic)) {
						optionals.pop()
					}
				}
				if (optionals.length === 0) {
					if (inner.variadic) {
						// if optional length is 0, normalize equivalent
						// prefix/postfix elements to prefix, e.g.:
						// [...number[], number] => [number, ...number[]]
						while (postfix[0]?.equals(inner.variadic)) {
							fixed.push(postfix.shift()!)
						}
					} else {
						// if there's no variadic or optional parameters,
						// postfix can just be appended to fixed
						fixed.push(...postfix.splice(0))
					}
				}
				if (
					(inner.postfix && postfix.length < inner.postfix.length) ||
					(inner.optionals && optionals.length < inner.optionals.length)
				) {
					return scope.parse(
						"sequence",
						{
							...inner,
							// empty lists will be omitted during parsing
							prefix: fixed,
							postfix,
							optionals: optionals as never
						},
						{ prereduced: true }
					)
				}
			},
			defaults: {
				description(inner) {
					const parts = inner.prefix?.map(String) ?? []
					inner.optionals?.forEach((node) => parts.push(`an optional ${node}`))
					if (inner.variadic) {
						parts.push(`zero or more ${inner.variadic} elements`)
					}
					inner.postfix?.forEach((node) => parts.push(String(node)))
					return `comprised of ${parts.join(" followed by ")}`
				}
			}
		})

	readonly hasOpenIntersection = false

	readonly prefix = this.inner.prefix ?? []
	readonly optionals = this.inner.optionals ?? []
	readonly prevariadic = [...this.prefix, ...this.optionals]
	readonly postfix = this.inner.postfix ?? []
	readonly minLength = this.prefix.length + this.postfix.length
	readonly minLengthNode =
		this.minLength === 0 ? undefined : this.$.parse("minLength", this.minLength)
	readonly maxLength = this.variadic
		? undefined
		: this.minLength + this.optionals.length
	readonly maxLengthNode =
		this.maxLength === undefined
			? undefined
			: this.$.parse("maxLength", this.maxLength)

	protected childAtIndex(data: readonly unknown[], index: number) {
		if (index < this.prevariadic.length) return this.prevariadic[index]
		const postfixStartIndex = data.length - this.postfix.length
		if (index >= postfixStartIndex)
			return this.postfix[index - postfixStartIndex]
		return (
			this.variadic ??
			throwInternalError(
				`Unexpected attempt to access index ${index} on ${this}`
			)
		)
	}

	// minLength/maxLength should be checked by Intersection before either traversal
	traverseAllows: TraverseAllows<readonly unknown[]> = (data, ctx) => {
		for (let i = 0; i < data.length; i++) {
			if (!this.childAtIndex(data, i).traverseAllows(data[i], ctx)) {
				return false
			}
		}
		return true
	}

	traverseApply: TraverseApply<readonly unknown[]> = (data, ctx) => {
		for (let i = 0; i < data.length; i++) {
			this.childAtIndex(data, i).traverseApply(data[i], ctx)
		}
	}

	// minLength/maxLength compilation should be handled by Intersection
	compile(js: NodeCompiler) {
		this.prefix.forEach((node, i) => js.checkReferenceKey(`${i}`, node))
		this.optionals.forEach((node, i) => {
			const dataIndex = `${i + this.prefix.length}`
			js.if(`${dataIndex} >= ${js.data}.length`, () =>
				js.traversalKind === "Allows" ? js.return(true) : js.return()
			)
			js.checkReferenceKey(dataIndex, node)
		})

		if (this.variadic) {
			js.const(
				"lastVariadicIndex",
				`${js.data}.length${this.postfix ? `- ${this.postfix.length}` : ""}`
			)
			js.for(
				"i < lastVariadicIndex",
				() => js.checkReferenceKey("i", this.variadic!),
				this.prevariadic.length
			)
			this.postfix.forEach((node, i) =>
				js.checkReferenceKey(`lastVariadicIndex + ${i + 1}`, node)
			)
		}

		if (js.traversalKind === "Allows") {
			js.return(true)
		}
	}

	readonly tuple: readonly SequenceElement[] = [
		...this.prefix.map((node): SequenceElement => ({ kind: "prefix", node })),
		...this.optionals.map(
			(node): SequenceElement => ({ kind: "optionals", node })
		),
		...(this.variadic
			? [{ kind: "variadic", node: this.variadic } satisfies SequenceElement]
			: []),
		...this.postfix.map((node): SequenceElement => ({ kind: "postfix", node }))
	]

	protected intersectOwnInner(r: SequenceNode) {
		const result: MutableInner<"sequence"> = {}
		const disjoints: Disjoint[] = []

		if (this.maxLength && r.minLength > this.maxLength) {
			disjoints.push(
				Disjoint.from("bound", this.maxLengthNode!, r.minLengthNode!)
			)
		} else if (r.maxLength && this.minLength > r.maxLength) {
			disjoints.push(
				Disjoint.from("bound", this.minLengthNode!, r.maxLengthNode!)
			)
		}

		const longerPrevariadic =
			this.prevariadic.length > r.prevariadic.length
				? this
				: this.prevariadic.length < r.prevariadic.length
				? r
				: undefined

		const longerPostvariadic =
			this.postfix.length > r.postfix.length
				? this
				: this.postfix.length < r.postfix.length
				? r
				: undefined

		const fixedVariants: SequenceInner[] = []

		if (
			longerPrevariadic &&
			longerPostvariadic &&
			longerPrevariadic !== longerPostvariadic
		) {
			const minDistinctVariadicLength = Math.max(
				0,
				longerPrevariadic.prevariadic.length - longerPostvariadic.postfix.length
			)
			for (
				let variadicLength = minDistinctVariadicLength;
				variadicLength < longerPrevariadic.prevariadic.length;
				variadicLength++
			) {
				const fixedPostvariadic = [
					...range(variadicLength).map(() => longerPostvariadic.variadic!),
					...longerPostvariadic.postfix
				]
				const fixedPrevariadic = [
					...longerPrevariadic.prevariadic,
					...range(
						fixedPostvariadic.length - longerPrevariadic.prevariadic.length
					).map(() => longerPrevariadic.variadic!)
				]
				let result: TypeNode[] | Disjoint = []
				for (let i = 0; i < fixedPostvariadic.length && isArray(result); i++) {
					const fixedResult = fixedPostvariadic[i].intersect(
						fixedPrevariadic[i]
					)
					if (fixedResult instanceof Disjoint) {
						result = fixedResult
					} else {
						result.push(fixedResult)
					}
				}
				if (isArray(result)) {
					fixedVariants.push({
						prefix: result
					})
				}
			}
		}

		const prevariadicLength = Math.max(
			this.prevariadic.length,
			r.prevariadic.length
		)
		const prefixLength = Math.max(this.prefix.length, r.prefix.length)

		for (let i = 0; i < prevariadicLength; i++) {
			const lElement =
				this.prevariadic.at(i) ??
				this.variadic ??
				// have to cast here due to TypeNode<never> not being assignable to
				// the default TypeNode<any>
				(this.$.builtin.never as never)
			const rElement =
				r.prevariadic.at(i) ?? r.variadic ?? (r.$.builtin.never as never)

			const kind = // if either operand has postfix elements, the full-length
				// intersection can't include optional elements (though they may
				// exist in some of the fixed length variants)
				i >= prefixLength && this.postfix.length === 0 && r.postfix.length === 0
					? "optionals"
					: "prefix"

			const node = lElement.intersect(rElement)
			if (node instanceof Disjoint) {
				if (kind === "optionals") {
					// if the element result is optional and unsatisfiable, the
					// intersection can still be satisfied as long as the tuple
					// ends before the disjoint element would occur
					return result
				} else {
					disjoints.push(node)
				}
			} else {
				result[kind] = append(result[kind], node)
			}
		}

		if (this.variadic && r.variadic) {
			// the resulting intersection is variadic iff both operands are
			result.variadic = this.variadic.and(r.variadic)
		}

		const postfixLength = Math.max(this.postfix.length, r.postfix.length)

		for (let i = postfixLength - 1; i >= 0; i--) {
			const lElement =
				this.postfix[i] ?? this.variadic ?? (this.$.builtin.never as never)
			const rElement =
				r.postfix[i] ?? r.variadic ?? (r.$.builtin.never as never)
			const node = lElement.intersect(rElement)
			if (node instanceof Disjoint) {
				disjoints.push(node)
			} else {
				result.postfix = append(result.postfix, node, { prepend: true })
			}
		}

		return result
	}

	foldIntersection(into: FoldInput<"sequence">) {
		this.minLengthNode?.foldIntersection(into)
		const possibleLengthDisjoint =
			this.maxLengthNode?.foldIntersection(into) ??
			// even if this sequence doesn't contribute maxLength, if there is
			// an existing maxLength constraint, check that it is compatible
			// with the minLength constraint we just added
			into.maxLength?.foldIntersection(into)
		if (possibleLengthDisjoint) return possibleLengthDisjoint
		const ownResult = this.intersectOwnKind(into.sequence)
		if (ownResult instanceof Disjoint) {
			return ownResult
		}
		into.sequence = ownResult
	}
}

export const postfixFollowingOptionalMessage =
	"A postfix required element cannot follow an optional element"

export type postfixFollowingOptionalMessage =
	typeof postfixFollowingOptionalMessage

export const postfixWithoutVariadicMessage =
	"A postfix element requires a variadic element"

export type postfixWithoutVariadicMessage = typeof postfixWithoutVariadicMessage

export type SequenceElementKind = Exclude<keyof SequenceInner, keyof BaseMeta>

export type SequenceElement = {
	kind: SequenceElementKind
	node: TypeNode
}
