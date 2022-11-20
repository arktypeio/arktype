import type { DynamicScope } from "../../../../scope.js"
import { isEmpty } from "../../../../utils/deepEquals.js"
import type { Attributes } from "../attributes.js"
import { compress } from "./compress.js"
import { discriminate } from "./discriminate.js"

export const union = (
    branches: Attributes[],
    scope: DynamicScope
): Attributes => {
    const viableBranches = branches.filter(
        (branch) => branch.contradiction === undefined
    )
    if (viableBranches.length === 0) {
        return { contradiction: buildNoViableBranchesMessage(branches) }
    }
    return viableUnion(viableBranches, scope)
}

export const buildNoViableBranchesMessage = (branches: Attributes[]) => {
    let message = "All branches are empty:\n"
    for (const branch of branches) {
        message += branch.contradiction
    }
    return message
}

export const viableUnion = (
    branches: Attributes[],
    scope: DynamicScope
): Attributes => {
    if (branches.length === 1) {
        return branches[0]
    }
    const root = compress(branches, scope)
    if (branches.every((branch) => !isEmpty(branch))) {
        root.branches = discriminate(branches, scope)
    }
    return root
}
