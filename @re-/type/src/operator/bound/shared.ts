import { Node } from "../../common.js"
import type { Comparator } from "./parse.js"

export type BoundChecker = (y: number) => boolean

export const createBoundChecker = (token: Comparator, x: number) => {
    switch (token) {
        case "<=":
            return (y: number) => y <= x
        case ">=":
            return (y: number) => y >= x
        case "<":
            return (y: number) => y < x
        case ">":
            return (y: number) => y > x
        case "==":
            return (y: number) => y === x
        default:
            throw new Error(`Unexpected comparator ${token}.`)
    }
}

export interface BoundableNode extends Node.Base {
    boundBy?: string
    toBound(value: unknown): number
}

export type BoundableValue = number | string | unknown[]

export const isBoundable = (node: Node.Base): node is BoundableNode =>
    "toBound" in node
