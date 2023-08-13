import { isArray, throwInternalError } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { disjointIfAllowed, NodeConfig, Orthogonal } from "../type.js"
import { BaseNode, orthogonal } from "../type.js"

export interface SetConfig<leaf> extends NodeConfig {
	leaf: leaf
	intersection: readonly ConstraintSet<any>[]
}

export abstract class ConstraintSet<
	config extends SetConfig<unknown> = SetConfig<unknown>
> extends BaseNode<config> {
	// TODO: array overlap?
	protected members = (isArray(this.rule)
		? this.rule
		: [this]) as readonly this[]

	add(constraint: config["leaf"]): this | disjointIfAllowed<config> {
		const result = addConstraint(this.members, constraint)
		return result instanceof Disjoint
			? result
			: new (this.constructor as any)(result, this.attributes)
	}

	protected abstract intersectRule(
		this: config["intersection"][number],
		other: config["leaf"]
	): config["leaf"] | Orthogonal | disjointIfAllowed<config>

	intersectRules(other: this): config["rule"] | disjointIfAllowed<config> {
		return intersectConstraints(this.members, other.members)
	}
}

// TODO: make sure in cases like range, the result is sorted
const addConstraint = (
	members: readonly ConstraintSet[],
	constraint: ConstraintSet
) => {
	const result: ConstraintSet[] = []
	let includesConstraint = false
	for (let i = 0; i < members.length; i++) {
		const elementResult = members[i].intersect(constraint as never)
		if (elementResult === (orthogonal as never)) {
			result.push(members[i])
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

const intersectConstraints = (
	l: readonly ConstraintSet[],
	r: readonly ConstraintSet[]
): readonly BaseNode[] =>
	r.reduce((intersection, constraint) => {
		const next = addConstraint(intersection, constraint)
		return next instanceof Disjoint ? next.throw() : next
	}, l)

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
