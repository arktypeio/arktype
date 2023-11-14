import { includes, type satisfy } from "@arktype/util"
import {
	type instantiateNodeImplementation,
	type NodeImplementation
} from "./base.ts"
import { type BasisKind } from "./bases/basis.ts"
import { type ConstraintKind } from "./constraints/constraint.ts"
import {
	type Node,
	type NodeDeclarationsByKind,
	type NodeKind,
	type RuleKind
} from "./nodes.ts"
import { type SetKind } from "./sets/set.ts"

// ideally this could be just declared since it is not used at runtime,
// but it doesn't play well with typescript-eslint: https://github.com/typescript-eslint/typescript-eslint/issues/4608
// easiest solution seems to be just having it declared as a value so it doesn't break when we import at runtime
export const inferred = Symbol("inferred")

export type ParseContext = {
	basis: Node<BasisKind> | undefined
}

export const createParseContext = (): ParseContext => ({
	basis: undefined
})

export const setKinds = [
	"union",
	"morph",
	"intersection"
] as const satisfies readonly SetKind[]

export const basisKinds = [
	"unit",
	"proto",
	"domain"
] as const satisfies readonly BasisKind[]

export const rootKinds = [...setKinds, ...basisKinds] as const

export const constraintKinds = [
	"divisor",
	"max",
	"min",
	"pattern",
	"predicate",
	"required",
	"optional"
] as const satisfies readonly ConstraintKind[]

export const ruleKinds = [
	...basisKinds,
	...constraintKinds
] as const satisfies readonly RuleKind[]

export const orderedNodeKinds = [
	...setKinds,
	...ruleKinds
] as const satisfies readonly NodeKind[]

export type OrderedNodeKinds = typeof orderedNodeKinds

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type assertIncludesAllKinds = satisfy<OrderedNodeKinds[number], NodeKind>

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type assertNoExtraKinds = satisfy<NodeKind, OrderedNodeKinds[number]>

export const irreducibleConstraintKinds = [
	"pattern",
	"predicate",
	"required",
	"optional"
] as const satisfies readonly ConstraintKind[]

export type IrreducibleConstraintKind = keyof typeof irreducibleConstraintKinds

export type ReducibleConstraintKind = Exclude<
	ConstraintKind,
	IrreducibleConstraintKind
>

export const reducibleConstraintKinds = constraintKinds.filter(
	(k): k is ReducibleConstraintKind => !includes(irreducibleConstraintKinds, k)
)

export const defineNode = <
	kind extends NodeKind,
	implementation extends NodeImplementation<NodeDeclarationsByKind[kind]>
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
	return implementation
}
