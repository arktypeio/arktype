import type { Iterate } from "@re-/tools"
import type { Base } from "../../nodes/base.js"
export * from "../common.js"

export type NodeToString<
    Node,
    Result extends string = ""
> = Node extends Iterate<infer Next, infer Rest>
    ? NodeToString<Rest, `${Result}${NodeToString<Next>}`>
    : Node extends string
    ? `${Result}${Node}`
    : Result

export type StrNode = string | number | StrNode[]

export type strNode = Base.node & { tree: StrNode }
