import type { extend } from "@arktype/util"
import type { Disjoint } from "../disjoint.js"
import type { BaseSchema, NodeSubclass } from "../schema.js"
import { BaseNode } from "../schema.js"
import type { BoundNode } from "./bound.js"
import type { DivisibilityNode } from "./divisor.js"
import type { DomainNode } from "./domain.js"
import type { IdentityNode } from "./identity.js"
import type { NarrowNode } from "./narrow.js"
import type { PropConstraint } from "./prop.js"
import type { PrototypeNode } from "./prototype.js"
import type { PatternNode } from "./regex.js"

export type BasisClassesByKind = {
	domain: typeof DomainNode
	identity: typeof IdentityNode
	prototype: typeof PrototypeNode
}

export type BasesByKind = {
	domain: DomainNode
	identity: IdentityNode
	prototype: PrototypeNode
}

export type BasisKind = keyof BasesByKind

export type Basis<kind extends BasisKind = BasisKind> = BasesByKind[kind]

export type RefinementClassesByKind = {
	divisor: typeof DivisibilityNode
	bound: typeof BoundNode
	regex: typeof PatternNode
	prop: typeof PropConstraint
	narrow: typeof NarrowNode
}

export type RefinementsByKind = {
	divisor: DivisibilityNode
	bound: BoundNode
	regex: PatternNode
	prop: PropConstraint
	narrow: NarrowNode
}

export type RefinementKind = keyof RefinementsByKind

export type Refinement<kind extends RefinementKind = RefinementKind> =
	RefinementsByKind[kind]

export type ConstraintClassesByKind = extend<
	BasisClassesByKind,
	RefinementClassesByKind
>

export type ConstraintsByKind = extend<BasesByKind, RefinementsByKind>

export type ConstraintKind = keyof ConstraintsByKind

export type Constraint<kind extends ConstraintKind = ConstraintKind> =
	ConstraintsByKind[kind]

export interface ConstraintSchema extends BaseSchema {}

export abstract class ConstraintNode<
	schema extends ConstraintSchema,
	node extends NodeSubclass<node>
> extends BaseNode<schema> {
	reduce(other: Constraint): Constraint | Disjoint | null {
		return this as never
	}

	// TODO: only own keys
	abstract reduceWith(other: Constraint): schema | null | Disjoint
}

export abstract class RefinementNode<
	schema extends ConstraintSchema,
	node extends NodeSubclass<node>
> extends ConstraintNode<schema, node> {
	abstract applicableTo(basis: Basis | undefined): basis is Basis | undefined
}

// export const assertAllowsConstraint = (
// 	basis: Node<BasisKind> | null,
// 	node: Node<RefinementKind>
// ) => {
// 	if (basis?.hasKind("unit")) {
// 		return throwInvalidConstraintError(
// 			node.kind,
// 			"a non-literal type",
// 		)
// 	}
// 	const domain = basis?.domain ?? "unknown"
// 	switch (node.kind) {
// 		case "divisor":
// 			if (domain !== "number") {
// 				throwParseError(writeIndivisibleMessage(domain))
// 			}
// 			return
// 		case "bound":
// 			if (domain !== "string" && domain !== "number") {
// 				const isDateClassBasis =
// 					basis?.hasKind("class") && basis.extendsOneOf(Date)
// 				if (isDateClassBasis) {
// 					if (!isDateLiteral(node.rule.limit)) {
// 						throwParseError(
// 							writeInvalidLimitMessage(
// 								node.rule.comparator,
// 								node.rule.limit,
// 								// TODO: we don't know if this is true, validate range together
// 								"right"
// 							)
// 						)
// 					}
// 					return
// 				}
// 				const hasSizedClassBasis =
// 					basis?.hasKind("class") && basis.extendsOneOf(Array)
// 				if (!hasSizedClassBasis) {
// 					throwParseError(writeUnboundableMessage(domain))
// 				}
// 			}
// 			if (typeof node.rule.limit !== "number") {
// 				throwParseError(
// 					writeInvalidLimitMessage(
// 						node.rule.comparator,
// 						node.rule.limit,
// 						// TODO: we don't know if this is true, validate range together
// 						"right"
// 					)
// 				)
// 			}
// 			return
// 		case "regex":
// 			if (domain !== "string") {
// 				throwInvalidConstraintError("regex", "a string", domain)
// 			}
// 			return
// 		case "props":
// 			if (domain !== "object") {
// 				throwInvalidConstraintError("props", "an object", domain)
// 			}
// 			return
// 		case "narrow":
// 			return
// 		default:
// 			throwInternalError(`Unexpected rule kind '${(node as Node).kind}'`)
// 	}
// }

// export const writeInvalidConstraintMessage = (
// 	kind: RefinementKind,
// 	typeMustBe: string,
// 	typeWas: string
// ) => {
// 	return `${kind} constraint may only be applied to ${typeMustBe} (was ${typeWas})`
// }

// export const throwInvalidConstraintError = (
// 	...args: Parameters<typeof writeInvalidConstraintMessage>
// ) => throwParseError(writeInvalidConstraintMessage(...args))
