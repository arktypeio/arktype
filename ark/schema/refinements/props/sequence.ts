import { throwParseError } from "@arktype/util"
import { BaseNode, type TypeNode, type TypeSchema } from "../../base.js"
import type { NodeCompiler } from "../../shared/compile.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import type {
	NodeKeyImplementation,
	TypeKind,
	nodeImplementationOf
} from "../../shared/implement.js"
import type { TraverseAllows, TraverseApply } from "../../traversal/context.js"
import type { FoldInput } from "../refinement.js"

export interface BaseSequenceSchema extends BaseMeta {
	readonly fixed?: readonly TypeSchema[]
	readonly variadic?: TypeSchema
}

export interface NormalizedPostfixableSequenceSchema
	extends BaseSequenceSchema {
	readonly optionals?: undefined
	// variadic is required for postfixed
	readonly variadic: TypeSchema
	readonly postfixed?: readonly TypeSchema[]
}

export interface NormalizedOptionalizableSequenceSchema
	extends BaseSequenceSchema {
	readonly optionals?: readonly TypeSchema[]
	readonly postfixed?: undefined
}

export type NormalizedSequenceSchema =
	| NormalizedPostfixableSequenceSchema
	| NormalizedOptionalizableSequenceSchema

export type SequenceSchema = NormalizedSequenceSchema | TypeSchema

export interface SequenceInner extends BaseMeta {
	// a list of fixed position elements starting at index 0 (undefined equivalent to [])
	readonly fixed?: readonly TypeNode[]
	// a list of optional elements following prefix (undefined equivalent to [])
	readonly optionals?: readonly TypeNode[]
	// the variadic element (only allowed if all optional elements are present)
	readonly variadic?: TypeNode
	// a list of fixed position elements, the last being the last element of the array (undefined equivalent to [])
	readonly postfixed?: readonly TypeNode[]
}

export type SequenceDeclaration = declareNode<{
	kind: "sequence"
	schema: SequenceSchema
	normalizedSchema: NormalizedSequenceSchema
	inner: SequenceInner
	composition: "composite"
	prerequisite: readonly unknown[]
	childKind: TypeKind
}>

const fixedSequenceKeyDefinition: NodeKeyImplementation<
	SequenceDeclaration,
	"fixed" | "postfixed" | "optionals"
> = {
	child: true,
	parse: (schema, ctx) =>
		schema.length === 0
			? // omit empty affixes
			  undefined
			: schema.map((element) => ctx.$.parseTypeNode(element))
}

export class SequenceNode extends BaseNode<
	readonly unknown[],
	SequenceDeclaration,
	typeof SequenceNode
