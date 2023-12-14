import type { TypeNode, TypeSchema } from "../base.js"
import type {
	CompilationContext,
	TraverseAllows,
	TraverseApply
} from "../scope.js"
import type { declareNode, withAttributes } from "../shared/declare.js"
import type { NodeParserImplementation } from "../shared/define.js"
import type { Disjoint } from "../shared/disjoint.js"
import type { NodeIntersections } from "../shared/intersect.js"
import { BaseRefinement } from "./refinement.js"

export type IndexSchema = withAttributes<{
	readonly key: TypeSchema
	readonly value: TypeSchema
}>

export type IndexInner = {
	readonly key: TypeNode<string | symbol>
	readonly value: TypeNode
}

export type IndexDeclaration = declareNode<{
	kind: "index"
	schema: IndexSchema
	normalizedSchema: IndexSchema
	inner: IndexInner
	intersections: {
		index: "index" | Disjoint | null
	}
	prerequisite: object
}>

export class IndexNode extends BaseRefinement<IndexDeclaration> {
	static parser: NodeParserImplementation<IndexDeclaration> = {
		keys: {
			key: {
				child: true,
				parse: (schema, ctx) => ctx.scope.parseTypeNode(schema)
			},
			value: {
				child: true,
				parse: (schema, ctx) => ctx.scope.parseTypeNode(schema)
			}
		},
		normalize: (schema) => schema
	}

	static writeDefaultDescription(node: IndexNode) {
		return `[${node.key}]: ${node.value}`
	}

	static intersections: NodeIntersections<IndexDeclaration> = {
		index: (l) => l
	}

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
				this.value.traverseAllows(entry[1], ctx)
			}
		})

	getCheckedDefinitions() {
		return ["object"] as const
	}

	compileBody(ctx: CompilationContext): string {
		return ""
	}
}
