import { isEmpty } from "../../../utils/deepEquals.js"
import { pathToSegments } from "../../../utils/paths.js"
import type {
    Attribute,
    Attributes
} from "../../reduce/attributes/attributes.js"
import type { DiscriminatedKey } from "./discriminate.js"

export const pruneDiscriminant = (
    attributes: Attributes,
    path: string,
    key: DiscriminatedKey
) => {
    const traversal = traverseToDiscriminant(attributes, path, key)
    if (!traversal.value) {
        return
    }
    delete traversal.traversed.pop()![key]
    pruneTraversedSegments(traversal.traversed, pathToSegments(path))
    return traversal.value
}

export const traverseToDiscriminant = <key extends DiscriminatedKey>(
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
                ? (top[key] as Attribute<key>)
                : undefined
    }
}

type DiscriminantTraversal<key extends DiscriminatedKey> = {
    traversed: Attributes[]
    value: Attribute<key> | undefined
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
