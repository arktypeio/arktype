import { RawSchema, type RawSchemaDeclaration } from "../schema.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { implementNode } from "../shared/implement.js"
import { intersectNodes } from "../shared/intersections.js"
import type { TraverseAllows, TraverseApply } from "../shared/traversal.js"
import { defineRightwardIntersections } from "./utils.js"

export interface AliasInner<alias extends string = string> extends BaseMeta {
	readonly alias: alias
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
		this._resolution ??= this.$.resolveNode(this.alias)
		return this._resolution
	}

	rawKeyOf(): RawSchema<RawSchemaDeclaration> {
		return this.resolution.keyof()
	}

	traverseAllows: TraverseAllows = (data, ctx) =>
		this.resolution.traverseAllows(data, ctx)

	traverseApply: TraverseApply = (data, ctx) =>
		this.resolution.traverseApply(data, ctx)

	compile(js: NodeCompiler): void {
		js
	}
}

export const aliasImplementation = implementNode<AliasDeclaration>({
	kind: "alias",
	hasAssociatedError: false,
	collapsibleKey: "alias",
	keys: {
		alias: {
			serialize: def => `$${def}`
		}
	},
	normalize: def => (typeof def === "string" ? { alias: def.slice(1) } : def),
	defaults: {
		description: node => node.alias
	},
	intersections: {
		alias: (l, r, ctx) => intersectNodes(l.resolution, r.resolution, ctx),
		...defineRightwardIntersections("alias", (l, r, ctx) =>
			intersectNodes(l.resolution, r, ctx)
		)
	}
})
