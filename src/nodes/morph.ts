import type { Dictionary } from "../utils/generics.js"
import type { Resolution, Node } from "./node.js"

export const morph = (name: MorphName, type: Node) => morphs[name](type)

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
} satisfies Dictionary<(input: Node) => Node>
