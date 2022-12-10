import type { Dictionary } from "../utils/generics.js"
import type { Node, Type } from "./node.js"

export const morph = (name: MorphName, type: Type) => morphs[name](type)

export type MorphName = keyof typeof morphs

const morphs = {
    array: (type): Node => ({
        object: {
            subtype: "Array",
            propTypes: {
                number: type
            }
        }
    })
} satisfies Dictionary<(input: Type) => Type>
