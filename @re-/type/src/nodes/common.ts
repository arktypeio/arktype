import type { Iterate } from "@re-/tools"
import type { Str } from "../parser/str/str.js"
import type { Base } from "./base.js"
import type { IntersectionAst } from "./branches/intersection.js"
import type { UnionAst } from "./branches/union.js"
import type { ConstrainedAst } from "./constraints/constraint.js"
import type { InferDictionary } from "./structs/dictionary.js"
import type { Struct } from "./structs/struct.js"
import type { InferTuple } from "./structs/tuple.js"
import type { InferTerminal } from "./terminals/terminal.js"
import type { ArrayAst } from "./unaries/array.js"
import type { OptionalAst } from "./unaries/optional.js"

export const pathToString = (path: Path) =>
    path.length === 0 ? "/" : path.join("/")

export type Segment = string | number
export type Path = Segment[]

export type NodeToString<
    Node,
    Result extends string = ""
> = Node extends Iterate<infer Head, infer Tail>
    ? NodeToString<Tail, `${Result}${NodeToString<Head>}`>
    : Node extends string
    ? `${Result}${Node}`
    : Result

export type StrAst = string | number | StrAst[]

export type strNode = Base.node & { ast: StrAst }

export namespace RootNode {
    export type Infer<Ast, Space> = Ast extends string
        ? InferTerminal<Ast, Space>
        : Ast extends readonly unknown[]
        ? Ast extends OptionalAst<infer Child>
            ? Infer<Child, Space> | undefined
            : Ast extends ArrayAst<infer Child>
            ? Infer<Child, Space>[]
            : Ast extends UnionAst<infer Left, infer Right>
            ? Infer<Left, Space> | Infer<Right, Space>
            : Ast extends IntersectionAst<infer Left, infer Right>
            ? Infer<Left, Space> & Infer<Right, Space>
            : // TODO: Change constraints?
            Ast extends ConstrainedAst<infer Child>
            ? Infer<Child, Space>
            : InferTuple<Ast, Space>
        : InferDictionary<Ast, Space>

    export type References<
        Def,
        Dict,
        PreserveStructure extends boolean
    > = Def extends string
        ? Str.References<Def, Dict>
        : Struct.References<Def, Dict, PreserveStructure>
}
