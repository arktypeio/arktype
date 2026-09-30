import {
	append,
	domainDescriptions,
	printable,
	throwInternalError,
	throwParseError
} from "@ark/util"
import {
	contextsReferencedById,
	nodesByRegisteredId,
	type NodeId
} from "../parse.ts"
import type { NodeCompiler } from "../shared/compile.ts"
import type { BaseNormalizedSchema, declareNode } from "../shared/declare.ts"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
import type { TraverseAllows, TraverseApply } from "../shared/traversal.ts"
import { hasArkKind } from "../shared/utils.ts"
import { BaseRoot } from "./root.ts"

export declare namespace Alias {
	export type Schema<alias extends string = string> =
		| `$${alias}`
		| NormalizedSchema<alias>

	export interface NormalizedSchema<alias extends string = string>
		extends BaseNormalizedSchema {
		readonly reference: alias
		readonly resolve?: () => BaseRoot
	}

	export interface Inner<alias extends string = string> {
		readonly reference: alias
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
	typeof schema === "string" ? { reference: schema } : schema

const implementation: nodeImplementationOf<Alias.Declaration> =
	implementNode<Alias.Declaration>({
		kind: "alias",
		collapsibleKey: "reference",
		keys: {
			reference: {
				parse: reference => {
					const referenced = nodesByRegisteredId[reference as NodeId]
					if (hasArkKind(referenced, "context"))
						contextsReferencedById.add(referenced)
					return reference
				},
				serialize: s => (s.startsWith("$") ? s : `$ark.${s}`)
			},
			resolve: {}
		},
		normalize: normalizeAliasSchema,
		defaults: {
			description: node => node.reference
		}
	})

export class AliasNode extends BaseRoot<Alias.Declaration> {
	readonly expression: string = this.reference
	readonly structure = undefined
	private _resolution: BaseRoot | undefined

	get resolution(): BaseRoot {
		if (this._resolution) return this._resolution
		const resolution = this._resolve()
		// kept once the scope is resolved, before which resolving also binds
		// references into it. a reference to an alias that is still being
		// parsed resolves to an alias, and a thunk can read such references,
		// so neither result is kept
		if (this.$.resolved && !this.resolve && !resolution.hasKind("alias"))
			this._resolution = resolution
		return resolution
	}

	protected _resolve(): BaseRoot {
		if (this.resolve) return this.resolve()
		if (this.reference[0] === "$")
			return this.$.resolveRoot(this.reference.slice(1))

		const id = this.reference as NodeId

		let resolution = nodesByRegisteredId[id]
		const seen: NodeId[] = []
		while (hasArkKind(resolution, "context")) {
			if (seen.includes(resolution.id)) {
				return throwParseError(
					writeShallowCycleErrorMessage(resolution.id, seen)
				)
			}

			seen.push(resolution.id)
			resolution = nodesByRegisteredId[resolution.id]
		}
		if (!hasArkKind(resolution, "root")) {
			return throwInternalError(`Unexpected resolution for reference ${this.reference}
Seen: [${seen.join("->")}] 
Resolution: ${printable(resolution)}`)
		}
		return resolution
	}

	get resolutionId(): NodeId {
		if (this.reference.includes("&") || this.reference.includes("=>"))
			return this.resolution.id
		if (this.reference[0] !== "$") return this.reference as NodeId
		const alias = this.reference.slice(1)
		const resolution = this.$.resolutions[alias]
		if (typeof resolution === "string") return resolution
		if (hasArkKind(resolution, "root")) return resolution.id

		return throwInternalError(
			`Unexpected resolution for reference ${this.reference}: ${printable(resolution)}`
		)
	}

	get defaultShortDescription(): string {
		return domainDescriptions.object
	}

	traverseAllows: TraverseAllows = (data, ctx) => {
		const seen = ctx.seen[this.reference]
		if (seen?.includes(data)) return true
		ctx.seen[this.reference] = append(seen, data)
		return this.resolution.traverseAllows(data, ctx)
	}

	traverseApply: TraverseApply = (data, ctx) => {
		const seen = ctx.seen[this.reference]
		if (seen?.includes(data)) return
		ctx.seen[this.reference] = append(seen, data)
		this.resolution.traverseApply(data, ctx)
	}

	compile(js: NodeCompiler): void {
		const id = this.resolutionId
		const seen = `ctx.seen.${js.referenceToId(id)}`
		js.if(`${seen} && ${seen}.includes(data)`, () => js.return(true))
		js.if(`!${seen}`, () => js.line(`${seen} = []`))
		js.line(`${seen}.push(data)`)
		js.return(js.invoke(id))
	}
}

export const writeShallowCycleErrorMessage = (
	name: string,
	seen: string[]
): string =>
	`Alias '${name}' has a shallow resolution cycle: ${[...seen, name].join("->")}`

export const Alias = {
	implementation,
	Node: AliasNode
}
