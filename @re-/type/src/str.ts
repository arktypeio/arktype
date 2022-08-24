import { Node, Parser } from "./common.js"
import * as Main from "./main.js"
import * as Naive from "./naive.js"
import { InferTerminalStr } from "./operand/terminal.js"

export namespace Str {
    export type Parse<Def extends string, Dict> = Naive.TryParse<Def, Dict>

    export type Validate<Def extends string, Dict> = Parse<
        Def,
        Dict
    > extends Parser.Tokens.ErrorToken<infer Message>
        ? Message
        : Def

    export type Infer<T, Ctx extends Node.InferenceContext> = T extends string
        ? InferTerminalStr<T, Ctx>
        : T extends [infer Child, "?"]
        ? Infer<Child, Ctx> | undefined
        : T extends [infer Child, "[]"]
        ? Infer<Child, Ctx>[]
        : T extends [infer Left, "|", infer Right]
        ? Infer<Left, Ctx> | Infer<Right, Ctx>
        : T extends [infer Left, "&", infer Right]
        ? Infer<Left, Ctx> & Infer<Right, Ctx>
        : T extends [infer Bounded, unknown, unknown]
        ? Infer<Bounded, Ctx>
        : T extends [unknown, unknown, infer Bounded, unknown, unknown]
        ? Infer<Bounded, Ctx>
        : never

    type ModifiedNode<Child = unknown, Token extends string = string> = [
        Child,
        Token
    ]

    type BranchNode<
        Left = unknown,
        Token extends string = string,
        Right = unknown
    > = [Left, Token, Right]

    export type References<T> = T extends [infer Child, unknown]
        ? References<Child>
        : T extends [infer Left, unknown, infer Right]
        ? [...References<Right>, ...References<Left>]
        : T extends [unknown, unknown, infer Bounded, unknown, unknown]
        ? References<Bounded>
        : [T]

    export const parse: Parser.ParseFn<string> = (def, ctx) =>
        Naive.tryParse(def, ctx) ?? Main.parse(def, ctx)
}
