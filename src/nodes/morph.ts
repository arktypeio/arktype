import { dict } from "../utils/dataTypes.js"
import { Node } from "./node.js"

export const morph = (name: MorphName, node: Node) => morphs[name](node)

export type MorphName = keyof typeof morphs

const morphs = {
    array: (node) => ({
        object: {
            subtype: "array",
            elements: node
        }
    })
} satisfies dict<(input: Node) => Node>
