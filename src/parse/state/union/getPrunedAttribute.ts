import { isEmpty } from "../../../utils/deepEquals.js"
import type { Attributes, DisjointKey } from "../attributes.js"

export const getPrunedAttribute = (
    attributes: Attributes,
    path: string,
    key: DisjointKey
) => {
    const segments = path === "" ? [] : path.split(".")
    const traversed = traverseAttributes(attributes, segments)
    if (!traversed) {
        return "default"
    }
    const targetAttributes = traversed.pop()!
    const targetValue = targetAttributes[key]
    if (targetValue === undefined) {
        return "default"
    }
    delete targetAttributes[key]
    pruneTraversed(traversed, segments)
    return targetValue
}

const traverseAttributes = (
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

const pruneTraversed = (traversed: Attributes[], segments: string[]) => {
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
