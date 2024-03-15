import { throwParseError } from "@arktype/util"
import type { TypeSchema } from "../../base.js"
import { root } from "../../builtins/root.js"
import { tsPrimitiveKeywords } from "../../builtins/tsKeywords.js"
import type { NodeCompiler } from "../../shared/compile.js"
import type { TraverseAllows, TraverseApply } from "../../shared/context.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import type { TypeKind, nodeImplementationOf } from "../../shared/implement.js"
import type { Type } from "../../types/type.js"
import { BaseConstraint } from "../constraint.js"

export interface IndexSchema extends BaseMeta {
	readonly signature: TypeSchema
	readonly value: TypeSchema
}

export interface IndexInner extends BaseMeta {
	readonly signature: Type<string | symbol>
	readonly value: Type
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

const stringOrSymbol = root.node({ branches: ["string", "symbol"] })

export class IndexNode extends BaseConstraint<IndexDeclaration> {
	static implementation: nodeImplementationOf<IndexDeclaration> =
		this.implement({
			hasAssociatedError: false,
			intersectionIsOpen: true,
			keys: {
				signature: {
					child: true,
					parse: (schema, ctx) => {
						const key = ctx.$.node(schema)
						if (!key.extends(stringOrSymbol))
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
					return `[${node.signature.description}]: ${node.value.description}`
				}
			},
			intersections: {
				index: (l, r) => l
			}
		})

	readonly impliedBasis = tsPrimitiveKeywords.object
	readonly expression = `[${this.signature}]: ${this.value}`

	traverseAllows: TraverseAllows<object> = (data, ctx) =>
		Object.entries(data).every(
			(entry) =>
				!this.signature.traverseAllows(entry[0], ctx) ||
				this.value.traverseAllows(entry[1], ctx)
		)

	traverseApply: TraverseApply<object> = (data, ctx) =>
		Object.entries(data).forEach((entry) => {
			if (this.signature.traverseAllows(entry[0], ctx)) {
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
