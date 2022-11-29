import { deepEquals, isEmpty } from "../../../utils/deepEquals.js"
import type { dictionary } from "../../../utils/dynamicTypes.js"
import type { requireKeys } from "../../../utils/generics.js"
import type {
    AttributeKey,
    Attributes
} from "../../reduce/attributes/attributes.js"

export const compress = (branches: Attributes[]): Attributes => {
    const compressed = compressBranchAttributes(branches)
    if (branches.every((branch) => !isEmpty(branch))) {
        compressed.branches = { kind: "some", of: branches }
    }
    return compressed
}

const compressBranchAttributes = (branches: Attributes[]) => {
    const compressed: Attributes = {}
    let k: AttributeKey
    for (k in branches[0]) {
        if (branches.some((branch) => branch[k] === undefined)) {
            continue
        }
        if (k === "props") {
            compressBranchProps(branches as BranchesWithProps, compressed)
        } else if (k === "branches") {
            // TODO: Anything we can do here?
            continue
        } else if (
            branches.every((branch) => deepEquals(branches[0][k], branch[k]))
        ) {
            compressed[k] = branches[0][k] as any
            for (const branch of branches) {
                delete branch[k]
            }
        }
    }
    return compressed
}

type BranchesWithProps = requireKeys<Attributes, "props">[]

const compressBranchProps = (
    branches: BranchesWithProps,
    compressed: Attributes
) => {
    const compressedProps: dictionary<Attributes> = {}
    for (const propKey in branches[0].props) {
        compressBranchProp(branches, compressedProps, propKey)
    }
    if (!isEmpty(compressedProps)) {
        for (const branch of branches) {
            if (isEmpty(branch.props)) {
                delete (branch as Attributes).props
            }
        }
        compressed.props = compressedProps
    }
}

const compressBranchProp = (
    branches: BranchesWithProps,
    compressedProps: dictionary<Attributes>,
    propKey: string
) => {
    let allBranchesHaveProp = true
    const propValues = branches.map((branch) => {
        allBranchesHaveProp &&= branch.props[propKey] !== undefined
        return branch.props[propKey]
    })
    if (!allBranchesHaveProp) {
        return
    }
    const compressedProp = compressBranchAttributes(propValues)
    if (!isEmpty(compressedProp)) {
        for (const branch of branches) {
            if (isEmpty(branch.props[propKey])) {
                delete branch.props[propKey]
            }
        }
        compressedProps[propKey] = compressedProp
    }
}
