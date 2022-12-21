import type { TypeNode, TypeSet } from "./node.js"

export const morph = (name: MorphName, type: TypeNode) => morphs[name](type)

export type MorphName = keyof typeof morphs

const morphs = {
    array: (node): TypeSet => ({
        object: {
            subdomain: ["Array", node]
        }
    })
} satisfies { [morphName: string]: (input: TypeNode) => TypeNode }
