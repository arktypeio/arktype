import { pathToSegments } from "../utils/paths.js"
import type { AttributeKey, Type } from "./attributes.js"

export const queryPath = <k extends AttributeKey>(
    attributes: Type,
    path: string
) => {
    // const segments = pathToSegments(path)
    // let currentAttributes = attributes
    // for (const segment of segments) {
    //     if (currentAttributes.props?.[segment] === undefined) {
    //         return undefined
    //     }
    //     currentAttributes = currentAttributes.props[segment]
    // }
    // return currentAttributes[key]
}
