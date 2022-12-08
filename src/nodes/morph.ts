import type { Dictionary } from "../utils/generics.js"
import type { Node } from "./node.js"

export const morph = (name: MorphName, node: Node) => morphs[name](node)

export type MorphName = keyof typeof morphs

const morphs = {
    array: (node): Node => ({
        object: {
            subtype: "Array",
            propTypes: {
                number: node
            }
        }
    })
} satisfies Dictionary<(input: Node) => Node>
