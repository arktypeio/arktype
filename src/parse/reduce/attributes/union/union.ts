import type { DynamicScope } from "../../../../scope.js"
import { isEmpty } from "../../../../utils/deepEquals.js"
import type { Attributes } from "../attributes.js"
import { extractBase } from "./extractBase.js"

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
    const base = extractBase(branches, scope)
    if (branches.every((branch) => !isEmpty(branch))) {
        base.branches = [branches]
    }
    return base
}

export const buildNoViableBranchesMessage = (branches: Attributes[]) => {
    let message = "All branches are empty:\n"
    for (const branch of branches) {
        message += branch.contradiction
    }
    return message
}
