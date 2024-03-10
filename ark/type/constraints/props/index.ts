import type { TypeNode, TypeSchema } from "../../base.js"
import type { NodeCompiler } from "../../shared/compile.js"
import type { TraverseAllows, TraverseApply } from "../../shared/context.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import type { TypeKind, nodeImplementationOf } from "../../shared/implement.js"
import { BaseConstraint } from "../constraint.js"

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
	prerequisite: object
	intersectionIsOpen: true
	childKind: TypeKind
}>

export class IndexNode extends BaseConstraint<
	IndexDeclaration,
	typeof IndexNode
> {
	static implementation: nodeImplementationOf<IndexDeclaration> =
		this.implement({
			hasAssociatedError: false,
			intersectionIsOpen: true,
			keys: {
				key: {
					child: true,
					parse: (schema, ctx) => ctx.$.parseTypeSchema(schema)
				},
				value: {
					child: true,
					parse: (schema, ctx) => ctx.$.parseTypeSchema(schema)
				}
			},
			normalize: (schema) => schema,
			defaults: {
				description(node) {
					return `[${node.key.description}]: ${node.value.description}`
				}
			},
			intersections: {
				index: (l, r) => l
			}
		})

	readonly impliedBasis = this.$.tsKeywords.object
	readonly expression = `[${this.key}]: ${this.value}`

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
}