> {
	static implementation: nodeImplementationOf<SequenceDeclaration> =
		this.implement({
			hasAssociatedError: false,
			collapseKey: "variadic",
			keys: {
				fixed: fixedSequenceKeyDefinition,
				optionals: fixedSequenceKeyDefinition,
				variadic: {
					child: true,
					parse: (schema, ctx) => ctx.$.parseTypeNode(schema)
				},
				postfixed: fixedSequenceKeyDefinition
			},
			normalize: (schema) => {
				if (typeof schema === "string") {
					return { variadic: schema }
				}
				if (
					"variadic" in schema ||
					"fixed" in schema ||
					"optionals" in schema ||
					"postfixed" in schema
				) {
					if (schema.postfixed?.length) {
						if (!schema.variadic) {
							return throwParseError(postfixedWithoutVariadicMessage)
						}
						if ((schema.optionals as any)?.length) {
							return throwParseError(postfixedFollowingOptionalMessage)
						}
					}
					return schema
				}
				return { variadic: schema }
			},
			reduce: (inner, scope) => {
				if (!inner.postfixed && !inner.optionals) {
					return
				}
				const fixed = inner.fixed?.slice() ?? []
				const optionals = inner.optionals?.slice() ?? []
				const postfixed = inner.postfixed?.slice() ?? []
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
						while (postfixed[0]?.equals(inner.variadic)) {
							fixed.push(postfixed.shift()!)
						}
					} else {
						// if there's no variadic or optional parameters,
						// postfixed can just be appended to fixed
						fixed.push(...postfixed.splice(0))
					}
				}
				if (
					(inner.postfixed && postfixed.length < inner.postfixed.length) ||
					(inner.optionals && optionals.length < inner.optionals.length)
				) {
					return scope.parse(
						"sequence",
						{
							...inner,
							// empty lists will be omitted during parsing
							fixed,
							postfixed,
							optionals: optionals as never
						},
						{ prereduced: true }
					)
				}
			},
			defaults: {
				description(inner) {
					const parts = inner.fixed?.map(String) ?? []
					inner.optionals?.forEach((node) => parts.push(`an optional ${node}`))
					parts.push(`zero or more ${inner.variadic} elements`)
					inner.postfixed?.forEach((node) => parts.push(String(node)))
					return `an array of ${parts.join(" followed by ")}`
				}
			}
		})

	readonly hasOpenIntersection = false

	readonly fixedLength = this.fixed?.length ?? 0
	readonly optionalsLength = this.optionals?.length ?? 0
	readonly firstVariadicIndex = this.fixedLength + this.optionalsLength
	readonly postfixedLength = this.postfixed?.length ?? 0
	readonly minLength = this.fixedLength + this.postfixedLength

	traverseAllows: TraverseAllows<readonly unknown[]> = (data, ctx) => {
		if (data.length < this.minLength) {
			return false
		}

		let i = 0

		if (this.fixed) {
			for (i; i < this.fixedLength; i++) {
				if (!this.fixed[i].traverseAllows(data[i], ctx)) {
					return false
				}
			}
		}

		if (this.optionals) {
			for (; i < this.firstVariadicIndex; i++) {
				if (i >= data.length) {
					return true
				}
				if (
					!this.optionals[i - this.fixedLength].traverseAllows(data[i], ctx)
				) {
					return false
				}
			}
		}

		const postfixStartIndex = data.length - this.postfixedLength

		if (this.variadic) {
			for (; i < postfixStartIndex; i++) {
				if (!this.variadic.traverseAllows(data[i], ctx)) {
					return false
				}
			}
			if (this.postfixed) {
				for (; i < data.length; i++) {
					if (
						!this.postfixed[i - postfixStartIndex].traverseAllows(data[i], ctx)
					) {
						return false
					}
				}
			}
		}

		return true
	}

	traverseApply: TraverseApply<readonly unknown[]> = (data, ctx) => {
		if (data.length < this.minLength) {
			// TODO: possible to unify with minLength?
			ctx.error(`at least length ${this.minLength}`)
			return
		}

		let i = 0

		if (this.fixed) {
			for (; i < this.fixedLength; i++) {
				this.fixed[i].traverseApply(data[i], ctx)
			}
		}

		if (this.optionals) {
			for (; i < this.firstVariadicIndex; i++) {
				if (i >= data.length) {
					return
				}
				this.optionals[i - this.fixedLength].traverseApply(data[i], ctx)
			}
		}

		const postfixStartIndex = data.length - this.postfixedLength

		if (this.variadic) {
			for (; i < postfixStartIndex; i++) {
				this.variadic.traverseApply(data[i], ctx)
			}
			if (this.postfixed) {
				for (; i < data.length; i++) {
					this.postfixed[i - postfixStartIndex].traverseApply(data[i], ctx)
				}
			}
		}
	}

	compile(js: NodeCompiler) {
		if (this.minLength !== 0) {
			js.if(`${js.data}.length < ${this.minLength}`, () =>
				js.traversalKind === "Allows" ? js.return(false) : js.return()
			)
		}

		this.fixed?.forEach((node, i) => js.checkKey(`${i}`, node, true))
		this.optionals?.forEach((node, i) => {
			const dataIndex = `${i + this.fixedLength}`
			js.if(`${dataIndex} >= ${js.data}.length`, () =>
				js.traversalKind === "Allows" ? js.return(true) : js.return()
			)
			js.checkKey(dataIndex, node, true)
		})

		if (this.variadic) {
			js.const(
				"lastVariadicIndex",
				`${js.data}.length${this.postfixed ? `- ${this.postfixedLength}` : ""}`
			)
			js.for(
				"i < lastVariadicIndex",
				() => js.checkKey("i", this.variadic!, true),
				this.firstVariadicIndex
			)
			this.postfixed?.forEach((node, i) =>
				js.checkKey(`lastVariadicIndex + ${i + 1}`, node, true)
			)
		}

		if (js.traversalKind === "Allows") {
			js.return(true)
		}
	}

	protected intersectOwnInner(r: SequenceNode) {
		return this
	}

	foldIntersection(into: FoldInput<"sequence">) {
		return into
	}
}

export const postfixedFollowingOptionalMessage =
	"A postfixed required element cannot follow an optional element"

export type postfixedFollowingOptionalMessage =
	typeof postfixedFollowingOptionalMessage

export const postfixedWithoutVariadicMessage =
	"A postfixed element requires a variadic element"

export type postfixedWithoutVariadicMessage =
	typeof postfixedWithoutVariadicMessage
