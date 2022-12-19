import type { TypeNode } from "./node.js"

export type FlatCondition = string | FlatCondition[]

export const flatten = (node: TypeNode): string | unknown[] => {
    if (typeof node === "string") {
        return node
    }
    return []
}
