import type { Constraint } from "./constraint.js"
import {
    ConstraintNode,
    ConstraintSet,
    defineConstraintNode
} from "./constraint.js"

// TODO: Add equals/extends here? Think about how it will work with range
export interface RegexConstraint extends Constraint {
    readonly source: string
    readonly flags: string
}

export const regexNode = defineConstraintNode<RegexConstraint>({
    get condition() {
        return `/${this.source}/${this.flags}`
    },
    get defaultDescription() {
        return `matched by /${this.source}/${this.flags}`
    }
})

class RegexSet extends ConstraintSet<readonly RegexConstraint[]> {
    add(constraint: RegexConstraint) {
        const matching = this.find(
            (existing) =>
                constraint.source === existing.source &&
                constraint.flags === existing.flags
        )
        return matching ? this : new RegexSet(...this, constraint)
    }
}
