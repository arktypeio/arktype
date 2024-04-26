import { append } from "@arktype/util"
import { RawSchema, type RawSchemaDeclaration } from "../schema.js"
import type { RawSchemaScope } from "../scope.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import { implementNode } from "../shared/implement.js"
import { intersectNodes } from "../shared/intersections.js"
import type { TraverseAllows, TraverseApply } from "../shared/traversal.js"
import { defineRightwardIntersections } from "./utils.js"

export interface AliasInner<alias extends string = string> extends BaseMeta {
	readonly alias: alias
	readonly resolve?: () => RawSchema
}

export type AliasDef<alias extends string = string> =
	| `$${alias}`
	| AliasInner<alias>

export type AliasDeclaration = declareNode<{
	kind: "alias"
	def: AliasDef
	normalizedDef: AliasInner
	inner: AliasInner
}>

export class AliasNode extends RawSchema<AliasDeclaration> {
	readonly expression = this.alias

	private _resolution: RawSchema | undefined
	get resolution(): RawSchema {
		this._resolution ??= this.resolve?.() ?? this.$.resolveSchema(this.alias)
		return this._resolution
	}

	rawKeyOf(): RawSchema<RawSchemaDeclaration> {
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

export const normalizeAliasDef = (def: AliasDef): AliasInner =>
	typeof def === "string" ? { alias: def.slice(1) } : def

export const aliasImplementation = implementNode<AliasDeclaration>({
	kind: "alias",
	hasAssociatedError: false,
	collapsibleKey: "alias",
	keys: {
		alias: {
			serialize: def => `$${def}`
		},
		resolve: {}
	},
	normalize: normalizeAliasDef,
	defaults: {
		description: node => node.alias
	},
	intersections: {
		alias: (l, r, ctx) =>
			ctx.$.lazilyResolve(`${l.id}${ctx.pipe ? "|>" : "&"}${r.id}`, () =>
				neverIfDisjoint(intersectNodes(l.resolution, r.resolution, ctx), ctx.$)
			),
		...defineRightwardIntersections("alias", (l, r, ctx) =>
			ctx.$.lazilyResolve(`${l.id}${ctx.pipe ? "|>" : "&"}${r.id}`, () =>
				neverIfDisjoint(intersectNodes(l.resolution, r, ctx), ctx.$)
			)
		)
	}
})

const neverIfDisjoint = (
	result: RawSchema | Disjoint,
	$: RawSchemaScope
): RawSchema => (result instanceof Disjoint ? $.keywords.never.raw : result)
