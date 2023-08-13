import { cached } from "@arktype/util"
import type { ConstraintSet } from "./constraints/constraint.js"
import { Disjoint } from "./disjoint.js"
import type { BaseNode } from "./node.js"

// TODO: integrate with default scopes
export const builtins = {
	never: cached(() => node([])),
	unknown: cached(() => node({})),
	nonVariadicArrayIndex: cached(() => node(arrayIndexInput())),
	string: cached(() => node({ basis: "string" })),
	array: cached(() => node({ basis: Array }))
} satisfies Record<string, () => TypeNode>

export const assertOverlapping = (
	intersection: Disjoint | BaseNode | ConstraintSet
) => (intersection instanceof Disjoint ? intersection.throw() : intersection)
