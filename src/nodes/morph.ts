import type { TypeNode, TypeSet } from "./node.js"

export const morph = (name: MorphName, type: TypeNode) => morphs[name](type)

export type MorphName = keyof typeof morphs

const morphs = {
    // TODO: array of?
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
} satisfies { [morphName: string]: (input: TypeNode) => TypeNode }
