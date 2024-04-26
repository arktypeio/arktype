import { domainDescriptions, domainOf } from "@arktype/util"
import { RawSchema, type RawSchemaDeclaration } from "../schema.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import { implementNode } from "../shared/implement.js"
import type { TraverseAllows, TraverseApply } from "../shared/traversal.js"

export interface AliasInner<alias extends string = string> extends BaseMeta {
	readonly alias: alias
}

export type AliasDef<alias extends string = string> = alias | AliasInner<alias>

export type AliasDeclaration = declareNode<{
	kind: "domain"
	def: AliasDef
	normalizedDef: AliasInner
	inner: AliasInner
}>

export class AliasNode extends RawSchema<AliasDeclaration> {
	readonly expression = this.alias

	private _resolution: RawSchema | undefined
	get resolution(): RawSchema {
		this._resolution ??= this.$.fullyResolveNode(this.alias)
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

export const referenceImplementation = implementNode<AliasDeclaration>({
	kind: "domain",
	hasAssociatedError: false,
	collapsibleKey: "alias",
	keys: {
		alias: {}
	},
	normalize: def => (typeof def === "string" ? { alias: def } : def),
	defaults: {
		description: node => domainDescriptions[node.domain],
		actual: data => (typeof data === "boolean" ? `${data}` : domainOf(data))
	},
	intersections: {
		domain: (l, r) => Disjoint.from("domain", l, r)
	}
})
