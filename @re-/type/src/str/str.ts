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

    export type Infer<
        Tree,
        Ctx extends Node.InferenceContext
    > = Tree extends string
        ? InferTerminal<Tree, Ctx>
        : Tree extends Operator.Optional
        ? Infer<Tree[0], Ctx> | undefined
        : Tree extends Operator.List
        ? Infer<Tree[0], Ctx>[]
        : Tree extends Operator.Union
        ? Infer<Tree[0], Ctx> | Infer<Tree[2], Ctx>
        : Tree extends Operator.Intersection
        ? Infer<Tree[0], Ctx> & Infer<Tree[2], Ctx>
        : Tree extends Operator.Bound.SingleBoundNode
        ? Infer<Tree[0], Ctx>
        : Tree extends Operator.Bound.DoubleBoundNode
        ? Infer<Tree[2], Ctx>
        : never

    type ModifierNode<Child = unknown, Token = string> = [Child, Token]

    type BranchNode<Left = unknown, Right = unknown, Token = string> = [
        Left,
        Token,
        Right
    ]

    export type References<Tree> = Tree extends ModifierNode<infer Child>
        ? References<Child>
        : Tree extends BranchNode<infer Left, infer Right>
        ? [...References<Left>, ...References<Right>]
        : Tree extends Operator.Bound.SingleBoundNode
        ? References<Tree[0]>
        : Tree extends Operator.Bound.DoubleBoundNode
        ? References<Tree[2]>
        : [Tree]

    export const parse: Node.parseFn<string> = (def, ctx) =>
        Naive.tryParse(def, ctx) ?? Main.parse(def, ctx)
}
