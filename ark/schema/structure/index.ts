import {
	append,
	printable,
	stringAndSymbolicEntriesOf,
	throwParseError
} from "@ark/util"
import { BaseConstraint } from "../constraint.ts"
import type { RootSchema, nodeOfKind } from "../kinds.ts"
import {
	flatRef,
	type BaseNode,
	type DeepNodeTransformContext,
	type DeepNodeTransformation
} from "../node.ts"
import type { BaseRoot } from "../roots/root.ts"
import type { BaseNormalizedSchema, declareNode } from "../shared/declare.ts"
import {
	implementNode,
	type RootKind,
	type nodeImplementationOf
} from "../shared/implement.ts"
import { $ark } from "../shared/registry.ts"
import {
	traverseKey,
	type TraverseAllows,
	type TraverseApply
} from "../shared/traversal.ts"

export declare namespace Index {
	export type KeyKind = Exclude<RootKind, "unit">

	export type KeyNode = nodeOfKind<KeyKind>

	export interface Schema extends BaseNormalizedSchema {
		readonly signature: RootSchema<KeyKind>
		readonly value: RootSchema
	}

	export interface Inner {
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
					const key = ctx.$.parseSchema(schema)
					// string, symbol and their union are accepted without consulting
					// the set engine so that the intrinsic json scope can be
					// parsed with none installed
					if (
						!key.equals($ark.intrinsic.string) &&
						!key.equals($ark.intrinsic.symbol) &&
						!key.equals($ark.intrinsic.key) &&
						!key.extends($ark.intrinsic.key)
					) {
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
				parse: (schema, ctx) => ctx.$.parseSchema(schema)
			}
		},
		normalize: schema => schema,
		defaults: {
			description: node =>
				`[${node.signature.expression}]: ${node.value.description}`
		}
	})

export class IndexNode extends BaseConstraint<Index.Declaration> {
	impliedBasis: BaseRoot = $ark.intrinsic.object.internal
	expression = `[${this.signature.expression}]: ${this.value.expression}`

	protected override initializeFlatRefs(): void {
		this._flatRefs = append(
			this.value.flatRefs.map(ref =>
				flatRef([this.signature, ...ref.path], ref.node)
			),
			flatRef([this.signature], this.value)
		)
		this._flatMorphs = []
	}

	traverseAllows: TraverseAllows<object> = (data, ctx) =>
		stringAndSymbolicEntriesOf(data).every(entry => {
			if (this.signature.traverseAllows(entry[0], ctx)) {
				return traverseKey(
					entry[0],
					() => this.value.traverseAllows(entry[1], ctx),
					ctx
				)
			}
			return true
		})

	traverseApply: TraverseApply<object> = (data, ctx) => {
		for (const entry of stringAndSymbolicEntriesOf(data)) {
			if (this.signature.traverseAllows(entry[0], ctx)) {
				traverseKey(
					entry[0],
					() => this.value.traverseApply(entry[1], ctx),
					ctx
				)
			}
		}
	}

	protected override _transform(
		mapper: DeepNodeTransformation,
		ctx: DeepNodeTransformContext
	): BaseNode | null {
		ctx.path.push(this.signature)
		const result = super._transform(mapper, ctx)
		ctx.path.pop()
		return result
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
