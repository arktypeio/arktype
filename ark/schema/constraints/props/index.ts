import { throwParseError, type Key } from "@arktype/util"
import type { TypeNode, TypeSchema } from "../../base.js"
import type { NodeCompiler } from "../../shared/compile.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import type { TypeKind, nodeImplementationOf } from "../../shared/implement.js"
import type { TraverseAllows, TraverseApply } from "../../shared/traversal.js"
import { BaseConstraint } from "../constraint.js"

export interface IndexSchema extends BaseMeta {
	readonly key: TypeSchema
	readonly value: TypeSchema
}

export interface IndexInner extends BaseMeta {
	readonly key: TypeNode<Key>
	readonly value: TypeNode
}

export type IndexDeclaration = declareNode<{
	kind: "index"
	schema: IndexSchema
	normalizedSchema: IndexSchema
	inner: IndexInner
	prerequisite: object
	intersectionIsOpen: true
	childKind: TypeKind
}>

export class IndexNode extends BaseConstraint<IndexDeclaration> {
	static implementation: nodeImplementationOf<IndexDeclaration> =
		this.implement({
			hasAssociatedError: false,
			intersectionIsOpen: true,
			keys: {
				key: {
					child: true,
					parse: (schema, ctx) => {
						const key = ctx.$.node(schema)
						if (!key.extends(ctx.$.keywords.propertyKey))
							return throwParseError(
								writeInvalidPropertyKeyMessage(key.expression)
							)
						return key
					}
				},
				value: {
					child: true,
					parse: (schema, ctx) => ctx.$.node(schema)
				}
			},
			normalize: (schema) => schema,
			defaults: {
				description(node) {
					return `[${node.key.expression}]: ${node.value.description}`
				}
			},
			intersections: {
				index: (l, r) => l
			}
		})

	readonly impliedBasis = this.$.keywords.object
	readonly expression = `[${this.key.expression}]: ${this.value.expression}`

	traverseAllows: TraverseAllows<object> = (data, ctx) =>
		Object.entries(data).every(
			(entry) =>
				!this.key.traverseAllows(entry[0], ctx) ||
				this.value.traverseAllows(entry[1], ctx)
		)

	traverseApply: TraverseApply<object> = (data, ctx) =>
		Object.entries(data).forEach((entry) => {
			if (this.key.traverseAllows(entry[0], ctx)) {
				this.value.traverseApply(entry[1], ctx)
			}
		})

	compile(js: NodeCompiler): void {
		if (js.traversalKind === "Allows") {
			js.return(true)
		}
	}
}

export const writeInvalidPropertyKeyMessage = <indexDef extends string>(
	indexDef: indexDef
): writeInvalidPropertyKeyMessage<indexDef> =>
	`Indexed key definition '${indexDef}' must be a string, number or symbol`

export type writeInvalidPropertyKeyMessage<indexDef extends string> =
	`Indexed key definition '${indexDef}' must be a string, number or symbol`
