import type { extend } from "@arktype/util"
import { DynamicBase, throwInternalError } from "@arktype/util"
import type { Disjoint } from "../disjoint.js"
import type { NodeKind } from "../node.js"
import type { BoundConstraint } from "./bound.js"
import type { DivisorConstraint } from "./divisor.js"
import type { DomainConstraint } from "./domain.js"
import type { IdentityConstraint } from "./identity.js"
import type { NarrowConstraint } from "./narrow.js"
import type { PropConstraint } from "./prop.js"
import type { PrototypeConstraint } from "./prototype.js"
import type { RegexConstraint } from "./regex.js"

export type BasesByKind = {
	domain: DomainConstraint
	identity: IdentityConstraint
	prototype: PrototypeConstraint
}

export type BasisKind = keyof BasesByKind

export type Basis<kind extends BasisKind = BasisKind> = BasesByKind[kind]

export type RefinementsByKind = {
	divisor: DivisorConstraint
	bound: BoundConstraint
	regex: RegexConstraint
	prop: PropConstraint
	narrow: NarrowConstraint
}

export type RefinementKind = keyof RefinementsByKind

export type Refinement<kind extends RefinementKind = RefinementKind> =
	RefinementsByKind[kind]

export type ConstraintsByKind = extend<BasesByKind, RefinementsByKind>

export type ConstraintKind = keyof ConstraintsByKind

export type Constraint<kind extends ConstraintKind = ConstraintKind> =
	ConstraintsByKind[kind]

// @ts-expect-error
export abstract class SchemaNode<
	schema extends {} = {}
> extends DynamicBase<schema> {
	abstract kind: NodeKind

	constructor(public schema: schema) {
		super(schema)
	}

	abstract writeDefaultDescription(): string
}

export abstract class ConstraintNode<
	schema extends {} = {}
> extends SchemaNode<schema> {
	reduce(other: ConstraintNode) {
		return this as {} as ConstraintNode
	}

	abstract reduceWith(other: ConstraintNode): schema | null | Disjoint
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
