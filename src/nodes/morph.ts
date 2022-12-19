import type { Dictionary } from "../utils/generics.js"
import type { TypeNode, TypeSet } from "./node.js"

export const morph = (name: MorphName, type: TypeNode) => morphs[name](type)

export type MorphName = keyof typeof morphs

const morphs = {
    array: (node): TypeSet => ({
        object: {
            kind: "Array",
            props: {
                mapped: {
                    number: node
                }
            }
        }
    })
} satisfies Dictionary<(input: TypeNode) => TypeNode>
