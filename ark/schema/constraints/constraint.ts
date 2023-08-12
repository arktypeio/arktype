import type { Constructor, listable, satisfy } from "@arktype/util"
import { ReadonlyArray, throwInternalError } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { BaseNode, orthogonal } from "../type.js"
import type { ConstructorConstraint } from "./constructor.js"
import type { DivisibilityConstraint } from "./divisibility.js"
import type { DomainConstraint } from "./domain.js"
import type { IdentityConstraint } from "./identity.js"
import type { NarrowConstraint, NarrowSet } from "./narrow.js"
import type { PropConstraint } from "./prop/prop.js"
import type { RangeConstraint, RangeSet } from "./range.js"
import type { RegexConstraint, RegexSet } from "./regex.js"

export abstract class ConstraintNode<rule = unknown> extends BaseNode<rule> {
	assertAllowedBy?(): void
}

export const setConstructor =
	<subclass extends ConstraintSet>(subclass: subclass) =>
	(constraints: extractArray<subclass>) =>
		// starting from an empty set, apply and reduce unvalidated constraints
		intersectConstraints(new (subclass as any)(), constraints) as subclass

type extractArray<subclass extends readonly Constraint[]> =
	subclass extends readonly [...infer constraints extends readonly Constraint[]]
		? constraints
		: never

/** @ts-expect-error allow extending narrowed readonly array */
export abstract class ConstraintSet<
	constraints extends readonly Constraint[] = readonly Constraint[]
> extends ReadonlyArray<constraints> {
	protected constructor(...constraints: constraints) {
		super(...constraints)
	}

	add(constraint: constraints[number]): this | Disjoint {
		const withConstraint = addConstraint(this, constraint)
		return withConstraint instanceof Disjoint
			? withConstraint
			: (new (this.constructor as any)(...withConstraint) as this)
	}

	intersect(other: constraints) {
		return intersectConstraints(this, other)
	}
}

// TODO: make sure in cases like range, the result is sorted
const addConstraint = <constraints extends readonly Constraint[]>(
	to: constraints,
	constraint: constraints[number]
): readonly Constraint[] | Disjoint => {
	const result: Constraint[] = []
	let includesConstraint = false
	for (let i = 0; i < to.length; i++) {
		const elementResult = to[i].intersect(constraint as never)
		if (elementResult === orthogonal) {
			result.push(to[i])
		} else if (elementResult instanceof Disjoint) {
			return elementResult
		} else if (!includesConstraint) {
			result.push(elementResult)
			includesConstraint = true
		} else if (!result.includes(elementResult)) {
			return throwInternalError(
				`Unexpectedly encountered multiple distinct intersection results for constraint ${elementResult}`
			)
		}
	}
	if (!includesConstraint) {
		result.push(constraint)
	}
	return result
}

const intersectConstraints = <
	set extends ConstraintSet<constraints>,
	constraints extends readonly Constraint[]
>(
	set: set,
	constraints: constraints
) =>
	constraints.reduce((set, constraint) => {
		const next = set.add(constraint)
		return next instanceof Disjoint ? next.throw() : next
	}, set)

export type ConstraintsByKind = {
	constructor: ConstructorConstraint
	domain: DomainConstraint
	range: RangeConstraint
	divisibility: DivisibilityConstraint
	identity: IdentityConstraint
	narrow: NarrowConstraint
	regex: RegexConstraint
	prop: PropConstraint
}

export type ConstraintKind = keyof ConstraintsByKind

export type Constraint<kind extends ConstraintKind = ConstraintKind> =
	ConstraintsByKind[kind]

export type ConstraintSetsByKind = satisfy<
	{ [kind in ConstraintKind]: listable<Constraint<kind>> },
	{
		constructor: ConstructorConstraint
		domain: DomainConstraint
		range: RangeSet
		divisibility: DivisibilityConstraint
		identity: IdentityConstraint
		narrow: NarrowSet
		regex: RegexSet
		prop: PropConstraint
	}
>

// export const assertAllowsConstraint = (
// 	basis: Node<BasisKind> | null,
// 	node: Node<RefinementKind>
// ) => {
// 	if (basis?.hasKind("unit")) {
// 		return throwInvalidConstraintError(
// 			node.kind,
// 			"a non-literal type",
// 			basis.toString()
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
