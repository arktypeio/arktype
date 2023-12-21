import type { Node, TypeSchema } from "../base.js"
import type {
	CompilationContext,
	TraverseAllows,
	TraverseApply
} from "../scope.js"
import type { declareNode, withBaseMeta } from "../shared/declare.js"
import type { NodeImplementation, TypeKind } from "../shared/define.js"
import { Disjoint } from "../shared/disjoint.js"
import { compileSerializedValue } from "../traversal/registry.js"
import { BaseProp, compileKey, compilePresentProp } from "./prop.js"

export type OptionalInner = {
	readonly key: string | symbol
	readonly value: Node<TypeKind>
}

export type OptionalSchema = withBaseMeta<{
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

export class OptionalNode extends BaseProp<
	OptionalDeclaration,
	typeof OptionalNode
> {
	static implementation: NodeImplementation<OptionalDeclaration> = {
		keys: {
			key: {},
			value: {
				child: true,
				parse: (schema, ctx) => ctx.$.parseTypeNode(schema)
			}
		},
		normalize: (schema) => schema,
		defaults: {
			describe(inner) {
				return `${compileKey(inner.key)}?: ${inner.value}`
			}
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
						value instanceof Disjoint ? (l.$.builtin.never as never) : value
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

	compiledKey = compileKey(this.key)

	getCheckedDefinitions() {
		return ["object"] as const
	}
}
