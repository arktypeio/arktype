import { throwParseError } from "@arktype/util"
import type { SchemaDef } from "../../node.js"
import type { RawSchema } from "../../schema.js"
import type { NodeCompiler } from "../../shared/compile.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import { implementNode, type SchemaKind } from "../../shared/implement.js"
import type { TraverseAllows, TraverseApply } from "../../shared/traversal.js"
import { RawConstraint } from "../constraint.js"

export interface IndexDef extends BaseMeta {
	readonly key: SchemaDef
	readonly value: SchemaDef
}

export interface IndexInner extends BaseMeta {
	readonly key: RawSchema
	readonly value: RawSchema
}

export type IndexDeclaration = declareNode<{
	kind: "index"
	def: IndexDef
	normalizedDef: IndexDef
	inner: IndexInner
	prerequisite: object
	intersectionIsOpen: true
	childKind: SchemaKind
}>

export const indexImplementation = implementNode<IndexDeclaration>({
	kind: "index",
	hasAssociatedError: false,
	intersectionIsOpen: true,
	keys: {
		key: {
			child: true,
			parse: (def, ctx) => {
				const key = ctx.$.schema(def)
				if (!key.extends(ctx.$.keywords.propertyKey))
					return throwParseError(writeInvalidPropertyKeyMessage(key.expression))
				return key
			}
		},
		value: {
			child: true,
			parse: (def, ctx) => ctx.$.schema(def)
		}
	},
	normalize: (def) => def,
	defaults: {
		description: (node) => `[${node.key.expression}]: ${node.value.description}`
	},
	intersections: {
		index: (l) => l
	}
})

export class IndexNode extends RawConstraint<IndexDeclaration> {
	impliedBasis = this.$.keywords.object.raw
	expression = `[${this.key.expression}]: ${this.value.expression}`

	traverseAllows: TraverseAllows<object> = (data, ctx) =>
		Object.entries(data).every(
			(entry) =>
				!this.key.traverseAllows(entry[0], ctx) ||
				this.value.traverseAllows(entry[1], ctx)
		)

	traverseApply: TraverseApply<object> = (data, ctx) =>
		Object.entries(data).forEach((entry) => {
			if (this.key.traverseAllows(entry[0], ctx)) 
				this.value.traverseApply(entry[1], ctx)
			
		})

	compile(js: NodeCompiler): void {
		if (js.traversalKind === "Allows") 
			js.return(true)
		
	}
}

export const writeInvalidPropertyKeyMessage = <indexDef extends string>(
	indexDef: indexDef
): writeInvalidPropertyKeyMessage<indexDef> =>
	`Indexed key definition '${indexDef}' must be a string, number or symbol`

export type writeInvalidPropertyKeyMessage<indexDef extends string> =
	`Indexed key definition '${indexDef}' must be a string, number or symbol`
