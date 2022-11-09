import { deepEquals, isEmpty } from "../../../utils/deepEquals.js"
import type { dictionary } from "../../../utils/dynamicTypes.js"
import type { requireKeys } from "../../../utils/generics.js"
import type { AttributeKey, Attributes } from "../../state/attributes.js"

export const deepEqualIntersection = (branches: Attributes[]): Attributes => {
    const intersection: Attributes = {}
    let k: AttributeKey
    for (k in branches[0]) {
        if (branches.some((branch) => branch[k] === undefined)) {
            continue
        }
        if (k === "props") {
            const propsIntersection = deepEqualPropsIntersection(
                branches as BranchesWithProps
            )
            if (!isEmpty(propsIntersection)) {
                intersection.props = propsIntersection
            }
        } else {
            if (
                branches.every((branch) =>
                    deepEquals(branches[0][k], branch[k])
                )
            ) {
                intersection[k] = branches[0][k] as any
            }
        }
    }
    return intersection
}

type BranchesWithProps = requireKeys<Attributes, "props">[]

const deepEqualPropsIntersection = (
    branches: BranchesWithProps
): dictionary<Attributes> => {
    const propsIntersection: dictionary<Attributes> = {}
    for (const propKey in branches[0].props) {
        let allBranchesHaveProp = true
        const propValues = branches.map((branch) => {
            allBranchesHaveProp &&= branch.props[propKey] !== undefined
            return branch.props[propKey]
        })
        if (!allBranchesHaveProp) {
            continue
        }
        const mergedProp = deepEqualIntersection(propValues)
        if (!isEmpty(mergedProp)) {
            propsIntersection[propKey] = mergedProp
        }
    }
    return propsIntersection
}
