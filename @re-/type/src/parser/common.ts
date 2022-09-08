import { Iterate } from "@re-/tools"
import type { base } from "../nodes/base/base.js"

export type NodeToString<
    Node,
    Result extends string = ""
> = Node extends Iterate<infer Next, infer Rest>
    ? NodeToString<Rest, `${Result}${NodeToString<Next>}`>
    : Node extends string
    ? `${Result}${Node}`
    : Result

export type StrNode = string | number | StrNode[]

export type strNode = base & { tree: StrNode }
