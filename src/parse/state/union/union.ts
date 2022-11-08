import { isEmpty } from "../../../utils/deepEquals.js"
import type { dictionary } from "../../../utils/dynamicTypes.js"
import { throwInternalError } from "../../../utils/internalArktypeError.js"
import type {
    Attributes,
    DiscriminatedAttributeBranches
} from "../attributes.js"
import { compressAndPrune } from "./compress.js"
import type { Discriminant } from "./discriminant.js"
import { calculateDiscriminant } from "./discriminant.js"
import { getPrunedAttribute } from "./getPrunedAttribute.js"

export const union = (branches: Attributes[]): Attributes => {
    if (branches.length === 0) {
        return throwInternalError(
            "Unexpectedly tried to take a union of 0 branches."
        )
    }
    if (branches.length === 1) {
        return branches[0]
    }
    const root = compressAndPrune(branches)
    if (branches.some((branch) => isEmpty(branch))) {
        return root
    }
    const discriminant = calculateDiscriminant(branches)
    if (discriminant) {
        root.switch = discriminate(branches, discriminant)
    } else {
        root.some = branches
    }
    return root
}

const discriminate = (
    branches: Attributes[],
    discriminant: Discriminant
): DiscriminatedAttributeBranches => {
    const branchesByValue: dictionary<Attributes[]> = {}
    for (let i = 0; i < branches.length; i++) {
        const value = getPrunedAttribute(
            branches[i],
            discriminant.path,
            discriminant.key
        )
        branchesByValue[value] ??= []
        branchesByValue[value].push(branches[i])
    }
    const cases: dictionary<Attributes> = {}
    for (const value in branchesByValue) {
        cases[value] = union(branchesByValue[value])
    }
    return {
        path: discriminant.path,
        key: discriminant.key,
        cases
    }
}
