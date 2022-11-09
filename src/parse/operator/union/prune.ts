import { isEmpty } from "../../../utils/deepEquals.js"
import { pathToSegments } from "../../../utils/paths.js"
import type {
    AttributeBranches,
    AttributeKey,
    Attributes,
    AttributeTypes
} from "../../state/attributes.js"
import type { DiscriminatedKey, DiscriminatedValue } from "./discriminate.js"

/* eslint-disable max-lines-per-function */
const pruneBranches = (
    branches: AttributeBranches,
    intersection: Attributes
) => {
    if (branches[0] === "?") {
        const [, path, key, cases] = branches
        const intersectionCase = {}
        if (key in intersection) {
            const disjointValue = intersection[
                key
            ] as AttributeTypes[DiscriminatedKey]
            if (disjointValue in cases) {
                delete cases[disjointValue]
            }
        }
    } else {
        for (let i = 1; i < branches.length; i++) {}
    }
}

const pruneAttributes = (branch: Attributes, pruned: Attributes) => {
    let k: AttributeKey
    for (k in pruned) {
        if (k === "props") {
            if (!branch.props) {
                continue
            }
            for (const propKey in pruned.props) {
                if (propKey in branch.props) {
                    pruneAttributes(
                        branch.props[propKey],
                        pruned.props[propKey]
                    )
                    if (isEmpty(branch.props[propKey])) {
                        delete branch.props[propKey]
                    }
                }
            }
            if (isEmpty(branch.props)) {
                delete branch.props
            }
        } else if (k === "branches") {
            if (!branch.branches) {
                continue
            }
            // TODO: ?
        } else {
            if (!branch[k]) {
                continue
            }
        }
    }
}

const pruneTraversedBranches = (traversed: Attributes[]) => {
    for (let i = traversed.length - 1; i >= 0; i--) {
        const branches = traversed[i].branches!
        if (branches.length > 2) {
            return
        }
        if (branches.length === 2) {
        }
        delete traversed[i].branches
    }
}

export const pruneDiscriminant = (
    attributes: Attributes,
    path: string,
    key: DiscriminatedKey
) => {
    const traversal = traverseToDiscriminant(attributes, path, key)
    if (traversal.value === "unset") {
        return "unset"
    }
    delete traversal.traversed.pop()![key]
    pruneTraversedSegments(traversal.traversed, pathToSegments(path))
    return traversal.value
}

type DiscriminantTraversal<key extends DiscriminatedKey> = {
    traversed: Attributes[]
    value: DiscriminatedValue<key>
}

const traverseToDiscriminant = <key extends DiscriminatedKey>(
    attributes: Attributes,
    path: string,
    key: key
): DiscriminantTraversal<key> => {
    const segments = pathToSegments(path)
    const traversal = traverseAttributeProps(attributes, segments)
    const top = traversal.traversed[traversal.traversed.length - 1]
    return {
        traversed: traversal.traversed,
        value:
            traversal.complete && top[key]
                ? (top[key] as DiscriminatedValue<key>)
                : "unset"
    }
}

type AttributeTraversal = {
    traversed: Attributes[]
    complete: boolean
}

const traverseAttributeProps = (
    root: Attributes,
    segments: string[]
): AttributeTraversal => {
    const traversed: Attributes[] = [root]
    let top: Attributes = root
    for (const segment of segments) {
        if (!top.props?.[segment]) {
            return { traversed, complete: false }
        }
        top = top.props[segment]
        traversed.push(top)
    }
    return {
        traversed,
        complete: true
    }
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
