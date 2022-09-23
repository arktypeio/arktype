import type { Iterate } from "@re-/tools"
import type { Base } from "./base.js"

export type Segment = string | number
export type Path = Segment[]

export const pathToString = (path: Path) =>
    path.length === 0
        ? "/"
        : path.length === 1 && typeof path[0] === "number"
        ? `Item ${path[0]}`
        : path.join("/")

export type NodeToString<
    Node,
    Result extends string = ""
> = Node extends Iterate<infer Next, infer Rest>
    ? NodeToString<Rest, `${Result}${NodeToString<Next>}`>
    : Node extends string
    ? `${Result}${Node}`
    : Result

export type StrAst = string | number | StrAst[]

export type strNode = Base.node & { ast: StrAst }
