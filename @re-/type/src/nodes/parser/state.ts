import { ListChars } from "@re-/tools"
import { Branches } from "../nonTerminal/branch/branch.js"
import { Bounds } from "../nonTerminal/index.js"
import { ParseError } from "./shared.js"
import type { Shift } from "./shift.js"

export namespace ParserState {
    export type State = {
        L: Left
        R: Right
    }

    export type Tree = {
        root: unknown
        union: Branches.Branch
        intersection: Branches.Branch
    }

    export type Left = {
        tree: Tree
        ctx: Context
    }

    export type Context = {
        bounds: Bounds.State
        groups: Tree[]
    }

    export type Right = {
        lookahead: string
        unscanned: string[]
    }

    export type RightFrom<R extends Right> = R

    export type From<S extends State> = S

    export type Error<S extends State, Message extends string> = From<{
        L: SetRoot<S["L"], ParseError<Message>>
        R: S["R"]
    }>

    export type Initialize<Def extends string, Dict> = {
        L: InitialLeft
        R: Shift.Base<ListChars<Def>, Dict>
    }

    export type InitializeRight<Def extends string> = RightFrom<{
        lookahead: ""
        unscanned: ListChars<Def>
    }>

    export type InitialTree = {
        root: ""
        union: []
        intersection: []
    }

    export type InitialContext = {
        groups: []
        bounds: {}
    }

    export type InitialLeft = LeftFrom<{
        tree: InitialTree
        ctx: InitialContext
    }>

    export type ModifierToken = "[]" | "?"

    type LeftFrom<L extends Left> = L

    export type Modify<L extends Left, Token extends ModifierToken> = SetRoot<
        L,
        [L["tree"]["root"], Token]
    >

    export type SetRoot<L extends Left, Node> = LeftFrom<{
        tree: {
            root: Node
            union: L["tree"]["union"]
            intersection: L["tree"]["intersection"]
        }
        ctx: L["ctx"]
    }>
}
