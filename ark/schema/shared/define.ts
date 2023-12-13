import type {
	ErrorMessage,
	JsonData,
	listable,
	requireKeys,
	satisfy
} from "@arktype/util"
import type { BaseNode, Node } from "../base.js"
import type { SchemaParseContext } from "../parse.js"
import type { ScopeNode } from "../scope.js"
import type { BaseAttributes, BaseNodeDeclaration } from "./declare.js"
import { compileSerializedValue } from "./registry.js"

export const basisKinds = ["unit", "proto", "domain"] as const

export type BasisKind = (typeof basisKinds)[number]

export const boundKinds = [
	"min",
	"max",
	"minLength",
	"maxLength",
	"after",
	"before"
] as const

export type BoundKind = (typeof boundKinds)[number]

export const propKinds = ["required", "optional", "index", "sequence"] as const

export type PropKind = (typeof propKinds)[number]

export const primitiveRefinementKinds = [
	"pattern",
	"predicate",
	"divisor",
	...boundKinds
] as const

export type PrimitiveRefinementKind = (typeof primitiveRefinementKinds)[number]

export const refinementKinds = [
	...primitiveRefinementKinds,
	...propKinds
] as const

export type RefinementKind = (typeof refinementKinds)[number]

export const setKinds = ["union", "morph", "intersection"] as const

export type SetKind = (typeof setKinds)[number]

export const typeKinds = [...setKinds, ...basisKinds] as const

export type TypeKind = (typeof typeKinds)[number]

export const constraintKinds = [...basisKinds, ...refinementKinds] as const

export type ConstraintKind = (typeof constraintKinds)[number]

export const nodeKinds = [...setKinds, ...constraintKinds] as const

export type NodeKind = (typeof nodeKinds)[number]

export const primitiveKinds = [
	...basisKinds,
	...primitiveRefinementKinds
] as const

export type PrimitiveKind = (typeof primitiveKinds)[number]

export type OrderedNodeKinds = typeof nodeKinds

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type assertNoExtraKinds = satisfy<NodeKind, OrderedNodeKinds[number]>

export type KeyDefinitions<d extends BaseNodeDeclaration> = {
	[k in undefinedKey<d>]: NodeKeyImplementation<d, k>
}

type undefinedKey<d extends BaseNodeDeclaration> = Exclude<
	keyof d["normalizedSchema"],
	keyof BaseAttributes
>

export const defaultValueSerializer = (v: unknown) => {
	if (
		typeof v === "string" ||
		typeof v === "boolean" ||
		typeof v === "number" ||
		v === null
	) {
		return v
	}
	return compileSerializedValue(v)
}

export type NodeKeyImplementation<
	d extends BaseNodeDeclaration,
	k extends keyof d["normalizedSchema"],
	instantiated = k extends keyof d["inner"]
		? d["inner"][k]
		: k extends keyof d["meta"]
		  ? d["meta"][k]
		  : never
> = requireKeys<
	{
		preserveUndefined?: true
		meta?: true
		child?: true
		serialize?: (
			schema: instantiated extends listable<BaseNode> | undefined
				? ErrorMessage<`Keys with node children cannot specify a custom serializer`>
				: instantiated
		) => JsonData
		parse?: (
			schema: Exclude<d["normalizedSchema"][k], undefined>,
			ctx: SchemaParseContext
		) => instantiated
	},
	// require parse if we can't guarantee the schema value will be valid on inner
	| (d["normalizedSchema"][k] extends instantiated ? never : "parse")
	// require keys containing children specify it
	| ([instantiated] extends [listable<BaseNode> | undefined] ? "child" : never)
	// require meta keys are specified
	| (k extends keyof d["meta"] ? "meta" : never)
>

export type NodeParserImplementation<d extends BaseNodeDeclaration> = {
	keys: KeyDefinitions<d>
	collapseKey?: keyof d["inner"] & string
	addContext?: (ctx: SchemaParseContext) => void
	normalize: (schema: d["schema"]) => d["normalizedSchema"]
	reduce?: (
		inner: d["inner"],
		meta: d["meta"],
		scope: ScopeNode
	) => Node | undefined
}

export type UnknownNodeParser = NodeParserImplementation<BaseNodeDeclaration>
