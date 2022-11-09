import { isEmpty } from "../../../utils/deepEquals.js"
import type {
    AttributeBranches,
    AttributeKey,
    Attributes,
    AttributeTypes,
    DisjointKey
} from "../../state/attributes.js"

export const pruneBranches = <k extends AttributeKey>(
    branches: AttributeBranches,
    k: k,
    v: AttributeTypes[k]
) => {
    if (branches[0] === "?") {
        if (k === branches[2]) {
            const [, path, key, cases] = branches
            const disjointValue = v as AttributeTypes[DisjointKey]
            if (disjointValue in cases) {
                delete branches[3][disjointValue]
            }
        }
    } else {
        for (let i = 1; i++; i < branches.length) {}
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

export const prunePath = (
    attributes: Attributes,
    path: string,
    key: DisjointKey
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
