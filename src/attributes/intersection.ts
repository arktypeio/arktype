import type { Attributes } from "./attributes.js"
import type { RootReducer } from "./shared.js"

export namespace Intersection {
    export const mapIntersectionToBranches = (
        branches: Attributes[],
        attributes: Attributes
    ) => {
        const viableBranches: Attributes[] = []
        for (const branch of branches) {
            const branchWithAttributes = reduce(branch, attributes)
            // if (branchWithAttributes.hasType !== "never") {
            //     viableBranches.push(branchWithAttributes)
            // }
        }
        return viableBranches
    }

    export const reduce: RootReducer = (base, attributes) => {
        return base
    }
}
