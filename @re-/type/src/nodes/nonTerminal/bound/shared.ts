import { Base } from "../../base/index.js"
import type { Bound } from "./parse.js"

export type BoundChecker = (y: number) => boolean

export const createBoundChecker = (token: Bound.Token, x: number) => {
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
            throw new Error(`Unexpected bound token ${token}.`)
    }
}

export interface BoundableNode extends Base.Node {
    boundBy?: string
    toBound(value: unknown): number
}

export type BoundableValue = number | string | unknown[]

export const isBoundable = (node: Base.Node): node is BoundableNode =>
    "toBound" in node
