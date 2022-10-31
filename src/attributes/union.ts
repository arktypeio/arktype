/* eslint-disable max-lines-per-function */
import { isKeyOf } from "../internal.js"
import type { AttributeKey, Attributes } from "./shared.js"
import { atomicAttributes } from "./shared.js"

// {a: "string"} | {a: "string", b: "number"}
// props

export type CompressUnionResult = {
    shared: Attributes
    diverged: Attributes
    branch: Attributes
}

// TODO: Figure out mutations
const compressUnion = (
    base: Attributes,
    branch: Attributes
): CompressUnionResult => {
    const result = initializeCompressedUnion()
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
                    result.branch[k] = branch[k] as any
                }
            } else if (k === "baseProp") {
                addComposedAttributeResult(
                    "baseProp",
                    result,
                    compressUnion(base.baseProp!, branch.baseProp!)
                )
            } else if (k === "props") {
                const allProps = { ...base.props!, ...branch.props! }
                for (const propKey in allProps) {
                    if (propKey in base.props! && propKey in branch.props!) {
                        addPropResult(
                            propKey,
                            result,
                            compressUnion(
                                base.props![propKey],
                                branch.props![propKey]
                            )
                        )
                    } else if (propKey in base.props!) {
                        result.diverged.props ??= {}
                        result.diverged.props[propKey] = base.props![propKey]
                    } else {
                        result.branch.props ??= {}
                        result.branch.props[propKey] = branch.props![propKey]
                    }
                }
            }
        } else {
            // The branch attribute was not previously part of base and is safe to push to branches.
            result.branch[k] = branch[k] as any
        }
    }
    // base.branches ??= []
    // for (const branch of base.branches) {
    //     intersect(branch, baseAttributesToDistribute)
    // }
    // base.branches.push(branch)
    // return base
}

const addComposedAttributeResult = (
    key: AttributeKey,
    result: CompressUnionResult,
    composedResult: CompressUnionResult
) => {
    result.shared[key] = composedResult.shared as any
    result.diverged[key] = composedResult.diverged as any
    result.branch[key] = composedResult.branch as any
}

const addPropResult = (
    propKey: string,
    result: CompressUnionResult,
    propResult: CompressUnionResult
) => {
    result.shared.props![propKey] = propResult.shared as any
    result.diverged.props![propKey] = propResult.diverged as any
    result.branch.props![propKey] = propResult.branch as any
}

const initializeCompressedUnion = (): CompressUnionResult => ({
    shared: {},
    diverged: {},
    branch: {}
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
