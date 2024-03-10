import { compileSerializedValue } from "@arktype/util"
import type { Node, TypeSchema } from "../../base.js"
import type { NodeCompiler } from "../../shared/compile.js"
import type { TraverseAllows, TraverseApply } from "../../shared/context.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import type { TypeKind, nodeImplementationOf } from "../../shared/implement.js"
import { BaseConstraint } from "../constraint.js"

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
	prerequisite: object
	intersectionIsOpen: true
	childKind: TypeKind
}>

export class OptionalNode extends BaseConstraint<
	OptionalDeclaration,
	typeof OptionalNode
> {
	static implementation: nodeImplementationOf<OptionalDeclaration> =
		this.implement({
			keys: {
				key: {},
				value: {
					child: true,
					parse: (schema, ctx) => ctx.$.parseTypeSchema(schema)
				}
			},
			hasAssociatedError: false,
			intersectionIsOpen: true,
			normalize: (schema) => schema,
			defaults: {
				description(node) {
					return `${node.compiledKey}?: ${node.value.description}`
				}
			},
			intersections: {
				optional: (l, r) => {
					if (l.key !== r.key) {
						return null
					}
					const key = l.key
					const value = l.value.intersect(r.value)
					return l.$.parse("optional", {
						key,
						value:
							value instanceof Disjoint
								? (l.$.tsKeywords.never as never)
								: value
					})
				}
			}
		})

	readonly impliedBasis = this.$.tsKeywords.object
	readonly serializedKey = compileSerializedValue(this.key)
	readonly compiledKey =
		typeof this.key === "string" ? this.key : this.serializedKey
	readonly expression = `${this.compiledKey}?: ${this.value}`

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
			js.checkLiteralKey(this.key, this.value)
		)
		if (js.traversalKind === "Allows") {
			js.return(true)
		}
	}
}
