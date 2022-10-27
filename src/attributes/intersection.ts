import type { Attributes } from "./attributes.js"

export const reduceAttribute = {}

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

export const reduceIntersection: Attributes.Reducer<
    [attributes: Attributes]
> = (base, attributes) => {
    return base
}
