import type { Attributes, DiscriminatedBranches } from "../attributes.js"

export const undiscriminate = (discriminated: DiscriminatedBranches) => {
    const branches: Attributes[] = []
    for (const value in discriminated.cases) {
        const valueBranches = undiscriminate
    }
}
