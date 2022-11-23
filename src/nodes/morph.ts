import { dictionary } from "../utils/dynamicTypes.js"
import { TypeNode } from "./node.js"

export const morph = (name: MorphName, node: TypeNode) => morphs[name](node)

export type MorphName = keyof typeof morphs

const morphs = {
    array: (node) => ({
        object: {
            subtype: "array",
            elements: node
        }
    })
} satisfies dictionary<(input: TypeNode) => TypeNode>
