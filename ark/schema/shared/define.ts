import type {
	ErrorMessage,
	JsonData,
	PartialRecord,
	listable,
	optionalizeKeys,
	requireKeys,
	requiredKeyOf,
	satisfy
} from "@arktype/util"
import type { BaseNode, Node } from "../base.js"
import type { SchemaParseContext } from "../parse.js"
import type { ScopeNode } from "../scope.js"
import { compileSerializedValue } from "./compilation.js"
import type { BaseAttributes, BaseNodeDeclaration } from "./declare.js"
import type {
	Attachments,
	Declaration,
	Inner,
	reducibleKindOf
} from "./nodes.js"

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

export type InnerKeyDefinitions<d extends BaseNodeDeclaration> = {
	[k in keyof d["normalizedSchema"]]: NodeKeyImplementation<
		// TODO: normalized
		d["normalizedSchema"],
		k extends keyof d["inner"] ? d["inner"] : d["meta"],
		k
	>
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
	schema,
	o,
	k extends keyof schema & keyof o
> = requireKeys<
	{
		preserveUndefined?: true
		child?: true
		serialize?: (
			schema: o[k] extends listable<BaseNode> | undefined
				? ErrorMessage<`Keys with node children cannot specify a custom serializer`>
				: o[k]
		) => JsonData
		parse?: (
			schema: Exclude<schema[k], undefined>,
			ctx: SchemaParseContext
		) => o[k]
	},
	// require parse if we can't guarantee the schema value will be valid on inner
	| (schema[k] extends Pick<o, k> ? never : "parse")
	// require keys containing children specify it
	| (o[k] extends listable<BaseNode> | undefined ? "child" : never)
>

export type BaseInitializedNode<kind extends NodeKind> = kind extends NodeKind
	? Omit<Node<kind>, unsatisfiedAttachKey<kind>>
	: never

export type NodeParserImplementation<d extends BaseNodeDeclaration> = {
	kind: d["kind"]
	keys: InnerKeyDefinitions<d>
	collapseKey?: keyof d["inner"] & string
	addContext?: (ctx: SchemaParseContext) => void

	attach: AttachImplementation<d["kind"]>
	normalize: (
		schema: d["normalizedSchema"]
	) => normalizeInput<d["normalizedSchema"], d["inner"]>
	reduce?: (
		inner: d["inner"],
		scope: ScopeNode
	) => Node<reducibleKindOf<d["kind"]>> | undefined
}

// writeDefaultDescription: (node: Node<d["kind"]>) => string
// compile: (node: Node<d["kind"]>, ctx: CompilationContext) => string
// intersections: reifyIntersections<d["kind"], d["intersections"]>

export type AttachImplementation<kind extends NodeKind> = (
	node: BaseInitializedNode<kind>
) => {
	[k in unsatisfiedAttachKey<kind>]: Attachments<kind>[k]
}

export type UnknownNodeImplementation = optionalizeKeys<
	NodeParserImplementation<BaseNodeDeclaration>,
	"reduce"
>

type unsatisfiedAttachKey<kind extends NodeKind> = {
	[k in keyof Attachments<kind>]: k extends keyof Inner<kind>
		? Inner<kind>[k] extends Attachments<kind>[k]
			? never
			: k
		: k
}[keyof Attachments<kind>]

export function defineNode<
	kind extends NodeKind,
	impl extends NodeParserImplementation<Declaration<kind>>
>(input: { kind: kind } & impl): impl
// eslint-disable-next-line prefer-arrow-functions/prefer-arrow-functions
export function defineNode(
	input: NodeParserImplementation<any>
): UnknownNodeImplementation {
	Object.assign(input.keys, {
		description: {
			meta: true
		}
	})
	return input as never
}
