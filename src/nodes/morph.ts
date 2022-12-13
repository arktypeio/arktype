import type { Dictionary } from "../utils/generics.js"
import type { TypeNode, TypeTree } from "./node.js"

export const morph = (name: MorphName, type: TypeNode) => morphs[name](type)

export type MorphName = keyof typeof morphs

const morphs = {
    array: (node): TypeTree => ({
        object: {
            kind: "Array",
            propTypes: {
                number: node
            }
        }
    })
} satisfies Dictionary<(input: TypeNode) => TypeNode>
