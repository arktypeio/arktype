import type { TypeNode, TypeSet } from "./node.ts"

export const arrayOf = (node: TypeNode): TypeSet => ({
    object: {
        subdomain: ["Array", node]
    }
})
