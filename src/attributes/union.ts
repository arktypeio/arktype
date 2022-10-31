/* eslint-disable max-lines-per-function */
import { isKeyOf } from "../internal.js"
import type { AttributeKey, Attributes } from "./shared.js"
import { atomicAttributes } from "./shared.js"

// {a: "string"} | {a: "string", b: "number"}
// props

const compressUnion = (base: Attributes, branch: Attributes) => {
    const comparison = compare(base, branch)
    if (!comparison.branched) {
    }
    if (!base.branches) {
    }
    comparison.branched
}

type AttributesComparison = {
    shared: Attributes
    diverged: Attributes
    branched: Attributes
}

// TODO: Figure out mutations
const compare = (
    base: Attributes,
    branch: Attributes
): AttributesComparison => {
    const result = initializeAttributesComparison()
    let k: AttributeKey
    for (k in branch) {
        if (k in base) {
            if (isKeyOf(k, atomicAttributes)) {
                if (base[k] === branch[k]) {
                    // The branch attribute is redundant and can be removed.
                    result.shared[k] = base[k] as any
                } else {
                    // The attribute had distinct values for base and branch. Once we're
                    // done looping over branch attributes, distribute it to each
                    // existing branch and remove it from base.
                    result.diverged[k] = base[k] as any
                    result.branched[k] = branch[k] as any
                }
            } else if (k === "baseProp") {
                addComposedAttributeResult(
                    "baseProp",
                    result,
                    compare(base.baseProp!, branch.baseProp!)
                )
            } else if (k === "props") {
                const allProps = { ...base.props!, ...branch.props! }
                for (const propKey in allProps) {
                    if (propKey in base.props! && propKey in branch.props!) {
                        addPropResult(
                            propKey,
                            result,
                            compare(
                                base.props![propKey],
                                branch.props![propKey]
                            )
                        )
                    } else if (propKey in base.props!) {
                        result.diverged.props ??= {}
                        result.diverged.props[propKey] = base.props![propKey]
                    } else {
                        result.branched.props ??= {}
                        result.branched.props[propKey] = branch.props![propKey]
                    }
                }
            } else if (k === "branches") {
                if (
                    base.branches!.length === 1 &&
                    branch.branches!.length === 1
                ) {
                    result.shared.branches = [
                        [...base.branches![0], ...branch.branches![0]]
                    ]
                } else {
                    // TODO: Figure out what has to happen here for intersection of branches
                    result.shared.branches = base.branches
                    result.branched.branches = branch.branches
                }
            }
        } else {
            // The branch attribute was not previously part of base and is safe to push to branches.
            result.branched[k] = branch[k] as any
        }
    }
    return result
    // base.branches ??= []
    // for (const branch of base.branches) {
    //     intersect(branch, baseAttributesToDistribute)
    // }
    // base.branches.push(branch)
    // return base
}

const addComposedAttributeResult = (
    key: AttributeKey,
    result: AttributesComparison,
    composedResult: AttributesComparison
) => {
    result.shared[key] = composedResult.shared as any
    result.diverged[key] = composedResult.diverged as any
    result.branched[key] = composedResult.branched as any
}

const addPropResult = (
    propKey: string,
    result: AttributesComparison,
    propResult: AttributesComparison
) => {
    result.shared.props![propKey] = propResult.shared as any
    result.diverged.props![propKey] = propResult.diverged as any
    result.branched.props![propKey] = propResult.branched as any
}

const initializeAttributesComparison = (): AttributesComparison => ({
    shared: {},
    diverged: {},
    branched: {}
})

// TODO: What to do with composable here
// if (
//     (left.branches && left.branches.length > 1) ||
//     (right.branches && right.branches.length > 1)
// ) {
//     // If left or right is already a branch intersection, create a new root for the union
//     return {
//         branches: [left, right]
//     }
// }

// type CompressedUnion = []

// const compressRedundant = (base: Attributes, value: Attributes) => {}

// const isRedundant = <key extends AttributeKey>(
//     key: key,
//     base: AttributeTypes[key],
//     value: AttributeTypes[key]
// ) => {
//     if (isKeyOf(key, atomicAttributes)) {
//     }
// }
