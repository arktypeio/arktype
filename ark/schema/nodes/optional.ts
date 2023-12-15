import type { Node, TypeSchema } from "../base.js"
import type {
	CompilationContext,
	TraverseAllows,
	TraverseApply
} from "../scope.js"
import type { declareNode, withAttributes } from "../shared/declare.js"
import type { NodeImplementation, TypeKind } from "../shared/define.js"
import { Disjoint } from "../shared/disjoint.js"
import type { NodeIntersections } from "../shared/intersect.js"
import { compileSerializedValue } from "../shared/registry.js"
import { BaseRefinement, compilePresentProp } from "./refinement.js"

export type OptionalInner = {
	readonly key: string | symbol
	readonly value: Node<TypeKind>
}

export type OptionalSchema = withAttributes<{
	readonly key: string | symbol
	readonly value: TypeSchema
}>

export type OptionalDeclaration = declareNode<{
	kind: "optional"
	schema: OptionalSchema
	normalizedSchema: OptionalSchema
	inner: OptionalInner
	intersections: {
		optional: "optional" | null
	}
	prerequisite: object
}>

export class OptionalNode extends BaseRefinement<OptionalDeclaration> {
	static implementation: NodeImplementation<OptionalDeclaration> = {
		keys: {
			key: {},
			value: {
				child: true,
				parse: (schema, ctx) => ctx.scope.parseTypeNode(schema)
			}
		},
		normalize: (schema) => schema,
		describeExpected(node) {
			return `${String(node.compiledKey)}?: ${node.value}`
		},
		intersections: {
			optional: (l, r) => {
				if (l.key !== r.key) {
					return null
				}
				const optional = l.key
				const value = l.value.intersect(r.value)
				return {
					key: optional,
					value:
						value instanceof Disjoint ? (l.scope.builtin.never as never) : value
				}
			}
		}
	}

	readonly hasOpenIntersection = true
	serializedKey = compileSerializedValue(this.key)

	traverseAllows: TraverseAllows<object> = (data, ctx) =>
		!(this.key in data) ||
		this.value.traverseAllows((data as any)[this.key], ctx)

	traverseApply: TraverseApply<object> = (data: object, ctx) => {
		if (this.key in data) {
			this.value.traverseApply((data as any)[this.key], ctx)
		}
	}

	compileBody(ctx: CompilationContext): string {
		return `if(${this.serializedKey} in ${ctx.argName}) {
			${compilePresentProp(this, ctx)}
		}`
	}

	compiledKey = typeof this.key === "string" ? this.key : this.serializedKey

	getCheckedDefinitions() {
		return ["object"] as const
	}
}
