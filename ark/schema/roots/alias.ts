import { append, cached } from "@arktype/util"
import type { RawRootScope } from "../scope.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.js"
import { intersectNodes } from "../shared/intersections.js"
import type { TraverseAllows, TraverseApply } from "../shared/traversal.js"
import { BaseRoot, type RawRootDeclaration } from "./root.js"
import { defineRightwardIntersections } from "./utils.js"

export interface AliasInner<alias extends string = string> extends BaseMeta {
	readonly alias: alias
	readonly resolve?: () => BaseRoot
}

export type AliasSchema<alias extends string = string> =
	| `$${alias}`
	| AliasInner<alias>

export interface AliasDeclaration
	extends declareNode<{
		kind: "alias"
		schema: AliasSchema
		normalizedSchema: AliasInner
		inner: AliasInner
	}> {}

export class AliasNode extends BaseRoot<AliasDeclaration> {
	readonly expression: string = this.alias

	@cached
	get resolution(): BaseRoot {
		return this.resolve?.() ?? this.$.resolveRoot(this.alias)
	}

	rawKeyOf(): BaseRoot<RawRootDeclaration> {
		return this.resolution.keyof()
	}

	traverseAllows: TraverseAllows = (data, ctx) => {
		const seen = ctx.seen[this.id]
		if (seen?.includes(data as object)) return true
		ctx.seen[this.id] = append(seen, data)
		return this.resolution.traverseAllows(data, ctx)
	}

	traverseApply: TraverseApply = (data, ctx) => {
		const seen = ctx.seen[this.id]
		if (seen?.includes(data as object)) return
		ctx.seen[this.id] = append(seen, data)
		this.resolution.traverseApply(data, ctx)
	}

	compile(js: NodeCompiler): void {
		js.if(`ctx.seen.${this.id}?.includes(data)`, () => js.return(true))
		js.line(`ctx.seen.${this.id} ??= []`).line(`ctx.seen.${this.id}.push(data)`)
		js.return(js.invoke(this.resolution))
	}
}

export const normalizeAliasSchema = (schema: AliasSchema): AliasInner =>
	typeof schema === "string" ? { alias: schema.slice(1) } : schema

export const aliasImplementation: nodeImplementationOf<AliasDeclaration> =
	implementNode<AliasDeclaration>({
		kind: "alias",
		hasAssociatedError: false,
		collapsibleKey: "alias",
		keys: {
			alias: {
				serialize: schema => `$${schema}`
			},
			resolve: {}
		},
		normalize: normalizeAliasSchema,
		defaults: {
			description: node => node.alias
		},
		intersections: {
			alias: (l, r, ctx) =>
				ctx.$.lazilyResolve(
					() =>
						neverIfDisjoint(
							intersectNodes(l.resolution, r.resolution, ctx),
							ctx.$
						),
					`${l.alias}${ctx.pipe ? "|>" : "&"}${r.alias}`
				),
			...defineRightwardIntersections("alias", (l, r, ctx) =>
				ctx.$.lazilyResolve(
					() => neverIfDisjoint(intersectNodes(l.resolution, r, ctx), ctx.$),
					`${l.alias}${ctx.pipe ? "|>" : "&"}${r.alias}`
				)
			)
		}
	})

const neverIfDisjoint = (
	result: BaseRoot | Disjoint,
	$: RawRootScope
): BaseRoot => (result instanceof Disjoint ? $.keywords.never.raw : result)
