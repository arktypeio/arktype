import { deepEquals, isEmpty } from "../../../utils/deepEquals.js"
import type { dictionary } from "../../../utils/dynamicTypes.js"
import type { requireKeys } from "../../../utils/generics.js"
import type { AttributeKey, Attributes } from "../../state/attributes.js"

export const compressAndPrune = (branches: Attributes[]): Attributes => {
    const compressed: Attributes = {}
    let k: AttributeKey
    for (k in branches[0]) {
        if (branches.some((branch) => branch[k] === undefined)) {
            continue
        }
        if (k === "props") {
            compressAndPruneProps(compressed, branches as BranchesWithProps)
        } else {
            if (
                branches.every((branch) =>
                    deepEquals(branches[0][k], branch[k])
                )
            ) {
                compressed[k] = branches[0][k] as any
                for (const branch of branches) {
                    delete branch[k]
                }
            }
        }
    }
    return compressed
}

type BranchesWithProps = requireKeys<Attributes, "props">[]

const compressAndPruneProps = (
    compressed: Attributes,
    branches: BranchesWithProps
) => {
    const compressedProps = compressProps(branches)
    if (!isEmpty(compressedProps)) {
        for (let i = 0; i < branches.length; i++) {
            for (const propKey in compressedProps) {
                if (isEmpty(branches[i].props[propKey])) {
                    delete branches[i].props[propKey]
                }
            }
            if (isEmpty(branches[i].props)) {
                delete (branches[i] as Attributes).props
            }
        }
        compressed.props = compressedProps
    }
}

const compressProps = (branches: BranchesWithProps): dictionary<Attributes> => {
    const compressedProps: dictionary<Attributes> = {}
    for (const propKey in branches[0].props) {
        let allBranchesHaveProp = true
        const propValues = branches.map((branch) => {
            allBranchesHaveProp &&= branch.props[propKey] !== undefined
            return branch.props[propKey]
        })
        if (!allBranchesHaveProp) {
            continue
        }
        const mergedProp = compressAndPrune(propValues)
        if (!isEmpty(mergedProp)) {
            compressedProps[propKey] = mergedProp
        }
    }
    return compressedProps
}
