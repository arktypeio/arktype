import { InferTerminalStr } from "../base/index.js"
import { Node } from "../common.js"

type ModifiedNode<Child = unknown, Token extends string = string> = [
    Child,
    Token
]

type BranchNode<
    Left = unknown,
    Token extends string = string,
    Right = unknown
> = [Left, Token, Right]

//TODO: Fix up bounds
export type ToString<T> = T extends string
    ? T
    : T extends ModifiedNode<infer Child, infer Token>
    ? `${ToString<Child>}${Token}`
    : T extends BranchNode<infer Left, infer Token, infer Right>
    ? `${ToString<Left>}${Token}${ToString<Right>}`
    : ""

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

export type LeavesOf<T> = T extends [infer Child, unknown]
    ? LeavesOf<Child>
    : T extends [infer Left, unknown, infer Right]
    ? [...LeavesOf<Right>, ...LeavesOf<Left>]
    : T extends [unknown, unknown, infer Bounded, unknown, unknown]
    ? LeavesOf<Bounded>
    : [T]
