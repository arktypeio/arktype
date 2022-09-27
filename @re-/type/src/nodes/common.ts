import type { Evaluate } from "@re-/tools"
import type {
    BinaryToken,
    TypelessToken,
    UnaryToken
} from "../parser/common.js"
import type { InferDictionary } from "./structs/dictionary.js"
import type { Struct } from "./structs/struct.js"
import type { InferTuple } from "./structs/tuple.js"
import type { InferTerminal } from "./terminals/terminal.js"

export const pathToString = (path: Path) =>
    path.length === 0 ? "/" : path.join("/")

export type Segment = string | number
export type Path = Segment[]

// TODO: Update to include objects
export type NodeToString<Node, Result extends string = ""> = Node extends [
    infer Head,
    ...infer Tail
]
    ? NodeToString<Tail, `${Result}${NodeToString<Head>}`>
    : Node extends string
    ? `${Result}${Node}`
    : Result

export namespace RootNode {
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
            : Ast[1] extends BinaryToken
            ? [...References<Ast[0]>, ...References<Ast[2]>]
            : Struct.References<Ast>
        : Struct.References<Ast>
}
