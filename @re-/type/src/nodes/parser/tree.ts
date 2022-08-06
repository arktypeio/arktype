import { Base } from "../base/index.js"
import { Intersection, List, Optional, Union } from "../nonTerminal/index.js"
import { InferTerminalStr } from "../terminal/index.js"

export namespace Tree {
    type ModifiedNode<Child, Token extends string> = [Child, Token]

    type BranchNode<Left, Token extends string, Right> = [Left, Token, Right]

    export type ToString<Tree> = Tree extends string
        ? Tree
        : Tree extends ModifiedNode<infer Child, infer Token>
        ? `${ToString<Child>}${Token}`
        : Tree extends BranchNode<infer Left, infer Token, infer Right>
        ? `${ToString<Left>}${Token}${ToString<Right>}`
        : ""

    export type Infer<
        Tree,
        Ctx extends Base.Parsing.InferenceContext
    > = Tree extends string
        ? InferTerminalStr<Tree, Ctx>
        : Tree extends [infer Child, "?"]
        ? Infer<Child, Ctx> | undefined
        : Tree extends [infer Child, "[]"]
        ? Infer<Child, Ctx>[]
        : Tree extends [infer Left, "|", infer Right]
        ? Infer<Left, Ctx> | Infer<Right, Ctx>
        : Tree extends [infer Left, "&", infer Right]
        ? Infer<Left, Ctx> & Infer<Right, Ctx>
        : never

    export type LeavesOf<Tree> = Tree extends [infer Child, string]
        ? LeavesOf<Child>
        : Tree extends [infer Left, string, infer Right]
        ? [...LeavesOf<Right>, ...LeavesOf<Left>]
        : [Tree]
}
