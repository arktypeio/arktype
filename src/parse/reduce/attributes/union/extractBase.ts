import type { DynamicScope } from "../../../../scope.js"
import { deepEquals, isEmpty } from "../../../../utils/deepEquals.js"
import type { dictionary } from "../../../../utils/dynamicTypes.js"
import type { requireKeys } from "../../../../utils/generics.js"
import { hasKey } from "../../../../utils/generics.js"
import { expandAlias } from "../alias.js"
import type { AttributeKey, Attributes } from "../attributes.js"

export const extractBase = (branches: Attributes[], scope: DynamicScope) => {
    if (branches.length === 1) {
        return branches[0]
    }
    const base: Attributes = {}
    for (const branch of branches) {
        if (hasKey(branch, "alias")) {
            expandAlias(branch, scope)
        }
    }
    let k: AttributeKey
    for (k in branches[0]) {
        if (branches.some((branch) => branch[k] === undefined)) {
            continue
        }
        if (k === "props") {
            extractBaseProps(branches as BranchesWithProps, base, scope)
        } else if (
            branches.every((branch) => deepEquals(branches[0][k], branch[k]))
        ) {
            base[k] = branches[0][k] as any
            for (const branch of branches) {
                delete branch[k]
            }
        }
    }
    return base
}

type BranchesWithProps = requireKeys<Attributes, "props">[]

const extractBaseProps = (
    branches: BranchesWithProps,
    compressed: Attributes,
    scope: DynamicScope
) => {
    const compressedProps: dictionary<Attributes> = {}
    for (const propKey in branches[0].props) {
        extractBaseProp(branches, compressedProps, propKey, scope)
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

const extractBaseProp = (
    branches: BranchesWithProps,
    compressedProps: dictionary<Attributes>,
    propKey: string,
    scope: DynamicScope
) => {
    let allBranchesHaveProp = true
    const propValues = branches.map((branch) => {
        allBranchesHaveProp &&= branch.props[propKey] !== undefined
        return branch.props[propKey]
    })
    if (!allBranchesHaveProp) {
        return
    }
    const compressedProp = extractBase(propValues, scope)
    if (!isEmpty(compressedProp)) {
        for (const branch of branches) {
            if (isEmpty(branch.props[propKey])) {
                delete branch.props[propKey]
            }
        }
        compressedProps[propKey] = compressedProp
    }
}
