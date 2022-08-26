import { Evaluate } from "@re-/tools"
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

    export type Root<Node> = Evaluate<[Node, ";"]>

    export type Infer<T, Ctx extends Node.InferenceContext> = T extends string
        ? InferTerminal<T, Ctx>
        : T extends Operator.Optional
        ? Infer<T[0], Ctx> | undefined
        : T extends Operator.List
        ? Infer<T[0], Ctx>[]
        : T extends Operator.Union
        ? Infer<T[0], Ctx> | Infer<T[2], Ctx>
        : T extends Operator.Intersection
        ? Infer<T[0], Ctx> & Infer<T[2], Ctx>
        : T extends Operator.Bound.SingleBoundNode
        ? Infer<T[0], Ctx>
        : T extends Operator.Bound.DoubleBoundNode
        ? Infer<T[2], Ctx>
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
        ? [...References<Left>, ...References<Right>]
        : T extends Operator.Bound.SingleBoundNode
        ? References<T[0]>
        : T extends Operator.Bound.DoubleBoundNode
        ? References<T[2]>
        : [T]

    export const parse: Node.parseFn<string> = (def, ctx) =>
        Naive.tryParse(def, ctx) ?? Main.parse(def, ctx)
}
