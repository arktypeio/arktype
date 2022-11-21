import { pathToSegments } from "../utils/paths.js"
import type { AttributeKey, AttributePath, Attributes } from "./attributes.js"

export const queryAttribute = <k extends AttributeKey>(
    attributes: Attributes,
    path: AttributePath<k>
) => {
    const segments = pathToSegments(path)
    const key = segments.pop() as k
    let currentAttributes = attributes
    for (const segment of segments) {
        if (currentAttributes.props?.[segment] === undefined) {
            return undefined
        }
        currentAttributes = currentAttributes.props[segment]
    }
    return currentAttributes[key]
}
