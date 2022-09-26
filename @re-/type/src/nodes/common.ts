import type { Evaluate } from "@re-/tools"
import type { Base } from "./base.js"
import type { BranchAst } from "./branches/branch.js"
import type { IntersectionAst } from "./branches/intersection.js"
import type { UnionAst } from "./branches/union.js"
import type { ConstrainedAst } from "./constraints/constraint.js"
import type { InferDictionary } from "./structs/dictionary.js"
import type { Struct } from "./structs/struct.js"
import type { InferTuple } from "./structs/tuple.js"
import type { InferTerminal } from "./terminals/terminal.js"
import type { ArrayAst } from "./unaries/array.js"
import type { OptionalAst } from "./unaries/optional.js"
import type { UnaryAst } from "./unaries/unary.js"

export const pathToString = (path: Path) =>
    path.length === 0 ? "/" : path.join("/")

export type Segment = string | number
export type Path = Segment[]

export type NodeToString<Node, Result extends string = ""> = Node extends [
    infer Head,
    ...infer Tail
]
    ? NodeToString<Tail, `${Result}${NodeToString<Head>}`>
    : Node extends string
    ? `${Result}${Node}`
    : Result

export type StrAst = string | number | StrAst[]

export type strNode = Base.node & { ast: StrAst }

export namespace RootNode {
    export type UnaryToken = "?" | "[]" | TypelessToken

    export type BranchToken = "|" | "&"

    export type TypelessToken = ":"

    export type Infer<Ast, Resolutions> = Ast extends string
        ? InferTerminal<Ast, Resolutions>
        : Ast extends readonly unknown[]
        ? Ast[1] extends "?"
            ? Infer<Ast[0], Resolutions> | undefined
            : Ast[1] extends "[]"
            ? Infer<Ast[0], Resolutions>[]
            : Ast[1] extends "|"
            ? Infer<Ast[0], Resolutions> | Infer<Ast[2], Resolutions>
            : Ast[1] extends "&"
            ? Evaluate<Infer<Ast[0], Resolutions> & Infer<Ast[2], Resolutions>>
            : Ast[1] extends TypelessToken
            ? Infer<Ast[0], Resolutions>
            : InferTuple<Ast, Resolutions>
        : InferDictionary<Ast, Resolutions>

    export type References<Ast> = Ast extends string
        ? [Ast]
        : Ast extends readonly unknown[]
        ? Ast[1] extends UnaryToken
            ? References<Ast[0]>
            : Ast[1] extends BranchToken
            ? [...References<Ast[0]>, ...References<Ast[2]>]
            : Struct.References<Ast>
        : Struct.References<Ast>
}
