import { Iterate } from "@re-/tools"
export * as Node from "../node/exports.js"
export * as Utils from "../utils.js"
export * as Parser from "./parser/index.js"

export type NodeToString<T, Result extends string = ""> = T extends Iterate<
    infer Next,
    infer Rest
>
    ? NodeToString<Rest, `${Result}${NodeToString<Next>}`>
    : T extends string | number
    ? `${Result}${T}`
    : Result
