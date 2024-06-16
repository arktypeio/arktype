import {
	printable,
	stringAndSymbolicEntriesOf,
	throwParseError
} from "@arktype/util"
import { BaseConstraint } from "../constraint.js"
import type { Node, RootSchema } from "../kinds.js"
import {
	contextualReference,
	type DeepNodeTransformContext,
	type DeepNodeTransformation
} from "../node.js"
import type { BaseRoot } from "../roots/root.js"
import type { UnitNode } from "../roots/unit.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	implementNode,
	type RootKind,
	type nodeImplementationOf
} from "../shared/implement.js"
import { intersectNodes } from "../shared/intersections.js"
import type { TraverseAllows, TraverseApply } from "../shared/traversal.js"

export type IndexKeyKind = Exclude<RootKind, "unit">

export type IndexKeyNode = Node<IndexKeyKind>

export interface IndexSchema extends BaseMeta {
	readonly signature: RootSchema<IndexKeyKind>
	readonly value: RootSchema
}

export interface IndexInner extends BaseMeta {
	readonly signature: IndexKeyNode
	readonly value: BaseRoot
}

export interface IndexDeclaration
	extends declareNode<{
		kind: "index"
		schema: IndexSchema
		normalizedSchema: IndexSchema
		inner: IndexInner
		prerequisite: object
		intersectionIsOpen: true
		childKind: RootKind
	}> {}

export const indexImplementation: nodeImplementationOf<IndexDeclaration> =
	implementNode<IndexDeclaration>({
		kind: "index",
		hasAssociatedError: false,
		intersectionIsOpen: true,
		keys: {
			signature: {
				child: true,
				parse: (schema, ctx) => {
					const key = ctx.$.schema(schema)
					if (!key.extends($ark.intrinsic.propertyKey)) {
						return throwParseError(
							writeInvalidPropertyKeyMessage(key.expression)
						)
					}
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
				parse: (schema, ctx) => ctx.$.schema(schema)
			}
		},
		normalize: schema => schema,
		defaults: {
			description: node =>
				`[${node.signature.expression}]: ${node.value.description}`
		},
		intersections: {
			index: (l, r, ctx) => {
				if (l.signature.equals(r.signature)) {
					const valueIntersection = intersectNodes(l.value, r.value, ctx)
					const value =
						valueIntersection instanceof Disjoint ?
							$ark.intrinsic.never.internal
						:	valueIntersection
					return ctx.$.node("index", { signature: l.signature, value })
				}

				// if r constrains all of l's keys to a subtype of l's value, r is a subtype of l
				if (l.signature.extends(r.signature) && l.value.subsumes(r.value))
					return r
				// if l constrains all of r's keys to a subtype of r's value, l is a subtype of r
				if (r.signature.extends(l.signature) && r.value.subsumes(l.value))
					return l

				// other relationships between index signatures can't be generally reduced
				return null
			}
		}
	})

export class IndexNode extends BaseConstraint<IndexDeclaration> {
	impliedBasis: BaseRoot = $ark.intrinsic.object
	expression = `[${this.signature.expression}]: ${this.value.expression}`

	traverseAllows: TraverseAllows<object> = (data, ctx) =>
		stringAndSymbolicEntriesOf(data).every(entry => {
			if (this.signature.traverseAllows(entry[0], ctx)) {
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
			if (this.signature.traverseAllows(entry[0], ctx)) {
				ctx.path.push(entry[0])
				this.value.traverseApply(entry[1], ctx)
				ctx.path.pop()
			}
		})

	protected override _transform(
		mapper: DeepNodeTransformation,
		ctx: DeepNodeTransformContext
	) {
		ctx.path.push(this.signature)
		const result = super._transform(mapper, ctx)
		ctx.path.pop()
		return result
	}

	override get contextualReferences() {
		return super.contextualReferences.map(ref =>
			contextualReference([this.signature, ...ref.path], ref.node)
		)
	}

	compile(): void {
		// this is currently handled by StructureNode
	}
}

export const writeEnumerableIndexBranches = (keys: string[]): string =>
	`Index keys ${keys.join(", ")} should be specified as named props.`

export const writeInvalidPropertyKeyMessage = <indexSchema extends string>(
	indexSchema: indexSchema
): writeInvalidPropertyKeyMessage<indexSchema> =>
	`Indexed key definition '${indexSchema}' must be a string, number or symbol`

export type writeInvalidPropertyKeyMessage<indexSchema extends string> =
	`Indexed key definition '${indexSchema}' must be a string, number or symbol`
