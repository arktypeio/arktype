import { dictionary } from "../utils/dynamicTypes.js"
import { TypeNode } from "./node.js"

export const morph = (name: MorphName, input: TypeNode) => morphs[name](input)

export type MorphName = keyof typeof morphs

const morphs = {
    array: (input) => ({
        object: {
            subtype: "array",
            elements: input
        }
    })
} satisfies dictionary<(input: TypeNode) => TypeNode>
