import { append, cached, domainDescriptions } from "@ark/util"
import type { NodeCompiler } from "../shared/compile.js"
import type { BaseNormalizedSchema, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.js"
import { intersectNodes } from "../shared/intersections.js"
import { $ark } from "../shared/registry.js"
import type { TraverseAllows, TraverseApply } from "../shared/traversal.js"
import { BaseRoot } from "./root.js"
import { defineRightwardIntersections } from "./utils.js"

export namespace Alias {
	export type Schema<alias extends string = string> = `$${alias}` | Inner<alias>

	export interface NormalizedSchema<alias extends string = string>
		extends BaseNormalizedSchema {
		readonly alias: alias
		readonly resolve?: () => BaseRoot
	}

	export interface Inner<alias extends string = string> {
		readonly alias: alias
		readonly resolve?: () => BaseRoot
	}

	export interface Declaration
		extends declareNode<{
			kind: "alias"
			schema: Schema
			normalizedSchema: NormalizedSchema
			inner: Inner
		}> {}

	export type Node = AliasNode
}

export const normalizeAliasSchema = (schema: Alias.Schema): Alias.Inner =>
	typeof schema === "string" ? { alias: schema.slice(1) } : schema

const neverIfDisjoint = (result: BaseRoot | Disjoint): BaseRoot =>
	result instanceof Disjoint ? $ark.intrinsic.never.internal : result

const implementation: nodeImplementationOf<Alias.Declaration> =
	implementNode<Alias.Declaration>({
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
						neverIfDisjoint(intersectNodes(l.resolution, r.resolution, ctx)),
					`${l.alias}${ctx.pipe ? "|>" : "&"}${r.alias}`
				),
			...defineRightwardIntersections("alias", (l, r, ctx) =>
				ctx.$.lazilyResolve(
					() => neverIfDisjoint(intersectNodes(l.resolution, r, ctx)),
					`${l.alias}${ctx.pipe ? "|>" : "&"}${r.alias}`
				)
			)
		}
	})

export class AliasNode extends BaseRoot<Alias.Declaration> {
	readonly expression: string = this.alias
	readonly structure = undefined

	@cached
	get resolution(): BaseRoot {
		return this.resolve?.() ?? this.$.resolveRoot(this.alias)
	}

	get shortDescription(): string {
		return domainDescriptions.object
	}

	traverseAllows: TraverseAllows = (data, ctx) => {
		const seen = ctx.seen[this.id]
		if (seen?.includes(data)) return true
		ctx.seen[this.id] = append(seen, data)
		return this.resolution.traverseAllows(data, ctx)
	}

	traverseApply: TraverseApply = (data, ctx) => {
		const seen = ctx.seen[this.id]
		if (seen?.includes(data)) return
		ctx.seen[this.id] = append(seen, data)
		this.resolution.traverseApply(data, ctx)
	}

	compile(js: NodeCompiler): void {
		js.if(`ctx.seen.${this.id}?.includes(data)`, () => js.return(true))
		js.line(`ctx.seen.${this.id} ??= []`).line(`ctx.seen.${this.id}.push(data)`)
		js.return(js.invoke(this.resolution))
	}
}

export const Alias = {
	implementation,
	Node: AliasNode
}
