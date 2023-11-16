import {
	entriesOf,
	type Dict,
	type evaluate,
	type optionalizeKeys,
	type satisfy
} from "@arktype/util"
import type { ParseContext } from "../node.ts"
import type { BaseAttributes, BaseNodeDeclaration } from "./declare.ts"
import type { rightOf } from "./intersect.ts"
import type { Declaration, ExpandedSchema, Inner, Node } from "./node.ts"

type BaseAttributeKeyDefinitions = {
	[k in keyof BaseAttributes]: NodeKeyDefinition<BaseNodeDeclaration, k>
}

export type instantiateNodeImplementation<definition> = evaluate<
	definition & {
		keys: BaseAttributeKeyDefinitions
	} & {
		keyEntries: definition extends { keys: infer keys }
			? entriesOf<keys & BaseAttributeKeyDefinitions>
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
> = {
	meta?: true
	children?: readonly NodeKind[]
	parse?: (
		schema: k extends keyof ExpandedSchema<d["kind"]>
			? ExpandedSchema<d["kind"]>[k]
			: undefined,
		ctx: ParseContext
	) => d["inner"][k]
	// require parse or children if we can't guarantee the schema value will be valid on inner
} & (ExpandedSchema<d["kind"]>[k] extends d["inner"][k]
	? {}
	: { parse: {} } | { children: {} })

export type NodeImplementation<d extends BaseNodeDeclaration> = {
	kind: d["kind"]
	keys: InnerKeyDefinitions<d>
	intersections: reifyIntersections<d["kind"], d["intersections"]>
	writeDefaultDescription: (inner: Node<d["kind"]>) => string
	attach: (inner: Node<d["kind"]>) => {
		[k in unsatisfiedAttachKey<d>]: d["attach"][k]
	}
	reduce?: (
		inner: d["inner"]
	) => Node<Extract<RootKind, rightOf<d["kind"]>>> | d["inner"]
	expand?: (
		schema: d["collapsedSchema"] | d["expandedSchema"]
	) => d["expandedSchema"]
	// require expand if collapsedSchema is defined
} & ("collapsedSchema" extends keyof d ? { expand: {} } : {})

export type UnknownNodeImplementation = optionalizeKeys<
	instantiateNodeImplementation<
		NodeImplementation<BaseNodeDeclaration> & {
			keys: Dict<string, NodeKeyDefinition<any, any>>
		}
	>,
	"expand" | "reduce"
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

export type Root<t = unknown, kind extends RootKind = RootKind> = Node<kind, t>

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

export const defineNode = <
	kind extends NodeKind,
	implementation extends NodeImplementation<Declaration<kind>>
>(
	implementation: { kind: kind } & implementation
): instantiateNodeImplementation<implementation> => {
	Object.assign(implementation.keys, {
		alias: {
			meta: true
		},
		description: {
			meta: true
		}
	})
	return Object.assign(implementation, {
		keyEntries: entriesOf(implementation.keys)
	}) as never
}
