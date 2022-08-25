import { Iterate } from "@re-/tools"
import * as Node from "../node/exports.js"
export * as Node from "../node/exports.js"
export * as Utils from "../utils.js"
export * as Parser from "./parser/index.js"

export type NodeToString<T, Result extends string = ""> = T extends Iterate<
    infer Next,
    infer Rest
>
    ? NodeToString<Rest, `${Result}${NodeToString<Next>}`>
    : T extends string
    ? `${Result}${T}`
    : Result

export type StrTree = string | StrTree[]

export type strNode = Node.base & { tree: StrTree }
