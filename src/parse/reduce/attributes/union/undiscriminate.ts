import type { Attributes, CaseKey } from "../attributes.js"
import { intersect } from "../intersect.js"
import { unpruneDiscriminant } from "./prune.js"

export const undiscriminate = (attributes: Attributes): Attributes[] => {
    const branches = attributes.branches
    if (!branches || branches[0] === "&") {
        return [attributes]
    }
    delete attributes.branches
    if (branches[0] === "|") {
        for (const branch of branches[1]) {
            intersect(branch, attributes)
        }
        return branches[1]
    }
    const undiscriminated: Attributes[] = []
    const path = branches[1]
    const cases = branches[2]
    let caseKey: CaseKey
    for (caseKey in cases) {
        const caseBranches = undiscriminate(cases[caseKey]!)
        for (const branch of caseBranches) {
            intersect(branch, attributes)
            if (caseKey !== "default") {
                unpruneDiscriminant(branch, path, caseKey)
            }
            undiscriminated.push(branch)
        }
    }
    return undiscriminated
}
