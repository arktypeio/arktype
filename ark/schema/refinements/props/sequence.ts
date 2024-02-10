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

export interface NormalizedSequenceSchema extends BaseMeta {
	readonly prefix?: readonly TypeSchema[]
	readonly optional?: readonly TypeSchema[]
	readonly element?: TypeSchema
	readonly postfix?: readonly TypeSchema[]
}

export type SequenceSchema = NormalizedSequenceSchema | TypeSchema

export interface SequenceInner extends BaseMeta {
	// a list of fixed position elements starting at index 0 (undefined equivalent to [])
	readonly prefix?: readonly TypeNode[]
	// a list of optional elements following prefix (undefined equivalent to [])
	readonly optional?: readonly TypeNode[]
	// the variadic element (only allowed if all optional elements are present)
	readonly element?: TypeNode
	// a list of fixed position elements, the last being the last element of the array (undefined equivalent to [])
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
}>

const fixedSequenceKeyDefinition: NodeKeyImplementation<
	SequenceDeclaration,
	"prefix" | "postfix" | "optional"
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
			collapseKey: "element",
			keys: {
				prefix: fixedSequenceKeyDefinition,
				optional: fixedSequenceKeyDefinition,
				element: {
					child: true,
					parse: (schema, ctx) => ctx.$.parseTypeNode(schema)
				},
				postfix: fixedSequenceKeyDefinition
			},
			normalize: (schema) =>
				typeof schema === "object" && "element" in schema
					? schema
					: { element: schema },
			reduce: (inner, scope) => {
				if (!inner.element || (!inner.postfix && !inner.optional)) {
					return
				}
				const optional = inner.optional?.slice() ?? []
				while (optional.at(-1)?.equals(inner.element)) {
					optional.pop()
				}
				const postfix = inner.postfix?.slice() ?? []
				const prefix = inner.prefix?.slice() ?? []
				while (postfix[0]?.equals(inner.element)) {
					prefix.push(postfix.shift()!)
				}
				if (
					(inner.postfix && postfix.length < inner.postfix.length) ||
					(inner.optional && optional.length < inner.optional.length)
				) {
					return scope.parse(
						"sequence",
						{
							...inner,
							// empty lists will be omitted during normalization
							prefix,
							postfix,
							optional
						},
						{ prereduced: true }
					)
				}
			},
			defaults: {
				description(inner) {
					const parts = inner.prefix?.map(String) ?? []
					parts.push(`zero or more elements containing ${inner.element}`)
					inner.postfix?.forEach((node) => parts.push(String(node)))
					return `an array of ${parts.join(" followed by ")}`
				}
			}
		})

	readonly hasOpenIntersection = false

	readonly prefixLength = this.prefix?.length ?? 0
	readonly postfixLength = this.postfix?.length ?? 0
	readonly minLength = this.prefixLength + this.postfixLength

	traverseAllows: TraverseAllows<readonly unknown[]> = (data, ctx) => {
		if (data.length < this.minLength) {
			return false
		}

		let i = 0

		if (this.prefix) {
			for (i; i < this.prefixLength; i++) {
				if (!this.prefix[i].traverseAllows(data[i], ctx)) {
					return false
				}
			}
		}

		const postfixStartIndex = data.length - this.postfixLength

		for (i; i++; i < postfixStartIndex) {
			if (!this.element.traverseAllows(data[i], ctx)) {
				return false
			}
		}

		if (this.postfix) {
			for (i; i < data.length; i++) {
				if (!this.postfix[i].traverseAllows(data[i], ctx)) {
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

		if (this.prefix) {
			for (i; i < this.prefixLength; i++) {
				this.prefix[i].traverseApply(data[i], ctx)
			}
		}

		const postfixStartIndex = data.length - this.postfixLength

		for (i; i++; i < postfixStartIndex) {
			this.element.traverseApply(data[i], ctx)
		}

		if (this.postfix) {
			for (i; i < data.length; i++) {
				this.postfix[i].traverseApply(data[i], ctx)
			}
		}
	}

	compile(js: NodeCompiler) {
		if (this.minLength !== 0) {
			js.if(`${js.data}.length < ${this.minLength}`, () =>
				js.traversalKind === "Allows" ? js.return(false) : js.return()
			)
		}

		this.prefix?.forEach((node, i) => js.checkKey(`${i}`, node, true))
		js.const(
			"lastVariadicIndex",
			`${js.data}.length${this.postfix ? `- ${this.postfixLength}` : ""}`
		)
		js.for("i < lastVariadicIndex", () => js.checkKey("i", this.element, true))

		this.postfix?.forEach((node, i) =>
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
