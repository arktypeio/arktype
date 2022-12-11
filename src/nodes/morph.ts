import type { Dictionary } from "../utils/generics.js"
import type { TypeNode, Resolution } from "./node.js"

export const morph = (name: MorphName, type: TypeNode) => morphs[name](type)

export type MorphName = keyof typeof morphs

const morphs = {
    array: (type): Resolution => ({
        object: {
            subtype: "Array",
            propTypes: {
                number: type
            }
        }
    })
} satisfies Dictionary<(input: TypeNode) => TypeNode>
