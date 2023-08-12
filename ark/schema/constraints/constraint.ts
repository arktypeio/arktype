import type { mutable } from "@arktype/util"
import { throwInternalError } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { disjointIfAllowed, Orthogonal } from "../type.js"
import { BaseNode, orthogonal } from "../type.js"

export interface SetConfig<leaf> {
	leaf: leaf
	intersection: readonly ConstraintSet<this>[]
	disjoinable: boolean
}

export abstract class ConstraintSet<
	setConfig extends SetConfig<any> = SetConfig<unknown>
> extends BaseNode<{
	rule: setConfig["leaf" | "intersection"]
	attributes: {}
	disjoinable: setConfig["disjoinable"]
}> {
	add(constraint: setConfig["leaf"]): this | disjointIfAllowed<setConfig> {
		const result = addConstraint(this.rule, constraint)
		return result instanceof Disjoint
			? result
			: new (this.constructor as any)(result, this.attributes)
	}

	protected abstract intersectMembers(
		other: setConfig["leaf"]
	): setConfig["leaf"] | Orthogonal | disjointIfAllowed<setConfig>

	intersectRules(other: this): this["rule"] | disjointIfAllowed<setConfig> {
		return intersectConstraints(this.rule, other.rule)
	}

	writeDefaultDescription() {
		return `matched by ${this.rule.join(" and ")}`
	}
}

// TODO: make sure in cases like range, the result is sorted
const addConstraint = <constraints extends readonly BaseNode[]>(
	to: constraints,
	constraint: constraints[number]
): constraints | Disjoint => {
	const result = [] as {} as mutable<constraints>
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

const intersectConstraints = (l: readonly BaseNode[], r: readonly BaseNode[]) =>
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
