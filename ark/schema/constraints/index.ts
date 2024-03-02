import { BaseNode, type TypeNode, type TypeSchema } from "../base.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { TraverseAllows, TraverseApply } from "../shared/context.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import type { TypeKind, nodeImplementationOf } from "../shared/implement.js"
import type { FoldBranch, FoldState } from "./constraint.js"

export interface IndexSchema extends BaseMeta {
	readonly key: TypeSchema
	readonly value: TypeSchema
}

export interface IndexInner extends BaseMeta {
	readonly key: TypeNode<string | symbol>
	readonly value: TypeNode
}

export type IndexDeclaration = declareNode<{
	kind: "index"
	schema: IndexSchema
	normalizedSchema: IndexSchema
	inner: IndexInner
	composition: "composite"
	prerequisite: object
	open: true
	childKind: TypeKind
}>

export class IndexNode extends BaseNode<
	object,
	IndexDeclaration,
	typeof IndexNode
> {
	static implementation: nodeImplementationOf<IndexDeclaration> =
		this.implement({
			hasAssociatedError: false,
			keys: {
				key: {
					child: true,
					parse: (schema, ctx) => ctx.$.parseTypeNode(schema)
				},
				value: {
					child: true,
					parse: (schema, ctx) => ctx.$.parseTypeNode(schema)
				}
			},
			normalize: (schema) => schema,
			defaults: {
				description(inner) {
					return `[${inner.key}]: ${inner.value}`
				}
			},
			intersectSymmetric: (l, r) => l
		})

	readonly hasOpenIntersection = true

	traverseAllows: TraverseAllows<object> = (data, ctx) =>
		Object.entries(data).every(
			(entry) =>
				!this.key.traverseAllows(entry[0], ctx) ||
				this.value.traverseAllows(entry[1], ctx)
		)

	traverseApply: TraverseApply<object> = (data, ctx) =>
		Object.entries(data).forEach((entry) => {
			if (this.key.traverseAllows(entry[0], ctx)) {
				this.value.traverseApply(entry[1], ctx)
			}
		})

	compile(js: NodeCompiler) {
		if (js.traversalKind === "Allows") {
			js.return(true)
		}
	}

	fold(into: FoldBranch<"index">) {}
}
