import {
	append,
	domainDescriptions,
	throwParseError,
	type PartialRecord
} from "@ark/util"
import { nodesById, type NodeId } from "../parse.ts"
import type { NodeCompiler } from "../shared/compile.ts"
import type { BaseNormalizedSchema, declareNode } from "../shared/declare.ts"
import { Disjoint } from "../shared/disjoint.ts"
import {
	implementNode,
	rootKinds,
	type nodeImplementationOf
} from "../shared/implement.ts"
import { intersectNodes } from "../shared/intersections.ts"
import {
	writeCyclicJsonSchemaMessage,
	type JsonSchema
} from "../shared/jsonSchema.ts"
import { $ark } from "../shared/registry.ts"
import type { TraverseAllows, TraverseApply } from "../shared/traversal.ts"
import { BaseRoot } from "./root.ts"
import { defineRightwardIntersections } from "./utils.ts"

export declare namespace Alias {
	export type Schema<alias extends string = string> = `$${alias}` | Inner<alias>

	export interface NormalizedSchema<alias extends string = string>
		extends BaseNormalizedSchema {
		readonly alias: alias
		readonly resolve?: NodeId | (() => BaseRoot)
	}

	export interface Inner<alias extends string = string> {
		readonly alias: alias
		readonly resolve?: NodeId | (() => BaseRoot)
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

	get resolution(): BaseRoot {
		let result: BaseRoot

		if (typeof this.resolve === "string") {
			let globalResolution = nodesById[this.resolve]
			const seen: PartialRecord<NodeId> = {}
			while (typeof globalResolution === "string") {
				if (seen[globalResolution]) {
					return throwParseError(
						`Unable to resolve cyclic id ${globalResolution}`
					)
				}
				seen[globalResolution] = true
				globalResolution = nodesById[globalResolution]
			}
			result = globalResolution.assertHasKindIn(...rootKinds)
		} else result = this.resolve?.() ?? this.$.resolveRoot(this.alias)

		return this.cacheGetter("resolution", result)
	}

	get shortDescription(): string {
		return domainDescriptions.object
	}

	protected innerToJsonSchema(): JsonSchema {
		return throwParseError(writeCyclicJsonSchemaMessage(this.expression))
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

		js.return(
			js.invoke(
				// if the resolver is a reference to a global id, reuse the existing
				// reference rather than eagerly compiling the resolution,
				// which would infinitely recurse
				typeof this.resolve === "string" ? this.resolve : this.resolution
			)
		)
	}
}

export const Alias = {
	implementation,
	Node: AliasNode
}
