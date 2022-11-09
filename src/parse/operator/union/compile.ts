import { throwInternalError } from "../../../utils/internalArktypeError.js"
import type { Attributes } from "../../state/attributes.js"
import { compress } from "./compress.js"
import { discriminate } from "./discriminate.js"

export type UndiscriminatedBranches = Attributes[]

export const compileUnion = (branches: UndiscriminatedBranches): Attributes => {
    if (branches.length === 0) {
        return throwInternalError(
            "Unexpectedly tried to take a union of 0 branches."
        )
    }
    if (branches.length === 1) {
        return branches[0]
    }
    const root = compress(branches)
    if (root.branches) {
        // If compress returns branches, they will always be undiscriminated
        const discriminated = discriminate(
            root.branches as UndiscriminatedBranches
        )
        if (discriminated) {
            root.branches = discriminated
        }
    }
    return root
}
