import {
	printable,
	stringAndSymbolicEntriesOf,
	throwParseError
} from "@ark/util"
import { BaseConstraint } from "../constraint.ts"
import type { nodeOfKind } from "../kinds.ts"
import {
	flatRefsAt,
	type BaseNode,
	type DeepNodeTransformContext,
	type DeepNodeTransformation
} from "../node.ts"
import type { BaseRoot } from "../roots/root.ts"
import type { declareNode } from "../shared/declare.ts"
import {
	implementNode,
	type RootKind,
	type nodeImplementationOf
} from "../shared/implement.ts"
import { $ark } from "../shared/registry.ts"
import {
	allowsInBranch,
	applyValue,
	travKey,
	type AliasDepth,
	type InternalTraversal,
	type TraverseAllows
} from "../shared/traversal.ts"
import { composing, elided } from "../shared/utils.ts"

export declare namespace Index {
	export type KeyKind = Exclude<RootKind, "unit">

	export type KeyNode = nodeOfKind<KeyKind>

	export interface Inner {
		readonly signature: KeyNode
		readonly value: BaseRoot
	}

	export interface Declaration
		extends declareNode<{
			kind: "index"
			inner: Inner
			prerequisite: object
			stacks: true
			childKind: RootKind
		}> {}

	export type Node = IndexNode
}

const implementation: nodeImplementationOf<Index.Declaration> =
	implementNode<Index.Declaration>({
		kind: "index",
		ownErr: false,
		stacks: true,
		keys: {
			signature: {
				child: true
			},
			value: {
				child: true,
				structural: true
			}
		},
		defaults: {
			description: node =>
				`[${node.signature.expression}]: ${elided(node.value.description)}`
		}
	})

export class IndexNode extends BaseConstraint<Index.Declaration> {
	implied: BaseRoot = $ark.intrinsic.object.internal
	get expression(): string {
		return (this.cache.expression ??= composing(
			() => `[${this.signature.expression}]: ${elided(this.value.expression)}`
		))
	}

	constructor(...args: ConstructorParameters<typeof BaseConstraint>) {
		super(...args)
		const key = this.signature
		// checked by equality first so intrinsic json parses without a set engine
		if (
			!key.equals($ark.intrinsic.string) &&
			!key.equals($ark.intrinsic.symbol) &&
			!key.equals($ark.intrinsic.key) &&
			!key.extends($ark.intrinsic.key)
		)
			throwParseError(writeInvalidPropertyKeyMessage(key.expression))
		const enumerableBranches = key.branches.filter(b => b.is("unit"))
		if (enumerableBranches.length) {
			throwParseError(
				writeEnumerableIndexBranches(
					enumerableBranches.map(b => printable(b.unit))
				)
			)
		}
	}

	// its structure picks the keys it transforms by the signature's Allows
	protected override get selectsByCtx(): boolean {
		return this.signature.ctxPred || super.selectsByCtx
	}

	protected override initFlatRefs(): void {
		this.cache.flatRefs = flatRefsAt(this.signature, this.value)
		this.cache.flatMorphs = []
	}

	// a key the signature rejects is undeclared, so its errors are dropped
	allowsKey: TraverseAllows<PropertyKey> = (k, ctx) =>
		this.signature.checksCtx ?
			allowsInBranch(ctx as InternalTraversal, this.signature, k)
		:	this.signature.traverseAllows(k, ctx)

	traverseAllows(data: object, ctx: InternalTraversal | AliasDepth): boolean {
		return stringAndSymbolicEntriesOf(data).every(entry => {
			if (this.allowsKey(entry[0], ctx)) {
				return travKey(
					entry[0],
					() => this.value.traverseAllows(entry[1], ctx),
					ctx
				)
			}
			return true
		})
	}

	traverseApply(data: object, ctx: InternalTraversal): void {
		for (const entry of stringAndSymbolicEntriesOf(data)) {
			if (this.allowsKey(entry[0], ctx))
				travKey(entry[0], () => applyValue(this.value, entry[1], ctx), ctx)
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
	impl: implementation,
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
