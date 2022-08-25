import { Node } from "./common.js"
import * as Main from "./main.js"
import * as Naive from "./naive.js"
import { InferTerminal } from "./operand/index.js"
import { Operator } from "./operator/index.js"

export namespace Str {
    export type Parse<Def extends string, Dict> = Naive.TryParse<Def, Dict>

    export type Validate<Def extends string, Dict> = Parse<
        Def,
        Dict
    > extends Node.ParseError<infer Message>
        ? Message
        : Def

    export type Infer<T, Ctx extends Node.InferenceContext> = T extends string
        ? InferTerminal<T, Ctx>
        : T extends [infer Child, "?"]
        ? Infer<Child, Ctx> | undefined
        : T extends [infer Child, "[]"]
        ? Infer<Child, Ctx>[]
        : T extends [infer Left, "|", infer Right]
        ? Infer<Left, Ctx> | Infer<Right, Ctx>
        : T extends [infer Left, "&", infer Right]
        ? Infer<Left, Ctx> & Infer<Right, Ctx>
        : T extends Operator.Bound.SingleBoundNode<infer Bounded>
        ? Infer<Bounded, Ctx>
        : T extends Operator.Bound.DoubleBoundNode<infer Bounded>
        ? Infer<Bounded, Ctx>
        : never

    type ModifierNode<Child = unknown, Token = string> = [Child, Token]

    type BranchNode<Left = unknown, Right = unknown, Token = string> = [
        Left,
        Token,
        Right
    ]

    export type References<T> = T extends ModifierNode<infer Child>
        ? References<Child>
        : T extends BranchNode<infer Left, infer Right>
        ? [...References<Right>, ...References<Left>]
        : T extends Operator.Bound.SingleBoundNode<infer Bounded>
        ? References<Bounded>
        : T extends Operator.Bound.DoubleBoundNode<infer Bounded>
        ? References<Bounded>
        : [T]

    export const parse: Node.parseFn<string> = (def, ctx) =>
        Naive.tryParse(def, ctx) ?? Main.parse(def, ctx)
}
