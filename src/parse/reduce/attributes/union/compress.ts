import type { ScopeRoot } from "../../../../scope.js"
import { deepEquals, isEmpty } from "../../../../utils/deepEquals.js"
import type { dictionary } from "../../../../utils/dynamicTypes.js"
import type { requireKeys } from "../../../../utils/generics.js"
import { hasKey } from "../../../../utils/generics.js"
import type { AttributeKey, Attributes } from "../attributes.js"
import { expandAlias, isSubtype } from "../operations.js"

export const compress = (branches: Attributes[], scope: ScopeRoot) => {
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
            compressProps(branches as BranchesWithProps, base, scope)
        } else if (
            branches.every((branch) => deepEquals(branches[0][k], branch[k]))
        ) {
            base[k] = branches[0][k] as any
            for (const branch of branches) {
                delete branch[k]
            }
        }
    }
    base.branches = ["|", filterSubtypes(branches)]
    return base
}

const filterSubtypes = (branches: Attributes[]) => {
    const redundantIndices: Record<number, true> = {}
    for (let i = 0; i < branches.length; i++) {
        if (redundantIndices[i]) {
            continue
        }
        for (let j = i + 1; j < branches.length; j++) {
            if (isSubtype(branches[i], branches[j])) {
                redundantIndices[i] = true
                break
            } else if (isSubtype(branches[j], branches[i])) {
                redundantIndices[j] = true
            }
        }
    }
    return branches.filter((_, i) => !redundantIndices[i])
}

type BranchesWithProps = requireKeys<Attributes, "props">[]

const compressProps = (
    branches: BranchesWithProps,
    compressed: Attributes,
    scope: ScopeRoot
) => {
    const compressedProps: dictionary<Attributes> = {}
    for (const propKey in branches[0].props) {
        compressProp(branches, compressedProps, propKey, scope)
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

const compressProp = (
    branches: BranchesWithProps,
    compressedProps: dictionary<Attributes>,
    propKey: string,
    scope: ScopeRoot
) => {
    let allBranchesHaveProp = true
    const propValues = branches.map((branch) => {
        allBranchesHaveProp &&= branch.props[propKey] !== undefined
        return branch.props[propKey]
    })
    if (!allBranchesHaveProp) {
        return
    }
    const compressedProp = compress(propValues, scope)
    if (!isEmpty(compressedProp)) {
        for (const branch of branches) {
            if (isEmpty(branch.props[propKey])) {
                delete branch.props[propKey]
            }
        }
        compressedProps[propKey] = compressedProp
    }
}
