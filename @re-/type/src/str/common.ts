import { Iterate } from "@re-/tools"
import * as Node from "../node/exports.js"
export * as Node from "../node/exports.js"

export type constrainable<constraints> = {
    constraints: constraints
}

export type NodeToString<
    Node,
    Result extends string = ""
> = Node extends Iterate<infer Next, infer Rest>
    ? NodeToString<Rest, `${Result}${NodeToString<Next>}`>
    : Node extends string
    ? `${Result}${Node}`
    : Result

export type StrNode = string | number | StrNode[]

export type strNode = Node.base & { tree: StrNode }
