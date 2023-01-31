import type { ResolvedNode, TypeNode } from "./node"

// TODO: integrate with default scope
export const functors = {
    Array: (node: TypeNode): ResolvedNode => ({
        object: {
            subdomain: ["Array", node]
        }
    }),
    Set: (node: TypeNode): ResolvedNode => ({
        object: {
            subdomain: ["Set", node]
        }
    }),
    Map: (k: TypeNode, v: TypeNode): ResolvedNode => ({
        object: {
            subdomain: ["Map", k, v]
        }
    })
}
