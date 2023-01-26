import type { TypeNode, TypeResolution } from "./node"

// TODO: integrate with default scope
export const functors = {
    Array: (node: TypeNode): TypeResolution => ({
        object: {
            subdomain: ["Array", node]
        }
    }),
    Set: (node: TypeNode): TypeResolution => ({
        object: {
            subdomain: ["Set", node]
        }
    }),
    Map: (k: TypeNode, v: TypeNode): TypeResolution => ({
        object: {
            subdomain: ["Map", k, v]
        }
    })
}
