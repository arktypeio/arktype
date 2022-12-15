import type { Dictionary } from "../utils/generics.js"
import type { RawTypeRoot, TypeSet } from "./node.js"

export const morph = (name: MorphName, type: RawTypeRoot) => morphs[name](type)

export type MorphName = keyof typeof morphs

const morphs = {
    array: (node): TypeSet => ({
        object: {
            kind: "Array",
            propTypes: {
                number: node
            }
        }
    })
} satisfies Dictionary<(input: RawTypeRoot) => RawTypeRoot>
