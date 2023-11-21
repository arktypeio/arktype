import type {
	Dict,
	evaluate,
	optionalizeKeys,
	requireKeys,
	requiredKeyOf,
	satisfy
} from "@arktype/util"
import type { RootNode, SchemaParseContext, reducibleKindOf } from "../node.js"
import type { BaseAttributes, BaseNodeDeclaration } from "./declare.js"
import type { reifyIntersections } from "./intersect.js"
import type { Declaration, ExpandedSchema, Node, Schema } from "./node.js"

export const basisKinds = ["unit", "proto", "domain"] as const

export type BasisKind = (typeof basisKinds)[number]

export const closedRefinementKinds = ["divisor", "max", "min"] as const

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

export const rootKinds = [...setKinds, ...basisKinds] as const

export type RootKind = (typeof rootKinds)[number]

export const constraintKinds = [...basisKinds, ...refinementKinds] as const

export type ConstraintKind = (typeof constraintKinds)[number]

export const nodeKinds = [...setKinds, ...constraintKinds] as const

export type NodeKind = (typeof nodeKinds)[number]

export type OrderedNodeKinds = typeof nodeKinds

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type assertNoExtraKinds = satisfy<NodeKind, OrderedNodeKinds[number]>

export type Root<
	t = unknown,
	kind extends RootKind = RootKind
> = kind extends RootKind ? RootNode<kind, t> : never

type BaseAttributeKeyDefinitions = {
	[k in keyof BaseAttributes]: NodeKeyDefinition<BaseNodeDeclaration, k>
}

export type instantiateNodeImplementation<definition> = evaluate<
	definition & {
		keys: BaseAttributeKeyDefinitions
		defaultableKeys: definition extends { keys: infer keys }
			? (keyof keys | keyof BaseAttributeKeyDefinitions)[]
			: never
	}
>

export type InnerKeyDefinitions<d extends BaseNodeDeclaration> = {
	[k in Exclude<keyof d["inner"], keyof BaseAttributes>]: NodeKeyDefinition<
		d,
		k
	>
}

export type ConstraintAttachments = {
	readonly condition: string
}

export type NodeKeyDefinition<
	d extends BaseNodeDeclaration,
	k extends keyof d["inner"]
> = requireKeys<
	{
		meta?: true
		precedence?: number
		defaultable?: true
		preserveUndefined?: true
		parse?: (
			schema: k extends keyof ExpandedSchema<d["kind"]>
				? Exclude<ExpandedSchema<d["kind"]>[k], undefined>
				: undefined,
			ctx: SchemaParseContext<d["kind"]>
		) => d["inner"][k]
		// require parse or children if we can't guarantee the schema value will be valid on inner
	},
	ExpandedSchema<d["kind"]>[k] extends d["inner"][k]
		? never
		: // ensure we can provide a default if the key is required on inner but
		  // optional or not present on schema
		  k extends Exclude<
					requiredKeyOf<d["inner"]>,
					requiredKeyOf<d["expandedSchema"]>
		    >
		  ? "parse" | "defaultable"
		  : "parse"
>

export type NodeImplementationInput<d extends BaseNodeDeclaration> = {
	kind: d["kind"]
	keys: InnerKeyDefinitions<d>
	intersections: reifyIntersections<d["kind"], d["intersections"]>
	writeDefaultDescription: (inner: Node<d["kind"]>) => string
	attach: (inner: Node<d["kind"]>) => {
		[k in unsatisfiedAttachKey<d>]: d["attach"][k]
	}
	reduce?: (
		inner: d["inner"],
		ctx: SchemaParseContext<d["kind"]>
	) => Node<reducibleKindOf<d["kind"]>> | undefined
	normalize?: (schema: Schema<d["kind"]>) => d["expandedSchema"]
	// require expand if collapsedSchema is defined
} & ("collapsedSchema" extends keyof d ? { normalize: {} } : {})

export type UnknownNodeImplementation = optionalizeKeys<
	instantiateNodeImplementation<
		NodeImplementationInput<BaseNodeDeclaration> & {
			keys: Dict<string, NodeKeyDefinition<any, any>>
			defaultableKeys: string[]
		}
	>,
	"normalize" | "reduce"
>

type unsatisfiedAttachKey<d extends BaseNodeDeclaration> = {
	[k in keyof d["attach"]]: k extends keyof d["inner"]
		? d["inner"][k] extends d["attach"][k]
			? never
			: k
		: k
}[keyof d["attach"]]

export function defineNode<
	kind extends NodeKind,
	input extends NodeImplementationInput<Declaration<kind>>
>(input: { kind: kind } & input): instantiateNodeImplementation<input>
export function defineNode(
	input: NodeImplementationInput<any>
): UnknownNodeImplementation {
	Object.assign(input.keys, {
		alias: {
			meta: true
		},
		description: {
			meta: true
		}
	})
	return Object.assign(input, {
		defaultableKeys: Object.keys(input.keys).filter(
			(k) => input.keys[k].defaultable
		)
	})
}
