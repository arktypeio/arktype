import type { Iterate } from "@re-/tools"
import type { Str } from "../parser/str/str.js"
import type { Base } from "./base.js"
import type { Struct } from "./structs/struct.js"

export const pathToString = (path: Path) =>
    path.length === 0 ? "/" : path.join("/")

export type Segment = string | number
export type Path = Segment[]

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

export namespace RootNode {
    export type Infer<
        Def,
        Ctx extends Base.InferenceContext
    > = unknown extends Def
        ? Def
        : Def extends string
        ? Str.Infer<Def, Ctx>
        : Struct.Infer<Def, Ctx>

    export type References<
        Def,
        Dict,
        PreserveStructure extends boolean
    > = Def extends string
        ? Str.References<Def, Dict>
        : Struct.References<Def, Dict, PreserveStructure>
}
