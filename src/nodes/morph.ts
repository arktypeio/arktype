import type { dict } from "../utils/generics.js"
import type { Node } from "./node.js"

export const morph = (name: MorphName, node: Node) => morphs[name](node)

export type MorphName = keyof typeof morphs

const morphs = {
    array: (node): Node => ({
        type: "object",
        subtype: "Array",
        children: {
            propTypes: {
                number: node
            }
        }
    })
} satisfies dict<(input: Node) => Node>
