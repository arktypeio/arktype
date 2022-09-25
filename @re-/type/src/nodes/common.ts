import type { Iterate } from "@re-/tools"
import type { Str } from "../parser/str/str.js"
import type { Base } from "./base.js"
import type { IntersectionAst } from "./branches/intersection.js"
import type { UnionAst } from "./branches/union.js"
import type { ConstrainedAst } from "./constraints/constraint.js"
import type { Struct } from "./structs/struct.js"
import type { InferTupleAst } from "./structs/tuple.js"
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
    export type InferAst<
        Ast,
        Ctx extends Base.InferenceContext
    > = Ast extends string
        ? InferTerminal<Ast, Ctx>
        : Ast extends readonly unknown[]
        ? Ast extends OptionalAst<infer Child>
            ? InferAst<Child, Ctx> | undefined
            : Ast extends ArrayAst<infer Child>
            ? InferAst<Child, Ctx>[]
            : Ast extends UnionAst<infer Left, infer Right>
            ? InferAst<Left, Ctx> | InferAst<Right, Ctx>
            : Ast extends IntersectionAst<infer Left, infer Right>
            ? InferAst<Left, Ctx> & InferAst<Right, Ctx>
            : // TODO: Change constraints?
            Ast extends ConstrainedAst<infer Child>
            ? InferAst<Child, Ctx>
            : InferTupleAst<Ast, Ctx>
        : Struct.InferAst<Ast, Ctx>

    // export type InferAst<
    //     Ast,
    //     Ctx extends Base.InferenceContext
    // > = unknown extends Ast
    //     ? Ast
    //     : Ast extends string | unknown[]
    //     ? Str.TreeInfer<Ast, Ctx>
    //     : Struct.Infer<Ast, Ctx>

    export type References<
        Def,
        Dict,
        PreserveStructure extends boolean
    > = Def extends string
        ? Str.References<Def, Dict>
        : Struct.References<Def, Dict, PreserveStructure>
}
