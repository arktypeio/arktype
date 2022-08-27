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

    export type Infer<
        Def extends string,
        Ctx extends Node.InferenceContext
    > = TreeInfer<Parse<Def, Ctx["Dict"]>, Ctx>

    type TreeInfer<T, Ctx extends Node.InferenceContext> = T extends string
        ? InferTerminal<T, Ctx>
        : T extends Operator.Optional
        ? TreeInfer<T[0], Ctx> | undefined
        : T extends Operator.List
        ? TreeInfer<T[0], Ctx>[]
        : T extends Operator.Union
        ? TreeInfer<T[0], Ctx> | TreeInfer<T[2], Ctx>
        : T extends Operator.Intersection
        ? TreeInfer<T[0], Ctx> & TreeInfer<T[2], Ctx>
        : T extends Operator.Bound.SingleBoundNode
        ? TreeInfer<T[0], Ctx>
        : T extends Operator.Bound.DoubleBoundNode
        ? TreeInfer<T[2], Ctx>
        : never

    type ModifierNode<Child = unknown, Token = string> = [Child, Token]

    type BranchNode<Left = unknown, Right = unknown, Token = string> = [
        Left,
        Token,
        Right
    ]

    export type References<Def extends string, Dict> = TreeReferences<
        Parse<Def, Dict>
    >

    type TreeReferences<T> = T extends ModifierNode<infer Child>
        ? TreeReferences<Child>
        : T extends BranchNode<infer Left, infer Right>
        ? [...TreeReferences<Left>, ...TreeReferences<Right>]
        : T extends Operator.Bound.SingleBoundNode
        ? TreeReferences<T[0]>
        : T extends Operator.Bound.DoubleBoundNode
        ? TreeReferences<T[2]>
        : [T]

    export const parse: Node.parseFn<string> = (def, ctx) =>
        Naive.tryParse(def, ctx) ?? Main.parse(def, ctx)
}
