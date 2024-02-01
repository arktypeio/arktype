import { BaseNode, type Node, type TypeSchema } from "../base.js"
import type { CompilationContext } from "../shared/compile.js"
import type {
	BaseConstraint,
	BaseMeta,
	declareNode
} from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	createBasisAssertion,
	type TypeKind,
	type nodeImplementationOf
} from "../shared/implement.js"
import type { TraverseAllows, TraverseApply } from "../traversal/context.js"
import { compileSerializedValue } from "../traversal/registry.js"
import {
	compileKey,
	compilePresentPropAllows,
	compilePresentPropApply
} from "./prop.js"

export interface OptionalInner extends BaseMeta {
	readonly key: string | symbol
	readonly value: Node<TypeKind>
}

export interface OptionalSchema extends BaseMeta {
	readonly key: string | symbol
	readonly value: TypeSchema
}

export type OptionalDeclaration = declareNode<{
	kind: "optional"
	schema: OptionalSchema
	normalizedSchema: OptionalSchema
	inner: OptionalInner
	intersections: {
		optional: "optional" | null
	}
	prerequisite: object
	open: true
}>

export class OptionalNode
	extends BaseNode<object, OptionalDeclaration, typeof OptionalNode>
	implements BaseConstraint
{
	static implementation: nodeImplementationOf<OptionalDeclaration> =
		this.implement({
			keys: {
				key: {},
				value: {
					child: true,
					parse: (schema, ctx) => ctx.$.parseTypeNode(schema)
				}
			},
			hasAssociatedError: false,
			normalize: (schema) => schema,
			defaults: {
				description(inner) {
					return `${compileKey(inner.key)}?: ${inner.value}`
				}
			}
		})

	readonly hasOpenIntersection = true

	readonly constraintGroup = "props"

	get prerequisiteSchemas() {
		return ["object"] as const
	}

	assertValidBasis = createBasisAssertion(this as never)

	serializedKey = compileSerializedValue(this.key)

	traverseAllows: TraverseAllows<object> = (data, ctx) =>
		!(this.key in data) ||
		this.value.traverseAllows((data as any)[this.key], ctx)

	traverseApply: TraverseApply<object> = (data: object, ctx) => {
		if (this.key in data) {
			this.value.traverseApply((data as any)[this.key], ctx)
		}
	}

	compileApply(ctx: CompilationContext): string {
		return `if(${this.serializedKey} in ${ctx.dataArg}) {
			${compilePresentPropApply(this, ctx)}
		}`
	}

	compileAllows(ctx: CompilationContext): string {
		return `if(${this.serializedKey} in ${ctx.dataArg}) {
			${compilePresentPropAllows(this, ctx)}
		}`
	}

	compiledKey = compileKey(this.key)

	protected intersectOwnInner(r: OptionalNode) {
		if (this.key !== r.key) {
			return null
		}
		const key = this.key
		const value = this.value.intersect(r.value)
		return {
			key,
			value: value instanceof Disjoint ? (this.$.builtin.never as never) : value
		}
	}
}
