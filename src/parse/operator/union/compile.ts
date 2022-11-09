import { isEmpty } from "../../../utils/deepEquals.js"
import { throwInternalError } from "../../../utils/internalArktypeError.js"
import type { Attributes } from "../../state/attributes.js"
import { deepEqualIntersection } from "./compress.js"
import { discriminate } from "./discriminate.js"

export type UndiscriminatedBranches = ["|", ...Attributes[]]

export const compileUnion = (branches: Attributes[]): Attributes => {
    if (branches.length === 0) {
        return throwInternalError(
            "Unexpectedly tried to take a union of 0 branches."
        )
    }
    if (branches.length === 1) {
        return branches[0]
    }
    const root = deepEqualIntersection(branches)
    if (branches.some((branch) => isEmpty(branch))) {
        return root
    }
    const discriminated = discriminate(branches)
    if (discriminated) {
        root.branches = discriminated
    } else {
        branches.unshift("|" as any)
        root.branches = branches as UndiscriminatedBranches
    }
    return root
}
