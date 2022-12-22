import type { TypeNode, TypeSet } from "./node.js"

export const arrayOf = (node: TypeNode): TypeSet => ({
    object: {
        subdomain: ["Array", node]
    }
})
