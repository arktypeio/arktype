import type { ResolvedNode, TypeNode } from "./node"

export const functors = {
    Array: (node: TypeNode): ResolvedNode => ({
        object: {
            objectKind: ["Array", node]
        }
    }),
    Set: (node: TypeNode): ResolvedNode => ({
        object: {
            objectKind: ["Set", node]
        }
    }),
    Map: (k: TypeNode, v: TypeNode): ResolvedNode => ({
        object: {
            objectKind: ["Map", k, v]
        }
    })
}
