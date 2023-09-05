import type { DomainConstraint } from "./domain.js"
import type { IdentityConstraint } from "./identity.js"
import type { PrototypeConstraint } from "./prototype.js"

export type BasesByKind = {
	domain: DomainConstraint
	identity: IdentityConstraint
	prototype: PrototypeConstraint
}

export type BasisKind = keyof BasesByKind

export type Basis<kind extends BasisKind = BasisKind> = BasesByKind[kind]

// export type BaseConstraintParameters<
// 	rule,
// 	additionalAttributes = {}
// > = readonly [
// 	rule: rule,
// 	attributes?: evaluate<
// 		ConstructorParameters<ReturnType<typeof composeConstraint>>[1] &
// 			additionalAttributes
// 	>
// ]
