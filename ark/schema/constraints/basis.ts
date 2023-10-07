import type {
	AbstractableConstructor,
	exactMessageOnError
} from "@arktype/util"
import type {
	DomainInput,
	DomainNode,
	DomainSchema,
	NonEnumerableDomain
} from "./domain.js"
import type {
	PrototypeInput,
	PrototypeNode,
	PrototypeSchema
} from "./prototype.js"
import type { UnitInput, UnitNode, UnitSchema } from "./unit.js"

export type BasisClassesByKind = {
	domain: typeof DomainNode
	prototype: typeof PrototypeNode
	unit: typeof UnitNode
}

export type BasesByKind = {
	domain: DomainNode
	prototype: PrototypeNode
	unit: UnitNode
}

export type BasisInputsByKind = {
	domain: DomainInput
	prototype: PrototypeInput
	unit: UnitInput
}

export type BasisKind = keyof BasesByKind

export type Basis<kind extends BasisKind = BasisKind> = BasesByKind[kind]

export type BasisInput<kind extends BasisKind = BasisKind> =
	BasisInputsByKind[kind]

export type validateBasisInput<basis> = basis extends
	| NonEnumerableDomain
	| AbstractableConstructor
	? basis
	: basis extends BasisInput
	? exactMessageOnError<
			basis,
			basis extends UnitSchema
				? UnitSchema
				: basis extends PrototypeSchema
				? PrototypeSchema
				: DomainSchema
	  >
	: never

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
