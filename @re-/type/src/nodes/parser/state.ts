import { ListChars } from "@re-/tools"
import { Base } from "../base/index.js"
import { Branches } from "../nonTerminal/branch/branch.js"
import { Bounds, BoundsNode } from "../nonTerminal/index.js"
import { Lexer } from "./lexer.js"
import { ParseError } from "./shared.js"

export namespace ParserState {
    export type State = {
        L: Left
        R: Right
    }

    export type state = {
        groups: Branches.state[]
        branches: Branches.state
        bounds?: BoundsNode
        root?: Base.Node
        scanner: Lexer.Scanner
    }

    export type Left = {
        groups: Branches.State[]
        branches: Branches.State
        root: unknown
        ctx: Context
    }

    export type Context = {
        bounds: Bounds.State
    }

    export type Right = {
        lookahead: string
        unscanned: string[]
    }

    export type RightFrom<R extends Right> = R

    export type From<S extends State> = S

    export type Error<S extends State, Message extends string> = From<{
        L: SetRoot<S["L"], ParseError<Message>>
        R: RightFrom<{
            lookahead: "END"
            unscanned: S["R"]["unscanned"]
        }>
    }>

    export type Initialize<Def extends string> = {
        L: InitialLeft
        R: Lexer.ShiftBase<ListChars<Def>>
    }

    export const initialize = (def: string): state => ({
        groups: [],
        branches: {},
        scanner: new Lexer.Scanner(def)
    })

    export type InitializeRight<Def extends string> = RightFrom<{
        lookahead: ""
        unscanned: ListChars<Def>
    }>

    export type InitialContext = {
        groups: []
        bounds: {}
    }

    export type InitialLeft = LeftFrom<{
        groups: []
        branches: {}
        root: undefined
        ctx: InitialContext
    }>

    export type ModifierToken = "[]" | "?"

    type LeftFrom<L extends Left> = L

    export type Modify<L extends Left, Token extends ModifierToken> = SetRoot<
        L,
        [L["root"], Token]
    >

    export type SetRoot<L extends Left, Node> = LeftFrom<{
        groups: L["groups"]
        branches: L["branches"]
        root: Node
        ctx: L["ctx"]
    }>
}
