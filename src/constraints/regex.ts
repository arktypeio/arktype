import type { List } from "@arktype/utils"
import type { Constraint, ConstraintSet } from "./constraint.js"
import { ConstraintGroup, defineConstraintSet } from "./constraint.js"

export interface RegexConstraint extends Constraint {
    readonly source: string
    readonly flags: string
}

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
