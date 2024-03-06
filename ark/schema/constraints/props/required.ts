import { compileSerializedValue } from "@arktype/util"
import type { Node, TypeSchema } from "../../base.js"
import type { NodeCompiler } from "../../shared/compile.js"
import type { TraverseAllows, TraverseApply } from "../../shared/context.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import type { TypeKind, nodeImplementationOf } from "../../shared/implement.js"
import { BaseConstraint } from "../constraint.js"
import { compileKey } from "./shared.js"

export interface RequiredSchema extends BaseMeta {
	readonly key: string | symbol
	readonly value: TypeSchema
}

export interface RequiredInner extends BaseMeta {
	readonly key: string | symbol
	readonly value: Node<TypeKind>
}

export type RequiredDeclaration = declareNode<{
	kind: "required"
	schema: RequiredSchema
	normalizedSchema: RequiredSchema
	inner: RequiredInner
	expectedContext: {
		code: "required"
		key: string | symbol
	}
	prerequisite: object
	symmetricIntersectionIsOpen: true
	childKind: TypeKind
}>

export class RequiredNode extends BaseConstraint<
	RequiredDeclaration,
	typeof RequiredNode
> {
	static implementation: nodeImplementationOf<RequiredDeclaration> =
		this.implement({
			hasAssociatedError: true,
			symmetricIntersectionIsOpen: true,
			keys: {
				key: {},
				value: {
					child: true,
					parse: (schema, ctx) => ctx.$.parseTypeNode(schema)
				}
			},
			normalize: (schema) => schema,
			defaults: {
				description(inner) {
					return `${compileKey(inner.key)}: ${inner.value}`
				},
				expected() {
					return "provided"
				},
				actual: () => null
			},
			intersections: {
				required: (l, r, $) => {
					if (l.key !== r.key) {
						return null
					}
					const key = l.key
					const value = l.value.intersect(r.value)
					if (value instanceof Disjoint) {
						return value
					}
					return $.parse("required", {
						key,
						value
					})
				},
				default: () => null
			}
		})

	readonly serializedKey = compileSerializedValue(this.key)
	readonly baseRequiredErrorContext = Object.freeze({
		code: "required",
		key: this.key
	})

	traverseAllows: TraverseAllows<object> = (data, ctx) => {
		if (this.key in data) {
			return this.value.traverseAllows((data as any)[this.key], ctx)
		}
		return false
	}

	traverseApply: TraverseApply<object> = (data, ctx) => {
		if (this.key in data) {
			this.value.traverseApply((data as any)[this.key], ctx)
		} else {
			ctx.error(this.baseRequiredErrorContext)
		}
	}

	compile(js: NodeCompiler) {
		js.if(`${this.serializedKey} in ${js.data}`, () =>
			js.checkLiteralKey(this.key, this.value)
		).else(() =>
			js.traversalKind === "Allows"
				? js.return(false)
				: js.line(
						`${js.ctx}.error(${JSON.stringify(this.baseRequiredErrorContext)})`
				  )
		)
		if (js.traversalKind === "Allows") {
			js.return(true)
		}
	}
}
