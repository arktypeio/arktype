/* eslint-disable max-lines-per-function */
import type { Mutable } from "../internal.js"
import { deepEquals } from "../utils/deepEquals.js"
import type { Attributes } from "./attributes.js"
import { reduceIntersection } from "./intersection.js"

export const mapIntersectionToBranches = (
    branches: Attributes[],
    attributes: Attributes
) => {
    const viableBranches: Attributes[] = []
    for (const branch of branches) {
        const branchWithAttributes = reduceIntersection(branch, attributes)
        if (branchWithAttributes.hasType !== "never") {
            viableBranches.push(branchWithAttributes)
        }
    }
    return viableBranches
}

export const reduceUnion: Attributes.Reducer<[branch: Attributes]> = (
    { ...base },
    { ...branch }
) => {
    let k: Attributes.KeyOf
    const baseAttributesToDistribute = {} as Mutable<Attributes>
    for (k in branch) {
        if (deepEquals(base[k], branch[k])) {
            // The branch attribute is redundant and can be removed.
            delete branch[k]
            continue
        }
        if (!(k in base)) {
            // The branch attribute was not previously part of base and is safe to push to branches.
            continue
        }
        // The attribute had distinct values for base and branch. Once we're
        // done looping over branch attributes, distribute it to each
        // existing branch and remove it from base.
        baseAttributesToDistribute[k] = base[k] as any
    }
    if (!Object.keys(branch).length) {
        // All keys were redundant, no need to push the new branch
        return base
    }
    const reducedBranches =
        base.satisfiesOneOf?.map((preexistingBranch) => ({
            ...preexistingBranch,
            ...baseAttributesToDistribute
        })) ?? []
    base.satisfiesOneOf = [...reducedBranches, branch]
    return base
}
