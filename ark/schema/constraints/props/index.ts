import {
	printable,
	stringAndSymbolicEntriesOf,
	throwParseError
} from "@arktype/util"
import type { Node, SchemaDef } from "../../node.js"
import type { RawSchema } from "../../schema.js"
import type { UnitNode } from "../../schemas/unit.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import { implementNode, type SchemaKind } from "../../shared/implement.js"
import { intersectNodes } from "../../shared/intersections.js"
import type { TraverseAllows, TraverseApply } from "../../shared/traversal.js"
import { RawConstraint } from "../constraint.js"

export type IndexKeyKind = Exclude<SchemaKind, "unit">

export type IndexKeyNode = Node<IndexKeyKind>

export interface IndexDef extends BaseMeta {
	readonly key: SchemaDef<IndexKeyKind>
	readonly value: SchemaDef
}

export interface IndexInner extends BaseMeta {
	readonly key: IndexKeyNode
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
				// TODO: explicit manual annotation once we can upgrade to 5.5
				const enumerableBranches = key.branches.filter((b): b is UnitNode =>
					b.hasKind("unit")
				)
				if (enumerableBranches.length) {
					return throwParseError(
						writeEnumerableIndexBranches(
							enumerableBranches.map(b => printable(b.unit))
						)
					)
				}
				return key as IndexKeyNode
			}
		},
		value: {
			child: true,
			parse: (def, ctx) => ctx.$.schema(def)
		}
	},
	normalize: def => def,
	defaults: {
		description: node => `[${node.key.expression}]: ${node.value.description}`
	},
	intersections: {
		index: (l, r, ctx) => {
			if (l.key.equals(r.key)) {
				const valueIntersection = intersectNodes(l.value, r.value, ctx)
				const value =
					valueIntersection instanceof Disjoint ?
						ctx.$.keywords.never.raw
					:	valueIntersection
				return ctx.$.node("index", { key: l.key, value })
			}

			// if r constrains all of l's keys to a subtype of l's value, r is a subtype of l
			if (l.key.extends(r.key) && l.value.subsumes(r.value)) return r
			// if l constrains all of r's keys to a subtype of r's value, l is a subtype of r
			if (r.key.extends(l.key) && r.value.subsumes(l.value)) return l

			// other relationships between index signatures can't be generally reduced
			return null
		}
	}
})

export class IndexNode extends RawConstraint<IndexDeclaration> {
	impliedBasis = this.$.keywords.object.raw
	expression = `[${this.key.expression}]: ${this.value.expression}`

	traverseAllows: TraverseAllows<object> = (data, ctx) =>
		stringAndSymbolicEntriesOf(data).every(entry => {
			if (this.key.traverseAllows(entry[0], ctx)) {
				// ctx will be undefined if this node isn't context-dependent
				ctx?.path.push(entry[0])
				const allowed = this.value.traverseAllows(entry[1], ctx)
				ctx?.path.pop()
				return allowed
			}
			return true
		})

	traverseApply: TraverseApply<object> = (data, ctx) =>
		stringAndSymbolicEntriesOf(data).forEach(entry => {
			if (this.key.traverseAllows(entry[0], ctx)) {
				ctx.path.push(entry[0])
				this.value.traverseApply(entry[1], ctx)
				ctx.path.pop()
			}
		})

	compile(): void {
		// this is currently handled by the props group
	}
}

export const writeEnumerableIndexBranches = (keys: string[]): string =>
	`Index keys ${keys.join(", ")} should be specified as named props.`

export const writeInvalidPropertyKeyMessage = <indexDef extends string>(
	indexDef: indexDef
): writeInvalidPropertyKeyMessage<indexDef> =>
	`Indexed key definition '${indexDef}' must be a string, number or symbol`

export type writeInvalidPropertyKeyMessage<indexDef extends string> =
	`Indexed key definition '${indexDef}' must be a string, number or symbol`
