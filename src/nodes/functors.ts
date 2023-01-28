import type { TypeReference, TypeNode } from "./node"

// TODO: integrate with default scope
export const functors = {
    Array: (node: TypeReference): TypeNode => ({
        object: {
            subdomain: ["Array", node]
        }
    }),
    Set: (node: TypeReference): TypeNode => ({
        object: {
            subdomain: ["Set", node]
        }
    }),
    Map: (k: TypeReference, v: TypeReference): TypeNode => ({
        object: {
            subdomain: ["Map", k, v]
        }
    })
}
