import type {
	Dict,
	evaluate,
	optionalizeKeys,
	requireKeys,
	requiredKeyOf,
	satisfy
} from "@arktype/util"
import type { ParseContext, reducibleKindOf } from "../node.ts"
import type { BaseAttributes, BaseNodeDeclaration } from "./declare.ts"
import type { rightOf } from "./intersect.ts"
import type {
	Declaration,
	ExpandedSchema,
	Inner,
	Node,
	Schema
} from "./node.ts"

export const basisKinds = ["unit", "proto", "domain"] as const

export type BasisKind = (typeof basisKinds)[number]

export const closedConstraintKinds = ["divisor", "max", "min"] as const

export type ClosedConstraintKind = (typeof closedConstraintKinds)[number]

export const openConstraintKinds = [
	"pattern",
	"predicate",
	"required",
	"optional"
] as const

export type OpenConstraintKind = (typeof openConstraintKinds)[number]

export const constraintKinds = [
	...closedConstraintKinds,
	...openConstraintKinds
] as const

export type ConstraintKind = (typeof constraintKinds)[number]

export const setKinds = ["union", "morph", "intersection"] as const

export type SetKind = (typeof setKinds)[number]

export const rootKinds = [...setKinds, ...basisKinds] as const

export type RootKind = (typeof rootKinds)[number]

export const ruleKinds = [...basisKinds, ...constraintKinds] as const

export type RuleKind = (typeof ruleKinds)[number]

export const nodeKinds = [...setKinds, ...ruleKinds] as const

export type NodeKind = (typeof nodeKinds)[number]

export type OrderedNodeKinds = typeof nodeKinds

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type assertNoExtraKinds = satisfy<NodeKind, OrderedNodeKinds[number]>

export type Root<t = unknown, kind extends RootKind = RootKind> = Node<kind, t>

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

export type NodeKeyDefinition<
	d extends BaseNodeDeclaration,
	k extends keyof d["inner"]
> = requireKeys<
	{
		meta?: true
		defaultable?: true
		preserveUndefined?: true
		parse?: (
			schema: k extends keyof ExpandedSchema<d["kind"]>
				? Exclude<ExpandedSchema<d["kind"]>[k], undefined>
				: undefined,
			ctx: ParseContext
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
	updateContext?: (
		schema: d["expandedSchema"],
		ctx: Readonly<ParseContext>
	) => ParseContext
	intersections: reifyIntersections<d["kind"], d["intersections"]>
	writeDefaultDescription: (inner: Node<d["kind"]>) => string
	attach: (inner: Node<d["kind"]>) => {
		[k in unsatisfiedAttachKey<d>]: d["attach"][k]
	}
	reduce?: (
		inner: d["inner"],
		ctx: ParseContext
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
	"normalize" | "reduce" | "updateContext"
>

type unsatisfiedAttachKey<d extends BaseNodeDeclaration> = {
	[k in keyof d["attach"]]: k extends keyof d["inner"]
		? d["inner"][k] extends d["attach"][k]
			? never
			: k
		: k
}[keyof d["attach"]]

export type reifyIntersections<lKind extends NodeKind, intersectionMap> = {
	[rKind in keyof intersectionMap]: rKind extends "default"
		? (
				l: Node<lKind>,
				r: Node<Exclude<rightOf<lKind>, keyof intersectionMap>>
		  ) => reifyIntersectionResult<intersectionMap[rKind]>
		: (
				l: Node<lKind>,
				r: Node<rKind & NodeKind>
		  ) => reifyIntersectionResult<intersectionMap[rKind]>
}

type reifyIntersectionResult<result> = result extends NodeKind
	? Inner<result>
	: result

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
