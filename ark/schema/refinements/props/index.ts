import type { TypeNode, TypeSchema } from "../../base.js"
import type { CompilationContext, Problems } from "../../shared/compilation.js"
import type { declareNode, withAttributes } from "../../shared/declare.js"
import type { NodeParserImplementation } from "../../shared/define.js"
import type { Disjoint } from "../../shared/disjoint.js"
import type { NodeIntersections } from "../../shared/intersect.js"
import { RefinementNode } from "../shared.js"

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
	inner: IndexInner
	intersections: {
		index: "index" | Disjoint | null
	}
	checks: object
}>

export class IndexNode extends RefinementNode<IndexDeclaration> {
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

	static intersections: NodeIntersections<IndexDeclaration> = {
		index: (l) => l
	}

	traverseAllows = (data: object, problems: Problems) =>
		Object.entries(data).every(
			(entry) =>
				!this.key.traverseAllows(entry[0], problems) ||
				this.value.traverseAllows(entry[1], problems)
		)

	traverseApply = (data: object, problems: Problems) =>
		Object.entries(data).forEach((entry) => {
			if (this.key.traverseAllows(entry[0], problems)) {
				this.value.traverseAllows(entry[1], problems)
			}
		})

	getCheckedDefinitions() {
		return ["object"] as const
	}

	writeDefaultDescription() {
		return `[${this.key}]: ${this.value}`
	}

	compileBody(ctx: CompilationContext): string {
		return ""
	}
}
