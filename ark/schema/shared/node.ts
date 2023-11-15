import type { extend, satisfy } from "@arktype/util"
import type { BaseNode } from "../node.ts"
import {
	SetImplementationByKind,
	setKinds,
	type SetDeclarationsByKind
} from "../sets/set.ts"
import {
	RuleImplementationByKind,
	ruleKinds,
	type RuleDeclarationsByKind
} from "./rule.ts"

export type NodeDeclarationsByKind = extend<
	RuleDeclarationsByKind,
	SetDeclarationsByKind
>

export const NodeImplementationByKind = {
	...SetImplementationByKind,
	...RuleImplementationByKind
}

export type NodeKind = keyof NodeDeclarationsByKind

export const orderedNodeKinds = [
	...setKinds,
	...ruleKinds
] as const satisfies readonly NodeKind[]

export type OrderedNodeKinds = typeof orderedNodeKinds

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type assertIncludesAllKinds = satisfy<OrderedNodeKinds[number], NodeKind>

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type assertNoExtraKinds = satisfy<NodeKind, OrderedNodeKinds[number]>

export type NodeImplementationByKind = typeof NodeImplementationByKind

export type Declaration<kind extends NodeKind> = NodeDeclarationsByKind[kind]

export type Implementation<kind extends NodeKind> =
	NodeImplementationByKind[kind]

export type ExpandedSchema<kind extends NodeKind> =
	Declaration<kind>["expandedSchema"]

export type CollapsedSchema<kind extends NodeKind> = kind extends unknown
	? Declaration<kind>["collapsedSchema" & keyof Declaration<kind>]
	: never

export type Schema<kind extends NodeKind> =
	| ExpandedSchema<kind>
	| CollapsedSchema<kind>

export type Inner<kind extends NodeKind> = Declaration<kind>["inner"]

export type Attachments<kind extends NodeKind> = Declaration<kind>["attach"]

export type Node<
	kind extends NodeKind = NodeKind,
	t = unknown
> = kind extends NodeKind ? BaseNode<kind, t> : never
