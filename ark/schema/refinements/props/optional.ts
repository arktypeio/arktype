import { compileSerializedValue } from "@arktype/util"
import { BaseNode, type Node, type TypeSchema } from "../../base.js"
import type { NodeCompiler } from "../../shared/compile.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import type { TypeKind, nodeImplementationOf } from "../../shared/implement.js"
import type { TraverseAllows, TraverseApply } from "../../traversal/context.js"
import type { FoldInput } from "../refinement.js"
import { compileKey } from "./shared.js"

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
	composition: "composite"
	prerequisite: object
	open: true
	childKind: TypeKind
}>

export class OptionalNode extends BaseNode<
	object,
	OptionalDeclaration,
	typeof OptionalNode
> {
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

	serializedKey = compileSerializedValue(this.key)

	traverseAllows: TraverseAllows<object> = (data, ctx) =>
		!(this.key in data) ||
		this.value.traverseAllows((data as any)[this.key], ctx)

	traverseApply: TraverseApply<object> = (data: object, ctx) => {
		if (this.key in data) {
			this.value.traverseApply((data as any)[this.key], ctx)
		}
	}

	compile(js: NodeCompiler) {
		js.if(`${this.serializedKey} in ${js.data}`, () =>
			js.traverseKey(this.serializedKey, () =>
				js.line(js.invoke(this.value, { arg: js.prop(js.data, this.key) }))
			)
		)
	}

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

	foldIntersection(into: FoldInput<"optional">) {
		return {}
	}
}
