import {
	domainDescriptions,
	printable,
	throwInternalError,
	throwParseError
} from "@ark/util"
import { nodesByRegisteredId, type NodeId } from "../parse.ts"
import type { NodeCompiler } from "../shared/compile.ts"
import type { BaseNormalizedSchema, declareNode } from "../shared/declare.ts"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
import {
	aliasVisits,
	maxAliasDepth,
	maxAliasVisits,
	type TraverseAllows,
	type TraverseApply,
	type TraverseTransform
} from "../shared/traversal.ts"
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
						referenced.isReferencedById = true
					return reference
				},
				serialize: s => (s.startsWith("$") ? s : `$ark.${s}`)
			},
			resolve: {}
		},
		normalize: normalizeAliasSchema,
		defaults: {
			description: node => node.expression
		}
	})

export class AliasNode extends BaseRoot<Alias.Declaration> {
	// a scope's alias is displayed by name, though it references a context id
	readonly expression: string = expressionOf(this.reference)
	readonly structure = undefined
	private _resolution: BaseRoot | undefined

	get resolution(): BaseRoot {
		if (this._resolution) return this._resolution
		const resolution = this._resolve()
		// not cached before the scope resolves, since resolving binds references,
		// nor for a thunk or alias result, which may reflect an alias mid-parse
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
		// a scope's definition resolves by name in the scope that defined it
		if (hasArkKind(resolution, "context") && resolution.alias)
			return resolution.$.resolveRoot(resolution.alias)
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
		if (typeof ctx === "number") {
			return ctx < maxAliasDepth && ++aliasVisits.count <= maxAliasVisits ?
					this.resolution.traverseAllows(data, (ctx + 1) as never)
				:	aliasVisits.exceed()
		}
		return (
			ctx.enterResolution(this.resolution.id, data) ??
			ctx.exitResolution(this.resolution.traverseAllows(data, ctx))
		)
	}

	traverseApply: TraverseApply = (data, ctx) => {
		if (ctx.enterResolution(this.resolution.id, data) !== undefined) return
		this.resolution.traverseApply(data, ctx)
		ctx.exitResolution()
	}

	traverseTransform: TraverseTransform = (data, ctx) =>
		ctx.transformResolution(
			this.resolution.id,
			data,
			this.resolution.traverseTransform
		)

	compile(js: NodeCompiler): void {
		const resolution = this.resolution
		// invoked first, so the unit declares the resolution's traversals
		const traverse = js.invoke(resolution)
		const id = js.referenceToId(resolution.id)
		if (js.traversalKind === "Transform") {
			js.return(
				`ctx.transformResolution("${id}", data, ${js.referenceToId(resolution.id, { kind: "Transform" })})`
			)
			return
		}
		const enter = `ctx.enterResolution("${id}", data)`
		if (js.traversalKind === "Apply") {
			js.if(`${enter} === undefined`, () =>
				js.line(traverse).line("ctx.exitResolution()")
			)
			return
		}
		const allows = js.referenceToId(resolution.id, { kind: "Allows" })
		const visits = js.ref(aliasVisits)
		js.if(`typeof ctx === "number"`, () =>
			js.return(
				`ctx < ${maxAliasDepth} && ++${visits}.count <= ${maxAliasVisits} ? ${allows}(data, ctx + 1) : ${visits}.exceed()`
			)
		)
		js.const("reached", enter)
		js.if("reached !== undefined", () => js.return("reached"))
		js.return(`ctx.exitResolution(${traverse})`)
	}
}

const expressionOf = (reference: string): string => {
	const referenced = nodesByRegisteredId[reference as NodeId]
	return hasArkKind(referenced, "context") && referenced.alias ?
			`$${referenced.alias}`
		:	reference
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
