import { BaseNode, type TypeNode, type TypeSchema } from "../base.js"
import type { CompilationContext } from "../shared/compile.js"
import type {
	BaseConstraint,
	BaseMeta,
	declareNode
} from "../shared/declare.js"
import type { Disjoint } from "../shared/disjoint.js"
import {
	createBasisAssertion,
	type nodeImplementationOf
} from "../shared/implement.js"
import type { TraverseAllows, TraverseApply } from "../traversal/context.js"

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
	open: true
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
			}
		})

	readonly hasOpenIntersection = true

	readonly constraintGroup = "props"

	get prerequisiteSchemas() {
		return ["object"] as const
	}

	assertValidBasis = createBasisAssertion(this as never)

	traverseAllows: TraverseAllows<object> = (data, ctx) =>
		Object.entries(data).every(
			(entry) =>
				!this.key.traverseAllows(entry[0], ctx) ||
				this.value.traverseAllows(entry[1], ctx)
		)

	traverseApply: TraverseApply<object> = (data, ctx) =>
		Object.entries(data).forEach((entry) => {
			if (this.key.traverseAllows(entry[0], ctx)) {
				this.value.traverseAllows(entry[1], ctx)
			}
		})

	getCheckedDefinitions() {
		return ["object"] as const
	}

	compileApply(ctx: CompilationContext): string {
		return ""
	}

	compileAllows(ctx: CompilationContext): string {
		return ""
	}

	protected intersectOwnInner(r: IndexNode): IndexInner {
		return this
	}
}
