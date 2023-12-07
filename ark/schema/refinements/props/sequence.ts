import type { TypeNode, TypeSchema } from "../../base.js"
import type { CompilationContext, Problems } from "../../shared/compilation.js"
import type { declareNode, withAttributes } from "../../shared/declare.js"
import type {
	KeyDefinitions,
	NodeKeyImplementation,
	NodeParserImplementation
} from "../../shared/define.js"
import type { Disjoint } from "../../shared/disjoint.js"
import type { NodeIntersections } from "../../shared/intersect.js"
import { RefinementNode } from "../shared.js"

// 	// TODO: add minLength prop that would result from collapsing types like [...number[], number]
// 	// to a single variadic number prop with minLength 1

export type SequenceSchema = withAttributes<{
	readonly prefix?: readonly TypeSchema[]
	readonly variadic?: TypeSchema
	readonly postfix?: readonly TypeSchema[]
}>

export type SequenceInner = {
	readonly prefix?: readonly TypeNode[]
	readonly variadic?: TypeNode
	readonly postfix?: readonly TypeNode[]
}

export type SequenceDeclaration = declareNode<{
	kind: "sequence"
	schema: SequenceSchema
	inner: SequenceInner
	intersections: {
		sequence: "sequence" | Disjoint | null
	}
	checks: readonly unknown[]
}>

const fixedSequenceKeyDefinition: NodeKeyImplementation<
	SequenceDeclaration,
	"postfix" | "prefix"
> = {
	child: true,
	parse: (schema, ctx) =>
		schema.map((element) => ctx.scope.parseTypeNode(element))
}

export class SequenceNode extends RefinementNode<SequenceDeclaration> {
	static parser: NodeParserImplementation<SequenceDeclaration> = {
		keys: {
			prefix: fixedSequenceKeyDefinition,
			variadic: {
				child: true,
				parse: (schema, ctx) => ctx.scope.parseTypeNode(schema)
			},
			postfix: fixedSequenceKeyDefinition
		},
		normalize: (schema) => schema
	}

	static intersections: NodeIntersections<SequenceDeclaration> = {
		sequence: (l) => l
	}

	traverseAllows = (data: readonly unknown[], problems: Problems) => true

	traverseApply = (data: readonly unknown[], problems: Problems) => {}

	getCheckedDefinitions() {
		return ["object"] as const
	}

	writeDefaultDescription() {
		return ""
	}

	compileBody(ctx: CompilationContext): string {
		return ""
	}
}
