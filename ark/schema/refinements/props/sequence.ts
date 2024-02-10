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

// TODO: element not required, always create sequence node if array with numeric indexs
export interface NormalizedSequenceSchema extends BaseMeta {
	readonly fixed?: readonly TypeSchema[]
	readonly optionals?: readonly TypeSchema[]
	readonly variadic?: TypeSchema
	readonly postfixed?: readonly TypeSchema[]
}

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
			normalize: (schema) =>
				typeof schema === "object" &&
				("variadic" in schema ||
					"fixed" in schema ||
					"optionals" in schema ||
					"postfixed" in schema)
					? schema
					: { variadic: schema },
			reduce: (inner, scope) => {
				if (!inner.postfixed && !inner.optionals) {
					return
				}
				const optional = inner.optionals?.slice() ?? []
				if (inner.variadic) {
					// optional elements equivalent to the variadic parameter are redundant
					while (optional.at(-1)?.equals(inner.variadic)) {
						optional.pop()
					}
				}
				const postfix = inner.postfixed?.slice() ?? []
				const prefix = inner.fixed?.slice() ?? []
				if (optional.length === 0) {
					if (inner.variadic) {
						// if optional length is 0, normalize equivalent
						// prefix/postfix elements to prefix, e.g.:
						// [...number[], number] => [number, ...number[]]
						while (postfix[0]?.equals(inner.variadic)) {
							prefix.push(postfix.shift()!)
						}
					} else {
						// if there's no variadic or optional parameters,
						// postfixed can just be appended to fixed
						prefix.push(...postfix.splice(0))
					}
				}
				if (
					(inner.postfixed && postfix.length < inner.postfixed.length) ||
					(inner.optionals && optional.length < inner.optionals.length)
				) {
					return scope.parse(
						"sequence",
						{
							...inner,
							// empty lists will be omitted during normalization
							fixed: prefix,
							postfixed: postfix,
							optionals: optional
						},
						{ prereduced: true }
					)
				}
			},
			defaults: {
				description(inner) {
					const parts = inner.fixed?.map(String) ?? []
					parts.push(`zero or more elements containing ${inner.variadic}`)
					inner.postfixed?.forEach((node) => parts.push(String(node)))
					return `an array of ${parts.join(" followed by ")}`
				}
			}
		})

	readonly hasOpenIntersection = false

	readonly prefixLength = this.fixed?.length ?? 0
	readonly postfixLength = this.postfixed?.length ?? 0
	readonly minLength = this.prefixLength + this.postfixLength

	traverseAllows: TraverseAllows<readonly unknown[]> = (data, ctx) => {
		if (data.length < this.minLength) {
			return false
		}

		let i = 0

		if (this.fixed) {
			for (i; i < this.prefixLength; i++) {
				if (!this.fixed[i].traverseAllows(data[i], ctx)) {
					return false
				}
			}
		}

		const postfixStartIndex = data.length - this.postfixLength

		for (i; i++; i < postfixStartIndex) {
			if (!this.variadic.traverseAllows(data[i], ctx)) {
				return false
			}
		}

		if (this.postfixed) {
			for (i; i < data.length; i++) {
				if (!this.postfixed[i].traverseAllows(data[i], ctx)) {
					return false
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
			for (i; i < this.prefixLength; i++) {
				this.fixed[i].traverseApply(data[i], ctx)
			}
		}

		const postfixStartIndex = data.length - this.postfixLength

		for (i; i++; i < postfixStartIndex) {
			this.variadic.traverseApply(data[i], ctx)
		}

		if (this.postfixed) {
			for (i; i < data.length; i++) {
				this.postfixed[i].traverseApply(data[i], ctx)
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
		js.const(
			"lastVariadicIndex",
			`${js.data}.length${this.postfixed ? `- ${this.postfixLength}` : ""}`
		)
		js.for("i < lastVariadicIndex", () => js.checkKey("i", this.variadic, true))

		this.postfixed?.forEach((node, i) =>
			js.checkKey(`lastVariadicIndex + ${i + 1}`, node, true)
		)

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
