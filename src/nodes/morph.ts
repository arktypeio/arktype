import { record } from "../utils/dataTypes.js"
import { Node } from "./node.js"

export const morph = (name: MorphName, node: Node) => morphs[name](node)

export type MorphName = keyof typeof morphs

const morphs = {
    array: (node) => ({
        object: {
            subtype: {
                kind: "array",
                elements: node
            }
        }
    })
} satisfies record<(input: Node) => Node>
