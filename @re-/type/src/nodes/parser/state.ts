import { ClassOf, InstanceOf, ListChars } from "@re-/tools"
import { Base as Parse } from "../base/index.js"
import { Branches } from "../nonTerminal/branch/branch.js"
import { Bound } from "../nonTerminal/index.js"
import { Lexer } from "./lexer.js"
import { ErrorToken, TokenSet } from "./tokens.js"

export namespace State {
    export type Type = {
        groups: Branches.TypeState[]
        branches: Branches.TypeState
        bounds: Bound.Bounds
        root: unknown
        scanner: Right
    }

    export type Value = {
        groups: Branches.ValueState[]
        branches: Branches.ValueState
        bounds: Bound.Bounds
        root: Parse.Node | undefined
        scanner: Lexer.Scanner
    }

    export type WithLookaheadAndRoot<
        Lookahead extends string,
        Node extends Parse.Node = Parse.Node
    > = Value & {
        scanner: Lexer.Scanner<Lookahead>
        root: Node
    }

    export type WithLookahead<Lookahead extends string> = Value & {
        scanner: Lexer.Scanner<Lookahead>
    }

    export type WithRoot<Node extends Parse.Node = Parse.Node> = Value & {
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

    export const rootIs = <NodeClass extends ClassOf<Parse.Node>>(
        state: Value,
        nodeClass: NodeClass
    ): state is WithRoot<InstanceOf<NodeClass>> =>
        state.root instanceof nodeClass

    export type Context = {
        bounds: Bound.Bounds
    }

    export type Right = {
        lookahead: string
        unscanned: string[]
    }

    export type RightFrom<R extends Right> = R

    export type From<S extends Type> = S

    export type Error<S extends Type, Message extends string> = From<{
        groups: S["groups"]
        branches: S["branches"]
        bounds: S["bounds"]
        root: ErrorToken<Message>
        scanner: {
            lookahead: "ERR"
            unscanned: S["scanner"]["unscanned"]
        }
    }>

    export type Initialize<Def extends string> = From<{
        groups: []
        branches: {}
        bounds: {}
        root: undefined
        scanner: Lexer.ShiftBase<ListChars<Def>>
    }>

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

    export type Modify<S extends Type, Token extends string> = SetRoot<
        S,
        [S["root"], Token]
    >

    export type SetRoot<S extends Type, Node> = From<{
        groups: S["groups"]
        branches: S["branches"]
        bounds: S["bounds"]
        root: Node
        scanner: S["scanner"]
    }>

    export type ShiftBase<S extends Type, Root = S["root"]> = From<{
        groups: S["groups"]
        branches: S["branches"]
        bounds: S["bounds"]
        root: Root
        scanner: Lexer.ShiftBase<S["scanner"]["unscanned"]>
    }>

    export type ShiftOperator<S extends Type, Root = S["root"]> = From<{
        groups: S["groups"]
        branches: S["branches"]
        bounds: S["bounds"]
        root: Root
        scanner: Lexer.ShiftOperator<S["scanner"]["unscanned"]>
    }>
}
