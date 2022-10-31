import type { Attributes } from "./shared.js"

// TODO: Mutate?
export const union = (base: Attributes, branch: Attributes): Attributes => {
    if (base.branches?.[0] === "|") {
        return {
            ...base,
            branches: [...base.branches, branch]
        }
    }
    return { branches: ["|", base, branch] }
}
