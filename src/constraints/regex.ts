import type { Constraint, ConstraintNode, ConstraintSet } from "./constraint.js"
import { defineConstraintNode, defineConstraintSet } from "./constraint.js"

// TODO: Add equals/extends here? Think about how it will work with range
export interface RegexConstraint extends Constraint {
    readonly source: string
    readonly flags: string
}

export const regexNode = defineConstraintNode<RegexConstraint>({})

export type RegexSet = ConstraintSet<readonly RegexConstraint[]>

export const regexSet = defineConstraintSet<readonly RegexConstraint[]>({
    add(this, constraint): RegexSet {
        const matching = this.find(
            (existing) =>
                constraint.source === existing.source &&
                constraint.flags === existing.flags
        )
        return matching ? this : regexSet([...this, constraint])
    }
})
