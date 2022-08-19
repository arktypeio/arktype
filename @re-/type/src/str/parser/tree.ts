import { Base } from "../../base/index.js"
import { InferTerminalStr } from "../terminal/index.js"

type ModifiedNode<Child, Token extends string> = [Child, Token]

type BranchNode<Left, Token extends string, Right> = [Left, Token, Right]

export type ToString<T> = T extends string
    ? T
    : T extends ModifiedNode<infer Child, infer Token>
    ? `${ToString<Child>}${Token}`
    : T extends BranchNode<infer Left, infer Token, infer Right>
    ? `${ToString<Left>}${Token}${ToString<Right>}`
    : ""

export type Infer<T, Ctx extends Base.Parse.InferenceContext> = T extends string
    ? InferTerminalStr<T, Ctx>
    : T extends [infer Child, "?"]
    ? Infer<Child, Ctx> | undefined
    : T extends [infer Child, "[]"]
    ? Infer<Child, Ctx>[]
    : T extends [infer Left, "|", infer Right]
    ? Infer<Left, Ctx> | Infer<Right, Ctx>
    : T extends [infer Left, "&", infer Right]
    ? Infer<Left, Ctx> & Infer<Right, Ctx>
    : never

export type LeavesOf<T> = T extends [infer Child, string]
    ? LeavesOf<Child>
    : T extends [infer Left, string, infer Right]
    ? [...LeavesOf<Right>, ...LeavesOf<Left>]
    : [T]
