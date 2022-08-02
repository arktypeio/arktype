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

    export type Left = {
        groups: Branches.State[]
        branches: Branches.State
        expression: unknown
        bounds: Bounds.State
    }

    export type Right = {
        lookahead: string
        unscanned: string[]
    }

    export type RightFrom<R extends Right> = R

    export type From<S extends State> = S

    export type Error<S extends State, Message extends string> = From<{
        L: SetExpression<S["L"], ParseError<Message>>
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

    export type InitialLeft = {
        groups: []
        branches: Branches.Initial
        expression: []
        bounds: {}
    }

    export type ModifierToken = "[]" | "?"

    type LeftFrom<L extends Left> = L

    export type Modify<L extends Left, Token extends ModifierToken> = LeftFrom<{
        groups: L["groups"]
        branches: L["branches"]
        expression: [L["expression"], Token]
        bounds: L["bounds"]
    }>

    export type SetExpression<L extends Left, Token extends string> = LeftFrom<{
        groups: L["groups"]
        branches: L["branches"]
        expression: Token
        bounds: L["bounds"]
    }>
}
