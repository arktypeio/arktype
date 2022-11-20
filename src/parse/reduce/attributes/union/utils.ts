import type { Attributes } from "../attributes.js"

export const buildNoViableBranchesMessage = (branches: Attributes[]) => {
    let message = "All branches are empty:\n"
    for (const branch of branches) {
        message += branch.contradiction
    }
    return message
}
