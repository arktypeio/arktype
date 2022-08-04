import { ClassOf, InstanceOf, ListChars } from "@re-/tools"
import { Base } from "../base/index.js"
import { Branches } from "../nonTerminal/branch/branch.js"
import { Bound, NodeBounds } from "../nonTerminal/index.js"
import { ErrorToken, Lexer, TokenSet } from "./lexer.js"

export namespace ParserState {
    export type Type = {
        L: Left
        R: Right
    }

    export type Value = {
        // Left
        groups: Branches.state[]
        branches: Branches.state
        bounds: NodeBounds
        root: Base.Node | undefined
        // Equivalent to Right
        scanner: Lexer.Scanner
    }

    export type WithLookaheadAndRoot<
        Token extends string,
        Node extends Base.Node = Base.Node
    > = Value & {
        scanner: Lexer.Scanner<Token>
        root: Node
    }

    export type WithLookahead<Token extends string> = Value & {
        scanner: Lexer.Scanner<Token>
    }

    export type WithRoot<Node extends Base.Node = Base.Node> = Value & {
        root: Node
    }

    export const lookaheadIs = <Token extends string>(
        state: Value,
        token: Token
    ): state is WithLookahead<Token> => state.scanner.lookaheadIs(token)

    export const lookaheadIn = <Tokens extends TokenSet>(
        state: Value,
        tokens: Tokens
    ): state is WithLookahead<Extract<keyof Tokens, string>> =>
        state.scanner.lookaheadIsIn(tokens)

    export const rootIs = <NodeClass extends ClassOf<Base.Node>>(
        state: Value,
        nodeClass: NodeClass
    ): state is WithRoot<InstanceOf<NodeClass>> =>
        state.root instanceof nodeClass

    export type Left = {
        groups: Branches.State[]
        branches: Branches.State
        root: unknown
        ctx: Context
    }

    export type Context = {
        bounds: Bound.State
    }

    export type Right = {
        lookahead: string
        unscanned: string[]
    }

    export type RightFrom<R extends Right> = R

    export type From<S extends Type> = S

    export type Error<S extends Type, Message extends string> = From<{
        L: SetRoot<S["L"], ErrorToken<Message>>
        R: RightFrom<{
            lookahead: "END"
            unscanned: S["R"]["unscanned"]
        }>
    }>

    export type Initialize<Def extends string> = {
        L: InitialLeft
        R: Lexer.ShiftBase<ListChars<Def>>
    }

    export const initialize = (def: string): Value => {
        const scanner = new Lexer.Scanner(def)
        Lexer.shiftBase(scanner)
        return {
            groups: [],
            branches: {},
            bounds: {},
            root: undefined,
            scanner
        }
    }

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

    export type UpdateContext<
        L extends Left,
        Updates extends Partial<Context>
    > = LeftFrom<{
        groups: L["groups"]
        branches: L["branches"]
        root: L["root"]
        ctx: L["ctx"] & Updates
    }>

    export type SetRoot<L extends Left, Node> = LeftFrom<{
        groups: L["groups"]
        branches: L["branches"]
        root: Node
        ctx: L["ctx"]
    }>
}
