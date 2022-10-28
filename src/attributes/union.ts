/* eslint-disable max-lines-per-function */
import type { Mutable } from "../internal.js"
import { deepEquals } from "../utils/deepEquals.js"
import type { Attributes } from "./attributes.js"
import { Intersection } from "./intersection.js"
import type { AttributeKey, RootReducer } from "./shared.js"

export namespace Union {
    export const mapIntersectionToBranches = (
        branches: Attributes[],
        attributes: Attributes
    ) => {
        const viableBranches: Attributes[] = []
        for (const branch of branches) {
            const branchWithAttributes = Intersection.reduce(branch, attributes)
            if (branchWithAttributes !== "never") {
                viableBranches.push(branchWithAttributes)
            }
        }
        return viableBranches
    }

    export const reduce: RootReducer = (
        { ...base }: Attributes,
        { ...branch }: Attributes
    ) => {
        let k: AttributeKey
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
            base.branched?.map((preexistingBranch) => ({
                ...preexistingBranch,
                ...baseAttributesToDistribute
            })) ?? []
        base.branched = [...reducedBranches, branch]
        return base
    }
}
