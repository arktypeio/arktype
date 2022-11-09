import { isEmpty } from "../../../utils/deepEquals.js"
import type {
    AttributeBranches,
    AttributeKey,
    Attributes,
    AttributeTypes
} from "../../state/attributes.js"
import type {
    DiscriminatedBranchTuple,
    DiscriminatedKey
} from "./discriminate.js"

// /* eslint-disable max-lines-per-function */
// const pruneBranches = (
//     [token, ...branches]: AttributeBranches,
//     intersection: Attributes
// ) => {
//     if (token === "?") {
//         const [path, key, cases] = branches as DiscriminatedBranchTuple
//         if (key in intersection) {
//             const disjointValue = intersection[
//                 key
//             ] as AttributeTypes[DiscriminatedKey]
//             if (disjointValue in cases) {
//                 delete cases[disjointValue]
//             }
//         }
//     } else {
//         for (const branch of branches as Attributes[]) {
//         }
//     }
// }

// const pruneAttributes = (branch: Attributes, pruned: Attributes) => {
//     let k: AttributeKey
//     for (k in pruned) {
//         if (k === "props") {
//             if (!branch.props) {
//                 continue
//             }
//             for (const propKey in pruned.props) {
//                 if (propKey in branch.props) {
//                     pruneAttributes(
//                         branch.props[propKey],
//                         pruned.props[propKey]
//                     )
//                     if (isEmpty(branch.props[propKey])) {
//                         delete branch.props[propKey]
//                     }
//                 }
//             }
//             if (isEmpty(branch.props)) {
//                 delete branch.props
//             }
//         } else if (k === "branches") {
//             if (!branch.branches) {
//                 continue
//             }
//             // TODO: ?
//         } else {
//             if (!branch[k]) {
//                 continue
//             }
//         }
//     }
// }

// const pruneTraversedBranches = (traversed: Attributes[]) => {
//     for (let i = traversed.length - 1; i >= 0; i--) {
//         const branches = traversed[i].branches!
//         if (branches.length > 2) {
//             return
//         }
//         if (branches.length === 2) {
//         }
//         delete traversed[i].branches
//     }
// }

export const prunePath = (
    attributes: Attributes,
    path: string,
    key: DiscriminatedKey
) => {
    const segments = path === "" ? [] : path.split(".")
    const traversed = traversePropAttributes(attributes, segments)
    if (!traversed) {
        return "unset"
    }
    const targetAttributes = traversed.pop()!
    const targetValue = targetAttributes[key]
    if (targetValue === undefined) {
        return "unset"
    }
    delete targetAttributes[key]
    pruneTraversedSegments(traversed, segments)
    return targetValue
}

const traversePropAttributes = (
    root: Attributes,
    segments: string[]
): Attributes[] | undefined => {
    const traversed: Attributes[] = [root]
    let top: Attributes = root
    for (const segment of segments) {
        if (!top.props?.[segment]) {
            return
        }
        top = top.props[segment]
        traversed.push(top)
    }
    return traversed
}

const pruneTraversedSegments = (
    traversed: Attributes[],
    segments: string[]
) => {
    for (let i = traversed.length - 1; i >= 0; i--) {
        const traversedProps = traversed[i].props!
        if (!isEmpty(traversedProps[segments[i]])) {
            return
        }
        delete traversedProps[segments[i]]
        if (!isEmpty(traversedProps)) {
            return
        }
        delete traversed[i].props
    }
}
