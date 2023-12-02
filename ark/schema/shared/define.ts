import type {
	ErrorMessage,
	JsonData,
	PartialRecord,
	evaluate,
	listable,
	optionalizeKeys,
	requireKeys,
	requiredKeyOf,
	satisfy
} from "@arktype/util"
import type { BaseNode, Node } from "../base.js"
import type { SchemaParseContext } from "../parse.js"
import type { ScopeNode } from "../scope.js"
import { compileSerializedValue, type TraversalMethods } from "./compilation.js"
import type { BaseAttributes, BaseNodeDeclaration } from "./declare.js"
import type { reducibleKindOf } from "./nodes.js"

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

export const closedRefinementKinds = ["divisor", ...boundKinds] as const

export type ClosedRefinementKind = (typeof closedRefinementKinds)[number]

export const openRefinementKinds = [
	"pattern",
	"predicate",
	"required",
	"optional"
] as const

export type OpenRefinementKind = (typeof openRefinementKinds)[number]

export const refinementKinds = [
	...closedRefinementKinds,
	...openRefinementKinds
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

export type OrderedNodeKinds = typeof nodeKinds

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type assertNoExtraKinds = satisfy<NodeKind, OrderedNodeKinds[number]>

export type KeyDefinitions<d extends BaseNodeDeclaration> = {
	[k in keyof d["normalizedSchema"]]: NodeKeyImplementation<d, k>
}

export type PrimitiveConstraintAttachments = {
	readonly condition: string
	readonly negatedCondition: string
}

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

export type normalizeInput<input, inner extends BaseAttributes> = Extract<
	input,
	PartialRecord<requiredKeyOf<inner>>
>

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
	kind: d["kind"]
	keys: KeyDefinitions<d>
	collapseKey?: keyof d["inner"] & string
	addContext?: (ctx: SchemaParseContext) => void
	normalize: (
		schema: d["schema"]
	) => normalizeInput<d["normalizedSchema"], d["inner"]>
	reduce?: (
		inner: d["inner"],
		scope: ScopeNode
	) => Node<reducibleKindOf<d["kind"]>> | undefined
}

// writeDefaultDescription: (node: Node<d["kind"]>) => string
// compile: (node: Node<d["kind"]>, ctx: CompilationContext) => string
// intersections: reifyIntersections<d["kind"], d["intersections"]>

export type UnknownNodeImplementation = optionalizeKeys<
	NodeParserImplementation<BaseNodeDeclaration>,
	"reduce"
>
