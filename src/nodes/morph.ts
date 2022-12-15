import type { Dictionary } from "../utils/generics.js"
import type { DomainNode, TypeOperand } from "./node.js"

export const morph = (name: MorphName, type: TypeOperand) => morphs[name](type)

export type MorphName = keyof typeof morphs

const morphs = {
    array: (node): DomainNode => ({
        object: {
            kind: "Array",
            propTypes: {
                number: node
            }
        }
    })
} satisfies Dictionary<(input: TypeOperand) => TypeOperand>
