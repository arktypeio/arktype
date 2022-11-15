import { throwInternalError } from "../../errors.js"
import type { Attributes } from "../../reduce/attributes/attributes.js"
import { compress } from "./compress.js"
import { discriminate } from "./discriminate.js"

export const compileUnion = (branches: Attributes[]): Attributes => {
    const viableBranches = branches.filter(
        (branch) => branch.contradiction === undefined
    )
    if (viableBranches.length === 0) {
        let contradiction = "All branches are empty:\n"
        for (const branch of branches) {
            contradiction += branch.contradiction
        }
        return { contradiction }
    }
    return compileViableUnion(viableBranches)
}

export const compileViableUnion = (branches: Attributes[]): Attributes => {
    if (branches.length === 0) {
        return throwInternalError(
            "Unexpectedly tried to take a union of 0 branches."
        )
    }
    if (branches.length === 1) {
        return branches[0]
    }
    const root = compress(branches)
    if (root.branches?.kind === "some") {
        const discriminated = discriminate(root.branches.of)
        if (discriminated) {
            root.branches = discriminated
        }
    }
    return root
}
