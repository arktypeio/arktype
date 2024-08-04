import {
	$ark,
	append,
	printable,
	stringAndSymbolicEntriesOf,
	throwParseError
} from "@ark/util"
import { BaseConstraint } from "../constraint.js"
import type { RootSchema, nodeOfKind } from "../kinds.js"
import {
	flatRef,
	type BaseNode,
	type DeepNodeTransformContext,
	type DeepNodeTransformation,
	type FlatRef
} from "../node.js"
import type { BaseRoot } from "../roots/root.js"
import type { BaseInner, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	implementNode,
	type RootKind,
	type nodeImplementationOf
} from "../shared/implement.js"
import { intersectNodes } from "../shared/intersections.js"
import type { TraverseAllows, TraverseApply } from "../shared/traversal.js"

export namespace Index {
	export type KeyKind = Exclude<RootKind, "unit">

	export type KeyNode = nodeOfKind<KeyKind>

	export interface Schema extends BaseInner {
		readonly signature: RootSchema<KeyKind>
		readonly value: RootSchema
	}

	export interface Inner extends BaseInner {
		readonly signature: KeyNode
		readonly value: BaseRoot
	}

	export interface Declaration
		extends declareNode<{
			kind: "index"
			schema: Schema
			normalizedSchema: Schema
			inner: Inner
			prerequisite: object
			intersectionIsOpen: true
			childKind: RootKind
		}> {}

	export type Node = IndexNode
}

const implementation: nodeImplementationOf<Index.Declaration> =
	implementNode<Index.Declaration>({
		kind: "index",
		hasAssociatedError: false,
		intersectionIsOpen: true,
		keys: {
			signature: {
				child: true,
				parse: (schema, ctx) => {
					const key = ctx.$.rootNode(schema)
					if (!key.extends($ark.intrinsic.key)) {
						return throwParseError(
							writeInvalidPropertyKeyMessage(key.expression)
						)
					}
					const enumerableBranches = key.branches.filter(b => b.hasKind("unit"))
					if (enumerableBranches.length) {
						return throwParseError(
							writeEnumerableIndexBranches(
								enumerableBranches.map(b => printable(b.unit))
							)
						)
					}
					return key as Index.KeyNode
				}
			},
			value: {
				child: true,
				parse: (schema, ctx) => ctx.$.rootNode(schema)
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

export class IndexNode extends BaseConstraint<Index.Declaration> {
	impliedBasis: BaseRoot = $ark.intrinsic.object.internal
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
	): BaseNode | null {
		ctx.path.push(this.signature)
		const result = super._transform(mapper, ctx)
		ctx.path.pop()
		return result
	}

	override get flatRefs(): FlatRef[] {
		return append(
			this.value.flatRefs.map(ref =>
				flatRef([this.signature, ...ref.path], ref.node)
			),
			flatRef([this.signature], this.value)
		)
	}

	compile(): void {
		// this is currently handled by StructureNode
	}
}

export const Index = {
	implementation,
	Node: IndexNode
}

export const writeEnumerableIndexBranches = (keys: string[]): string =>
	`Index keys ${keys.join(", ")} should be specified as named props.`

export const writeInvalidPropertyKeyMessage = <indexSchema extends string>(
	indexSchema: indexSchema
): writeInvalidPropertyKeyMessage<indexSchema> =>
	`Indexed key definition '${indexSchema}' must be a string or symbol`

export type writeInvalidPropertyKeyMessage<indexSchema extends string> =
	`Indexed key definition '${indexSchema}' must be a string or symbol`
